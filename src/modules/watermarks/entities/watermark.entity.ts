import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VideoJob } from '../../media/entities/video-job.entity';

@Entity('watermarks')
export class Watermark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_watermarks_user_id')
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.watermarks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 500 })
  storage_path: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @OneToMany(() => VideoJob, (job) => job.watermark)
  video_jobs: VideoJob[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
