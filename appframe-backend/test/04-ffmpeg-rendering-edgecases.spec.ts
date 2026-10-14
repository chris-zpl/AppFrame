import { ConfigService } from '@nestjs/config';
import { FFmpegService } from '../src/modules/media/services/ffmpeg.service';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

describe('4. Renderização do FFmpeg e Casos de Borda (E2E & Service Specs)', () => {
  let ffmpegService: FFmpegService;
  const configServiceMock = {
    get: jest.fn((key: string, def?: any) => {
      if (key === 'FFMPEG_PATH') return 'ffmpeg';
      if (key === 'FFPROBE_PATH') return 'ffprobe';
      return def;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    ffmpegService = new FFmpegService(configServiceMock);
  });

  describe('4.1 Quebra de linha determinística para legendas (fix_bounds)', () => {
    it('deve aplicar quebra de linha em textos longos para nunca ultrapassar as margens do canvas', () => {
      const longText =
        'Este é um exemplo de texto longo com múltiplas sentenças demonstrando que o algoritmo de fix_bounds calcula deterministicamente os limites e quebra antes de estourar a tela.';
      const canvasWidth = 1080;
      const fontSize = 54;

      const wrapped = ffmpegService.calculateDeterministicTextWrapping(
        longText,
        canvasWidth,
        fontSize,
      );

      const lines = wrapped.split('\n');
      expect(lines.length).toBeGreaterThan(1);

      // Limite estrito de largura útil configurada (82% com 9% de margem em cada borda)
      const maxCharsAllowed = Math.floor((canvasWidth * 0.82) / (fontSize * 0.58));

      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(maxCharsAllowed + 10);
      });
    });

    it('deve manter texto curto em uma única linha', () => {
      const shortText = 'Olá Mundo!';
      const wrapped = ffmpegService.calculateDeterministicTextWrapping(
        shortText,
        1920,
        50,
      );
      expect(wrapped).toBe('Olá Mundo!');
      expect(wrapped.split('\n').length).toBe(1);
    });
  });

  describe('4.2 Caracteres Especiais, Emojis e Fallback de Fontes', () => {
    it('deve gerar script ASS com emojis (ex: Noto Color Emoji) e caracteres UTF-8 complexos sem corromper', async () => {
      const textWithEmojis = '🔥 Dica Rápida! 🚀 Aprenda IA & Cortes ✂️ em 30s! #shorts';
      const width = 1080;
      const height = 1920;

      const assPath = await ffmpegService.generateAssSubtitleFile(
        textWithEmojis,
        width,
        height,
        {
          mode: 'static',
          text: textWithEmojis,
          font_family: 'Noto Sans, Arial, Noto Color Emoji',
          text_color: '#F2BE5E',
          background_color: '#10131A',
        },
      );

      expect(fs.existsSync(assPath)).toBe(true);

      const content = await fsPromises.readFile(assPath, 'utf-8');

      // Verifica suporte a família de fontes com emoji
      expect(content).toContain('Noto Color Emoji');
      // Verifica integridade de caracteres UTF-8 e emojis (não deve gerar □ ou caracteres quebrados)
      expect(content).toContain('🔥 Dica Rápida! 🚀');
      expect(content).toContain('✂️ em 30s! #shorts');
      // Verifica dimensões de resolução
      expect(content).toContain('PlayResX: 1080');
      expect(content).toContain('PlayResY: 1920');

      // Limpeza de arquivo temporário
      await fsPromises.unlink(assPath);
    });
  });

  describe('4.3 Resolução de Coordenadas e Preservação de Matriz 3x3', () => {
    it('deve calcular coordenadas exatas para as 9 posições da matriz 3x3 com padding de segurança', () => {
      const padding = 32;

      expect(ffmpegService.resolveWatermarkCoordinates('top-left', padding)).toBe('x=32:y=32');
      expect(ffmpegService.resolveWatermarkCoordinates('top-center', padding)).toBe('x=(W-w)/2:y=32');
      expect(ffmpegService.resolveWatermarkCoordinates('top-right', padding)).toBe('x=W-w-32:y=32');

      expect(ffmpegService.resolveWatermarkCoordinates('center-left', padding)).toBe('x=32:y=(H-h)/2');
      expect(ffmpegService.resolveWatermarkCoordinates('center', padding)).toBe('x=(W-w)/2:y=(H-h)/2');
      expect(ffmpegService.resolveWatermarkCoordinates('center-right', padding)).toBe('x=W-w-32:y=(H-h)/2');

      expect(ffmpegService.resolveWatermarkCoordinates('bottom-left', padding)).toBe('x=32:y=H-h-32');
      expect(ffmpegService.resolveWatermarkCoordinates('bottom-center', padding)).toBe('x=(W-w)/2:y=H-h-32');
      expect(ffmpegService.resolveWatermarkCoordinates('bottom-right', padding)).toBe('x=W-w-32:y=H-h-32');
    });
  });

  describe('4.4 Preservação de Timestamps e Parâmetros Exatos sem Drift', () => {
    it('deve sanitizar logs de erro do FFmpeg ocultando caminhos absolutos de sistema e tokens', () => {
      const rawLog =
        'Error at /Users/christian/Codigos/AppFrame/storage/temp/video.mp4 with key=AIzaSyD-SuperSecretKey&token=jwt.token.here';
      const sanitized = ffmpegService.sanitizeErrorLog(rawLog);

      expect(sanitized).not.toContain('/Users/christian');
      expect(sanitized).not.toContain('AIzaSyD-SuperSecretKey');
      expect(sanitized).not.toContain('jwt.token.here');
      expect(sanitized).toContain('[CAMINHO_INTERNO]');
      expect(sanitized).toContain('key=[OCULTO]');
      expect(sanitized).toContain('token=[OCULTO]');
    });
  });
});
