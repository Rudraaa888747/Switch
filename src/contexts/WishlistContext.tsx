import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { Product } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mapDbProductToProduct, DbProduct } from '@/hooks/useProducts';
import { toast } from '@/hooks/use-toast';

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
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = isAuthenticated && user ? user.id : null;
    if (previousUserId.current === userId) return;
    const priorUserId = previousUserId.current;
    previousUserId.current = userId;
    setSynced(false);
    initialLoadDone.current = false;
    if (priorUserId && userId && priorUserId !== userId) setItems([]);
  }, [isAuthenticated, user?.id]);

  // Load from Supabase on auth — merge server IDs with local Product objects
  useEffect(() => {
    if (!isAuthenticated || !user || synced || initialLoadDone.current) return;

    const loadServer = async () => {
      try {
        const { data: serverItems, error: serverItemsError } = await supabase
          .from('wishlist_items')
          .select('product_id')
          .eq('user_id', user.id);
        if (serverItemsError) throw serverItemsError;

        if (serverItems && serverItems.length > 0) {
          const serverIds = new Set(serverItems.map(si => si.product_id));

          const localString = localStorage.getItem(LOCAL_KEY);
          const local: Product[] = localString ? JSON.parse(localString) : [];

          // Keep only items that exist on the server (intersection)
          const merged = local.filter(li => serverIds.has(li.id));

          // Find IDs that are on the server but missing from local
          const missingIds = Array.from(serverIds).filter(id => !merged.find(m => m.id === id));

          if (missingIds.length > 0) {
            const { data: missingProducts, error: missingProductsError } = await supabase
              .from('products')
              .select('*')
              .in('id', missingIds);
            if (missingProductsError) throw missingProductsError;

            if (missingProducts) {
              missingProducts.forEach(dbProd => {
                merged.push(mapDbProductToProduct(dbProd as unknown as DbProduct));
              });
            }
          }

          setItems(merged);
        }
        setSynced(true);
        initialLoadDone.current = true;
      } catch (err) {
        console.error("Failed to load server wishlist:", err);
        toast({ title: 'Wishlist sync failed', description: 'Your wishlist could not be loaded. Please try again.', variant: 'destructive' });
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
      const { error } = await supabase
        .from('wishlist_items')
        .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
      if (error) throw error;
      return true;
    } catch {
      toast({ title: 'Wishlist update failed', description: 'Please try again.', variant: 'destructive' });
      return false;
    }
  }, []);

  const syncRemoveFromServer = useCallback(async (productId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (error) throw error;
      return true;
    } catch {
      toast({ title: 'Wishlist update failed', description: 'Please try again.', variant: 'destructive' });
      return false;
    }
  }, []);

  const addToWishlist = useCallback((product: Product) => {
    setItems(prev => {
      if (prev.find(item => item.id === product.id)) return prev;
      return [...prev, product];
    });
    if (isAuthenticated && user && synced) {
      void syncAddToServer(product.id, user.id).then((saved) => {
        if (!saved) setItems(prev => prev.filter(item => item.id !== product.id));
      });
    }
  }, [isAuthenticated, user, synced, syncAddToServer]);

  const removeFromWishlist = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(item => item.id !== productId);
      return next;
    });
    if (isAuthenticated && user && synced) {
      const removed = items.find(item => item.id === productId);
      if (removed) void syncRemoveFromServer(productId, user.id).then((saved) => {
        if (!saved) setItems(prev => prev.some(item => item.id === productId) ? prev : [...prev, removed]);
      });
    }
  }, [isAuthenticated, user, synced, syncRemoveFromServer, items]);

  const toggleWishlist = useCallback((product: Product) => {
    const exists = items.some(item => item.id === product.id);
    setItems(prev => exists ? prev.filter(item => item.id !== product.id) : [...prev, product]);
    if (!isAuthenticated || !user || !synced) return;

    const sync = exists ? syncRemoveFromServer(product.id, user.id) : syncAddToServer(product.id, user.id);
    void sync.then((saved) => {
      if (saved) return;
      setItems(prev => exists
        ? (prev.some(item => item.id === product.id) ? prev : [...prev, product])
        : prev.filter(item => item.id !== product.id)
      );
    });
  }, [isAuthenticated, user, synced, syncAddToServer, syncRemoveFromServer, items]);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.id === productId);
  }, [items]);

  const clearWishlist = useCallback(() => {
    setItems([]);
    if (isAuthenticated && user) {
      supabase.from('wishlist_items').delete().eq('user_id', user.id).then(() => { }).catch(() => { });
    }
  }, [isAuthenticated, user]);

  const totalItems = useMemo(() => items.length, [items]);

  const contextValue = useMemo(() => ({
    items,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    totalItems,
  }), [items, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist, clearWishlist, totalItems]);

  return (
    <WishlistContext.Provider value={contextValue}>
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
