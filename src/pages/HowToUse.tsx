import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserPlus, LogIn, Search, MousePointerClick, CreditCard,
  ShieldCheck, BellRing, PackageCheck, Undo2, ChevronRight,
  Package, Clock, CheckCircle, Truck, XCircle, Wallet, Settings, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/* ─── Design tokens ───────────────────────────────────────────────────── */
const ease = [0.16, 1, 0.3, 1];

/* ─── Fade-in wrapper ─────────────────────────────────────────────────── */
const Reveal = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const initial = {
    opacity: 0,
    y: direction === 'up' ? 28 : 0,
    x: direction === 'left' ? -28 : direction === 'right' ? 28 : 0,
  };
  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{ duration: 0.75, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─── Section label ───────────────────────────────────────────────────── */
const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase font-medium text-[var(--sw-gold)] mb-4">
    <span className="h-px w-6 bg-[var(--sw-gold)]" />
    {children}
  </span>
);

/* ─── Data ────────────────────────────────────────────────────────────── */
const workflowSteps = [
  { icon: UserPlus, num: '01', title: 'Create Account', desc: 'Sign up in seconds to unlock the full Switch experience.' },
  { icon: LogIn, num: '02', title: 'Login', desc: 'Securely access your profile and personal dashboard.' },
  { icon: Search, num: '03', title: 'Browse Products', desc: 'Explore premium clothing across curated categories.' },
  { icon: MousePointerClick, num: '04', title: 'Select Product', desc: 'Pick your size, color, and quantity from the product page.' },
  { icon: CreditCard, num: '05', title: 'Place Order', desc: 'Checkout with your address and confirm securely.' },
  { icon: ShieldCheck, num: '06', title: 'Admin Reviews', desc: 'Our team verifies and prepares your order.' },
  { icon: BellRing, num: '07', title: 'Track Live', desc: 'Real-time status updates keep you informed at every step.' },
  { icon: PackageCheck, num: '08', title: 'Receive Product', desc: 'Your premium item arrives at your door.' },
  { icon: Undo2, num: '09', title: 'Easy Returns', desc: 'Request a return; refunds land in your Switch Wallet.' },
];

const statuses = [
  { name: 'Pending', icon: Clock, desc: 'Order placed, awaiting admin review.', accent: '#EAB308' },
  { name: 'Processing', icon: Settings, desc: 'Items being prepared for shipment.', accent: '#3B82F6' },
  { name: 'Shipped', icon: Truck, desc: 'Package is on its way to you.', accent: '#818CF8' },
  { name: 'Delivered', icon: CheckCircle, desc: 'Your package has arrived.', accent: '#10B981' },
  { name: 'Cancelled', icon: XCircle, desc: 'Order has been cancelled.', accent: '#EF4444' },
];

const orderSteps = [
  { title: 'Find Your Style', desc: 'Browse by category or use search to discover pieces made for you.' },
  { title: 'Select Options', desc: 'Choose your preferred size, color, and quantity on the product page.' },
  { title: 'Add to Cart', desc: 'Review your items in the slide-out cart drawer before proceeding.' },
  { title: 'Secure Checkout', desc: 'Provide your delivery address, confirm details, and place your order.' },
];

const faqs = [
  { q: 'How do I place an order?', a: 'Browse collections, select your size and color, click "Add to Cart", and proceed to checkout securely from the cart drawer.' },
  { q: 'Can I cancel my order?', a: 'Yes — you can cancel while the order is still in "Pending" status from your Order History page.' },
  { q: 'How do I track my order?', a: 'Go to Profile → My Orders. You will see live status updates reflecting exactly where your package is.' },
  { q: 'How do returns work?', a: 'Request a return from your orders page. Once approved and picked up, your refund is instantly credited to your Switch Wallet.' },
  { q: 'What is the Switch Wallet?', a: 'Switch Wallet is your in-app balance. All refunds land here instantly so you can use them on your next purchase without delay.' },
];

/* ─── Main Component ──────────────────────────────────────────────────── */
const HowToUse = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Horizontal scroll for ticker
  const [tickerX, setTickerX] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (tickerRef.current?.offsetLeft ?? 0);
    scrollLeft.current = tickerRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !tickerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (tickerRef.current.offsetLeft ?? 0);
    tickerRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  };
  const onMouseUp = () => { isDragging.current = false; };

  return (
    <div className="min-h-screen sw-htu" style={{ background: 'var(--sw-bg)', color: 'var(--sw-fg)', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

        /* ── theme-aware tokens ── */
        .sw-htu {
          --sw-bg: #0E0E0F;
          --sw-ink: #0E0E0F;
          --sw-fg: #F7F5F0;
          --sw-text-rgb: 247, 245, 240;
          --sw-gold: #C9A96E;
          --sw-gold-rgb: 201, 169, 110;
          --sw-surface-rgb: 255, 255, 255;
          --sw-surface-alpha: 0.02;
          --sw-card: rgba(30, 28, 25, 0.95);
        }
        html.light .sw-htu {
          --sw-bg: #f4efe6;
          --sw-fg: #1d1a15;
          --sw-text-rgb: 29, 26, 21;
          --sw-gold: #a07d3e;
          --sw-gold-rgb: 160, 125, 62;
          --sw-surface-rgb: 255, 255, 255;
          --sw-surface-alpha: 0.55;
          --sw-card: rgba(255, 255, 255, 0.92);
        }

        * { box-sizing: border-box; }

        .sw-serif { font-family: 'Playfair Display', Georgia, serif; }
        .sw-sans  { font-family: 'Inter', system-ui, sans-serif; }

        .gold { color: var(--sw-gold); }
        .gold-border { border-color: rgba(var(--sw-gold-rgb),0.25); }

        /* scrollbar hide */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* step card hover */
        .step-card { transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(var(--sw-gold-rgb),0.12); }

        /* faq item */
        .faq-trigger { color: var(--sw-fg) !important; }
        .faq-content  { color: rgba(var(--sw-text-rgb),0.6) !important; }

        /* divider */
        .gold-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(var(--sw-gold-rgb),0.4), transparent); }

        /* glow dot */
        @keyframes pulse-gold {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        .pulse-gold { animation: pulse-gold 2s ease-in-out infinite; }

        /* Responsive */
        @media (max-width: 640px) {
          .hero-title { font-size: clamp(2.6rem, 11vw, 5rem) !important; }
          .section-title { font-size: clamp(1.8rem, 7vw, 2.5rem) !important; }
        }

        /* accordion overrides */
        [data-radix-accordion-trigger] {
          font-family: 'Inter', system-ui, sans-serif !important;
          font-size: 1rem !important;
          color: var(--sw-fg) !important;
        }
        [data-radix-accordion-content] {
          color: rgba(var(--sw-text-rgb),0.6) !important;
        }
        [data-radix-accordion-item] {
          border-color: rgba(var(--sw-gold-rgb),0.15) !important;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════ HERO */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ paddingTop: '80px' }}
      >
        {/* Background texture */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(var(--sw-gold-rgb),0.07) 0%, transparent 65%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23C9A96E\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.5
        }} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="inline-flex items-center gap-3 mb-8"
          >
            <span className="h-px w-8 bg-[var(--sw-gold)]" />
            <span style={{ fontSize: '11px', letterSpacing: '0.22em', color: 'var(--sw-gold)', fontWeight: 500 }} className="sw-sans uppercase">
              Your Complete Guide
            </span>
            <span className="h-px w-8 bg-[var(--sw-gold)]" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease }}
            className="sw-serif hero-title mb-6"
            style={{ fontSize: 'clamp(3.2rem, 8vw, 6.5rem)', fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.02em' }}
          >
            How to use{' '}
            <em style={{ color: 'var(--sw-gold)', fontStyle: 'italic' }}>Switch</em>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
            className="sw-sans mb-12 mx-auto"
            style={{ fontSize: '1.125rem', color: 'rgba(var(--sw-text-rgb),0.55)', fontWeight: 300, lineHeight: 1.7, maxWidth: '520px' }}
          >
            From first visit to doorstep delivery — everything you need to know, laid out simply.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/shop"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 32px', borderRadius: '100px',
                background: 'var(--sw-gold)', color: 'var(--sw-ink)',
                fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em',
                textDecoration: 'none', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              className="sw-sans hover:scale-105"
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(var(--sw-gold-rgb),0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              Start Shopping
            </Link>
            <button
              onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '13px 28px', borderRadius: '100px',
                border: '1px solid rgba(var(--sw-gold-rgb),0.3)', color: 'var(--sw-fg)',
                fontSize: '14px', fontWeight: 400, background: 'transparent',
                cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s'
              }}
              className="sw-sans"
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--sw-gold-rgb),0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--sw-gold-rgb),0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(var(--sw-gold-rgb),0.3)'; }}
            >
              Read the guide <ArrowDown size={14} />
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '1px', height: '52px', background: 'linear-gradient(to bottom, rgba(var(--sw-gold-rgb),0.6), transparent)', margin: '0 auto' }}
          />
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════ MAIN CONTENT */}
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px 120px' }}>

        {/* ── SECTION: How Switch Works (horizontal scroll ticker) ── */}
        <section style={{ paddingTop: '120px' }}>
          <Reveal>
            <Label>The Journey</Label>
            <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '16px' }}>
              How Switch Works
            </h2>
            <p className="sw-sans" style={{ color: 'rgba(var(--sw-text-rgb),0.5)', fontSize: '1rem', fontWeight: 300, marginBottom: '48px', maxWidth: '480px' }}>
              Nine seamless steps — drag to explore each stage of your experience.
            </p>
          </Reveal>

          {/* Horizontal drag-scroll ticker */}
          <div
            ref={tickerRef}
            className="no-scrollbar"
            style={{
              display: 'flex', gap: '16px', overflowX: 'auto',
              cursor: 'grab', userSelect: 'none',
              paddingBottom: '16px', margin: '0 -24px', padding: '8px 24px 24px'
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {workflowSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.07, 0.4) }}
                className="step-card"
                style={{
                  minWidth: '220px', maxWidth: '220px',
                  padding: '28px 24px',
                  borderRadius: '20px',
                  border: '1px solid rgba(var(--sw-gold-rgb),0.12)',
                  background: 'rgba(var(--sw-surface-rgb), var(--sw-surface-alpha))',
                  backdropFilter: 'blur(12px)',
                  flexShrink: 0,
                }}
              >
                {/* Number */}
                <div style={{ fontSize: '11px', color: 'var(--sw-gold)', letterSpacing: '0.18em', marginBottom: '20px', fontFamily: "'Inter', monospace" }}>
                  {step.num}
                </div>

                {/* Icon */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(var(--sw-gold-rgb),0.08)',
                  border: '1px solid rgba(var(--sw-gold-rgb),0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <step.icon size={20} color="var(--sw-gold)" />
                </div>

                <h3 className="sw-sans" style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px', color: 'var(--sw-fg)' }}>
                  {step.title}
                </h3>
                <p className="sw-sans" style={{ fontSize: '13px', color: 'rgba(var(--sw-text-rgb),0.45)', lineHeight: 1.6, fontWeight: 300 }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Drag hint */}
          <p className="sw-sans" style={{ fontSize: '11px', color: 'rgba(var(--sw-text-rgb),0.25)', letterSpacing: '0.1em', marginTop: '8px' }}>
            ← Drag to scroll →
          </p>
        </section>

        <div className="gold-divider" style={{ margin: '100px 0' }} />

        {/* ── SECTION: How to Place an Order ── */}
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '64px', alignItems: 'center' }}>
            <Reveal direction="left">
              <Label>Step by Step</Label>
              <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '48px' }}>
                Placing your<br />first order
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {orderSteps.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    {/* Step number */}
                    <div style={{
                      flexShrink: 0, width: '32px', height: '32px',
                      borderRadius: '50%',
                      border: '1px solid rgba(var(--sw-gold-rgb),0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: 'var(--sw-gold)', fontFamily: "'Inter', monospace",
                      letterSpacing: '0.05em', fontWeight: 500
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h4 className="sw-sans" style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: 'var(--sw-fg)' }}>
                        {item.title}
                      </h4>
                      <p className="sw-sans" style={{ fontSize: '14px', color: 'rgba(var(--sw-text-rgb),0.5)', lineHeight: 1.65, fontWeight: 300 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Visual mockup */}
            <Reveal direction="right" delay={0.15}>
              <div style={{
                borderRadius: '24px',
                border: '1px solid rgba(var(--sw-gold-rgb),0.12)',
                background: 'rgba(var(--sw-surface-rgb), var(--sw-surface-alpha))',
                padding: '32px',
                aspectRatio: '1 / 1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden'
              }}>
                {/* Soft glow */}
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(var(--sw-gold-rgb),0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

                {/* Fake product card */}
                <div style={{
                  background: 'var(--sw-card)',
                  borderRadius: '18px',
                  border: '1px solid rgba(var(--sw-gold-rgb),0.1)',
                  padding: '24px',
                  width: '100%', maxWidth: '280px',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
                }}>
                  {/* Image placeholder */}
                  <div style={{ 
                    height: '140px', 
                    borderRadius: '12px', 
                    marginBottom: '20px', 
                    backgroundImage: 'url("https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=600")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center 15%',
                    border: '1px solid rgba(var(--sw-gold-rgb),0.15)'
                  }} />
                  {/* Product info */}
                  <div style={{ height: '14px', width: '60%', background: 'rgba(var(--sw-text-rgb),0.08)', borderRadius: '6px', marginBottom: '10px' }} />
                  <div style={{ height: '11px', width: '40%', background: 'rgba(var(--sw-gold-rgb),0.2)', borderRadius: '6px', marginBottom: '20px' }} />
                  {/* Size chips */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    {['S', 'M', 'L', 'XL'].map(s => (
                      <div key={s} style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
                        border: s === 'M' ? '1px solid var(--sw-gold)' : '1px solid rgba(var(--sw-text-rgb),0.08)',
                        color: s === 'M' ? 'var(--sw-gold)' : 'rgba(var(--sw-text-rgb),0.3)',
                        background: s === 'M' ? 'rgba(var(--sw-gold-rgb),0.08)' : 'transparent'
                      }} className="sw-sans">
                        {s}
                      </div>
                    ))}
                  </div>
                  {/* Add to cart */}
                  <div style={{
                    height: '44px', borderRadius: '10px',
                    background: 'var(--sw-gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 600, color: 'var(--sw-ink)',
                    letterSpacing: '0.04em'
                  }} className="sw-sans">
                    Add to Cart
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="gold-divider" style={{ margin: '100px 0' }} />

        {/* ── SECTION: Admin + Product Management ── */}
        <section>
          <Reveal>
            <Label>Behind the Scenes</Label>
            <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '48px' }}>
              What happens after<br />you order
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: ShieldCheck,
                label: 'Admin Processing',
                desc: 'Once placed, your order is securely transmitted to our admin system. Our team verifies details, confirms stock, and dispatches it through every fulfilment stage.',
                points: ['Order Verification', 'Quality Check', 'Real-time status dispatch'],
              },
              {
                icon: Package,
                label: 'Product Management',
                desc: 'Our inventory is meticulously maintained. Products feature auto-categorisation, dynamic tagging, and AI-powered descriptions so you always see accurate details.',
                points: ['Live Inventory Tracking', 'Smart Categorisation', 'AI-powered Tagging'],
              }
            ].map((card, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div style={{
                  padding: '36px', borderRadius: '24px',
                  border: '1px solid rgba(var(--sw-gold-rgb),0.12)',
                  background: 'rgba(var(--sw-surface-rgb), var(--sw-surface-alpha))',
                  height: '100%'
                }}>
                  <div style={{ marginBottom: '28px', width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(var(--sw-gold-rgb),0.08)', border: '1px solid rgba(var(--sw-gold-rgb),0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <card.icon size={22} color="var(--sw-gold)" />
                  </div>
                  <h3 className="sw-serif" style={{ fontSize: '1.4rem', fontWeight: 500, marginBottom: '14px' }}>{card.label}</h3>
                  <p className="sw-sans" style={{ fontSize: '14px', color: 'rgba(var(--sw-text-rgb),0.5)', lineHeight: 1.7, fontWeight: 300, marginBottom: '24px' }}>{card.desc}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {card.points.map((pt, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(var(--sw-text-rgb),0.7)' }} className="sw-sans">
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sw-gold)', flexShrink: 0 }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="gold-divider" style={{ margin: '100px 0' }} />

        {/* ── SECTION: Demo Admin Access ── */}
        <section style={{ position: 'relative', overflow: 'hidden', borderRadius: '28px', border: '1px solid rgba(var(--sw-gold-rgb),0.14)', background: 'linear-gradient(135deg, rgba(var(--sw-gold-rgb),0.05) 0%, var(--sw-bg) 100%)', padding: 'clamp(36px, 6vw, 72px)' }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(var(--sw-gold-rgb),0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />

          <Reveal>
            <Label>Demo Access</Label>
            <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '24px' }}>
              Explore the Admin Side
            </h2>
            <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p className="sw-sans" style={{ color: 'rgba(var(--sw-text-rgb),0.65)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.7 }}>
                Curious about what happens behind the scenes? You can manually log into our admin portal to explore the system. 
                Simply use your <strong style={{ color: 'var(--sw-fg)', fontWeight: 500 }}>store email ID</strong> and <strong style={{ color: 'var(--sw-fg)', fontWeight: 500 }}>password</strong> to access the dashboard.
              </p>
              
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
                {[
                  'Experience how the order management system works.',
                  'Process refunds and explore the wallet integration.',
                  'Add and manage products seamlessly.'
                ].map((pt, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(var(--sw-text-rgb),0.55)' }} className="sw-sans">
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sw-gold)', flexShrink: 0 }} />
                    {pt}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(var(--sw-gold-rgb),0.08)', border: '1px solid rgba(var(--sw-gold-rgb),0.15)' }}>
                <ShieldCheck size={20} color="var(--sw-gold)" style={{ flexShrink: 0 }} />
                <p className="sw-sans" style={{ fontSize: '13px', color: 'rgba(var(--sw-text-rgb),0.7)', lineHeight: 1.5, margin: 0 }}>
                  <strong style={{ color: 'var(--sw-gold)', fontWeight: 500 }}>Note:</strong> Some advanced features are disabled as this is a demo version.
                </p>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(var(--sw-gold-rgb),0.1)' }}>
                <p className="sw-sans" style={{ fontSize: '15px', color: 'var(--sw-fg)', fontWeight: 400, marginBottom: '8px' }}>
                  Like what you see?
                </p>
                <p className="sw-sans" style={{ fontSize: '14px', color: 'rgba(var(--sw-text-rgb),0.5)', lineHeight: 1.6 }}>
                  If you enjoyed exploring the website and its features, feel free to get in touch. <br/>
                  Contact: <a href="mailto:rudrachokshi441@gmail.com" style={{ color: 'var(--sw-gold)', textDecoration: 'none', borderBottom: '1px solid rgba(var(--sw-gold-rgb),0.4)', paddingBottom: '2px', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--sw-gold)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--sw-gold-rgb),0.4)'}>rudrachokshi441@gmail.com</a>
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        <div className="gold-divider" style={{ margin: '100px 0' }} />

        {/* ── SECTION: Order Status Guide ── */}
        <section>
          <Reveal>
            <Label>Order Status</Label>
            <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '16px' }}>
              Where is my order?
            </h2>
            <p className="sw-sans" style={{ color: 'rgba(var(--sw-text-rgb),0.5)', fontSize: '1rem', fontWeight: 300, marginBottom: '48px', maxWidth: '440px' }}>
              Every status explained — check your Order History for live updates.
            </p>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px' }}>
            {statuses.map((status, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div style={{
                  padding: '28px 24px', borderRadius: '20px',
                  border: `1px solid ${status.accent}22`,
                  background: `${status.accent}08`,
                  height: '100%'
                }}>
                  <status.icon size={24} style={{ color: status.accent, marginBottom: '16px' }} />
                  <h3 className="sw-sans" style={{ fontSize: '14px', fontWeight: 600, color: status.accent, marginBottom: '8px' }}>{status.name}</h3>
                  <p className="sw-sans" style={{ fontSize: '13px', color: 'rgba(var(--sw-text-rgb),0.5)', lineHeight: 1.6, fontWeight: 300 }}>{status.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="gold-divider" style={{ margin: '100px 0' }} />

        {/* ── SECTION: Returns ── */}
        <section style={{ position: 'relative', overflow: 'hidden', borderRadius: '28px', border: '1px solid rgba(var(--sw-gold-rgb),0.14)', background: 'rgba(var(--sw-surface-rgb), var(--sw-surface-alpha))', padding: 'clamp(36px, 6vw, 72px)' }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(var(--sw-gold-rgb),0.05)', filter: 'blur(80px)', pointerEvents: 'none' }} />

          <Reveal>
            <Label>No Hassle</Label>
            <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '16px' }}>
              Returns & Refunds
            </h2>
            <p className="sw-sans" style={{ color: 'rgba(var(--sw-text-rgb),0.5)', fontSize: '1rem', fontWeight: 300, marginBottom: '48px', maxWidth: '460px' }}>
              No bank delays. Your refund goes straight to your Switch Wallet — instantly.
            </p>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', maxWidth: '760px' }}>
            {[
              { icon: Undo2, step: '01', title: 'Request Return', desc: 'Submit a return from your Order History page in one tap.' },
              { icon: PackageCheck, step: '02', title: 'Admin Approves', desc: 'Our team reviews, approves, and arranges a pickup.' },
              { icon: Wallet, step: '03', title: 'Wallet Refund', desc: 'Refund credited instantly to your Switch Wallet upon pickup.' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: '44px', height: '44px', borderRadius: '12px',
                    border: '1px solid rgba(var(--sw-gold-rgb),0.25)',
                    background: 'rgba(var(--sw-gold-rgb),0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <item.icon size={18} color="var(--sw-gold)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--sw-gold)', letterSpacing: '0.18em', marginBottom: '8px' }} className="sw-sans">{item.step}</div>
                    <h4 className="sw-sans" style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>{item.title}</h4>
                    <p className="sw-sans" style={{ fontSize: '13px', color: 'rgba(var(--sw-text-rgb),0.45)', lineHeight: 1.65, fontWeight: 300 }}>{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="gold-divider" style={{ margin: '100px 0' }} />

        {/* ── SECTION: FAQ ── */}
        <section>
          <Reveal>
            <Label>Got Questions?</Label>
            <h2 className="sw-serif section-title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500, lineHeight: 1.15, marginBottom: '48px' }}>
              Frequently Asked
            </h2>
          </Reveal>

          <div style={{ maxWidth: '680px' }}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  style={{ borderColor: 'rgba(var(--sw-gold-rgb),0.15)' }}
                >
                  <AccordionTrigger
                    style={{ color: 'var(--sw-fg)', fontSize: '15px', fontWeight: 400, fontFamily: "'Inter', sans-serif", textAlign: 'left', paddingTop: '20px', paddingBottom: '20px' }}
                  >
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent
                    style={{ color: 'rgba(var(--sw-text-rgb),0.55)', fontSize: '14px', fontFamily: "'Inter', sans-serif", lineHeight: 1.7, fontWeight: 300, paddingBottom: '20px' }}
                  >
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── CTA FOOTER STRIP ── */}
        <Reveal>
          <div style={{
            marginTop: '120px', textAlign: 'center',
            padding: 'clamp(48px, 8vw, 80px) 32px',
            borderRadius: '28px',
            background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(var(--sw-gold-rgb),0.08) 0%, transparent 70%)',
            border: '1px solid rgba(var(--sw-gold-rgb),0.1)'
          }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.22em', color: 'var(--sw-gold)', marginBottom: '20px' }} className="sw-sans uppercase">You're ready</p>
            <h2 className="sw-serif" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 500, lineHeight: 1.12, marginBottom: '32px' }}>
              Start your Switch<br />
              <em style={{ color: 'var(--sw-gold)', fontStyle: 'italic' }}>experience today</em>
            </h2>
            <Link
              to="/shop"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '15px 36px', borderRadius: '100px',
                background: 'var(--sw-gold)', color: 'var(--sw-ink)',
                fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em',
                textDecoration: 'none', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              className="sw-sans"
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(var(--sw-gold-rgb),0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Shop the Collection
            </Link>
          </div>
        </Reveal>

      </div>
    </div>
  );
};

export default HowToUse;