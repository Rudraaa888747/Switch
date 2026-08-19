import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Sparkles,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { products, formatPrice } from '@/data/products';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

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
  hover: { scale: 1.015, transition: { duration: 0.2 } },
};

// Mock data removed in favor of real data from useAdminOverview

const AdminAnalytics = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const { data } = useAdminOverview();
  const totalRevenue = data?.totalRevenue ?? 0;
  const orderCount = data?.totalOrders ?? 0;
  const revenueData = data?.monthlyData ?? [];
  const categoryRevenue = data?.categoryData ?? [];
  
  const averageOrderValue = useMemo(
    () => formatPrice(totalRevenue / Math.max(orderCount, 1)),
    [orderCount, totalRevenue]
  );

  const bestSellers = data?.bestSellers || [];

  const currentMonthRevenue = revenueData.length > 0 ? revenueData[revenueData.length - 1].revenue : 0;
  const previousMonthRevenue = revenueData.length > 1 ? revenueData[revenueData.length - 2].revenue : 0;
  const revenueGrowth = previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

  const predictiveInsights = [
    {
      title: 'Revenue Forecast',
      description: `Expected ${Math.max(5, Math.round(revenueGrowth))}% increase next month based on recent trends`,
      trend: revenueGrowth >= 0 ? 'up' : 'down',
      value: formatPrice(currentMonthRevenue * (1 + Math.max(0.05, revenueGrowth / 100))),
    },
    {
      title: 'Peak Sales Period',
      description: 'Weekend sales spike expected - prepare inventory',
      trend: 'up',
      value: 'Fri-Sun',
    },
    {
      title: 'Top Category',
      description: categoryRevenue.length > 0 ? `${categoryRevenue[0].name} leading sales volume` : 'Gathering data',
      trend: 'up',
      value: categoryRevenue.length > 0 ? categoryRevenue[0].name : 'N/A',
    },
    {
      title: 'Low Stock Alert',
      description: `${data?.lowStockCount || 0} products running low. Consider restocking.`,
      trend: data?.lowStockCount ? 'down' : 'up',
      value: `${data?.lowStockCount || 0} Items`,
    },
  ];

  return (
    <AdminLayout>
      <div className="px-3 py-4 md:p-6 lg:p-8 space-y-5 md:space-y-6">
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4"
        >
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-1">Analytics</h1>
            <p className="text-xs md:text-base text-muted-foreground">Sales performance and predictive insights</p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, change: 'N/A', up: true, iconBg: 'from-emerald-500 to-teal-600', gradient: 'from-emerald-500/10 to-emerald-500/5' },
            { label: 'Orders', value: orderCount, icon: ShoppingCart, change: 'N/A', up: true, iconBg: 'from-amber-500 to-orange-600', gradient: 'from-amber-500/10 to-amber-500/5' },
            { label: 'Avg. Order Value', value: averageOrderValue, icon: TrendingUp, change: 'N/A', up: true, iconBg: 'from-indigo-500 to-purple-600', gradient: 'from-indigo-500/10 to-indigo-500/5' },
            { label: 'Conversion Rate', value: 'Not enough data', icon: Users, change: 'N/A', up: true, iconBg: 'from-rose-500 to-pink-600', gradient: 'from-rose-500/10 to-rose-500/5' },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                variants={itemVariants}
                whileHover="hover"
                initial="rest"
              >
                <motion.div variants={cardHover}>
                  <div className="bg-card border border-border rounded-xl p-6 cursor-default relative overflow-hidden group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                    <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${metric.iconBg} text-white shadow-lg`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium ${metric.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metric.change}
                      </span>
                    </div>
                    <motion.p
                      className="text-2xl font-bold"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      {metric.value}
                    </motion.p>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                  </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
            className="lg:col-span-2 bg-card border border-border rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatPrice(value), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Revenue by Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryRevenue}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryRevenue.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatPrice(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {categoryRevenue.map((cat, index) => (
                <span key={cat.name} className="text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  {cat.name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Predictive Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Predictive Analytics</h2>
              <p className="text-sm text-muted-foreground">Insights based on sales patterns</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {predictiveInsights.map((insight, index) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                className={`p-4 rounded-xl border cursor-default ${
                  insight.trend === 'up'
                    ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'
                    : 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{insight.title}</span>
                  {insight.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className="text-xl font-bold mb-1">{insight.value}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Best Sellers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Best Selling Products</h2>
          <div className="space-y-4">
            {bestSellers.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                className="flex items-center gap-4 cursor-default"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                  index === 0 ? 'bg-amber-500/15 text-amber-500' :
                  index === 1 ? 'bg-slate-400/15 text-slate-400' :
                  index === 2 ? 'bg-amber-700/15 text-amber-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatPrice(product.price)}</p>
                  <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
