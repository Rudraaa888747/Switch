import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGlobalRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen to changes on major tables and invalidate respective queries
    const channel = supabase.channel('global-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('[Realtime] Products updated', payload);
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Realtime] Orders updated', payload);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        (payload) => {
          console.log('[Realtime] Reviews updated', payload);
          queryClient.invalidateQueries({ queryKey: ['reviews'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Global syncing active');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
