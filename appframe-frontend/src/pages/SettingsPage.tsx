import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { authService, type ActiveSession } from '../services/auth.service';
import { AppShell } from '../components/layout/AppShell';

import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export interface UserSessionItem {
  id: string;
  deviceName: string;
  browser: string;
  ipAddress: string;
  isCurrent: boolean;
  lastActiveAt: string;
  icon: string;
}

const extractBrowserFromUserAgent = (userAgent?: string | null): string => {
  if (!userAgent) return 'Navegador Web';

  const edgeMatch = userAgent.match(/Edg\/([\d.]+)/);
  if (edgeMatch) return `Edge ${edgeMatch[1]}`;

  const oprMatch = userAgent.match(/(?:OPR|Opera)\/([\d.]+)/);
  if (oprMatch) return `Opera ${oprMatch[1]}`;

  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  if (chromeMatch) return `Chrome ${chromeMatch[1]}`;

  const firefoxMatch = userAgent.match(/Firefox\/([\d.]+)/);
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;

  const safariMatch = userAgent.match(/Version\/([\d.]+).*Safari/);
  if (safariMatch) return `Safari ${safariMatch[1]}`;

  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Navegador Web';
};

const extractIconFromSession = (userAgent?: string | null, deviceName?: string | null): string => {
  const combined = `${userAgent || ''} ${deviceName || ''}`.toLowerCase();
  if (combined.includes('iphone') || combined.includes('android') || combined.includes('mobile')) {
    return 'smartphone';
  }
  if (combined.includes('ipad') || combined.includes('tablet')) {
    return 'tablet_mac';
  }
  if (combined.includes('macintosh') || combined.includes('macos') || combined.includes('mac os')) {
    return 'laptop_mac';
  }
  if (combined.includes('windows') || combined.includes('linux')) {
    return 'desktop_windows';
  }
  return 'devices';
};

const formatRelativeTime = (dateString?: string, isCurrent?: boolean): string => {
  if (isCurrent) return 'Ativo agora';
  if (!dateString) return 'Recente';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recente';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'Ativo agora';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  }

  return date.toLocaleDateString('pt-BR');
};

const mapActiveSessionToItem = (session: ActiveSession): UserSessionItem => ({
  id: session.id,
  deviceName: session.device_name || 'Dispositivo Desconhecido',
  browser: extractBrowserFromUserAgent(session.user_agent),
  ipAddress: session.ip_address || 'IP não disponível',
  isCurrent: Boolean(session.is_current),
  lastActiveAt: formatRelativeTime(session.last_active_at, session.is_current),
  icon: extractIconFromSession(session.user_agent, session.device_name),
});

const extractApiErrorMessage = (error: any, fallback: string): string => {
  const apiMessage = error?.response?.data?.message;
  if (Array.isArray(apiMessage) && apiMessage.length > 0) {
    return String(apiMessage[0]);
  }
  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }
  return fallback;
};

const calculateNextEmailChangeDate = (fromDate: Date): string => {
  const nextDate = new Date(fromDate);
  nextDate.setMonth(nextDate.getMonth() + 6);
  return nextDate.toLocaleDateString('pt-BR');
};

export const SettingsPage: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, refreshProfile, logout } = useAuth();

  // Seções Ativas
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'sessions' | 'danger'>('profile');

  // Estado Real do Perfil (sincronizado com AuthContext)
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);


  // Estados dos Modais de Alteração de E-mail (Regra de 6 meses)
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

  // Estado Real de Sessões
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);
  const [revokeAllModal, setRevokeAllModal] = useState(false);

  // Estado Real de 2FA
  const [show2faActivationModal, setShow2faActivationModal] = useState(false);
  const [isGenerating2fa, setIsGenerating2fa] = useState(false);
  const [isSubmitting2fa, setIsSubmitting2fa] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrCodeUrl, setTwoFactorQrCodeUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<1 | 2>(1);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRecoveryCodesModal, setShowRecoveryCodesModal] = useState(false);
  const [isLoadingRecoveryCodes, setIsLoadingRecoveryCodes] = useState(false);
  const [showDisable2faModal, setShowDisable2faModal] = useState(false);
  const [disable2faCode, setDisable2faCode] = useState('');
  const [isDisabling2fa, setIsDisabling2fa] = useState(false);

  // Estado Real de Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangedSuccess, setPasswordChangedSuccess] = useState(false);

  // Estado Real da Zona de Perigo
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Busca as sessões reais do usuário no backend
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

  // Trata retorno do fluxo de vinculação do Google OAuth
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

  // Ação de Salvar Perfil
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

  // Ação de Conectar ou Desvincular Google OAuth
  const handleGoogleProviderAction = async () => {
    if (!isGoogleLinked) {
      setIsLinkingGoogle(true);
      try {
        const { url } = await authService.getGoogleConnectUrl();
        window.location.href = url;
      } catch (error) {
        toast.error(
          extractApiErrorMessage(
            error,
            'Não foi possível iniciar a conexão com a conta Google.',
          ),
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
          'Não foi possível desvincular sua conta Google. Verifique se você possui uma senha local cadastrada.',
        ),
      );
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  // Ação de Revogar Sessão Individual
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

  // Ação de Desconectar Outros Dispositivos
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

  // Ação de Iniciar Configuração 2FA (Gera QR Code e Secret Reais no Backend)
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

  // Ação de Confirmar e Ativar 2FA no Backend
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

  // Ação de Consultar Códigos de Recuperação Reais
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

  // Ação de Desativar 2FA no Backend
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

  // Ação de Alterar Senha
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

  // Ação de Excluir Conta Permanentemente em Cascata
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
      <div className="flex flex-col w-full text-on-surface select-none pb-16">
        {/* ================= HEADER ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1 flex-wrap">
              <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
                Configurações e Segurança
              </h1>
              <Badge variant="status-live">
                Proteção Criptografada
              </Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Gerencie seus dados de acesso, credenciais Google OAuth, autenticação em duas etapas (2FA) e dispositivos conectados.
            </p>
          </div>
        </header>

        {/* ================= NAVEGAÇÃO INTERNA DE SEÇÕES ================= */}
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

        {/* ================= 1. SEÇÃO PERFIL & CONTA ================= */}
        {activeSection === 'profile' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-surface-container-high/60 pb-4">
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Dados do Usuário
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Suas informações primárias no AppFrame
                  </p>
                </div>
                {profileSaved && (
                  <span className="text-primary font-semibold text-label-md flex items-center gap-1 animate-in fade-in">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Alterações salvas!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 max-w-xl">
                <Input
                  label="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSavingProfile}
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  }
                />

                <div>
                  <Input
                    label="E-mail Profissional"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSavingProfile}
                    leftIcon={
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    }
                  />
                  <p className="text-[11px] text-neutral-500 dark:text-on-surface-variant flex items-center gap-1 mt-1 pl-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    O e-mail da conta só pode ser alterado uma vez a cada 6 meses.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={isSavingProfile}
                    disabled={isSavingProfile}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Card>

            {/* Provedores Conectados (Google OAuth) */}
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Provedor de Autenticação
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Contas federadas vinculadas para login em 1 clique
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-highest flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm shrink-0">
                    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-title-sm text-title-sm font-bold text-on-surface">
                        Google OAuth 2.0
                      </span>
                      {isGoogleLinked ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Conectado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-outline text-[10px]">
                          Não conectado
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-mono">
                      {isGoogleLinked
                        ? (user?.google_email || 'Conta vinculada ao Google')
                        : 'Nenhuma conta Google vinculada'}
                    </span>
                  </div>
                </div>

                <Button
                  variant={isGoogleLinked ? 'outline' : 'secondary'}
                  size="sm"
                  isLoading={isUnlinkingGoogle || isLinkingGoogle}
                  disabled={isUnlinkingGoogle || isLinkingGoogle}
                  onClick={handleGoogleProviderAction}
                >
                  {isGoogleLinked ? 'Desvincular' : 'Conectar Google'}
                </Button>

              </div>
            </Card>
          </div>
        )}

        {/* ================= 2. SEÇÃO SEGURANÇA & 2FA ================= */}
        {activeSection === 'security' && (
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
                        onClick={handleOpenRecoveryCodesModal}
                        leftIcon={
                          <span className="material-symbols-outlined text-[16px]">key</span>
                        }
                      >
                        Ver Códigos Reserva
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDisable2faCode('');
                          setShowDisable2faModal(true);
                        }}
                      >
                        Desativar 2FA
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      isLoading={isGenerating2fa}
                      disabled={isGenerating2fa}
                      onClick={handleStart2FA}
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

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-xl">
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
        )}

        {/* ================= 3. SEÇÃO DISPOSITIVOS CONECTADOS ================= */}
        {activeSection === 'sessions' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4">
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Sessões e Dispositivos Ativos
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Dispositivos conectados à sua conta via token JWT com rotação periódica
                  </p>
                </div>

                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevokeAllModal(true)}
                    leftIcon={
                      <span className="material-symbols-outlined text-[16px] text-error">logout</span>
                    }
                  >
                    Desconectar todos os outros dispositivos
                  </Button>
                )}
              </div>

              {/* Lista de Sessões Reais */}
              {isLoadingSessions ? (
                <div className="py-8 flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm gap-2">
                  <span className="material-symbols-outlined animate-spin text-primary text-[20px]">
                    progress_activity
                  </span>
                  <span>Carregando sessões ativas...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant font-body-sm text-body-sm">
                  Nenhuma sessão ativa encontrada.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={cn(
                        'p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors',
                        sess.isCurrent
                          ? 'bg-primary/5 border-primary/40 shadow-[0_0_12px_rgba(212,163,70,0.1)]'
                          : 'bg-surface-container-lowest border-surface-container-highest'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0 border border-outline/10">
                          <span className="material-symbols-outlined text-[24px]">
                            {sess.icon}
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-title-sm text-title-sm font-bold text-on-surface">
                              {sess.deviceName}
                            </span>
                            {sess.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider">
                                Sessão Atual
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-body-sm text-body-sm text-on-surface-variant font-mono tabular-nums flex-wrap">
                            <span>{sess.browser}</span>
                            <span className="text-outline">•</span>
                            <span>IP: {sess.ipAddress}</span>
                            <span className="text-outline">•</span>
                            <span className="text-outline">{sess.lastActiveAt}</span>
                          </div>
                        </div>
                      </div>

                      {!sess.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={revokingSessionId === sess.id}
                          disabled={revokingSessionId === sess.id}
                          onClick={() => handleRevokeSession(sess.id)}
                          className="text-error hover:text-error hover:bg-error-container/20 self-end sm:self-auto"
                          leftIcon={
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          }
                        >
                          Revogar Sessão
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================= 4. SEÇÃO ZONA DE PERIGO ================= */}
        {activeSection === 'danger' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            <Card className="p-6 bg-error-container/10 border-2 border-error/40 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-error">
                <span className="material-symbols-outlined text-[28px]">warning</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Exclusão Permanente de Conta
                </h3>
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                Ao excluir sua conta, todas as suas sessões ativas serão invalidadas, todos os registros de jobs no banco de dados serão eliminados em cascata e os arquivos gerados no storage (vídeos finais e marcas d'água) serão apagados permanentemente. <strong>Esta ação é irreversível.</strong>
              </p>

              <div className="pt-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteConfirmationText('');
                    setDeletePassword('');
                    setDeleteAccountModal(true);
                  }}
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                  }
                >
                  Excluir Minha Conta Permanentemente
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ================= MODAL ATIVAÇÃO 2FA ================= */}
        {show2faActivationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[24px]">shield_locked</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Ativação do Segundo Fator (2FA)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShow2faActivationModal(false)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {twoFactorStep === 1 ? (
                <form onSubmit={handleConfirm2FA} className="flex flex-col gap-4">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    1. Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, 1Password):
                  </p>

                  {/* QR Code Real Gerado pelo Backend */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl mx-auto shadow-md">
                    {twoFactorQrCodeUrl ? (
                      <img
                        src={twoFactorQrCodeUrl}
                        alt="QR Code para autenticação em dois fatores"
                        className="w-40 h-40 object-contain"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-neutral-500 text-xs">
                        QR Code indisponível
                      </div>
                    )}
                  </div>

                  {/* Chave Alfanumérica Manual Real */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-label-sm text-outline">
                      Ou insira a chave secreta manualmente:
                    </span>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-label-md text-primary font-bold">
                      <span className="break-all">{twoFactorSecret}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!twoFactorSecret) return;
                          navigator.clipboard.writeText(twoFactorSecret);
                          setCopiedKey(true);
                          toast.info('Copiado para a área de transferência!');
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
                        title="Copiar chave secreta"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedKey ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Confirmação com 6 Dígitos */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-label-sm text-on-surface font-semibold">
                      2. Digite o código de 6 dígitos gerado no app:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      required
                      disabled={isSubmitting2fa}
                      className="w-full text-center tracking-[0.5em] font-mono text-[24px] font-bold p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-primary outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={isSubmitting2fa}
                      onClick={() => setShow2faActivationModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={isSubmitting2fa}
                      disabled={twoFactorCode.length !== 6 || isSubmitting2fa}
                    >
                      Confirmar e Ativar
                    </Button>
                  </div>
                </form>
              ) : (
                /* Passo 2: Códigos de Recuperação Reais */
                <div className="flex flex-col gap-4 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-body-sm font-body-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>2FA ativado com sucesso! Guarde seus códigos de recuperação.</span>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Se você perder o acesso ao seu dispositivo autenticador, poderá usar estes códigos de recuperação de uso único:
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
                    {recoveryCodes.map((code, idx) => (
                      <span key={idx} className="p-1 rounded bg-surface-container">
                        {code}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryCodes.join('\n'));
                        toast.info('Copiado para a área de transferência!');
                      }}
                      className="flex-1"
                      leftIcon={
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      }
                    >
                      Copiar Códigos
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setShow2faActivationModal(false);
                        setTwoFactorCode('');
                      }}
                      className="flex-1"
                    >
                      Concluir e Salvar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Modal de Códigos de Recuperação Existentes */}
        {showRecoveryCodesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[24px]">key</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Códigos de Recuperação (2FA)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryCodesModal(false)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Estes códigos são de uso único. Mantenha-os guardados em local seguro:
              </p>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
                {recoveryCodes.map((code, idx) => (
                  <span key={idx} className="p-1 rounded bg-surface-container">
                    {code}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryCodes.join('\n'));
                    toast.info('Copiado para a área de transferência!');
                  }}
                  leftIcon={
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  }
                >
                  Copiar Códigos
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowRecoveryCodesModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Desativação 2FA */}
        {showDisable2faModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-error">
                  <span className="material-symbols-outlined text-[24px]">gpp_bad</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Desativar Segundo Fator (2FA)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDisable2faModal(false)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleDisable2FA} className="flex flex-col gap-4">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Informe o código atual de 6 dígitos gerado pelo seu aplicativo autenticador para confirmar a desativação do 2FA:
                </p>

                <input
                  type="text"
                  maxLength={6}
                  value={disable2faCode}
                  onChange={(e) => setDisable2faCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  disabled={isDisabling2fa}
                  className="w-full text-center tracking-[0.5em] font-mono text-[24px] font-bold p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-primary outline-none focus:border-primary"
                />

                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={isDisabling2fa}
                    onClick={() => setShowDisable2faModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    type="submit"
                    isLoading={isDisabling2fa}
                    disabled={disable2faCode.length !== 6 || isDisabling2fa}
                  >
                    Confirmar Desativação
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal Desconectar Outros Dispositivos */}
        {revokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-sm p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">logout</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Desconectar Outras Sessões?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Todos os outros dispositivos conectados perderão o acesso imediatamente, exceto este navegador.
              </p>
              <div className="flex items-center gap-2 w-full mt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={isRevokingOthers}
                  onClick={() => setRevokeAllModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  isLoading={isRevokingOthers}
                  disabled={isRevokingOthers}
                  onClick={handleRevokeOtherSessions}
                >
                  Desconectar Todos
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Exclusão Permanente de Conta */}
        {deleteAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-error/50 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-error">
                <div className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                </div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Confirmar Exclusão de Conta
                </h3>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Para confirmar a exclusão irreversível de todos os seus dados, informe sua senha (caso possua) e digite <strong className="text-error font-mono">EXCLUIR</strong> abaixo:
              </p>

              <Input
                label="Sua Senha de Acesso (se aplicável)"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isDeletingAccount}
                leftIcon={
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                }
              />

              <Input
                label="Digite EXCLUIR para confirmar"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="EXCLUIR"
                disabled={isDeletingAccount}
                required
              />

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  disabled={isDeletingAccount}
                  onClick={() => {
                    setDeleteAccountModal(false);
                    setDeleteConfirmationText('');
                    setDeletePassword('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isLoading={isDeletingAccount}
                  disabled={
                    deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR' ||
                    isDeletingAccount
                  }
                  onClick={handleDeleteAccountPermanent}
                >
                  Confirmar Exclusão Permanente
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Confirmação de Alteração de E-mail (Regra de 6 meses) */}
        {showEmailChangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-primary/40 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-primary">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">mark_email_unread</span>
                </div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Alteração de E-mail
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-body-sm flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">schedule</span>
                  <span>
                    <strong>Regra de 6 Meses:</strong> Por segurança, você só pode alterar o e-mail da sua conta <strong>uma vez a cada 6 meses</strong>.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-2 text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">E-mail atual:</span>
                    <span className="font-mono text-on-surface">{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-semibold">Novo e-mail:</span>
                    <span className="font-mono font-bold text-primary">{email.trim()}</span>
                  </div>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Após confirmar esta mudança, sua próxima alteração de e-mail só estará liberada em <strong>{calculateNextEmailChangeDate(new Date())}</strong>. Deseja realmente prosseguir?
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  disabled={isSavingProfile}
                  onClick={() => setShowEmailChangeModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isLoading={isSavingProfile}
                  disabled={isSavingProfile}
                  onClick={executeSaveProfile}
                >
                  Confirmar Alteração
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Informativo de Bloqueio (Caso não tenham se passado 6 meses) */}
        {emailChangeBlockedModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-amber-500/40 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-amber-500">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">lock_clock</span>
                </div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Alteração Indisponível
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Por diretriz de segurança, o e-mail da conta só pode ser alterado <strong>uma vez a cada 6 meses</strong>.
                </p>

                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-2 text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Última alteração:</span>
                    <span className="font-mono text-on-surface">{emailChangeBlockedModal.lastChanged}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-semibold">Próxima liberação:</span>
                    <span className="font-mono font-bold text-amber-500">{emailChangeBlockedModal.nextAllowed}</span>
                  </div>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Aguarde o prazo regulamentar para efetuar uma nova troca do seu e-mail de acesso.
                </p>
              </div>

              <div className="flex items-center justify-end mt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEmailChangeBlockedModal({ isOpen: false, lastChanged: '', nextAllowed: '' });
                    if (user?.email) setEmail(user.email);
                  }}
                >
                  Entendido
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
};
