import { Navigate, Outlet } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

/**
 * Route-level guard for all /admin/* pages.
 * Redirects to /admin/login if the user is not authenticated as admin.
 * This is the single enforcement point — individual pages do NOT need
 * to duplicate this check.
 */
const ProtectedAdminRoute = () => {
  const { isAdminAuthenticated, isLoading } = useAdmin();

  // While checking session, show skeleton to prevent flash
  if (isLoading) return <PageSkeleton />;

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
