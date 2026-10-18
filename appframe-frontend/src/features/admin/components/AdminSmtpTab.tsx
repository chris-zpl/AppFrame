import React from 'react';
import { Card, Button, Input, VisibilityToggle } from '../../../components/ui';
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
          <Input
            size="sm"
            label="Servidor SMTP (Host)"
            labelClassName="font-bold text-outline text-label-sm"
            type="text"
            value={smtpForm.host}
            onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
            placeholder="smtp.gmail.com / smtp.resend.com"
            required
          />

          <Input
            size="sm"
            label="Porta"
            labelClassName="font-bold text-outline text-label-sm"
            type="number"
            value={smtpForm.port}
            onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
            placeholder="587 ou 465"
            required
          />

          <Input
            size="sm"
            label="Usuário SMTP"
            labelClassName="font-bold text-outline text-label-sm"
            type="text"
            value={smtpForm.user}
            onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
            placeholder="usuario@dominio.com"
          />

          <Input
            size="sm"
            label="Senha SMTP"
            labelClassName="font-bold text-outline text-label-sm"
            type={showSmtpPassword ? 'text' : 'password'}
            value={smtpForm.password}
            onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
            placeholder="••••••••••••"
            rightElement={
              <VisibilityToggle
                isVisible={showSmtpPassword}
                onToggle={() => setShowSmtpPassword((v) => !v)}
              />
            }
          />

          <Input
            size="sm"
            label="Nome do Remetente"
            labelClassName="font-bold text-outline text-label-sm"
            type="text"
            value={smtpForm.fromName}
            onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
            placeholder="AppFrame"
          />

          <Input
            size="sm"
            label="E-mail do Remetente (From)"
            labelClassName="font-bold text-outline text-label-sm"
            type="email"
            value={smtpForm.fromEmail}
            onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
            placeholder="no-reply@appframe.io"
            required
          />

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
          <Input
            size="sm"
            type="email"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder={currentUserEmail || 'destino@dominio.com'}
            containerClassName="flex-1"
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
