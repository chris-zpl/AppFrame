import React, { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface RenderJob {
  id: string;
  title: string;
  platform: string;
  status: 'pending' | 'downloading' | 'rendering' | 'completed' | 'failed';
  progress: number;
  durationFormatted: string;
  aspectRatio: string;
  createdAt: string;
  videoUrl?: string;
}

const SAMPLE_JOBS: RenderJob[] = [
  {
    id: 'job-sample-1',
    title: 'EP. 412 - O segredo para reter audiência nos primeiros 3 segundos',
    platform: 'YouTube Shorts',
    status: 'completed',
    progress: 100,
    durationFormatted: '00:43',
    aspectRatio: '9:16',
    createdAt: 'Há 12 minutos',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41581-large.mp4',
  },
  {
    id: 'job-sample-2',
    title: 'COMO ESCALAR CANAIS DE CORTES AUTOMATIZADOS COM IA',
    platform: 'Reels / TikTok',
    status: 'completed',
    progress: 100,
    durationFormatted: '01:15',
    aspectRatio: '9:16',
    createdAt: 'Há 1 hora',
  },
  {
    id: 'job-sample-3',
    title: 'BASTIDORES DA PRODUÇÃO E SETUP COMPLETO',
    platform: 'Widescreen 16:9',
    status: 'completed',
    progress: 100,
    durationFormatted: '02:40',
    aspectRatio: '16:9',
    createdAt: 'Há 3 horas',
  },
];

export const HistoricoPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const [jobs, setJobs] = useState<RenderJob[]>(() => {
    if (params.jobCreated && params.jobId) {
      const newJob: RenderJob = {
        id: params.jobId,
        title: params.title || 'EP. 412 - INTELIGÊNCIA ARTIFICIAL E O FUTURO DA CRIAÇÃO DE CONTEÚDO',
        platform: 'YouTube Shorts',
        status: 'rendering',
        progress: 18,
        durationFormatted: '00:43',
        aspectRatio: '9:16',
        createdAt: 'Agora mesmo',
      };
      return [newJob, ...SAMPLE_JOBS];
    }
    return SAMPLE_JOBS;
  });

  // Simulação do progresso da fila BullMQ NestJS (18% -> 40% -> 62% -> 84% -> 100%)
  useEffect(() => {
    if (!params.jobCreated || !params.jobId) return;

    const targetId = params.jobId;
    const interval = setInterval(() => {
      setJobs((currentJobs) =>
        currentJobs.map((j) => {
          if (j.id === targetId) {
            if (j.progress >= 100) {
              return { ...j, status: 'completed', progress: 100 };
            }
            const nextProgress = j.progress + 22;
            return {
              ...j,
              progress: Math.min(100, nextProgress),
              status: nextProgress >= 100 ? 'completed' : 'rendering',
            };
          }
          return j;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [params.jobCreated, params.jobId]);

  return (
    <AppShell
      currentPath="historico"
      onNavigate={(path) => navigate(path)}
      userName="Christian"
      onUserAvatarClick={() => navigate('login')}
    >
      <div className="flex flex-col w-full text-on-surface select-none pb-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1">
              <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
                Histórico de Renderizações
              </h1>
              <Badge variant="status-live">
                Fila BullMQ Ativa
              </Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Acompanhamento de orquestração de cortes, queima de legendas com fix_bounds e aplicação de marcas d'água via FFmpeg.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('studio')}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>
            }
          >
            Novo Corte no Studio
          </Button>
        </header>

        {/* Notificação se job acabou de ser despachado */}
        {params.jobCreated && (
          <div className="mb-6 p-4 rounded-2xl bg-primary-container/20 border border-primary/40 shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px] animate-spin" style={{ animationDuration: '3s' }}>
                  sync
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-sm text-title-sm font-bold text-on-surface">
                  Job despachado com sucesso para a fila!
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  ID: <code className="text-primary font-mono">{params.jobId}</code> • FFmpeg está processando o corte sem drift e queimando as legendas.
                </span>
              </div>
            </div>
            <span className="text-label-sm font-label-sm font-bold text-primary uppercase tracking-wider hidden sm:inline">
              Fila: media:render
            </span>
          </div>
        )}

        {/* Lista de Jobs Renderizados */}
        <div className="flex flex-col gap-4">
          {jobs.map((job) => {
            const isDone = job.status === 'completed';
            const isProcessing = job.status === 'rendering' || job.status === 'downloading';

            return (
              <Card
                key={job.id}
                className="p-4 sm:p-5 bg-surface-container-low border border-surface-container-high hover:border-primary/30 transition-all shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[26px]">
                      {isDone ? 'video_file' : 'movie_filter'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-title-md text-title-md font-bold text-on-surface">
                        {job.title}
                      </h3>
                      <Badge variant={job.aspectRatio === '9:16' ? 'short' : 'long'}>
                        {job.aspectRatio}
                      </Badge>
                      {isDone ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-label-sm font-label-sm font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Concluído
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-label-sm font-label-sm font-bold flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Processando {job.progress}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-body-sm text-body-sm text-on-surface-variant flex-wrap">
                      <span>Duração: <strong className="text-on-surface">{job.durationFormatted}</strong></span>
                      <span className="text-outline">•</span>
                      <span>Criado: {job.createdAt}</span>
                      <span className="text-outline">•</span>
                      <span className="text-outline font-mono text-[11px]">{job.id}</span>
                    </div>

                    {/* Barra de Progresso quando em renderização */}
                    {isProcessing && (
                      <div className="w-full max-w-md bg-surface-container-highest h-2 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500 rounded-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações do Job */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {isDone ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => alert(`Baixando vídeo final renderizado (${job.id}.mp4)...`)}
                        leftIcon={
                          <span className="material-symbols-outlined text-[16px]">
                            download
                          </span>
                        }
                      >
                        Baixar MP4
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('studio', { selectedVideos: job.id })}
                        leftIcon={
                          <span className="material-symbols-outlined text-[16px]">
                            edit
                          </span>
                        }
                      >
                        Editar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="opacity-70"
                    >
                      Processando no FFmpeg...
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};
