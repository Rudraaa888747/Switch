import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown, Search, MessageCircle, ArrowRight, HelpCircle, Package, CreditCard, Truck, RotateCcw, Shirt, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/lib/utils';

/* ─── animation helper ─── */
const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  );
};

/* ─── FAQ data ─── */
const FAQ_CATEGORIES = [
  {
    name: 'Orders & Shipping',
    icon: Truck,
    faqs: [
      {
        q: 'How long does shipping take?',
        a: "Standard shipping takes 5-7 business days across India. Express shipping (available at checkout) delivers within 2-3 business days to major cities. You'll receive a tracking link via email and SMS once your order ships.",
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order is shipped, you\'ll receive a tracking link via email. You can also track your order anytime by visiting your "My Orders" page in your account. Real-time updates are available there.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Currently, we ship across India only. We\'re working on expanding to international markets soon. Stay tuned to our newsletter for updates!',
      },
      {
        q: 'Is shipping free?',
        a: 'Yes! We offer free standard shipping on all orders above ₹999. For orders below ₹999, a flat shipping fee of ₹99 applies.',
      },
      {
        q: 'Can I change my shipping address after placing an order?',
        a: 'You can update your shipping address within 2 hours of placing the order by contacting our support team. After that, the order enters processing and address changes may not be possible.',
      },
    ],
  },
  {
    name: 'Returns & Refunds',
    icon: RotateCcw,
    faqs: [
      {
        q: 'What is your return policy?',
        a: 'We offer a 14-day easy return policy. Items must be unworn, unwashed, and in their original packaging with all tags attached. Simply go to "My Orders", select the order, and click "Return" to initiate the process.',
      },
      {
        q: 'How do refunds work?',
        a: 'Once we receive and inspect the returned item, your refund will be processed within 3-5 business days. Refunds are credited to your SWITCH Wallet, which you can use for future purchases or request a bank transfer.',
      },
      {
        q: 'Can I exchange an item for a different size?',
        a: 'Yes! You can initiate a return for the incorrect size and place a new order for the correct size. We recommend checking our Size Guide before ordering to find your perfect fit.',
      },
      {
        q: 'What if I receive a damaged or wrong item?',
        a: 'We\'re sorry! Please initiate a return from your "My Orders" page within 48 hours of delivery and select "Damaged/Defective" as the reason. We\'ll prioritize your refund and arrange a pickup at no cost.',
      },
    ],
  },
  {
    name: 'Payments',
    icon: CreditCard,
    faqs: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit/debit cards, UPI, net banking, and Cash on Delivery (COD). You can also use your SWITCH Wallet balance for payments.',
      },
      {
        q: 'Is Cash on Delivery available?',
        a: 'Yes, COD is available on orders up to ₹5,000. A small COD fee of ₹49 may apply on orders below ₹499.',
      },
      {
        q: 'What is SWITCH Wallet?',
        a: 'SWITCH Wallet is your in-app wallet where refunds are credited and rewards are stored. You can use your wallet balance to pay for future orders, either fully or partially.',
      },
      {
        q: 'Are my payment details secure?',
        a: 'Absolutely. All transactions are processed through bank-grade encrypted payment gateways. We never store your card details on our servers.',
      },
    ],
  },
  {
    name: 'Products & Sizing',
    icon: Shirt,
    faqs: [
      {
        q: 'How do I find my correct size?',
        a: 'Visit our detailed Size Guide page where you can view measurements for all garment types, use our interactive size finder tool, and learn how to measure yourself accurately.',
      },
      {
        q: 'What materials do you use?',
        a: 'We use premium-quality fabrics including organic cotton, linen blends, modal, and performance polyester. Each product page lists the specific fabric composition.',
      },
      {
        q: 'Are your products true to size?',
        a: 'Most of our products fit true to size. Each product page mentions the fit type (Slim, Regular, or Relaxed/Oversized). We recommend checking the size chart on individual product pages for the best fit.',
      },
      {
        q: 'How should I care for my SWITCH clothes?',
        a: 'Each garment comes with specific care instructions on its tag. As a general rule: machine wash cold inside out, avoid tumble drying, and iron on low heat. This extends the life of the garment significantly.',
      },
    ],
  },
  {
    name: 'Account & Privacy',
    icon: Shield,
    faqs: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign In" on the top right corner and choose "Create Account". You can sign up with your email and password. Once registered, you can track orders, save wishlists, and more.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'Click "Sign In" and then "Forgot Password". Enter your registered email address and we\'ll send you a password reset link. The link expires in 1 hour for security.',
      },
      {
        q: 'How is my personal data used?',
        a: 'We take privacy seriously. Your data is used solely for order processing, personalization, and communication. We never sell your data to third parties. Read our full Privacy Policy for details.',
      },
    ],
  },
];

/* ─── main ─── */
const FAQ = () => {
  useDocumentTitle('FAQ | SWITCH');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredCategories = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.faqs.length > 0);

  const displayCategories = search ? filteredCategories : [FAQ_CATEGORIES[activeCategory]];
  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.faqs.length, 0);

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent" />
        <div className="container-custom relative">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground/5">
                <HelpCircle size={18} className="text-foreground/60" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">Help Center</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1
              className="text-4xl md:text-6xl font-light tracking-[-0.02em] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Frequently Asked Questions
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed mb-8">
              Got questions? We've got answers. Browse by category or search for what you need.
            </p>
          </Reveal>

          {/* Search */}
          <Reveal delay={0.2}>
            <div className="relative max-w-xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
              />
              {search && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Found {totalResults} result{totalResults !== 1 ? 's' : ''} across {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container-custom pb-20">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Category sidebar */}
          {!search && (
            <Reveal className="lg:w-64 flex-shrink-0">
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 lg:sticky lg:top-24">
                {FAQ_CATEGORIES.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => { setActiveCategory(i); setOpenQuestion(null); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                        activeCategory === i
                          ? 'bg-foreground text-background shadow-lg'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                    >
                      <Icon size={15} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </Reveal>
          )}

          {/* Questions */}
          <div className="flex-1 space-y-6">
            <AnimatePresence mode="wait">
              {displayCategories.map((cat) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {search && (
                    <div className="flex items-center gap-2 mb-4 mt-2">
                      <cat.icon size={14} className="text-muted-foreground" />
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">{cat.name}</h3>
                    </div>
                  )}
                  <div className="space-y-2">
                    {cat.faqs.map((faq, fi) => {
                      const key = `${cat.name}-${fi}`;
                      const isOpen = openQuestion === key;
                      return (
                        <div
                          key={key}
                          className={`rounded-2xl border overflow-hidden transition-all duration-300 ${isOpen ? 'border-border/70 bg-card/60 shadow-sm' : 'border-border/40 bg-card/20 hover:bg-card/40'}`}
                        >
                          <button
                            onClick={() => setOpenQuestion(isOpen ? null : key)}
                            className="flex items-start justify-between w-full p-5 text-left gap-4"
                          >
                            <span className="font-medium text-sm leading-snug">{faq.q}</span>
                            <ChevronDown size={16} className={`text-muted-foreground flex-shrink-0 mt-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                                  {faq.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <Reveal>
          <div className="mt-16 text-center p-10 md:p-14 rounded-3xl border border-border/40 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.05] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
            <div className="relative">
              <MessageCircle size={28} className="mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-xl md:text-2xl font-light mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Still have questions?
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Our Switch AI Assistant is available 24/7 to help you with anything — from sizing questions to styling tips.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
                  className="inline-flex items-center gap-2 bg-foreground text-background px-7 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity"
                >
                  Chat with Switch AI <ArrowRight size={12} />
                </button>
                <a
                  href="mailto:hello@switch.com"
                  className="inline-flex items-center gap-2 border border-border/60 px-7 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
                >
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default FAQ;
