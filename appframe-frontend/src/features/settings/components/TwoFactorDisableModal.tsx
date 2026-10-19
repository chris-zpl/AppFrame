import React from 'react';
import { Card, Button, Input } from '../../../components/ui';
import { useModalA11y } from '../../../hooks';

interface TwoFactorDisableModalProps {
  isOpen: boolean;
  code: string;
  setCode: (code: string) => void;
  isDisabling: boolean;
  onClose: () => void;
  onConfirm: (e: React.FormEvent) => void;
}

export const TwoFactorDisableModal: React.FC<TwoFactorDisableModalProps> = ({
  isOpen,
  code,
  setCode,
  isDisabling,
  onClose,
  onConfirm,
}) => {
  useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="disable-2fa-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-error min-w-0">
            <span className="material-symbols-outlined text-[24px] shrink-0">gpp_bad</span>
            <h3 id="disable-2fa-title" className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface truncate">
              Desativar Segundo Fator (2FA)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="text-neutral-500 hover:text-neutral-900 dark:text-outline dark:hover:text-on-surface p-1 rounded-lg cursor-pointer shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={onConfirm} className="flex flex-col gap-4">
          <p className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
            Informe o código atual de 6 dígitos gerado pelo seu aplicativo autenticador para confirmar a desativação do 2FA:
          </p>

          <Input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            disabled={isDisabling}
            className="text-center tracking-[0.5em] font-mono text-[24px] font-bold h-12"
          />

          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              variant="ghost"
              type="button"
              disabled={isDisabling}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              type="submit"
              isLoading={isDisabling}
              disabled={code.length !== 6 || isDisabling}
            >
              Confirmar Desativação
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
