import React, { createContext, useContext } from 'react';
import { useScanner } from '../hooks/useScanner';

export type ScannerContextType = ReturnType<typeof useScanner>;

const ScannerContext = createContext<ScannerContextType | null>(null);

export interface ScannerProviderProps {
  children: React.ReactNode;
}

export const ScannerProvider: React.FC<ScannerProviderProps> = ({ children }) => {
  const value = useScanner();
  return <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>;
};

export const useScannerContext = (): ScannerContextType => {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScannerContext must be used within a ScannerProvider');
  }
  return context;
};
