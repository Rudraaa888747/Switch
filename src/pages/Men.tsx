import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Grid3X3, LayoutGrid, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { products } from '@/data/products';
import menHeroBanner from '@/assets/men-hero-banner.webp';
import { useProducts } from '@/hooks/useProducts';

const Men = () => {
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: 'all',
    colors: [] as string[],
    sizes: [] as string[],
    occasion: 'all',
  });

  const priceRanges = [
    { label: 'All', value: 'all' },
    { label: 'Under ₹1000', value: '0-1000' },
    { label: '₹1000 - ₹2000', value: '1000-2000' },
    { label: '₹2000 - ₹3000', value: '2000-3000' },
    { label: 'Above ₹3000', value: '3000+' },
  ];

  const colors = ['Black', 'White', 'Navy', 'Grey', 'Blue', 'Olive'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const occasions = ['Casual', 'Formal', 'Party', 'Office', 'Travel'];
  
  const { data: dbProducts = [], isLoading, isError, refetch } = useProducts({ category: 'men', limit: 24 });
  const allMenProducts = dbProducts.length > 0 ? dbProducts : products.filter(p => p.category === 'men');

  const menProducts = useMemo(() => {
    let result = [...allMenProducts];

    // Price range filter
    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(v => v === '+' ? Infinity : parseInt(v));
      result = result.filter(p => {
        if (max === undefined) return p.price >= min;
        return p.price >= min && p.price <= max;
      });
    }

    // Color filter
    if (filters.colors.length > 0) {
      result = result.filter(p => 
        p.colors.some(c => filters.colors.some(fc => c.toLowerCase().includes(fc.toLowerCase())))
      );
    }

    // Size filter
    if (filters.sizes.length > 0) {
      result = result.filter(p => 
        p.sizes.some(s => filters.sizes.includes(s))
      );
    }

    // Occasion filter
    if (filters.occasion !== 'all') {
      result = result.filter(p => 
        p.occasion.includes(filters.occasion)
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'popular':
      default:
        result.sort((a, b) => b.reviews - a.reviews);
    }

    return result;
  }, [allMenProducts, filters, sortBy]);

  const toggleColor = (color: string) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color],
    }));
  };

  const toggleSize = (size: string) => {
    setFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const clearFilters = () => {
    setFilters({
      priceRange: 'all',
      colors: [],
      sizes: [],
      occasion: 'all',
    });
  };

  const activeFiltersCount = [
    filters.priceRange !== 'all',
    filters.colors.length > 0,
    filters.sizes.length > 0,
    filters.occasion !== 'all',
  ].filter(Boolean).length;

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60dvh] md:h-[70dvh] overflow-hidden">
        <img loading="lazy" decoding="async"
          src={menHeroBanner}
          alt="Men's Collection"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center px-4"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-[0.2em] text-white mb-6">
              MEN'S COLLECTION
            </h1>
            <p className="text-lg md:text-xl tracking-[0.3em] text-white/90 font-light">
              ADAPT. TRANSFORM. EXPRESS.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <div className="container-custom py-4">
          <nav className="text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer">Home</span>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">Men</span>
          </nav>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium tracking-wide text-foreground">FILTERS</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-foreground">PRICE</h3>
                <div className="space-y-3">
                  {priceRanges.map((range) => (
                    <label key={range.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="price"
                        checked={filters.priceRange === range.value}
                        onChange={() => setFilters(prev => ({ ...prev, priceRange: range.value }))}
                        className="w-4 h-4 border-2 border-border text-foreground focus:ring-0"
                      />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-foreground">COLORS</h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => toggleColor(color)}
                      className={`px-4 py-2 text-sm border transition-all ${
                        filters.colors.includes(color)
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-foreground">SIZES</h3>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`w-12 h-12 text-sm border transition-all ${
                        filters.sizes.includes(size)
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium tracking-wide text-foreground">OCCASION</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="occasion"
                      checked={filters.occasion === 'all'}
                      onChange={() => setFilters(prev => ({ ...prev, occasion: 'all' }))}
                      className="w-4 h-4 border-2 border-border text-foreground focus:ring-0"
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      All Occasions
                    </span>
                  </label>
                  {occasions.map((occ) => (
                    <label key={occ} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="occasion"
                        checked={filters.occasion === occ}
                        onChange={() => setFilters(prev => ({ ...prev, occasion: occ }))}
                        className="w-4 h-4 border-2 border-border text-foreground focus:ring-0"
                      />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {occ}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-10 pb-6 border-b border-border">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border hover:border-foreground transition-colors"
                >
                  <SlidersHorizontal size={18} />
                  <span className="text-sm tracking-wide">FILTERS</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 bg-foreground text-background text-xs flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                
                <p className="text-sm text-muted-foreground">
                  {menProducts.length} Products
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2 border border-border bg-background text-sm tracking-wide cursor-pointer focus:outline-none focus:border-foreground text-foreground"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Grid Toggle */}
                <div className="hidden md:flex items-center gap-1 border border-border">
                  <button
                    onClick={() => setGridSize('small')}
                    className={`p-2 transition-colors ${
                      gridSize === 'small' ? 'bg-foreground text-background' : 'hover:bg-muted text-foreground'
                    }`}
                    aria-label="Small grid"
                  >
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={() => setGridSize('large')}
                    className={`p-2 transition-colors ${
                      gridSize === 'large' ? 'bg-foreground text-background' : 'hover:bg-muted text-foreground'
                    }`}
                    aria-label="Large grid"
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading && dbProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse tracking-widest text-xs">LOADING MEN'S COLLECTION...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-20">
                <h3 className="text-xl font-medium mb-2 text-foreground">Unable to load products</h3>
                <p className="text-muted-foreground mb-6">Please check your connection and try again.</p>
                <button type="button" onClick={() => void refetch()} className="px-8 py-3 bg-foreground text-background text-sm tracking-wider hover:bg-foreground/90 transition-colors">TRY AGAIN</button>
              </div>
            ) : menProducts.length > 0 ? (
              <div className={`grid gap-6 md:gap-8 ${
                gridSize === 'large' 
                  ? 'grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}>
                {menProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-xl font-medium mb-2 text-foreground">No products found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters to find what you're looking for.
                </p>
                <button 
                  onClick={clearFilters} 
                  className="px-8 py-3 bg-foreground text-background text-sm tracking-wider hover:bg-foreground/90 transition-colors"
                >
                  CLEAR FILTERS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showFilters && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setShowFilters(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border z-50 lg:hidden overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-medium tracking-wide text-foreground">FILTERS</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Filter Content */}
              <div className="space-y-8">
                {/* Price Range */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-foreground">PRICE</h3>
                  <div className="space-y-3">
                    {priceRanges.map((range) => (
                      <label key={range.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="price-mobile"
                          checked={filters.priceRange === range.value}
                          onChange={() => setFilters(prev => ({ ...prev, priceRange: range.value }))}
                          className="w-4 h-4 border-2 border-border text-foreground"
                        />
                        <span className="text-sm text-muted-foreground">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-foreground">COLORS</h3>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`px-4 py-2 text-sm border transition-all ${
                          filters.colors.includes(color)
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-foreground">SIZES</h3>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`w-12 h-12 text-sm border transition-all ${
                          filters.sizes.includes(size)
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium tracking-wide text-foreground">OCCASION</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="occasion-mobile"
                        checked={filters.occasion === 'all'}
                        onChange={() => setFilters(prev => ({ ...prev, occasion: 'all' }))}
                        className="w-4 h-4 border-2 border-border text-foreground"
                      />
                      <span className="text-sm text-muted-foreground">All Occasions</span>
                    </label>
                    {occasions.map((occ) => (
                      <label key={occ} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="occasion-mobile"
                          checked={filters.occasion === occ}
                          onChange={() => setFilters(prev => ({ ...prev, occasion: occ }))}
                          className="w-4 h-4 border-2 border-border text-foreground"
                        />
                        <span className="text-sm text-muted-foreground">{occ}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="mt-8 pt-6 border-t border-border">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 bg-foreground text-background text-sm tracking-wider hover:bg-foreground/90 transition-colors"
                >
                  VIEW {menProducts.length} PRODUCTS
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
};

export default Men;
