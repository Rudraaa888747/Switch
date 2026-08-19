import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseRestSelect } from '@/integrations/supabase/publicRest';
import { Product, products } from '@/data/products';
import { DbProduct, mapDbProductToProduct } from './useProducts';

export const useProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['product', id],
    staleTime: 30_000,
    placeholderData: () => {
      if (!id) return undefined;
      
      // Try to find in cache first to eliminate loading skeleton latency
      const cachedProducts = queryClient.getQueriesData<Product[]>({ queryKey: ['products'] });
      for (const [, data] of cachedProducts) {
        if (data) {
          const found = data.find(p => p.id === id);
          if (found) return found;
        }
      }

      return products.find(p => p.id === id) || undefined;
    },
    queryFn: async () => {
      if (!id) return null;

      const params = new URLSearchParams({
        id: `eq.${id}`,
        limit: '1',
      });

      // Product details are public and should not wait for Auth initialization.
      const data = await supabaseRestSelect<DbProduct[]>('products', params, null, false);

      if (!data || data.length === 0) return null;

      const dbProduct = data[0];
      return mapDbProductToProduct(dbProduct);
    },
    enabled: !!id,
  });
};
