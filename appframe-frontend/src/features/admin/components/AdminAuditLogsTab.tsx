import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Button, Input, Select, Pagination } from "../../../components/ui";
import { cn } from "../../../lib/utils";
import type { AdminAuditLog, AdminUser } from "../types";
import { getAuditEventBadge, parseDevice } from "../constants";
import { AdminAuditMetadata } from "./AdminAuditMetadata";

function resolveAuditPage(searchParams: URLSearchParams): number {
  const raw = searchParams.get('page') || searchParams.get('p') || '1';
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

export interface AdminAuditLogsTabProps {
  auditLogs: AdminAuditLog[];
  users: AdminUser[];
  isLoadingAudit: boolean;
  isRefetchingAudit: boolean;
  onRefetchAudit: () => void;
  auditSearch?: string;
  setAuditSearch?: (val: string) => void;
  auditActionFilter?: string;
  setAuditActionFilter?: (val: string) => void;
  auditPage?: number;
  setAuditPage?: React.Dispatch<React.SetStateAction<number>>;
  auditPageSize?: number;
  setAuditPageSize?: (size: number) => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({
  auditLogs,
  users,
  isLoadingAudit,
  isRefetchingAudit,
  onRefetchAudit,
  auditSearch: controlledSearch,
  setAuditSearch: controlledSetSearch,
  auditActionFilter: controlledFilter,
  setAuditActionFilter: controlledSetFilter,
  auditPage: controlledPage,
  setAuditPage: controlledSetPage,
  auditPageSize: controlledSize,
  setAuditPageSize: controlledSetSize,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [internalSearch, setInternalSearch] = useState('');
  const [internalFilter, setInternalFilter] = useState('ALL');
  const [internalPage, setInternalPageState] = useState<number>(() => resolveAuditPage(searchParams));
  const [internalSize, setInternalSize] = useState(10);

  const setInternalPage = useCallback(
    (action: React.SetStateAction<number>) => {
      setInternalPageState((prev) => {
        const nextVal = typeof action === 'function' ? action(prev) : action;
        const safeVal = Math.max(1, nextVal);
        setSearchParams(
          (spPrev) => {
            const next = new URLSearchParams(spPrev);
            if (safeVal <= 1) {
              next.delete('page');
              next.delete('p');
            } else {
              next.set('page', String(safeVal));
              next.delete('p');
            }
            return next;
          },
          { replace: true }
        );
        return safeVal;
      });
    },
    [setSearchParams]
  );

  // Sincroniza se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    if (controlledPage === undefined) {
      const p = resolveAuditPage(searchParams);
      if (p !== internalPage) {
        setInternalPageState(p);
      }
    }
  }, [searchParams, controlledPage]);

  const auditSearch = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const setAuditSearch = controlledSetSearch ?? setInternalSearch;
  const auditActionFilter = controlledFilter !== undefined ? controlledFilter : internalFilter;
  const setAuditActionFilter = controlledSetFilter ?? setInternalFilter;
  const auditPage = controlledPage !== undefined ? controlledPage : internalPage;
  const setAuditPage = controlledSetPage ?? setInternalPage;
  const auditPageSize = controlledSize !== undefined ? controlledSize : internalSize;
  const setAuditPageSize = controlledSetSize ?? setInternalSize;

  const handleSearchChange = (val: string) => {
    setAuditSearch(val);
    if (controlledPage === undefined) {
      setInternalPage(1);
    }
  };

  const handleActionFilterChange = (val: string) => {
    setAuditActionFilter(val);
    if (controlledPage === undefined) {
      setInternalPage(1);
    }
  };

  const handlePageSizeChange = (val: number) => {
    setAuditPageSize(val);
    if (controlledPage === undefined) {
      setInternalPage(1);
    }
  };
  // Estatísticas de Auditoria
  const auditPasswordCount = auditLogs.filter((l) =>
    l.action.includes("PASSWORD"),
  ).length;
  const auditProfileCount = auditLogs.filter(
    (l) => l.action.includes("PROFILE") || l.action.includes("GOOGLE"),
  ).length;
  const auditSecurityCount = auditLogs.filter(
    (l) => l.action.includes("SESSION") || l.action.includes("TWO_FACTOR"),
  ).length;

  // Filtragem dos Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter !== "ALL" && log.action !== auditActionFilter) {
        return false;
      }
      if (!auditSearch.trim()) return true;
      const term = auditSearch.toLowerCase();
      const targetUser = users.find((u) => u.id === log.user_id);
      const userName = targetUser?.name?.toLowerCase() || "";
      const userEmail = targetUser?.email?.toLowerCase() || "";
      const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
      const ip = (log.ip_address || "").toLowerCase();
      const action = log.action.toLowerCase();
      const ua = (log.user_agent || "").toLowerCase();

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
  const totalAuditPages = Math.max(
    1,
    Math.ceil(filteredAuditLogs.length / auditPageSize),
  );
  const safeAuditPage = Math.min(Math.max(1, auditPage), totalAuditPages);

  const paginatedAuditLogs = useMemo(() => {
    const startIndex = (safeAuditPage - 1) * auditPageSize;
    return filteredAuditLogs.slice(startIndex, startIndex + auditPageSize);
  }, [filteredAuditLogs, safeAuditPage, auditPageSize]);

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de Métricas de Auditoria */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider">
            Total de Eventos
          </span>
          <span className="text-display-sm font-bold text-neutral-900 dark:text-on-surface">
            {auditLogs.length}
          </span>
          <span className="text-[11px] text-neutral-600 dark:text-on-surface-variant flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-[14px] text-amber-700 dark:text-primary">
              history
            </span>
            Histórico de segurança persistido
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider truncate">
            Recuperação de Senha
          </span>
          <span className="text-display-sm font-bold text-amber-600 dark:text-amber-400">
            {auditPasswordCount}
          </span>
          <span className="text-[11px] text-neutral-600 dark:text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-amber-600 dark:text-amber-400">
              lock_reset
            </span>
            Solicitações e trocas
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider">
            Perfil & Contas
          </span>
          <span className="text-display-sm font-bold text-purple-600 dark:text-purple-400">
            {auditProfileCount}
          </span>
          <span className="text-[11px] text-neutral-600 dark:text-on-surface-variant flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-[14px] text-purple-600 dark:text-purple-400">
              manage_accounts
            </span>
            E-mails, nomes e Google OAuth
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-1 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
          <span className="text-[12px] font-semibold text-neutral-500 dark:text-outline uppercase tracking-wider">
            Sessões & 2FA
          </span>
          <span className="text-display-sm font-bold text-emerald-600 dark:text-emerald-400">
            {auditSecurityCount}
          </span>
          <span className="text-[11px] text-neutral-600 dark:text-on-surface-variant flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400">
              security
            </span>
            Autenticações e revogações
          </span>
        </Card>
      </div>

      {/* Tabela de Logs de Auditoria */}
      <Card className="p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-amber-700 dark:text-primary">
                policy
              </span>
              <h3 className="text-title-md font-bold text-neutral-900 dark:text-on-surface">
                Trilha de Auditoria e Eventos de Segurança
              </h3>
            </div>
            <p className="text-body-sm text-neutral-600 dark:text-on-surface-variant">
              Registro imutável de ações críticas: recuperação de senhas, trocas
              de credenciais, vinculações e encerramento de sessões.
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
                    "material-symbols-outlined text-[18px]",
                    (isLoadingAudit || isRefetchingAudit) && "animate-spin",
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
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
          <Input
            id="audit-search"
            name="auditSearch"
            aria-label="Buscar eventos de auditoria"
            size="sm"
            type="text"
            value={auditSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por usuário, e-mail, endereço IP, ação ou detalhe..."
            containerClassName="flex-1"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                search
              </span>
            }
            rightElement={
              auditSearch ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  aria-label="Limpar busca"
                  title="Limpar busca"
                  className="text-outline hover:text-on-surface cursor-pointer flex items-center justify-center p-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              ) : undefined
            }
          />

          <div className="flex flex-1 items-center flex-wrap">
            <Select
              id="audit-action-filter"
              name="auditActionFilter"
              aria-label="Filtrar por tipo de ação"
              value={auditActionFilter}
              onChange={(e) => handleActionFilterChange(e.target.value)}
              className="w-full"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="USER_ROLE_CHANGED">
                Perfil / Função Alterada
              </option>
              <option value="USER_BLOCKED">Usuário Bloqueado</option>
              <option value="USER_UNBLOCKED">Usuário Desbloqueado</option>
              <option value="GEMINI_KEY_SAVED">Chave Gemini Salva</option>
              <option value="GEMINI_KEY_DELETED">Chave Gemini Removida</option>
              <option value="YOUTUBE_COOKIES_SAVED">
                Cookies YouTube Salvos
              </option>
              <option value="YOUTUBE_COOKIES_DELETED">
                Cookies YouTube Removidos
              </option>
              <option value="LEGAL_DOCUMENTS_UPDATED">
                Termos & Privacidade Atualizados
              </option>
              <option value="PASSWORD_RESET_REQUESTED">
                Redefinição Solicitada
              </option>
              <option value="PASSWORD_RESET_COMPLETED">
                Senha Redefinida (Link)
              </option>
              <option value="PASSWORD_CHANGED">Senha Alterada (Logado)</option>
              <option value="PROFILE_EMAIL_CHANGED">E-mail Alterado</option>
              <option value="PROFILE_NAME_CHANGED">Nome Alterado</option>
              <option value="GOOGLE_ACCOUNT_LINKED">Google Vinculado</option>
              <option value="GOOGLE_ACCOUNT_UNLINKED">
                Google Desvinculado
              </option>
              <option value="TWO_FACTOR_ENABLED">2FA Ativado</option>
              <option value="TWO_FACTOR_DISABLED">2FA Desativado</option>
              <option value="SESSION_REVOKED">Sessão Encerrada</option>
              <option value="ALL_SESSIONS_REVOKED">
                Todas Sessões Encerradas
              </option>
            </Select>
          </div>
        </div>

        {/* Tabela de Registros */}
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-surface-container-highest">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-surface-container border-b border-neutral-200 dark:border-surface-container-highest text-neutral-600 dark:text-outline text-[11px] uppercase tracking-wider">
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Evento / Ação</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Origem (IP & Dispositivo)</th>
                <th className="p-3">Detalhes / Metadados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-surface-container-highest">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500 dark:text-outline">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-neutral-400 dark:text-outline/50">
                        manage_search
                      </span>
                      <span className="text-body-md font-medium text-neutral-800 dark:text-on-surface-variant">
                        Nenhum registro de auditoria encontrado
                      </span>
                      <span className="text-body-sm text-neutral-500 dark:text-outline">
                        {auditSearch || auditActionFilter !== "ALL"
                          ? "Experimente ajustar os filtros ou limpar o termo de pesquisa."
                          : "Os eventos de segurança aparecerão aqui conforme as ações forem executadas."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAuditLogs.map((log) => {
                  const badgeInfo = getAuditEventBadge(log.action);
                  const matchedUser = log.user_id
                    ? users.find((u) => u.id === log.user_id)
                    : null;
                  const deviceName = parseDevice(log.user_agent);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-neutral-50 dark:hover:bg-surface-container-high/60 transition-colors"
                    >
                      {/* Data / Hora */}
                      <td className="p-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-neutral-900 dark:text-on-surface font-semibold">
                            {new Date(log.created_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-outline">
                            {new Date(log.created_at).toLocaleTimeString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Evento / Ação */}
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                            badgeInfo.className,
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
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 dark:bg-primary/20 text-amber-900 dark:text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                              {matchedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-neutral-900 dark:text-on-surface truncate">
                                {matchedUser.name}
                              </span>
                              <span className="text-[11px] text-neutral-500 dark:text-outline font-mono truncate">
                                {matchedUser.email}
                              </span>
                            </div>
                          </div>
                        ) : log.metadata?.email ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 dark:text-on-surface">
                              {log.metadata.email}
                            </span>
                            <span className="text-[10px] text-neutral-500 dark:text-outline">
                              (Identificado por e-mail)
                            </span>
                          </div>
                        ) : log.metadata?.performedBy ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 dark:text-on-surface">
                              {log.metadata.performedBy}
                            </span>
                            <span className="text-[10px] text-amber-800 dark:text-primary">
                              (Administrador)
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 dark:text-outline text-xs italic">
                            Sistema / Anônimo
                          </span>
                        )}
                      </td>

                      {/* Origem (IP & Dispositivo) */}
                      <td className="p-3">
                        <div className="flex flex-col text-xs">
                          <span className="font-mono text-neutral-900 dark:text-on-surface font-medium">
                            {log.ip_address || "127.0.0.1 (Local)"}
                          </span>
                          <span
                            className="text-[11px] text-neutral-500 dark:text-outline truncate max-w-[200px]"
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

        {/* Paginação de Auditoria */}
        <Pagination
          currentPage={safeAuditPage}
          totalPages={totalAuditPages}
          totalItems={filteredAuditLogs.length}
          pageSize={auditPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setAuditPage}
          onPageSizeChange={handlePageSizeChange}
          itemsLabel="eventos"
        />
      </Card>
    </div>
  );
};
