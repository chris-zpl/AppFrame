import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { AuthProvider } from '../enums/auth-provider.enum';
import { UserRole } from '../enums/user-role.enum';
import { UserSession } from './user-session.entity';
import { Watermark } from '../../watermarks/entities/watermark.entity';
import { VideoJob } from '../../media/entities/video-job.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash: string | null;

  @Index('idx_users_google_id', { unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  google_id: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  auth_provider: AuthProvider;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_two_factor_enabled: boolean;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  totp_secret: string | null;

  @Exclude()
  @Column({ type: 'jsonb', nullable: true })
  recovery_codes: string[] | null;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  gemini_api_key: string | null;

  @OneToMany(() => UserSession, (session) => session.user, { cascade: true })
  sessions: UserSession[];

  @OneToMany(() => Watermark, (watermark) => watermark.user, { cascade: true })
  watermarks: Watermark[];

  @OneToMany(() => VideoJob, (videoJob) => videoJob.user, { cascade: true })
  video_jobs: VideoJob[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
