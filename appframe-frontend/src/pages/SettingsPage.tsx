import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../features/auth';
import { AppShell } from '../components/layout/AppShell';
import {
  SettingsProvider,
  SettingsHeader,
  SettingsNavigationTabs,
  SettingsProfileSection,
  SettingsSecuritySection,
  SettingsSessionsSection,
  SettingsDangerSection,
  SettingsModals,
  useSettingsContext,
} from '../features/settings';

const SettingsPageContent: React.FC = () => {
  const { activeSection } = useSettingsContext();

  return (
    <div className="flex flex-col w-full text-on-surface pb-16">
      {/* ================= HEADER ================= */}
      <SettingsHeader />

      {/* ================= NAVEGAÇÃO DE SEÇÕES ================= */}
      <SettingsNavigationTabs />

      {/* 1. SEÇÃO PERFIL */}
      {activeSection === 'profile' && <SettingsProfileSection />}

      {/* 2. SEÇÃO SEGURANÇA */}
      {activeSection === 'security' && <SettingsSecuritySection />}

      {/* 3. SEÇÃO SESSÕES */}
      {activeSection === 'sessions' && <SettingsSessionsSection />}

      {/* 4. SEÇÃO ZONA DE PERIGO */}
      {activeSection === 'danger' && <SettingsDangerSection />}

      {/* Modais de 2FA, Sessões, Exclusão de Conta e Alteração de E-mail */}
      <SettingsModals />
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { navigate } = useNavigation();
  const { user } = useAuth();

  return (
    <SettingsProvider>
      <AppShell
        currentPath="configuracoes"
        onNavigate={(path) => navigate(path)}
        userName={user?.name || ''}
      >
        <SettingsPageContent />
      </AppShell>
    </SettingsProvider>
  );
};
