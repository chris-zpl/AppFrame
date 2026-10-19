import { YouTubeScraperProvider } from '../src/modules/scraper/providers/youtube-scraper.provider';
import { NotFoundException } from '@nestjs/common';

describe('5. Varredura com URL de Vídeo e Resolução de Canal (YouTubeScraperProvider)', () => {
  let provider: YouTubeScraperProvider;

  beforeEach(() => {
    provider = new YouTubeScraperProvider();
  });

  describe('5.1 Extração de ID de vídeo (extractVideoId)', () => {
    it('deve extrair ID de 11 caracteres de URLs padrão de watch', () => {
      const url = 'https://www.youtube.com/watch?v=tJbzMqJGH4k';
      expect(provider.extractVideoId(url)).toBe('tJbzMqJGH4k');
    });

    it('deve extrair ID com parâmetros adicionais de query', () => {
      const url = 'https://www.youtube.com/watch?v=tJbzMqJGH4k&feature=shared&t=120';
      expect(provider.extractVideoId(url)).toBe('tJbzMqJGH4k');
    });

    it('deve extrair ID de URLs encurtadas youtu.be', () => {
      const url = 'https://youtu.be/tJbzMqJGH4k?si=abcdef';
      expect(provider.extractVideoId(url)).toBe('tJbzMqJGH4k');
    });

    it('deve extrair ID de URLs de Shorts', () => {
      const url = 'https://www.youtube.com/shorts/MJOrsRRa9GM?feature=share';
      expect(provider.extractVideoId(url)).toBe('MJOrsRRa9GM');
    });

    it('deve extrair ID de URLs de embed', () => {
      const url = 'https://www.youtube.com/embed/tJbzMqJGH4k';
      expect(provider.extractVideoId(url)).toBe('tJbzMqJGH4k');
    });

    it('deve extrair ID de URLs de transmissões ao vivo /live/ID', () => {
      const url = 'https://www.youtube.com/live/1tsUaefpMUo?feature=share';
      expect(provider.extractVideoId(url)).toBe('1tsUaefpMUo');
    });

    it('deve retornar null para URLs ou handles de canal', () => {
      expect(provider.extractVideoId('https://www.youtube.com/@RockstarGames')).toBeNull();
      expect(provider.extractVideoId('https://www.youtube.com/@RockstarGames/videos')).toBeNull();
      expect(provider.extractVideoId('https://www.youtube.com/channel/UC6VcWc1rAoWdBCM0JxrRQ3A')).toBeNull();
      expect(provider.extractVideoId('@RockstarGames')).toBeNull();
      expect(provider.extractVideoId('RockstarGames')).toBeNull();
    });
  });

  describe('5.2 Normalização de URL de Canal (normalizeChannelUrl)', () => {
    it('deve converter handles @nome para HTTPS canônico', () => {
      expect(provider.normalizeChannelUrl('@RockstarGames')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
    });

    it('deve forçar HTTPS em URLs HTTP', () => {
      expect(provider.normalizeChannelUrl('http://www.youtube.com/@RockstarGames')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
    });

    it('deve remover sufixos de abas (/videos, /shorts, /streams, /live)', () => {
      expect(provider.normalizeChannelUrl('https://www.youtube.com/@RockstarGames/videos')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
      expect(provider.normalizeChannelUrl('https://www.youtube.com/@RockstarGames/shorts/')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
      expect(provider.normalizeChannelUrl('https://www.youtube.com/@RockstarGames/live')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
      expect(provider.normalizeChannelUrl('https://www.youtube.com/@RockstarGames/streams/')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
    });
  });

  describe('5.3 Varredura com URL de vídeo específico (scanChannel)', () => {
    it('deve resolver o canal, posicionar o vídeo alvo no início com isTargetVideo e selected', async () => {
      const targetVideoId = 'tJbzMqJGH4k';
      const mockResolved = {
        channelUrl: 'https://www.youtube.com/@RockstarGames',
        channelTitle: 'Rockstar Games',
        channelAvatarUrl: 'https://yt3.ggpht.com/avatar.jpg',
        video: {
          id: targetVideoId,
          title: 'Grand Theft Auto VI: An Extended Look',
          thumbnailUrl: 'https://i.ytimg.com/vi/tJbzMqJGH4k/hqdefault.jpg',
          durationSeconds: 1608,
          isShort: false,
        },
      };

      jest.spyOn(provider, 'resolveChannelFromVideo').mockResolvedValue(mockResolved);

      // Simula aba /videos contendo outro vídeo e o vídeo alvo
      jest.spyOn(provider as any, 'scrapeTab').mockImplementation(async (url: string) => {
        if (url.includes('/videos')) {
          return {
            items: [
              {
                id: 'other123456',
                url: 'https://www.youtube.com/watch?v=other123456',
                title: 'Outro Vídeo do Canal',
                thumbnailUrl: 'https://i.ytimg.com/vi/other123456/hqdefault.jpg',
                thumbnail_url: 'https://i.ytimg.com/vi/other123456/hqdefault.jpg',
                durationSeconds: 300,
                duration_seconds: 300,
                durationFormatted: '05:00',
                timestamp_formatted: '00:05:00',
                isShort: false,
              },
              {
                id: targetVideoId,
                url: `https://www.youtube.com/watch?v=${targetVideoId}`,
                title: 'Grand Theft Auto VI: An Extended Look',
                thumbnailUrl: 'https://i.ytimg.com/vi/tJbzMqJGH4k/hqdefault.jpg',
                thumbnail_url: 'https://i.ytimg.com/vi/tJbzMqJGH4k/hqdefault.jpg',
                durationSeconds: 1608,
                duration_seconds: 1608,
                durationFormatted: '26:48',
                timestamp_formatted: '00:26:48',
                isShort: false,
              },
            ],
            notFound: false,
            channelTitle: 'Rockstar Games',
            channelAvatarUrl: 'https://yt3.ggpht.com/avatar.jpg',
          };
        }
        return { items: [], notFound: false };
      });

      jest.spyOn(provider, 'enrichShortsRealDurations').mockResolvedValue();

      const results = await provider.scanChannel(`https://www.youtube.com/watch?v=${targetVideoId}`);

      expect(results.length).toBe(2);
      // Primeiro item deve ser o vídeo alvo
      expect(results[0].id).toBe(targetVideoId);
      expect(results[0].isTargetVideo).toBe(true);
      expect(results[0].selected).toBe(true);
      expect(results[0].channelTitle).toBe('Rockstar Games');
      expect(results[0].channelAvatarUrl).toBe('https://yt3.ggpht.com/avatar.jpg');

      // Segundo item deve ser o outro vídeo do canal
      expect(results[1].id).toBe('other123456');
      expect(results[1].isTargetVideo).toBeUndefined();
    });

    it('deve injetar o vídeo alvo no início mesmo se não constar nas primeiras páginas do canal', async () => {
      const targetVideoId = 'oldVideo123';
      const mockResolved = {
        channelUrl: 'https://www.youtube.com/@RockstarGames',
        channelTitle: 'Rockstar Games',
        channelAvatarUrl: 'https://yt3.ggpht.com/avatar.jpg',
        video: {
          id: targetVideoId,
          title: 'GTA Antigo 2013',
          thumbnailUrl: 'https://i.ytimg.com/vi/oldVideo123/hqdefault.jpg',
          durationSeconds: 120,
          isShort: false,
        },
      };

      jest.spyOn(provider, 'resolveChannelFromVideo').mockResolvedValue(mockResolved);

      // Canal só retorna vídeos recentes onde o vídeo alvo não está presente
      jest.spyOn(provider as any, 'scrapeTab').mockImplementation(async (url: string) => {
        if (url.includes('/videos')) {
          return {
            items: [
              {
                id: 'recent00112',
                url: 'https://www.youtube.com/watch?v=recent00112',
                title: 'Vídeo Recente',
                thumbnailUrl: 'https://i.ytimg.com/vi/recent00112/hqdefault.jpg',
                thumbnail_url: 'https://i.ytimg.com/vi/recent00112/hqdefault.jpg',
                durationSeconds: 180,
                duration_seconds: 180,
                durationFormatted: '03:00',
                timestamp_formatted: '00:03:00',
                isShort: false,
              },
            ],
            notFound: false,
            channelTitle: 'Rockstar Games',
          };
        }
        return { items: [], notFound: false };
      });

      jest.spyOn(provider, 'enrichShortsRealDurations').mockResolvedValue();

      const results = await provider.scanChannel(`https://www.youtube.com/watch?v=${targetVideoId}`);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(targetVideoId);
      expect(results[0].isTargetVideo).toBe(true);
      expect(results[0].selected).toBe(true);
      expect(results[0].title).toBe('GTA Antigo 2013');
      expect(results[1].id).toBe('recent00112');
    });

    it('deve identificar URL de live, resolver canal de origem, carregar apenas vídeos/shorts normais, bloquear seleção e marcar wasLiveInput', async () => {
      const liveVideoId = '1tsUaefpMUo';
      const liveUrl = `https://www.youtube.com/live/${liveVideoId}`;
      const mockResolved = {
        channelUrl: 'https://www.youtube.com/@FlowGamesPodcast',
        channelTitle: 'Flow Games Podcast',
        channelAvatarUrl: 'https://yt3.ggpht.com/avatar.jpg',
        isLive: true,
        video: {
          id: liveVideoId,
          title: 'Flow Games Ao Vivo Especial',
          thumbnailUrl: `https://i.ytimg.com/vi/${liveVideoId}/hqdefault.jpg`,
          durationSeconds: 7200,
          isShort: false,
        },
      };

      jest.spyOn(provider, 'resolveChannelFromVideo').mockResolvedValue(mockResolved);

      jest.spyOn(provider as any, 'scrapeTab').mockImplementation(async (url: string) => {
        if (url.includes('/videos')) {
          return {
            items: [
              {
                id: 'regular12345',
                url: 'https://www.youtube.com/watch?v=regular12345',
                title: 'Vídeo Regular do Canal',
                thumbnailUrl: 'https://i.ytimg.com/vi/regular12345/hqdefault.jpg',
                thumbnail_url: 'https://i.ytimg.com/vi/regular12345/hqdefault.jpg',
                durationSeconds: 600,
                duration_seconds: 600,
                durationFormatted: '10:00',
                timestamp_formatted: '00:10:00',
                isShort: false,
                is_short: false,
              },
            ],
            notFound: false,
            channelTotalVideos: 50,
          };
        }
        return { items: [], notFound: false };
      });

      jest.spyOn(provider, 'enrichShortsRealDurations').mockResolvedValue(undefined as any);

      const results = await provider.scanChannel(liveUrl);

      // A live NÃO deve estar nos resultados
      expect(results.some((r) => r.id === liveVideoId)).toBe(false);
      // O vídeo regular do canal deve estar presente
      expect(results.some((r) => r.id === 'regular12345')).toBe(true);
      // Nenhum vídeo deve vir pré-selecionado como target
      expect(results.some((r) => r.isTargetVideo)).toBe(false);
      expect(results.some((r) => r.selected)).toBe(false);
      // wasLiveInput deve estar true
      expect(results[0].wasLiveInput).toBe(true);
      // Canal de origem deve estar preenchido
      expect(results[0].channelTitle).toBe('Flow Games Podcast');
    });
  });

  describe('5.4 Paginação sob Demanda (fetchMore)', () => {
    it('deve retornar array vazio se não houver sessão/tokens para o canal', async () => {
      const more = await provider.fetchMore('https://www.youtube.com/@CanalVazio');
      expect(more).toEqual([]);
    });

    it('deve buscar novo lote de mídias quando houver continuationToken salvo', async () => {
      const channelUrl = 'https://www.youtube.com/@RockstarGames';
      // Simula token salvo
      (provider as any).saveTokens(channelUrl, {
        videosToken: 'token123',
        shortsToken: null,
        visitedIds: [],
        channelTitle: 'Rockstar Games',
      });

      // Mock do fetch global para o endpoint browse do YouTube
      const mockBrowseData = {
        onResponseReceivedActions: [
          {
            appendContinuationItemsAction: {
              continuationItems: [
                {
                  gridVideoRenderer: {
                    videoId: 'nextVid001',
                    title: { runs: [{ text: 'Vídeo da Página 2' }] },
                  },
                },
              ],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBrowseData,
      } as any);

      jest.spyOn(provider, 'enrichShortsRealDurations').mockResolvedValue(undefined as any);

      const items = await provider.fetchMore(channelUrl, 'all');
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('5.5 Contagem Total de Vídeos do Canal (parseVideoCountText & extractChannelTotalVideos)', () => {
    it('deve converter strings de contagem em inteiros', () => {
      expect(provider.parseVideoCountText('431 vídeos')).toBe(431);
      expect(provider.parseVideoCountText('4,6\u00a0mil vídeos')).toBe(4600);
      expect(provider.parseVideoCountText('1 mil vídeos')).toBe(1000);
      expect(provider.parseVideoCountText('1.250 vídeos')).toBe(1250);
      expect(provider.parseVideoCountText('25 videos')).toBe(25);
      expect(provider.parseVideoCountText('1 vídeo')).toBe(1);
      expect(provider.parseVideoCountText(undefined)).toBeNull();
      expect(provider.parseVideoCountText('sem número')).toBeNull();
    });

    it('deve extrair total de vídeos de pageHeaderViewModel metadataRows', () => {
      const mockInitialData = {
        header: {
          pageHeaderRenderer: {
            content: {
              pageHeaderViewModel: {
                metadata: {
                  contentMetadataViewModel: {
                    metadataRows: [
                      { metadataParts: [{ text: { content: '@Canal' } }] },
                      {
                        metadataParts: [
                          { text: { content: '10 mil inscritos' } },
                          { text: { content: '431 vídeos' } },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const count = provider.extractChannelTotalVideos(mockInitialData, '');
      expect(count).toBe(431);
    });

    it('deve extrair total de vídeos via fallback regex no HTML', () => {
      const html = 'some prefix "content":"4,6 mil vídeos" some suffix';
      const count = provider.extractChannelTotalVideos({}, html);
      expect(count).toBe(4600);
    });

    it('deve extrair channelId a partir de tabs ou html', () => {
      const mockData = {
        contents: {
          twoColumnBrowseResultsRenderer: {
            tabs: [
              {
                tabRenderer: {
                  endpoint: {
                    browseEndpoint: {
                      browseId: 'UCUZfhX79dQrJvAgYefiXCCA',
                    },
                  },
                },
              },
            ],
          },
        },
      };
      expect(provider.extractChannelId(mockData)).toBe('UCUZfhX79dQrJvAgYefiXCCA');
      expect(provider.extractChannelId({}, 'prefix "browseId":"UC6VcWc1rAoWdBCM0JxrRQ3A" suffix')).toBe(
        'UC6VcWc1rAoWdBCM0JxrRQ3A',
      );
    });

    it('deve retornar fallbackTotal se channelId for inválido ou não informado', async () => {
      const counts = await provider.resolveChannelVideosAndShortsCount(undefined, 3700);
      expect(counts.total).toBe(3700);
    });

    it('deve somar vídeos longos e shorts (UULF + UUSH) excluindo livestreams', async () => {
      const channelId = 'UCUZfhX79dQrJvAgYefiXCCA';
      jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('list=UULF')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"478"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        if (urlStr.includes('list=UUSH')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"2.159"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        if (urlStr.includes('list=UULV')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"1.070"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        if (urlStr.includes('list=UU')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"3.707"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        return { ok: false } as any;
      });

      const counts = await provider.resolveChannelVideosAndShortsCount(channelId, 3700);
      expect(counts.total).toBe(2637);
      expect(counts.regularVideos).toBe(478);
      expect(counts.shorts).toBe(2159);
    });

    it('deve usar UULF diretamente se o canal não tiver shorts (UUSH 404)', async () => {
      const channelId = 'UCxNehdbyTPxJO76kOPpHoCg';
      jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('list=UULF')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"1.051"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        if (urlStr.includes('list=UUSH')) {
          return { ok: false, status: 404 } as any;
        }
        if (urlStr.includes('list=UULV')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"Um vídeo"}]}] suffix',
          } as any;
        }
        if (urlStr.includes('list=UU')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"1.052"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        return { ok: false } as any;
      });

      const counts = await provider.resolveChannelVideosAndShortsCount(channelId, 1000);
      expect(counts.total).toBe(1051);
      expect(counts.regularVideos).toBe(1051);
    });

    it('deve calcular a partir de UU - UULV se UULF e UUSH falharem', async () => {
      const channelId = 'UCtest123456789012345678';
      jest.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('list=UULF') || urlStr.includes('list=UUSH')) {
          return { ok: false, status: 404 } as any;
        }
        if (urlStr.includes('list=UULV')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"20"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        if (urlStr.includes('list=UU')) {
          return {
            ok: true,
            text: async () => 'prefix "stats":[{"runs":[{"text":"120"},{"text":" vídeos"}]}] suffix',
          } as any;
        }
        return { ok: false } as any;
      });

      const counts = await provider.resolveChannelVideosAndShortsCount(channelId, 120);
      expect(counts.total).toBe(100);
    });
  });
});
