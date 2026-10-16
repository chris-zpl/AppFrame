import { Controller, Get } from '@nestjs/common';
import { AdminSettingsService } from '../services/admin-settings.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  async getLegalDocuments() {
    return this.settingsService.getLegalDocuments();
  }

  @Get('terms')
  async getTerms() {
    const docs = await this.settingsService.getLegalDocuments();
    return {
      terms: docs.terms,
      updatedAt: docs.terms.updatedAt,
      variables: docs.variables,
    };
  }

  @Get('privacy')
  async getPrivacy() {
    const docs = await this.settingsService.getLegalDocuments();
    return {
      privacy: docs.privacy,
      updatedAt: docs.privacy.updatedAt,
      variables: docs.variables,
    };
  }
}
