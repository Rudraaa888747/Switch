import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Heart, Shirt, Palette } from 'lucide-react';
import { Product } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/products/ProductCard';
import { useAuth } from '@/contexts/AuthContext';

interface SmartRecommendationsProps {
  currentProductId?: string;
  type?: 'personalized' | 'trending' | 'similar' | 'complete-look' | 'color-match' | 'new-arrivals' | 'curated';
  limit?: number;
}

const SmartRecommendations = ({ currentProductId, type = 'personalized', limit = 4 }: SmartRecommendationsProps) => {
  const { supabaseUser } = useAuth();
  const { data: allProducts, isLoading: productsLoading } = useProducts();

  const recommendations = useMemo((): Product[] => {
    if (!allProducts || allProducts.length === 0) return [];

    const pool = currentProductId
      ? allProducts.filter(p => p.id !== currentProductId)
      : allProducts;

    const current = currentProductId
      ? allProducts.find(p => p.id === currentProductId)
      : null;

    let results: Product[] = [];

    switch (type) {
      case 'trending': {
        // Trending: is_trending first, then highest rated
        const trending = pool.filter(p => p.isTrending);
        const highestRated = pool.filter(p => !p.isTrending).sort((a, b) => b.rating - a.rating);
        results = [...trending, ...highestRated].slice(0, limit);
        break;
      }

      case 'personalized': {
        // Personalized: same category + occasion matching
        if (current) {
          const sameCategory = pool.filter(p => p.category === current.category);
          const sameOccasion = pool.filter(p => p.occasion.some(o => current.occasion.includes(o)));
          const scored = [...new Map(
            [...sameCategory, ...sameOccasion].map(p => [p.id, p])
          ).values()].sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            if (a.category === current.category) scoreA += 3;
            if (b.category === current.category) scoreB += 3;
            if (a.occasion.some(o => current.occasion.includes(o))) scoreA += 2;
            if (b.occasion.some(o => current.occasion.includes(o))) scoreB += 2;
            return scoreB - scoreA;
          });
          results = scored.slice(0, limit);
        } else {
          // Fallback: highest rated
          results = [...pool].sort((a, b) => b.rating - a.rating).slice(0, limit);
        }
        break;
      }

      case 'similar': {
        if (!current) break;
        const currentColors = new Set((current.colors || []).map((color) => color.toLowerCase()));
        const currentTags = new Set((current.tags || []).map((tag) => tag.toLowerCase()));
        results = [...pool]
          .map((product) => {
            let score = 0;
            if (product.subcategory === current.subcategory) score += 5;
            if (product.category === current.category) score += 3;
            if (product.colors?.some((color) => currentColors.has(color.toLowerCase()))) score += 3;
            if (product.tags?.some((tag) => currentTags.has(tag.toLowerCase()))) score += 2;
            if (product.isTrending) score += 1;
            return { product, score };
          })
          .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating)
          .map((entry) => entry.product)
          .slice(0, limit);
        break;
      }

      case 'complete-look': {
        // Complete The Look: different categories that pair together
        // e.g., shirt + pants, top + skirt, dress + accessories
        if (!current) break;
        const pairingCategories: Record<string, string[]> = {
          shirts: ['pants', 'jeans', 'trousers', 'chinos'],
          tops: ['jeans', 'skirts', 'pants', 'leggings'],
          dresses: ['jackets', 'accessories', 'jewelry'],
          hoodies: ['jeans', 'joggers', 'shorts'],
          sneakers: ['jeans', 'shorts', 'pants'],
          watches: ['shirts', 'formal'],
          bags: ['dresses', 'tops', 'shirts'],
        };
        const pairWith = pairingCategories[current.subcategory] || [];
        results = pool
          .filter(p => pairWith.some(cat => p.subcategory === cat || p.category === cat))
          .slice(0, limit);
        break;
      }

      case 'color-match': {
        // Color match: same color across different categories
        if (!current || !current.colors?.length) break;
        const currentColors = current.colors.map(c => c.toLowerCase());
        results = pool
          .filter(p => p.colors?.some(c => currentColors.includes(c.toLowerCase())))
          .filter(p => p.category !== current.category || p.subcategory !== current.subcategory)
          .slice(0, limit);
        break;
      }

      case 'new-arrivals': {
        results = pool
          .filter(p => p.isNew || p.collection === 'new-arrivals')
          .sort((a, b) => (a.featured ? -1 : 1))
          .slice(0, limit);
        break;
      }

      case 'curated': {
        // Curated luxury aesthetic: hoodies, oversized fits, dark neutrals, premium basics
        const luxuryTags = ['hoodie', 'oversized', 'premium', 'luxury', 'essential', 'minimal'];
        const darkNeutrals = ['Black', 'Navy', 'Grey', 'Charcoal', 'Dark', 'Olive'];
        const luxurySubcategories = ['hoodies', 'jackets', 'shirts', 't-shirts', 'sweatshirts'];
        const scored = pool.map(p => {
          let score = 0;
          const name = p.name.toLowerCase();
          const tags = (p.tags || []).map(t => t.toLowerCase());
          const allText = [name, p.subcategory.toLowerCase(), p.fabric.toLowerCase(), ...tags].join(' ');
          if (luxuryTags.some(t => allText.includes(t))) score += 3;
          if (luxurySubcategories.includes(p.subcategory)) score += 2;
          if (p.colors.some(c => darkNeutrals.some(d => c.toLowerCase().includes(d.toLowerCase())))) score += 2;
          if (p.rating >= 4) score += 1;
          if (p.isTrending) score += 1;
          if (p.featured) score += 1;
          return { product: p, score };
        });
        results = scored.sort((a, b) => b.score - a.score).map(s => s.product).slice(0, limit);
        break;
      }

      default:
        results = [];
    }

    // Final fallback: random products
    if (results.length === 0) {
      results = [...pool].sort(() => Math.random() - 0.5).slice(0, limit);
    }

    return results;
  }, [allProducts, currentProductId, type, limit]);

  const config = {
    personalized: { icon: Heart, title: 'Recommended for You', subtitle: 'Based on your preferences' },
    trending: { icon: TrendingUp, title: 'Trending Now', subtitle: 'Popular picks from our community' },
    similar: { icon: Sparkles, title: 'Matching Products', subtitle: 'Related SWITCH pieces in a similar mood and palette' },
    'complete-look': { icon: Shirt, title: 'Complete The Look', subtitle: 'Perfect pairings to style your outfit' },
    'color-match': { icon: Palette, title: 'Colour Match', subtitle: 'Same colour, different styles' },
    'new-arrivals': { icon: Sparkles, title: 'New Arrivals', subtitle: 'Fresh drops for your wardrobe' },
    curated: { icon: Sparkles, title: 'Matching Products', subtitle: 'Hand-selected SWITCH essentials with the same premium energy' },
  }[type];

  const Icon = config.icon;

  if (productsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
          <div>
            <div className="h-5 bg-muted rounded w-32 mb-2" />
            <div className="h-3 bg-muted rounded w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <div className="aspect-product bg-muted rounded-lg animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:px-0">
        {recommendations.map((product, index) => (
          <div key={product.id} className="min-w-[16.25rem] snap-start md:min-w-0">
            <ProductCard product={product} index={index} />
          </div>
        ))}
      </div>
    </motion.section>
  );
};

export default SmartRecommendations;
