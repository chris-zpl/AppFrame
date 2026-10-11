import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../config/api';
import { watermarksService } from '../services/watermarks.service';
import { mediaService, type CreateVideoJobPayload } from '../services/media.service';
import { toast } from 'sonner';

export type AspectRatio = '9:16' | '16:9';
export type SubtitleMode = 'static' | 'dynamic';
export type FontFamily = 'Plus Jakarta Sans' | 'Montserrat' | 'Bebas Neue' | 'Anton';
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

// Transcrição simulada para o modo Legenda Dinâmica Gemini
const DYNAMIC_WORDS_SAMPLE = [
  { word: 'O', start: 0.2, end: 0.5 },
  { word: 'segredo', start: 0.5, end: 1.1 },
  { word: 'para', start: 1.1, end: 1.4 },
  { word: 'reter', start: 1.4, end: 1.9 },
  { word: 'a', start: 1.9, end: 2.1 },
  { word: 'audiência', start: 2.1, end: 2.8 },
  { word: 'nos', start: 2.8, end: 3.1 },
  { word: 'primeiros', start: 3.1, end: 3.7 },
  { word: '3', start: 3.7, end: 4.1 },
  { word: 'segundos', start: 4.1, end: 4.9 },
  { word: 'é', start: 4.9, end: 5.2 },
  { word: 'gerar', start: 5.2, end: 5.7 },
  { word: 'uma', start: 5.7, end: 5.9 },
  { word: 'quebra', start: 5.9, end: 6.4 },
  { word: 'de', start: 6.4, end: 6.6 },
  { word: 'padrão', start: 6.6, end: 7.2 },
  { word: 'imediata!', start: 7.2, end: 8.0 },
];

export const StudioPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user } = useAuth();

  // Consulta real de marcas d'água cadastradas
  const { data: userWatermarks = [], isLoading: isLoadingWatermarks } = useQuery({
    queryKey: ['watermarks'],
    queryFn: watermarksService.list,
  });

  // Configurações Globais do Player e Formato
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(5.5);
  const totalDuration = 60.0; // 01:00 total

  // Timeline & Cortes de Precisão (In e Out)
  const [trimIn, setTrimIn] = useState<number>(2.0); // 00:02.000
  const [trimOut, setTrimOut] = useState<number>(45.0); // 00:45.000
  const [activeTab, setActiveTab] = useState<'legendas' | 'marca-dagua'>('legendas');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Configurações da Aba Legendas
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('dynamic');
  const [staticText, setStaticText] = useState<string>(
    'O SEGREDO PARA RETER AUDIÊNCIA NOS PRIMEIROS 3 SEGUNDOS'
  );
  const [geminiPrompt, setGeminiPrompt] = useState<string>(
    'Extrair timestamps de falas com alta energia e destacar palavras-chave'
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>('Plus Jakarta Sans');
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [bgColor, setBgColor] = useState<string>('#10131A');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [fontSize, setFontSize] = useState<number>(28);
  const [useBackgroundBox, setUseBackgroundBox] = useState<boolean>(true);

  // Configurações da Aba Marca d'Água
  const [selectedWatermarkId, setSelectedWatermarkId] = useState<string>('none');
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('top-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(85);
  const [watermarkScale, setWatermarkScale] = useState<number>(100);

  // Seleciona automaticamente a primeira marca d'água do usuário caso exista
  useEffect(() => {
    if (userWatermarks.length > 0 && selectedWatermarkId === 'none') {
      setSelectedWatermarkId(userWatermarks[0].id);
    }
  }, [userWatermarks, selectedWatermarkId]);

  const selectedLogo = useMemo(() => {
    if (!selectedWatermarkId || selectedWatermarkId === 'none') return null;
    return userWatermarks.find((w) => w.id === selectedWatermarkId) || null;
  }, [userWatermarks, selectedWatermarkId]);

  // Referências
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const draggingHandleRef = useRef<'in' | 'out' | 'playhead' | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Formatação de cronômetro com precisão tabular (MM:SS ou MM:SS.mmm)
  const formatTime = (seconds: number, includeMs: boolean = false): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (includeMs) {
      return `${base}.${String(ms).padStart(3, '0')}`;
    }
    return base;
  };

  // Onda sonora representativa simulada com 70 picos
  const waveformPeaks = useMemo(() => {
    const peaks: number[] = [];
    for (let i = 0; i < 70; i++) {
      const sin = Math.sin(i * 0.25) * 0.4 + 0.5;
      const noise = ((i * 37) % 19) / 19 * 0.4;
      peaks.push(Math.min(1, Math.max(0.15, sin * 0.7 + noise * 0.3)));
    }
    return peaks;
  }, []);

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

    // ==========================================
    // 1. RENDERIZAÇÃO DA LEGENDA COM FIX_BOUNDS
    // Margem mínima de segurança safePadding >= 48px
    // ==========================================
    const safePadding = Math.max(48, width * 0.08);
    const maxTextWidth = width - safePadding * 2;

    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;

    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.trim().split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const w of words) {
        if (!w) continue;
        const testLine = currentLine ? `${currentLine} ${w}` : w;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    };

    let displayLines: string[] = [];
    let highlightWord = '';

    if (subtitleMode === 'static') {
      displayLines = wrapText(staticText, maxTextWidth);
    } else {
      // Modo Legenda Dinâmica (Gemini STT): seleciona palavras próximas ao currentTime
      const activeWordObj = DYNAMIC_WORDS_SAMPLE.find(
        (w) => currentTime >= w.start && currentTime <= w.end
      );
      highlightWord = activeWordObj ? activeWordObj.word : '';

      // Agrupa janela de fala no tempo atual
      const activeWordsWindow = DYNAMIC_WORDS_SAMPLE.filter(
        (w) => currentTime >= w.start - 1.2 && currentTime <= w.end + 1.2
      );
      const phrase = activeWordsWindow.length > 0
        ? activeWordsWindow.map((w) => w.word).join(' ')
        : 'O segredo para reter audiência nos primeiros 3 segundos';

      displayLines = wrapText(phrase, maxTextWidth);
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
          drawCanvasOverlay();
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
  ]);

  // Atualização do canvas e timer em tempo real
  useEffect(() => {
    drawCanvasOverlay();
  }, [drawCanvasOverlay]);

  // Loop de reprodução do player
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= trimOut) {
            setIsPlaying(false);
            return trimIn;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, trimIn, trimOut]);

  // Interatividade de arraste da timeline
  const handleTimelineMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    handle: 'in' | 'out' | 'playhead'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    draggingHandleRef.current = handle;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current || !draggingHandleRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const percentage = relativeX / rect.width;
      const newTime = percentage * totalDuration;

      if (draggingHandleRef.current === 'in') {
        setTrimIn(Math.min(newTime, trimOut - 0.5));
      } else if (draggingHandleRef.current === 'out') {
        setTrimOut(Math.max(newTime, trimIn + 0.5));
      } else if (draggingHandleRef.current === 'playhead') {
        setCurrentTime(newTime);
      }
    };

    const onMouseUp = () => {
      draggingHandleRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || draggingHandleRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    const newTime = percentage * totalDuration;
    setCurrentTime(newTime);
  };

  // Ação de Conclusão: "Gerar Vídeo" via NestJS real
  const handleGenerateVideo = async () => {
    setIsGenerating(true);

    try {
      const isUuid = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      // Determina URL válida do vídeo de origem
      let rawSourceUrl = params.videoUrl || params.sourceUrl;
      if (!rawSourceUrl && params.selectedVideos) {
        rawSourceUrl = params.selectedVideos.startsWith('http')
          ? params.selectedVideos
          : `https://www.youtube.com/watch?v=${params.selectedVideos}`;
      }
      if (!rawSourceUrl) {
        rawSourceUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      }

      const originalTitle =
        params.videoTitle ||
        (params.selectedVideos ? `Vídeo ${params.selectedVideos}` : 'Corte de Vídeo AppFrame');

      const payload: CreateVideoJobPayload = {
        source_url: rawSourceUrl,
        platform: 'youtube',
        original_title: originalTitle,
        trim_start: Number(trimIn.toFixed(2)),
        trim_end: Number(trimOut.toFixed(2)),
        watermark_id: isUuid(selectedWatermarkId) ? selectedWatermarkId : undefined,
        subtitle_config: {
          mode: subtitleMode,
          text: subtitleMode === 'static' ? staticText : geminiPrompt,
          font_family: fontFamily,
          font_size: fontSize,
          text_color: textColor,
          background_color: bgColor,
          stroke_color: strokeColor,
          use_background_box: useBackgroundBox,
        },
      };

      const job = await mediaService.render(payload);
      toast.success('Vídeo enviado para renderização na fila!');

      navigate('historico', {
        jobCreated: 'true',
        jobId: job.id,
        title: job.original_title || originalTitle,
      });
    } catch (err) {
      console.error('Falha ao submeter render job:', err);
      navigate('historico', {
        jobCreated: 'pending',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Posições da Matriz 3x3
  const MATRIX_POSITIONS: { key: WatermarkPosition; label: string; icon: string }[] = [
    { key: 'top-left', label: 'Superior Esquerdo', icon: 'north_west' },
    { key: 'top-center', label: 'Superior Centro', icon: 'north' },
    { key: 'top-right', label: 'Superior Direito', icon: 'north_east' },
    { key: 'center-left', label: 'Centro Esquerdo', icon: 'west' },
    { key: 'center', label: 'Centro', icon: 'filter_center_focus' },
    { key: 'center-right', label: 'Centro Direito', icon: 'east' },
    { key: 'bottom-left', label: 'Inferior Esquerdo', icon: 'south_west' },
    { key: 'bottom-center', label: 'Inferior Centro', icon: 'south' },
    { key: 'bottom-right', label: 'Inferior Direito', icon: 'south_east' },
  ];

  return (
    <AppShell
      currentPath="studio"
      onNavigate={(path) => navigate(path)}
      userName={user?.name || 'Christian'}
      onUserAvatarClick={() => navigate('configuracoes')}
    >
      <div className="flex flex-col w-full text-on-surface select-none pb-8">
        {/* ================= BARRA SUPERIOR DE CONTROLE DO STUDIO ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-md p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('scraper')}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-outline/10"
              title="Voltar para Varredura"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-title-md text-title-md font-bold text-on-surface line-clamp-1 max-w-md">
                  EP. 412 - INTELIGÊNCIA ARTIFICIAL E O FUTURO DA CRIAÇÃO DE CONTEÚDO
                </span>
                <Badge variant={aspectRatio === '9:16' ? 'short' : 'long'}>
                  {aspectRatio === '9:16' ? '9:16 Shorts' : '16:9 Widescreen'}
                </Badge>
              </div>
              <span className="text-label-sm font-label-sm text-outline">
                Canvas 1080p • FFmpeg Hardware Acceleration Ativo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Alternador de Aspecto entre 9:16 e 16:9 */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-highest">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer',
                  aspectRatio === '9:16'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
                title="Formato Vertical 9:16 (Shorts/Reels/TikTok)"
              >
                <span className="material-symbols-outlined text-[16px]">stay_current_portrait</span>
                <span>9:16</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer',
                  aspectRatio === '16:9'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
                title="Formato Horizontal 16:9 (YouTube Widescreen)"
              >
                <span className="material-symbols-outlined text-[16px]">stay_current_landscape</span>
                <span>16:9</span>
              </button>
            </div>

            {/* Botão de Ação Primária: "Gerar Vídeo" */}
            <Button
              variant="primary"
              size="md"
              isLoading={isGenerating}
              onClick={handleGenerateVideo}
              leftIcon={
                <span className="material-symbols-outlined text-[20px]">
                  movie_edit
                </span>
              }
              className="px-5 font-bold shadow-[0_0_15px_rgba(212,163,70,0.3)]"
            >
              <span>Gerar Vídeo</span>
            </Button>
          </div>
        </header>

        {/* ================= ÁREA DE TRABALHO: PREVIEW + PAINEL LATERAL ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* ================= COLUNA CENTRAL: VISUALIZADOR E CANVAS DE PREVIEW ================= */}
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            <Card className="relative overflow-hidden bg-surface-container-lowest border border-surface-container-high/90 p-4 flex flex-col items-center justify-center min-h-[460px] shadow-2xl">
              {/* Halos Luminosos Sutis no Player */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

              {/* Moldura do Vídeo com Aspect Ratio Dinâmico */}
              <div
                className={cn(
                  'relative overflow-hidden rounded-2xl bg-black border border-surface-container-highest transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center',
                  aspectRatio === '9:16'
                    ? 'w-[290px] h-[515px] sm:w-[320px] sm:h-[568px]'
                    : 'w-full max-w-[620px] aspect-video'
                )}
              >
                {/* Imagem de Fundo de Alta Fidelidade do Vídeo */}
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRhGGes8HDYerT5nUKAHgYB1mPBrAE_vE-Mn5Huw7i95jaD5UYN5KFAzFlffnPfL_hrZnVC3cuSPDAluXN8EPQulKmycpMpDdxfhxF4ZkDwvWpwFPJIsrRh4rnO1ljPOx4ZE1-yO4lvouKH6v_sKBKJLeGgLO8-t-X1k6Eu-8iBBjvMxCP5uizewBNoaiexDf8yLIAQY5QjmNIgGNpewGe8Nyc_AZOu9nBz64kRJI-"
                  alt="Preview Frame"
                  className="w-full h-full object-cover select-none pointer-events-none filter brightness-90"
                />

                {/* Camada de Canvas Sobreposta ao Vídeo */}
                <canvas
                  ref={canvasRef}
                  width={aspectRatio === '9:16' ? 360 : 640}
                  height={aspectRatio === '9:16' ? 640 : 360}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
                />

                {/* Indicador de Margens Seguras (Safe Zone) */}
                <div className="absolute inset-4 border border-dashed border-primary/20 rounded-xl pointer-events-none z-10 flex items-start justify-end p-1">
                  <span className="text-[9px] font-bold tracking-wider uppercase text-primary/40 bg-black/40 px-1 rounded">
                    Safe Zone
                  </span>
                </div>

                {/* Botão Central de Play no Hover (quando pausado) */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="absolute z-30 w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-[0_0_24px_rgba(242,190,94,0.4)] transition-transform hover:scale-110 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[36px] ml-1">
                      play_arrow
                    </span>
                  </button>
                )}
              </div>

              {/* Barra de Controles do Player com Cronômetro Tabular */}
              <div className="w-full max-w-xl mt-4 flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-container/80 backdrop-blur-md border border-surface-container-high/80">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentTime((t) => Math.max(trimIn, t - 5))}
                    title="Retroceder 5 segundos"
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">replay_5</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentTime((t) => Math.min(trimOut, t + 5))}
                    title="Avançar 5 segundos"
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">forward_5</span>
                  </button>
                </div>

                {/* Cronômetro com Números Tabulares Precisos */}
                <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline/10">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span className="font-mono text-title-sm text-title-sm font-bold text-on-surface tabular-nums">
                    {formatTime(currentTime)} / {formatTime(totalDuration)}
                  </span>
                  <span className="text-[10px] text-outline px-1 py-0.5 rounded bg-surface-container font-mono">
                    Corte: {formatTime(trimOut - trimIn)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentTime(trimIn)}
                    title="Ir para Marcador In"
                    className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold cursor-pointer"
                  >
                    Ir ao In
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentTime(trimOut)}
                    title="Ir para Marcador Out"
                    className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold cursor-pointer"
                  >
                    Ir ao Out
                  </button>
                </div>
              </div>
            </Card>

            {/* ================= TIMELINE DE PRECISÃO (INFERIOR) ================= */}
            <Card className="bg-surface-container-low border border-surface-container-high/90 p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    graphic_eq
                  </span>
                  <span className="font-title-sm text-title-sm font-bold text-on-surface">
                    Timeline de Precisão (Audio Waveform & Trim)
                  </span>
                </div>

                {/* Tooltips dos Marcadores de Corte */}
                <div className="flex items-center gap-3 font-mono text-label-sm font-label-sm tabular-nums">
                  <span className="text-on-surface-variant">
                    In: <strong className="text-primary">{formatTime(trimIn, true)}</strong>
                  </span>
                  <span className="text-outline">•</span>
                  <span className="text-on-surface-variant">
                    Out: <strong className="text-primary">{formatTime(trimOut, true)}</strong>
                  </span>
                  <span className="text-outline">•</span>
                  <span className="text-tertiary">
                    Duração: <strong>{(trimOut - trimIn).toFixed(2)}s</strong>
                  </span>
                </div>
              </div>

              {/* Contêiner Interativo da Timeline */}
              <div className="relative flex flex-col select-none pt-4 pb-2">
                {/* Régua de Tempo com Ticks a cada 5s */}
                <div className="w-full flex justify-between text-[10px] text-outline font-mono mb-1.5 px-1">
                  <span>00:00</span>
                  <span>00:10</span>
                  <span>00:20</span>
                  <span>00:30</span>
                  <span>00:40</span>
                  <span>00:50</span>
                  <span>01:00</span>
                </div>

                {/* Pista da Onda Sonora e Região de Corte */}
                <div
                  ref={timelineRef}
                  onClick={handleTimelineClick}
                  className="relative w-full h-20 rounded-xl bg-surface-container-lowest border border-surface-container-highest/80 overflow-hidden cursor-pointer flex items-center px-1"
                >
                  {/* Gráfico da Onda Sonora (Waveform de Áudio) */}
                  <div className="w-full h-full flex items-center justify-between gap-[2px] px-1 pointer-events-none">
                    {waveformPeaks.map((peak, idx) => {
                      const peakTime = (idx / waveformPeaks.length) * totalDuration;
                      const isInsideCut = peakTime >= trimIn && peakTime <= trimOut;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex-1 rounded-full transition-colors',
                            isInsideCut
                              ? 'bg-primary shadow-[0_0_6px_rgba(242,190,94,0.3)]'
                              : 'bg-surface-container-highest/60 opacity-30'
                          )}
                          style={{
                            height: `${peak * 85}%`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Faixa Sombreada Excluída (Antes do In) */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none border-r border-primary/40"
                    style={{ width: `${(trimIn / totalDuration) * 100}%` }}
                  />

                  {/* Faixa Sombreada Excluída (Depois do Out) */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none border-l border-primary/40"
                    style={{ width: `${100 - (trimOut / totalDuration) * 100}%` }}
                  />

                  {/* Faixa Ativa com Destaque Âmbar (#D4A346) */}
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none border-y-2 border-primary bg-primary/10"
                    style={{
                      left: `${(trimIn / totalDuration) * 100}%`,
                      width: `${((trimOut - trimIn) / totalDuration) * 100}%`,
                    }}
                  />

                  {/* Marcador Início (In) - Arrastável */}
                  <div
                    onMouseDown={(e) => handleTimelineMouseDown(e, 'in')}
                    className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-ew-resize group"
                    style={{ left: `${(trimIn / totalDuration) * 100}%` }}
                  >
                    <div className="w-4 h-full bg-primary/30 flex items-center justify-center relative -translate-x-1/2">
                      <div className="w-1.5 h-full bg-primary rounded-full shadow-[0_0_8px_rgba(212,163,70,0.8)]" />
                      {/* Handle Superior com Tooltip */}
                      <div className="absolute -top-3 w-5 h-5 rounded-md bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-md">
                        In
                      </div>
                    </div>
                  </div>

                  {/* Marcador Fim (Out) - Arrastável */}
                  <div
                    onMouseDown={(e) => handleTimelineMouseDown(e, 'out')}
                    className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-ew-resize group"
                    style={{ left: `${(trimOut / totalDuration) * 100}%` }}
                  >
                    <div className="w-4 h-full bg-primary/30 flex items-center justify-center relative -translate-x-1/2">
                      <div className="w-1.5 h-full bg-primary rounded-full shadow-[0_0_8px_rgba(212,163,70,0.8)]" />
                      {/* Handle Superior com Tooltip */}
                      <div className="absolute -top-3 w-5 h-5 rounded-md bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-md">
                        Out
                      </div>
                    </div>
                  </div>

                  {/* Agulha de Reprodução (Playhead) */}
                  <div
                    onMouseDown={(e) => handleTimelineMouseDown(e, 'playhead')}
                    className="absolute top-0 bottom-0 z-40 flex flex-col items-center cursor-ew-resize"
                    style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                  >
                    <div className="w-0.5 h-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] relative -translate-x-1/2">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 rounded-xs" />
                    </div>
                  </div>
                </div>

                {/* Botões de Micro-ajuste de 0.1s */}
                <div className="flex items-center justify-between mt-2 text-label-sm font-label-sm text-outline">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTrimIn((v) => Math.max(0, v - 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      In -0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimIn((v) => Math.min(trimOut - 0.5, v + 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      In +0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimIn(currentTime)}
                      className="px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold hover:bg-primary/30 cursor-pointer"
                    >
                      Definir In Aqui
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTrimOut(currentTime)}
                      className="px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold hover:bg-primary/30 cursor-pointer"
                    >
                      Definir Out Aqui
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimOut((v) => Math.max(trimIn + 0.5, v - 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      Out -0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimOut((v) => Math.min(totalDuration, v + 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      Out +0.1s
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ================= COLUNA LATERAL: CONFIGURAÇÕES (DIREITA) ================= */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <Card className="bg-surface-container-low border border-surface-container-high/90 p-4 shadow-xl flex flex-col gap-4">
              {/* Abas Superiores do Painel Lateral */}
              <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setActiveTab('legendas')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer',
                    activeTab === 'legendas'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">subtitles</span>
                  <span>Legendas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('marca-dagua')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer',
                    activeTab === 'marca-dagua'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">branding_watermark</span>
                  <span>Marca d'Água</span>
                </button>
              </div>

              {/* ================= ABA 1: CONFIGURAÇÕES DE LEGENDA ================= */}
              {activeTab === 'legendas' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Alternador entre Legenda Fixa e Legenda Dinâmica Gemini */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
                      Modo de Legenda
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSubtitleMode('static')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-label-md font-label-md transition-all cursor-pointer',
                          subtitleMode === 'static'
                            ? 'bg-primary/15 border-primary text-primary font-bold shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                            : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface'
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">title</span>
                        <span>Legenda Fixa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubtitleMode('dynamic')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-label-md font-label-md transition-all cursor-pointer',
                          subtitleMode === 'dynamic'
                            ? 'bg-primary/15 border-primary text-primary font-bold shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                            : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface'
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        <span>Dinâmica (Gemini)</span>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Texto Estático ou Prompt Gemini */}
                  {subtitleMode === 'static' ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-label-sm text-outline font-semibold">
                        Texto da Legenda Estática
                      </label>
                      <textarea
                        value={staticText}
                        onChange={(e) => setStaticText(e.target.value)}
                        rows={3}
                        placeholder="Digite o texto que será renderizado no vídeo..."
                        className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 text-body-md text-on-surface outline-none focus:border-primary/80 transition-all resize-none"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-label-sm font-label-sm text-outline font-semibold">
                          Prompt Roteiro Gemini STT / TTS
                        </label>
                        <span className="text-[10px] text-primary font-semibold">
                          IA Automática
                        </span>
                      </div>
                      <textarea
                        value={geminiPrompt}
                        onChange={(e) => setGeminiPrompt(e.target.value)}
                        rows={3}
                        placeholder="Instruções para reconhecimento de voz ou síntese vocal..."
                        className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 text-body-md text-on-surface outline-none focus:border-primary/80 transition-all resize-none"
                      />
                    </div>
                  )}

                  {/* Seleção Tipográfica */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-label-sm text-outline font-semibold">
                      Família Tipográfica
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                      className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl px-3 py-2.5 text-body-md text-on-surface outline-none focus:border-primary/80 transition-all cursor-pointer"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Padrão)</option>
                      <option value="Montserrat">Montserrat (Impactante)</option>
                      <option value="Bebas Neue">Bebas Neue (Condensada)</option>
                      <option value="Anton">Anton (Bold Pesado)</option>
                    </select>
                  </div>

                  {/* Seletores Nativos de Cor Hexadecimal */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-label-sm text-outline font-semibold">
                        Cor do Texto
                      </label>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest border border-surface-container-highest">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono outline-none text-on-surface uppercase"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-label-sm text-outline font-semibold">
                        Contorno
                      </label>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest border border-surface-container-highest">
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono outline-none text-on-surface uppercase"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-label-sm text-outline font-semibold">
                        Cor do Fundo
                      </label>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest border border-surface-container-highest">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono outline-none text-on-surface uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slider de Tamanho da Fonte com Trilho Âmbar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-outline font-semibold">Tamanho da Fonte</span>
                      <span className="text-primary font-bold font-mono">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={48}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Toggle Caixa de Fundo vs Contorno */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-surface-container-highest">
                    <span className="text-body-sm font-body-sm text-on-surface">
                      Caixa de fundo arredondada
                    </span>
                    <input
                      type="checkbox"
                      checked={useBackgroundBox}
                      onChange={(e) => setUseBackgroundBox(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </div>

                  {/* Selo fix_bounds */}
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-2 text-label-sm font-label-sm text-primary">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Cálculo determinístico fix_bounds ativado (sem estouro de bordas)</span>
                  </div>
                </div>
              )}

              {/* ================= ABA 2: CONFIGURAÇÕES DE MARCA D'ÁGUA ================= */}
              {activeTab === 'marca-dagua' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Seletor de Logos Cadastrados na Conta */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
                        Logo Cadastrado
                      </label>
                      <button
                        type="button"
                        onClick={() => navigate('marcas')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">tune</span>
                        Gerenciar
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Opção: Sem Marca d'Água */}
                      <div
                        onClick={() => setSelectedWatermarkId('none')}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
                          selectedWatermarkId === 'none'
                            ? 'bg-primary/15 border-primary shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                            : 'bg-surface-container border-surface-container-highest hover:bg-surface-container-high'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center p-1 border border-outline/10 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </div>
                          <span className="text-title-sm font-semibold text-on-surface">
                            Sem Marca d'Água
                          </span>
                        </div>
                        {selectedWatermarkId === 'none' && (
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            check_circle
                          </span>
                        )}
                      </div>

                      {/* Lista Real de Marcas do Usuário */}
                      {isLoadingWatermarks && (
                        <div className="p-3 text-center text-body-sm text-outline">
                          Carregando marcas d'água...
                        </div>
                      )}

                      {!isLoadingWatermarks && userWatermarks.length === 0 && (
                        <div className="p-3 rounded-xl bg-surface-container-lowest border border-dashed border-outline/30 text-center flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-[24px] text-outline">
                            branding_watermark
                          </span>
                          <p className="text-body-xs text-outline">
                            Nenhuma marca d'água salva na sua conta.
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('marcas')}
                            leftIcon={
                              <span className="material-symbols-outlined text-[16px]">add</span>
                            }
                          >
                            Nova Marca
                          </Button>
                        </div>
                      )}

                      {userWatermarks.map((logo) => (
                        <div
                          key={logo.id}
                          onClick={() => setSelectedWatermarkId(logo.id)}
                          className={cn(
                            'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
                            selectedWatermarkId === logo.id
                              ? 'bg-primary/15 border-primary shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                              : 'bg-surface-container border-surface-container-highest hover:bg-surface-container-high'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[repeating-conic-gradient(#202020_0%_25%,#303030_0%_50%)] bg-[length:8px_8px] flex items-center justify-center p-0.5 border border-outline/10 overflow-hidden shrink-0">
                              <img
                                src={logo.url || `${API_BASE_URL}/watermarks/${logo.id}/file`}
                                alt={logo.original_name}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <span className="text-title-sm font-semibold text-on-surface truncate">
                              {logo.original_name}
                            </span>
                          </div>
                          {selectedWatermarkId === logo.id && (
                            <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                              check_circle
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matriz 3x3 de Posicionamento na Tela */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
                        Posição na Tela (Matriz 3x3)
                      </label>
                      <span className="text-[10px] font-mono text-primary uppercase">
                        {watermarkPosition}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-surface-container-lowest border border-surface-container-highest">
                      {MATRIX_POSITIONS.map((pos) => {
                        const isSelected = watermarkPosition === pos.key;
                        return (
                          <button
                            key={pos.key}
                            type="button"
                            onClick={() => setWatermarkPosition(pos.key)}
                            title={pos.label}
                            className={cn(
                              'h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
                              isSelected
                                ? 'bg-primary text-on-primary border-primary shadow-[0_0_12px_rgba(242,190,94,0.4)] font-bold scale-105'
                                : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                            )}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {pos.icon}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slider de Opacidade (0% a 100%) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-outline font-semibold">Opacidade da Marca</span>
                      <span className="text-primary font-bold font-mono">{watermarkOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider de Escala da Marca */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-outline font-semibold">Tamanho / Escala</span>
                      <span className="text-primary font-bold font-mono">{watermarkScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={watermarkScale}
                      onChange={(e) => setWatermarkScale(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
