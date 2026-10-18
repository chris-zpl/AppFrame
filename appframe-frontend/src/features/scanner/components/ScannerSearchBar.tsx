import React from 'react';
import { Button } from '../../../components/ui';

interface ScannerSearchBarProps {
  channelUrl: string;
  setChannelUrl: (val: string) => void;
  isScanning: boolean;
  onScan: (url: string) => void;
}

export const ScannerSearchBar: React.FC<ScannerSearchBarProps> = ({
  channelUrl,
  setChannelUrl,
  isScanning,
  onScan,
}) => {
  return (
    <div className="relative w-full rounded-xl bg-white dark:bg-surface-container-low p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all focus-within:shadow-[0_0_0_2px_rgba(212,163,70,0.3)] border border-neutral-200 dark:border-surface-container-high">
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="flex items-center gap-3 flex-1 px-3 py-1 w-full">
          <div className="w-8 h-8 rounded-lg flex items-center bg-primary-container justify-center text-surface shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              smart_display
            </span>
          </div>
          <input
            type="text"
            value={channelUrl}
            disabled={isScanning}
            onChange={(e) => setChannelUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onScan(channelUrl);
            }}
            placeholder="Cole a URL de um vídeo (ex: watch?v=...), canal ou @handle..."
            className="w-full bg-transparent border-0 outline-none text-on-surface placeholder:text-outline font-body-md text-body-md h-10 tracking-tight disabled:opacity-50"
          />
          {channelUrl && !isScanning && (
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
          onClick={() => onScan(channelUrl)}
          className="w-full sm:w-auto px-6 h-11 shrink-0"
          leftIcon={
            <span className="material-symbols-outlined text-[20px]">
              radar
            </span>
          }
        >
          <span>{isScanning ? 'Varrendo canal...' : 'Varrer Canal'}</span>
        </Button>
      </div>
    </div>
  );
};
