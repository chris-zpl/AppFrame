import React from 'react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { VideoJobItem } from '../types';

export interface HistoryDeleteModalProps {
  job: VideoJobItem | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const HistoryDeleteModal: React.FC<HistoryDeleteModalProps> = ({
  job,
  isLoading,
  onClose,
  onConfirm,
}) => {
  return (
    <ConfirmModal
      isOpen={Boolean(job)}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir do Histórico"
      icon="delete_forever"
      message="Tem certeza de que deseja excluir este vídeo do histórico?"
      itemTitle={job?.original_title || job?.source_url}
      itemSubtitle={job ? `ID: ${job.id}` : undefined}
      warningText="Esta ação é irreversível. O arquivo gerado no servidor será removido."
      confirmText="Confirmar Exclusão"
      isLoading={isLoading}
      variant="danger"
    />
  );
};
