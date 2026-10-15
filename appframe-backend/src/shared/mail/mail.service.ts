import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SystemSetting } from '../../modules/admin/entities/system-setting.entity';
import { EncryptionService } from '../../core/security/encryption.service';
import { getWelcomeEmailHtml } from './templates/welcome-email.template';

export interface SmtpConnectionConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  private async getSetting(key: string): Promise<string | null> {
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

  async getSmtpConfig(): Promise<SmtpConnectionConfig | null> {
    const host =
      (await this.getSetting('SMTP_HOST')) ||
      this.configService.get<string>('SMTP_HOST', '');

    if (!host) {
      return null;
    }

    const portStr =
      (await this.getSetting('SMTP_PORT')) ||
      this.configService.get<string>('SMTP_PORT', '587');
    const user =
      (await this.getSetting('SMTP_USER')) ||
      this.configService.get<string>('SMTP_USER', '');
    const pass =
      (await this.getSetting('SMTP_PASSWORD')) ||
      this.configService.get<string>('SMTP_PASSWORD', '');
    const fromName =
      (await this.getSetting('SMTP_FROM_NAME')) ||
      this.configService.get<string>('SMTP_FROM_NAME', 'AppFrame');
    const fromEmail =
      (await this.getSetting('SMTP_FROM_EMAIL')) ||
      this.configService.get<string>('SMTP_FROM_EMAIL', user);
    const secureStr =
      (await this.getSetting('SMTP_SECURE')) ||
      this.configService.get<string>('SMTP_SECURE', 'false');

    return {
      host,
      port: parseInt(portStr, 10) || 587,
      user,
      pass,
      fromName,
      fromEmail,
      secure: secureStr === 'true',
    };
  }

  /**
   * Dispara o e-mail oficial de boas-vindas para o usuário recém-cadastrado.
   * Não lança exceção em caso de indisponibilidade de SMTP para não travar o fluxo de cadastro.
   */
  async sendWelcomeEmail(toEmail: string, userName?: string): Promise<boolean> {
    const cleanTo = (toEmail || '').trim().toLowerCase();
    if (!cleanTo || !cleanTo.includes('@')) {
      this.logger.warn(`E-mail de destino inválido: "${toEmail}". Envio abortado.`);
      return false;
    }

    try {
      const config = await this.getSmtpConfig();
      if (!config || !config.host) {
        this.logger.log(
          `Servidor SMTP não configurado. E-mail de boas-vindas não enviado para ${cleanTo}.`,
        );
        return false;
      }

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user
          ? {
              user: config.user,
              pass: config.pass,
            }
          : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';

      const html = getWelcomeEmailHtml({
        name: userName,
        appUrl: frontendUrl,
      });

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
        to: cleanTo,
        subject: 'Bem-vindo ao AppFrame • Sua conta está pronta!',
        html,
      });

      this.logger.log(`E-mail de boas-vindas enviado com sucesso para ${cleanTo}`);
      return true;
    } catch (err: any) {
      this.logger.error(
        `Falha ao enviar e-mail de boas-vindas para ${cleanTo}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }
}
