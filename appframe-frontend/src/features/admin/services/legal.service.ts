import api from '../../../lib/api';

import type {
  LegalDocumentItem,
  LegalVariables,
  LegalDocumentsResponse,
} from '../../legal/types';

export type { LegalDocumentItem, LegalVariables, LegalDocumentsResponse };

export interface SaveLegalSettingsDto {
  termsOfService?: string;
  privacyPolicy?: string;
  companyName?: string;
  contactEmail?: string;
  dpoEmail?: string;
  websiteUrl?: string;
  forumCity?: string;
  retentionPeriod?: string;
}

export const legalService = {
  /**
   * Busca os documentos legais públicos (Termos de Serviço e Política de Privacidade).
   * Acessível publicamente por qualquer visitante ou usuário autenticado.
   */
  async getLegalDocuments(): Promise<LegalDocumentsResponse> {
    const res = await api.get<LegalDocumentsResponse>('/legal');
    return res.data;
  },

  /**
   * Busca os dados administrativos de configuração legal (requer permissão de Super Admin).
   */
  async getAdminLegalSettings(): Promise<LegalDocumentsResponse> {
    const res = await api.get<LegalDocumentsResponse>('/admin/settings/legal');
    return res.data;
  },

  /**
   * Salva alterações nos termos, políticas e variáveis globais.
   */
  async saveAdminLegalSettings(data: SaveLegalSettingsDto): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/legal', data);
    return res.data;
  },

  /**
   * Restaura os termos e políticas para a minuta oficial padrão.
   */
  async resetAdminLegalSettings(): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/legal/reset');
    return res.data;
  },
};
