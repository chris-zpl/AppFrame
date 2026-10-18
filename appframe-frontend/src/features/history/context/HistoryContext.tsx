import React, { createContext, useContext } from 'react';
import { useHistoryJobs } from '../hooks/useHistoryJobs';

export type HistoryContextType = ReturnType<typeof useHistoryJobs>;

const HistoryContext = createContext<HistoryContextType | null>(null);

export interface HistoryProviderProps {
  children: React.ReactNode;
}

export const HistoryProvider: React.FC<HistoryProviderProps> = ({ children }) => {
  const value = useHistoryJobs();
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
};

export const useHistoryContext = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistoryContext must be used within a HistoryProvider');
  }
  return context;
};
