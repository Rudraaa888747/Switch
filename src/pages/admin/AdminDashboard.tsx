import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Star,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Zap,
  BarChart3,
  RefreshCw,
  Bell,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { products, formatPrice } from '@/data/products';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { useAdmin } from '@/contexts/AdminContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const statCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  }),
};

const AdminDashboard = () => {
  const { data, isLoading } = useAdminOverview();
  const { isDemoMode } = useDemoMode();
  const { unreadCount } = useAdmin();
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit'>('revenue');

  const stats = useMemo(() => data ?? {
    totalProducts: products.length,
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalReviews: 0,
    lowStockCount: 3,
    recentOrders: [],
    monthlyData: [],
    categoryData: [],
  }, [data]);

  const statCards = useMemo(
    () => [
      {
        title: 'Total Products',
        value: stats.totalProducts,
        icon: Package,
        change: '+12%',
        positive: true,
        gradient: 'from-sky-500/20 via-sky-500/5 to-transparent',
        border: 'border-sky-500/20',
        iconGradient: 'from-sky-300 to-sky-600',
        haloColor: 'bg-sky-500',
      },
      {
        title: 'Total Orders',
        value: stats.totalOrders,
        icon: ShoppingCart,
        change: '+8%',
        positive: true,
        gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
        border: 'border-violet-500/20',
        iconGradient: 'from-violet-300 to-violet-600',
        haloColor: 'bg-violet-500',
      },
      {
        title: 'Revenue',
        value: formatPrice(stats.totalRevenue),
        icon: DollarSign,
        change: '+23%',
        positive: true,
        gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
        border: 'border-emerald-500/20',
        iconGradient: 'from-emerald-300 to-emerald-600',
        haloColor: 'bg-emerald-500',
      },
      {
        title: 'Reviews',
        value: stats.totalReviews,
        icon: Star,
        change: '+15%',
        positive: true,
        gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
        border: 'border-amber-500/20',
        iconGradient: 'from-amber-300 to-amber-600',
        haloColor: 'bg-amber-500',
      },
    ],
    [stats],
  );

  const quickActions = [
    { label: 'Add Product', icon: Package, path: '/admin/products', gradient: 'from-emerald-500 to-emerald-600', hover: 'shadow-emerald-500/30' },
    { label: 'View Orders', icon: ShoppingCart, path: '/admin/orders', gradient: 'from-sky-500 to-sky-600', hover: 'shadow-sky-500/30' },
    { label: 'Returns', icon: TrendingUp, path: '/admin/returns', gradient: 'from-orange-500 to-orange-600', hover: 'shadow-orange-500/30' },
    { label: 'Analytics Live', icon: BarChart3, path: '/admin/analytics', gradient: 'from-purple-500 to-indigo-600', hover: 'shadow-purple-500/30' },
  ];

  const chartConfig = {
    revenue: { dataKey: 'revenue', color: '#0ea5e9', gradientId: 'colorRevenue', label: 'Revenue' },
    profit: { dataKey: 'profit', color: '#8b5cf6', gradientId: 'colorProfit', label: 'Profit' },
  };

  return (
    <AdminLayout>
      <div className="admin-gradient-shell space-y-5 px-3 py-4 md:space-y-8 md:p-6 lg:p-8">
        {isDemoMode && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 flex items-center gap-3">
            <Sparkles className="text-indigo-500 w-5 h-5" />
            <div className="text-sm">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Demo Environment Active:</span>
              <span className="text-muted-foreground ml-1">Changes are not persisted to the database. Some actions are visually simulated for presentation.</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="hidden md:block text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Realtime Overview</p>
            <h1 className="md:mt-2 text-xl md:text-[clamp(1.55rem,5vw,2rem)] font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-muted-foreground">Your store at a glance.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <RefreshCw size={12} />
            Live
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path} className="min-w-max">
                <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${action.gradient} px-4 py-2 md:px-5 md:py-2.5 text-[11px] md:text-xs font-medium uppercase tracking-[0.18em] text-white shadow-lg transition-all active:scale-95 hover:shadow-xl`}>
                  <Icon size={14} />
                  {action.label}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="scrollbar-hide -mx-3 flex gap-2.5 overflow-x-auto px-3 md:mx-0 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:px-0">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className={`admin-stat-card admin-glass-card min-w-[14rem] rounded-3xl md:rounded-3xl border ${stat.border} bg-gradient-to-br ${stat.gradient} p-3.5 md:min-w-0 md:p-5 transition-transform duration-200 md:hover:-translate-y-1`}
              >
                <div className="mb-4 md:mb-5 flex items-start justify-between">
                  <div className="relative">
                    <div className={`absolute inset-0 blur-xl opacity-30 dark:opacity-40 rounded-full ${stat.haloColor}`} />
                    <div className={`relative flex h-12 w-12 md:h-[52px] md:w-[52px] items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br ${stat.iconGradient} text-white shadow-xl shadow-black/10 ring-1 ring-inset ring-white/30`}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] md:text-xs font-medium ${stat.positive ? 'text-foreground' : 'text-destructive'}`}>
                    {stat.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stat.change}
                  </div>
                </div>
                <p className="stat-value text-xl md:text-2xl font-semibold tracking-tight">{stat.value}</p>
                <p className="stat-label mt-0.5 md:mt-1 text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="admin-glass-card rounded-[2rem] lg:col-span-2">
            <div className="flex flex-col gap-4 p-5 pb-0 sm:flex-row sm:items-center sm:justify-between md:p-6 md:pb-0">
              <div>
                <h2 className="text-base font-semibold">Sales Overview</h2>
                <p className="text-xs text-muted-foreground">Monthly revenue and profit trends</p>
              </div>
              <div className="inline-flex rounded-full bg-muted/60 p-1">
                {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((key) => (
                  <button key={key} onClick={() => setActiveChart(key)} className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] ${activeChart === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                    {chartConfig[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 md:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.45} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 10, 10, 0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      color: '#fff',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 500 }}
                    formatter={(value: number) => formatPrice(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartConfig[activeChart].dataKey}
                    stroke={chartConfig[activeChart].color}
                    strokeWidth={2.4}
                    fill={`url(#${chartConfig[activeChart].gradientId})`}
                    dot={{ fill: chartConfig[activeChart].color, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="admin-glass-card rounded-[2rem] p-5 md:p-6">
            <h2 className="text-base font-semibold">Category Distribution</h2>
            <p className="mb-4 text-xs text-muted-foreground">Product breakdown by category</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={82} paddingAngle={3} dataKey="value">
                  {stats.categoryData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-3">
              {stats.categoryData.map((category, index) => (
                <span key={category.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {category.name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="admin-glass-card rounded-[2rem] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Recent Orders</h2>
                <p className="text-xs text-muted-foreground">Latest transactions</p>
              </div>
              <Link to="/admin/orders" className="flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                View all
                <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentOrders.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order, index) => (
                  <motion.div key={order.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + index * 0.05 }} className="rounded-2xl border border-border/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          order.status === 'Delivered' ? 'bg-emerald-500/12 text-emerald-600' :
                          order.status === 'Shipped' ? 'bg-slate-500/12 text-slate-700' :
                          order.status === 'Processing' ? 'bg-amber-500/12 text-amber-600' :
                          order.status === 'Cancelled' ? 'bg-rose-500/12 text-rose-600' :
                          'bg-muted text-foreground'
                        }`}>
                          {order.status === 'Delivered' ? <CheckCircle2 size={16} /> :
                           order.status === 'Cancelled' ? <XCircle size={16} /> :
                           order.status === 'Processing' ? <Package size={16} /> :
                           order.status === 'Shipped' ? <Package size={16} /> :
                           <Clock size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{order.order_id || order.source_id}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatPrice(order.grand_total)}</p>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{order.status}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="py-8 text-center">
                  <ShoppingCart size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No orders yet</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="admin-glass-card rounded-[2rem] p-5 md:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-xl bg-foreground text-background p-2.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Predictive Insights</h2>
                <p className="text-xs text-muted-foreground">AI-powered store intelligence</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-muted p-2">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">High Demand Expected</p>
                    <p className="text-xs text-muted-foreground">Bomber jackets and formal shirts are climbing fastest.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-muted p-2">
                    <AlertTriangle size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{stats.lowStockCount} Stock Alert{stats.lowStockCount !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">Restock before the weekend rush to avoid missed conversion.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-muted p-2">
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Revenue Forecast</p>
                    <p className="text-xs text-muted-foreground">Expected 15% increase in sales next month.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Low Stock Focus</p>
                <p className="mt-2 text-2xl font-semibold">{stats.lowStockCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">Products need attention before they impact conversion.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Revenue Run Rate</p>
                <p className="mt-2 text-2xl font-semibold">{formatPrice(stats.totalRevenue / Math.max(stats.monthlyData.length || 1, 1))}</p>
                <p className="mt-1 text-xs text-muted-foreground">Average monthly pace based on recent tracked sales.</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-3">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Bell size={14} />
                    {unreadCount} unread
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
