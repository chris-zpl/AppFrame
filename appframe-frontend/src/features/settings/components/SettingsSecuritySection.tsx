import React, { useMemo } from 'react';
import { Card, Input, Button, VisibilityToggle } from '../../../components/ui';
import { PasswordStrengthIndicator, calculatePasswordStrength } from '../../auth';
import { useSettingsContext } from '../context';
import { usePasswordVisibility } from '../../../hooks';

export interface SettingsSecuritySectionProps {
  is2faEnabled?: boolean;
  isLoadingRecoveryCodes?: boolean;
  isGenerating2fa?: boolean;
  onOpenRecoveryCodesModal?: () => void;
  onOpenDisable2faModal?: () => void;
  onStart2FA?: () => void;
  passwordChangedSuccess?: boolean;
  currentPassword?: string;
  setCurrentPassword?: (val: string) => void;
  newPassword?: string;
  setNewPassword?: (val: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (val: string) => void;
  isChangingPassword?: boolean;
  onPasswordSubmit?: (e: React.FormEvent) => void;
  showCurrentPassword?: boolean;
  onToggleShowCurrentPassword?: () => void;
  showNewPassword?: boolean;
  onToggleShowNewPassword?: () => void;
  showConfirmPassword?: boolean;
  onToggleShowConfirmPassword?: () => void;
}

export const SettingsSecuritySection: React.FC<SettingsSecuritySectionProps> = (props) => {
  const settings = useSettingsContext();

  const is2faEnabled = props.is2faEnabled ?? settings.is2faEnabled;
  const isLoadingRecoveryCodes = props.isLoadingRecoveryCodes ?? settings.isLoadingRecoveryCodes;
  const isGenerating2fa = props.isGenerating2fa ?? settings.isGenerating2fa;
  const onOpenRecoveryCodesModal = props.onOpenRecoveryCodesModal ?? settings.handleOpenRecoveryCodesModal;
  const onOpenDisable2faModal = props.onOpenDisable2faModal ?? (() => settings.setShowDisable2faModal(true));
  const onStart2FA = props.onStart2FA ?? settings.handleStart2FA;
  const passwordChangedSuccess = props.passwordChangedSuccess ?? settings.passwordChangedSuccess;
  const currentPassword = props.currentPassword ?? settings.currentPassword;
  const setCurrentPassword = props.setCurrentPassword ?? settings.setCurrentPassword;
  const newPassword = props.newPassword ?? settings.newPassword;
  const setNewPassword = props.setNewPassword ?? settings.setNewPassword;
  const confirmPassword = props.confirmPassword ?? settings.confirmPassword;
  const setConfirmPassword = props.setConfirmPassword ?? settings.setConfirmPassword;
  const isChangingPassword = props.isChangingPassword ?? settings.isChangingPassword;
  const onPasswordSubmit = props.onPasswordSubmit ?? settings.handlePasswordSubmit;

  const currentVisibility = usePasswordVisibility(false);
  const newVisibility = usePasswordVisibility(false);
  const confirmVisibility = usePasswordVisibility(false);

  const showCurrentPassword = props.showCurrentPassword ?? currentVisibility.isVisible;
  const handleToggleShowCurrentPassword =
    props.onToggleShowCurrentPassword ?? currentVisibility.toggle;

  const showNewPassword = props.showNewPassword ?? newVisibility.isVisible;
  const handleToggleShowNewPassword =
    props.onToggleShowNewPassword ?? newVisibility.toggle;

  const showConfirmPassword = props.showConfirmPassword ?? confirmVisibility.isVisible;
  const handleToggleShowConfirmPassword =
    props.onToggleShowConfirmPassword ?? confirmVisibility.toggle;

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(newPassword || ''),
    [newPassword]
  );
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
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isChangingPassword}
            placeholder="••••••••••••"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">lock</span>
            }
            rightElement={
              <VisibilityToggle
                isVisible={showCurrentPassword}
                onToggle={handleToggleShowCurrentPassword}
                ariaLabel="Mostrar ou ocultar senha atual"
              />
            }
          />

          <div className="flex flex-col gap-1.5">
            <Input
              label="Nova Senha"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isChangingPassword}
              minLength={8}
              placeholder="Mínimo de 8 caracteres"
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              }
              rightElement={
                <VisibilityToggle
                  isVisible={showNewPassword}
                  onToggle={handleToggleShowNewPassword}
                  ariaLabel="Mostrar ou ocultar nova senha"
                />
              }
            />

            {/* Indicador Visual Dinâmico de Força de Senha e Regras */}
            <PasswordStrengthIndicator passwordStrength={passwordStrength} />
          </div>

          <Input
            label="Confirmar Nova Senha"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isChangingPassword}
            minLength={8}
            placeholder="Repita a nova senha"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
            }
            rightElement={
              <VisibilityToggle
                isVisible={showConfirmPassword}
                onToggle={handleToggleShowConfirmPassword}
                ariaLabel="Mostrar ou ocultar confirmação de senha"
              />
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
