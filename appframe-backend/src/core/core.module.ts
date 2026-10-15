import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './security/security.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [DatabaseModule, SecurityModule, QueueModule, RedisModule],
  exports: [DatabaseModule, SecurityModule, QueueModule, RedisModule],
})
export class CoreModule {}
