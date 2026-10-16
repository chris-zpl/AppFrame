import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export interface WatermarkDeleteModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const WatermarkDeleteModal: React.FC<WatermarkDeleteModalProps> = ({
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-sm p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
          <span className="material-symbols-outlined text-[26px]">delete_forever</span>
        </div>
        <h3 className="font-title-md text-title-md font-bold text-on-surface">
          Excluir Marca d'Água?
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Esta ação removerá o arquivo PNG permanentemente do backend. Jobs já renderizados não serão afetados.
        </p>
        <div className="flex items-center gap-2 w-full mt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
