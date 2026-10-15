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
} from '../services/admin.service';
import { AppShell } from '../components/layout/AppShell';
import { Button, Badge, Card, ConfirmModal } from '../components/ui';
import { cn } from '../lib/utils';

type AdminTab = 'users' | 'youtube' | 'gemini' | 'smtp';

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

  // Se o usuário for ADMIN (não super-admin), limita a aba a 'users'
  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'users') {
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
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Papel do usuário ${targetUser.name} alterado para ${newRole}.`);
    } catch (err: any) {
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
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Usuário ${targetUser.name} foi ${nextStatus ? 'ativado' : 'bloqueado'}.`);
    } catch (err: any) {
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

  if (!isAdmin) {
    return null;
  }

  // Estatísticas Rápidas
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.is_active).length;
  const totalActiveSessionsCount = sessions.length;
  const totalRendersCount = users.reduce((acc, u) => acc + (u.total_renders || 0), 0);

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
                    return (
                      <div
                        key={sess.id}
                        className={cn(
                          'p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all',
                          sess.is_current
                            ? 'bg-primary/5 border-primary/40'
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
                                <span className="text-label-md font-bold text-on-surface truncate">
                                  {sess.user_name || sess.user_email || 'Usuário'}
                                </span>
                                <span className="text-[11px] text-outline font-mono truncate">
                                  {sess.user_email}
                                </span>
                              </div>
                            </div>

                            {sess.is_current && (
                              <Badge variant="primary" className="text-[9px] shrink-0 font-bold">
                                Esta Sessão
                              </Badge>
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
                                {new Date(sess.last_active_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionToRevoke(sess)}
                          disabled={sess.is_current}
                          className="w-full text-xs text-error hover:text-error hover:bg-error/15 h-8 font-semibold"
                          leftIcon={
                            <span className="material-symbols-outlined text-[16px]">
                              power_settings_new
                            </span>
                          }
                        >
                          {sess.is_current ? 'Sessão Atual' : 'Desconectar Sessão'}
                        </Button>
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
    </AppShell>
  );
};
