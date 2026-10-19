import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { VideoJob } from './entities/video-job.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { JobsController } from './jobs.controller';
import { DownloadService } from './services/download.service';
import { FFmpegService } from './services/ffmpeg.service';
import { DownloadProcessor } from './processors/download.processor';
import { RenderProcessor } from './processors/render.processor';
import { StorageCleanupProcessor } from './processors/storage-cleanup.processor';
import { StorageCleanupService } from './services/storage-cleanup.service';
import { WatermarksModule } from '../watermarks/watermarks.module';
import {
  MEDIA_DOWNLOAD_QUEUE,
  MEDIA_RENDER_QUEUE,
  STORAGE_CLEANUP_QUEUE,
} from '../../core/queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoJob]),
    BullModule.registerQueue(
      { name: MEDIA_DOWNLOAD_QUEUE },
      { name: MEDIA_RENDER_QUEUE },
      { name: STORAGE_CLEANUP_QUEUE },
    ),
    WatermarksModule,
  ],
  controllers: [MediaController, JobsController],
  providers: [
    MediaService,
    DownloadService,
    FFmpegService,
    StorageCleanupService,
    DownloadProcessor,
    RenderProcessor,
    StorageCleanupProcessor,
  ],
  exports: [MediaService, DownloadService, FFmpegService, StorageCleanupService, TypeOrmModule],
})
export class MediaModule {}
