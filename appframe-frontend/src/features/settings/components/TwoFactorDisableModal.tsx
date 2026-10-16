import React from 'react';
import { Card, Button } from '../../../components/ui';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-error">
            <span className="material-symbols-outlined text-[24px]">gpp_bad</span>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              Desativar Segundo Fator (2FA)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={onConfirm} className="flex flex-col gap-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Informe o código atual de 6 dígitos gerado pelo seu aplicativo autenticador para confirmar a desativação do 2FA:
          </p>

          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
            disabled={isDisabling}
            className="w-full text-center tracking-[0.5em] font-mono text-[24px] font-bold p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-primary outline-none focus:border-primary"
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
