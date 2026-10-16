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

  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditRepository: Repository<SecurityAuditLog>,
  ) {}

  /**
   * Registra um evento de auditoria no log estruturado e na tabela persistente de auditoria (PostgreSQL).
   */
  async logEvent(options: LogSecurityEventOptions): Promise<SecurityAuditLog> {
    const { userId, action, ipAddress, userAgent, metadata } = options;

    // 1. Emite log estruturado no console / stdout (para captura via Docker / APM)
    const logDetails = {
      action,
      userId: userId || 'anonymous',
      ip: ipAddress || 'unknown',
      ...(metadata ? { metadata } : {}),
    };
    this.logger.log(`[AUDIT] ${JSON.stringify(logDetails)}`);

    // 2. Persiste na base de dados relacional para consulta e auditoria contínua
    const record = this.auditRepository.create({
      user_id: userId || null,
      action,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata: metadata || null,
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
    return this.auditRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
