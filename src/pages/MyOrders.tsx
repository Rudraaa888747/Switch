import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, History, Package, Truck, Undo2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/data/products';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn, getProductImage, normalizeImageUrl } from '@/lib/utils';
import { products } from '@/data/products';
import { OrderGroup } from '@/lib/orders';
import { getUserOrdersQueryKey, useUserOrders } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import ReturnItemsModal from '@/components/orders/ReturnItemsModal';
import OrderInvoiceModal from '@/components/orders/OrderInvoiceModal';
import { useUserReturns } from '@/hooks/useReturns';
import { useDocumentTitle } from '@/lib/utils';

const STATUS_STEPS = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
const PAGE_SIZE = 5;
const DEFAULT_PRODUCT_IMAGE = '/placeholder.svg';

const formatOrderDate = (dateValue?: string | null) => {
  if (!dateValue) return 'Date unavailable';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Order Placed':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'Processing':
      return <Package className="h-4 w-4 text-yellow-500" />;
    case 'Shipped':
      return <Truck className="h-4 w-4 text-purple-500" />;
    case 'Out for Delivery':
      return <Truck className="h-4 w-4 text-orange-500" />;
    case 'Delivered':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Order Placed':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30';
    case 'Processing':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30';
    case 'Shipped':
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30';
    case 'Out for Delivery':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30';
    case 'Delivered':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    case 'Cancelled':
      return 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30';
    default:
      return 'bg-muted text-foreground border border-border';
  }
};

const isCancellableStatus = (status: string) => status === 'Order Placed' || status === 'Processing';

const getOrderImageUrl = (order: OrderGroup) => {
  const firstItem = order.items[0];
  if (firstItem?.product_image) {
    return normalizeImageUrl(firstItem.product_image) || DEFAULT_PRODUCT_IMAGE;
  }
  const product = products.find((item) => item.id === firstItem?.product_id);
  return product ? getProductImage(product) : DEFAULT_PRODUCT_IMAGE;
};

const OrderProgress = ({ status }: { status: string }) => {
  const currentIndex = STATUS_STEPS.findIndex((step) => step === status);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {STATUS_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isCompleted ? 'bg-emerald-500' : isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
              <span className={cn('whitespace-nowrap text-xs', isActive ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
                {step}
              </span>
              {index < STATUS_STEPS.length - 1 && (
                <span className={cn('h-px flex-1', isCompleted ? 'bg-emerald-500/70' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>
      {status === 'Cancelled' && (
        <p className="text-sm text-red-600 dark:text-red-400">Order cancelled. No further updates will be made.</p>
      )}
    </div>
  );
};

const RETURN_STEPS = ['Requested', 'Approved', 'Picked Up', 'Refunded'];

const ReturnProgress = ({ status }: { status: string }) => {
  const currentIndex = RETURN_STEPS.findIndex((step) => step.toLowerCase() === status.toLowerCase().replace('_', ' '));
  const isRejected = status.toLowerCase() === 'rejected';
  
  return (
    <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/60">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Track Return</h4>
        {isRejected ? (
          <Badge variant="destructive" className="text-[10px] uppercase">Rejected</Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-tighter">
              {status.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {!isRejected && (
        <div className="flex items-center justify-between relative px-2">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-1000" 
            style={{ width: `${Math.max(0, currentIndex) * (100 / (RETURN_STEPS.length - 1))}%` }}
          />

          {RETURN_STEPS.map((step, index) => {
            const isCompleted = index <= currentIndex;
            return (
              <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                <div 
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                    isCompleted ? "bg-emerald-500 border-emerald-500" : "bg-card border-border"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider",
                  isCompleted ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}
      
      {isRejected && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <p>Your return request was rejected. Please contact support for more information.</p>
        </div>
      )}
    </div>
  );
};

const MyOrders = () => {
  useDocumentTitle('My Orders | SWITCH');
  const queryClient = useQueryClient();
  const { user, supabaseUser, session, isAuthenticated, isAuthReady } = useAuth();
  const userId = supabaseUser?.id || user?.id;
  const accessToken = session?.access_token ?? null;
  const { data: orders = [], isLoading, error } = useUserOrders(userId, accessToken);
  const { data: returns = [], error: returnsError } = useUserReturns(userId, accessToken);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<OrderGroup | null>(null);

  useEffect(() => {
    if (returns.length > 0) {
      console.log('User returns loaded:', returns);
    }
    if (returnsError) {
      console.error('User returns fetch error:', returnsError);
    }
  }, [returns, returnsError]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [userId, orders.length]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    }
  }, [error]);

  const visibleOrders = useMemo(() => orders.slice(0, visibleCount), [orders, visibleCount]);
  const hasMore = visibleCount < orders.length;

  const cancelOrder = async (order: OrderGroup) => {
    if (!userId) return;

    try {
      const { data: cancelResult, error: rpcError } = await supabase.rpc('handle_order_cancellation', {
        p_order_id: order.order_id || order.source_id,
        p_user_id: userId,
        p_cancelled_by: 'user'
      });

      if (rpcError) throw rpcError;
      if (!cancelResult.success) throw new Error(cancelResult.error);

      queryClient.invalidateQueries({ queryKey: getUserOrdersQueryKey(userId) });
      
      // Also invalidate wallet balance
      queryClient.invalidateQueries({ queryKey: ['wallet-profile-balance', userId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', userId] });

      toast({
        title: 'Order Cancelled',
        description: cancelResult.refunded_amount > 0 
          ? `Order cancelled and ${formatPrice(cancelResult.refunded_amount)} refunded to your wallet.`
          : 'Your order has been cancelled successfully.',
      });
    } catch (cancelError) {
      console.error('Error cancelling order:', cancelError);
      toast({
        title: 'Error',
        description: cancelError instanceof Error ? cancelError.message : 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthReady && !userId) {
    return (
        <div className="container-custom py-20 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <h1 className="text-2xl font-bold mb-4">Loading your account</h1>
          <p className="text-muted-foreground mb-8">Restoring your session and orders...</p>
        </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
        <div className="container-custom py-20 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-8">You need to be logged in to view your orders</p>
        </div>
    );
  }

  return (
      <div className="container-custom py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 uppercase tracking-widest">My Orders</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                    <div className="h-20 bg-gray-200 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
            <Card className="border-border/60 shadow-lg bg-card/50 backdrop-blur-xl">
              <CardContent className="p-16 text-center flex flex-col items-center">
                <Package className="h-14 w-14 mb-6 stroke-[1] text-foreground/30" />
                <h2 className="text-2xl font-light tracking-wide mb-3">No orders yet</h2>
                <p className="text-muted-foreground/80 mb-8 max-w-[16rem] text-sm leading-relaxed">
                  Your journey with our premium collection begins here.
                </p>
                <Button asChild className="btn-primary rounded-full px-8 py-6 h-auto text-[10px] uppercase tracking-widest group">
                  <a href="/shop" className="flex items-center gap-2">
                    Explore Collection
                    <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {visibleOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden border border-border/70 shadow-md">
                  <CardHeader className="bg-card py-5">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <img loading="lazy" decoding="async"
                            src={getOrderImageUrl(order)}
                            alt={order.items[0]?.product_name || 'Order item'}
                            onError={({ currentTarget }) => {
                              currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                            }}
                            className="w-20 h-20 object-cover rounded-xl border border-border"
                          />
                          <div className="space-y-1">
                            <h3 className="font-semibold text-lg text-foreground">{order.order_id || order.id}</h3>
                            <p className="text-sm text-muted-foreground">Order date: {formatOrderDate(order.order_date)}</p>
                            <p className="text-sm text-muted-foreground">
                              Estimated delivery: {formatOrderDate(order.estimated_delivery_date)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.items.length} item{order.items.length > 1 ? 's' : ''} • Qty {order.total_quantity}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">Payment</p>
                            <p className="font-semibold text-foreground uppercase">{order.payment_method || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-semibold text-foreground">{formatPrice(order.grand_total)}</p>
                          </div>
                        </div>

                          <div className="flex flex-col items-start gap-3 lg:items-end w-full lg:w-auto">
                            <div className="flex items-center justify-between lg:justify-end w-full gap-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(order.status)}
                                <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                              </div>
                            </div>
                            
                            <OrderInvoiceModal order={order} />
                          
                          {(() => {
                            const returnRequest = returns.find(r => r.order_id === order.source_id);
                            if (!returnRequest) return null;
                            
                            return (
                              <div className="w-full mt-2">
                                <ReturnProgress status={returnRequest.status} />
                              </div>
                            );
                          })()}

                          <OrderProgress status={order.status} />
                          {isCancellableStatus(order.status) ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 border-red-500/40"
                                >
                                  Cancel Order
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this order? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Order</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => cancelOrder(order)} className="bg-red-600 hover:bg-red-700">
                                    Cancel Order
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button variant="outline" size="sm" disabled className="cursor-not-allowed">
                              Cancel not available
                            </Button>
                          )}

                          {order.status === 'Delivered' && (() => {
                            const returnRequest = returns.find(r => r.order_id === order.source_id);
                            
                            if (returnRequest) {
                              return (
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  disabled
                                  className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default"
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  Return in Progress
                                </Button>
                              );
                            }

                            return (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedOrderForReturn(order);
                                  setIsReturnModalOpen(true);
                                }}
                                className="w-full bg-card border-border hover:bg-muted text-foreground"
                              >
                                <Undo2 className="mr-2 h-4 w-4" />
                                Return Items
                              </Button>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-border bg-muted/20 p-4 flex gap-3">
                            {item.product_image && (
                              <img loading="lazy" decoding="async" 
                                src={normalizeImageUrl(item.product_image)} 
                                alt={item.product_name} 
                                className="w-12 h-16 object-cover rounded-lg border border-border"
                                onError={({ currentTarget }) => {
                                  currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                                }}
                              />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                              <p className="text-sm text-muted-foreground">Line total: {formatPrice(item.total_price)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {hasMore && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}>
                    Load more orders
                  </Button>
                </div>
              )}
            </div>
          )}

          {selectedOrderForReturn && (
            <ReturnItemsModal
              order={selectedOrderForReturn}
              isOpen={isReturnModalOpen}
              onClose={() => {
                setIsReturnModalOpen(false);
                setSelectedOrderForReturn(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['user-returns', userId] });
              }}
              accessToken={accessToken}
            />
          )}
        </motion.div>
      </div>
  );
};

export default MyOrders;
