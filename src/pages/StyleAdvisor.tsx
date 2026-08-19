import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { products, Product } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import { useStyleAnalysis, AnalysisResult } from '@/hooks/useStyleAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/* ─────────────────────────────────────────────
   Color-matching helpers (preserved logic)
───────────────────────────────────────────── */
const COLOR_HEX_MAP: Record<string, string> = {
  'black': '#000000', 'navy': '#1a1a4e', 'white': '#ffffff', 'cream': '#f5f5dc',
  'blue': '#4a7cad', 'red': '#c44536', 'pink': '#ffc0cb', 'grey': '#808080',
  'gray': '#808080', 'olive': '#556b2f', 'beige': '#f5f5dc', 'brown': '#8b4513',
  'green': '#228b22', 'purple': '#800080', 'yellow': '#ffd700', 'orange': '#ffa500',
  'maroon': '#800000', 'teal': '#008080', 'coral': '#ff7f50', 'lavender': '#e6e6fa',
  'mint': '#98ff98', 'peach': '#ffdab9', 'tan': '#d2b48c', 'indigo': '#4b0082',
  'violet': '#8a2be2', 'rose': '#ff007f', 'chocolate': '#7b3f00', 'gold': '#ffd700',
  'silver': '#c0c0c0', 'khaki': '#c3b091', 'burgundy': '#800020', 'rust': '#b7410e',
  'mauve': '#e0b0ff', 'denim': '#1560bd', 'charcoal': '#36454f',
};

function hexToHsl(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0;
  const c = hex.replace('#', '');
  if (c.length === 3) { r = parseInt(c[0] + c[0], 16); g = parseInt(c[1] + c[1], 16); b = parseInt(c[2] + c[2], 16); }
  else { r = parseInt(c.substring(0, 2), 16); g = parseInt(c.substring(2, 4), 16); b = parseInt(c.substring(4, 6), 16); }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) { case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break; case g: h = ((b - r) / d + 2) / 6; break; case b: h = ((r - g) / d + 4) / 6; break; }
  }
  return [h * 360, s * 100, l * 100];
}
function hslDistance(a: [number, number, number], b: [number, number, number]): number {
  const dh = Math.min(Math.abs(a[0] - b[0]), 360 - Math.abs(a[0] - b[0])) / 180;
  const ds = Math.abs(a[1] - b[1]) / 100; const dl = Math.abs(a[2] - b[2]) / 100;
  return Math.sqrt(dh * dh + ds * ds + dl * dl) / Math.sqrt(3);
}
function getColorHex(n: string): string { return COLOR_HEX_MAP[n.toLowerCase()] || '#cccccc'; }
function matchColorScore(pc: string[], ph: string[]): number {
  let mx = 0;
  for (const c of pc) {
    const ch = getColorHex(c); if (ch === '#cccccc') continue; const cH = hexToHsl(ch);
    for (const p of ph) { const pH = hexToHsl(p); const d = hslDistance(cH, pH); mx = Math.max(mx, Math.max(0, (1 - d * 1.5) * 10)); }
  }
  return mx;
}

/* ─────────────────────────────────────────────
   Analysis step labels for the loading phase
───────────────────────────────────────────── */
const ANALYSIS_STEPS = [
  { label: 'Detecting complexion & undertone', duration: 2200 },
  { label: 'Mapping body proportions', duration: 2000 },
  { label: 'Identifying style personality', duration: 1800 },
  { label: 'Building your colour palette', duration: 1600 },
  { label: 'Curating recommendations', duration: 1400 },
];

/* ─────────────────────────────────────────────
   Inject scoped luxury styles
───────────────────────────────────────────── */
const useInjectStyles = () => {
  useEffect(() => {
    const id = 'sa-luxury-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');

      :root {
        --sa-bg:     #0a0a0a;
        --sa-surface: rgba(255,255,255,.03);
        --sa-border:  rgba(255,255,255,.07);
        --sa-muted:   rgba(255,255,255,.38);
        --sa-accent:  #c8a96e;
        --sa-accent2: #b89a5a;
        --sa-white:   #fafafa;
        --sa-serif:   'Cormorant Garamond', Georgia, serif;
        --sa-sans:    'Inter', system-ui, sans-serif;
      }

      .sa-root { background:var(--sa-bg); color:var(--sa-white); min-height:100vh; overflow-x:hidden; }

      /* ── hero ── */
      .sa-hero {
        position:relative; padding:100px 0 80px; text-align:center;
        display:flex; flex-direction:column; align-items:center;
        border-bottom:.5px solid var(--sa-border);
      }
      .sa-hero-eyebrow {
        font-family:var(--sa-sans); font-size:9px; letter-spacing:.44em; text-transform:uppercase;
        color:var(--sa-accent); margin-bottom:28px;
      }
      .sa-hero-title {
        font-family:var(--sa-serif); font-size:clamp(38px,6vw,72px); font-weight:300;
        line-height:1.08; letter-spacing:.02em; color:var(--sa-white); margin-bottom:20px;
      }
      .sa-hero-title em { font-style:italic; color:var(--sa-accent); }
      .sa-hero-sub {
        font-family:var(--sa-sans); font-size:13px; line-height:1.85;
        color:var(--sa-muted); font-weight:300; max-width:440px; margin:0 auto;
      }
      .sa-hero-line { width:1px; height:52px; background:var(--sa-accent); opacity:.3; margin-top:48px; }

      /* ── consultation area ── */
      .sa-consult {
        max-width:1120px; margin:0 auto; padding:80px 48px;
        display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start;
      }

      /* ── upload panel ── */
      .sa-upload-panel {
        border:.5px solid var(--sa-border); padding:48px 40px;
        position:relative; overflow:hidden;
      }
      .sa-upload-label {
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.44em; text-transform:uppercase;
        color:var(--sa-accent); margin-bottom:32px; display:block;
      }
      .sa-drop-zone {
        border:1px dashed rgba(255,255,255,.12); padding:56px 32px; text-align:center;
        cursor:pointer; transition:border-color .3s, background .3s;
        position:relative;
      }
      .sa-drop-zone:hover { border-color:rgba(200,169,110,.4); background:rgba(200,169,110,.03); }
      .sa-drop-icon {
        width:56px; height:56px; margin:0 auto 20px;
        border:.5px solid rgba(255,255,255,.15); border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        transition:border-color .3s;
      }
      .sa-drop-zone:hover .sa-drop-icon { border-color:var(--sa-accent); }
      .sa-drop-title {
        font-family:var(--sa-serif); font-size:22px; font-weight:300;
        color:var(--sa-white); margin-bottom:8px;
      }
      .sa-drop-hint {
        font-family:var(--sa-sans); font-size:10px; letter-spacing:.18em;
        color:var(--sa-muted); text-transform:uppercase;
      }
      .sa-preview-wrap { position:relative; overflow:hidden; }
      .sa-preview-img { width:100%; aspect-ratio:3/4; object-fit:cover; display:block; }
      .sa-preview-close {
        position:absolute; top:16px; right:16px;
        width:36px; height:36px; background:rgba(10,10,10,.7); backdrop-filter:blur(8px);
        border:.5px solid rgba(255,255,255,.15); display:flex; align-items:center; justify-content:center;
        cursor:pointer; transition:all .3s; color:var(--sa-white);
      }
      .sa-preview-close:hover { background:rgba(200,169,110,.2); border-color:var(--sa-accent); }

      /* ── analyze button ── */
      .sa-analyze-btn {
        width:100%; margin-top:24px; padding:18px 24px;
        display:flex; align-items:center; justify-content:center; gap:12px;
        background:var(--sa-accent); color:var(--sa-bg);
        font-family:var(--sa-sans); font-size:10px; letter-spacing:.32em;
        text-transform:uppercase; font-weight:500;
        border:none; cursor:pointer; transition:opacity .3s, transform .2s;
      }
      .sa-analyze-btn:hover { opacity:.85; }
      .sa-analyze-btn:active { transform:scale(.98); }
      .sa-analyze-btn:disabled { opacity:.5; cursor:not-allowed; }

      /* ── tips ── */
      .sa-tips {
        margin-top:32px; padding:24px 28px;
        border:.5px solid var(--sa-border);
      }
      .sa-tips-title {
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.4em;
        text-transform:uppercase; color:var(--sa-accent); margin-bottom:16px;
      }
      .sa-tips li {
        font-family:var(--sa-sans); font-size:11.5px; color:var(--sa-muted);
        line-height:2; font-weight:300; padding-left:16px; position:relative;
      }
      .sa-tips li::before {
        content:''; position:absolute; left:0; top:10px;
        width:4px; height:4px; border-radius:50%; background:var(--sa-accent); opacity:.5;
      }

      /* ── result panel (right side) ── */
      .sa-result-panel { position:relative; }
      .sa-empty-state {
        border:.5px solid var(--sa-border); padding:80px 40px; text-align:center;
      }
      .sa-empty-icon {
        width:72px; height:72px; margin:0 auto 28px;
        border:.5px solid rgba(255,255,255,.1); border-radius:50%;
        display:flex; align-items:center; justify-content:center;
      }
      .sa-empty-title {
        font-family:var(--sa-serif); font-size:26px; font-weight:300;
        color:var(--sa-white); margin-bottom:12px;
      }
      .sa-empty-desc {
        font-family:var(--sa-sans); font-size:12px; color:var(--sa-muted);
        font-weight:300; max-width:280px; margin:0 auto; line-height:1.75;
      }

      /* ── loading state ── */
      .sa-loading-card {
        border:.5px solid var(--sa-border); padding:56px 40px; text-align:center;
      }
      .sa-pulse-ring {
        width:64px; height:64px; margin:0 auto 28px; position:relative;
      }
      .sa-pulse-ring::before, .sa-pulse-ring::after {
        content:''; position:absolute; inset:0; border-radius:50%;
        border:1px solid var(--sa-accent);
      }
      .sa-pulse-ring::before { animation:sa-ping 2s ease-out infinite; }
      .sa-pulse-ring::after  { animation:sa-ping 2s ease-out infinite .6s; }
      @keyframes sa-ping { 0%{transform:scale(.6);opacity:.8} 100%{transform:scale(1.6);opacity:0} }
      .sa-pulse-dot {
        position:absolute; inset:0; margin:auto;
        width:8px; height:8px; border-radius:50%; background:var(--sa-accent);
      }
      .sa-step-list { margin-top:36px; text-align:left; max-width:260px; margin-left:auto; margin-right:auto; }
      .sa-step {
        display:flex; align-items:center; gap:14px; padding:10px 0;
        font-family:var(--sa-sans); font-size:11.5px; color:var(--sa-muted); font-weight:300;
        border-bottom:.5px solid var(--sa-border);
        transition:color .4s;
      }
      .sa-step:last-child { border-bottom:none; }
      .sa-step.active { color:var(--sa-white); }
      .sa-step.done { color:var(--sa-accent); }
      .sa-step-dot {
        width:6px; height:6px; border-radius:50%;
        background:rgba(255,255,255,.15); flex-shrink:0;
        transition:background .4s, box-shadow .4s;
      }
      .sa-step.active .sa-step-dot { background:var(--sa-accent); box-shadow:0 0 12px rgba(200,169,110,.4); }
      .sa-step.done .sa-step-dot { background:var(--sa-accent); }

      /* ── analysis result ── */
      .sa-result-card {
        border:.5px solid var(--sa-border); padding:0; overflow:hidden;
      }
      .sa-result-header {
        padding:28px 32px; border-bottom:.5px solid var(--sa-border);
        display:flex; align-items:center; gap:14px;
      }
      .sa-result-check {
        width:28px; height:28px; border-radius:50%; background:var(--sa-accent);
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      .sa-result-title {
        font-family:var(--sa-serif); font-size:24px; font-weight:300; color:var(--sa-white);
      }
      .sa-result-subtitle {
        font-family:var(--sa-sans); font-size:10px; letter-spacing:.2em;
        text-transform:uppercase; color:var(--sa-muted);
      }

      /* profile row */
      .sa-profile-grid { display:grid; grid-template-columns:1fr 1fr 1fr; }
      .sa-profile-item {
        padding:28px 24px; text-align:center;
        border-right:.5px solid var(--sa-border);
        border-bottom:.5px solid var(--sa-border);
      }
      .sa-profile-item:nth-child(3n) { border-right:none; }
      .sa-profile-label {
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.36em;
        text-transform:uppercase; color:var(--sa-accent); margin-bottom:10px;
      }
      .sa-profile-value {
        font-family:var(--sa-serif); font-size:20px; font-weight:300; color:var(--sa-white);
      }

      /* palette */
      .sa-palette-section { padding:28px 32px; border-bottom:.5px solid var(--sa-border); }
      .sa-palette-label {
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.4em;
        text-transform:uppercase; color:var(--sa-accent); margin-bottom:18px;
      }
      .sa-palette-row { display:flex; gap:0; }
      .sa-swatch {
        flex:1; height:48px; position:relative; cursor:crosshair;
        transition:transform .3s, z-index 0s;
      }
      .sa-swatch:hover { transform:scaleY(1.35); z-index:2; }
      .sa-swatch-hex {
        position:absolute; bottom:-22px; left:50%; transform:translateX(-50%);
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.15em;
        color:var(--sa-muted); opacity:0; transition:opacity .3s;
        white-space:nowrap;
      }
      .sa-swatch:hover .sa-swatch-hex { opacity:1; }

      /* recommendations */
      .sa-recs-section { padding:28px 32px; }
      .sa-recs-label {
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.4em;
        text-transform:uppercase; color:var(--sa-accent); margin-bottom:20px;
      }
      .sa-rec-item {
        display:flex; align-items:flex-start; gap:14px; padding:12px 0;
        border-bottom:.5px solid var(--sa-border);
        font-family:var(--sa-sans); font-size:12px; color:rgba(255,255,255,.55);
        font-weight:300; line-height:1.7;
      }
      .sa-rec-item:last-child { border-bottom:none; }
      .sa-rec-num {
        font-family:var(--sa-serif); font-size:18px; font-weight:300;
        color:var(--sa-accent); flex-shrink:0; width:24px; margin-top:-2px;
      }

      /* ── product grid section ── */
      .sa-products-section {
        max-width:1120px; margin:0 auto; padding:80px 48px;
        border-top:.5px solid var(--sa-border);
      }
      .sa-products-header {
        display:flex; align-items:flex-end; justify-content:space-between;
        margin-bottom:48px;
      }
      .sa-products-eyebrow {
        font-family:var(--sa-sans); font-size:8px; letter-spacing:.44em;
        text-transform:uppercase; color:var(--sa-accent); margin-bottom:12px;
      }
      .sa-products-title {
        font-family:var(--sa-serif); font-size:clamp(28px,4vw,44px);
        font-weight:300; color:var(--sa-white); line-height:1.1;
      }
      .sa-products-count {
        font-family:var(--sa-sans); font-size:10px; letter-spacing:.2em;
        text-transform:uppercase; color:var(--sa-muted);
      }
      .sa-products-grid {
        display:grid; grid-template-columns:repeat(4, 1fr); gap:24px;
      }

      /* ── responsive ── */
      @media (max-width:1024px) {
        .sa-consult { grid-template-columns:1fr; gap:48px; padding:60px 32px; }
        .sa-products-section { padding:60px 32px; }
        .sa-products-grid { grid-template-columns:repeat(2, 1fr); gap:16px; }
      }
      @media (max-width:640px) {
        .sa-hero { padding:72px 24px 56px; }
        .sa-consult { padding:40px 20px; gap:36px; }
        .sa-upload-panel { padding:32px 24px; }
        .sa-profile-grid { grid-template-columns:1fr; }
        .sa-profile-item { border-right:none; }
        .sa-products-section { padding:48px 20px; }
        .sa-products-grid { grid-template-columns:repeat(2, 1fr); gap:12px; }
        .sa-result-header { padding:20px 24px; }
        .sa-palette-section, .sa-recs-section { padding:24px; }
        .sa-products-header { flex-direction:column; align-items:flex-start; gap:8px; }
        .sa-hero-line { height:36px; margin-top:36px; }
      }
      @media (prefers-reduced-motion:reduce) {
        .sa-pulse-ring::before, .sa-pulse-ring::after { animation:none; }
      }
    `;
    document.head.appendChild(s);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);
};

/* ─────────────────────────────────────────────
   Fade-up animation wrapper
───────────────────────────────────────────── */
const FadeUp = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const StyleAdvisor = () => {
  useInjectStyles();

  const [image, setImage] = useState<string | null>(null);
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyzeImage, isAnalyzing } = useStyleAnalysis();
  const { user } = useAuth();
  const { data: allProducts, isLoading: isProductsLoading } = useProducts();

  /* ── Image upload ── */
  const handleImageUpload = useCallback(async (file: File) => {
    setAnalysisResult(null);
    setStoredImageUrl(null);
    setActiveStep(-1);

    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `style-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id || 'anonymous'}/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('style-uploads').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('style-uploads').getPublicUrl(filePath);
        setStoredImageUrl(publicUrl);
      }
    } catch (err) { console.warn('Storage upload skipped:', err); }
  }, [user]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageUpload(file);
  }, [handleImageUpload]);

  const clearImage = () => {
    setImage(null); setAnalysisResult(null); setActiveStep(-1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Analyze with step animation ── */
  const handleAnalyze = useCallback(async () => {
    if (!image) return;
    setActiveStep(0);

    // Animate through steps rapidly
    let step = 0;
    const stepTimer = setInterval(() => {
      step++;
      if (step < ANALYSIS_STEPS.length) setActiveStep(step);
      else clearInterval(stepTimer);
    }, 500);

    const result = await analyzeImage(image, {
      imageUrl: storedImageUrl || undefined,
      userId: user?.id,
    });

    clearInterval(stepTimer);
    setActiveStep(ANALYSIS_STEPS.length); // all done

    if (result) {
      setAnalysisResult(result);
      if (user) {
        try {
          await supabase.from('profiles').update({
            skin_tone: result.skinTone, body_structure: result.bodyStructure,
            style_category: result.styleCategory, color_palette: result.colorPalette,
          }).eq('user_id', user.id);
        } catch (error) { console.error('Profile update error:', error); }
      }
    }
  }, [image, storedImageUrl, user, analyzeImage]);

  /* ── Product matching ── */
  const matchingProducts = useMemo(() => {
    const pool = allProducts && allProducts.length > 0 ? allProducts : products;
    if (!analysisResult || pool.length === 0) {
      return pool.filter(p => p.isNew || p.isTrending || p.rating > 4.5).slice(0, 8)
        .map(product => ({ product, matchPercentage: undefined }));
    }
    const paletteHexes = analysisResult.colorPalette;
    const cat = analysisResult.styleCategory.toLowerCase();
    const isFormal = cat.includes('formal');
    const isCasual = cat.includes('casual');
    const isParty = cat.includes('party') || cat.includes('street');
    const isEthnic = cat.includes('ethnic');

    return pool.map(product => {
      let score = 0;
      const occ = product.occasion.join(' ').toLowerCase();
      if (isFormal && (occ.includes('formal') || occ.includes('office'))) score += 5;
      else if (isCasual && occ.includes('casual')) score += 5;
      else if (isParty && (occ.includes('party') || occ.includes('wedding'))) score += 5;
      else if (isEthnic && (occ.includes('festival') || occ.includes('wedding'))) score += 5;
      score += matchColorScore(product.colors, paletteHexes);
      const matchPercentage = Math.min(98, Math.max(45, Math.round((score / 15) * 100)));
      return { product, score, matchPercentage };
    }).sort((a, b) => b.score - a.score).slice(0, 8)
      .map(i => ({ product: i.product, matchPercentage: i.matchPercentage }));
  }, [analysisResult, allProducts]);

  return (
    <div className="sa-root">

      {/* ── HERO ── */}
      <section className="sa-hero">
        <FadeUp>
          <p className="sa-hero-eyebrow">Personal Style Consultation</p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h1 className="sa-hero-title">
            Your <em>Signature Look</em>,<br />Crafted by Experts.
          </h1>
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="sa-hero-sub">
            Upload a photo and let our fashion consultant analyse your unique features —
            skin tone, body structure, and aesthetic — to curate pieces made for you.
          </p>
        </FadeUp>
        <FadeUp delay={0.35}>
          <div className="sa-hero-line" />
        </FadeUp>
      </section>

      {/* ── CONSULTATION AREA ── */}
      <div className="sa-consult">

        {/* LEFT — Upload Panel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sa-upload-panel">
            <span className="sa-upload-label">Step One — Upload</span>

            <AnimatePresence mode="wait">
              {!image ? (
                <motion.div
                  key="dropzone"
                  className={`sa-drop-zone ${isDragOver ? 'sa-drop-zone-active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  style={isDragOver ? { borderColor: 'rgba(200,169,110,.5)', background: 'rgba(200,169,110,.05)' } : {}}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                  <div className="sa-drop-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--sa-muted)' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="sa-drop-title">Drop your photo here</p>
                  <p className="sa-drop-hint">or click to browse · jpg, png up to 10 mb</p>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  className="sa-preview-wrap"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img loading="lazy" decoding="async" src={image} alt="Your photo" className="sa-preview-img" />
                  <button onClick={clearImage} className="sa-preview-close" aria-label="Remove photo">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analyze Button */}
            <AnimatePresence>
              {image && !analysisResult && (
                <motion.button
                  className="sa-analyze-btn"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                >
                  {isAnalyzing ? (
                    <><Loader2 size={16} className="animate-spin" /> Analysing…</>
                  ) : (
                    <>Begin Consultation</>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Tips */}
          <motion.div
            className="sa-tips"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <p className="sa-tips-title">For Best Results</p>
            <ul>
              <li>Clear, front-facing photo with good lighting</li>
              <li>Wear fitted clothing for accurate body mapping</li>
              <li>Avoid heavy filters or strong colour casts</li>
              <li>Natural expression — no need to pose</li>
            </ul>
          </motion.div>
        </motion.div>

        {/* RIGHT — Results Panel */}
        <motion.div
          className="sa-result-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait">

            {/* Loading State */}
            {isAnalyzing && (
              <motion.div
                key="loading"
                className="sa-loading-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="sa-pulse-ring">
                  <div className="sa-pulse-dot" />
                </div>
                <p style={{ fontFamily: 'var(--sa-serif)', fontSize: '22px', fontWeight: 300, marginBottom: 8 }}>
                  Analysing Your Style
                </p>
                <p style={{ fontFamily: 'var(--sa-sans)', fontSize: '11px', color: 'var(--sa-muted)', letterSpacing: '.15em', marginBottom: 0 }}>
                  This typically takes a few seconds
                </p>

                <div className="sa-step-list">
                  {ANALYSIS_STEPS.map((step, i) => (
                    <div key={i} className={`sa-step ${i === activeStep ? 'active' : i < activeStep ? 'done' : ''}`}>
                      <span className="sa-step-dot" />
                      <span>{step.label}</span>
                      {i < activeStep && <Check size={12} style={{ marginLeft: 'auto', color: 'var(--sa-accent)' }} />}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Result State */}
            {analysisResult && !isAnalyzing && (
              <motion.div
                key="result"
                className="sa-result-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Header */}
                <div className="sa-result-header">
                  <motion.div
                    className="sa-result-check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check size={14} color="#0a0a0a" strokeWidth={2.5} />
                  </motion.div>
                  <div>
                    <h3 className="sa-result-title">Your Style Profile</h3>
                    <p className="sa-result-subtitle">Analysis Complete</p>
                  </div>
                </div>

                {/* Profile Grid */}
                <div className="sa-profile-grid">
                  {[
                    { label: 'Complexion', value: analysisResult.skinTone },
                    { label: 'Body Type', value: analysisResult.bodyStructure },
                    { label: 'Aesthetic', value: analysisResult.styleCategory },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      className="sa-profile-item"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                    >
                      <p className="sa-profile-label">{item.label}</p>
                      <p className="sa-profile-value">{item.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Color Palette */}
                <motion.div
                  className="sa-palette-section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="sa-palette-label">Your Colour Palette</p>
                  <div className="sa-palette-row">
                    {analysisResult.colorPalette.map((color, i) => (
                      <motion.div
                        key={i}
                        className="sa-swatch"
                        style={{ backgroundColor: color }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.6 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="sa-swatch-hex">{color}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Recommendations */}
                <motion.div
                  className="sa-recs-section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="sa-recs-label">Stylist Notes</p>
                  {analysisResult.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      className="sa-rec-item"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                    >
                      <span className="sa-rec-num">{String(i + 1).padStart(2, '0')}</span>
                      <span>{rec}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Empty State */}
            {!image && !isAnalyzing && !analysisResult && (
              <motion.div
                key="empty"
                className="sa-empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="sa-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--sa-muted)' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3 className="sa-empty-title">Your profile awaits</h3>
                <p className="sa-empty-desc">
                  Upload a photo on the left and we'll build your personalised style
                  profile with colour recommendations and curated picks.
                </p>
              </motion.div>
            )}

            {/* Image uploaded but not analysed yet */}
            {image && !isAnalyzing && !analysisResult && (
              <motion.div
                key="ready"
                className="sa-empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="sa-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--sa-accent)' }}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3 className="sa-empty-title">Ready to analyse</h3>
                <p className="sa-empty-desc">
                  Your photo is loaded. Hit <strong style={{ color: 'var(--sa-accent)' }}>"Begin Consultation"</strong> to
                  start your personalised style evaluation.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── MATCHING PRODUCTS ── */}
      <AnimatePresence>
        {(analysisResult || isProductsLoading || isAnalyzing) && (
          <motion.section
            className="sa-products-section"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sa-products-header">
              <div>
                <p className="sa-products-eyebrow">Curated For You</p>
                <h2 className="sa-products-title">Your Perfect Matches</h2>
              </div>
              <p className="sa-products-count">{matchingProducts.length} pieces</p>
            </div>

            {(isProductsLoading || isAnalyzing) ? (
              <div className="sa-products-grid">
                {[1, 2, 3, 4].map(i => (
                  <div key={i}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--sa-surface)', marginBottom: 12 }} className="animate-pulse" />
                    <div style={{ height: 12, width: '75%', background: 'var(--sa-surface)', marginBottom: 8 }} className="animate-pulse" />
                    <div style={{ height: 12, width: '50%', background: 'var(--sa-surface)' }} className="animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="sa-products-grid">
                {matchingProducts.map((item, index) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
                  >
                    <ProductCard product={item.product} index={index} matchPercentage={item.matchPercentage} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StyleAdvisor;
