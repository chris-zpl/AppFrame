export interface WatermarkValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validação de integridade e compatibilidade de arquivo PNG para marcas d'água.
 */
export const validateWatermarkFile = (file: File): WatermarkValidationResult => {
  if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
    return {
      isValid: false,
      error: 'Formato inválido: apenas arquivos PNG com canal alfa transparente são suportados.',
    };
  }

  // Limite máximo permitido: 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Arquivo muito grande: o tamanho máximo permitido é 10 MB.',
    };
  }

  return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 KB';
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};
