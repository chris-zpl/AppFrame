import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './encryption.service';
import { SecurityAuditService } from './security-audit.service';
import { SecurityAuditLog } from './entities/security-audit-log.entity';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SecurityAuditLog])],
  providers: [EncryptionService, SecurityAuditService],
  exports: [EncryptionService, SecurityAuditService],
})
export class SecurityModule {}
