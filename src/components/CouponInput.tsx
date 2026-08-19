import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Check, Loader2, Sparkles, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CouponData {
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
}

interface CouponInputProps {
  subtotal: number;
  onApplyCoupon: (discount: number, couponData: CouponData | null) => void;
  isAuthenticated?: boolean;
}

// Confetti particle component
const ConfettiParticle = ({ delay, color }: { delay: number; color: string }) => (
  <motion.div
    initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
    animate={{
      opacity: [1, 1, 0],
      y: [0, -100, -150],
      x: [0, Math.random() * 100 - 50, Math.random() * 150 - 75],
      scale: [1, 1.2, 0.5],
      rotate: [0, Math.random() * 360],
    }}
    transition={{
      duration: 2,
      delay,
      ease: "easeOut",
    }}
    className="absolute w-3 h-3 rounded-full"
    style={{ backgroundColor: color }}
  />
);

const CouponInput = ({ subtotal, onApplyCoupon, isAuthenticated }: CouponInputProps) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Cache validated coupon data to avoid repeated DB lookups for the same code
  const couponCache = useRef<Record<string, CouponData | null>>({});

  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F59E0B', '#10B981'];

  const calculateDiscount = (coupon: CouponData): number => {
    if (coupon.discount_type === 'percentage') {
      return Math.min(subtotal, Math.round(subtotal * (coupon.discount_value / 100)));
    }
    return Math.min(subtotal, coupon.discount_value);
  };

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Please enter a promo code');
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please login to apply promo codes',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError('');

    const key = code.toUpperCase().trim();

    // Use cached coupon if available
    const cached = couponCache.current[key];
    if (cached !== undefined) {
      if (!cached) {
        setError('Invalid promo code');
        onApplyCoupon(0, null);
        setIsLoading(false);
        return;
      }

      const discount = calculateDiscount(cached);
      setAppliedCoupon(cached);
      onApplyCoupon(discount, cached);
      setIsLoading(false);
      toast({
        title: 'Promo code applied!',
        description: `You saved ₹${discount.toLocaleString('en-IN')}`,
      });
      return;
    }

    try {
      let data: { code: string; discount_type: string; discount_value: number; min_order_amount?: number; max_uses?: number; current_uses?: number; expires_at?: string | null } | null = null;
      let validationFailed = false;

      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8-second timeout

        const { data: dbData, error: fetchError } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', key)
          .eq('is_active', true)
          .maybeSingle()
          .abortSignal(abortController.signal);

        clearTimeout(timeoutId);

        if (fetchError) {
          throw fetchError;
        }
        data = dbData;
      } catch (err) {
        console.warn('DB fetch failed, will attempt local fallback', err);
        validationFailed = true;
      }

      if (!data) {
        if (validationFailed) {
          setError("Couldn't validate this promo code. Please try again.");
          return;
        }
        couponCache.current[key] = null;
        setError('Invalid promo code');
        onApplyCoupon(0, null);
        return;
      }

      // Check minimum order amount
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        setError(`Minimum order of ₹${data.min_order_amount} required`);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This promo code has expired');
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setError('This promo code has reached its usage limit');
        return;
      }

      const couponData: CouponData = {
        code: data.code,
        discount_type: data.discount_type as 'percentage' | 'flat',
        discount_value: Number(data.discount_value),
        min_order_amount: Number(data.min_order_amount) || 0,
      };

      couponCache.current[key] = couponData;
      const discount = calculateDiscount(couponData);
      setAppliedCoupon(couponData);
      onApplyCoupon(discount, couponData);
      setShowCelebration(true);
      window.setTimeout(() => setShowCelebration(false), 3000);

      toast({
        title: 'Promo code applied!',
        description: `You saved ₹${discount.toLocaleString('en-IN')}`,
      });
    } catch (err: unknown) {
      console.error('Error applying coupon:', err);
      const errorObj = err as { name?: string; message?: string; code?: string };

      if (errorObj?.name === 'AbortError' || errorObj?.message?.includes('FetchError') || errorObj?.message?.includes('timed out')) {
        setError('Network issue while verifying coupon');
        toast({ title: 'Connection Timeout', description: 'Could not verify coupon. Please check your connection.', variant: 'destructive' });
      } else if (errorObj?.code === '42P01' || errorObj?.message?.includes('relation "public.coupons" does not exist') || errorObj?.code === '404') {
        setError('Coupons not configured on server');
        toast({ title: 'System Error', description: 'Coupon system is currently unavailable.', variant: 'destructive' });
      } else {
        setError('Failed to verify coupon code');
        toast({ title: 'Verification Failed', description: 'Invalid or unrecognized coupon code.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setCode('');
    setError('');
    setShowCelebration(false);
    onApplyCoupon(0, null);
  };

  return (
    <>
      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Confetti particles */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {confettiColors.flatMap((color, i) =>
                Array.from({ length: 8 }).map((_, j) => (
                  <ConfettiParticle
                    key={`${i}-${j}`}
                    delay={j * 0.1}
                    color={color}
                  />
                ))
              )}
            </div>

            {/* Celebration Message */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2
              }}
              className="relative z-10 text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: 3,
                  repeatType: "reverse",
                }}
                className="flex items-center justify-center gap-3 mb-4"
              >
                <PartyPopper className="w-12 h-12 text-yellow-500" />
                <Sparkles className="w-10 h-10 text-primary" />
                <PartyPopper className="w-12 h-12 text-yellow-500 scale-x-[-1]" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-transparent mb-2">
                  🎉 Congratulations! 🎉
                </h2>
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-2xl md:text-3xl font-semibold text-foreground mb-4"
              >
                You got <span className="text-primary font-bold">
                  {appliedCoupon?.discount_type === 'percentage' 
                    ? `${appliedCoupon.discount_value}% OFF!` 
                    : `₹${appliedCoupon?.discount_value} OFF!`}
                </span>
              </motion.p>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary/20 border border-primary/30 rounded-full"
              >
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-lg font-medium text-primary">Discount Applied!</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Tag size={16} />
          <span>Promo Code</span>
        </div>

        <AnimatePresence mode="wait">
          {appliedCoupon ? (
            <motion.div
              key="applied"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <Check className="w-5 h-5 text-primary" />
                </motion.div>
                <div>
                  <p className="font-medium text-sm">{appliedCoupon.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {appliedCoupon.discount_type === 'percentage'
                      ? `${appliedCoupon.discount_value}% off`
                      : `₹${appliedCoupon.discount_value} off`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="p-1 hover:bg-background/50 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="Enter promo code"
                  className="flex-1 input-premium text-sm uppercase"
                  disabled={isLoading}
                />
                <motion.button
                  onClick={handleApply}
                  disabled={isLoading || !code.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </motion.button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground">
                  Login to apply promo codes
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CouponInput;
