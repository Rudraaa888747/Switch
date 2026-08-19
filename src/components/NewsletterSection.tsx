import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [subbed, setSubbed] = useState(false);

  const handleSub = () => {
    if (!email) return;
    setSubbed(true);
    setEmail('');
    toast.success('Welcome to SWITCH! 🎉', {
      description: 'You\'ll receive exclusive drops, style guides, and early access directly in your inbox.',
      duration: 4000,
    });
    setTimeout(() => setSubbed(false), 3500);
  };

  /* inject scoped styles */
  useEffect(() => {
    const id = 'swf-nl-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      .swf-nl-section {
        background: #0a0a0a;
        color: #fafafa;
        padding: 80px 64px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        position: relative;
        overflow: hidden;
        border-top: .5px solid rgba(255,255,255,.07);
      }
      .swf-nl-ghost {
        position: absolute;
        bottom: -28px; left: 50%; transform: translateX(-50%);
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: clamp(60px, 14vw, 180px);
        font-weight: 300;
        color: rgba(255,255,255,.025);
        white-space: nowrap; pointer-events: none; user-select: none; line-height: 1;
      }
      .swf-nl-eyebrow {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 8px; letter-spacing: .44em; text-transform: uppercase;
        color: #c8a96e; margin-bottom: 20px;
      }
      .swf-nl-heading {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: clamp(32px, 5vw, 58px); font-weight: 300;
        letter-spacing: .04em; line-height: 1.1; color: #fafafa; margin-bottom: 16px;
      }
      .swf-nl-sub {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 12.5px; color: rgba(255,255,255,.38);
        line-height: 1.85; font-weight: 300; max-width: 320px; margin: 0 auto 36px;
      }
      .swf-nl-input {
        width: 100%; background: transparent;
        border: none; border-bottom: .5px solid rgba(255,255,255,.25);
        padding: 14px 4px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 11.5px; letter-spacing: .1em;
        color: #fafafa; outline: none; text-align: center;
        transition: border-color .3s;
      }
      .swf-nl-input::placeholder { color: rgba(255,255,255,.22); letter-spacing: .18em; font-size: 10.5px; }
      .swf-nl-btn {
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
        background: #c8a96e; color: #0a0a0a;
        padding: 14px 20px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 9px; letter-spacing: .36em; text-transform: uppercase; font-weight: 500;
        border: none; cursor: pointer; transition: opacity .3s; margin-top: 6px;
      }
      .swf-nl-btn:hover { opacity: .82; }
      .swf-nl-disclaimer {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 8.5px; letter-spacing: .28em; text-transform: uppercase;
        color: rgba(255,255,255,.2); margin-top: 16px; position: relative; z-index: 1;
      }
      .swf-nl-success {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
        color: #c8a96e; margin-top: 8px;
      }
      @media (max-width: 640px) {
        .swf-nl-section { padding: 52px 24px; }
        .swf-nl-ghost { display: none; }
      }
    `;
    document.head.appendChild(s);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);

  return (
    <section className="swf-nl-section">
      <div className="swf-nl-ghost" aria-hidden="true">JOIN</div>

      <p className="swf-nl-eyebrow">Join the Community</p>
      <h2 className="swf-nl-heading">Stay in the loop</h2>
      <p className="swf-nl-sub">
        Early drops, exclusive offers, and style guides — directly in your inbox. No clutter, ever.
      </p>

      <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {!subbed ? (
            <motion.div
              key="form"
              style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <motion.input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSub()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="your@email.com"
                className="swf-nl-input"
                animate={{ borderBottomColor: focused ? 'rgba(200,169,110,.7)' : 'rgba(255,255,255,.25)' }}
                transition={{ duration: 0.3 }}
                aria-label="Email address for newsletter"
              />
              <motion.button
                className="swf-nl-btn"
                onClick={handleSub}
                whileTap={{ scale: 0.97 }}
              >
                Subscribe <ArrowRight size={12} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.p
              key="done"
              className="swf-nl-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              ✓ You're in — welcome to SWITCH.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <p className="swf-nl-disclaimer">No spam &nbsp;·&nbsp; Unsubscribe anytime</p>
    </section>
  );
};

export default NewsletterSection;
