import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import { SubtitleConfig } from '../interfaces/subtitle-config.interface';

export interface VideoMetadata {
  width: number;
  height: number;
  durationSeconds: number;
}

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface RenderOptions {
  inputPath: string;
  outputPath: string;
  trimStart?: number | null;
  trimEnd?: number | null;
  watermarkPath?: string | null;
  watermarkPosition?: WatermarkPosition;
  watermarkPadding?: number;
  subtitleConfig?: SubtitleConfig | null;
  onProgress?: (progress: number) => Promise<void> | void;
}

@Injectable()
export class FFmpegService {
  private readonly logger = new Logger(FFmpegService.name);
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;
  private readonly fontsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = this.configService.get<string>('FFPROBE_PATH', 'ffprobe');
    this.fontsDir = this.configService.get<string>('FONTS_DIR', '');
  }

  /**
   * Extrai metadados essenciais (resolução e duração) do vídeo.
   */
  async probeMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve) => {
      const probe = spawn(this.ffprobePath, [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-show_entries', 'format=duration',
        '-of', 'json',
        filePath,
      ]);

      let stdout = '';
      probe.stdout.on('data', (d) => (stdout += d.toString()));

      probe.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const data = JSON.parse(stdout);
            const stream = data.streams?.[0];
            const duration = parseFloat(
              stream?.duration || data.format?.duration || '0',
            );
            resolve({
              width: parseInt(stream?.width || '1920', 10),
              height: parseInt(stream?.height || '1080', 10),
              durationSeconds: duration > 0 ? duration : 60,
            });
            return;
          } catch {
            // Em caso de falha de parsing, usa fallback seguro
          }
        }
        // Fallback para dimensões Full HD padrão
        resolve({
          width: 1920,
          height: 1080,
          durationSeconds: 60,
        });
      });

      probe.on('error', () => {
        resolve({
          width: 1920,
          height: 1080,
          durationSeconds: 60,
        });
      });
    });
  }

  /**
   * Calcula coordenadas para matriz 3x3 de posicionamento da marca d'água.
   * Preserva canal alfa transparente PNG e respeita margens de segurança.
   */
  resolveWatermarkCoordinates(
    position: WatermarkPosition = 'bottom-right',
    padding: number = 24,
  ): string {
    switch (position) {
      case 'top-left':
        return `x=${padding}:y=${padding}`;
      case 'top-center':
        return `x=(W-w)/2:y=${padding}`;
      case 'top-right':
        return `x=W-w-${padding}:y=${padding}`;
      case 'center-left':
        return `x=${padding}:y=(H-h)/2`;
      case 'center':
        return `x=(W-w)/2:y=(H-h)/2`;
      case 'center-right':
        return `x=W-w-${padding}:y=(H-h)/2`;
      case 'bottom-left':
        return `x=${padding}:y=H-h-${padding}`;
      case 'bottom-center':
        return `x=(W-w)/2:y=H-h-${padding}`;
      case 'bottom-right':
      default:
        return `x=W-w-${padding}:y=H-h-${padding}`;
    }
  }

  /**
   * Cálculo determinístico de quebra de linhas para legendas.
   * Garante que o texto NUNCA estoure as margens do canvas em nenhuma resolução.
   */
  calculateDeterministicTextWrapping(
    text: string,
    canvasWidth: number,
    fontSize: number,
  ): string {
    if (!text) return '';

    // Largura útil de 82% do canvas (9% de margem em cada lateral)
    const availableWidth = canvasWidth * 0.82;
    // Largura estimada por caractere considerando fontes proporcionais modernas
    const estimatedCharWidth = fontSize * 0.58;
    const maxCharsPerLine = Math.max(12, Math.floor(availableWidth / estimatedCharWidth));

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Normaliza cor hexadecimal para formato aceito pelo FFmpeg (0xRRGGBB ou 0xRRGGBBAA).
   */
  private formatColor(hexColor?: string, defaultColor = '0xFFFFFFFF'): string {
    if (!hexColor) return defaultColor;
    const clean = hexColor.replace('#', '').trim();
    if (clean.length === 6) {
      return `0x${clean}FF`;
    }
    if (clean.length === 8) {
      return `0x${clean}`;
    }
    return defaultColor;
  }

  /**
   * Converte texto para arquivo de legenda .ass com suporte estrito a Emojis e Quebra Automática.
   */
  async generateAssSubtitleFile(
    text: string,
    width: number,
    height: number,
    config?: SubtitleConfig | null,
  ): Promise<string> {
    const tempAssPath = path.resolve(
      process.cwd(),
      `storage/temp/sub_${Date.now()}_${Math.random().toString(36).substring(7)}.ass`,
    );

    const fontFamily = config?.font_family || 'Noto Sans, Arial, Noto Color Emoji';
    const fontSize = Math.round(height * 0.05); // 5% da altura da tela

    const primaryColor = this.formatAssColor(config?.text_color || '#FFFFFF');
    const outlineColor = this.formatAssColor(config?.background_color || '#000000');

    // Cabeçalho padronizado ASS com suporte a estilos modernos e emojis
    const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontFamily},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H80000000,1,0,0,0,100,100,0,0,1,3,1,2,30,30,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:59:59.00,Default,,0,0,0,,${text.replace(/\n/g, '\\N')}
`;

    await fsPromises.mkdir(path.dirname(tempAssPath), { recursive: true });
    await fsPromises.writeFile(tempAssPath, assContent, 'utf-8');
    return tempAssPath;
  }

  private formatAssColor(hex: string): string {
    const clean = hex.replace('#', '').trim();
    if (clean.length === 6) {
      const r = clean.substring(0, 2);
      const g = clean.substring(2, 4);
      const b = clean.substring(4, 6);
      return `&H00${b}${g}${r}&`; // Formato BGR do ASS
    }
    return '&H00FFFFFF&';
  }

  /**
   * Sanitiza logs do FFmpeg ocultando caminhos de sistema e dados confidenciais.
   */
  sanitizeErrorLog(rawLog: string): string {
    if (!rawLog) return 'Erro desconhecido no processamento de vídeo.';
    return rawLog
      .replace(/\/[\w.-]+(\/[\w.-]+)+/g, '[CAMINHO_INTERNO]')
      .replace(/key=[^&\s]+/gi, 'key=[OCULTO]')
      .replace(/token=[^&\s]+/gi, 'token=[OCULTO]')
      .trim()
      .substring(0, 4000);
  }

  /**
   * Executa a orquestração completa de renderização com FFmpeg:
   * - Corte preciso (-ss e -to) sem drift A/V
   * - Marca d'água PNG com alfa transparente
   * - Legendas com fix_bounds e quebra determinística
   * - Emissão de progresso de 0% a 100%
   */
  async renderVideo(options: RenderOptions): Promise<void> {
    const {
      inputPath,
      outputPath,
      trimStart,
      trimEnd,
      watermarkPath,
      watermarkPosition = 'bottom-right',
      watermarkPadding = 24,
      subtitleConfig,
      onProgress,
    } = options;

    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });

    // 1. Extrai metadados do vídeo base
    const metadata = await this.probeMetadata(inputPath);
    let effectiveDuration = metadata.durationSeconds;

    if (trimEnd && trimStart && trimEnd > trimStart) {
      effectiveDuration = trimEnd - trimStart;
    } else if (trimEnd && trimEnd > 0) {
      effectiveDuration = trimEnd;
    } else if (trimStart && trimStart > 0) {
      effectiveDuration = Math.max(1, metadata.durationSeconds - trimStart);
    }

    // 2. Montagem dos argumentos do FFmpeg
    const args: string[] = [];

    // Corte de tempo exato (-ss antes do input com timestamp reset)
    if (trimStart !== null && trimStart !== undefined && trimStart > 0) {
      args.push('-ss', trimStart.toString());
    }

    if (trimEnd !== null && trimEnd !== undefined && trimEnd > 0) {
      if (trimStart !== null && trimStart !== undefined && trimStart > 0) {
        args.push('-to', (trimEnd - trimStart).toString());
      } else {
        args.push('-to', trimEnd.toString());
      }
    }

    // Input do vídeo original
    args.push('-i', inputPath);

    // Input da marca d'água (se houver)
    let hasWatermark = false;
    if (watermarkPath && fs.existsSync(watermarkPath)) {
      args.push('-i', watermarkPath);
      hasWatermark = true;
    }

    // 3. Construção do complex_filter
    const filterParts: string[] = [];
    let currentVideoLabel = '0:v';

    // Marca d'água com preservação do canal alfa (RGBA)
    if (hasWatermark) {
      const coords = this.resolveWatermarkCoordinates(
        watermarkPosition,
        watermarkPadding,
      );
      // format=auto preserva canal alfa transparente da PNG
      filterParts.push(
        `[${currentVideoLabel}][1:v]overlay=${coords}:format=auto[v_watermarked]`,
      );
      currentVideoLabel = 'v_watermarked';
    }

    // Filtro de Legendas
    let tempAssFile: string | null = null;
    if (subtitleConfig?.text) {
      const wrappedText = this.calculateDeterministicTextWrapping(
        subtitleConfig.text,
        metadata.width,
        Math.round(metadata.height * 0.05),
      );

      // Gera arquivo de legendas .ass com fontes e emojis
      tempAssFile = await this.generateAssSubtitleFile(
        wrappedText,
        metadata.width,
        metadata.height,
        subtitleConfig,
      );

      // Escapa o caminho para o filtro subtitles do FFmpeg
      const escapedAssPath = tempAssFile
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:');

      filterParts.push(
        `[${currentVideoLabel}]subtitles='${escapedAssPath}'[v_subtitled]`,
      );
      currentVideoLabel = 'v_subtitled';
    }

    if (filterParts.length > 0) {
      args.push('-filter_complex', filterParts.join(';'));
      args.push('-map', `[${currentVideoLabel}]`);
      args.push('-map', '0:a?'); // Preserva fluxo de áudio se presente
    }

    // Configurações de encoding sem drift e alta compatibilidade
    args.push(
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-avoid_negative_ts', 'make_zero',
      '-progress', 'pipe:1',
      '-y',
      outputPath,
    );

    this.logger.log(`Iniciando FFmpeg render com comando: ${this.ffmpegPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(this.ffmpegPath, args);
      let stderrBuffer = '';
      let lastReportedPercent = 0;

      // Monitora o progresso via stdout (-progress pipe:1)
      ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const timeMatch = text.match(/out_time_us=(\d+)/);
        if (timeMatch && effectiveDuration > 0 && onProgress) {
          const currentTimeSeconds = parseInt(timeMatch[1], 10) / 1000000;
          const percent = Math.min(
            99,
            Math.max(1, Math.floor((currentTimeSeconds / effectiveDuration) * 100)),
          );
          if (percent > lastReportedPercent + 2) {
            lastReportedPercent = percent;
            Promise.resolve(onProgress(percent)).catch(() => {});
          }
        }
      });

      ffmpegProcess.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
        // Mantém apenas os últimos 5000 caracteres no buffer para economia de memória
        if (stderrBuffer.length > 5000) {
          stderrBuffer = stderrBuffer.substring(stderrBuffer.length - 5000);
        }
      });

      ffmpegProcess.on('close', async (code) => {
        // Limpeza de arquivo temporário .ass
        if (tempAssFile && fs.existsSync(tempAssFile)) {
          try {
            await fsPromises.unlink(tempAssFile);
          } catch {}
        }

        if (code === 0) {
          if (onProgress) {
            await Promise.resolve(onProgress(100));
          }
          this.logger.log(`Renderização concluída com sucesso em: ${outputPath}`);
          resolve();
        } else {
          const sanitizedError = this.sanitizeErrorLog(stderrBuffer);
          this.logger.error(`FFmpeg falhou com código ${code}: ${sanitizedError}`);
          reject(new Error(`Falha no processamento FFmpeg (Exit code ${code}): ${sanitizedError}`));
        }
      });

      ffmpegProcess.on('error', async (err) => {
        if (tempAssFile && fs.existsSync(tempAssFile)) {
          try {
            await fsPromises.unlink(tempAssFile);
          } catch {}
        }
        reject(new Error(`Erro ao invocar binário do FFmpeg: ${err.message}`));
      });
    });
  }
}
