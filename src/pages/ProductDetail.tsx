import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, ShoppingBag, Truck, RotateCcw, Shield, Star, Minus, Plus, ChevronDown, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import ProductReviews from '@/components/reviews/ProductReviews';
import ProductCard from '@/components/products/ProductCard';
import SmartRecommendations from '@/components/SmartRecommendations';
import { formatPrice } from '@/data/products';
import { ProductDetailSkeleton } from '@/components/ui/PageSkeleton';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { toast } from '@/hooks/use-toast';
import { cleanProductTitle, rewriteToLuxuryDescription, normalizeImageUrl } from '@/lib/utils';
import { useTrackBehavior } from '@/hooks/useTrackBehavior';
import { useProduct } from '@/hooks/useProduct';
import { useProducts } from '@/hooks/useProducts';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useIsMobile } from '@/hooks/use-mobile';
import useEmblaCarousel from 'embla-carousel-react';
import { useDocumentTitle } from '@/lib/utils';

const colorSwatchMap: Record<string, string> = {
  Black: '#000000',
  Navy: '#1a1a4e',
  White: '#ffffff',
  Cream: '#f5f5dc',
  'Blue Check': '#4a7cad',
  'Red Check': '#c44536',
  'Floral Pink': '#f8b4c4',
  'Floral Blue': '#87ceeb',
  'Dark Blue': '#1a3a5c',
  Pink: '#ffc0cb',
  Grey: '#808080',
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: dbProduct, isLoading } = useProduct(id || '');
  // Optimize: Only fetch a small subset for recent products mapping to avoid catalog overhead
  const { data: allProducts = [] } = useProducts({ limit: 40 });
  const product = dbProduct;
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { trackBehavior } = useTrackBehavior();
  const { addProduct: addRecent, getProducts: getRecent } = useRecentlyViewed();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [imgError, setImgError] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Sticky CTA Logic
  const inlineCtaRef = useRef<HTMLDivElement>(null);
  const [isStickyVisible, setIsStickyVisible] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [sizeErrorShake, setSizeErrorShake] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>('description');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<null | 'success'>(null);

  // Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useDocumentTitle(product ? `${product.name} | SWITCH` : 'Loading Product... | SWITCH');

  useEffect(() => {
    if (!isMobile) {
      setIsStickyVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-10px 0px 0px 0px' }
    );
    if (inlineCtaRef.current) {
      observer.observe(inlineCtaRef.current);
    }
    return () => observer.disconnect();
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !window.visualViewport) return;
    const vp = window.visualViewport;
    const handleResize = () => {
      // If viewport height is significantly less than window height, keyboard is likely open
      if (vp.height < window.innerHeight * 0.8) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };
    vp.addEventListener('resize', handleResize);
    return () => vp.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const defaultVariant = product?.variants?.[0] || null;
  const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
  const [activeImage, setActiveImage] = useState(defaultVariant?.images?.[0] || '');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'details'>('description');

  const inWishlist = product ? isInWishlist(product.id) : false;

  // Defensive Scroll Restoration & Scroll Lock Cleanup for Mobile
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.mobileMenu = 'closed';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    }
  }, []);

  // Reset scroll on product change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [product?.id]);

  useEffect(() => {
    if (id) trackBehavior(id, 'view');
  }, [id, trackBehavior]);

  useEffect(() => {
    if (product) addRecent(product);
  }, [product, addRecent]);

  useEffect(() => {
    if (product?.variants?.length) {
      const firstVariant = product.variants[0];
      setSelectedVariant(firstVariant);
      setActiveImage(firstVariant.images?.[0] || '');
      setSelectedSize('');
      setQuantity(1);
    }
  }, [product?.id, product?.variants]);

  const currentImages = useMemo(() => (selectedVariant?.images || []).filter((image): image is string => Boolean(image)), [selectedVariant]);
  const recentProducts = useMemo(() => getRecent(allProducts).filter((recentProduct) => recentProduct.id !== product?.id), [allProducts, getRecent, product?.id]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      // Sync activeImage
      const idx = emblaApi.selectedScrollSnap();
      if (currentImages[idx]) setActiveImage(currentImages[idx]);
    };
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, currentImages]);

  if (isLoading && !product) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="container-custom flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold">Product not found</h1>
        <p className="mb-8 text-muted-foreground">The product you are looking for does not exist or has been removed.</p>
        <Link to="/shop" className="btn-primary">
          Back to Shop
        </Link>
      </div>
    );
  }

  const handleVariantSelect = (variant: { color: string; images: string[] }) => {
    setSelectedVariant(variant);
    setActiveImage(variant.images?.[0] || '');
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeErrorShake(true);
      setTimeout(() => setSizeErrorShake(false), 500);
      toast({ title: 'Please select a size first', variant: 'destructive' });
      return;
    }
    if (!selectedVariant) {
      toast({ title: 'Please select a color', variant: 'destructive' });
      return;
    }
    addToCart(product, selectedSize, selectedVariant.color, quantity);
    trackBehavior(product.id, 'cart_add');
    toast({ title: 'Added to cart', description: `${product.name} has been added to your cart.` });
  };

  const handleBuyNow = () => {
    if (!selectedSize || !selectedVariant) {
      toast({ title: 'Please select size and color', variant: 'destructive' });
      return;
    }
    addToCart(product, selectedSize, selectedVariant.color, quantity);
    trackBehavior(product.id, 'cart_add');
    navigate('/checkout');
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product);
    if (!inWishlist) trackBehavior(product.id, 'wishlist_add');
    toast({
      title: inWishlist ? 'Removed from wishlist' : 'Added to wishlist',
      description: inWishlist ? `${product.name} has been removed from your wishlist.` : `${product.name} has been added to your wishlist.`,
    });
  };

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    const currentIndex = currentImages.indexOf(activeImage);
    if (direction === 'prev') {
      const newIndex = currentIndex === 0 ? currentImages.length - 1 : currentIndex - 1;
      setActiveImage(currentImages[newIndex]);
    } else {
      const newIndex = currentIndex === currentImages.length - 1 ? 0 : currentIndex + 1;
      setActiveImage(currentImages[newIndex]);
    }
  };

  return (
    <>
      {/* Mobile Scroll Progress Indicator */}
      <motion.div
        className="fixed top-[var(--mobile-safe-top,0px)] left-0 right-0 h-[2px] bg-foreground z-[100] lg:hidden origin-left"
        style={{ scaleX }}
      />


      <div className="container-custom pt-6 md:pt-20 lg:pt-24 pb-20 md:pb-16">
        
        {/* Mobile Back Button */}
        <div className="lg:hidden fixed top-4 left-4 z-40">
          <button 
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/shop');
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-14">
          <div className="space-y-4">
            {/* Desktop Gallery (Hidden on Mobile) */}
            <div className="hidden lg:block theme-elevated group relative overflow-hidden rounded-[2rem] p-3">
              <div className="theme-image-stage flex aspect-[3/4] items-center justify-center overflow-hidden rounded-3xl bg-[#0a0a0a] relative">
                {!imageLoaded[activeImage] && !imageErrors[activeImage] && (
                  <div className="absolute inset-0 z-0 bg-[#0a0a0a] bg-gradient-to-r from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] bg-[length:200%_100%] animate-shimmer" />
                )}
                <img 
                  key={activeImage} 
                  src={imageErrors[activeImage] ? '/placeholder.svg' : (activeImage || '/placeholder.svg')} 
                  alt={product.name} 
                  className={`h-full w-full object-cover object-[center_top] transition-all duration-1000 group-hover:scale-[1.05] relative z-10 ${imageLoaded[activeImage] || imageErrors[activeImage] ? 'opacity-100' : 'opacity-0'}`} 
                  loading="eager" 
                  fetchPriority="high" 
                  decoding="sync" 
                  onLoad={() => setImageLoaded(prev => ({ ...prev, [activeImage]: true }))}
                  onError={() => {
                    setImgError(true);
                    setImageErrors(prev => ({ ...prev, [activeImage]: true }));
                  }} 
                />
              </div>

              <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                {product.isNew && <span className="badge-new">New Arrival</span>}
                {product.discount && product.discount > 0 && <span className="badge-sale">{product.discount}% OFF</span>}
              </div>

              {currentImages.length > 1 && (
                <>
                  <button onClick={() => handleImageNavigation('prev')} className="absolute left-6 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-black/60 active:scale-90">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => handleImageNavigation('next')} className="absolute right-6 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-black/60 active:scale-90">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}

              <motion.button
                onClick={handleWishlistToggle}
                className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-300 ${inWishlist ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/10 bg-background/60 text-foreground hover:border-foreground/30 hover:bg-background/80'
                  }`}
                whileTap={{ scale: 0.94 }}
              >
                <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
              </motion.button>
            </div>

            {currentImages.length > 1 && (
              <div className="hidden lg:flex items-center gap-3">
                <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
                  {currentImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(image)}
                      className={`theme-surface h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border transition-all duration-300 ${activeImage === image ? 'border-foreground ring-1 ring-foreground/20 shadow-[0_18px_36px_-26px_hsl(var(--foreground)/0.6)]' : 'border-border opacity-60 hover:opacity-100'
                        }`}
                    >
                      <div className="theme-image-stage h-full w-full bg-[#0a0a0a]">
                        <img 
                          src={imageErrors[image] ? '/placeholder.svg' : image} 
                          alt={product.name} 
                          className="h-full w-full object-cover object-[center_top] transition-transform duration-300 hover:scale-105" 
                          loading="lazy" 
                          onError={() => setImageErrors(prev => ({ ...prev, [image]: true }))}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                <span className="hidden flex-shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[10px] text-muted-foreground sm:flex">
                  <span className="font-medium text-foreground/80">{currentImages.indexOf(activeImage) + 1}</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span>{currentImages.length}</span>
                </span>
              </div>
            )}

            {/* Mobile Gallery (Embla Carousel) */}
            <div className="lg:hidden relative -mx-4">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y">
                  {currentImages.map((image, idx) => (
                    <div key={idx} className="flex-[0_0_100%] min-w-0 px-4">
                      <div 
                        className="theme-elevated relative overflow-hidden rounded-[2rem] p-2 bg-[#0a0a0a]"
                        onClick={() => setIsLightboxOpen(true)}
                      >
                        <div className="aspect-[3/4] flex items-center justify-center overflow-hidden rounded-3xl bg-[#0a0a0a] relative">
                          {!imageLoaded[image] && !imageErrors[image] && (
                            <div className="absolute inset-0 z-0 bg-[#0a0a0a] bg-gradient-to-r from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] bg-[length:200%_100%] animate-shimmer" />
                          )}
                          <img 
                            src={imageErrors[image] ? '/placeholder.svg' : image} 
                            alt={`${product.name} ${idx + 1}`} 
                            className={`h-full w-full object-cover object-[center_top] relative z-10 transition-opacity duration-500 ${imageLoaded[image] || imageErrors[image] ? 'opacity-100' : 'opacity-0'}`} 
                            loading={idx === 0 ? "eager" : "lazy"} 
                            onLoad={() => setImageLoaded(prev => ({ ...prev, [image]: true }))}
                            onError={() => setImageErrors(prev => ({ ...prev, [image]: true }))}
                          />
                        </div>
                        {idx === 0 && (
                          <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                            {product.isNew && <span className="badge-new">New Arrival</span>}
                            {product.discount && product.discount > 0 && <span className="badge-sale">{product.discount}% OFF</span>}
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleWishlistToggle(); }}
                          className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-all ${inWishlist ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/10 bg-background/60 text-foreground'}`}
                        >
                          <Heart size={16} className={inWishlist ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {currentImages.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                  {currentImages.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === selectedIndex ? 'w-4 bg-foreground' : 'w-1.5 bg-foreground/20'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Lightbox */}
            {isLightboxOpen && (
              <div 
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center"
                onClick={() => setIsLightboxOpen(false)}
              >
                <button 
                  className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full h-full p-4 flex items-center justify-center overflow-auto"
                >
                  {/* For a true pinch-to-zoom, we'd need a specialized library, but scaling CSS serves as a fallback. Here we just show the image large. */}
                  <img loading="eager" fetchpriority="high" src={currentImages[selectedIndex]} alt="Zoomed" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                </motion.div>
              </div>
            )}
          </div>

          <div className="space-y-7 lg:pt-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{product.brand || 'Premium'}</span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{product.category}</span>
              </div>
              <h1 className="text-[clamp(1.8rem,6vw,3.2rem)] font-normal leading-[1.1] tracking-[-0.01em]">{cleanProductTitle(product.name)}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} size={15} className={index < Math.floor(product.rating) ? 'fill-foreground text-foreground' : 'text-muted-foreground/70 dark:text-muted-foreground/40'} />
                  ))}
                </div>
                <button className="flex h-9 items-center justify-center rounded-full px-1 text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline">({product.reviews} reviews)</button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl font-semibold tracking-tight">{formatPrice(product.price)}</span>
                {product.originalPrice && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>}
              </div>
            </div>

            <div className="pt-4">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-5">
                <div>
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-foreground">Configure Fit</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Select finish, size and quantity</p>
                </div>
                <div className="rounded-full bg-foreground/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground">
                  Ready to ship
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Color</h3>
                  <span className="text-sm text-muted-foreground">{selectedVariant?.color || 'Select'}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((variant) => {
                    const swatchColor = variant.colorHex || colorSwatchMap[variant.color] || '#cccccc';
                    const isSelected = selectedVariant?.color === variant.color;
                    const isLight = ['White', 'Cream', 'Floral Pink', 'Pink'].includes(variant.color);
                    return (
                      <button
                        key={variant.color}
                        onClick={() => handleVariantSelect(variant)}
                        className={`relative h-12 w-12 rounded-full border border-border/60 transition-all duration-300 ${isSelected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105 shadow-[0_18px_34px_-24px_hsl(var(--foreground)/0.5)]' : 'hover:ring-2 hover:ring-foreground/40 hover:ring-offset-2 hover:ring-offset-background hover:scale-105 active:scale-95'}`}
                        style={{ backgroundColor: swatchColor }}
                        title={variant.color}
                      >
                        {isSelected && <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isLight ? 'text-foreground' : 'text-white'}`}>✓</span>}
                        {isLight && <span className="absolute inset-0 rounded-full border border-border" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Size</h3>
                  {sizeErrorShake && <span className="text-xs text-rose-500 animate-pulse">Required</span>}
                  <Link to="/size-guide" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Size Guide</Link>
                </div>
                <div className={`grid grid-cols-4 gap-2.5 ${sizeErrorShake ? 'animate-[shake_0.5s_ease-in-out] ring-2 ring-rose-500/50 rounded-xl p-1 -m-1' : ''}`}>
                  {product.sizes.map((size) => {
                    const isOutOfStock = product.stockQuantity === 0 || (size === '3XL' && product.id.length % 2 === 0);
                    return (
                      <div key={size} className="relative group">
                        <button
                          onClick={() => setSelectedSize(size)}
                          className={`w-full min-h-[3rem] rounded-xl border text-sm font-medium transition-all duration-300 ${
                            isOutOfStock 
                              ? 'opacity-40 border-border bg-muted/30 cursor-not-allowed decoration-muted-foreground/50' 
                              : selectedSize === size 
                                ? 'border-foreground bg-foreground text-background shadow-[0_18px_34px_-24px_hsl(var(--foreground)/0.55)]' 
                                : 'border-border bg-background hover:border-foreground/40 hover:bg-muted/70 dark:hover:bg-muted/30 active:scale-95'
                          }`}
                        >
                          <span className={isOutOfStock ? 'line-through text-muted-foreground' : ''}>{size}</span>
                        </button>
                        {isOutOfStock && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 rounded bg-foreground px-2 py-1 text-[10px] text-background opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                            Out of Stock
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Quantity</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Refined compact stepper.</p>
                </div>
                <div className="flex items-center rounded-full border border-border bg-background p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                  <button onClick={() => setQuantity((prev) => Math.max(1, prev - 1))} className="touch-target h-11 w-11 flex items-center justify-center rounded-full transition-colors hover:bg-muted/50 active:scale-90">
                    <Minus size={15} />
                  </button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
                  <button onClick={() => setQuantity((prev) => prev + 1)} className="touch-target h-11 w-11 flex items-center justify-center rounded-full transition-colors hover:bg-muted/50 active:scale-90">
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden gap-4 md:flex">
              {product.stockQuantity === 0 || (selectedSize === '3XL' && product.id.length % 2 === 0) ? (
                <motion.button 
                  onClick={() => toast({ title: "You're on the list!", description: `We'll notify you when ${product.name} is back in stock.` })} 
                  className="btn-outline flex-1 border-foreground text-foreground hover:bg-foreground hover:text-background" 
                  whileTap={{ scale: 0.98 }}
                >
                  Notify Me When Available
                </motion.button>
              ) : (
                <>
                  <motion.button onClick={handleAddToCart} className="btn-outline flex-1" whileTap={{ scale: 0.98 }}>
                    Add to Cart
                  </motion.button>
                  <motion.button onClick={handleBuyNow} className="btn-primary flex-1 btn-shine" whileTap={{ scale: 0.98 }}>
                    Buy Now
                  </motion.button>
                </>
              )}
            </div>

            {/* Mobile Inline Add to Cart */}
            <div className="lg:hidden mt-4" ref={inlineCtaRef}>
              {product.stockQuantity === 0 || (selectedSize === '3XL' && product.id.length % 2 === 0) ? (
                <button 
                  onClick={() => toast({ title: "You're on the list!", description: `We'll notify you when ${product.name} is back in stock.` })} 
                  className="w-full h-12 rounded-full border-2 border-foreground bg-background text-foreground font-semibold active:scale-[0.98] transition-transform"
                >
                  Notify Me
                </button>
              ) : (
                <button 
                  onClick={handleAddToCart} 
                  className="w-full h-12 rounded-full bg-foreground text-background font-semibold active:scale-[0.98] transition-transform"
                >
                  Add to Cart
                </button>
              )}
            </div>

            {/* Trust Signals */}
            <div className="mt-6 flex flex-col gap-3 py-4 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm text-foreground/80">
                <Truck size={16} className="text-muted-foreground" />
                <span>Complimentary Premium Shipping over {formatPrice(2000)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/80">
                <RotateCcw size={16} className="text-muted-foreground" />
                <span>14-Day Free Returns</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/80">
                <Shield size={16} className="text-muted-foreground" />
                <span>Secure Checkout Guarantees</span>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden lg:block pt-2 border-t border-border mt-12">
              <div className="flex gap-6 border-b border-border">
                {(['description', 'details'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-xs font-medium uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab ? 'border-b border-foreground text-foreground' : 'border-b border-transparent text-muted-foreground hover:text-foreground/70'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="py-5">
                {activeTab === 'description' ? (
                  <div className="space-y-4">
                    {rewriteToLuxuryDescription(product.description).split('\n\n').map((paragraph, index) =>
                      paragraph.trim() ? (
                        <p key={index} className="text-sm leading-7 text-foreground/80">
                          {paragraph.trim()}
                        </p>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Fabric</p>
                        <p className="mt-1 font-medium">{product.fabric}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Occasion</p>
                        <p className="mt-1 font-medium">{product.occasion.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Category</p>
                        <p className="mt-1 font-medium capitalize">{product.category}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Brand</p>
                        <p className="mt-1 font-medium">{product.brand || 'Premium'}</p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-6">
                      <h4 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Model Details</h4>
                      <p className="text-sm">Model is 6'1" (185 cm) and wears a size L.</p>
                      <p className="mt-2 text-sm text-muted-foreground">Garment fits true to size. For an oversized fit, we recommend sizing up.</p>
                    </div>

                    <div className="border-t border-border pt-6">
                      <h4 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Material & Care</h4>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        <li>100% Premium {product.fabric || 'Cotton'}</li>
                        <li>Heavyweight construction</li>
                        <li>Machine wash cold inside out</li>
                        <li>Do not tumble dry</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Accordions */}
            <div className="lg:hidden mt-8 space-y-3">
              {[
                { id: 'description', label: 'Product Details' },
                { id: 'fabric', label: 'Fabric & Care' },
                { id: 'shipping', label: 'Shipping & Returns' },
                { id: 'size-guide', label: 'Size Guide' },
              ].map((section) => (
                <div key={section.id} className="border border-border rounded-xl overflow-hidden bg-background">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === section.id ? '' : section.id)} 
                    className="flex touch-target items-center justify-between w-full p-4 text-left font-semibold text-sm"
                  >
                    {section.label}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openAccordion === section.id ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === section.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-4 pt-0 text-sm text-muted-foreground leading-relaxed">
                          {section.id === 'description' && rewriteToLuxuryDescription(product.description)}
                          {section.id === 'fabric' && (
                            <ul className="list-inside list-disc space-y-1">
                              <li>100% Premium {product.fabric || 'Cotton'}</li>
                              <li>Heavyweight construction</li>
                              <li>Machine wash cold inside out</li>
                            </ul>
                          )}
                          {section.id === 'shipping' && (
                            <p>Free standard shipping on orders over ₹999. Easy 14-day return policy. Items must be unworn with tags attached.</p>
                          )}
                          {section.id === 'size-guide' && (
                            <div>
                              <p>Model is 6'1" (185 cm) and wears a size L. Garment fits true to size. For an oversized fit, we recommend sizing up.</p>
                              <Link to="/size-guide" className="inline-flex items-center gap-1.5 mt-3 text-foreground text-xs font-medium underline underline-offset-4 hover:no-underline">
                                View Full Size Guide <ArrowRight size={11} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-16 border-t border-border pt-12">
          <ProductReviews productId={product.id} />
        </section>

        <div className="space-y-16 mt-16">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "200px" }}>
            <SmartRecommendations currentProductId={product.id} type="similar" limit={4} />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "200px" }}>
            <SmartRecommendations currentProductId={product.id} type="complete-look" limit={4} />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "200px" }}>
            <SmartRecommendations type="trending" limit={4} />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "200px" }}>
            <SmartRecommendations type="new-arrivals" limit={4} />
          </motion.div>
        </div>

        {recentProducts.length > 0 && (
          <section className="mt-16 pb-16">
            <h3 className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Recently Viewed</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {recentProducts.slice(0, 4).map((recentProduct, index) => (
                <ProductCard key={recentProduct.id} product={recentProduct} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      {isMobile && !isKeyboardOpen && (
        <div className={`sticky-mobile-bottom px-4 pb-4 transition-all duration-300 ${isStickyVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          <div className="mobile-glass-panel flex items-center justify-between rounded-full bg-background/80 px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-2xl border border-border/50">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{selectedSize ? `Size ${selectedSize}` : 'Select Size'}</span>
              <span className="text-base font-semibold">{formatPrice(product.price)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleWishlistToggle} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50">
                <Heart size={16} className={inWishlist ? 'fill-foreground' : ''} />
              </button>
              {product.stockQuantity === 0 || (selectedSize === '3XL' && product.id.length % 2 === 0) ? (
                <button 
                  onClick={() => toast({ title: "You're on the list!", description: `We'll notify you when ${product.name} is back in stock.` })} 
                  className="rounded-full border border-foreground bg-background text-foreground px-6 py-3.5 text-[10px] font-semibold"
                >
                  Notify Me
                </button>
              ) : (
                <button onClick={handleAddToCart} className="btn-primary rounded-full px-6 py-3.5 text-[10px]">
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductDetail;
