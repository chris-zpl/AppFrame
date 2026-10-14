import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);
  private readonly tempDir = path.resolve(process.cwd(), 'storage/temp/downloads');
  private readonly previewDir = path.resolve(process.cwd(), 'storage/temp/previews');
  private readonly ytdlpPath: string;
  private readonly inFlightPreviews = new Map<string, Promise<string>>();

  constructor(private readonly configService: ConfigService) {
    this.ytdlpPath = this.configService.get<string>('YTDLP_PATH', 'yt-dlp');
    this.ensureDirs();
  }

  private async ensureDirs(): Promise<void> {
    try {
      await fsPromises.mkdir(this.tempDir, { recursive: true });
      await fsPromises.mkdir(this.previewDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Falha ao criar diretórios temporários`, error);
    }
  }

  /**
   * Gera um identificador determinístico seguro (SHA-256) para a URL do vídeo.
   */
  getPreviewId(sourceUrl: string): string {
    return crypto
      .createHash('sha256')
      .update((sourceUrl || '').trim())
      .digest('hex')
      .substring(0, 24);
  }

  /**
   * Resolve e valida o caminho do arquivo de preview baixado.
   */
  getPreviewFilePath(previewId: string): string {
    if (!previewId || !/^[a-f0-9]{24}$/i.test(previewId)) {
      throw new BadRequestException('Identificador de preview inválido.');
    }
    const filePath = path.join(this.previewDir, `${previewId}.mp4`);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo de preview do vídeo não encontrado.');
    }
    return filePath;
  }

  /**
   * Remove o arquivo temporário de preview do disco caso exista.
   */
  async deletePreviewFile(previewId: string): Promise<boolean> {
    if (!previewId || !/^[a-f0-9]{24}$/i.test(previewId)) {
      return false;
    }
    const filePath = path.join(this.previewDir, `${previewId}.mp4`);
    if (fs.existsSync(filePath)) {
      try {
        await fsPromises.unlink(filePath);
        this.logger.log(`Arquivo temporário de preview ${previewId}.mp4 removido com sucesso.`);
        return true;
      } catch (err: any) {
        this.logger.warn(`Falha ao remover arquivo de preview ${previewId}: ${err?.message}`);
        return false;
      }
    }
    return false;
  }

  /**
   * Garante que o vídeo de origem esteja baixado localmente em formato MP4
   * para visualização em tempo real no Studio e/ou renderização posterior.
   */
  async ensurePreviewDownloaded(
    sourceUrl: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
  ): Promise<{ previewId: string; filePath: string }> {
    await this.ensureDirs();

    const cleanUrl = (sourceUrl || '').trim();
    if (!cleanUrl) {
      throw new BadRequestException('A URL do vídeo de origem é obrigatória.');
    }

    const previewId = this.getPreviewId(cleanUrl);
    const finalPreviewPath = path.join(this.previewDir, `${previewId}.mp4`);

    if (fs.existsSync(finalPreviewPath)) {
      try {
        const stat = await fsPromises.stat(finalPreviewPath);
        if (stat.size > 1024) {
          if (onProgress) {
            await Promise.resolve(onProgress(100));
          }
          return { previewId, filePath: finalPreviewPath };
        }
      } catch {}
    }

    const existingPromise = this.inFlightPreviews.get(previewId);
    if (existingPromise) {
      const resolvedPath = await existingPromise;
      if (onProgress) {
        await Promise.resolve(onProgress(100));
      }
      return { previewId, filePath: resolvedPath };
    }

    const downloadPromise = (async () => {
      const tempPartPath = path.join(
        this.previewDir,
        `${previewId}_${Date.now()}.mp4`,
      );

      try {
        const isYouTube = /youtube\.com|youtu\.be/i.test(cleanUrl);
        if (isYouTube) {
          await this.downloadWithYtDlp(cleanUrl, tempPartPath, onProgress);
        } else {
          await this.downloadDirectHttp(cleanUrl, tempPartPath, onProgress);
        }

        if (!fs.existsSync(tempPartPath)) {
          throw new BadRequestException('O arquivo de vídeo não pôde ser baixado.');
        }

        await fsPromises.rename(tempPartPath, finalPreviewPath);
        if (onProgress) {
          await Promise.resolve(onProgress(100));
        }

        return finalPreviewPath;
      } catch (err) {
        await this.cleanupFile(tempPartPath);
        throw err;
      } finally {
        this.inFlightPreviews.delete(previewId);
      }
    })();

    this.inFlightPreviews.set(previewId, downloadPromise);
    const filePath = await downloadPromise;
    return { previewId, filePath };
  }

  /**
   * Faz download real de vídeo/Short do YouTube usando yt-dlp em MP4 (H.264/AAC) compatível com HTML5/FFmpeg.
   * Utiliza clientes de player (web_embedded / tv / ios / android) com player_skip=webpage
   * para evitar bloqueios 429 / "Sign in to confirm you're not a bot" na página web padrão.
   */
  private async downloadWithYtDlp(
    sourceUrl: string,
    destinationPath: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
  ): Promise<void> {
    this.logger.log(`Baixando vídeo do YouTube via yt-dlp: ${sourceUrl}`);

    const clientStrategies = [
      'youtube:player_client=web_embedded;player_skip=webpage',
      'youtube:player_client=tv,web_embedded,mweb,ios,android;player_skip=webpage',
    ];

    let lastError = 'erro no download';

    for (const extractorArgs of clientStrategies) {
      try {
        await this.runYtDlpProcess(
          sourceUrl,
          destinationPath,
          extractorArgs,
          onProgress,
        );
        if (fs.existsSync(destinationPath)) {
          return;
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) {
          await this.cleanupFile(destinationPath);
          throw err;
        }
        lastError = err?.message || 'erro no download';
        this.logger.warn(
          `Tentativa yt-dlp com (${extractorArgs}) falhou: ${lastError}`,
        );
        await this.cleanupFile(destinationPath);
      }
    }

    throw new BadRequestException(
      `Não foi possível baixar o vídeo selecionado (${lastError}).`,
    );
  }

  private runYtDlpProcess(
    sourceUrl: string,
    destinationPath: string,
    extractorArgs: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--extractor-args',
        extractorArgs,
        '-f',
        'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]/best',
        '--merge-output-format',
        'mp4',
        '--no-playlist',
        '--newline',
        '-o',
        destinationPath,
        sourceUrl,
      ];

      const proc = spawn(this.ytdlpPath, args);
      let stderrBuffer = '';
      let lastReportedPercent = 0;

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const match = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (match && onProgress) {
          const pct = Math.min(99, Math.floor(parseFloat(match[1])));
          if (pct > lastReportedPercent + 2) {
            lastReportedPercent = pct;
            Promise.resolve(onProgress(pct)).catch(() => {});
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
        if (stderrBuffer.length > 3000) {
          stderrBuffer = stderrBuffer.substring(stderrBuffer.length - 3000);
        }
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(destinationPath)) {
          resolve();
        } else {
          if (
            /members on level|available to this channel's members|members-only|exclusivo para membros/i.test(
              stderrBuffer,
            )
          ) {
            reject(
              new BadRequestException(
                'Este vídeo é exclusivo para membros do canal no YouTube e não está disponível publicamente.',
              ),
            );
            return;
          }

          const errorLine =
            stderrBuffer
              .trim()
              .split('\n')
              .filter((line) => line.includes('ERROR:'))
              .pop() ||
            stderrBuffer.trim().split('\n').pop() ||
            `código ${code}`;
          reject(new Error(errorLine));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(err.message));
      });
    });
  }

  /**
   * Faz download de link direto HTTP/HTTPS.
   */
  private async downloadDirectHttp(
    sourceUrl: string,
    destinationPath: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
  ): Promise<void> {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new BadRequestException(
        `Falha ao acessar vídeo na URL de origem. HTTP Status: ${response.status}`,
      );
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let downloadedBytes = 0;
    let lastReportedPercent = 0;

    const fileWriteStream = fs.createWriteStream(destinationPath);
    if (!response.body) {
      throw new Error('Corpo da resposta HTTP de mídia está vazio.');
    }

    const nodeReadable = Readable.fromWeb(response.body as any);

    nodeReadable.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0 && onProgress) {
        const currentPercent = Math.min(
          99,
          Math.floor((downloadedBytes / totalBytes) * 100),
        );
        if (currentPercent > lastReportedPercent + 2) {
          lastReportedPercent = currentPercent;
          Promise.resolve(onProgress(currentPercent)).catch(() => {});
        }
      }
    });

    await pipeline(nodeReadable, fileWriteStream);
  }

  /**
   * Baixa vídeo original para diretório de trabalho do job (reutilizando o cache do Studio caso já baixado).
   */
  async downloadMedia(
    sourceUrl: string,
    jobId: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
  ): Promise<string> {
    await this.ensureDirs();

    this.logger.log(`Preparando mídia para job ${jobId} a partir de: ${sourceUrl}`);
    const destinationPath = path.join(this.tempDir, `${jobId}_original.mp4`);

    try {
      const { filePath: cachedPreviewPath } = await this.ensurePreviewDownloaded(
        sourceUrl,
        onProgress,
      );

      await fsPromises.copyFile(cachedPreviewPath, destinationPath);

      if (onProgress) {
        await Promise.resolve(onProgress(100));
      }

      this.logger.log(
        `Mídia pronta para job ${jobId}. Salva em: ${destinationPath}`,
      );
      return destinationPath;
    } catch (error: any) {
      await this.cleanupFile(destinationPath);
      this.logger.error(`Erro no download do job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove arquivo temporário após uso
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch (err: any) {
      this.logger.warn(`Falha na limpeza do arquivo temporário ${filePath}: ${err.message}`);
    }
  }
}
