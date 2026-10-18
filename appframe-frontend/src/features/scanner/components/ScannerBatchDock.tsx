import React from 'react';
import { BatchDock } from '../../../components/layout/BatchDock';
import { formatDurationAccumulated } from '../utils';

import { useScannerContext } from '../context';

export interface ScannerBatchDockProps {
  visible?: boolean;
  selectedCount?: number;
  totalSeconds?: number;
  isDownloading?: boolean;
  onClearSelection?: () => void;
  onDownloadSelected?: () => void;
  onOpenStudio?: () => void;
}

export const ScannerBatchDock: React.FC<ScannerBatchDockProps> = (props) => {
  const scanner = useScannerContext();

  const visible = props.visible ?? (scanner.hasScanned && scanner.selectedCount > 0 && !scanner.isScanning);
  const selectedCount = props.selectedCount ?? scanner.selectedCount;
  const totalSeconds = props.totalSeconds ?? scanner.totalSeconds;
  const isDownloading = props.isDownloading ?? scanner.isDownloading;
  const onClearSelection = props.onClearSelection ?? scanner.handleClearSelection;
  const onDownloadSelected = props.onDownloadSelected ?? (() => scanner.handleDownloadSelected());
  const onOpenStudio = props.onOpenStudio ?? (() => {});
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
