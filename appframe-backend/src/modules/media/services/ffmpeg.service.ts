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
  aspectRatio?: string | null;
  trimStart?: number | null;
  trimEnd?: number | null;
  watermarkPath?: string | null;
  watermarkPosition?: WatermarkPosition;
  watermarkScale?: number;
  watermarkOpacity?: number;
  watermarkPadding?: number;
  subtitleConfig?: SubtitleConfig | null;
  onProgress?: (progress: number) => Promise<void> | void;
}

@Injectable()
export class FFmpegService {
  private readonly logger = new Logger(FFmpegService.name);
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(private readonly configService: ConfigService) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = this.configService.get<string>('FFPROBE_PATH', 'ffprobe');
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
   * Extrai a onda sonora real (Audio Waveform) do arquivo de vídeo/áudio via FFmpeg (PCM 16-bit mono),
   * dividindo o sinal real em buckets normalizados [0.08 .. 1.0] para exibição fiel na timeline do Studio.
   */
  async extractAudioWaveform(
    filePath: string,
    bucketsCount: number = 70,
  ): Promise<number[]> {
    return new Promise((resolve) => {
      const proc = spawn(this.ffmpegPath, [
        '-v',
        'error',
        '-i',
        filePath,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '1000',
        '-f',
        's16le',
        'pipe:1',
      ]);

      const chunks: Buffer[] = [];
      let totalLength = 0;
      const maxBufferBytes = 10 * 1024 * 1024;

      proc.stdout.on('data', (chunk: Buffer) => {
        if (totalLength < maxBufferBytes) {
          chunks.push(chunk);
          totalLength += chunk.length;
        }
      });

      proc.on('close', () => {
        const buffer = Buffer.concat(chunks);
        const totalSamples = Math.floor(buffer.length / 2);

        if (totalSamples < bucketsCount) {
          resolve(Array(bucketsCount).fill(0.08));
          return;
        }

        const samplesPerBucket = Math.max(
          1,
          Math.floor(totalSamples / bucketsCount),
        );
        const rawPeaks: number[] = [];
        let maxPeak = 0;

        for (let b = 0; b < bucketsCount; b++) {
          const startSample = b * samplesPerBucket;
          const endSample =
            b === bucketsCount - 1
              ? totalSamples
              : Math.min(totalSamples, startSample + samplesPerBucket);

          let sumSquares = 0;
          let count = 0;
          let localMax = 0;

          for (let s = startSample; s < endSample; s++) {
            const sample = Math.abs(buffer.readInt16LE(s * 2)) / 32768;
            sumSquares += sample * sample;
            if (sample > localMax) {
              localMax = sample;
            }
            count++;
          }

          const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
          const combined = rms * 0.65 + localMax * 0.35;
          rawPeaks.push(combined);
          if (combined > maxPeak) {
            maxPeak = combined;
          }
        }

        if (maxPeak <= 0.0001) {
          resolve(Array(bucketsCount).fill(0.08));
          return;
        }

        const normalized = rawPeaks.map((val) =>
          Math.max(0.08, Math.min(1, Number((val / maxPeak).toFixed(3)))),
        );
        resolve(normalized);
      });

      proc.on('error', () => {
        resolve(Array(bucketsCount).fill(0.08));
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
   * Caminho vetorial em formato ASS para retângulo com cantos arredondados (roundRect)
   * posicionado a partir de seu topo-esquerdo (0,0).
   */
  private generateAssRoundedRectPath(w: number, h: number, r: number): string {
    const k = Math.round(0.5522847 * r);
    return [
      `m ${r} 0`,
      `l ${w - r} 0`,
      `b ${w - r + k} 0 ${w} ${r - k} ${w} ${r}`,
      `l ${w} ${h - r}`,
      `b ${w} ${h - r + k} ${w - r + k} ${h} ${w - r} ${h}`,
      `l ${r} ${h}`,
      `b ${r - k} ${h} 0 ${h - r + k} 0 ${h - r}`,
      `l 0 ${r}`,
      `b 0 ${r - k} ${r - k} 0 ${r} 0`,
    ].join(' ');
  }

  /**
   * Formata segundos em timestamp padrão ASS (H:MM:SS.cs).
   */
  private formatAssTimestamp(seconds: number): string {
    const totalCs = Math.max(0, Math.round(seconds * 100));
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const m = totalMin % 60;
    const h = Math.floor(totalMin / 60);
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
  }

  /**
   * Estimativa de largura em pixels para fontes proporcionais modernas em caso de ausência de medição prévia.
   */
  private estimateLineWidth(text: string, fontSize: number): number {
    let w = 0;
    for (const ch of text) {
      if ('ijlIt1.,;:!| \''.includes(ch)) {
        w += fontSize * 0.28;
      } else if ('mwMW@%#&'.includes(ch)) {
        w += fontSize * 0.85;
      } else if (ch >= 'A' && ch <= 'Z') {
        w += fontSize * 0.65;
      } else if (ch >= 'a' && ch <= 'z') {
        w += fontSize * 0.52;
      } else if (ch >= '0' && ch <= '9') {
        w += fontSize * 0.56;
      } else {
        w += fontSize * 0.60;
      }
    }
    return w;
  }

  /**
   * Quebra determinística de linhas respeitando as margens seguras (safe zone) do Studio.
   */
  private calculateDeterministicLines(
    text: string,
    canvasWidth: number,
    fontSize: number,
    canvasScale = 3.0,
  ): Array<{ text: string; width?: number }> {
    if (!text || !text.trim()) return [];

    const safePadding = Math.max(48 * canvasScale, canvasWidth * 0.08);
    const maxTextWidth = canvasWidth - safePadding * 2;

    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines: Array<{ text: string; width?: number }> = [];
    let currentLine = '';

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      const testWidth = this.estimateLineWidth(testLine, fontSize);
      if (testWidth > maxTextWidth && currentLine) {
        lines.push({
          text: currentLine,
          width: this.estimateLineWidth(currentLine, fontSize) / canvasScale,
        });
        currentLine = w;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push({
        text: currentLine,
        width: this.estimateLineWidth(currentLine, fontSize) / canvasScale,
      });
    }
    return lines;
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
   * Cálculo determinístico de quebra de linhas para legendas (compatibilidade com suite de testes).
   */
  calculateDeterministicTextWrapping(
    text: string,
    canvasWidth: number,
    fontSize: number,
  ): string {
    const lines = this.calculateDeterministicLines(text, canvasWidth, fontSize, 1.0);
    return lines.map((l) => l.text).join('\n');
  }

  /**
   * Converte texto para arquivo de legenda .ass com fidelidade de 100% ao Studio:
   * - Badges individuais por linha com cantos arredondados (roundRect)
   * - Alinhamento e posicionamento vertical fiel à safe zone
   * - Suporte sincronizado a legendas dinâmicas do Gemini com efeito karaoke
   */
  async generateAssSubtitleFile(
    arg1: string | number,
    arg2: number,
    arg3?: number | SubtitleConfig | null,
    arg4?: SubtitleConfig | boolean | null,
    arg5?: boolean | number,
    arg6?: number,
    arg7?: number,
  ): Promise<string> {
    let width: number;
    let height: number;
    let config: SubtitleConfig | null | undefined;
    let isVertical = false;
    let durationSeconds = 3600;
    let trimStart = 0;
    let trimEnd: number | undefined;

    if (typeof arg1 === 'string') {
      // Assinatura legada: (text, width, height, config, isVertical)
      width = arg2;
      height = arg3 as number;
      config = (arg4 as SubtitleConfig) || { mode: 'static', text: arg1 };
      if (!config.text) config.text = arg1;
      isVertical = Boolean(arg5);
    } else {
      width = arg1;
      height = arg2;
      config = arg3 as SubtitleConfig;
      isVertical = Boolean(arg4);
      durationSeconds = typeof arg5 === 'number' ? arg5 : 3600;
      trimStart = typeof arg6 === 'number' ? arg6 : 0;
      trimEnd = arg7;
    }
    const tempAssPath = path.resolve(
      process.cwd(),
      `storage/temp/sub_${Date.now()}_${Math.random().toString(36).substring(7)}.ass`,
    );

    const userFont = (config?.font_family || 'Plus Jakarta Sans').split(',')[0].trim();
    const validFonts = ['Plus Jakarta Sans', 'Montserrat', 'Bebas Neue', 'Anton'];
    const fontFamily = validFonts.includes(userFont) ? userFont : (userFont || 'Plus Jakarta Sans');

    const canvasScale = 3.0;
    const rawFontSize = config?.font_size || 28;
    const fontSize = Math.round(rawFontSize * canvasScale);
    const paddingX = Math.round(14 * canvasScale);
    const paddingY = Math.round(8 * canvasScale);
    const boxHeight = fontSize + paddingY;
    const radius = Math.round(8 * canvasScale);
    const lineHeight = Math.round(fontSize * 1.35);
    const startY = Math.round(height * (isVertical ? 0.72 : 0.78));
    const centerX = Math.round(width / 2);

    const primaryColor = this.formatAssColor(config?.text_color || '#FFFFFF');
    const outlineColor = this.formatAssColor(config?.stroke_color || '#000000');
    const boxColor = this.formatAssColor(config?.background_color || '#10131A');
    const highlightColor = '&H005EBEF2&'; // Âmbar #F2BE5E
    const useBackgroundBox = config?.use_background_box ?? true;
    const outlineThickness = Math.round(4 * canvasScale);

    let stylesSection = `Style: Default,${fontFamily},${fontSize},${primaryColor},&H00FFFFFF&,${outlineColor},&H00000000&,1,0,0,0,100,100,0,0,1,${outlineThickness},0,5,0,0,0,1\n`;
    stylesSection += `Style: HighlightText,${fontFamily},${fontSize},${highlightColor},${primaryColor},${outlineColor},&H00000000&,1,0,0,0,100,100,0,0,1,${outlineThickness},0,5,0,0,0,1\n`;
    if (useBackgroundBox) {
      stylesSection += `Style: Box,${fontFamily},${fontSize},${boxColor},&H000000FF,&H00000000&,&H00000000&,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n`;
    }

    const events: string[] = [];

    if (config?.mode === 'dynamic' && config?.segments && config.segments.length > 0) {
      for (const seg of config.segments) {
        const segStart = typeof seg.start === 'number' ? seg.start : 0;
        const segEnd = typeof seg.end === 'number' ? seg.end : segStart + 2;

        let effectiveStart = segStart - (trimStart || 0);
        let effectiveEnd = segEnd - (trimStart || 0);

        if (effectiveEnd <= 0) continue;
        if (trimEnd && trimStart && segStart >= trimEnd) continue;

        effectiveStart = Math.max(0, effectiveStart);
        effectiveEnd = Math.max(effectiveStart + 0.1, effectiveEnd);

        const startTimeStr = this.formatAssTimestamp(effectiveStart);
        const endTimeStr = this.formatAssTimestamp(effectiveEnd);

        const lines =
          seg.lines && seg.lines.length > 0
            ? seg.lines
            : this.calculateDeterministicLines(seg.text, width, fontSize, canvasScale);

        const segDuration = Math.max(0.2, effectiveEnd - effectiveStart);
        const segWords = seg.text.trim().split(/\s+/).filter(Boolean);
        const durationCs = Math.round(segDuration * 100);
        const csPerWord =
          segWords.length > 0 ? Math.max(10, Math.floor(durationCs / segWords.length)) : 50;

        lines.forEach((l, index) => {
          const lineY = Math.round(startY + index * lineHeight);
          const rawLineWidth = l.width ? l.width * canvasScale : this.estimateLineWidth(l.text, fontSize);
          const currentBoxWidth = Math.min(width - 24, Math.round(rawLineWidth + paddingX * 2));
          const rx = Math.round(centerX - currentBoxWidth / 2);
          const ry = Math.round(lineY - boxHeight / 2);

          if (useBackgroundBox) {
            const pathData = this.generateAssRoundedRectPath(currentBoxWidth, boxHeight, radius);
            events.push(
              `Dialogue: 0,${startTimeStr},${endTimeStr},Box,,0,0,0,,{\\an7\\pos(${rx},${ry})\\p1}${pathData}{\\p0}`,
            );
          }

          const lineWords = l.text.trim().split(/\s+/).filter(Boolean);
          const karaokeTagged = lineWords.map((w) => `{\\k${csPerWord}}${w}`).join(' ');

          events.push(
            `Dialogue: 1,${startTimeStr},${endTimeStr},HighlightText,,0,0,0,,{\\an5\\pos(${centerX},${lineY})}${karaokeTagged}`,
          );
        });
      }
    } else {
      const duration = durationSeconds && durationSeconds > 0 ? durationSeconds : 3600;
      const startTimeStr = this.formatAssTimestamp(0);
      const endTimeStr = this.formatAssTimestamp(duration);

      const lines =
        config?.lines && config.lines.length > 0
          ? config.lines
          : this.calculateDeterministicLines(config?.text || '', width, fontSize, canvasScale);

      lines.forEach((l, index) => {
        const lineY = Math.round(startY + index * lineHeight);
        const rawLineWidth = l.width ? l.width * canvasScale : this.estimateLineWidth(l.text, fontSize);
        const currentBoxWidth = Math.min(width - 24, Math.round(rawLineWidth + paddingX * 2));
        const rx = Math.round(centerX - currentBoxWidth / 2);
        const ry = Math.round(lineY - boxHeight / 2);

        if (useBackgroundBox) {
          const pathData = this.generateAssRoundedRectPath(currentBoxWidth, boxHeight, radius);
          events.push(
            `Dialogue: 0,${startTimeStr},${endTimeStr},Box,,0,0,0,,{\\an7\\pos(${rx},${ry})\\p1}${pathData}{\\p0}`,
          );
        }

        events.push(
          `Dialogue: 1,${startTimeStr},${endTimeStr},Default,,0,0,0,,{\\an5\\pos(${centerX},${lineY})}${l.text}`,
        );
      });
    }

    const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes
; Font fallback: Noto Color Emoji, DejaVu Sans, Noto Sans

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${stylesSection}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
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
      aspectRatio,
      trimStart,
      trimEnd,
      watermarkPath,
      watermarkPosition = 'top-right',
      watermarkScale = 100,
      watermarkOpacity = 85,
      watermarkPadding = 60,
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

    // 3. Determina dimensões da resolução alvo de acordo com o Aspect Ratio escolhido
    // 9:16 = 1080x1920 (Vertical Shorts/Reels/TikTok) | 16:9 = 1920x1080 (Horizontal Widescreen)
    const isVertical =
      aspectRatio === '9:16' ||
      (!aspectRatio && metadata.height > metadata.width);
    const targetWidth = isVertical ? 1080 : 1920;
    const targetHeight = isVertical ? 1920 : 1080;

    // 4. Construção do complex_filter
    const filterParts: string[] = [];
    let currentVideoLabel = '0:v';

    // 4.1. Adaptação do vídeo à proporção escolhida (scale proporcional + pad centralizado em preto + SAR 1:1)
    filterParts.push(
      `[${currentVideoLabel}]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v_formatted]`,
    );
    currentVideoLabel = 'v_formatted';

    // 4.2. Marca d'água com preservação do canal alfa (RGBA), escala fiel ao Studio e opacidade configurada
    if (hasWatermark) {
      const coords = this.resolveWatermarkCoordinates(
        watermarkPosition,
        watermarkPadding,
      );

      // No Studio: baseLogoWidth = Math.min(width * 0.35, 110 * scale) no canvas de 360 (9:16) ou 640 (16:9).
      // Fator de proporção para resolução final 1080p: 3.0x.
      // Portanto, a largura base em 1080p é 110 * 3 = 330px, multiplicada pelo slider watermarkScale.
      const scaleMultiplier = Math.max(0.1, (watermarkScale || 100) / 100);
      const desiredWmWidth = Math.min(
        Math.round(targetWidth * 0.45),
        Math.round(330 * scaleMultiplier),
      );
      const opacity = Math.max(0.05, Math.min(1, (watermarkOpacity ?? 85) / 100));

      filterParts.push(
        `[1:v]scale=${desiredWmWidth}:-1,format=rgba,colorchannelmixer=aa=${opacity.toFixed(2)}[wm_scaled]`,
        `[${currentVideoLabel}][wm_scaled]overlay=${coords}:format=auto[v_watermarked]`,
      );
      currentVideoLabel = 'v_watermarked';
    }

    // 4.3. Filtro de Legendas na resolução e safe zone adequadas
    let tempAssFile: string | null = null;
    const hasSubtitles = Boolean(
      subtitleConfig?.text ||
      (subtitleConfig?.lines && subtitleConfig.lines.length > 0) ||
      (subtitleConfig?.segments && subtitleConfig.segments.length > 0),
    );

    if (hasSubtitles) {
      // Gera arquivo de legendas .ass com fontes, emojis e posicionamento seguro
      tempAssFile = await this.generateAssSubtitleFile(
        targetWidth,
        targetHeight,
        subtitleConfig,
        isVertical,
        effectiveDuration,
        trimStart || 0,
        trimEnd,
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
