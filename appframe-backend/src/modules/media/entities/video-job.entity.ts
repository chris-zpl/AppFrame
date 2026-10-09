import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Watermark } from '../../watermarks/entities/watermark.entity';
import { VideoPlatform } from '../enums/video-platform.enum';
import { VideoJobStatus } from '../enums/video-job-status.enum';
import { SubtitleConfig } from '../interfaces/subtitle-config.interface';

@Entity('video_jobs')
export class VideoJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_video_jobs_user_id')
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.video_jobs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 1000 })
  source_url: string;

  @Column({
    type: 'enum',
    enum: VideoPlatform,
    default: VideoPlatform.OTHER,
  })
  platform: VideoPlatform;

  @Column({ type: 'varchar', length: 255, nullable: true })
  original_title: string | null;

  @Column({ type: 'integer', nullable: true })
  duration_seconds: number | null;

  @Index('idx_video_jobs_status')
  @Column({
    type: 'enum',
    enum: VideoJobStatus,
    default: VideoJobStatus.PENDING,
  })
  status: VideoJobStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  trim_start: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  trim_end: number | null;

  @Column({ type: 'jsonb', nullable: true })
  subtitle_config: SubtitleConfig | null;

  @Index('idx_video_jobs_watermark_id')
  @Column({ type: 'uuid', nullable: true })
  watermark_id: string | null;

  @ManyToOne(() => Watermark, (watermark) => watermark.video_jobs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'watermark_id' })
  watermark: Watermark | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  final_video_path: string | null;

  @Column({ type: 'text', nullable: true })
  error_log: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
