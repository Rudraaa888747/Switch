import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ActionType = 'view' | 'cart_add' | 'wishlist_add' | 'purchase';

export const useTrackBehavior = () => {
  const { supabaseUser } = useAuth();

  const trackBehavior = useCallback(async (productId: string, actionType: ActionType) => {
    try {
      // Generate a session ID for anonymous users
      let sessionId = sessionStorage.getItem('behavior_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('behavior_session_id', sessionId);
      }

      await supabase.from('user_behavior').insert({
        user_id: supabaseUser?.id || null,
        session_id: sessionId,
        product_id: productId,
        action_type: actionType,
      });
    } catch (err) {
      // Silent fail - don't interrupt user experience
      console.debug('Failed to track behavior:', err);
    }
  }, [supabaseUser?.id]);

  return { trackBehavior };
};
