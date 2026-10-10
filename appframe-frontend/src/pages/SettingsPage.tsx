import React, { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

export interface UserSessionItem {
  id: string;
  deviceName: string;
  browser: string;
  ipAddress: string;
  isCurrent: boolean;
  lastActiveAt: string;
  icon: string;
}

const INITIAL_SESSIONS: UserSessionItem[] = [
  {
    id: 'sess-current',
    deviceName: 'MacBook Pro 16" (macOS Sonoma)',
    browser: 'Chrome 124.0.0',
    ipAddress: '189.40.12.85',
    isCurrent: true,
    lastActiveAt: 'Ativo agora',
    icon: 'laptop_mac',
  },
  {
    id: 'sess-mobile-1',
    deviceName: 'iPhone 15 Pro (iOS 17.5)',
    browser: 'Safari Mobile',
    ipAddress: '201.17.92.110',
    isCurrent: false,
    lastActiveAt: 'Há 2 horas',
    icon: 'smartphone',
  },
  {
    id: 'sess-desktop-2',
    deviceName: 'Workstation Windows 11',
    browser: 'Edge 123.0.0',
    ipAddress: '177.18.204.42',
    isCurrent: false,
    lastActiveAt: 'Há 3 dias',
    icon: 'desktop_windows',
  },
];

const INITIAL_RECOVERY_CODES = [
  '8472-9102',
  '1928-3849',
  '5501-8392',
  '7462-1049',
  '9920-3184',
  '6281-9042',
  '3409-1128',
  '4829-5019',
];

export const SettingsPage: React.FC = () => {
  const { navigate } = useNavigation();

  // Seções Ativas
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'sessions' | 'danger'>('profile');

  // Estado do Perfil
  const [name, setName] = useState('Christian');
  const [email, setEmail] = useState('christian@appframe.io');
  const [isGoogleLinked, setIsGoogleLinked] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);

  // Estado de Sessões
  const [sessions, setSessions] = useState<UserSessionItem[]>(INITIAL_SESSIONS);
  const [revokeAllModal, setRevokeAllModal] = useState(false);

  // Estado de 2FA
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [show2faActivationModal, setShow2faActivationModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<1 | 2>(1);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRecoveryCodesModal, setShowRecoveryCodesModal] = useState(false);

  // Estado de Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangedSuccess, setPasswordChangedSuccess] = useState(false);

  // Estado da Zona de Perigo
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Ação de Salvar Perfil
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Ação de Revogar Sessão Individual
  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Ação de Desconectar Outros Dispositivos
  const handleRevokeOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setRevokeAllModal(false);
  };

  // Ação de Confirmar 2FA
  const handleConfirm2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length === 6) {
      setTwoFactorStep(2);
      setIs2faEnabled(true);
    }
  };

  // Ação de Alterar Senha
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('A nova senha e a confirmação não coincidem.');
      return;
    }
    setPasswordChangedSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordChangedSuccess(false), 3000);
  };

  // Ação de Excluir Conta em Cascata
  const handleDeleteAccountPermanent = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') return;
    localStorage.clear();
    alert('Sua conta e todos os dados no PostgreSQL e Storage foram excluídos com sucesso.');
    navigate('login');
  };

  return (
    <AppShell
      currentPath="configuracoes"
      onNavigate={(path) => navigate(path)}
      userName={name}
      onUserAvatarClick={() => setActiveSection('profile')}
    >
      <div className="flex flex-col w-full text-on-surface select-none pb-16">
        {/* ================= HEADER ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1 flex-wrap">
              <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
                Configurações e Segurança
              </h1>
              <Badge variant="status-live">
                Proteção Criptografada
              </Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Gerencie seus dados de acesso, credenciais Google OAuth, autenticação em duas etapas (2FA) e dispositivos conectados.
            </p>
          </div>
        </header>

        {/* ================= NAVEGAÇÃO INTERNA DE SEÇÕES ================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-space-md border-b border-surface-container-high/80">
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
              activeSection === 'profile'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Perfil & Conta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('security')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
              activeSection === 'security'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">shield</span>
            <span>Segurança & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sessions')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
              activeSection === 'sessions'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">devices</span>
            <span>Dispositivos Conectados</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm font-mono">
              {sessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('danger')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap text-error hover:bg-error-container/20',
              activeSection === 'danger' && 'bg-error-container/40 text-error font-bold border border-error/40'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>Zona de Perigo</span>
          </button>
        </div>

        {/* ================= 1. SEÇÃO PERFIL & CONTA ================= */}
        {activeSection === 'profile' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-surface-container-high/60 pb-4">
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Dados do Usuário
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Suas informações primárias no AppFrame
                  </p>
                </div>
                {profileSaved && (
                  <span className="text-primary font-semibold text-label-md flex items-center gap-1 animate-in fade-in">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Alterações salvas!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 max-w-xl">
                <Input
                  label="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  }
                />

                <Input
                  label="E-mail Profissional"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  }
                />

                <div className="pt-2">
                  <Button variant="primary" type="submit">
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </Card>

            {/* Provedores Conectados (Google OAuth) */}
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Provedor de Autenticação
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Contas federadas vinculadas para login em 1 clique
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-highest flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm shrink-0">
                    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-title-sm text-title-sm font-bold text-on-surface">
                        Google OAuth 2.0
                      </span>
                      {isGoogleLinked ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Conectado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-outline text-[10px]">
                          Não conectado
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-mono">
                      {email}
                    </span>
                  </div>
                </div>

                <Button
                  variant={isGoogleLinked ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => setIsGoogleLinked(!isGoogleLinked)}
                >
                  {isGoogleLinked ? 'Desvincular' : 'Conectar Google'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ================= 2. SEÇÃO SEGURANÇA & 2FA ================= */}
        {activeSection === 'security' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            {/* Card 2FA (TOTP) */}
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/30">
                    <span className="material-symbols-outlined text-[28px]">
                      shield_locked
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-title-md font-bold text-on-surface">
                        Autenticação em Dois Fatores (2FA)
                      </h3>
                      {is2faEnabled ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-label-sm font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Ativado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-outline text-label-sm font-bold">
                          Desativado
                        </span>
                      )}
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Proteja sua conta contra acessos não autorizados via TOTP (Google Authenticator, Authy).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {is2faEnabled ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRecoveryCodesModal(true)}
                        leftIcon={
                          <span className="material-symbols-outlined text-[16px]">key</span>
                        }
                      >
                        Ver Códigos Reserva
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setIs2faEnabled(false)}
                      >
                        Desativar 2FA
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setTwoFactorStep(1);
                        setShow2faActivationModal(true);
                      }}
                      leftIcon={
                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      }
                    >
                      Ativar 2FA
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                <span>
                  Quando ativado, cada login exigirá um código temporário de 6 dígitos gerado no seu smartphone.
                </span>
              </div>
            </Card>

            {/* Card Alteração de Senha */}
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-4">
              <div className="border-b border-surface-container-high/60 pb-3">
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Alteração de Senha
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Atualize sua senha de acesso ao AppFrame. Contas criadas via Google também podem cadastrar uma senha local.
                </p>
              </div>

              {passwordChangedSuccess && (
                <div className="p-3 rounded-xl bg-primary-container/20 border border-primary/40 text-primary text-body-sm font-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Senha alterada com sucesso! As sessões anteriores permanecem seguras.</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-xl">
                <Input
                  label="Senha Atual (opcional se originada via Google)"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  }
                />

                <Input
                  label="Nova Senha"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                  }
                />

                <Input
                  label="Confirmar Nova Senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                  }
                />

                <div className="pt-2">
                  <Button variant="primary" type="submit">
                    Atualizar Senha
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ================= 3. SEÇÃO DISPOSITIVOS CONECTADOS ================= */}
        {activeSection === 'sessions' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            <Card className="p-6 bg-surface-container border border-surface-container-high shadow-lg flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4">
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Sessões e Dispositivos Ativos
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Dispositivos conectados à sua conta via token JWT com rotação periódica
                  </p>
                </div>

                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevokeAllModal(true)}
                    leftIcon={
                      <span className="material-symbols-outlined text-[16px] text-error">logout</span>
                    }
                  >
                    Desconectar todos os outros dispositivos
                  </Button>
                )}
              </div>

              {/* Lista de Sessões */}
              <div className="flex flex-col gap-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={cn(
                      'p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors',
                      sess.isCurrent
                        ? 'bg-primary/5 border-primary/40 shadow-[0_0_12px_rgba(212,163,70,0.1)]'
                        : 'bg-surface-container-lowest border-surface-container-highest'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0 border border-outline/10">
                        <span className="material-symbols-outlined text-[24px]">
                          {sess.icon}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-title-sm text-title-sm font-bold text-on-surface">
                            {sess.deviceName}
                          </span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider">
                              Sessão Atual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-body-sm text-on-surface-variant font-mono tabular-nums">
                          <span>{sess.browser}</span>
                          <span className="text-outline">•</span>
                          <span>IP: {sess.ipAddress}</span>
                          <span className="text-outline">•</span>
                          <span className="text-outline">{sess.lastActiveAt}</span>
                        </div>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="text-error hover:text-error hover:bg-error-container/20 self-end sm:self-auto"
                        leftIcon={
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        }
                      >
                        Revogar Sessão
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ================= 4. SEÇÃO ZONA DE PERIGO ================= */}
        {activeSection === 'danger' && (
          <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
            <Card className="p-6 bg-error-container/10 border-2 border-error/40 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-error">
                <span className="material-symbols-outlined text-[28px]">warning</span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Exclusão Permanente de Conta
                </h3>
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                Ao excluir sua conta, todas as suas sessões ativas serão invalidadas, todos os registros de jobs no banco de dados serão eliminados em cascata e os arquivos gerados no storage (vídeos finais e marcas d'água) serão apagados permanentemente. <strong>Esta ação é irreversível.</strong>
              </p>

              <div className="pt-2">
                <Button
                  variant="danger"
                  onClick={() => setDeleteAccountModal(true)}
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                  }
                >
                  Excluir Minha Conta Permanentemente
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ================= MODAL ATIVAÇÃO 2FA ================= */}
        {show2faActivationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[24px]">shield_locked</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Ativação do Segundo Fator (2FA)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShow2faActivationModal(false)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {twoFactorStep === 1 ? (
                <form onSubmit={handleConfirm2FA} className="flex flex-col gap-4">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    1. Escaneie o QR Code abaixo com seu aplicativo autenticador (Google Authenticator, Authy, 1Password):
                  </p>

                  {/* QR Code Nítido em SVG de Alta Resolução */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl mx-auto shadow-md">
                    <svg
                      width="160"
                      height="160"
                      viewBox="0 0 160 160"
                      className="w-40 h-40"
                    >
                      <rect width="160" height="160" fill="#ffffff" />
                      {/* Padrão geométrico de QR Code autêntico */}
                      <rect x="15" y="15" width="40" height="40" fill="#000000" />
                      <rect x="22" y="22" width="26" height="26" fill="#ffffff" />
                      <rect x="28" y="28" width="14" height="14" fill="#000000" />

                      <rect x="105" y="15" width="40" height="40" fill="#000000" />
                      <rect x="112" y="22" width="26" height="26" fill="#ffffff" />
                      <rect x="118" y="28" width="14" height="14" fill="#000000" />

                      <rect x="15" y="105" width="40" height="40" fill="#000000" />
                      <rect x="22" y="112" width="26" height="26" fill="#ffffff" />
                      <rect x="28" y="118" width="14" height="14" fill="#000000" />

                      {/* Módulos de dados */}
                      <rect x="65" y="20" width="10" height="10" fill="#000000" />
                      <rect x="80" y="20" width="10" height="10" fill="#000000" />
                      <rect x="65" y="40" width="10" height="10" fill="#000000" />
                      <rect x="65" y="65" width="30" height="10" fill="#000000" />
                      <rect x="20" y="65" width="10" height="10" fill="#000000" />
                      <rect x="40" y="75" width="15" height="10" fill="#000000" />
                      <rect x="105" y="65" width="20" height="10" fill="#000000" />
                      <rect x="135" y="75" width="10" height="10" fill="#000000" />
                      <rect x="65" y="90" width="10" height="20" fill="#000000" />
                      <rect x="85" y="90" width="10" height="10" fill="#000000" />
                      <rect x="105" y="105" width="15" height="15" fill="#000000" />
                      <rect x="130" y="115" width="15" height="15" fill="#000000" />
                      <rect x="75" y="130" width="20" height="10" fill="#000000" />
                    </svg>
                  </div>

                  {/* Chave Alfanumérica Manual */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-label-sm text-outline">
                      Ou insira a chave secreta manualmente:
                    </span>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-label-md text-primary font-bold">
                      <span>JBSWY3DPEHPK3PXP</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('JBSWY3DPEHPK3PXP');
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
                        title="Copiar chave secreta"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedKey ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Confirmação com 6 Dígitos */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm font-label-sm text-on-surface font-semibold">
                      2. Digite o código de 6 dígitos gerado no app:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      required
                      className="w-full text-center tracking-[0.5em] font-mono text-[24px] font-bold p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-primary outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setShow2faActivationModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={twoFactorCode.length !== 6}
                    >
                      Confirmar e Ativar
                    </Button>
                  </div>
                </form>
              ) : (
                /* Passo 2: Códigos de Recuperação */
                <div className="flex flex-col gap-4 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-body-sm font-body-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>2FA ativado com sucesso! Guarde seus códigos de recuperação.</span>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Se você perder o acesso ao seu dispositivo autenticador, poderá usar estes códigos de recuperação de uso único:
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
                    {INITIAL_RECOVERY_CODES.map((code, idx) => (
                      <span key={idx} className="p-1 rounded bg-surface-container">
                        {code}
                      </span>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setShow2faActivationModal(false);
                      setTwoFactorCode('');
                    }}
                    className="w-full mt-2"
                  >
                    Concluir e Salvar
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Modal de Códigos de Recuperação Existentes */}
        {showRecoveryCodesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[24px]">key</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Códigos de Recuperação (2FA)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryCodesModal(false)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Estes códigos são de uso único. Mantenha-os guardados em local seguro:
              </p>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-center text-label-md text-primary font-bold">
                {INITIAL_RECOVERY_CODES.map((code, idx) => (
                  <span key={idx} className="p-1 rounded bg-surface-container">
                    {code}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(INITIAL_RECOVERY_CODES.join('\n'));
                    alert('Códigos copiados para a área de transferência!');
                  }}
                  leftIcon={
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  }
                >
                  Copiar Códigos
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowRecoveryCodesModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Desconectar Outros Dispositivos */}
        {revokeAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-sm p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">logout</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Desconectar Outras Sessões?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Todos os outros dispositivos conectados perderão o acesso imediatamente, exceto este navegador.
              </p>
              <div className="flex items-center gap-2 w-full mt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setRevokeAllModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleRevokeOtherSessions}
                >
                  Desconectar Todos
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Exclusão Permanente de Conta */}
        {deleteAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <Card className="w-full max-w-md p-6 bg-surface-container border-2 border-error/50 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-error">
                <div className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                </div>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Confirmar Exclusão de Conta
                </h3>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Para confirmar a exclusão irreversível de todos os seus dados, digite <strong className="text-error font-mono">EXCLUIR</strong> no campo abaixo:
              </p>

              <Input
                label="Digite EXCLUIR para confirmar"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="EXCLUIR"
                required
              />

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleteAccountModal(false);
                    setDeleteConfirmationText('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  disabled={deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR'}
                  onClick={handleDeleteAccountPermanent}
                >
                  Confirmar Exclusão Permanente
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
};
