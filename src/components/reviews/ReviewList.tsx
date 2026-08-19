import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StarRating from './StarRating';
import { ProductReview, useProductReviews } from '@/hooks/useProductReviews';
import { useProduct } from '@/hooks/useProduct';
import { buildFallbackReviews } from '@/lib/utils';

interface ReviewListProps {
  productId: string;
}

const SentimentBadge = ({ sentiment }: { sentiment: string | null }) => {
  if (!sentiment) return null;

  const config = {
    positive: { icon: TrendingUp, bg: 'bg-green-500/10', text: 'text-green-600', label: 'Positive' },
    negative: { icon: TrendingDown, bg: 'bg-red-500/10', text: 'text-red-600', label: 'Negative' },
    neutral: { icon: Minus, bg: 'bg-muted', text: 'text-muted-foreground', label: 'Neutral' },
  }[sentiment] || { icon: Minus, bg: 'bg-muted', text: 'text-muted-foreground', label: 'Neutral' };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const ReviewList = ({ productId }: ReviewListProps) => {
  const { data, isLoading, isError, refetch } = useProductReviews(productId);
  const { data: product } = useProduct(productId);
  const dbReviews = data?.reviews || [];
  const dbStats = data?.summary || { average: 0, count: 0 };

  const hasDbReviews = dbReviews.length > 0;
  const fallbackReviews = product ? buildFallbackReviews(product) : [];
  const reviews = hasDbReviews ? dbReviews : fallbackReviews;
  
  // Use stats from DB if available, otherwise from fallback
  const stats = hasDbReviews
    ? dbStats
    : {
        average: fallbackReviews.length > 0
          ? Math.round((fallbackReviews.reduce((sum, review) => sum + review.rating, 0) / fallbackReviews.length) * 10) / 10
          : 0,
        count: fallbackReviews.length,
      };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="mb-3 h-4 w-40 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Couldn’t load reviews right now.</p>
        <button type="button" className="btn-outline" onClick={() => void refetch()}>Try again</button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {isError ? 'Unable to load reviews right now. Please refresh and try again.' : 'No reviews yet. Be the first to review!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="theme-surface flex items-center gap-6 rounded-2xl p-4"
      >
        <div className="text-center">
          <motion.span
            className="text-4xl font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            {stats.average.toFixed(1)}
          </motion.span>
          <p className="text-xs text-muted-foreground mt-1">out of 5</p>
        </div>
        <div>
          <StarRating rating={Math.round(stats.average)} readonly size="lg" />
          <p className="text-sm text-muted-foreground mt-1">
            Based on {stats.count} review{stats.count !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Showing the latest reviews</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="theme-surface rounded-2xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User size={18} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} readonly size="sm" />
                    {review.is_verified_purchase && (
                      <span className="text-xs text-primary font-medium">Verified Purchase</span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{review.author_name || 'Verified Customer'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <SentimentBadge sentiment={review.sentiment} />
            </div>

            {review.title && (
              <h4 className="font-medium mb-2">{review.title}</h4>
            )}

            {review.content && (
              <p className="text-sm text-muted-foreground mb-4">{review.content}</p>
            )}

            <div className="flex items-center gap-4">
              <button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ThumbsUp size={14} />
                Helpful ({review.helpful_count})
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ReviewList;
