import React from 'react';
import { Card, Button } from '../../../components/ui';

interface RevokeAllSessionsModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RevokeAllSessionsModal: React.FC<RevokeAllSessionsModalProps> = ({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-sm p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
          <span className="material-symbols-outlined text-[26px]">logout</span>
        </div>
        <h3 className="font-title-md text-title-md font-bold text-on-surface">
          Desconectar Outras Sessões?
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Todos os outros dispositivos conectados perderão o acesso imediatamente, exceto este navegador.
        </p>
        <div className="flex items-center gap-2 w-full mt-2">
          <Button
            variant="ghost"
            className="flex-1"
            disabled={isLoading}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            isLoading={isLoading}
            disabled={isLoading}
            onClick={onConfirm}
          >
            Desconectar Todos
          </Button>
        </div>
      </Card>
    </div>
  );
};
