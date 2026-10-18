import React from 'react';
import { Card } from '../../../components/ui/Card';
import { cn } from '../../../lib/utils';
import { useStudioContext } from '../context';
import { StudioSubtitlesTab } from './StudioSubtitlesTab';
import { StudioWatermarkTab } from './StudioWatermarkTab';

export const StudioSidebarTabs: React.FC = () => {
  const { activeTab, setActiveTab } = useStudioContext();

  return (
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

      {/* ABA 1: CONFIGURAÇÕES DE LEGENDA */}
      {activeTab === 'legendas' && <StudioSubtitlesTab />}

      {/* ABA 2: MARCA D'ÁGUA */}
      {activeTab === 'marca-dagua' && <StudioWatermarkTab />}
    </Card>
  );
};
