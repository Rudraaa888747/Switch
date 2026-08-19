import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient } from '../_lib/supabase-admin';
import { getReviewDisplayName } from '../../src/lib/utils';

interface ReviewRow {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  sentiment: string | null;
  helpful_count: number;
  created_at: string;
  is_verified_purchase: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const productId = typeof req.query.product_id === 'string' ? req.query.product_id : '';
  if (!productId) {
    return res.status(400).json({ error: 'product_id is required' });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('id, user_id, product_id, rating, title, content, sentiment, helpful_count, created_at, is_verified_purchase')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      return res.status(500).json({ error: reviewsError.message, code: reviewsError.code });
    }

    const safeReviews = (reviews || []) as ReviewRow[];
    const count = safeReviews.length;
    const average =
      count > 0
        ? Math.round(
            (safeReviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / count) * 10
          ) / 10
        : 0;

    return res.status(200).json({
      data: {
        reviews: safeReviews.map((review, index) => ({
          ...review,
          author_name: getReviewDisplayName(review.user_id, index),
        })),
        summary: {
          average,
          count,
        },
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load reviews',
    });
  }
}
