import React from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { WatermarkGrid } from './WatermarkGrid';
import type { WatermarkItem } from '../types';

import { useWatermarksContext } from '../context';

export interface WatermarkGridSectionProps {
  watermarks?: WatermarkItem[];
  isLoading?: boolean;
  defaultWatermarkId?: string | null;
  onSetDefault?: (id: string) => void;
  onConfirmDelete?: (id: string) => void;
  onUploadClick?: () => void;
}

export const WatermarkGridSection: React.FC<WatermarkGridSectionProps> = (props) => {
  const watermarksContext = useWatermarksContext();

  const watermarks = props.watermarks ?? watermarksContext.watermarks;
  const isLoading = props.isLoading ?? watermarksContext.isLoading;
  const defaultWatermarkId = props.defaultWatermarkId !== undefined ? props.defaultWatermarkId : watermarksContext.defaultWatermarkId;
  const onSetDefault = props.onSetDefault ?? watermarksContext.handleSelectDefault;
  const onConfirmDelete = props.onConfirmDelete ?? watermarksContext.setDeleteConfirmId;
  const onUploadClick = props.onUploadClick ?? watermarksContext.openFileDialog;
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-on-surface-variant text-sm">Carregando marcas d'água...</span>
      </div>
    );
  }

  if (watermarks.length > 0) {
    return (
      <WatermarkGrid
        watermarks={watermarks}
        defaultWatermarkId={defaultWatermarkId}
        onSetDefault={onSetDefault}
        onConfirmDelete={onConfirmDelete}
      />
    );
  }

  return (
    <EmptyState
      icon="branding_watermark"
      title="Nenhuma marca d'água cadastrada no AppFrame"
      description="Faça upload do seu primeiro arquivo PNG com canal alfa transparente para aplicar logos personalizados sobre os vídeos no Studio."
      suggestionsTitle="Dica rápida para começar:"
      suggestions={[
        {
          label: 'Fazer upload de PNG transparente',
          onClick: onUploadClick,
        },
      ]}
    />
  );
};
