import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../modules/users/entities/user.entity';
import { UserSession } from '../../modules/users/entities/user-session.entity';
import { Watermark } from '../../modules/watermarks/entities/watermark.entity';
import { VideoJob } from '../../modules/media/entities/video-job.entity';
import { SystemSetting } from '../../modules/admin/entities/system-setting.entity';
import { InitialAppFrameSchema1740000000000 } from './migrations/1740000000000-InitialAppFrameSchema';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'appframe'),
        entities: [User, UserSession, Watermark, VideoJob, SystemSetting],
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        migrationsRun: configService.get<string>('DB_MIGRATIONS_RUN', 'true') === 'true',
        migrations: [InitialAppFrameSchema1740000000000],
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
