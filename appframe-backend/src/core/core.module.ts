import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './security/security.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [DatabaseModule, SecurityModule, QueueModule],
  exports: [DatabaseModule, SecurityModule, QueueModule],
})
export class CoreModule {}
