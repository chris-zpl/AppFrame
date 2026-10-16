import React from 'react';
import { Badge } from '../../../components/ui/Badge';

export const ScannerHeader: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-sm mb-1 flex-wrap">
          <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg tracking-tight font-bold text-on-surface">
            Varredura de Canais
          </h1>
          <Badge variant="status-live">
            YouTube InnerTube Conectado
          </Badge>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Insira a URL de um vídeo, canal ou @handle para indexar vídeos reais, filtrar Shorts e enviar diretamente para corte dinâmico no Studio ou download em lote.
        </p>
      </div>
    </div>
  );
};
