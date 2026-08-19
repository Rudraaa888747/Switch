import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageOptimizationOptions {
  width?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

export function normalizeImageUrl(url?: string | null, options?: ImageOptimizationOptions) {
  if (!url) return "";
  
  if (url.startsWith('http')) {
    // If it's an amazon URL or already a complete URL, return it directly.
    // We bypass Supabase image transformation (/render/image/public/) 
    // because it requires a Pro plan and returns 400 Bad Request if disabled,
    // which breaks the images completely and shows the placeholder.
    try {
      const u = new URL(url);
      return u.toString();
    } catch {
      return url;
    }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucket = import.meta.env.VITE_SUPABASE_PRODUCT_IMAGE_BUCKET || 'products';
  
  if (supabaseUrl && !url.includes('supabase.co')) {
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    const finalPath = cleanPath.startsWith(bucket + '/') ? cleanPath : `${bucket}/${cleanPath}`;
    return `${supabaseUrl}/storage/v1/object/public/${finalPath}`;
  }
  
  return url;
}

const DEFAULT_BRAND = 'SWITCH';

const FIT_KEYWORDS: Array<{ pattern: RegExp; fit: string }> = [
  { pattern: /\b(oversized|boxy|relaxed)\b/i, fit: 'relaxed fit' },
  { pattern: /\b(slim|tailored|trim)\b/i, fit: 'tailored fit' },
  { pattern: /\b(regular|classic|straight)\b/i, fit: 'regular fit' },
  { pattern: /\b(cropped)\b/i, fit: 'cropped fit' },
];

const OCCASION_COPY: Record<string, string> = {
  Casual: 'Works effortlessly with denim, tailored joggers, or clean sneakers for everyday rotation.',
  Formal: 'Designed to sharpen formal edits with trousers, loafers, and understated accessories.',
  Party: 'Ideal for evenings, late dinners, and dressed-up city moments.',
  Office: 'Transitions cleanly from desk hours to after-hours plans.',
  Wedding: 'Refined enough for celebrations, receptions, and elevated festive dressing.',
  Travel: 'Comfortable through long days and easy to style while on the move.',
  Sports: 'Built for active days with breathable comfort and unrestricted movement.',
};

const REVIEW_NAMES = [
  'Aarav M.',
  'Rhea K.',
  'Vihaan S.',
  'Meera D.',
  'Kabir A.',
  'Ishita P.',
  'Dev R.',
  'Anaya T.',
  'Arjun N.',
  'Sana V.',
];

const REVIEW_OPENERS = [
  'The finish feels far more elevated in person.',
  'This has the kind of polish I usually expect from much pricier labels.',
  'The fabric lands in that sweet spot between structure and comfort.',
  'The silhouette looks clean, expensive, and easy to wear.',
];

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickSeeded<T>(items: T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length];
}

export function detectFabric(text: string) {
  const fabricMatch = text.match(/\b(cotton|linen|wool|silk|polyester|viscose|rayon|denim|jersey|knit|woven|chambray|oxford|twill|satin|crepe|georgette|chiffon|lace|mesh|velvet|cashmere|modal|tencel|bamboo|supima|pima|egyptian)\b/i);
  return fabricMatch ? toTitleCase(fabricMatch[0].toLowerCase()) : 'Premium Blend';
}

function inferFit(text: string, category?: string, subcategory?: string) {
  for (const keyword of FIT_KEYWORDS) {
    if (keyword.pattern.test(text)) {
      return keyword.fit;
    }
  }

  if (/\b(blazer|shirt|trouser|dress pant|formal)\b/i.test(text)) return 'tailored fit';
  if (/\b(hoodie|sweatshirt|jogger|tee|t-shirt)\b/i.test(text)) return 'relaxed fit';
  if (category === 'women' && /\b(dress|top)\b/i.test(subcategory || text)) return 'fluid fit';
  return 'modern regular fit';
}

function inferComfortLine(fabric: string, text: string) {
  if (/\b(stretch|elastane|flex)\b/i.test(text)) return 'A touch of stretch keeps the fit comfortable through long hours of wear.';
  if (/\b(lightweight|breathable|airy)\b/i.test(text) || /linen|cotton|modal|tencel/i.test(fabric)) {
    return 'Lightweight hand-feel and breathable construction keep it easy from day to night.';
  }
  if (/\b(soft|brushed|smooth)\b/i.test(text) || /cashmere|satin|silk|jersey/i.test(fabric)) {
    return 'The hand-feel stays smooth against the skin with an easy, elevated drape.';
  }
  return 'Structured enough to hold its shape, yet comfortable enough for repeat wear.';
}

function inferStylingLine(colors: string[], category?: string, subcategory?: string) {
  const firstColor = colors[0] ? colors[0].toLowerCase() : '';
  if (['black', 'navy', 'grey', 'charcoal', 'olive', 'brown'].includes(firstColor)) {
    return 'Style it with monochrome layers, polished footwear, and minimal metal accents for a sharp SWITCH look.';
  }
  if (category === 'women' || /\b(dress|top|skirt)\b/i.test(subcategory || '')) {
    return 'Pair it with sleek heels, a tonal bag, and sculpted jewelry for a refined finish.';
  }
  return 'Pairs effortlessly with relaxed tailoring, clean denim, and understated sneakers.';
}

function inferOccasionLine(occasions: string[]) {
  const firstOccasion = occasions.find(Boolean);
  if (firstOccasion && OCCASION_COPY[firstOccasion]) return OCCASION_COPY[firstOccasion];
  return 'Versatile enough for weekday plans, weekend styling, and everything in between.';
}

export function generateLuxuryDescription(product: {
  name: string;
  description?: string | null;
  fabric?: string | null;
  colors?: string[] | null;
  category?: string | null;
  subcategory?: string | null;
  occasion?: string[] | null;
  brand?: string | null;
}) {
  const cleanedName = cleanProductTitle(product.name);
  const baseText = `${cleanedName}. ${product.description || ''}`.trim();
  const fabric = product.fabric?.trim() || detectFabric(baseText);
  const fit = inferFit(baseText, product.category || undefined, product.subcategory || undefined);
  const comfortLine = inferComfortLine(fabric, baseText);
  const stylingLine = inferStylingLine(product.colors || [], product.category || undefined, product.subcategory || undefined);
  const occasionLine = inferOccasionLine(product.occasion || []);
  const brand = product.brand?.trim() || DEFAULT_BRAND;

  return [
    `${cleanedName} is cut in ${fabric.toLowerCase()} with a ${fit} that keeps the silhouette refined without feeling overworked.`,
    comfortLine,
    stylingLine,
    `${occasionLine} Finished with the understated polish expected from ${brand}.`,
  ].join('\n\n');
}

const PREMIUM_REVIEW_NAMES = [
  'Sebastian V.', 'Isabella R.', 'Alexander K.', 'Sophia M.', 'Julian D.',
  'Elena G.', 'Marcus W.', 'Victoria L.', 'Adrian T.', 'Natalia B.',
  'Dominic H.', 'Camila S.', 'Xavier F.', 'Aria J.', 'Lukas P.'
];

const LUXURY_FEEDBACK_TEMPLATES = [
  {
    title: 'Exquisite Quality',
    content: (name: string, fabric: string) => `The texture of this ${name} is remarkable. The ${fabric.toLowerCase()} feels incredibly premium, with a weight that drapes perfectly. Truly a masterpiece of contemporary tailoring.`
  },
  {
    title: 'Sophisticated Silhouette',
    content: (name: string) => `The cut of this piece is exceptional. It captures that elusive balance between architectural structure and effortless comfort. It has become an immediate staple in my rotation.`
  },
  {
    title: 'Refined Minimalism',
    content: (name: string, _: string, color: string) => `Elegant, understated, and perfectly executed. The ${color} depth is stunning in person. It pairs effortlessly with both tailored trousers and relaxed denim.`
  },
  {
    title: 'Superior Craftsmanship',
    content: (name: string, fabric: string) => `Beyond the aesthetic, the construction is what stands out. The stitching is flawless, and the ${fabric.toLowerCase()} has a hand-feel that rivals the highest luxury houses.`
  }
];

export function buildFallbackReviews(product: {
  id: string;
  name: string;
  fabric?: string | null;
  colors?: string[] | null;
  category?: string | null;
  subcategory?: string | null;
}) {
  const seed = hashSeed(product.id + product.name);
  const fabric = product.fabric?.trim() || detectFabric(product.name);
  const color = product.colors?.[0] || 'neutral';
  const name = cleanProductTitle(product.name);
  
  // Return 4 realistic luxury reviews
  return [0, 1, 2, 3].map((index) => {
    const author = pickSeeded(PREMIUM_REVIEW_NAMES, seed, index);
    const template = LUXURY_FEEDBACK_TEMPLATES[index % LUXURY_FEEDBACK_TEMPLATES.length];
    const daysAgo = [3, 12, 28, 45][index];
    const rating = [5, 5, 4, 5][index];

    return {
      id: `fallback-${product.id}-${index + 1}`,
      rating,
      title: template.title,
      content: template.content(name, fabric, color),
      sentiment: (rating >= 4 ? 'positive' : 'neutral') as 'positive' | 'neutral',
      helpful_count: 12 + ((seed + index * 11) % 40),
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      is_verified_purchase: true,
      author_name: author,
    };
  });
}

export function getReviewDisplayName(userId?: string | null, index = 0) {
  if (!userId) return REVIEW_NAMES[index % REVIEW_NAMES.length];
  return pickSeeded(REVIEW_NAMES, hashSeed(userId), index);
}

// Clean Amazon-style product titles into premium luxury ecommerce naming
export function cleanProductTitle(title: string): string {
  if (!title) return title;

  let cleaned = title.trim();

  // Remove brand prefix pattern (e.g. "Boldfit " at start)
  // Only remove if the brand name is followed by a product descriptor
  cleaned = cleaned.replace(/^[A-Z][a-z]+\s+(Polo|T[-|\s]?Shirt|Shirt|Trouser|Jeans|Jacket|Dress|Top|Sweater|Hoodie|Blazer|Kurta|Saree|Lehenga|Suit|Track|Short|Cap|Shoe|Sneaker|Boot|Sandal|Flip[-|\s]?Flop|Watch|Bag|Belt|Wallet|Socks|Tie|Scarf|Gloves)/i, '$1 ');

  // Remove "for Men/Women/Boys/Girls/Kids/Unisex/Boy/Girl" at end
  cleaned = cleaned.replace(/\s+for\s+(Men|Women|Boys|Girls|Kids|Unisex|Boy|Girl)\s*$/i, '');

  // Remove common Amazon filler/combo suffixes
  cleaned = cleaned.replace(/\s*(?:Combo|Pack|Set of|Value Pack|Combo Pack|Multi Pack)\s*\d*\s*$/i, '');

  // Remove excessive Amazon boilerplate
  cleaned = cleaned.replace(/\b(?:Latest|Trendy|Stylish|Fashionable|Original|Genuine|Authentic|Comfort|Soft|Premium|Quality)\s+/gi, '');

  // Fix "Tshirt" / "T Shirt" / "T-shirt" → "T-Shirt"
  cleaned = cleaned.replace(/\bT\s*[-]?\s*[Ss]hirts?\b/g, 'T-Shirt');

  // Fix "Tshirt" (no space)  
  cleaned = cleaned.replace(/\bTshirt\b/gi, 'T-Shirt');

  // Fix common fashion term formatting
  cleaned = cleaned.replace(/\bRound[- ]?Neck\b/g, 'Round Neck');
  cleaned = cleaned.replace(/\bV[- ]?Neck\b/g, 'V-Neck');
  cleaned = cleaned.replace(/\bHalf[- ]?Sleeves?\b/g, 'Half Sleeve');
  cleaned = cleaned.replace(/\bFull[- ]?Sleeves?\b/g, 'Full Sleeve');
  cleaned = cleaned.replace(/\bHoodie\b/g, 'Hoodie');

  // Clean up double spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If after cleaning the title is too short or empty, return original
  if (cleaned.length < 3) return title;

  return cleaned;
}

// Rewrite raw product descriptions into luxury ecommerce tone
export function rewriteToLuxuryDescription(text: string): string {
  if (!text) return '';

  // If already short and reads premium, return as-is
  if (text.length < 50) return text;

  // Split into meaningful segments
  const segments = text
    .split(/[.\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 8)
    .filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes('about this item') &&
             !lower.includes('package ') &&
             !lower.includes('warranty') &&
             !lower.includes('import') &&
             !lower.includes('country of origin') &&
             !lower.includes('item weight') &&
             !lower.includes('item dimensions') &&
             !lower.includes('manufacturer ') &&
             !lower.includes('customer service') &&
             !lower.includes('return policy') &&
             !lower.includes('easy returns');
    });

  if (segments.length === 0) return text;

  // Detect fabric/material from the text
  const fabric = detectFabric(text).toLowerCase();

  // Build a structured luxury description
  const lines: string[] = [];

  // Intro line highlighting material
  const intro = fabric === 'premium'
    ? 'Crafted from carefully selected materials for refined comfort and effortless style.'
    : `Crafted from premium ${fabric} for refined comfort and effortless style.`;
  lines.push(intro);

  // Filter and clean key feature points
  const keyPoints = segments
    .filter(s => s.length > 10 && s.length < 150)
    .map(s => s.replace(/^[•\-*\d+\s]+/, '').trim())
    .filter(s => s.length > 5)
    .slice(0, 3);

  if (keyPoints.length > 0) {
    keyPoints.forEach(point => {
      const clean = point.charAt(0).toUpperCase() + point.slice(1);
      if (!clean.endsWith('.') && !clean.endsWith('!')) {
        lines.push(clean + '.');
      } else {
        lines.push(clean);
      }
    });
  }

  // Closing line
  lines.push('Designed for those who appreciate enduring quality and understated elegance.');

  return lines.join('\n\n');
}

// Get product image from variants or fallback to legacy image
export function getProductImage(product: {
  variants?: { color: string; images: string[] }[];
  image?: string;
  images?: string[];
}, selectedColor?: string, options?: ImageOptimizationOptions): string {
  if (product.variants && product.variants.length > 0) {
    const variant = selectedColor 
      ? product.variants.find(v => v.color === selectedColor) || product.variants[0]
      : product.variants[0];
    if (variant?.images?.[0]) {
      return normalizeImageUrl(variant.images[0], options);
    }
  }
  return normalizeImageUrl(product.image || product.images?.[0] || '', options);
}

// ─── Smart Product Tagging ──────────────────────────────────────────

const TAG_RULES: [RegExp, string][] = [
  [/oversized|boxy|relaxed fit/i, 'oversized'],
  [/slim fit|tailored|slim/i, 'slim'],
  [/regular fit|classic fit/i, 'regular'],
  [/premium|luxury|designer|high.?end/i, 'premium'],
  [/casual|everyday|daily|basic/i, 'casual'],
  [/streetwear|urban|hype/i, 'streetwear'],
  [/formal|office|business|professional/i, 'formal'],
  [/summer|beach|vacation|tropical/i, 'summerwear'],
  [/winter|wool|hooded|sweater|jacket|coat/i, 'winterwear'],
  [/sport|athletic|gym|activewear/i, 'activewear'],
  [/party|night|club|evening/i, 'partywear'],
  [/wedding|bridal|groom|festive|ethnic/i, 'ethnic'],
  [/minimal|minimalist|clean|simple/i, 'minimal'],
  [/denim|jeans/i, 'denim'],
  [/linen|breathable|lightweight/i, 'linen'],
  [/silk|satin|silky/i, 'silk'],
  [/cotton|soft|comfortable/i, 'cotton'],
  [/knit|knitted|jersey/i, 'knitwear'],
  [/leather|vegan leather/i, 'leather'],
  [/hoodie|sweatshirt/i, 'streetwear'],
  [/polo/i, 'smart-casual'],
  [/shirt|t.?shirt/i, 'top'],
  [/dress|gown/i, 'dress'],
  [/short|shorts/i, 'bottoms'],
  [/trouser|pant|chino|jogger/i, 'bottoms'],
  [/blazer|suit/i, 'formal'],
  [/swim|bikini|trunks/i, 'swimwear'],
];

export function generateProductTags(name: string, description?: string | null, category?: string | null, subcategory?: string | null): string[] {
  const tags = new Set<string>();
  const text = `${name} ${description || ''} ${category || ''} ${subcategory || ''}`;
  for (const [pattern, tag] of TAG_RULES) {
    if (pattern.test(text)) tags.add(tag);
  }
  if (category) tags.add(category);
  if (subcategory) tags.add(subcategory);
  return [...tags];
}

// ─── Auto Product Categorization ────────────────────────────────────

const GENDER_KEYWORDS: [string, 'men' | 'women'][] = [
  ['men', 'men'], ['male', 'men'], ['boys', 'men'], ['boy', 'men'], ['gents', 'men'],
  ['women', 'women'], ['female', 'women'], ['girls', 'women'], ['girl', 'women'], ['ladies', 'women'],
];

const CLOTHING_TYPE_MAP: Record<string, { category: string; subcategory: string }> = {
  shirt: { category: 'unisex', subcategory: 'shirts' },
  't-shirt': { category: 'unisex', subcategory: 't-shirts' },
  tshirt: { category: 'unisex', subcategory: 't-shirts' },
  polo: { category: 'unisex', subcategory: 'polos' },
  hoodie: { category: 'unisex', subcategory: 'hoodies' },
  sweatshirt: { category: 'unisex', subcategory: 'sweatshirts' },
  jacket: { category: 'unisex', subcategory: 'jackets' },
  blazer: { category: 'unisex', subcategory: 'blazers' },
  coat: { category: 'unisex', subcategory: 'coats' },
  dress: { category: 'women', subcategory: 'dresses' },
  gown: { category: 'women', subcategory: 'dresses' },
  top: { category: 'women', subcategory: 'tops' },
  jeans: { category: 'unisex', subcategory: 'jeans' },
  trouser: { category: 'unisex', subcategory: 'trousers' },
  pant: { category: 'unisex', subcategory: 'pants' },
  chino: { category: 'unisex', subcategory: 'chinos' },
  short: { category: 'unisex', subcategory: 'shorts' },
  jogger: { category: 'unisex', subcategory: 'joggers' },
  suit: { category: 'unisex', subcategory: 'suits' },
  cap: { category: 'accessories', subcategory: 'caps' },
  hat: { category: 'accessories', subcategory: 'hats' },
  watch: { category: 'accessories', subcategory: 'watches' },
  bag: { category: 'accessories', subcategory: 'bags' },
  backpack: { category: 'accessories', subcategory: 'bags' },
  sunglass: { category: 'accessories', subcategory: 'sunglasses' },
  glasses: { category: 'accessories', subcategory: 'eyewear' },
  belt: { category: 'accessories', subcategory: 'belts' },
  wallet: { category: 'accessories', subcategory: 'wallets' },
  chain: { category: 'accessories', subcategory: 'jewelry' },
  bracelet: { category: 'accessories', subcategory: 'jewelry' },
  necklace: { category: 'accessories', subcategory: 'jewelry' },
  ring: { category: 'accessories', subcategory: 'jewelry' },
  shoe: { category: 'footwear', subcategory: 'shoes' },
  sneaker: { category: 'footwear', subcategory: 'sneakers' },
  sandal: { category: 'footwear', subcategory: 'sandals' },
  boot: { category: 'footwear', subcategory: 'boots' },
  slipper: { category: 'footwear', subcategory: 'slippers' },
  kurti: { category: 'women', subcategory: 'kurtas' },
  kurta: { category: 'unisex', subcategory: 'kurtas' },
  saree: { category: 'women', subcategory: 'sarees' },
  lehenga: { category: 'women', subcategory: 'lehengas' },
  scarf: { category: 'accessories', subcategory: 'scarves' },
  tie: { category: 'accessories', subcategory: 'ties' },
  glove: { category: 'accessories', subcategory: 'gloves' },
  sock: { category: 'accessories', subcategory: 'socks' },
  swim: { category: 'unisex', subcategory: 'swimwear' },
  trunks: { category: 'unisex', subcategory: 'swimwear' },
  bikini: { category: 'women', subcategory: 'swimwear' },
  lingerie: { category: 'women', subcategory: 'lingerie' },
  innerwear: { category: 'unisex', subcategory: 'innerwear' },
  sweater: { category: 'unisex', subcategory: 'sweaters' },
  cardigan: { category: 'unisex', subcategory: 'sweaters' },
  tracksuit: { category: 'unisex', subcategory: 'activewear' },
  'track suit': { category: 'unisex', subcategory: 'activewear' },
};

const SUBCATEGORY_OVERRIDE: Record<string, Record<string, string>> = {
  men: {
    shirt: 'shirts', tshirt: 't-shirts', 't-shirt': 't-shirts', polo: 'polos',
    jeans: 'jeans', trouser: 'trousers', pant: 'pants', chino: 'chinos',
    short: 'shorts', jacket: 'jackets', blazer: 'blazers', coat: 'coats',
    suit: 'suits', hoodie: 'hoodies', sweater: 'sweaters', sweat: 'sweatshirts',
    track: 'activewear', ethnic: 'ethnic-wear', kurta: 'kurtas',
    inner: 'innerwear', boxer: 'innerwear', vest: 'innerwear',
    shoe: 'shoes', sneaker: 'sneakers', sandal: 'sandals', boot: 'boots',
    cap: 'caps', watch: 'watches', belt: 'belts', wallet: 'wallets', sunglass: 'sunglasses',
  },
  women: {
    dress: 'dresses', top: 'tops', shirt: 'tops', tshirt: 'tops', 't-shirt': 'tops',
    jeans: 'jeans', trouser: 'trousers', pant: 'pants', chino: 'chinos',
    short: 'shorts', skirt: 'skirts', legging: 'leggings', jeggings: 'leggings',
    jacket: 'jackets', blazer: 'blazers', coat: 'coats', suit: 'suits',
    hoodie: 'hoodies', sweater: 'sweaters', cardigan: 'sweaters',
    kurti: 'kurtas', saree: 'sarees', lehenga: 'lehengas', gown: 'gowns',
    kurta: 'kurtas', salwar: 'kurtas', dupatta: 'dupattas',
    sport: 'activewear', yoga: 'activewear', swim: 'swimwear', bikini: 'swimwear',
    lingerie: 'lingerie', inner: 'innerwear', bra: 'lingerie',
    heel: 'heels', sandal: 'sandals', shoe: 'shoes', boot: 'boots',
    bag: 'bags', clutch: 'bags', earring: 'jewelry', necklace: 'jewelry',
    bracelet: 'jewelry', ring: 'jewelry', chain: 'jewelry', scarf: 'scarves',
    sunglass: 'sunglasses', watch: 'watches', belt: 'belts',
  },
  accessories: {
    cap: 'caps', hat: 'hats', beanie: 'caps',
    bag: 'bags', backpack: 'bags', tote: 'bags', sling: 'bags',
    watch: 'watches', smartwatch: 'watches',
    sunglass: 'sunglasses', glasses: 'eyewear',
    belt: 'belts', wallet: 'wallets', cardholder: 'wallets',
    chain: 'jewelry', necklace: 'jewelry', bracelet: 'jewelry', ring: 'jewelry', earring: 'jewelry',
    scarf: 'scarves', muffler: 'scarves', stole: 'scarves',
    glove: 'gloves', tie: 'ties', bowtie: 'ties', sock: 'socks',
    perfume: 'fragrance', deodorant: 'fragrance',
  },
  footwear: {
    shoe: 'shoes', sneaker: 'sneakers', running: 'sneakers', sport: 'sneakers',
    boot: 'boots', sandal: 'sandals', slipper: 'slippers', flipflop: 'slippers',
    loafer: 'loafers', formal: 'formal-shoes', heel: 'heels', pump: 'heels',
    moccasin: 'loafers', oxford: 'formal-shoes', derby: 'formal-shoes',
  },
  unisex: {
    shirt: 'shirts', tshirt: 't-shirts', 't-shirt': 't-shirts', polo: 'polos',
    hoodie: 'hoodies', sweat: 'sweatshirts', jacket: 'jackets',
    jeans: 'jeans', trouser: 'trousers', pant: 'pants', short: 'shorts',
    shoe: 'shoes', sneaker: 'sneakers', sandal: 'sandals', boot: 'boots',
    cap: 'caps', bag: 'bags', watch: 'watches', sunglass: 'sunglasses',
  },
};

export function autoCategorizeProduct(name: string, description?: string | null): {
  category: string;
  subcategory: string;
  gender: 'male' | 'female' | 'unisex';
} {
  const text = `${name} ${description || ''}`.toLowerCase();
  let category = '';
  let subcategory = 'general';
  let gender: 'male' | 'female' | 'unisex' = 'unisex';

  // 1. Detect gender keywords
  for (const [keyword, detectedGender] of GENDER_KEYWORDS) {
    if (text.includes(keyword)) {
      gender = detectedGender === 'men' ? 'male' : 'female';
      break;
    }
  }

  // 2. Find the best matching clothing type
  let bestMatch = '';
  let bestMatchIdx = text.length;
  for (const [type, mapping] of Object.entries(CLOTHING_TYPE_MAP)) {
    const idx = text.indexOf(type);
    if (idx !== -1 && idx < bestMatchIdx) {
      bestMatch = type;
      bestMatchIdx = idx;
      category = mapping.category;
      subcategory = mapping.subcategory;
    }
  }

  // 3. Apply gender-specific subcategory overrides
  if (category) {
    const genderKey = gender === 'male' ? 'men' : gender === 'female' ? 'women' : 'unisex';
    const override = SUBCATEGORY_OVERRIDE[genderKey]?.[bestMatch];
    if (override) subcategory = override;
    if (gender === 'male' && category === 'women') category = 'men';
    if (gender === 'female' && category === 'men') category = 'women';
    if (category === 'unisex') {
      category = genderKey;
    }
  } else {
    category = gender === 'male' ? 'men' : gender === 'female' ? 'women' : 'unisex';
  }

  return { category, subcategory, gender };
}

export function autoDetectOccasion(name: string, description?: string | null): string[] {
  const text = `${name} ${description || ''}`.toLowerCase();
  const occasions: string[] = [];
  if (/\b(casual|everyday|daily|basic|streetwear|hoodie|jeans|t.?shirt|shorts|sneakers)\b/.test(text)) occasions.push('Casual');
  if (/\b(formal|office|business|professional|blazer|suit|tie|oxford)\b/.test(text)) occasions.push('Formal');
  if (/\b(party|night|club|evening|dress|heels)\b/.test(text)) occasions.push('Party');
  if (/\b(office|business|work|professional)\b/.test(text)) occasions.push('Office');
  if (/\b(wedding|bridal|groom|festive|ethnic|saree|lehenga|kurta)\b/.test(text)) occasions.push('Wedding');
  if (/\b(travel|vacation|holiday|beach|tropical)\b/.test(text)) occasions.push('Travel');
  if (/\b(sport|gym|athletic|activewear|workout|yoga|running)\b/.test(text)) occasions.push('Sports');
  return occasions.length > 0 ? occasions : ['Casual'];
}

export const useDocumentTitle = (title: string, retainOnUnmount = false) => {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = title;

    return () => {
      if (!retainOnUnmount) {
        document.title = originalTitle;
      }
    };
  }, [title, retainOnUnmount]);
};

export const useDebouncedValue = <T>(value: T, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};
