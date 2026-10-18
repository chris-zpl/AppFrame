import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { useNavigation } from '../../../contexts/NavigationContext';
import { getAuthRedirectTarget } from '../utils/auth.helpers';

/**
 * Guard hook para páginas públicas (Login, Registro) que impede acesso de usuários já autenticados,
 * redirecionando-os de forma inteligente para a última rota acessada ou para o dashboard (/varredura).
 */
export const useGuestGuard = () => {
  const { isAuthenticated, user } = useAuth();
  const { navigate } = useNavigation();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const fromPath = (location.state as any)?.from?.pathname;
      const fromSearch = (location.state as any)?.from?.search || '';
      const fromUrl = fromPath ? `${fromPath}${fromSearch}` : null;

      const target = getAuthRedirectTarget(user, fromUrl);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate, user]);
};
