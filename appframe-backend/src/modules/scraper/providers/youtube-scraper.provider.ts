import * as fs from 'fs';
import * as path from 'path';
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { IVideoScraperProvider } from '../interfaces/video-scraper-provider.interface';
import { ScrapedMediaItem } from '../interfaces/scraped-media-item.interface';
import { RedisService } from '../../../core/redis/redis.service';

export interface ChannelMediaCounts {
  total?: number;
  regularVideos?: number;
  shorts?: number;
}

@Injectable()
export class YouTubeScraperProvider implements IVideoScraperProvider {
  readonly providerName = 'youtube';
  private readonly logger = new Logger(YouTubeScraperProvider.name);
  private memoryTokens = new Map<string, any>();

  constructor(
    @Optional() private readonly redisService?: RedisService,
  ) {}

  private async saveTokens(channelUrl: string, data: any): Promise<void> {
    const key = `channel_tokens:${channelUrl}`;
    this.memoryTokens.set(key, data);
    if (this.redisService) {
      try {
        await this.redisService.set(key, JSON.stringify(data), 'EX', 3600);
      } catch (err: any) {
        this.logger.warn(`Erro ao salvar tokens no Redis (${key}): ${err.message}`);
      }
    }
  }

  private async getTokens(channelUrl: string): Promise<any | null> {
    const key = `channel_tokens:${channelUrl}`;
    if (this.redisService) {
      try {
        const raw = await this.redisService.get(key);
        if (raw) return JSON.parse(raw);
      } catch (err: any) {
        this.logger.warn(`Erro ao ler tokens do Redis (${key}): ${err.message}`);
      }
    }
    return this.memoryTokens.get(key) || null;
  }

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
   * Converte strings de contagem de vídeos do YouTube em número inteiro
   * Exemplos: "431 vídeos" => 431, "4,6 mil vídeos" => 4600, "1 mil vídeos" => 1000, "1.250 vídeos" => 1250
   */
  parseVideoCountText(raw?: string): number | null {
    if (!raw) return null;
    const clean = raw.replace(/\u00a0/g, ' ').trim();
    const match = clean.match(/([\d.,]+)\s*(mil|k|mi|m|b|bi)?\s*(?:vídeo|video|vidéo)s?/i);
    if (!match) return null;

    let numStr = match[1];
    const multiplier = match[2]?.toLowerCase();

    if (multiplier) {
      numStr = numStr.replace(',', '.');
      const val = parseFloat(numStr);
      if (isNaN(val)) return null;
      if (multiplier === 'mil' || multiplier === 'k') return Math.round(val * 1000);
      if (multiplier === 'mi' || multiplier === 'm') return Math.round(val * 1000000);
      if (multiplier === 'bi' || multiplier === 'b') return Math.round(val * 1000000000);
      return Math.round(val);
    } else {
      if (numStr.includes('.') && numStr.includes(',')) {
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      } else if (numStr.includes('.')) {
        if (numStr.split('.')[1]?.length === 3) {
          numStr = numStr.replace(/\./g, '');
        }
      } else if (numStr.includes(',')) {
        if (numStr.split(',')[1]?.length === 3) {
          numStr = numStr.replace(/,/g, '');
        }
      }
      const val = parseInt(numStr, 10);
      return isNaN(val) ? null : val;
    }
  }

  /**
   * Extrai a contagem total de vídeos do canal a partir dos metadados da página
   */
  extractChannelTotalVideos(initialData: any, html: string): number | undefined {
    try {
      // 1. Tenta extrair de pageHeaderViewModel -> metadataRows -> metadataParts
      const rows =
        initialData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel
          ?.metadata?.contentMetadataViewModel?.metadataRows;
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const parts = row?.metadataParts;
          if (Array.isArray(parts)) {
            for (const part of parts) {
              const content = part?.text?.content;
              const count = this.parseVideoCountText(content);
              if (count !== null && count > 0) {
                return count;
              }
            }
          }
        }
      }

      // 2. Tenta c4TabbedHeaderRenderer (videosCountText)
      const c4VideosText =
        initialData?.header?.c4TabbedHeaderRenderer?.videosCountText?.runs?.[0]?.text ||
        initialData?.header?.c4TabbedHeaderRenderer?.videosCountText?.simpleText;
      if (c4VideosText) {
        const count = this.parseVideoCountText(c4VideosText);
        if (count !== null && count > 0) return count;
      }

      // 3. Fallbacks via regex no HTML
      const htmlMatches = [
        html.match(/"content":\s*"([^"]*(?:vídeo|video)s?)"/i),
        html.match(/"videoCountText":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/i),
        html.match(/"videosCountText":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/i),
      ];
      for (const m of htmlMatches) {
        if (m && m[1]) {
          const count = this.parseVideoCountText(m[1]);
          if (count !== null && count > 0) return count;
        }
      }
    } catch {
      // Retorna undefined se não encontrar
    }
    return undefined;
  }

  /**
   * Extrai o ID canônico do canal (iniciando com 'UC') do InnerTube ou HTML
   */
  extractChannelId(initialData: any, html?: string): string | undefined {
    try {
      const tabs = initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs;
      if (Array.isArray(tabs)) {
        for (const t of tabs) {
          const browseId = t?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
          if (browseId && browseId.startsWith('UC')) {
            return browseId;
          }
        }
      }
      const metaChannelId = initialData?.metadata?.channelMetadataRenderer?.externalId;
      if (metaChannelId && metaChannelId.startsWith('UC')) {
        return metaChannelId;
      }
      if (html) {
        const m = html.match(/"browseId":"(UC[a-zA-Z0-9_-]{22})"/);
        if (m && m[1]) return m[1];
      }
    } catch {}
    return undefined;
  }

  /**
   * Obtém a contagem de mídias considerando estritamente Vídeos longos e Shorts,
   * excluindo transmissões ao vivo gravadas (livestreams/streams) para refletir a grade do scanner.
   */
  async resolveChannelVideosAndShortsCount(
    channelId: string | undefined,
    fallbackTotal?: number,
    forceRefresh = false,
  ): Promise<ChannelMediaCounts> {
    if (!channelId || !channelId.startsWith('UC')) {
      return { total: fallbackTotal, regularVideos: undefined, shorts: undefined };
    }

    const cacheKey = `channel_media_counts:${channelId}`;
    if (!forceRefresh && this.redisService) {
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.total === 'number' && parsed.total > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    try {
      const suffix = channelId.slice(2);
      const headers = this.getFetchHeaders();

      const fetchPlaylistCount = async (prefix: string): Promise<number | null> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`https://www.youtube.com/playlist?list=${prefix}${suffix}`, {
            signal: controller.signal,
            headers,
          });
          clearTimeout(timeout);
          if (!res.ok) return null;
          const resHtml = await res.text();
          const match = resHtml.match(/"stats":\s*\[\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/);
          if (!match || !match[1]) return null;
          const text = match[1].trim().toLowerCase();
          if (/^(?:um|one)\b/i.test(text)) return 1;
          if (/^(?:nenhum|no\s+videos?)\b/i.test(text)) return 0;
          const clean = text.replace(/\./g, '').replace(/,/g, '').trim();
          const val = parseInt(clean, 10);
          return isNaN(val) ? null : val;
        } catch {
          return null;
        }
      };

      const [uulf, uush, uulv, uu] = await Promise.all([
        fetchPlaylistCount('UULF'), // Vídeos normais
        fetchPlaylistCount('UUSH'), // Shorts
        fetchPlaylistCount('UULV'), // Livestreams
        fetchPlaylistCount('UU'),   // Todos os uploads
      ]);

      let resolvedRegularVideos: number | undefined = typeof uulf === 'number' ? uulf : undefined;
      let resolvedShorts: number | undefined = typeof uush === 'number' ? uush : undefined;
      let resolvedTotal: number | undefined;

      if (typeof resolvedRegularVideos === 'number' && typeof resolvedShorts === 'number') {
        resolvedTotal = resolvedRegularVideos + resolvedShorts;
      } else if (typeof resolvedRegularVideos === 'number') {
        if (typeof uu === 'number') {
          const nonLive = typeof uulv === 'number' ? Math.max(0, uu - uulv) : uu;
          resolvedShorts = Math.max(0, nonLive - resolvedRegularVideos);
          resolvedTotal = resolvedRegularVideos + resolvedShorts;
        } else {
          resolvedTotal = resolvedRegularVideos;
        }
      } else if (typeof resolvedShorts === 'number') {
        if (typeof uu === 'number') {
          const nonLive = typeof uulv === 'number' ? Math.max(0, uu - uulv) : uu;
          resolvedRegularVideos = Math.max(0, nonLive - resolvedShorts);
          resolvedTotal = resolvedRegularVideos + resolvedShorts;
        } else {
          resolvedTotal = resolvedShorts;
        }
      } else if (typeof uu === 'number') {
        resolvedTotal = typeof uulv === 'number' ? Math.max(0, uu - uulv) : uu;
      } else if (typeof uulv === 'number' && typeof fallbackTotal === 'number') {
        resolvedTotal = Math.max(0, fallbackTotal - uulv);
      } else {
        resolvedTotal = fallbackTotal;
      }

      const result: ChannelMediaCounts = {
        total: resolvedTotal || fallbackTotal,
        regularVideos: resolvedRegularVideos,
        shorts: resolvedShorts,
      };

      if (result.total && result.total > 0 && this.redisService) {
        try {
          await this.redisService.set(cacheKey, JSON.stringify(result), 'EX', 3600);
        } catch {}
      }

      this.logger.log(
        `Contagem de Vídeos e Shorts (${channelId}): Total=${result.total} (Longos: ${result.regularVideos ?? 'N/A'}, Shorts: ${result.shorts ?? 'N/A'}, Livestreams excluídos: ${uulv ?? 0}, Uploads gerais: ${uu ?? 'N/A'}, Total bruto: ${fallbackTotal ?? 'N/A'})`,
      );

      return result;
    } catch (e: any) {
      this.logger.warn(`Falha ao resolver contagem detalhada de vídeos e shorts: ${e.message}`);
      return { total: fallbackTotal, regularVideos: undefined, shorts: undefined };
    }
  }

  /**
   * Obtém cookies configurados no servidor (storage/cookies.txt) formatados para o cabeçalho Cookie
   */
  private getCookiesHeader(): string | undefined {
    try {
      const candidates = [
        process.env.YTDLP_COOKIES_PATH,
        path.resolve(process.cwd(), 'storage/cookies.txt'),
        path.resolve(process.cwd(), 'cookies.txt'),
      ].filter(Boolean) as string[];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          const cookies: string[] = [];
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const parts = trimmed.split('\t');
            if (parts.length >= 7) {
              const name = parts[5].trim();
              const value = parts[6].trim();
              if (name && value) {
                cookies.push(`${name}=${value}`);
              }
            }
          }
          if (cookies.length > 0) {
            return cookies.join('; ');
          }
        }
      }
    } catch {
      // Silencioso se não houver cookies configurados
    }
    return undefined;
  }

  /**
   * Cabeçalhos padronizados para requisições de raspagem ao YouTube
   */
  getFetchHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    };
    const cookies = this.getCookiesHeader();
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    return headers;
  }

  /**
   * Limpa e normaliza a URL do avatar do YouTube, decodificando caracteres escapados e otimizando a resolução
   */
  cleanAvatarUrl(rawUrl?: string): string | undefined {
    if (!rawUrl) return undefined;
    let url = rawUrl
      .replace(/\\u0026/g, '&')
      .replace(/\\x3d/gi, '=')
      .replace(/\\u003d/gi, '=')
      .replace(/\\\//g, '/')
      .trim();
    if (url.startsWith('//')) {
      url = `https:${url}`;
    }
    url = url.replace(/^"+|"+$/g, '');
    // Se a URL contiver parâmetro de dimensionamento pequeno (=s48, =s72, etc), otimiza para =s250 mantendo filtros
    url = url.replace(/=s\d+(-c-k)?/, '=s250$1');
    return url;
  }

  /**
   * Extrai o ID de 11 caracteres de um vídeo ou Short do YouTube a partir da URL informada
   */
  extractVideoId(input: string): string | null {
    if (!input) return null;
    const trimmed = input.trim();
    const match = trimmed.match(
      /(?:(?:v|vi)=|\/(?:v|vi|shorts|live|embed)\/|youtu\.be\/|\/watch\?v=)([\w-]{11})/i,
    );
    return match ? match[1] : null;
  }

  /**
   * Resolve o canal pai e os metadados do vídeo quando a URL fornecida é de um vídeo específico
   */
  async resolveChannelFromVideo(
    videoId: string,
    isExplicitLiveUrl = false,
  ): Promise<{
    channelUrl: string;
    channelTitle?: string;
    channelAvatarUrl?: string;
    channelId?: string;
    isLive?: boolean;
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
      const headers = this.getFetchHeaders();

      let html = '';
      try {
        const res = await fetch(watchUrl, { headers });
        if (res.ok) {
          html = await res.text();
        }
      } catch {
        // Falha na requisição HTML direta; continuará via oEmbed
      }

      let channelUrl: string | null = null;
      let channelTitle: string | null = null;
      let channelAvatarUrl: string | null = null;
      let channelId: string | undefined = undefined;
      let isLive = isExplicitLiveUrl;
      let videoTitle = `Vídeo (${videoId})`;
      let durationSeconds = 0;
      let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      let isShort = false;

      // 1. Tenta ytInitialPlayerResponse se HTML foi obtido
      if (html) {
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
              if (pData.videoDetails.channelId) {
                channelId = pData.videoDetails.channelId;
                if (!channelUrl) {
                  channelUrl = `https://www.youtube.com/channel/${pData.videoDetails.channelId}`;
                }
              }
              if (pData.videoDetails.isLive || pData.videoDetails.isLiveContent) {
                isLive = true;
              }
            }
            if (pData.microformat?.playerMicroformatRenderer) {
              const pm = pData.microformat.playerMicroformatRenderer;
              if (pm.ownerChannelName && !channelTitle) channelTitle = pm.ownerChannelName;
              if (pm.ownerProfileUrl) channelUrl = pm.ownerProfileUrl.replace('http://', 'https://');
              if (pm.isLiveBroadcast || pm.liveBroadcastDetails) {
                isLive = true;
              }
            }
          } catch (e: any) {
            this.logger.warn(`Erro no parsing de ytInitialPlayerResponse: ${e.message}`);
          }
        }

        // 2. Extrações de fallback para canal via regex no HTML
        if (!isLive) {
          if (
            /"isLive":\s*true/.test(html) ||
            /"isLiveContent":\s*true/.test(html) ||
            /"isLiveBroadcast":\s*true/.test(html) ||
            /"liveBroadcastDetails"/.test(html)
          ) {
            isLive = true;
          }
        }

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
          const channelIdMatch = html.match(/"channelId":\s*"([^"]+)"/);
          if (channelIdMatch) {
            channelId = channelIdMatch[1];
            channelUrl = `https://www.youtube.com/channel/${channelIdMatch[1]}`;
          }
        }

        if (!channelTitle) {
          const authorMatch = html.match(/"author":"([^"]+)"/);
          if (authorMatch) channelTitle = authorMatch[1];
        }

        // 3. Avatar do canal a partir do HTML (múltiplas estratégias para vídeos regulares, Shorts e páginas modernas)
        const avatarMatch =
          html.match(/"videoOwnerRenderer":\{"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/) ||
          html.match(/"channelThumbnailSupportedRenderers":\{"channelThumbnailWithLinkRenderer":\{"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/) ||
          html.match(/"decoratedAvatarViewModel":\{"avatar":\{"avatarViewModel":\{"image":\{"sources":\[\{"url":"([^"]+)"/) ||
          html.match(/"authorThumbnail":\{"thumbnails":\[\{"url":"([^"]+)"/) ||
          html.match(/(https?:\\?\/\\?\/[^"'\s]*yt3\.(?:ggpht\.com|googleusercontent\.com)[^"'\s]*)/);

        if (avatarMatch) {
          channelAvatarUrl = this.cleanAvatarUrl(avatarMatch[1]) || null;
        }

        // 4. Duração e verificação de Short
        if (durationSeconds <= 0) {
          const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
          if (lengthMatch) durationSeconds = parseInt(lengthMatch[1], 10);
        }
        if (durationSeconds > 0 && durationSeconds <= 60) {
          isShort = true;
        }
      }

      // 5. Fallback oficial via oEmbed caso canal ou título ainda não tenham sido identificados
      if (!channelUrl || !channelTitle) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
            { headers },
          );
          if (oembedRes.ok) {
            const oData: any = await oembedRes.json();
            if (oData.author_url && !channelUrl) {
              channelUrl = oData.author_url.replace('http://', 'https://');
            }
            if (oData.author_name && !channelTitle) {
              channelTitle = oData.author_name;
            }
            if (oData.title && videoTitle === `Vídeo (${videoId})`) {
              videoTitle = oData.title;
            }
            if (oData.thumbnail_url && thumbnailUrl.includes('hqdefault.jpg')) {
              thumbnailUrl = oData.thumbnail_url;
            }
          }
        } catch (oembedErr: any) {
          this.logger.warn(`Fallback oEmbed falhou para o vídeo ${videoId}: ${oembedErr.message}`);
        }
      }

      // 6. Se temos o channelUrl mas o avatar não veio da página do vídeo, faz uma consulta rápida à home do canal para capturar o og:image
      if (channelUrl && !channelAvatarUrl) {
        try {
          const chRes = await fetch(channelUrl, { headers });
          if (chRes.ok) {
            const chHtml = await chRes.text();
            const ogMatch =
              chHtml.match(/<meta\s+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/i) ||
              chHtml.match(/<meta\s+content="([^"]+)"\s+(?:property="og:image"|name="twitter:image")/i);
            if (ogMatch && (ogMatch[1].includes('yt3.ggpht.com') || ogMatch[1].includes('yt3.googleusercontent.com'))) {
              channelAvatarUrl = this.cleanAvatarUrl(ogMatch[1]) || null;
            }
          }
        } catch {
          // Continua normalmente
        }
      }

      if (!channelUrl) return null;

      return {
        channelUrl,
        channelTitle: channelTitle || undefined,
        channelAvatarUrl: channelAvatarUrl || undefined,
        channelId,
        isLive,
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
    clean = clean.replace(/\/(videos|shorts|featured|streams|live)$/, '');
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
    const isExplicitLiveInput =
      /\/live(\/|$|\?)/i.test(channelUrl) ||
      /\/streams(\/|$|\?)/i.test(channelUrl);

    let resolvedTarget: {
      channelUrl: string;
      channelTitle?: string;
      channelAvatarUrl?: string;
      channelId?: string;
      isLive?: boolean;
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
      resolvedTarget = await this.resolveChannelFromVideo(targetVideoId, isExplicitLiveInput);
      if (resolvedTarget) {
        this.logger.log(
          `Canal de origem resolvido: ${resolvedTarget.channelUrl} (${resolvedTarget.channelTitle || 'Sem título'})${
            resolvedTarget.isLive ? ' [TRANSMISSÃO AO VIVO DETECTADA]' : ''
          }`,
        );
      }
    }

    const isLiveInput = Boolean(isExplicitLiveInput || resolvedTarget?.isLive);

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

      // Coleta vídeos regulares (/videos) e Shorts (/shorts) em paralelo com extração inicial imediata
      const [regularResult, shortsResult] = await Promise.all([
        this.scrapeTab(videosUrl, false, 1),
        this.scrapeTab(shortsUrl, true, 1),
      ]);

      if (regularResult.notFound) {
        tabNotFoundCount++;
      } else {
        if (!channelTitle && regularResult.channelTitle) channelTitle = regularResult.channelTitle;
        if (regularResult.channelAvatarUrl) channelAvatarUrl = regularResult.channelAvatarUrl;
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

      // Se channelAvatarUrl ainda não foi encontrado após raspar /videos e /shorts, busca fallback na home do canal
      if (!channelAvatarUrl && baseUrl) {
        try {
          const homeRes = await fetch(baseUrl, {
            headers: this.getFetchHeaders(),
          });
          if (homeRes.ok) {
            const homeHtml = await homeRes.text();
            const ogMatch =
              homeHtml.match(/<meta\s+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/i) ||
              homeHtml.match(/<meta\s+content="([^"]+)"\s+(?:property="og:image"|name="twitter:image")/i);
            if (ogMatch && (ogMatch[1].includes('yt3.ggpht.com') || ogMatch[1].includes('yt3.googleusercontent.com'))) {
              channelAvatarUrl = this.cleanAvatarUrl(ogMatch[1]);
            }
            if (!channelTitle) {
              const ogTitle = homeHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
              if (ogTitle) channelTitle = ogTitle[1];
            }
          }
        } catch (e: any) {
          this.logger.warn(`Fallback na home do canal falhou: ${e.message}`);
        }
      }

      // Popula metadados de canal em todos os itens da grade
      for (const item of itemsMap.values()) {
        if (channelTitle && !item.channelTitle) item.channelTitle = channelTitle;
        if (channelAvatarUrl && !item.channelAvatarUrl) item.channelAvatarUrl = channelAvatarUrl;
        if (!item.channelUrl) item.channelUrl = baseUrl;
      }

      // Caso tenha um vídeo alvo (URL de vídeo inserida), garante que ele venha no início e pré-selecionado,
      // EXCETO se for transmissão ao vivo (lives não são permitidas para corte nem seleção)
      let targetItem: ScrapedMediaItem | null = null;
      if (isLiveInput) {
        this.logger.warn(
          `Entrada identificada como transmissão ao vivo (live): ${targetVideoId || channelUrl}. Bloqueando inclusão e seleção da transmissão.`,
        );
        if (targetVideoId && itemsMap.has(targetVideoId)) {
          itemsMap.delete(targetVideoId);
        }
      } else if (targetVideoId) {
        if (itemsMap.has(targetVideoId)) {
          targetItem = itemsMap.get(targetVideoId)!;
          targetItem.isTargetVideo = true;
          targetItem.selected = true;
          if (channelAvatarUrl) targetItem.channelAvatarUrl = channelAvatarUrl;
          if (channelTitle && !targetItem.channelTitle) targetItem.channelTitle = channelTitle;
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

      const videosContinuationToken = (regularResult as any).continuationToken || null;
      const shortsContinuationToken = (shortsResult as any).continuationToken || null;
      const rawChannelTotal = regularResult.channelTotalVideos || shortsResult.channelTotalVideos;
      const channelId =
        (regularResult as any).channelId ||
        (shortsResult as any).channelId ||
        (resolvedTarget as any)?.channelId;
      const mediaCounts = await this.resolveChannelVideosAndShortsCount(channelId, rawChannelTotal, true);
      const channelTotalVideos = mediaCounts.total;
      const channelTotalRegularVideos = mediaCounts.regularVideos;
      const channelTotalShorts = mediaCounts.shorts;

      const hasMoreVideos = Boolean(videosContinuationToken);
      const hasMoreShorts = Boolean(shortsContinuationToken);
      const hasMore = Boolean(videosContinuationToken || shortsContinuationToken);

      await this.saveTokens(baseUrl, {
        videosToken: videosContinuationToken,
        shortsToken: shortsContinuationToken,
        visitedIds: Array.from(itemsMap.keys()),
        channelTitle,
        channelAvatarUrl,
        channelTotalVideos,
        channelTotalRegularVideos,
        channelTotalShorts,
      });

      // Garante que TODOS os itens de resultado (inclusive targetItem no índice 0) tenham o avatar e título populados
      for (const item of results) {
        if (channelTitle && !item.channelTitle) item.channelTitle = channelTitle;
        if (channelAvatarUrl && !item.channelAvatarUrl) item.channelAvatarUrl = channelAvatarUrl;
        if (!item.channelUrl) item.channelUrl = baseUrl;
        if (channelTotalVideos && !item.channelTotalVideos) item.channelTotalVideos = channelTotalVideos;
        if (typeof channelTotalRegularVideos === 'number') item.channelTotalRegularVideos = channelTotalRegularVideos;
        if (typeof channelTotalShorts === 'number') item.channelTotalShorts = channelTotalShorts;
        item.hasMore = hasMore;
        item.hasMoreVideos = hasMoreVideos;
        item.hasMoreShorts = hasMoreShorts;
        if (isLiveInput) {
          item.wasLiveInput = true;
        }
      }

      if (results.length === 0) {
        if (isLiveInput) {
          throw new NotFoundException(
            'Este canal possui transmissões ao vivo, porém nenhum vídeo regular ou Short público disponível para cortes.',
          );
        }
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
   * Realiza o scraping de uma aba (Videos ou Shorts) com suporte a limite de páginas iniciais
   */
  private async scrapeTab(
    url: string,
    isShortTab: boolean,
    maxPages: number = 1,
  ): Promise<{
    items: ScrapedMediaItem[];
    notFound: boolean;
    channelTitle?: string;
    channelAvatarUrl?: string;
    continuationToken?: string | null;
    channelTotalVideos?: number;
    channelId?: string;
  }> {
    const headers = this.getFetchHeaders();

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

      // Extrai metadados do canal (título e avatar) mesmo antes ou independentemente do grid
      let channelTitle: string | undefined;
      let channelAvatarUrl: string | undefined;

      // 1. Prioridade para Avatar: OpenGraph og:image (alta resolução 900x900 estática e sempre confiável no HTML do YouTube)
      const ogMatch =
        html.match(/<meta\s+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/i) ||
        html.match(/<meta\s+content="([^"]+)"\s+(?:property="og:image"|name="twitter:image")/i);
      if (
        ogMatch &&
        (ogMatch[1].includes('yt3.ggpht.com') ||
          ogMatch[1].includes('yt3.googleusercontent.com'))
      ) {
        channelAvatarUrl = ogMatch[1];
      }

      const initialData = this.extractInitialJsonFromHtml(html);

      // 2. Extrai título do canal
      if (!channelTitle && initialData) {
        channelTitle =
          initialData.metadata?.channelMetadataRenderer?.title ||
          initialData.header?.pageHeaderRenderer?.pageTitle ||
          initialData.header?.c4TabbedHeaderRenderer?.title;
      }
      if (!channelTitle) {
        const titleMatch = html.match(/"channelMetadataRenderer":\{"title":"([^"]+)"/);
        if (titleMatch) channelTitle = titleMatch[1];
      }
      if (!channelTitle) {
        const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogTitle) channelTitle = ogTitle[1];
      }

      // 3. Fallbacks para avatar via initialData
      if (!channelAvatarUrl && initialData) {
        const metaThumbs = initialData.metadata?.channelMetadataRenderer?.avatar?.thumbnails;
        const pageHeaderSources = initialData.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources;
        const c4Thumbs = initialData.header?.c4TabbedHeaderRenderer?.avatar?.thumbnails;

        channelAvatarUrl =
          metaThumbs?.[metaThumbs.length - 1]?.url ||
          metaThumbs?.[0]?.url ||
          pageHeaderSources?.[pageHeaderSources.length - 1]?.url ||
          pageHeaderSources?.[0]?.url ||
          c4Thumbs?.[c4Thumbs.length - 1]?.url ||
          c4Thumbs?.[0]?.url;
      }

      // 4. Fallback para avatar via regex no HTML
      if (!channelAvatarUrl) {
        const avatarMatch =
          html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/) ||
          html.match(/(https?:\\?\/\\?\/[^"'\s]*yt3\.(?:ggpht\.com|googleusercontent\.com)[^"'\s]*)/);
        if (avatarMatch) channelAvatarUrl = avatarMatch[1];
      }

      if (channelAvatarUrl) {
        channelAvatarUrl = this.cleanAvatarUrl(channelAvatarUrl);
      }

      const channelTotalVideos = this.extractChannelTotalVideos(initialData, html);
      const channelId = this.extractChannelId(initialData, html);

      if (!initialData) {
        return { items: [], notFound: false, channelTitle, channelAvatarUrl, channelTotalVideos, channelId };
      }

      // Validação estrita da aba retornada pelo YouTube:
      // Canais sem Shorts não retornam 404 ao acessar /shorts; o YouTube redireciona para a aba 'Início' (featured).
      const tabs = initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs;
      if (Array.isArray(tabs)) {
        if (isShortTab) {
          const hasShortsTab = tabs.some((t: any) => {
            const u = t.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
            return u.endsWith('/shorts');
          });
          const selectedTab = tabs.find((t: any) => t.tabRenderer?.selected);
          const selectedUrl = selectedTab?.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
          const isShortsSelected = selectedUrl.endsWith('/shorts');

          if (!hasShortsTab || !isShortsSelected) {
            this.logger.log(`Canal não possui aba de Shorts pública (aba ativa: ${selectedUrl || 'Início'}). Ignorando extração de Shorts.`);
            return { items: [], notFound: true, channelTitle, channelAvatarUrl, channelTotalVideos, channelId };
          }
        }
      }

      const visitedIds = new Set<string>();
      const allItems: ScrapedMediaItem[] = [
        ...this.extractItemsFromData(initialData, isShortTab, visitedIds),
      ];

      let continuationToken = this.extractGridContinuationToken(initialData);

      if (maxPages > 1) {
        const startTime = Date.now();
        const maxDurationMs = 15000;
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
      }

      return {
        items: allItems,
        notFound: false,
        channelTitle,
        channelAvatarUrl,
        continuationToken,
        channelTotalVideos,
        channelId,
      };
    } catch (err: any) {
      this.logger.warn(`Erro ao baixar página ${url}: ${err.message}`);
      return { items: [], notFound: false };
    }
  }

  /**
   * Extrai próxima página/lote de mídias sob demanda (continuation InnerTube)
   */
  async fetchMore(
    channelUrl: string,
    type: 'all' | 'long' | 'shorts' = 'all',
  ): Promise<ScrapedMediaItem[]> {
    const rawBaseUrl = channelUrl;
    const baseUrl = this.normalizeChannelUrl(rawBaseUrl);
    const session = await this.getTokens(baseUrl);

    if (!session) {
      return [];
    }

    const wantShorts = type === 'shorts';
    let token = wantShorts ? session.shortsToken : session.videosToken;
    let actualIsShort = wantShorts;

    // Se no modo 'all' não houver mais token de vídeos regulares, tenta de shorts
    if (!token && type === 'all') {
      if (session.shortsToken) {
        token = session.shortsToken;
        actualIsShort = true;
      }
    }

    if (!token) {
      return [];
    }

    const headers = this.getFetchHeaders();
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
            continuation: token,
          }),
        },
      );

      if (!browseRes.ok) {
        if (actualIsShort) session.shortsToken = null;
        else session.videosToken = null;
        await this.saveTokens(baseUrl, session);
        return [];
      }

      const browseData = await browseRes.json();
      const visitedSet = new Set<string>(session.visitedIds || []);
      const newItems = this.extractItemsFromData(browseData, actualIsShort, visitedSet);
      const nextToken = this.extractGridContinuationToken(browseData);

      if (actualIsShort) {
        session.shortsToken = nextToken;
      } else {
        session.videosToken = nextToken;
      }
      session.visitedIds = Array.from(visitedSet);
      await this.saveTokens(baseUrl, session);

      const hasMoreVideos = Boolean(session.videosToken);
      const hasMoreShorts = Boolean(session.shortsToken);
      const hasMore = Boolean(session.videosToken || session.shortsToken);
      for (const it of newItems) {
        if (session.channelTitle) it.channelTitle = session.channelTitle;
        if (session.channelAvatarUrl) it.channelAvatarUrl = session.channelAvatarUrl;
        if (session.channelTotalVideos) it.channelTotalVideos = session.channelTotalVideos;
        if (typeof session.channelTotalRegularVideos === 'number') {
          it.channelTotalRegularVideos = session.channelTotalRegularVideos;
        }
        if (typeof session.channelTotalShorts === 'number') {
          it.channelTotalShorts = session.channelTotalShorts;
        }
        it.channelUrl = baseUrl;
        it.hasMore = hasMore;
        it.hasMoreVideos = hasMoreVideos;
        it.hasMoreShorts = hasMoreShorts;
      }

      await this.enrichShortsRealDurations(newItems);

      this.logger.log(
        `Lote adicional do canal extraído com sucesso (${baseUrl}): ${newItems.length} novas mídias. hasMore: ${hasMore}`,
      );

      return newItems;
    } catch (err: any) {
      this.logger.warn(`Falha ao buscar próximo lote do canal ${baseUrl}: ${err.message}`);
      return [];
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

          const isShort = isShortTab && durationSeconds <= 180;

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

          const durationSeconds = 0;
          const durationFormatted = '--:--';
          const timestampFormatted = '00:00:00';

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

          const isShort = isShortTab && durationSeconds <= 180;

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

          const durationSeconds = 0;
          const durationFormatted = '--:--';
          const timestampFormatted = '00:00:00';

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
      (item) =>
        (item.isShort || item.is_short) &&
        (!item.durationSeconds || item.durationSeconds <= 0 || item.durationSeconds === 60),
    );

    if (shortsToEnrich.length === 0) return;

    this.logger.log(
      `Consultando metadados de tempo real para ${shortsToEnrich.length} Shorts...`,
    );

    const concurrency = 10;
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
            } else if (!item.durationSeconds || item.durationSeconds <= 0) {
              item.durationSeconds = 60;
              item.duration_seconds = 60;
              item.durationFormatted = '01:00';
              item.timestamp_formatted = '00:01:00';
            }
          } catch {
            if (!item.durationSeconds || item.durationSeconds <= 0) {
              item.durationSeconds = 60;
              item.duration_seconds = 60;
              item.durationFormatted = '01:00';
              item.timestamp_formatted = '00:01:00';
            }
          }
        }),
      );
    }
  }

  /**
   * Busca os metadados reais de tempo/duração de um vídeo/Short específico no YouTube.
   * Utiliza a API leve InnerTube Player e fallbacks com cache Redis.
   */
  async fetchVideoRealDuration(videoId: string): Promise<number> {
    if (!videoId) return 0;

    const cacheKey = `video_duration:${videoId}`;
    if (this.redisService) {
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          const val = parseInt(cached, 10);
          if (!isNaN(val) && val > 0) return val;
        }
      } catch {}
    }

    // 1. Tenta API InnerTube Player (respostas JSON limpas e imediatas ~200ms)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
          videoId,
        }),
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const rawSecs = data?.videoDetails?.lengthSeconds;
        if (rawSecs) {
          const secs = parseInt(rawSecs, 10);
          if (!isNaN(secs) && secs > 0) {
            if (this.redisService) {
              try {
                await this.redisService.set(cacheKey, String(secs), 'EX', 86400 * 7);
              } catch {}
            }
            return secs;
          }
        }
      }
    } catch {}

    // 2. Fallback: Página HTML pública do vídeo
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        signal: controller.signal,
        headers: this.getFetchHeaders(),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();

        // lengthSeconds
        const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (lengthMatch && lengthMatch[1]) {
          const secs = parseInt(lengthMatch[1], 10);
          if (secs > 0) {
            if (this.redisService) {
              try {
                await this.redisService.set(cacheKey, String(secs), 'EX', 86400 * 7);
              } catch {}
            }
            return secs;
          }
        }

        // approxDurationMs
        const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
        if (approxMatch && approxMatch[1]) {
          const ms = parseInt(approxMatch[1], 10);
          if (ms > 0) {
            const secs = Math.round(ms / 1000);
            if (this.redisService) {
              try {
                await this.redisService.set(cacheKey, String(secs), 'EX', 86400 * 7);
              } catch {}
            }
            return secs;
          }
        }

        // itemprop="duration"
        const metaMatch = html.match(
          /itemprop="duration"\s+content="PT(?:(\d+)M)?(?:(\d+)S)?"/,
        );
        if (metaMatch) {
          const mins = parseInt(metaMatch[1] || '0', 10);
          const secs = parseInt(metaMatch[2] || '0', 10);
          const total = mins * 60 + secs;
          if (total > 0) {
            if (this.redisService) {
              try {
                await this.redisService.set(cacheKey, String(total), 'EX', 86400 * 7);
              } catch {}
            }
            return total;
          }
        }
      }
    } catch {}

    return 0;
  }
}
