import React from 'react';
import { Button, Input } from '../../../components/ui';

import { useScannerContext } from '../context';

export interface ScannerSearchBarProps {
  channelUrl?: string;
  setChannelUrl?: (val: string) => void;
  isScanning?: boolean;
  onScan?: (url: string) => void;
  hasScanned?: boolean;
  onClearCache?: () => void;
}

export const ScannerSearchBar: React.FC<ScannerSearchBarProps> = (props) => {
  const scanner = useScannerContext();

  const channelUrl = props.channelUrl ?? scanner.channelUrl;
  const setChannelUrl = props.setChannelUrl ?? scanner.setChannelUrl;
  const isScanning = props.isScanning ?? scanner.isScanning;
  const onScan = props.onScan ?? scanner.executeScan;
  const hasScanned = props.hasScanned ?? scanner.hasScanned;
  const onClearCache = props.onClearCache ?? scanner.handleClearCache;

  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      <div className="flex-1">
        <Input
          value={channelUrl}
          disabled={isScanning}
          onChange={(e) => setChannelUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onScan(channelUrl);
          }}
          placeholder="Cole a URL de um vídeo (ex: watch?v=...), canal ou @handle..."
          size="lg"
          leftIcon={
            <span className="material-symbols-outlined text-[20px] text-primary">
              smart_display
            </span>
          }
          rightElement={
            channelUrl && !isScanning ? (
              <button
                type="button"
                onClick={() => setChannelUrl('')}
                title="Limpar URL"
                className="text-neutral-400 hover:text-neutral-900 dark:text-outline dark:hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  cancel
                </span>
              </button>
            ) : null
          }
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        isLoading={isScanning}
        onClick={() => onScan(channelUrl)}
        className="w-full sm:w-auto px-6 h-12 shrink-0 font-bold"
        leftIcon={
          <span className="material-symbols-outlined text-[20px]">
            radar
          </span>
        }
      >
        <span>{isScanning ? 'Varrendo canal...' : 'Varrer Canal'}</span>
      </Button>

      {hasScanned && (
        <Button
          variant="secondary"
          size="lg"
          disabled={isScanning}
          onClick={onClearCache}
          className="w-full sm:w-auto px-5 h-12 shrink-0 font-semibold text-neutral-700 dark:text-neutral-200 hover:text-red-600 dark:hover:text-red-400 border border-neutral-300 dark:border-outline/20"
          title="Limpar dados em cache da varredura"
          leftIcon={
            <span className="material-symbols-outlined text-[20px]">
              delete_sweep
            </span>
          }
        >
          <span>Limpar Cache</span>
        </Button>
      )}
    </div>
  );
};
