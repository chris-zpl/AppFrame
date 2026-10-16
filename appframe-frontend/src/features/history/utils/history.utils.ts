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

export const formatDuration = (job: VideoJobItem): string => {
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

export const getThumbnailUrl = (job: VideoJobItem): string | null => {
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
