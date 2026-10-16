import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  authService,
  type UserSessionItem,
  type SettingsSection,
  mapActiveSessionToItem,
  extractApiErrorMessage,
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
} from '../features/settings';

export const SettingsPage: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, refreshProfile, logout } = useAuth();

  // Seções Ativas
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Estado do Perfil
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  // Estados dos Modais de Alteração de E-mail
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeBlockedModal, setEmailChangeBlockedModal] = useState<{
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  }>({ isOpen: false, lastChanged: '', nextAllowed: '' });

  const isGoogleLinked = Boolean(user?.google_id || user?.auth_provider === 'google');
  const is2faEnabled = Boolean(user?.is_two_factor_enabled);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Estado de Sessões
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);
  const [revokeAllModal, setRevokeAllModal] = useState(false);

  // Estado de 2FA
  const [show2faActivationModal, setShow2faActivationModal] = useState(false);
  const [isGenerating2fa, setIsGenerating2fa] = useState(false);
  const [isSubmitting2fa, setIsSubmitting2fa] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrCodeUrl, setTwoFactorQrCodeUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<1 | 2>(1);
  const [showRecoveryCodesModal, setShowRecoveryCodesModal] = useState(false);
  const [isLoadingRecoveryCodes, setIsLoadingRecoveryCodes] = useState(false);
  const [showDisable2faModal, setShowDisable2faModal] = useState(false);
  const [disable2faCode, setDisable2faCode] = useState('');
  const [isDisabling2fa, setIsDisabling2fa] = useState(false);

  // Estado de Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangedSuccess, setPasswordChangedSuccess] = useState(false);

  // Estado da Zona de Perigo
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Busca as sessões reais do usuário
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await authService.getSessions();
      const sessionList = Array.isArray(data) ? data : [];
      setSessions(sessionList.map(mapActiveSessionToItem));
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Não foi possível carregar os dispositivos conectados.'));
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Trata retorno do fluxo do Google OAuth
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const googleLinked = searchParams.get('google_linked');
    const errorParam = searchParams.get('error');

    if (googleLinked === 'true') {
      refreshProfile();
      toast.success('Conta Google conectada com sucesso ao seu perfil!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      toast.error(decodeURIComponent(errorParam));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshProfile]);

  const executeSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaved(false);
    try {
      await authService.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });
      await refreshProfile();
      setProfileSaved(true);
      setShowEmailChangeModal(false);
      toast.success('Dados do perfil atualizados com sucesso!');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Erro ao atualizar os dados do perfil.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

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

    await executeSaveProfile();
  };

  const handleGoogleProviderAction = async () => {
    if (!isGoogleLinked) {
      setIsLinkingGoogle(true);
      try {
        const { url } = await authService.getGoogleConnectUrl();
        window.location.href = url;
      } catch (error) {
        toast.error(
          extractApiErrorMessage(error, 'Não foi possível iniciar a conexão com a conta Google.')
        );
        setIsLinkingGoogle(false);
      }
      return;
    }

    setIsUnlinkingGoogle(true);
    try {
      await authService.unlinkGoogle();
      await refreshProfile();
      toast.success('Conta Google desvinculada com sucesso.');
    } catch (error) {
      toast.error(
        extractApiErrorMessage(
          error,
          'Não foi possível desvincular sua conta Google. Verifique se você possui uma senha local cadastrada.'
        )
      );
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Sessão revogada com sucesso.');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Erro ao revogar a sessão selecionada.'));
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setIsRevokingOthers(true);
    try {
      await authService.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setRevokeAllModal(false);
      toast.success('Todos os outros dispositivos foram desconectados.');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Erro ao desconectar os outros dispositivos.'));
    } finally {
      setIsRevokingOthers(false);
    }
  };

  const handleStart2FA = async () => {
    setIsGenerating2fa(true);
    try {
      const response = await authService.generate2fa();
      setTwoFactorSecret(response.secret || '');
      setTwoFactorQrCodeUrl(response.qr_code_data_url || '');
      setRecoveryCodes(Array.isArray(response.recovery_codes) ? response.recovery_codes : []);
      setTwoFactorCode('');
      setTwoFactorStep(1);
      setShow2faActivationModal(true);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Não foi possível gerar a chave de configuração 2FA.'));
    } finally {
      setIsGenerating2fa(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) return;

    setIsSubmitting2fa(true);
    try {
      await authService.enable2fa(twoFactorCode);
      await refreshProfile();
      setTwoFactorStep(2);
      toast.success('Autenticação em dois fatores (2FA) ativada com sucesso!');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Código TOTP de 6 dígitos inválido.'));
    } finally {
      setIsSubmitting2fa(false);
    }
  };

  const handleOpenRecoveryCodesModal = async () => {
    setIsLoadingRecoveryCodes(true);
    try {
      const response = await authService.getRecoveryCodes();
      setRecoveryCodes(Array.isArray(response.recovery_codes) ? response.recovery_codes : []);
      setShowRecoveryCodesModal(true);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Não foi possível obter os códigos de recuperação.'));
    } finally {
      setIsLoadingRecoveryCodes(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disable2faCode.length !== 6) return;

    setIsDisabling2fa(true);
    try {
      await authService.disable2fa(disable2faCode);
      await refreshProfile();
      setShowDisable2faModal(false);
      setDisable2faCode('');
      setRecoveryCodes([]);
      toast.success('Autenticação em dois fatores (2FA) desativada.');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Código de autenticação inválido para desativar o 2FA.'));
    } finally {
      setIsDisabling2fa(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangedSuccess(false);
    try {
      await authService.changePassword({
        currentPassword: currentPassword ? currentPassword : undefined,
        newPassword,
      });
      setPasswordChangedSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha atualizada com sucesso!');
      fetchSessions();
      setTimeout(() => setPasswordChangedSuccess(false), 4000);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Não foi possível alterar sua senha.'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccountPermanent = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') return;

    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount({
        password: deletePassword ? deletePassword : undefined,
        confirmation: deleteConfirmationText.trim().toUpperCase(),
      });
      await logout();
      toast.success('Sua conta e todos os dados vinculados foram excluídos permanentemente.');
      navigate('login');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Erro ao excluir a conta. Verifique sua senha e tente novamente.'));
    } finally {
      setIsDeletingAccount(false);
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
            onGoogleProviderAction={handleGoogleProviderAction}
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
          onConfirm={handleRevokeOtherSessions}
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
          onConfirm={executeSaveProfile}
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
