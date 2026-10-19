import type { ScrapedVideoCardData, ChannelMeta } from '../types';

export const formatDurationAccumulated = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
};

export function calculatePageNumbers(
  currentPage: number,
  totalPages: number
): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis-start');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('ellipsis-end');

  pages.push(totalPages);
  return pages;
}

export interface MappedScanResult {
  videos: ScrapedVideoCardData[];
  channelMeta: ChannelMeta;
  targetVideo?: ScrapedVideoCardData;
  shortsCount: number;
  longCount: number;
  wasLiveInput?: boolean;
  wasMembersOnlyInput?: boolean;
}

export function mapScannedItems(items: any[], cleanUrl: string): MappedScanResult {
  const filteredInputItems = items.filter(
    (it) =>
      !it.isMembersOnly &&
      !/(?:só|so|exclusivo|apenas)\s+para\s+membros|^\[membros\]/i.test(it.title || ''),
  );

  const mappedVideos: ScrapedVideoCardData[] = filteredInputItems.map((it) => {
    const isShort = Boolean(it.isShort ?? it.is_short);
    const durationSeconds = it.durationSeconds ?? it.duration_seconds ?? it.duration ?? 0;
    let durationFormatted =
      it.durationFormatted || it.timestamp_formatted || '00:00';
    if (
      durationSeconds > 0 &&
      (!durationFormatted || durationFormatted === '00:00' || (durationFormatted === '01:00' && durationSeconds !== 60))
    ) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    const thumbnailUrl =
      it.thumbnailUrl || it.thumbnail_url || `https://i.ytimg.com/vi/${it.id}/hqdefault.jpg`;
    const url =
      it.url ||
      (isShort
        ? `https://www.youtube.com/shorts/${it.id}`
        : `https://www.youtube.com/watch?v=${it.id}`);

    return {
      id: it.id,
      url,
      title: it.title || 'Sem título',
      thumbnailUrl,
      durationFormatted,
      durationSeconds,
      isShort,
      publishedText: it.publishedAt || 'Recente',
      viewsText: it.viewCount,
      isTargetVideo: Boolean(it.isTargetVideo || it.selected),
    };
  });

  const shortsCount = mappedVideos.filter((v) => v.isShort).length;
  const longCount = mappedVideos.filter((v) => !v.isShort).length;

  const titleItem = items.find(
    (it) => it.channelTitle && it.channelTitle.trim().length > 0,
  );
  let channelName = titleItem?.channelTitle || items[0]?.channelTitle;
  if (!channelName) {
    channelName = cleanUrl
      .replace(/https?:\/\/(www\.)?youtube\.com\//, '')
      .replace(/\/$/, '')
      .replace(/\/(videos|shorts)$/, '');
    if (!channelName.startsWith('@') && !channelName.startsWith('channel/')) {
      channelName = `@${channelName}`;
    }
  }

  const avatarItem = items.find(
    (it) => it.channelAvatarUrl && it.channelAvatarUrl.trim().length > 0,
  );
  const avatarUrl = avatarItem?.channelAvatarUrl;

  const videoMatch = cleanUrl.match(
    /(?:(?:v|vi)=|\/(?:v|vi|shorts|live|embed)\/|youtu\.be\/|\/watch\?v=)([\w-]{11})/i,
  );
  const targetVideoId = videoMatch ? videoMatch[1] : null;

  const wasLiveInput =
    Boolean(items.some((it) => it?.wasLiveInput)) ||
    /\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(cleanUrl);

  const wasMembersOnlyInput = Boolean(items.some((it) => it?.wasMembersOnlyInput));

  const targetVideo = wasLiveInput || wasMembersOnlyInput
    ? undefined
    : mappedVideos.find(
        (v) => v.isTargetVideo || (targetVideoId && v.id === targetVideoId),
      );

  const totalVideosItem = items.find(
    (it) => typeof it.channelTotalVideos === 'number' && it.channelTotalVideos > 0,
  );
  const totalChannelVideos = totalVideosItem?.channelTotalVideos ?? items[0]?.channelTotalVideos;

  const totalRegularItem = items.find(
    (it) => typeof it.channelTotalRegularVideos === 'number' && it.channelTotalRegularVideos >= 0,
  );
  const totalRegularVideos = totalRegularItem?.channelTotalRegularVideos ?? items[0]?.channelTotalRegularVideos;

  const totalShortsItem = items.find(
    (it) => typeof it.channelTotalShorts === 'number' && it.channelTotalShorts >= 0,
  );
  const totalShorts = totalShortsItem?.channelTotalShorts ?? items[0]?.channelTotalShorts;

  const effectiveShortsCount = typeof totalShorts === 'number' ? totalShorts : shortsCount;
  const effectiveLongCount = typeof totalRegularVideos === 'number' ? totalRegularVideos : longCount;

  return {
    videos: mappedVideos,
    channelMeta: {
      name: channelName,
      avatarUrl,
      totalIndexed: mappedVideos.length,
      shortsCount: effectiveShortsCount,
      longCount: effectiveLongCount,
      totalChannelVideos,
      totalRegularVideos,
      totalShorts,
    },
    targetVideo,
    shortsCount: effectiveShortsCount,
    longCount: effectiveLongCount,
    wasLiveInput,
    wasMembersOnlyInput,
  };
}
