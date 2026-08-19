import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { countDistinctOrders, getOrderRevenue, groupOrders, normalizeOrders, OrderGroup } from '@/lib/orders';
import { DbProduct, mapDbProductToProduct } from './useProducts';

interface AdminOverviewData {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  totalReviews: number;
  lowStockCount: number;
  recentOrders: OrderGroup[];
  monthlyData: { month: string; revenue: number; profit: number }[];
  categoryData: { name: string; value: number }[];
  bestSellers: { id: string; name: string; category: string; price: number; sales: number }[];
  totalCustomers: number;
}

const OVERVIEW_ORDER_COLUMNS = 'id, order_id, customer_name, status, total, subtotal, created_at';

export const fetchAdminOverview = async (): Promise<AdminOverviewData> => {
  const [{ data: orders, error: ordersError }, { count: reviewsCount, error: reviewsError }, { data: rawProducts, count: productCount, error: productError }, { count: customerCount, error: customersError }] = await Promise.all([
    supabase.from('orders').select(OVERVIEW_ORDER_COLUMNS).order('created_at', { ascending: false }).limit(200),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id,name,category,price,stock_quantity,variants', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  if (ordersError) {
    throw ordersError;
  }

  if (reviewsError) {
    throw reviewsError;
  }

  if (productError) {
    throw productError;
  }

  const liveProducts = ((rawProducts || []) as DbProduct[]).map(mapDbProductToProduct);
  const productsById = new Map(liveProducts.map((product) => [product.id, product]));
  const lowStockCount = liveProducts.filter((product) => {
    const stock = product.variants.reduce((sum, variant) => {
      if (typeof variant.stock === 'number') return sum + variant.stock;
      return sum;
    }, 0);
    return stock > 0 && stock <= 10;
  }).length;

  interface RawOrderRecord {
    id: string;
    items?: unknown;
    [key: string]: unknown;
  }

  interface OrderItemRecord {
    order_id?: string;
    [key: string]: unknown;
  }

  const rawOrders = (orders || []) as RawOrderRecord[];
  
  // For modern orders, fetch items from order_items table
  const modernOrderIds = rawOrders
    .filter((o): o is RawOrderRecord => !o.items || (Array.isArray(o.items) && o.items.length === 0))
    .map((o) => o.id);

  let allItems: OrderItemRecord[] = [];
  if (modernOrderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', modernOrderIds);
    allItems = items || [];
  }

  const mergedOrders = rawOrders.map(order => {
    if (modernOrderIds.includes(order.id)) {
      const orderItems = allItems.filter(item => item.order_id === order.id);
      return { ...order, items: orderItems };
    }
    return order;
  });

  const normalizedOrders = normalizeOrders(mergedOrders);
  const groupedOrders = groupOrders(normalizedOrders);
  const totalRevenue = (orders || []).reduce((sum, order) => sum + getOrderRevenue(order), 0);
  const totalProfit = totalRevenue * 0.35; // Estimated 35% margin for now

  // Process monthly data
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, { revenue: number; profit: number }> = {};
  
  // Initialize last 6 months
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = monthNames[d.getMonth()];
    monthlyMap[monthKey] = { revenue: 0, profit: 0 };
  }

  normalizedOrders.forEach(order => {
    const date = new Date(order.created_at as string);
    const monthKey = monthNames[date.getMonth()];
    if (monthlyMap[monthKey]) {
      const rev = getOrderRevenue(order);
      monthlyMap[monthKey].revenue += rev;
      monthlyMap[monthKey].profit += rev * 0.35;
    }
  });

  const monthlyData = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    profit: data.profit
  }));

  // Process category data
  const categoryMap: Record<string, number> = {};
  mergedOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: { product_id?: string }) => {
        const product = productsById.get(item.product_id || '');
        const category = product?.category || 'General';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });
    }
  });

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value
  }));

  // Process best sellers
  const salesMap: Record<string, { name: string; category: string; price: number; sales: number }> = {};
  mergedOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: { product_id?: string; product_name?: string; unit_price?: number; quantity?: number; price?: number }) => {
        if (!item.product_id) return;
        
        const product = productsById.get(item.product_id);
        const name = product?.name || item.product_name || 'Unknown Product';
        const category = product?.category || 'General';
        const price = product?.price || Number(item.unit_price) || Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;

        if (!salesMap[item.product_id]) {
          salesMap[item.product_id] = { name, category, price, sales: 0 };
        }
        salesMap[item.product_id].sales += qty;
      });
    }
  });

  const bestSellers = Object.entries(salesMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return {
    totalProducts: productCount || 0,
    totalOrders: countDistinctOrders(groupedOrders),
    totalRevenue,
    totalProfit,
    totalReviews: reviewsCount || 0,
    lowStockCount,
    recentOrders: groupedOrders.slice(0, 5),
    monthlyData,
    categoryData: categoryData.length > 0 ? categoryData : [],
    bestSellers,
    totalCustomers: customerCount || 0,
  };
};

export const useAdminOverview = () => {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: fetchAdminOverview,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
};
