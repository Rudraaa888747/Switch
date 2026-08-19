import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Ruler, ChevronDown, ArrowRight, ArrowLeft, CheckCircle2, Info, Shirt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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

/* ─── size data ─── */
const SIZE_DATA = {
  men: {
    'T-Shirts': {
      headers: ['Size', 'Chest (in)', 'Chest (cm)', 'Length (in)', 'Length (cm)', 'Shoulder (in)'],
      rows: [
        ['S', '36-38', '91-96', '27', '68.5', '17'],
        ['M', '38-40', '96-101', '28', '71', '18'],
        ['L', '40-42', '101-107', '29', '73.5', '19'],
        ['XL', '42-44', '107-112', '30', '76', '20'],
        ['XXL', '44-46', '112-117', '31', '78.5', '21'],
      ],
    },
    'Shirts': {
      headers: ['Size', 'Chest (in)', 'Chest (cm)', 'Length (in)', 'Length (cm)', 'Sleeve (in)'],
      rows: [
        ['S', '36-38', '91-96', '28', '71', '24'],
        ['M', '38-40', '96-101', '29', '73.5', '25'],
        ['L', '40-42', '101-107', '30', '76', '25.5'],
        ['XL', '42-44', '107-112', '31', '78.5', '26'],
        ['XXL', '44-46', '112-117', '32', '81', '26.5'],
      ],
    },
    'Pants': {
      headers: ['Size', 'Waist (in)', 'Waist (cm)', 'Hip (in)', 'Hip (cm)', 'Inseam (in)'],
      rows: [
        ['S / 28', '28-30', '71-76', '36-38', '91-96', '30'],
        ['M / 30', '30-32', '76-81', '38-40', '96-101', '31'],
        ['L / 32', '32-34', '81-86', '40-42', '101-107', '32'],
        ['XL / 34', '34-36', '86-91', '42-44', '107-112', '32'],
        ['XXL / 36', '36-38', '91-96', '44-46', '112-117', '33'],
      ],
    },
    'Jackets': {
      headers: ['Size', 'Chest (in)', 'Chest (cm)', 'Length (in)', 'Length (cm)', 'Shoulder (in)'],
      rows: [
        ['S', '38-40', '96-101', '26', '66', '17.5'],
        ['M', '40-42', '101-107', '27', '68.5', '18.5'],
        ['L', '42-44', '107-112', '28', '71', '19.5'],
        ['XL', '44-46', '112-117', '29', '73.5', '20.5'],
        ['XXL', '46-48', '117-122', '30', '76', '21.5'],
      ],
    },
  },
  women: {
    'Tops & Tees': {
      headers: ['Size', 'Bust (in)', 'Bust (cm)', 'Length (in)', 'Length (cm)', 'Shoulder (in)'],
      rows: [
        ['XS', '32-34', '81-86', '24', '61', '14'],
        ['S', '34-36', '86-91', '25', '63.5', '14.5'],
        ['M', '36-38', '91-96', '26', '66', '15'],
        ['L', '38-40', '96-101', '27', '68.5', '15.5'],
        ['XL', '40-42', '101-107', '28', '71', '16'],
      ],
    },
    'Dresses': {
      headers: ['Size', 'Bust (in)', 'Bust (cm)', 'Waist (in)', 'Waist (cm)', 'Length (in)'],
      rows: [
        ['XS', '32-34', '81-86', '24-26', '61-66', '36'],
        ['S', '34-36', '86-91', '26-28', '66-71', '37'],
        ['M', '36-38', '91-96', '28-30', '71-76', '38'],
        ['L', '38-40', '96-101', '30-32', '76-81', '39'],
        ['XL', '40-42', '101-107', '32-34', '81-86', '40'],
      ],
    },
    'Bottoms': {
      headers: ['Size', 'Waist (in)', 'Waist (cm)', 'Hip (in)', 'Hip (cm)', 'Inseam (in)'],
      rows: [
        ['XS / 26', '24-26', '61-66', '34-36', '86-91', '28'],
        ['S / 28', '26-28', '66-71', '36-38', '91-96', '29'],
        ['M / 30', '28-30', '71-76', '38-40', '96-101', '29'],
        ['L / 32', '30-32', '76-81', '40-42', '101-107', '30'],
        ['XL / 34', '32-34', '81-86', '42-44', '107-112', '30'],
      ],
    },
  },
};

const HOW_TO_MEASURE = [
  { title: 'Chest / Bust', icon: '📏', description: 'Measure around the fullest part of your chest, keeping the tape level under your armpits and across your shoulder blades.' },
  { title: 'Waist', icon: '📐', description: 'Measure around your natural waistline — the narrowest part of your torso, usually just above your belly button.' },
  { title: 'Hips', icon: '📏', description: 'Stand with feet together. Measure around the fullest part of your hips, about 8 inches below your waist.' },
  { title: 'Inseam', icon: '📐', description: 'Measure from the top of your inner thigh down to the bottom of your ankle bone along the inside of your leg.' },
  { title: 'Shoulder', icon: '📏', description: 'Measure from the edge of one shoulder, across your back, to the edge of the other shoulder.' },
  { title: 'Length', icon: '📐', description: 'Measure from the highest point of the shoulder, down the front of the garment, to the desired length.' },
];

const FIT_TIPS = [
  { fit: 'Slim Fit', desc: 'Closer to the body without being tight. Best for layering or a sharp, tailored look. If between sizes, go one size up.', tag: 'Tailored' },
  { fit: 'Regular Fit', desc: 'Our standard fit with comfortable room through the chest and waist. Works for most body types. Choose your normal size.', tag: 'Classic' },
  { fit: 'Relaxed / Oversized', desc: 'Intentionally roomy with dropped shoulders and a wider body. For a streetwear or laid-back aesthetic. Consider sizing down.', tag: 'Loose' },
];

/* ─── size finder ─── */
const SizeFinder = () => {
  const [step, setStep] = useState(0);
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [result, setResult] = useState('');

  const findSize = () => {
    const c = parseInt(chest);
    const w = parseInt(waist);
    if (isNaN(c) || isNaN(w)) { setResult('Please enter valid measurements'); return; }

    let size = 'M';
    if (c <= 36 && w <= 28) size = 'S';
    else if (c <= 38 && w <= 30) size = 'M';
    else if (c <= 42 && w <= 34) size = 'L';
    else if (c <= 44 && w <= 36) size = 'XL';
    else size = 'XXL';

    setResult(size);
    setStep(3);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.06] p-8 md:p-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative">
        <h3 className="text-lg md:text-xl font-semibold mb-2">Find Your Perfect Size</h3>
        <p className="text-sm text-muted-foreground mb-8">Answer two quick questions and we'll recommend your ideal fit.</p>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Step 1 of 2</p>
              <label className="text-sm font-medium mb-2 block">What's your chest measurement? (inches)</label>
              <input
                type="number"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                placeholder="e.g., 40"
                className="w-full max-w-xs h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                onClick={() => chest ? setStep(1) : null}
                disabled={!chest}
                className="mt-4 inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Next <ArrowRight size={12} />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Step 2 of 2</p>
              <label className="text-sm font-medium mb-2 block">What's your waist measurement? (inches)</label>
              <input
                type="number"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="e.g., 32"
                className="w-full max-w-xs h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded-full text-xs uppercase tracking-[0.2em] font-medium hover:bg-muted/50 transition-colors">
                  Back
                </button>
                <button
                  onClick={findSize}
                  disabled={!waist}
                  className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Find My Size <CheckCircle2 size={13} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && result && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-foreground text-background text-2xl font-bold mb-4">
                {result}
              </div>
              <p className="text-lg font-semibold">Your recommended size is <strong>{result}</strong></p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Based on your chest ({chest}") and waist ({waist}") measurements. For a relaxed fit, consider sizing up.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => { setStep(0); setChest(''); setWaist(''); setResult(''); }} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
                  Try Again
                </button>
                <Link to="/shop" className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity">
                  Shop Now <ArrowRight size={12} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── size table component ─── */
const SizeTable = ({ data }: { data: { headers: string[]; rows: string[][] } }) => (
  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
    <table className="w-full text-sm border-collapse min-w-[500px]">
      <thead>
        <tr>
          {data.headers.map((h, i) => (
            <th key={i} className="text-left text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold py-3 px-4 border-b border-border/60 bg-muted/30 first:rounded-tl-xl last:rounded-tr-xl">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, ri) => (
          <tr key={ri} className="hover:bg-muted/20 transition-colors">
            {row.map((cell, ci) => (
              <td key={ci} className={`py-3.5 px-4 border-b border-border/30 ${ci === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ─── main page ─── */
const SizeGuide = () => {
  useDocumentTitle('Size Guide | SWITCH');
  const navigate = useNavigate();
  const [gender, setGender] = useState<'men' | 'women'>('men');
  const [openGarment, setOpenGarment] = useState<string>(Object.keys(SIZE_DATA.men)[0]);

  const garments = SIZE_DATA[gender];

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.02] to-transparent" />
        <div className="container-custom relative">
          {/* Back to Product button */}
          <Reveal>
            <button
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/shop');
                }
              }}
              className="inline-flex items-center gap-2 mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Product
            </button>
          </Reveal>
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-foreground/5">
                <Ruler size={18} className="text-foreground/60" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">Sizing Reference</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1
              className="text-4xl md:text-6xl font-light tracking-[-0.02em] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Size Guide
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
              Find your perfect fit. All measurements are in inches and centimeters. If you're between sizes, we recommend sizing up for a more comfortable fit.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container-custom pb-20 space-y-16">
        {/* ── Gender Toggle ── */}
        <Reveal>
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-full w-fit border border-border/40">
            {(['men', 'women'] as const).map((g) => (
              <button
                key={g}
                onClick={() => { setGender(g); setOpenGarment(Object.keys(SIZE_DATA[g])[0]); }}
                className={`relative px-7 py-3 rounded-full text-xs uppercase tracking-[0.25em] font-medium transition-all duration-300 ${gender === g ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {g === 'men' ? "Men's" : "Women's"}
              </button>
            ))}
          </div>
        </Reveal>

        {/* ── Size Tables (Accordion) ── */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div key={gender} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {Object.entries(garments).map(([garmentName, data], i) => (
                <Reveal key={garmentName} delay={i * 0.05}>
                  <div className="mb-3 rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
                    <button
                      onClick={() => setOpenGarment(openGarment === garmentName ? '' : garmentName)}
                      className="flex items-center justify-between w-full p-5 md:p-6 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Shirt size={16} className="text-muted-foreground" />
                        <span className="font-semibold text-sm">{garmentName}</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">
                          {data.rows.length} sizes
                        </span>
                      </div>
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${openGarment === garmentName ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openGarment === garmentName && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-6 md:px-6">
                            <SizeTable data={data} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Find Your Size ── */}
        <Reveal>
          <SizeFinder />
        </Reveal>

        {/* ── How to Measure ── */}
        <section>
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              How to Measure
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">Use a soft measuring tape. Keep it snug but not tight. Stand naturally and breathe normally while measuring.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOW_TO_MEASURE.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <div className="group p-5 rounded-2xl border border-border/40 bg-card/30 hover:bg-card/60 transition-all duration-300 hover:border-border/70">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{item.icon}</span>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Fit Guide ── */}
        <section>
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Understanding Fit
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">Each garment's product page mentions its fit type. Here's what they mean.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIT_TIPS.map((tip, i) => (
              <Reveal key={tip.fit} delay={i * 0.08}>
                <div className="relative overflow-hidden rounded-2xl border border-border/40 p-6 bg-gradient-to-br from-card/50 to-card/20 hover:border-border/70 transition-all duration-300">
                  <span className="absolute top-4 right-4 text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground/50 bg-muted/30 px-2.5 py-1 rounded-full">
                    {tip.tag}
                  </span>
                  <h3 className="font-semibold text-base mb-2 mt-2">{tip.fit}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Help Note ── */}
        <Reveal>
          <div className="flex items-start gap-4 p-6 rounded-2xl border border-border/40 bg-muted/10">
            <Info size={18} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Still unsure about your size?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our Style Advisor can help you find the perfect fit based on your preferences.{' '}
                <Link to="/style-advisor" className="text-foreground underline underline-offset-4 hover:no-underline">
                  Get personalized advice →
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default SizeGuide;
