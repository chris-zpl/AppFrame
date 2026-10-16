import React from 'react';
import { Card, Button } from '../../../components/ui';
import type { SmtpConfig } from '../interfaces';

interface AdminSmtpTabProps {
  smtpForm: SmtpConfig;
  setSmtpForm: React.Dispatch<React.SetStateAction<SmtpConfig>>;
  showSmtpPassword: boolean;
  setShowSmtpPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingSmtp: boolean;
  testEmailInput: string;
  setTestEmailInput: (val: string) => void;
  isTestingSmtp: boolean;
  currentUserEmail?: string;
  onSaveSmtp: (e: React.FormEvent) => void;
  onTestSmtp: () => void;
}

export const AdminSmtpTab: React.FC<AdminSmtpTabProps> = ({
  smtpForm,
  setSmtpForm,
  showSmtpPassword,
  setShowSmtpPassword,
  isSavingSmtp,
  testEmailInput,
  setTestEmailInput,
  isTestingSmtp,
  currentUserEmail,
  onSaveSmtp,
  onTestSmtp,
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-primary">
              outgoing_mail
            </span>
            <h3 className="text-title-md font-bold text-on-surface">
              Configurações do Servidor SMTP
            </h3>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Configure o servidor de envio de e-mails para notificações, recuperação de senhas e alertas do sistema.
          </p>
        </div>

        <form onSubmit={onSaveSmtp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline">
              Servidor SMTP (Host)
            </label>
            <input
              type="text"
              value={smtpForm.host}
              onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
              placeholder="smtp.gmail.com / smtp.resend.com"
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline">
              Porta
            </label>
            <input
              type="number"
              value={smtpForm.port}
              onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
              placeholder="587 ou 465"
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline">
              Usuário SMTP
            </label>
            <input
              type="text"
              value={smtpForm.user}
              onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
              placeholder="usuario@dominio.com"
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline">
              Senha SMTP
            </label>
            <div className="relative flex items-center">
              <input
                type={showSmtpPassword ? 'text' : 'password'}
                value={smtpForm.password}
                onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full bg-surface-container border border-surface-container-highest rounded-xl pl-3.5 pr-10 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword((v) => !v)}
                className="absolute right-2.5 text-outline hover:text-on-surface cursor-pointer p-1"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showSmtpPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline">
              Nome do Remetente
            </label>
            <input
              type="text"
              value={smtpForm.fromName}
              onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
              placeholder="AppFrame"
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline">
              E-mail do Remetente (From)
            </label>
            <input
              type="email"
              value={smtpForm.fromEmail}
              onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
              placeholder="no-reply@appframe.io"
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
              required
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="secure-toggle"
              checked={smtpForm.secure}
              onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <label
              htmlFor="secure-toggle"
              className="text-body-sm text-on-surface cursor-pointer"
            >
              Usar conexão SSL/TLS direta (Porta 465)
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingSmtp}
              leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
            >
              Salvar Configurações SMTP
            </Button>
          </div>
        </form>
      </Card>

      {/* Teste de Disparo de E-mail */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-title-md font-bold text-on-surface">
            Enviar E-mail de Teste
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            Envie uma mensagem de teste real utilizando o servidor SMTP configurado acima para validar a autenticação e entrega.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <input
            type="email"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder={currentUserEmail || 'destino@dominio.com'}
            className="w-full bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
          />
          <Button
            variant="outline"
            onClick={onTestSmtp}
            isLoading={isTestingSmtp}
            leftIcon={<span className="material-symbols-outlined text-[18px]">send</span>}
            className="shrink-0 w-full md:w-auto"
          >
            Disparar Teste
          </Button>
        </div>
      </Card>
    </div>
  );
};
