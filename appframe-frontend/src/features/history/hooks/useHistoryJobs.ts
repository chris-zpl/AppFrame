import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mediaService } from '../services';
import type { VideoJobItem, HistoryFilterType } from '../types';
import { filterHistoryJobs } from '../utils';

const VALID_HISTORY_FILTERS: Record<string, HistoryFilterType> = {
  all: 'all',
  todos: 'all',
  processing: 'processing',
  andamento: 'processing',
  processando: 'processing',
  completed: 'completed',
  concluidos: 'completed',
  concluido: 'completed',
  prontos: 'completed',
  expired: 'expired',
  expirados: 'expired',
  expirado: 'expired',
  failed: 'failed',
  falhas: 'failed',
  falha: 'failed',
  erros: 'failed',
  erro: 'failed',
};

function resolveHistoryFilter(searchParams: URLSearchParams): HistoryFilterType {
  const raw = (
    searchParams.get('filter') ||
    searchParams.get('tab') ||
    searchParams.get('status') ||
    ''
  ).toLowerCase();
  return VALID_HISTORY_FILTERS[raw] || 'all';
}

export const useHistoryJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilterState] = useState<HistoryFilterType>(() => resolveHistoryFilter(searchParams));

  const setFilter = useCallback(
    (nextFilter: HistoryFilterType) => {
      setFilterState(nextFilter);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextFilter === 'all') {
            next.delete('filter');
            next.delete('tab');
            next.delete('status');
          } else {
            next.set('filter', nextFilter);
            next.delete('tab');
            next.delete('status');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Sincroniza filter se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    const nextFilter = resolveHistoryFilter(searchParams);
    if (nextFilter !== filter) {
      setFilterState(nextFilter);
    }
  }, [searchParams]);

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

  const filteredJobs = filterHistoryJobs(jobs, filter);

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

  return {
    jobs,
    filteredJobs,
    isLoading,
    filter,
    setFilter,
    errorDrawerJob,
    setErrorDrawerJob,
    jobToDelete,
    setJobToDelete,
    deletingJobId,
    handleDownloadVideo,
    handleDeleteJob,
    refetch,
  };
};
