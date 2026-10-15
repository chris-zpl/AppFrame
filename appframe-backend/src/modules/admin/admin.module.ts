import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { UserSession } from '../users/entities/user-session.entity';
import { VideoJob } from '../media/entities/video-job.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { AdminSettingsService } from './services/admin-settings.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { MediaModule } from '../media/media.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSession, VideoJob, SystemSetting]),
    MediaModule,
    SharedModule,
    ConfigModule,
  ],
  providers: [AdminSettingsService, AdminUsersService],
  controllers: [AdminSettingsController, AdminUsersController],
  exports: [AdminSettingsService, AdminUsersService, TypeOrmModule],
})
export class AdminModule {}
