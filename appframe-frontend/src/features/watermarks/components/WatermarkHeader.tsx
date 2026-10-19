import React from 'react';
import { Button } from '../../../components/ui/Button';

import { useWatermarksContext } from '../context';

export interface WatermarkHeaderProps {
  onUploadClick?: () => void;
  isUploading?: boolean;
}

export const WatermarkHeader: React.FC<WatermarkHeaderProps> = (props) => {
  const watermarksContext = useWatermarksContext();

  const onUploadClick = props.onUploadClick ?? watermarksContext.openFileDialog;
  const isUploading = props.isUploading ?? watermarksContext.isUploading;
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-sm mb-1 flex-wrap">
          <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-neutral-900 dark:text-on-surface tracking-tight">
            Gestão de Marcas d'água
          </h1>
        </div>
        <p className="font-body-md text-body-md text-neutral-600 dark:text-on-surface-variant max-w-2xl">
          Faça upload de um arquivo PNG com canal alfa transparente para aplicar logos personalizados sobre os vídeos no Studio.
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
