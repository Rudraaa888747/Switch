import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Palette, 
  Check,
  ArrowRight,
  Shirt,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/products/ProductCard';
import { formatPrice, Product } from '@/data/products';
import { useOutfitMatching } from '@/hooks/useOutfitMatching';
import { useProducts } from '@/hooks/useProducts';
import { getProductImage } from '@/lib/utils';

// Color harmony rules for visualization
const colorHarmony: Record<string, string[]> = {
  'Black': ['White', 'Grey', 'Navy', 'Red', 'Pink', 'Cream', 'Beige'],
  'White': ['Black', 'Navy', 'Blue', 'Pink', 'Grey', 'Beige', 'Floral'],
  'Navy': ['White', 'Cream', 'Light Blue', 'Pink', 'Grey', 'Beige'],
  'Grey': ['Black', 'White', 'Navy', 'Pink', 'Blue', 'Red'],
  'Blue': ['White', 'Grey', 'Navy', 'Light Blue', 'Beige', 'Pink'],
  'Pink': ['White', 'Grey', 'Navy', 'Black', 'Cream', 'Lavender'],
  'Olive': ['White', 'Cream', 'Black', 'Navy', 'Beige', 'Grey'],
  'Red': ['Black', 'White', 'Navy', 'Grey', 'Cream'],
  'Lavender': ['White', 'Pink', 'Grey', 'Cream', 'Black'],
  'Cream': ['Navy', 'Black', 'Olive', 'Brown', 'Grey', 'Blue'],
  'Beige': ['Navy', 'White', 'Black', 'Grey', 'Brown', 'Olive'],
};

const OutfitMatching = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'men' | 'women'>('all');
  const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
  const { getAIMatches, isMatching } = useOutfitMatching();
  const { data: dbProducts = [] } = useProducts();
  const fetchRef = useRef(0);

  const displayProducts = useMemo(() => {
    if (selectedCategory === 'all') return dbProducts;
    return dbProducts.filter(p => p.category === selectedCategory);
  }, [dbProducts, selectedCategory]);

  // Fetch AI matches when a product is selected (with race condition guard)
  useEffect(() => {
    const token = ++fetchRef.current;
    
    const fetchMatches = async () => {
      if (selectedProduct) {
        const matches = await getAIMatches(selectedProduct);
        if (token === fetchRef.current) {
          setMatchingProducts(matches);
        }
      } else {
        setMatchingProducts([]);
      }
    };
    
    fetchMatches();
  }, [selectedProduct, getAIMatches]);

  // Get color palette for visualization
  const getColorVisualization = () => {
    if (!selectedProduct) return [];
    
    const colors: { name: string; hex: string }[] = [];
    selectedProduct.colors.slice(0, 3).forEach(color => {
      const baseColor = color.toLowerCase();
      if (baseColor.includes('black')) colors.push({ name: color, hex: '#1a1a1a' });
      else if (baseColor.includes('white')) colors.push({ name: color, hex: '#f5f5f5' });
      else if (baseColor.includes('navy')) colors.push({ name: color, hex: '#1a365d' });
      else if (baseColor.includes('grey') || baseColor.includes('gray')) colors.push({ name: color, hex: '#6b7280' });
      else if (baseColor.includes('blue')) colors.push({ name: color, hex: '#3b82f6' });
      else if (baseColor.includes('pink')) colors.push({ name: color, hex: '#ec4899' });
      else if (baseColor.includes('olive')) colors.push({ name: color, hex: '#84cc16' });
      else if (baseColor.includes('red')) colors.push({ name: color, hex: '#ef4444' });
      else if (baseColor.includes('lavender')) colors.push({ name: color, hex: '#a78bfa' });
      else if (baseColor.includes('cream')) colors.push({ name: color, hex: '#fef3c7' });
      else if (baseColor.includes('beige')) colors.push({ name: color, hex: '#d4b896' });
      else if (baseColor.includes('floral')) colors.push({ name: color, hex: '#f472b6' });
      else if (baseColor.includes('mustard')) colors.push({ name: color, hex: '#eab308' });
      else if (baseColor.includes('maroon')) colors.push({ name: color, hex: '#881337' });
      else colors.push({ name: color, hex: '#9ca3af' });
    });
    return colors;
  };

  return (
    <>
      {/* Hero Section */}
      <section className="py-12 md:py-16 border-b border-border bg-muted/30">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-foreground" />
              <span className="text-sm font-medium tracking-wide">AI-POWERED MATCHING</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-wide mb-4">
              Intelligent Outfit Matching
            </h1>
            <p className="text-lg text-muted-foreground">
              Select any item and discover perfectly coordinated pieces using AI-powered 
              color harmony and style matching algorithms.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom py-12">
        {/* Category Filter */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {(['all', 'men', 'women'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedProduct(null);
              }}
              className={`px-6 py-2 text-sm tracking-wider uppercase transition-colors ${
                selectedCategory === cat
                  ? 'bg-foreground text-background'
                  : 'border border-border hover:border-foreground'
              }`}
            >
              {cat === 'all' ? 'All Products' : cat}
            </button>
          ))}
        </div>

        {/* Instructions */}
        {!selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted rounded-lg">
              <Shirt className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click on any product below to see AI-suggested outfit combinations
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground animate-bounce" />
            </div>
          </motion.div>
        )}

        {/* Selected Product & Matches */}
        <AnimatePresence mode="wait">
          {selectedProduct && (
            <motion.section
              key="selected"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="mb-16 p-6 md:p-10 bg-muted/50 rounded-3xl border border-border"
            >
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Selected Item */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                    Selected Item
                  </p>
                  <div className="bg-background rounded-2xl border border-border overflow-hidden">
                    <div className="aspect-square overflow-hidden">
                      <img loading="lazy" decoding="async"
                        src={getProductImage(selectedProduct)}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium mb-1">{selectedProduct.name}</h3>
                      <p className="text-lg font-bold">{formatPrice(selectedProduct.price)}</p>
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Color Harmony</span>
                    </div>
                    <div className="flex gap-2">
                      {getColorVisualization().map((color, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-lg border border-border shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                      <div className="flex items-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
                      </div>
                      {matchingProducts.slice(0, 3).map((p, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-lg border border-border shadow-sm flex items-center justify-center bg-muted"
                        >
                          <Check className="w-4 h-4 text-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Choose a different item
                  </button>
                </div>

                {/* Matching Products */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-foreground rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-background" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Complete the Look</h2>
                      <p className="text-sm text-muted-foreground">
                        AI-suggested pieces that perfectly complement your selection
                      </p>
                    </div>
                  </div>

                  {isMatching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">Finding perfect matches...</span>
                    </div>
                  ) : matchingProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {matchingProducts.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Link
                            to={`/product/${product.id}`}
                            className="block bg-background rounded-xl border border-border overflow-hidden hover:border-foreground/50 transition-colors group"
                          >
                            <div className="aspect-square overflow-hidden">
                              <img loading="lazy" decoding="async"
                                src={getProductImage(product)}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="p-3">
                              <h4 className="font-medium text-sm line-clamp-1 mb-1">{product.name}</h4>
                              <p className="font-semibold text-sm">{formatPrice(product.price)}</p>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-background rounded-2xl border border-border">
                      <p className="text-muted-foreground">
                        No matching items found. Try selecting a different product.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* All Products Grid */}
        <section>
          <h2 className="text-2xl font-light tracking-wide mb-8 text-center">
            {selectedProduct ? 'Or Choose Another Item' : 'Select an Item to Start'}
          </h2>
          <div className="grid-product">
            {displayProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setSelectedProduct(product);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`cursor-pointer transition-all ${
                  selectedProduct?.id === product.id 
                    ? 'ring-2 ring-foreground ring-offset-2 rounded-2xl' 
                    : 'hover:opacity-90'
                }`}
              >
                <ProductCard product={product} index={index} />
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default OutfitMatching;
