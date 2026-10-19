import React from 'react';
import { Card, Button } from '../../../components/ui';
import { toast } from 'sonner';
import { useModalA11y } from '../../../hooks';

interface TwoFactorRecoveryModalProps {
  isOpen: boolean;
  recoveryCodes: string[];
  onClose: () => void;
}

export const TwoFactorRecoveryModal: React.FC<TwoFactorRecoveryModalProps> = ({
  isOpen,
  recoveryCodes,
  onClose,
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
        aria-labelledby="recovery-codes-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary min-w-0">
            <span className="material-symbols-outlined text-[24px] shrink-0">key</span>
            <h3 id="recovery-codes-title" className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface truncate">
              Códigos de Recuperação (2FA)
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

        <p className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
          Estes códigos são de uso único. Mantenha-os guardados em local seguro:
        </p>

        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
          {recoveryCodes.map((code, idx) => (
            <span key={idx} className="p-1 rounded bg-white dark:bg-surface-container">
              {code}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(recoveryCodes.join('\n'));
              toast.info('Copiado para a área de transferência!');
            }}
            leftIcon={
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            }
          >
            Copiar Códigos
          </Button>
          <Button
            variant="primary"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
};
