import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

/**
 * Route-level guard for all /admin/* pages.
 * Redirects to /admin/login if the user is not a real admin.
 * This is the single enforcement point — individual pages do NOT need
 * to duplicate this check.
 */
const ProtectedAdminRoute = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isAdminAuthenticated, isLoading: isAdminLoading } = useAdmin();

  const isLoading = isAuthLoading || isAdminLoading;

  if (isLoading) return <PageSkeleton />;

  if (!user || !isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
