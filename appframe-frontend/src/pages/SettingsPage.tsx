import React, { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { toast } from 'sonner';
import {
  type SettingsSection,
  SettingsHeader,
  SettingsNavigationTabs,
  SettingsProfileSection,
  SettingsSecuritySection,
  SettingsSessionsSection,
  SettingsDangerSection,
  SettingsModals,
  useSettings,
} from '../features/settings';

export const SettingsPage: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, refreshProfile, logout } = useAuth();

  // Seções Ativas
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Estado do Perfil local
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Estados dos Modais de Alteração de E-mail
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeBlockedModal, setEmailChangeBlockedModal] = useState<{
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  }>({ isOpen: false, lastChanged: '', nextAllowed: '' });

  const [revokeAllModal, setRevokeAllModal] = useState(false);

  const isGoogleLinked = Boolean(user?.google_id || user?.auth_provider === 'google');
  const is2faEnabled = Boolean(user?.is_two_factor_enabled);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const {
    sessions,
    isLoadingSessions,
    revokingSessionId,
    isRevokingOthers,
    isSavingProfile,
    profileSaved,
    isUnlinkingGoogle,
    isLinkingGoogle,
    show2faActivationModal,
    setShow2faActivationModal,
    isGenerating2fa,
    isSubmitting2fa,
    twoFactorSecret,
    twoFactorQrCodeUrl,
    recoveryCodes,
    twoFactorCode,
    setTwoFactorCode,
    twoFactorStep,
    showRecoveryCodesModal,
    setShowRecoveryCodesModal,
    isLoadingRecoveryCodes,
    showDisable2faModal,
    setShowDisable2faModal,
    disable2faCode,
    setDisable2faCode,
    isDisabling2fa,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isChangingPassword,
    passwordChangedSuccess,
    deleteAccountModal,
    setDeleteAccountModal,
    deleteConfirmationText,
    setDeleteConfirmationText,
    deletePassword,
    setDeletePassword,
    isDeletingAccount,
    fetchSessions,
    executeSaveProfile,
    handleGoogleProviderAction,
    handleRevokeSession,
    handleRevokeOtherSessions,
    handleStart2FA,
    handleConfirm2FA,
    handleOpenRecoveryCodesModal,
    handleDisable2FA,
    handlePasswordSubmit,
    handleDeleteAccountPermanent,
  } = useSettings({
    refreshProfile,
    logout,
    navigate: (path) => navigate(path),
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha o nome e o e-mail.');
      return;
    }

    const isEmailChanging = email.trim().toLowerCase() !== (user?.email || '').toLowerCase();

    if (isEmailChanging) {
      if (user?.email_changed_at) {
        const lastChangedDate = new Date(user.email_changed_at);
        const nextAllowedDate = new Date(lastChangedDate);
        nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 6);
        if (new Date() < nextAllowedDate) {
          setEmailChangeBlockedModal({
            isOpen: true,
            lastChanged: lastChangedDate.toLocaleDateString('pt-BR'),
            nextAllowed: nextAllowedDate.toLocaleDateString('pt-BR'),
          });
          return;
        }
      }

      setShowEmailChangeModal(true);
      return;
    }

    await executeSaveProfile(name, email);
  };

  const handleConfirmRevokeAll = async () => {
    const success = await handleRevokeOtherSessions();
    if (success) {
      setRevokeAllModal(false);
    }
  };

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSection(section);
    if (section === 'sessions') {
      fetchSessions();
    }
  };

  return (
    <AppShell
      currentPath="configuracoes"
      onNavigate={(path) => navigate(path)}
      userName={user?.name || name}
      onUserAvatarClick={() => setActiveSection('profile')}
    >
      <div className="flex flex-col w-full text-on-surface pb-16">
        {/* ================= HEADER ================= */}
        <SettingsHeader />

        {/* ================= NAVEGAÇÃO DE SEÇÕES ================= */}
        <SettingsNavigationTabs
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          sessionsCount={sessions.length}
        />

        {/* 1. SEÇÃO PERFIL */}
        {activeSection === 'profile' && (
          <SettingsProfileSection
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            isSavingProfile={isSavingProfile}
            profileSaved={profileSaved}
            isGoogleLinked={isGoogleLinked}
            googleEmail={user?.google_email}
            isUnlinkingGoogle={isUnlinkingGoogle}
            isLinkingGoogle={isLinkingGoogle}
            onSaveProfile={handleSaveProfile}
            onGoogleProviderAction={() => handleGoogleProviderAction(isGoogleLinked)}
          />
        )}

        {/* 2. SEÇÃO SEGURANÇA */}
        {activeSection === 'security' && (
          <SettingsSecuritySection
            is2faEnabled={is2faEnabled}
            isLoadingRecoveryCodes={isLoadingRecoveryCodes}
            isGenerating2fa={isGenerating2fa}
            onOpenRecoveryCodesModal={handleOpenRecoveryCodesModal}
            onOpenDisable2faModal={() => {
              setDisable2faCode('');
              setShowDisable2faModal(true);
            }}
            onStart2FA={handleStart2FA}
            passwordChangedSuccess={passwordChangedSuccess}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            isChangingPassword={isChangingPassword}
            onPasswordSubmit={handlePasswordSubmit}
          />
        )}

        {/* 3. SEÇÃO SESSÕES */}
        {activeSection === 'sessions' && (
          <SettingsSessionsSection
            sessions={sessions}
            isLoadingSessions={isLoadingSessions}
            revokingSessionId={revokingSessionId}
            onOpenRevokeAllModal={() => setRevokeAllModal(true)}
            onRevokeSession={handleRevokeSession}
          />
        )}

        {/* 4. SEÇÃO ZONA DE PERIGO */}
        {activeSection === 'danger' && (
          <SettingsDangerSection
            onTriggerDeleteModal={() => {
              setDeleteConfirmationText('');
              setDeletePassword('');
              setDeleteAccountModal(true);
            }}
          />
        )}

        {/* Modais de 2FA, Sessões, Exclusão de Conta e Alteração de E-mail */}
        <SettingsModals
          show2faActivationModal={show2faActivationModal}
          twoFactorStep={twoFactorStep}
          twoFactorQrCodeUrl={twoFactorQrCodeUrl}
          twoFactorSecret={twoFactorSecret}
          twoFactorCode={twoFactorCode}
          setTwoFactorCode={setTwoFactorCode}
          recoveryCodes={recoveryCodes}
          isSubmitting2fa={isSubmitting2fa}
          onClose2faActivation={() => setShow2faActivationModal(false)}
          onConfirm2FA={handleConfirm2FA}
          showRecoveryCodesModal={showRecoveryCodesModal}
          onCloseRecoveryCodesModal={() => setShowRecoveryCodesModal(false)}
          showDisable2faModal={showDisable2faModal}
          disable2faCode={disable2faCode}
          setDisable2faCode={setDisable2faCode}
          isDisabling2fa={isDisabling2fa}
          onCloseDisable2faModal={() => setShowDisable2faModal(false)}
          onConfirmDisable2FA={handleDisable2FA}
          revokeAllModal={revokeAllModal}
          isRevokingOthers={isRevokingOthers}
          onCloseRevokeAllModal={() => setRevokeAllModal(false)}
          onConfirmRevokeAll={handleConfirmRevokeAll}
          deleteAccountModal={deleteAccountModal}
          deletePassword={deletePassword}
          setDeletePassword={setDeletePassword}
          deleteConfirmationText={deleteConfirmationText}
          setDeleteConfirmationText={setDeleteConfirmationText}
          isDeletingAccount={isDeletingAccount}
          onCloseDeleteAccountModal={() => {
            setDeleteAccountModal(false);
            setDeleteConfirmationText('');
            setDeletePassword('');
          }}
          onConfirmDeleteAccount={handleDeleteAccountPermanent}
          showEmailChangeModal={showEmailChangeModal}
          currentEmail={user?.email}
          newEmail={email}
          isSavingProfile={isSavingProfile}
          onCloseEmailChangeModal={() => setShowEmailChangeModal(false)}
          onConfirmEmailChange={async () => {
            const success = await executeSaveProfile(name, email);
            if (success) {
              setShowEmailChangeModal(false);
            }
          }}
          emailChangeBlockedModal={emailChangeBlockedModal}
          onCloseEmailChangeBlockedModal={() => {
            setEmailChangeBlockedModal({ isOpen: false, lastChanged: '', nextAllowed: '' });
            if (user?.email) setEmail(user.email);
          }}
        />
      </div>
    </AppShell>
  );
};
