import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoJob } from './entities/video-job.entity';
import { VideoJobResponseDto } from './dto/response/video-job-response.dto';
import { CreateVideoJobDto } from './dto/request/create-video-job.dto';
import { VideoJobStatus } from './enums/video-job-status.enum';
import { VideoPlatform } from './enums/video-platform.enum';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
  ) {}

  async createJob(
    userId: string,
    dto: CreateVideoJobDto,
  ): Promise<VideoJobResponseDto> {
    const job = this.videoJobRepository.create({
      user_id: userId,
      source_url: dto.source_url,
      platform: dto.platform || VideoPlatform.OTHER,
      original_title: dto.original_title || null,
      trim_start: dto.trim_start || null,
      trim_end: dto.trim_end || null,
      watermark_id: dto.watermark_id || null,
      subtitle_config: dto.subtitle_config || null,
      status: VideoJobStatus.PENDING,
    });

    const saved = await this.videoJobRepository.save(job);
    return VideoJobResponseDto.fromEntity(saved)!;
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

  async listUserJobs(userId: string): Promise<VideoJobResponseDto[]> {
    const jobs = await this.videoJobRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return VideoJobResponseDto.fromEntities(jobs);
  }

  async updateJobStatus(
    id: string,
    status: VideoJobStatus,
    data?: { finalVideoPath?: string; errorLog?: string; durationSeconds?: number },
  ): Promise<VideoJobResponseDto> {
    const job = await this.videoJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job de vídeo não encontrado.');
    }

    job.status = status;
    if (data?.finalVideoPath) job.final_video_path = data.finalVideoPath;
    if (data?.errorLog) job.error_log = data.errorLog;
    if (data?.durationSeconds !== undefined) job.duration_seconds = data.durationSeconds;

    const updated = await this.videoJobRepository.save(job);
    return VideoJobResponseDto.fromEntity(updated)!;
  }
}
