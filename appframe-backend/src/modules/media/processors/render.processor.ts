import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as path from 'path';
import {
  MEDIA_RENDER_QUEUE,
  RenderJobPayload,
} from '../../../core/queue/queue.constants';
import { FFmpegService } from '../services/ffmpeg.service';
import { MediaService } from '../media.service';
import { DownloadService } from '../services/download.service';
import { WatermarksService } from '../../watermarks/watermarks.service';
import { VideoJobStatus } from '../enums/video-job-status.enum';

@Processor(MEDIA_RENDER_QUEUE, {
  concurrency: 1,
  lockDuration: 900000, // 15 minutos de lock para vídeos médios/longos contra stalled jobs
})
export class RenderProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderProcessor.name);

  constructor(
    private readonly ffmpegService: FFmpegService,
    private readonly mediaService: MediaService,
    private readonly downloadService: DownloadService,
    private readonly watermarksService: WatermarksService,
  ) {
    super();
  }

  async process(job: Job<RenderJobPayload>): Promise<{ finalVideoPath: string }> {
    const {
      jobId,
      userId,
      localSourcePath,
      aspectRatio,
      trimStart,
      trimEnd,
      watermarkId,
      watermarkPosition,
      watermarkScale,
      watermarkOpacity,
      subtitleConfig,
    } = job.data;

    this.logger.log(
      `[Job ${jobId}] Iniciando renderização na fila isolada ${MEDIA_RENDER_QUEUE} (aspect_ratio: ${aspectRatio || 'default'}, watermark_pos: ${watermarkPosition || 'none'})`,
    );

    try {
      // 1. Atualiza status no PostgreSQL para rendering
      await this.mediaService.updateJobStatus(jobId, VideoJobStatus.RENDERING, {
        progress: 0,
      });
      await job.updateProgress(0);

      // 2. Resolve caminho da marca d'água caso informada
      let watermarkPath: string | null = null;
      if (watermarkId) {
        try {
          watermarkPath = await this.watermarksService.getFilePath(watermarkId, userId);
        } catch (wmError: any) {
          this.logger.warn(
            `[Job ${jobId}] Marca d'água ${watermarkId} não encontrada. Prosseguindo sem ela: ${wmError.message}`,
          );
        }
      }

      // 3. Define destino final do vídeo processado
      const finalDir = path.resolve(process.cwd(), 'storage/final');
      const finalVideoPath = path.join(finalDir, `${jobId}.mp4`);

      // 4. Executa pipeline completo com FFmpeg e monitoramento de progresso
      await this.ffmpegService.renderVideo({
        inputPath: localSourcePath,
        outputPath: finalVideoPath,
        aspectRatio,
        trimStart,
        trimEnd,
        watermarkPath,
        watermarkPosition: (watermarkPosition as any) || 'top-right',
        watermarkScale: watermarkScale !== undefined && watermarkScale !== null ? Number(watermarkScale) : 100,
        watermarkOpacity: watermarkOpacity !== undefined && watermarkOpacity !== null ? Number(watermarkOpacity) : 85,
        watermarkPadding: 60,
        subtitleConfig,
        onProgress: async (progressPercent) => {
          try {
            await job.updateProgress(progressPercent);
          } catch (progressErr: any) {
            this.logger.warn(
              `[Job ${jobId}] Alerta ao atualizar lock/progresso no BullMQ: ${progressErr.message}`,
            );
          }
          try {
            await this.mediaService.updateJobProgress(jobId, progressPercent);
          } catch (dbErr: any) {
            this.logger.warn(
              `[Job ${jobId}] Alerta ao persistir progresso no PostgreSQL: ${dbErr.message}`,
            );
          }
        },
      });

      // 5. Atualiza registro com sucesso e status completed
      await this.mediaService.updateJobStatus(jobId, VideoJobStatus.COMPLETED, {
        finalVideoPath: path.relative(process.cwd(), finalVideoPath),
        progress: 100,
      });
      await job.updateProgress(100);

      // 6. Limpeza do arquivo de download temporário
      await this.downloadService.cleanupFile(localSourcePath);

      this.logger.log(
        `[Job ${jobId}] Renderização concluída com sucesso. Arquivo final: ${finalVideoPath}`,
      );

      return { finalVideoPath };
    } catch (error: any) {
      const sanitizedError = this.ffmpegService.sanitizeErrorLog(error.message);
      this.logger.error(`[Job ${jobId}] Falha na renderização FFmpeg: ${sanitizedError}`);

      await this.mediaService.updateJobStatus(jobId, VideoJobStatus.FAILED, {
        errorLog: sanitizedError,
      });

      // Limpeza preventiva de arquivo temporário
      if (localSourcePath) {
        await this.downloadService.cleanupFile(localSourcePath);
      }

      throw error;
    }
  }
}
