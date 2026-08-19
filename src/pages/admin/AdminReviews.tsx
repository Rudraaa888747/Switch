import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Star,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  Filter,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabaseRestDelete, supabaseRestSelect } from '@/integrations/supabase/publicRest';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

import { buildFallbackReviews } from '@/lib/utils';
import { Product } from '@/data/products';

interface Review {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  sentiment: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

interface ProductLite {
  id: string;
  name: string;
}

interface AdminReviewsApiResponse {
  data?: {
    reviews?: Review[];
    products?: ProductLite[];
  };
  error?: string;
}

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

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const parseApiResponse = async (response: Response): Promise<AdminReviewsApiResponse> => {
    const responseText = await response.text();
    if (!responseText) return {};

    try {
      return JSON.parse(responseText) as AdminReviewsApiResponse;
    } catch (err) {
      console.warn('Failed to parse response:', err);
      return { error: responseText };
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let fetchedReviews: Review[] = [];
      let fetchedProducts: ProductLite[] = [];

      fetchedReviews = await supabaseRestSelect<Review[]>(
        'reviews',
        new URLSearchParams({
          select: '*',
          order: 'created_at.desc',
        })
      );

      fetchedProducts = await supabaseRestSelect<ProductLite[]>(
        'products',
        new URLSearchParams({
          select: 'id,name',
        })
      );

      const finalReviews = [...(fetchedReviews || [])];
      const reviewCounts = new Map<string, number>();
      finalReviews.forEach((review) => reviewCounts.set(review.product_id, (reviewCounts.get(review.product_id) || 0) + 1));
      
      if (fetchedProducts.length > 0) {
        fetchedProducts.forEach(p => {
          const realReviewCount = reviewCounts.get(p.id) || 0;
          if (realReviewCount < 2) {
            const fallbacks = buildFallbackReviews({ 
              id: p.id, 
              name: p.name,
              category: 'premium'
            }).map(f => ({
              ...f,
              product_id: p.id,
              is_fallback: true
            }));
            
            fallbacks.forEach(f => {
              if (!finalReviews.find(r => r.id === f.id)) {
                finalReviews.push(f as Review);
              }
            });
          }
        });
      }

      setReviews(finalReviews.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));

      const nameMap: Record<string, string> = {};
      (fetchedProducts || []).forEach((p) => {
        nameMap[p.id] = p.name;
      });
      setProductNames(nameMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteReview = async (reviewId: string) => {
    try {
      await supabaseRestDelete('reviews', new URLSearchParams({ id: `eq.${reviewId}` }));
      
      setReviews(reviews.filter(r => r.id !== reviewId));
      toast({
        title: 'Review Deleted',
        description: 'The review has been removed successfully.',
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review.',
        variant: 'destructive',
      });
    }
  };

  const getProductName = (productId: string) => {
    return productNames[productId] || productId;
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = 
      review.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProductName(review.product_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === 'all' || review.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  const stats = {
    total: reviews.length,
    positive: reviews.filter(r => r.sentiment === 'positive').length,
    neutral: reviews.filter(r => r.sentiment === 'neutral').length,
    negative: reviews.filter(r => r.sentiment === 'negative').length,
    avgRating: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0',
  };

  return (
    <AdminLayout>
      <div className="px-3 py-4 md:p-6 lg:p-8 space-y-5 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold mb-1">Reviews</h1>
          <p className="text-xs md:text-base text-muted-foreground">Manage and moderate customer reviews</p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {[
            { label: 'Total Reviews', value: stats.total, color: 'text-white', iconGradient: 'from-indigo-400 to-indigo-600', haloColor: 'bg-indigo-500', icon: Filter },
            { label: 'Avg. Rating', value: stats.avgRating, color: 'text-white', iconGradient: 'from-amber-400 to-amber-600', haloColor: 'bg-amber-500', icon: Star, isStar: true },
            { label: 'Positive', value: stats.positive, color: 'text-white', iconGradient: 'from-emerald-400 to-emerald-600', haloColor: 'bg-emerald-500', icon: TrendingUp },
            { label: 'Neutral', value: stats.neutral, color: 'text-white', iconGradient: 'from-slate-400 to-slate-600', haloColor: 'bg-slate-500', icon: Minus },
            { label: 'Negative', value: stats.negative, color: 'text-white', iconGradient: 'from-rose-400 to-rose-600', haloColor: 'bg-rose-500', icon: TrendingDown },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants} whileHover="hover" initial="rest">
              <motion.div variants={cardHover}>
                <div className="bg-card border border-border/50 rounded-xl p-5 cursor-default">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className={`absolute inset-0 blur-xl opacity-30 dark:opacity-40 rounded-full ${stat.haloColor}`} />
                      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.iconGradient} text-white shadow-xl shadow-black/10 ring-1 ring-inset ring-white/30`}>
                        {stat.isStar ? (
                          <Star className={`w-5 h-5 fill-white ${stat.color}`} />
                        ) : (
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        )}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews..."
              className="input-premium pl-11 w-full"
            />
          </div>
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="input-premium w-full sm:w-48"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No reviews found matching filters
            </div>
          ) : (
            filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                className="bg-card border border-border rounded-xl p-6 cursor-default"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      {getSentimentIcon(review.sentiment)}
                      {review.is_verified_purchase && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle size={12} /> Verified
                        </span>
                      )}
                    </div>
                    
                    <p className="font-medium text-sm mb-1">
                      {getProductName(review.product_id)}
                    </p>
                    
                    {review.title && (
                      <h4 className="font-medium mb-1">{review.title}</h4>
                    )}
                    
                    {review.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      {' · '}{review.helpful_count} found helpful
                    </p>
                  </div>
                  
                  <motion.button
                    onClick={() => deleteReview(review.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminReviews;
