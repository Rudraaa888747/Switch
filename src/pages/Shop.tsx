import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Grid3X3, LayoutGrid, SlidersHorizontal, Loader2 } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { products } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/lib/utils';

const BATCH_SIZE = 24;

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const filterParam = searchParams.get('filter');
  const searchQuery = searchParams.get('search');

  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [sortBy, setSortBy] = useState(filterParam === 'new' || filterParam === 'sale' ? 'newest' : 'popular');
  const [filters, setFilters] = useState({
    category: categoryParam || 'all',
    priceRange: searchParams.get('priceRange') || 'all',
    colors: searchParams.get('colors') ? searchParams.get('colors')!.split(',') : [] as string[],
    sizes: searchParams.get('sizes') ? searchParams.get('sizes')!.split(',') : [] as string[],
    occasion: searchParams.get('occasion') || 'all',
  });

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const getPageTitle = () => {
    if (filters.category === 'men') return 'Menswear | SWITCH';
    if (filters.category === 'women') return 'Womenswear | SWITCH';
    if (filterParam === 'sale') return 'Sale | SWITCH';
    return 'Shop Collection | SWITCH';
  };
  useDocumentTitle(getPageTitle());

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (filters.category !== 'all') params.set('category', filters.category);
    else params.delete('category');
    
    if (filters.priceRange !== 'all') params.set('priceRange', filters.priceRange);
    else params.delete('priceRange');
    
    if (filters.colors.length > 0) params.set('colors', filters.colors.join(','));
    else params.delete('colors');
    
    if (filters.sizes.length > 0) params.set('sizes', filters.sizes.join(','));
    else params.delete('sizes');
    
    if (filters.occasion !== 'all') params.set('occasion', filters.occasion);
    else params.delete('occasion');
    
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, setSearchParams]);

  const priceRanges = [
    { label: 'All', value: 'all' },
    { label: 'Under ₹1000', value: '0-1000' },
    { label: '₹1000 - ₹2000', value: '1000-2000' },
    { label: '₹2000 - ₹3000', value: '2000-3000' },
    { label: 'Above ₹3000', value: '3000+' },
  ];

  const colors = ['Black', 'White', 'Navy', 'Grey', 'Blue', 'Pink', 'Olive'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const occasions = ['Casual', 'Formal', 'Party', 'Office', 'Wedding', 'Travel'];
  
  const { data: dbProducts = [], isLoading, isError, refetch } = useProducts();
  const allProducts = dbProducts.length > 0 ? dbProducts : products;

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => {
        const searchableText = [
          p.name,
          p.description,
          p.category,
          p.subcategory,
          ...p.colors,
          ...p.occasion,
          p.fabric,
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    // ── Category isolation ──────────────────────────────────────
    // Always apply category filter first so every subsequent filter operates
    // within the correct category context (never leaks across categories).
    if (filters.category !== 'all') {
      result = result.filter(p => p.category === filters.category);
    }

    // Filter param (trending, new, sale)
    if (filterParam === 'trending') {
      result = result.filter(p => p.isTrending);
    } else if (filterParam === 'new') {
      result = result.filter(p => p.isNew);
    } else if (filterParam === 'sale') {
      result = result.filter(p => p.discount && p.discount > 0);
    }

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
  }, [allProducts, filters, filterParam, searchQuery, sortBy]);

  // Reset visible count when filters or products change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filteredProducts]);

  // Intersection Observer for infinite scrolling (rendering pagination)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredProducts.length) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredProducts.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleCount, filteredProducts.length]);

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
    setFilters(prev => ({
      category: prev.category,
      priceRange: 'all',
      colors: [],
      sizes: [],
      occasion: 'all',
    }));
  };

  const activeFiltersCount = [
    filters.category !== 'all',
    filters.priceRange !== 'all',
    filters.colors.length > 0,
    filters.sizes.length > 0,
    filters.occasion !== 'all',
  ].filter(Boolean).length;

  return (
    <>
      {/* Page Header */}
      <section className="py-8 md:py-12 border-b border-border">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {searchQuery 
              ? `Search: "${searchQuery}"`
              : categoryParam 
                ? `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}'s Collection`
                : filterParam
                  ? `${filterParam.charAt(0).toUpperCase() + filterParam.slice(1)} Products`
                  : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} products found
          </p>
        </div>
      </section>

      <div className="container-custom py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="space-y-3">
                <h3 className="font-medium">Category</h3>
                <div className="space-y-2">
                  {['all', 'men', 'women'].map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.category === cat}
                        onChange={() => setFilters(prev => ({ ...prev, category: cat }))}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm capitalize">{cat === 'all' ? 'All Categories' : cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <h3 className="font-medium">Price Range</h3>
                <div className="space-y-2">
                  {priceRanges.map((range) => (
                    <label key={range.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="price"
                        checked={filters.priceRange === range.value}
                        onChange={() => setFilters(prev => ({ ...prev, priceRange: range.value }))}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-3">
                <h3 className="font-medium">Colors</h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => toggleColor(color)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        filters.colors.includes(color)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-3">
                <h3 className="font-medium">Sizes</h3>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`min-w-[44px] min-h-[44px] text-sm rounded-lg border transition-colors touch-target flex items-center justify-center ${
                        filters.sizes.includes(size)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion */}
              <div className="space-y-3">
                <h3 className="font-medium">Occasion</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="occasion"
                      checked={filters.occasion === 'all'}
                      onChange={() => setFilters(prev => ({ ...prev, occasion: 'all' }))}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">All Occasions</span>
                  </label>
                  {occasions.map((occ) => (
                    <label key={occ} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="occasion"
                        checked={filters.occasion === occ}
                        onChange={() => setFilters(prev => ({ ...prev, occasion: occ }))}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">{occ}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <SlidersHorizontal size={18} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-4 ml-auto">
                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2 border border-border rounded-lg bg-background text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Grid Toggle */}
                <div className="hidden md:flex items-center gap-1 p-1 border border-border rounded-lg">
                  <button
                    onClick={() => setGridSize('small')}
                    className={`p-2 rounded-md transition-colors ${
                      gridSize === 'small' ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    aria-label="Small grid"
                  >
                    <Grid3X3 size={18} />
                  </button>
                  <button
                    onClick={() => setGridSize('large')}
                    className={`p-2 rounded-md transition-colors ${
                      gridSize === 'large' ? 'bg-muted' : 'hover:bg-muted/50'
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
                <p className="text-muted-foreground animate-pulse">Fetching latest arrivals...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold mb-2">Unable to load products</h3>
                <p className="text-muted-foreground mb-6">Please check your connection and try again.</p>
                <button type="button" onClick={() => void refetch()} className="btn-primary">Try again</button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={`grid gap-y-12 gap-x-4 md:gap-6 ${
                gridSize === 'large' 
                  ? 'grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}>
                {filteredProducts.slice(0, visibleCount).map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">👗</div>
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters to find what you're looking for.
                </p>
                <button onClick={clearFilters} className="btn-primary">
                  Clear Filters
                </button>
              </div>
            )}

            {/* Loading Indicator / Sentinel */}
            {filteredProducts.length > 0 && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {visibleCount < filteredProducts.length && (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Filter Content - Same as desktop */}
                <div className="space-y-6">
                  {/* Category */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Category</h3>
                    <div className="space-y-2">
                      {['all', 'men', 'women'].map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="category-mobile"
                            checked={filters.category === cat}
                            onChange={() => setFilters(prev => ({ ...prev, category: cat }))}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm capitalize">{cat === 'all' ? 'All Categories' : cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Price Range</h3>
                    <div className="space-y-2">
                      {priceRanges.map((range) => (
                        <label key={range.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="price-mobile"
                            checked={filters.priceRange === range.value}
                            onChange={() => setFilters(prev => ({ ...prev, priceRange: range.value }))}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">{range.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Colors</h3>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => toggleColor(color)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            filters.colors.includes(color)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Sizes</h3>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => toggleSize(size)}
                          className={`w-10 h-10 text-sm rounded-lg border transition-colors ${
                            filters.sizes.includes(size)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                  <button
                    onClick={clearFilters}
                    className="flex-1 btn-outline"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false);
                    }}
                    className="flex-1 btn-primary"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Shop;
