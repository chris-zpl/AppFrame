import React from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { HistoryJobCard } from './HistoryJobCard';
import type { VideoJobItem } from '../types';

import { useHistoryContext } from '../context';

export interface HistoryJobListProps {
  jobs?: VideoJobItem[];
  isLoading?: boolean;
  deletingJobId?: string | null;
  onDownload?: (job: VideoJobItem) => void;
  onViewError?: (job: VideoJobItem) => void;
  onDelete?: (job: VideoJobItem) => void;
  onNavigateVarredura?: () => void;
  onNavigateStudio?: () => void;
}

export const HistoryJobList: React.FC<HistoryJobListProps> = (props) => {
  const history = useHistoryContext();

  const jobs = props.jobs ?? history.filteredJobs;
  const isLoading = props.isLoading ?? history.isLoading;
  const deletingJobId = props.deletingJobId !== undefined ? props.deletingJobId : history.deletingJobId;
  const onDownload = props.onDownload ?? history.handleDownloadVideo;
  const onViewError = props.onViewError ?? history.setErrorDrawerJob;
  const onDelete = props.onDelete ?? history.setJobToDelete;
  const onNavigateVarredura = props.onNavigateVarredura ?? (() => {});
  const onNavigateStudio = props.onNavigateStudio ?? (() => {});
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-neutral-600 dark:text-on-surface-variant text-sm">Carregando fila de jobs...</span>
      </div>
    );
  }

  if (jobs.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <HistoryJobCard
            key={job.id}
            job={job}
            deletingJobId={deletingJobId}
            onDownload={onDownload}
            onViewError={onViewError}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <EmptyState
      icon="history"
      title="Nenhum job de renderização encontrado"
      description="Quando você exportar cortes do Studio ou disparar downloads de canais na Varredura, o progresso aparecerá aqui em tempo real."
      suggestionsTitle="Comece agora:"
      suggestions={[
        {
          label: 'Ir para a Varredura de Canais',
          onClick: onNavigateVarredura,
        },
        {
          label: 'Abrir o Studio de Edição',
          onClick: onNavigateStudio,
        },
      ]}
    />
  );
};
