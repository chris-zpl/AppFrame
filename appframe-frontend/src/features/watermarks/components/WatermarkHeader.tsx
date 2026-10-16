import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export interface WatermarkHeaderProps {
  onUploadClick: () => void;
  isUploading?: boolean;
}

export const WatermarkHeader: React.FC<WatermarkHeaderProps> = ({
  onUploadClick,
  isUploading = false,
}) => {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-sm mb-1 flex-wrap">
          <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
            Gestão de Marcas d'Água
          </h1>
          <Badge variant="status-live">
            Canal Alfa Preservado
          </Badge>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Faça upload de PNGs transparentes para queima em 9 âncoras no Studio via matriz 3x3 do FFmpeg.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start md:self-auto">
        <Button
          variant="primary"
          onClick={onUploadClick}
          disabled={isUploading}
          leftIcon={
            <span className="material-symbols-outlined text-[18px]">
              upload
            </span>
          }
        >
          {isUploading ? 'Enviando...' : 'Novo Upload'}
        </Button>
      </div>
    </header>
  );
};
