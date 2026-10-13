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
import {
  MEDIA_DOWNLOAD_QUEUE,
  DownloadJobPayload,
} from '../../core/queue/queue.constants';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
    @InjectQueue(MEDIA_DOWNLOAD_QUEUE)
    private readonly downloadQueue: Queue<DownloadJobPayload>,
    private readonly downloadService: DownloadService,
    private readonly ffmpegService: FFmpegService,
  ) {}

  /**
   * Baixa o vídeo selecionado na varredura para visualização em tempo real no Studio
   * e retorna metadados reais (duração, dimensões e URL de stream).
   */
  async prepareStudioPreview(sourceUrl: string): Promise<{
    previewId: string;
    streamUrl: string;
    durationSeconds: number;
    width: number;
    height: number;
  }> {
    const { previewId, filePath } = await this.downloadService.ensurePreviewDownloaded(
      sourceUrl,
    );
    const metadata = await this.ffmpegService.probeMetadata(filePath);

    return {
      previewId,
      streamUrl: `/api/v1/media/preview/${previewId}/stream`,
      durationSeconds: metadata.durationSeconds,
      width: metadata.width,
      height: metadata.height,
    };
  }

  getPreviewFilePath(previewId: string): string {
    return this.downloadService.getPreviewFilePath(previewId);
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

    if (job.status !== VideoJobStatus.COMPLETED || !job.final_video_path) {
      throw new BadRequestException('O vídeo ainda não finalizou o processamento.');
    }

    const resolvedPath = path.isAbsolute(job.final_video_path)
      ? job.final_video_path
      : path.resolve(process.cwd(), job.final_video_path);

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException('Arquivo de vídeo processado não encontrado no servidor.');
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
    const job = this.videoJobRepository.create({
      user_id: userId,
      source_url: dto.source_url,
      platform: dto.platform || VideoPlatform.OTHER,
      original_title: dto.original_title || null,
      trim_start: dto.trim_start !== undefined ? dto.trim_start : null,
      trim_end: dto.trim_end !== undefined ? dto.trim_end : null,
      watermark_id: dto.watermark_id || null,
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
