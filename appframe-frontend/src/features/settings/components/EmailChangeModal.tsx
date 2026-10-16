import React from 'react';
import { Card, Button } from '../../../components/ui';
import { calculateNextEmailChangeDate } from '../constants';

interface EmailChangeModalProps {
  isOpen: boolean;
  currentEmail?: string;
  newEmail: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const EmailChangeModal: React.FC<EmailChangeModalProps> = ({
  isOpen,
  currentEmail,
  newEmail,
  isSaving,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-primary/40 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3 text-primary">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">mark_email_unread</span>
          </div>
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            Alteração de E-mail
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-body-sm flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">schedule</span>
            <span>
              <strong>Regra de 6 Meses:</strong> Por segurança, você só pode alterar o e-mail da sua conta <strong>uma vez a cada 6 meses</strong>.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-2 text-body-sm">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">E-mail atual:</span>
              <span className="font-mono text-on-surface">{currentEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-semibold">Novo e-mail:</span>
              <span className="font-mono font-bold text-primary">{newEmail.trim()}</span>
            </div>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Após confirmar esta mudança, sua próxima alteração de e-mail só estará liberada em <strong>{calculateNextEmailChangeDate(new Date())}</strong>. Deseja realmente prosseguir?
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            disabled={isSaving}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            isLoading={isSaving}
            disabled={isSaving}
            onClick={onConfirm}
          >
            Confirmar Alteração
          </Button>
        </div>
      </Card>
    </div>
  );
};
