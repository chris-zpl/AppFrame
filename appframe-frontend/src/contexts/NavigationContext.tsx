import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AppRoute =
  | 'scraper'
  | 'varredura'
  | 'login'
  | 'register'
  | 'auth-callback'
  | '2fa'
  | 'studio'
  | 'marcas-dagua'
  | 'historico';

interface NavigationContextType {
  currentRoute: AppRoute;
  params: Record<string, string>;
  navigate: (route: AppRoute, params?: Record<string, string>) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function parsePathname(pathname: string): AppRoute {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (clean === 'register') return 'register';
  if (clean === 'login') return 'login';
  if (clean === 'auth/callback' || clean === 'auth-callback') return 'auth-callback';
  if (clean === '2fa' || clean === 'two-factor') return '2fa';
  if (clean === 'studio') return 'studio';
  if (clean === 'marcas-dagua' || clean === 'watermarks') return 'marcas-dagua';
  if (clean === 'historico' || clean === 'history') return 'historico';
  return 'scraper';
}

function parseQuery(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const searchParams = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window === 'undefined') return 'scraper';
    return parsePathname(window.location.pathname);
  });

  const [params, setParams] = useState<Record<string, string>>(() => parseQuery());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parsePathname(window.location.pathname));
      setParams(parseQuery());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((route: AppRoute, newParams?: Record<string, string>) => {
    const normalizedRoute: AppRoute = route === 'varredura' ? 'scraper' : route;
    setCurrentRoute(normalizedRoute);
    setParams(newParams || {});

    if (typeof window !== 'undefined') {
      let path = '/';
      if (normalizedRoute === 'register') path = '/register';
      else if (normalizedRoute === 'login') path = '/login';
      else if (normalizedRoute === 'auth-callback') path = '/auth/callback';
      else if (normalizedRoute === '2fa') path = '/2fa';
      else if (normalizedRoute === 'studio') path = '/studio';
      else if (normalizedRoute === 'marcas-dagua') path = '/marcas-dagua';
      else if (normalizedRoute === 'historico') path = '/historico';
      else path = '/scraper';

      if (newParams && Object.keys(newParams).length > 0) {
        const query = new URLSearchParams(newParams).toString();
        path += `?${query}`;
      }

      window.history.pushState({}, '', path);
    }
  }, []);

  return (
    <NavigationContext.Provider value={{ currentRoute, params, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
