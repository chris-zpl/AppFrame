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
  private readonly activePreviewControllers = new Map<string, AbortController>();
  private readonly cancelledPreviews = new Set<string>();

  constructor(private readonly configService: ConfigService) {
    this.ytdlpPath = this.configService.get<string>('YTDLP_PATH', 'yt-dlp');
    this.ensureDirs();
  }

  /**
   * Cancela ativamente o download de um preview órfão quando o usuário alterna rapidamente para outro vídeo.
   */
  cancelPreviewDownload(previewId: string): void {
    if (!previewId) return;
    this.cancelledPreviews.add(previewId);
    const controller = this.activePreviewControllers.get(previewId);
    if (controller) {
      controller.abort();
      this.activePreviewControllers.delete(previewId);
    }
    this.inFlightPreviews.delete(previewId);
  }

  /**
   * Limpa flag de cancelamento ao iniciar um novo ciclo explícito para o mesmo previewId.
   */
  clearCancelledPreview(previewId: string): void {
    if (!previewId) return;
    this.cancelledPreviews.delete(previewId);
  }

  /**
   * Verifica se o preview foi marcado como cancelado/órfão.
   */
  isPreviewCancelled(previewId: string): boolean {
    return this.cancelledPreviews.has(previewId);
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
  /**
   * Resolve o caminho do arquivo de preview baixado.
   */
  getPreviewFilePath(previewId: string): string {
    if (!previewId || !/^[a-f0-9]{24}$/i.test(previewId)) {
      throw new BadRequestException('Identificador de preview inválido.');
    }
    return path.join(this.previewDir, `${previewId}.mp4`);
  }

  /**
   * Verifica existência de arquivo assincronamente com tratamento de ENOENT.
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
      return true;
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Remove arquivo do disco assincronamente com tratamento resiliente de ENOENT.
   */
  async safeUnlink(filePath: string): Promise<boolean> {
    try {
      await fsPromises.unlink(filePath);
      return true;
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        return false;
      }
      this.logger.warn(`Falha ao remover arquivo ${filePath}: ${err?.message}`);
      return false;
    }
  }

  /**
   * Remove o arquivo temporário de preview do disco caso exista.
   */
  async deletePreviewFile(previewId: string): Promise<boolean> {
    if (!previewId || !/^[a-f0-9]{24}$/i.test(previewId)) {
      return false;
    }
    const filePath = path.join(this.previewDir, `${previewId}.mp4`);
    const removed = await this.safeUnlink(filePath);
    if (removed) {
      this.logger.log(`Arquivo temporário de preview ${previewId}.mp4 removido com sucesso.`);
    }
    return removed;
  }

  /**
   * Limpa arquivos temporários de preview do disco (ou específicos caso informados).
   */
  async clearAllPreviewFiles(specificIdsOrUrls?: string[]): Promise<number> {
    await this.ensureDirs();
    let removedCount = 0;

    if (specificIdsOrUrls && specificIdsOrUrls.length > 0) {
      for (const item of specificIdsOrUrls) {
        if (!item || typeof item !== 'string') continue;
        const trimmed = item.trim();
        const previewId = /^[a-f0-9]{24}$/i.test(trimmed)
          ? trimmed
          : this.getPreviewId(trimmed);
        const removed = await this.deletePreviewFile(previewId);
        if (removed) {
          removedCount++;
        }
      }
      return removedCount;
    }

    try {
      const exists = await this.fileExists(this.previewDir);
      if (exists) {
        const files = await fsPromises.readdir(this.previewDir);
        for (const file of files) {
          if (file.endsWith('.mp4') || file.endsWith('.part')) {
            const filePath = path.join(this.previewDir, file);
            const removed = await this.safeUnlink(filePath);
            if (removed) {
              removedCount++;
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        this.logger.error(
          `Erro ao listar diretório de previews para limpeza: ${err?.message}`,
        );
      }
    }

    return removedCount;
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

    if (/\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(cleanUrl)) {
      throw new BadRequestException(
        'Transmissões ao vivo (lives) não são suportadas para cortes e renderização.',
      );
    }

    const previewId = this.getPreviewId(cleanUrl);
    const finalPreviewPath = path.join(this.previewDir, `${previewId}.mp4`);

    if (await this.fileExists(finalPreviewPath)) {
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
      const abortController = new AbortController();
      this.activePreviewControllers.set(previewId, abortController);
      const tempPartPath = path.join(
        this.previewDir,
        `${previewId}_${Date.now()}.mp4`,
      );

      try {
        if (this.cancelledPreviews.has(previewId) || abortController.signal.aborted) {
          throw new Error('PREVIEW_CANCELLED');
        }

        const isYouTube = /youtube\.com|youtu\.be/i.test(cleanUrl);
        if (isYouTube) {
          await this.downloadWithYtDlp(
            cleanUrl,
            tempPartPath,
            onProgress,
            abortController.signal,
          );
        } else {
          await this.downloadDirectHttp(
            cleanUrl,
            tempPartPath,
            onProgress,
            abortController.signal,
          );
        }

        if (this.cancelledPreviews.has(previewId) || abortController.signal.aborted) {
          throw new Error('PREVIEW_CANCELLED');
        }

        if (!(await this.fileExists(tempPartPath))) {
          throw new BadRequestException('O arquivo de vídeo não pôde ser baixado.');
        }

        await fsPromises.rename(tempPartPath, finalPreviewPath);
        if (onProgress) {
          await Promise.resolve(onProgress(100));
        }

        return finalPreviewPath;
      } catch (err) {
        await this.cleanupFile(tempPartPath);
        await this.cleanupFile(`${tempPartPath}.part`);
        await this.cleanupFile(`${tempPartPath}.ytdl`);
        throw err;
      } finally {
        this.activePreviewControllers.delete(previewId);
        this.inFlightPreviews.delete(previewId);
      }
    })();

    this.inFlightPreviews.set(previewId, downloadPromise);
    const filePath = await downloadPromise;
    return { previewId, filePath };
  }

  /**
   * Faz download real de vídeo/Short do YouTube usando yt-dlp em MP4 (H.264/AAC) compatível com HTML5/FFmpeg.
   * Utiliza clientes de player modernos (visão inteligente do yt-dlp com visionos / android / web)
   * e suporte opcional a cookies para evitar bloqueios 429 / "Sign in to confirm you're not a bot".
   */
  private async downloadWithYtDlp(
    sourceUrl: string,
    destinationPath: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.logger.log(`Baixando vídeo do YouTube via yt-dlp: ${sourceUrl}`);

    const clientStrategies: (string | null)[] = [
      null, // Padrão inteligente do yt-dlp (seleção automática moderna incluindo visionos/web)
      'youtube:player_client=visionos,android,web',
      'youtube:player_client=ios,android,mweb',
      'youtube:player_client=web_embedded;player_skip=webpage',
      'youtube:player_client=tv,web_embedded,mweb,ios,android;player_skip=webpage',
    ];

    let lastError = 'erro no download';

    for (const extractorArgs of clientStrategies) {
      if (signal?.aborted) {
        await this.cleanupFile(destinationPath);
        throw new Error('PREVIEW_CANCELLED');
      }

      try {
        await this.runYtDlpProcess(
          sourceUrl,
          destinationPath,
          extractorArgs,
          onProgress,
          signal,
        );
        if (signal?.aborted) {
          await this.cleanupFile(destinationPath);
          throw new Error('PREVIEW_CANCELLED');
        }
        if (await this.fileExists(destinationPath)) {
          return;
        }
      } catch (err: any) {
        if (err?.message === 'PREVIEW_CANCELLED' || signal?.aborted) {
          await this.cleanupFile(destinationPath);
          throw new Error('PREVIEW_CANCELLED');
        }
        if (err instanceof BadRequestException) {
          await this.cleanupFile(destinationPath);
          throw err;
        }
        lastError = err?.message || 'erro no download';
        this.logger.warn(
          `Tentativa yt-dlp com (${extractorArgs || 'default'}) falhou: ${lastError}`,
        );
        await this.cleanupFile(destinationPath);

        // Se o erro for de restrição de idade ou necessidade estrita de autenticação/cookies,
        // interrompe tentativas repetidas com outros clients para responder imediatamente ao usuário.
        if (
          lastError.includes('Sign in to confirm your age') ||
          lastError.includes("confirm you're not a bot") ||
          lastError.includes('--cookies')
        ) {
          break;
        }
      }
    }

    const isAgeOrBotRestricted =
      lastError.includes('Sign in to confirm your age') ||
      lastError.includes("confirm you're not a bot") ||
      lastError.includes('--cookies');

    if (isAgeOrBotRestricted) {
      throw new BadRequestException(
        'Este vídeo possui restrição de idade (+18) do YouTube. O download requer autorização da conta global configurada no servidor (storage/cookies.txt).',
      );
    }

    throw new BadRequestException(
      `Não foi possível baixar o vídeo selecionado (${lastError}).`,
    );
  }

  getCookiesStatus(): {
    configured: boolean;
    path: string | null;
    updatedAt: string | null;
  } {
    const cookiesPath = this.getCookiesPath();
    if (!cookiesPath || !fs.existsSync(cookiesPath)) {
      return { configured: false, path: null, updatedAt: null };
    }
    const stat = fs.statSync(cookiesPath);
    return {
      configured: true,
      path: cookiesPath,
      updatedAt: stat.mtime.toISOString(),
    };
  }

  saveCookies(rawContent: string | any[]): { success: boolean; message: string } {
    if (!rawContent || (typeof rawContent === 'string' && !rawContent.trim())) {
      throw new BadRequestException('O conteúdo dos cookies não pode estar vazio.');
    }

    let netscapeContent = '';

    if (typeof rawContent !== 'string') {
      try {
        const cookieArray = Array.isArray(rawContent) ? rawContent : [rawContent];
        const lines: string[] = [
          '# Netscape HTTP Cookie File',
          '# https://curl.haxx.se/rfc/cookie_spec.html',
          '# This is a generated file! Do not edit.',
          '',
        ];

        for (const c of cookieArray) {
          if (!c.name || c.value === undefined) continue;
          const domain = c.domain || '.youtube.com';
          const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
          const cookiePath = c.path || '/';
          const secure = c.secure ? 'TRUE' : 'FALSE';
          const expiration = c.expirationDate
            ? Math.floor(c.expirationDate)
            : Math.floor(Date.now() / 1000) + 31536000;
          lines.push(
            `${domain}\t${flag}\t${cookiePath}\t${secure}\t${expiration}\t${c.name}\t${c.value}`,
          );
        }

        netscapeContent = lines.join('\n');
      } catch (err: any) {
        this.logger.warn(`Falha ao converter array de cookies: ${err.message}`);
      }
    } else {
      netscapeContent = rawContent.trim();

      // Se o usuário colou um JSON de cookies
      if (netscapeContent.startsWith('[') || netscapeContent.startsWith('{')) {
        try {
          const parsed = JSON.parse(netscapeContent);
          const cookieArray = Array.isArray(parsed) ? parsed : [parsed];
          const lines: string[] = [
            '# Netscape HTTP Cookie File',
            '# https://curl.haxx.se/rfc/cookie_spec.html',
            '# This is a generated file! Do not edit.',
            '',
          ];

          for (const c of cookieArray) {
            if (!c.name || c.value === undefined) continue;
            const domain = c.domain || '.youtube.com';
            const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
            const cookiePath = c.path || '/';
            const secure = c.secure ? 'TRUE' : 'FALSE';
            const expiration = c.expirationDate
              ? Math.floor(c.expirationDate)
              : Math.floor(Date.now() / 1000) + 31536000;
            lines.push(
              `${domain}\t${flag}\t${cookiePath}\t${secure}\t${expiration}\t${c.name}\t${c.value}`,
            );
          }

          netscapeContent = lines.join('\n');
        } catch (err: any) {
          this.logger.warn(
            `Falha ao converter JSON de cookies para Netscape: ${err.message}`,
          );
        }
      }
    }

    // Se não tiver cabeçalho Netscape, adiciona
    if (
      !netscapeContent.startsWith('# Netscape') &&
      !netscapeContent.startsWith('# HTTP Cookie File')
    ) {
      netscapeContent = `# Netscape HTTP Cookie File\n${netscapeContent}\n`;
    }

    const storageDir = path.resolve(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const targetFile = path.resolve(storageDir, 'cookies.txt');
    fs.writeFileSync(targetFile, netscapeContent, {
      encoding: 'utf-8',
      mode: 0o600,
    });

    this.logger.log(`Cookies do YouTube salvos com sucesso em ${targetFile}`);
    return {
      success: true,
      message: 'Cookies do YouTube salvos com sucesso!',
    };
  }

  deleteCookies(): { success: boolean; message: string } {
    const cookiesPath = this.getCookiesPath();
    if (cookiesPath) {
      try {
        fs.unlink(cookiesPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            this.logger.warn(`Erro ao remover cookies: ${err.message}`);
          }
        });
        this.logger.log(`Arquivo de cookies removido: ${cookiesPath}`);
      } catch (e: any) {
        if (e?.code !== 'ENOENT') {
          this.logger.warn(`Erro ao remover cookies: ${e.message}`);
        }
      }
    }
    return {
      success: true,
      message: 'Cookies removidos com sucesso.',
    };
  }

  private getCookiesPath(): string | null {
    const envCookies = this.configService.get<string>('YTDLP_COOKIES_PATH');
    if (envCookies && fs.existsSync(envCookies)) {
      return envCookies;
    }
    const defaultCookies = path.resolve(process.cwd(), 'storage/cookies.txt');
    if (fs.existsSync(defaultCookies)) {
      return defaultCookies;
    }
    const rootCookies = path.resolve(process.cwd(), 'cookies.txt');
    if (fs.existsSync(rootCookies)) {
      return rootCookies;
    }
    return null;
  }

  private runYtDlpProcess(
    sourceUrl: string,
    destinationPath: string,
    extractorArgs: string | null,
    onProgress?: (progressPercent: number) => Promise<void> | void,
    signal?: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('PREVIEW_CANCELLED'));
        return;
      }

      const args: string[] = [];

      if (extractorArgs) {
        args.push('--extractor-args', extractorArgs);
      }

      const cookiesPath = this.getCookiesPath();
      if (cookiesPath) {
        args.push('--cookies', cookiesPath);
      }

      args.push(
        '-f',
        'bestvideo[height<=1080][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]/best',
        '--merge-output-format',
        'mp4',
        '--no-playlist',
        '--match-filter',
        '!is_live & !is_upcoming',
        '--newline',
        '--geo-bypass',
        '-o',
        destinationPath,
        sourceUrl,
      );

      const proc = spawn(this.ytdlpPath, args);
      let stderrBuffer = '';
      let lastReportedPercent = 0;

      const onAbort = () => {
        try {
          proc.kill('SIGTERM');
        } catch {}
        reject(new Error('PREVIEW_CANCELLED'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

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

      proc.on('close', async (code) => {
        signal?.removeEventListener('abort', onAbort);
        if (signal?.aborted) {
          reject(new Error('PREVIEW_CANCELLED'));
          return;
        }
        const destExists = await this.fileExists(destinationPath);
        if (code === 0 && destExists) {
          resolve();
        } else {
          if (
            /is a live stream|does not pass filter|transmissão ao vivo|live broadcast/i.test(
              stderrBuffer,
            )
          ) {
            reject(
              new BadRequestException(
                'Transmissões ao vivo (lives) não são suportadas para cortes e renderização.',
              ),
            );
            return;
          }

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
    signal?: AbortSignal,
  ): Promise<void> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      throw new BadRequestException('URL de origem inválida.');
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0', '::1', '[::1]'];
    const isClassA = hostname.startsWith('10.');
    const isClassC = hostname.startsWith('192.168.');
    const isClassB = /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

    if (blockedHosts.includes(hostname) || isClassA || isClassC || isClassB) {
      throw new BadRequestException(
        'URL de origem não permitida por políticas de segurança (SSRF).',
      );
    }

    const response = await fetch(sourceUrl, { signal });
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
      await fsPromises.unlink(filePath);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        this.logger.warn(`Falha na limpeza do arquivo temporário ${filePath}: ${err.message}`);
      }
    }
  }
}
