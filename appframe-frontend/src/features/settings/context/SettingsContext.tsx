import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useNavigation } from '../../../contexts/NavigationContext';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';
import type { SettingsSection } from '../types';

const VALID_SETTINGS_SECTIONS: Record<string, SettingsSection> = {
  profile: 'profile',
  perfil: 'profile',
  conta: 'profile',
  security: 'security',
  seguranca: 'security',
  '2fa': 'security',
  sessions: 'sessions',
  sessoes: 'sessions',
  dispositivos: 'sessions',
  danger: 'danger',
  perigo: 'danger',
};

function resolveSettingsSection(searchParams: URLSearchParams): SettingsSection {
  const raw = (
    searchParams.get('tab') ||
    searchParams.get('section') ||
    (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '')
  ).toLowerCase();
  return VALID_SETTINGS_SECTIONS[raw] || 'profile';
}

export interface SettingsContextType extends ReturnType<typeof useSettings> {
  activeSection: SettingsSection;
  setActiveSection: (sec: SettingsSection) => void;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  showEmailChangeModal: boolean;
  setShowEmailChangeModal: (show: boolean) => void;
  emailChangeBlockedModal: {
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  };
  setEmailChangeBlockedModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  }>>;
  revokeAllModal: boolean;
  setRevokeAllModal: (show: boolean) => void;
  isGoogleLinked: boolean;
  is2faEnabled: boolean;
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
  handleConfirmRevokeAll: () => Promise<void>;
  handleSelectSection: (section: SettingsSection) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { navigate } = useNavigation();
  const { user, refreshProfile, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeSection, setActiveSection] = useState<SettingsSection>(() => resolveSettingsSection(searchParams));
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeBlockedModal, setEmailChangeBlockedModal] = useState<{
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  }>({ isOpen: false, lastChanged: '', nextAllowed: '' });

  const [revokeAllModal, setRevokeAllModal] = useState(false);

  const isGoogleLinked = Boolean(user?.is_google_linked || user?.google_id || user?.auth_provider === 'google');
  const is2faEnabled = Boolean(user?.is_two_factor_enabled);

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }

  const settings = useSettings({
    refreshProfile,
    logout,
    navigate: (path) => navigate(path),
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha o nome e o e-mail.');
      return;
    }

    const isEmailChanging = email.trim().toLowerCase() !== (user?.email || '').toLowerCase();

    if (isEmailChanging) {
      if (user?.email_changed_at) {
        const lastChangedDate = new Date(user.email_changed_at);
        const nextAllowedDate = new Date(lastChangedDate);
        nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 6);
        if (new Date() < nextAllowedDate) {
          setEmailChangeBlockedModal({
            isOpen: true,
            lastChanged: lastChangedDate.toLocaleDateString('pt-BR'),
            nextAllowed: nextAllowedDate.toLocaleDateString('pt-BR'),
          });
          return;
        }
      }

      setShowEmailChangeModal(true);
      return;
    }

    await settings.executeSaveProfile(name, email);
  };

  const handleConfirmRevokeAll = async () => {
    const success = await settings.handleRevokeOtherSessions();
    if (success) {
      setRevokeAllModal(false);
    }
  };

  // Sincroniza activeSection se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    const nextSection = resolveSettingsSection(searchParams);
    if (nextSection !== activeSection) {
      setActiveSection(nextSection);
      if (nextSection === 'sessions') {
        settings.fetchSessions();
      }
    }
  }, [searchParams]);

  // Se carregar a página inicialmente já na aba de sessões, dispara fetchSessions
  useEffect(() => {
    if (activeSection === 'sessions') {
      settings.fetchSessions();
    }
  }, []);

  const handleSelectSection = useCallback((section: SettingsSection) => {
    setActiveSection(section);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (section === 'profile') {
          next.delete('tab');
          next.delete('section');
        } else {
          next.set('tab', section);
          next.delete('section');
        }
        return next;
      },
      { replace: true }
    );
    if (section === 'sessions') {
      settings.fetchSessions();
    }
  }, [setSearchParams, settings]);

  const value: SettingsContextType = {
    ...settings,
    activeSection,
    setActiveSection,
    name,
    setName,
    email,
    setEmail,
    showEmailChangeModal,
    setShowEmailChangeModal,
    emailChangeBlockedModal,
    setEmailChangeBlockedModal,
    revokeAllModal,
    setRevokeAllModal,
    isGoogleLinked,
    is2faEnabled,
    handleSaveProfile,
    handleConfirmRevokeAll,
    handleSelectSection,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettingsContext = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};
