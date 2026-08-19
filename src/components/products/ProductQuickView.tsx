import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform } from 'framer-motion';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Star,
  ExternalLink
} from 'lucide-react';
import { Product, formatPrice } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { toast } from '@/hooks/use-toast';
import { normalizeImageUrl, cleanProductTitle, rewriteToLuxuryDescription } from '@/lib/utils';

interface ProductQuickViewProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const ZoomImage = React.lazy(() => import('@/components/ui/ZoomImage'));

const ProductQuickView = ({ product, isOpen, onClose }: ProductQuickViewProps) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState(product.variants?.[0]?.color || product.colors?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const [isZoomed, setIsZoomed] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const dragControls = useDragControls();
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

  const dragY = useMotionValue(0);
  const sheetScale = useTransform(dragY, [0, 200], [1, 0.95]);

  const inWishlist = isInWishlist(product.id);

  // Reset image cache states when color changes
  useEffect(() => {
    setImageLoaded({});
    setImageErrors({});
  }, [selectedColor]);

  // Lock body scroll and trigger global overlay hide (Issue #3)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.setAttribute('data-scroll-locked', 'true');
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-locked');
      if (scrollY) {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        requestAnimationFrame(() => {
          document.documentElement.style.scrollBehavior = '';
        });
      }
    }

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.removeAttribute('data-scroll-locked');
      if (scrollY) {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        requestAnimationFrame(() => {
          document.documentElement.style.scrollBehavior = '';
        });
      }
    };
  }, [isOpen]);

  // Escape key for zoom overlay
  useEffect(() => {
    if (!isZoomed) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleEscape, { capture: true });
    return () => window.removeEventListener('keydown', handleEscape, { capture: true });
  }, [isZoomed]);

  // Thumbnail auto-scroll
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentImageIndex]);

  // Get images from variants or fallback to legacy images
  const images = useMemo(() => {
    const raw =
      product.variants && product.variants.length > 0
        ? (product.variants.find((v) => v.color === selectedColor) || product.variants[0])?.images || []
        : product.images || (product.image ? [product.image] : []);

    const normalized = raw
      .map((u) => normalizeImageUrl(u))
      .filter((u): u is string => Boolean(u));

    return normalized.length > 0 ? normalized : ['/placeholder.svg'];
  }, [product, selectedColor]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!isOpen || images.length <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({
        title: 'Please select a size',
        variant: 'destructive',
      });
      return;
    }
    if (!selectedColor) {
      toast({
        title: 'Please select a color',
        variant: 'destructive',
      });
      return;
    }

    addToCart(product, selectedSize, selectedColor, quantity);
    setIsAdded(true);
    setTimeout(() => {
      toast({
        title: 'Added to cart',
        description: `${product.name} has been added to your cart.`,
      });
      onClose();
      setIsAdded(false);
    }, 400);
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product);
    toast({
      title: inWishlist ? 'Removed from wishlist' : 'Added to wishlist',
      description: inWishlist
        ? `${product.name} has been removed from your wishlist.`
        : `${product.name} has been added to your wishlist.`,
    });
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined} onEscapeKeyDown={(e) => { if (isZoomed) e.preventDefault(); }}>
              <motion.div
                drag="y"
                style={{ y: dragY }}
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    onClose();
                  }
                }}
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
              >
                <motion.div style={{ scale: sheetScale }} className="relative flex w-full max-h-[92dvh] max-w-5xl flex-col overflow-hidden rounded-t-[2rem] border border-border/60 bg-card shadow-[0_40px_90px_-40px_hsl(var(--foreground)/0.65)] md:max-h-[88dvh] md:flex-row md:rounded-[2rem]">
                  <DialogPrimitive.Title className="sr-only">{product.name}</DialogPrimitive.Title>
                  <button
                    onClick={onClose}
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-all hover:bg-black/60 md:right-4 md:top-4 md:h-9 md:w-9 active:scale-95"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>

                  {/* Mobile drag handle with narrowed hit area to prevent overlap with close button */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-0 z-20 h-10 w-24 md:hidden touch-none"
                    onPointerDown={(e) => dragControls.start(e)}
                  >
                    <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30" />
                  </div>

                  <div className="flex flex-col md:flex-row w-full flex-1 overflow-hidden">
                    <div className="relative flex w-full flex-shrink-0 items-center justify-center bg-[#0a0a0a] h-[45dvh] md:max-h-none md:min-h-[min(42rem,70vh)] md:w-[48%]">
                      <div className="pointer-events-none absolute inset-x-10 top-8 h-28 rounded-full bg-foreground/5 blur-3xl md:top-10" />
                      <motion.div
                        className="flex h-full w-full max-w-[28rem] items-center justify-center px-4 py-6 md:px-8 md:py-10 mx-auto touch-pan-y"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, info) => {
                          if (info.offset.x > 50 || info.velocity.x > 300) {
                            setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                          } else if (info.offset.x < -50 || info.velocity.x < -300) {
                            setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                          }
                        }}
                      >
                        <div className="theme-elevated flex h-full w-full items-center justify-center rounded-3xl p-2 md:p-4 bg-white relative overflow-hidden shadow-2xl">
                          {!imageLoaded[currentImageIndex] && !imageErrors[currentImageIndex] && (
                            <div className="absolute inset-0 z-0 bg-[#0a0a0a] bg-gradient-to-r from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] bg-[length:200%_100%] animate-shimmer" />
                          )}
                          <AnimatePresence mode="wait">
                            <motion.img
                              key={currentImageIndex}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              src={imageErrors[currentImageIndex] ? '/placeholder.svg' : (images[currentImageIndex] || normalizeImageUrl(product.image) || '/placeholder.svg')}
                              alt={product.name}
                              className={`h-full w-full object-contain object-center relative z-10 cursor-zoom-in ${imageLoaded[currentImageIndex] || imageErrors[currentImageIndex] ? 'opacity-100' : 'opacity-0'}`}
                              loading="eager"
                              fetchPriority="high"
                              decoding="sync"
                              onLoad={() => setImageLoaded(prev => ({ ...prev, [currentImageIndex]: true }))}
                              onError={() => setImageErrors(prev => ({ ...prev, [currentImageIndex]: true }))}
                              onClick={() => setIsZoomed(true)}
                            />
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      <div className="absolute left-3 top-3 flex flex-col gap-2 md:left-4 md:top-4 pointer-events-none">
                        {product.isNew && <span className="badge-new">NEW</span>}
                        {product.discount && product.discount > 0 && (
                          <span className="badge-sale">-{product.discount}%</span>
                        )}
                      </div>

                      {images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-md transition-all hover:bg-black/60 md:left-4 active:scale-95 z-10"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-md transition-all hover:bg-black/60 md:right-4 active:scale-95 z-10"
                          >
                            <ChevronRight size={16} />
                          </button>
                          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                            {images.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentImageIndex === idx ? 'w-5 bg-foreground' : 'w-1.5 bg-foreground/30'
                                  }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col relative overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-5 pb-6 md:p-8 md:pb-8 custom-scrollbar">
                        <div className="space-y-6">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                            {product.category}
                          </p>
                          <h2 className="text-xl font-normal leading-snug tracking-[-0.01em] md:text-[2rem] md:leading-[1.1]">
                            {cleanProductTitle(product.name)}
                          </h2>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={13} className={i < Math.floor(product.rating) ? 'fill-foreground text-foreground' : 'text-muted-foreground/35'} />
                              ))}
                            </div>
                            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline">({product.reviews} reviews)</button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-semibold tracking-tight">{formatPrice(product.price)}</span>
                            {product.originalPrice && (
                              <>
                                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground">{product.discount}% OFF</span>
                              </>
                            )}
                          </div>
                          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                            {rewriteToLuxuryDescription(product.description).split('\n\n').map((paragraph, i) => (
                              paragraph.trim() && <p key={i}>{paragraph.trim()}</p>
                            ))}
                          </div>

                          {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {images.map((image, index) => (
                                <button
                                  key={`${image}-${index}`}
                                  ref={currentImageIndex === index ? activeThumbnailRef : null}
                                  onClick={() => setCurrentImageIndex(index)}
                                  className={`h-16 w-14 flex-shrink-0 overflow-hidden rounded-xl border transition-all bg-[#0a0a0a] active:scale-95 ${currentImageIndex === index ? 'border-foreground shadow-[0_20px_35px_-24px_hsl(var(--foreground)/0.65)]' : 'border-border opacity-70'
                                    }`}
                                >
                                  <img loading="lazy" decoding="async"
                                    src={imageErrors[index] ? '/placeholder.svg' : image}
                                    alt={`${product.name} view ${index + 1}`}
                                    className="h-full w-full object-cover"
                                    onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                                  />
                                </button>
                              ))}
                            </div>
                          )}

                          <div>
                            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Color: <span className="text-foreground">{selectedColor || 'Select'}</span></h3>
                            <div className="flex flex-wrap gap-2">
                              {(product.colors || []).map((color) => (
                                <button
                                  key={color}
                                  onClick={() => handleColorChange(color)}
                                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 ${selectedColor === color ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground/80 hover:border-foreground/40'
                                    }`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Size: <span className="text-foreground">{selectedSize || 'Select'}</span></h3>
                            <div className="flex flex-wrap gap-2">
                              {(product.sizes || []).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => setSelectedSize(size)}
                                  className={`flex h-10 min-w-[3rem] items-center justify-center rounded-xl border px-3 text-xs font-medium transition-all duration-200 ${selectedSize === size ? 'border-foreground bg-foreground text-background shadow-sm' : 'border-border text-foreground/80 hover:border-foreground/40 hover:bg-muted/30'
                                    }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Quantity</h3>
                            <div className="inline-flex items-center rounded-full border border-border p-0.5">
                              <button onClick={() => setQuantity(prev => Math.max(1, prev - 1))} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted/50 active:scale-90">
                                <Minus size={13} />
                              </button>
                              <span className="flex w-10 items-center justify-center text-sm font-medium tabular-nums">{quantity}</span>
                              <button onClick={() => setQuantity(prev => prev + 1)} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted/50 active:scale-90">
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:block border-t border-border/50 bg-card p-6 z-20 flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <button onClick={handleAddToCart} className={`btn-primary flex flex-1 items-center justify-center gap-2 transition-all duration-300 ${isAdded ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                            {isAdded ? <Check size={16} className="animate-in zoom-in" /> : <ShoppingBag size={16} />}
                            {isAdded ? 'Added' : 'Add to Cart'}
                          </button>
                          <button
                            onClick={handleWishlistToggle}
                            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${inWishlist ? 'bg-foreground text-background border-foreground' : 'border-border text-foreground/70 hover:border-foreground/40'
                              }`}
                            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                          >
                            <Heart size={16} className={inWishlist ? 'fill-current' : ''} />
                          </button>
                        </div>
                        <Link
                          to={`/product/${product.id}`}
                          onClick={onClose}
                          className="mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          View Full Details
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="md:hidden border-t border-border/50 bg-card/95 p-4 backdrop-blur-xl z-20 flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
                    <div className="flex items-center gap-3">
                      <button onClick={handleAddToCart} className={`btn-primary flex flex-1 items-center justify-center gap-2 transition-all duration-300 ${isAdded ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                        {isAdded ? <Check size={16} className="animate-in zoom-in" /> : <ShoppingBag size={16} />}
                        {isAdded ? 'Added' : 'Add to Cart'}
                      </button>
                      <button
                        onClick={handleWishlistToggle}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${inWishlist ? 'bg-foreground text-background border-foreground' : 'border-border text-foreground/70 hover:border-foreground/40'
                          }`}
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart size={16} className={inWishlist ? 'fill-current' : ''} />
                      </button>
                    </div>
                    <Link
                      to={`/product/${product.id}`}
                      onClick={onClose}
                      className="mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      View Full Details
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isZoomed && (
          <DialogPrimitive.Portal forceMount>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Zoomed product image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
              onClick={() => setIsZoomed(false)}
            >
              <Suspense fallback={<div className="flex items-center justify-center h-full w-full text-white/50">Loading zoom...</div>}>
                <ZoomImage src={images[currentImageIndex] || normalizeImageUrl(product.image)} alt={product.name} />
              </Suspense>
              <button
                className="absolute top-4 right-4 md:top-6 md:right-6 flex h-12 w-12 items-center justify-center text-white/70 hover:text-white bg-black/40 hover:bg-black/80 rounded-full backdrop-blur-md transition-all active:scale-95 z-[99999]"
                onClick={() => setIsZoomed(false)}
                onPointerDown={() => setIsZoomed(false)}
                onTouchStart={() => setIsZoomed(false)}
                aria-label="Close Zoom"
              >
                <X size={24} />
              </button>
            </motion.div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
};

export default ProductQuickView;
