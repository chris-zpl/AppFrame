import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppRoute =
  | 'scraper'
  | 'varredura'
  | 'login'
  | 'register'
  | 'reset-password'
  | 'auth-callback'
  | '2fa'
  | 'studio'
  | 'marcas-dagua'
  | 'watermarks'
  | 'historico'
  | 'history'
  | 'settings'
  | 'configuracoes'
  | 'admin'
  | 'terms'
  | 'privacy';

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
  const [pathOnly] = pathname.split('?');
  const clean = pathOnly.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (clean === 'register') return 'register';
  if (clean === 'login') return 'login';
  if (clean === 'reset-password' || clean === 'recuperar-senha' || clean === 'forgot-password') return 'reset-password';
  if (clean === 'auth/callback' || clean === 'auth-callback') return 'auth-callback';
  if (clean === '2fa' || clean === 'two-factor') return '2fa';
  if (clean === 'studio') return 'studio';
  if (clean === 'marcas-dagua' || clean === 'watermarks' || clean === 'marcas' || clean === 'marca-dagua') return 'marcas-dagua';
  if (clean === 'historico' || clean === 'history') return 'historico';
  if (clean === 'settings' || clean === 'configuracoes') return 'settings';
  if (clean === 'admin') return 'admin';
  if (clean === 'terms' || clean === 'termos') return 'terms';
  if (clean === 'privacy' || clean === 'privacidade') return 'privacy';
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
      const [routePart, inlineQuery] = (route || '').split('?');
      const clean = routePart.replace(/^\/+|\/+$/g, '').toLowerCase();
      let path = '/varredura';
      if (clean === 'register') path = '/register';
      else if (clean === 'login') path = '/login';
      else if (clean === 'reset-password' || clean === 'recuperar-senha' || clean === 'forgot-password') path = '/reset-password';
      else if (clean === 'auth/callback' || clean === 'auth-callback') path = '/auth/callback';
      else if (clean === '2fa' || clean === 'two-factor') path = '/2fa';
      else if (clean === 'studio') path = '/studio';
      else if (
        clean === 'marcas-dagua' ||
        clean === 'watermarks' ||
        clean === 'marcas' ||
        clean === 'marca-dagua'
      )
        path = '/marcas-dagua';
      else if (clean === 'historico' || clean === 'history') path = '/historico';
      else if (clean === 'settings' || clean === 'configuracoes') path = '/settings';
      else if (clean === 'admin') path = '/admin';
      else if (clean === 'terms' || clean === 'termos') path = '/terms';
      else if (clean === 'privacy' || clean === 'privacidade') path = '/privacy';
      else if (clean === 'scraper' || clean === 'varredura' || clean === '') path = '/varredura';
      else if (routePart.startsWith('/')) path = routePart;

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

      const mergedParams = new URLSearchParams(inlineQuery || '');
      if (queryParams) {
        Object.entries(queryParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) mergedParams.set(k, String(v));
        });
      }

      const queryString = mergedParams.toString();
      if (queryString) {
        path += `?${queryString}`;
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
