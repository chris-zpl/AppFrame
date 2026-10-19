import React from 'react';
import type { ScannerFilterType, ChannelMeta, ScrapedVideoCardData } from '../types';

import { useScannerContext } from '../context';

export interface ScannerFilterTabsProps {
  filter?: ScannerFilterType;
  onFilterChange?: (nextFilter: ScannerFilterType) => void;
  videos?: ScrapedVideoCardData[];
  channelMeta?: ChannelMeta | null;
  selectedCount?: number;
  filteredCount?: number;
  onSelectAll?: () => void;
}

export const ScannerFilterTabs: React.FC<ScannerFilterTabsProps> = (props) => {
  const scanner = useScannerContext();

  const filter = props.filter ?? scanner.filter;
  const onFilterChange = props.onFilterChange ?? scanner.handleFilterChange;
  const videos = props.videos ?? scanner.videos;
  const channelMeta = props.channelMeta !== undefined ? props.channelMeta : scanner.channelMeta;
  const selectedCount = props.selectedCount ?? scanner.selectedCount;
  const filteredCount = props.filteredCount ?? scanner.filteredVideos.length;
  const onSelectAll = props.onSelectAll ?? scanner.handleSelectAll;

  if (!scanner.hasScanned || scanner.videos.length === 0 || scanner.isScanning) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-space-md pt-1">
      {/* Chips de Categoria Dinâmicos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-amber-500/15 dark:bg-primary-container/20 text-amber-800 dark:text-primary border border-amber-600/30 dark:border-primary/40 shadow-sm font-semibold'
              : 'bg-neutral-100 dark:bg-surface-container text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-neutral-200 dark:border-transparent'
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 dark:bg-primary/20 text-amber-900 dark:text-primary text-label-sm font-label-sm">
            {videos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('long')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
            filter === 'long'
              ? 'bg-amber-500/15 dark:bg-primary-container/20 text-amber-800 dark:text-primary border border-amber-600/30 dark:border-primary/40 shadow-sm font-semibold'
              : 'bg-neutral-100 dark:bg-surface-container text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-neutral-200 dark:border-transparent'
          }`}
        >
          <span>Vídeos</span>
          <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-surface-container-highest text-label-sm font-label-sm">
            {channelMeta?.longCount ?? videos.filter((v) => !v.isShort).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('shorts')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
            filter === 'shorts'
              ? 'bg-amber-500/15 dark:bg-primary-container/20 text-amber-800 dark:text-primary border border-amber-600/30 dark:border-primary/40 shadow-sm font-semibold'
              : 'bg-neutral-100 dark:bg-surface-container text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-200 dark:hover:bg-surface-container-high border border-neutral-200 dark:border-transparent'
          }`}
        >
          <span>Shorts</span>
          <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-surface-container-highest text-label-sm font-label-sm">
            {channelMeta?.shortsCount ?? videos.filter((v) => v.isShort).length}
          </span>
        </button>
      </div>

      {/* Botão de Selecionar / Desmarcar Todos */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface font-title-sm text-title-sm transition-colors flex items-center gap-1 cursor-pointer border border-neutral-200 dark:border-outline/10"
        >
          <span className="material-symbols-outlined text-[16px]">
            select_all
          </span>
          <span>
            {selectedCount === filteredCount && filteredCount > 0
              ? 'Desmarcar Todos'
              : 'Selecionar Todos'}
          </span>
        </button>
      </div>
    </div>
  );
};
