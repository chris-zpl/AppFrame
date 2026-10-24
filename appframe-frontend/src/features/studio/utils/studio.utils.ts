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

export type StudioVideoIdentifierInput =
  | { id?: string; url?: string; sourceUrl?: string }
  | string
  | null
  | undefined;

const YT_VIDEO_ID_REGEX =
  /(?:[?&]v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const EXACT_YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extrai e normaliza o identificador único do vídeo (priorizando o Video ID de 11 caracteres do YouTube),
 * garantindo que URLs brutas nunca gerem chaves duplicadas no localStorage.
 */
export function extractNormalizedVideoId(
  videoOrUrl: StudioVideoIdentifierInput
): string | null {
  if (!videoOrUrl) return null;

  const rawId =
    typeof videoOrUrl === 'string'
      ? videoOrUrl.trim()
      : (videoOrUrl.id || '').trim();
  const rawUrl =
    typeof videoOrUrl === 'string'
      ? videoOrUrl.trim()
      : (videoOrUrl.url || videoOrUrl.sourceUrl || '').trim();

  // 1. Se o próprio ID já for um ID canônico de 11 caracteres do YouTube
  if (rawId && rawId !== 'selected-1' && EXACT_YT_ID_REGEX.test(rawId)) {
    return rawId;
  }

  // 2. Tenta extrair o ID de 11 caracteres do YouTube a partir da URL ou do campo id (caso contenha URL)
  const fromUrlMatch = rawUrl.match(YT_VIDEO_ID_REGEX);
  if (fromUrlMatch && fromUrlMatch[1]) {
    return fromUrlMatch[1];
  }

  const fromIdMatch = rawId.match(YT_VIDEO_ID_REGEX);
  if (fromIdMatch && fromIdMatch[1]) {
    return fromIdMatch[1];
  }

  // 3. Se houver um ID explícito válido que não seja placeholder nem URL bruta
  if (
    rawId &&
    rawId !== 'selected-1' &&
    !/^https?:\/\//i.test(rawId)
  ) {
    return rawId;
  }

  // 4. Fallback determinístico para URLs que não sejam do YouTube (sem protocolo bruto)
  const fallbackTarget = rawUrl || rawId;
  if (!fallbackTarget || fallbackTarget === 'selected-1') {
    return null;
  }

  return fallbackTarget
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 64);
}

export function getStudioStorageKey(
  video: StudioVideoIdentifierInput
): string | null {
  const normalizedId = extractNormalizedVideoId(video);
  return normalizedId ? `appframe_studio_state_${normalizedId}` : null;
}

function getLegacyStorageKeys(
  video: StudioVideoIdentifierInput,
  primaryKey: string
): string[] {
  if (!video || typeof video === 'string') return [];
  const legacyKeys = new Set<string>();
  const rawId = (video.id || '').trim();
  const rawUrl = (video.url || video.sourceUrl || '').trim();

  if (rawId) {
    const idKey = `appframe_studio_state_${rawId}`;
    if (idKey !== primaryKey) legacyKeys.add(idKey);
  }
  if (rawUrl) {
    const urlKey = `appframe_studio_state_${rawUrl}`;
    if (urlKey !== primaryKey) legacyKeys.add(urlKey);
  }
  return Array.from(legacyKeys);
}

export function getSavedStudioState(
  video: StudioVideoIdentifierInput
): any {
  const primaryKey = getStudioStorageKey(video);
  if (!primaryKey) return null;

  const legacyKeys = getLegacyStorageKeys(video, primaryKey);

  try {
    // 1. Busca primeiro na chave canônica unificada: appframe_studio_state_<VIDEO_ID>
    const primaryRaw = localStorage.getItem(primaryKey);
    if (primaryRaw) {
      // Limpa eventuais chaves legadas duplicadas (ex: com URL bruta)
      for (const lk of legacyKeys) {
        localStorage.removeItem(lk);
      }
      const parsed = JSON.parse(primaryRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    // 2. Migração transparente: se existir apenas na chave legada (URL bruta), migra para a canônica e apaga a duplicada
    for (const lk of legacyKeys) {
      const legacyRaw = localStorage.getItem(lk);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem(primaryKey, legacyRaw);
          for (const toClean of legacyKeys) {
            localStorage.removeItem(toClean);
          }
          return parsed;
        }
      }
    }
  } catch {}

  return null;
}

export function saveStudioState(
  video: StudioVideoIdentifierInput,
  state: any
): void {
  const primaryKey = getStudioStorageKey(video);
  if (!primaryKey) return;

  try {
    const payload = {
      ...(state && typeof state === 'object' ? state : {}),
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    // Grava exclusivamente na chave canônica normalizada (appframe_studio_state_<VIDEO_ID>)
    localStorage.setItem(primaryKey, serialized);

    // Remove quaisquer chaves legadas duplicadas (ex: appframe_studio_state_https://...)
    const legacyKeys = getLegacyStorageKeys(video, primaryKey);
    for (const lk of legacyKeys) {
      localStorage.removeItem(lk);
    }
  } catch {}
}

/**
 * Higienização automática de rascunhos órfãos do Studio no LocalStorage.
 * Remove chaves que não possuem updatedAt ou que foram atualizadas há mais de `maxAgeDays` (padrão: 7 dias).
 */
export function purgeStaleStudioStates(maxAgeDays = 7): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let purgedCount = 0;

  try {
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('appframe_studio_state_')) {
        keysToCheck.push(key);
      }
    }

    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          localStorage.removeItem(key);
          purgedCount++;
          continue;
        }

        const parsed = JSON.parse(raw);
        const updatedAt = typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : null;
        if (!updatedAt || now - updatedAt > maxAgeMs) {
          localStorage.removeItem(key);
          purgedCount++;
        }
      } catch {
        localStorage.removeItem(key);
        purgedCount++;
      }
    }
  } catch {}

  return purgedCount;
}

export function removeStudioState(
  video: StudioVideoIdentifierInput
): void {
  const primaryKey = getStudioStorageKey(video);
  if (!primaryKey) return;

  try {
    localStorage.removeItem(primaryKey);
    const legacyKeys = getLegacyStorageKeys(video, primaryKey);
    for (const lk of legacyKeys) {
      localStorage.removeItem(lk);
    }
  } catch {}
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
