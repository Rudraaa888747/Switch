import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Product } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mapDbProductToProduct, DbProduct } from '@/hooks/useProducts';
import { toast } from '@/hooks/use-toast';

interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isInCart: (productId: string) => boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_KEY = 'cart';

const loadLocal = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    localStorage.removeItem(LOCAL_KEY);
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadLocal);
  const [synced, setSynced] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const previousUserId = useRef<string | null>(null);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const syncRevision = useRef(0);

  // A cart belongs to an account. Never let a previous account's in-memory cart
  // sync before the next account has loaded its own server cart.
  useEffect(() => {
    const userId = isAuthenticated && user ? user.id : null;
    if (previousUserId.current === userId) return;

    const priorUserId = previousUserId.current;
    previousUserId.current = userId;
    syncRevision.current += 1;
    setSynced(false);

    if (priorUserId && userId && priorUserId !== userId) {
      setItems([]);
    }
  }, [isAuthenticated, user?.id]);

  // Load from Supabase on auth
  useEffect(() => {
    if (!isAuthenticated || !user || synced) return;
    let cancelled = false;
    
    const loadServerCart = async () => {
      try {
        const { data: serverItems, error: serverCartError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id);
        if (serverCartError) throw serverCartError;
        
        if (serverItems && serverItems.length > 0) {
          // Merge server items with local items — prefer local (has full Product data)
          const local = loadLocal();
          const merged = [...local];
          
          // Find which product IDs are missing from local cart
          const missingProductIds = serverItems
            .filter(si => !merged.find(m => m.product.id === si.product_id))
            .map(si => si.product_id);
            
          const uniqueMissingIds = [...new Set(missingProductIds)];
          const fetchedProducts: Record<string, Product> = {};
          
          // Fetch the missing products from the database
          if (uniqueMissingIds.length > 0) {
            const { data: missingProducts, error: missingProductsError } = await supabase
              .from('products')
              .select('*')
              .in('id', uniqueMissingIds);
            if (missingProductsError) throw missingProductsError;
              
            if (missingProducts) {
              missingProducts.forEach(dbProd => {
                fetchedProducts[dbProd.id] = mapDbProductToProduct(dbProd as unknown as DbProduct);
              });
            }
          }

          // Add server-only items that aren't already in local
          for (const si of serverItems) {
            if (!merged.find(m => m?.product?.id === si.product_id && m?.size === si.size && m?.color === si.color)) {
              // Try to get the product from local cart first, otherwise from the fetched products
              const localProd = merged.find(m => m?.product?.id === si.product_id)?.product;
              const product = localProd || fetchedProducts[si.product_id];
              
              if (product) {
                merged.push({
                  product,
                  quantity: si.quantity,
                  size: si.size,
                  color: si.color,
                });
              }
            }
          }
          if (!cancelled) setItems(merged);
        }
        if (!cancelled) setSynced(true);
      } catch (err) {
        console.error("Failed to load server cart:", err);
        if (!cancelled) {
          toast({ title: 'Cart sync failed', description: 'Your cart could not be loaded. Please try again.', variant: 'destructive' });
        }
      }
    };
    
    void loadServerCart();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, synced]);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  }, [items]);

  // Sync to Supabase when items change and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !synced) return;
    const revision = ++syncRevision.current;
    const userId = user.id;
    const snapshot = items;
    const timer = window.setTimeout(() => {
      syncQueue.current = syncQueue.current.catch(() => undefined).then(async () => {
        if (revision !== syncRevision.current || previousUserId.current !== userId) return;

        const { error: deleteError } = await supabase.from('cart_items').delete().eq('user_id', userId);
        if (deleteError) throw deleteError;
        if (revision !== syncRevision.current || previousUserId.current !== userId) return;

        if (snapshot.length > 0) {
          const rows = snapshot.map(item => ({
            user_id: userId,
            product_id: item.product.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          }));
          const { error: upsertError } = await supabase
            .from('cart_items')
            .upsert(rows, { onConflict: 'user_id,product_id,size,color' });
          if (upsertError) throw upsertError;
        }
      }).catch((error) => {
        console.error('Failed to sync cart:', error);
        toast({ title: 'Cart sync failed', description: 'Your latest cart change could not be saved. Please try again.', variant: 'destructive' });
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [items, isAuthenticated, user, synced]);

  const addToCart = useCallback((product: Product, size: string, color: string, quantity = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.size === size && item.color === color
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [...prev, { product, quantity, size, color }];
    });
    setIsDrawerOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string, size: string, color: string) => {
    setItems(prev =>
      prev.filter(
        item => !(item.product.id === productId && item.size === size && item.color === color)
      )
    );
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setItems(prev =>
      prev.map(item =>
        item.product.id === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);

  const isInCart = useCallback((productId: string) => {
    return items.some(item => item.product.id === productId);
  }, [items]);

  const contextValue = useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    isInCart,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
  }), [
    items, addToCart, removeFromCart, updateQuantity, clearCart, 
    totalItems, totalPrice, isInCart, isDrawerOpen, openDrawer, closeDrawer
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
