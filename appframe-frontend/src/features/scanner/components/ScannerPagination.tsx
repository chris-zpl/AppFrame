import React from 'react';

interface ScannerPaginationProps {
  safeCurrentPage: number;
  totalPages: number;
  pageNumbers: (number | 'ellipsis-start' | 'ellipsis-end')[];
  startItemIndex: number;
  endItemIndex: number;
  totalFilteredCount: number;
  onPageChange: (page: number) => void;
}

export const ScannerPagination: React.FC<ScannerPaginationProps> = ({
  safeCurrentPage,
  totalPages,
  pageNumbers,
  startItemIndex,
  endItemIndex,
  totalFilteredCount,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-neutral-200 dark:border-surface-container-high/60">
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        Mostrando <strong className="text-on-surface">{startItemIndex}–{endItemIndex}</strong> de{' '}
        <strong className="text-on-surface">{totalFilteredCount}</strong> mídias
      </span>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-title-sm font-title-sm text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer border border-outline/10"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          <span>Anterior</span>
        </button>

        {pageNumbers.map((pageItem) => {
          if (pageItem === 'ellipsis-start' || pageItem === 'ellipsis-end') {
            return (
              <span
                key={pageItem}
                className="px-2 py-1 text-on-surface-variant font-mono select-none"
              >
                ...
              </span>
            );
          }

          const isActive = pageItem === safeCurrentPage;
          return (
            <button
              key={pageItem}
              type="button"
              onClick={() => onPageChange(pageItem)}
              className={`min-w-[36px] h-9 px-2.5 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-primary text-neutral-950 dark:text-neutral-950 font-bold shadow-sm'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/10'
              }`}
            >
              {pageItem}
            </button>
          );
        })}

        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-title-sm font-title-sm text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer border border-outline/10"
        >
          <span>Próxima</span>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
