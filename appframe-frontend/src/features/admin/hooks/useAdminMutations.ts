import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminService, legalService } from '../services';
import type { AdminUser, SmtpConfig, SaveLegalSettingsDto } from '../types';
import { isSuperAdminUser } from '../../auth';

interface UseAdminMutationsProps {
  currentUser: { id?: string; email?: string | null } | null;
}

export const useAdminMutations = ({ currentUser }: UseAdminMutationsProps) => {
  const queryClient = useQueryClient();

  const [isRevokingSession, setIsRevokingSession] = useState(false);
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [isDeletingCookies, setIsDeletingCookies] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isDeletingGemini, setIsDeletingGemini] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isSavingLegal, setIsSavingLegal] = useState(false);
  const [isResettingLegal, setIsResettingLegal] = useState(false);

  // ================= GESTÃO DE USUÁRIOS =================
  const handleRoleChange = async (
    targetUser: AdminUser,
    newRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
  ) => {
    if (isSuperAdminUser(targetUser)) {
      toast.error('O Super-Administrador da plataforma não pode ter seu papel alterado.');
      return;
    }
    if (targetUser.id === currentUser?.id || targetUser.email === currentUser?.email) {
      toast.error('Você não pode alterar seu próprio papel de acesso.');
      return;
    }
    try {
      await adminService.updateUserRole(targetUser.id, newRole);
      queryClient.setQueryData<AdminUser[]>(['admin-users'], (prev) =>
        prev
          ? prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
          : []
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      await queryClient.refetchQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(
        `Papel do usuário ${targetUser.name} alterado para ${newRole === 'ADMIN' ? 'Administrador' : 'Usuário Comum'}.`
      );
    } catch (err: any) {
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      const msg = err?.response?.data?.message || 'Falha ao alterar papel do usuário.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleStatusToggle = async (targetUser: AdminUser) => {
    if (isSuperAdminUser(targetUser)) {
      toast.error('O Super-Administrador fundador não pode ser desativado.');
      return;
    }
    if (targetUser.id === currentUser?.id || targetUser.email === currentUser?.email) {
      toast.error('Você não pode alterar o status da sua própria conta de administrador.');
      return;
    }
    const nextStatus = !targetUser.is_active;
    try {
      await adminService.updateUserStatus(targetUser.id, nextStatus);
      queryClient.setQueryData<AdminUser[]>(['admin-users'], (prev) =>
        prev
          ? prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextStatus } : u))
          : []
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(`Usuário ${targetUser.name} foi ${nextStatus ? 'ativado' : 'bloqueado'}.`);
    } catch (err: any) {
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      const msg = err?.response?.data?.message || 'Falha ao alterar status do usuário.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  // ================= SESSÕES =================
  const handleRevokeSession = async (sessionId: string) => {
    setIsRevokingSession(true);
    try {
      await adminService.revokeSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success('Sessão encerrada com sucesso. O dispositivo foi desconectado.');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao desconectar sessão.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsRevokingSession(false);
    }
  };

  // ================= YOUTUBE =================
  const handleSaveYoutubeCookies = async (cookies: string) => {
    if (!cookies.trim()) {
      toast.error('Cole o conteúdo do arquivo cookies.txt do YouTube.');
      return false;
    }
    setIsSavingCookies(true);
    try {
      const res = await adminService.saveYoutubeCookies(cookies);
      await queryClient.invalidateQueries({ queryKey: ['admin-youtube-cookies'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Cookies do YouTube salvos com sucesso!');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar cookies.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleDeleteYoutubeCookies = async () => {
    setIsDeletingCookies(true);
    try {
      const res = await adminService.deleteYoutubeCookies();
      await queryClient.invalidateQueries({ queryKey: ['admin-youtube-cookies'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Cookies removidos com sucesso.');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao remover cookies.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsDeletingCookies(false);
    }
  };

  // ================= GEMINI =================
  const handleSaveGeminiKey = async (apiKey: string) => {
    const clean = apiKey.trim();
    if (!clean) {
      toast.error('Informe a chave de API do Google AI Studio (Gemini).');
      return false;
    }
    setIsSavingGemini(true);
    try {
      const res = await adminService.saveGeminiApiKey(clean);
      await queryClient.invalidateQueries({ queryKey: ['admin-gemini-status'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Chave do Gemini salva com sucesso!');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao validar ou salvar chave do Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleTestGemini = async (apiKey?: string) => {
    setIsTestingGemini(true);
    try {
      const res = await adminService.testGemini(apiKey?.trim() || undefined);
      toast.success(res.message || 'Conexão com Google Gemini realizada com sucesso!');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha no teste de conexão com o Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleDeleteGemini = async () => {
    setIsDeletingGemini(true);
    try {
      const res = await adminService.deleteGeminiApiKey();
      await queryClient.invalidateQueries({ queryKey: ['admin-gemini-status'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Chave global do Gemini removida.');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao remover chave.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsDeletingGemini(false);
    }
  };

  // ================= SMTP =================
  const handleSaveSmtp = async (form: SmtpConfig) => {
    if (!form.host || !form.fromEmail) {
      toast.error('Preencha o Host e o E-mail de remetente.');
      return false;
    }
    setIsSavingSmtp(true);
    try {
      const res = await adminService.saveSmtpConfig(form);
      await queryClient.invalidateQueries({ queryKey: ['admin-smtp-config'] });
      toast.success(res.message || 'Configurações de SMTP salvas com sucesso!');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar configurações SMTP.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async (emailToTest: string) => {
    const target = emailToTest.trim() || currentUser?.email;
    if (!target) {
      toast.error('Informe um e-mail de destino para o teste.');
      return false;
    }
    setIsTestingSmtp(true);
    try {
      const res = await adminService.testSmtp(target);
      toast.success(res.message || `E-mail de teste enviado para ${target}!`);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao enviar e-mail de teste.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // ================= DOCUMENTOS LEGAIS =================
  const handleSaveLegal = async (form: SaveLegalSettingsDto) => {
    setIsSavingLegal(true);
    try {
      const res = await legalService.saveAdminLegalSettings(form);
      await queryClient.invalidateQueries({ queryKey: ['admin-legal-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['public-legal-documents'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Termos de Serviço e Política de Privacidade atualizados com sucesso!');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar documentos legais.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsSavingLegal(false);
    }
  };

  const handleResetLegal = async () => {
    setIsResettingLegal(true);
    try {
      const res = await legalService.resetAdminLegalSettings();
      await queryClient.invalidateQueries({ queryKey: ['admin-legal-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['public-legal-documents'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Termos e Política de Privacidade restaurados para a minuta oficial padrão!');
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao restaurar documentos legais.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      return false;
    } finally {
      setIsResettingLegal(false);
    }
  };

  return {
    handleRoleChange,
    handleStatusToggle,
    handleRevokeSession,
    isRevokingSession,
    handleSaveYoutubeCookies,
    handleDeleteYoutubeCookies,
    isSavingCookies,
    isDeletingCookies,
    handleSaveGeminiKey,
    handleTestGemini,
    handleDeleteGemini,
    isSavingGemini,
    isTestingGemini,
    isDeletingGemini,
    handleSaveSmtp,
    handleTestSmtp,
    isSavingSmtp,
    isTestingSmtp,
    handleSaveLegal,
    handleResetLegal,
    isSavingLegal,
    isResettingLegal,
  };
};
