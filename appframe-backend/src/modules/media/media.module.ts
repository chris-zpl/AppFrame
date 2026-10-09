import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { VideoJob } from './entities/video-job.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { DownloadService } from './services/download.service';
import { FFmpegService } from './services/ffmpeg.service';
import { DownloadProcessor } from './processors/download.processor';
import { RenderProcessor } from './processors/render.processor';
import { WatermarksModule } from '../watermarks/watermarks.module';
import {
  MEDIA_DOWNLOAD_QUEUE,
  MEDIA_RENDER_QUEUE,
} from '../../core/queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoJob]),
    BullModule.registerQueue(
      { name: MEDIA_DOWNLOAD_QUEUE },
      { name: MEDIA_RENDER_QUEUE },
    ),
    WatermarksModule,
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    DownloadService,
    FFmpegService,
    DownloadProcessor,
    RenderProcessor,
  ],
  exports: [MediaService, DownloadService, FFmpegService, TypeOrmModule],
})
export class MediaModule {}
