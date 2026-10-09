import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);
  private readonly tempDir = path.resolve(process.cwd(), 'storage/temp/downloads');

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fsPromises.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Falha ao criar diretório temporário: ${this.tempDir}`, error);
    }
  }

  /**
   * Baixa vídeo original para diretório de trabalho temporário com acompanhamento de progresso.
   */
  async downloadMedia(
    sourceUrl: string,
    jobId: string,
    onProgress?: (progressPercent: number) => Promise<void> | void,
  ): Promise<string> {
    await this.ensureTempDir();

    this.logger.log(`Iniciando download para job ${jobId} a partir de: ${sourceUrl}`);
    const destinationPath = path.join(this.tempDir, `${jobId}_original.mp4`);

    try {
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

      // Converte o ReadableStream do fetch para stream do Node.js
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

      if (onProgress) {
        await Promise.resolve(onProgress(100));
      }

      this.logger.log(
        `Download concluído com sucesso para job ${jobId}. Salvo em: ${destinationPath}`,
      );
      return destinationPath;
    } catch (error: any) {
      // Limpeza de arquivo corrompido ou parcial
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
