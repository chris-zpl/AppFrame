import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SystemSetting } from '../../modules/admin/entities/system-setting.entity';
import { EncryptionService } from '../../core/security/encryption.service';
import { getWelcomeEmailHtml } from './templates/welcome-email.template';
import { getResetPasswordEmailHtml } from './templates/reset-password-email.template';
import {
  getPasswordChangedEmailHtml,
  getTwoFactorEnabledEmailHtml,
  getTwoFactorDisabledEmailHtml,
  getGoogleLinkedEmailHtml,
  getGoogleUnlinkedEmailHtml,
  getAccountDeletedEmailHtml,
  getSessionsRevokedEmailHtml,
  SecurityEmailOptions,
} from './templates/security-emails.template';

export interface SmtpConnectionConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

export interface ClientSecurityMeta {
  ip?: string;
  userAgent?: string;
  deviceName?: string;
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
   * Helper unificado e robusto para envio de mensagens via SMTP.
   * Não lança exceção para não interromper fluxos críticos de autenticação se o SMTP falhar.
   */
  private async sendMailMessage(
    toEmail: string,
    subject: string,
    html: string,
    contextName: string,
  ): Promise<boolean> {
    const cleanTo = (toEmail || '').trim().toLowerCase();
    if (!cleanTo || !cleanTo.includes('@')) {
      this.logger.warn(`E-mail de destino inválido: "${toEmail}". Envio de "${contextName}" abortado.`);
      return false;
    }

    try {
      const config = await this.getSmtpConfig();
      if (!config || !config.host) {
        this.logger.log(
          `Servidor SMTP não configurado. Mensagem "${contextName}" não enviada para ${cleanTo}.`,
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

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
        to: cleanTo,
        subject,
        html,
      });

      this.logger.log(`E-mail "${contextName}" enviado com sucesso para ${cleanTo}`);
      return true;
    } catch (err: any) {
      this.logger.error(
        `Falha ao enviar e-mail "${contextName}" para ${cleanTo}: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private getFrontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'
    );
  }

  /**
   * Dispara o e-mail oficial de boas-vindas para o usuário recém-cadastrado.
   */
  async sendWelcomeEmail(toEmail: string, userName?: string): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getWelcomeEmailHtml({
      name: userName,
      appUrl: frontendUrl,
    });
    return this.sendMailMessage(
      toEmail,
      'Bem-vindo ao AppFrame • Sua conta está pronta!',
      html,
      'Boas-vindas',
    );
  }

  /**
   * Dispara o e-mail oficial com token para redefinição de senha (expiração de 1 hora).
   */
  async sendPasswordResetEmail(
    toEmail: string,
    resetToken: string,
    userName?: string,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getResetPasswordEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      resetToken,
    });
    return this.sendMailMessage(
      toEmail,
      'Redefinição de senha • AppFrame',
      html,
      'Solicitação de Redefinição de Senha',
    );
  }

  /**
   * Notificação de segurança: Senha alterada com sucesso.
   */
  async sendPasswordChangedEmail(
    toEmail: string,
    userName?: string,
    meta?: ClientSecurityMeta,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getPasswordChangedEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: meta?.deviceName,
    });
    return this.sendMailMessage(
      toEmail,
      'Sua senha foi alterada com sucesso • AppFrame',
      html,
      'Senha Alterada',
    );
  }

  /**
   * Notificação de segurança: Segundo Fator (2FA) Ativado.
   */
  async sendTwoFactorEnabledEmail(
    toEmail: string,
    userName?: string,
    meta?: ClientSecurityMeta,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getTwoFactorEnabledEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: meta?.deviceName,
    });
    return this.sendMailMessage(
      toEmail,
      'Autenticação em duas etapas (2FA) ativada • AppFrame',
      html,
      '2FA Ativado',
    );
  }

  /**
   * Notificação de segurança: Segundo Fator (2FA) Desativado.
   */
  async sendTwoFactorDisabledEmail(
    toEmail: string,
    userName?: string,
    meta?: ClientSecurityMeta,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getTwoFactorDisabledEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: meta?.deviceName,
    });
    return this.sendMailMessage(
      toEmail,
      'Aviso de Segurança: Autenticação em duas etapas (2FA) desativada • AppFrame',
      html,
      '2FA Desativado',
    );
  }

  /**
   * Notificação de segurança: Conta Google Vinculada.
   */
  async sendGoogleLinkedEmail(
    toEmail: string,
    userName?: string,
    googleEmail?: string,
    meta?: ClientSecurityMeta,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getGoogleLinkedEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
      googleEmail,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: meta?.deviceName,
    });
    return this.sendMailMessage(
      toEmail,
      'Conta Google vinculada com sucesso • AppFrame',
      html,
      'Google Vinculado',
    );
  }

  /**
   * Notificação de segurança: Conta Google Desvinculada.
   */
  async sendGoogleUnlinkedEmail(
    toEmail: string,
    userName?: string,
    meta?: ClientSecurityMeta,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getGoogleUnlinkedEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: meta?.deviceName,
    });
    return this.sendMailMessage(
      toEmail,
      'Conta Google desvinculada • AppFrame',
      html,
      'Google Desvinculado',
    );
  }

  /**
   * Notificação de encerramento: Conta Excluída Permanentemente.
   */
  async sendAccountDeletedEmail(
    toEmail: string,
    userName?: string,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getAccountDeletedEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
    });
    return this.sendMailMessage(
      toEmail,
      'Confirmação de exclusão da sua conta • AppFrame',
      html,
      'Conta Excluída',
    );
  }

  /**
   * Notificação de segurança: Todas as outras sessões foram desconectadas.
   */
  async sendSessionsRevokedEmail(
    toEmail: string,
    userName?: string,
    revokedCount?: number,
    meta?: ClientSecurityMeta,
  ): Promise<boolean> {
    const frontendUrl = this.getFrontendUrl();
    const html = getSessionsRevokedEmailHtml({
      name: userName,
      appUrl: frontendUrl,
      date: new Date(),
      revokedCount,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      deviceName: meta?.deviceName,
    });
    return this.sendMailMessage(
      toEmail,
      'Aviso de Segurança: Outros dispositivos desconectados • AppFrame',
      html,
      'Outras Sessões Revogadas',
    );
  }
}
