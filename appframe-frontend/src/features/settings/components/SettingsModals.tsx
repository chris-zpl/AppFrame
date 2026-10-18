import React from 'react';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { TwoFactorRecoveryModal } from './TwoFactorRecoveryModal';
import { TwoFactorDisableModal } from './TwoFactorDisableModal';
import { RevokeAllSessionsModal } from './RevokeAllSessionsModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { EmailChangeModal } from './EmailChangeModal';
import { EmailChangeBlockedModal } from './EmailChangeBlockedModal';
import { useSettingsContext } from '../context';
import { useAuth } from '../../auth';

export interface SettingsModalsProps {
  // TwoFactorSetup
  show2faActivationModal?: boolean;
  twoFactorStep?: 1 | 2;
  twoFactorQrCodeUrl?: string;
  twoFactorSecret?: string;
  twoFactorCode?: string;
  setTwoFactorCode?: (code: string) => void;
  recoveryCodes?: string[];
  isSubmitting2fa?: boolean;
  onClose2faActivation?: () => void;
  onConfirm2FA?: (e: React.FormEvent) => void;

  // TwoFactorRecovery
  showRecoveryCodesModal?: boolean;
  onCloseRecoveryCodesModal?: () => void;

  // TwoFactorDisable
  showDisable2faModal?: boolean;
  disable2faCode?: string;
  setDisable2faCode?: (code: string) => void;
  isDisabling2fa?: boolean;
  onCloseDisable2faModal?: () => void;
  onConfirmDisable2FA?: (e: React.FormEvent) => void;

  // RevokeAllSessions
  revokeAllModal?: boolean;
  isRevokingOthers?: boolean;
  onCloseRevokeAllModal?: () => void;
  onConfirmRevokeAll?: () => void;

  // DeleteAccount
  deleteAccountModal?: boolean;
  deletePassword?: string;
  setDeletePassword?: (val: string) => void;
  deleteConfirmationText?: string;
  setDeleteConfirmationText?: (val: string) => void;
  isDeletingAccount?: boolean;
  onCloseDeleteAccountModal?: () => void;
  onConfirmDeleteAccount?: () => void;

  // EmailChange
  showEmailChangeModal?: boolean;
  currentEmail?: string;
  newEmail?: string;
  isSavingProfile?: boolean;
  onCloseEmailChangeModal?: () => void;
  onConfirmEmailChange?: () => void;

  // EmailChangeBlocked
  emailChangeBlockedModal?: {
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  };
  onCloseEmailChangeBlockedModal?: () => void;
}

export const SettingsModals: React.FC<SettingsModalsProps> = (props) => {
  const settings = useSettingsContext();
  const { user } = useAuth();

  const show2faActivationModal = props.show2faActivationModal ?? settings.show2faActivationModal;
  const twoFactorStep = props.twoFactorStep ?? settings.twoFactorStep;
  const twoFactorQrCodeUrl = props.twoFactorQrCodeUrl ?? settings.twoFactorQrCodeUrl;
  const twoFactorSecret = props.twoFactorSecret ?? settings.twoFactorSecret;
  const twoFactorCode = props.twoFactorCode ?? settings.twoFactorCode;
  const setTwoFactorCode = props.setTwoFactorCode ?? settings.setTwoFactorCode;
  const recoveryCodes = props.recoveryCodes ?? settings.recoveryCodes;
  const isSubmitting2fa = props.isSubmitting2fa ?? settings.isSubmitting2fa;
  const onClose2faActivation = props.onClose2faActivation ?? (() => settings.setShow2faActivationModal(false));
  const onConfirm2FA = props.onConfirm2FA ?? settings.handleConfirm2FA;

  const showRecoveryCodesModal = props.showRecoveryCodesModal ?? settings.showRecoveryCodesModal;
  const onCloseRecoveryCodesModal = props.onCloseRecoveryCodesModal ?? (() => settings.setShowRecoveryCodesModal(false));

  const showDisable2faModal = props.showDisable2faModal ?? settings.showDisable2faModal;
  const disable2faCode = props.disable2faCode ?? settings.disable2faCode;
  const setDisable2faCode = props.setDisable2faCode ?? settings.setDisable2faCode;
  const isDisabling2fa = props.isDisabling2fa ?? settings.isDisabling2fa;
  const onCloseDisable2faModal = props.onCloseDisable2faModal ?? (() => settings.setShowDisable2faModal(false));
  const onConfirmDisable2FA = props.onConfirmDisable2FA ?? settings.handleDisable2FA;

  const revokeAllModal = props.revokeAllModal ?? settings.revokeAllModal;
  const isRevokingOthers = props.isRevokingOthers ?? settings.isRevokingOthers;
  const onCloseRevokeAllModal = props.onCloseRevokeAllModal ?? (() => settings.setRevokeAllModal(false));
  const onConfirmRevokeAll = props.onConfirmRevokeAll ?? settings.handleConfirmRevokeAll;

  const deleteAccountModal = props.deleteAccountModal ?? settings.deleteAccountModal;
  const deletePassword = props.deletePassword ?? settings.deletePassword;
  const setDeletePassword = props.setDeletePassword ?? settings.setDeletePassword;
  const deleteConfirmationText = props.deleteConfirmationText ?? settings.deleteConfirmationText;
  const setDeleteConfirmationText = props.setDeleteConfirmationText ?? settings.setDeleteConfirmationText;
  const isDeletingAccount = props.isDeletingAccount ?? settings.isDeletingAccount;
  const onCloseDeleteAccountModal = props.onCloseDeleteAccountModal ?? (() => {
    settings.setDeleteAccountModal(false);
    settings.setDeleteConfirmationText('');
    settings.setDeletePassword('');
  });
  const onConfirmDeleteAccount = props.onConfirmDeleteAccount ?? settings.handleDeleteAccountPermanent;

  const showEmailChangeModal = props.showEmailChangeModal ?? settings.showEmailChangeModal;
  const currentEmail = props.currentEmail ?? user?.email;
  const newEmail = props.newEmail ?? settings.email;
  const isSavingProfile = props.isSavingProfile ?? settings.isSavingProfile;
  const onCloseEmailChangeModal = props.onCloseEmailChangeModal ?? (() => settings.setShowEmailChangeModal(false));
  const onConfirmEmailChange = props.onConfirmEmailChange ?? (async () => {
    const success = await settings.executeSaveProfile(settings.name, settings.email);
    if (success) {
      settings.setShowEmailChangeModal(false);
    }
  });

  const emailChangeBlockedModal = props.emailChangeBlockedModal ?? settings.emailChangeBlockedModal;
  const onCloseEmailChangeBlockedModal = props.onCloseEmailChangeBlockedModal ?? (() => {
    settings.setEmailChangeBlockedModal({ isOpen: false, lastChanged: '', nextAllowed: '' });
    if (user?.email) settings.setEmail(user.email);
  });

  return (
    <>
      {/* 1. Modal de Ativação de 2FA */}
      <TwoFactorSetupModal
        isOpen={show2faActivationModal}
        step={twoFactorStep}
        qrCodeUrl={twoFactorQrCodeUrl}
        secret={twoFactorSecret}
        code={twoFactorCode}
        setCode={setTwoFactorCode}
        recoveryCodes={recoveryCodes}
        isSubmitting={isSubmitting2fa}
        onClose={onClose2faActivation}
        onConfirm={onConfirm2FA}
      />

      {/* 2. Modal de Códigos de Recuperação 2FA */}
      <TwoFactorRecoveryModal
        isOpen={showRecoveryCodesModal}
        recoveryCodes={recoveryCodes}
        onClose={onCloseRecoveryCodesModal}
      />

      {/* 3. Modal de Desativação de 2FA */}
      <TwoFactorDisableModal
        isOpen={showDisable2faModal}
        code={disable2faCode}
        setCode={setDisable2faCode}
        isDisabling={isDisabling2fa}
        onClose={onCloseDisable2faModal}
        onConfirm={onConfirmDisable2FA}
      />

      {/* 4. Modal de Confirmação para Desconectar Outros Dispositivos */}
      <RevokeAllSessionsModal
        isOpen={revokeAllModal}
        isLoading={isRevokingOthers}
        onClose={onCloseRevokeAllModal}
        onConfirm={onConfirmRevokeAll}
      />

      {/* 5. Modal de Exclusão Permanente de Conta (Zona de Perigo) */}
      <DeleteAccountModal
        isOpen={deleteAccountModal}
        password={deletePassword}
        setPassword={setDeletePassword}
        confirmationText={deleteConfirmationText}
        setConfirmationText={setDeleteConfirmationText}
        isDeleting={isDeletingAccount}
        onClose={onCloseDeleteAccountModal}
        onConfirm={onConfirmDeleteAccount}
      />

      {/* 6. Modal de Confirmação de Alteração de E-mail */}
      <EmailChangeModal
        isOpen={showEmailChangeModal}
        currentEmail={currentEmail}
        newEmail={newEmail}
        isSaving={isSavingProfile}
        onClose={onCloseEmailChangeModal}
        onConfirm={onConfirmEmailChange}
      />

      {/* 7. Modal de Bloqueio de Alteração de E-mail (Limite Semestral) */}
      <EmailChangeBlockedModal
        isOpen={emailChangeBlockedModal.isOpen}
        lastChanged={emailChangeBlockedModal.lastChanged}
        nextAllowed={emailChangeBlockedModal.nextAllowed}
        onClose={onCloseEmailChangeBlockedModal}
      />
    </>
  );
};
