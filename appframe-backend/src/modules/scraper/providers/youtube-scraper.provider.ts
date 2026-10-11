import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { IVideoScraperProvider } from '../interfaces/video-scraper-provider.interface';
import { ScrapedMediaItem } from '../interfaces/scraped-media-item.interface';

@Injectable()
export class YouTubeScraperProvider implements IVideoScraperProvider {
  readonly providerName = 'youtube';
  private readonly logger = new Logger(YouTubeScraperProvider.name);

  canHandle(channelUrl: string): boolean {
    if (!channelUrl) return false;
    const trimmed = channelUrl.trim().toLowerCase();
    return (
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      trimmed.startsWith('@') ||
      !trimmed.includes('/') // handles simple channel names like "google"
    );
  }

  /**
   * Converte segundos inteiros para o formato estrito HH:MM:SS
   */
  formatTimestamp(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Converte segundos inteiros para o formato de exibição MM:SS ou HH:MM:SS
   */
  formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Converte strings de tempo do YouTube (ex: "3:45", "1:15:20", "0:45") para segundos
   */
  parseDurationToSeconds(durationStr?: string): number {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map((p) => parseInt(p.trim(), 10));
    if (parts.some((n) => isNaN(n))) return 0;

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }

  /**
   * Normaliza URLs ou @handles para o link canônico do canal no YouTube
   */
  normalizeChannelUrl(input: string): string {
    let clean = input.trim().replace(/\/$/, '');
    clean = clean.replace(/\/(videos|shorts|featured|streams)$/, '');
    if (clean.startsWith('@')) {
      return `https://www.youtube.com/${clean}`;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      return `https://www.youtube.com/@${clean}`;
    }
    return clean;
  }

  /**
   * Extrai vídeos regulares e Shorts do canal
   */
  async scanChannel(channelUrl: string): Promise<ScrapedMediaItem[]> {
    const baseUrl = this.normalizeChannelUrl(channelUrl);
    this.logger.log(`Escaneando canal do YouTube: ${baseUrl}`);

    const itemsMap = new Map<string, ScrapedMediaItem>();
    let tabNotFoundCount = 0;

    try {
      // 1. Coleta vídeos regulares (/videos)
      const videosUrl = `${baseUrl}/videos`;
      const regularResult = await this.scrapeTab(videosUrl, false);
      if (regularResult.notFound) {
        tabNotFoundCount++;
      } else {
        for (const item of regularResult.items) {
          itemsMap.set(item.id, item);
        }
      }

      // 2. Coleta Shorts recentes (/shorts)
      const shortsUrl = `${baseUrl}/shorts`;
      const shortsResult = await this.scrapeTab(shortsUrl, true);
      if (shortsResult.notFound) {
        tabNotFoundCount++;
      } else {
        for (const item of shortsResult.items) {
          if (!itemsMap.has(item.id)) {
            itemsMap.set(item.id, item);
          }
        }
      }

      // Se ambas as abas retornaram 404
      if (tabNotFoundCount === 2) {
        throw new NotFoundException(
          'Canal não encontrado no YouTube. Verifique o @handle ou URL informada.',
        );
      }

      const results = Array.from(itemsMap.values());
      if (results.length === 0) {
        throw new NotFoundException(
          'Nenhum vídeo ou Short público encontrado para este canal.',
        );
      }

      this.logger.log(
        `Canal escaneado com sucesso. ${results.length} itens extraídos (${results.filter((i) => i.isShort).length} Shorts).`,
      );
      return results;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao escanear canal do YouTube (${baseUrl}): ${error.message}`);
      throw new BadRequestException(
        `Falha ao extrair mídias do canal do YouTube: ${error.message}`,
      );
    }
  }

  /**
   * Realiza o scraping de uma aba específica (Videos ou Shorts) através do ytInitialData
   */
  private async scrapeTab(
    url: string,
    isShortTab: boolean,
  ): Promise<{ items: ScrapedMediaItem[]; notFound: boolean }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (response.status === 404) {
        this.logger.warn(`Canal/aba não encontrado(a): ${url} (404)`);
        return { items: [], notFound: true };
      }

      if (!response.ok) {
        this.logger.warn(`Requisição HTTP falhou para ${url} com status ${response.status}`);
        return { items: [], notFound: false };
      }

      const html = await response.text();
      const items = this.parseInitialDataFromHtml(html, isShortTab);
      return { items, notFound: false };
    } catch (err: any) {
      this.logger.warn(`Erro ao baixar página ${url}: ${err.message}`);
      return { items: [], notFound: false };
    }
  }

  /**
   * Extrai e faz o parsing seguro do JSON ytInitialData embutido no HTML
   */
  private parseInitialDataFromHtml(
    html: string,
    isShortTab: boolean,
  ): ScrapedMediaItem[] {
    const regex = /(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*({.+?});<\/script>/s;
    const match = html.match(regex);

    if (!match || !match[1]) {
      return [];
    }

    try {
      const data = JSON.parse(match[1]);
      return this.extractItemsFromData(data, isShortTab);
    } catch (e: any) {
      this.logger.warn(`Falha no parsing JSON do ytInitialData: ${e.message}`);
      return [];
    }
  }

  /**
   * Percorre recursivamente os renderers do YouTube para extrair vídeos e Shorts
   */
  private extractItemsFromData(
    data: any,
    isShortTab: boolean,
  ): ScrapedMediaItem[] {
    const results: ScrapedMediaItem[] = [];
    const visitedIds = new Set<string>();

    const traverse = (node: any) => {
      if (!node || typeof node !== 'object') return;

      // 1. YouTube Modern LockupViewModel (2024-2026) para vídeos regulares
      if (node.lockupViewModel) {
        const lockup = node.lockupViewModel;
        const id = lockup.contentId;
        if (id && !visitedIds.has(id)) {
          visitedIds.add(id);

          const title =
            lockup.metadata?.lockupMetadataViewModel?.title?.content ||
            'Sem título';

          const badge =
            lockup.contentImage?.thumbnailViewModel?.overlays?.[0]
              ?.thumbnailBottomOverlayViewModel?.badges?.[0]
              ?.thumbnailBadgeViewModel;

          const durationText = badge?.text || '00:00';
          const durationSeconds = this.parseDurationToSeconds(durationText);
          const durationFormatted = this.formatDuration(durationSeconds);
          const timestampFormatted = this.formatTimestamp(durationSeconds);

          const sources =
            lockup.contentImage?.thumbnailViewModel?.image?.sources || [];
          const thumb =
            sources.length > 0
              ? sources[sources.length - 1].url
              : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          const thumbnailUrl = thumb.startsWith('//') ? `https:${thumb}` : thumb;

          const isShort = isShortTab || durationSeconds <= 60;

          results.push({
            id,
            url: isShort
              ? `https://www.youtube.com/shorts/${id}`
              : `https://www.youtube.com/watch?v=${id}`,
            title,
            thumbnailUrl,
            thumbnail_url: thumbnailUrl,
            durationSeconds,
            duration_seconds: durationSeconds,
            durationFormatted,
            timestamp_formatted: timestampFormatted,
            isShort,
            is_short: isShort,
          });
        }
      }

      // 2. YouTube Modern ShortsLockupViewModel (2024-2026) para Shorts
      if (node.shortsLockupViewModel) {
        const short = node.shortsLockupViewModel;
        let id = short.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
        if (!id && short.entityId) {
          id = short.entityId.replace(/^shorts-shelf-item-/, '');
        }

        if (id && !visitedIds.has(id)) {
          visitedIds.add(id);

          const title =
            short.overlayMetadata?.primaryText?.content ||
            short.accessibilityText?.split(',')?.[0]?.trim() ||
            'Short do YouTube';

          const sources = short.thumbnail?.sources || [];
          const thumb =
            sources.length > 0
              ? sources[sources.length - 1].url
              : `https://i.ytimg.com/vi/${id}/frame0.jpg`;
          const thumbnailUrl = thumb.startsWith('//') ? `https:${thumb}` : thumb;

          const durationSeconds = 60;
          const durationFormatted = '01:00';
          const timestampFormatted = '00:01:00';

          results.push({
            id,
            url: `https://www.youtube.com/shorts/${id}`,
            title,
            thumbnailUrl,
            thumbnail_url: thumbnailUrl,
            durationSeconds,
            duration_seconds: durationSeconds,
            durationFormatted,
            timestamp_formatted: timestampFormatted,
            isShort: true,
            is_short: true,
          });
        }
      }

      // 3. Renderizador de vídeo legado (richItemRenderer ou videoRenderer ou gridVideoRenderer)
      const videoRenderer =
        node.videoRenderer ||
        node.gridVideoRenderer ||
        node.compactVideoRenderer;

      if (videoRenderer && videoRenderer.videoId) {
        const id = videoRenderer.videoId;
        if (!visitedIds.has(id)) {
          visitedIds.add(id);

          const title =
            videoRenderer.title?.runs?.[0]?.text ||
            videoRenderer.title?.simpleText ||
            'Sem título';

          const durationText =
            videoRenderer.lengthText?.simpleText ||
            videoRenderer.lengthText?.runs?.[0]?.text ||
            videoRenderer.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)
              ?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
            '00:00';

          const durationSeconds = this.parseDurationToSeconds(durationText);
          const durationFormatted = this.formatDuration(durationSeconds);
          const timestampFormatted = this.formatTimestamp(durationSeconds);

          const bestThumb =
            videoRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          const thumbnailUrl = bestThumb.startsWith('//') ? `https:${bestThumb}` : bestThumb;

          const isShort = isShortTab || durationSeconds <= 60;

          results.push({
            id,
            url: isShort
              ? `https://www.youtube.com/shorts/${id}`
              : `https://www.youtube.com/watch?v=${id}`,
            title,
            thumbnailUrl,
            thumbnail_url: thumbnailUrl,
            durationSeconds,
            duration_seconds: durationSeconds,
            durationFormatted,
            timestamp_formatted: timestampFormatted,
            isShort,
            is_short: isShort,
          });
        }
      }

      // 4. Renderizador específico de Shorts legado (reelItemRenderer)
      const reelRenderer = node.reelItemRenderer;
      if (reelRenderer && reelRenderer.videoId) {
        const id = reelRenderer.videoId;
        if (!visitedIds.has(id)) {
          visitedIds.add(id);

          const title =
            reelRenderer.headline?.simpleText ||
            reelRenderer.headline?.runs?.[0]?.text ||
            'Short do YouTube';

          const durationSeconds = 60;
          const durationFormatted = '01:00';
          const timestampFormatted = '00:01:00';

          const bestThumb =
            reelRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          const thumbnailUrl = bestThumb.startsWith('//') ? `https:${bestThumb}` : bestThumb;

          results.push({
            id,
            url: `https://www.youtube.com/shorts/${id}`,
            title,
            thumbnailUrl,
            thumbnail_url: thumbnailUrl,
            durationSeconds,
            duration_seconds: durationSeconds,
            durationFormatted,
            timestamp_formatted: timestampFormatted,
            isShort: true,
            is_short: true,
          });
        }
      }

      // Percorre listas de filhos
      if (Array.isArray(node)) {
        for (const item of node) traverse(item);
      } else {
        for (const key of Object.keys(node)) {
          traverse(node[key]);
        }
      }
    };

    traverse(data);
    return results;
  }
}
