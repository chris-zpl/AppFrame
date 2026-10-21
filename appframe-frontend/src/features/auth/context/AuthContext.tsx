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
    let isRemembered = false;
    let hasTabSession = false;
    try {
      isRemembered = localStorage.getItem('appframe_remember_me') === 'true';
      hasTabSession = sessionStorage.getItem('appframe_has_session') === 'true';
    } catch {}
    if (isPublicAuthRoute(initialPath) && !isRemembered && !hasTabSession) {
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
            } else {
              localStorage.removeItem('appframe_has_session');
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
      try {
        localStorage.removeItem('appframe_has_session');
        localStorage.removeItem('appframe_remember_me');
        sessionStorage.removeItem('appframe_has_session');
      } catch {}
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('appframe_session_sync');
          channel.postMessage({ type: 'SESSION_LOGOUT' });
          channel.close();
        }
      } catch {}
      cleanupClientCacheAndPreviews();
      setUser(null);
      setIsLoading(false);
      window.location.replace('/login');
    }
  }, []);

  // 2. Sincronização entre abas: escuta pedidos de verificação de sessão e eventos de logout
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('appframe_session_sync');
      channel.onmessage = (event) => {
        if (!event?.data) return;
        if (event.data.type === 'SESSION_PROBE') {
          // Se esta aba possui sessão ativa no sessionStorage ou rememberMe no localStorage,
          // notifica a nova aba de que a sessão do navegador continua ativa
          const hasSession =
            sessionStorage.getItem('appframe_has_session') === 'true' ||
            localStorage.getItem('appframe_remember_me') === 'true';
          if (hasSession && channel) {
            channel.postMessage({ type: 'SESSION_ACTIVE' });
          }
        } else if (event.data.type === 'SESSION_LOGOUT') {
          try {
            localStorage.removeItem('appframe_has_session');
            localStorage.removeItem('appframe_remember_me');
            sessionStorage.removeItem('appframe_has_session');
          } catch {}
          cleanupClientCacheAndPreviews();
          setUser(null);
          setIsLoading(false);
          window.location.replace('/login');
        }
      };
    } catch {}

    return () => {
      try {
        channel?.close();
      } catch {}
    };
  }, []);

  // 3. Desvincular checagem de autenticação da navegação: roda exclusivamente na montagem
  useEffect(() => {
    const initialPath = window.location.pathname;

    // Se estiver na rota de callback do OAuth, NÃO dispara initAuth,
    // pois a AuthCallbackPage processa o token recebido de forma dedicada
    if (initialPath.startsWith('/auth/callback') || initialPath === '/auth-callback') {
      return;
    }

    let isSubscribed = true;

    const initAuth = async () => {
      try {
        let isRemembered = false;
        let hasTabSession = false;
        try {
          isRemembered = localStorage.getItem('appframe_remember_me') === 'true';
          hasTabSession = sessionStorage.getItem('appframe_has_session') === 'true';
        } catch {}

        // Se estiver em rota pública e não houver nenhuma indicação de sessão nesta aba nem no localStorage,
        // não precisa chamar o backend para carregar perfil
        if (isPublicAuthRoute(initialPath) && !isRemembered && !hasTabSession) {
          if (isSubscribed) {
            setIsLoading(false);
          }
          return;
        }

        // Se não está lembrado e esta aba não possui sessão no sessionStorage,
        // sonda outras abas abertas pelo BroadcastChannel antes de decidir se o navegador/sessão foi fechado
        if (!isRemembered && !hasTabSession) {
          let channel: BroadcastChannel | null = null;
          try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              channel = new BroadcastChannel('appframe_session_sync');
            }
          } catch {}

          if (channel) {
            const probePromise = new Promise<boolean>((resolve) => {
              let responded = false;
              const handleMessage = (evt: MessageEvent) => {
                if (evt?.data?.type === 'SESSION_ACTIVE') {
                  responded = true;
                  resolve(true);
                }
              };
              channel?.addEventListener('message', handleMessage);
              try {
                channel?.postMessage({ type: 'SESSION_PROBE' });
              } catch {}

              setTimeout(() => {
                try {
                  channel?.removeEventListener('message', handleMessage);
                } catch {}
                if (!responded) resolve(false);
              }, 60);
            });

            const anotherTabActive = await probePromise;
            try {
              channel.close();
            } catch {}

            if (anotherTabActive) {
              hasTabSession = true;
              try {
                sessionStorage.setItem('appframe_has_session', 'true');
              } catch {}
            }
          }
        }

        const hasValidSessionIndicator = isRemembered || hasTabSession;

        // Se NÃO há nenhuma sessão ativa (nem rememberMe, nem aba ativa),
        // significa que o navegador ou todas as abas da aplicação foram fechadas.
        if (!hasValidSessionIndicator) {
          try {
            await authService.logout();
          } catch {}
          try {
            localStorage.removeItem('appframe_has_session');
            localStorage.removeItem('appframe_remember_me');
            sessionStorage.removeItem('appframe_has_session');
          } catch {}
          if (isSubscribed) {
            cleanupClientCacheAndPreviews();
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Sessão válida detectada: valida o perfil e tokens com o backend
        const profile = await refreshProfile();
        if (!profile && isSubscribed) {
          setUser(null);
        }
      } catch {
        if (isSubscribed) {
          setUser(null);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isSubscribed = false;
    };
  }, [refreshProfile]);

  useEffect(() => {
    const handleAuthLogout = () => {
      try {
        localStorage.removeItem('appframe_has_session');
        localStorage.removeItem('appframe_remember_me');
        sessionStorage.removeItem('appframe_has_session');
      } catch {}
      cleanupClientCacheAndPreviews();
      setUser(null);
      setIsLoading(false);
      window.location.replace('/login');
    };

    window.addEventListener('appframe-auth-logout', handleAuthLogout);
    return () => window.removeEventListener('appframe-auth-logout', handleAuthLogout);
  }, []);

  // 4. Sincronização no método de login:
  // Aguarda confirmação das credenciais e atualiza o estado de 'user' em memória ANTES de liberar o fluxo
  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean = false,
    ): Promise<{ requires2fa?: boolean; tempToken?: string; user?: UserProfile }> => {
      setIsLoading(true);
      try {
        const data = await authService.login({ email, password, rememberMe });
        if (data.requires2fa || data.require_2fa) {
          setIsLoading(false);
          return { requires2fa: true, tempToken: data.tempToken || data.temp_token };
        }

        try {
          if (rememberMe) {
            localStorage.setItem('appframe_remember_me', 'true');
            localStorage.setItem('appframe_has_session', 'true');
          } else {
            localStorage.removeItem('appframe_remember_me');
            localStorage.removeItem('appframe_has_session');
          }
          sessionStorage.setItem('appframe_has_session', 'true');
        } catch {}

        let resolvedUser = data.user || (data as any)?.data?.user;
        if (!resolvedUser || !resolvedUser.id) {
          resolvedUser = await refreshProfile();
        } else {
          setUser(resolvedUser);
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
      rememberMe?: boolean,
    ): Promise<{ user?: UserProfile }> => {
      setIsLoading(true);
      try {
        const data = await authService.verify2fa({ tempToken, token });
        const shouldRemember =
          typeof rememberMe === 'boolean'
            ? rememberMe
            : localStorage.getItem('appframe_remember_me') === 'true';

        try {
          if (shouldRemember) {
            localStorage.setItem('appframe_remember_me', 'true');
            localStorage.setItem('appframe_has_session', 'true');
          } else {
            localStorage.removeItem('appframe_remember_me');
            localStorage.removeItem('appframe_has_session');
          }
          sessionStorage.setItem('appframe_has_session', 'true');
        } catch {}

        let resolvedUser = data.user || (data as any)?.data?.user;
        if (!resolvedUser || !resolvedUser.id) {
          resolvedUser = await refreshProfile();
        } else {
          setUser(resolvedUser);
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
    async (accessToken?: string, _refreshToken?: string, rememberMe: boolean = false) => {
      setIsLoading(true);
      try {
        try {
          if (rememberMe) {
            localStorage.setItem('appframe_remember_me', 'true');
            localStorage.setItem('appframe_has_session', 'true');
          } else {
            localStorage.removeItem('appframe_remember_me');
            localStorage.removeItem('appframe_has_session');
          }
          sessionStorage.setItem('appframe_has_session', 'true');
        } catch {}
        const profile = await refreshProfile(accessToken);
        if (profile && profile.id) {
          setUser(profile);
        } else {
          throw new Error('Falha ao autenticar sessão com o Google. Tente novamente.');
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
