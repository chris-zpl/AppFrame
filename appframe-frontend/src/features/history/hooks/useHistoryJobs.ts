import { useState, useEffect, useCallback, useMemo } from 'react';
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

  const [page, setPageState] = useState<number>(() => {
    const p = Number(searchParams.get('page'));
    return Number.isInteger(p) && p > 0 ? p : 1;
  });

  const [pageSize, setPageSizeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('appframe_history_page_size');
      const num = Number(saved);
      return PAGE_SIZE_OPTIONS.includes(num) ? num : 10;
    } catch {
      return 10;
    }
  });

  const setFilter = useCallback(
    (nextFilter: HistoryFilterType) => {
      setFilterState(nextFilter);
      setPageState(1);
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
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Sincroniza filter e page se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    const nextFilter = resolveHistoryFilter(searchParams);
    if (nextFilter !== filter) {
      setFilterState(nextFilter);
    }
    const rawPage = Number(searchParams.get('page'));
    const nextPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    if (nextPage !== page) {
      setPageState(nextPage);
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

  const filteredJobs = useMemo(() => filterHistoryJobs(jobs, filter), [jobs, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Ajusta a página caso ultrapasse o total de páginas após filtros ou exclusões
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  const paginatedJobs = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredJobs.slice(startIndex, startIndex + pageSize);
  }, [filteredJobs, safePage, pageSize]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPageState(newPage);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newPage <= 1) {
            next.delete('page');
          } else {
            next.set('page', String(newPage));
          }
          return next;
        },
        { replace: true }
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSizeState(newSize);
      setPageState(1);
      try {
        localStorage.setItem('appframe_history_page_size', String(newSize));
      } catch {}
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

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
    paginatedJobs,
    page: safePage,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
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
