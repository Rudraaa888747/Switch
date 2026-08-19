import { useState, useMemo, useCallback, useEffect } from 'react';
import { Product } from '@/data/products';

export const useSearch = (productList: Product[] = [], isLoadingProducts = false) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const searchProducts = useCallback((searchQuery: string, list?: Product[]): Product[] => {
    const pool = list || productList;
    if (!searchQuery.trim() || pool.length === 0) return [];
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);

    return pool
      .map(product => {
        let score = 0;
        const searchableText = [
          product.name,
          product.description,
          product.category,
          product.subcategory,
          ...product.colors,
          ...product.occasion,
          product.fabric,
          ...(product.tags || []),
        ].join(' ').toLowerCase();

        // Exact name match gets highest score
        if (product.name.toLowerCase().includes(normalizedQuery)) {
          score += 10;
        }

        // Tag match
        if (product.tags?.some(t => normalizedQuery.includes(t))) {
          score += 6;
        }

        // Category match
        if (product.category.toLowerCase().includes(normalizedQuery)) {
          score += 5;
        }

        // Check each word
        queryWords.forEach(word => {
          if (searchableText.includes(word)) {
            score += 2;
          }
        });

        // Color match
        if (product.colors.some(c => c.toLowerCase().includes(normalizedQuery))) {
          score += 3;
        }

        // Occasion match
        if (product.occasion.some(o => o.toLowerCase().includes(normalizedQuery))) {
          score += 3;
        }

        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);
  }, [productList]);

  const results = useMemo(() => searchProducts(debouncedQuery, productList), [debouncedQuery, searchProducts, productList]);

  return {
    query,
    setQuery,
    results,
    searchProducts,
    hasResults: results.length > 0,
    isSearching: query.trim().length > 0,
    isLoading: isDebouncing || isLoadingProducts,
  };
};

export default useSearch;
