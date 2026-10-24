import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  STUDIO_PREVIEW_QUEUE,
  StudioPreviewJobPayload,
} from '../../../core/queue/queue.constants';
import { DownloadService } from '../services/download.service';
import { FFmpegService } from '../services/ffmpeg.service';
import { MediaService } from '../media.service';

@Processor(STUDIO_PREVIEW_QUEUE, {
  concurrency: 1,
  lockDuration: 900000, // 15 minutos contra Stalled Jobs em downloads maiores
})
export class StudioPreviewProcessor extends WorkerHost {
  private readonly logger = new Logger(StudioPreviewProcessor.name);

  constructor(
    private readonly downloadService: DownloadService,
    private readonly ffmpegService: FFmpegService,
    private readonly mediaService: MediaService,
  ) {
    super();
  }

  async process(job: Job<StudioPreviewJobPayload>): Promise<any> {
    const { previewId, sourceUrl } = job.data;
    this.logger.log(
      `[Preview ${previewId}] Iniciando processamento assíncrono na fila isolada ${STUDIO_PREVIEW_QUEUE}`,
    );

    if (
      typeof (this.downloadService as any).isPreviewCancelled === 'function' &&
      this.downloadService.isPreviewCancelled(previewId)
    ) {
      this.logger.log(
        `[Preview ${previewId}] Job órfão ignorado antes de iniciar (usuário alternou rapidamente de vídeo).`,
      );
      this.mediaService.evictPreviewCache(previewId);
      return { previewId, status: 'CANCELLED' };
    }

    try {
      await job.updateProgress(10);
      await this.mediaService.updatePreviewState(previewId, {
        previewId,
        status: 'PROCESSING',
        progress: 10,
      });

      // 1. Download do vídeo para preview local com extensão ativa de lock e progresso no Redis
      const { filePath } = await this.downloadService.ensurePreviewDownloaded(
        sourceUrl,
        async (dlPercent: number) => {
          const mappedProgress = Math.min(
            50,
            Math.max(10, Math.round(10 + dlPercent * 0.4)),
          );
          await job.updateProgress(mappedProgress);
          await this.mediaService.updatePreviewState(previewId, {
            previewId,
            status: 'PROCESSING',
            progress: mappedProgress,
          });
        },
      );

      if (
        typeof (this.downloadService as any).isPreviewCancelled === 'function' &&
        this.downloadService.isPreviewCancelled(previewId)
      ) {
        this.mediaService.evictPreviewCache(previewId);
        return { previewId, status: 'CANCELLED' };
      }

      await job.updateProgress(50);
      await this.mediaService.updatePreviewState(previewId, {
        previewId,
        status: 'PROCESSING',
        progress: 50,
      });

      // 2. Extração de metadados e espectro de forma de onda (FFmpeg limitado a -threads 2)
      const [metadata, waveformPeaks] = await Promise.all([
        this.ffmpegService.probeMetadata(filePath),
        this.ffmpegService.extractAudioWaveform(filePath, 70),
      ]);

      await job.updateProgress(90);

      const result = {
        previewId,
        status: 'COMPLETED' as const,
        streamUrl: `/api/v1/media/preview/${previewId}/stream`,
        durationSeconds: metadata.durationSeconds,
        width: metadata.width,
        height: metadata.height,
        waveformPeaks,
        progress: 100,
        updatedAt: new Date().toISOString(),
      };

      // 3. Persistência de estado final para consultas subsequentes e polling
      await this.mediaService.updatePreviewState(previewId, result);
      await job.updateProgress(100);

      this.logger.log(
        `[Preview ${previewId}] Processamento de preview concluído com sucesso. Duração: ${metadata.durationSeconds}s, Resolução: ${metadata.width}x${metadata.height}.`,
      );

      return result;
    } catch (error: any) {
      if (
        error?.message === 'PREVIEW_CANCELLED' ||
        (typeof (this.downloadService as any).isPreviewCancelled === 'function' &&
          this.downloadService.isPreviewCancelled(previewId))
      ) {
        this.logger.log(
          `[Preview ${previewId}] Job órfão cancelado com sucesso (usuário alternou rapidamente para outro vídeo).`,
        );
        this.mediaService.evictPreviewCache(previewId);
        return { previewId, status: 'CANCELLED' };
      }

      this.logger.error(
        `[Preview ${previewId}] Falha durante o processamento assíncrono do preview: ${error.message}`,
      );

      await this.mediaService.updatePreviewState(previewId, {
        previewId,
        status: 'FAILED',
        error: error.message,
        updatedAt: new Date().toISOString(),
      });

      throw error;
    }
  }
}
