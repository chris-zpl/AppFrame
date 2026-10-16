import React from 'react';
import { Card, Input, Button } from '../../../components/ui';

interface DeleteAccountModalProps {
  isOpen: boolean;
  password: string;
  setPassword: (val: string) => void;
  confirmationText: string;
  setConfirmationText: (val: string) => void;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  password,
  setPassword,
  confirmationText,
  setConfirmationText,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-error/50 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3 text-error">
          <div className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">delete_forever</span>
          </div>
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            Confirmar Exclusão de Conta
          </h3>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Para confirmar a exclusão irreversível de todos os seus dados, informe sua senha (caso possua) e digite <strong className="text-error font-mono">EXCLUIR</strong> abaixo:
        </p>

        <Input
          label="Sua Senha de Acesso (se aplicável)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          disabled={isDeleting}
          leftIcon={
            <span className="material-symbols-outlined text-[18px]">lock</span>
          }
        />

        <Input
          label="Digite EXCLUIR para confirmar"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder="EXCLUIR"
          disabled={isDeleting}
          required
        />

        <div className="flex items-center justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            isLoading={isDeleting}
            disabled={
              confirmationText.trim().toUpperCase() !== 'EXCLUIR' ||
              isDeleting
            }
            onClick={onConfirm}
          >
            Confirmar Exclusão Permanente
          </Button>
        </div>
      </Card>
    </div>
  );
};
