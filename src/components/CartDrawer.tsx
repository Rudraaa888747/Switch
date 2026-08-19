import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight, Sparkles, Package, Truck } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/data/products';
import { getProductImage } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const FREE_SHIPPING_THRESHOLD = 999;

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 24, stiffness: 260 } },
  exit: { opacity: 0, x: -24, scale: 0.96, transition: { duration: 0.22, ease: 'easeIn' } },
};

const drawerVariants = {
  hiddenDesktop: { x: '100%', opacity: 0 },
  visibleDesktop: { x: 0, opacity: 1, transition: { type: 'spring', damping: 32, stiffness: 280 } },
  exitDesktop: { x: '100%', opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  hiddenMobile: { y: '100%', opacity: 0 },
  visibleMobile: { y: 0, opacity: 1, transition: { type: 'spring', damping: 32, stiffness: 280 } },
  exitMobile: { y: '100%', opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

export default function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
  } = useCart();
  const { isAuthenticated, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isDrawerOpen) {
      closeDrawer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (isDrawerOpen && isAuthReady && !isAuthenticated) {
      closeDrawer();
      navigate('/auth');
    }
  }, [isDrawerOpen, isAuthReady, isAuthenticated, closeDrawer, navigate]);

  const shippingProgress = Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - totalPrice;
  const isFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD;

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            aria-label="Close cart"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            variants={drawerVariants}
            initial={isMobile ? 'hiddenMobile' : 'hiddenDesktop'}
            animate={isMobile ? 'visibleMobile' : 'visibleDesktop'}
            exit={isMobile ? 'exitMobile' : 'exitDesktop'}
            style={{
              position: 'fixed',
              zIndex: 51,
              display: 'flex',
              flexDirection: 'column',
              ...(isMobile
                ? {
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: 'auto',
                  maxHeight: '92dvh',
                  borderTopLeftRadius: '2rem',
                  borderTopRightRadius: '2rem',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }
                : {
                  right: 0,
                  top: 0,
                  height: '100%',
                  width: '100%',
                  maxWidth: '440px',
                  borderLeft: '1px solid rgba(255,255,255,0.07)',
                }),
              background: 'linear-gradient(160deg, rgba(14,14,16,0.98) 0%, rgba(10,10,12,0.99) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: isMobile
                ? '0 -24px 80px -12px rgba(0,0,0,0.7)'
                : '-24px 0 80px -12px rgba(0,0,0,0.7)',
              willChange: 'transform, opacity',
            }}
          >
            {/* ─── Header ─── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
              }}
            >
              {/* Mobile drag pill */}
              {isMobile && (
                <div
                  style={{
                    position: 'absolute',
                    top: '0.6rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '2.5rem',
                    height: '3px',
                    borderRadius: '9999px',
                    background: 'rgba(255,255,255,0.18)',
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingBag size={16} color="rgba(255,255,255,0.8)" strokeWidth={1.5} />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 500,
                  }}
                >
                  Your Cart
                </span>
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.92)',
                      color: '#0a0a0c',
                      borderRadius: '9999px',
                      padding: '1px 8px',
                      lineHeight: '1.8',
                    }}
                  >
                    {totalItems}
                  </motion.span>
                )}
              </div>

              <button
                onClick={closeDrawer}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                aria-label="Close cart"
              >
                <X size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
              </button>
            </div>

            {/* ─── Shipping Progress ─── */}
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    overflow: 'hidden',
                    flexShrink: 0,
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ padding: '0.875rem 1.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.625rem',
                      }}
                    >
                      {isFreeShipping ? (
                        <Sparkles size={13} color="#a78bfa" strokeWidth={1.5} />
                      ) : (
                        <Truck size={13} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                      )}
                      <span
                        style={{
                          fontSize: '11px',
                          color: isFreeShipping ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                          letterSpacing: '0.02em',
                          fontWeight: 500,
                        }}
                      >
                        {isFreeShipping
                          ? 'Free premium shipping unlocked!'
                          : `${formatPrice(remaining)} away from free shipping`}
                      </span>
                    </div>

                    <div
                      style={{
                        height: '2px',
                        width: '100%',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${shippingProgress}%` }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          height: '100%',
                          borderRadius: '9999px',
                          background: isFreeShipping
                            ? 'linear-gradient(90deg, #a78bfa, #c4b5fd)'
                            : 'rgba(255,255,255,0.55)',
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Items List ─── */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: items.length === 0 ? '0' : '1rem 1rem',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.1) transparent',
              }}
            >
              {items.length === 0 ? (
                /* Empty State */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '360px',
                    textAlign: 'center',
                    padding: '2rem 2rem',
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 20 }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '1.5rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <ShoppingBag size={32} color="rgba(255,255,255,0.2)" strokeWidth={1} />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 300,
                      color: 'rgba(255,255,255,0.85)',
                      letterSpacing: '0.01em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Your cart is empty
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.32)',
                      lineHeight: 1.7,
                      maxWidth: '200px',
                      marginBottom: '2rem',
                    }}
                  >
                    Discover premium essentials engineered for modern movement.
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={closeDrawer}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.75rem',
                      background: 'rgba(255,255,255,0.92)',
                      color: '#0a0a0c',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Explore Collection
                    <ArrowRight size={12} strokeWidth={2} />
                  </motion.button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={`${item.product.id}-${item.size}-${item.color}`}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        style={{
                          borderRadius: '1.25rem',
                          border: '1px solid rgba(255,255,255,0.07)',
                          background: 'rgba(255,255,255,0.03)',
                          padding: '0.875rem',
                          display: 'flex',
                          gap: '0.875rem',
                          willChange: 'transform, opacity',
                        }}
                      >
                        {/* Product Image */}
                        <div
                          style={{
                            width: 84,
                            height: 100,
                            flexShrink: 0,
                            borderRadius: '0.875rem',
                            overflow: 'hidden',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <img
                            src={getProductImage(item.product) || ''}
                            alt={item.product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                        </div>

                        {/* Product Info */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <p
                              style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: 'rgba(255,255,255,0.88)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginBottom: '0.3rem',
                              }}
                            >
                              {item.product.name}
                            </p>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
                              {[item.size, item.color].map((attr, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: '9px',
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,0.35)',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.04)',
                                  }}
                                >
                                  {attr}
                                </span>
                              ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: 'rgba(255,255,255,0.9)',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {formatPrice(item.product.price)}
                              </span>
                              <button
                                onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                                style={{
                                  fontSize: '9px',
                                  letterSpacing: '0.2em',
                                  textTransform: 'uppercase',
                                  color: 'rgba(255,255,255,0.3)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px 0',
                                  transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(239,68,68,0.8)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Quantity + Line Total */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.625rem' }}>
                            {/* Qty Control */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '9999px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.04)',
                                padding: '2px',
                              }}
                            >
                              <button
                                onClick={() =>
                                  updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)
                                }
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.6)',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = 'none')
                                }
                                aria-label="Decrease quantity"
                              >
                                <Minus size={12} strokeWidth={2} />
                              </button>

                              <span
                                style={{
                                  width: 28,
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: 'rgba(255,255,255,0.85)',
                                }}
                              >
                                {item.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)
                                }
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.6)',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = 'none')
                                }
                                aria-label="Increase quantity"
                              >
                                <Plus size={12} strokeWidth={2} />
                              </button>
                            </div>

                            {/* Line total */}
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: 'rgba(255,255,255,0.5)',
                              }}
                            >
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Spacer so last item isn't hidden behind footer */}
                  <div style={{ height: '0.5rem' }} />
                </div>
              )}
            </div>

            {/* ─── Footer / Checkout ─── */}
            <AnimatePresence>
              {items.length > 0 && (
                <motion.div
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 24, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    flexShrink: 0,
                    padding: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(10,10,12,0.96)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    paddingBottom: isMobile ? 'max(1.25rem, env(safe-area-inset-bottom))' : '1.25rem',
                  }}
                >
                  {/* Price breakdown */}
                  <div
                    style={{
                      borderRadius: '1rem',
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '1rem',
                      marginBottom: '0.875rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.625rem',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                        Subtotal
                      </span>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                        {formatPrice(totalPrice)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '0.875rem',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: '0.875rem',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        Delivery
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: isFreeShipping ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {isFreeShipping ? '✦ Free' : 'Calculated at checkout'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <p
                          style={{
                            fontSize: '9px',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.3)',
                            marginBottom: '0.2rem',
                          }}
                        >
                          Estimated Total
                        </p>
                        <motion.p
                          key={totalPrice}
                          initial={{ opacity: 0.5, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.95)',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {formatPrice(totalPrice)}
                        </motion.p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Package size={13} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                          {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    to="/checkout"
                    onClick={closeDrawer}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.9rem 1.5rem',
                      borderRadius: '9999px',
                      background: 'rgba(255,255,255,0.95)',
                      color: '#0a0a0c',
                      fontWeight: 600,
                      fontSize: '11px',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      transition: 'background 0.2s, transform 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Proceed to Checkout
                    <ArrowRight size={13} strokeWidth={2} />
                  </Link>

                  {/* Security note */}
                  <p
                    style={{
                      textAlign: 'center',
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.2)',
                      marginTop: '0.625rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Secure checkout · SSL encrypted
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}