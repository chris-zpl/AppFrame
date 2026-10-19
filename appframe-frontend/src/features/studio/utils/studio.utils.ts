export function formatStudioTime(seconds: number, includeMs: boolean = false): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (includeMs) {
    return `${base}.${String(ms).padStart(3, '0')}`;
  }
  return base;
}

export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const w of words) {
    if (!w) continue;
    const testLine = currentLine ? `${currentLine} ${w}` : w;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export function getStudioStorageKey(video: { id?: string; url?: string } | null | undefined): string | null {
  if (!video) return null;
  const keyPart = video.id && video.id !== 'selected-1' ? video.id : (video.url || video.id);
  return keyPart ? `appframe_studio_state_${keyPart}` : null;
}

export function getSavedStudioState(video: { id?: string; url?: string } | null | undefined): any {
  if (!video) return null;
  const keysToTry: string[] = [];
  if (video.id) keysToTry.push(`appframe_studio_state_${video.id}`);
  if (video.url) keysToTry.push(`appframe_studio_state_${video.url}`);
  const ytMatch = video.url?.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1] && !keysToTry.includes(`appframe_studio_state_${ytMatch[1]}`)) {
    keysToTry.push(`appframe_studio_state_${ytMatch[1]}`);
  }
  for (const k of keysToTry) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }
  return null;
}

export function saveStudioState(video: { id?: string; url?: string } | null | undefined, state: any): void {
  if (!video) return;
  const primaryKey = getStudioStorageKey(video);
  if (!primaryKey) return;
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(primaryKey, serialized);
    if (video.url && primaryKey !== `appframe_studio_state_${video.url}`) {
      localStorage.setItem(`appframe_studio_state_${video.url}`, serialized);
    }
    if (video.id && video.id !== 'selected-1' && primaryKey !== `appframe_studio_state_${video.id}`) {
      localStorage.setItem(`appframe_studio_state_${video.id}`, serialized);
    }
  } catch {}
}

export function removeStudioState(video: { id?: string; url?: string } | null | undefined): void {
  if (!video) return;
  const keysToRemove: string[] = [];
  if (video.id) keysToRemove.push(`appframe_studio_state_${video.id}`);
  if (video.url) keysToRemove.push(`appframe_studio_state_${video.url}`);
  const ytMatch = video.url?.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) keysToRemove.push(`appframe_studio_state_${ytMatch[1]}`);
  for (const k of keysToRemove) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

export interface ActiveRenderJob {
  jobId: string;
  videoId?: string;
  originalTitle?: string;
  progress: number;
  status: string;
  startedAt: number;
}

const ACTIVE_JOB_KEY = 'appframe_active_render_job';

export function getActiveRenderJob(): ActiveRenderJob | null {
  try {
    const raw = localStorage.getItem(ACTIVE_JOB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.jobId && Date.now() - (parsed.startedAt || 0) < 30 * 60 * 1000) {
        return parsed;
      }
      localStorage.removeItem(ACTIVE_JOB_KEY);
    }
  } catch {}
  return null;
}

export function saveActiveRenderJob(job: ActiveRenderJob): void {
  try {
    localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(job));
  } catch {}
}

export function clearActiveRenderJob(): void {
  try {
    localStorage.removeItem(ACTIVE_JOB_KEY);
  } catch {}
}
