import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { motion } from 'framer-motion';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/admin/dashboard' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
];

const AdminMobileNav = () => {
  const location = useLocation();
  const { adminLogout, unreadCount } = useAdmin();
  const { hidden, isReducedMotion } = useHideOnScroll();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    adminLogout();
    window.location.href = '/';
  };

  return (
    <motion.nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden gpu-layer mobile-dock-hide-on-menu" 
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: '150%', opacity: 0 }
      }}
      initial="visible"
      animate={hidden ? 'hidden' : 'visible'}
      transition={isReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Flush-to-bottom layout: rounded top corners, full width, safe area padding */}
      <div className="w-full flex items-center justify-between gap-1 rounded-t-[1.5rem] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-background/85 backdrop-blur-md border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.15)] admin-glass-card">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link 
              key={item.label} 
              to={item.path} 
              className="relative flex-1 touch-target group"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <motion.div 
                whileTap={isReducedMotion ? undefined : { scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`relative flex min-h-[3.45rem] items-center justify-center rounded-2xl transition-colors duration-300 ease-out z-10
                  ${active ? 'text-foreground' : 'text-muted-foreground/72 group-hover:text-foreground/90'}`}
              >
                {/* Sliding active-tab indicator via layoutId */}
                {active && (
                  <motion.div
                    layoutId="admin-nav-indicator"
                    className="absolute inset-0 rounded-2xl bg-foreground/10"
                    transition={isReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                
                <div className="relative flex items-center gap-1.5 z-20">
                  <div className="relative">
                    {/* Spring-based micro-interaction on icon */}
                    <motion.div
                      animate={active && !isReducedMotion ? { scale: [0.8, 1.15, 1] } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <Icon size={active ? 20 : 19} strokeWidth={active ? 2.5 : 2} className="transition-all duration-300" />
                    </motion.div>
                    
                    {/* Pulsing notification badge */}
                    {item.label === 'Orders' && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-2.5 w-2.5">
                        {!isReducedMotion && (
                          <motion.span 
                            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"
                          />
                        )}
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive border-[1.5px] border-background" />
                      </span>
                    )}
                  </div>
                  
                  {active && (
                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium animate-in fade-in zoom-in-95 duration-300 hidden sm:inline-block">
                      {item.label}
                    </span>
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}

        {/* Logout button distinction */}
        <motion.button 
          onClick={handleLogout} 
          whileTap={isReducedMotion ? undefined : { scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative flex min-h-[3.45rem] flex-1 touch-target items-center justify-center rounded-2xl text-muted-foreground/72 hover:text-destructive hover:bg-destructive/10 transition-all duration-300 ease-out z-10 group"
          aria-label="Exit Admin"
        >
          <div className="flex items-center gap-1.5 relative z-20">
            <LogOut size={19} strokeWidth={2} className="transition-all duration-300 group-hover:scale-105" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium hidden sm:inline-block">Exit</span>
          </div>
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default AdminMobileNav;
