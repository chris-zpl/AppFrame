import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Select } from './Select';

export interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  itemsLabel?: string;
  className?: string;
  showFirstLast?: boolean;
  extraSummary?: React.ReactNode;
  startItemIndex?: number;
  endItemIndex?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages: propTotalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  itemsLabel = 'itens',
  className,
  showFirstLast = true,
  extraSummary,
  startItemIndex,
  endItemIndex,
}) => {
  const calculatedTotalPages = useMemo(() => {
    if (propTotalPages !== undefined) return propTotalPages;
    if (totalItems !== undefined && pageSize !== undefined && pageSize > 0) {
      return Math.max(1, Math.ceil(totalItems / pageSize));
    }
    return 1;
  }, [propTotalPages, totalItems, pageSize]);

  const totalPages = calculatedTotalPages;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem =
    startItemIndex !== undefined
      ? startItemIndex
      : totalItems !== undefined && totalItems > 0
        ? (safePage - 1) * (pageSize || 1) + 1
        : 0;
  const endItem =
    endItemIndex !== undefined
      ? endItemIndex
      : totalItems !== undefined
        ? Math.min(safePage * (pageSize || 1), totalItems)
        : 0;

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    if (start > 2) pages.push('ellipsis-start');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis-end');

    pages.push(totalPages);
    return pages;
  }, [totalPages, safePage]);

  if (totalItems === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-200 dark:border-surface-container-highest select-none',
        className
      )}
    >
      {/* Informações e Seletor de Itens por Página */}
      <div className="flex flex-wrap items-center gap-3 text-body-sm text-neutral-600 dark:text-outline w-full sm:w-auto justify-between sm:justify-start">
        {totalItems !== undefined && (
          <span>
            Mostrando{' '}
            <strong className="text-neutral-900 dark:text-on-surface">
              {startItem}–{endItem}
            </strong>{' '}
            de{' '}
            <strong className="text-neutral-900 dark:text-on-surface">
              {totalItems.toLocaleString('pt-BR')}
            </strong>{' '}
            {itemsLabel}
          </span>
        )}

        {extraSummary}

        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
            <label
              htmlFor="pagination-page-size"
              className="text-xs text-neutral-500 dark:text-outline font-medium shrink-0"
            >
              Exibir:
            </label>
            <Select
              id="pagination-page-size"
              name="paginationPageSize"
              size="sm"
              aria-label={`Quantidade de ${itemsLabel} por página`}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="w-36 text-xs font-medium"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por página
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Controles de Navegação de Página */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center shrink-0">
          {showFirstLast && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={safePage <= 1}
              onClick={() => onPageChange(1)}
              title="Primeira Página"
              className="w-8 h-8 text-neutral-700 dark:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">first_page</span>
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            title="Página Anterior"
            className="w-8 h-8 text-neutral-700 dark:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </Button>

          {pageNumbers.map((pageItem) => {
            if (pageItem === 'ellipsis-start' || pageItem === 'ellipsis-end') {
              return (
                <span
                  key={pageItem}
                  className="px-1.5 text-neutral-400 dark:text-outline font-mono text-xs select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = pageItem === safePage;
            return (
              <Button
                key={pageItem}
                type="button"
                variant={isActive ? 'primary' : 'secondary'}
                onClick={() => onPageChange(pageItem)}
                className={cn(
                  'min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg',
                  isActive
                    ? 'shadow-sm text-neutral-950 font-bold'
                    : 'text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface'
                )}
              >
                {pageItem}
              </Button>
            );
          })}

          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            title="Próxima Página"
            className="w-8 h-8 text-neutral-700 dark:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </Button>

          {showFirstLast && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Última Página"
              className="w-8 h-8 text-neutral-700 dark:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">last_page</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
