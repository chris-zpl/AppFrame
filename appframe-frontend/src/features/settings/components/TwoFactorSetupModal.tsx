import React, { useState } from 'react';
import { Card, Button, Input } from '../../../components/ui';
import { toast } from 'sonner';
import { useModalA11y } from '../../../hooks';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  step: 1 | 2;
  qrCodeUrl: string;
  secret: string;
  code: string;
  setCode: (code: string) => void;
  recoveryCodes: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (e: React.FormEvent) => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  step,
  qrCodeUrl,
  secret,
  code,
  setCode,
  recoveryCodes,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  useModalA11y({ isOpen, onClose });

  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="two-factor-setup-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary min-w-0">
            <span className="material-symbols-outlined text-[24px] shrink-0">shield_locked</span>
            <h3 id="two-factor-setup-modal-title" className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface truncate">
              Ativação do Segundo Fator (2FA)
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

        {step === 1 ? (
          <form onSubmit={onConfirm} className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
              1. Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, 1Password):
            </p>

            {/* QR Code Real Gerado pelo Backend */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl mx-auto shadow-md">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code para autenticação em dois fatores"
                  className="w-40 h-40 object-contain"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-neutral-500 text-xs">
                  QR Code indisponível
                </div>
              )}
            </div>

            {/* Chave Alfanumérica Manual Real */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-label-sm text-neutral-500 dark:text-outline">
                Ou insira a chave secreta manualmente:
              </span>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest font-mono text-label-md text-primary font-bold">
                <span className="break-all">{secret}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!secret) return;
                    navigator.clipboard.writeText(secret);
                    setCopiedKey(true);
                    toast.info('Copiado para a área de transferência!');
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="text-neutral-500 hover:text-primary dark:text-on-surface-variant dark:hover:text-primary transition-colors p-1 cursor-pointer shrink-0"
                  title="Copiar chave secreta"
                  aria-label="Copiar chave secreta"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedKey ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Confirmação com 6 Dígitos */}
            <Input
              id="two-factor-setup-code"
              name="code"
              label="2. Digite o código de 6 dígitos gerado no app:"
              labelClassName="text-label-sm font-label-sm text-neutral-900 dark:text-on-surface font-semibold"
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              disabled={isSubmitting}
              className="text-center tracking-[0.5em] font-mono text-[24px] font-bold h-12"
            />

            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={code.length !== 6 || isSubmitting}
              >
                Confirmar e Ativar
              </Button>
            </div>
          </form>
        ) : (
          /* Passo 2: Códigos de Recuperação */
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-body-sm font-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>2FA ativado com sucesso! Guarde seus códigos de recuperação.</span>
            </div>

            <p className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
              Se você perder o acesso ao seu dispositivo autenticador, poderá usar estes códigos de recuperação de uso único:
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
              {recoveryCodes.map((c, idx) => (
                <span key={idx} className="p-1 rounded bg-white dark:bg-surface-container">
                  {c}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join('\n'));
                  toast.info('Copiado para a área de transferência!');
                }}
                className="flex-1"
                leftIcon={
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                }
              >
                Copiar Códigos
              </Button>
              <Button
                variant="primary"
                onClick={onClose}
                className="flex-1"
              >
                Concluir e Salvar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
