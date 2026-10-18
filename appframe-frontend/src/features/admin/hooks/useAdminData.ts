import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService, legalService } from '../services';
import type { AdminTab, AdminAuditLog } from '../types';

interface UseAdminDataOptions {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  activeTab: AdminTab;
}

export const useAdminData = ({
  isAdmin,
  isSuperAdmin,
  activeTab,
}: UseAdminDataOptions) => {
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.listUsers,
    enabled: isAdmin,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: adminService.listActiveSessions,
    enabled: isAdmin,
    refetchInterval: 15000,
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

  // Atualiza logs de auditoria imediatamente ao entrar na aba audit
  useEffect(() => {
    if (activeTab === 'audit') {
      refetchAudit();
    }
  }, [activeTab, refetchAudit]);

  const { data: legalSettings } = useQuery({
    queryKey: ['admin-legal-settings'],
    queryFn: legalService.getAdminLegalSettings,
    enabled: isSuperAdmin,
  });

  return {
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
  };
};
