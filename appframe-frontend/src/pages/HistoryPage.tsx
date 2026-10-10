import React, { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

export type JobStatus = 'pending' | 'downloading' | 'rendering' | 'completed' | 'failed';

export interface RenderQueueItem {
  id: string;
  title: string;
  platform: string;
  aspectRatio: '9:16' | '16:9';
  status: JobStatus;
  queueName: 'media:download' | 'media:render';
  progress: number;
  durationFormatted: string;
  createdAt: string;
  finalVideoUrl?: string;
  errorLog?: string;
}

const INITIAL_QUEUE_ITEMS: RenderQueueItem[] = [
  {
    id: 'job-98a2',
    title: 'EP. 412 - INTELIGÊNCIA ARTIFICIAL E O FUTURO DA CRIAÇÃO DE CONTEÚDO',
    platform: 'YouTube Shorts',
    aspectRatio: '9:16',
    status: 'rendering',
    queueName: 'media:render',
    progress: 46,
    durationFormatted: '00:43',
    createdAt: 'Há 1 minuto',
  },
  {
    id: 'job-87bc',
    title: 'COMO ESCALAR CANAIS DE CORTES AUTOMATIZADOS COM IA',
    platform: 'Reels / TikTok',
    aspectRatio: '9:16',
    status: 'downloading',
    queueName: 'media:download',
    progress: 88,
    durationFormatted: '01:15',
    createdAt: 'Há 4 minutos',
  },
  {
    id: 'job-76ef',
    title: 'O segredo para reter audiência nos primeiros 3 segundos',
    platform: 'YouTube Shorts',
    aspectRatio: '9:16',
    status: 'completed',
    queueName: 'media:render',
    progress: 100,
    durationFormatted: '00:58',
    createdAt: 'Há 25 minutos',
    finalVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41581-large.mp4',
  },
  {
    id: 'job-54cd',
    title: 'ENTREVISTA EXCLUSIVA: OS MAIORES CANAIS DO BRASIL',
    platform: 'Widescreen 16:9',
    aspectRatio: '16:9',
    status: 'completed',
    queueName: 'media:render',
    progress: 100,
    durationFormatted: '02:40',
    createdAt: 'Há 1 hora',
    finalVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41581-large.mp4',
  },
  {
    id: 'job-32ab',
    title: 'BASTIDORES DA PRODUÇÃO E SETUP COMPLETO',
    platform: 'YouTube Shorts',
    aspectRatio: '9:16',
    status: 'failed',
    queueName: 'media:render',
    progress: 32,
    durationFormatted: '00:30',
    createdAt: 'Há 2 horas',
    errorLog: 'FFmpeg filter_complex syntax error: unexpected symbol at stream #0:1 [sanitized]',
  },
];

export const HistoryPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const [filter, setFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [deleteModalJobId, setDeleteModalJobId] = useState<string | null>(null);
  const [errorDrawerJob, setErrorDrawerJob] = useState<RenderQueueItem | null>(null);

  // Inicializa a fila de jobs com suporte a job recém-gerado no Studio
  const [jobs, setJobs] = useState<RenderQueueItem[]>(() => {
    if (params.jobCreated && params.jobId) {
      const incomingJob: RenderQueueItem = {
        id: params.jobId,
        title: params.title || 'Novo Corte Renderizado no Studio',
        platform: 'YouTube Shorts',
        aspectRatio: '9:16',
        status: 'rendering',
        queueName: 'media:render',
        progress: 15,
        durationFormatted: '00:43',
        createdAt: 'Agora mesmo',
      };
      return [incomingJob, ...INITIAL_QUEUE_ITEMS];
    }
    return INITIAL_QUEUE_ITEMS;
  });

  // Simulação de progresso em tempo real das filas ativas do BullMQ
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((currentJobs) =>
        currentJobs.map((j) => {
          if (j.status === 'downloading') {
            const next = j.progress + 15;
            if (next >= 100) {
              return { ...j, status: 'rendering', queueName: 'media:render', progress: 5 };
            }
            return { ...j, progress: next };
          }
          if (j.status === 'rendering') {
            const next = j.progress + 12;
            if (next >= 100) {
              return {
                ...j,
                status: 'completed',
                progress: 100,
                finalVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41581-large.mp4',
              };
            }
            return { ...j, progress: next };
          }
          return j;
        })
      );
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'processing') return j.status === 'rendering' || j.status === 'downloading' || j.status === 'pending';
    if (filter === 'completed') return j.status === 'completed';
    if (filter === 'failed') return j.status === 'failed';
    return true;
  });

  const handleDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setDeleteModalJobId(null);
  };

  const handleClearCompleted = () => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed'));
  };

  const handleDownloadVideo = (job: RenderQueueItem) => {
    alert(`Baixando vídeo final renderizado: ${job.title} (${job.id}.mp4)...`);
  };

  const handleRetryJob = (job: RenderQueueItem) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? { ...j, status: 'rendering', progress: 10, errorLog: undefined }
          : j
      )
    );
  };

  return (
    <AppShell
      currentPath="historico"
      onNavigate={(path) => navigate(path)}
      userName="Christian"
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
              Monitoramento em tempo real das filas Redis <code>media:download</code> e <code>media:render</code> com FFmpeg.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Alternador de Demonstração para Testar EmptyState */}
            <button
              type="button"
              onClick={() => {
                if (jobs.length > 0) {
                  setJobs([]);
                } else {
                  setJobs(INITIAL_QUEUE_ITEMS);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-all shadow-sm cursor-pointer border border-surface-container-highest/60"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                swap_horiz
              </span>
              <span>{jobs.length > 0 ? 'Ver Estado Vazio' : 'Ver Estado Populado'}</span>
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
          <div className="mb-6 p-4 rounded-2xl bg-primary-container/20 border border-primary/40 shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
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
                  ID: <code className="text-primary font-mono">{params.jobId}</code> • Orquestração BullMQ e processamento FFmpeg em andamento.
                </span>
              </div>
            </div>
            <span className="text-label-sm font-label-sm font-bold text-primary uppercase tracking-wider hidden sm:inline">
              Fila: media:render
            </span>
          </div>
        )}

        {/* ================= BARRA DE FILTROS E AÇÕES EM LOTE ================= */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-md">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'all'
                    ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Todos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm">
                  {jobs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('processing')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'processing'
                    ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Em Andamento</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-label-sm font-label-sm">
                  {jobs.filter((j) => j.status === 'rendering' || j.status === 'downloading' || j.status === 'pending').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'completed'
                    ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Concluídos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-label-sm font-label-sm">
                  {jobs.filter((j) => j.status === 'completed').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('failed')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
                  filter === 'failed'
                    ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                )}
              >
                <span>Falhas</span>
                <span className="px-1.5 py-0.2 rounded-full bg-error-container/40 text-error text-label-sm font-label-sm">
                  {jobs.filter((j) => j.status === 'failed').length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCompleted}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-colors cursor-pointer border border-outline/10 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">clear_all</span>
                <span>Limpar Concluídos</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TABELA / LISTA DE JOBS ================= */}
        {filteredJobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredJobs.map((job) => {
              const isRendering = job.status === 'rendering';
              const isDownloading = job.status === 'downloading';
              const isPending = job.status === 'pending';
              const isCompleted = job.status === 'completed';
              const isFailed = job.status === 'failed';

              return (
                <Card
                  key={job.id}
                  className={cn(
                    'p-4 sm:p-5 bg-surface-container-low border transition-all duration-200 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4',
                    isRendering && 'border-primary/40 shadow-[0_0_15px_rgba(212,163,70,0.1)]',
                    isCompleted && 'border-surface-container-high hover:border-outline/30',
                    isFailed && 'border-error/40 bg-error-container/5'
                  )}
                >
                  {/* Informações Primárias do Vídeo */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border',
                        isCompleted && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                        (isRendering || isDownloading) && 'bg-primary/15 text-primary border-primary/30',
                        isPending && 'bg-surface-container-highest text-on-surface-variant border-outline/20',
                        isFailed && 'bg-error-container/40 text-error border-error/40'
                      )}
                    >
                      <span className="material-symbols-outlined text-[26px]">
                        {isCompleted && 'check_circle'}
                        {isRendering && 'movie_filter'}
                        {isDownloading && 'cloud_download'}
                        {isPending && 'hourglass_empty'}
                        {isFailed && 'error'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-title-md text-title-md font-bold text-on-surface truncate max-w-xl" title={job.title}>
                          {job.title}
                        </h3>
                        <Badge variant={job.aspectRatio === '9:16' ? 'short' : 'long'}>
                          {job.aspectRatio}
                        </Badge>
                      </div>

                      {/* Metadados e Fila */}
                      <div className="flex items-center gap-2 text-body-sm text-body-sm text-on-surface-variant flex-wrap font-mono tabular-nums">
                        <span>Duração: <strong className="text-on-surface">{job.durationFormatted}</strong></span>
                        <span className="text-outline">•</span>
                        <span className="text-primary font-semibold font-sans">{job.queueName}</span>
                        <span className="text-outline">•</span>
                        <span>{job.createdAt}</span>
                        <span className="text-outline">•</span>
                        <span className="text-outline text-[11px]">{job.id}</span>
                      </div>

                      {/* Barra de Progresso Linear Âmbar em Renderização */}
                      {(isRendering || isDownloading) && (
                        <div className="flex items-center gap-3 w-full max-w-md mt-1">
                          <div className="flex-1 bg-surface-container-highest h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500 rounded-full"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-label-sm font-label-sm font-bold text-primary font-mono tabular-nums min-w-[38px]">
                            {job.progress}%
                          </span>
                        </div>
                      )}

                      {/* Log Sanitizado de Falha */}
                      {isFailed && job.errorLog && (
                        <div className="flex items-center gap-2 text-label-sm font-label-sm text-error mt-0.5">
                          <span className="truncate max-w-lg">{job.errorLog}</span>
                          <button
                            type="button"
                            onClick={() => setErrorDrawerJob(job)}
                            className="text-primary hover:underline font-semibold cursor-pointer shrink-0"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge + Ações */}
                  <div className="flex items-center gap-3 self-end lg:self-center shrink-0 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-surface-container-highest/60">
                    {/* Badge de Status */}
                    <div>
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-label-sm font-label-sm font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Concluído
                        </span>
                      )}
                      {isRendering && (
                        <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-label-sm font-label-sm font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Renderizando FFmpeg
                        </span>
                      )}
                      {isDownloading && (
                        <span className="px-2.5 py-1 rounded-full bg-secondary/20 text-secondary text-label-sm font-label-sm font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          Baixando Mídia
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-label-sm font-label-sm font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                          Na Fila
                        </span>
                      )}
                      {isFailed && (
                        <span className="px-2.5 py-1 rounded-full bg-error-container/40 text-error text-label-sm font-label-sm font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          Falha no Processamento
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5">
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

                      {isFailed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryJob(job)}
                          leftIcon={
                            <span className="material-symbols-outlined text-[16px]">
                              replay
                            </span>
                          }
                        >
                          Tentar Novamente
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('studio', { selectedVideos: job.id })}
                        title="Abrir configurações no Studio"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          tune
                        </span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => setDeleteModalJobId(job.id)}
                        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                        title="Excluir job do histórico"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* ================= ESTADO VAZIO USANDO <EmptyState> ================= */
          <EmptyState
            icon="history_toggle_off"
            title="Nenhum job de renderização no histórico"
            description="Selecione mídias na Varredura de Canais e envie para o Studio para processar cortes e queimar legendas em fila."
            suggestionsTitle="Ações recomendadas para começar:"
            suggestions={[
              {
                label: 'Ir para Varredura de Canais',
                onClick: () => navigate('scraper'),
              },
              {
                label: 'Abrir Studio de Edição',
                onClick: () => navigate('studio'),
              },
              {
                label: 'Carregar Jobs de Demonstração',
                onClick: () => setJobs(INITIAL_QUEUE_ITEMS),
              },
            ]}
          />
        )}

        {/* Modal de Confirmação de Exclusão */}
        {deleteModalJobId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-sm p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Excluir Registro de Job?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                O registro será removido da listagem. Se houver arquivos gerados no storage, eles também serão desalocados.
              </p>
              <div className="flex items-center gap-2 w-full mt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setDeleteModalJobId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleDeleteJob(deleteModalJobId)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Drawer / Modal de Detalhes de Erro do FFmpeg */}
        {errorDrawerJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-lg p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-error">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    Log Sanitizado de Falha FFmpeg
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorDrawerJob(null)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-title-sm text-title-sm font-semibold text-on-surface">
                  {errorDrawerJob.title}
                </span>
                <span className="font-mono text-label-sm text-outline">
                  Job ID: {errorDrawerJob.id} • Fila: {errorDrawerJob.queueName}
                </span>
                <pre className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-highest font-mono text-[12px] text-error overflow-x-auto whitespace-pre-wrap">
                  {errorDrawerJob.errorLog || 'Erro desconhecido durante execução de filtros FFmpeg.'}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => setErrorDrawerJob(null)}
                >
                  Fechar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleRetryJob(errorDrawerJob);
                    setErrorDrawerJob(null);
                  }}
                  leftIcon={
                    <span className="material-symbols-outlined text-[16px]">replay</span>
                  }
                >
                  Reprocessar Job
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
};
