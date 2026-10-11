import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { VideoJob } from './entities/video-job.entity';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { DownloadBatchDto } from './dto/request/download-batch.dto';
import { VideoJobStatus } from './enums/video-job-status.enum';
import { VideoPlatform } from './enums/video-platform.enum';
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
  ) {}

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
