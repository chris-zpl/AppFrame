import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  mediaService,
  type VideoJobItem,
  type HistoryFilterType,
  HistoryFilterTabs,
  HistoryJobCard,
  HistoryErrorModal,
} from '../features/history';

export const HistoryPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const [filter, setFilter] = useState<HistoryFilterType>('all');
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
      <div className="flex flex-col w-full text-on-surface pb-12">
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
        <HistoryFilterTabs
          filter={filter}
          onFilterChange={setFilter}
          jobs={jobs}
        />

        {/* ================= TABELA / LISTA DE JOBS ================= */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Carregando fila de jobs...</span>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredJobs.map((job) => (
              <HistoryJobCard
                key={job.id}
                job={job}
                deletingJobId={deletingJobId}
                onDownload={handleDownloadVideo}
                onViewError={setErrorDrawerJob}
                onDelete={setJobToDelete}
              />
            ))}
          </div>
        ) : (
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
        <HistoryErrorModal
          job={errorDrawerJob}
          onClose={() => setErrorDrawerJob(null)}
        />

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
