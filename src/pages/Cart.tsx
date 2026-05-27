import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/data/products';
import { getProductImage } from '@/lib/utils';

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const { isAuthenticated, isAuthReady } = useAuth();

  const estimatedTax = Math.round(items.reduce((acc, item) => {
    const rate = item.product.price <= 1000 ? 0.05 : 0.12;
    return acc + (item.product.price * item.quantity * rate);
  }, 0));

  const has5Percent = items.some(item => item.product.price <= 1000);
  const has12Percent = items.some(item => item.product.price > 1000);
  const taxLabel = `Estimated GST (${has5Percent && has12Percent ? '5-12%' : has12Percent ? '12%' : '5%'})`;

  if (isAuthReady && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (items.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mb-8 text-muted-foreground">Looks like you haven't added anything yet.</p>
        <Link to="/shop" className="btn-primary">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="container-custom py-6 pb-[calc(var(--mobile-content-bottom)+5.25rem)] md:py-12 md:pb-12">
        <div className="mb-7 md:mb-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Bag Review</p>
          <h1 className="mt-2 text-[clamp(1.8rem,6vw,3rem)] font-light tracking-tight">Shopping Cart ({totalItems})</h1>
        </div>

        <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
          <div className="space-y-3 md:space-y-4 lg:col-span-2">
            {items.map((item, index) => (
              <motion.div
                key={`${item.product.id}-${item.size}-${item.color}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-[1.55rem] border border-border/70 bg-card/80 p-3 shadow-[0_18px_44px_-36px_rgba(0,0,0,0.55)] md:p-4"
              >
                <div className="flex gap-3 md:gap-4">
                  <Link to={`/product/${item.product.id}`} className="h-28 w-20 flex-shrink-0 overflow-hidden rounded-[1rem] md:h-32 md:w-24 md:rounded-[1.15rem]">
                    <img src={getProductImage(item.product, item.color)} alt={item.product.name} className="h-full w-full object-cover" loading="lazy" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${item.product.id}`} className="line-clamp-1 text-sm font-medium md:text-base">{item.product.name}</Link>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-xs">
                      Size {item.size} • {item.color}
                    </p>
                    <p className="mt-2 text-base font-semibold">{formatPrice(item.product.price)}</p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-border bg-background px-1.5 py-1">
                        <button onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)} className="touch-target h-9 w-9 rounded-full">
                          <Minus size={15} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)} className="touch-target h-9 w-9 rounded-full">
                          <Plus size={15} />
                        </button>
                      </div>

                      <button onClick={() => removeFromCart(item.product.id, item.size, item.color)} className="flex h-10 w-10 items-center justify-center rounded-full text-destructive hover:bg-destructive/10">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="mobile-glass-panel sticky top-24 rounded-[1.8rem] p-6">
              <h2 className="text-lg font-semibold">Order Summary</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(totalPrice)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-emerald-600">Included</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{taxLabel}</span><span>{formatPrice(estimatedTax)}</span></div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(totalPrice + estimatedTax)}</span>
                  </div>

                </div>
              </div>
              <Link to="/checkout" className="btn-primary mt-6 flex w-full items-center justify-center gap-2">
                Checkout
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky-mobile-bottom px-3 md:hidden">
        <div className="mobile-glass-panel rounded-[1.75rem] px-4 py-3 safe-bottom">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold">{formatPrice(totalPrice + estimatedTax)}</p>
            </div>

          </div>
          <Link to="/checkout" className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-[10px]">
            Checkout
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </>
  );
};

export default Cart;
