import { ReactNode, useEffect, useMemo, useState, useRef, useCallback, Fragment } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from './AdminSidebar';
import AdminMobileNav from './AdminMobileNav';
import { useAdmin } from '@/contexts/AdminContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  Search,
  CheckCheck,
  CalendarDays,
  ArrowRight,
  Package,
  ShoppingCart,
  Undo2,
  Users,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Megaphone,
  FileBarChart,
  Settings,
  UserCog,
  LayoutDashboard,
  Menu,
  type LucideIcon,
  CircleDot,
} from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AdminLayoutProps {
  children: ReactNode;
}

const pathToLabel: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  orders: 'Orders',
  returns: 'Returns',
  users: 'Users',
  reviews: 'Reviews',
  inventory: 'Inventory',
  analytics: 'Analytics',
  marketing: 'Marketing',
  reports: 'Reports',
  settings: 'Settings',
  staff: 'Staff',
  banners: 'Banners',
  pages: 'Pages',
  promotions: 'Promotions',
  campaigns: 'Campaigns',
  coupons: 'Coupons',
  newsletter: 'Newsletter',
  sales: 'Sales',
  customers: 'Customers',
  general: 'General',
  payment: 'Payment',
  shipping: 'Shipping',
  roles: 'Roles',
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdminAuthenticated, isLoading, notifications, markNotificationRead, clearNotifications, unreadCount, adminName } = useAdmin();
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    console.log('[NOTIF FLOW] 3. State updated to:', showNotifications);
  }, [showNotifications]);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; path: string; isLast: boolean }[] = [];
    let accPath = '';
    segments.forEach((segment, index) => {
      accPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      const label = pathToLabel[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      crumbs.push({ label, path: accPath, isLast });
    });
    return crumbs;
  }, [location.pathname]);

  const pageTitle = useMemo(() => breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard', [breadcrumbs]);

  useEffect(() => {
    // if (!isLoading && !isAdminAuthenticated) navigate('/admin/login');
  }, [isAdminAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        console.log('[NOTIF FLOW] 5. Click outside detected, closing panel! Target:', (event.target as HTMLElement).tagName);
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSearch) {
      const timeout = window.setTimeout(() => searchRef.current?.focus(), 80);
      return () => window.clearTimeout(timeout);
    }
  }, [showSearch]);

  useEffect(() => {
    setShowMobileSidebar(false);
    setShowNotifications(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (showMobileSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileSidebar]);

  const closeMobileSidebar = useCallback(() => setShowMobileSidebar(false), []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // if (!isAdminAuthenticated) return null;

  const searchItems: { icon: LucideIcon; label: string; path: string }[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Package, label: 'Products', path: '/admin/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
    { icon: Undo2, label: 'Returns', path: '/admin/returns' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: MessageSquare, label: 'Reviews', path: '/admin/reviews' },
    { icon: BarChart3, label: 'Inventory', path: '/admin/inventory' },
    { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
    { icon: Megaphone, label: 'Marketing', path: '/admin/marketing' },
    { icon: FileBarChart, label: 'Reports', path: '/admin/reports' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
    { icon: UserCog, label: 'Staff', path: '/admin/staff' },
  ];

  const filteredSearch = searchItems.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const getNotifDotClass = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-500';
      case 'success':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-foreground';
    }
  };

  const getNotificationIcon = (eventType?: string) => {
    switch (eventType) {
      case 'new_order':
      case 'order_dispatched':
        return ShoppingCart;
      case 'return_request':
      case 'refund':
        return Undo2;
      case 'product_added':
      case 'inventory_low':
        return Package;
      case 'review_added':
        return MessageSquare;
      case 'coupon_created':
      case 'campaign_launched':
        return Megaphone;
      default:
        return CircleDot;
    }
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      {/* Mobile Sidebar Drawer — uses CSS transform for smooth 60fps slide */}
      {isMobile && (
        <>
          <div
            className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${showMobileSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closeMobileSidebar}
            aria-label="Close sidebar overlay"
          />
          <div
            className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-300 ease-out ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ willChange: 'transform' }}
          >
            <AdminSidebar onMobileClose={closeMobileSidebar} />
          </div>
        </>
      )}

      {!isMobile && <AdminSidebar />}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header — optimized for phones */}
        <header className={`safe-top sticky top-0 z-20 border-b border-border/60 ${isMobile ? 'bg-background' : 'bg-background/86 backdrop-blur-2xl'}`}>
          <div className={`flex items-center justify-between gap-3 ${isMobile ? 'h-14 px-4' : 'min-h-[4.5rem] px-3 md:h-16 md:px-6'}`}>
            <div className="flex min-w-0 items-center gap-2 md:gap-4">
              <button onClick={() => setShowMobileSidebar(true)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-foreground md:hidden" aria-label="Open menu">
                <Menu size={18} />
              </button>

              <div className="hidden sm:block">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <Fragment key={crumb.path}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {crumb.isLast ? (
                            <BreadcrumbPage className="text-sm font-medium">{crumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={crumb.path} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                                {crumb.label}
                              </Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Mobile page title — compact */}
              <div className="sm:hidden">
                <h1 className="truncate text-base font-semibold">{pageTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <ThemeToggle className={isMobile ? 'h-9 w-9 bg-muted/60 rounded-xl' : ''} />

              <button onClick={() => setShowSearch(true)} className={`relative flex items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground touch-target after:absolute after:-inset-3 ${isMobile ? 'h-9 w-9 bg-muted/60' : 'rounded-full border border-border/70 bg-background/70'}`} title="Search pages">
                <Search size={17} />
              </button>

              <div className="relative" ref={notifRef}>
                <button onClick={() => {
                  console.log('[NOTIF FLOW] 1. Button clicked');
                  setShowNotifications((value) => {
                    console.log('[NOTIF FLOW] 2. State updater called. Prev:', value, 'New:', !value);
                    return !value;
                  });
                }} className={`relative flex items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground touch-target after:absolute after:-inset-3 ${isMobile ? 'h-9 w-9 bg-muted/60' : 'rounded-full border border-border/70 bg-background/70'}`} title="Notifications">
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ${isMobile ? 'right-0 top-0' : 'right-1 top-1'}`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      onAnimationStart={() => console.log('[NOTIF FLOW] 4. Component mounting / animation started')}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 8, scale: 0.96 }} 
                      transition={{ duration: 0.16 }} 
                      className={`spotlight-panel absolute top-full mt-2 overflow-hidden ${isMobile ? 'fixed left-3 right-3 top-14 mt-0 w-auto bg-card border border-border rounded-2xl shadow-xl' : 'right-0 w-[min(88vw,22rem)]'}`}
                    >
                      <div className="flex items-center justify-between border-b border-border px-4 py-4">
                        <h3 className="text-sm font-semibold">Notifications</h3>
                        <button onClick={clearNotifications} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                          <CheckCheck size={14} />
                          Mark all read
                        </button>
                      </div>
                      <div className="custom-scrollbar max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => {
                                markNotificationRead(notification.id);
                                if (notification.link) {
                                  navigate(notification.link);
                                  setShowNotifications(false);
                                }
                              }}
                              className={`w-full border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/45 ${!notification.read ? 'bg-foreground/[0.04]' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${getNotifDotClass(notification.type)}`} />
                                <div className="min-w-0 flex-1">
                                  {(() => {
                                    const EventIcon = getNotificationIcon(notification.eventType);
                                    return (
                                      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                                        <EventIcon size={11} />
                                        {notification.eventType ? notification.eventType.replaceAll('_', ' ') : 'update'}
                                      </div>
                                    );
                                  })()}
                                  <p className={`text-sm ${!notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{notification.title}</p>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/75">{notification.message}</p>
                                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/55">
                                    <CalendarDays size={10} />
                                    {new Date(notification.timestamp).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                                {notification.link && <ArrowRight size={14} className="mt-1 flex-shrink-0 text-muted-foreground/35" />}
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="py-8 text-center text-sm text-muted-foreground/60">No notifications</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop avatar pill — hidden on mobile for cleaner header */}
              <div className="hidden md:flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(adminName || 'A')[0].toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-[calc(var(--mobile-content-bottom)+0.75rem)] md:pb-0">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-[80] flex items-start justify-center ${isMobile ? 'bg-black/50 px-3 pt-4' : 'bg-black/46 backdrop-blur-md px-4 pt-[max(10vh,4rem)]'}`} onClick={() => setShowSearch(false)}>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }} transition={{ duration: 0.2 }} className={`w-full overflow-hidden ${isMobile ? 'rounded-2xl bg-card border border-border' : 'spotlight-panel max-w-2xl'}`} onClick={(event) => event.stopPropagation()}>
              <div className={`${searchQuery.trim().length > 0 ? 'border-b border-border' : ''} px-4 py-3 md:py-4`}>
                <div className={`flex items-center gap-3 ${isMobile ? 'rounded-xl bg-muted/60 px-3 py-2.5' : 'rounded-2xl border border-border/70 bg-background/70 px-4 py-3'}`}>
                  <Search size={18} className="text-muted-foreground flex-shrink-0" />
                  <input ref={searchRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search pages..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                </div>
              </div>
              
              {searchQuery.trim().length > 0 && (
                <div className="custom-scrollbar max-h-[60vh] overflow-y-auto p-2">
                  {filteredSearch.length > 0 ? (
                    filteredSearch.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.path} to={item.path} onClick={() => { setShowSearch(false); setSearchQuery(''); }} className={`flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground ${isMobile ? 'rounded-xl' : 'rounded-2xl'}`}>
                          <Icon size={16} />
                          <span className="flex-1">{item.label}</span>
                          <ArrowRight size={14} className="text-muted-foreground/35" />
                        </Link>
                      );
                    })
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground/60">No pages found</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminMobileNav />
    </div>
  );
};

export default AdminLayout;
