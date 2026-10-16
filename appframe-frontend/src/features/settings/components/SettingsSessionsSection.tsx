import React from 'react';
import { Card, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { UserSessionItem } from '../interfaces';

interface SettingsSessionsSectionProps {
  sessions: UserSessionItem[];
  isLoadingSessions: boolean;
  revokingSessionId: string | null;
  onOpenRevokeAllModal: () => void;
  onRevokeSession: (sessionId: string) => void;
}

export const SettingsSessionsSection: React.FC<SettingsSessionsSectionProps> = ({
  sessions,
  isLoadingSessions,
  revokingSessionId,
  onOpenRevokeAllModal,
  onRevokeSession,
}) => {
  return (
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
              onClick={onOpenRevokeAllModal}
              leftIcon={
                <span className="material-symbols-outlined text-[16px] text-error">logout</span>
              }
            >
              Desconectar todos os outros dispositivos
            </Button>
          )}
        </div>

        {/* Lista de Sessões */}
        {isLoadingSessions ? (
          <div className="py-8 flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm gap-2">
            <span className="material-symbols-outlined animate-spin text-primary text-[20px]">
              progress_activity
            </span>
            <span>Carregando sessões ativas...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant font-body-sm text-body-sm">
            Nenhuma sessão ativa encontrada.
          </div>
        ) : (
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
                    <div className="flex items-center gap-2 text-body-sm text-body-sm text-on-surface-variant font-mono tabular-nums flex-wrap">
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
                    isLoading={revokingSessionId === sess.id}
                    disabled={revokingSessionId === sess.id}
                    onClick={() => onRevokeSession(sess.id)}
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
        )}
      </Card>
    </div>
  );
};
