import React from 'react';
import type { AdminSession } from '../types';
import { RevokeSessionModal } from './RevokeSessionModal';
import { ResetLegalModal } from './ResetLegalModal';

export interface AdminModalsProps {
  sessionToRevoke: AdminSession | null;
  onCloseRevokeSession: () => void;
  onConfirmRevokeSession: () => void;
  isRevokingSession: boolean;
  showResetLegalModal: boolean;
  onCloseResetLegalModal: () => void;
  onConfirmResetLegal: () => void;
  isResettingLegal: boolean;
}

export const AdminModals: React.FC<AdminModalsProps> = ({
  sessionToRevoke,
  onCloseRevokeSession,
  onConfirmRevokeSession,
  isRevokingSession,
  showResetLegalModal,
  onCloseResetLegalModal,
  onConfirmResetLegal,
  isResettingLegal,
}) => {
  return (
    <>
      {/* Modal de Confirmação para Revogar Sessão de Usuário */}
      <RevokeSessionModal
        isOpen={Boolean(sessionToRevoke)}
        onClose={onCloseRevokeSession}
        onConfirm={onConfirmRevokeSession}
        session={sessionToRevoke}
        isLoading={isRevokingSession}
      />

      {/* Modal de Confirmação para Restaurar Documentos Legais Padrão */}
      <ResetLegalModal
        isOpen={showResetLegalModal}
        onClose={onCloseResetLegalModal}
        onConfirm={onConfirmResetLegal}
        isLoading={isResettingLegal}
      />
    </>
  );
};
