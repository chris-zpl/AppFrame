import React, { useState, useRef } from 'react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { authService } from '../services/auth.service';
import { useModalA11y } from '../../../hooks';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const isForgotSubmittingRef = useRef(false);

  const handleClose = () => {
    setForgotSubmitted(false);
    setForgotError(null);
    onClose();
  };

  useModalA11y({ isOpen, onClose: handleClose });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setForgotEmail(initialEmail);
      setForgotSubmitted(false);
      setForgotError(null);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || forgotLoading || isForgotSubmittingRef.current) return;
    isForgotSubmittingRef.current = true;
    setForgotLoading(true);
    setForgotError(null);

    try {
      await authService.requestPasswordReset(forgotEmail);
      setForgotSubmitted(true);
    } catch (err: any) {
      setForgotError(
        err?.response?.data?.message || err?.message || 'Falha ao solicitar redefinição.',
      );
    } finally {
      setForgotLoading(false);
      isForgotSubmittingRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-surface-container rounded-2xl p-6 shadow-2xl border border-surface-container-high"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary min-w-0">
            <span className="material-symbols-outlined text-[24px] shrink-0">
              lock_reset
            </span>
            <h3 id="forgot-password-modal-title" className="font-title-md text-title-md font-bold text-on-surface truncate">
              Recuperar Senha
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            title="Fechar"
            className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>
        </div>

        {forgotSubmitted ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">
                mark_email_read
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface">
              Se o e-mail estiver cadastrado, enviamos as instruções de recuperação para <strong>{forgotEmail}</strong>.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              O link expira em 1 hora. Verifique sua caixa de entrada e a pasta de spam.
            </p>
            <Button
              variant="primary"
              className="mt-2 w-full"
              onClick={handleClose}
            >
              Voltar ao Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Digite seu e-mail cadastrado para receber um link seguro de redefinição de senha (válido por 1 hora).
            </p>
            {forgotError && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-body-sm">
                {forgotError}
              </div>
            )}
            <Input
              label="Seu E-mail"
              placeholder="nome@empresa.com"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  mail
                </span>
              }
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                type="button"
                disabled={forgotLoading}
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={forgotLoading}>
                {forgotLoading ? 'Enviando...' : 'Enviar Instruções'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
