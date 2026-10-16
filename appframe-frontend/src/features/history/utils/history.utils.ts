import type { VideoJobItem, HistoryFilterType } from '../interfaces';

export function filterHistoryJobs(jobs: VideoJobItem[], filter: HistoryFilterType): VideoJobItem[] {
  return jobs.filter((j) => {
    const st = String(j.status || '').toUpperCase();
    if (filter === 'processing') {
      return st === 'RENDERING' || st === 'DOWNLOADING' || st === 'PENDING';
    }
    if (filter === 'completed') return st === 'COMPLETED';
    if (filter === 'failed') return st === 'FAILED';
    return true;
  });
}
