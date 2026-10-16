import React from 'react';
import { BatchDock } from '../../../components/layout/BatchDock';
import { formatDurationAccumulated } from '../utils';

export interface ScannerBatchDockProps {
  visible: boolean;
  selectedCount: number;
  totalSeconds: number;
  isDownloading: boolean;
  onClearSelection: () => void;
  onDownloadSelected: () => void;
  onOpenStudio: () => void;
}

export const ScannerBatchDock: React.FC<ScannerBatchDockProps> = ({
  visible,
  selectedCount,
  totalSeconds,
  isDownloading,
  onClearSelection,
  onDownloadSelected,
  onOpenStudio,
}) => {
  return (
    <BatchDock
      visible={visible}
      selectedCount={selectedCount}
      totalDurationFormatted={formatDurationAccumulated(totalSeconds)}
      onClearSelection={onClearSelection}
      onDownloadSelected={onDownloadSelected}
      onOpenStudio={onOpenStudio}
      isDownloading={isDownloading}
    />
  );
};
