import api from '../../../lib/api';
import type { LegalDocumentsResponse } from '../interfaces';

export const publicLegalService = {
  /**
   * Busca os documentos legais públicos (Termos de Serviço e Política de Privacidade).
   * Acessível publicamente por qualquer visitante ou usuário autenticado.
   */
  async getLegalDocuments(): Promise<LegalDocumentsResponse> {
    const res = await api.get<LegalDocumentsResponse>('/legal');
    return res.data;
  },
};
