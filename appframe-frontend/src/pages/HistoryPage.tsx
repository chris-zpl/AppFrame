import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { cn } from '../lib/utils';
import { mediaService, type VideoJobItem } from '../services/media.service';

export const HistoryPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const [filter, setFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [errorDrawerJob, setErrorDrawerJob] = useState<VideoJobItem | null>(null);
  const [jobToDelete, setJobToDelete] = useState<VideoJobItem | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Consulta real periódica via TanStack Query (pooling a cada 3 segundos)
  const {
    data: jobs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => mediaService.listJobs(),
    refetchInterval: 3000,
  });

  const formatDuration = (job: VideoJobItem): string => {
    let secs = job.duration_seconds;
    if (
      (!secs || secs <= 0) &&
      job.trim_start !== null &&
      job.trim_end !== null &&
      Number(job.trim_end) > Number(job.trim_start)
    ) {
      secs = Math.round(Number(job.trim_end) - Number(job.trim_start));
    }
    if (!secs || secs <= 0) return '--:--';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getThumbnailUrl = (job: VideoJobItem): string | null => {
    const url = job.source_url;
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/
    );
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const filteredJobs = jobs.filter((j) => {
    const st = String(j.status || '').toUpperCase();
    if (filter === 'processing') {
      return st === 'RENDERING' || st === 'DOWNLOADING' || st === 'PENDING';
    }
    if (filter === 'completed') return st === 'COMPLETED';
    if (filter === 'failed') return st === 'FAILED';
    return true;
  });

  const handleDownloadVideo = async (job: VideoJobItem) => {
    try {
      await mediaService.downloadJobFile(job.id, job.original_title);
      toast.success('Vídeo baixado para o seu computador com sucesso!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Não foi possível baixar o arquivo de vídeo processado.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleDeleteJob = async (job: VideoJobItem) => {
    setDeletingJobId(job.id);
    try {
      await mediaService.deleteJob(job.id);
      toast.success('Job excluído do histórico com sucesso.');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao excluir job do histórico.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <AppShell
      currentPath="historico"
      onNavigate={(path) => navigate(path)}
      onUserAvatarClick={() => navigate('settings')}
    >
      <div className="flex flex-col w-full text-on-surface select-none pb-12">
        {/* ================= HEADER ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1 flex-wrap">
              <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
                Histórico de Renderizações e Filas
              </h1>
              <Badge variant="status-live">
                Workers BullMQ Online
              </Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Monitoramento em tempo real das filas Redis <code>media-download</code> e <code>media-render</code> com FFmpeg.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-surface-container dark:hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-all shadow-sm cursor-pointer border border-neutral-200 dark:border-surface-container-highest/60"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                refresh
              </span>
              <span>Atualizar</span>
            </button>

            <Button
              variant="primary"
              onClick={() => navigate('studio')}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  content_cut
                </span>
              }
            >
              Novo Corte no Studio
            </Button>
          </div>
        </header>

        {/* Notificação se Job foi recém-criado */}
        {params.jobCreated && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-primary/40 shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px] animate-spin" style={{ animationDuration: '3s' }}>
                  sync
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-sm text-title-sm font-bold text-on-surface">
                  Job despachado com sucesso para a fila!
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {params.jobId ? `ID: ${params.jobId} • ` : ''}Orquestração BullMQ e processamento FFmpeg em andamento.
                </span>
              </div>
            </div>
            <span className="text-label-sm font-label-sm font-bold text-primary uppercase tracking-wider hidden sm:inline">
              Fila: media-render
            </span>
          </div>
        )}

        {/* ================= BARRA DE FILTROS ================= */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-md">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'all'
                    ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
                    : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Todos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-surface-container-highest text-label-sm font-label-sm">
                  {jobs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('processing')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'processing'
                    ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
                    : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Em Andamento</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-label-sm font-label-sm">
                  {jobs.filter((j) => ['RENDERING', 'DOWNLOADING', 'PENDING'].includes(String(j.status || '').toUpperCase())).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'completed'
                    ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
                    : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Concluídos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-label-sm font-label-sm">
                  {jobs.filter((j) => String(j.status || '').toUpperCase() === 'COMPLETED').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('failed')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'failed'
                    ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
                    : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Falhas</span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 text-label-sm font-label-sm">
                  {jobs.filter((j) => String(j.status || '').toUpperCase() === 'FAILED').length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TABELA / LISTA DE JOBS ================= */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Carregando fila de jobs...</span>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredJobs.map((job) => {
              const st = String(job.status || '').toUpperCase();
              const isRendering = st === 'RENDERING';
              const isDownloading = st === 'DOWNLOADING';
              const isPending = st === 'PENDING';
              const isCompleted = st === 'COMPLETED';
              const isFailed = st === 'FAILED';

              const title = job.original_title || job.source_url || `Job ${job.id.substring(0, 8)}`;
              const queueLabel = isDownloading || isPending ? 'media-download' : 'media-render';
              const thumbUrl = getThumbnailUrl(job);

              return (
                <Card
                  key={job.id}
                  className={cn(
                    'p-4 sm:p-5 bg-white dark:bg-surface-container-low border transition-all duration-200 shadow-sm dark:shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4',
                    isRendering && 'border-primary/40 shadow-[0_0_15px_rgba(212,163,70,0.1)]',
                    isCompleted && 'border-neutral-200 dark:border-surface-container-high hover:border-primary/30',
                    isFailed && 'border-red-400/40 bg-red-500/5'
                  )}
                >
                  {/* Informações Primárias do Vídeo com Thumbnail Real */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
                    <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-surface-container-highest shrink-0 flex items-center justify-center shadow-xs">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className={cn(
                            'w-full h-full flex items-center justify-center',
                            isCompleted && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                            (isRendering || isDownloading) && 'bg-primary/15 text-primary',
                            isPending && 'bg-neutral-100 dark:bg-surface-container-highest text-neutral-500',
                            isFailed && 'bg-red-500/20 text-red-600 dark:text-red-400'
                          )}
                        >
                          <span className="material-symbols-outlined text-[24px]">
                            {isCompleted && 'check_circle'}
                            {isRendering && 'movie_filter'}
                            {isDownloading && 'cloud_download'}
                            {isPending && 'hourglass_empty'}
                            {isFailed && 'error'}
                          </span>
                        </div>
                      )}

                      {/* Duração sobreposta na thumb */}
                      <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/75 backdrop-blur-xs font-mono text-[9px] text-white tabular-nums">
                        {formatDuration(job)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-title-md text-title-md font-bold text-on-surface truncate max-w-xl" title={title}>
                          {title}
                        </h3>
                        <Badge variant={job.platform?.includes('shorts') ? 'short' : 'long'}>
                          {job.platform || 'Vídeo'}
                        </Badge>
                      </div>

                      {/* Metadados e Fila */}
                      <div className="flex items-center gap-2 text-body-sm text-body-sm text-on-surface-variant flex-wrap font-mono tabular-nums">
                        <span>Duração: <strong className="text-on-surface">{formatDuration(job)}</strong></span>
                        <span className="text-outline">•</span>
                        <span className="text-primary font-semibold font-sans">{queueLabel}</span>
                        <span className="text-outline">•</span>
                        <span>{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
                        <span className="text-outline">•</span>
                        <span className="text-outline text-[11px] truncate max-w-[120px]">{job.id}</span>
                      </div>

                      {/* Barra de Progresso Linear Âmbar em Renderização */}
                      {(isRendering || isDownloading) && (
                        <div className="flex items-center gap-3 w-full max-w-md mt-1">
                          <div className="w-full bg-neutral-200 dark:bg-surface-container-highest h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-300 rounded-full"
                              style={{ width: `${Math.max(8, job.progress)}%` }}
                            />
                          </div>
                          <span className="font-mono text-label-md font-bold text-primary tabular-nums shrink-0">
                            {job.progress}%
                          </span>
                        </div>
                      )}

                      {/* Aviso de erro sanitizado */}
                      {isFailed && job.error_log && (
                        <div className="mt-1 text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <span className="truncate max-w-md">{job.error_log}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges de Status e Ações */}
                  <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                    {isPending && (
                      <Badge variant="status-processing">
                        Na Fila
                      </Badge>
                    )}

                    {isDownloading && (
                      <Badge variant="status-processing">
                        Baixando
                      </Badge>
                    )}

                    {isRendering && (
                      <Badge variant="status-processing">
                        Renderizando FFmpeg
                      </Badge>
                    )}

                    {isCompleted && (
                      <Badge variant="status-completed">
                        Concluído
                      </Badge>
                    )}

                    {isFailed && (
                      <Badge variant="status-failed">
                        Falha
                      </Badge>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadVideo(job)}
                          leftIcon={
                            <span className="material-symbols-outlined text-[16px]">
                              download
                            </span>
                          }
                        >
                          Baixar Vídeo
                        </Button>
                      )}

                      {isFailed && job.error_log && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setErrorDrawerJob(job)}
                          leftIcon={
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                          }
                        >
                          Ver Log
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingJobId === job.id}
                        onClick={() => setJobToDelete(job)}
                        title="Excluir do histórico"
                        className="text-red-600 dark:text-red-400 hover:bg-red-500/10 px-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* ================= ESTADO VAZIO USANDO <EmptyState> ================= */
          <EmptyState
            icon="history"
            title="Nenhum job de renderização encontrado"
            description="Quando você exportar cortes do Studio ou disparar downloads de canais na Varredura, o progresso aparecerá aqui em tempo real."
            suggestionsTitle="Comece agora:"
            suggestions={[
              {
                label: 'Ir para a Varredura de Canais',
                onClick: () => navigate('varredura'),
              },
              {
                label: 'Abrir o Studio de Edição',
                onClick: () => navigate('studio'),
              },
            ]}
          />
        )}

        {/* Modal de Detalhes do Erro */}
        {errorDrawerJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-lg p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-surface-container-highest pb-3">
                <div className="flex items-center gap-2 text-red-500 font-bold">
                  <span className="material-symbols-outlined text-[22px]">error</span>
                  <span>Detalhes da Falha no Job</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorDrawerJob(null)}
                  className="text-neutral-400 hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-body-sm text-on-surface-variant">
                  <strong>ID:</strong> {errorDrawerJob.id}
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  <strong>Vídeo:</strong> {errorDrawerJob.original_title || errorDrawerJob.source_url}
                </span>
                <div className="mt-2 p-3 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest font-mono text-[12px] text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap">
                  {errorDrawerJob.error_log || 'Nenhum detalhe adicional disponível.'}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={() => setErrorDrawerJob(null)}>
                  Fechar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão do Histórico */}
        <ConfirmModal
          isOpen={Boolean(jobToDelete)}
          onClose={() => setJobToDelete(null)}
          onConfirm={async () => {
            if (jobToDelete) {
              await handleDeleteJob(jobToDelete);
              setJobToDelete(null);
            }
          }}
          title="Excluir do Histórico"
          icon="delete_forever"
          message="Tem certeza de que deseja excluir este vídeo do histórico?"
          itemTitle={jobToDelete?.original_title || jobToDelete?.source_url}
          itemSubtitle={jobToDelete ? `ID: ${jobToDelete.id}` : undefined}
          warningText="Esta ação é irreversível. O arquivo gerado no servidor será removido."
          confirmText="Confirmar Exclusão"
          isLoading={Boolean(deletingJobId)}
          variant="danger"
        />
      </div>
    </AppShell>
  );
};
