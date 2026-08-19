import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import {
  getProductReviewsQueryKey,
  getProductReviewStatusQueryKey,
  ProductReview,
  ProductReviewsData,
  useProductReviewStatus,
} from '@/hooks/useProductReviews';

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { isAuthenticated, supabaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: hasExistingReview = false } = useProductReviewStatus(productId, supabaseUser?.id || null);

  const handleReviewSubmitted = (review: ProductReview) => {
    queryClient.setQueryData<ProductReviewsData>(getProductReviewsQueryKey(productId), (current) => {
      const reviews = current?.reviews || [];
      const existingReviews = reviews.filter((item) => item.id !== review.id);
      const totalCount = current?.summary.count || 0;
      const totalRating = (current?.summary.average || 0) * totalCount;
      const nextCount = totalCount + 1;
      const nextAverage = Math.round(((totalRating + review.rating) / nextCount) * 10) / 10;

      return {
        reviews: [review, ...existingReviews].slice(0, 10),
        summary: {
          average: nextAverage,
          count: nextCount,
        },
      };
    });

    queryClient.setQueryData(getProductReviewStatusQueryKey(productId, supabaseUser?.id || null), true);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold">Customer Reviews</h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Review Form */}
        <div className="lg:col-span-1">
          <ReviewForm
            productId={productId}
            userId={supabaseUser?.id || null}
            isAuthenticated={isAuthenticated}
            onReviewSubmitted={handleReviewSubmitted}
            existingReview={hasExistingReview}
          />
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2">
          <ReviewList productId={productId} />
        </div>
      </div>
    </motion.div>
  );
};

export default ProductReviews;
