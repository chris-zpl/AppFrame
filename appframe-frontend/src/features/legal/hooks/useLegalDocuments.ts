import { useQuery } from '@tanstack/react-query';
import { publicLegalService } from '../services';
import type { LegalDocumentsResponse } from '../interfaces';

export const useLegalDocuments = (enabled = true) => {
  return useQuery<LegalDocumentsResponse>({
    queryKey: ['public-legal-documents'],
    queryFn: () => publicLegalService.getLegalDocuments(),
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
    enabled,
  });
};
