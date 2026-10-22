import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../../modules/users/entities/user.entity';
import { UserSession } from '../../modules/users/entities/user-session.entity';
import { Watermark } from '../../modules/watermarks/entities/watermark.entity';
import { VideoJob } from '../../modules/media/entities/video-job.entity';
import { SystemSetting } from '../../modules/admin/entities/system-setting.entity';
import { SecurityAuditLog } from '../security/entities/security-audit-log.entity';
import { InitialAppFrameSchema1740000000000 } from './migrations/1740000000000-InitialAppFrameSchema';
import { AddUserRoleAndStatus1740000000001 } from './migrations/1740000000001-AddUserRoleAndStatus';
import { AddGoogleEmailAndEmailChangedAt1740000000002 } from './migrations/1740000000002-AddGoogleEmailAndEmailChangedAt';
import { CreateSecurityAuditLogsTable1740000000003 } from './migrations/1740000000003-CreateSecurityAuditLogsTable';
import { AddExpiredStatusToVideoJob1740000000004 } from './migrations/1740000000004-AddExpiredStatusToVideoJob';
import { RemoveGeminiApiKeyFromUsers1740000000005 } from './migrations/1740000000005-RemoveGeminiApiKeyFromUsers';
import { CreateSystemSettingsTable1740000000006 } from './migrations/1740000000006-CreateSystemSettingsTable';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'appframe',
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  entities: [User, UserSession, Watermark, VideoJob, SystemSetting, SecurityAuditLog],
  migrations: [
    InitialAppFrameSchema1740000000000,
    AddUserRoleAndStatus1740000000001,
    AddGoogleEmailAndEmailChangedAt1740000000002,
    CreateSecurityAuditLogsTable1740000000003,
    AddExpiredStatusToVideoJob1740000000004,
    RemoveGeminiApiKeyFromUsers1740000000005,
    CreateSystemSettingsTable1740000000006,
  ],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
