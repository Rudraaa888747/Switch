import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatPrice } from '@/data/products';
import type { Product } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import { createAdminNotification } from '@/lib/adminNotifications';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const computeStock = (product: { variants: Array<{ stock?: number }>; stockQuantity?: number }): number => {
  let total = 0;
  for (const v of product.variants) {
    if (v.stock !== undefined) {
      total += v.stock;
    }
  }
  if (total > 0) return total;
  return Number(product.stockQuantity || 0);
};

const computeTrend = (product: Product): 'up' | 'down' | 'stable' => {
  if (product.rating >= 4.6) return 'up';
  if (product.rating >= 4.3) return 'stable';
  return 'down';
};

const computeDemand = (product: Product): 'high' | 'medium' | 'low' => {
  if (product.isTrending) return 'high';
  if (product.rating >= 4.5) return 'medium';
  return 'low';
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

const AdminInventory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const { data: products = [], isLoading } = useProducts();

  const inventoryData = useMemo(() => products.map((product) => ({
    ...product,
    stock: computeStock(product),
    trend: computeTrend(product),
    demandLevel: computeDemand(product),
  })), [products]);

  const stockChartData = useMemo(() => Array.from(
    inventoryData.reduce<Map<string, { inStock: number; lowStock: number }>>((acc, product) => {
      const cat = product.subcategory || product.category;
      const existing = acc.get(cat) || { inStock: 0, lowStock: 0 };
      existing.inStock += product.stock;
      if (product.stock <= 10) existing.lowStock += product.stock;
      acc.set(cat, existing);
      return acc;
    }, new Map())
  ).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ...data,
  })), [inventoryData]);

  const lowStockItems = inventoryData.filter(item => item.stock <= 10);
  const outOfStockItems = inventoryData.filter(item => item.stock <= 3);
  const healthyStockItems = inventoryData.filter(item => item.stock > 20);

  useEffect(() => {
    const key = 'switch_admin_low_stock_notified_at';
    const existingRaw = localStorage.getItem(key);
    const existing: Record<string, number> = existingRaw ? JSON.parse(existingRaw) as Record<string, number> : {};
    const now = Date.now();
    const nextState = { ...existing };

    const notifyTargets = inventoryData.filter((item) => item.stock > 0 && item.stock <= 10);
    if (notifyTargets.length === 0) return;

    notifyTargets.forEach((item) => {
      const notifiedAt = Number(existing[item.id] || 0);
      const twelveHours = 12 * 60 * 60 * 1000;
      if (now - notifiedAt < twelveHours) return;

      createAdminNotification({
        title: item.stock <= 3 ? 'Critical inventory alert' : 'Low inventory alert',
        message: `${item.name} is at ${item.stock} unit${item.stock === 1 ? '' : 's'} remaining.`,
        type: item.stock <= 3 ? 'error' : 'warning',
        eventType: 'inventory_low',
        link: '/admin/inventory',
        metadata: { productId: item.id, stock: item.stock, category: item.category },
      }).catch(() => {});

      nextState[item.id] = now;
    });

    localStorage.setItem(key, JSON.stringify(nextState));
  }, [inventoryData]);

  const filteredInventory = inventoryData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      stockFilter === 'all' ||
      (stockFilter === 'low' && item.stock <= 10) ||
      (stockFilter === 'out' && item.stock <= 3) ||
      (stockFilter === 'healthy' && item.stock > 20);
    return matchesSearch && matchesFilter;
  });

  const getStockStatus = (stock: number) => {
    if (stock <= 3) return { label: 'Critical', color: 'bg-red-500/10 text-red-500', dot: 'bg-red-500 animate-pulse' };
    if (stock <= 10) return { label: 'Low Stock', color: 'bg-yellow-500/10 text-yellow-500', dot: 'bg-yellow-500 animate-pulse' };
    return { label: 'In Stock', color: 'bg-green-500/10 text-green-500', dot: 'bg-green-500' };
  };

  const getDemandBadge = (demand: 'high' | 'medium' | 'low') => {
    switch (demand) {
      case 'high': return 'bg-primary/10 text-primary';
      case 'medium': return 'bg-blue-500/10 text-blue-500';
      case 'low': return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AdminLayout>
      <div className="admin-gradient-shell space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-1 text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Monitor stock levels, demand signals, and replenishment priorities.</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { icon: Package, label: 'Total Products', value: products.length, color: 'text-white', iconGradient: 'from-indigo-400 to-indigo-600', haloColor: 'bg-indigo-500' },
            { icon: TrendingUp, label: 'Healthy Stock', value: healthyStockItems.length, color: 'text-white', iconGradient: 'from-emerald-400 to-emerald-600', haloColor: 'bg-emerald-500' },
            { icon: AlertTriangle, label: 'Low Stock', value: lowStockItems.length, color: 'text-white', iconGradient: 'from-amber-400 to-amber-600', haloColor: 'bg-amber-500' },
            { icon: TrendingDown, label: 'Critical', value: outOfStockItems.length, color: 'text-white', iconGradient: 'from-rose-400 to-rose-600', haloColor: 'bg-rose-500' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants} whileHover="hover" initial="rest">
              <motion.div variants={cardHover}>
                <div className="admin-glass-card cursor-default rounded-3xl p-5 border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className={`absolute inset-0 blur-xl opacity-30 dark:opacity-40 rounded-full ${stat.haloColor}`} />
                      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.iconGradient} text-white shadow-xl shadow-black/10 ring-1 ring-inset ring-white/30`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  <motion.p
                    className="text-2xl font-bold tracking-tight"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    {stat.value}
                  </motion.p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
          className="admin-glass-card rounded-3xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Stock Distribution by Category</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="inStock" fill="hsl(var(--primary))" name="In Stock" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lowStock" fill="#ef4444" name="Low Stock" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="input-premium pl-11 w-full"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="input-premium w-full sm:w-48"
          >
            <option value="all">All Stock Levels</option>
            <option value="healthy">Healthy (20+)</option>
            <option value="low">Low Stock (≤10)</option>
            <option value="out">Critical (≤3)</option>
          </select>
        </motion.div>

        {/* Inventory Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="admin-glass-card admin-table-responsive overflow-hidden rounded-3xl"
        >
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium">Product</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Stock</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Demand</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInventory.map((item, index) => {
                  const status = getStockStatus(item.stock);
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4" data-label="Product">
                        <div className="flex items-center gap-3">
                          <img loading="lazy" decoding="async"
                            src={item.variants?.[0]?.images?.[0] || item.image || ''}
                            alt={item.name}
                            className="w-10 h-12 object-cover rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4" data-label="Stock">
                        <span className="font-bold text-sm">{item.stock} units</span>
                      </td>
                      <td className="px-6 py-4" data-label="Status">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4" data-label="Demand">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getDemandBadge(item.demandLevel)}`}>
                          {item.demandLevel} Demand
                        </span>
                      </td>
                      <td className="px-6 py-4" data-label="Trend">
                        {item.trend === 'up' ? (
                          <span className="flex items-center gap-1 text-green-500 text-sm">
                            <ArrowUp size={14} /> Rising
                          </span>
                        ) : item.trend === 'down' ? (
                          <span className="flex items-center gap-1 text-red-500 text-sm">
                            <ArrowDown size={14} /> Falling
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Stable</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;
