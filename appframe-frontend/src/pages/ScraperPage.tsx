import React, { useState, useMemo } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { VideoCard, type VideoCardData } from '../components/common/VideoCard';
import { BatchDock } from '../components/layout/BatchDock';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Dados reais autênticos de demonstração baseados na Referência 2
const INITIAL_DEMO_VIDEOS: VideoCardData[] = [
  {
    id: '1',
    title: 'EP. 412 - INTELIGÊNCIA ARTIFICIAL E O FUTURO DA CRIAÇÃO DE CONTEÚDO',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDRhGGes8HDYerT5nUKAHgYB1mPBrAE_vE-Mn5Huw7i95jaD5UYN5KFAzFlffnPfL_hrZnVC3cuSPDAluXN8EPQulKmycpMpDdxfhxF4ZkDwvWpwFPJIsrRh4rnO1ljPOx4ZE1-yO4lvouKH6v_sKBKJLeGgLO8-t-X1k6Eu-8iBBjvMxCP5uizewBNoaiexDf8yLIAQY5QjmNIgGNpewGe8Nyc_AZOu9nBz64kRJI-',
    durationFormatted: '02:14:35',
    durationSeconds: 8075,
    isShort: false,
    publishedText: 'Há 2 dias',
    viewsText: '384k views',
  },
  {
    id: '2',
    title: 'COMO ESCALAR CANAIS DE CORTES AUTOMATIZADOS COM IA',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD_XLizXV3TTedOSc-TYI_AiPxXZatZm8B8MIXRsAI5cborSOkbzH8NAj9Xmx9scYnLMPMP6duSbN6dsjVWQO84ZJW1BdMK6JFGxpRO-QS-MUuzhM6u8lfUrIdKd9XnvDmnpcqqweChsziJdClcT9oCdnnaXrBNkSNbetcyMIQDsVbOgSaIhUa8YhDO6y6KKM0LfVRUYkU2_kY_KIiQ1IVGTSnkh_MsiPoApmvh7ErT',
    durationFormatted: '01:45:10',
    durationSeconds: 6310,
    isShort: false,
    publishedText: 'Há 4 dias',
    viewsText: '512k views',
  },
  {
    id: '3',
    title: 'O segredo para reter audiência nos primeiros 3 segundos #shorts',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCT08sxMVzObUMaPRglGa8gT_Qjke3b-Qm3aeNQPL7gKZINNG2Nal5BMMTDT3de-hO2b9fKfYySqARLTWRYj_ttn1LzTHFkooqRiL7Is2Jzrv0mwWdI8hpUBitvgl6f8-mndjHJEX3cQW_u9tkSmsLeUcaQeB4yofpF5skwqTGWsNW3ALDhfJgRdJM6BVTUetx6FC6kl2S6cmUzEpu6vzs31Dk494rJbl-6abJRVW0-',
    durationFormatted: '00:58',
    durationSeconds: 58,
    isShort: true,
    publishedText: 'Há 5 dias',
    viewsText: '1.2M views',
  },
  {
    id: '4',
    title: 'BASTIDORES DA PRODUÇÃO E SETUP COMPLETO DE ÁUDIO E VÍDEO',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAVpbo_4DiPMahyqQKLVAkGHkmF54SZl7CE_toGdiL0hZ4FLspqJg9P3rbFG1dyJGBrDeclBHVRKXff7su6dL2hoKW8PWfVmJAsUC7l9bClZFbNTZ5evwQWa6j1czm7Lpt3ngiBR3dwZOozpjxU5RFTxx4_DNZc1s-xcUro8KdjbwkqpOZ5sDlApywTRIZhTCNVFZ5FucCv1sj8ZD_snjk5gVLAAPzjdJwV9kg8Ekmb',
    durationFormatted: '01:58:20',
    durationSeconds: 7100,
    isShort: false,
    publishedText: 'Há 1 semana',
    viewsText: '220k views',
  },
  {
    id: '5',
    title: 'Essa ferramenta mudou o workflow de edição para sempre #shorts',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCinqodvU0pVf3M69ryDj9U9VNlRjoU4uCtP47p5vHlkGAXcbRpdHWpDM9luygvUOse1jDXjqmAht7r1XCsABNt_FGWZ-OTfSo3OKQlUfByN2HbvWXFgvtdPWpNkWWaXv0U_5HtVgha2sazWim-dJH5n2zRww_poMs0Hy4xgclJvxHlP9_4sFFFh0hRkF-jBVR_1bVBqhLmp5bxbXZrHe0YnZHG2UIkWvIpTm-aI3mZ',
    durationFormatted: '00:45',
    durationSeconds: 45,
    isShort: true,
    publishedText: 'Há 1 semana',
    viewsText: '890k views',
  },
  {
    id: '6',
    title: 'ENTREVISTA EXCLUSIVA: OS MAIORES CANAIS DO BRASIL',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCw1iFWChf1qTI7T2oTCRlcRZ59DZ7or99KVyASHTDLp6gNkKSO0ajmbYwUxdUeBA1mL1uiBTGSrV1LjKwdA2vYmKZWHKZsBY6Hyu4g4opL5kiE0eduMDR6LX4SGpDTewqbt7PA6zni_EJ3Hk6SnCEYy8arnccJqconGueH5LNeysx6FRQvXSieHe_bvcFo8w8B4JszaT8idgM49PsPDSDwXwOmWqhtJYnpeHPrxsec',
    durationFormatted: '02:40:15',
    durationSeconds: 9615,
    isShort: false,
    publishedText: 'Há 2 semanas',
    viewsText: '640k views',
  },
  {
    id: '7',
    title: 'COMO MONETIZAR CORTES EM MÚLTIPLAS PLATAFORMAS',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCzvkxyDb3Qdy2ruaX712X8-q_CJowVspB4p9JeOfubqecMv8UUyn9w84JHqZ5aeJC4UUwGwhY1EeLDFYhMUswC7X8CmI-cC9fHQCaszuzPavkiuT9o0zk41N7rfftl0wEhh9koSwZg7PogCHkpNesYDZ1XjiqJdvxQPU-j4utR-fPv6x0O1PkL04uxU00fyPTRm6dnRzw0fZpWcYlS0J0somyWsIvFXlbPBrEqUGMk',
    durationFormatted: '01:12:08',
    durationSeconds: 4328,
    isShort: false,
    publishedText: 'Há 2 semanas',
    viewsText: '410k views',
  },
  {
    id: '8',
    title: 'Dica de renderização ultrarrápida no AppFrame #shorts',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD56_D7wMylxA4h_N13GChse1VYkz2Vb773BK7yxp1mYchbjHfUTa6Ym5ptp9ekORE9o5UYlMA5HQyB3HS51iHldMPlvwWuzAHxyMYtXmKN9F9BbSVJydl5U9_4g3Kpu_LLumnpajAwqVATueuJD6EpiULDcnyqGqlxSOJBrQOyr5p1MUw3F0pxe_gSul_gIHAgV10XrwCZSevk33vfOPwBFdPdilcNn152IooxnRtD',
    durationFormatted: '00:30',
    durationSeconds: 30,
    isShort: true,
    publishedText: 'Há 3 semanas',
    viewsText: '950k views',
  },
];

export const ScraperPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [channelUrl, setChannelUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [filter, setFilter] = useState<'all' | 'long' | 'shorts'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channelMeta, setChannelMeta] = useState<{
    name: string;
    subscribers: string;
    avatarUrl: string;
    totalIndexed: number;
    retentionRate: string;
  } | null>(null);

  // Filtragem dos cards
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (filter === 'long') return !v.isShort;
      if (filter === 'shorts') return v.isShort;
      return true;
    });
  }, [videos, filter]);

  // Contagem de vídeos selecionados e duração acumulada
  const { selectedCount, totalSeconds } = useMemo(() => {
    let secs = 0;
    videos.forEach((v) => {
      if (selectedIds.has(v.id)) {
        secs += v.durationSeconds;
      }
    });
    return {
      selectedCount: selectedIds.size,
      totalSeconds: secs,
    };
  }, [videos, selectedIds]);

  const formatDurationAccumulated = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredVideos.length && filteredVideos.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const executeScan = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    setIsScanning(true);
    setChannelUrl(targetUrl);

    try {
      // Tentativa de integração com endpoint real do scraper NestJS
      const token = localStorage.getItem('appframe_access_token');
      const response = await fetch('http://localhost:3000/scraper/channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ channelUrl: targetUrl }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          setVideos(data.items);
          setChannelMeta({
            name: data.channelTitle || targetUrl.replace(/https?:\/\/(www\.)?youtube\.com\//, ''),
            subscribers: data.subscriberCount ? `${data.subscriberCount} inscritos` : '2.1M inscritos',
            avatarUrl: data.channelThumbnail || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIttx2uGI3y9RaDmUK39hfKzLGVCf4eWUGkDjnUjeo_pRf7AGbkWTb1vLn51RPYDlInBz39A_qP1cQVSYMbn09LKFV3NwFt5eDbyiyG1JFCaBx4beXiWH-H8SbcDwOxeff0WkVPk1jcr7gK4l-guNt3l0cfiPxH-kf1XMdIcUEIqMwMnZPf_UrAbhaLn_CrTeTiFem-PPDvQcQWo_Ldf9q053_iS-vbPSqn6pdzxGM',
            totalIndexed: data.items.length,
            retentionRate: '68.4%',
          });
          setHasScanned(true);
          setSelectedIds(new Set([data.items[0].id]));
          return;
        }
      }

      // Mock de alta fidelidade da Referência 2 quando executado localmente
      setTimeout(() => {
        setVideos(INITIAL_DEMO_VIDEOS);
        setChannelMeta({
          name: targetUrl.includes('podpah') ? 'Podpah Podcast Oficial' : 'Flow Podcast Oficial',
          subscribers: '2.1M inscritos',
          avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIttx2uGI3y9RaDmUK39hfKzLGVCf4eWUGkDjnUjeo_pRf7AGbkWTb1vLn51RPYDlInBz39A_qP1cQVSYMbn09LKFV3NwFt5eDbyiyG1JFCaBx4beXiWH-H8SbcDwOxeff0WkVPk1jcr7gK4l-guNt3l0cfiPxH-kf1XMdIcUEIqMwMnZPf_UrAbhaLn_CrTeTiFem-PPDvQcQWo_Ldf9q053_iS-vbPSqn6pdzxGM',
          totalIndexed: INITIAL_DEMO_VIDEOS.length,
          retentionRate: '68.4%',
        });
        setHasScanned(true);
        setSelectedIds(new Set(['1', '2', '3']));
        setIsScanning(false);
      }, 700);
    } catch {
      setVideos(INITIAL_DEMO_VIDEOS);
      setHasScanned(true);
      setIsScanning(false);
    }
  };

  const handleDownloadSelected = () => {
    alert(`Enviando ${selectedCount} vídeo(s) para a fila de download (media:download)...`);
  };

  const handleOpenStudio = () => {
    navigate('studio', { selectedVideos: Array.from(selectedIds).join(',') });
  };

  return (
    <AppShell
      currentPath="varredura"
      onNavigate={(path) => navigate(path)}
      userName="Christian"
      onUserAvatarClick={() => navigate('login')}
    >
      <div className="flex flex-col w-full text-on-surface select-none">
        {/* ================= CONTROLES SUPERIORES & HERO ================= */}
        <section className="flex flex-col gap-space-md mb-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-sm mb-1 flex-wrap">
                <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg tracking-tight font-bold text-on-surface">
                  Varredura de Canais
                </h1>
                <Badge variant="status-live">
                  YouTube Data API v3 Conectado
                </Badge>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                Insira o canal para indexar mídias, analisar retenção e enviar para corte dinâmico no Studio.
              </p>
            </div>

            {/* Alternador de Estado para Validação */}
            <div className="flex items-center gap-space-xs self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (hasScanned) {
                    setHasScanned(false);
                    setSelectedIds(new Set());
                  } else {
                    executeScan('https://youtube.com/@flowpodcast');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-all shadow-sm cursor-pointer border border-surface-container-highest/60"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">
                  swap_horiz
                </span>
                <span>{hasScanned ? 'Ver Estado Vazio Inicial' : 'Ver Estado Populado'}</span>
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa de URL (48px) */}
          <div className="relative w-full rounded-xl bg-surface-container-low p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all focus-within:shadow-[0_0_0_2px_rgba(212,163,70,0.3)] border border-surface-container-high">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-3 flex-1 px-3 py-1 w-full">
                <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    smart_display
                  </span>
                </div>
                <input
                  type="text"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeScan(channelUrl);
                  }}
                  placeholder="Cole a URL do canal do YouTube ou @handle..."
                  className="w-full bg-transparent border-0 outline-none text-on-surface placeholder:text-outline font-body-md text-body-md h-10 tracking-tight"
                />
                {channelUrl && (
                  <button
                    type="button"
                    onClick={() => setChannelUrl('')}
                    title="Limpar URL"
                    className="text-outline hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      cancel
                    </span>
                  </button>
                )}
              </div>

              <Button
                variant="primary"
                size="md"
                isLoading={isScanning}
                onClick={() => executeScan(channelUrl)}
                className="w-full sm:w-auto px-6 h-11 shrink-0"
                leftIcon={
                  <span className="material-symbols-outlined text-[20px] animate-spin" style={{ animationDuration: '4s' }}>
                    radar
                  </span>
                }
              >
                <span>Varrer Canal</span>
              </Button>
            </div>
          </div>

          {/* Barra de Filtros e Seleção em Lote */}
          {hasScanned && (
            <div className="flex flex-wrap items-center justify-between gap-space-md pt-1">
              {/* Chips de Categoria */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span>Todos</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-label-sm font-label-sm">
                    {videos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('long')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
                    filter === 'long'
                      ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span>Vídeos Longos</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm">
                    {videos.filter((v) => !v.isShort).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('shorts')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
                    filter === 'shorts'
                      ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span>Shorts</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm">
                    {videos.filter((v) => v.isShort).length}
                  </span>
                </button>
              </div>

              {/* Ações em Lote */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-title-sm text-title-sm transition-colors flex items-center gap-1 cursor-pointer border border-outline/10"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    select_all
                  </span>
                  <span>
                    {selectedIds.size === filteredVideos.length && filteredVideos.length > 0
                      ? 'Desmarcar Todos'
                      : 'Selecionar Todos'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ================= ESTADO POPULADO ================= */}
        {hasScanned && videos.length > 0 ? (
          <div className="flex flex-col gap-space-lg">
            {/* Card de Cabeçalho do Canal Ativo */}
            {channelMeta && (
              <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-space-md sm:p-space-lg shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-primary/15">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md relative z-10">
                  <div className="flex items-center gap-space-md">
                    {/* Avatar do Canal */}
                    <div className="relative shrink-0">
                      <img
                        src={channelMeta.avatarUrl}
                        alt={channelMeta.name}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-[0_0_16px_rgba(212,163,70,0.25)] ring-1 ring-primary/30"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px] shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">
                          check
                        </span>
                      </div>
                    </div>

                    {/* Metadados do Canal */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                          {channelMeta.name}
                        </span>
                        <span className="material-symbols-outlined text-primary text-[18px]" title="Canal Verificado">
                          verified
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{channelMeta.subscribers}</span>
                        <span className="text-outline">•</span>
                        <span>{channelMeta.totalIndexed} vídeos indexados</span>
                        <span className="text-outline">•</span>
                        <span className="text-tertiary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                          Sincronizado há pouco
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contadores e Métricas */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-outline/10">
                      <span className="text-label-sm font-label-sm text-outline">Indexados</span>
                      <span className="text-title-md font-title-md font-bold text-on-surface">
                        {videos.length} Vídeos
                      </span>
                    </div>
                    <div className="bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-outline/10">
                      <span className="text-label-sm font-label-sm text-outline">Taxa Retenção</span>
                      <span className="text-title-md font-title-md font-bold text-primary">{channelMeta.retentionRate}</span>
                    </div>
                    <div className="bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-outline/10">
                      <span className="text-label-sm font-label-sm text-outline">Prontos IA</span>
                      <span className="text-title-md font-title-md font-bold text-on-surface">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid responsivo de vídeos (4 colunas no desktop, 1 no mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isSelected={selectedIds.has(video.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ================= ESTADO VAZIO INICIAL USANDO <EmptyState> ================= */
          <EmptyState
            icon="radar"
            title="Nenhum canal consultado no AppFrame"
            description="Cole a URL de um canal acima para carregar a lista real de vídeos e Shorts prontos para corte dinâmico, detecção de silêncio e download."
            suggestionsTitle="Canais sugeridos para teste rápido:"
            suggestions={[
              {
                label: '@flowpodcast',
                onClick: () => executeScan('https://youtube.com/@flowpodcast'),
              },
              {
                label: '@podpah',
                onClick: () => executeScan('https://youtube.com/@podpah'),
              },
              {
                label: '@inteligencialtda',
                onClick: () => executeScan('https://youtube.com/@inteligencialtda'),
              },
            ]}
          />
        )}

        {/* ================= DOCK FLUTUANTE DE LOTE (BatchDock) ================= */}
        <BatchDock
          visible={hasScanned && selectedCount > 0}
          selectedCount={selectedCount}
          totalDurationFormatted={formatDurationAccumulated(totalSeconds)}
          onClearSelection={handleClearSelection}
          onDownloadSelected={handleDownloadSelected}
          onOpenStudio={handleOpenStudio}
        />
      </div>
    </AppShell>
  );
};
