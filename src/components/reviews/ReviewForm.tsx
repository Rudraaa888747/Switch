import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, User, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import StarRating from './StarRating';
import { ProductReview } from '@/hooks/useProductReviews';
import { createAdminNotification } from '@/lib/adminNotifications';

interface ReviewFormProps {
  productId: string;
  userId: string | null;
  isAuthenticated: boolean;
  onReviewSubmitted: (review: ProductReview) => void;
  existingReview?: boolean;
}

// Simple sentiment analysis
const analyzeSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
  const positiveWords = ['great', 'amazing', 'love', 'excellent', 'perfect', 'best', 'beautiful', 'quality', 'recommend', 'happy', 'fantastic', 'wonderful', 'awesome', 'comfortable', 'satisfied'];
  const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'disappointed', 'hate', 'awful', 'horrible', 'waste', 'cheap', 'broken', 'uncomfortable', 'regret', 'refund'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

const ReviewForm = ({ productId, userId, isAuthenticated, onReviewSubmitted, existingReview }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !userId) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit a review',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a star rating',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const sentiment = content ? analyzeSentiment(content) : 'neutral';

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          product_id: productId,
          rating,
          title: title.trim() || null,
          content: content.trim() || null,
          review_text: content.trim() || null,
          sentiment,
        })
        .select('id, user_id, rating, title, content, sentiment, helpful_count, created_at, is_verified_purchase')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Reviewed',
            description: 'You have already reviewed this product',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        onReviewSubmitted({
          ...data,
          helpful_count: Number(data.helpful_count) || 0,
          is_verified_purchase: Boolean(data.is_verified_purchase),
        });

        await createAdminNotification({
          title: 'New review added',
          message: `A ${rating}-star review was submitted for product ${productId}.`,
          type: sentiment === 'negative' ? 'warning' : 'success',
          eventType: 'review_added',
          link: '/admin/reviews',
          metadata: { productId, rating, verified: Boolean(data.is_verified_purchase) },
        }).catch(() => {});
      }

      setIsSubmitted(true);
      toast({
        title: 'Review Submitted!',
        description: 'Thank you for your feedback',
      });

      setTimeout(() => {
        setRating(0);
        setTitle('');
        setContent('');
        setIsSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-muted/50 rounded-xl text-center">
        <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-medium mb-1">Share Your Experience</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Login to write a review
        </p>
        <a href="/auth" className="btn-primary text-sm">
          Login to Review
        </a>
      </div>
    );
  }

  if (existingReview) {
    return (
      <div className="p-6 bg-primary/5 rounded-xl text-center">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
        <h3 className="font-medium mb-1">Thank You!</h3>
        <p className="text-sm text-muted-foreground">
          You have already reviewed this product
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isSubmitted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="p-8 bg-primary/5 rounded-xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">Review Submitted!</h3>
          <p className="text-muted-foreground">Thank you for your feedback</p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSubmit}
          className="space-y-5 p-6 bg-muted/30 rounded-xl"
        >
          <div>
            <label className="block text-sm font-medium mb-3">Your Rating *</label>
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Review Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="input-premium"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Your Review</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share details of your experience with this product..."
              className="input-premium min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}/1000 characters
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="w-full btn-primary flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send size={16} />
                Submit Review
              </>
            )}
          </motion.button>
        </motion.form>
      )}
    </AnimatePresence>
  );
};

export default ReviewForm;
