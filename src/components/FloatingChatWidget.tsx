import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Minus, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { formatPrice, Product } from '@/data/products';
import { useAIChat } from '@/hooks/useAIChat';
import { useProducts } from '@/hooks/useProducts';
import { getProductImage } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  products?: Product[];
  timestamp: Date;
}

const premiumEase: Easing = [0.22, 1, 0.36, 1];

const extractProductIds = (content: string): string[] => {
  const match = content.match(/\[PRODUCTS?:\s*([^\]]+)\]/i);
  if (!match) return [];
  return match[1].split(',').map((id) => id.trim()).filter(Boolean);
};

const cleanContent = (content: string): string => content.replace(/\[PRODUCTS?:\s*[^\]]+\]/gi, '').trim();

const findMatchingProducts = (query: string, productList: Product[]): Product[] => {
  const lowerQuery = query.toLowerCase();
  let categoryFilter: string[] = [];

  if (['women', 'female', 'ladies', 'dress', 'kurti'].some((word) => lowerQuery.includes(word))) {
    categoryFilter = ['women'];
  } else if (['shirt', 't-shirt', 'jacket', 'men'].some((word) => lowerQuery.includes(word))) {
    categoryFilter = ['men'];
  } else if (['accessorie', 'bag', 'watch', 'cap'].some((word) => lowerQuery.includes(word))) {
    categoryFilter = ['accessories'];
  } else if (['sneaker', 'shoe', 'footwear'].some((word) => lowerQuery.includes(word))) {
    categoryFilter = ['footwear'];
  }

  let maxPrice = Infinity;
  const priceMatch = lowerQuery.match(/(?:under|below|less than|max|upto|budget)\s*(?:₹|rs\.?)?\s*(\d+)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1], 10);
  }

  const colors = ['black', 'white', 'navy', 'blue', 'red', 'pink', 'grey', 'green', 'brown', 'cream', 'olive'];
  const colorFilter = colors.filter((color) => lowerQuery.includes(color));

  return productList
    .filter((product) => {
      if (categoryFilter.length > 0 && !categoryFilter.includes(product.category)) return false;
      if (product.price > maxPrice) return false;
      if (colorFilter.length > 0) {
        const productColors = product.colors.map((color) => color.toLowerCase());
        if (!colorFilter.some((color) => productColors.some((productColor) => productColor.includes(color)))) {
          return false;
        }
      }
      return true;
    })
    .slice(0, 6);
};

const WELCOME_MESSAGE = `Hi there! I'm your Switch AI Assistant.
Ask for looks, sizes, gifts, or price-based picks and I'll surface the sharpest options for you.`;

const TypewriterMessage = ({ content, onComplete }: { content: string; onComplete?: () => void }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = window.setTimeout(() => {
        setDisplayedContent((prev) => prev + content[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 14);
      return () => window.clearTimeout(timeout);
    }
    onComplete?.();
  }, [currentIndex, content, onComplete]);

  return <span className="whitespace-pre-line">{displayedContent}</span>;
};

const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcomeTypewriter, setShowWelcomeTypewriter] = useState(true);
  const [input, setInput] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'ai', content: WELCOME_MESSAGE, timestamp: new Date() },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const { sendMessage } = useAIChat();
  const { data: liveProducts } = useProducts();
  const location = useLocation();
  const isMobile = useIsMobile();

  const hiddenRoutes = ['/checkout', '/admin'];
  const lowProfileRoutes = ['/', '/profile', '/wallet', '/orders'];
  const hideWidget = hiddenRoutes.some((path) => location.pathname.startsWith(path));
  const lowProfile = lowProfileRoutes.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (hideWidget) {
      setIsOpen(false);
    }
  }, [hideWidget]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (Math.abs(current - lastScrollYRef.current) < 6) return;
      if (current < 32) {
        setIsVisible(true);
      } else {
        setIsVisible(current < lastScrollYRef.current);
      }
      lastScrollYRef.current = current;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickActions = useMemo(() => ['Black shirt under ₹1500', "Women's dresses", 'Weekend layering ideas'], []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    const fallbackProducts = findMatchingProducts(userInput, liveProducts || []);
    const chatHistory = messages
      .filter((message) => message.id !== '1')
      .map((message) => ({
        role: message.type === 'user' ? 'user' as const : 'assistant' as const,
        content: message.content,
      }));
    chatHistory.push({ role: 'user', content: userInput });

    let aiResponse = '';

    await sendMessage(
      chatHistory,
      (delta) => {
        aiResponse += delta;
        const displayContent = cleanContent(aiResponse);
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.type === 'ai' && lastMessage.id.startsWith('streaming-')) {
            return prev.map((message, index) => (index === prev.length - 1 ? { ...message, content: displayContent } : message));
          }
          return [
            ...prev,
            {
              id: `streaming-${Date.now()}`,
              type: 'ai',
              content: displayContent,
              timestamp: new Date(),
            },
          ];
        });
      },
      () => {
        setIsTyping(false);

        const productIds = extractProductIds(aiResponse);
        let finalProducts: Product[] = [];

        if (productIds.length > 0) {
          finalProducts = productIds
            .map((id) => (liveProducts || []).find((product) => product.id === id))
            .filter((product): product is Product => Boolean(product));
        }

        if (finalProducts.length === 0 && fallbackProducts.length > 0) {
          const productKeywords = ['shirt', 'dress', 'jeans', 'hoodie', 'jacket', 'kurti', 'sneaker', 'shoe', 'show', 'find', 'want', 'need', 'buy'];
          if (productKeywords.some((keyword) => userInput.toLowerCase().includes(keyword))) {
            finalProducts = fallbackProducts;
          }
        }

        setMessages((prev) =>
          prev.map((message, index) =>
            index === prev.length - 1 && message.type === 'ai'
              ? {
                  ...message,
                  id: Date.now().toString(),
                  content: cleanContent(aiResponse),
                  products: finalProducts.length > 0 ? finalProducts : undefined,
                }
              : message,
          ),
        );
      },
    );
  };

  if (hideWidget) {
    return null;
  }

  const mobileFabStyle = {
    bottom: 'calc(var(--mobile-content-bottom) + 1.25rem)',
    right: '1rem',
  } as const;

  const windowStyle = isMobile
    ? { bottom: 'calc(var(--mobile-content-bottom) + 1rem)', right: '0.75rem' }
    : { bottom: '1.5rem', right: '1.5rem' };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.7, opacity: 0, y: 18 }}
            animate={{ scale: isVisible ? 1 : 0.88, opacity: isVisible ? (lowProfile && isMobile ? 0.72 : 1) : 0, y: isVisible ? 0 : 18 }}
            exit={{ scale: 0.7, opacity: 0, y: 18 }}
            transition={{ duration: 0.34, ease: premiumEase }}
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Assistant"
            className={`floating-widget-hide-on-menu fixed z-50 flex items-center justify-center rounded-full bg-foreground text-background shadow-[0_24px_55px_-28px_rgba(0,0,0,0.75)] transition-all duration-300 ${
              isMobile ? 'h-12 w-12' : 'h-14 w-14'
            }`}
            style={isMobile ? mobileFabStyle : { bottom: '1.5rem', right: '1.5rem' }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-foreground"
              animate={{ scale: [1, 1.18, 1], opacity: [0.24, 0, 0.24] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <MessageCircle className={`relative z-10 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
            <motion.span
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary"
              animate={{ scale: [1, 1.16, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1, height: isMinimized ? 'auto' : isMobile ? 'min(74dvh, 40rem)' : '550px' }}
            exit={{ opacity: 0, y: 42, scale: 0.94 }}
            transition={{ duration: 0.34, ease: premiumEase }}
            className={`floating-widget-hide-on-menu fixed z-50 flex flex-col overflow-hidden border border-border/60 bg-background/94 shadow-[0_36px_90px_-42px_rgba(0,0,0,0.72)] backdrop-blur-2xl transition-all duration-300 ${
              isMobile ? 'left-3 w-auto rounded-[2rem]' : 'w-[380px] rounded-3xl'
            }`}
            style={{ ...windowStyle }}
          >
            <motion.div className="flex items-center justify-between bg-foreground px-4 py-3 text-background" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-background/15"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                <div>
                  <h3 className="text-sm font-medium">Switch AI Assistant</h3>
                  <p className="text-xs text-white/68">Luxury styling on demand</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <motion.button onClick={() => setIsMinimized((value) => !value)} className="rounded-lg p-1.5 hover:bg-background/20" whileTap={{ scale: 0.92 }}>
                  <Minus size={16} />
                </motion.button>
                <motion.button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 hover:bg-background/20" whileTap={{ scale: 0.92 }}>
                  <X size={16} />
                </motion.button>
              </div>
            </motion.div>

            <AnimatePresence initial={false}>
              {!isMinimized && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-1 flex-col overflow-hidden">
                  <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3, delay: index === 0 ? 0.18 : 0, ease: premiumEase }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[91%] ${message.type === 'user' ? 'order-2' : ''}`}>
                          <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'user' ? 'rounded-br-sm bg-foreground text-background' : 'rounded-bl-sm bg-muted/75'}`}>
                            {message.id === '1' && showWelcomeTypewriter ? (
                              <TypewriterMessage content={message.content} onComplete={() => setShowWelcomeTypewriter(false)} />
                            ) : (
                              <p className="whitespace-pre-line leading-6">{message.content}</p>
                            )}
                          </div>

                          {message.products && message.products.length > 0 && (
                            <motion.div
                              className="mt-3 space-y-2"
                              initial="hidden"
                              animate="visible"
                              variants={{
                                hidden: { opacity: 0 },
                                visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
                              }}
                            >
                              {message.products.map((product) => (
                                <motion.div key={product.id} variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }} transition={{ duration: 0.32, ease: premiumEase }}>
                                  <Link
                                    to={`/product/${product.id}`}
                                    onClick={() => setIsOpen(false)}
                                    className="block rounded-2xl border border-border/70 bg-card p-3 transition-all hover:border-foreground/20"
                                  >
                                    <div className="flex gap-3">
                                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                                        <img
                                          src={getProductImage(product)}
                                          alt={product.name}
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                          onError={(event) => {
                                            (event.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p>
                                        <h4 className="mb-1 line-clamp-2 text-sm font-medium">{product.name}</h4>
                                        <div className="mb-2 flex items-center gap-1">
                                          <div className="flex">
                                            {[...Array(5)].map((_, starIndex) => (
                                              <Star
                                                key={starIndex}
                                                size={10}
                                                className={starIndex < Math.floor(product.rating) ? 'fill-foreground text-foreground' : 'text-muted-foreground/30'}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                                          {product.originalPrice && (
                                            <>
                                              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                                              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-600">{product.discount}% OFF</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    <AnimatePresence>
                      {isTyping && messages[messages.length - 1]?.type !== 'ai' && (
                        <motion.div className="flex justify-start" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                          <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                            <div className="flex gap-1">
                              {[0, 1, 2].map((dot) => (
                                <motion.span
                                  key={dot}
                                  className="h-2 w-2 rounded-full bg-muted-foreground"
                                  animate={{ y: [0, -6, 0] }}
                                  transition={{ duration: 0.6, delay: dot * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                  </div>

                  <AnimatePresence>
                    {messages.length <= 2 && (
                      <motion.div className="px-4 pb-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                        <div className="flex flex-wrap gap-2">
                          {quickActions.map((action, index) => (
                            <motion.button
                              key={action}
                              onClick={() => setInput(action)}
                              className="rounded-full bg-muted px-3 py-1.5 text-xs"
                              initial={{ opacity: 0, scale: 0.86 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.08 + 0.35 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {action}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border-t border-border/70 p-4 safe-bottom">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleSend();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask for products, sizes, or outfit ideas"
                        disabled={isTyping}
                        className="input-premium h-11 flex-1 rounded-full bg-muted/65 text-sm disabled:opacity-50"
                      />
                      <motion.button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50"
                        whileTap={{ scale: 0.92 }}
                      >
                        <Send size={16} />
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChatWidget;
