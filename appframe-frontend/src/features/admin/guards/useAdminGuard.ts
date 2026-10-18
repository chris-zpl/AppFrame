import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AdminTab } from '../types';

interface UseAdminGuardOptions {
  user: { id?: string; email?: string | null; role?: string | null } | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export const useAdminGuard = ({
  user,
  isAdmin,
  isSuperAdmin,
  activeTab,
  setActiveTab,
}: UseAdminGuardOptions) => {
  const navigate = useNavigate();

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
  }, [isSuperAdmin, activeTab, setActiveTab]);
};
