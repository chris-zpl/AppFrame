import React, { useState } from 'react';
import { Card, Button } from '../../../components/ui';
import { toast } from 'sonner';

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
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[24px]">shield_locked</span>
            <h3 className="font-title-md text-title-md font-bold text-on-surface">
              Ativação do Segundo Fator (2FA)
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

        {step === 1 ? (
          <form onSubmit={onConfirm} className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
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
              <span className="text-[11px] font-label-sm text-outline">
                Ou insira a chave secreta manualmente:
              </span>
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-label-md text-primary font-bold">
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
                  className="text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
                  title="Copiar chave secreta"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedKey ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Confirmação com 6 Dígitos */}
            <div className="flex flex-col gap-1">
              <label className="text-label-sm font-label-sm text-on-surface font-semibold">
                2. Digite o código de 6 dígitos gerado no app:
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                disabled={isSubmitting}
                className="w-full text-center tracking-[0.5em] font-mono text-[24px] font-bold p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-primary outline-none focus:border-primary"
              />
            </div>

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

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Se você perder o acesso ao seu dispositivo autenticador, poderá usar estes códigos de recuperação de uso único:
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
              {recoveryCodes.map((c, idx) => (
                <span key={idx} className="p-1 rounded bg-surface-container">
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
