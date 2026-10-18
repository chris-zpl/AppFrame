import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { authService } from '../services';
import type { UserSessionItem } from '../types';
import { mapActiveSessionToItem, extractApiErrorMessage } from '../utils';
import { calculatePasswordStrength } from '../../auth/utils';

interface UseSettingsProps {
  refreshProfile: () => Promise<any>;
  logout: () => Promise<void>;
  navigate: (path: string) => void;
}

export const useSettings = ({
  refreshProfile,
  logout,
  navigate,
}: UseSettingsProps) => {
  // Estado de Sessões
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  // Estado do Perfil
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

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
      toast.error(
        extractApiErrorMessage(error, 'Não foi possível carregar os dispositivos conectados.')
      );
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    authService.getSessions()
      .then((data) => {
        if (isCancelled) return;
        const sessionList = Array.isArray(data) ? data : [];
        setSessions(sessionList.map(mapActiveSessionToItem));
      })
      .catch((error) => {
        if (isCancelled) return;
        toast.error(
          extractApiErrorMessage(error, 'Não foi possível carregar os dispositivos conectados.')
        );
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoadingSessions(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

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

  const executeSaveProfile = async (name: string, email: string) => {
    setIsSavingProfile(true);
    setProfileSaved(false);
    try {
      await authService.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });
      await refreshProfile();
      setProfileSaved(true);
      toast.success('Dados do perfil atualizados com sucesso!');
      setTimeout(() => setProfileSaved(false), 3000);
      return true;
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Erro ao atualizar os dados do perfil.'));
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGoogleProviderAction = async (isGoogleLinked: boolean) => {
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
      toast.success('Todos os outros dispositivos foram desconectados.');
      return true;
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Erro ao desconectar os outros dispositivos.'));
      return false;
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
    const passwordStrength = calculatePasswordStrength(newPassword);
    if (!passwordStrength.isStrong) {
      toast.error(
        'Por favor, crie uma senha mais forte com no mínimo 8 caracteres, números e símbolos.'
      );
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
      toast.error(
        extractApiErrorMessage(error, 'Erro ao excluir a conta. Verifique sua senha e tente novamente.')
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return {
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
    setTwoFactorStep,
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
  };
};
