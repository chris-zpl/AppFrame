import React from 'react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

import { useStudioContext } from '../context';

export interface StudioDeleteModalProps {
  isOpen?: boolean;
  isLoading?: boolean;
  currentVideo?: { id?: string; title?: string; url?: string } | null;
  onClose?: () => void;
  onConfirm?: () => Promise<void>;
}

export const StudioDeleteModal: React.FC<StudioDeleteModalProps> = (props) => {
  const studio = useStudioContext();

  const isOpen = props.isOpen ?? studio.isDeleteStudioModalOpen;
  const isLoading = props.isLoading ?? studio.isDeletingFromStudio;
  const currentVideo = props.currentVideo ?? studio.currentVideo;
  const onClose = props.onClose ?? (() => studio.setIsDeleteStudioModalOpen(false));
  const onConfirm = props.onConfirm ?? (async () => {
    studio.setIsDeletingFromStudio(true);
    try {
      await studio.handleDeleteFromStudio();
      studio.setIsDeleteStudioModalOpen(false);
    } finally {
      studio.setIsDeletingFromStudio(false);
    }
  });
  return (
    <ConfirmModal
      isOpen={isOpen && Boolean(currentVideo)}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir do Studio"
      icon="delete_forever"
      message="Tem certeza de que deseja remover este vídeo do Studio?"
      itemTitle={currentVideo?.title || 'Vídeo Selecionado'}
      itemSubtitle={currentVideo?.url}
      warningText="O arquivo de vídeo temporário baixado no servidor e suas configurações de corte/legendas salvas serão excluídos."
      confirmText="Confirmar Exclusão"
      isLoading={isLoading}
      variant="danger"
    />
  );
};
