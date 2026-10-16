import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui';
import { cn } from '../lib/utils';
import {
  type AdminTab,
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
  useAdminGuard,
  useAdminMutations,
} from '../features/admin';
import { isSuperAdminUser, isAdminUser } from '../features/auth';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSuperAdmin = isSuperAdminUser(user);
  const isAdmin = isAdminUser(user);

  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Guard de acesso e permissões de abas
  useAdminGuard({
    user,
    isAdmin,
    isSuperAdmin,
    activeTab,
    setActiveTab,
  });

  // Hook de Dados Admin
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

  // Hook de Mutações Admin
  const {
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
    handleResetLegal: executeResetLegal,
    isSavingLegal,
    isResettingLegal,
  } = useAdminMutations({ currentUser: user });

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

  // ================= ESTADOS DO TAB GEMINI =================
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);

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
  const [testEmailInput, setTestEmailInput] = useState('');

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

  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    const ok = await handleRevokeSession(sessionToRevoke.id);
    if (ok) setSessionToRevoke(null);
  };

  const handleSaveCookiesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await handleSaveYoutubeCookies(cookiesInput);
    if (ok) setCookiesInput('');
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

  const handleSaveGeminiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await handleSaveGeminiKey(geminiKeyInput);
    if (ok) setGeminiKeyInput('');
  };

  const handleSaveSmtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveSmtp(smtpForm);
  };

  const handleSaveLegalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveLegal(legalForm);
  };

  const handleConfirmResetLegal = async () => {
    const ok = await executeResetLegal();
    if (ok) setShowResetLegalModal(false);
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
            onSaveCookies={handleSaveCookiesSubmit}
            onDeleteCookies={handleDeleteYoutubeCookies}
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
            onSaveGeminiKey={handleSaveGeminiKeySubmit}
            onTestGemini={() => handleTestGemini(geminiKeyInput)}
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
            onSaveSmtp={handleSaveSmtpSubmit}
            onTestSmtp={() => handleTestSmtp(testEmailInput)}
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
            onSaveLegal={handleSaveLegalSubmit}
            onResetLegal={() => setShowResetLegalModal(true)}
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
