import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { differenceInDays, format } from 'date-fns';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  Filter,
  ImageIcon,
  Layers3,
  ListFilter,
  Loader2,
  Package,
  Search,
  Undo2,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ProductImageViewer } from '@/components/admin/ProductImageViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice, products } from '@/data/products';
import { useDebouncedValue } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { createAdminNotification } from '@/lib/adminNotifications';
import { normalizeOrders } from '@/lib/orders';
import { getReturnReasonBadgeClass, getReturnReasonLabel, RETURN_REASON_OPTIONS } from '@/lib/returnReasons';
import { cn, getProductImage, normalizeImageUrl } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_PRODUCT_IMAGE = '/placeholder.svg';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected'],
  approved: ['picked_up', 'rejected'],
  picked_up: ['refunded', 'rejected'],
  refunded: [],
  rejected: [],
  cancelled: [],
};

const STATUS_FLOW = [
  { key: 'requested', label: 'Requested', icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'picked_up', label: 'Picked Up', icon: Package },
  { key: 'refunded', label: 'Refunded', icon: CreditCard },
];

const MOBILE_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'requested', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'picked_up', label: 'Refund' },
  { key: 'refunded', label: 'Done' },
  { key: 'rejected', label: 'Rejected' },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'refund_high', label: 'Highest Refund' },
  { value: 'refund_low', label: 'Lowest Refund' },
  { value: 'customer', label: 'Customer A-Z' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

type AdminReturnRow = Record<string, unknown> & {
  id?: string;
  user_id?: string;
  order_id?: string;
  status?: string;
  reason?: string | null;
  comment?: string | null;
  additional_details?: string | null;
  images?: string[] | null;
  admin_note?: string | null;
  created_at?: string;
  estimated_refund_date?: string;
  quantity?: number;
  order_item_id?: string;
  return_request_id?: string;
  refund_method?: string | null;
  payment_mode?: string | null;
  items?: AdminReturnRow[];
  profiles?: { display_name?: string } | null;
  orders?: { order_id?: string } | null;
  _order_total?: number;
  order_items?: { product_name?: string; product_image?: string; unit_price?: number };
};

type UpdateReturnPayload = {
  id: string;
  status?: string;
  refund_amount?: number;
  estimated_refund_date?: string;
  admin_note?: string | null;
  process_wallet_refund?: boolean;
  wallet_user_id?: string;
  wallet_reference_id?: string;
  wallet_description?: string;
};

const parseImageUrls = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const getStatusBadge = (status?: string) => {
  const value = (status || '').toLowerCase();
  if (value === 'requested') return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30 whitespace-nowrap">Requested</Badge>;
  if (value === 'approved') return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 whitespace-nowrap">Approved</Badge>;
  if (value === 'picked_up') return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30 whitespace-nowrap">Picked Up</Badge>;
  if (value === 'refunded') return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap">Refunded</Badge>;
  if (value === 'rejected') return <Badge variant="destructive" className="whitespace-nowrap">Rejected</Badge>;
  return <Badge variant="secondary" className="whitespace-nowrap">{status || 'Unknown'}</Badge>;
};

const getMobileStatusPillClass = (status?: string) => {
  const value = (status || '').toLowerCase();
  if (value === 'requested') return 'bg-yellow-500/12 text-yellow-700 border-yellow-500/30 dark:text-yellow-300';
  if (value === 'approved') return 'bg-blue-500/12 text-blue-700 border-blue-500/30 dark:text-blue-300';
  if (value === 'picked_up') return 'bg-orange-500/12 text-orange-700 border-orange-500/30 dark:text-orange-300';
  if (value === 'refunded') return 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300';
  if (value === 'rejected') return 'bg-red-500/12 text-red-700 border-red-500/30 dark:text-red-300';
  return 'bg-muted text-muted-foreground border-border';
};

const getRelativeAgeLabel = (createdAt?: string) => {
  if (!createdAt) return 'Date unavailable';
  const daysAgo = Math.abs(differenceInDays(new Date(createdAt), new Date()));
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return '1d ago';
  return `${daysAgo}d ago`;
};

const getPriorityLabel = (ret: AdminReturnRow) => {
  const status = String(ret.status || '').toLowerCase();
  const daysAgo = ret.created_at ? Math.abs(differenceInDays(new Date(ret.created_at), new Date())) : 0;
  if (status === 'requested' && daysAgo >= 3) return { label: 'Urgent', className: 'text-red-600 dark:text-red-300' };
  if (status === 'requested') return { label: 'Needs Review', className: 'text-yellow-700 dark:text-yellow-300' };
  if (status === 'picked_up') return { label: 'Refund Queue', className: 'text-orange-700 dark:text-orange-300' };
  if (status === 'approved') return { label: 'Awaiting Pickup', className: 'text-blue-700 dark:text-blue-300' };
  if (status === 'refunded') return { label: 'Closed', className: 'text-emerald-700 dark:text-emerald-300' };
  return { label: 'Closed', className: 'text-muted-foreground' };
};

const isValidTransition = (current: string, next: string): boolean => {
  const allowed = ALLOWED_TRANSITIONS[current.toLowerCase()];
  return !!allowed && allowed.includes(next.toLowerCase());
};

const formatDate = (dateValue?: string | null) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'dd MMM yyyy');
};

const loadReturns = async () => {
  const { data: returnRequests, error: returnError } = await supabase
    .from('return_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (returnError) throw new Error(returnError.message);

  const requests = (returnRequests || []) as AdminReturnRow[];
  const requestIds = [...new Set(requests.map((row) => row.id).filter(Boolean))] as string[];
  const orderIds = [...new Set(requests.map((row) => row.order_id).filter(Boolean))] as string[];
  const userIds = [...new Set(requests.map((row) => row.user_id).filter(Boolean))] as string[];

  const [itemsRes, ordersRes, profilesRes] = await Promise.all([
    requestIds.length
      ? supabase.from('return_request_items').select('*').in('return_request_id', requestIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? supabase.from('orders').select('*').in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    returnRequests: requests,
    orders: (ordersRes.data || []) as AdminReturnRow[],
    profiles: (profilesRes.data || []) as AdminReturnRow[],
    items: (itemsRes.data || []) as AdminReturnRow[],
  };
};

const ReturnTimeline = ({ status }: { status: string }) => {
  const currentStatus = status.toLowerCase();
  const currentIdx = STATUS_FLOW.findIndex((step) => step.key === currentStatus);
  const isRejected = currentStatus === 'rejected';

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">Return Rejected</p>
          <p className="mt-0.5 text-xs text-muted-foreground">This return request has been declined.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {STATUS_FLOW.map((step, index) => {
        const isActive = index === currentIdx;
        const isCompleted = index < currentIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500',
                  isCompleted ? 'bg-emerald-500' : isActive ? 'bg-primary' : 'bg-muted border border-border',
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : (
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                )}
              </div>
              {index < STATUS_FLOW.length - 1 && (
                <div className={cn('h-8 w-0.5 transition-colors duration-500', isCompleted ? 'bg-emerald-500' : 'bg-border')} />
              )}
            </div>
            <div className="pt-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-foreground' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isCompleted ? 'Completed' : isActive ? 'Current' : 'Pending'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminReturns = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState<AdminReturnRow | null>(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortValue>('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim().toLowerCase(), 220);

  React.useEffect(() => {
    const channel = supabase
      .channel('admin-returns-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, () => queryClient.invalidateQueries({ queryKey: ['admin-returns'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'return_request_items' }, () => queryClient.invalidateQueries({ queryKey: ['admin-returns'] }))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: async () => {
      const payload = await loadReturns();
      const requests = payload.returnRequests || [];
      const profilesMap = new Map((payload.profiles || []).map((row) => [String(row.user_id), row]));
      const ordersMap = new Map((payload.orders || []).map((row) => [String(row.id), row]));
      const itemsMap = new Map<string, AdminReturnRow[]>();

      (payload.items || []).forEach((item) => {
        const key = String(item.return_request_id || '');
        if (!key) return;
        itemsMap.set(key, [...(itemsMap.get(key) || []), item]);
      });

      return requests.map((ret) => {
        const order = ordersMap.get(String(ret.order_id));
        const profile = profilesMap.get(String(ret.user_id));
        const normalizedOrderItems = order ? normalizeOrders([order]) : [];
        const returnItems = (itemsMap.get(String(ret.id)) || []).map((ri) => {
          const match = normalizedOrderItems.find((oi) => oi.id === ri.order_item_id || oi.product_id === ri.order_item_id);
          const product = products.find((p) => p.id === (match?.product_id || ri.order_item_id));
          const image = product
            ? getProductImage(product)
            : match?.product_image
              ? normalizeImageUrl(match.product_image) || match.product_image
              : DEFAULT_PRODUCT_IMAGE;

          return {
            ...ri,
            order_items: {
              product_name: product?.name || match?.product_name || 'Order Item',
              product_image: image || DEFAULT_PRODUCT_IMAGE,
              unit_price:
                match && Number(match.quantity || 0) > 0
                  ? Number(match.total_price || 0) / Number(match.quantity || 1)
                  : Number(match?.total_price || 0),
            },
          };
        });

        return {
          ...ret,
          reason: ret.reason || 'other',
          comment: (ret.comment as string) || (ret.additional_details as string) || null,
          images: parseImageUrls(ret.images),
          payment_mode: order?.payment_mode || order?.payment_method || 'cod',
          profiles: { display_name: String(profile?.display_name || 'Anonymous') },
          orders: { order_id: String(order?.order_id || order?.order_number || order?.id || ret.id || '') },
          items: returnItems,
          _order_total: Number(order?.total || order?.grand_total || order?.grand_total_amount || 0),
        } as AdminReturnRow;
      });
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const computeRefundTotal = useCallback((ret: AdminReturnRow) => {
    const itemTotal = (ret.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.order_items?.unit_price || 0),
      0,
    );
    return itemTotal > 0 ? itemTotal : Number(ret._order_total || 0);
  }, []);

  const updateReturnMutation = useMutation({
    mutationFn: async (payload: UpdateReturnPayload) => {
      let walletCredited = false;

      if (payload.process_wallet_refund && payload.wallet_user_id && payload.refund_amount !== undefined && payload.refund_amount > 0) {
        const walletRef = payload.wallet_reference_id ?? payload.id;
        const { data: existingCredit } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('reference_id', walletRef)
          .eq('type', 'credit')
          .eq('source', 'refund')
          .limit(1);

        if (!existingCredit || existingCredit.length === 0) {
          const { error: rpcError } = await supabase.rpc('add_wallet_credit', {
            p_user_id: payload.wallet_user_id,
            p_amount: payload.refund_amount,
            p_source: 'refund',
            p_reference_id: walletRef,
            p_description: payload.wallet_description ?? `Refund for return #${String(payload.id).slice(0, 8)}`,
          });

          if (rpcError) {
            if (/permission denied/i.test(rpcError.message)) {
              toast.warning('Wallet credit failed — run the grant migration to fix');
            }
            throw new Error(`RPC Failed: ${rpcError.message}`);
          }
          walletCredited = true;
        } else {
          walletCredited = true;
        }
      }

      const body: Record<string, unknown> = {};
      if (payload.status !== undefined) body.status = payload.status;
      if (payload.refund_amount !== undefined) body.refund_amount = payload.refund_amount;
      if (payload.estimated_refund_date !== undefined) body.estimated_refund_date = payload.estimated_refund_date;
      if (payload.admin_note !== undefined) body.admin_note = payload.admin_note;

      const { error: updateError } = await supabase.from('return_requests').update(body).eq('id', payload.id).select('*');
      if (updateError) throw new Error(updateError.message || 'Failed to update return');

      if (payload.status) {
        createAdminNotification({
          title: 'Return request updated',
          message: `Return ${String(payload.id).slice(0, 8)} moved to ${payload.status.replaceAll('_', ' ')}.`,
          type: payload.status === 'rejected' ? 'warning' : 'info',
          eventType: 'return_request',
          link: '/admin/returns',
          metadata: { returnId: payload.id, status: payload.status },
        }).catch(() => { });
      }

      return { walletCredited };
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['admin-returns'] });
      const previousReturns = queryClient.getQueryData<AdminReturnRow[]>(['admin-returns']);

      if (previousReturns) {
        queryClient.setQueryData<AdminReturnRow[]>(['admin-returns'], (old) => {
          if (!old) return old;
          return old.map(ret => 
            String(ret.id) === payload.id 
              ? { 
                  ...ret, 
                  ...(payload.status ? { status: payload.status } : {}),
                  ...(payload.admin_note !== undefined ? { admin_note: payload.admin_note } : {})
                }
              : ret
          );
        });
      }
      return { previousReturns };
    },
    onSuccess: (result, payload) => {
      queryClient.setQueryData<AdminReturnRow[]>(['admin-returns'], (old) => {
        if (!old) return old;
        return old.map(ret => 
          String(ret.id) === payload.id 
            ? { 
                ...ret, 
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.admin_note !== undefined ? { admin_note: payload.admin_note } : {})
              }
            : ret
        );
      });
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });

      setSelectedReturn((prev) => {
        if (!prev || String(prev.id) !== payload.id) return prev;
        return {
          ...prev,
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.admin_note !== undefined ? { admin_note: payload.admin_note } : {}),
        };
      });

      if (payload.status === 'refunded') {
        if (result?.walletCredited) {
          toast.success(`Refund processed — ₹${Number(payload.refund_amount || 0).toLocaleString('en-IN')} credited to wallet`);
        } else {
          toast.success('Return marked as refunded');
        }
      } else if (payload.status) {
        toast.success(`Return status updated to ${payload.status.replace('_', ' ')}`);
      } else {
        toast.success('Return note saved');
      }
    },
    onError: (error: unknown, payload, context) => {
      if (context?.previousReturns) {
        queryClient.setQueryData(['admin-returns'], context.previousReturns);
      }
      const errorMessage = error instanceof Error ? error.message : (error as Record<string, unknown>)?.message || 'Failed to update return';
      toast.error(String(errorMessage));
    },
  });

  const filteredReturns = useMemo(() => {
    const filtered = returns.filter((ret) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        String(ret.orders?.order_id || '').toLowerCase().includes(debouncedSearchTerm) ||
        String(ret.profiles?.display_name || '').toLowerCase().includes(debouncedSearchTerm) ||
        String(ret.comment || '').toLowerCase().includes(debouncedSearchTerm);
      const matchesStatus = statusFilter === 'all' || String(ret.status) === statusFilter;
      const matchesReason = reasonFilter === 'all' || String(ret.reason) === reasonFilter;
      return matchesSearch && matchesStatus && matchesReason;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === 'oldest') {
        return new Date(String(left.created_at || 0)).getTime() - new Date(String(right.created_at || 0)).getTime();
      }
      if (sortBy === 'refund_high') {
        return computeRefundTotal(right) - computeRefundTotal(left);
      }
      if (sortBy === 'refund_low') {
        return computeRefundTotal(left) - computeRefundTotal(right);
      }
      if (sortBy === 'customer') {
        return String(left.profiles?.display_name || '').localeCompare(String(right.profiles?.display_name || ''));
      }
      return new Date(String(right.created_at || 0)).getTime() - new Date(String(left.created_at || 0)).getTime();
    });
  }, [computeRefundTotal, debouncedSearchTerm, reasonFilter, returns, sortBy, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: returns.length };
    returns.forEach((ret) => {
      const status = String(ret.status || 'unknown');
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [returns]);

  const openReturnsCount = (statusCounts.requested || 0) + (statusCounts.approved || 0) + (statusCounts.picked_up || 0);
  const refundQueueCount = statusCounts.picked_up || 0;
  const activeFilterCount = Number(statusFilter !== 'all') + Number(reasonFilter !== 'all') + Number(sortBy !== 'newest');

  const selectedRows = useMemo(
    () => returns.filter((ret) => selectedIds.has(String(ret.id))),
    [returns, selectedIds],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openReturnDetails = useCallback((ret: AdminReturnRow) => {
    setSelectedReturn(ret);
    setAdminNoteDraft(String(ret.admin_note || ''));
  }, []);

  const closeReturnDetails = useCallback(() => {
    setSelectedReturn(null);
  }, []);

  const processRefund = useCallback(async (ret: AdminReturnRow) => {
    const refundAmount = computeRefundTotal(ret);
    const prevStatus = String(ret.status || '').toLowerCase();

    if (prevStatus === 'refunded') {
      toast.error('This return has already been refunded');
      return;
    }

    if (prevStatus !== 'picked_up') {
      toast.error('Items must be picked up before processing refund');
      return;
    }

    await updateReturnMutation.mutateAsync({
      id: String(ret.id),
      status: 'refunded',
      refund_amount: refundAmount,
      process_wallet_refund: true,
      wallet_user_id: ret.user_id,
      wallet_reference_id: String(ret.id),
      wallet_description: `Refund for return #${String(ret.id).slice(0, 8)}`,
    });
  }, [computeRefundTotal, updateReturnMutation]);

  const updateStatus = useCallback((ret: AdminReturnRow, nextStatus: string) => {
    const currentStatus = String(ret.status || '').toLowerCase();

    if (!isValidTransition(currentStatus, nextStatus)) {
      toast.error(`Cannot move from "${currentStatus.replace('_', ' ')}" to "${nextStatus.replace('_', ' ')}"`);
      return;
    }

    if (nextStatus === 'refunded') {
      void processRefund(ret);
      return;
    }

    const payload: UpdateReturnPayload = { id: String(ret.id), status: nextStatus };
    if (nextStatus === 'approved') {
      payload.refund_amount = Math.round(computeRefundTotal(ret));
    }
    updateReturnMutation.mutate(payload);
  }, [computeRefundTotal, processRefund, updateReturnMutation]);

  const saveAdminNote = useCallback(() => {
    if (!selectedReturn) return;
    updateReturnMutation.mutate({
      id: String(selectedReturn.id),
      admin_note: adminNoteDraft.trim() || null,
    });
  }, [adminNoteDraft, selectedReturn, updateReturnMutation]);

  const getNextAction = useCallback((ret: AdminReturnRow) => {
    const status = String(ret.status || '').toLowerCase();
    if (status === 'requested') return { label: 'Approve', nextStatus: 'approved', icon: CheckCircle, className: 'bg-foreground text-background hover:bg-foreground/90' };
    if (status === 'approved') return { label: 'Mark Picked Up', nextStatus: 'picked_up', icon: Package, className: 'bg-orange-500 text-white hover:bg-orange-600' };
    if (status === 'picked_up') return { label: 'Process Refund', nextStatus: 'refunded', icon: Wallet, className: 'bg-emerald-500 text-white hover:bg-emerald-600' };
    return null;
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelectedId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const batchAction = useMemo(() => {
    if (selectedRows.length === 0) return null;

    const statuses = [...new Set(selectedRows.map((ret) => String(ret.status || '').toLowerCase()))];
    if (statuses.length !== 1) {
      return {
        primary: null,
        secondary: null,
        helper: 'Select returns in the same stage to run a bulk action safely.',
      };
    }

    const [status] = statuses;
    const count = selectedRows.length;

    if (status === 'requested') {
      return {
        primary: { label: `Approve ${count}`, nextStatus: 'approved' },
        secondary: { label: `Reject ${count}`, nextStatus: 'rejected' },
        helper: null,
      };
    }
    if (status === 'approved') {
      return {
        primary: { label: `Mark ${count} Picked Up`, nextStatus: 'picked_up' },
        secondary: { label: `Reject ${count}`, nextStatus: 'rejected' },
        helper: null,
      };
    }
    if (status === 'picked_up') {
      return {
        primary: { label: `Refund ${count}`, nextStatus: 'refunded' },
        secondary: { label: `Reject ${count}`, nextStatus: 'rejected' },
        helper: null,
      };
    }

    return {
      primary: null,
      secondary: null,
      helper: 'Bulk actions are only available for active review queues on mobile.',
    };
  }, [selectedRows]);

  const runBatchAction = useCallback(async (nextStatus: string) => {
    if (selectedRows.length === 0) return;

    for (const ret of selectedRows) {
      const currentStatus = String(ret.status || '').toLowerCase();
      if (!isValidTransition(currentStatus, nextStatus)) continue;

      if (nextStatus === 'refunded') {
        await processRefund(ret);
      } else {
        const payload: UpdateReturnPayload = { id: String(ret.id), status: nextStatus };
        if (nextStatus === 'approved') {
          payload.refund_amount = Math.round(computeRefundTotal(ret));
        }
        await updateReturnMutation.mutateAsync(payload);
      }
    }

    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [computeRefundTotal, processRefund, selectedRows, updateReturnMutation]);

  // Hard reset scroll after inspection
  useEffect(() => {
    if (selectedReturn) {
      // Defer execution slightly to ensure Radix has mounted the Dialog portal
      const timer = setTimeout(() => {
        const container = document.getElementById('mobile-return-scroll-area');
        if (container) {
          container.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedReturn]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:space-y-8 md:p-8">
        {isMobile ? (
          <>
            {/* Header section - Clean, Linear/Stripe style */}
            <div className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur-md px-4 pb-3 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Returns</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">{returns.length} total return requests</p>
                </div>
                <div className="flex gap-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Action Needed</p>
                    <p className="text-lg font-bold text-primary leading-none mt-1">{statusCounts.requested || 0}</p>
                  </div>
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search order, customer..."
                  className="h-10 pl-9 bg-muted/30 border-border/40 rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
                {MOBILE_STATUS_FILTERS.map((status) => (
                  <button
                    key={status.key}
                    type="button"
                    onClick={() => setStatusFilter(status.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                      statusFilter === status.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground hover:bg-muted border-border/40"
                    )}
                  >
                    {status.label} <span className="ml-1 opacity-60">({statusCounts[status.key] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List Section */}
            <div className="px-4 py-4 space-y-3 pb-24">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-4">Loading returns...</p>
                </div>
              ) : filteredReturns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Undo2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No returns found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                filteredReturns.map((ret) => {
                  const nextAction = getNextAction(ret);
                  return (
                    <motion.div
                      key={String(ret.id)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-sm"
                    >
                      <div
                        className="p-4"
                        role="button"
                        onClick={() => openReturnDetails(ret)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold">#{String(ret.orders?.order_id || ret.id || '').slice(0, 8)}</span>
                              {getStatusBadge(String(ret.status || ''))}
                            </div>
                            <p className="text-sm font-medium">{String(ret.profiles?.display_name || 'Anonymous Customer')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatPrice(computeRefundTotal(ret))}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(ret.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-2.5">
                          <div className="flex -space-x-2">
                            {(ret.items || []).slice(0, 3).map((item, i) => (
                              <ProductImageViewer
                                key={i}
                                src={String(item.order_items?.product_image || DEFAULT_PRODUCT_IMAGE)}
                                alt="Item"
                                className="h-8 w-8 rounded-full border-2 border-background object-cover bg-muted"
                              />
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{getReturnReasonLabel(String(ret.reason || 'other'))}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{ret.items?.length || 0} item{(ret.items?.length || 1) !== 1 ? 's' : ''}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>

                      {/* Quick Action Bar for Review Queue */}
                      {String(ret.status || '').toLowerCase() === 'requested' && (
                        <div className="grid grid-cols-2 border-t border-border/40 divide-x divide-border/40">
                          <button
                            disabled={updateReturnMutation.isPending}
                            onClick={() => updateStatus(ret, 'rejected')}
                            className="py-3 text-xs font-medium text-red-600 hover:bg-red-500/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                          <button
                            disabled={updateReturnMutation.isPending}
                            onClick={() => updateStatus(ret, 'approved')}
                            className="py-3 text-xs font-medium text-emerald-600 hover:bg-emerald-500/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Clean Mobile Bottom Sheet for Details */}
            <Sheet open={!!selectedReturn} onOpenChange={(open) => (!open ? closeReturnDetails() : null)}>
              <SheetContent
                id="mobile-return-scroll-area"
                side="bottom"
                style={{ maxHeight: '90dvh' }}
                className="overflow-y-auto p-0 rounded-t-[1.75rem] border-x-0 border-b-0 border-t border-border bg-background sm:max-w-md mx-auto [&>button]:hidden overscroll-none"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  setTimeout(() => {
                    document.getElementById('mobile-return-top')?.focus();
                  }, 10);
                }}
              >
                {selectedReturn && (
                  <div className="flex flex-col relative min-h-full">
                    {/* Sticky Header */}
                    <div id="mobile-return-top" tabIndex={-1} className="outline-none px-4 py-3 border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-50">
                      <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-3" />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Order Return</p>
                          <p className="font-mono text-sm font-bold mt-0.5">#{String(selectedReturn.orders?.order_id || selectedReturn.id || '').slice(0, 16)}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50" onClick={closeReturnDetails}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="p-4 space-y-6">
                      {/* Customer & Status Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-xl font-bold">{String(selectedReturn.profiles?.display_name || 'Anonymous')}</h2>
                          <p className="text-sm text-muted-foreground mt-1">Requested {formatDate(selectedReturn.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{formatPrice(computeRefundTotal(selectedReturn))}</p>
                          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{selectedReturn.payment_mode || 'COD'}</p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(String(selectedReturn.status || ''))}
                        <Badge variant="outline" className="text-xs bg-muted/30">
                          {getReturnReasonLabel(String(selectedReturn.reason || 'other'))}
                        </Badge>
                      </div>

                      {/* Timeline (Linear style) */}
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Timeline</h3>
                        <div className="bg-muted/20 border border-border/40 rounded-2xl p-4">
                          <ReturnTimeline status={String(selectedReturn.status || '')} />
                        </div>
                      </div>

                      {/* Customer Note */}
                      {selectedReturn.comment && (
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Customer Note</h3>
                          <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 text-sm leading-relaxed text-foreground/90">
                            "{String(selectedReturn.comment)}"
                          </div>
                        </div>
                      )}

                      {/* Return Items */}
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                          Items ({selectedReturn.items?.length || 0})
                        </h3>
                        <div className="space-y-3">
                          {(selectedReturn.items || []).map((item) => (
                            <div key={String(item.id)} className="flex gap-3 bg-card border border-border/40 rounded-2xl p-3">
                              <ProductImageViewer
                                src={String(item.order_items?.product_image || DEFAULT_PRODUCT_IMAGE)}
                                alt="Product"
                                className="h-16 w-16 rounded-xl object-cover border border-border/50 bg-muted"
                              />
                              <div className="flex-1 min-w-0 py-1">
                                <p className="font-semibold text-sm truncate">{String(item.order_items?.product_name || 'Item')}</p>
                                <p className="text-xs text-muted-foreground mt-1">Qty: {Number(item.quantity || 0)}</p>
                                <p className="text-sm font-bold text-primary mt-1">{formatPrice(Number(item.order_items?.unit_price || 0))}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Proof Images */}
                      {parseImageUrls(selectedReturn.images).length > 0 && (
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Proof Images</h3>
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                            {parseImageUrls(selectedReturn.images).map((url, idx) => (
                              <ProductImageViewer
                                key={idx}
                                src={url}
                                alt={`Proof ${idx + 1}`}
                                className="h-24 w-24 rounded-2xl object-cover border border-border/50 bg-muted flex-shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Internal Note */}
                      <div className="pb-8">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Internal Note</h3>
                        <Textarea
                          value={adminNoteDraft}
                          onChange={(event) => setAdminNoteDraft(event.target.value)}
                          placeholder="Add private team notes..."
                          className="resize-none bg-muted/20 border-border/40 rounded-2xl focus-visible:ring-1"
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-xl h-8"
                            onClick={saveAdminNote}
                            disabled={updateReturnMutation.isPending}
                          >
                            Save Note
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-auto p-4 bg-background border-t border-border/40 sticky bottom-0 z-50 pb-safe">
                      <div className="flex gap-3">
                        {String(selectedReturn.status || '').toLowerCase() === 'requested' && (
                          <>
                            <Button
                              variant="outline"
                              className="flex-1 h-12 rounded-2xl border-red-500/20 text-red-600 bg-red-500/5 hover:bg-red-500/10"
                              disabled={updateReturnMutation.isPending}
                              onClick={() => updateStatus(selectedReturn, 'rejected')}
                            >
                              Reject
                            </Button>
                            <Button
                              className="flex-1 h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                              disabled={updateReturnMutation.isPending}
                              onClick={() => updateStatus(selectedReturn, 'approved')}
                            >
                              {updateReturnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                            </Button>
                          </>
                        )}
                        {String(selectedReturn.status || '').toLowerCase() === 'approved' && (
                          <Button
                            className="w-full h-12 rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
                            disabled={updateReturnMutation.isPending}
                            onClick={() => updateStatus(selectedReturn, 'picked_up')}
                          >
                            {updateReturnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Picked Up'}
                          </Button>
                        )}
                        {String(selectedReturn.status || '').toLowerCase() === 'picked_up' && (
                          <Button
                            className="w-full h-12 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={updateReturnMutation.isPending}
                            onClick={() => void processRefund(selectedReturn)}
                          >
                            {updateReturnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Process Refund'}
                          </Button>
                        )}
                        {(String(selectedReturn.status || '').toLowerCase() === 'refunded' || String(selectedReturn.status || '').toLowerCase() === 'rejected') && (
                          <div className="w-full h-12 flex items-center justify-center rounded-2xl bg-muted/50 border border-border/40 text-muted-foreground font-medium text-sm">
                            {String(selectedReturn.status || '').toLowerCase() === 'refunded' ? 'Refund Processed' : 'Request Rejected'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Returns</h1>
              <p className="mt-1 text-sm text-muted-foreground">Review and process customer return requests.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
              <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm">
                <div className="space-y-3 border-b border-border/40 p-4 md:p-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="h-11 border-border/40 bg-muted/40 pl-10"
                      placeholder="Search order, customer..."
                    />
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-1 -mx-1">
                      {['all', 'requested', 'approved', 'picked_up', 'refunded', 'rejected'].map((status) => (
                        <Button
                          key={status}
                          variant={statusFilter === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter(status)}
                          className="rounded-full whitespace-nowrap px-3 text-[10px] font-bold uppercase md:px-4 md:text-xs"
                        >
                          {status === 'all' ? `All (${statusCounts.all || 0})` : `${status.replace('_', ' ')} (${statusCounts[status] || 0})`}
                        </Button>
                      ))}
                    </div>

                    <Select value={reasonFilter} onValueChange={setReasonFilter}>
                      <SelectTrigger className="h-11 w-full lg:w-64">
                        <SelectValue placeholder="Filter by reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Reasons</SelectItem>
                        {RETURN_REASON_OPTIONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {isLoading ? (
                    <div className="flex h-80 items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
                        <p className="text-sm text-muted-foreground">Loading returns...</p>
                      </div>
                    </div>
                  ) : filteredReturns.length === 0 ? (
                    <div className="space-y-4 py-16 text-center md:py-24">
                      <Undo2 className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                      <p className="text-sm text-muted-foreground">No return requests found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredReturns.map((ret) => {
                        const isExpanded = expandedCards.has(String(ret.id));
                        const daysAgo = ret.created_at ? Math.abs(differenceInDays(new Date(ret.created_at), new Date())) : 0;

                        return (
                          <motion.div
                            key={String(ret.id)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:bg-card/80"
                          >
                            <div className="p-4 md:p-5">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2 md:gap-3">
                                    <p className="font-mono text-xs font-bold text-foreground md:text-sm">
                                      #{String(ret.orders?.order_id || ret.id || '').slice(0, 16)}
                                    </p>
                                    {getStatusBadge(String(ret.status || ''))}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {String(ret.profiles?.display_name || 'Anonymous')}
                                    </span>
                                    <span>{formatDate(ret.created_at)}</span>
                                    {daysAgo > 0 && <span>({daysAgo}d ago)</span>}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs"
                                    onClick={() => toggleExpand(String(ret.id))}
                                  >
                                    {isExpanded ? <ChevronDown className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                                    {isExpanded ? 'Less' : 'Details'}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs"
                                    onClick={() => openReturnDetails(ret)}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    Full View
                                  </Button>

                                  {String(ret.status || '').toLowerCase() === 'requested' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="h-8 bg-emerald-500 px-3 text-xs hover:bg-emerald-600"
                                        onClick={() => updateStatus(ret, 'approved')}
                                        disabled={updateReturnMutation.isPending}
                                      >
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-3 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                        onClick={() => updateStatus(ret, 'rejected')}
                                        disabled={updateReturnMutation.isPending}
                                      >
                                        <XCircle className="mr-1 h-3 w-3" />
                                        Reject
                                      </Button>
                                    </>
                                  )}

                                  {String(ret.status || '').toLowerCase() === 'approved' && (
                                    <Button
                                      size="sm"
                                      className="h-8 bg-orange-500 px-3 text-xs hover:bg-orange-600"
                                      onClick={() => updateStatus(ret, 'picked_up')}
                                      disabled={updateReturnMutation.isPending}
                                    >
                                      <Package className="mr-1 h-3 w-3" />
                                      Picked Up
                                    </Button>
                                  )}

                                  {String(ret.status || '').toLowerCase() === 'picked_up' && (
                                    <Button
                                      size="sm"
                                      className="h-8 bg-emerald-500 px-3 text-xs hover:bg-emerald-600"
                                      onClick={() => void processRefund(ret)}
                                      disabled={updateReturnMutation.isPending}
                                    >
                                      <CreditCard className="mr-1 h-3 w-3" />
                                      Refund
                                    </Button>
                                  )}

                                  {(String(ret.status || '').toLowerCase() === 'refunded' || String(ret.status || '').toLowerCase() === 'rejected') && (
                                    <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/50 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                                      <Clock size={12} />
                                      {String(ret.status || '').toLowerCase() === 'refunded' ? 'Refunded' : 'Rejected'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-4 border-t border-border/30 pt-4"
                                >
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items</p>
                                      <div className="space-y-2">
                                        {(ret.items || []).slice(0, 3).map((item) => (
                                          <div key={String(item.id)} className="flex items-center gap-2">
                                            <ProductImageViewer
                                              src={String(item.order_items?.product_image || DEFAULT_PRODUCT_IMAGE)}
                                              alt={String(item.order_items?.product_name || 'Product')}
                                              className="h-10 w-8 flex-shrink-0 rounded"
                                            />
                                            <p className="truncate text-xs">{String(item.order_items?.product_name || 'Item')}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</p>
                                      <Badge className={`${getReturnReasonBadgeClass(String(ret.reason || 'other'))} text-[10px]`}>
                                        {getReturnReasonLabel(String(ret.reason || 'other'))}
                                      </Badge>
                                      {ret.comment && <p className="mt-1 truncate text-xs text-muted-foreground">{String(ret.comment)}</p>}
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</p>
                                      <p className="text-lg font-bold text-primary">{formatPrice(computeRefundTotal(ret))}</p>
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
                                      <Badge variant="outline" className="text-[10px] uppercase">
                                        {ret.payment_mode || 'COD'}
                                      </Badge>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            <Dialog open={!!selectedReturn} onOpenChange={(open) => (!open ? closeReturnDetails() : null)}>
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
                {selectedReturn && (
                  <>
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card px-6 py-4">
                      <DialogHeader className="p-0">
                        <DialogTitle className="text-lg font-bold uppercase tracking-wider">
                          Return #{String(selectedReturn.orders?.order_id || selectedReturn.id || '').slice(0, 16)}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">Submitted {formatDate(selectedReturn.created_at)}</p>
                      </DialogHeader>
                      <Button variant="ghost" size="icon" onClick={closeReturnDetails}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-6 p-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="md:col-span-1">
                          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Return Progress</p>
                          <ReturnTimeline status={String(selectedReturn.status || '')} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-3">
                          <Card className="border-border/40">
                            <CardContent className="p-4">
                              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p>
                              <p className="text-sm font-semibold">{String(selectedReturn.profiles?.display_name || 'Anonymous')}</p>
                            </CardContent>
                          </Card>
                          <Card className="border-border/40">
                            <CardContent className="p-4">
                              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Payment</p>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {selectedReturn.payment_mode || 'COD'}
                              </Badge>
                            </CardContent>
                          </Card>
                          <Card className="border-border/40">
                            <CardContent className="p-4">
                              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Refund Amount</p>
                              <p className="text-lg font-bold text-primary">{formatPrice(computeRefundTotal(selectedReturn))}</p>
                            </CardContent>
                          </Card>
                          <Card className="col-span-2 border-border/40 md:col-span-3">
                            <CardContent className="p-4">
                              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Reason</p>
                              <div className="flex items-center gap-2">
                                <Badge className={getReturnReasonBadgeClass(String(selectedReturn.reason || 'other'))}>
                                  {getReturnReasonLabel(String(selectedReturn.reason || 'other'))}
                                </Badge>
                                <span>{getStatusBadge(String(selectedReturn.status || ''))}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      <Separator />

                      {selectedReturn.comment && (
                        <>
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Comment</p>
                            <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
                              <p className="whitespace-pre-wrap text-sm">{String(selectedReturn.comment)}</p>
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      <div>
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Items to Return ({selectedReturn.items?.length || 0})
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {(selectedReturn.items || []).map((item) => (
                            <div key={String(item.id)} className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
                              <ProductImageViewer
                                src={String(item.order_items?.product_image || DEFAULT_PRODUCT_IMAGE)}
                                alt={String(item.order_items?.product_name || 'Product')}
                                className="h-18 w-14 flex-shrink-0 rounded-lg"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{String(item.order_items?.product_name || 'Order Item')}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Qty: {Number(item.quantity || 0)}</p>
                                <p className="mt-0.5 text-sm font-bold text-primary">{formatPrice(Number(item.order_items?.unit_price || 0))}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proof Images</p>
                        {parseImageUrls(selectedReturn.images).length > 0 ? (
                          <ScrollArea className="w-full">
                            <div className="flex gap-3 pb-2">
                              {parseImageUrls(selectedReturn.images).map((url, index) => (
                                <ProductImageViewer
                                  key={`${url}-${index}`}
                                  src={url}
                                  alt={`Proof ${index + 1}`}
                                  className="h-28 w-28 flex-shrink-0 rounded-xl md:h-36 md:w-36"
                                />
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <p className="text-sm text-muted-foreground">No images provided by customer.</p>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Note</p>
                        <Textarea
                          value={adminNoteDraft}
                          onChange={(event) => setAdminNoteDraft(event.target.value)}
                          placeholder="Add a private note about this return..."
                          className="min-h-[80px] border-border/40 bg-muted/20"
                        />
                        <div className="mt-2 flex justify-end">
                          <Button size="sm" variant="outline" onClick={saveAdminNote} disabled={updateReturnMutation.isPending}>
                            {updateReturnMutation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            Save Note
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex flex-wrap justify-end gap-3">
                        {String(selectedReturn.status || '').toLowerCase() === 'requested' && (
                          <>
                            <Button
                              className="min-w-[120px] bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => updateStatus(selectedReturn, 'approved')}
                              disabled={updateReturnMutation.isPending}
                            >
                              {updateReturnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              className="min-w-[120px]"
                              onClick={() => updateStatus(selectedReturn, 'rejected')}
                              disabled={updateReturnMutation.isPending}
                            >
                              {updateReturnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                              Reject
                            </Button>
                          </>
                        )}
                        {String(selectedReturn.status || '').toLowerCase() === 'approved' && (
                          <Button
                            className="min-w-[160px] bg-orange-500 hover:bg-orange-600"
                            onClick={() => updateStatus(selectedReturn, 'picked_up')}
                            disabled={updateReturnMutation.isPending}
                          >
                            {updateReturnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                            Mark Picked Up
                          </Button>
                        )}
                        {String(selectedReturn.status || '').toLowerCase() === 'picked_up' && (
                          <Button
                            className="min-w-[160px] bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => void processRefund(selectedReturn)}
                            disabled={updateReturnMutation.isPending}
                          >
                            {updateReturnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            Process Refund
                          </Button>
                        )}
                        {(String(selectedReturn.status || '').toLowerCase() === 'refunded' || String(selectedReturn.status || '').toLowerCase() === 'rejected') && (
                          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-4 py-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {String(selectedReturn.status || '').toLowerCase() === 'refunded' ? 'Refund Completed' : 'Request Rejected'}
                            </span>
                          </div>
                        )}
                        {updateReturnMutation.isPending && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReturns;
