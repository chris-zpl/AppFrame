import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { AdminSession } from '../types';

interface AdminSessionsListProps {
  sessions: AdminSession[];
  onRevokeSession: (session: AdminSession) => void;
}

export const AdminSessionsList: React.FC<AdminSessionsListProps> = ({
  sessions,
  onRevokeSession,
}) => {
  return (
    <Card className="p-5 flex flex-col gap-4 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-amber-700 dark:text-primary">
            devices
          </span>
          <h2 className="text-title-md font-bold text-neutral-900 dark:text-on-surface">
            Sessões Logadas em Tempo Real
          </h2>
        </div>
        <Badge variant="neutral" className="text-xs font-mono">
          {sessions.length} dispositivos conectados
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <p className="text-body-sm text-neutral-500 dark:text-outline p-4 text-center">
          Nenhuma sessão ativa encontrada no momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map((sess) => {
            const isSuperAdminSession =
              sess.user_role === 'SUPER_ADMIN';
            const isAdminSession = isSuperAdminSession || sess.user_role === 'ADMIN';

            return (
              <div
                key={sess.id}
                className={cn(
                  'p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all',
                  sess.is_current
                    ? 'bg-primary/5 border-primary/40 shadow-[0_0_12px_rgba(212,163,70,0.12)] ring-1 ring-primary/30'
                    : 'bg-neutral-50 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest'
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[22px] text-amber-700 dark:text-primary shrink-0">
                        {sess.device_name?.toLowerCase().includes('mobile') ||
                        sess.user_agent?.toLowerCase().includes('mobile')
                          ? 'smartphone'
                          : 'computer'}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-label-md font-bold text-neutral-900 dark:text-on-surface truncate">
                            {sess.user_name || sess.user_email || 'Usuário'}
                          </span>
                          {isSuperAdminSession ? (
                            <Badge variant="primary" className="text-[9px] font-bold py-0 px-1.5">
                              SUPER ADMIN
                            </Badge>
                          ) : isAdminSession ? (
                            <Badge variant="neutral" className="text-[9px] font-bold py-0 px-1.5">
                              ADMIN
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-neutral-500 dark:text-outline font-mono truncate">
                          {sess.user_email}
                        </span>
                      </div>
                    </div>

                    {sess.is_current && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-primary/20 shrink-0">
                        Sessão Atual
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-neutral-600 dark:text-on-surface-variant flex flex-col gap-1 pt-1 border-t border-neutral-200 dark:border-surface-container-highest/60">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-outline">IP:</span>
                      <span className="font-mono text-neutral-900 dark:text-on-surface">
                        {sess.ip_address || 'Desconhecido'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-outline">Dispositivo:</span>
                      <span className="text-neutral-900 dark:text-on-surface truncate max-w-[160px]">
                        {sess.device_name || 'Navegador Web'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-outline">Última Atividade:</span>
                      <span className="text-neutral-900 dark:text-on-surface">
                        {sess.is_current
                          ? 'Ativo agora'
                          : new Date(sess.last_active_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </span>
                    </div>
                  </div>
                </div>

                {!sess.is_current ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevokeSession(sess)}
                    className="w-full text-xs text-error hover:text-error hover:bg-error/15 h-8 font-semibold"
                    leftIcon={
                      <span className="material-symbols-outlined text-[16px]">
                        power_settings_new
                      </span>
                    }
                  >
                    Desconectar Sessão
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-primary/80 border-t border-amber-600/20 dark:border-primary/20 pt-2">
                    <span className="material-symbols-outlined text-[15px]">verified_user</span>
                    <span>Dispositivo Ativo Agora</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
