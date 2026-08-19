import { useQuery } from '@tanstack/react-query';
import { supabaseRestSelect } from '@/integrations/supabase/publicRest';
import { Product, products } from '@/data/products';
import { normalizeImageUrl, cleanProductTitle, generateLuxuryDescription, generateProductTags, autoCategorizeProduct, autoDetectOccasion, detectFabric } from '@/lib/utils';

export interface DbVariant {
  id: string;
  colorName: string;
  colorHex: string;
  images: string[];
  sizes?: { name: string; stock: number }[];
  stock?: number;
  price: string;
  sku: string;
}

export interface DbProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: 'men' | 'women';
  subcategory: string | null;
  stock_quantity: number;
  image_url: string | null;
  fabric: string | null;
  description: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  occasion: string[] | null;
  is_new: boolean | null;
  is_trending: boolean | null;
  rating: number | null;
  reviews_count: number | null;
  variants: DbVariant[] | null;
  created_at: string;
}

const productCache = new Map<string, Product>();

export const mapDbProductToProduct = (dbProduct: DbProduct): Product => {
  if (productCache.has(dbProduct.id)) {
    return productCache.get(dbProduct.id)!;
  }

  const derivedSizes = dbProduct.sizes?.length
    ? dbProduct.sizes
    : dbProduct.variants?.length
      ? [...new Set(dbProduct.variants.flatMap(v => v.sizes?.map(s => s.name) ?? []))]
      : null;

  const cleanedName = cleanProductTitle(dbProduct.name);
  const dbDescription = dbProduct.description || '';
  const autoCategory = autoCategorizeProduct(cleanedName, dbDescription);
  const tags = generateProductTags(cleanedName, dbDescription, dbProduct.category, dbProduct.subcategory);
  const occasions = dbProduct.occasion?.length ? dbProduct.occasion : autoDetectOccasion(cleanedName, dbDescription);
  const fabric = dbProduct.fabric?.trim() || detectFabric(`${cleanedName} ${dbDescription}`);
  const brand = 'SWITCH';

  const product: Product = {
    id: dbProduct.id,
    name: cleanedName,
    price: dbProduct.price,
    originalPrice: dbProduct.original_price || undefined,
    discount: dbProduct.original_price ? Math.round(((dbProduct.original_price - dbProduct.price) / dbProduct.original_price) * 100) : undefined,
    brand,
    category: dbProduct.category || autoCategory.category,
    subcategory: dbProduct.subcategory || autoCategory.subcategory,
    colors: dbProduct.colors || (dbProduct.variants?.map(v => v.colorName) || ['Standard']),
    sizes: derivedSizes?.length ? derivedSizes : ['S', 'M', 'L', 'XL'],
    fabric,
    occasion: occasions,
    description: generateLuxuryDescription({
      name: cleanedName,
      description: dbDescription,
      fabric,
      colors: dbProduct.colors || dbProduct.variants?.map((variant) => variant.colorName) || [],
      category: dbProduct.category || autoCategory.category,
      subcategory: dbProduct.subcategory || autoCategory.subcategory,
      occasion: occasions,
      brand,
    }),
    isNew: dbProduct.is_new || false,
    isTrending: dbProduct.is_trending || false,
    rating: dbProduct.rating || 4.5,
    reviews: (() => {
      // Ensure review count is always 50+ as requested
      const baseSeed = dbProduct.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const bonusCount = 52 + (baseSeed % 74); // 52 to 125
      return Math.max(dbProduct.reviews_count || 0, bonusCount);
    })(),
    tags,
    gender: autoCategory.gender,
    featured: dbProduct.is_trending || false,
    collection: dbProduct.original_price && dbProduct.original_price > dbProduct.price
      ? dbProduct.original_price - dbProduct.price > 500
        ? 'limited-offers'
        : 'sale'
      : dbProduct.is_new
        ? 'new-arrivals'
        : dbProduct.is_trending
          ? 'trending-deals'
          : null,
    created_at: dbProduct.created_at,
    image: dbProduct.image_url ? normalizeImageUrl(dbProduct.image_url) : undefined,
    stockQuantity: Number(dbProduct.stock_quantity || 0),
    variants: dbProduct.variants && dbProduct.variants.length > 0
      ? dbProduct.variants.map(v => ({
          color: v.colorName,
          images: v.images.map(img => normalizeImageUrl(img)),
          colorHex: v.colorHex,
          stock: v.stock ?? 0,
          price: v.price,
          sku: v.sku,
        }))
      : [
          {
            color: (dbProduct.colors && dbProduct.colors[0]) || 'Standard',
            images: [dbProduct.image_url ? normalizeImageUrl(dbProduct.image_url) : ''],
          },
        ],
  };

  productCache.set(dbProduct.id, product);
  return product;
};

export const useProducts = (options?: { category?: string; subcategory?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['products', options],
    staleTime: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    placeholderData: () => {
      let result = [...products];
      if (options?.category && options.category !== 'all') {
        result = result.filter(p => p.category === options.category);
      }
      if (options?.subcategory) {
        result = result.filter(p => p.subcategory === options.subcategory);
      }
      if (options?.limit) {
        result = result.slice(0, options.limit);
      }
      return result.length > 0 ? result : undefined;
    },
    queryFn: async () => {
      const params = new URLSearchParams({
        select: '*',
        order: 'created_at.desc',
      });

      if (options?.category && options.category !== 'all') {
        params.append('category', `eq.${options.category}`);
      }

      if (options?.subcategory) {
        params.append('subcategory', `eq.${options.subcategory}`);
      }

      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      // Products are public. Avoid blocking the first page load on Auth session recovery.
      const data = await supabaseRestSelect<DbProduct[]>('products', params, null, false);
      if (!data) return [];

      return data.map(mapDbProductToProduct);
    },
  });
};
