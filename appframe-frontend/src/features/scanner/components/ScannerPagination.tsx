import React from 'react';
import { Pagination } from '../../../components/ui';
import { useScannerContext } from '../context';

export interface ScannerPaginationProps {
  safeCurrentPage?: number;
  totalPages?: number;
  pageNumbers?: (number | 'ellipsis-start' | 'ellipsis-end')[];
  startItemIndex?: number;
  endItemIndex?: number;
  totalFilteredCount?: number;
  onPageChange?: (page: number) => void;
}

export const ScannerPagination: React.FC<ScannerPaginationProps> = (props) => {
  const scanner = useScannerContext();

  const safeCurrentPage = props.safeCurrentPage ?? scanner.safeCurrentPage;
  const totalPages = props.totalPages ?? scanner.totalPages;
  const startItemIndex = props.startItemIndex ?? scanner.startItemIndex;
  const endItemIndex = props.endItemIndex ?? scanner.endItemIndex;
  const totalFilteredCount = props.totalFilteredCount ?? scanner.totalVideosAvailable;
  const onPageChange = props.onPageChange ?? scanner.handlePageChange;

  if (totalPages <= 1) return null;

  return (
    <Pagination
      currentPage={safeCurrentPage}
      totalPages={totalPages}
      totalItems={typeof totalFilteredCount === 'number' ? totalFilteredCount : undefined}
      startItemIndex={startItemIndex}
      endItemIndex={endItemIndex}
      onPageChange={onPageChange}
      showFirstLast={false}
      itemsLabel="mídias"
      className="pb-2 border-neutral-200 dark:border-surface-container-high/60"
      extraSummary={
        scanner.isFetchingMore ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
            <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
            Carregando mais...
          </span>
        ) : null
      }
    />
  );
};
