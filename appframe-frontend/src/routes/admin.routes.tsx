import { Route } from 'react-router-dom';
import { AdminRoute } from './guards';
import { AdminPage } from '../pages';

export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <AdminRoute>
        <AdminPage />
      </AdminRoute>
    }
  />
);
