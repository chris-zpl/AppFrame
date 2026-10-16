import React from 'react';
import type { VideoJobItem } from '../interfaces';
import { HistoryErrorModal } from './HistoryErrorModal';
import { HistoryDeleteModal } from './HistoryDeleteModal';

export interface HistoryModalsProps {
  errorJob: VideoJobItem | null;
  onCloseError: () => void;
  jobToDelete: VideoJobItem | null;
  isDeleting: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void | Promise<void>;
}

export const HistoryModals: React.FC<HistoryModalsProps> = ({
  errorJob,
  onCloseError,
  jobToDelete,
  isDeleting,
  onCloseDelete,
  onConfirmDelete,
}) => {
  return (
    <>
      {/* Modal de Detalhes da Falha no Job */}
      <HistoryErrorModal
        job={errorJob}
        onClose={onCloseError}
      />

      {/* Modal de Confirmação de Exclusão do Histórico */}
      <HistoryDeleteModal
        job={jobToDelete}
        isLoading={isDeleting}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
};
