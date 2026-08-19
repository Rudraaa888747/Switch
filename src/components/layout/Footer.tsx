import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Twitter, Mail, Phone, MapPin, ArrowRight, ArrowUp, Instagram, Facebook, Youtube } from 'lucide-react';
import { toast } from 'sonner';


/* ── nav links ── */
const NAV = [
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
  { label: 'Lookbook', to: '/lookbook' },
  { label: 'How to Use', to: '/how-to-use' },
];

const LEGAL = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Use', to: '/terms' },
  { label: 'Refund Policy', to: '/refunds' },
];

const CUSTOMER_CARE = [
  { label: 'FAQ', to: '/faq' },
  { label: 'Track Order', to: '/orders' },
  { label: 'Shipping & Returns', to: '/orders' },
  { label: 'Size Guide', to: '/size-guide' },
];

const SOCIAL = [
  { icon: Instagram, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Facebook, href: '#' },
  { icon: Youtube, href: '#' },
];

/* ── main ── */
const Footer = () => {
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail('');
    toast.success('You\'re on the list! ✨', {
      description: 'Expect early access, exclusive drops, and style notes in your inbox.',
      duration: 4000,
    });
    setTimeout(() => setSent(false), 3000);
  };

  /* inject scoped styles once */
  useEffect(() => {
    const id = 'swf-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Inter:wght@300;400;500&display=swap');
      :root{
        --swf-bg:#0a0a0a;
        --swf-surface:rgba(255,255,255,.03);
        --swf-border:rgba(255,255,255,.07);
        --swf-muted:rgba(255,255,255,.38);
        --swf-accent:#c8a96e;
        --swf-white:#fafafa;
        --swf-serif:'Cormorant Garamond',Georgia,serif;
        --swf-sans:'Inter',system-ui,sans-serif;
      }

      /* wrapper */
      .swf-root{background:var(--swf-bg);color:var(--swf-white);position:relative;overflow:hidden}

      /* ghost word */
      .swf-ghost{
        position:absolute;bottom:-32px;left:50%;transform:translateX(-50%);
        font-family:var(--swf-serif);font-size:clamp(80px,18vw,220px);font-weight:300;
        color:rgba(255,255,255,.025);white-space:nowrap;pointer-events:none;user-select:none;line-height:1;
      }

      /* divider line */
      .swf-divider{width:100%;height:.5px;background:var(--swf-border);margin:0}

      /* upper strip */
      .swf-upper{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:32px;padding:64px 64px 48px;text-align:center;
      }
      .swf-brand-name{
        font-family:var(--swf-serif);font-size:clamp(36px,5vw,64px);font-weight:300;
        letter-spacing:.06em;line-height:1;color:var(--swf-white);
      }
      .swf-brand-tag{
        font-family:var(--swf-sans);font-size:9px;letter-spacing:.4em;text-transform:uppercase;
        color:var(--swf-accent);margin-top:8px;
      }
      .swf-nav-links{display:flex;flex-wrap:wrap;gap:32px;justify-content:center}
      .swf-nav-link{
        font-family:var(--swf-sans);font-size:10px;letter-spacing:.3em;text-transform:uppercase;
        color:var(--swf-muted);text-decoration:none;transition:color .25s;
      }
      .swf-nav-link:hover{color:var(--swf-white)}

      /* main grid */
      .swf-grid{
        display:grid;
        grid-template-columns:1.4fr 1fr 1fr 1.2fr;
        gap:0;
        border-top:.5px solid var(--swf-border);
      }
      .swf-col{padding:52px 64px;border-right:.5px solid var(--swf-border)}
      .swf-col:first-child{padding-left:64px}
      .swf-col:last-child{border-right:none}

      .swf-col-label{
        font-family:var(--swf-sans);font-size:8px;letter-spacing:.44em;text-transform:uppercase;
        color:var(--swf-accent);margin-bottom:28px;display:block;
      }
      .swf-col-body{
        font-family:var(--swf-sans);font-size:12.5px;line-height:1.85;
        color:var(--swf-muted);font-weight:300;max-width:260px;
      }

      /* contact rows */
      .swf-contact-list{display:flex;flex-direction:column;gap:18px}
      .swf-contact-row{
        display:flex;align-items:flex-start;gap:14px;
        font-family:var(--swf-sans);font-size:12px;color:var(--swf-muted);
        text-decoration:none;transition:color .25s;
      }
      .swf-contact-row:hover{color:var(--swf-white)}
      .swf-contact-icon{flex-shrink:0;margin-top:1px;opacity:.55}

      /* sitemap */
      .swf-sitemap{display:flex;flex-direction:column;gap:14px}
      .swf-sitemap-link{
        font-family:var(--swf-sans);font-size:12px;color:var(--swf-muted);
        text-decoration:none;transition:color .25s;display:flex;align-items:center;gap:8px;
      }
      .swf-sitemap-link:hover{color:var(--swf-white)}
      .swf-sitemap-arrow{opacity:0;transform:translateX(-4px);transition:opacity .2s,transform .2s}
      .swf-sitemap-link:hover .swf-sitemap-arrow{opacity:.5;transform:translateX(0)}

      /* newsletter */
      .swf-nl-hint{font-family:var(--swf-sans);font-size:11.5px;color:var(--swf-muted);line-height:1.7;margin-bottom:24px;font-weight:300}
      .swf-input-wrap{position:relative;margin-bottom:10px}
      .swf-input{
        width:100%;background:transparent;
        border:.5px solid var(--swf-border);
        padding:14px 16px;font-family:var(--swf-sans);font-size:11px;
        letter-spacing:.12em;color:var(--swf-white);outline:none;
        transition:border-color .3s;
      }
      .swf-input::placeholder{color:rgba(255,255,255,.2)}
      .swf-input:focus{border-color:rgba(255,255,255,.35)}
      .swf-submit{
        width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
        background:var(--swf-accent);color:#0a0a0a;
        padding:14px 20px;font-family:var(--swf-sans);font-size:9px;
        letter-spacing:.36em;text-transform:uppercase;font-weight:500;
        border:none;cursor:pointer;transition:opacity .3s;
      }
      .swf-submit:hover{opacity:.82}
      .swf-success{
        font-family:var(--swf-sans);font-size:10px;letter-spacing:.2em;text-transform:uppercase;
        color:var(--swf-accent);margin-top:10px;
      }

      /* bottom bar */
      .swf-bottom{
        padding:28px 64px;display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:16px;border-top:.5px solid var(--swf-border);position:relative;z-index:1;
      }
      .swf-bottom-copy{
        font-family:var(--swf-sans);font-size:9.5px;letter-spacing:.22em;
        text-transform:uppercase;color:rgba(255,255,255,.22);
      }
      .swf-bottom-made{
        font-family:var(--swf-sans);font-size:9.5px;letter-spacing:.18em;
        text-transform:uppercase;color:rgba(255,255,255,.22);
        display:flex;align-items:center;gap:6px;
      }
      .swf-bottom-made strong{color:rgba(255,255,255,.5);font-weight:500;letter-spacing:.25em}
      .swf-legal-links{display:flex;gap:20px;flex-wrap:wrap}
      .swf-legal-link{
        font-family:var(--swf-sans);font-size:9.5px;letter-spacing:.18em;
        text-transform:uppercase;color:rgba(255,255,255,.22);
        text-decoration:none;transition:color .25s;
      }
      .swf-legal-link:hover{color:rgba(255,255,255,.6)}


      /* responsive */
      @media(max-width:1024px){
        .swf-upper{padding:40px 40px 32px}
        .swf-grid{grid-template-columns:1fr 1fr}
        .swf-col{padding:44px 40px}
        .swf-col:nth-child(2){border-right:none}
        .swf-col:nth-child(3){border-top:.5px solid var(--swf-border)}
        .swf-col:nth-child(4){border-top:.5px solid var(--swf-border);border-right:none}
        .swf-bottom{padding:24px 40px}
      }
      @media(max-width:640px){
        .swf-upper{padding:36px 24px 28px;flex-direction:column;align-items:flex-start}
        .swf-nav-links{gap:20px}
        .swf-grid{grid-template-columns:1fr}
        .swf-col{padding:36px 24px;border-right:none;border-bottom:.5px solid var(--swf-border)}
        .swf-col:last-child{border-bottom:none}
        .swf-bottom{padding:20px 24px;flex-direction:column;align-items:flex-start;gap:12px}
        .swf-ghost{display:none}
      }
      @media(prefers-reduced-motion:reduce){
        .swf-submit,.swf-nav-link,.swf-contact-row,.swf-sitemap-link{transition:none}
      }
    `;
    document.head.appendChild(s);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);

  return (
    <>
      <footer className="swf-root">
        <div className="swf-ghost" aria-hidden="true">SWITCH</div>

        {/* ── upper strip: brand + nav ── */}
        <div className="swf-upper">
          <div>
            <div className="swf-brand-name">SWITCH</div>
            <div className="swf-brand-tag">One Wardrobe. Infinite Expressions.</div>
          </div>
          <nav className="swf-nav-links" aria-label="Footer navigation">
            {NAV.map(({ label, to }) => (
              <Link key={to} to={to} className="swf-nav-link">{label}</Link>
            ))}
          </nav>
        </div>

        <hr className="swf-divider" />

        {/* ── main 4-col grid ── */}
        <div className="swf-grid">

          {/* col 1 — about blurb */}
          <div className="swf-col">
            <span className="swf-col-label">About</span>
            <p className="swf-col-body">
              We engineer modular, high-quality pieces that transform with you — from morning
              to midnight, meeting to weekend, season to season. Fashion that works as hard as you do.
            </p>
          </div>

          {/* col 2 — contact */}
          <div className="swf-col">
            <span className="swf-col-label">Contact</span>
            <div className="swf-contact-list">
              <a href="mailto:hello@switch.com" className="swf-contact-row">
                <Mail size={13} className="swf-contact-icon" />
                hello@switch.com
              </a>
              <a href="tel:+919876543210" className="swf-contact-row">
                <Phone size={13} className="swf-contact-icon" />
                +91 98765 43210
              </a>
              <span className="swf-contact-row">
                <MapPin size={13} className="swf-contact-icon" />
                123 SG Highway, Ahmedabad
              </span>
            </div>
            
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-8">
              {SOCIAL.map((social, i) => (
                <a key={i} href={social.href} className="text-muted-foreground hover:text-foreground transition-colors duration-300">
                  <social.icon size={16} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* col 3 — customer care */}
          <div className="swf-col">
            <span className="swf-col-label">Customer Care</span>
            <div className="swf-sitemap">
              {CUSTOMER_CARE.map(({ label, to }) => (
                <Link key={to} to={to} className="swf-sitemap-link">
                  <ArrowRight size={11} className="swf-sitemap-arrow" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* col 4 — newsletter */}
          <div className="swf-col">
            <span className="swf-col-label">Newsletter</span>
            <p className="swf-nl-hint">
              Early access, exclusive drops, and style notes — straight to your inbox.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="swf-input-wrap">
                <motion.input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Your email address"
                  className="swf-input"
                  animate={{ borderColor: focused ? 'rgba(200,169,110,.6)' : 'rgba(255,255,255,.07)' }}
                  transition={{ duration: 0.3 }}
                  aria-label="Email address for newsletter"
                />
              </div>
              <motion.button
                type="submit"
                className="swf-submit"
                whileTap={{ scale: 0.97 }}
              >
                Subscribe <ArrowRight size={12} />
              </motion.button>
              <AnimatePresence>
                {sent && (
                  <motion.p
                    className="swf-success"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    ✓ You're on the list
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>

        {/* ── bottom bar ── */}
        <div className="swf-bottom">
          <p className="swf-bottom-copy">© {new Date().getFullYear()} SWITCH. All rights reserved.</p>

          <div className="swf-bottom-made">
            Made by <strong>Rudra Chokshi</strong>
          </div>

          <div className="swf-legal-links">
            {LEGAL.map(({ label, to }) => (
              <Link key={to} to={to} className="swf-legal-link">{label}</Link>
            ))}
          </div>
        </div>

      </footer>
    </>
  );
};

export default Footer;