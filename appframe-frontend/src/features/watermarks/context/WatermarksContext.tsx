import React, { createContext, useContext } from 'react';
import { useWatermarks } from '../hooks/useWatermarks';

export type WatermarksContextType = ReturnType<typeof useWatermarks>;

const WatermarksContext = createContext<WatermarksContextType | null>(null);

export interface WatermarksProviderProps {
  children: React.ReactNode;
}

export const WatermarksProvider: React.FC<WatermarksProviderProps> = ({ children }) => {
  const value = useWatermarks();
  return <WatermarksContext.Provider value={value}>{children}</WatermarksContext.Provider>;
};

export const useWatermarksContext = (): WatermarksContextType => {
  const context = useContext(WatermarksContext);
  if (!context) {
    throw new Error('useWatermarksContext must be used within a WatermarksProvider');
  }
  return context;
};
