import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import {
  type AdminTab,
  type AdminSession,
  AdminHeader,
  AdminNavigationTabs,
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
import { useAuth, isSuperAdminUser, isAdminUser } from '../features/auth';

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

  // ================= ESTADOS DE MODAIS =================
  const [sessionToRevoke, setSessionToRevoke] = useState<AdminSession | null>(null);
  const [showResetLegalModal, setShowResetLegalModal] = useState(false);

  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    const ok = await handleRevokeSession(sessionToRevoke.id);
    if (ok) setSessionToRevoke(null);
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
        <div className="flex flex-col justify-between gap-4 pb-4 border-b border-surface-container-highest">
          <AdminHeader isSuperAdmin={isSuperAdmin} />
          <AdminNavigationTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isSuperAdmin={isSuperAdmin}
            usersCount={users.length}
            auditCount={auditLogs.length}
            hasYoutubeCookies={ytStatus?.hasCookies}
            isGeminiConfigured={geminiStatus?.configured}
          />
        </div>

        {/* ================= ABA 1: USUÁRIOS E SESSÕES ================= */}
        {activeTab === 'users' && (
          <AdminUsersTab
            users={users}
            sessions={sessions}
            currentUser={user}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onRoleChange={handleRoleChange}
            onStatusToggle={handleStatusToggle}
            onRevokeSession={(sess) => setSessionToRevoke(sess)}
          />
        )}

        {/* ================= ABA 2: YOUTUBE GLOBAL COOKIES ================= */}
        {activeTab === 'youtube' && isSuperAdmin && (
          <AdminYoutubeTab
            ytStatus={ytStatus}
            isSavingCookies={isSavingCookies}
            isDeletingCookies={isDeletingCookies}
            onSaveCookies={handleSaveYoutubeCookies}
            onDeleteCookies={handleDeleteYoutubeCookies}
          />
        )}

        {/* ================= ABA 3: GOOGLE GEMINI AI ================= */}
        {activeTab === 'gemini' && isSuperAdmin && (
          <AdminGeminiTab
            geminiStatus={geminiStatus}
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
            initialConfig={smtpConfig}
            isSavingSmtp={isSavingSmtp}
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
          />
        )}

        {/* ================= ABA 6: TERMOS & PRIVACIDADE ================= */}
        {activeTab === 'legal' && isSuperAdmin && (
          <AdminLegalTab
            initialSettings={legalSettings}
            isSavingLegal={isSavingLegal}
            isResettingLegal={isResettingLegal}
            onSaveLegal={handleSaveLegal}
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
