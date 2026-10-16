import React from 'react';
import { ConfirmModal } from '../../../components/ui';

interface ResetLegalModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetLegalModal: React.FC<ResetLegalModalProps> = ({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Restaurar Minuta Padrão"
      icon="restart_alt"
      message="Deseja realmente restaurar os Termos de Serviço e a Política de Privacidade para a minuta oficial padrão?"
      itemTitle="Termos de Serviço & Política de Privacidade"
      itemSubtitle="Minuta Contratual Oficial • AppFrame 2026"
      warningText="Atenção: Todas as edições e alterações manuais de texto serão substituídas pela versão original de lançamento."
      confirmText="Restaurar Padrão"
      cancelText="Voltar"
      isLoading={isLoading}
      variant="warning"
    />
  );
};
