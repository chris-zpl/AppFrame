import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { AdminUser, AdminSession } from '../types';
import { isSuperAdminUser } from '../../auth';
import { AdminSessionsList } from './AdminSessionsList';

interface AdminUsersTabProps {
  users: AdminUser[];
  sessions: AdminSession[];
  currentUser: { id?: string; email?: string } | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onRoleChange: (targetUser: AdminUser, newRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER') => void;
  onStatusToggle: (targetUser: AdminUser) => void;
  onRevokeSession: (session: AdminSession) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  sessions,
  currentUser,
  isSuperAdmin: isSuperAdminProp,
  onRoleChange,
  onStatusToggle,
  onRevokeSession,
}) => {
  const isSuperAdmin = isSuperAdminProp ?? (currentUser ? isSuperAdminUser(currentUser) : false);
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.is_active).length;
  const totalActiveSessionsCount = sessions.length;
  const totalRendersCount = users.reduce((acc, u) => acc + (u.total_renders || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1 border-neutral-200 dark:border-surface-container-highest bg-white dark:bg-surface-container shadow-sm">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider truncate">
            Total de Usuários
          </span>
          <span className="text-[28px] font-extrabold text-neutral-900 dark:text-on-surface">
            {totalUsersCount}
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-neutral-200 dark:border-surface-container-highest bg-white dark:bg-surface-container shadow-sm">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider">
            Usuários Ativos
          </span>
          <span className="text-[28px] font-extrabold text-emerald-600 dark:text-emerald-400">
            {activeUsersCount}
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-neutral-200 dark:border-surface-container-highest bg-white dark:bg-surface-container shadow-sm">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider truncate">
            Sessões Online Agora
          </span>
          <span className="text-[28px] font-extrabold text-amber-800 dark:text-primary">
            {totalActiveSessionsCount}
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-neutral-200 dark:border-surface-container-highest bg-white dark:bg-surface-container shadow-sm">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider">
            Total de Renders
          </span>
          <span className="text-[28px] font-extrabold text-neutral-900 dark:text-on-surface">
            {totalRendersCount}
          </span>
        </Card>
      </div>

      {/* Tabela de Usuários */}
      <Card className="p-5 flex flex-col gap-4 border-neutral-200 dark:border-surface-container-highest bg-white dark:bg-surface-container shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-700 dark:text-primary">
              manage_accounts
            </span>
            <h2 className="text-title-md font-bold text-neutral-900 dark:text-on-surface">
              Usuários Cadastrados
            </h2>
          </div>
          <span className="text-body-xs text-neutral-600 dark:text-on-surface-variant truncate">
            {users.length} usuários registrados
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-surface-container-highest">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-surface-container border-b border-neutral-200 dark:border-surface-container-highest text-neutral-600 dark:text-outline text-[11px] uppercase tracking-wider">
                <th className="p-3">Usuário</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Perfil / Papel</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sessões Ativas</th>
                <th className="p-3">Renders</th>
                <th className="p-3">Cadastro</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-surface-container-highest">
              {users.map((u) => {
                const isTargetSuper = isSuperAdminUser(u);
                const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                const canChangeRole = isSuperAdmin && !isTargetSuper && !isSelf;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-neutral-50 dark:hover:bg-surface-container-high/60 transition-colors"
                  >
                    <td className="p-3 font-semibold text-neutral-900 dark:text-on-surface">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 dark:bg-primary/20 text-amber-900 dark:text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{u.name}</span>
                      </div>
                    </td>

                    <td className="p-3 text-neutral-600 dark:text-on-surface-variant font-mono text-xs">
                      {u.email}
                    </td>

                    <td className="p-3">
                      {isTargetSuper ? (
                        <Badge variant="primary" className="font-extrabold text-[10px]">
                          SUPER ADMIN
                        </Badge>
                      ) : canChangeRole ? (
                        <select
                          id={`user-role-${u.id}`}
                          name={`user_role_${u.id}`}
                          aria-label={`Função do usuário ${u.name || u.email}`}
                          value={u.role}
                          onChange={(e) =>
                            onRoleChange(
                              u,
                              e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'USER'
                            )
                          }
                          className="bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest rounded-lg px-2 py-1 text-xs font-semibold text-neutral-900 dark:text-on-surface outline-none focus:border-primary cursor-pointer shadow-2xs"
                        >
                          <option value="USER">Usuário Comum</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={u.role === 'ADMIN' ? 'primary' : 'neutral'}
                            className="text-[10px]"
                          >
                            {u.role === 'ADMIN' ? 'ADMIN' : 'USUÁRIO'}
                          </Badge>
                          {isSelf && (
                            <span className="text-[10px] text-neutral-500 dark:text-outline font-medium italic">
                              (Você)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                          u.is_active
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            u.is_active ? 'bg-green-400' : 'bg-red-400'
                          )}
                        />
                        {u.is_active ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-xs">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md font-bold truncate',
                          u.active_sessions_count > 0
                            ? 'bg-amber-500/15 dark:bg-primary/15 text-amber-800 dark:text-primary'
                            : 'text-neutral-500 dark:text-outline'
                        )}
                      >
                        {u.active_sessions_count} online
                      </span>
                    </td>

                    <td className="p-3 font-mono text-xs text-neutral-900 dark:text-on-surface">
                      {u.total_renders}
                    </td>

                    <td className="p-3 text-xs text-neutral-500 dark:text-outline whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="p-3 text-right">
                      {!isTargetSuper && !isSelf && (
                        <Button
                          size="sm"
                          variant={u.is_active ? 'ghost' : 'primary'}
                          onClick={() => onStatusToggle(u)}
                          className={cn(
                            'text-xs py-1 h-7',
                            u.is_active && 'text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400'
                          )}
                        >
                          {u.is_active ? 'Bloquear' : 'Desbloquear'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sessões Conectadas em Tempo Real */}
      <AdminSessionsList sessions={sessions} onRevokeSession={onRevokeSession} />
    </div>
  );
};
