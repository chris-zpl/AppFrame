import React from 'react';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { TwoFactorRecoveryModal } from './TwoFactorRecoveryModal';
import { TwoFactorDisableModal } from './TwoFactorDisableModal';
import { RevokeAllSessionsModal } from './RevokeAllSessionsModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { EmailChangeModal } from './EmailChangeModal';
import { EmailChangeBlockedModal } from './EmailChangeBlockedModal';

export interface SettingsModalsProps {
  // TwoFactorSetup
  show2faActivationModal: boolean;
  twoFactorStep: 1 | 2;
  twoFactorQrCodeUrl: string;
  twoFactorSecret: string;
  twoFactorCode: string;
  setTwoFactorCode: (code: string) => void;
  recoveryCodes: string[];
  isSubmitting2fa: boolean;
  onClose2faActivation: () => void;
  onConfirm2FA: (e: React.FormEvent) => void;

  // TwoFactorRecovery
  showRecoveryCodesModal: boolean;
  onCloseRecoveryCodesModal: () => void;

  // TwoFactorDisable
  showDisable2faModal: boolean;
  disable2faCode: string;
  setDisable2faCode: (code: string) => void;
  isDisabling2fa: boolean;
  onCloseDisable2faModal: () => void;
  onConfirmDisable2FA: (e: React.FormEvent) => void;

  // RevokeAllSessions
  revokeAllModal: boolean;
  isRevokingOthers: boolean;
  onCloseRevokeAllModal: () => void;
  onConfirmRevokeAll: () => void;

  // DeleteAccount
  deleteAccountModal: boolean;
  deletePassword: string;
  setDeletePassword: (val: string) => void;
  deleteConfirmationText: string;
  setDeleteConfirmationText: (val: string) => void;
  isDeletingAccount: boolean;
  onCloseDeleteAccountModal: () => void;
  onConfirmDeleteAccount: () => void;

  // EmailChange
  showEmailChangeModal: boolean;
  currentEmail?: string;
  newEmail: string;
  isSavingProfile: boolean;
  onCloseEmailChangeModal: () => void;
  onConfirmEmailChange: () => void;

  // EmailChangeBlocked
  emailChangeBlockedModal: {
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  };
  onCloseEmailChangeBlockedModal: () => void;
}

export const SettingsModals: React.FC<SettingsModalsProps> = ({
  show2faActivationModal,
  twoFactorStep,
  twoFactorQrCodeUrl,
  twoFactorSecret,
  twoFactorCode,
  setTwoFactorCode,
  recoveryCodes,
  isSubmitting2fa,
  onClose2faActivation,
  onConfirm2FA,
  showRecoveryCodesModal,
  onCloseRecoveryCodesModal,
  showDisable2faModal,
  disable2faCode,
  setDisable2faCode,
  isDisabling2fa,
  onCloseDisable2faModal,
  onConfirmDisable2FA,
  revokeAllModal,
  isRevokingOthers,
  onCloseRevokeAllModal,
  onConfirmRevokeAll,
  deleteAccountModal,
  deletePassword,
  setDeletePassword,
  deleteConfirmationText,
  setDeleteConfirmationText,
  isDeletingAccount,
  onCloseDeleteAccountModal,
  onConfirmDeleteAccount,
  showEmailChangeModal,
  currentEmail,
  newEmail,
  isSavingProfile,
  onCloseEmailChangeModal,
  onConfirmEmailChange,
  emailChangeBlockedModal,
  onCloseEmailChangeBlockedModal,
}) => {
  return (
    <>
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

      <TwoFactorRecoveryModal
        isOpen={showRecoveryCodesModal}
        recoveryCodes={recoveryCodes}
        onClose={onCloseRecoveryCodesModal}
      />

      <TwoFactorDisableModal
        isOpen={showDisable2faModal}
        code={disable2faCode}
        setCode={setDisable2faCode}
        isDisabling={isDisabling2fa}
        onClose={onCloseDisable2faModal}
        onConfirm={onConfirmDisable2FA}
      />

      <RevokeAllSessionsModal
        isOpen={revokeAllModal}
        isLoading={isRevokingOthers}
        onClose={onCloseRevokeAllModal}
        onConfirm={onConfirmRevokeAll}
      />

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

      <EmailChangeModal
        isOpen={showEmailChangeModal}
        currentEmail={currentEmail}
        newEmail={newEmail}
        isSaving={isSavingProfile}
        onClose={onCloseEmailChangeModal}
        onConfirm={onConfirmEmailChange}
      />

      <EmailChangeBlockedModal
        isOpen={emailChangeBlockedModal.isOpen}
        lastChanged={emailChangeBlockedModal.lastChanged}
        nextAllowed={emailChangeBlockedModal.nextAllowed}
        onClose={onCloseEmailChangeBlockedModal}
      />
    </>
  );
};
