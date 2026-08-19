import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Home, Grid3X3, Heart, ShoppingBag, User } from 'lucide-react';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Grid3X3, label: 'Shop', path: '/shop' },
  { icon: Heart, label: 'Wishlist', path: '/wishlist' },
  { icon: ShoppingBag, label: 'Cart', path: '/cart' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const premiumTransition = { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 } as const;

const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItems: cartItems } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { hidden: scrollHidden, isReducedMotion } = useHideOnScroll({ idleHideMs: 1200 });
  const { scrollY } = useScroll();
  const [isPastThreshold, setIsPastThreshold] = useState(() => typeof window !== 'undefined' ? window.scrollY > window.innerHeight * 0.8 : false);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsPastThreshold(latest > window.innerHeight * 0.8);
  });

  const isHome = location.pathname === '/';
  const isVisible = isHome ? isPastThreshold && !scrollHidden : !scrollHidden;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/profile') {
      return ['/profile', '/orders', '/wallet'].some((segment) => location.pathname.startsWith(segment));
    }
    return location.pathname.startsWith(path);
  };

  const getBadge = (label: string) => {
    if (label === 'Cart' && cartItems > 0) return cartItems;
    if (label === 'Wishlist' && wishlistItems > 0) return wishlistItems;
    return 0;
  };

  const getProfilePath = () => (isAuthenticated ? '/profile' : '/auth');

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={isReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
          className="mobile-dock-hide-on-menu md:hidden fixed left-0 right-0 z-50 px-3 safe-bottom" 
          style={{ bottom: '0.65rem' }}
        >
      <div className="mobile-glass-panel mx-auto flex max-w-[27rem] items-center justify-between gap-1 rounded-[2rem] px-2 py-2 shadow-[0_20px_50px_-26px_rgba(0,0,0,0.65)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const badge = getBadge(item.label);
          const path = item.label === 'Profile' ? getProfilePath() : item.path;

          return (
            <Link key={item.label} to={path} className="relative flex-1" aria-label={item.label}>
              <motion.div
                whileTap={{ scale: 0.94 }}
                className={`relative flex min-h-[3.5rem] items-center justify-center overflow-hidden rounded-2xl px-2 transition-colors ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground/72 hover:text-foreground'
                }`}
              >
                {active && (
                  <>
                    <motion.div
                      layoutId="mobile-dock-active"
                      className="absolute inset-0 rounded-2xl bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                      transition={premiumTransition}
                    />
                    <motion.div
                      layoutId="mobile-dock-glow"
                      className="absolute inset-0 rounded-2xl bg-primary/20 blur-md"
                      transition={premiumTransition}
                    />
                  </>
                )}

                <div className="relative flex items-center gap-2.5">
                  <motion.div 
                    animate={{ 
                      scale: active ? 1.12 : 1, 
                      y: active ? -1 : 0,
                      filter: active ? 'drop-shadow(0 0 8px rgba(var(--primary-foreground), 0.25))' : 'none'
                    }} 
                    transition={premiumTransition} 
                    className="relative"
                  >
                    <Icon size={active ? 20 : 19} strokeWidth={active ? 2.2 : 1.9} />
                    <AnimatePresence>
                      {badge > 0 && (
                        <motion.span
                          key={badge}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className={`absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-lg ${item.label === 'Cart' ? 'bg-foreground text-background' : 'bg-emerald-500 text-white'}`}
                        >
                          {badge > 9 ? '9+' : badge}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {active && (
                    <motion.span
                      initial={{ opacity: 0, x: -6, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -6, scale: 0.9 }}
                      className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default MobileBottomNav;
