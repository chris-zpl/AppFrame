import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
      trimmed.startsWith('@')
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
    let clean = input.trim();
    if (clean.startsWith('@')) {
      return `https://www.youtube.com/${clean}`;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://www.youtube.com/@${clean}`;
    }
    return clean.replace(/\/$/, '');
  }

  /**
   * Extrai vídeos regulares e Shorts do canal
   */
  async scanChannel(channelUrl: string): Promise<ScrapedMediaItem[]> {
    const baseUrl = this.normalizeChannelUrl(channelUrl);
    this.logger.log(`Escaneando canal do YouTube: ${baseUrl}`);

    const itemsMap = new Map<string, ScrapedMediaItem>();

    try {
      // 1. Coleta vídeos regulares (/videos)
      const videosUrl = baseUrl.endsWith('/videos') ? baseUrl : `${baseUrl}/videos`;
      const regularVideos = await this.scrapeTab(videosUrl, false);
      for (const item of regularVideos) {
        itemsMap.set(item.id, item);
      }

      // 2. Coleta Shorts recentes (/shorts)
      const shortsUrl = baseUrl.endsWith('/shorts')
        ? baseUrl
        : `${baseUrl.replace(/\/videos$/, '')}/shorts`;
      const shortsVideos = await this.scrapeTab(shortsUrl, true);
      for (const item of shortsVideos) {
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, item);
        }
      }

      const results = Array.from(itemsMap.values());
      this.logger.log(
        `Canal escaneado com sucesso. ${results.length} itens extraídos (${results.filter((i) => i.is_short).length} Shorts).`,
      );
      return results;
    } catch (error: any) {
      this.logger.error(`Erro ao escanear canal do YouTube (${baseUrl}): ${error.message}`);
      throw new BadRequestException(
        `Falha ao extrair mídias do canal do YouTube: ${error.message}`,
      );
    }
  }

  /**
   * Realiza o scraping de uma aba específica (Videos ou Shorts) através do ytInitialData
   */
  private async scrapeTab(url: string, isShortTab: boolean): Promise<ScrapedMediaItem[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Requisição HTTP falhou para ${url} com status ${response.status}`);
        return [];
      }

      const html = await response.text();
      return this.parseInitialDataFromHtml(html, isShortTab);
    } catch (err: any) {
      this.logger.warn(`Erro ao baixar página ${url}: ${err.message}`);
      return [];
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

      // Renderizador de vídeo padrão (richItemRenderer ou videoRenderer ou gridVideoRenderer)
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
          const timestampFormatted = this.formatTimestamp(durationSeconds);

          const bestThumb =
            videoRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

          results.push({
            id,
            url: `https://www.youtube.com/watch?v=${id}`,
            title,
            duration_seconds: durationSeconds,
            timestamp_formatted: timestampFormatted,
            thumbnail_url: bestThumb.startsWith('//') ? `https:${bestThumb}` : bestThumb,
            is_short: isShortTab || durationSeconds <= 60,
          });
        }
      }

      // Renderizador específico de Shorts (reelItemRenderer)
      const reelRenderer = node.reelItemRenderer;
      if (reelRenderer && reelRenderer.videoId) {
        const id = reelRenderer.videoId;
        if (!visitedIds.has(id)) {
          visitedIds.add(id);

          const title =
            reelRenderer.headline?.simpleText ||
            reelRenderer.headline?.runs?.[0]?.text ||
            'Short do YouTube';

          // Shorts do YouTube têm duração máxima de 60s
          const durationSeconds = 60;
          const timestampFormatted = this.formatTimestamp(durationSeconds);

          const bestThumb =
            reelRenderer.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

          results.push({
            id,
            url: `https://www.youtube.com/shorts/${id}`,
            title,
            duration_seconds: durationSeconds,
            timestamp_formatted: timestampFormatted,
            thumbnail_url: bestThumb.startsWith('//') ? `https:${bestThumb}` : bestThumb,
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
