/**
 * Centralizador de URLs e endpoints da API do AppFrame
 */
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';
