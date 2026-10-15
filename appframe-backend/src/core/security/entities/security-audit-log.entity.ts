import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SecurityAuditEvent {
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PROFILE_EMAIL_CHANGED = 'PROFILE_EMAIL_CHANGED',
  PROFILE_NAME_CHANGED = 'PROFILE_NAME_CHANGED',
  GOOGLE_ACCOUNT_LINKED = 'GOOGLE_ACCOUNT_LINKED',
  GOOGLE_ACCOUNT_UNLINKED = 'GOOGLE_ACCOUNT_UNLINKED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
}

@Entity('security_audit_logs')
export class SecurityAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_security_audit_logs_user_id')
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Index('idx_security_audit_logs_action')
  @Column({ type: 'varchar', length: 60 })
  action: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Index('idx_security_audit_logs_created_at')
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
