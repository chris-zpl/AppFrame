import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService, type UserProfile } from '../services/auth.service';

export const isPublicAuthRoute = (path?: string): boolean => {
  if (!path) return false;
  const clean = path.toLowerCase().replace(/\/+$/, '') || '/';
  return (
    clean === '/login' ||
    clean === '/register' ||
    clean.startsWith('/auth/callback') ||
    clean === '/auth-callback' ||
    clean === '/2fa' ||
    clean === '/recuperar-senha' ||
    clean === '/forgot-password' ||
    clean === '/reset-password'
  );
};

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2fa?: boolean; tempToken?: string; user?: UserProfile }>;
  register: (name: string, email: string, password: string) => Promise<{ user?: UserProfile }>;
  verify2fa: (tempToken: string, token: string) => Promise<{ user?: UserProfile }>;
  handleOAuthCallback: (accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Deduplicação de Requisição (In-Flight Promise)
  const profileRequestPromiseRef = useRef<Promise<UserProfile | null> | null>(null);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    // Se já existe uma requisição em andamento, retorna a Promise ativa
    if (profileRequestPromiseRef.current) {
      return profileRequestPromiseRef.current;
    }

    const requestPromise = (async () => {
      try {
        const profile = await authService.getMe();
        const resolvedUser = (profile as any)?.user || (profile as any)?.data || profile;
        if (resolvedUser && resolvedUser.id) {
          setUser(resolvedUser);
          try {
            localStorage.setItem('appframe_has_session', 'true');
          } catch {}
          return resolvedUser as UserProfile;
        } else {
          setUser(null);
          try {
            localStorage.removeItem('appframe_has_session');
          } catch {}
          return null;
        }
      } catch {
        setUser(null);
        try {
          localStorage.removeItem('appframe_has_session');
        } catch {}
        return null;
      } finally {
        profileRequestPromiseRef.current = null;
      }
    })();

    profileRequestPromiseRef.current = requestPromise;
    return requestPromise;
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch {
      // Ignora falhas de rede no logout
    } finally {
      try {
        localStorage.removeItem('appframe_has_session');
        sessionStorage.removeItem('appframe_last_active_route');
      } catch {}
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // 2. Desvincular checagem de autenticação da navegação: roda exclusivamente na montagem
  useEffect(() => {
    const initialPath = window.location.pathname;
    let hasStoredSession = false;
    try {
      hasStoredSession = localStorage.getItem('appframe_has_session') === 'true';
    } catch {}

    // Se estiver explicitamente em rota pública e NÃO tiver sessão ativa salva,
    // NÃO dispara chamada de rede para evitar 401 indevido
    if (isPublicAuthRoute(initialPath) && !hasStoredSession) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        await refreshProfile();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshProfile]);

  useEffect(() => {
    const handleAuthLogout = () => {
      try {
        localStorage.removeItem('appframe_has_session');
        sessionStorage.removeItem('appframe_last_active_route');
      } catch {}
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener('appframe-auth-logout', handleAuthLogout);
    return () => window.removeEventListener('appframe-auth-logout', handleAuthLogout);
  }, []);

  // 3. Sincronização no método de login:
  // Aguarda confirmação das credenciais e atualiza o estado de 'user' em memória ANTES de liberar o fluxo
  const login = async (
    email: string,
    password: string,
  ): Promise<{ requires2fa?: boolean; tempToken?: string; user?: UserProfile }> => {
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password });
      if (data.requires2fa || data.require_2fa) {
        setIsLoading(false);
        return { requires2fa: true, tempToken: data.tempToken || data.temp_token };
      }

      let resolvedUser = data.user || (data as any)?.data?.user;
      if (!resolvedUser || !resolvedUser.id) {
        resolvedUser = await refreshProfile();
      } else {
        setUser(resolvedUser);
      }

      if (resolvedUser && resolvedUser.id) {
        try {
          localStorage.setItem('appframe_has_session', 'true');
        } catch {}
      }

      setIsLoading(false);
      return { requires2fa: false, user: resolvedUser || undefined };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ user?: UserProfile }> => {
    setIsLoading(true);
    try {
      const data = await authService.register({ name, email, password });
      setIsLoading(false);
      return { user: data.user || (data as any)?.data?.user || undefined };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const verify2fa = async (
    tempToken: string,
    token: string,
  ): Promise<{ user?: UserProfile }> => {
    setIsLoading(true);
    try {
      const data = await authService.verify2fa({ tempToken, token });
      let resolvedUser = data.user || (data as any)?.data?.user;
      if (!resolvedUser || !resolvedUser.id) {
        resolvedUser = await refreshProfile();
      } else {
        setUser(resolvedUser);
      }

      if (resolvedUser && resolvedUser.id) {
        try {
          localStorage.setItem('appframe_has_session', 'true');
        } catch {}
      }

      setIsLoading(false);
      return { user: resolvedUser || undefined };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const handleOAuthCallback = async () => {
    setIsLoading(true);
    try {
      const profile = await refreshProfile();
      if (profile && profile.id) {
        try {
          localStorage.setItem('appframe_has_session', 'true');
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verify2fa,
        handleOAuthCallback,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
