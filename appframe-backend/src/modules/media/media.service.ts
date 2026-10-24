import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { VideoJob } from './entities/video-job.entity';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { DownloadBatchDto } from './dto/request/download-batch.dto';
import { VideoJobStatus } from './enums/video-job-status.enum';
import { VideoPlatform } from './enums/video-platform.enum';
import { DownloadService } from './services/download.service';
import { FFmpegService } from './services/ffmpeg.service';
import { WatermarksService } from '../watermarks/watermarks.service';
import { RedisService } from '../../core/redis/redis.service';
import {
  MEDIA_DOWNLOAD_QUEUE,
  STUDIO_PREVIEW_QUEUE,
  DownloadJobPayload,
  StudioPreviewJobPayload,
} from '../../core/queue/queue.constants';

export type StudioPreviewStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface StudioPreviewState {
  previewId: string;
  status: StudioPreviewStatus;
  progress?: number;
  streamUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  waveformPeaks?: number[];
  error?: string;
  message?: string;
  updatedAt: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  private readonly previewCache = new Map<
    string,
    {
      previewId: string;
      streamUrl: string;
      durationSeconds: number;
      width: number;
      height: number;
      waveformPeaks: number[];
    }
  >();

  private readonly inFlightPreviews = new Map<
    string,
    Promise<any>
  >();

  private readonly previewStateCache = new Map<string, StudioPreviewState>();
  private readonly activeUserPreview = new Map<string, string>();

  constructor(
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
    @InjectQueue(MEDIA_DOWNLOAD_QUEUE)
    private readonly downloadQueue: Queue<DownloadJobPayload>,
    @Optional()
    @InjectQueue(STUDIO_PREVIEW_QUEUE)
    private readonly studioPreviewQueue?: Queue<StudioPreviewJobPayload>,
    @Optional()
    private readonly downloadService?: DownloadService,
    @Optional()
    private readonly ffmpegService?: FFmpegService,
    @Optional()
    private readonly watermarksService?: WatermarksService,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  /**
   * Enfileira assincronamente a preparação do preview no BullMQ (fila studio-preview).
   * Responde imediatamente com status PROCESSING (202 Accepted) e persiste o estado
   * no Redis / cache em memória com deduplicação rigorosa por jobId.
   */
  async prepareStudioPreview(
    sourceUrl: string,
    userId?: string,
  ): Promise<StudioPreviewState> {
    const cleanUrl = (sourceUrl || '').trim();
    if (!cleanUrl) {
      throw new BadRequestException('A URL do vídeo de origem é obrigatória.');
    }

    if (/\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(cleanUrl)) {
      throw new BadRequestException(
        'Transmissões ao vivo (lives) não são suportadas para cortes e renderização.',
      );
    }

    const previewId = this.downloadService
      ? this.downloadService.getPreviewId(cleanUrl)
      : cleanUrl.substring(0, 24);

    // 0. Se o mesmo usuário alternou rapidamente de vídeo (ex: Vídeo 2 -> Vídeo 3),
    // cancela o job/download órfão anterior para liberar imediatamente o worker (concurrency: 1)
    if (userId) {
      const prevPreviewId = this.activeUserPreview.get(userId);
      if (prevPreviewId && prevPreviewId !== previewId) {
        const prevState = await this.getPreviewState(prevPreviewId);
        if (prevState && prevState.status === 'PROCESSING') {
          await this.cancelOrphanPreview(prevPreviewId);
        }
      }
      this.activeUserPreview.set(userId, previewId);
    }

    if (
      this.downloadService &&
      typeof (this.downloadService as any).clearCancelledPreview === 'function'
    ) {
      this.downloadService.clearCancelledPreview(previewId);
    }

    // 1. Verifica se já temos o preview pronto no cache ou persistido no Redis
    const cachedState = await this.getPreviewState(previewId);
    if (
      cachedState &&
      cachedState.status === 'COMPLETED' &&
      typeof cachedState.durationSeconds === 'number' &&
      cachedState.durationSeconds > 0
    ) {
      const filePath = this.downloadService?.getPreviewFilePath(previewId);
      if (filePath) {
        const fileExists = await this.downloadService?.fileExists(filePath);
        if (fileExists) {
          return cachedState;
        }
      }
      this.evictPreviewCache(previewId);
    }

    const jobId = `preview-${previewId}`;

    // 2. Se estiver em processamento (PROCESSING), valida se o job ainda está vivo no BullMQ
    if (cachedState && cachedState.status === 'PROCESSING') {
      const updatedAtMs = cachedState.updatedAt
        ? new Date(cachedState.updatedAt).getTime()
        : 0;
      const isStaleByTime =
        updatedAtMs > 0 && Date.now() - updatedAtMs > 3 * 60 * 1000;

      if (!isStaleByTime) {
        if (
          this.studioPreviewQueue &&
          typeof (this.studioPreviewQueue as any).getJob === 'function'
        ) {
          try {
            const existingJob = await this.studioPreviewQueue.getJob(jobId);
            if (existingJob) {
              const jobState = await existingJob.getState();
              if (
                jobState === 'active' ||
                jobState === 'waiting' ||
                jobState === 'delayed' ||
                jobState === 'prioritized' ||
                jobState === 'waiting-children'
              ) {
                return cachedState;
              }
              // Job já terminou (completed/failed) mas o estado ficou preso em PROCESSING
              await existingJob.remove().catch(() => {});
            }
          } catch {
            return cachedState;
          }
        } else {
          return cachedState;
        }
      }

      // Estado órfão ou expirado: limpa para permitir novo enfileiramento
      this.evictPreviewCache(previewId);
    }

    // 3. Define estado inicial PROCESSING com streamUrl predefinida
    const initialState: StudioPreviewState = {
      previewId,
      status: 'PROCESSING',
      progress: 0,
      streamUrl: `/api/v1/media/preview/${previewId}/stream`,
      message: 'Processamento de preview enfileirado com sucesso.',
      updatedAt: new Date().toISOString(),
    };
    await this.updatePreviewState(previewId, initialState);

    // 4. Enfileira job assíncrono na fila isolada com deduplicação estrita via jobId
    if (this.studioPreviewQueue) {
      if (typeof (this.studioPreviewQueue as any).getJob === 'function') {
        try {
          const prevJob = await this.studioPreviewQueue.getJob(jobId);
          if (prevJob) {
            const prevState = await prevJob.getState();
            if (
              prevState === 'completed' ||
              prevState === 'failed' ||
              prevState === 'unknown'
            ) {
              await prevJob.remove().catch(() => {});
            }
          }
        } catch {}
      }

      await this.studioPreviewQueue.add(
        'prepare-preview',
        {
          previewId,
          sourceUrl: cleanUrl,
          userId,
        },
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }

    return initialState;
  }

  /**
   * Consulta o estado atual do processamento de preview no Redis / memória.
   */
  async getPreviewState(previewId: string): Promise<StudioPreviewState | null> {
    // 1. Memória local
    const memState = this.previewStateCache.get(previewId);
    if (memState) return memState;

    // 2. Redis compartilhado
    if (this.redisService) {
      try {
        const raw = await this.redisService.get(`studio:preview:${previewId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as StudioPreviewState;
          this.previewStateCache.set(previewId, parsed);
          return parsed;
        }
      } catch (err: any) {
        this.logger.warn(`Erro ao consultar status no Redis: ${err.message}`);
      }
    }

    // 3. Fallback: verifica se o arquivo físico já existe no disco e reconstrói metadados
    if (this.downloadService) {
      try {
        const filePath = this.downloadService.getPreviewFilePath(previewId);
        const exists = await this.downloadService.fileExists(filePath);
        if (exists) {
          let durationSeconds = 0;
          let width = 0;
          let height = 0;
          let waveformPeaks: number[] = [];

          if (this.ffmpegService) {
            const [metadata, peaks] = await Promise.all([
              this.ffmpegService.probeMetadata(filePath),
              this.ffmpegService.extractAudioWaveform(filePath, 70),
            ]);
            durationSeconds = metadata.durationSeconds;
            width = metadata.width;
            height = metadata.height;
            waveformPeaks = peaks;
          }

          const fallbackState: StudioPreviewState = {
            previewId,
            status: 'COMPLETED',
            progress: 100,
            streamUrl: `/api/v1/media/preview/${previewId}/stream`,
            durationSeconds,
            width,
            height,
            waveformPeaks,
            updatedAt: new Date().toISOString(),
          };
          this.previewStateCache.set(previewId, fallbackState);
          return fallbackState;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Consulta pública de status de preview para polling HTTP.
   */
  async getPreviewStatus(previewId: string): Promise<StudioPreviewState> {
    const state = await this.getPreviewState(previewId);
    if (!state) {
      throw new NotFoundException(`Preview [${previewId}] não encontrado.`);
    }
    return state;
  }

  /**
   * Atualiza e persiste o estado do preview no Redis e no cache em memória.
   */
  async updatePreviewState(
    previewId: string,
    state: Partial<StudioPreviewState>,
  ): Promise<StudioPreviewState> {
    const current = this.previewStateCache.get(previewId) || {
      previewId,
      status: 'PROCESSING' as const,
      updatedAt: new Date().toISOString(),
    };

    const updated: StudioPreviewState = {
      ...current,
      ...state,
      previewId,
      updatedAt: new Date().toISOString(),
    };

    this.previewStateCache.set(previewId, updated);

    // Sincroniza com o cache legado para compatibilidade direta
    if (updated.status === 'COMPLETED' && updated.streamUrl) {
      this.previewCache.set(previewId, {
        previewId,
        streamUrl: updated.streamUrl,
        durationSeconds: updated.durationSeconds || 0,
        width: updated.width || 0,
        height: updated.height || 0,
        waveformPeaks: updated.waveformPeaks || [],
      });
    }

    if (this.redisService) {
      try {
        await this.redisService.set(
          `studio:preview:${previewId}`,
          JSON.stringify(updated),
          'EX',
          3600, // 1 hora de TTL
        );
      } catch (err: any) {
        this.logger.warn(`Falha ao gravar estado do preview no Redis: ${err.message}`);
      }
    }

    return updated;
  }

  /**
   * Cancela ativamente um job de preview órfão no BullMQ e aborta seu download em voo.
   */
  async cancelOrphanPreview(previewId: string): Promise<void> {
    if (
      this.downloadService &&
      typeof (this.downloadService as any).cancelPreviewDownload === 'function'
    ) {
      this.downloadService.cancelPreviewDownload(previewId);
    }
    this.evictPreviewCache(previewId);
    if (
      this.studioPreviewQueue &&
      typeof (this.studioPreviewQueue as any).getJob === 'function'
    ) {
      try {
        const job = await this.studioPreviewQueue.getJob(`preview-${previewId}`);
        if (job) {
          await job.remove().catch(() => {});
        }
      } catch {}
    }
  }

  evictPreviewCache(previewId: string): void {
    this.previewCache.delete(previewId);
    this.inFlightPreviews.delete(previewId);
    this.previewStateCache.delete(previewId);
    if (this.redisService) {
      this.redisService.del(`studio:preview:${previewId}`).catch(() => {});
    }
    if (
      this.studioPreviewQueue &&
      typeof (this.studioPreviewQueue as any).getJob === 'function'
    ) {
      this.studioPreviewQueue
        .getJob(`preview-${previewId}`)
        .then((job) => job?.remove())
        .catch(() => {});
    }
  }

  getPreviewFilePath(previewId: string): string {
    if (!this.downloadService) {
      throw new BadRequestException('DownloadService não configurado.');
    }
    return this.downloadService.getPreviewFilePath(previewId);
  }

  async deleteStudioPreview(previewId: string): Promise<{ success: boolean }> {
    this.evictPreviewCache(previewId);
    if (this.downloadService) {
      await this.downloadService.deletePreviewFile(previewId);
    }
    return { success: true };
  }

  async clearPreviews(
    previewIdsOrUrls?: string[],
  ): Promise<{ success: boolean; cleared: number }> {
    const validItems = Array.isArray(previewIdsOrUrls)
      ? previewIdsOrUrls
          .filter((item) => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
      : [];

    if (validItems.length > 0) {
      for (const trimmed of validItems) {
        const previewId = /^[a-f0-9]{24}$/i.test(trimmed)
          ? trimmed
          : this.downloadService?.getPreviewId(trimmed) || trimmed;
        this.evictPreviewCache(previewId);
      }
      const cleared = this.downloadService
        ? await this.downloadService.clearAllPreviewFiles(validItems)
        : 0;
      return { success: true, cleared };
    }

    // Se nenhum identificador foi especificado, limpa todos os caches (memória, Redis e fila) e arquivos locais
    for (const previewId of Array.from(this.previewStateCache.keys())) {
      this.evictPreviewCache(previewId);
    }
    this.previewCache.clear();
    this.inFlightPreviews.clear();
    this.previewStateCache.clear();
    const cleared = this.downloadService
      ? await this.downloadService.clearAllPreviewFiles(undefined)
      : 0;
    return { success: true, cleared };
  }

  /**
   * Resolve o arquivo MP4 final renderizado para download no computador do usuário.
   */
  async getCompletedJobFile(
    id: string,
    userId: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const job = await this.videoJobRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!job) {
      throw new NotFoundException('Job de vídeo não encontrado.');
    }

    if (job.status === VideoJobStatus.EXPIRED) {
      throw new BadRequestException(
        'O download deste vídeo expirou após 24 horas e não está mais disponível no servidor.',
      );
    }

    if (job.status !== VideoJobStatus.COMPLETED || !job.final_video_path) {
      throw new BadRequestException('O vídeo ainda não finalizou o processamento.');
    }

    const resolvedPath = path.isAbsolute(job.final_video_path)
      ? job.final_video_path
      : path.resolve(process.cwd(), job.final_video_path);

    try {
      await fsPromises.access(resolvedPath, fs.constants.F_OK);
    } catch (accessErr: any) {
      if (accessErr?.code === 'ENOENT') {
        await this.videoJobRepository.update(id, {
          status: VideoJobStatus.EXPIRED,
          final_video_path: null,
        });
        throw new BadRequestException(
          'O arquivo deste vídeo expirou após 24 horas e não está mais disponível para download.',
        );
      }
      throw accessErr;
    }

    const safeTitle = (job.original_title || `video_${job.id.substring(0, 8)}`)
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u017F\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 80);

    return {
      filePath: resolvedPath,
      fileName: `${safeTitle || 'video_appframe'}.mp4`,
    };
  }

  /**
   * Cria registro no PostgreSQL com status PENDING e dispara job assíncrono para o BullMQ.
   */
  async createJob(
    userId: string,
    dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    if (dto.watermark_id) {
      // Garante que a marca d'água pertence ao usuário autenticado (Prevenção de IDOR)
      await this.watermarksService.findById(dto.watermark_id, userId);
    }

    if (dto.source_url && /\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(dto.source_url)) {
      throw new BadRequestException(
        'Transmissões ao vivo (lives) não são suportadas para cortes e renderização.',
      );
    }

    const isShorts = dto.aspect_ratio === '9:16';
    const defaultPlatform = VideoPlatform.YOUTUBE;


    const job = this.videoJobRepository.create({
      user_id: userId,
      source_url: dto.source_url,
      platform: dto.platform || defaultPlatform,
      aspect_ratio: dto.aspect_ratio || (isShorts ? '9:16' : '16:9'),
      original_title: dto.original_title || null,
      trim_start: dto.trim_start !== undefined ? dto.trim_start : null,
      trim_end: dto.trim_end !== undefined ? dto.trim_end : null,
      watermark_id: dto.watermark_id || null,
      watermark_position: dto.watermark_position || 'top-right',
      watermark_scale: dto.watermark_scale !== undefined && dto.watermark_scale !== null ? Number(dto.watermark_scale) : 100,
      watermark_opacity: dto.watermark_opacity !== undefined && dto.watermark_opacity !== null ? Number(dto.watermark_opacity) : 85,
      subtitle_config: dto.subtitle_config || null,
      status: VideoJobStatus.PENDING,
      progress: 0,
    });

    const saved = await this.videoJobRepository.save(job);

    // Enfileira processamento na fila isolada de download com jobId explícito para deduplicação
    await this.downloadQueue.add(
      'download-video',
      {
        jobId: saved.id,
        userId,
        sourceUrl: saved.source_url,
      },
      {
        jobId: `download-${saved.id}`,
      },
    );

    return VideoJobResponseDto.fromEntity(saved)!;
  }

  /**
   * Cria múltiplos registros no PostgreSQL e enfileira na MEDIA_DOWNLOAD_QUEUE (BullMQ)
   */
  async createDownloadBatch(
    userId: string,
    dto: DownloadBatchDto,
  ): Promise<VideoJobResponseDto[]> {
    const createdJobs: VideoJobResponseDto[] = [];
    for (const item of dto.videos) {
      const job = await this.createJob(userId, {
        source_url: item.url,
        original_title: item.title,
        platform: VideoPlatform.YOUTUBE,
      });
      createdJobs.push(job);
    }
    return createdJobs;
  }

  async getJobById(id: string, userId: string): Promise<VideoJobResponseDto> {
    const job = await this.videoJobRepository.findOne({
      where: { id, user_id: userId },
      relations: ['watermark'],
    });

    if (!job) {
      throw new NotFoundException('Job de vídeo não encontrado.');
    }

    return VideoJobResponseDto.fromEntity(job)!;
  }

  /**
   * Busca interna da entidade para workers e processadores
   */
  async getRawJobById(id: string): Promise<VideoJob | null> {
    return this.videoJobRepository.findOne({ where: { id } });
  }

  async listUserJobs(userId: string): Promise<VideoJobResponseDto[]> {
    const jobs = await this.videoJobRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return VideoJobResponseDto.fromEntities(jobs);
  }

  async deleteJob(id: string, userId: string): Promise<{ success: boolean }> {
    const job = await this.videoJobRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!job) {
      throw new NotFoundException('Job de vídeo não encontrado.');
    }

    if (job.final_video_path) {
      const resolved = path.isAbsolute(job.final_video_path)
        ? job.final_video_path
        : path.resolve(process.cwd(), job.final_video_path);
      try {
        await fsPromises.unlink(resolved);
      } catch (unlinkErr: any) {
        if (unlinkErr?.code !== 'ENOENT') {
          this.logger.warn(`Erro ao excluir vídeo final em disco ${resolved}: ${unlinkErr.message}`);
        }
      }
    }

    await this.videoJobRepository.delete({ id, user_id: userId });
    return { success: true };
  }

  /**
   * Atualiza progresso percentual (0 a 100) no PostgreSQL
   */
  async updateJobProgress(id: string, progress: number): Promise<void> {
    await this.videoJobRepository.update(id, {
      progress: Math.min(100, Math.max(0, Math.floor(progress))),
    });
  }

  async updateJobStatus(
    id: string,
    status: VideoJobStatus,
    data?: {
      finalVideoPath?: string;
      errorLog?: string;
      durationSeconds?: number;
      progress?: number;
    },
  ): Promise<VideoJobResponseDto> {
    const job = await this.videoJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job de vídeo não encontrado.');
    }

    job.status = status;
    if (data?.finalVideoPath !== undefined) job.final_video_path = data.finalVideoPath;
    if (data?.errorLog !== undefined) job.error_log = data.errorLog;
    if (data?.durationSeconds !== undefined) job.duration_seconds = data.durationSeconds;
    if (data?.progress !== undefined) job.progress = data.progress;

    const updated = await this.videoJobRepository.save(job);
    return VideoJobResponseDto.fromEntity(updated)!;
  }
}
