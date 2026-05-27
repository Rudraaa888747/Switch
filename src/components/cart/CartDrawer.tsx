import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/data/products';
import { getProductImage } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-50 bg-black/52 backdrop-blur-sm"
            aria-label="Close cart drawer overlay"
          />

          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className={`fixed z-50 flex flex-col bg-background ${
              isMobile
                ? 'inset-x-0 bottom-0 top-auto max-h-[86dvh] rounded-t-[2rem] border-t border-border'
                : 'right-0 top-0 h-full w-full max-w-md border-l border-border'
            }`}
          >
            <div className="safe-top">
              <div className="flex items-center justify-between border-b border-border px-5 py-4 md:px-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} />
                  <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Cart</span>
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">{totalItems}</span>
                </div>
                <button onClick={closeDrawer} className="touch-target rounded-full border border-border/70 bg-background/70">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4 md:px-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6">
                  <ShoppingBag size={56} className="mb-8 stroke-[1] text-foreground/30" />
                  <p className="text-2xl font-light tracking-wide">Your selection awaits.</p>
                  <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-muted-foreground/80">
                    Discover premium essentials engineered for modern movement.
                  </p>
                  <button onClick={closeDrawer} className="btn-primary mt-8 inline-flex items-center gap-2 px-8 py-3.5 text-[10px]">
                    Explore Collection
                    <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.size}-${item.color}`}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[1.35rem] border border-border/70 bg-card/90 p-3 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.5)]"
                    >
                      <div className="flex gap-3">
                        <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-[1rem] bg-muted/40">
                          <img src={getProductImage(item.product) || ''} alt={item.product.name} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">{item.product.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            <span>{item.size}</span>
                            <span>{item.color}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-sm font-semibold">{formatPrice(item.product.price)}</p>
                            <button
                              onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                              className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-border bg-background px-1.5 py-1">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                                className="touch-target h-8 w-8 rounded-full"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                                className="touch-target h-8 w-8 rounded-full"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="text-sm text-muted-foreground">{formatPrice(item.product.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="safe-bottom border-t border-border bg-background/94 px-4 pb-4 pt-3 backdrop-blur-2xl md:px-6">
                <div className="mobile-glass-panel rounded-[1.6rem] px-4 py-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-emerald-600">Included</span>
                  </div>
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Estimated total</p>
                      <p className="mt-1 text-xl font-semibold">{formatPrice(totalPrice)}</p>
                    </div>
                  </div>
                  <Link
                    to="/checkout"
                    onClick={closeDrawer}
                    className="btn-primary flex w-full items-center justify-center gap-2"
                  >
                    Checkout
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
