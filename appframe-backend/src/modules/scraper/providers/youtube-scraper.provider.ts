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
   * Extrai o ID de 11 caracteres de um vídeo ou Short do YouTube a partir da URL informada
   */
  extractVideoId(input: string): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    const match = trimmed.match(
      /(?:(?:v|vi)=|\/(?:v|vi|shorts|embed)\/|youtu\.be\/|\/watch\?v=)([\w-]{11})/i,
    );
    return match ? match[1] : null;
  }

  /**
   * Resolve o canal pai e os metadados do vídeo quando a URL fornecida é de um vídeo específico
   */
  async resolveChannelFromVideo(videoId: string): Promise<{
    channelUrl: string;
    channelTitle?: string;
    channelAvatarUrl?: string;
    video: {
      id: string;
      title: string;
      thumbnailUrl: string;
      durationSeconds: number;
      isShort: boolean;
    };
  } | null> {
    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      };

      const res = await fetch(watchUrl, { headers });
      if (!res.ok) return null;
      const html = await res.text();

      let channelUrl: string | null = null;
      let channelTitle: string | null = null;
      let channelAvatarUrl: string | null = null;
      let videoTitle = `Vídeo (${videoId})`;
      let durationSeconds = 0;
      let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      let isShort = false;

      // 1. Tenta ytInitialPlayerResponse
      const playerMatch = html.match(
        /(?:var\s+ytInitialPlayerResponse\s*=|window\["ytInitialPlayerResponse"\]\s*=)\s*({.+?});(?:var|<\/script>)/s,
      );
      if (playerMatch) {
        try {
          const pData = JSON.parse(playerMatch[1]);
          if (pData.videoDetails) {
            videoTitle = pData.videoDetails.title || videoTitle;
            channelTitle = pData.videoDetails.author || channelTitle;
            const secs = parseInt(pData.videoDetails.lengthSeconds, 10);
            if (!isNaN(secs)) durationSeconds = secs;
            const bestThumb = pData.videoDetails.thumbnail?.thumbnails?.slice(-1)?.[0]?.url;
            if (bestThumb) thumbnailUrl = bestThumb;
          }
          if (pData.microformat?.playerMicroformatRenderer) {
            const pm = pData.microformat.playerMicroformatRenderer;
            if (pm.ownerChannelName && !channelTitle) channelTitle = pm.ownerChannelName;
            if (pm.ownerProfileUrl) channelUrl = pm.ownerProfileUrl.replace('http://', 'https://');
          }
        } catch (e: any) {
          this.logger.warn(`Erro no parsing de ytInitialPlayerResponse: ${e.message}`);
        }
      }

      // 2. Extrações de fallback para canal via regex
      if (!channelUrl) {
        const ownerMatch = html.match(/"ownerProfileUrl":"([^"]+)"/);
        if (ownerMatch) channelUrl = ownerMatch[1].replace('http://', 'https://');
      }
      if (!channelUrl) {
        const canonMatch = html.match(/"canonicalBaseUrl":"([^"]+)"/);
        if (canonMatch) {
          const cleanBase = canonMatch[1].replace(/\/(shorts|videos)$/, '');
          channelUrl = `https://www.youtube.com${cleanBase}`;
        }
      }
      if (!channelUrl) {
        const channelIdMatch = html.match(/"channelId":"([^"]+)"/);
        if (channelIdMatch) channelUrl = `https://www.youtube.com/channel/${channelIdMatch[1]}`;
      }

      if (!channelTitle) {
        const authorMatch = html.match(/"author":"([^"]+)"/);
        if (authorMatch) channelTitle = authorMatch[1];
      }

      // 3. Avatar do canal
      const avatarMatch = html.match(
        /"videoOwnerRenderer":\{"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/,
      );
      if (avatarMatch) {
        channelAvatarUrl = avatarMatch[1];
      }

      // 4. Duração e verificação de Short
      if (durationSeconds <= 0) {
        const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (lengthMatch) durationSeconds = parseInt(lengthMatch[1], 10);
      }
      if (durationSeconds > 0 && durationSeconds <= 60) {
        isShort = true;
      }

      if (!channelUrl) return null;

      return {
        channelUrl,
        channelTitle: channelTitle || undefined,
        channelAvatarUrl: channelAvatarUrl || undefined,
        video: {
          id: videoId,
          title: videoTitle,
          thumbnailUrl,
          durationSeconds,
          isShort,
        },
      };
    } catch (err: any) {
      this.logger.warn(`Falha ao resolver canal a partir do vídeo ${videoId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Normaliza URLs ou @handles para o link canônico do canal no YouTube
   */
  normalizeChannelUrl(input: string): string {
    let clean = input.trim().replace(/\/$/, '');
    clean = clean.replace(/\/(videos|shorts|featured|streams)$/, '');
    if (clean.startsWith('http://')) {
      clean = clean.replace('http://', 'https://');
    }
    if (clean.startsWith('@')) {
      return `https://www.youtube.com/${clean}`;
    }
    if (!clean.startsWith('https://')) {
      return `https://www.youtube.com/@${clean}`;
    }
    return clean;
  }

  /**
   * Extrai vídeos regulares e Shorts do canal (ou a partir da URL de um vídeo específico)
   */
  async scanChannel(channelUrl: string): Promise<ScrapedMediaItem[]> {
    let resolvedTarget: {
      channelUrl: string;
      channelTitle?: string;
      channelAvatarUrl?: string;
      video: {
        id: string;
        title: string;
        thumbnailUrl: string;
        durationSeconds: number;
        isShort: boolean;
      };
    } | null = null;

    const targetVideoId = this.extractVideoId(channelUrl);
    if (targetVideoId) {
      this.logger.log(`URL de vídeo informada (${targetVideoId}). Resolvendo canal de origem...`);
      resolvedTarget = await this.resolveChannelFromVideo(targetVideoId);
      if (resolvedTarget) {
        this.logger.log(
          `Canal de origem resolvido: ${resolvedTarget.channelUrl} (${resolvedTarget.channelTitle || 'Sem título'})`,
        );
      }
    }

    const rawBaseUrl = resolvedTarget ? resolvedTarget.channelUrl : channelUrl;
    const baseUrl = this.normalizeChannelUrl(rawBaseUrl);
    this.logger.log(`Escaneando canal do YouTube: ${baseUrl}`);

    const itemsMap = new Map<string, ScrapedMediaItem>();
    let tabNotFoundCount = 0;
    let channelTitle = resolvedTarget?.channelTitle;
    let channelAvatarUrl = resolvedTarget?.channelAvatarUrl;

    try {
      const videosUrl = `${baseUrl}/videos`;
      const shortsUrl = `${baseUrl}/shorts`;

      // Coleta vídeos regulares (/videos) e Shorts (/shorts) em paralelo com paginação InnerTube
      const [regularResult, shortsResult] = await Promise.all([
        this.scrapeTab(videosUrl, false),
        this.scrapeTab(shortsUrl, true),
      ]);

      if (regularResult.notFound) {
        tabNotFoundCount++;
      } else {
        if (!channelTitle && regularResult.channelTitle) channelTitle = regularResult.channelTitle;
        if (!channelAvatarUrl && regularResult.channelAvatarUrl) channelAvatarUrl = regularResult.channelAvatarUrl;
        for (const item of regularResult.items) {
          itemsMap.set(item.id, item);
        }
      }

      if (shortsResult.notFound) {
        tabNotFoundCount++;
      } else {
        if (!channelTitle && shortsResult.channelTitle) channelTitle = shortsResult.channelTitle;
        if (!channelAvatarUrl && shortsResult.channelAvatarUrl) channelAvatarUrl = shortsResult.channelAvatarUrl;
        for (const item of shortsResult.items) {
          if (!itemsMap.has(item.id)) {
            itemsMap.set(item.id, item);
          }
        }
      }

      // Se ambas as abas retornaram 404 e não temos target video resolvido
      if (tabNotFoundCount === 2 && !resolvedTarget) {
        throw new NotFoundException(
          'Canal não encontrado no YouTube. Verifique o @handle ou URL informada.',
        );
      }

      // Popula metadados de canal em todos os itens
      for (const item of itemsMap.values()) {
        if (channelTitle && !item.channelTitle) item.channelTitle = channelTitle;
        if (channelAvatarUrl && !item.channelAvatarUrl) item.channelAvatarUrl = channelAvatarUrl;
        if (!item.channelUrl) item.channelUrl = baseUrl;
      }

      // Caso tenha um vídeo alvo (URL de vídeo inserida), garante que ele venha no início e pré-selecionado
      let targetItem: ScrapedMediaItem | null = null;
      if (targetVideoId) {
        if (itemsMap.has(targetVideoId)) {
          targetItem = itemsMap.get(targetVideoId)!;
          targetItem.isTargetVideo = true;
          targetItem.selected = true;
          itemsMap.delete(targetVideoId);
        } else if (resolvedTarget) {
          const v = resolvedTarget.video;
          const durSecs = v.durationSeconds || 60;
          targetItem = {
            id: v.id,
            url: v.isShort
              ? `https://www.youtube.com/shorts/${v.id}`
              : `https://www.youtube.com/watch?v=${v.id}`,
            title: v.title,
            thumbnailUrl: v.thumbnailUrl,
            thumbnail_url: v.thumbnailUrl,
            durationSeconds: durSecs,
            duration_seconds: durSecs,
            durationFormatted: this.formatDuration(durSecs),
            timestamp_formatted: this.formatTimestamp(durSecs),
            isShort: v.isShort,
            is_short: v.isShort,
            isTargetVideo: true,
            selected: true,
            channelTitle: channelTitle || resolvedTarget.channelTitle,
            channelAvatarUrl: channelAvatarUrl || resolvedTarget.channelAvatarUrl,
            channelUrl: baseUrl,
          };
        }
      }

      const results: ScrapedMediaItem[] = targetItem
        ? [targetItem, ...Array.from(itemsMap.values())]
        : Array.from(itemsMap.values());

      if (results.length === 0) {
        throw new NotFoundException(
          'Nenhum vídeo ou Short público encontrado para este canal.',
        );
      }

      // Enriquece os Shorts com os metadados de tempo/duração reais
      await this.enrichShortsRealDurations(results);

      this.logger.log(
        `Canal escaneado com sucesso. ${results.length} itens extraídos (${results.filter((i) => i.isShort).length} Shorts).${
          targetItem ? ` Vídeo alvo: ${targetItem.id}` : ''
        }`,
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
   * Realiza o scraping completo de uma aba (Videos ou Shorts) percorrendo ytInitialData e tokens de continuação InnerTube
   */
  private async scrapeTab(
    url: string,
    isShortTab: boolean,
  ): Promise<{
    items: ScrapedMediaItem[];
    notFound: boolean;
    channelTitle?: string;
    channelAvatarUrl?: string;
  }> {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    try {
      const response = await fetch(url, { headers });

      if (response.status === 404) {
        this.logger.warn(`Canal/aba não encontrado(a): ${url} (404)`);
        return { items: [], notFound: true };
      }

      if (!response.ok) {
        this.logger.warn(`Requisição HTTP falhou para ${url} com status ${response.status}`);
        return { items: [], notFound: false };
      }

      const html = await response.text();
      const initialData = this.extractInitialJsonFromHtml(html);
      if (!initialData) {
        return { items: [], notFound: false };
      }

      // Extrai metadados do canal (título e avatar) se disponíveis na aba
      let channelTitle: string | undefined =
        initialData?.metadata?.channelMetadataRenderer?.title ||
        initialData?.header?.pageHeaderRenderer?.pageTitle;
      if (!channelTitle) {
        const titleMatch = html.match(/"channelMetadataRenderer":\{"title":"([^"]+)"/);
        if (titleMatch) channelTitle = titleMatch[1];
      }

      let channelAvatarUrl: string | undefined =
        initialData?.metadata?.channelMetadataRenderer?.avatar?.thumbnails?.[0]?.url ||
        initialData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url;
      if (!channelAvatarUrl) {
        const avatarMatch = html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/);
        if (avatarMatch) channelAvatarUrl = avatarMatch[1];
      }

      const visitedIds = new Set<string>();
      const allItems: ScrapedMediaItem[] = [
        ...this.extractItemsFromData(initialData, isShortTab, visitedIds),
      ];

      let continuationToken = this.extractGridContinuationToken(initialData);
      const startTime = Date.now();
      const maxDurationMs = 45000;
      const maxPages = 60;
      let page = 1;

      while (
        continuationToken &&
        page < maxPages &&
        Date.now() - startTime < maxDurationMs
      ) {
        page++;
        try {
          const browseRes = await fetch(
            'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
            {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: 'WEB',
                    clientVersion: '2.20241001.00.00',
                    hl: 'pt-BR',
                    gl: 'BR',
                  },
                },
                continuation: continuationToken,
              }),
            },
          );

          if (!browseRes.ok) {
            break;
          }

          const browseData = await browseRes.json();
          const newItems = this.extractItemsFromData(
            browseData,
            isShortTab,
            visitedIds,
          );
          if (newItems.length === 0) {
            break;
          }

          allItems.push(...newItems);
          continuationToken = this.extractGridContinuationToken(browseData);
        } catch (contErr: any) {
          this.logger.warn(
            `Interrupção na paginação InnerTube (${url}, pág ${page}): ${contErr.message}`,
          );
          break;
        }
      }

      return { items: allItems, notFound: false, channelTitle, channelAvatarUrl };
    } catch (err: any) {
      this.logger.warn(`Erro ao baixar página ${url}: ${err.message}`);
      return { items: [], notFound: false };
    }
  }

  /**
   * Extrai o objeto JSON ytInitialData embutido no HTML
   */
  private extractInitialJsonFromHtml(html: string): any | null {
    const regex = /(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*({.+?});<\/script>/s;
    const match = html.match(regex);

    if (!match || !match[1]) {
      return null;
    }

    try {
      return JSON.parse(match[1]);
    } catch (e: any) {
      this.logger.warn(`Falha no parsing JSON do ytInitialData: ${e.message}`);
      return null;
    }
  }

  /**
   * Extrai e faz o parsing seguro do JSON ytInitialData embutido no HTML
   */
  private parseInitialDataFromHtml(
    html: string,
    isShortTab: boolean,
  ): ScrapedMediaItem[] {
    const data = this.extractInitialJsonFromHtml(html);
    if (!data) return [];
    return this.extractItemsFromData(data, isShortTab);
  }

  /**
   * Localiza o token de continuação da grade principal (ignorando painéis de cabeçalho/descrição)
   */
  private extractGridContinuationToken(node: any): string | null {
    if (!node || typeof node !== 'object') return null;

    if (node.continuationItemRenderer) {
      const ep = node.continuationItemRenderer.continuationEndpoint;
      const token =
        ep?.continuationCommand?.token ||
        ep?.commandExecutorCommand?.commands?.find(
          (c: any) => c.continuationCommand,
        )?.continuationCommand?.token;
      if (token) return token;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = this.extractGridContinuationToken(item);
        if (found) return found;
      }
    } else {
      for (const key of Object.keys(node)) {
        if (
          key === 'header' ||
          key === 'topbar' ||
          key === 'engagementPanel' ||
          key === 'engagementPanelSectionListRenderer' ||
          key === 'microformat'
        ) {
          continue;
        }
        const found = this.extractGridContinuationToken(node[key]);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Identifica se um vídeo/Short é destinado exclusivamente ou com prioridade para membros do canal.
   * Detecta badges InnerTube (modernos e legados) como BADGE_MEMBERS_ONLY, BADGE_STYLE_TYPE_MEMBERS_ONLY,
   * ícone SPONSORSHIP_STAR, URLs de badge de patrocinador e rótulos de membros.
   */
  isMembersOnly(node: any): boolean {
    if (!node || typeof node !== 'object') return false;

    // 1. Verificação rápida por constantes e ícones estritos do YouTube InnerTube
    const rawStr = JSON.stringify(node);
    if (
      rawStr.includes('BADGE_MEMBERS_ONLY') ||
      rawStr.includes('BADGE_STYLE_TYPE_MEMBERS_ONLY') ||
      rawStr.includes('SPONSORSHIP_STAR') ||
      rawStr.includes('sponsors_default_badge') ||
      rawStr.includes('sponsorships_default_badge')
    ) {
      return true;
    }

    // 2. Verificação explícita em badges de metadados
    const checkBadgeList = (badges?: any[]): boolean => {
      if (!Array.isArray(badges)) return false;
      return badges.some((b) => {
        const style =
          b.badgeViewModel?.badgeStyle ||
          b.metadataBadgeRenderer?.style ||
          '';
        const icon =
          b.badgeViewModel?.iconName ||
          b.metadataBadgeRenderer?.icon?.iconType ||
          '';
        const label = (
          b.badgeViewModel?.badgeText ||
          b.metadataBadgeRenderer?.label ||
          b.metadataBadgeRenderer?.accessibilityData?.label ||
          ''
        ).toLowerCase();

        return (
          style.includes('MEMBERS_ONLY') ||
          icon.includes('SPONSOR') ||
          label.includes('membro') ||
          label.includes('member')
        );
      });
    };

    // LockupViewModel metadata rows badges
    const metadataRows =
      node.lockupViewModel?.metadata?.lockupMetadataViewModel?.metadata
        ?.contentMetadataViewModel?.metadataRows ||
      node.metadata?.lockupMetadataViewModel?.metadata
        ?.contentMetadataViewModel?.metadataRows;
    if (Array.isArray(metadataRows)) {
      for (const row of metadataRows) {
        if (checkBadgeList(row.badges)) return true;
      }
    }

    // Legacy renderers badges
    if (checkBadgeList(node.videoRenderer?.badges || node.badges)) return true;
    if (checkBadgeList(node.gridVideoRenderer?.badges)) return true;
    if (checkBadgeList(node.compactVideoRenderer?.badges)) return true;
    if (checkBadgeList(node.reelItemRenderer?.badges)) return true;

    return false;
  }

  /**
   * Percorre recursivamente os renderers do YouTube para extrair vídeos e Shorts
   */
  private extractItemsFromData(
    data: any,
    isShortTab: boolean,
    visitedIds: Set<string> = new Set<string>(),
  ): ScrapedMediaItem[] {
    const results: ScrapedMediaItem[] = [];

    const traverse = (node: any) => {
      if (!node || typeof node !== 'object') return;

      // 1. YouTube Modern LockupViewModel (2024-2026) para vídeos regulares
      if (node.lockupViewModel) {
        const lockup = node.lockupViewModel;
        const id = lockup.contentId;
        if (id && !visitedIds.has(id)) {
          if (this.isMembersOnly(node) || this.isMembersOnly(lockup)) {
            visitedIds.add(id);
            return;
          }

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

          const isShort = isShortTab;

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
          if (this.isMembersOnly(node) || this.isMembersOnly(short)) {
            visitedIds.add(id);
            return;
          }

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
          if (this.isMembersOnly(node) || this.isMembersOnly(videoRenderer)) {
            visitedIds.add(id);
            return;
          }

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

          const isShort = isShortTab;

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
          if (this.isMembersOnly(node) || this.isMembersOnly(reelRenderer)) {
            visitedIds.add(id);
            return;
          }

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

  /**
   * Obtém a duração real de Shorts consultando os metadados reais da página do vídeo.
   * Executa em lotes paralelos (concorrência controlada) para garantir rapidez sem sobrecarga.
   */
  async enrichShortsRealDurations(items: ScrapedMediaItem[]): Promise<void> {
    const shortsToEnrich = items.filter(
      (item) => item.isShort || item.is_short,
    );

    if (shortsToEnrich.length === 0) return;

    this.logger.log(
      `Consultando metadados de tempo real para ${shortsToEnrich.length} Shorts...`,
    );

    const concurrency = 6;
    for (let i = 0; i < shortsToEnrich.length; i += concurrency) {
      const chunk = shortsToEnrich.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const realDuration = await this.fetchVideoRealDuration(item.id);
            if (realDuration > 0) {
              item.durationSeconds = realDuration;
              item.duration_seconds = realDuration;
              item.durationFormatted = this.formatDuration(realDuration);
              item.timestamp_formatted = this.formatTimestamp(realDuration);
            }
          } catch {
            // Mantém valor existente caso haja falha de rede individual
          }
        }),
      );
    }
  }

  /**
   * Busca os metadados reais de tempo/duração de um vídeo/Short específico no YouTube.
   */
  async fetchVideoRealDuration(videoId: string): Promise<number> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return 0;

      const html = await res.text();

      // 1. Tenta "lengthSeconds":"XX"
      const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
      if (lengthMatch && lengthMatch[1]) {
        const secs = parseInt(lengthMatch[1], 10);
        if (secs > 0) return secs;
      }

      // 2. Tenta "approxDurationMs":"XXXXX"
      const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
      if (approxMatch && approxMatch[1]) {
        const ms = parseInt(approxMatch[1], 10);
        if (ms > 0) return Math.round(ms / 1000);
      }

      // 3. Tenta itemprop="duration" content="PT...S"
      const metaMatch = html.match(
        /itemprop="duration"\s+content="PT(?:(\d+)M)?(?:(\d+)S)?"/,
      );
      if (metaMatch) {
        const mins = parseInt(metaMatch[1] || '0', 10);
        const secs = parseInt(metaMatch[2] || '0', 10);
        const total = mins * 60 + secs;
        if (total > 0) return total;
      }

      return 0;
    } catch {
      return 0;
    }
  }
}
