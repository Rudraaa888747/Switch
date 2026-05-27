import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Easing } from 'framer-motion';
import { ShoppingBag, Heart, Eye } from 'lucide-react';
import { Product, formatPrice } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { toast } from '@/hooks/use-toast';
import { normalizeImageUrl } from '@/lib/utils';
import ProductQuickView from './ProductQuickView';

interface ProductCardProps {
  product: Product;
  index?: number;
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

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const inWishlist = isInWishlist(product.id);

  const imageUrl = useMemo(
    () => normalizeImageUrl(product.variants?.[0]?.images?.[0] || product.image || product.images?.[0] || ''),
    [product],
  );

  const secondaryImageUrl = useMemo(
    () => {
      const images = product.variants?.[0]?.images || product.images || [];
      if (images.length > 1) {
        return normalizeImageUrl(images[1]);
      }
      return null;
    },
    [product],
  );

  const handlePrefetch = useCallback(() => {
    prefetchProductPage();
    preloadImage(imageUrl);
  }, [imageUrl]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0], product.colors[0]);
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
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
        viewport={{ once: true, margin: '-24px' }}
        transition={{ duration: 0.48, delay: index * 0.06, ease: premiumEase }}
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
          <div className="theme-elevated flex h-full flex-col overflow-hidden rounded-[1.55rem] p-2.5 md:p-3">
            <motion.div className="theme-image-stage relative mb-3 overflow-hidden rounded-[1.2rem] bg-secondary/10 md:mb-4">
              <motion.div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-transparent to-black/10 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:opacity-100" />
              <div className="image-fade-wrap relative flex aspect-[4/5] items-center justify-center overflow-hidden" data-loaded={imageLoaded}>
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="image-fade absolute inset-0 h-full w-full object-cover object-[center_top] transition-transform duration-[1.2s] ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:scale-105"
                  data-loaded={imageLoaded}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  decoding="async"
                  onLoad={() => setImageLoaded(true)}
                />
                
                {secondaryImageUrl && (
                  <img
                    src={secondaryImageUrl}
                    alt={`${product.name} alternative`}
                    className="absolute inset-0 h-full w-full object-cover object-[center_top] opacity-0 transition-all duration-[1.2s] ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:scale-105 group-hover:opacity-100"
                    loading="lazy"
                    decoding="async"
                  />
                )}

                <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center opacity-0 transition-opacity delay-100 duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:opacity-100">
                  <button
                    onClick={handleQuickView}
                    className="pointer-events-auto flex -translate-y-4 items-center gap-2 rounded-full bg-background/85 px-6 py-3.5 text-[10px] font-medium uppercase tracking-[0.24em] text-foreground backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] hover:bg-background group-hover:translate-y-0"
                  >
                    <Eye size={14} />
                    Quick View
                  </button>
                </div>
              </div>

            <motion.div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/14 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="absolute left-3 top-3 flex flex-col gap-2">
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
    </>
  );
};

export default ProductCard;
