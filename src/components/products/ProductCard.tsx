import { useCallback, useMemo, useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Easing, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, Eye, Plus, X } from 'lucide-react';
import { Product, formatPrice } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { toast } from '@/hooks/use-toast';
import { normalizeImageUrl } from '@/lib/utils';
import ProductQuickView from './ProductQuickView';

interface ProductCardProps {
  product: Product;
  index?: number;
  matchPercentage?: number;
}

const premiumEase: Easing = [0.83, 0, 0.17, 1];

const preloadImage = (url: string) => {
  if (!url || typeof document === 'undefined') return;
  const existing = document.querySelector(`link[href="${url}"]`);
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
};

const prefetchProductPage = () => {
  import('@/pages/ProductDetail');
};

const ProductCard = ({ product, index = 0, matchPercentage }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const inWishlist = isInWishlist(product.id);

  const mobileImageUrl = useMemo(
    () => normalizeImageUrl(product.variants?.[0]?.images?.[0] || product.image || product.images?.[0] || '', { width: 400, quality: 75 }),
    [product]
  );

  const desktopImageUrl = useMemo(
    () => normalizeImageUrl(product.variants?.[0]?.images?.[0] || product.image || product.images?.[0] || '', { width: 800, quality: 80 }),
    [product]
  );

  const secondaryImageUrl = useMemo(
    () => {
      const images = product.variants?.[0]?.images || product.images || [];
      if (images.length > 1) {
        return normalizeImageUrl(images[1], { width: 400, quality: 75 });
      }
      return null;
    },
    [product],
  );

  const fallbackChain = useMemo(() => {
    const chain: string[] = [];
    if (desktopImageUrl) chain.push(desktopImageUrl);
    if (secondaryImageUrl && secondaryImageUrl !== desktopImageUrl) chain.push(secondaryImageUrl);
    chain.push('/placeholder.svg');
    return chain;
  }, [desktopImageUrl, secondaryImageUrl]);

  const mobileFallbackChain = useMemo(() => {
    const chain: string[] = [];
    if (mobileImageUrl) chain.push(mobileImageUrl);
    if (secondaryImageUrl && secondaryImageUrl !== mobileImageUrl) chain.push(secondaryImageUrl);
    chain.push('/placeholder.svg');
    return chain;
  }, [mobileImageUrl, secondaryImageUrl]);

  // State-based fallbacks removed in favor of native DOM mutation to prevent re-renders

  const handlePrefetch = useCallback(() => {
    prefetchProductPage();
    preloadImage(desktopImageUrl);
  }, [desktopImageUrl]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleMobileQuickAddSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSize) {
      toast({ title: 'Please select a size', variant: 'destructive' });
      return;
    }
    addToCart(product, selectedSize, product.colors[0]);
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
    setIsBottomSheetOpen(false);
    setSelectedSize('');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    toast({
      title: inWishlist ? 'Removed from wishlist' : 'Added to wishlist',
      description: inWishlist ? `${product.name} has been removed from your wishlist.` : `${product.name} has been added to your wishlist.`,
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.48, delay: Math.min(index, 6) * 0.05, ease: premiumEase }}
        whileHover={{ y: -6 }}
        className="product-card-premium group h-full"
      >
        <Link
          to={`/product/${product.id}`}
          className="flex h-full flex-col"
          onMouseEnter={handlePrefetch}
          onTouchStart={handlePrefetch}
          onFocus={handlePrefetch}
        >
          <div className="theme-elevated flex h-full flex-col overflow-hidden rounded-3xl p-2.5 md:p-3">
            <motion.div className="theme-image-stage relative mb-3 overflow-hidden rounded-2xl bg-muted dark:bg-[#0a0a0a] md:mb-4">
              <motion.div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-transparent to-black/10 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:opacity-100" />
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-muted dark:bg-[#0a0a0a]">
                <div className="sa-shimmer absolute inset-0 z-0 bg-muted dark:bg-[#0a0a0a] bg-gradient-to-r from-muted via-muted/50 to-muted dark:from-[#0a0a0a] dark:via-[#1a1a1a] dark:to-[#0a0a0a] bg-[length:200%_100%] animate-shimmer" />
                <img
                  src={fallbackChain[0]}
                  srcSet={
                    fallbackChain[0] === '/placeholder.svg'
                      ? undefined
                      : `${mobileFallbackChain[0]} 400w, ${fallbackChain[0]} 800w`
                  }
                  sizes={fallbackChain[0] === '/placeholder.svg' ? undefined : "(max-width: 768px) 400px, 800px"}
                  alt={product.name}
                  className="absolute inset-0 z-10 h-full w-full object-cover object-[center_top] transition-all duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:scale-105 opacity-0"
                  loading={index < 4 ? 'eager' : 'lazy'}
                  fetchPriority={index < 4 ? 'high' : 'auto'}
                  decoding="async"
                  data-attempt="0"
                  onLoad={(e) => {
                    const target = e.currentTarget;
                    target.style.opacity = '1';
                    const shimmer = target.previousElementSibling as HTMLElement;
                    if (shimmer) shimmer.style.opacity = '0';
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const attempt = parseInt(target.getAttribute('data-attempt') || '0', 10);
                    if (attempt < fallbackChain.length - 1) {
                      target.src = fallbackChain[attempt + 1];
                      target.setAttribute('data-attempt', (attempt + 1).toString());
                      if (fallbackChain[attempt + 1] === '/placeholder.svg') {
                        target.removeAttribute('srcset');
                        target.removeAttribute('sizes');
                      } else {
                        target.srcset = `${mobileFallbackChain[attempt + 1]} 400w, ${fallbackChain[attempt + 1]} 800w`;
                      }
                    }
                  }}
                />
                
                {secondaryImageUrl && (
                  <img
                    src={secondaryImageUrl || '/placeholder.svg'}
                    alt={`${product.name} alternative`}
                    className="absolute inset-0 z-[11] h-full w-full object-cover object-[center_top] opacity-0 transition-all duration-[1.2s] ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:scale-105 group-hover:opacity-100"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}

                <div className="hidden pointer-events-none absolute inset-0 z-[2] bg-black/10 md:flex flex-col items-center justify-end pb-6 opacity-0 transition-opacity delay-100 duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:opacity-100">
                  <div className="flex flex-col items-center translate-y-4 group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.83,0,0.17,1)]">
                    <button
                      onClick={handleQuickView}
                      className="pointer-events-auto flex items-center gap-2 rounded-full bg-background/85 px-6 py-3.5 text-[10px] font-medium uppercase tracking-[0.24em] text-foreground backdrop-blur-xl transition-all duration-300 hover:bg-background mb-4"
                    >
                      <Eye size={14} />
                      Quick View
                    </button>
                    
                    <div className="flex gap-2">
                      {product.sizes?.slice(0, 4).map((size) => (
                        <button
                          key={size}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product, size, product.colors[0] || 'Standard', 1);
                          }}
                          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all hover:bg-foreground hover:text-background shadow-lg"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            <motion.div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/14 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="absolute left-3 top-3 flex flex-col gap-2">
              {matchPercentage !== undefined && (
                <motion.span className="bg-foreground text-background px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)]" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                  {matchPercentage}% Match
                </motion.span>
              )}
              {product.isNew && (
                <motion.span className="badge-new" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
                  New
                </motion.span>
              )}
              {product.discount && product.discount > 0 && (
                <motion.span className="badge-sale" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.24 }}>
                  -{product.discount}%
                </motion.span>
              )}
            </div>

            <div className="absolute right-3 top-3 z-[10] flex flex-col gap-2">
              <motion.button
                onClick={handleWishlistToggle}
                className={`touch-target rounded-full border backdrop-blur-xl transition-all duration-300 ${
                  inWishlist ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/10 bg-background/60 text-foreground hover:border-foreground/30 hover:bg-background/80'
                }`}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-[1.05rem] w-[1.05rem] ${inWishlist ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            {/* Quick Add Mobile Trigger */}
            <div className="absolute right-2 bottom-2 z-[10] lg:hidden">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsBottomSheetOpen(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm backdrop-blur-md transition-transform active:scale-90"
                aria-label="Quick Add"
              >
                <Plus size={18} />
              </button>
            </div>
            </motion.div>

            <div className="flex min-h-[10.5rem] flex-1 flex-col gap-2 px-1 pb-1">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{product.category}</p>
                <motion.h3 className="line-clamp-2 min-h-[3rem] text-[0.95rem] font-medium leading-6" whileHover={{ x: 2 }}>
                  {product.name}
                </motion.h3>
              </div>

              <div className="flex min-h-[1.75rem] items-end gap-2">
                <span className="text-[0.98rem] font-semibold tracking-tight">{formatPrice(product.price)}</span>
                {product.originalPrice && <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>}
              </div>

              <div className="mt-auto pt-3">
                <button
                  onClick={handleQuickAdd}
                  className="w-full border-t border-border/40 pt-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-300 hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
                >
                  + Add to Cart
                </button>
              </div>
            </div>
          </div>
        </Link>
      </motion.article>

      <ProductQuickView product={product} isOpen={isQuickViewOpen} onClose={() => setIsQuickViewOpen(false)} />

      {/* Mobile Quick Add Bottom Sheet */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { e.stopPropagation(); setIsBottomSheetOpen(false); }}
              className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl bg-background p-6 shadow-2xl lg:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
                  <p className="mt-1 text-sm font-medium">{formatPrice(product.price)}</p>
                </div>
                <button onClick={() => setIsBottomSheetOpen(false)} className="rounded-full bg-muted p-1.5 touch-target">
                  <X size={16} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Select Size</p>
                <div className="grid grid-cols-4 gap-2">
                  {product.sizes.map((size) => {
                    const isOutOfStock = product.stockQuantity === 0 || (size === '3XL' && product.id.length % 2 === 0);
                    return (
                      <button
                        key={size}
                        onClick={() => !isOutOfStock && setSelectedSize(size)}
                        disabled={isOutOfStock}
                        className={`flex min-h-[44px] touch-target items-center justify-center rounded-xl border text-xs font-medium transition-colors ${
                          isOutOfStock 
                            ? 'opacity-40 border-border bg-muted/30 line-through decoration-muted-foreground/50 text-muted-foreground' 
                            : selectedSize === size 
                              ? 'border-foreground bg-foreground text-background shadow-md' 
                              : 'border-border hover:border-foreground/40 active:bg-muted'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <button
                onClick={handleMobileQuickAddSubmit}
                className="w-full touch-target min-h-[44px] rounded-full bg-foreground py-3.5 text-sm font-semibold text-background active:scale-[0.98]"
              >
                Add to Cart
              </button>
              <div className="h-safe-bottom" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default memo(ProductCard);
