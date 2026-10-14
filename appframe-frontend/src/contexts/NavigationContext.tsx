import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppRoute =
  | 'scraper'
  | 'varredura'
  | 'login'
  | 'register'
  | 'auth-callback'
  | '2fa'
  | 'studio'
  | 'marcas-dagua'
  | 'watermarks'
  | 'historico'
  | 'history'
  | 'settings'
  | 'configuracoes';

export interface NavigateOptions {
  replace?: boolean;
}

interface NavigationContextType {
  currentRoute: AppRoute;
  params: Record<string, string>;
  navigate: (
    route: AppRoute | string,
    paramsOrOptions?: Record<string, any>,
    options?: NavigateOptions,
  ) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function parsePathname(pathname: string): AppRoute {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (clean === 'register') return 'register';
  if (clean === 'login') return 'login';
  if (clean === 'auth/callback' || clean === 'auth-callback') return 'auth-callback';
  if (clean === '2fa' || clean === 'two-factor') return '2fa';
  if (clean === 'studio') return 'studio';
  if (clean === 'marcas-dagua' || clean === 'watermarks' || clean === 'marcas' || clean === 'marca-dagua') return 'marcas-dagua';
  if (clean === 'historico' || clean === 'history') return 'historico';
  if (clean === 'settings' || clean === 'configuracoes') return 'settings';
  if (clean === 'scraper' || clean === 'varredura' || clean === '') return 'varredura';
  return 'varredura';
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const currentRoute = useMemo(() => {
    return parsePathname(location.pathname);
  }, [location.pathname]);

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [location.search]);

  const navigate = useCallback(
    (
      route: AppRoute | string,
      paramsOrOptions?: Record<string, any>,
      options?: NavigateOptions,
    ) => {
      let path = '/varredura';
      if (route === 'register') path = '/register';
      else if (route === 'login') path = '/login';
      else if (route === 'auth-callback' || route === 'auth/callback') path = '/auth/callback';
      else if (route === '2fa' || route === 'two-factor') path = '/2fa';
      else if (route === 'studio') path = '/studio';
      else if (
        route === 'marcas-dagua' ||
        route === 'watermarks' ||
        route === 'marcas' ||
        route === 'marca-dagua'
      )
        path = '/marcas-dagua';
      else if (route === 'historico' || route === 'history') path = '/historico';
      else if (route === 'settings' || route === 'configuracoes') path = '/settings';
      else if (route === 'scraper' || route === 'varredura' || route === '/') path = '/varredura';
      else if (route.startsWith('/')) path = route;

      let finalOptions = options;
      let queryParams: Record<string, string> | undefined;

      if (paramsOrOptions) {
        if (
          'replace' in paramsOrOptions &&
          typeof paramsOrOptions.replace === 'boolean' &&
          Object.keys(paramsOrOptions).length === 1
        ) {
          finalOptions = { replace: paramsOrOptions.replace };
        } else {
          queryParams = paramsOrOptions as Record<string, string>;
        }
      }

      if (queryParams && Object.keys(queryParams).length > 0) {
        const query = new URLSearchParams(queryParams).toString();
        path += `?${query}`;
      }

      routerNavigate(path, finalOptions);
    },
    [routerNavigate],
  );

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
