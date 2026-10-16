import React from 'react';
import { Card, Button } from '../../../components/ui';

interface EmailChangeBlockedModalProps {
  isOpen: boolean;
  lastChanged: string;
  nextAllowed: string;
  onClose: () => void;
}

export const EmailChangeBlockedModal: React.FC<EmailChangeBlockedModalProps> = ({
  isOpen,
  lastChanged,
  nextAllowed,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-amber-500/40 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">lock_clock</span>
          </div>
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            Alteração Indisponível
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Por diretriz de segurança, o e-mail da conta só pode ser alterado <strong>uma vez a cada 6 meses</strong>.
          </p>

          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-2 text-body-sm">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Última alteração:</span>
              <span className="font-mono text-on-surface">{lastChanged}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-semibold">Próxima liberação:</span>
              <span className="font-mono font-bold text-amber-500">{nextAllowed}</span>
            </div>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Aguarde o prazo regulamentar para efetuar uma nova troca do seu e-mail de acesso.
          </p>
        </div>

        <div className="flex items-center justify-end mt-2">
          <Button variant="secondary" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </Card>
    </div>
  );
};
