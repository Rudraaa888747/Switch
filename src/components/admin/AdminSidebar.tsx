import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  BarChart3,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Image,
  Megaphone,
  FileBarChart,
  Settings,
  UserCog,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface SubMenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface MenuGroup {
  group: string;
  items: {
    icon: LucideIcon;
    label: string;
    path: string;
    submenu?: SubMenuItem[];
    permission?: string;
  }[];
}

const menuGroups: MenuGroup[] = [
  { group: 'Overview', items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' }] },
  {
    group: 'Commerce',
    items: [
      { icon: Package, label: 'Products', path: '/admin/products', permission: 'manage_products' },
      { icon: ShoppingCart, label: 'Orders', path: '/admin/orders', permission: 'manage_orders' },
      { icon: Undo2, label: 'Returns', path: '/admin/returns' },
    ],
  },
  {
    group: 'Growth',
    items: [
      {
        icon: Megaphone,
        label: 'Marketing',
        path: '/admin/marketing',
        permission: 'manage_marketing',
      },
    ],
  },
  {
    group: 'People',
    items: [
      { icon: Users, label: 'Users', path: '/admin/users', permission: 'manage_users' },
      { icon: MessageSquare, label: 'Reviews', path: '/admin/reviews' },
      {
        icon: UserCog,
        label: 'Staff',
        path: '/admin/staff',
        permission: 'manage_staff',
        submenu: [
          { icon: UserCog, label: 'All Staff', path: '/admin/staff' },
          { icon: Settings, label: 'Roles', path: '/admin/staff/roles' },
        ],
      },
    ],
  },
  {
    group: 'Analytics',
    items: [
      { icon: BarChart3, label: 'Inventory', path: '/admin/inventory' },
      { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
      {
        icon: FileBarChart,
        label: 'Reports',
        path: '/admin/reports',
      },
    ],
  },
  {
    group: 'System',
    items: [
      {
        icon: Settings,
        label: 'Settings',
        path: '/admin/settings',
        permission: 'manage_settings',
      },
    ],
  },
];

interface AdminSidebarProps {
  onMobileClose?: () => void;
}

const AdminSidebar = ({ onMobileClose }: AdminSidebarProps) => {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed, adminName, adminLogout, hasPermission, unreadCount } = useAdmin();
  const isMobile = useIsMobile();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.submenu && location.pathname.startsWith(item.path.split('/').slice(0, 3).join('/'))) {
          initial[item.label] = true;
        }
      });
    });
    return initial;
  });

  const isActive = (path: string) => (path.split('/').length > 3 ? location.pathname === path : location.pathname.startsWith(path));
  const isExactActive = (path: string) => location.pathname === path;
  const toggleSubmenu = (label: string) => setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = () => {
    adminLogout();
    window.location.href = '/';
  };

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    className={`h-screen flex-col border-r border-border bg-card/96 backdrop-blur-2xl ${
        isMobile ? 'flex w-[min(88vw,23rem)] rounded-r-[2rem] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]' : 'sticky top-0 z-30 flex'
      } ${!isMobile && (sidebarCollapsed ? 'w-16' : 'w-64')} ${isMobile ? 'safe-top safe-bottom' : ''}`}
      layout
    >
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border px-4">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed || isMobile ? (
            <motion.div key="expanded-brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background shadow-[0_16px_35px_-18px_rgba(0,0,0,0.6)]">
                S
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-[0.18em]">Switch</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin Panel</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="collapsed-brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">S</div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMobile && (
          <button onClick={onMobileClose} className="touch-target rounded-full border border-border/70 bg-background/70">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <nav className="space-y-5">
          {menuGroups.map((group) => (
            <motion.div key={group.group} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.p key={group.group} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
                    {group.group}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const hasSubmenu = item.submenu && item.submenu.length > 0;
                  const isExpanded = expandedGroups[item.label];
                  const showItem = item.permission ? hasPermission(item.permission) : true;
                  if (!showItem) return null;

                  return (
                    <div key={item.path}>
                      {hasSubmenu ? (
                        <button
                          onClick={() => toggleSubmenu(item.label)}
                          className={`flex w-full items-center gap-3 rounded-[1.2rem] px-3 py-3 transition-all ${active ? 'bg-foreground/[0.08] text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <div className="relative flex-shrink-0">
                            <Icon size={19} />
                            {item.label === 'Marketing' && unreadCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" />}
                          </div>
                          <AnimatePresence mode="wait">
                            {(!sidebarCollapsed || isMobile) && (
                              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex-1 text-left text-sm font-medium">
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {(!sidebarCollapsed || isMobile) && (
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown size={14} className="text-muted-foreground/55" />
                            </motion.div>
                          )}
                        </button>
                      ) : (
                        <Link
                          to={item.path}
                          onClick={isMobile ? onMobileClose : undefined}
                          className={`flex items-center gap-3 rounded-[1.2rem] px-3 py-3 transition-all ${active ? 'bg-foreground text-background shadow-[0_18px_38px_-28px_rgba(0,0,0,0.65)]' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <Icon size={19} />
                          <AnimatePresence mode="wait">
                            {(!sidebarCollapsed || isMobile) && (
                              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-sm font-medium">
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      )}

                      <AnimatePresence>
                        {hasSubmenu && isExpanded && (!sidebarCollapsed || isMobile) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} className="overflow-hidden">
                            <div className="ml-7 mt-1 space-y-1 border-l border-border/60 pl-3">
                              {item.submenu!.map((sub) => {
                                const SubIcon = sub.icon;
                                const subActive = isExactActive(sub.path);
                                return (
                                  <Link
                                    key={sub.path}
                                    to={sub.path}
                                    onClick={isMobile ? onMobileClose : undefined}
                                    className={`flex items-center gap-2.5 rounded-[1rem] px-3 py-2 text-xs transition-all ${subActive ? 'bg-foreground/[0.08] text-foreground' : 'text-muted-foreground/78 hover:bg-muted/60 hover:text-foreground'}`}
                                  >
                                    <SubIcon size={14} />
                                    {sub.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </nav>
      </div>

      <div className="border-t border-border p-2">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div key="expanded-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-1 rounded-[1.2rem] bg-muted/40 px-3 py-3">
              <p className="truncate text-sm font-medium">{adminName || 'Admin'}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Administrator</p>
            </motion.div>
          ) : (
            <motion.div key="collapsed-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">{(adminName || 'A')[0].toUpperCase()}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 px-1">
          <button onClick={handleLogout} className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-xs text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive">
            <LogOut size={16} />
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {!isMobile && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="rounded-[1rem] p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default AdminSidebar;
