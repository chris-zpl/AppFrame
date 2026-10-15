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

  getYouTubeCookiesStatus() {
    return this.downloadService.getCookiesStatus();
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
    model: string;
    source: 'database' | 'environment' | 'none';
  }> {
    const dbKey = await this.getSetting('GEMINI_API_KEY');
    const model = (await this.getSetting('GEMINI_MODEL')) ||
      this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash');

    if (dbKey) {
      return { configured: true, model, source: 'database' };
    }

    const envKey = this.configService.get<string>('GEMINI_API_KEY');
    if (envKey) {
      return { configured: true, model, source: 'environment' };
    }

    return { configured: false, model, source: 'none' };
  }

  async saveGeminiApiKey(apiKey: string, modelName?: string): Promise<{ success: boolean; message: string }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey || cleanKey.length < 15) {
      throw new BadRequestException('Informe uma chave de API válida do Google AI Studio.');
    }

    // Valida conexão com o Google Gemini antes de salvar
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      await ai.models.generateContent({
        model: modelName || 'gemini-2.5-flash',
        contents: 'Ping',
      });
    } catch (err: any) {
      this.logger.warn(`Validação Gemini falhou com modelo primário: ${err.message}. Testando fallback...`);
      try {
        const ai = new GoogleGenAI({ apiKey: cleanKey });
        await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: 'Ping',
        });
      } catch (fallbackErr: any) {
        throw new BadRequestException(
          `Chave de API do Gemini inválida ou sem permissão: ${fallbackErr.message || err.message}`,
        );
      }
    }

    await this.saveSetting('GEMINI_API_KEY', cleanKey, true);
    if (modelName) {
      await this.saveSetting('GEMINI_MODEL', modelName.trim(), false);
    }

    return {
      success: true,
      message: 'Chave global do Google Gemini validada e salva com sucesso!',
    };
  }

  async testGeminiConnection(): Promise<{ success: boolean; message: string; model: string }> {
    const dbKey = await this.getSetting('GEMINI_API_KEY');
    const key = dbKey || this.configService.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new BadRequestException('Nenhuma chave do Gemini está configurada no servidor.');
    }

    const model = (await this.getSetting('GEMINI_MODEL')) || 'gemini-2.5-flash';
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model,
        contents: 'Teste de conexão AppFrame',
      });
      return {
        success: true,
        message: `Conexão com Google Gemini (${model}) estabelecida com sucesso!`,
        model,
      };
    } catch (err: any) {
      throw new BadRequestException(`Falha ao comunicar com Google Gemini: ${err.message}`);
    }
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
