import { useState, useEffect } from 'react';
import type { Product } from '@/data/products';

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 8;

export const useRecentlyViewed = () => {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const addProduct = (product: Product) => {
    setIds(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, MAX_ITEMS);
    });
  };

  const getProducts = (allProducts: Product[]): Product[] => {
    if (!allProducts || allProducts.length === 0) return [];
    return ids
      .map(id => allProducts.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined);
  };

  return { addProduct, getProducts, ids };
};
