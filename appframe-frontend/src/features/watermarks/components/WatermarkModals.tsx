import React from 'react';
import { WatermarkDeleteModal } from './WatermarkDeleteModal';

export interface WatermarkModalsProps {
  deleteConfirmId: string | null;
  isDeleting: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
}

export const WatermarkModals: React.FC<WatermarkModalsProps> = ({
  deleteConfirmId,
  isDeleting,
  onCloseDelete,
  onConfirmDelete,
}) => {
  return (
    <WatermarkDeleteModal
      isOpen={Boolean(deleteConfirmId)}
      isDeleting={isDeleting}
      onClose={onCloseDelete}
      onConfirm={onConfirmDelete}
    />
  );
};
