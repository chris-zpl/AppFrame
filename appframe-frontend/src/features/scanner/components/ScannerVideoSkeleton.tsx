import React from 'react';

export interface ScannerVideoSkeletonProps {
  count?: number;
}

export const ScannerVideoSkeleton: React.FC<ScannerVideoSkeletonProps> = ({ count = 8 }) => {
  return (
    <div className="flex flex-col gap-space-md animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl bg-surface-container border border-surface-container-high overflow-hidden shadow-sm h-72"
          >
            <div className="w-full aspect-video bg-surface-container-high relative" />
            <div className="p-space-md flex flex-col flex-1 justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="h-4 bg-surface-container-highest rounded w-5/6" />
                <div className="h-4 bg-surface-container-highest rounded w-3/5" />
              </div>
              <div className="h-3 bg-surface-container-highest/60 rounded w-1/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
