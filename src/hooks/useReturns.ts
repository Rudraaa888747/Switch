import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseRestSelect } from '@/integrations/supabase/publicRest';

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  comment?: string | null;
  additional_details?: string | null;
  refund_method?: 'card' | 'upi' | 'wallet' | null;
  images?: string[] | null;
  admin_note?: string | null;
  status:
    | 'pending'
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'picked_up'
    | 'item_received'
    | 'processing_refund'
    | 'refunded'
    | 'cancelled';
  refund_amount: number;
  created_at: string;
}

export const useUserReturns = (userId: string | undefined, accessToken?: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`returns-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'return_requests',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-returns', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['user-returns', userId],
    queryFn: async () => {
      if (!userId) return [];
      const params = new URLSearchParams({
        select: '*',
        user_id: `eq.${userId}`,
        order: 'created_at.desc',
      });
      const data = await supabaseRestSelect<ReturnRequest[]>('return_requests', params, accessToken);
      return data as ReturnRequest[];
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useAdminReturns = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('admin-returns-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'return_requests',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['admin-returns'],
    queryFn: async () => {
      const params = new URLSearchParams({
        select: '*,profiles(display_name),orders(order_number)',
        order: 'created_at.desc',
      });
      const data = await supabaseRestSelect('return_requests', params);
      return data;
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });
};
