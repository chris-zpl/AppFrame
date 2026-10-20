import React from 'react';
import type { ScannerFilterType, ChannelMeta, ScrapedVideoCardData } from '../types';
import { useScannerContext } from '../context';
import { Tabs, type TabItem } from '../../../components/ui';

export interface ScannerFilterTabsProps {
  filter?: ScannerFilterType;
  onFilterChange?: (nextFilter: ScannerFilterType) => void;
  videos?: ScrapedVideoCardData[];
  channelMeta?: ChannelMeta | null;
}

export const ScannerFilterTabs: React.FC<ScannerFilterTabsProps> = (props) => {
  const scanner = useScannerContext();

  const filter = props.filter ?? scanner.filter;
  const onFilterChange = props.onFilterChange ?? scanner.handleFilterChange;
  const videos = props.videos ?? scanner.videos;
  const channelMeta = props.channelMeta !== undefined ? props.channelMeta : scanner.channelMeta;

  if (!scanner.hasScanned || scanner.videos.length === 0 || scanner.isScanning) {
    return null;
  }

  const tabs: TabItem[] = [
    {
      id: 'all',
      label: 'Todos',
      count: channelMeta?.totalChannelVideos ?? videos.length,
    },
    {
      id: 'long',
      label: 'Vídeos',
      count: channelMeta?.longCount ?? videos.filter((v) => !v.isShort).length,
    },
    {
      id: 'shorts',
      label: 'Shorts',
      count: channelMeta?.shortsCount ?? videos.filter((v) => v.isShort).length,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-space-md pt-1">
      {/* Chips de Categoria Dinâmicos */}
      <Tabs
        tabs={tabs}
        activeTab={filter}
        onChange={(id) => onFilterChange(id as ScannerFilterType)}
        variant="pills"
        tabClassName="rounded-full"
        ariaLabel="Filtrar vídeos por tipo"
      />
    </div>
  );
};
