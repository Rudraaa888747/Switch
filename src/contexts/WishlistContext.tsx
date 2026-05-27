import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Product } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  totalItems: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const LOCAL_KEY = 'switch-wishlist';

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      localStorage.removeItem(LOCAL_KEY);
      return [];
    }
  });
  const [synced, setSynced] = useState(false);

  const initialLoadDone = useRef(false);

  // Load from Supabase on auth — merge server IDs with local Product objects
  useEffect(() => {
    if (!isAuthenticated || !user || synced || initialLoadDone.current) return;

    const loadServer = async () => {
      try {
        const { data: serverItems } = await supabase
          .from('wishlist_items')
          .select('product_id')
          .eq('user_id', user.id);

        if (serverItems && serverItems.length > 0) {
          const serverIds = new Set(serverItems.map(si => si.product_id));
          setItems(prev => {
            // Keep only items that exist on the server (intersection)
            const merged = prev.filter(li => serverIds.has(li.id));
            if (merged.length !== prev.length && merged.length > 0) {
              return merged;
            }
            return prev;
          });
        }
        setSynced(true);
        initialLoadDone.current = true;
      } catch {
        setSynced(true);
        initialLoadDone.current = true;
      }
    };

    loadServer();
  }, [isAuthenticated, user, synced]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  }, [items]);

  // --- Granular server sync helpers ---
  // These insert/delete individual rows instead of wiping and rewriting all.
  // This prevents data loss if the network drops between delete and insert.

  const syncAddToServer = useCallback(async (productId: string, userId: string) => {
    try {
      await supabase
        .from('wishlist_items')
        .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
    } catch {
      // Table may not exist yet — silently ignore
    }
  }, []);

  const syncRemoveFromServer = useCallback(async (productId: string, userId: string) => {
    try {
      await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
    } catch {
      // Silently ignore
    }
  }, []);

  const addToWishlist = useCallback((product: Product) => {
    setItems(prev => {
      if (prev.find(item => item.id === product.id)) return prev;
      if (isAuthenticated && user && synced) {
        syncAddToServer(product.id, user.id);
      }
      return [...prev, product];
    });
  }, [isAuthenticated, user, synced, syncAddToServer]);

  const removeFromWishlist = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(item => item.id !== productId);
      if (next.length !== prev.length && isAuthenticated && user && synced) {
        syncRemoveFromServer(productId, user.id);
      }
      return next;
    });
  }, [isAuthenticated, user, synced, syncRemoveFromServer]);

  const toggleWishlist = useCallback((product: Product) => {
    setItems(prev => {
      if (prev.find(item => item.id === product.id)) {
        if (isAuthenticated && user && synced) {
          syncRemoveFromServer(product.id, user.id);
        }
        return prev.filter(item => item.id !== product.id);
      }
      if (isAuthenticated && user && synced) {
        syncAddToServer(product.id, user.id);
      }
      return [...prev, product];
    });
  }, [isAuthenticated, user, synced, syncAddToServer, syncRemoveFromServer]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.id === productId);
  }, [items]);

  const clearWishlist = useCallback(() => {
    setItems([]);
    if (isAuthenticated && user) {
      supabase.from('wishlist_items').delete().eq('user_id', user.id).then(() => {}).catch(() => {});
    }
  }, [isAuthenticated, user]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        totalItems: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
