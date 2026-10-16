import React, { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  type SettingsSection,
  SettingsProfileSection,
  SettingsSecuritySection,
  SettingsSessionsSection,
  SettingsDangerSection,
  EmailChangeModal,
  EmailChangeBlockedModal,
  TwoFactorSetupModal,
  TwoFactorRecoveryModal,
  TwoFactorDisableModal,
  RevokeAllSessionsModal,
  DeleteAccountModal,
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

  return (
    <AppShell
      currentPath="configuracoes"
      onNavigate={(path) => navigate(path)}
      userName={user?.name || name}
      onUserAvatarClick={() => setActiveSection('profile')}
    >
      <div className="flex flex-col w-full text-on-surface pb-16">
        {/* ================= HEADER ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1 flex-wrap">
              <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
                Configurações e Segurança
              </h1>
              <Badge variant="status-live">Proteção Criptografada</Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Gerencie seus dados de acesso, credenciais Google OAuth, autenticação em duas etapas (2FA) e dispositivos conectados.
            </p>
          </div>
        </header>

        {/* ================= NAVEGAÇÃO DE SEÇÕES ================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-space-md border-b border-surface-container-high/80">
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
              activeSection === 'profile'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Perfil & Conta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('security')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
              activeSection === 'security'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">shield</span>
            <span>Segurança & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('sessions');
              fetchSessions();
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
              activeSection === 'sessions'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">devices</span>
            <span>Dispositivos Conectados</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm font-mono">
              {sessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('danger')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap text-error hover:bg-error-container/20',
              activeSection === 'danger' && 'bg-error-container/40 text-error font-bold border border-error/40'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>Zona de Perigo</span>
          </button>
        </div>

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

        {/* Modais de 2FA e Segurança */}
        <TwoFactorSetupModal
          isOpen={show2faActivationModal}
          step={twoFactorStep}
          qrCodeUrl={twoFactorQrCodeUrl}
          secret={twoFactorSecret}
          code={twoFactorCode}
          setCode={setTwoFactorCode}
          recoveryCodes={recoveryCodes}
          isSubmitting={isSubmitting2fa}
          onClose={() => setShow2faActivationModal(false)}
          onConfirm={handleConfirm2FA}
        />

        <TwoFactorRecoveryModal
          isOpen={showRecoveryCodesModal}
          recoveryCodes={recoveryCodes}
          onClose={() => setShowRecoveryCodesModal(false)}
        />

        <TwoFactorDisableModal
          isOpen={showDisable2faModal}
          code={disable2faCode}
          setCode={setDisable2faCode}
          isDisabling={isDisabling2fa}
          onClose={() => setShowDisable2faModal(false)}
          onConfirm={handleDisable2FA}
        />

        <RevokeAllSessionsModal
          isOpen={revokeAllModal}
          isLoading={isRevokingOthers}
          onClose={() => setRevokeAllModal(false)}
          onConfirm={handleConfirmRevokeAll}
        />

        <DeleteAccountModal
          isOpen={deleteAccountModal}
          password={deletePassword}
          setPassword={setDeletePassword}
          confirmationText={deleteConfirmationText}
          setConfirmationText={setDeleteConfirmationText}
          isDeleting={isDeletingAccount}
          onClose={() => {
            setDeleteAccountModal(false);
            setDeleteConfirmationText('');
            setDeletePassword('');
          }}
          onConfirm={handleDeleteAccountPermanent}
        />

        <EmailChangeModal
          isOpen={showEmailChangeModal}
          currentEmail={user?.email}
          newEmail={email}
          isSaving={isSavingProfile}
          onClose={() => setShowEmailChangeModal(false)}
          onConfirm={async () => {
            const success = await executeSaveProfile(name, email);
            if (success) {
              setShowEmailChangeModal(false);
            }
          }}
        />

        <EmailChangeBlockedModal
          isOpen={emailChangeBlockedModal.isOpen}
          lastChanged={emailChangeBlockedModal.lastChanged}
          nextAllowed={emailChangeBlockedModal.nextAllowed}
          onClose={() => {
            setEmailChangeBlockedModal({ isOpen: false, lastChanged: '', nextAllowed: '' });
            if (user?.email) setEmail(user.email);
          }}
        />
      </div>
    </AppShell>
  );
};
