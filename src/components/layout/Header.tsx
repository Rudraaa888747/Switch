import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Easing, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, User, ArrowRight, Heart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSearch } from '@/hooks/useSearch';
import { formatPrice } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import { getProductImage } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { createPortal } from 'react-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const premiumEase: Easing = [0.83, 0, 0.17, 1];

const mobileMenuGroups = [
  {
    title: 'Shop',
    links: [
      { name: 'Men', path: '/men' },
      { name: 'Women', path: '/women' },
      { name: 'Accessories', path: '/shop?subcategory=accessories' },
    ]
  },
  {
    title: 'AI Experience',
    links: [
      { name: 'Style Advisor', path: '/style-advisor', subtitle: 'Personal AI Fashion Intelligence' },
      { name: 'Outfit Matching', path: '/outfit-matching' },
      { name: 'AI Assistant', path: '/ai-assistant' },
    ]
  },
  {
    title: 'Discover',
    links: [
      { name: 'Sale', path: '/shop?filter=sale' },
      { name: 'About Us', path: '/about' },
      { name: 'How to Use', path: '/how-to-use' },
    ]
  },
  {
    title: 'Account',
    links: [
      { name: 'My Orders', path: '/orders' },
    ]
  }
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { totalItems: cartItems, openDrawer } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuScrollRef = useRef<HTMLDivElement>(null);
  const { data: allProducts, isLoading: isProductsLoading } = useProducts();
  const { query, setQuery, results, isSearching, isLoading } = useSearch(allProducts || [], isProductsLoading);
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' ? window.scrollY > 24 : false);
  const isHome = location.pathname === '/';

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 24);
  });

  useEffect(() => {
    // Immediately close menu and force-clear the body lock on route change.
    // This MUST happen before AnimatePresence exit animation runs to prevent
    // body[data-mobile-menu='open'] CSS lock persisting into the new page.
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setQuery('');
    document.body.dataset.mobileMenu = 'closed';
  }, [location.pathname, setQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => window.clearTimeout(timeout);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    document.body.dataset.mobileMenu = isMenuOpen ? 'open' : 'closed';

    if (isMenuOpen) {
      mobileMenuScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }

    return () => {
      // Hard cleanup: always reset body state when this effect re-runs or unmounts
      document.body.dataset.mobileMenu = 'closed';
    };
  }, [isMenuOpen]);

  const navLinks = [
    { name: 'New Arrivals', path: '/shop?filter=new' },
    { name: 'Women', path: '/women' },
    { name: 'Men', path: '/men' },
    { name: 'How to Use', path: '/how-to-use' },
    { name: 'Style Advisor', path: '/style-advisor' },
    { name: 'Sale', path: '/shop?filter=sale' },
  ];

  const secondaryLinks = [
    { name: 'Outfit Matching', path: '/outfit-matching' },
    { name: 'Accessories', path: '/shop?subcategory=accessories' },
    { name: 'AI Assistant', path: '/ai-assistant' },
    { name: 'My Orders', path: '/orders' },
    { name: 'About Us', path: '/about' },
    { name: 'Wishlist', path: '/wishlist' },
    { name: 'Admin', path: '/admin/dashboard' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  const headerClass = isHome && !scrolled
    ? 'bg-transparent border-transparent text-white'
    : 'theme-header-shell text-foreground';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    setIsSearchOpen(false);
    setQuery('');
  };

  const handleProductClick = () => {
    setIsSearchOpen(false);
    setQuery('');
  };

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${headerClass}`}
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: premiumEase }}
    >
      <div className="safe-top relative z-10">
        <div className="container-custom">
          <div className="flex h-[var(--mobile-header-height)] items-center justify-between gap-2 md:h-20">
            <div className="flex min-w-[4.5rem] items-center gap-1 md:min-w-0 md:gap-2">
              <motion.button
                onClick={() => setIsMenuOpen((value) => !value)}
                className={`touch-target rounded-full border md:hidden flex items-center justify-center w-10 h-10 ${isHome && !scrolled ? 'border-white/15 bg-black/18 text-white backdrop-blur-md' : 'border-border/60 bg-background/72 text-foreground'
                  }`}
                aria-label="Toggle menu"
                whileTap={{ scale: 0.92 }}
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.button>

              {!isMobile && <div className="w-6" aria-hidden="true" />}
            </div>

            <Link
              to="/"
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="absolute left-1/2 max-w-[52vw] -translate-x-1/2 md:static md:max-w-none md:translate-x-0 md:flex-1 md:flex md:justify-center"
            >
              <motion.span
                className={`block truncate text-center text-[0.92rem] font-light uppercase tracking-[0.28em] sm:text-[1rem] md:text-3xl md:tracking-[0.34em] ${isHome && !scrolled ? 'text-white' : 'text-foreground'}`}
                whileHover={{ opacity: 0.7 }}
              >
                SWITCH
              </motion.span>
            </Link>

            <div className="flex min-w-[4.5rem] items-center justify-end gap-0 md:min-w-0 md:gap-0 lg:gap-0">
              <motion.div className="hidden md:block relative mr-1" whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0.84 }}>
                <ThemeToggle />
              </motion.div>
              
              <motion.div className="hidden md:block relative" whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0.84 }}>
                <Link to={isAuthenticated ? '/profile' : '/auth'} className="touch-target w-11 h-11 flex items-center justify-center rounded-full" aria-label="Profile">
                  <User size={18} />
                </Link>
              </motion.div>

              <motion.div className="hidden md:block relative" whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0.84 }}>
                <Link to="/wishlist" className="touch-target w-11 h-11 flex items-center justify-center rounded-full" aria-label="Wishlist">
                  <Heart size={18} />
                  {wishlistItems > 0 && (
                    <motion.span
                      className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      {wishlistItems}
                    </motion.span>
                  )}
                </Link>
              </motion.div>

              <motion.div className="hidden md:block relative" whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.92 }} initial={{ opacity: 0.9 }}>
                <button onClick={openDrawer} className="touch-target w-11 h-11 flex items-center justify-center rounded-full" aria-label="Cart">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <ShoppingBag size={18} />
                  </motion.div>
                  {cartItems > 0 && (
                    <motion.span
                      className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background shadow-sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      {cartItems}
                    </motion.span>
                  )}
                </button>
              </motion.div>

              <motion.div className="relative" whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0.84 }}>
                <button onClick={() => setIsSearchOpen((value) => !value)} className="touch-target w-11 h-11 flex items-center justify-center rounded-full" aria-label="Search">
                  <Search size={18} />
                </button>
              </motion.div>
            </div>
          </div>

          <nav className="hidden items-center justify-center gap-10 pb-4 md:flex">
            {navLinks.map((link, index) => {
              const active = isActive(link.path);
              return (
                <motion.div key={link.name} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + index * 0.05, duration: 0.6, ease: premiumEase }}>
                  <Link to={link.path} className="group relative py-2">
                    <span className={`text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-300 ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {link.name}
                    </span>
                    {active ? (
                      <motion.div layoutId="navUnderline" className="absolute -bottom-1 left-0 right-0 h-[1px] bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.4)]" transition={{ ease: premiumEase, duration: 0.6 }} />
                    ) : (
                      <div className="absolute -bottom-1 left-0 right-0 h-[1px] origin-left scale-x-0 bg-foreground/40 transition-transform duration-500 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:scale-x-100" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>

      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: premiumEase }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="container-custom py-3 md:py-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isMobile ? 'Search collection' : 'Search products, categories, colors...'}
                    className="input-premium h-12 pl-11 pr-11 text-sm"
                    autoFocus
                  />
                  {query && (
                    <motion.button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5" whileTap={{ scale: 0.9 }} aria-label="Clear search">
                      <X size={16} />
                    </motion.button>
                  )}
                </div>
              </form>

              <AnimatePresence>
                {isSearching && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: premiumEase }}
                    className="mt-4 max-h-[56vh] overflow-y-auto md:max-h-[60vh]"
                  >
                    {isLoading ? (
                      <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                        <p className="text-sm text-muted-foreground animate-pulse">Searching...</p>
                      </div>
                    ) : results.length > 0 ? (
                      <>
                        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                          {results.length} result{results.length !== 1 ? 's' : ''} found
                        </p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {results.slice(0, 8).map((product, index) => (
                            <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}>
                              <Link to={`/product/${product.id}`} onClick={handleProductClick} className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-foreground/20">
                                <div className="aspect-[3/4] overflow-hidden">
                                  <img
                                    src={getProductImage(product)}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="space-y-1 p-3">
                                  <h3 className="line-clamp-1 text-xs font-medium">{product.name}</h3>
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{product.category}</p>
                                  <p className="text-sm font-medium">{formatPrice(product.price)}</p>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                        {results.length > 8 && (
                          <motion.button
                            onClick={(e) => handleSearchSubmit(e as unknown as React.FormEvent)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-medium"
                            whileTap={{ scale: 0.98 }}
                          >
                            View all {results.length} results
                            <ArrowRight size={14} />
                          </motion.button>
                        )}
                      </>
                    ) : (
                      <motion.div className="py-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <p className="text-sm text-muted-foreground">No products found for "{query}"</p>
                        <p className="mt-1 text-xs text-muted-foreground">Try searching by color, category, or occasion.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' &&
        createPortal(
          <>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: premiumEase }}
                  className="fixed inset-0 z-[60] md:hidden"
                >
                  <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-md" onClick={() => setIsMenuOpen(false)}>
                    {/* Luxury grain texture */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
                    {/* Cinematic dark vignette */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-[#0a0a0a]/95" />
                    {/* Very subtle ambient light movement */}
                    <motion.div
                      animate={{ opacity: [0.03, 0.05, 0.03], scale: [1, 1.05, 1] }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                      className="pointer-events-none absolute top-0 left-1/2 h-[50vh] w-[80vw] -translate-x-1/2 rounded-full bg-white blur-[100px]"
                    />
                  </div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 15, opacity: 0 }}
                    transition={{ duration: 0.35, ease: premiumEase }}
                    className="relative flex h-[100dvh] flex-col overflow-hidden overscroll-contain"
                  >
                    <div className="safe-top flex items-center justify-between px-6 pt-8 pb-5">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/40">Navigate</p>
                        <p className="mt-1 text-sm font-medium tracking-[0.1em] text-white">SWITCH</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                      >
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          className="touch-target flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] transition-colors hover:bg-white/[0.05] active:scale-95"
                          aria-label="Close menu"
                        >
                          <X size={16} strokeWidth={1.5} className="text-white/70" />
                        </button>
                      </motion.div>
                    </div>

                    <nav ref={mobileMenuScrollRef} className="custom-scrollbar flex-1 flex flex-col justify-start overflow-y-auto overscroll-contain px-8 py-6 space-y-10">
                      {mobileMenuGroups.map((group, groupIndex) => (
                        <div key={group.title} className="space-y-5">
                          <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + groupIndex * 0.08, duration: 0.4, ease: premiumEase }}
                            className="touch-target text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40"
                          >
                            {group.title}
                          </motion.h3>
                          <div className="space-y-4">
                            {group.links.map((link, linkIndex) => {
                              const active = isActive(link.path);
                              const isStyleAdvisor = link.name === 'Style Advisor';
                              return (
                                <motion.div
                                  key={link.name}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 + groupIndex * 0.08 + linkIndex * 0.04, duration: 0.4, ease: premiumEase }}
                                >
                                  <Link
                                    to={link.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="group relative flex items-center py-1"
                                  >
                                    {/* Active Line Indicator */}
                                    {active && (
                                      <motion.div
                                        layoutId="activeMobileLine"
                                        className="absolute -left-5 top-1/2 h-[70%] w-[1.5px] -translate-y-1/2 bg-white"
                                        transition={{ ease: premiumEase, duration: 0.5 }}
                                      />
                                    )}
                                    <div className="flex flex-col">
                                      <span className={`font-light transition-all duration-300 ${isStyleAdvisor ? 'text-[1.65rem] tracking-tight' : 'text-2xl tracking-[0.02em]'} ${active ? 'text-white font-normal' : 'text-white/70 group-hover:text-white group-active:opacity-70'}`}>
                                        {link.name}
                                      </span>
                                      {link.subtitle && (
                                        <span className={`text-[10px] tracking-wide mt-0.5 transition-colors duration-300 ${active ? 'text-white/60' : 'text-white/40 group-hover:text-white/60'}`}>
                                          {link.subtitle}
                                        </span>
                                      )}
                                    </div>
                                  </Link>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </nav>

                    <div className="safe-bottom border-t border-border/50 px-8 py-5 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/50">Theme</span>
                      <ThemeToggle />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </motion.header>
  );
};

export default Header;
