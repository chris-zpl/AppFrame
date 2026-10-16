import React, { useMemo } from 'react';
import { Card, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { AdminAuditLog, AdminUser } from '../interfaces';
import { getAuditEventBadge, parseDevice } from '../constants';
import { AdminAuditMetadata } from './AdminAuditMetadata';

interface AdminAuditLogsTabProps {
  auditLogs: AdminAuditLog[];
  users: AdminUser[];
  isLoadingAudit: boolean;
  isRefetchingAudit: boolean;
  onRefetchAudit: () => void;
  auditSearch: string;
  setAuditSearch: (val: string) => void;
  auditActionFilter: string;
  setAuditActionFilter: (val: string) => void;
  auditPage: number;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  auditPageSize: number;
  setAuditPageSize: (size: number) => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({
  auditLogs,
  users,
  isLoadingAudit,
  isRefetchingAudit,
  onRefetchAudit,
  auditSearch,
  setAuditSearch,
  auditActionFilter,
  setAuditActionFilter,
  auditPage,
  setAuditPage,
  auditPageSize,
  setAuditPageSize,
}) => {
  // Estatísticas de Auditoria
  const auditPasswordCount = auditLogs.filter((l) => l.action.includes('PASSWORD')).length;
  const auditProfileCount = auditLogs.filter(
    (l) => l.action.includes('PROFILE') || l.action.includes('GOOGLE')
  ).length;
  const auditSecurityCount = auditLogs.filter(
    (l) => l.action.includes('SESSION') || l.action.includes('TWO_FACTOR')
  ).length;

  // Filtragem dos Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) {
        return false;
      }
      if (!auditSearch.trim()) return true;
      const term = auditSearch.toLowerCase();
      const targetUser = users.find((u) => u.id === log.user_id);
      const userName = targetUser?.name?.toLowerCase() || '';
      const userEmail = targetUser?.email?.toLowerCase() || '';
      const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
      const ip = (log.ip_address || '').toLowerCase();
      const action = log.action.toLowerCase();
      const ua = (log.user_agent || '').toLowerCase();

      return (
        action.includes(term) ||
        userName.includes(term) ||
        userEmail.includes(term) ||
        ip.includes(term) ||
        metaStr.includes(term) ||
        ua.includes(term)
      );
    });
  }, [auditLogs, auditActionFilter, auditSearch, users]);

  // Paginação dos Registros de Auditoria
  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / auditPageSize));
  const safeAuditPage = Math.min(Math.max(1, auditPage), totalAuditPages);

  const paginatedAuditLogs = useMemo(() => {
    const startIndex = (safeAuditPage - 1) * auditPageSize;
    return filteredAuditLogs.slice(startIndex, startIndex + auditPageSize);
  }, [filteredAuditLogs, safeAuditPage, auditPageSize]);

  const auditStartRecord = filteredAuditLogs.length > 0 ? (safeAuditPage - 1) * auditPageSize + 1 : 0;
  const auditEndRecord = Math.min(safeAuditPage * auditPageSize, filteredAuditLogs.length);

  const auditPageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalAuditPages <= 7) {
      for (let i = 1; i <= totalAuditPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    const start = Math.max(2, safeAuditPage - 1);
    const end = Math.min(totalAuditPages - 1, safeAuditPage + 1);

    if (start > 2) pages.push('ellipsis-start');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalAuditPages - 1) pages.push('ellipsis-end');

    pages.push(totalAuditPages);
    return pages;
  }, [totalAuditPages, safeAuditPage]);

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de Métricas de Auditoria */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
          <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
            Total de Eventos
          </span>
          <span className="text-display-sm font-bold text-on-surface">
            {auditLogs.length}
          </span>
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">history</span>
            Histórico de segurança persistido
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
          <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
            Recuperação de Senha
          </span>
          <span className="text-display-sm font-bold text-amber-400">
            {auditPasswordCount}
          </span>
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-amber-400">lock_reset</span>
            Solicitações e trocas
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
          <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
            Perfil & Contas
          </span>
          <span className="text-display-sm font-bold text-purple-400">
            {auditProfileCount}
          </span>
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-purple-400">manage_accounts</span>
            E-mails, nomes e Google OAuth
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 border-surface-container-highest bg-surface-container-lowest">
          <span className="text-[12px] font-semibold text-outline uppercase tracking-wider">
            Sessões & 2FA
          </span>
          <span className="text-display-sm font-bold text-emerald-400">
            {auditSecurityCount}
          </span>
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-400">security</span>
            Autenticações e revogações
          </span>
        </Card>
      </div>

      {/* Tabela de Logs de Auditoria */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-primary">
                policy
              </span>
              <h3 className="text-title-md font-bold text-on-surface">
                Trilha de Auditoria e Eventos de Segurança
              </h3>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Registro imutável de ações críticas: recuperação de senhas, trocas de credenciais, vinculações e encerramento de sessões.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onRefetchAudit}
              isLoading={isLoadingAudit || isRefetchingAudit}
              leftIcon={
                <span
                  className={cn(
                    'material-symbols-outlined text-[18px]',
                    (isLoadingAudit || isRefetchingAudit) && 'animate-spin'
                  )}
                >
                  refresh
                </span>
              }
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Buscar por usuário, e-mail, endereço IP, ação ou detalhe..."
              className="w-full bg-surface-container border border-surface-container-highest rounded-xl pl-10 pr-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary placeholder:text-outline"
            />
            {auditSearch && (
              <button
                type="button"
                onClick={() => setAuditSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="USER_ROLE_CHANGED">Perfil / Função Alterada</option>
              <option value="USER_BLOCKED">Usuário Bloqueado</option>
              <option value="USER_UNBLOCKED">Usuário Desbloqueado</option>
              <option value="GEMINI_KEY_SAVED">Chave Gemini Salva</option>
              <option value="GEMINI_KEY_DELETED">Chave Gemini Removida</option>
              <option value="YOUTUBE_COOKIES_SAVED">Cookies YouTube Salvos</option>
              <option value="YOUTUBE_COOKIES_DELETED">Cookies YouTube Removidos</option>
              <option value="LEGAL_DOCUMENTS_UPDATED">Termos & Privacidade Atualizados</option>
              <option value="PASSWORD_RESET_REQUESTED">Redefinição Solicitada</option>
              <option value="PASSWORD_RESET_COMPLETED">Senha Redefinida (Link)</option>
              <option value="PASSWORD_CHANGED">Senha Alterada (Logado)</option>
              <option value="PROFILE_EMAIL_CHANGED">E-mail Alterado</option>
              <option value="PROFILE_NAME_CHANGED">Nome Alterado</option>
              <option value="GOOGLE_ACCOUNT_LINKED">Google Vinculado</option>
              <option value="GOOGLE_ACCOUNT_UNLINKED">Google Desvinculado</option>
              <option value="TWO_FACTOR_ENABLED">2FA Ativado</option>
              <option value="TWO_FACTOR_DISABLED">2FA Desativado</option>
              <option value="SESSION_REVOKED">Sessão Encerrada</option>
              <option value="ALL_SESSIONS_REVOKED">Todas Sessões Encerradas</option>
            </select>

            <select
              value={auditPageSize}
              onChange={(e) => setAuditPageSize(Number(e.target.value))}
              className="bg-surface-container border border-surface-container-highest rounded-xl px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary cursor-pointer font-medium"
              title="Quantidade de registros exibidos por página"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
        </div>

        {/* Tabela de Registros */}
        <div className="overflow-x-auto rounded-xl border border-surface-container-highest">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-surface-container border-b border-surface-container-highest text-outline text-[11px] uppercase tracking-wider">
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Evento / Ação</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Origem (IP & Dispositivo)</th>
                <th className="p-3">Detalhes / Metadados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-outline">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-outline/50">
                        manage_search
                      </span>
                      <span className="text-body-md font-medium text-on-surface-variant">
                        Nenhum registro de auditoria encontrado
                      </span>
                      <span className="text-body-sm text-outline">
                        {auditSearch || auditActionFilter !== 'ALL'
                          ? 'Experimente ajustar os filtros ou limpar o termo de pesquisa.'
                          : 'Os eventos de segurança aparecerão aqui conforme as ações forem executadas.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAuditLogs.map((log) => {
                  const badgeInfo = getAuditEventBadge(log.action);
                  const matchedUser = log.user_id ? users.find((u) => u.id === log.user_id) : null;
                  const deviceName = parseDevice(log.user_agent);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      {/* Data / Hora */}
                      <td className="p-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-on-surface font-semibold">
                            {new Date(log.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[11px] text-outline">
                            {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                      </td>

                      {/* Evento / Ação */}
                      <td className="p-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
                            badgeInfo.className
                          )}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {badgeInfo.icon}
                          </span>
                          {badgeInfo.label}
                        </span>
                      </td>

                      {/* Usuário */}
                      <td className="p-3">
                        {matchedUser ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                              {matchedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-on-surface truncate">
                                {matchedUser.name}
                              </span>
                              <span className="text-[11px] text-outline font-mono truncate">
                                {matchedUser.email}
                              </span>
                            </div>
                          </div>
                        ) : log.metadata?.email ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">
                              {log.metadata.email}
                            </span>
                            <span className="text-[10px] text-outline">
                              (Identificado por e-mail)
                            </span>
                          </div>
                        ) : log.metadata?.performedBy ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">
                              {log.metadata.performedBy}
                            </span>
                            <span className="text-[10px] text-primary">
                              (Administrador)
                            </span>
                          </div>
                        ) : (
                          <span className="text-outline text-xs italic">
                            Sistema / Anônimo
                          </span>
                        )}
                      </td>

                      {/* Origem (IP & Dispositivo) */}
                      <td className="p-3">
                        <div className="flex flex-col text-xs">
                          <span className="font-mono text-on-surface font-medium">
                            {log.ip_address || '127.0.0.1 (Local)'}
                          </span>
                          <span
                            className="text-[11px] text-outline truncate max-w-[200px]"
                            title={log.user_agent || undefined}
                          >
                            {deviceName}
                          </span>
                        </div>
                      </td>

                      {/* Detalhes / Metadados */}
                      <td className="p-3">
                        <AdminAuditMetadata metadata={log.metadata} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginação */}
        {filteredAuditLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-container-highest">
            {/* Informações de Registros e Seletor de Itens por Página */}
            <div className="flex items-center gap-4 flex-wrap text-body-sm text-outline">
              <span>
                Mostrando <strong className="text-on-surface">{auditStartRecord}</strong> a{' '}
                <strong className="text-on-surface">{auditEndRecord}</strong> de{' '}
                <strong className="text-on-surface">{filteredAuditLogs.length}</strong> eventos
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-xs">Exibir:</span>
                <select
                  value={auditPageSize}
                  onChange={(e) => setAuditPageSize(Number(e.target.value))}
                  className="bg-surface-container border border-surface-container-highest rounded-lg px-2.5 py-1 text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>

            {/* Controles de Navegação de Página */}
            {totalAuditPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  type="button"
                  disabled={safeAuditPage <= 1}
                  onClick={() => setAuditPage(1)}
                  title="Primeira Página"
                  className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer border border-surface-container-highest"
                >
                  <span className="material-symbols-outlined text-[18px]">first_page</span>
                </button>

                <button
                  type="button"
                  disabled={safeAuditPage <= 1}
                  onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer border border-surface-container-highest"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  <span>Anterior</span>
                </button>

                {auditPageNumbers.map((pageItem) => {
                  if (pageItem === 'ellipsis-start' || pageItem === 'ellipsis-end') {
                    return (
                      <span
                        key={pageItem}
                        className="px-2 py-1 text-outline font-mono select-none text-xs"
                      >
                        ...
                      </span>
                    );
                  }

                  const isActive = pageItem === safeAuditPage;
                  return (
                    <button
                      key={pageItem}
                      type="button"
                      onClick={() => setAuditPage(pageItem)}
                      className={cn(
                        'min-w-[32px] h-8 px-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center font-medium',
                        isActive
                          ? 'bg-primary text-neutral-950 font-bold shadow-sm'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-highest'
                      )}
                    >
                      {pageItem}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={safeAuditPage >= totalAuditPages}
                  onClick={() => setAuditPage((prev) => Math.min(totalAuditPages, prev + 1))}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer border border-surface-container-highest"
                >
                  <span>Próxima</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>

                <button
                  type="button"
                  disabled={safeAuditPage >= totalAuditPages}
                  onClick={() => setAuditPage(totalAuditPages)}
                  title="Última Página"
                  className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer border border-surface-container-highest"
                >
                  <span className="material-symbols-outlined text-[18px]">last_page</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
