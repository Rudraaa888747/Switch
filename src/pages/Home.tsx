import { Link } from 'react-router-dom';
import { motion, type Easing, AnimatePresence, useInView } from 'framer-motion';
import { ArrowRight, Zap, RotateCcw, Shield, Star, Loader2 } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/products/ProductCard';
import HeroCinematic from '@/components/HeroCinematic';
import categoryOuterwear from '@/assets/category-outerwear.webp';
import categoryBottoms from '@/assets/category-bottoms.webp';
import categoryAccessories from '@/assets/category-accessories.webp';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/PageTransition';
import SmartRecommendations from '@/components/SmartRecommendations';
import { useProducts } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/lib/utils';
import NewsletterSection from '@/components/NewsletterSection';

// Premium easing curve
const premiumEase: Easing = [0.4, 0, 0.2, 1];

// ==========================================
// NEW UI FEATURES
// ==========================================

const MARQUEE_ITEMS = [
  'Free shipping on orders over ₹999', '◆', 'Premium modular design', '◆',
  'Easy 30-day returns', '◆', 'Sustainably crafted', '◆', 'New drops every Friday', '◆',
];

const Marquee = ({ inverted = false }: { inverted?: boolean }) => {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className={`overflow-hidden py-3 ${inverted ? 'bg-black border-y border-white/10' : 'bg-black text-white'}`}>
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      >
        {items.map((item, i) => (
          <span key={i} className="inline-block text-[10px] uppercase tracking-[0.2em] font-medium shrink-0 text-white">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const start = performance.now();
    const dur = 1600;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

const Reveal = ({ children, delay = 0, className = '', y = 28 }: { children: React.ReactNode; delay?: number; className?: string; y?: number; }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

const Home = () => {
  useDocumentTitle('SWITCH | Premium Modular Fashion');

  // Fetch men and women products separately
  const { data: menProducts = [], isLoading: isLoadingMen, isError: isMenError, refetch: refetchMen } = useProducts({ category: 'men', limit: 4 });
  const { data: womenProducts = [], isLoading: isLoadingWomen, isError: isWomenError, refetch: refetchWomen } = useProducts({ category: 'women', limit: 4 });
  const isLoadingProducts = isLoadingMen || isLoadingWomen;
  const hasProductLoadError = isMenError || isWomenError;

  const retryProductLoad = () => {
    void refetchMen();
    void refetchWomen();
  };

  const categories = [
    {
      title: 'Modular Outerwear',
      image: categoryOuterwear,
      link: '/shop?subcategory=jackets',
    },
    {
      title: 'Versatile Bottoms',
      image: categoryBottoms,
      link: '/shop?subcategory=pants',
    },
    {
      title: 'Adaptable Accessories',
      image: categoryAccessories,
      link: '/shop?subcategory=accessories',
    },
  ];

  const perks = [
    { Icon: Zap, title: 'Fast delivery', desc: '2–4 day shipping across India' },
    { Icon: RotateCcw, title: 'Easy returns', desc: 'Hassle-free 30-day return window' },
    { Icon: Shield, title: 'Secure payments', desc: 'UPI, cards & wallets accepted' },
    { Icon: Star, title: 'Premium quality', desc: 'Crafted to last seasons, not trends' },
  ];

  const [email, setEmail] = useState('');
  const [subbed, setSubbed] = useState(false);
  const handleSub = useCallback(() => {
    if (email.includes('@')) setSubbed(true);
  }, [email]);

  return (
    <>
      <HeroCinematic />

      {/* ── TRUST MARQUEE ── */}
      <Marquee />

      {/* Feature Strip - Three Categories with staggered slide-in */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container-custom">
          <StaggerContainer className="grid md:grid-cols-3 gap-8 md:gap-12" staggerDelay={0.15}>
            {categories.map((category, index) => (
              <StaggerItem key={category.title}>
                <Link to={category.link} className="group block category-card">
                  <motion.div
                    className="text-center mb-6"
                    initial={{ opacity: 0, x: index === 0 ? -30 : index === 2 ? 30 : 0 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.6, ease: premiumEase }}
                  >
                    <h3 className="text-xs uppercase tracking-[0.2em] font-medium">
                      {category.title}
                    </h3>
                  </motion.div>
                  <motion.div
                    className="aspect-square overflow-hidden bg-muted relative"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.4, ease: premiumEase }}
                  >
                    <motion.img
                      src={category.image}
                      alt={category.title}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.6, ease: premiumEase }}
                    />
                    {/* 3D depth shadow on hover */}
                    <motion.div
                      className="absolute inset-0 shadow-[0_20px_50px_-15px_hsl(var(--foreground)/0.3)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-luxury-panel section-seam py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16">
          <div className="grid grid-cols-2 gap-5 md:gap-8 lg:grid-cols-4">
            {[
              { n: 50000, s: '+', l: 'Happy customers' },
              { n: 120, s: '+', l: 'Modular pieces' },
              { n: 98, s: '%', l: 'Satisfaction' },
              { n: 4, s: ' yrs', l: 'Of innovation' },
            ].map((stat, i) => (
              <Reveal key={stat.l} delay={i * 0.08} className="rounded-[1.4rem] px-3 py-4 text-center">
                <p className="text-[2.15rem] md:text-[2.8rem] font-light tracking-tight text-foreground">
                  <Counter to={stat.n} suffix={stat.s} />
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/75">{stat.l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid with staggered fade-up */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container-custom">
          {/* Men's Collection */}
          <ScrollReveal className="text-center mb-12">
            <motion.h2
              className="text-xs uppercase tracking-[0.2em] font-medium text-muted-foreground mb-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Menswear
            </motion.h2>
            <motion.p
              className="text-2xl md:text-3xl font-light tracking-wide"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              For Him
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }}>
              <Link to="/men" className="text-[10px] sm:text-xs underline underline-offset-4 uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors mt-5 inline-block">
                Explore More
              </Link>
            </motion.div>
          </ScrollReveal>

          <div className="relative min-h-[200px]">
            {isLoadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-light tracking-widest text-xs uppercase">Loading collection...</p>
              </div>
            ) : hasProductLoadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <p className="text-muted-foreground">We couldn’t load the collection. Please try again.</p>
                <button type="button" onClick={retryProductLoad} className="btn-outline">Try again</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {menProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* Women's Collection */}
          <ScrollReveal className="text-center mb-12 mt-20">
            <motion.h2
              className="text-xs uppercase tracking-[0.2em] font-medium text-muted-foreground mb-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Womenswear
            </motion.h2>
            <motion.p
              className="text-2xl md:text-3xl font-light tracking-wide"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              For Her
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }}>
              <Link to="/women" className="text-[10px] sm:text-xs underline underline-offset-4 uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors mt-5 inline-block">
                Explore More
              </Link>
            </motion.div>
          </ScrollReveal>

          <div className="relative min-h-[200px]">
            {isLoadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-light tracking-widest text-xs uppercase">Loading collection...</p>
              </div>
            ) : hasProductLoadError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <p className="text-muted-foreground">We couldn’t load the collection. Please try again.</p>
                <button type="button" onClick={retryProductLoad} className="btn-outline">Try again</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {womenProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* Curated Picks */}
          <section className="mt-20">
            <SmartRecommendations type="curated" limit={4} />
          </section>

          <ScrollReveal delay={0.4} className="text-center mt-12">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 btn-outline btn-shine group"
            >
              View All Products
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── EDITORIAL BANNER ── */}
      <section className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        <div className="grid md:grid-cols-2 min-h-[420px]">
          {/* Image side */}
          <div className="relative h-72 md:h-auto overflow-hidden">
            <motion.img
              src={'/premium-wardrobe.png'}
              alt="SWITCH philosophy"
              className="w-full h-full object-cover"
              initial={{ scale: 1.06 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Text side */}
          <div className="bg-foreground text-background flex items-center px-8 md:px-14 py-14 md:py-20">
            <Reveal y={24}>
              <p className="text-background/45 text-[10px] uppercase tracking-[0.3em] mb-4">Our Philosophy</p>
              <h2 className="font-serif text-3xl md:text-5xl font-light tracking-normal leading-tight mb-5">
                One wardrobe,<br />infinite expressions.
              </h2>
              <p className="text-background/55 text-sm font-light leading-relaxed mb-8 max-w-xs">
                Every SWITCH piece is engineered to connect, layer and transform — so your wardrobe grows with your lifestyle, not against it.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 border border-background/30 text-background px-7 py-3 text-[11px] uppercase tracking-[0.18em]
                           hover:bg-background hover:text-foreground transition-all duration-300 group"
              >
                Our Story
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── PERKS ── */}
      <section className="py-16 md:py-24 bg-muted/12 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {perks.map(({ Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.08} className="text-center group">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border/50 transition-all duration-500 group-hover:border-foreground/30 group-hover:shadow-[0_0_24px_-8px_hsl(var(--foreground)/0.12)]">
                  <Icon size={17} strokeWidth={1.3} className="text-foreground/60 transition-all duration-500 group-hover:text-foreground/90" />
                </div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/90">{title}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground/80">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Marquee inverted />

      {/* ── NEWSLETTER ── */}
      <NewsletterSection />
    </>
  );
};

export default Home;
