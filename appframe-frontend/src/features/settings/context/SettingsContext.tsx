import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../auth';
import { useNavigation } from '../../../contexts/NavigationContext';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';
import type { SettingsSection } from '../types';

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

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeBlockedModal, setEmailChangeBlockedModal] = useState<{
    isOpen: boolean;
    lastChanged: string;
    nextAllowed: string;
  }>({ isOpen: false, lastChanged: '', nextAllowed: '' });

  const [revokeAllModal, setRevokeAllModal] = useState(false);

  const isGoogleLinked = Boolean(user?.google_id || user?.auth_provider === 'google');
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

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSection(section);
    if (section === 'sessions') {
      settings.fetchSessions();
    }
  };

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
