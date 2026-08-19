import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getReviewDisplayName } from '@/lib/utils';

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  helpful_count: number;
  created_at: string;
  is_verified_purchase: boolean;
  user_id?: string;
  author_name?: string;
}

export interface ProductReviewSummary {
  average: number;
  count: number;
}

export interface ProductReviewsData {
  reviews: ProductReview[];
  summary: ProductReviewSummary;
}

export const getProductReviewsQueryKey = (productId: string) => ['product-reviews', productId];

interface RpcReviewSummaryRow {
  average_rating: number | null;
  review_count: number | null;
}

const getProductReviewSummaryViaRpc = async (reviewProductId: string) => {
  const supabaseWithRpc = supabase as typeof supabase & {
    rpc: (
      fn: 'get_product_review_summary',
      args: { p_product_id: string }
    ) => Promise<{ data: RpcReviewSummaryRow[] | null; error: unknown }>;
  };

  return supabaseWithRpc.rpc('get_product_review_summary', {
    p_product_id: reviewProductId,
  });
};

const fetchProductReviews = async (productId: string): Promise<ProductReviewsData> => {
  const parseApiResponse = async (response: Response) => {
    const responseText = await response.text();
    if (!responseText) return {};
    try {
      return JSON.parse(responseText) as {
        data?: ProductReviewsData;
        error?: string;
      };
    } catch {
      return { error: responseText };
    }
  };


  const productIdList = [productId];

  const [{ data: latestReviews, error: latestError }, summaryResult] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, user_id, rating, title, content, sentiment, helpful_count, created_at, is_verified_purchase')
      .in('product_id', productIdList)
      .order('created_at', { ascending: false })
      .limit(10),
    productIdList.length === 1
      ? getProductReviewSummaryViaRpc(productIdList[0])
      : Promise.resolve({ data: null, error: new Error('multi-id-summary-fallback') }),
  ]);

  if (latestError) {
    throw latestError;
  }

  let average = 0;
  let count = 0;

  if (!summaryResult.error && Array.isArray(summaryResult.data) && summaryResult.data[0]) {
    average = Number(summaryResult.data[0].average_rating) || 0;
    count = Number(summaryResult.data[0].review_count) || 0;
  } else {
    const { data: ratingRows, error: summaryError } = await supabase
      .from('reviews')
      .select('rating')
      .in('product_id', productIdList);

    if (summaryError) {
      throw summaryError;
    }

    const ratings = (ratingRows || []).map((row) => Number(row.rating) || 0).filter((rating) => rating > 0);
    average = ratings.length > 0
      ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
      : 0;
    count = ratings.length;
  }

  // Ensure review count is always 50+ as requested
  const baseSeed = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bonusCount = 52 + (baseSeed % 74); // 52 to 125
  count = Math.max(count, bonusCount);

  return {
    reviews: (latestReviews || []).map((review) => ({
      ...review,
      helpful_count: Number(review.helpful_count) || 0,
      is_verified_purchase: Boolean(review.is_verified_purchase),
      author_name: getReviewDisplayName(review.user_id),
    })) as ProductReview[],
    summary: {
      average,
      count,
    },
  };
};

export const useProductReviews = (productId: string) =>
  useQuery({
    queryKey: getProductReviewsQueryKey(productId),
    queryFn: () => fetchProductReviews(productId),
    staleTime: 30_000,
    gcTime: 15 * 60_000,
    enabled: Boolean(productId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

export const getProductReviewStatusQueryKey = (productId: string, userId: string | null) => [
  'product-review-status',
  productId,
  userId,
];

const fetchExistingReviewStatus = async (productId: string, userId: string | null) => {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
};

export const useProductReviewStatus = (productId: string, userId: string | null) =>
  useQuery({
    queryKey: getProductReviewStatusQueryKey(productId, userId),
    queryFn: () => fetchExistingReviewStatus(productId, userId),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    enabled: Boolean(productId),
  });
