import React from 'react';
import { Card, Input, Button } from '../../../components/ui';

import { useSettingsContext } from '../context';
import { useAuth } from '../../auth';

export interface SettingsProfileSectionProps {
  name?: string;
  setName?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  isSavingProfile?: boolean;
  profileSaved?: boolean;
  isGoogleLinked?: boolean;
  googleEmail?: string | null;
  isUnlinkingGoogle?: boolean;
  isLinkingGoogle?: boolean;
  onSaveProfile?: (e: React.FormEvent) => void;
  onGoogleProviderAction?: () => void;
}

export const SettingsProfileSection: React.FC<SettingsProfileSectionProps> = (props) => {
  const settings = useSettingsContext();
  const { user } = useAuth();

  const name = props.name ?? settings.name;
  const setName = props.setName ?? settings.setName;
  const email = props.email ?? settings.email;
  const setEmail = props.setEmail ?? settings.setEmail;
  const isSavingProfile = props.isSavingProfile ?? settings.isSavingProfile;
  const profileSaved = props.profileSaved ?? settings.profileSaved;
  const isGoogleLinked = props.isGoogleLinked ?? settings.isGoogleLinked;
  const googleEmail = props.googleEmail ?? user?.google_email ?? (isGoogleLinked ? user?.email : null);
  const isUnlinkingGoogle = props.isUnlinkingGoogle ?? settings.isUnlinkingGoogle;
  const isLinkingGoogle = props.isLinkingGoogle ?? settings.isLinkingGoogle;
  const onSaveProfile = props.onSaveProfile ?? settings.handleSaveProfile;
  const onGoogleProviderAction = props.onGoogleProviderAction ?? (() => settings.handleGoogleProviderAction(isGoogleLinked));
  return (
    <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
      <Card className="p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-sm dark:shadow-lg flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-surface-container-high/60 pb-4">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface">
              Dados do Usuário
            </h3>
            <p className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
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

        <form onSubmit={onSaveProfile} className="flex flex-col gap-4 max-w-xl">
          <Input
            label="Nome Completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSavingProfile}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">person</span>
            }
          />

          <div>
            <Input
              label="E-mail Profissional"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSavingProfile}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">mail</span>
              }
            />
            <p className="text-[11px] text-neutral-500 dark:text-on-surface-variant flex items-center gap-1 mt-1 pl-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              O e-mail da conta só pode ser alterado uma vez a cada 6 meses.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              type="submit"
              isLoading={isSavingProfile}
              disabled={isSavingProfile}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Card>

      {/* Provedores Conectados (Google OAuth) */}
      <Card className="p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-sm dark:shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface">
              Provedor de Autenticação
            </h3>
            <p className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
              Contas federadas vinculadas para login em 1 clique
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm shrink-0 border border-neutral-200 dark:border-transparent">
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
                <span className="font-title-sm text-title-sm font-bold text-neutral-900 dark:text-on-surface">
                  Google
                </span>
                {isGoogleLinked ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    Conectado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-surface-container-highest text-neutral-600 dark:text-outline text-[10px] font-medium">
                    Não conectado
                  </span>
                )}
              </div>
              <span className="font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant font-mono">
                {isGoogleLinked
                  ? (googleEmail || 'Conta vinculada ao Google')
                  : 'Nenhuma conta Google vinculada'}
              </span>
            </div>
          </div>

          <Button
            variant={isGoogleLinked ? 'outline' : 'secondary'}
            size="sm"
            isLoading={isUnlinkingGoogle || isLinkingGoogle}
            disabled={isUnlinkingGoogle || isLinkingGoogle}
            onClick={onGoogleProviderAction}
          >
            {isGoogleLinked ? 'Desvincular' : 'Conectar Google'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
