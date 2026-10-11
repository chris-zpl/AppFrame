import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Determina e normaliza a URL base da API
const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
  const clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) return clean;
  if (clean.endsWith('/api')) return `${clean}/v1`;
  return `${clean}/api/v1`;
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// Fila para requisições concorrentes durante rotação de token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(true);
    }
  });
  failedQueue = [];
};

// Interceptador de Requisição: Garante envio de cookies com credenciais
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptador de Resposta: Desempacota payload padrão e trata 401 via cookie refresh
api.interceptors.response.use(
  (response) => {
    // Unwrap de resposta da API se estiver no formato padrão { success: true, data: ... }
    if (
      response.data &&
      typeof response.data === 'object' &&
      response.data.success === true &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const requestUrl = originalRequest?.url || '';

    // Endpoints de autenticação pública / checagem inicial de sessão
    const isAuthEndpoint =
      requestUrl.includes('/auth/me') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    // Erros gerais de servidor/rede (500+ ou erro de conexão): dispara notificação Sonner,
    // garantindo que endpoints de autenticação NUNCA emitam notificações globais de erro
    if (
      !isAuthEndpoint &&
      ((!error.response && error.code === 'ERR_NETWORK') ||
        (error.response && error.response.status >= 500))
    ) {
      toast.error('Ocorreu um erro no servidor. Tente novamente.');
    }

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Se o status for 401 e a URL for /auth/me, /auth/login ou /auth/register,
    // NÃO tenta disparar a rotação de refresh token (/auth/refresh)
    if (
      isAuthEndpoint ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout') ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Chama o endpoint de renovação via cookies seguros
      await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      window.dispatchEvent(new Event('appframe-auth-logout'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
