import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mediaService } from '../services';
import type { VideoJobItem, HistoryFilterType } from '../interfaces';
import { filterHistoryJobs } from '../utils';

export const useHistoryJobs = () => {
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
