import React from 'react';
import { Card, Tabs } from '../../../components/ui';
import { useStudioContext } from '../context';
import { StudioSubtitlesTab } from './StudioSubtitlesTab';
import { StudioWatermarkTab } from './StudioWatermarkTab';

export const StudioSidebarTabs: React.FC = () => {
  const { activeTab, setActiveTab } = useStudioContext();

  return (
    <Card className="bg-white dark:bg-surface-container-low border border-neutral-200 dark:border-surface-container-high/90 p-4 shadow-sm dark:shadow-xl flex flex-col gap-4">
      {/* Abas Superiores do Painel Lateral */}
      <Tabs
        tabs={[
          { id: 'legendas', label: 'Legendas', icon: 'subtitles' },
          { id: 'marca-dagua', label: "Marca d'água", icon: 'branding_watermark' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'legendas' | 'marca-dagua')}
        variant="segmented"
        className="w-full flex"
        tabClassName="flex-1 justify-center"
        ariaLabel="Abas de personalização do Studio"
      />

      {/* ABA 1: CONFIGURAÇÕES DE LEGENDA */}
      {activeTab === 'legendas' && <StudioSubtitlesTab />}

      {/* ABA 2: MARCA D'ÁGUA */}
      {activeTab === 'marca-dagua' && <StudioWatermarkTab />}
    </Card>
  );
};
