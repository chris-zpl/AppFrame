import React, { createContext, useContext } from 'react';
import { useStudio, type UseStudioProps } from '../hooks/useStudio';

export type StudioContextType = ReturnType<typeof useStudio>;

const StudioContext = createContext<StudioContextType | null>(null);

export interface StudioProviderProps extends UseStudioProps {
  children: React.ReactNode;
}

export const StudioProvider: React.FC<StudioProviderProps> = ({ navigate, params, children }) => {
  const value = useStudio({ navigate, params });
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudioContext = (): StudioContextType => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudioContext must be used within a StudioProvider');
  }
  return context;
};
