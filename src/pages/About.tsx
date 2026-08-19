import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────
   Reusable fade-up wrapper
───────────────────────────────────────────── */
const FadeUp = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   Infinite marquee
───────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  'Modular Design', 'Ethical Sourcing', 'Premium Craft',
  'Infinite Utility', 'Timeless Aesthetic', 'Zero Compromise',
];

const Marquee = () => (
  <div className="sw-marquee-track" aria-hidden="true">
    <div className="sw-marquee-inner">
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="sw-marquee-item">
          {item}
          <span className="sw-marquee-dot">◆</span>
        </span>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Pillars data
───────────────────────────────────────────── */
const PILLARS = [
  {
    roman: 'I',
    title: 'Modularity',
    desc: 'Every piece is engineered to connect, layer, and transform. Snap-on hoods, detachable sleeves, adaptable fits — more functionality from fewer garments.',
  },
  {
    roman: 'II',
    title: 'Sustainability',
    desc: 'Multi-purpose design is inherently low-waste. Ethically sourced, durable materials built to outlast trends — because the best thing for the planet is buying less, better.',
  },
  {
    roman: 'III',
    title: 'Premium Quality',
    desc: 'We partner with master manufacturers where every stitch, zipper, and seam earns its place. Luxury isn\'t a price tag — it\'s the silence of something made right.',
  },
];

const STATS_BAR = [
  { num: '3×', label: 'Avg. uses per piece' },
  { num: '100%', label: 'Ethical sourcing' },
  { num: '0', label: 'Trend cycles followed' },
  { num: '∞', label: 'Outfit combinations' },
];

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const About = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroImgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  /* Inject scoped styles once */
  useEffect(() => {
    const id = 'sw-about-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* ── tokens ── */
      :root {
        --sw-black:   #0a0a0a;
        --sw-white:   #fafafa;
        --sw-light:   #f4f2ed;
        --sw-gray:    #8a8a8a;
        --sw-accent:  #c8a96e;
        --sw-accent2: #a8885a;
        --sw-serif:   'Cormorant Garamond', Georgia, serif;
        --sw-sans:    'Inter', system-ui, sans-serif;
        --sw-page:    #fafafa;
        --sw-panel:   #ffffff;
        --sw-panel-text: #0a0a0a;
        --sw-panel-rgb: 10, 10, 10;
        --sw-veil-rgb: 244, 242, 237;
      }
      html.dark {
        --sw-light:  #111110;
        --sw-gray:   #9a9a9a;
        --sw-page:   #0a0a0a;
        --sw-panel:  #151514;
        --sw-panel-text: #f5f4f0;
        --sw-panel-rgb: 245, 244, 240;
        --sw-veil-rgb: 10, 10, 10;
      }
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap');

      /* ── hero ── */
      .sw-hero { position:relative; height:100vh; min-height:640px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:var(--sw-black); text-align:center; }
      .sw-hero-img-wrap { position:absolute; inset:0; overflow:hidden; }
      .sw-hero-img { width:100%; height:100%; object-fit:cover; opacity:.55; will-change:transform; }
      .sw-hero-gradient { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 0%, rgba(10,10,10,0.7) 100%), linear-gradient(to bottom, transparent 50%, rgba(10,10,10,0.9) 100%); pointer-events:none; }
      .sw-hero-content { position:relative; display:flex; flex-direction:column; align-items:center; z-index:2; padding:0 24px; max-width:800px; width:100%; }
      .sw-eyebrow { font-family:var(--sw-sans); font-size:10px; letter-spacing:.42em; text-transform:uppercase; color:var(--sw-accent); margin-bottom:24px; }
      .sw-hero-title { font-family:var(--sw-serif); font-size:clamp(52px,8vw,110px); font-weight:300; line-height:1.05; color:var(--sw-white); margin-bottom:32px; }
      .sw-hero-title em { font-style:italic; color:var(--sw-accent); }
      .sw-hero-desc { font-family:var(--sw-sans); font-size:14px; line-height:1.85; color:rgba(250,250,250,.7); max-width:560px; font-weight:300; margin:0 auto; }
      .sw-hero-badge { position:absolute; top:48px; right:56px; font-family:var(--sw-serif); font-size:11px; letter-spacing:.22em; color:rgba(250,250,250,.25); text-transform:uppercase; }
      .sw-hero-scroll { position:absolute; bottom:48px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:12px; font-family:var(--sw-sans); font-size:9px; letter-spacing:.32em; text-transform:uppercase; color:rgba(250,250,250,.5); }
      .sw-hero-scroll-line { width:1px; height:44px; background:rgba(250,250,250,.3); }

      /* ── marquee ── */
      .sw-marquee-track { background:var(--sw-black); padding:28px 0; overflow:hidden; white-space:nowrap; border-top:.5px solid rgba(255,255,255,.06); border-bottom:.5px solid rgba(255,255,255,.06); }
      .sw-marquee-inner { display:inline-flex; gap:0; animation:sw-scroll 24s linear infinite; }
      .sw-marquee-item { font-family:var(--sw-serif); font-size:20px; font-weight:300; font-style:italic; color:var(--sw-white); flex-shrink:0; padding:0 32px; }
      .sw-marquee-dot { color:var(--sw-accent); font-style:normal; font-size:7px; margin-left:32px; opacity:.7; vertical-align:middle; }
      @keyframes sw-scroll { from { transform:translateX(0); } to { transform:translateX(-50%); } }

      /* ── manifesto ── */
      .sw-manifesto { background:var(--sw-light); padding:120px 64px; display:flex; flex-direction:column; align-items:center; text-align:center; }
      .sw-manifesto-label { font-family:var(--sw-sans); font-size:9px; letter-spacing:.42em; text-transform:uppercase; color:var(--sw-gray); margin-bottom:48px; }
      .sw-manifesto-text { font-family:var(--sw-serif); font-size:clamp(26px,4vw,50px); font-weight:300; line-height:1.45; max-width:820px; color:var(--sw-panel-text); }
      .sw-manifesto-text em { font-style:italic; color:var(--sw-accent2); }
      .sw-manifesto-rule { width:1px; height:72px; background:var(--sw-accent); margin-top:64px; opacity:.35; }

      /* ── pillars ── */
      .sw-pillars { display:grid; grid-template-columns:repeat(3,1fr); background:var(--sw-black); }
      .sw-pillar { padding:72px 52px; border-right:.5px solid rgba(255,255,255,.05); position:relative; overflow:hidden; transition:background .5s; }
      .sw-pillar:last-child { border-right:none; }
      .sw-pillar:hover { background:rgba(200,169,110,.05); }
      .sw-pillar-ghost { font-family:var(--sw-serif); font-size:100px; font-weight:300; color:rgba(255,255,255,.03); position:absolute; top:8px; right:20px; line-height:1; pointer-events:none; user-select:none; }
      .sw-pillar-dot { width:5px; height:5px; border-radius:50%; background:var(--sw-accent); margin-bottom:32px; opacity:.55; }
      .sw-pillar-eyebrow { font-family:var(--sw-sans); font-size:8px; letter-spacing:.42em; text-transform:uppercase; color:var(--sw-accent); margin-bottom:18px; display:block; }
      .sw-pillar-title { font-family:var(--sw-serif); font-size:30px; font-weight:300; color:var(--sw-white); margin-bottom:16px; }
      .sw-pillar-desc { font-family:var(--sw-sans); font-size:12.5px; line-height:1.9; color:rgba(250,250,250,.38); font-weight:300; }

      /* ── stats bar ── */
      .sw-statsbar { display:grid; grid-template-columns:repeat(4,1fr); background:var(--sw-accent); }
      .sw-sbar-item { padding:52px 32px; border-right:.5px solid rgba(10,10,10,.12); text-align:center; }
      .sw-sbar-item:last-child { border-right:none; }
      .sw-sbar-num { font-family:var(--sw-serif); font-size:52px; font-weight:300; color:var(--sw-black); line-height:1; margin-bottom:8px; }
      .sw-sbar-label { font-family:var(--sw-sans); font-size:9px; letter-spacing:.28em; text-transform:uppercase; color:rgba(10,10,10,.5); }

      /* ── editorial grid ── */
      .sw-editorial { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto auto; }
      .sw-ed-img-main { grid-row:1/3; position:relative; overflow:hidden; min-height:600px; }
      .sw-ed-img-main img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 8s ease; }
      .sw-ed-img-main:hover img { transform:scale(1.04); }
      .sw-ed-content { padding:88px 72px; display:flex; flex-direction:column; justify-content:center; background:var(--sw-panel); }
      .sw-ed-label { font-family:var(--sw-sans); font-size:9px; letter-spacing:.42em; text-transform:uppercase; color:var(--sw-gray); margin-bottom:32px; }
      .sw-ed-heading { font-family:var(--sw-serif); font-size:clamp(34px,4vw,58px); font-weight:300; line-height:1.18; margin-bottom:24px; color:var(--sw-panel-text); }
      .sw-ed-heading em { font-style:italic; color:var(--sw-accent2); }
      .sw-ed-body { font-family:var(--sw-sans); font-size:13px; line-height:1.9; color:var(--sw-gray); font-weight:300; max-width:380px; margin-bottom:44px; }
      .sw-ed-stats { border-top:.5px solid rgba(var(--sw-panel-rgb),.12); padding-top:36px; display:grid; grid-template-columns:1fr 1fr; gap:24px; }
      .sw-ed-stat-num { font-family:var(--sw-serif); font-size:40px; font-weight:300; color:var(--sw-panel-text); line-height:1; }
      .sw-ed-stat-label { font-family:var(--sw-sans); font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--sw-gray); margin-top:6px; }
      .sw-ed-img-sub { position:relative; overflow:hidden; }
      .sw-ed-img-sub img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 8s ease; }
      .sw-ed-img-sub:hover img { transform:scale(1.04); }

      /* ── founder ── */
      .sw-founder { display:grid; grid-template-columns:1fr 1fr; background:var(--sw-light); }
      .sw-founder-img { position:relative; min-height:560px; overflow:hidden; }
      .sw-founder-img img { width:100%; height:100%; object-fit:cover; display:block; filter:grayscale(15%); transition:transform 8s ease; }
      .sw-founder-img:hover img { transform:scale(1.04); }
      .sw-founder-img-veil { position:absolute; inset:0; background:linear-gradient(to top, rgba(var(--sw-veil-rgb),.55) 0%, transparent 45%); pointer-events:none; }
      .sw-founder-content { padding:88px 80px; display:flex; flex-direction:column; justify-content:center; }
      .sw-founder-label { font-family:var(--sw-sans); font-size:9px; letter-spacing:.42em; text-transform:uppercase; color:var(--sw-gray); margin-bottom:44px; }
      .sw-founder-quote { font-family:var(--sw-serif); font-size:clamp(22px,3vw,38px); font-weight:300; font-style:italic; line-height:1.55; color:var(--sw-panel-text); margin-bottom:44px; }
      .sw-founder-attr { font-family:var(--sw-sans); font-size:10px; letter-spacing:.28em; text-transform:uppercase; color:var(--sw-gray); display:flex; align-items:center; gap:14px; }
      .sw-founder-attr::before { content:''; display:block; width:32px; height:.5px; background:var(--sw-gray); flex-shrink:0; }

      /* ── cta ── */
      .sw-cta { background:var(--sw-black); padding:148px 64px; text-align:center; position:relative; overflow:hidden; }
      .sw-cta-ghost { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:var(--sw-serif); font-size:clamp(80px,18vw,220px); font-weight:300; color:rgba(255,255,255,.025); pointer-events:none; letter-spacing:.08em; user-select:none; }
      .sw-cta-label { font-family:var(--sw-sans); font-size:9px; letter-spacing:.42em; text-transform:uppercase; color:var(--sw-accent); margin-bottom:32px; }
      .sw-cta-title { font-family:var(--sw-serif); font-size:clamp(42px,7vw,88px); font-weight:300; color:var(--sw-white); line-height:1.08; margin-bottom:52px; }
      .sw-cta-title em { font-style:italic; color:var(--sw-accent); }
      .sw-cta-btns { display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; }
      .sw-btn-primary { display:inline-flex; align-items:center; gap:10px; background:var(--sw-accent); color:var(--sw-black); padding:17px 44px; font-family:var(--sw-sans); font-size:10px; letter-spacing:.32em; text-transform:uppercase; font-weight:500; border:none; cursor:pointer; text-decoration:none; transition:opacity .3s, transform .2s; }
      .sw-btn-primary:hover { opacity:.85; transform:translateY(-1px); }
      .sw-btn-secondary { display:inline-flex; align-items:center; gap:10px; background:transparent; color:rgba(250,250,250,.45); padding:17px 44px; font-family:var(--sw-sans); font-size:10px; letter-spacing:.32em; text-transform:uppercase; font-weight:400; border:.5px solid rgba(255,255,255,.15); cursor:pointer; text-decoration:none; transition:all .3s; }
      .sw-btn-secondary:hover { color:var(--sw-white); border-color:rgba(255,255,255,.42); transform:translateY(-1px); }

      /* ── responsive ── */
      @media (max-width: 900px) {
        .sw-hero { min-height:100svh; }
        .sw-hero-img-wrap { position:absolute; inset:0; }
        .sw-hero-gradient { background:linear-gradient(to top, rgba(10,10,10,.85) 20%, rgba(10,10,10,.3) 100%); }
        .sw-hero-content { justify-content:center; }
        .sw-pillars { grid-template-columns:1fr; }
        .sw-pillar { border-right:none; border-bottom:.5px solid rgba(255,255,255,.05); }
        .sw-pillar:last-child { border-bottom:none; }
        .sw-statsbar { grid-template-columns:1fr 1fr; }
        .sw-sbar-item:nth-child(2) { border-right:none; }
        .sw-editorial { grid-template-columns:1fr; }
        .sw-ed-img-main { grid-row:auto; min-height:340px; }
        .sw-ed-content { padding:64px 40px; }
        .sw-founder { grid-template-columns:1fr; }
        .sw-founder-img { min-height:400px; }
        .sw-founder-content { padding:64px 40px; }
        .sw-manifesto { padding:80px 32px; }
        .sw-cta { padding:100px 32px; }
        .sw-hero-content { padding:40px 32px; }
        .sw-hero-badge, .sw-hero-scroll { display:none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .sw-marquee-inner { animation:none; }
        .sw-hero-img, .sw-ed-img-main img, .sw-ed-img-sub img, .sw-founder-img img { transition:none; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  return (
    <div style={{ background: 'var(--sw-page)', paddingTop: 0 }}>

      {/* ── HERO ── */}
      <section ref={heroRef} className="sw-hero">
        <div className="sw-hero-img-wrap">
          <motion.img
            style={{ y: heroImgY }}
            className="sw-hero-img"
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85&auto=format&fit=crop"
            alt="SWITCH editorial"
          />
          <div className="sw-hero-gradient" />
        </div>

        <motion.div className="sw-hero-content" style={{ opacity: heroOpacity }}>
          <motion.p
            className="sw-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            About Switch — Est. 2024
          </motion.p>
          <motion.h1
            className="sw-hero-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            One Ward<em>robe</em>.<br />
            Infinite Expressions.
          </motion.h1>
          <motion.p
            className="sw-hero-desc"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            We didn't set out to make clothes. We set out to eliminate the wardrobe
            problem — the Sunday night chaos, the "nothing to wear", the packing anxiety.
            SWITCH is the answer.
          </motion.p>
        </motion.div>

        <span className="sw-hero-badge">Est. MMXXIV</span>
        <div className="sw-hero-scroll">
          <span>Scroll</span>
          <span className="sw-hero-scroll-line" />
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <Marquee />

      {/* ── MANIFESTO ── */}
      <section className="sw-manifesto">
        <FadeUp>
          <p className="sw-manifesto-label">Our Manifesto</p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="sw-manifesto-text">
            We believe your wardrobe should work as hard as you do. Fashion that{' '}
            <em>transforms</em> with you — not against you. Every SWITCH piece is
            engineered to do three jobs at once, so your closet can finally do one
            job well: <em>get out of your way</em>.
          </p>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div className="sw-manifesto-rule" />
        </FadeUp>
      </section>

      {/* ── THREE PILLARS ── */}
      <section className="sw-pillars">
        {PILLARS.map((pillar, i) => (
          <FadeUp key={pillar.title} delay={i * 0.15} className="sw-pillar">
            <span className="sw-pillar-ghost">{pillar.roman}</span>
            <div className="sw-pillar-dot" />
            <span className="sw-pillar-eyebrow">Pillar {pillar.roman}</span>
            <h3 className="sw-pillar-title">{pillar.title}</h3>
            <p className="sw-pillar-desc">{pillar.desc}</p>
          </FadeUp>
        ))}
      </section>

      {/* ── STATS BAR ── */}
      <section className="sw-statsbar">
        {STATS_BAR.map((s, i) => (
          <FadeUp key={s.label} delay={i * 0.08} className="sw-sbar-item">
            <div className="sw-sbar-num">{s.num}</div>
            <div className="sw-sbar-label">{s.label}</div>
          </FadeUp>
        ))}
      </section>

      {/* ── EDITORIAL GRID ── */}
      <section className="sw-editorial">
        <div className="sw-ed-img-main">
          <motion.img
            initial={{ opacity: 0, scale: 1.05 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            src="/premium-wardrobe.png"
            alt="SWITCH lookbook"
          />
        </div>

        <div className="sw-ed-content">
          <FadeUp>
            <span className="sw-ed-label">The SWITCH Philosophy</span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="sw-ed-heading">
              Built for the<br />life you <em>actually</em><br />live.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="sw-ed-body">
              Modern life doesn't fit neatly into categories. Why should your wardrobe?
              We design for the meeting that becomes a dinner that becomes a weekend.
              Every SWITCH piece bridges those moments without missing a beat.
            </p>
          </FadeUp>
          <FadeUp delay={0.28}>
            <div className="sw-ed-stats">
              <div>
                <div className="sw-ed-stat-num">48</div>
                <div className="sw-ed-stat-label">Core pieces per season</div>
              </div>
              <div>
                <div className="sw-ed-stat-num">12+</div>
                <div className="sw-ed-stat-label">Countries sourced</div>
              </div>
            </div>
          </FadeUp>
        </div>

        <div className="sw-ed-img-sub">
          <motion.img
            initial={{ opacity: 0, scale: 1.05 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&q=80&auto=format&fit=crop"
            alt="SWITCH detail"
          />
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="sw-founder">
        <div className="sw-founder-img">
          <motion.img
            initial={{ opacity: 0, scale: 1.06 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            src="https://images.unsplash.com/photo-1512361436605-a484bdb34b5f?w=900&q=80&auto=format&fit=crop"
            alt="SWITCH atelier"
          />
          <div className="sw-founder-img-veil" />
        </div>

        <div className="sw-founder-content">
          <FadeUp>
            <span className="sw-founder-label">A Word from the Founder</span>
          </FadeUp>
          <FadeUp delay={0.12}>
            <blockquote className="sw-founder-quote">
              "I was tired of owning forty pieces that couldn't make a single great
              outfit. So we built something different — clothes that think ahead,
              just like you do."
            </blockquote>
          </FadeUp>
          <FadeUp delay={0.22}>
            <p className="sw-founder-attr">The Founder, SWITCH</p>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="sw-cta">
        <div className="sw-cta-ghost" aria-hidden="true">SWITCH</div>

        <FadeUp>
          <p className="sw-cta-label">Ready to switch?</p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="sw-cta-title">
            Experience the<br /><em>Collection</em>
          </h2>
        </FadeUp>
        <FadeUp delay={0.2}>
          <div className="sw-cta-btns">
            <Link to="/shop" className="sw-btn-primary">
              Shop Now
              <ArrowRight size={13} />
            </Link>
            <Link to="/lookbook" className="sw-btn-secondary">
              View Lookbook
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </FadeUp>
      </section>

    </div>
  );
};

export default About;