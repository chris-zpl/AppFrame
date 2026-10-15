import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'boolean', default: false })
  is_encrypted: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
