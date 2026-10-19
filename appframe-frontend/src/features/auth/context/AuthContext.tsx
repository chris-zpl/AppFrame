import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services';
import { isPublicAuthRoute, cleanupClientCacheAndPreviews } from '../utils';
import { mediaService } from '../../history/services/media.service';
import type { UserProfile, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const initialPath = window.location.pathname;
    if (initialPath.startsWith('/auth/callback') || initialPath === '/auth-callback') {
      return false;
    }
    let hasStoredSession = false;
    try {
      hasStoredSession =
        localStorage.getItem('appframe_has_session') === 'true' ||
        sessionStorage.getItem('appframe_has_session') === 'true';
    } catch {}
    if (isPublicAuthRoute(initialPath) && !hasStoredSession) {
      return false;
    }
    return true;
  });

  // 1. Deduplicação de Requisição (In-Flight Promise)
  const profileRequestPromiseRef = useRef<Promise<UserProfile | null> | null>(null);

  const refreshProfile = useCallback(async (tokenOverride?: string): Promise<UserProfile | null> => {
    // Se já existe uma requisição em andamento, retorna a Promise ativa
    if (profileRequestPromiseRef.current) {
      return profileRequestPromiseRef.current;
    }

    const requestPromise = (async () => {
      try {
        const profile = await authService.getMe(tokenOverride);
        const resolvedUser = (profile as any)?.user || (profile as any)?.data || profile;
        if (resolvedUser && resolvedUser.id) {
          setUser(resolvedUser);
          try {
            sessionStorage.setItem('appframe_has_session', 'true');
            if (localStorage.getItem('appframe_remember_me') === 'true') {
              localStorage.setItem('appframe_has_session', 'true');
            }
          } catch {}
          return resolvedUser as UserProfile;
        } else {
          setUser(null);
          try {
            localStorage.removeItem('appframe_has_session');
            localStorage.removeItem('appframe_remember_me');
            sessionStorage.removeItem('appframe_has_session');
          } catch {}
          return null;
        }
      } catch {
        setUser(null);
        try {
          localStorage.removeItem('appframe_has_session');
          localStorage.removeItem('appframe_remember_me');
          sessionStorage.removeItem('appframe_has_session');
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
      // 1. Tenta limpar previews temporários no backend antes de revogar a sessão
      let previewIdsOrUrls: string[] = [];
      try {
        const rawQueue = sessionStorage.getItem('appframe_studio_queue');
        if (rawQueue) {
          const queue = JSON.parse(rawQueue);
          if (Array.isArray(queue)) {
            previewIdsOrUrls = queue
              .map((item: any) => item?.url || item?.id)
              .filter(Boolean);
          }
        }
      } catch {}

      try {
        await mediaService.clearPreviews(
          previewIdsOrUrls.length > 0 ? previewIdsOrUrls : undefined,
        );
      } catch {
        // Ignora falhas de rede na limpeza de previews
      }

      // 2. Revoga a sessão no backend
      await authService.logout();
    } catch {
      // Ignora falhas de rede no logout
    } finally {
      cleanupClientCacheAndPreviews();
      setUser(null);
      setIsLoading(false);
      window.location.replace('/login');
    }
  }, []);

  // 2. Desvincular checagem de autenticação da navegação: roda exclusivamente na montagem
  useEffect(() => {
    const initialPath = window.location.pathname;

    // Se estiver na rota de callback do OAuth, NÃO dispara initAuth,
    // pois a AuthCallbackPage processa o token recebido de forma dedicada
    if (initialPath.startsWith('/auth/callback') || initialPath === '/auth-callback') {
      return;
    }

    let hasStoredSession = false;
    try {
      hasStoredSession =
        localStorage.getItem('appframe_has_session') === 'true' ||
        sessionStorage.getItem('appframe_has_session') === 'true';
    } catch {}

    // Se estiver explicitamente em rota pública e NÃO tiver sessão ativa salva,
    // NÃO dispara chamada de rede para evitar 401 indevido
    if (isPublicAuthRoute(initialPath) && !hasStoredSession) {
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
      cleanupClientCacheAndPreviews();
      setUser(null);
      setIsLoading(false);
      window.location.replace('/login');
    };

    window.addEventListener('appframe-auth-logout', handleAuthLogout);
    return () => window.removeEventListener('appframe-auth-logout', handleAuthLogout);
  }, []);

  // 3. Sincronização no método de login:
  // Aguarda confirmação das credenciais e atualiza o estado de 'user' em memória ANTES de liberar o fluxo
  const login = useCallback(
    async (
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
    },
    [refreshProfile],
  );

  const register = useCallback(
    async (
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
    },
    [],
  );

  const verify2fa = useCallback(
    async (
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
    },
    [refreshProfile],
  );

  const handleOAuthCallback = useCallback(
    async (accessToken?: string, _refreshToken?: string) => {
      setIsLoading(true);
      try {
        try {
          localStorage.setItem('appframe_has_session', 'true');
          sessionStorage.setItem('appframe_has_session', 'true');
        } catch {}
        const profile = await refreshProfile(accessToken);
        if (profile && profile.id) {
          setUser(profile);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [refreshProfile],
  );

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
