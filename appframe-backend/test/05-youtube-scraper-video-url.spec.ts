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

    it('deve remover sufixos de abas (/videos, /shorts)', () => {
      expect(provider.normalizeChannelUrl('https://www.youtube.com/@RockstarGames/videos')).toBe(
        'https://www.youtube.com/@RockstarGames',
      );
      expect(provider.normalizeChannelUrl('https://www.youtube.com/@RockstarGames/shorts/')).toBe(
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
  });
});
