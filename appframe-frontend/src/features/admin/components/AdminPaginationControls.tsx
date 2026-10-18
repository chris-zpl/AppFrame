import React from 'react';
import { AdminPaginationButton } from './AdminPaginationButton';
import { cn } from '../../../lib/utils';

export interface AdminPaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageNumbers: (number | 'ellipsis-start' | 'ellipsis-end')[];
  onPageChange: (page: number) => void;
  className?: string;
}

export const AdminPaginationControls: React.FC<AdminPaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center gap-1.5 justify-center', className)}>
      <AdminPaginationButton
        variant="icon"
        icon="first_page"
        title="Primeira Página"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(1)}
      />

      <AdminPaginationButton
        variant="nav"
        icon="chevron_left"
        iconPosition="left"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        
      </AdminPaginationButton>

      {pageNumbers.map((pageItem) => {
        if (pageItem === 'ellipsis-start' || pageItem === 'ellipsis-end') {
          return (
            <span
              key={pageItem}
              className="px-2 py-1 text-outline font-mono select-none text-xs"
            >
              ...
            </span>
          );
        }

        const isActive = pageItem === currentPage;
        return (
          <AdminPaginationButton
            key={pageItem}
            variant="page"
            isActive={isActive}
            onClick={() => onPageChange(pageItem)}
          >
            {pageItem}
          </AdminPaginationButton>
        );
      })}

      <AdminPaginationButton
        variant="nav"
        icon="chevron_right"
        iconPosition="right"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        
      </AdminPaginationButton>

      <AdminPaginationButton
        variant="icon"
        icon="last_page"
        title="Última Página"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(totalPages)}
      />
    </div>
  );
};
