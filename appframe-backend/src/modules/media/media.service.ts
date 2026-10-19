import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import * as fs from 'fs';
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
import {
  MEDIA_DOWNLOAD_QUEUE,
  DownloadJobPayload,
} from '../../core/queue/queue.constants';

@Injectable()
export class MediaService {
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
    Promise<{
      previewId: string;
      streamUrl: string;
      durationSeconds: number;
      width: number;
      height: number;
      waveformPeaks: number[];
    }>
  >();

  constructor(
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
    @InjectQueue(MEDIA_DOWNLOAD_QUEUE)
    private readonly downloadQueue: Queue<DownloadJobPayload>,
    private readonly downloadService: DownloadService,
    private readonly ffmpegService: FFmpegService,
    private readonly watermarksService: WatermarksService,
  ) {}

  /**
   * Baixa o vídeo selecionado na varredura para visualização em tempo real no Studio
   * e retorna metadados reais (duração, dimensões, onda sonora real do áudio e URL de stream).
   * Implementa cache em memória e deduplicação de requisições simultâneas para prevenir
   * execuções repetidas e picos de uso de CPU/FFmpeg.
   */
  async prepareStudioPreview(sourceUrl: string): Promise<{
    previewId: string;
    streamUrl: string;
    durationSeconds: number;
    width: number;
    height: number;
    waveformPeaks: number[];
  }> {
    const cleanUrl = (sourceUrl || '').trim();
    if (!cleanUrl) {
      throw new BadRequestException('A URL do vídeo de origem é obrigatória.');
    }

    if (/\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(cleanUrl)) {
      throw new BadRequestException(
        'Transmissões ao vivo (lives) não são suportadas para cortes e renderização.',
      );
    }

    const previewId = this.downloadService.getPreviewId(cleanUrl);

    // 1. Verifica se já temos os metadados em cache e o arquivo existe em disco
    const cached = this.previewCache.get(previewId);
    if (cached) {
      try {
        const filePath = this.downloadService.getPreviewFilePath(previewId);
        if (fs.existsSync(filePath)) {
          return cached;
        }
      } catch {
        this.previewCache.delete(previewId);
      }
    }

    // 2. Se já houver um processamento em andamento para este mesmo preview, conecta à mesma Promise
    const inFlight = this.inFlightPreviews.get(previewId);
    if (inFlight) {
      return inFlight;
    }

    const operationPromise = (async () => {
      try {
        const { filePath } = await this.downloadService.ensurePreviewDownloaded(
          cleanUrl,
        );
        const [metadata, waveformPeaks] = await Promise.all([
          this.ffmpegService.probeMetadata(filePath),
          this.ffmpegService.extractAudioWaveform(filePath, 70),
        ]);

        const result = {
          previewId,
          streamUrl: `/api/v1/media/preview/${previewId}/stream`,
          durationSeconds: metadata.durationSeconds,
          width: metadata.width,
          height: metadata.height,
          waveformPeaks,
        };

        this.previewCache.set(previewId, result);
        return result;
      } finally {
        this.inFlightPreviews.delete(previewId);
      }
    })();

    this.inFlightPreviews.set(previewId, operationPromise);
    return operationPromise;
  }

  evictPreviewCache(previewId: string): void {
    this.previewCache.delete(previewId);
    this.inFlightPreviews.delete(previewId);
  }

  getPreviewFilePath(previewId: string): string {
    return this.downloadService.getPreviewFilePath(previewId);
  }

  async deleteStudioPreview(previewId: string): Promise<{ success: boolean }> {
    this.evictPreviewCache(previewId);
    await this.downloadService.deletePreviewFile(previewId);
    return { success: true };
  }

  async clearPreviews(
    previewIdsOrUrls?: string[],
  ): Promise<{ success: boolean; cleared: number }> {
    if (previewIdsOrUrls && previewIdsOrUrls.length > 0) {
      for (const item of previewIdsOrUrls) {
        if (!item || typeof item !== 'string') continue;
        const trimmed = item.trim();
        const previewId = /^[a-f0-9]{24}$/i.test(trimmed)
          ? trimmed
          : this.downloadService.getPreviewId(trimmed);
        this.evictPreviewCache(previewId);
      }
    } else {
      this.previewCache.clear();
      this.inFlightPreviews.clear();
    }

    const cleared = await this.downloadService.clearAllPreviewFiles(previewIdsOrUrls);
    return { success: true, cleared };
  }

  getYouTubeCookiesStatus() {
    return this.downloadService.getCookiesStatus();
  }

  saveYouTubeCookies(cookies: any) {
    return this.downloadService.saveCookies(cookies);
  }

  deleteYouTubeCookies() {
    return this.downloadService.deleteCookies();
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

    if (!fs.existsSync(resolvedPath)) {
      await this.videoJobRepository.update(id, {
        status: VideoJobStatus.EXPIRED,
        final_video_path: null,
      });
      throw new BadRequestException(
        'O arquivo deste vídeo expirou após 24 horas e não está mais disponível para download.',
      );
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

    // Enfileira processamento na fila isolada de download
    await this.downloadQueue.add('download-video', {
      jobId: saved.id,
      userId,
      sourceUrl: saved.source_url,
    });

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
      if (fs.existsSync(resolved)) {
        try {
          fs.unlinkSync(resolved);
        } catch {}
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
