import { Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [StorageModule, MailModule],
  exports: [StorageModule, MailModule],
})
export class SharedModule {}

