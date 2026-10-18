import React from 'react';
import { ConfirmModal } from '../../../components/ui';
import type { AdminSession } from '../types';

interface RevokeSessionModalProps {
  session: AdminSession | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RevokeSessionModal: React.FC<RevokeSessionModalProps> = ({
  session,
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
      title="Desconectar Sessão Remota"
      icon="logout"
      message="Tem certeza de que deseja encerrar esta sessão?"
      itemTitle={session?.user_email || 'Dispositivo'}
      itemSubtitle={`IP: ${session?.ip_address || 'N/A'} • ${session?.device_name || 'Navegador'}`}
      warningText="O usuário será deslogado imediatamente no próximo acesso daquele dispositivo."
      confirmText="Desconectar Agora"
      isLoading={isLoading}
      variant="danger"
    />
  );
};
