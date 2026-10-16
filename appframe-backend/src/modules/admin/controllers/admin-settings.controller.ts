import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import {
  AdminSettingsService,
  SmtpConfigDto,
  LegalDocumentsDto,
} from '../services/admin-settings.service';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  private getAuditContext(req: Request) {
    const user = (req as any).user;
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return {
      userId: user?.userId || user?.id || undefined,
      userEmail: user?.email || undefined,
      ipAddress: ip,
      userAgent,
    };
  }

  // --- YouTube Cookies Globais ---

  @Get('youtube-cookies')
  async getYouTubeCookiesStatus() {
    return this.settingsService.getYouTubeCookiesStatus();
  }

  @Post('youtube-cookies')
  async saveYouTubeCookies(
    @Body() body: { cookies?: any; content?: any },
    @Req() req: Request,
  ) {
    const raw = body?.cookies !== undefined ? body.cookies : body?.content;
    return this.settingsService.saveYouTubeCookies(raw, this.getAuditContext(req));
  }

  @Delete('youtube-cookies')
  async deleteYouTubeCookies(@Req() req: Request) {
    return this.settingsService.deleteYouTubeCookies(this.getAuditContext(req));
  }

  // --- Google Gemini AI Global ---

  @Get('gemini')
  async getGeminiStatus() {
    return this.settingsService.getGeminiStatus();
  }

  @Post('gemini')
  async saveGeminiApiKey(
    @Body() body: { apiKey: string; model?: string },
    @Req() req: Request,
  ) {
    return this.settingsService.saveGeminiApiKey(
      body?.apiKey,
      body?.model,
      this.getAuditContext(req),
    );
  }

  @Post('gemini/test')
  async testGeminiConnection() {
    return this.settingsService.testGeminiConnection();
  }

  @Delete('gemini')
  async deleteGeminiApiKey(@Req() req: Request) {
    return this.settingsService.deleteGeminiApiKey(this.getAuditContext(req));
  }

  // --- SMTP / Email ---

  @Get('smtp')
  async getSmtpConfig() {
    return this.settingsService.getSmtpConfig();
  }

  @Post('smtp')
  async saveSmtpConfig(@Body() dto: SmtpConfigDto) {
    return this.settingsService.saveSmtpConfig(dto);
  }

  @Post('smtp/test')
  async testSmtp(@Body() body: { toEmail: string }) {
    return this.settingsService.testSmtp(body?.toEmail);
  }

  // --- Documentos Legais (Termos de Serviço e Política de Privacidade) ---

  @Get('legal')
  async getLegalSettings() {
    return this.settingsService.getLegalDocuments();
  }

  @Post('legal')
  async saveLegalSettings(@Body() dto: LegalDocumentsDto, @Req() req: Request) {
    return this.settingsService.saveLegalDocuments(dto, this.getAuditContext(req));
  }

  @Post('legal/reset')
  async resetLegalSettings(@Req() req: Request) {
    return this.settingsService.resetLegalDocumentsToDefault(this.getAuditContext(req));
  }
}
