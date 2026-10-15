import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { AdminSettingsService, SmtpConfigDto } from '../services/admin-settings.service';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  // --- YouTube Cookies Globais ---

  @Get('youtube-cookies')
  async getYouTubeCookiesStatus() {
    return this.settingsService.getYouTubeCookiesStatus();
  }

  @Post('youtube-cookies')
  async saveYouTubeCookies(@Body() body: { cookies?: any; content?: any }) {
    const raw = body?.cookies !== undefined ? body.cookies : body?.content;
    return this.settingsService.saveYouTubeCookies(raw);
  }

  @Delete('youtube-cookies')
  async deleteYouTubeCookies() {
    return this.settingsService.deleteYouTubeCookies();
  }

  // --- Google Gemini AI Global ---

  @Get('gemini')
  async getGeminiStatus() {
    return this.settingsService.getGeminiStatus();
  }

  @Post('gemini')
  async saveGeminiApiKey(@Body() body: { apiKey: string; model?: string }) {
    return this.settingsService.saveGeminiApiKey(body?.apiKey, body?.model);
  }

  @Post('gemini/test')
  async testGeminiConnection() {
    return this.settingsService.testGeminiConnection();
  }

  @Delete('gemini')
  async deleteGeminiApiKey() {
    return this.settingsService.deleteGeminiApiKey();
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
}
