import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MEDIA_DOWNLOAD_QUEUE,
  MEDIA_RENDER_QUEUE,
  STORAGE_CLEANUP_QUEUE,
} from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        prefix: 'bull_appframe',
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get('REDIS_PORT', 6379)),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null, // Obrigatório para BullMQ
          enableReadyCheck: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 3600 * 24, // 24 horas
            count: 1000,
          },
          removeOnFail: {
            age: 3600 * 48, // 48 horas para auditoria
          },
          lockDuration: 300000,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: MEDIA_DOWNLOAD_QUEUE,
      },
      {
        name: MEDIA_RENDER_QUEUE,
      },
      {
        name: STORAGE_CLEANUP_QUEUE,
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
