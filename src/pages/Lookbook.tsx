import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ShoppingBag, Eye } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { formatPrice, Product } from '@/data/products';
import { useDocumentTitle } from '@/lib/utils';

/* ─── helpers ─── */
const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  );
};

/* ─── stories config ─── */
const STORIES = [
  {
    title: 'Urban Elegance',
    subtitle: 'City-ready sophistication',
    description: 'Where clean lines meet intentional design. Pieces crafted for those who move through the city with purpose and style.',
    mood: 'Structured silhouettes. Muted palettes. Quiet confidence.',
    filter: { category: 'men' as const, limit: 4 },
  },
  {
    title: 'Weekend Drift',
    subtitle: 'Effortless off-duty style',
    description: 'Relaxed, refined, and ready for whatever the weekend brings. Premium comfort meets understated luxury.',
    mood: 'Soft textures. Easy fits. Unforced cool.',
    filter: { category: 'women' as const, limit: 4 },
  },
  {
    title: 'Night Mode',
    subtitle: 'After-dark essentials',
    description: 'From dinner reservations to rooftop conversations. Pieces that transition seamlessly into the evening.',
    mood: 'Dark tones. Sharp cuts. Statement simplicity.',
    filter: { category: 'men' as const, limit: 4 },
  },
];

/* ─── product card in lookbook ─── */
const LookbookProductCard = ({ product, index, variant = 'default' }: { product: Product; index: number; variant?: 'default' | 'large' | 'wide' }) => {
  const [hovered, setHovered] = useState(false);
  const img = product.variants?.[0]?.images?.[0] || product.image || '/placeholder.svg';

  const sizeClasses = {
    default: 'aspect-[3/4]',
    large: 'aspect-[3/4] md:aspect-[2/3]',
    wide: 'aspect-[4/3] md:aspect-[16/9]',
  };

  return (
    <Reveal delay={index * 0.1}>
      <Link
        to={`/product/${product.id}`}
        className="group relative block overflow-hidden rounded-2xl bg-[#111]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={`relative overflow-hidden ${sizeClasses[variant]}`}>
          <motion.img
            src={img}
            alt={product.name}
            className="h-full w-full object-cover object-[center_top]"
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Hover info */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-5 md:p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 16 }}
            transition={{ duration: 0.35 }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 mb-1">{product.category}</p>
            <h3 className="text-white font-medium text-sm md:text-base leading-snug mb-2 line-clamp-2">{product.name}</h3>
            <div className="flex items-center justify-between">
              <span className="text-white/90 text-sm font-semibold">{formatPrice(product.price)}</span>
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70">
                Shop <ArrowUpRight size={11} />
              </span>
            </div>
          </motion.div>

          {/* Corner badge */}
          {product.isNew && (
            <span className="absolute top-4 left-4 bg-white text-black text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full">
              New
            </span>
          )}
        </div>
      </Link>
    </Reveal>
  );
};

/* ─── story section ─── */
const StorySection = ({ story, products, index }: { story: typeof STORIES[0]; products: Product[]; index: number }) => {
  const isReversed = index % 2 !== 0;

  if (!products.length) return null;

  return (
    <section className="py-16 md:py-24">
      {/* Story header */}
      <div className={`flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14 ${isReversed ? 'md:flex-row-reverse md:text-right' : ''}`}>
        <Reveal>
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-3">
              Story {String(index + 1).padStart(2, '0')}
            </p>
            <h2 className="text-3xl md:text-5xl font-light tracking-[-0.02em] mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {story.title}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
              {story.description}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="text-[11px] italic text-muted-foreground/60 max-w-xs leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px' }}>
            "{story.mood}"
          </p>
        </Reveal>
      </div>

      {/* Asymmetric grid */}
      {index === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4">
          {products[0] && <div className="col-span-2 md:col-span-7"><LookbookProductCard product={products[0]} index={0} variant="large" /></div>}
          <div className="col-span-2 md:col-span-5 grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-4">
            {products[1] && <LookbookProductCard product={products[1]} index={1} />}
            {products[2] && <LookbookProductCard product={products[2]} index={2} />}
          </div>
          {products[3] && <div className="col-span-2 md:col-span-12"><LookbookProductCard product={products[3]} index={3} variant="wide" /></div>}
        </div>
      )}

      {index === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {products.map((p, i) => (
            <div key={p.id} className={i === 0 ? 'col-span-2 md:col-span-1 md:row-span-2' : ''}>
              <LookbookProductCard product={p} index={i} variant={i === 0 ? 'large' : 'default'} />
            </div>
          ))}
        </div>
      )}

      {index === 2 && (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
          {products.map((p, i) => (
            <LookbookProductCard key={p.id} product={p} index={i} variant={i % 3 === 0 ? 'large' : 'default'} />
          ))}
        </div>
      )}

      {/* Shop this story CTA */}
      <Reveal delay={0.2}>
        <div className="mt-8 md:mt-12 flex justify-center">
          <Link
            to={`/shop?category=${story.filter.category}`}
            className="group inline-flex items-center gap-3 border border-border/60 rounded-full px-7 py-3.5 text-[10px] uppercase tracking-[0.3em] font-medium text-foreground/80 hover:bg-foreground hover:text-background transition-all duration-400"
          >
            Shop {story.title}
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
};

/* ─── main page ─── */
const Lookbook = () => {
  useDocumentTitle('Lookbook | SWITCH');

  const { data: menProducts = [] } = useProducts({ category: 'men', limit: 8 });
  const { data: womenProducts = [] } = useProducts({ category: 'women', limit: 4 });

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const storyProducts = [
    menProducts.slice(0, 4),
    womenProducts.slice(0, 4),
    menProducts.slice(4, 8),
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <div ref={heroRef} className="relative h-[85dvh] md:h-[90dvh] overflow-hidden bg-black">
        {/* Background image from first product */}
        {menProducts[0] && (
          <motion.div className="absolute inset-0" style={{ y: heroY }}>
            <img loading="lazy" decoding="async"
              src={menProducts[0].variants?.[0]?.images?.[0] || menProducts[0].image}
              alt="Lookbook hero"
              className="h-full w-full object-cover object-[center_top] opacity-50"
            />
          </motion.div>
        )}

        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        <motion.div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center" style={{ opacity: heroOpacity }}>
          <motion.p
            className="text-[10px] uppercase tracking-[0.6em] text-white/50 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Season Collection 2026
          </motion.p>
          <motion.h1
            className="font-serif text-5xl md:text-8xl lg:text-[9rem] font-light text-white tracking-normal leading-[0.9]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Look<em className="font-light">book</em>
          </motion.h1>
          <motion.p
            className="mt-6 text-white/40 text-sm md:text-base max-w-lg leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            Curated stories. Styled pieces. A visual journey through modular fashion designed for the way you actually live.
          </motion.p>
          <motion.div
            className="mt-10 flex items-center gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <Link
              to="/shop"
              className="inline-flex items-center gap-2.5 bg-white text-black px-7 py-3.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-white/90 transition-colors"
            >
              <ShoppingBag size={13} /> Shop Collection
            </Link>
            <a
              href="#stories"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white/80 transition-colors"
            >
              <Eye size={13} /> Explore
            </a>
          </motion.div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* ── Brand Statement ── */}
      <div className="container-custom py-20 md:py-28 text-center">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground mb-6">The Philosophy</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2
            className="font-serif text-3xl md:text-4xl lg:text-5xl font-light leading-tight max-w-3xl mx-auto text-foreground/90 tracking-normal"
          >
            Fashion should adapt to <em>your</em> life — not the other way around.
            Every piece in our lookbook is designed to <em>switch</em> seamlessly between moments.
          </h2>
        </Reveal>
      </div>

      {/* ── Divider ── */}
      <div className="container-custom">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── Stories ── */}
      <div id="stories" className="container-custom">
        {STORIES.map((story, i) => (
          <div key={story.title}>
            <StorySection story={story} products={storyProducts[i]} index={i} />
            {i < STORIES.length - 1 && <div className="h-px bg-border/30" />}
          </div>
        ))}
      </div>

      {/* ── Bottom CTA ── */}
      <section className="py-20 md:py-32 text-center bg-foreground text-background">
        <div className="container-custom">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.5em] text-background/40 mb-6">Ready to Switch?</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-light leading-[1.15] max-w-2xl mx-auto mb-10"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Your wardrobe, <em>reimagined</em>.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2.5 bg-background text-foreground px-8 py-4 rounded-full text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-background/90 transition-colors"
              >
                <ShoppingBag size={13} /> Shop All
              </Link>
              <Link
                to="/style-advisor"
                className="inline-flex items-center gap-2.5 border border-background/20 text-background px-8 py-4 rounded-full text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-background/10 transition-colors"
              >
                Get Style Advice <ArrowRight size={13} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default Lookbook;
