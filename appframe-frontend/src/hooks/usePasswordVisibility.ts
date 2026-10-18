import { useState, useCallback } from 'react';

/**
 * Hook reutilizável para controle de visibilidade de campos de senha.
 */
export const usePasswordVisibility = (initialState: boolean = false) => {
  const [isVisible, setIsVisible] = useState(initialState);
  const toggle = useCallback(() => setIsVisible((v) => !v), []);
  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);

  return { isVisible, toggle, show, hide, setIsVisible };
};
