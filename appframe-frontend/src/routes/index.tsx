import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { protectedRoutes } from './protected.routes';
import { adminRoutes } from './admin.routes';
import { publicRoutes } from './public.routes';

export * from './guards';
export * from './protected.routes';
export * from './admin.routes';
export * from './public.routes';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Protegidas do App */}
      {protectedRoutes}

      {/* Rotas Administrativas */}
      {adminRoutes}

      {/* Rotas Públicas e de Autenticação */}
      {publicRoutes}

      {/* Fallback para rotas desconhecidas */}
      <Route path="*" element={<Navigate to="/varredura" replace />} />
    </Routes>
  );
};

export default AppRoutes;
