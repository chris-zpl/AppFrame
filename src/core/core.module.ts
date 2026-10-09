import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [DatabaseModule, SecurityModule],
  exports: [DatabaseModule, SecurityModule],
})
export class CoreModule {}
