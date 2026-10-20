import React from 'react';
import type { HistoryFilterType, VideoJobItem } from '../types';
import { useHistoryContext } from '../context';
import { Tabs, type TabItem } from '../../../components/ui';

export interface HistoryFilterTabsProps {
  filter?: HistoryFilterType;
  onFilterChange?: (next: HistoryFilterType) => void;
  jobs?: VideoJobItem[];
}

export const HistoryFilterTabs: React.FC<HistoryFilterTabsProps> = (props) => {
  const history = useHistoryContext();

  const filter = props.filter ?? history.filter;
  const onFilterChange = props.onFilterChange ?? history.setFilter;
  const jobs = props.jobs ?? history.jobs;

  if (jobs.length === 0) return null;

  const processingCount = jobs.filter((j) => {
    const st = String(j.status || '').toUpperCase();
    return st === 'RENDERING' || st === 'DOWNLOADING' || st === 'PENDING';
  }).length;

  const completedCount = jobs.filter((j) => String(j.status || '').toUpperCase() === 'COMPLETED').length;
  const expiredCount = jobs.filter((j) => String(j.status || '').toUpperCase() === 'EXPIRED').length;
  const failedCount = jobs.filter((j) => String(j.status || '').toUpperCase() === 'FAILED').length;

  const tabs: TabItem[] = [
    {
      id: 'all',
      label: 'Todos',
      count: jobs.length,
    },
    {
      id: 'processing',
      label: 'Andamento',
      count: processingCount,
    },
    {
      id: 'completed',
      label: 'Concluídos',
      count: completedCount,
    },
    {
      id: 'expired',
      label: 'Expirados',
      count: expiredCount,
    },
    {
      id: 'failed',
      label: 'Falhas',
      count: failedCount,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-md">
      <Tabs
        tabs={tabs}
        activeTab={filter}
        onChange={(id) => onFilterChange(id as HistoryFilterType)}
        variant="pills"
        tabClassName="rounded-full"
        ariaLabel="Filtrar histórico por status"
      />
    </div>
  );
};
