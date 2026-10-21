import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SecurityAuditLog,
  SecurityAuditEvent,
} from './entities/security-audit-log.entity';

export interface LogSecurityEventOptions {
  userId?: string | null;
  action: SecurityAuditEvent | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger('SecurityAudit');
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'currentpassword',
    'newpassword',
    'token',
    'refreshtoken',
    'secret',
    'totp_secret',
    'authorization',
  ]);

  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditRepository: Repository<SecurityAuditLog>,
  ) {}

  private sanitizeMetadata(
    metadata?: Record<string, any> | null,
  ): Record<string, any> | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const sanitized: Record<string, any> = Array.isArray(metadata) ? [] : {};

    for (const [key, value] of Object.entries(metadata)) {
      if (SecurityAuditService.SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Registra um evento de auditoria no log estruturado e na tabela persistente de auditoria (PostgreSQL).
   */
  async logEvent(options: LogSecurityEventOptions): Promise<SecurityAuditLog> {
    const { userId, action, ipAddress, userAgent, metadata } = options;
    const sanitizedMetadata = this.sanitizeMetadata(metadata);

    // 1. Emite log estruturado no console / stdout (para captura via Docker / APM)
    const logDetails = {
      action,
      userId: userId || 'anonymous',
      ip: ipAddress || 'unknown',
      ...(sanitizedMetadata ? { metadata: sanitizedMetadata } : {}),
    };
    this.logger.log(`[AUDIT] ${JSON.stringify(logDetails)}`);

    // 2. Persiste na base de dados relacional para consulta e auditoria contínua
    const record = this.auditRepository.create({
      user_id: userId || null,
      action,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata: sanitizedMetadata,
    });

    try {
      return await this.auditRepository.save(record);
    } catch (err: any) {
      this.logger.error(
        `Falha ao salvar registro de auditoria na base de dados: ${err.message}`,
        err.stack,
      );
      return record;
    }
  }

  /**
   * Consulta os últimos registros de auditoria por usuário ou geral
   */
  async findLogs(userId?: string, limit: number = 500): Promise<SecurityAuditLog[]> {
    const where = userId ? { user_id: userId } : {};
    const safeLimit = Math.min(limit, 1000);
    return this.auditRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: safeLimit,
    });
  }
}
