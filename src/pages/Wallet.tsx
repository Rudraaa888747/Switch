import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Calendar, CreditCard, Filter, Wallet as WalletIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  source: string;
  description: string;
  balance_after: number;
  created_at: string;
  reference_id?: string;
}

const Wallet = () => {
  const { user, isAuthenticated, supabaseUser } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const userId = supabaseUser?.id || user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet-live-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['wallet-profile-balance', userId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['wallet-profile-balance', userId] });
          queryClient.invalidateQueries({ queryKey: ['wallet-transactions', userId] });
          
          if (payload.eventType === 'INSERT' && payload.new.type === 'credit') {
            import('canvas-confetti').then((confetti) => {
              confetti.default({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#3b82f6', '#a855f7', '#fbbf24']
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const { data: profileBalance } = useQuery({
    queryKey: ['wallet-profile-balance', userId],
    queryFn: async () => {
      if (!userId) return user?.walletBalance ?? 0;

      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return Number(data?.wallet_balance ?? user?.walletBalance ?? 0);
    },
    enabled: !!userId,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: transactions = [], isLoading, isError, error } = useQuery({
    queryKey: ['wallet-transactions', userId, filterType],
    queryFn: async ({ signal }) => {
      if (!userId) return [];

      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!userId,
    staleTime: 30_000,
    retry: 1,
    retryDelay: 2000,
  });

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      refund: 'Refund',
      cashback: 'Cashback',
      payment: 'Payment',
      admin_credit: 'Admin Credit',
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      refund: 'bg-green-500/10 text-green-700 dark:text-green-400',
      cashback: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      payment: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      admin_credit: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    };
    return colors[source] || 'bg-muted text-muted-foreground';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
      <div className="container-custom py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="text-3xl font-light tracking-wide mb-2">My Wallet</h1>
            <p className="text-muted-foreground text-sm">
              Manage your wallet balance and view transaction history
            </p>
          </div>

          {/* Balance Card */}
          <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-muted/20">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-foreground/[0.03]" />
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Available Balance
                  </p>
                  <p className="text-3xl md:text-5xl font-semibold tracking-tight">
                    {formatPrice(profileBalance ?? user.walletBalance ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Use wallet balance during checkout
                  </p>
                </div>
                <div className="flex h-16 w-16 md:h-20 md:w-20 flex-shrink-0 items-center justify-center rounded-full bg-foreground/5 ring-1 ring-border/50">
                  <WalletIcon className="h-7 w-7 md:h-9 md:w-9 text-foreground/60" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg font-medium uppercase tracking-wide">
                  Transaction History
                </CardTitle>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="credit">Credits Only</SelectItem>
                    <SelectItem value="debit">Debits Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-4 p-4 md:p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="relative overflow-hidden p-4 md:p-6 mobile-glass-panel rounded-3xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent bg-[length:200%_100%] animate-shimmer z-0 pointer-events-none" />
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="h-10 w-10 rounded-full bg-muted/40 animate-pulse" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-2/5 rounded bg-muted/40 animate-pulse" />
                          <div className="flex gap-2">
                            <div className="h-5 w-16 rounded-full bg-muted/30 animate-pulse" />
                            <div className="h-5 w-24 rounded-full bg-muted/30 animate-pulse" />
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="h-5 w-20 rounded bg-muted/40 animate-pulse" />
                          <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="p-12 text-center">
                  <CreditCard className="w-10 h-10 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-1">Unable to load transactions</p>
                  <p className="text-xs text-muted-foreground/60">
                    {error instanceof Error ? error.message : 'Please try again later'}
                  </p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="w-10 h-10 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-1">No transactions yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Your wallet transactions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4 p-4 md:p-6">
                  {transactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01, y: -2 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className={`relative overflow-hidden p-4 md:p-5 mobile-glass-panel rounded-3xl transition-all duration-300 ${transaction.type === 'credit' ? 'shadow-[0_0_20px_rgba(34,197,94,0.06)] border-green-500/20' : 'hover:shadow-md'}`}
                    >
                      {transaction.type === 'credit' && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[40px] rounded-full pointer-events-none" />
                      )}
                      <div className="flex items-start gap-4 relative z-10">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            transaction.type === 'credit'
                              ? 'bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                              : 'bg-red-500/10'
                          }`}
                        >
                          {transaction.type === 'credit' ? (
                            <ArrowDownLeft className="w-5 h-5 text-green-500" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <div className="flex-1">
                              <p className="font-medium text-sm md:text-base mb-1.5">
                                {transaction.description || getSourceLabel(transaction.source)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={getSourceColor(transaction.source)}
                                >
                                  {getSourceLabel(transaction.source)}
                                </Badge>
                                {transaction.reference_id && (
                                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                    Ref: {transaction.reference_id.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold text-lg md:text-xl ${
                                  transaction.type === 'credit'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {transaction.type === 'credit' ? '+' : '-'}
                                {formatPrice(transaction.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Balance: {formatPrice(transaction.balance_after)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3 uppercase tracking-wider font-medium">
                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <WalletIcon className="w-4 h-4" />
                How Wallet Works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Refunds from returns are automatically credited to your wallet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Use wallet balance during checkout to pay instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Cashback and promotional credits are added here</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>No expiry on wallet balance - use anytime</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
  );
};

export default Wallet;
