export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  brand?: string;
  category: 'men' | 'women' | 'accessories' | 'footwear' | 'unisex' | string;
  subcategory: string;
  colors: string[];
  sizes: string[];
  fabric: string;
  occasion: string[];
  description: string;
  isNew?: boolean;
  isTrending?: boolean;
  rating: number;
  reviews: number;
  tags?: string[];
  gender?: 'male' | 'female' | 'unisex';
  featured?: boolean;
  collection?: 'new-arrivals' | 'sale' | 'trending-deals' | 'limited-offers' | null;
  created_at?: string;
  variants: {
    color: string;
    images: string[];
    colorHex?: string;
    stock?: number;
    price?: string;
    sku?: string;
  }[];
  image?: string;
  images?: string[];
  stockQuantity?: number;
}

export const products: Product[] = [];

export const formatPrice = (price: number): string => {
  if (!Number.isFinite(price)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
};
