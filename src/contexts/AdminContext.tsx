import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotificationRecord,
} from '@/lib/adminNotifications';

export interface AdminPermission {
  id: string;
  label: string;
  granted: boolean;
}

export interface AdminStaff {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'editor' | 'support';
  avatar?: string;
  lastActive?: string;
  permissions: AdminPermission[];
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  timestamp: string;
  link?: string;
  eventType?: AdminNotificationRecord['event_type'];
}

interface AdminContextType {
  isAdminAuthenticated: boolean;
  adminName: string | null;
  adminRole: 'super_admin' | 'manager' | 'editor' | 'support';
  adminAvatar: string | null;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notifications: AdminNotification[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  unreadCount: number;
  staffMembers: AdminStaff[];
  addStaffMember: (staff: Omit<AdminStaff, 'id'>) => void;
  removeStaffMember: (id: string) => void;
  updateStaffMember: (id: string, data: Partial<AdminStaff>) => void;
  hasPermission: (permissionId: string) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const generateId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const STAFF_STORAGE_KEY = 'switch_admin_staff';

const loadStaffFromStorage = (): AdminStaff[] => {
  try {
    const stored = localStorage.getItem(STAFF_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_STAFF;
};

const DEFAULT_STAFF: AdminStaff[] = [
  {
    id: 'staff-1',
    name: 'Demo Admin',
    email: 'admin@switch.com',
    role: 'super_admin',
    lastActive: new Date().toISOString(),
    permissions: [
      { id: 'manage_products', label: 'Manage Products', granted: true },
      { id: 'manage_orders', label: 'Manage Orders', granted: true },
      { id: 'manage_users', label: 'Manage Users', granted: true },
      { id: 'manage_staff', label: 'Manage Staff', granted: true },
      { id: 'view_reports', label: 'View Reports', granted: true },
      { id: 'manage_settings', label: 'Manage Settings', granted: true },
      { id: 'manage_marketing', label: 'Manage Marketing', granted: true },
    ],
  },
];

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'manager' | 'editor' | 'support'>('super_admin');
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [staffMembers, setStaffMembers] = useState<AdminStaff[]>(loadStaffFromStorage);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    const initializeAdminAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single();

          if (adminError || !adminData) {
            setIsAdminAuthenticated(false);
            setAdminName(null);
            setAdminRole('support');
            setAdminAvatar(null);
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', session.user.id)
              .maybeSingle();

            setIsAdminAuthenticated(true);
            setAdminName(profile?.display_name || session.user.email?.split('@')[0] || 'Admin');
            setAdminRole(adminData.role as 'super_admin' | 'manager' | 'editor' | 'support');
            setAdminAvatar(profile?.avatar_url || null);
          }
        } else {
          setIsAdminAuthenticated(false);
        }
      } catch (error) {
        console.error('Error verifying admin session:', error);
        setIsAdminAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAdminAuth();
  }, []);

  // Only load notifications and subscribe to realtime AFTER admin is authenticated.
  // This prevents unnecessary DB queries and WebSocket connections for regular visitors.
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const mapNotification = (item: AdminNotificationRecord): AdminNotification => ({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      read: item.read,
      timestamp: item.created_at,
      link: item.link || undefined,
      eventType: item.event_type,
    });

    const loadNotifications = async () => {
      try {
        const rows = await fetchAdminNotifications();
        setNotifications(rows.map(mapNotification));
      } catch {
        setNotifications([]);
      }
    };

    loadNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdminAuthenticated]);

  const adminLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!username.trim() || !password.trim()) {
      return { success: false, error: 'Please enter both username and password' };
    }

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password,
      });

      if (authError || !authData.user) {
        return { success: false, error: 'Invalid credentials or access denied' };
      }

      // 2. Fetch admin role from admin_users table securely
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        // If not an admin, sign out immediately
        await supabase.auth.signOut();
        return { success: false, error: 'Unauthorized: Admin access required' };
      }

      const role = adminData.role || 'support';
      
      // Get profile name if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', authData.user.id)
        .single();

      const name = profile?.display_name || authData.user.email?.split('@')[0] || 'Admin';

      setIsAdminAuthenticated(true);
      setAdminName(name);
      setAdminRole(role as 'super_admin' | 'manager' | 'editor' | 'support');
      setAdminAvatar(profile?.avatar_url || null);
      
      sessionStorage.setItem('admin_session', JSON.stringify({
        authenticated: true,
        name,
        role,
        avatar: profile?.avatar_url || null,
        timestamp: Date.now(),
      }));
      
      return { success: true };
    } catch {
      return { success: false, error: 'Connection error. Please try again.' };
    }


  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
    setAdminName(null);
    setAdminRole('support'); // Reset to lowest privilege — not 'super_admin'
    setAdminAvatar(null);
    setNotifications([]);
    sessionStorage.removeItem('admin_session');
  };

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    markAdminNotificationRead(id).catch(() => {});
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllAdminNotificationsRead().catch(() => {});
  }, []);

  const addStaffMember = useCallback((staff: Omit<AdminStaff, 'id'>) => {
    const newStaff: AdminStaff = { ...staff, id: generateId() };
    setStaffMembers(prev => [...prev, newStaff]);
  }, []);

  const removeStaffMember = useCallback((id: string) => {
    setStaffMembers(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateStaffMember = useCallback((id: string, data: Partial<AdminStaff>) => {
    setStaffMembers(prev =>
      prev.map(s => (s.id === id ? { ...s, ...data } : s))
    );
  }, []);

  const hasPermission = useCallback((permissionId: string): boolean => {
    // super_admin always has all permissions
    if (adminRole === 'super_admin') return true;
    // For other roles, check their staff record by matching via userId in the future.
    // For now, find by name (cosmetic — real enforcement is server-side via admin_users table).
    const currentStaff = staffMembers.find(s => s.name === adminName);
    // If no matching staff record, DENY by default (fail-closed)
    if (!currentStaff) return false;
    const permission = currentStaff.permissions.find(p => p.id === permissionId);
    return permission?.granted ?? false;
  }, [staffMembers, adminName, adminRole]);

  return (
    <AdminContext.Provider
      value={{
        isAdminAuthenticated,
        adminName,
        adminRole,
        adminAvatar,
        adminLogin,
        adminLogout,
        isLoading,
        sidebarCollapsed,
        setSidebarCollapsed,
        notifications,
        markNotificationRead,
        clearNotifications,
        unreadCount,
        staffMembers,
        addStaffMember,
        removeStaffMember,
        updateStaffMember,
        hasPermission,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
