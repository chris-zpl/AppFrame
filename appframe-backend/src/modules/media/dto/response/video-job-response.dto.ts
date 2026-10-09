import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { VideoPlatform } from '../../enums/video-platform.enum';
import { VideoJobStatus } from '../../enums/video-job-status.enum';
import { SubtitleConfig } from '../../interfaces/subtitle-config.interface';
import { VideoJob } from '../../entities/video-job.entity';

@Exclude()
export class VideoJobResponseDto {
  @Expose()
  id: string;

  @Expose()
  user_id: string;

  @Expose()
  source_url: string;

  @Expose()
  platform: VideoPlatform;

  @Expose()
  original_title: string | null;

  @Expose()
  duration_seconds: number | null;

  @Expose()
  status: VideoJobStatus;

  @Expose()
  trim_start: number | null;

  @Expose()
  trim_end: number | null;

  @Expose()
  subtitle_config: SubtitleConfig | null;

  @Expose()
  watermark_id: string | null;

  @Expose()
  final_video_path: string | null;

  @Expose()
  error_log: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  static fromEntity(
    job: VideoJob | null | undefined,
  ): VideoJobResponseDto | null {
    if (!job) return null;
    return plainToInstance(VideoJobResponseDto, job, {
      excludeExtraneousValues: true,
    });
  }

  static fromEntities(jobs: VideoJob[]): VideoJobResponseDto[] {
    if (!jobs) return [];
    return jobs.map((j) => VideoJobResponseDto.fromEntity(j));
  }
}
