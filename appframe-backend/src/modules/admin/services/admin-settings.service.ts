import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemSetting } from '../entities/system-setting.entity';
import { EncryptionService } from '../../../core/security/encryption.service';
import { DownloadService } from '../../media/services/download.service';
import { GoogleGenAI } from '@google/genai';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import {
  DEFAULT_LEGAL_CONFIG,
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_PRIVACY_POLICY,
  interpolateLegalDocument,
} from '../constants/default-legal-documents';
import { SecurityAuditService } from '../../../core/security/security-audit.service';
import { SecurityAuditEvent } from '../../../core/security/entities/security-audit-log.entity';


export interface SmtpConfigDto {
  host: string;
  port: number;
  user: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  secure?: boolean;
}

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    private readonly encryptionService: EncryptionService,
    private readonly downloadService: DownloadService,
    private readonly configService: ConfigService,
    private readonly auditService: SecurityAuditService,
  ) {}

  // --- Helper genérico de configurações ---

  async getSetting(key: string): Promise<string | null> {
    const record = await this.settingRepository.findOne({ where: { key } });
    if (!record) return null;
    if (record.is_encrypted) {
      try {
        return this.encryptionService.decrypt(record.value);
      } catch (err: any) {
        this.logger.error(`Erro ao descriptografar chave ${key}: ${err.message}`);
        return null;
      }
    }
    return record.value;
  }

  async saveSetting(key: string, value: string, isEncrypted = false): Promise<void> {
    const cleanVal = (value || '').trim();
    const storedVal = isEncrypted ? this.encryptionService.encrypt(cleanVal) : cleanVal;
    let setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingRepository.create({
        key,
        value: storedVal,
        is_encrypted: isEncrypted,
      });
    } else {
      setting.value = storedVal;
      setting.is_encrypted = isEncrypted;
    }
    await this.settingRepository.save(setting);
  }

  async deleteSetting(key: string): Promise<void> {
    await this.settingRepository.delete({ key });
  }

  // --- YouTube Cookies Globais ---

  getYouTubeCookiesStatus(): {
    configured: boolean;
    hasCookies: boolean;
    path: string | null;
    filePath: string | null;
    updatedAt: string | null;
    sizeBytes: number;
  } {
    const status = this.downloadService.getCookiesStatus();
    let sizeBytes = 0;
    if (status.path && fs.existsSync(status.path)) {
      try {
        sizeBytes = fs.statSync(status.path).size;
      } catch {}
    }
    return {
      configured: status.configured,
      hasCookies: status.configured,
      path: status.path,
      filePath: status.path,
      updatedAt: status.updatedAt,
      sizeBytes,
    };
  }

  saveYouTubeCookies(cookies: any) {
    return this.downloadService.saveCookies(cookies);
  }

  deleteYouTubeCookies() {
    return this.downloadService.deleteCookies();
  }

  // --- Google Gemini Global ---

  async getGeminiStatus(): Promise<{
    configured: boolean;
    hasKey: boolean;
    maskedKey: string | null;
    model: string;
    source: 'database' | 'environment' | 'none';
  }> {
    const dbKey = await this.getSetting('GEMINI_API_KEY');
    const model =
      (await this.getSetting('GEMINI_MODEL')) ||
      this.configService.get<string>('GEMINI_MODEL', 'gemini-3.8-flash');

    const envKey = this.configService.get<string>('GEMINI_API_KEY');
    const activeKey = dbKey || envKey || null;
    const hasKey = Boolean(activeKey);
    const maskedKey = activeKey
      ? activeKey.length > 8
        ? `${activeKey.slice(0, 4)}••••••••${activeKey.slice(-4)}`
        : '••••••••'
      : null;

    if (dbKey) {
      return { configured: true, hasKey: true, maskedKey, model, source: 'database' };
    }

    if (envKey) {
      return { configured: true, hasKey: true, maskedKey, model, source: 'environment' };
    }

    return { configured: false, hasKey: false, maskedKey: null, model, source: 'none' };
  }

  async saveGeminiApiKey(apiKey: string, modelName?: string): Promise<{ success: boolean; message: string }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey || cleanKey.length < 15) {
      throw new BadRequestException('Informe uma chave de API válida do Google AI Studio.');
    }

    const candidateModels = Array.from(
      new Set(
        [
          modelName,
          this.configService.get<string>('GEMINI_MODEL'),
          'gemini-3.8-flash',
          'gemini-3.5-flash-lite',
          'gemini-3-flash-preview',
          'gemini-3.1-flash-lite',
          'gemini-3.5-flash',
          'gemini-flash-latest',
        ].filter(Boolean),
      ),
    ) as string[];

    let validatedModel: string | null = null;
    let lastError: any = null;

    const ai = new GoogleGenAI({ apiKey: cleanKey });

    for (const cand of candidateModels) {
      try {
        await ai.models.generateContent({
          model: cand,
          contents: 'Ping',
        });
        validatedModel = cand;
        break;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Validação Gemini com modelo ${cand} falhou: ${err.message}`);
      }
    }

    if (!validatedModel) {
      try {
        const response = await ai.models.list();
        const list = (response as any)?.models || (Array.isArray(response) ? response : []);
        const flashModel = list.find((m: any) => {
          const name = (m?.name || '').toLowerCase();
          const methods = m?.supportedGenerationMethods || [];
          return (
            (methods.includes('generateContent') || methods.length === 0) &&
            (name.includes('flash') || name.includes('gemini'))
          );
        });
        if (flashModel?.name) {
          const modelToUse = flashModel.name.replace(/^models\//, '');
          await ai.models.generateContent({
            model: modelToUse,
            contents: 'Ping',
          });
          validatedModel = modelToUse;
        }
      } catch (listErr: any) {
        this.logger.warn(`Listagem de modelos alternativos do Gemini falhou: ${listErr.message}`);
      }
    }

    if (!validatedModel) {
      throw new BadRequestException(
        `Chave de API do Gemini inválida ou sem permissão: ${lastError?.message || 'Falha ao autenticar com os modelos disponíveis'}`,
      );
    }

    await this.saveSetting('GEMINI_API_KEY', cleanKey, true);
    await this.saveSetting('GEMINI_MODEL', validatedModel, false);

    return {
      success: true,
      message: `Chave global do Google Gemini validada e salva com sucesso (modelo: ${validatedModel})!`,
    };
  }

  async testGeminiConnection(): Promise<{ success: boolean; message: string; model: string }> {
    const dbKey = await this.getSetting('GEMINI_API_KEY');
    const key = dbKey || this.configService.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new BadRequestException('Nenhuma chave do Gemini está configurada no servidor.');
    }

    const savedModel =
      (await this.getSetting('GEMINI_MODEL')) ||
      this.configService.get<string>('GEMINI_MODEL') ||
      'gemini-3.8-flash';

    const candidateModels = Array.from(
      new Set(
        [
          savedModel,
          'gemini-3.8-flash',
          'gemini-3.5-flash-lite',
          'gemini-3-flash-preview',
          'gemini-flash-latest',
        ].filter(Boolean),
      ),
    ) as string[];

    const ai = new GoogleGenAI({ apiKey: key });
    let workingModel: string | null = null;
    let lastError: any = null;

    for (const cand of candidateModels) {
      try {
        await ai.models.generateContent({
          model: cand,
          contents: 'Teste de conexão AppFrame',
        });
        workingModel = cand;
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!workingModel) {
      throw new BadRequestException(
        `Falha ao comunicar com Google Gemini: ${lastError?.message || 'Nenhum modelo compatível pôde ser acessado.'}`,
      );
    }

    if (workingModel !== savedModel) {
      await this.saveSetting('GEMINI_MODEL', workingModel, false);
    }

    return {
      success: true,
      message: `Conexão com Google Gemini (${workingModel}) estabelecida com sucesso!`,
      model: workingModel,
    };
  }

  async deleteGeminiApiKey(): Promise<{ success: boolean; message: string }> {
    await this.deleteSetting('GEMINI_API_KEY');
    return {
      success: true,
      message: 'Chave global do Google Gemini removida do servidor.',
    };
  }

  // --- SMTP / Servidor de Email ---

  async getSmtpConfig(): Promise<{
    host: string;
    port: number;
    user: string;
    hasPassword: boolean;
    fromName: string;
    fromEmail: string;
    secure: boolean;
  }> {
    const host = (await this.getSetting('SMTP_HOST')) || this.configService.get<string>('SMTP_HOST', '');
    const portStr = (await this.getSetting('SMTP_PORT')) || this.configService.get<string>('SMTP_PORT', '587');
    const user = (await this.getSetting('SMTP_USER')) || this.configService.get<string>('SMTP_USER', '');
    const pass = await this.getSetting('SMTP_PASSWORD');
    const fromName = (await this.getSetting('SMTP_FROM_NAME')) || this.configService.get<string>('SMTP_FROM_NAME', 'AppFrame');
    const fromEmail = (await this.getSetting('SMTP_FROM_EMAIL')) || this.configService.get<string>('SMTP_FROM_EMAIL', '');
    const secureStr = (await this.getSetting('SMTP_SECURE')) || this.configService.get<string>('SMTP_SECURE', 'false');

    return {
      host,
      port: parseInt(portStr, 10) || 587,
      user,
      hasPassword: Boolean(pass || this.configService.get<string>('SMTP_PASSWORD')),
      fromName,
      fromEmail,
      secure: secureStr === 'true',
    };
  }

  async saveSmtpConfig(dto: SmtpConfigDto): Promise<{ success: boolean; message: string }> {
    if (!dto.host) throw new BadRequestException('Host SMTP é obrigatório.');
    if (!dto.port) throw new BadRequestException('Porta SMTP é obrigatória.');

    await this.saveSetting('SMTP_HOST', dto.host.trim(), false);
    await this.saveSetting('SMTP_PORT', dto.port.toString(), false);
    await this.saveSetting('SMTP_USER', (dto.user || '').trim(), false);
    await this.saveSetting('SMTP_FROM_NAME', (dto.fromName || 'AppFrame').trim(), false);
    await this.saveSetting('SMTP_FROM_EMAIL', (dto.fromEmail || dto.user || '').trim(), false);
    await this.saveSetting('SMTP_SECURE', dto.secure ? 'true' : 'false', false);

    if (dto.password && dto.password.trim()) {
      await this.saveSetting('SMTP_PASSWORD', dto.password.trim(), true);
    }

    return {
      success: true,
      message: 'Configurações de SMTP salvas com sucesso!',
    };
  }

  async testSmtp(toEmail: string): Promise<{ success: boolean; message: string }> {
    const cleanTo = (toEmail || '').trim();
    if (!cleanTo || !cleanTo.includes('@')) {
      throw new BadRequestException('Informe um email de destino válido para o teste.');
    }

    const config = await this.getSmtpConfig();
    if (!config.host) {
      throw new BadRequestException('Configure o Host SMTP antes de testar o envio.');
    }

    const password = (await this.getSetting('SMTP_PASSWORD')) || this.configService.get<string>('SMTP_PASSWORD', '');

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? {
            user: config.user,
            pass: password,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    try {
      await transporter.verify();
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
        to: cleanTo,
        subject: 'AppFrame • Teste de Configuração SMTP Concluído com Sucesso',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f141c; color: #f0f4f8; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: #6366f1; margin-bottom: 12px;">AppFrame SMTP Conectado!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #c0c8d4;">
              Este é um email de teste automático enviado pelo painel de controle administrativo do <strong>AppFrame</strong>.
            </p>
            <div style="margin: 20px 0; padding: 14px; background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 4px; font-size: 13px;">
              <strong>Host:</strong> ${config.host}:${config.port}<br/>
              <strong>Usuário:</strong> ${config.user || 'Autenticação desabilitada'}<br/>
              <strong>Segurança:</strong> ${config.secure ? 'SSL/TLS' : 'STARTTLS'}
            </div>
            <p style="font-size: 12px; color: #7a869a;">
              Sua plataforma está pronta para enviar notificações, links de recuperação e alertas.
            </p>
          </div>
        `,
      });

      return {
        success: true,
        message: `Email de teste enviado com sucesso para ${cleanTo}!`,
      };
    } catch (err: any) {
      this.logger.error(`Falha no envio de email de teste SMTP: ${err.message}`);
      throw new BadRequestException(`Erro ao conectar ao servidor SMTP: ${err.message}`);
    }
  }

  // --- Documentos Legais: Termos de Serviço e Política de Privacidade ---

  private formatDatePtBr(date?: Date | string | null): string {
    const d = date ? new Date(date) : new Date();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  }

  async getLegalDocuments(): Promise<LegalDocumentsResponse> {
    const companyName = (await this.getSetting('LEGAL_COMPANY_NAME')) || DEFAULT_LEGAL_CONFIG.companyName;
    const contactEmail = (await this.getSetting('LEGAL_CONTACT_EMAIL')) || DEFAULT_LEGAL_CONFIG.contactEmail;
    const dpoEmail = (await this.getSetting('LEGAL_DPO_EMAIL')) || DEFAULT_LEGAL_CONFIG.dpoEmail;
    const websiteUrl =
      (await this.getSetting('LEGAL_WEBSITE_URL')) ||
      (this.configService.get<string>('APP_URL') || DEFAULT_LEGAL_CONFIG.websiteUrl).replace(/\/+$/, '');
    const forumCity = (await this.getSetting('LEGAL_FORUM_CITY')) || DEFAULT_LEGAL_CONFIG.forumCity;
    const retentionPeriod = (await this.getSetting('LEGAL_RETENTION_PERIOD')) || DEFAULT_LEGAL_CONFIG.retentionPeriod;

    // Termos de Serviço
    const termsSetting = await this.settingRepository.findOne({ where: { key: 'LEGAL_TERMS_OF_SERVICE' } });
    const rawTerms = termsSetting?.value || DEFAULT_TERMS_OF_SERVICE;
    const termsUpdatedAt = (await this.getSetting('LEGAL_TERMS_UPDATED_AT')) || this.formatDatePtBr(termsSetting?.updated_at);

    // Política de Privacidade
    const privacySetting = await this.settingRepository.findOne({ where: { key: 'LEGAL_PRIVACY_POLICY' } });
    const rawPrivacy = privacySetting?.value || DEFAULT_PRIVACY_POLICY;
    const privacyUpdatedAt = (await this.getSetting('LEGAL_PRIVACY_UPDATED_AT')) || this.formatDatePtBr(privacySetting?.updated_at);

    const variables = {
      publishDate: termsUpdatedAt,
      companyName,
      contactEmail,
      dpoEmail,
      websiteUrl,
      forumCity,
      retentionPeriod,
    };

    const renderedTerms = interpolateLegalDocument(rawTerms, {
      ...variables,
      publishDate: termsUpdatedAt,
    });

    const renderedPrivacy = interpolateLegalDocument(rawPrivacy, {
      ...variables,
      publishDate: privacyUpdatedAt,
    });

    return {
      terms: {
        raw: rawTerms,
        rendered: renderedTerms,
        updatedAt: termsUpdatedAt,
      },
      privacy: {
        raw: rawPrivacy,
        rendered: renderedPrivacy,
        updatedAt: privacyUpdatedAt,
      },
      variables,
    };
  }

  async saveLegalDocuments(
    dto: LegalDocumentsDto,
    auditContext?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean; message: string }> {
    const nowFormatted = this.formatDatePtBr(new Date());

    if (dto.companyName !== undefined) {
      await this.saveSetting('LEGAL_COMPANY_NAME', dto.companyName.trim(), false);
    }
    if (dto.contactEmail !== undefined) {
      await this.saveSetting('LEGAL_CONTACT_EMAIL', dto.contactEmail.trim(), false);
    }
    if (dto.dpoEmail !== undefined) {
      await this.saveSetting('LEGAL_DPO_EMAIL', dto.dpoEmail.trim(), false);
    }
    if (dto.websiteUrl !== undefined) {
      await this.saveSetting('LEGAL_WEBSITE_URL', dto.websiteUrl.trim(), false);
    }
    if (dto.forumCity !== undefined) {
      await this.saveSetting('LEGAL_FORUM_CITY', dto.forumCity.trim(), false);
    }
    if (dto.retentionPeriod !== undefined) {
      await this.saveSetting('LEGAL_RETENTION_PERIOD', dto.retentionPeriod.trim(), false);
    }

    if (dto.termsOfService !== undefined && dto.termsOfService.trim()) {
      await this.saveSetting('LEGAL_TERMS_OF_SERVICE', dto.termsOfService.trim(), false);
      await this.saveSetting('LEGAL_TERMS_UPDATED_AT', nowFormatted, false);
    }

    if (dto.privacyPolicy !== undefined && dto.privacyPolicy.trim()) {
      await this.saveSetting('LEGAL_PRIVACY_POLICY', dto.privacyPolicy.trim(), false);
      await this.saveSetting('LEGAL_PRIVACY_UPDATED_AT', nowFormatted, false);
    }

    if (this.auditService) {
      await this.auditService.logEvent({
        userId: auditContext?.userId || null,
        action: SecurityAuditEvent.LEGAL_DOCUMENTS_UPDATED,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        metadata: {
          updatedFields: Object.keys(dto),
          updatedAt: nowFormatted,
        },
      });
    }

    return {
      success: true,
      message: 'Termos de Serviço e Política de Privacidade atualizados com sucesso!',
    };
  }

  async resetLegalDocumentsToDefault(auditContext?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string }> {
    await this.deleteSetting('LEGAL_TERMS_OF_SERVICE');
    await this.deleteSetting('LEGAL_PRIVACY_POLICY');
    await this.deleteSetting('LEGAL_TERMS_UPDATED_AT');
    await this.deleteSetting('LEGAL_PRIVACY_UPDATED_AT');

    if (this.auditService) {
      await this.auditService.logEvent({
        userId: auditContext?.userId || null,
        action: SecurityAuditEvent.LEGAL_DOCUMENTS_UPDATED,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        metadata: { resetToDefault: true },
      });
    }

    return {
      success: true,
      message: 'Termos e Política de Privacidade restaurados para a minuta oficial padrão!',
    };
  }
}

export interface LegalDocumentsDto {
  termsOfService?: string;
  privacyPolicy?: string;
  companyName?: string;
  contactEmail?: string;
  dpoEmail?: string;
  websiteUrl?: string;
  forumCity?: string;
  retentionPeriod?: string;
}

export interface LegalDocumentsResponse {
  terms: {
    raw: string;
    rendered: string;
    updatedAt: string;
  };
  privacy: {
    raw: string;
    rendered: string;
    updatedAt: string;
  };
  variables: {
    publishDate: string;
    companyName: string;
    contactEmail: string;
    dpoEmail: string;
    websiteUrl: string;
    forumCity: string;
    retentionPeriod: string;
  };
}
