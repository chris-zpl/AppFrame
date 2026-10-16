import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui';
import { cn } from '../lib/utils';
import {
  adminService,
  legalService,
  type AdminTab,
  type AdminUser,
  type AdminSession,
  type SmtpConfig,
  type SaveLegalSettingsDto,
  AdminUsersTab,
  AdminYoutubeTab,
  AdminGeminiTab,
  AdminSmtpTab,
  AdminAuditLogsTab,
  AdminLegalTab,
  RevokeSessionModal,
  ResetLegalModal,
  useAdminData,
} from '../features/admin';

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

  // Se o usuário for ADMIN (não super-admin), permite apenas 'users' e 'audit'
  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'users' && activeTab !== 'audit') {
      setActiveTab('users');
    }
  }, [isSuperAdmin, activeTab]);

  // ================= HOOK DE DADOS ADMIN =================
  const {
    users,
    sessions,
    ytStatus,
    geminiStatus,
    smtpConfig,
    auditLogs,
    isLoadingAudit,
    refetchAudit,
    isRefetchingAudit,
    legalSettings,
  } = useAdminData({ isAdmin, isSuperAdmin, activeTab });

  // ================= ESTADOS DO TAB LEGAL =================
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
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(10);

  // Reseta para a primeira página ao alterar busca, filtro ou tamanho da página
  useEffect(() => {
    setAuditPage(1);
  }, [auditSearch, auditActionFilter, auditPageSize]);

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
    if (targetUser.email === 'christian.zimpel@gmail.com' || targetUser.role === 'SUPER_ADMIN') {
      toast.error('O Super-Administrador da plataforma não pode ter seu papel alterado.');
      return;
    }
    if (targetUser.id === user?.id || targetUser.email === user?.email) {
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
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
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
                {users.length}
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
          <AdminUsersTab
            users={users}
            sessions={sessions}
            currentUser={user}
            isAdmin={isAdmin}
            onRoleChange={handleRoleChange}
            onStatusToggle={handleStatusToggle}
            onRevokeSession={(sess) => setSessionToRevoke(sess)}
          />
        )}

        {/* ================= ABA 2: YOUTUBE GLOBAL COOKIES ================= */}
        {activeTab === 'youtube' && isSuperAdmin && (
          <AdminYoutubeTab
            ytStatus={ytStatus}
            cookiesInput={cookiesInput}
            setCookiesInput={setCookiesInput}
            isSavingCookies={isSavingCookies}
            isDeletingCookies={isDeletingCookies}
            onSaveCookies={handleSaveCookies}
            onDeleteCookies={handleDeleteCookies}
            onFileUpload={handleFileUpload}
          />
        )}

        {/* ================= ABA 3: GOOGLE GEMINI AI ================= */}
        {activeTab === 'gemini' && isSuperAdmin && (
          <AdminGeminiTab
            geminiStatus={geminiStatus}
            geminiKeyInput={geminiKeyInput}
            setGeminiKeyInput={setGeminiKeyInput}
            showGeminiKey={showGeminiKey}
            setShowGeminiKey={setShowGeminiKey}
            isSavingGemini={isSavingGemini}
            isTestingGemini={isTestingGemini}
            isDeletingGemini={isDeletingGemini}
            onSaveGeminiKey={handleSaveGeminiKey}
            onTestGemini={handleTestGemini}
            onDeleteGemini={handleDeleteGemini}
          />
        )}

        {/* ================= ABA 4: SERVIDOR SMTP ================= */}
        {activeTab === 'smtp' && isSuperAdmin && (
          <AdminSmtpTab
            smtpForm={smtpForm}
            setSmtpForm={setSmtpForm}
            showSmtpPassword={showSmtpPassword}
            setShowSmtpPassword={setShowSmtpPassword}
            isSavingSmtp={isSavingSmtp}
            testEmailInput={testEmailInput}
            setTestEmailInput={setTestEmailInput}
            isTestingSmtp={isTestingSmtp}
            currentUserEmail={user?.email}
            onSaveSmtp={handleSaveSmtp}
            onTestSmtp={handleTestSmtp}
          />
        )}

        {/* ================= ABA 5: AUDITORIA DE SEGURANÇA ================= */}
        {activeTab === 'audit' && (
          <AdminAuditLogsTab
            auditLogs={auditLogs}
            users={users}
            isLoadingAudit={isLoadingAudit}
            isRefetchingAudit={isRefetchingAudit}
            onRefetchAudit={() => refetchAudit()}
            auditSearch={auditSearch}
            setAuditSearch={setAuditSearch}
            auditActionFilter={auditActionFilter}
            setAuditActionFilter={setAuditActionFilter}
            auditPage={auditPage}
            setAuditPage={setAuditPage}
            auditPageSize={auditPageSize}
            setAuditPageSize={setAuditPageSize}
          />
        )}

        {/* ================= ABA 6: TERMOS & PRIVACIDADE ================= */}
        {activeTab === 'legal' && isSuperAdmin && (
          <AdminLegalTab
            legalForm={legalForm}
            setLegalForm={setLegalForm}
            activeLegalDoc={activeLegalDoc}
            setActiveLegalDoc={setActiveLegalDoc}
            activeTermsMode={activeTermsMode}
            setActiveTermsMode={setActiveTermsMode}
            activePrivacyMode={activePrivacyMode}
            setActivePrivacyMode={setActivePrivacyMode}
            isSavingLegal={isSavingLegal}
            isResettingLegal={isResettingLegal}
            onSaveLegal={handleSaveLegal}
            onResetLegal={handleResetLegal}
          />
        )}
      </div>

      {/* Modal de Confirmação para Revogar Sessão de Usuário */}
      <RevokeSessionModal
        isOpen={Boolean(sessionToRevoke)}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={handleConfirmRevokeSession}
        session={sessionToRevoke}
        isLoading={isRevokingSession}
      />

      {/* Modal de Confirmação para Restaurar Documentos Legais Padrão */}
      <ResetLegalModal
        isOpen={showResetLegalModal}
        onClose={() => setShowResetLegalModal(false)}
        onConfirm={handleConfirmResetLegal}
        isLoading={isResettingLegal}
      />
    </AppShell>
  );
};
