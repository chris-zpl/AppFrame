import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  adminService,
  type AdminUser,
  type AdminSession,
  type SmtpConfig,
  type AdminAuditLog,
} from '../services/admin.service';
import {
  legalService,
  type SaveLegalSettingsDto,
} from '../services/legal.service';
import { marked } from 'marked';
import { AppShell } from '../components/layout/AppShell';
import { Button, Badge, Card, ConfirmModal } from '../components/ui';
import { cn } from '../lib/utils';

type AdminTab = 'users' | 'youtube' | 'gemini' | 'smtp' | 'audit' | 'legal';

const getAuditEventBadge = (action: string) => {
  switch (action) {
    case 'LEGAL_DOCUMENTS_UPDATED':
      return {
        label: 'Termos & Privacidade Atualizados',
        icon: 'gavel',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'PASSWORD_RESET_REQUESTED':
      return {
        label: 'Redefinição Solicitada',
        icon: 'lock_reset',
        className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      };
    case 'PASSWORD_RESET_COMPLETED':
      return {
        label: 'Senha Redefinida (Link)',
        icon: 'key',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'PASSWORD_CHANGED':
      return {
        label: 'Senha Alterada',
        icon: 'password',
        className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      };
    case 'PROFILE_EMAIL_CHANGED':
      return {
        label: 'E-mail Alterado',
        icon: 'mail',
        className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      };
    case 'PROFILE_NAME_CHANGED':
      return {
        label: 'Nome Alterado',
        icon: 'badge',
        className: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      };
    case 'GOOGLE_ACCOUNT_LINKED':
      return {
        label: 'Google Vinculado',
        icon: 'link',
        className: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      };
    case 'GOOGLE_ACCOUNT_UNLINKED':
      return {
        label: 'Google Desvinculado',
        icon: 'link_off',
        className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
      };
    case 'TWO_FACTOR_ENABLED':
      return {
        label: '2FA Ativado',
        icon: 'verified_user',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'TWO_FACTOR_DISABLED':
      return {
        label: '2FA Desativado',
        icon: 'gpp_bad',
        className: 'bg-red-500/15 text-red-400 border border-red-500/30',
      };
    case 'SESSION_REVOKED':
      return {
        label: 'Sessão Encerrada',
        icon: 'logout',
        className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      };
    case 'ALL_SESSIONS_REVOKED':
      return {
        label: 'Todas Sessões Encerradas',
        icon: 'power_settings_new',
        className: 'bg-red-500/20 text-red-300 border border-red-500/40',
      };
    default:
      return {
        label: action,
        icon: 'info',
        className: 'bg-surface-container-highest text-on-surface-variant border border-surface-container-highest',
      };
  }
};

const parseDevice = (ua: string | null) => {
  if (!ua) return 'Dispositivo Desconhecido';
  if (ua.includes('iPhone')) return 'iPhone (iOS)';
  if (ua.includes('iPad')) return 'iPad (iOS)';
  if (ua.includes('Android')) return 'Android Mobile';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac / macOS';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Linux')) return 'Linux PC';
  return 'Web / Outro';
};

const renderMetadata = (meta: Record<string, any> | null) => {
  if (!meta || Object.keys(meta).length === 0) {
    return <span className="text-outline text-xs italic">Sem detalhes adicionais</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 max-w-md">
      {meta.oldEmail && meta.newEmail && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 font-mono border border-purple-500/20">
          {meta.oldEmail} ➔ {meta.newEmail}
        </span>
      )}
      {meta.oldName && meta.newName && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {meta.oldName} ➔ {meta.newName}
        </span>
      )}
      {meta.googleEmail && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">
          Google: {meta.googleEmail}
        </span>
      )}
      {meta.email && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
          E-mail: {meta.email}
        </span>
      )}
      {meta.userFound === false && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-red-500/15 text-red-400 border border-red-500/20 font-semibold">
          E-mail não cadastrado
        </span>
      )}
      {meta.reason && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-surface-container-high text-on-surface-variant">
          Motivo: {meta.reason}
        </span>
      )}
      {Object.entries(meta)
        .filter(
          ([k]) =>
            ![
              'oldEmail',
              'newEmail',
              'oldName',
              'newName',
              'googleEmail',
              'email',
              'userFound',
              'reason',
              'googleId',
            ].includes(k)
        )
        .map(([k, v]) => (
          <span
            key={k}
            className="px-2 py-0.5 rounded text-[11px] bg-surface-container-high text-outline font-mono"
          >
            {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        ))}
    </div>
  );
};

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email === 'christian.zimpel@gmail.com';
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Redireciona usuário comum sem privilégios
  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('Acesso restrito aos administradores.');
      navigate('/varredura', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  // Se o usuário for ADMIN (não super-admin), permite 'users' e 'audit'
  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'users' && activeTab !== 'audit') {
      setActiveTab('users');
    }
  }, [isSuperAdmin, activeTab]);

  // ================= QUERIES =================
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.listUsers,
    enabled: isAdmin,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: adminService.listActiveSessions,
    enabled: isAdmin,
    refetchInterval: 15000, // Atualiza sessões ativas periodicamente
  });

  const { data: ytStatus } = useQuery({
    queryKey: ['admin-youtube-cookies'],
    queryFn: adminService.getYoutubeCookiesStatus,
    enabled: isSuperAdmin,
  });

  const { data: geminiStatus } = useQuery({
    queryKey: ['admin-gemini-status'],
    queryFn: adminService.getGeminiStatus,
    enabled: isSuperAdmin,
  });

  const { data: smtpConfig } = useQuery({
    queryKey: ['admin-smtp-config'],
    queryFn: adminService.getSmtpConfig,
    enabled: isSuperAdmin,
  });

  const {
    data: auditLogs = [],
    isLoading: isLoadingAudit,
    refetch: refetchAudit,
    isRefetching: isRefetchingAudit,
  } = useQuery<AdminAuditLog[]>({
    queryKey: ['admin-audit-logs'],
    queryFn: () => adminService.getAuditLogs(),
    enabled: isAdmin,
    refetchInterval: activeTab === 'audit' ? 10000 : false,
  });

  const { data: legalSettings } = useQuery({
    queryKey: ['admin-legal-settings'],
    queryFn: legalService.getAdminLegalSettings,
    enabled: isSuperAdmin,
  });

  // ================= ESTADOS DO TAB LEGAL (TERMOS E PRIVACIDADE) =================
  const [legalForm, setLegalForm] = useState<SaveLegalSettingsDto>({
    companyName: '',
    contactEmail: '',
    dpoEmail: '',
    websiteUrl: '',
    forumCity: '',
    retentionPeriod: '',
    termsOfService: '',
    privacyPolicy: '',
  });
  const [activeLegalDoc, setActiveLegalDoc] = useState<'terms' | 'privacy'>('terms');
  const [activeTermsMode, setActiveTermsMode] = useState<'edit' | 'preview'>('edit');
  const [activePrivacyMode, setActivePrivacyMode] = useState<'edit' | 'preview'>('edit');
  const [isSavingLegal, setIsSavingLegal] = useState(false);
  const [isResettingLegal, setIsResettingLegal] = useState(false);
  const [showResetLegalModal, setShowResetLegalModal] = useState(false);

  useEffect(() => {
    if (legalSettings) {
      setLegalForm({
        companyName: legalSettings.variables?.companyName || '',
        contactEmail: legalSettings.variables?.contactEmail || '',
        dpoEmail: legalSettings.variables?.dpoEmail || '',
        websiteUrl: legalSettings.variables?.websiteUrl || '',
        forumCity: legalSettings.variables?.forumCity || '',
        retentionPeriod: legalSettings.variables?.retentionPeriod || '',
        termsOfService: legalSettings.terms?.raw || '',
        privacyPolicy: legalSettings.privacy?.raw || '',
      });
    }
  }, [legalSettings]);

  // ================= ESTADOS DO TAB AUDITORIA =================
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // ================= ESTADOS DO TAB YOUTUBE =================
  const [cookiesInput, setCookiesInput] = useState('');
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [isDeletingCookies, setIsDeletingCookies] = useState(false);

  // ================= ESTADOS DO TAB GEMINI =================
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isDeletingGemini, setIsDeletingGemini] = useState(false);

  // ================= ESTADOS DO TAB SMTP =================
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    host: '',
    port: 587,
    user: '',
    password: '',
    fromName: 'AppFrame',
    fromEmail: '',
    secure: false,
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  // Preenche formulário SMTP quando dados forem carregados
  useEffect(() => {
    if (smtpConfig) {
      setSmtpForm({
        host: smtpConfig.host || '',
        port: smtpConfig.port || 587,
        user: smtpConfig.user || '',
        password: smtpConfig.password || '',
        fromName: smtpConfig.fromName || 'AppFrame',
        fromEmail: smtpConfig.fromEmail || '',
        secure: Boolean(smtpConfig.secure),
      });
    }
  }, [smtpConfig]);

  // ================= ESTADOS DE MODAIS =================
  const [sessionToRevoke, setSessionToRevoke] = useState<AdminSession | null>(null);
  const [isRevokingSession, setIsRevokingSession] = useState(false);

  // ================= AÇÕES: GESTÃO DE USUÁRIOS =================
  const handleRoleChange = async (targetUser: AdminUser, newRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER') => {
    if (targetUser.email === 'christian.zimpel@gmail.com') {
      toast.error('O Super-Administrador fundador não pode ter seu papel alterado.');
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
      toast.success(`Papel do usuário ${targetUser.name} alterado para ${newRole}.`);
    } catch (err: any) {
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      const msg = err?.response?.data?.message || 'Falha ao alterar papel do usuário.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleStatusToggle = async (targetUser: AdminUser) => {
    if (targetUser.email === 'christian.zimpel@gmail.com') {
      toast.error('O Super-Administrador fundador não pode ser desativado.');
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
      toast.success(`Usuário ${targetUser.name} foi ${nextStatus ? 'ativado' : 'bloqueado'}.`);
    } catch (err: any) {
      await queryClient.refetchQueries({ queryKey: ['admin-users'] });
      const msg = err?.response?.data?.message || 'Falha ao alterar status do usuário.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  // ================= AÇÕES: SESSÕES =================
  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setIsRevokingSession(true);
    try {
      await adminService.revokeSession(sessionToRevoke.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Sessão encerrada com sucesso. O dispositivo foi desconectado.');
      setSessionToRevoke(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao desconectar sessão.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsRevokingSession(false);
    }
  };

  // ================= AÇÕES: YOUTUBE =================
  const handleSaveCookies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cookiesInput.trim()) {
      toast.error('Cole o conteúdo do arquivo cookies.txt do YouTube.');
      return;
    }
    setIsSavingCookies(true);
    try {
      const res = await adminService.saveYoutubeCookies(cookiesInput);
      await queryClient.invalidateQueries({ queryKey: ['admin-youtube-cookies'] });
      setCookiesInput('');
      toast.success(res.message || 'Cookies do YouTube salvos com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar cookies.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCookiesInput(content);
    };
    reader.readAsText(file);
  };

  const handleDeleteCookies = async () => {
    setIsDeletingCookies(true);
    try {
      const res = await adminService.deleteYoutubeCookies();
      await queryClient.invalidateQueries({ queryKey: ['admin-youtube-cookies'] });
      toast.success(res.message || 'Cookies removidos com sucesso.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao remover cookies.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsDeletingCookies(false);
    }
  };

  // ================= AÇÕES: GEMINI =================
  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = geminiKeyInput.trim();
    if (!clean) {
      toast.error('Informe a chave de API do Google AI Studio (Gemini).');
      return;
    }
    setIsSavingGemini(true);
    try {
      const res = await adminService.saveGeminiApiKey(clean);
      await queryClient.invalidateQueries({ queryKey: ['admin-gemini-status'] });
      setGeminiKeyInput('');
      toast.success(res.message || 'Chave do Gemini salva com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao validar ou salvar chave do Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    try {
      const res = await adminService.testGemini(geminiKeyInput.trim() || undefined);
      toast.success(res.message || 'Conexão com Google Gemini realizada com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha no teste de conexão com o Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleDeleteGemini = async () => {
    setIsDeletingGemini(true);
    try {
      const res = await adminService.deleteGeminiApiKey();
      await queryClient.invalidateQueries({ queryKey: ['admin-gemini-status'] });
      toast.success(res.message || 'Chave global do Gemini removida.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao remover chave.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsDeletingGemini(false);
    }
  };

  // ================= AÇÕES: SMTP =================
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpForm.host || !smtpForm.fromEmail) {
      toast.error('Preencha o Host e o E-mail de remetente.');
      return;
    }
    setIsSavingSmtp(true);
    try {
      const res = await adminService.saveSmtpConfig(smtpForm);
      await queryClient.invalidateQueries({ queryKey: ['admin-smtp-config'] });
      toast.success(res.message || 'Configurações de SMTP salvas com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar configurações SMTP.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    const emailToTest = testEmailInput.trim() || user?.email;
    if (!emailToTest) {
      toast.error('Informe um e-mail de destino para o teste.');
      return;
    }
    setIsTestingSmtp(true);
    try {
      const res = await adminService.testSmtp(emailToTest);
      toast.success(res.message || `E-mail de teste enviado para ${emailToTest}!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao enviar e-mail de teste.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // ================= AÇÕES: DOCUMENTOS LEGAIS =================
  const handleSaveLegal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLegal(true);
    try {
      const res = await legalService.saveAdminLegalSettings(legalForm);
      await queryClient.invalidateQueries({ queryKey: ['admin-legal-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['public-legal-documents'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success(res.message || 'Termos de Serviço e Política de Privacidade atualizados com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar documentos legais.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSavingLegal(false);
    }
  };

  const handleResetLegal = () => {
    setShowResetLegalModal(true);
  };

  const handleConfirmResetLegal = async () => {
    setIsResettingLegal(true);
    try {
      const res = await legalService.resetAdminLegalSettings();
      await queryClient.invalidateQueries({ queryKey: ['admin-legal-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['public-legal-documents'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setShowResetLegalModal(false);
      toast.success(res.message || 'Termos e Política de Privacidade restaurados para a minuta oficial padrão!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao restaurar documentos legais.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsResettingLegal(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  // Estatísticas Rápidas
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.is_active).length;
  const totalActiveSessionsCount = sessions.length;
  const totalRendersCount = users.reduce((acc, u) => acc + (u.total_renders || 0), 0);

  // Estatísticas e Filtros de Auditoria
  const auditPasswordCount = auditLogs.filter((l) => l.action.includes('PASSWORD')).length;
  const auditProfileCount = auditLogs.filter(
    (l) => l.action.includes('PROFILE') || l.action.includes('GOOGLE')
  ).length;
  const auditSecurityCount = auditLogs.filter(
    (l) => l.action.includes('SESSION') || l.action.includes('TWO_FACTOR')
  ).length;

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) {
      return false;
    }
    if (!auditSearch.trim()) return true;
    const term = auditSearch.toLowerCase();
    const targetUser = users.find((u) => u.id === log.user_id);
    const userName = targetUser?.name?.toLowerCase() || '';
    const userEmail = targetUser?.email?.toLowerCase() || '';
    const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
    const ip = (log.ip_address || '').toLowerCase();
    const action = log.action.toLowerCase();
    const ua = (log.user_agent || '').toLowerCase();

    return (
      action.includes(term) ||
      userName.includes(term) ||
      userEmail.includes(term) ||
      ip.includes(term) ||
      metaStr.includes(term) ||
      ua.includes(term)
    );
  });

  return (
    <AppShell
      currentPath="admin"
      onNavigate={(path) => navigate(path === 'configuracoes' ? '/settings' : `/${path}`)}
    >
      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
        {/* ================= HEADER DO PAINEL ADMIN ================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container-highest">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[28px] text-primary">
                admin_panel_settings
              </span>
              <h1 className="text-headline-sm font-bold text-on-surface">
                Painel Administrativo
              </h1>
              <Badge variant={isSuperAdmin ? 'primary' : 'neutral'} className="font-bold">
                {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRADOR'}
              </Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {isSuperAdmin
                ? 'Controle total da plataforma: usuários, sessões, credenciais globais e servidores.'
                : 'Gestão de usuários da plataforma e controle de sessões ativas.'}
            </p>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-surface-container-highest overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'users'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              )}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span>Usuários & Sessões</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                {totalUsersCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                activeTab === 'audit'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              )}
            >
              <span className="material-symbols-outlined text-[18px]">policy</span>
              <span>Auditoria de Segurança</span>
              {auditLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
                  {auditLogs.length}
                </span>
              )}
            </button>

            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('youtube')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                    activeTab === 'youtube'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">smart_display</span>
                  <span>YouTube (Sessão Global)</span>
                  {ytStatus?.hasCookies && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('gemini')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                    activeTab === 'gemini'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  <span>Google Gemini AI</span>
                  {geminiStatus?.configured && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('smtp')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                    activeTab === 'smtp'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  <span>Servidor SMTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('legal')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
                    activeTab === 'legal'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                  <span>Termos & Privacidade</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ================= ABA 1: USUÁRIOS E SESSÕES ================= */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-6">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Total de Usuários
                </span>
                <span className="text-[28px] font-extrabold text-on-surface">
                  {totalUsersCount}
                </span>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Usuários Ativos
                </span>
                <span className="text-[28px] font-extrabold text-emerald-400">
                  {activeUsersCount}
                </span>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Sessões Online Agora
                </span>
                <span className="text-[28px] font-extrabold text-primary">
                  {totalActiveSessionsCount}
                </span>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Total de Renders
                </span>
                <span className="text-[28px] font-extrabold text-on-surface">
                  {totalRendersCount}
                </span>
              </Card>
            </div>

            {/* Tabela de Usuários */}
            <Card className="p-5 flex flex-col gap-4 border-surface-container-highest bg-surface-container-lowest">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    manage_accounts
                  </span>
                  <h2 className="text-title-md font-bold text-on-surface">
                    Usuários Cadastrados
                  </h2>
                </div>
                <span className="text-body-xs text-on-surface-variant">
                  {users.length} usuários registrados
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-surface-container-highest">
                <table className="w-full text-left border-collapse text-body-sm">
                  <thead>
                    <tr className="bg-surface-container border-b border-surface-container-highest text-outline text-[11px] uppercase tracking-wider">
                      <th className="p-3">Usuário</th>
                      <th className="p-3">E-mail</th>
                      <th className="p-3">Perfil / Papel</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Sessões Ativas</th>
                      <th className="p-3">Renders</th>
                      <th className="p-3">Cadastro</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest">
                    {users.map((u) => {
                      const isTargetSuper = u.email === 'christian.zimpel@gmail.com';
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-surface-container-low/50 transition-colors"
                        >
                          <td className="p-3 font-semibold text-on-surface">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{u.name}</span>
                            </div>
                          </td>

                          <td className="p-3 text-on-surface-variant font-mono text-xs">
                            {u.email}
                          </td>

                          <td className="p-3">
                            {isTargetSuper ? (
                              <Badge variant="primary" className="font-extrabold text-[10px]">
                                SUPER ADMIN
                              </Badge>
                            ) : isSuperAdmin ? (
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    u,
                                    e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'USER'
                                  )
                                }
                                className="bg-surface-container border border-surface-container-highest rounded-lg px-2 py-1 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                              >
                                <option value="USER">Usuário Comum</option>
                                <option value="ADMIN">Administrador</option>
                              </select>
                            ) : (
                              <Badge
                                variant={u.role === 'ADMIN' ? 'primary' : 'neutral'}
                                className="text-[10px]"
                              >
                                {u.role === 'ADMIN' ? 'ADMIN' : 'USUÁRIO'}
                              </Badge>
                            )}
                          </td>

                          <td className="p-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                u.is_active
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-error/15 text-error'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  u.is_active ? 'bg-emerald-400' : 'bg-error'
                                )}
                              />
                              {u.is_active ? 'Ativo' : 'Bloqueado'}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-xs">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md font-bold',
                                u.active_sessions_count > 0
                                  ? 'bg-primary/15 text-primary'
                                  : 'text-outline'
                              )}
                            >
                              {u.active_sessions_count} online
                            </span>
                          </td>

                          <td className="p-3 font-mono text-xs text-on-surface">
                            {u.total_renders}
                          </td>

                          <td className="p-3 text-xs text-outline whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('pt-BR')}
                          </td>

                          <td className="p-3 text-right">
                            {!isTargetSuper && (
                              <Button
                                size="sm"
                                variant={u.is_active ? 'ghost' : 'primary'}
                                onClick={() => handleStatusToggle(u)}
                                className={cn(
                                  'text-xs py-1 h-7',
                                  u.is_active && 'text-error hover:text-error hover:bg-error/10'
                                )}
                              >
                                {u.is_active ? 'Bloquear' : 'Desbloquear'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Sessões Conectadas em Tempo Real */}
            <Card className="p-5 flex flex-col gap-4 border-surface-container-highest bg-surface-container-lowest">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    devices
                  </span>
                  <h2 className="text-title-md font-bold text-on-surface">
                    Sessões Logadas em Tempo Real
                  </h2>
                </div>
                <Badge variant="neutral" className="text-xs font-mono">
                  {sessions.length} dispositivos conectados
                </Badge>
              </div>

              {sessions.length === 0 ? (
                <p className="text-body-sm text-outline p-4 text-center">
                  Nenhuma sessão ativa encontrada no momento.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sessions.map((sess) => {
                    const isSuperAdminSession =
                      sess.user_role === 'SUPER_ADMIN' ||
                      sess.user_email?.toLowerCase() === 'christian.zimpel@gmail.com';
                    const isAdminSession = isSuperAdminSession || sess.user_role === 'ADMIN';

                    return (
                      <div
                        key={sess.id}
                        className={cn(
                          'p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all',
                          sess.is_current
                            ? 'bg-primary/5 border-primary/40 shadow-[0_0_12px_rgba(212,163,70,0.12)] ring-1 ring-primary/30'
                            : 'bg-surface-container border-surface-container-highest'
                        )}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="material-symbols-outlined text-[22px] text-primary shrink-0">
                                {sess.device_name?.toLowerCase().includes('mobile') ||
                                sess.user_agent?.toLowerCase().includes('mobile')
                                  ? 'smartphone'
                                  : 'computer'}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-label-md font-bold text-on-surface truncate">
                                    {sess.user_name || sess.user_email || 'Usuário'}
                                  </span>
                                  {isSuperAdminSession ? (
                                    <Badge variant="primary" className="text-[9px] font-bold py-0 px-1.5">
                                      SUPER ADMIN
                                    </Badge>
                                  ) : isAdminSession ? (
                                    <Badge variant="neutral" className="text-[9px] font-bold py-0 px-1.5">
                                      ADMIN
                                    </Badge>
                                  ) : null}
                                </div>
                                <span className="text-[11px] text-outline font-mono truncate">
                                  {sess.user_email}
                                </span>
                              </div>
                            </div>

                            {sess.is_current && (
                              <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-primary/20 shrink-0">
                                Sessão Atual
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-on-surface-variant flex flex-col gap-1 pt-1 border-t border-surface-container-highest/60">
                            <div className="flex items-center justify-between">
                              <span className="text-outline">IP:</span>
                              <span className="font-mono text-on-surface">
                                {sess.ip_address || 'Desconhecido'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-outline">Dispositivo:</span>
                              <span className="text-on-surface truncate max-w-[160px]">
                                {sess.device_name || 'Navegador Web'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-outline">Última Atividade:</span>
                              <span className="text-on-surface">
                                {sess.is_current
                                  ? 'Ativo agora'
                                  : new Date(sess.last_active_at).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!sess.is_current ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionToRevoke(sess)}
                            className="w-full text-xs text-error hover:text-error hover:bg-error/15 h-8 font-semibold"
                            leftIcon={
                              <span className="material-symbols-outlined text-[16px]">
                                power_settings_new
                              </span>
                            }
                          >
                            Desconectar Sessão
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] font-semibold text-primary/80 border-t border-primary/20 pt-2">
                            <span className="material-symbols-outlined text-[15px]">verified_user</span>
                            <span>Dispositivo Ativo Agora</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================= ABA 2: YOUTUBE GLOBAL COOKIES ================= */}
        {activeTab === 'youtube' && isSuperAdmin && (
          <div className="flex flex-col gap-6 max-w-4xl">
            {/* Status Atual */}
            <Card className="p-5 border-surface-container-highest bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-3 rounded-xl shrink-0',
                    ytStatus?.hasCookies ? 'bg-emerald-500/15 text-emerald-400' : 'bg-outline/15 text-outline'
                  )}
                >
                  <span className="material-symbols-outlined text-[26px] block">
                    {ytStatus?.hasCookies ? 'verified' : 'cookie'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-title-md font-bold text-on-surface">
                      Cookies Globais do YouTube
                    </h3>
                    <Badge variant={ytStatus?.hasCookies ? 'status-completed' : 'neutral'}>
                      {ytStatus?.hasCookies ? 'Ativos e Prontos' : 'Não Configurado'}
                    </Badge>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    {ytStatus?.hasCookies
                      ? `Arquivo cookies.txt ativo (${ytStatus.sizeBytes} bytes). Atualizado em: ${ytStatus.updatedAt ? new Date(ytStatus.updatedAt).toLocaleString('pt-BR') : 'recente'}.`
                      : 'Nenhum cookie global configurado. Vídeos com restrição de idade ou login podem falhar.'}
                  </p>
                </div>
              </div>

              {ytStatus?.hasCookies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteCookies}
                  isLoading={isDeletingCookies}
                  className="text-error hover:text-error hover:bg-error/10 shrink-0"
                  leftIcon={<span className="material-symbols-outlined text-[16px]">delete</span>}
                >
                  Remover Cookies
                </Button>
              )}
            </Card>

            {/* Formulário de Configuração */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-title-md font-bold text-on-surface">
                  Atualizar Cookies Globais do YouTube
                </h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Para que o AppFrame consiga baixar vídeos protegidos por restrição de idade ou que exigem login oficial,
                  cole aqui o conteúdo completo do seu arquivo <strong className="text-on-surface">cookies.txt</strong> (formato padrão Netscape exportado por extensões ou pelo navegador)
                  ou selecione o arquivo do seu computador.
                </p>
              </div>

              <form onSubmit={handleSaveCookies} className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container border border-surface-container-highest">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      upload_file
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface">
                      Carregar arquivo cookies.txt
                    </span>
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-primary hover:text-on-primary text-xs font-bold transition-colors">
                      Selecionar Arquivo
                    </span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline uppercase tracking-wider">
                    Ou cole o texto dos Cookies (formato Netscape)
                  </label>
                  <textarea
                    value={cookiesInput}
                    onChange={(e) => setCookiesInput(e.target.value)}
                    rows={8}
                    placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1740000000&#9;VISITOR_INFO1_LIVE&#9;xyz..."
                    className="w-full bg-surface-container border border-surface-container-highest rounded-xl p-3 text-xs font-mono text-on-surface outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingCookies}
                    leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
                  >
                    Salvar Cookies no Servidor
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ================= ABA 3: GOOGLE GEMINI AI ================= */}
        {activeTab === 'gemini' && isSuperAdmin && (
          <div className="flex flex-col gap-6 max-w-4xl">
            {/* Status Atual */}
            <Card className="p-5 border-surface-container-highest bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-3 rounded-xl shrink-0',
                    geminiStatus?.configured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-outline/15 text-outline'
                  )}
                >
                  <span className="material-symbols-outlined text-[26px] block">
                    {geminiStatus?.configured ? 'auto_awesome' : 'key_off'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-title-md font-bold text-on-surface">
                      Chave Global do Google Gemini
                    </h3>
                    <Badge variant={geminiStatus?.configured ? 'status-completed' : 'neutral'}>
                      {geminiStatus?.configured ? 'Configurada e Ativa' : 'Não Configurada'}
                    </Badge>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    {geminiStatus?.configured
                      ? `Chave ativa na plataforma: ${geminiStatus.maskedKey}. Todos os usuários usam este assistente transparente.`
                      : 'Nenhuma chave configurada. Todos os recursos de legendas por IA estão suspensos.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestGemini}
                  isLoading={isTestingGemini}
                  leftIcon={<span className="material-symbols-outlined text-[16px]">sync</span>}
                >
                  Testar Conexão
                </Button>

                {geminiStatus?.configured && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteGemini}
                    isLoading={isDeletingGemini}
                    className="text-error hover:text-error hover:bg-error/10"
                    leftIcon={<span className="material-symbols-outlined text-[16px]">delete</span>}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </Card>

            {/* Configuração de Nova Chave */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-title-md font-bold text-on-surface">
                  Definir Nova Chave do Google AI Studio
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Insira a chave obtida no portal do Google AI Studio. A chave será validada na API oficial e criptografada com AES-256-GCM antes de ser persistida.
                </p>
              </div>

              <form onSubmit={handleSaveGeminiKey} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline uppercase tracking-wider">
                    Chave de API do Gemini (AIzaSy...)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="Cole aqui a nova chave de API do Gemini..."
                      className="w-full bg-surface-container border border-surface-container-highest rounded-xl pl-3.5 pr-10 py-2.5 text-body-md font-mono text-on-surface outline-none focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey((v) => !v)}
                      className="absolute right-2.5 text-outline hover:text-on-surface cursor-pointer p-1"
                      title={showGeminiKey ? 'Ocultar' : 'Mostrar'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showGeminiKey ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingGemini}
                    leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
                  >
                    Validar e Salvar Chave Global
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ================= ABA 4: SERVIDOR SMTP ================= */}
        {activeTab === 'smtp' && isSuperAdmin && (
          <div className="flex flex-col gap-6 max-w-4xl">
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-primary">
                    outgoing_mail
                  </span>
                  <h3 className="text-title-md font-bold text-on-surface">
                    Configurações do Servidor SMTP
                  </h3>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Configure o servidor de envio de e-mails para notificações, recuperação de senhas e alertas do sistema.
                </p>
              </div>

              <form onSubmit={handleSaveSmtp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline">
                    Servidor SMTP (Host)
                  </label>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.gmail.com / smtp.resend.com"
                    className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline">
                    Porta
                  </label>
                  <input
                    type="number"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                    placeholder="587 ou 465"
                    className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline">
                    Usuário SMTP
                  </label>
                  <input
                    type="text"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    placeholder="usuario@dominio.com"
                    className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline">
                    Senha SMTP
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-surface-container border border-surface-container-highest rounded-xl pl-3.5 pr-10 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword((v) => !v)}
                      className="absolute right-2.5 text-outline hover:text-on-surface cursor-pointer p-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showSmtpPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline">
                    Nome do Remetente
                  </label>
                  <input
                    type="text"
                    value={smtpForm.fromName}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                    placeholder="AppFrame"
                    className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-outline">
                    E-mail do Remetente (From)
                  </label>
                  <input
                    type="email"
                    value={smtpForm.fromEmail}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                    placeholder="no-reply@appframe.io"
                    className="bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="secure-toggle"
                    checked={smtpForm.secure}
                    onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                  <label
                    htmlFor="secure-toggle"
                    className="text-body-sm text-on-surface cursor-pointer"
                  >
                    Usar conexão SSL/TLS direta (Porta 465)
                  </label>
                </div>

                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingSmtp}
                    leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
                  >
                    Salvar Configurações SMTP
                  </Button>
                </div>
              </form>
            </Card>

            {/* Teste de Disparo de E-mail */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-title-md font-bold text-on-surface">
                  Enviar E-mail de Teste
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Envie uma mensagem de teste real utilizando o servidor SMTP configurado acima para validar a autenticação e entrega.
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3">
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder={user?.email || 'destino@dominio.com'}
                  className="w-full bg-surface-container border border-surface-container-highest rounded-xl px-3.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                />
                <Button
                  variant="outline"
                  onClick={handleTestSmtp}
                  isLoading={isTestingSmtp}
                  leftIcon={<span className="material-symbols-outlined text-[18px]">send</span>}
                  className="shrink-0 w-full md:w-auto"
                >
                  Disparar Teste
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ================= ABA 5: AUDITORIA DE SEGURANÇA ================= */}
        {activeTab === 'audit' && (
          <div className="flex flex-col gap-6">
            {/* Cards de Métricas de Auditoria */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Total de Eventos
                </span>
                <span className="text-display-sm font-bold text-on-surface">
                  {auditLogs.length}
                </span>
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">history</span>
                  Histórico de segurança persistido
                </span>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Recuperação de Senha
                </span>
                <span className="text-display-sm font-bold text-amber-400">
                  {auditPasswordCount}
                </span>
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-amber-400">lock_reset</span>
                  Solicitações e trocas
                </span>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Perfil & Contas
                </span>
                <span className="text-display-sm font-bold text-purple-400">
                  {auditProfileCount}
                </span>
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-purple-400">manage_accounts</span>
                  E-mails, nomes e Google OAuth
                </span>
              </Card>

              <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
                <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
                  Sessões & 2FA
                </span>
                <span className="text-display-sm font-bold text-emerald-400">
                  {auditSecurityCount}
                </span>
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">security</span>
                  Autenticações e revogações
                </span>
              </Card>
            </div>

            {/* Tabela de Logs de Auditoria */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px] text-primary">
                      policy
                    </span>
                    <h3 className="text-title-md font-bold text-on-surface">
                      Trilha de Auditoria e Eventos de Segurança
                    </h3>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    Registro imutável de ações críticas: recuperação de senhas, trocas de credenciais, vinculações e encerramento de sessões.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => refetchAudit()}
                    isLoading={isLoadingAudit || isRefetchingAudit}
                    leftIcon={
                      <span
                        className={cn(
                          'material-symbols-outlined text-[18px]',
                          (isLoadingAudit || isRefetchingAudit) && 'animate-spin'
                        )}
                      >
                        refresh
                      </span>
                    }
                  >
                    Atualizar
                  </Button>
                </div>
              </div>

              {/* Barra de Filtros e Busca */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Buscar por usuário, e-mail, endereço IP, ação ou detalhe..."
                    className="w-full bg-surface-container border border-surface-container-highest rounded-xl pl-10 pr-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary placeholder:text-outline"
                  />
                  {auditSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="bg-surface-container border border-surface-container-highest rounded-xl px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="ALL">Todas as Ações</option>
                    <option value="PASSWORD_RESET_REQUESTED">Redefinição Solicitada</option>
                    <option value="PASSWORD_RESET_COMPLETED">Senha Redefinida (Link)</option>
                    <option value="PASSWORD_CHANGED">Senha Alterada (Logado)</option>
                    <option value="PROFILE_EMAIL_CHANGED">E-mail Alterado</option>
                    <option value="PROFILE_NAME_CHANGED">Nome Alterado</option>
                    <option value="GOOGLE_ACCOUNT_LINKED">Google Vinculado</option>
                    <option value="GOOGLE_ACCOUNT_UNLINKED">Google Desvinculado</option>
                    <option value="TWO_FACTOR_ENABLED">2FA Ativado</option>
                    <option value="TWO_FACTOR_DISABLED">2FA Desativado</option>
                    <option value="SESSION_REVOKED">Sessão Encerrada</option>
                    <option value="ALL_SESSIONS_REVOKED">Todas Sessões Encerradas</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Registros */}
              <div className="overflow-x-auto rounded-xl border border-surface-container-highest">
                <table className="w-full text-left border-collapse text-body-sm">
                  <thead>
                    <tr className="bg-surface-container border-b border-surface-container-highest text-outline text-[11px] uppercase tracking-wider">
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Evento / Ação</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Origem (IP & Dispositivo)</th>
                      <th className="p-3">Detalhes / Metadados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-outline">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[36px] text-outline/50">
                              manage_search
                            </span>
                            <span className="text-body-md font-medium text-on-surface-variant">
                              Nenhum registro de auditoria encontrado
                            </span>
                            <span className="text-body-sm text-outline">
                              {auditSearch || auditActionFilter !== 'ALL'
                                ? 'Experimente ajustar os filtros ou limpar o termo de pesquisa.'
                                : 'Os eventos de segurança aparecerão aqui conforme as ações forem executadas.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => {
                        const badgeInfo = getAuditEventBadge(log.action);
                        const matchedUser = log.user_id ? users.find((u) => u.id === log.user_id) : null;
                        const deviceName = parseDevice(log.user_agent);

                        return (
                          <tr
                            key={log.id}
                            className="hover:bg-surface-container-low/50 transition-colors"
                          >
                            {/* Data / Hora */}
                            <td className="p-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-on-surface font-semibold">
                                  {new Date(log.created_at).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[11px] text-outline">
                                  {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                </span>
                              </div>
                            </td>

                            {/* Evento / Ação */}
                            <td className="p-3">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
                                  badgeInfo.className
                                )}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {badgeInfo.icon}
                                </span>
                                {badgeInfo.label}
                              </span>
                            </td>

                            {/* Usuário */}
                            <td className="p-3">
                              {matchedUser ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                                    {matchedUser.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-on-surface truncate">
                                      {matchedUser.name}
                                    </span>
                                    <span className="text-[11px] text-outline font-mono truncate">
                                      {matchedUser.email}
                                    </span>
                                  </div>
                                </div>
                              ) : log.metadata?.email ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-on-surface">
                                    {log.metadata.email}
                                  </span>
                                  <span className="text-[10px] text-outline">
                                    (Identificado por e-mail)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-outline text-xs italic">
                                  Sistema / Anônimo
                                </span>
                              )}
                            </td>

                            {/* Origem (IP & Dispositivo) */}
                            <td className="p-3">
                              <div className="flex flex-col text-xs">
                                <span className="font-mono text-on-surface font-medium">
                                  {log.ip_address || '127.0.0.1 (Local)'}
                                </span>
                                <span
                                  className="text-[11px] text-outline truncate max-w-[200px]"
                                  title={log.user_agent || undefined}
                                >
                                  {deviceName}
                                </span>
                              </div>
                            </td>

                            {/* Detalhes / Metadados */}
                            <td className="p-3">
                              {renderMetadata(log.metadata)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ================= ABA 5: TERMOS & PRIVACIDADE ================= */}
        {activeTab === 'legal' && isSuperAdmin && (
          <form onSubmit={handleSaveLegal} className="flex flex-col gap-6">
            {/* Header da Aba Legal */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[28px]">gavel</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-title-lg font-bold text-on-surface">
                      Termos de Serviço & Política de Privacidade
                    </h2>
                    <Badge variant="primary">LGPD • Marco Civil</Badge>
                  </div>
                  <p className="text-body-sm text-on-surface-variant max-w-2xl">
                    Gerencie dinamicamente os textos dos Termos e da Política em Markdown. As alterações são refletidas instantaneamente nas páginas públicas, modais de cadastro e rodapé.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetLegal}
                  isLoading={isResettingLegal}
                  className="text-error border-error/30 hover:bg-error/10 hover:border-error/50"
                  leftIcon={<span className="material-symbols-outlined text-[18px]">restart_alt</span>}
                >
                  Restaurar Padrão
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingLegal}
                  leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
                >
                  Salvar Documentos
                </Button>
              </div>
            </Card>

            {/* Parâmetros Globais Dinâmicos */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">tune</span>
                  <h3 className="text-title-md font-bold text-on-surface">
                    Variáveis Institucionais & Contrato
                  </h3>
                </div>
                <span className="text-label-sm text-on-surface-variant">
                  Substituídas automaticamente nos textos entre colchetes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Razão Social / Nome do Desenvolvedor
                  </label>
                  <input
                    type="text"
                    value={legalForm.companyName || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Ex: AppFrame Tecnologia Ltda"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-semibold text-on-surface">
                    E-mail de Suporte / Contato
                  </label>
                  <input
                    type="email"
                    value={legalForm.contactEmail || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Ex: contato@appframe.io"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Canal DPO / Encarregado de Privacidade
                  </label>
                  <input
                    type="email"
                    value={legalForm.dpoEmail || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, dpoEmail: e.target.value }))}
                    placeholder="Ex: privacidade@appframe.io"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Cidade / Foro de Eleição Jurídico
                  </label>
                  <input
                    type="text"
                    value={legalForm.forumCity || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, forumCity: e.target.value }))}
                    placeholder="Ex: Curitiba / PR"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-semibold text-on-surface">
                    Tempo de Retenção de Mídias
                  </label>
                  <input
                    type="text"
                    value={legalForm.retentionPeriod || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, retentionPeriod: e.target.value }))}
                    placeholder="Ex: 24 horas"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-semibold text-on-surface">
                    URL Oficial da Plataforma
                  </label>
                  <input
                    type="url"
                    value={legalForm.websiteUrl || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="Ex: https://appframe.io"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </Card>

            {/* Card com Editor Markdown e Preview dos Documentos */}
            <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
              {/* Barra de Seleção de Documento e Modo de Exibição */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-highest">
                {/* Switcher Termos vs Privacidade */}
                <div className="flex items-center p-1 bg-surface-container rounded-xl border border-surface-container-highest">
                  <button
                    type="button"
                    onClick={() => setActiveLegalDoc('terms')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2',
                      activeLegalDoc === 'terms'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                    <span>Termos de Serviço</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLegalDoc('privacy')}
                    className={cn(
                      'px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2',
                      activeLegalDoc === 'privacy'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    <span>Política de Privacidade</span>
                  </button>
                </div>

                {/* Switcher Editor vs Preview */}
                <div className="flex items-center p-1 bg-surface-container rounded-xl border border-surface-container-highest self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeLegalDoc === 'terms') setActiveTermsMode('edit');
                      else setActivePrivacyMode('edit');
                    }}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                      (activeLegalDoc === 'terms' ? activeTermsMode : activePrivacyMode) === 'edit'
                        ? 'bg-surface-container-highest text-on-surface shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>Editor Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeLegalDoc === 'terms') setActiveTermsMode('preview');
                      else setActivePrivacyMode('preview');
                    }}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                      (activeLegalDoc === 'terms' ? activeTermsMode : activePrivacyMode) === 'preview'
                        ? 'bg-surface-container-highest text-on-surface shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Visualização Prévia</span>
                  </button>
                </div>
              </div>

              {/* Área de Conteúdo (Editor ou Preview) */}
              {activeLegalDoc === 'terms' ? (
                activeTermsMode === 'edit' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={legalForm.termsOfService || ''}
                      onChange={(e) => setLegalForm((prev) => ({ ...prev, termsOfService: e.target.value }))}
                      rows={24}
                      placeholder="Insira o texto completo dos Termos de Serviço em Markdown..."
                      className="w-full p-4 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface font-mono text-body-sm leading-relaxed focus:outline-none focus:border-primary transition-colors resize-y"
                    />
                    <div className="flex items-center justify-between text-label-sm text-on-surface-variant px-1">
                      <span>Suporta sintaxe Markdown completa (# títulos, listas, tabelas e links).</span>
                      <span>{legalForm.termsOfService?.length || 0} caracteres</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 rounded-xl bg-surface-container border border-surface-container-highest max-h-[700px] overflow-y-auto">
                    <div
                      className="prose prose-invert max-w-none text-body-md text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mb-3 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-on-surface [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-on-surface [&_h4]:text-label-lg [&_h4]:font-bold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-surface-container-high [&_th]:p-3 [&_th]:border [&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-surface-container-highest"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(legalForm.termsOfService || '') as string,
                      }}
                    />
                  </div>
                )
              ) : activePrivacyMode === 'edit' ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={legalForm.privacyPolicy || ''}
                    onChange={(e) => setLegalForm((prev) => ({ ...prev, privacyPolicy: e.target.value }))}
                    rows={24}
                    placeholder="Insira o texto completo da Política de Privacidade em Markdown..."
                    className="w-full p-4 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface font-mono text-body-sm leading-relaxed focus:outline-none focus:border-primary transition-colors resize-y"
                  />
                  <div className="flex items-center justify-between text-label-sm text-on-surface-variant px-1">
                    <span>Suporta sintaxe Markdown completa (# títulos, listas, tabelas e links).</span>
                    <span>{legalForm.privacyPolicy?.length || 0} caracteres</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8 rounded-xl bg-surface-container border border-surface-container-highest max-h-[700px] overflow-y-auto">
                  <div
                    className="prose prose-invert max-w-none text-body-md text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mb-3 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-on-surface [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-on-surface [&_h4]:text-label-lg [&_h4]:font-bold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-surface-container-high [&_th]:p-3 [&_th]:border [&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-surface-container-highest"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(legalForm.privacyPolicy || '') as string,
                    }}
                  />
                </div>
              )}

              {/* Botões Finais de Salvar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-highest">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSavingLegal}
                  leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
                >
                  Salvar Alterações
                </Button>
              </div>
            </Card>
          </form>
        )}
      </div>

      {/* Modal de Confirmação para Revogar Sessão de Usuário */}
      <ConfirmModal
        isOpen={Boolean(sessionToRevoke)}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={handleConfirmRevokeSession}
        title="Desconectar Sessão Remota"
        icon="logout"
        message="Tem certeza de que deseja encerrar esta sessão?"
        itemTitle={sessionToRevoke?.user_email || 'Dispositivo'}
        itemSubtitle={`IP: ${sessionToRevoke?.ip_address || 'N/A'} • ${sessionToRevoke?.device_name || 'Navegador'}`}
        warningText="O usuário será deslogado imediatamente no próximo acesso daquele dispositivo."
        confirmText="Desconectar Agora"
        isLoading={isRevokingSession}
        variant="danger"
      />

      {/* Modal de Confirmação para Restaurar Documentos Legais Padrão */}
      <ConfirmModal
        isOpen={showResetLegalModal}
        onClose={() => setShowResetLegalModal(false)}
        onConfirm={handleConfirmResetLegal}
        title="Restaurar Minuta Padrão"
        icon="restart_alt"
        message="Deseja realmente restaurar os Termos de Serviço e a Política de Privacidade para a minuta oficial padrão?"
        itemTitle="Termos de Serviço & Política de Privacidade"
        itemSubtitle="Minuta Contratual Oficial • AppFrame 2026"
        warningText="Atenção: Todas as edições e alterações manuais de texto serão substituídas pela versão original de lançamento."
        confirmText="Restaurar Padrão"
        cancelText="Voltar"
        isLoading={isResettingLegal}
        variant="warning"
      />
    </AppShell>
  );
};
