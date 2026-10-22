import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get('DB_PORT', 5432)),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'appframe'),
        entities: [User, UserSession, Watermark, VideoJob, SystemSetting, SecurityAuditLog],
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        migrationsRun: configService.get<string>('DB_MIGRATIONS_RUN', 'true') === 'true',
        migrations: [
          InitialAppFrameSchema1740000000000,
          AddUserRoleAndStatus1740000000001,
          AddGoogleEmailAndEmailChangedAt1740000000002,
          CreateSecurityAuditLogsTable1740000000003,
          AddExpiredStatusToVideoJob1740000000004,
          RemoveGeminiApiKeyFromUsers1740000000005,
          CreateSystemSettingsTable1740000000006,
        ],
        logging: configService.get<string>('NODE_ENV') !== 'production',
        ssl:
          configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
