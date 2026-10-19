import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { STORAGE_CLEANUP_QUEUE } from '../../../core/queue/queue.constants';
import {
  StorageCleanupService,
  StorageCleanupSummary,
} from '../services/storage-cleanup.service';

@Processor(STORAGE_CLEANUP_QUEUE)
export class StorageCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(StorageCleanupProcessor.name);

  constructor(private readonly cleanupService: StorageCleanupService) {
    super();
  }

  async process(job: Job): Promise<StorageCleanupSummary | null> {
    this.logger.log(
      `[BullMQ] Processando tarefa de limpeza de storage (Job ID: ${job.id || 'periodic'})...`,
    );
    const summary = await this.cleanupService.runCleanupSafe('bullmq-queue');
    return summary;
  }
}
