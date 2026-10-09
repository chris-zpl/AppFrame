import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  MEDIA_DOWNLOAD_QUEUE,
  MEDIA_RENDER_QUEUE,
  DownloadJobPayload,
  RenderJobPayload,
} from '../../../core/queue/queue.constants';
import { DownloadService } from '../services/download.service';
import { MediaService } from '../media.service';
import { VideoJobStatus } from '../enums/video-job-status.enum';

@Processor(MEDIA_DOWNLOAD_QUEUE)
export class DownloadProcessor extends WorkerHost {
  private readonly logger = new Logger(DownloadProcessor.name);

  constructor(
    private readonly downloadService: DownloadService,
    private readonly mediaService: MediaService,
    @InjectQueue(MEDIA_RENDER_QUEUE)
    private readonly renderQueue: Queue<RenderJobPayload>,
  ) {
    super();
  }

  async process(job: Job<DownloadJobPayload>): Promise<{ localSourcePath: string }> {
    const { jobId, userId, sourceUrl } = job.data;
    this.logger.log(`[Job ${jobId}] Iniciando download na fila isolada ${MEDIA_DOWNLOAD_QUEUE}`);

    try {
      // 1. Atualiza status no PostgreSQL para downloading
      await this.mediaService.updateJobStatus(jobId, VideoJobStatus.DOWNLOADING, {
        progress: 0,
      });
      await job.updateProgress(0);

      // 2. Executa o download reportando progresso contínuo
      const localSourcePath = await this.downloadService.downloadMedia(
        sourceUrl,
        jobId,
        async (progressPercent) => {
          await job.updateProgress(progressPercent);
          await this.mediaService.updateJobProgress(jobId, progressPercent);
        },
      );

      // 3. Busca detalhes complementares do job (cortes, legendas, marca d'água)
      const currentJob = await this.mediaService.getRawJobById(jobId);

      // 4. Despacha o job para a fila isolada de renderização com FFmpeg
      await this.renderQueue.add(
        'render-video',
        {
          jobId,
          userId,
          localSourcePath,
          trimStart: currentJob?.trim_start ? Number(currentJob.trim_start) : null,
          trimEnd: currentJob?.trim_end ? Number(currentJob.trim_end) : null,
          watermarkId: currentJob?.watermark_id || null,
          subtitleConfig: currentJob?.subtitle_config || null,
        },
        {
          priority: 1,
        },
      );

      this.logger.log(
        `[Job ${jobId}] Download concluído. Enfileirado para renderização na fila ${MEDIA_RENDER_QUEUE}`,
      );

      return { localSourcePath };
    } catch (error: any) {
      const sanitizedError = `Erro no download: ${error.message}`;
      this.logger.error(`[Job ${jobId}] Falha durante o download: ${sanitizedError}`);

      await this.mediaService.updateJobStatus(jobId, VideoJobStatus.FAILED, {
        errorLog: sanitizedError,
      });

      throw error;
    }
  }
}
