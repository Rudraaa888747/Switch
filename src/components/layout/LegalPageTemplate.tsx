import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FadeUp = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

export const LegalPageTemplate = ({ title, lastUpdated, sections }: {
  title: string;
  lastUpdated: string;
  sections: { title: string; content: React.ReactNode }[];
}) => {
  return (
    <div className="min-h-screen pb-32 sw-legal" style={{ background: 'var(--sw-bg)', color: 'var(--sw-fg)', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

        /* ── theme-aware tokens ── */
        .sw-legal {
          --sw-bg: #0E0E0F;
          --sw-ink: #0E0E0F;
          --sw-fg: #F7F5F0;
          --sw-text-rgb: 247, 245, 240;
          --sw-gold: #C9A96E;
          --sw-gold-rgb: 201, 169, 110;
        }
        html.light .sw-legal {
          --sw-bg: #f4efe6;
          --sw-fg: #1d1a15;
          --sw-text-rgb: 29, 26, 21;
          --sw-gold: #a07d3e;
          --sw-gold-rgb: 160, 125, 62;
        }

        .sw-serif { font-family: 'Playfair Display', Georgia, serif; }
        .sw-sans  { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      <section className="relative pt-40 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(var(--sw-gold-rgb),0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
        
        <FadeUp>
          <span className="inline-flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[var(--sw-gold)]" />
            <span style={{ fontSize: '11px', letterSpacing: '0.22em', color: 'var(--sw-gold)', fontWeight: 500 }} className="sw-sans uppercase">
              Legal Information
            </span>
            <span className="h-px w-8 bg-[var(--sw-gold)]" />
          </span>
        </FadeUp>
        
        <FadeUp delay={0.1}>
          <h1 className="sw-serif mb-6" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--sw-fg)' }}>
            {title}
          </h1>
        </FadeUp>
        
        <FadeUp delay={0.2}>
          <p className="sw-sans" style={{ color: 'rgba(var(--sw-text-rgb),0.5)', fontSize: '14px', letterSpacing: '0.05em' }}>
            Last Updated: {lastUpdated}
          </p>
        </FadeUp>
      </section>

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        {sections.map((section, idx) => (
          <FadeUp key={idx} delay={0.1}>
            <div className="mb-16">
              <div className="flex items-start gap-6 mb-6 flex-col sm:flex-row">
                <span className="sw-sans flex-shrink-0" style={{ color: 'var(--sw-gold)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', paddingTop: '6px' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="sw-serif mb-4" style={{ fontSize: '28px', color: 'var(--sw-fg)', fontWeight: 400 }}>
                    {section.title}
                  </h2>
                  <div className="sw-sans leading-relaxed space-y-4" style={{ color: 'rgba(var(--sw-text-rgb),0.7)', fontSize: '15px', fontWeight: 300 }}>
                    {section.content}
                  </div>
                </div>
              </div>
              {idx !== sections.length - 1 && (
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(var(--sw-gold-rgb),0.2), transparent)', margin: '48px 0 0' }} />
              )}
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  );
};
