import { useEffect, useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Calendar as CalendarIcon, CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, Filter, Package, Search, Truck, User, XCircle, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { supabaseRestUpdate } from '@/integrations/supabase/publicRest';
import { formatPrice } from '@/data/products';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn, getProductImage, normalizeImageUrl } from '@/lib/utils';
import { products } from '@/data/products';
import { groupOrders, normalizeOrders, OrderGroup, toDatabaseOrderStatus, upsertOrderGroup } from '@/lib/orders';
import { AdminOrdersPage, useAdminOrders } from '@/hooks/useAdminOrders';
import { useDebouncedValue } from '@/lib/utils';
import { useDemoMode } from '@/hooks/useDemoMode';


const DEFAULT_PRODUCT_IMAGE = '/placeholder.svg';
const PAGE_SIZE = 20;
const statusOptions = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

interface UpdateOrderResponse {
  data?: Record<string, unknown>[];
  error?: string;
}

const parseApiResponse = async (response: Response): Promise<UpdateOrderResponse> => {
  const responseText = await response.text();
  if (!responseText) return {};

  try {
    return JSON.parse(responseText) as UpdateOrderResponse;
  } catch {
    return { error: responseText };
  }
};

const buildOrderUpdatePayload = ({
  schemaVersion,
  status,
  estimatedDelivery,
}: {
  schemaVersion: string;
  status: string;
  estimatedDelivery?: string;
}) => {
  const payload: Record<string, unknown> = { status };

  if (estimatedDelivery) {
    payload.estimated_delivery_date = estimatedDelivery;
    if (schemaVersion === 'modern') {
      payload.estimated_delivery_at = `${estimatedDelivery}T00:00:00.000Z`;
    } else {
      payload.estimated_delivery = estimatedDelivery;
    }
  } else {
    payload.estimated_delivery_date = null;
    payload.estimated_delivery_at = null;
    payload.estimated_delivery = null;
  }

  return payload;
};

const updateOrderViaRestFallback = async ({
  order,
  status,
  estimatedDelivery,
}: {
  order: OrderGroup;
  status: string;
  estimatedDelivery?: string;
}) => {
  const payload = buildOrderUpdatePayload({
    schemaVersion: order.schema_version,
    status,
    estimatedDelivery,
  });

  const byIdParams = new URLSearchParams({ id: `eq.${order.source_id}` });
  const byOrderIdParams = new URLSearchParams({
    order_id: `eq.${order.order_id || order.source_id}`,
  });

  let updatedRows = await supabaseRestUpdate<Record<string, unknown>[]>(
    'orders',
    payload,
    byIdParams
  );

  if (!updatedRows || updatedRows.length === 0) {
    updatedRows = await supabaseRestUpdate<Record<string, unknown>[]>(
      'orders',
      payload,
      byOrderIdParams
    );
  }

  return updatedRows || [];
};

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
    case 'Delivered':
      return <div className="w-1.5 h-1.5 rounded-full bg-green-500" />;
    case 'Shipped':
      return <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />;
    case 'Out for Delivery':
      return <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />;
    case 'Processing':
      return <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />;
    case 'Order Placed':
      return <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />;
    case 'Cancelled':
      return <div className="w-1.5 h-1.5 rounded-full bg-red-500" />;
    default:
      return <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
    case 'Shipped':
      return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'Out for Delivery':
      return 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400';
    case 'Processing':
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    case 'Order Placed':
      return 'bg-muted/50 border-muted-foreground/20 text-foreground';
    case 'Cancelled':
      return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
    default:
      return 'bg-muted/50 border-muted-foreground/20 text-foreground';
  }
};

const DatePickerDropdown = ({ order, updateOrderStatus }: { order: OrderGroup; updateOrderStatus: (o: OrderGroup, s: string, d?: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const formattedDate = format(date, 'yyyy-MM-dd');
    if (formattedDate !== (order.estimated_delivery_date ? order.estimated_delivery_date.split('T')[0] : '')) {
      setIsUpdating(true);
      updateOrderStatus(order, order.status, formattedDate);
      setTimeout(() => {
        setIsUpdating(false);
        setOpen(false);
      }, 600); // Wait briefly for UX feedback
    } else {
      setOpen(false);
    }
  };

  let parsedDate: Date | undefined = undefined;
  if (order.estimated_delivery_date) {
    const dateStr = order.estimated_delivery_date.split('T')[0];
    if (dateStr && dateStr.trim() !== '') {
      const d = new Date(dateStr + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-background/50 border-input h-10 px-3 shadow-sm hover:bg-muted/10 transition-all focus-within:ring-1 focus-within:ring-primary",
            !parsedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {parsedDate ? format(parsedDate, "dd MMM yyyy") : <span>Set delivery date</span>}
          {isUpdating && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarPicker
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

const getOrderImageUrl = (order: OrderGroup) => {
  const firstItem = order.items[0];
  if (firstItem?.product_image) {
    return normalizeImageUrl(firstItem.product_image) || DEFAULT_PRODUCT_IMAGE;
  }
  const product = products.find((item) => item.id === firstItem?.product_id);
  return product ? getProductImage(product) : DEFAULT_PRODUCT_IMAGE;
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(0, { bounce: 0, duration: 2000 });
  const display = useTransform(spring, (current) => Math.round(current));
  
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  
  return <motion.span>{display}</motion.span>;
};

const AdminOrders = () => {
  const { isDemoMode, simulateAction } = useDemoMode();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 300);

  const { data, isLoading, isFetching, error } = useAdminOrders({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearchQuery,
    status: statusFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, statusFilter]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Orders unavailable',
        description: 'Admin order data could not be loaded right now.',
        variant: 'destructive',
      });
    }
  }, [error]);

  const orders = data.orders;
  const totalPages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));

  const orderStats = useMemo(() => {
    return {
      total: data.totalCount,
      pending: orders.filter((order) => order.status === 'Order Placed' || order.status === 'Processing').length,
      shipped: orders.filter((order) => order.status === 'Shipped' || order.status === 'Out for Delivery').length,
      delivered: orders.filter((order) => order.status === 'Delivered').length,
    };
  }, [data.totalCount, orders]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, displayStatus, estimatedDelivery }: { order: OrderGroup; displayStatus: string; estimatedDelivery?: string }) => {
      if (displayStatus === 'Cancelled') {
        const { data: cancelResult, error: rpcError } = await supabase.rpc('handle_order_cancellation', {
          p_order_id: order.order_id || order.source_id,
          p_user_id: order.user_id,
          p_cancelled_by: 'admin'
        });

        if (rpcError) throw rpcError;
        if (!cancelResult.success) throw new Error(cancelResult.error);

        return {
          ...order,
          status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
        };
      }

      const databaseStatus = toDatabaseOrderStatus(displayStatus);

      let updatedRows;
      try {
        updatedRows = await updateOrderViaRestFallback({
          order,
          status: databaseStatus,
          estimatedDelivery,
        });
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Update failed';
        throw new Error(fallbackMessage);
      }

      return groupOrders(normalizeOrders(updatedRows))[0] ?? {
        ...order,
        status: displayStatus,
        estimated_delivery_date: estimatedDelivery || order.estimated_delivery_date,
      };
    },
    onMutate: async ({ order, displayStatus, estimatedDelivery }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });
      const snapshots = queryClient.getQueriesData<AdminOrdersPage>({ queryKey: ['admin-orders'] });

      queryClient.setQueriesData<AdminOrdersPage>({ queryKey: ['admin-orders'] }, (currentPage) => {
        if (!currentPage) return currentPage;

        return {
          ...currentPage,
          orders: currentPage.orders.map((existing) =>
            existing.id === order.id
              ? {
                ...existing,
                status: displayStatus,
                estimated_delivery_date: estimatedDelivery || existing.estimated_delivery_date,
              }
              : existing
          ),
        };
      });

      return { snapshots };
    },
    onError: (mutationError, _variables, context) => {
      console.error('Error updating order:', mutationError);
      context?.snapshots.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData(queryKey, snapshot);
      });
      toast({
        title: 'Failed to update order status',
        description: mutationError instanceof Error ? mutationError.message : 'Unknown error',
        variant: 'destructive',
      });
    },
    onSuccess: (updatedOrder) => {
      queryClient.setQueriesData<AdminOrdersPage>({ queryKey: ['admin-orders'] }, (currentPage) => {
        if (!currentPage) return currentPage;
        return {
          ...currentPage,
          orders: upsertOrderGroup(currentPage.orders, updatedOrder, {
            search: debouncedSearchQuery,
            status: statusFilter,
          }).slice(0, currentPage.pageSize),
        };
      });

      const successTitle = isDemoMode ? 'Order Status Simulated' : 'Order Updated';
      toast({
        title: successTitle,
        description: isDemoMode ? `Demo Mode: Status visually changed to ${updatedOrder.status}` : `Order status changed to ${updatedOrder.status}`,
      });
    },
  });

  const updateOrderStatus = (order: OrderGroup, displayStatus: string, estimatedDelivery?: string) => {
    updateStatusMutation.mutate({ order, displayStatus, estimatedDelivery });
  };

  return (
    <AdminLayout>
      <div className="px-3 py-4 md:p-6 lg:p-8 space-y-5 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold mb-1">Orders</h1>
          <p className="text-xs md:text-base text-muted-foreground">Track and manage customer orders.</p>
        </div>

        <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 lg:grid-cols-4 gap-4'}>
          {[
            { label: 'Total', value: orderStats.total, icon: Package, color: 'text-white', iconGradient: 'from-indigo-400 to-indigo-600', haloColor: 'bg-indigo-500' },
            { label: 'Pending', value: orderStats.pending, icon: Clock, color: 'text-white', iconGradient: 'from-amber-400 to-amber-600', haloColor: 'bg-amber-500' },
            { label: 'Shipped', value: orderStats.shipped, icon: Truck, color: 'text-white', iconGradient: 'from-sky-400 to-sky-600', haloColor: 'bg-sky-500' },
            { label: 'Delivered', value: orderStats.delivered, icon: CheckCircle, color: 'text-white', iconGradient: 'from-emerald-400 to-emerald-600', haloColor: 'bg-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-card border border-border/50 rounded-xl cursor-default ${isMobile ? 'p-3.5' : 'p-5'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className={`absolute inset-0 blur-xl opacity-30 dark:opacity-40 rounded-full ${stat.haloColor}`} />
                  <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.iconGradient} text-white shadow-xl shadow-black/10 ring-1 ring-inset ring-white/30`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">
                <AnimatedNumber value={stat.value} />
              </p>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by order or customer..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {isMobile ? (
          /* ── MOBILE ORDERS ── */
          <div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-20 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <Package size={28} className="mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No orders matched this filter.</p>
              </div>
            ) : (
              /* ── MOBILE ORDER CARDS ── */
              <div className="space-y-2">
                {orders.map((order) => (
                  <Dialog key={order.id}>
                    <DialogTrigger asChild>
                      <button className="w-full text-left bg-card border border-border/60 rounded-2xl p-3.5 active:scale-[0.99] transition-transform">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/40">
                            <img loading="lazy" decoding="async"
                              src={getOrderImageUrl(order)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={({ currentTarget }) => { currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold truncate">{order.customer_name || 'Unknown'}</p>
                              <span className="text-sm font-bold text-foreground shrink-0">{formatPrice(order.grand_total)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <span className="text-[10px] font-mono text-muted-foreground">{order.order_id || order.id}</span>
                              <Badge variant="outline" className={cn('text-[9px] px-2 py-0.5 rounded-full shadow-none', getStatusColor(order.status))}>
                                <div className="flex items-center gap-1.5">
                                  {getStatusIcon(order.status)}
                                  <span className="font-semibold">{order.status}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {formatOrderDate(order.order_date)} · {order.items.length} item{order.items.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
                      <DialogHeader className="border-b pb-4">
                        <div className="flex items-center justify-between">
                          <DialogTitle className="text-lg font-bold">Order Details</DialogTitle>
                          <Badge variant="outline" className={cn("px-3 py-1 rounded-full shadow-sm", getStatusColor(order.status))}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <span className="font-semibold">{order.status}</span>
                            </div>
                          </Badge>
                        </div>
                      </DialogHeader>
                      <div className="space-y-5 py-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono font-medium">{order.order_id || order.id}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{order.customer_name || 'Unknown'}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatOrderDate(order.order_date)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="uppercase text-xs font-medium">{order.payment_method || 'N/A'}</span></div>
                          {order.shipping_address && (
                            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[60%] text-xs">{[order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', ')}</span></div>
                          )}
                        </div>
                        <div className="border-t border-border pt-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Items ({order.items.length})</p>
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 py-2">
                              <img loading="lazy" decoding="async" src={item.product_image ? normalizeImageUrl(item.product_image) || DEFAULT_PRODUCT_IMAGE : DEFAULT_PRODUCT_IMAGE} alt="" className="w-10 h-12 rounded-lg object-cover bg-muted border border-border/40" onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }} />
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.product_name}</p><p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p></div>
                              <p className="text-sm font-bold shrink-0">{formatPrice(item.total_price)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-border pt-3 flex justify-between items-center">
                          <span className="font-semibold">Grand Total</span>
                          <span className="text-lg font-black text-primary">{formatPrice(order.grand_total)}</span>
                        </div>
                        <div className="border-t border-border pt-3 space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Update Status</label>
                            <Select value={order.status} onValueChange={(value) => updateOrderStatus(order, value)}>
                              <SelectTrigger className="w-full h-10 rounded-lg"><SelectValue /></SelectTrigger>
                              <SelectContent>{statusOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. Delivery</label>
                            <DatePickerDropdown order={order} updateOrderStatus={updateOrderStatus} />
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
                {/* Mobile pagination */}
                <div className="flex items-center justify-between pt-3">
                  <p className="text-[10px] text-muted-foreground">{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, data.totalCount)} of {data.totalCount}</p>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={page === 1} className="h-8 px-2.5 text-xs"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <span className="text-xs text-muted-foreground px-1">{page}/{totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((c) => Math.min(totalPages, c + 1))} disabled={page === totalPages} className="h-8 px-2.5 text-xs"><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP TABLE ── */
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Orders</CardTitle>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
                {isFetching && !isLoading ? ' • Updating…' : ''}
              </span>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No orders matched this filter.</div>
              ) : (
                <>
                  <div className="admin-table-responsive overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Est. Delivery</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <motion.tbody
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {orders.map((order) => (
                          <motion.tr
                            key={order.id}
                            variants={rowVariants}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            <TableCell data-label="Order ID" className="font-mono text-sm">{order.order_id || order.id}</TableCell>
                            <TableCell data-label="Customer">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {order.customer_name || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell data-label="Items">
                              <div className="flex items-center gap-3">
                                <img loading="lazy" decoding="async"
                                  src={getOrderImageUrl(order)}
                                  alt={order.items[0]?.product_name || 'Order item'}
                                  onError={({ currentTarget }) => {
                                    currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                                  }}
                                  className="w-10 h-10 object-cover rounded"
                                />
                                <div>
                                  <span className="font-medium">{order.items[0]?.product_name || 'Order item'}</span>
                                  {order.items.length > 1 && (
                                    <p className="text-xs text-muted-foreground">+{order.items.length - 1} more item(s)</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-label="Qty">{order.total_quantity}</TableCell>
                            <TableCell data-label="Total">{formatPrice(order.grand_total)}</TableCell>
                            <TableCell data-label="Date">{formatOrderDate(order.order_date)}</TableCell>
                            <TableCell data-label="Status">
                              <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 shadow-none", getStatusColor(order.status))}>
                                <div className="flex items-center gap-1.5">
                                  {getStatusIcon(order.status)}
                                  <span className="text-xs font-semibold">{order.status}</span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell data-label="Delivery">{order.estimated_delivery_date ? formatOrderDate(order.estimated_delivery_date) : 'Not set'}</TableCell>
                            <TableCell data-label="Actions" className="actions-cell">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <DialogHeader className="border-b pb-4">
                                      <div className="flex items-center justify-between">
                                        <DialogTitle className="text-xl font-bold">Order Details</DialogTitle>
                                        <Badge variant="outline" className={cn("px-3 py-1 rounded-full shadow-sm", getStatusColor(order.status))}>
                                          <div className="flex items-center gap-2">
                                            {getStatusIcon(order.status)}
                                            <span className="font-semibold tracking-wide">{order.status}</span>
                                          </div>
                                        </Badge>
                                      </div>
                                    </DialogHeader>

                                    <div className="space-y-8 py-4">
                                      {/* Info Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <div className="space-y-4">
                                          <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <Package className="w-4 h-4 text-muted-foreground" />
                                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Information</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                              <span className="text-muted-foreground">Order ID:</span>
                                              <span className="font-mono font-medium">{order.order_id || order.id}</span>
                                              <span className="text-muted-foreground">Date:</span>
                                              <span>{formatOrderDate(order.order_date)}</span>
                                              <span className="text-muted-foreground">Payment:</span>
                                              <span className="font-medium text-primary uppercase">{order.payment_method || 'N/A'}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-4">
                                          <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <User className="w-4 h-4 text-muted-foreground" />
                                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Details</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 text-sm">
                                              <p className="font-medium text-base">{order.customer_name || 'Unknown'}</p>
                                              <div className="flex items-center gap-2 text-muted-foreground">
                                                <div className="w-4 h-4 flex items-center justify-center">📞</div>
                                                <span>{order.customer_phone || 'N/A'}</span>
                                              </div>
                                              <div className="flex items-start gap-2 text-muted-foreground mt-1">
                                                <div className="w-4 h-4 flex items-center justify-center mt-0.5">📍</div>
                                                <span className="leading-tight">
                                                  {[order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', ') || 'N/A'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Items Section */}
                                      <div className="space-y-4">
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                          Items <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px]">{order.items.length}</Badge>
                                        </h3>
                                        <motion.div
                                          variants={containerVariants}
                                          initial="hidden"
                                          animate="visible"
                                          className="space-y-3"
                                        >
                                          {order.items.map((item) => {
                                            const product = products.find(p => p.id === item.product_id);
                                            const imageUrl = item.product_image
                                              ? normalizeImageUrl(item.product_image)
                                              : (product ? getProductImage(product) : DEFAULT_PRODUCT_IMAGE);

                                            return (
                                              <motion.div
                                                key={item.id}
                                                variants={itemVariants}
                                                whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                                                className="flex items-center gap-4 group p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all hover:bg-muted/30"
                                              >
                                                <div className="relative w-16 h-20 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                                                  <img loading="lazy" decoding="async"
                                                    src={imageUrl}
                                                    alt={item.product_name}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                                                  />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-semibold text-sm truncate">{item.product_name}</p>
                                                  <p className="text-xs text-muted-foreground mt-0.5">
                                                    Qty: <span className="font-medium text-foreground">{item.quantity}</span>
                                                  </p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="font-bold text-sm">{formatPrice(item.total_price)}</p>
                                                  <p className="text-[10px] text-muted-foreground">{formatPrice(item.unit_price)} each</p>
                                                </div>
                                              </motion.div>
                                            );
                                          })}
                                        </motion.div>
                                      </div>

                                      {/* Calculation Summary */}
                                      <div className="flex justify-end pt-4 border-t">
                                        <div className="w-full max-w-[240px] space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Discount Applied</span>
                                            <span className="text-green-600 dark:text-green-400 font-medium">-{formatPrice(order.discount_applied || 0)}</span>
                                          </div>
                                          <div className="flex justify-between items-center pt-2 border-t">
                                            <span className="text-base font-semibold">Grand Total</span>
                                            <span className="text-xl font-black text-primary">{formatPrice(order.grand_total)}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Manage Section */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                                        <div className="space-y-2">
                                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" /> Update Status
                                          </label>
                                          <Select value={order.status} onValueChange={(value) => updateOrderStatus(order, value)}>
                                            <SelectTrigger className="w-full h-10 rounded-lg">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {statusOptions.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                  {status}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="space-y-2">
                                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                            <CalendarIcon className="w-3 h-3" /> Est. Delivery Date
                                          </label>
                                          <div className="relative">
                                            <DatePickerDropdown order={order} updateOrderStatus={updateOrderStatus} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </Table>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, data.totalCount)} of {data.totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
