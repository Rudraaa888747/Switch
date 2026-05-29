import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, CreditCard, Check, Shield, Package, ArrowRight, CheckCircle2, Wallet, Truck } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, type Product } from '@/data/products';
import { toast } from '@/hooks/use-toast';
import { getProductImage } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import CouponInput from '@/components/checkout/CouponInput';
import { getUserOrdersQueryKey } from '@/hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'address' | 'transition' | 'payment' | 'confirmation';

interface AddressForm {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface CouponData {
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
}

interface CheckoutCartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

interface SummaryProps {
  items: CheckoutCartItem[];
  totalPrice: number;
  tax: number;
  taxLabel?: string;
  grandTotal: number;
  couponDiscount: number;
  appliedCoupon: CouponData | null;
  walletApplied?: number;
  showCouponInput?: boolean;
  onCouponApply?: (discount: number, couponData: CouponData | null) => void;
}

const paymentMethods = [
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, Rupay', accent: 'from-white/14 via-white/3 to-transparent' },
  { id: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm', accent: 'from-white/14 via-white/3 to-transparent' },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive', accent: 'from-white/14 via-white/3 to-transparent' },
] as const;

const OrderSummary = ({
  items,
  totalPrice,
  tax,
  taxLabel = 'Tax',
  grandTotal,
  couponDiscount,
  appliedCoupon,
  walletApplied = 0,
  showCouponInput = false,
  onCouponApply,
}: SummaryProps) => (
  <div className="mobile-glass-panel rounded-[1.8rem] p-5 md:p-6">
    <div className="mb-5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Payment Summary</p>
      <h3 className="mt-2 text-lg font-semibold">Order summary</h3>
    </div>

    {showCouponInput && onCouponApply && (
      <div className="mb-5">
        <CouponInput subtotal={totalPrice} onApplyCoupon={onCouponApply} isAuthenticated />
      </div>
    )}

    <div className="mb-5 space-y-3">
      {items.map((item) => (
        <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-3 rounded-[1.2rem] border border-border/70 bg-card/70 p-3">
          <div className="h-16 w-14 flex-shrink-0 overflow-hidden rounded-[0.9rem] bg-muted">
            <img src={getProductImage(item.product, item.color)} alt={item.product.name} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium">{item.product.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.size} • {item.color} • Qty {item.quantity}
            </p>
            <p className="mt-1 text-sm font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="space-y-3 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(totalPrice)}</span></div>
      {couponDiscount > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
          <span>-{formatPrice(couponDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-emerald-600">Included</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">{taxLabel}</span><span>{formatPrice(tax)}</span></div>
      {walletApplied > 0 && (
        <div className="flex justify-between text-foreground">
          <span className="text-muted-foreground">Wallet applied</span>
          <span>-{formatPrice(walletApplied)}</span>
        </div>
      )}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(Math.max(grandTotal - walletApplied, 0))}</span>
        </div>
      </div>
    </div>
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated, isAuthReady, supabaseUser, session, updateProfile } = useAuth();
  const [liveWalletBalance, setLiveWalletBalance] = useState<number | null>(null);
  const walletBalance = liveWalletBalance ?? user?.walletBalance ?? 0;

  // Fetch LIVE wallet balance on mount — never trust the 15-min localStorage cache
  useEffect(() => {
    const uid = supabaseUser?.id;
    if (!uid) return;
    supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', uid)
      .single()
      .then(({ data }) => {
        if (data != null && typeof data.wallet_balance === 'number') {
          setLiveWalletBalance(data.wallet_balance);
        }
      })
      .catch(() => { /* fall back to cached value */ });
  }, [supabaseUser?.id]);
  const queryClient = useQueryClient();
  const addressFormRef = useRef<HTMLFormElement>(null);
  const paymentFormRef = useRef<HTMLFormElement>(null);
  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AddressForm, boolean>>>({});

  const validateField = (field: keyof AddressForm, value: string) => {
    let error = '';
    switch (field) {
      case 'fullName':
        if (!value.trim()) error = 'Please enter your full name';
        else if (value.trim().length < 3) error = 'Name must be at least 3 characters';
        else if (/^[\d\s]+$/.test(value)) error = 'Name cannot be numbers only';
        break;
      case 'phone':
        if (!value) error = 'Phone number must contain 10 digits';
        else if (!/^\d{10}$/.test(value)) error = 'Phone number must contain 10 digits';
        break;
      case 'email':
        if (value && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) error = 'Please enter a valid email address';
        break;
      case 'address':
        if (!value.trim()) error = 'Delivery address is required';
        break;
      case 'city':
        if (!value.trim()) error = 'Please enter your city';
        break;
      case 'state':
        if (!value.trim()) error = 'Please enter your state';
        break;
      case 'pincode':
        if (!value) error = 'Please enter a valid 6-digit pincode';
        else if (!/^\d{6}$/.test(value)) error = 'Please enter a valid 6-digit pincode';
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateAllAddressFields = () => {
    const f1 = validateField('fullName', addressForm.fullName);
    const f2 = validateField('phone', addressForm.phone);
    const f3 = validateField('email', addressForm.email);
    const f4 = validateField('address', addressForm.address);
    const f5 = validateField('city', addressForm.city);
    const f6 = validateField('state', addressForm.state);
    const f7 = validateField('pincode', addressForm.pincode);
    return f1 && f2 && f3 && f4 && f5 && f6 && f7;
  };

  const handleAddressChange = (field: keyof AddressForm, value: string) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
    if (touched[field]) validateField(field, value);
  };

  const handleAddressBlur = (field: keyof AddressForm) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, addressForm[field]);
  };
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('card');
  const [cardDetails, setCardDetails] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: number; discount: number; couponCode?: string } | null>(null);
  const [useWallet, setUseWallet] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, message: string, ms = 18000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  };



  const shipping = 0;
  
  const estimatedTax = items.reduce((acc, item) => {
    const rate = item.product.price <= 1000 ? 0.05 : 0.12;
    return acc + (item.product.price * item.quantity * rate);
  }, 0);
  
  const finalTax = couponDiscount > 0 && totalPrice > 0 
    ? estimatedTax * ((totalPrice - couponDiscount) / totalPrice) 
    : estimatedTax;

  const tax = Math.round(finalTax * 100) / 100;
  const has5Percent = items.some(item => item.product.price <= 1000);
  const has12Percent = items.some(item => item.product.price > 1000);
  const taxLabel = `GST (${has5Percent && has12Percent ? '5-12%' : has12Percent ? '12%' : '5%'})`;
  const grandTotal = totalPrice - couponDiscount + shipping + tax;
  const maxWalletPossible = Math.min(walletBalance, Math.max(grandTotal, 0));
  const walletApplied = useWallet ? maxWalletPossible : 0;
  const remainingTotal = Math.max(grandTotal - walletApplied, 0);
  const canUseWallet = walletBalance > 0 && maxWalletPossible > 0;

  const steps = useMemo(
    () => [
      { id: 'address' as const, label: 'Address', icon: MapPin },
      { id: 'payment' as const, label: 'Payment', icon: CreditCard },
      { id: 'confirmation' as const, label: 'Confirm', icon: Check },
    ],
    [],
  );

  const displayStepForTimeline = currentStep === 'transition' ? 'payment' : currentStep;
  const activeStepIndex = steps.findIndex((step) => step.id === displayStepForTimeline);

  const handleCouponApply = (discount: number, couponData: CouponData | null) => {
    setCouponDiscount(discount);
    setAppliedCoupon(couponData);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, phone: true, email: true, address: true, city: true, state: true, pincode: true });
    
    if (!validateAllAddressFields()) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (remainingTotal > 0 && paymentMethod === 'card') {
      const isValidExpiry = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry.trim());
      if (cardDetails.number.length !== 16 || !cardDetails.name.trim() || !isValidExpiry || cardDetails.cvv.length !== 3) {
        toast({ title: 'Please enter valid card details', variant: 'destructive' });
        return;
      }
    }

    if (remainingTotal > 0 && paymentMethod === 'upi' && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      toast({ title: 'Please enter a valid UPI ID', variant: 'destructive' });
      return;
    }

    const currentUserId = user?.id || supabaseUser?.id || null;
    if (!currentUserId) {
      toast({ title: 'Please log in to continue', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      const itemsPayload = items.map((item: CheckoutCartItem) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }));

      const rpcArgs: Record<string, unknown> = {
        p_items: itemsPayload,
        p_customer_name: addressForm.fullName,
        p_customer_email: addressForm.email || null,
        p_customer_phone: addressForm.phone,
        p_shipping_address: addressForm.address,
        p_shipping_city: addressForm.city,
        p_shipping_state: addressForm.state,
        p_shipping_pincode: addressForm.pincode,
        p_payment_method: paymentMethod,
        p_use_wallet: useWallet,
      };

      if (appliedCoupon?.code) {
        rpcArgs.p_coupon_code = appliedCoupon.code;
      }

      const res = await withTimeout(
        supabase.rpc('place_order_secure', rpcArgs),
        'Order placement timed out',
      );

      if (res.error) throw res.error;

      const rpcResult = res.data;
      const parsed = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;
      
      if (!parsed?.success) {
        throw new Error(parsed?.error || 'Failed to place order via server');
      }

      const finalOrderId = parsed.order_id;
      const finalGrandTotal = parsed.grand_total;

      // Admin notification is now created server-side by place_order_secure RPC
      // (prevents client-side spam / abuse)

      if (useWallet && currentUserId) {
        queryClient.invalidateQueries({ queryKey: ['wallet-profile-balance', currentUserId] });
        queryClient.invalidateQueries({ queryKey: ['wallet-transactions', currentUserId] });
      }

      setOrderId(finalOrderId);
      setConfirmedOrder({ id: finalOrderId, total: finalGrandTotal, discount: couponDiscount, couponCode: appliedCoupon?.code });
      queryClient.invalidateQueries({ queryKey: getUserOrdersQueryKey(currentUserId) });
      clearCart();
      setCurrentStep('confirmation');
      toast({ title: 'Order placed successfully' });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Please try again or contact support';
      console.error('Order placement error:', err);
      toast({ title: 'Order failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const submitCurrentStep = () => {
    if (currentStep === 'address') {
      addressFormRef.current?.requestSubmit();
    }
    if (currentStep === 'payment') {
      paymentFormRef.current?.requestSubmit();
    }
  };

  if (isAuthReady && !isAuthenticated) return <Navigate to="/auth" replace />;

  if (items.length === 0 && currentStep !== 'confirmation') {
    return (
      <div className="container-custom py-20 text-center">
        <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="mb-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mb-8 text-muted-foreground">Add some items to checkout</p>
        <Link to="/shop" className="btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <>
      <div className="container-custom py-6 pb-[calc(var(--mobile-content-bottom)+6rem)] md:pt-[120px] md:pb-12">
        {currentStep !== 'confirmation' && (
          <button onClick={() => (currentStep === 'address' ? navigate('/cart') : setCurrentStep('address'))} className="group mb-6 flex w-fit items-center gap-2 text-sm text-muted-foreground transition-all hover:text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border/40 transition-transform duration-300 group-hover:-translate-x-1 group-hover:bg-border/80">
              <ChevronLeft size={16} />
            </div>
            <span className="font-medium tracking-wide uppercase text-[11px]">{currentStep === 'address' ? 'Back to Cart' : 'Back to Address'}</span>
          </button>
        )}

        {currentStep !== 'confirmation' && (
          <>
            {/* Desktop UI: Original layout */}
            <div className="mb-8 hidden md:flex items-center justify-between gap-2 overflow-x-auto">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === displayStepForTimeline;
                const isPast = activeStepIndex > index;
                return (
                  <div key={step.id} className="flex min-w-0 flex-1 items-center">
                    <div className={`flex flex-1 items-center gap-2 rounded-full px-3 py-2.5 text-xs uppercase tracking-[0.18em] ${
                      isActive ? 'bg-foreground text-background' : isPast ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon size={15} />
                      <span>{step.label}</span>
                    </div>
                    {index < steps.length - 1 && <div className={`mx-2 h-px w-4 md:w-10 ${isPast ? 'bg-foreground' : 'bg-border'}`} />}
                  </div>
                );
              })}
            </div>

            {/* Mobile UI: Flattened flex layout to fix mismatch */}
            <div className="mb-8 flex md:hidden w-full items-center justify-between gap-1.5">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === displayStepForTimeline;
                const isPast = activeStepIndex > index;
                return (
                  <React.Fragment key={step.id}>
                    <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[9.5px] uppercase tracking-[0.1em] whitespace-nowrap transition-colors ${
                      isActive ? 'bg-foreground text-background' : isPast ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate">{step.label}</span>
                    </div>
                    {index < steps.length - 1 && <div className={`h-px w-2 shrink-0 ${isPast ? 'bg-foreground' : 'bg-border'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 'address' && (
            <motion.div key="address" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="lg:col-span-2">
                <div className="rounded-[1.8rem] border border-border/70 bg-card/80 p-5 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.45)] md:p-8">
                  <h2 className="mb-6 text-xl font-semibold">Delivery Address</h2>

                  <form ref={addressFormRef} onSubmit={handleAddressSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium">Full Name *</label>
                        <input type="text" value={addressForm.fullName} onChange={(e) => handleAddressChange('fullName', e.target.value)} onBlur={() => handleAddressBlur('fullName')} className={`input-premium transition-all duration-300 w-full ${errors.fullName ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="Enter your full name" />
                        <AnimatePresence>
                          {errors.fullName && (
                            <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                              <p className="text-[10px] tracking-wide text-rose-400/90">{errors.fullName}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium">Phone Number *</label>
                        <input type="tel" value={addressForm.phone} onChange={(e) => handleAddressChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={() => handleAddressBlur('phone')} className={`input-premium transition-all duration-300 w-full ${errors.phone ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="10-digit mobile number" />
                        <AnimatePresence>
                          {errors.phone && (
                            <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                              <p className="text-[10px] tracking-wide text-rose-400/90">{errors.phone}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="mb-2 block text-sm font-medium">Email Address</label>
                      <input type="email" value={addressForm.email} onChange={(e) => handleAddressChange('email', e.target.value)} onBlur={() => handleAddressBlur('email')} className={`input-premium transition-all duration-300 w-full ${errors.email ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="Enter your email (optional)" />
                      <AnimatePresence>
                        {errors.email && (
                          <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                            <p className="text-[10px] tracking-wide text-rose-400/90">{errors.email}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <label className="mb-2 block text-sm font-medium">Address *</label>
                      <textarea value={addressForm.address} onChange={(e) => handleAddressChange('address', e.target.value)} onBlur={() => handleAddressBlur('address')} className={`input-premium min-h-[110px] resize-none transition-all duration-300 w-full ${errors.address ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="House no, Building, Street, Area" />
                      <AnimatePresence>
                        {errors.address && (
                          <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                            <p className="text-[10px] tracking-wide text-rose-400/90">{errors.address}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium">City *</label>
                        <input type="text" value={addressForm.city} onChange={(e) => handleAddressChange('city', e.target.value)} onBlur={() => handleAddressBlur('city')} className={`input-premium transition-all duration-300 w-full ${errors.city ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="City" />
                        <AnimatePresence>
                          {errors.city && (
                            <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                              <p className="text-[10px] tracking-wide text-rose-400/90">{errors.city}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium">State *</label>
                        <input type="text" value={addressForm.state} onChange={(e) => handleAddressChange('state', e.target.value)} onBlur={() => handleAddressBlur('state')} className={`input-premium transition-all duration-300 w-full ${errors.state ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="State" />
                        <AnimatePresence>
                          {errors.state && (
                            <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                              <p className="text-[10px] tracking-wide text-rose-400/90">{errors.state}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium">Pincode *</label>
                        <input type="text" value={addressForm.pincode} onChange={(e) => handleAddressChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} onBlur={() => handleAddressBlur('pincode')} className={`input-premium transition-all duration-300 w-full ${errors.pincode ? 'border-rose-900/60 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.03)] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`} placeholder="6-digit pincode" />
                        <AnimatePresence>
                          {errors.pincode && (
                            <motion.div initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.2 }} className="absolute -bottom-[18px] left-1 flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                              <p className="text-[10px] tracking-wide text-rose-400/90">{errors.pincode}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <button type="submit" className="btn-primary hidden w-full items-center justify-center gap-2 md:flex">
                      Continue to Payment
                      <ArrowRight size={16} />
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-1">
                <OrderSummary
                  items={items as CheckoutCartItem[]}
                  totalPrice={totalPrice}
                  tax={tax}
                  taxLabel={taxLabel}
                  grandTotal={grandTotal}
                  couponDiscount={couponDiscount}
                  appliedCoupon={appliedCoupon}
                  onCouponApply={handleCouponApply}
                  showCouponInput
                />
              </div>
            </motion.div>
          )}

          {currentStep === 'transition' && (
            <motion.div key="transition" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="lg:col-span-2">
                <div className="rounded-[1.8rem] border border-border/70 bg-card/60 p-5 md:p-8">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted/60" />
                    <div className="h-6 w-40 animate-pulse rounded-md bg-muted/60" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex h-20 items-center gap-4 rounded-[1.45rem] border border-border/40 bg-background/40 px-4">
                        <div className="h-5 w-5 animate-pulse rounded-full bg-muted/60" />
                        <div className="h-4 w-32 animate-pulse rounded-md bg-muted/60" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 h-12 w-full animate-pulse rounded-full bg-muted/60 md:hidden" />
                </div>
              </div>
              <div className="lg:col-span-1 hidden lg:block">
                <div className="h-[400px] w-full animate-pulse rounded-[1.8rem] border border-border/50 bg-card/60" />
              </div>
            </motion.div>
          )}

          {currentStep === 'payment' && (
            <motion.div key="payment" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="grid gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="lg:col-span-2">
                <div className="rounded-[1.8rem] border border-border/70 bg-card/80 p-5 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.45)] md:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-foreground/[0.04] text-foreground">
                      <Wallet size={18} className="opacity-80" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">Payment Method</h2>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className={`overflow-hidden rounded-[1.45rem] border transition-all ${useWallet ? 'border-foreground bg-foreground/[0.04] shadow-[0_20px_45px_-36px_rgba(0,0,0,0.55)]' : 'border-border bg-card'}`}>
                      <label className={`flex cursor-pointer items-center gap-4 px-4 py-4 ${!canUseWallet && 'opacity-60 cursor-not-allowed'}`}>
                        <input type="checkbox" checked={useWallet} onChange={(e) => { if (!canUseWallet) e.preventDefault(); else setUseWallet(!useWallet); }} disabled={!canUseWallet} className="h-4 w-4 text-primary accent-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">SWITCH Wallet</p>
                            <p className="text-sm font-semibold">{formatPrice(walletBalance)}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {canUseWallet 
                              ? (useWallet ? `Applied ${formatPrice(maxWalletPossible)} to this order` : 'Tap to apply balance') 
                              : 'Insufficient balance'}
                          </p>
                        </div>
                      </label>
                    </div>
                    {paymentMethods.map((method) => {
                      const isSelected = paymentMethod === method.id;
                      return (
                        <div key={method.id} className={`overflow-hidden rounded-[1.45rem] border transition-all ${isSelected ? 'border-foreground bg-foreground/[0.04] shadow-[0_20px_45px_-36px_rgba(0,0,0,0.55)]' : 'border-border bg-card'}`}>
                          <label className="flex cursor-pointer items-center gap-4 px-4 py-4">
                            <input type="radio" name="payment" value={method.id} checked={isSelected} onChange={() => setPaymentMethod(method.id)} className="h-4 w-4 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{method.label}</p>
                              <p className="text-sm text-muted-foreground">{method.desc}</p>
                            </div>
                          </label>

                          <AnimatePresence initial={false}>
                            {isSelected && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/60">
                                <div className="bg-gradient-to-br px-4 py-4" style={{ backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.06), transparent 55%)` }}>
                                  {method.id === 'card' && (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="mb-2 block text-sm font-medium">Card Number</label>
                                        <input type="text" value={cardDetails.number} onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/\D/g, '').slice(0, 16) })} className="input-premium" placeholder="1234 5678 9012 3456" />
                                      </div>
                                      <div>
                                        <label className="mb-2 block text-sm font-medium">Name on Card</label>
                                        <input type="text" value={cardDetails.name} onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })} className="input-premium" placeholder="John Doe" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="mb-2 block text-sm font-medium">Expiry Date</label>
                                          <input type="text" value={cardDetails.expiry} onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })} className="input-premium" placeholder="MM/YY" />
                                        </div>
                                        <div>
                                          <label className="mb-2 block text-sm font-medium">CVV</label>
                                          <input type="password" value={cardDetails.cvv} onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })} className="input-premium" placeholder="•••" />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {method.id === 'upi' && (
                                    <div>
                                      <label className="mb-2 block text-sm font-medium">UPI ID</label>
                                      <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="input-premium" placeholder="yourname@upi" />
                                    </div>
                                  )}

                                  {method.id === 'cod' && (
                                    <div className="rounded-[1rem] border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                                      Pay when your order reaches you.
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <form ref={paymentFormRef} onSubmit={handlePaymentSubmit}>
                    <button type="submit" disabled={isProcessing} className="btn-primary hidden w-full items-center justify-center gap-2 md:flex">
                      {isProcessing ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield size={16} />
                          Pay {formatPrice(remainingTotal)}
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield size={14} />
                    <span>Your payment information is secure</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <OrderSummary
                  items={items as CheckoutCartItem[]}
                  totalPrice={totalPrice}
                  tax={tax}
                  taxLabel={taxLabel}
                  grandTotal={grandTotal}
                  couponDiscount={couponDiscount}
                  appliedCoupon={appliedCoupon}
                  walletApplied={walletApplied}
                />
              </div>
            </motion.div>
          )}

          {currentStep === 'confirmation' && (
            <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-2xl py-12 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </motion.div>

              <h1 className="mb-2 text-3xl font-bold">Order Confirmed</h1>
              <p className="mb-6 text-lg text-muted-foreground">Thank you for your purchase.</p>

              <div className="mb-8 rounded-[1.8rem] border border-border/70 bg-card/90 p-6 text-left">
                <div className="mb-4 flex items-center justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono font-medium">{confirmedOrder?.id || orderId}</span></div>
                <div className="mb-4 flex items-center justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-semibold">{formatPrice(confirmedOrder?.total || 0)}</span></div>
                {confirmedOrder?.discount ? (
                  <div className="mb-4 flex items-center justify-between text-green-600"><span>Discount Applied ({confirmedOrder.couponCode})</span><span>-{formatPrice(confirmedOrder.discount)}</span></div>
                ) : null}
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Estimated Delivery</span><span className="font-medium">5-7 Business Days</span></div>
              </div>

              <div className="mb-8 rounded-[1.5rem] bg-muted/50 p-6">
                <h3 className="mb-3 font-semibold">What’s Next</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>You’ll receive an order confirmation email shortly.</p>
                  <p>We’ll notify you when your order ships.</p>
                  <p>Track your order in your profile.</p>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link to="/shop" className="btn-primary">Continue Shopping</Link>
                <Link to="/profile" className="btn-outline">View Orders</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    {currentStep !== 'confirmation' && currentStep !== 'transition' && (
        <div className="sticky-mobile-bottom px-3 md:hidden">
          <div className="mobile-glass-panel rounded-[1.8rem] px-4 py-3 safe-bottom">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{currentStep === 'address' ? 'Ready for payment' : 'Payment summary'}</p>
                <p className="mt-1 text-lg font-semibold">{formatPrice(currentStep === 'address' ? grandTotal : remainingTotal)}</p>
              </div>
              <div className="text-right text-[11px] leading-5 text-muted-foreground">
                <p>{items.length} item{items.length !== 1 ? 's' : ''}</p>
                <p>{currentStep === 'address' ? 'Address first' : 'Secure payment'}</p>
              </div>
            </div>
            <button onClick={submitCurrentStep} disabled={isProcessing} className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-[10px]">
              {currentStep === 'address' ? (
                <>
                  Continue to Payment
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  {isProcessing ? 'Processing...' : `Pay ${formatPrice(remainingTotal)}`}
                  <Truck size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Checkout;
