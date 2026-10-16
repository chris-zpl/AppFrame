import React from 'react';
import { cn } from '../../../lib/utils';
import type { HistoryFilterType, VideoJobItem } from '../interfaces';

interface HistoryFilterTabsProps {
  filter: HistoryFilterType;
  onFilterChange: (next: HistoryFilterType) => void;
  jobs: VideoJobItem[];
}

export const HistoryFilterTabs: React.FC<HistoryFilterTabsProps> = ({
  filter,
  onFilterChange,
  jobs,
}) => {
  if (jobs.length === 0) return null;

  const processingCount = jobs.filter((j) => {
    const st = String(j.status || '').toUpperCase();
    return st === 'RENDERING' || st === 'DOWNLOADING' || st === 'PENDING';
  }).length;

  const completedCount = jobs.filter((j) => String(j.status || '').toUpperCase() === 'COMPLETED').length;
  const failedCount = jobs.filter((j) => String(j.status || '').toUpperCase() === 'FAILED').length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-md">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
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
          onClick={() => onFilterChange('processing')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
            filter === 'processing'
              ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
              : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
          )}
        >
          <span>Em Andamento</span>
          <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-label-sm font-label-sm">
            {processingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('completed')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
            filter === 'completed'
              ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
              : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
          )}
        >
          <span>Concluídos</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-label-sm font-label-sm">
            {completedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('failed')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer',
            filter === 'failed'
              ? 'bg-amber-400/20 text-[#0F1115] dark:text-primary border border-primary/40 shadow-sm font-bold'
              : 'bg-neutral-100 dark:bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-transparent'
          )}
        >
          <span>Falhas</span>
          <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 text-label-sm font-label-sm">
            {failedCount}
          </span>
        </button>
      </div>
    </div>
  );
};
