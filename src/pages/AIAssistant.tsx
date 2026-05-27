import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  User,
  Loader2,
  ArrowUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAIChat } from '@/hooks/useAIChat';
import { useProducts } from '@/hooks/useProducts';
import { formatPrice, Product } from '@/data/products';
import { getProductImage } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  productIds?: string[];
  products?: Product[];
  timestamp: Date;
}

const premiumEase = [0.25, 0.1, 0.25, 1] as const;

// Editorial fashion suggestion pills
const suggestedQueries = [
  'BLACK ESSENTIALS',
  'OFFICE MINIMAL',
  'AFTER DARK',
  'SUMMER LUXURY',
  'TRENDING NOW',
  'CLEAN STREETWEAR',
];

const AIAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content:
        "Welcome. I'm your personal style concierge.\n\nTell me what you're dressing for — and I'll curate something exceptional.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isLoading } = useAIChat();
  const { data: dbProducts = [] } = useProducts();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const extractProductIds = (text: string): string[] => {
    const match = text.match(/\[PRODUCTS:\s*([^\]]+)\]/);
    if (match) {
      return match[1].split(',').map(id => id.trim()).filter(Boolean);
    }
    return [];
  };

  const stripProductTag = (text: string): string => {
    return text.replace(/\s*\[PRODUCTS:[^\]]*\]/g, '');
  };

  const resolveProducts = useCallback((ids: string[]): Product[] => {
    if (ids.length === 0 || dbProducts.length === 0) return [];
    return dbProducts.filter(p => ids.includes(p.id)).slice(0, 8);
  }, [dbProducts]);

  useEffect(() => {
    if (pendingProductIds.length > 0) {
      const resolved = resolveProducts(pendingProductIds);
      if (resolved.length > 0) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.type === 'ai' && last.products === undefined) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, products: resolved, productIds: pendingProductIds };
            return updated;
          }
          return prev;
        });
        setPendingProductIds([]);
      }
    }
  }, [pendingProductIds, resolveProducts]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input;
    setInput('');
    setStreamingText('');

    const chatHistory = messages
      .filter(m => m.id !== '1')
      .map(m => ({
        role: m.type === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    let fullResponse = '';
    let ids: string[] = [];

    await sendMessage(
      [...chatHistory, { role: 'user', content: query }],
      (delta) => {
        fullResponse += delta;
        setStreamingText(fullResponse);
        const extracted = extractProductIds(fullResponse);
        if (extracted.length > 0) ids = extracted;
      },
      () => {
        const cleanText = stripProductTag(fullResponse);
        setStreamingText('');
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: cleanText || "Let me refine that for you — try describing an occasion, mood, or aesthetic.",
          productIds: ids,
          timestamp: new Date(),
        }]);
        if (ids.length > 0) {
          setPendingProductIds(ids);
        }
      }
    );
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden">

      {/* ── Luxury Header ── */}
      <div className="relative shrink-0 border-b border-border/30 bg-background/60 backdrop-blur-2xl">
        {/* ambient top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
        <div className="container-custom py-5">
          <div className="flex items-center gap-4">
            {/* Minimal luxury AI avatar */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/80">
              <div className="absolute inset-0 rounded-full bg-foreground/[0.04]" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="relative z-10 text-foreground">
                <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              {/* subtle pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-foreground/20"
                animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div>
              <h1 className="text-sm font-semibold uppercase tracking-[0.18em]">Style Concierge</h1>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
                SWITCH Intelligence
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="container-custom space-y-7 py-8">
          <AnimatePresence initial={false}>
            {messages.map((message, i) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: premiumEase, delay: i === 0 ? 0 : 0 }}
                className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  message.type === 'ai'
                    ? 'border-border/40 bg-background/60'
                    : 'border-border/30 bg-foreground/[0.06]'
                }`}>
                  {message.type === 'ai' ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-foreground/80">
                      <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <User className="h-3.5 w-3.5 text-foreground/60" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`flex max-w-[82%] flex-col sm:max-w-xl ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    message.type === 'user'
                      ? 'rounded-tr-sm bg-foreground text-background'
                      : 'rounded-tl-sm border border-border/40 bg-card/60 backdrop-blur-sm text-foreground/90'
                  }`}>
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>

                  {/* Product cards */}
                  {message.products && message.products.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: premiumEase, delay: 0.1 }}
                      className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2"
                    >
                      {message.products.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          className="group block overflow-hidden rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5"
                        >
                          <div className="aspect-[3/4] overflow-hidden bg-muted/30">
                            <img
                              src={getProductImage(product)}
                              alt={product.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                            />
                          </div>
                          <div className="p-3">
                            <h4 className="line-clamp-1 text-xs font-medium tracking-wide">{product.name}</h4>
                            <div className="mt-1.5 flex items-baseline gap-2">
                              <span className="text-xs font-semibold">{formatPrice(product.price)}</span>
                              {product.originalPrice && (
                                <span className="text-[10px] text-muted-foreground/60 line-through">
                                  {formatPrice(product.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}

                  <p className="mt-2 text-[10px] tracking-wide text-muted-foreground/35">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming Response */}
          {streamingText && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: premiumEase }}
              className="flex gap-3"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/60">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-foreground/80">
                  <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border/40 bg-card/60 px-5 py-3.5 backdrop-blur-sm">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{streamingText}</p>
              </div>
            </motion.div>
          )}

          {/* Thinking indicator */}
          {isLoading && !streamingText && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: premiumEase }}
              className="flex gap-3"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/60">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-foreground/80">
                  <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/40 bg-card/60 px-5 py-4 backdrop-blur-sm">
                {[0, 0.18, 0.36].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-foreground/30"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Editorial Suggestion Pills ── */}
      <AnimatePresence>
        {messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: premiumEase }}
            className="shrink-0 border-t border-border/20 bg-background/40 backdrop-blur-xl"
          >
            <div className="container-custom py-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/45">
                Curated prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((query, i) => (
                  <motion.button
                    key={query}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: premiumEase, delay: i * 0.04 }}
                    onClick={() => {
                      setInput(query);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-border/40 bg-background/50 px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/55 backdrop-blur-sm transition-all duration-300 hover:border-foreground/25 hover:bg-foreground/[0.06] hover:text-foreground/80"
                  >
                    {query}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Premium Input Dock ── */}
      <div className="shrink-0 border-t border-border/25 bg-background/70 backdrop-blur-2xl">
        {/* top shimmer line */}
        <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        <div className="container-custom py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className={`flex items-center gap-2 rounded-2xl border transition-all duration-300 ${
              isFocused
                ? 'border-foreground/25 bg-card/70 shadow-lg shadow-foreground/[0.04]'
                : 'border-border/35 bg-card/40'
            } px-2 py-2 backdrop-blur-sm`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What are you dressing for tonight?"
              className="flex-1 bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              disabled={isLoading}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || isLoading}
              whileTap={{ scale: 0.94 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-opacity duration-200 disabled:opacity-25"
            >
              {isLoading
                ? <Loader2 size={15} className="animate-spin" />
                : <ArrowUp size={15} strokeWidth={2} />
              }
            </motion.button>
          </form>

          <p className="mt-2.5 text-center text-[10px] tracking-[0.16em] text-muted-foreground/30">
            SWITCH INTELLIGENCE — PERSONAL STYLE ENGINE
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
