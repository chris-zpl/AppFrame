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
}
