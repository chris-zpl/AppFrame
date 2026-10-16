import React from 'react';
import { Card, Input, Button } from '../../../components/ui';

interface SettingsSecuritySectionProps {
  is2faEnabled: boolean;
  isLoadingRecoveryCodes: boolean;
  isGenerating2fa: boolean;
  onOpenRecoveryCodesModal: () => void;
  onOpenDisable2faModal: () => void;
  onStart2FA: () => void;
  passwordChangedSuccess: boolean;
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isChangingPassword: boolean;
  onPasswordSubmit: (e: React.FormEvent) => void;
}

export const SettingsSecuritySection: React.FC<SettingsSecuritySectionProps> = ({
  is2faEnabled,
  isLoadingRecoveryCodes,
  isGenerating2fa,
  onOpenRecoveryCodesModal,
  onOpenDisable2faModal,
  onStart2FA,
  passwordChangedSuccess,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isChangingPassword,
  onPasswordSubmit,
}) => {
  return (
    <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
      {/* Card 2FA (TOTP) */}
      <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/30">
              <span className="material-symbols-outlined text-[28px]">
                shield_locked
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Autenticação em Dois Fatores (2FA)
                </h3>
                {is2faEnabled ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-label-sm font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Ativado
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-outline text-label-sm font-bold">
                    Desativado
                  </span>
                )}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Proteja sua conta contra acessos não autorizados via TOTP (Google Authenticator, Authy).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {is2faEnabled ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isLoadingRecoveryCodes}
                  disabled={isLoadingRecoveryCodes}
                  onClick={onOpenRecoveryCodesModal}
                  leftIcon={
                    <span className="material-symbols-outlined text-[16px]">key</span>
                  }
                >
                  Ver Códigos Reserva
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onOpenDisable2faModal}
                >
                  Desativar 2FA
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                isLoading={isGenerating2fa}
                disabled={isGenerating2fa}
                onClick={onStart2FA}
                leftIcon={
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                }
              >
                Ativar 2FA
              </Button>
            )}
          </div>
        </div>

        <div className="text-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">info</span>
          <span>
            Quando ativado, cada login exigirá um código temporário de 6 dígitos gerado no seu smartphone.
          </span>
        </div>
      </Card>

      {/* Card Alteração de Senha */}
      <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-4">
        <div className="border-b border-surface-container-high/60 pb-3">
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            Alteração de Senha
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Atualize sua senha de acesso ao AppFrame. Contas criadas via Google também podem cadastrar uma senha local.
          </p>
        </div>

        {passwordChangedSuccess && (
          <div className="p-3 rounded-xl bg-primary-container/20 border border-primary/40 text-primary text-body-sm font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Senha alterada com sucesso! Outras sessões ativas foram revogadas por segurança.</span>
          </div>
        )}

        <form onSubmit={onPasswordSubmit} className="flex flex-col gap-4 max-w-xl">
          <Input
            label="Senha Atual (opcional se originada via Google)"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isChangingPassword}
            placeholder="••••••••••••"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">lock</span>
            }
          />

          <Input
            label="Nova Senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isChangingPassword}
            placeholder="••••••••••••"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
            }
          />

          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isChangingPassword}
            placeholder="••••••••••••"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
            }
          />

          <div className="pt-2">
            <Button
              variant="primary"
              type="submit"
              isLoading={isChangingPassword}
              disabled={isChangingPassword}
            >
              Atualizar Senha
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
