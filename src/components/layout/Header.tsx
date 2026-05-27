import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, User, ArrowRight, Heart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSearch } from '@/hooks/useSearch';
import { formatPrice } from '@/data/products';
import { getProductImage } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { createPortal } from 'react-dom';

const premiumEase: Easing = [0.83, 0, 0.17, 1];

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
  const { query, setQuery, results, isSearching } = useSearch();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    { name: 'Style Advisor', path: '/style-advisor' },
    { name: 'Sale', path: '/shop?filter=sale' },
  ];

  const secondaryLinks = [
    { name: 'Accessories', path: '/shop?subcategory=accessories' },
    { name: 'AI Assistant', path: '/ai-assistant' },
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
                className={`touch-target rounded-full border md:hidden ${
                  isHome && !scrolled ? 'border-white/15 bg-black/18 text-white backdrop-blur-md' : 'border-border/60 bg-background/72 text-foreground'
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

            <div className="flex min-w-[4.5rem] items-center justify-end gap-0.5 md:min-w-0 md:gap-3">
              {!isMobile && (
                <>
                  <motion.div whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0.84 }}>
                    <Link to={isAuthenticated ? '/profile' : '/auth'} className="touch-target rounded-full" aria-label="Profile">
                      <User size={18} />
                    </Link>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05, opacity: 1 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0.84 }} className="relative">
                    <Link to="/wishlist" className="touch-target rounded-full" aria-label="Wishlist">
                      <Heart size={18} />
                      {wishlistItems > 0 && (
                        <motion.span
                          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          {wishlistItems}
                        </motion.span>
                      )}
                    </Link>
                  </motion.div>
                </>
              )}

              {isMobile && (
                <motion.button
                  onClick={() => setIsSearchOpen((value) => !value)}
                  className="touch-target rounded-full"
                  aria-label="Search"
                  whileTap={{ scale: 0.92 }}
                >
                  <Search size={18} />
                </motion.button>
              )}

              <motion.button
                onClick={openDrawer}
                className="relative touch-target rounded-full"
                aria-label="Cart"
                whileHover={{ scale: 1.05, opacity: 1 }}
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0.9 }}
              >
                <motion.div
                  key={cartItems}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <ShoppingBag size={18} />
                </motion.div>
                {cartItems > 0 && (
                  <motion.span
                    className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {cartItems}
                  </motion.span>
                )}
              </motion.button>

              {!isMobile && (
                <motion.button
                  onClick={() => setIsSearchOpen((value) => !value)}
                  className="touch-target rounded-full"
                  aria-label="Search"
                  whileHover={{ scale: 1.05, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0.84 }}
                >
                  <Search size={18} />
                </motion.button>
              )}
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
                      <motion.button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5" whileTap={{ scale: 0.9 }}>
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
                      {results.length > 0 ? (
                        <>
                          <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                            {results.length} result{results.length !== 1 ? 's' : ''} found
                          </p>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {results.slice(0, 8).map((product, index) => (
                              <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }}>
                                <Link to={`/product/${product.id}`} onClick={handleProductClick} className="group block overflow-hidden rounded-[1.15rem] border border-border bg-card shadow-sm transition-all duration-300 hover:border-foreground/20">
                                  <div className="aspect-[3/4] overflow-hidden">
                                    <img
                                      src={getProductImage(product)}
                                      alt={product.name}
                                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="space-y-1 p-3">
                                    <h4 className="line-clamp-1 text-xs font-medium">{product.name}</h4>
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
                  transition={{ duration: 0.25, ease: premiumEase }}
                  className="fixed inset-0 z-[60] md:hidden"
                >
                  <div className="absolute inset-0 bg-black/52 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.32, ease: premiumEase }}
                    className="mobile-blur-shell relative flex h-[100dvh] flex-col overflow-hidden overscroll-contain"
                  >
                    {/* Controlled ambient glow — single intentional source, not noisy blobs */}
                    <div className="pointer-events-none absolute inset-0 -z-10">
                      <div className="absolute left-1/2 top-[30%] h-[45vh] w-[55vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.04] blur-[80px]" />
                    </div>

                    <div className="safe-top flex items-center justify-between border-b border-border/30 px-4 py-3.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">Navigate</p>
                        <p className="mt-1 text-base font-medium tracking-[0.08em]">SWITCH</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Lighter close button — less visual weight */}
                        <button
                          onClick={() => setIsMenuOpen(false)}
                          className="touch-target flex h-9 w-9 items-center justify-center rounded-full border border-border/30 bg-background/50 transition-colors hover:border-border/60"
                          aria-label="Close menu"
                        >
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    <nav ref={mobileMenuScrollRef} className="custom-scrollbar flex-1 flex flex-col justify-center overflow-y-auto overscroll-contain px-8 py-8">
                      {[...navLinks, ...secondaryLinks].filter(l => l.name !== 'Wishlist').map((link, index) => {
                        const active = isActive(link.path);
                        return (
                          <div key={link.name} className="py-1.5">
                            <motion.div
                              initial={{ y: 16, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{
                                delay: index * 0.04,
                                duration: 0.5,
                                ease: premiumEase,
                              }}
                            >
                              <Link
                                to={link.path}
                                onClick={() => setIsMenuOpen(false)}
                                className="relative block py-2"
                              >
                                {active && (
                                  <motion.div
                                    layoutId="mobileNavGlow"
                                    className="absolute left-0 top-1/2 -z-10 h-14 w-40 -translate-y-1/2 rounded-full bg-foreground/[0.07] blur-2xl"
                                    transition={{ ease: premiumEase, duration: 0.7 }}
                                  />
                                )}
                                <span
                                  className={`block text-3xl sm:text-4xl font-light uppercase leading-normal transition-colors duration-400 ${
                                    active
                                      ? 'text-foreground tracking-[0.06em]'
                                      : 'text-foreground/60 hover:text-foreground/85 tracking-[0.07em]'
                                  }`}
                                >
                                  {link.name}
                                </span>
                              </Link>
                            </motion.div>
                          </div>
                        );
                      })}
                    </nav>

                    <div className="border-t border-border/30 px-3 pb-safe pt-3">
                      <div className="flex gap-2.5">
                        <Link
                          to={isAuthenticated ? '/profile' : '/auth'}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border/40 bg-background/60 px-4 py-3.5 text-xs uppercase tracking-[0.2em] transition-all hover:border-foreground/25 hover:bg-background/75"
                        >
                          <User size={14} strokeWidth={1.5} />
                          Account
                        </Link>
                        <button
                          onClick={openDrawer}
                          className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-xs"
                        >
                          <ShoppingBag size={14} strokeWidth={1.5} />
                          Cart {cartItems > 0 ? `(${cartItems})` : ''}
                        </button>
                      </div>
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
