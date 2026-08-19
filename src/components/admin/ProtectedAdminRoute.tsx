import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

/**
 * Route-level guard for all /admin/* pages.
 * Redirects to /admin/login if the user is not authenticated.
 * This is the single enforcement point — individual pages do NOT need
 * to duplicate this check.
 */
const ProtectedAdminRoute = () => {
  const { user, isLoading } = useAuth();

  // While checking session, show skeleton to prevent flash
  if (isLoading) return <PageSkeleton />;

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
