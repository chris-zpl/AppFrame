import React from 'react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

interface StudioDeleteModalProps {
  isOpen: boolean;
  isLoading: boolean;
  currentVideo: { id?: string; title?: string; url?: string } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const StudioDeleteModal: React.FC<StudioDeleteModalProps> = ({
  isOpen,
  isLoading,
  currentVideo,
  onClose,
  onConfirm,
}) => {
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
