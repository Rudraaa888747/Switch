import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { fetchUserOrders, getUserOrdersQueryKey } from '@/hooks/useOrders';

export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  trackingNumber?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  walletBalance: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  addresses: Address[];
  orders: Order[];
  wishlistCount: number;
  memberSince: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  addOrder: (order: Order) => void;
  addAddress: (address: Omit<Address, 'id'>) => void;
  removeAddress: (addressId: string) => void;
  updateAddress: (addressId: string, data: Partial<Address>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_CACHE_KEY_PREFIX = 'switch_profile_cache:';
const AUTH_REQUEST_TIMEOUT_MS = 30_000;
const AUTH_RETRY_DELAY_MS = 500;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const cached = window.localStorage.getItem('switch_user');
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  });
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const getCachedProfile = (userId: string) => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = window.localStorage.getItem(`${PROFILE_CACHE_KEY_PREFIX}${userId}`);
      if (!cached) return null;
      const parsed = JSON.parse(cached) as {
        display_name?: string | null;
        avatar_url?: string | null;
        wallet_balance?: number;
        cached_at?: string;
      };
      const cachedAt = parsed.cached_at ? new Date(parsed.cached_at).getTime() : 0;
      if (Date.now() - cachedAt > 15 * 60_000) {
        window.localStorage.removeItem(`${PROFILE_CACHE_KEY_PREFIX}${userId}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const storeCachedProfile = (
    userId: string,
    profile: { display_name?: string | null; avatar_url?: string | null; wallet_balance?: number }
  ) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `${PROFILE_CACHE_KEY_PREFIX}${userId}`,
      JSON.stringify({
        ...profile,
        cached_at: new Date().toISOString(),
      })
    );
  };

  type SetUserAction = User | null | ((prev: User | null) => User | null);

  const setUser = useCallback((next: SetUserAction) => {
    setUserState((prev) => {
      const nextState = typeof next === 'function' ? (next as (prev: User | null) => User | null)(prev) : next;
      if (typeof window === 'undefined') return nextState;

      if (nextState) {
        window.localStorage.setItem('switch_user', JSON.stringify(nextState));
      } else {
        window.localStorage.removeItem('switch_user');
      }

      return nextState;
    });
  }, []);

  useEffect(() => {
    let isActive = true;
    const initTimeout = window.setTimeout(() => {
      if (isActive) {
        setIsInitializing(false);
      }
    }, 2500);

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isActive) return;

      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsInitializing(false);

      if (!session?.user) {
        setUser(null);
        return;
      }

      const baseUser: User = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
        walletBalance: 0,
        addresses: [],
        orders: [],
        wishlistCount: 0,
        memberSince:
          session.user.created_at?.split('T')[0] ||
          new Date().toISOString().split('T')[0],
      };

      const formatDisplayName = (dbName: string | null | undefined, fallback: string) => {
        if (!dbName) return fallback;
        if (/^Customer [a-f0-9]{8}$/i.test(dbName)) return fallback;
        return dbName;
      };

      const cachedProfile = getCachedProfile(session.user.id);
      const hydratedUser: User = {
        ...baseUser,
        name: formatDisplayName(cachedProfile?.display_name, baseUser.name),
        avatar: cachedProfile?.avatar_url ?? baseUser.avatar,
        walletBalance: cachedProfile?.wallet_balance ?? baseUser.walletBalance,
      };

      // Don't block UI on profile fetch; ensure we at least have a base user immediately.
      setUser((prev) => (prev?.id === hydratedUser.id ? { ...prev, ...hydratedUser } : hydratedUser));
      void queryClient.prefetchQuery({
        queryKey: getUserOrdersQueryKey(session.user.id),
        queryFn: () => fetchUserOrders(session.user.id, session.access_token),
        staleTime: 30_000,
      });

      const shouldFetchProfile = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
      if (!shouldFetchProfile) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, wallet_balance')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!isActive) return;
        if (error) throw error;

        if (profile) {
          storeCachedProfile(session.user.id, profile);
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  name: formatDisplayName(profile.display_name, prev.name),
                  avatar: profile.avatar_url ?? prev.avatar,
                  walletBalance: profile.wallet_balance ?? prev.walletBalance ?? 0,
                }
              : prev
          );
        }
      } catch (err) {
        // Avoid blocking login if profile table is slow/unavailable.
        console.warn('Profile fetch warning:', err);
      }
    });

    // THEN check for existing session with timeout guard so screens like /orders
    // don't stay blocked when auth event propagation is slow.
    void (async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('Auth session bootstrap timeout')), 2000)
          ),
        ]);

        if (!isActive) return;
        const currentSession = sessionResult.data.session ?? null;
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);
      } catch (err) {
        if (isActive) {
          console.warn('Session bootstrap warning:', err);
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    })();

    return () => {
      isActive = false;
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, [queryClient, setUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { error } = await withTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            AUTH_REQUEST_TIMEOUT_MS,
            'Login server is responding slowly. Retrying...'
          ) as { error: AuthError | null };

          if (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Login failed');
          if (attempt === 0) {
            await sleep(AUTH_RETRY_DELAY_MS);
          }
        }
      }

      const finalMessage =
        lastError?.message === 'Login server is responding slowly. Retrying...'
          ? 'Login server is busy. Please try again in a moment.'
          : lastError?.message || 'Login failed';
      return { success: false, error: finalMessage };
    } catch (error: unknown) {
      console.error('Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { error } = await withTimeout(
            supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: window.location.origin,
                data: {
                  full_name: name,
                },
              },
            }),
            AUTH_REQUEST_TIMEOUT_MS,
            'Signup request timed out. Please try again.'
          ) as { error: AuthError | null };

          if (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Signup failed');
          if (attempt === 0) {
            await sleep(AUTH_RETRY_DELAY_MS);
          }
        }
      }

      return { success: false, error: lastError?.message || 'Signup failed' };
    } catch (error: unknown) {
      console.error('Signup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      setIsLoading(false);
      if (error) {
        console.error('Password reset error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    // Clear local state immediately for instant UI feedback
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    
    try {
      // Sign out from Supabase (global scope to invalidate all sessions)
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Logout warning:', error);
    }
    
    // Clear all auth-related storage to prevent back-button re-login
    try {
      // Clear localStorage items related to Supabase auth
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage as well
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (storageError) {
      console.warn('Storage cleanup warning:', storageError);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      
      try {
        const updatePayload: Partial<{ display_name: string; phone: string }> = {};
        if (data.name !== undefined) updatePayload.display_name = data.name;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        
        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('user_id', user.id);
            
          if (error) console.error('Error updating profile in DB:', error);
          
          // Also update user metadata for auth sync
          if (data.name !== undefined && supabaseUser) {
            await supabase.auth.updateUser({
              data: { full_name: data.name }
            });
          }
        }
      } catch (err) {
        console.error('Failed to save profile changes:', err);
      }
    }
  };

  const addOrder = (order: Order) => {
    if (user) {
      setUser({
        ...user,
        orders: [order, ...user.orders],
      });
    }
  };

  const addAddress = (address: Omit<Address, 'id'>) => {
    if (user) {
      const newAddress: Address = {
        ...address,
        id: Date.now().toString(),
      };
      setUser({
        ...user,
        addresses: [...user.addresses, newAddress],
      });
    }
  };

  const removeAddress = (addressId: string) => {
    if (user) {
      setUser({
        ...user,
        addresses: user.addresses.filter(addr => addr.id !== addressId),
      });
    }
  };

  const updateAddress = (addressId: string, data: Partial<Address>) => {
    if (user) {
      setUser({
        ...user,
        addresses: user.addresses.map(addr =>
          addr.id === addressId ? { ...addr, ...data } : addr
        ),
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAuthenticated: !!supabaseUser,
        isAuthReady: !isInitializing,
        login,
        signup,
        signInWithGoogle,
        resetPassword,
        logout,
        updateProfile,
        addOrder,
        addAddress,
        removeAddress,
        updateAddress,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
