import { useRef, useCallback, useEffect } from 'react';
import type { WatermarkItem } from '../../watermarks';
import type { AspectRatio, FontFamily, SubtitleMode, WatermarkPosition } from '../interfaces';
import type { SubtitleSegmentData } from '../../history';
import { wrapCanvasText } from '../utils';

export interface UseStudioCanvasProps {
  aspectRatio: AspectRatio;
  subtitleMode: SubtitleMode;
  staticText: string;
  dynamicSegments: SubtitleSegmentData[];
  fontFamily: FontFamily;
  fontSize: number;
  textColor: string;
  bgColor: string;
  strokeColor: string;
  useBackgroundBox: boolean;
  selectedLogo: WatermarkItem | null;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  watermarkScale: number;
  currentTime: number;
  previewStreamUrl: string | null;
  isPreparingPreview: boolean;
  previewError: string | null;
}

export const useStudioCanvas = ({
  aspectRatio,
  subtitleMode,
  staticText,
  dynamicSegments,
  fontFamily,
  fontSize,
  textColor,
  bgColor,
  strokeColor,
  useBackgroundBox,
  selectedLogo,
  watermarkPosition,
  watermarkOpacity,
  watermarkScale,
  currentTime,
  previewStreamUrl,
  isPreparingPreview,
  previewError,
}: UseStudioCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const drawCanvasOverlayRef = useRef<(() => void) | null>(null);

  // Renderização determinística no Canvas com cálculo estrito de quebra de linha (fix_bounds)
  const drawCanvasOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpa quadro anterior
    ctx.clearRect(0, 0, width, height);

    // Só desenha legendas e marca d'água quando o vídeo real estiver pronto no player
    if (!previewStreamUrl || isPreparingPreview || previewError) {
      return;
    }

    // ==========================================
    // 1. RENDERIZAÇÃO DA LEGENDA COM FIX_BOUNDS
    // Margem mínima de segurança safePadding >= 48px
    // ==========================================
    const safePadding = Math.max(48, width * 0.08);
    const maxTextWidth = width - safePadding * 2;

    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;

    const wrapText = (text: string, maxWidth: number): string[] => {
      return wrapCanvasText(ctx, text, maxWidth);
    };

    let displayLines: string[] = [];
    let highlightWord = '';

    if (subtitleMode === 'static') {
      if (staticText.trim()) {
        displayLines = wrapText(staticText, maxTextWidth);
      }
    } else if (dynamicSegments.length > 0) {
      // Modo Legenda Dinâmica: exibe o segmento ativo no currentTime
      const activeSeg =
        dynamicSegments.find((s) => currentTime >= s.start && currentTime <= s.end) ||
        dynamicSegments.find((s) => Math.abs(s.start - currentTime) <= 1.5) ||
        dynamicSegments[0];

      if (activeSeg && activeSeg.text) {
        const segWords = activeSeg.text.trim().split(/\s+/).filter(Boolean);
        if (segWords.length > 0) {
          const segDuration = Math.max(0.2, activeSeg.end - activeSeg.start);
          const progress = Math.max(0, Math.min(0.999, (currentTime - activeSeg.start) / segDuration));
          const wordIdx = Math.floor(progress * segWords.length);
          highlightWord = segWords[wordIdx] || '';
        }
        displayLines = wrapText(activeSeg.text, maxTextWidth);
      }
    }

    // Desenha as linhas de legenda no canvas
    if (displayLines.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;

      // Posicionamento vertical: inferior (72% da altura em 9:16, 78% em 16:9)
      const startY = height * (aspectRatio === '9:16' ? 0.72 : 0.78);
      const lineHeight = fontSize * 1.35;

      displayLines.forEach((line, index) => {
        const lineY = startY + index * lineHeight;
        const lineMetrics = ctx.measureText(line);
        const paddingX = 14;
        const paddingY = 8;
        const boxWidth = Math.min(lineMetrics.width + paddingX * 2, width - 24);
        const boxHeight = fontSize + paddingY;

        // Fundo com caixa arredondada se habilitado
        if (useBackgroundBox) {
          ctx.save();
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          const rx = width / 2 - boxWidth / 2;
          const ry = lineY - boxHeight / 2;
          ctx.roundRect(rx, ry, boxWidth, boxHeight, 8);
          ctx.fill();
          ctx.restore();
        }

        // Contorno da legenda para legibilidade
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = strokeColor;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, width / 2, lineY);

        // Texto principal
        ctx.fillStyle = textColor;
        ctx.fillText(line, width / 2, lineY);

        // Destaque âmbar para palavra dinâmica ativa
        if (highlightWord && line.toLowerCase().includes(highlightWord.toLowerCase())) {
          ctx.fillStyle = '#F2BE5E';
          ctx.fillText(line, width / 2, lineY);
        }
        ctx.restore();
      });
    }

    // ==========================================
    // 2. RENDERIZAÇÃO REAL DA MARCA D'ÁGUA NO CANVAS COM ALFA
    // ==========================================
    if (selectedLogo && selectedLogo.url) {
      let img = imageCacheRef.current.get(selectedLogo.url);
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = selectedLogo.url;
        img.onload = () => {
          drawCanvasOverlayRef.current?.();
        };
        imageCacheRef.current.set(selectedLogo.url, img);
      }

      if (img.complete && img.naturalWidth > 0) {
        const scale = watermarkScale / 100;
        const aspect = img.naturalWidth / img.naturalHeight;
        const baseLogoWidth = Math.min(width * 0.35, 110 * scale);
        const baseLogoHeight = baseLogoWidth / aspect;
        const padding = 20;

        let x = padding;
        let y = padding;

        // Cálculo de coordenadas da Matriz 3x3
        if (watermarkPosition.includes('left')) {
          x = padding;
        } else if (watermarkPosition.includes('right')) {
          x = width - baseLogoWidth - padding;
        } else {
          x = width / 2 - baseLogoWidth / 2;
        }

        if (watermarkPosition.includes('top')) {
          y = padding;
        } else if (watermarkPosition.includes('bottom')) {
          y = height - baseLogoHeight - padding;
        } else {
          y = height / 2 - baseLogoHeight / 2;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, watermarkOpacity / 100));
        ctx.drawImage(img, x, y, baseLogoWidth, baseLogoHeight);
        ctx.restore();
      }
    }
  }, [
    aspectRatio,
    subtitleMode,
    staticText,
    dynamicSegments,
    fontFamily,
    fontSize,
    textColor,
    bgColor,
    strokeColor,
    useBackgroundBox,
    selectedLogo,
    watermarkPosition,
    watermarkOpacity,
    watermarkScale,
    currentTime,
    previewStreamUrl,
    isPreparingPreview,
    previewError,
  ]);

  // Atualização da ref e execução do canvas em tempo real
  useEffect(() => {
    drawCanvasOverlayRef.current = drawCanvasOverlay;
    drawCanvasOverlay();
  }, [drawCanvasOverlay]);

  return {
    canvasRef,
    drawCanvasOverlay,
  };
};
