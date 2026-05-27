// AdminProducts — optimized build
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  X,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Star,
  TrendingUp,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  Palette,
  Hash,
  DollarSign,
  Layers,
  GripVertical,
  Copy,

} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  supabaseRestDelete,
  supabaseRestInsert,
  supabaseRestSelect,
  supabaseRestUpdate,
} from '@/integrations/supabase/publicRest';
import { formatPrice } from '@/data/products';
import { normalizeImageUrl, cleanProductTitle, rewriteToLuxuryDescription, autoCategorizeProduct, autoDetectOccasion, generateProductTags } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { createAdminNotification } from '@/lib/adminNotifications';

interface VariantData {
  id: string;
  colorName: string;
  colorHex: string;
  images: string[];
  stock: number;
  price: string;
  sku: string;
}

interface ProductData {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  subcategory: string | null;
  stock_quantity: number;
  image_url: string | null;
  brand?: string;
  fabric?: string;
  description?: string | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  occasion?: string[] | null;
  is_new?: boolean | null;
  is_trending?: boolean | null;
  rating?: number | null;
  reviews_count?: number | null;
  variants?: VariantData[] | null;
}

const PRESET_CATEGORIES = ['men', 'women', 'accessories', 'footwear', 'unisex'];

// Intelligent color name-to-hex mapping for auto-swatch detection
const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  navy: '#1B2A4A',
  grey: '#6B7280',
  gray: '#6B7280',
  charcoal: '#374151',
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  pink: '#EC4899',
  purple: '#7C3AED',
  brown: '#78350F',
  beige: '#F5E6D3',
  cream: '#FFF8E7',
  olive: '#6B8E23',
  maroon: '#800020',
  teal: '#0D9488',
  coral: '#F97316',
  yellow: '#EAB308',
  orange: '#F97316',
  gold: '#D4AF37',
  silver: '#C0C0C0',
  tan: '#D2B48C',
  khaki: '#C3B091',
  ivory: '#FFFFF0',
  wine: '#722F37',
  burgundy: '#800020',
  mint: '#98FF98',
  peach: '#FFDAB9',
  lavender: '#E6E6FA',
  turquoise: '#40E0D0',
  indigo: '#4B0082',
  violet: '#8B00FF',
  rose: '#FF007F',
  salmon: '#FA8072',
  chocolate: '#7B3F00',
  camel: '#C19A6B',
  rust: '#B7410E',
  blush: '#DE5D83',
  nude: '#E8C7B5',
  denim: '#1565C0',
  slate: '#708090',
  bronze: '#CD7F32',
  champagne: '#F7E7CE',
  emerald: '#50C878',
  forest: '#228B22',
  sky: '#87CEEB',
  royal: '#4169E1',
  midnight: '#191970',
  steel: '#4682B4',
};

function detectColorHex(colorName: string): string | null {
  if (!colorName) return null;
  const n = colorName.toLowerCase().trim();
  if (COLOR_NAME_TO_HEX[n]) return COLOR_NAME_TO_HEX[n];
  const sorted = Object.keys(COLOR_NAME_TO_HEX).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (n.includes(key)) return COLOR_NAME_TO_HEX[key];
  }
  return null;
}

const PRESET_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Brown', hex: '#78350F' },
  { name: 'Beige', hex: '#F5E6D3' },
  { name: 'Cream', hex: '#FFF8E7' },
  { name: 'Olive', hex: '#6B8E23' },
  { name: 'Maroon', hex: '#800020' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Coral', hex: '#F97316' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

let variantIdCounter = 0;
const createVariantId = () => `variant-${Date.now()}-${++variantIdCounter}`;

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [queryErrorMessage, setQueryErrorMessage] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'inventory' | 'variants' | 'seo'>('general');

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    original_price: '',
    category: 'men',
    subcategory: '',
    brand: '',
    fabric: '',
    description: '',
    occasion: '',
    stock: '',
    is_new: false,
    is_trending: false,
    rating: '4.5',
    reviews_count: '0',
  });

  const [variants, setVariants] = useState<VariantData[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      // Only fetch columns needed for the table — avoids loading massive variants JSON
      const params = new URLSearchParams({
        select: 'id,name,price,original_price,category,stock_quantity,image_url,is_new,is_trending,brand,sizes,colors,variants',
        order: 'created_at.desc',
      });
      const data = await supabaseRestSelect<ProductData[]>('products', params);
      setQueryErrorMessage(null);
      return data;
    },
    onError: (error: Error) => {
      setQueryErrorMessage(error.message || 'Failed to load products from Supabase.');
    },
    staleTime: 30_000,  // Cache for 30s — avoid refetch on every focus
    retry: 1,
  });

  const stats = useMemo(() => {
    const total = dbProducts.length;
    const lowStock = dbProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
    const outOfStock = dbProducts.filter(p => p.stock_quantity === 0).length;
    const trending = dbProducts.filter(p => p.is_trending).length;

    return [
      { label: 'Total', value: total, icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { label: 'Low Stock', value: lowStock, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Out of Stock', value: outOfStock, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10' },
      { label: 'Trending', value: trending, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];
  }, [dbProducts]);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [dbProducts, searchQuery, categoryFilter]);

  type ProductFormValues = Omit<ProductData, 'id'>;

  const addMutation = useMutation({
    mutationFn: async (newProduct: ProductFormValues) => {
      // Explicitly omit 'id' at runtime — Postgres uses DEFAULT gen_random_uuid()
      // Sending id:null or id:undefined overrides the DEFAULT and causes 23502 NOT NULL violation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _stripId, ...safePayload } = newProduct as ProductFormValues & { id?: unknown };
      const data = await supabaseRestInsert<ProductData[]>('products', [safePayload]);
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      createAdminNotification({
        title: 'Product added',
        message: `${formData.name.trim() || 'A new product'} is now live in the catalog.`,
        type: 'success',
        eventType: 'product_added',
        link: '/admin/products',
      }).catch(() => {});
      toast({ title: '✓ Product Added Successfully' });
      setShowModal(false);
      resetForm();
    },
    onError: (error: unknown) => {
      // Surface full Supabase error — code + message
      const err = error as { message?: string; code?: string; details?: string };
      const detail = [err.code, err.message, err.details].filter(Boolean).join(' — ');
      toast({ title: 'Failed to Add Product', description: detail || 'Unknown error', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductFormValues> }) => {
      // Strip id from the updates payload — we never want to send id in a PATCH body
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _stripId, ...safeUpdates } = updates as Partial<ProductFormValues> & { id?: unknown };
      const params = new URLSearchParams({ id: `eq.${id}` });
      const data = await supabaseRestUpdate<ProductData[]>('products', safeUpdates, params);
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast({ title: '✓ Product Updated Successfully' });
      setShowModal(false);
      resetForm();
    },
    onError: (error: unknown) => {
      const err = error as { message?: string; code?: string; details?: string };
      const detail = [err.code, err.message, err.details].filter(Boolean).join(' — ');
      toast({ title: 'Failed to Update Product', description: detail || 'Unknown error', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const params = new URLSearchParams({ id: `eq.${id}` });
      await supabaseRestDelete('products', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast({ title: 'Product Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error Deleting Product', description: error.message, variant: 'destructive' });
    },
  });



  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      original_price: '',
      category: 'men',
      subcategory: '',
      brand: '',
      fabric: '',
      description: '',
      occasion: '',
      stock: '',
      is_new: false,
      is_trending: false,
      rating: '4.5',
      reviews_count: '0',
    });
    setVariants([]);
    setSelectedSizes([]);
    setIsCustomCategory(false);
    setCustomCategory('');
    setSelectedProduct(null);
    setIsEditing(false);
    setPreviewImageIndex(0);
    setSelectedVariantIndex(0);
    setActiveTab('general');
    setQueryErrorMessage(null);
  };

  const handleEditClick = (product: ProductData) => {
    setSelectedProduct(product);
    const isCustom = !PRESET_CATEGORIES.includes(product.category);
    setIsCustomCategory(isCustom);
    if (isCustom) setCustomCategory(product.category);

    setFormData({
      name: product.name,
      price: product.price.toString(),
      original_price: (product.original_price || '').toString(),
      category: isCustom ? 'custom' : product.category,
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      fabric: product.fabric || '',
      description: product.description || '',
      occasion: (product.occasion || []).join(', '),
      stock: product.stock_quantity?.toString() || '',
      is_new: product.is_new || false,
      is_trending: product.is_trending || false,
      rating: (product.rating || 4.5).toString(),
      reviews_count: (product.reviews_count || 0).toString(),
    });

    setSelectedSizes(product.sizes || []);

    if (product.variants && product.variants.length > 0) {
      setVariants(product.variants.map(v => ({ ...v, id: createVariantId() })));
    } else {
      setVariants([]);
    }

    setIsEditing(true);
    setShowModal(true);
    setPreviewImageIndex(0);
    setSelectedVariantIndex(0);
    setActiveTab('general');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Manual validation — works regardless of which tab is active
    if (!formData.name.trim()) {
      toast({ title: 'Product name is required', variant: 'destructive' });
      setActiveTab('general');
      return;
    }

    const hasVariants = variants.length > 0;
    if (!hasVariants && !formData.price) {
      toast({ title: 'Price is required', variant: 'destructive' });
      setActiveTab('inventory');
      return;
    }
    if (hasVariants && variants.some(v => !v.price || parseFloat(v.price) <= 0)) {
      toast({ title: 'All variants must have a price', variant: 'destructive' });
      setActiveTab('variants');
      return;
    }

    // Auto-detect category if not explicitly set
    const autoCat = autoCategorizeProduct(formData.name, formData.description);
    const manualCategory = isCustomCategory && customCategory.trim() ? customCategory.trim().toLowerCase() : formData.category;
    const finalCategory = manualCategory || autoCat.category;

    const totalStock = hasVariants
      ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : parseInt(formData.stock) || 0;
    const allImages = hasVariants ? variants.flatMap(v => v.images) : [];
    const allColors = hasVariants ? variants.map(v => v.colorName).filter(Boolean) : null;
    const lowestPrice = hasVariants
      ? variants.reduce((min, v) => {
          const p = parseFloat(v.price);
          return !isNaN(p) && p < min ? p : min;
        }, Infinity)
      : Infinity;

    const cleanData: ProductFormValues = {
      name: formData.name,
      price: hasVariants && isFinite(lowestPrice)
        ? lowestPrice
        : parseFloat(formData.price) || 0,
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      category: finalCategory,
      subcategory: formData.subcategory || null,
      stock_quantity: totalStock,
      image_url: allImages[0] || null,
      brand: formData.brand || null,
      fabric: formData.fabric || null,
      description: formData.description || null,
      colors: allColors,
      sizes: selectedSizes.length > 0 ? selectedSizes : null,
      occasion: formData.occasion
        ? formData.occasion.split(',').map(t => t.trim()).filter(Boolean)
        : formData.description ? autoDetectOccasion(formData.name, formData.description) : null,
      is_new: formData.is_new,
      is_trending: formData.is_trending,
      rating: parseFloat(formData.rating) || 0,
      reviews_count: parseInt(formData.reviews_count) || 0,
      variants: hasVariants ? variants.map(v => ({
        id: v.id,
        colorName: v.colorName,
        colorHex: v.colorHex,
        images: v.images,
        stock: v.stock,
        price: v.price,
        sku: v.sku,
      })) : null,
    };

    if (isEditing && selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, updates: cleanData });
    } else {
      addMutation.mutate(cleanData);
    }
  };

  const addVariant = () => {
    const idx = variants.length;
    const defaultColor = PRESET_COLORS[idx % PRESET_COLORS.length];
    setVariants(prev => [...prev, {
      id: createVariantId(),
      colorName: defaultColor.name,
      colorHex: defaultColor.hex,
      images: [],
      stock: 0,
      price: formData.price || '0',
      sku: '',
    }]);
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, updates: Partial<VariantData>) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const handleVariantImageUpload = async (variantId: string, file: File) => {
    if (!file) return;

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Only JPEG, PNG, WebP, and GIF images are allowed.`,
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: `Image must be under ${MAX_SIZE_MB}MB. This file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Uploading image...' });
    try {
      // Use flat root path — consistent with existing files in the bucket
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${Date.now()}-${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,          // avoids 409 conflicts on re-upload
          contentType: file.type,
        });

      if (error) {
        // Surface the EXACT Supabase error — statusCode, message, error name
        const detail = `${error.message}${(error as any).statusCode ? ` (HTTP ${(error as any).statusCode})` : ''}`;
        console.error('[Supabase Upload Error]', error);
        toast({
          title: 'Upload failed',
          description: detail,
          variant: 'destructive',
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(data.path);

      setVariants(prev =>
        prev.map(v =>
          v.id === variantId ? { ...v, images: [...v.images, publicUrl] } : v
        )
      );
      toast({ title: '✓ Image uploaded successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected upload error';
      console.error('[Upload Exception]', err);
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    }
  };

  const removeVariantImage = (variantId: string, index: number) => {
    setVariants(prev => prev.map(v =>
      v.id === variantId ? { ...v, images: v.images.filter((_, i) => i !== index) } : v
    ));
  };

  const duplicateVariant = (id: string) => {
    const source = variants.find(v => v.id === id);
    if (source) {
      setVariants(prev => [...prev, { ...source, id: createVariantId(), colorName: `${source.colorName} Copy` }]);
    }
  };

  const previewColors = useMemo(() =>
    variants.map(v => v.colorName).filter(Boolean),
  [variants]);

  const previewImages = useMemo(() => {
    if (variants[selectedVariantIndex]?.images?.length) {
      return variants[selectedVariantIndex].images;
    }
    return variants.flatMap(v => v.images);
  }, [variants, selectedVariantIndex]);

  const previewDiscount = useMemo(() => {
    const price = parseFloat(variants[selectedVariantIndex]?.price || formData.price) || 0;
    const original = parseFloat(formData.original_price) || 0;
    if (original > price && original > 0) {
      return Math.round(((original - price) / original) * 100);
    }
    return 0;
  }, [variants, selectedVariantIndex, formData.price, formData.original_price]);

  const previewCategory = isCustomCategory && customCategory.trim() ? customCategory.trim().toLowerCase() : formData.category;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Products</h1>
            <p className="text-muted-foreground font-light">Manage your product catalog and inventory.</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus size={20} />
            Add New Product
          </motion.button>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-card border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name..."
              className="w-full bg-muted border border-border h-11 pl-11 pr-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['all', 'men', 'women', 'accessories', 'footwear'].map((cat, i) => (
              <motion.button
                key={cat}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-medium capitalize border transition-all whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-md shadow-indigo-500/20'
                    : 'bg-card text-muted-foreground border-border hover:border-indigo-500/30 hover:text-foreground'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="space-y-4">
          {queryErrorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-sm text-rose-500 flex items-center gap-3"
            >
              <AlertCircle size={18} />
              {queryErrorMessage}
            </motion.div>
          )}

          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-64 flex-col items-center justify-center gap-4"
            >
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500/50" />
              <p className="text-muted-foreground text-sm">Loading products...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gradient-to-r from-muted/80 to-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No products found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-14 bg-muted rounded-lg overflow-hidden border border-border flex-shrink-0">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                    <ImageIcon size={20} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {product.is_new && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-medium">New</span>
                                  )}
                                  {product.is_trending && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-medium">Trending</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium">{formatPrice(product.price)}</p>
                            {product.original_price && product.original_price > product.price && (
                              <p className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  product.stock_quantity === 0 ? 'bg-rose-500' :
                                  product.stock_quantity <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              <span className="text-sm">{product.stock_quantity} in stock</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(product)}
                                className="p-2 hover:bg-indigo-500/10 rounded-lg text-muted-foreground hover:text-indigo-500 transition-colors"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => { if (window.confirm('Delete this product permanently?')) deleteMutation.mutate(product.id); }}
                                className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 md:p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="bg-card border border-border rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Package className="w-6 h-6 text-indigo-500" />
                    </motion.div>
                    <h2 className="text-xl font-bold">
                      {isEditing ? 'Edit Product' : 'Add New Product'}
                    </h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    <X size={20} />
                  </motion.button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">

                  <form id="product-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="flex items-center gap-2 border-b border-border/50 pb-4 mb-4 overflow-x-auto custom-scrollbar">
                        {['general', 'inventory', 'variants', 'seo'].map(tab => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 text-sm font-semibold capitalize rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      <div className={activeTab === 'general' ? 'space-y-6' : 'hidden'}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Product Name <span className="text-rose-500">*</span></label>
                            <input
                              required
                              type="text"
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              placeholder="e.g. Premium Cotton Shirt"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Brand</label>
                            <input
                              type="text"
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              placeholder="e.g. SWITCH"
                              value={formData.brand}
                              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <textarea
                            rows={3}
                            className="w-full bg-muted border border-border px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                            placeholder="Write a compelling product description..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>
                      </motion.div>
                      </div>

                      <div className={activeTab === 'inventory' ? 'space-y-6' : 'hidden'}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pricing & Stock</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Base Price (₹) <span className="text-rose-500">*</span></label>
                            <input
                              required
                              type="number"
                              min={0}
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Original Price (₹)</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              placeholder="e.g. 1799"
                              value={formData.original_price}
                              onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                            />
                          </div>
                          {variants.length === 0 && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Stock <span className="text-rose-500">*</span></label>
                              <input
                                type="number"
                                min={0}
                                className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="e.g. 50"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                      </div>

                      <div className={activeTab === 'general' ? 'space-y-6' : 'hidden'}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Category & Classification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            {!isCustomCategory ? (
                              <div className="flex gap-2">
                                <select
                                  className="flex-1 bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                  value={formData.category}
                                  onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                      setIsCustomCategory(true);
                                    } else {
                                      setFormData({ ...formData, category: e.target.value });
                                    }
                                  }}
                                >
                                  {PRESET_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                  ))}
                                  <option value="custom">+ Add New Category</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  autoFocus
                                  className="flex-1 bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                  placeholder="Enter new category name"
                                  value={customCategory}
                                  onChange={(e) => setCustomCategory(e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => { setIsCustomCategory(false); setCustomCategory(''); }}
                                  className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg border border-border"
                                >
                                  Back
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Subcategory</label>
                            <input
                              type="text"
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              placeholder="e.g. shirts, dresses, sneakers"
                              value={formData.subcategory}
                              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Fabric</label>
                            <input
                              type="text"
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              placeholder="e.g. 100% Premium Cotton"
                              value={formData.fabric}
                              onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Occasion (comma separated)</label>
                            <input
                              type="text"
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              placeholder="Casual, Office, Party"
                              value={formData.occasion}
                              onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                            />
                          </div>
                        </div>
                      </motion.div>
                      </div>

                      <div className={activeTab === 'inventory' ? 'space-y-6' : 'hidden'}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.22 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Hash size={14} />
                          Sizes
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(s => (
                            <motion.button
                              key={s}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedSizes(prev =>
                                prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                              )}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                                selectedSizes.includes(s)
                                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                                  : 'bg-card text-muted-foreground border-border/60 hover:border-indigo-500/30 hover:text-foreground'
                              }`}
                            >
                              {s}
                            </motion.button>
                          ))}
                        </div>
                        {selectedSizes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSizes.map(s => (
                              <span
                                key={s}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-medium"
                              >
                                {s}
                                <button
                                  type="button"
                                  onClick={() => setSelectedSizes(prev => prev.filter(x => x !== s))}
                                  className="hover:text-indigo-700"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                      </div>

                      <div className={activeTab === 'variants' ? 'space-y-6' : 'hidden'}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.28 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Layers size={14} />
                            Variants
                          </h3>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={addVariant}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
                          >
                            <Plus size={14} />
                            Add Variant
                          </motion.button>
                        </div>

                        {variants.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 text-center bg-muted/30 border-2 border-dashed border-border rounded-xl"
                          >
                            <Palette size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">No variants yet. Click "Add Variant" to create product options.</p>
                          </motion.div>
                        ) : (
                          <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                              {variants.map((variant, vIdx) => (
                                <motion.div
                                  key={variant.id}
                                  layout
                                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                  className="relative bg-gradient-to-br from-card via-card to-muted/30 border border-border/60 rounded-xl p-5 shadow-lg shadow-black/5 backdrop-blur-sm group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent rounded-xl pointer-events-none" />

                                  <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <GripVertical size={16} className="text-muted-foreground/30 cursor-grab" />
                                        <div
                                          className="w-6 h-6 rounded-full border-2 border-border shadow-sm"
                                          style={{ backgroundColor: variant.colorHex }}
                                        />
                                        <span className="text-sm font-semibold">
                                          Variant {vIdx + 1}
                                          {variant.colorName && <span className="text-muted-foreground font-normal"> — {variant.colorName}</span>}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <motion.button
                                          type="button"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => duplicateVariant(variant.id)}
                                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                                          title="Duplicate variant"
                                        >
                                          <Copy size={14} />
                                        </motion.button>
                                        <motion.button
                                          type="button"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => removeVariant(variant.id)}
                                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                          title="Remove variant"
                                        >
                                          <Trash2 size={14} />
                                        </motion.button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Color Name</label>
                                        <input
                                          type="text"
                                          className="w-full bg-background/80 border border-border/60 h-9 px-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                          placeholder="e.g. Navy Blue"
                                          value={variant.colorName}
                                          onChange={(e) => {
                                            const newName = e.target.value;
                                            const updates: Partial<VariantData> = { colorName: newName };
                                            const detected = detectColorHex(newName);
                                            if (detected) updates.colorHex = detected;
                                            updateVariant(variant.id, updates);
                                          }}
                                        />
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Color Swatch</label>
                                        <div className="flex items-center gap-2">
                                          <div className="relative">
                                            <input
                                              type="color"
                                              value={variant.colorHex}
                                              onChange={(e) => updateVariant(variant.id, { colorHex: e.target.value })}
                                              className="w-9 h-9 rounded-lg border border-border/60 cursor-pointer bg-transparent p-0.5"
                                            />
                                          </div>
                                          <div className="flex-1 flex flex-wrap gap-1">
                                            {PRESET_COLORS.slice(0, 8).map((pc) => (
                                              <button
                                                key={pc.hex}
                                                type="button"
                                                onClick={() => updateVariant(variant.id, { colorHex: pc.hex })}
                                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                                  variant.colorHex === pc.hex ? 'border-foreground scale-110' : 'border-border/40 hover:border-foreground/50'
                                                }`}
                                                style={{ backgroundColor: pc.hex }}
                                                title={pc.name}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Stock</label>
                                        <input
                                          type="number"
                                          min={0}
                                          className="w-full bg-background/80 border border-border/60 h-9 px-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                          placeholder="0"
                                          value={variant.stock}
                                          onChange={(e) => updateVariant(variant.id, { stock: parseInt(e.target.value) || 0 })}
                                        />
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Price (₹)</label>
                                        <input
                                          type="number"
                                          min={0}
                                          className="w-full bg-background/80 border border-border/60 h-9 px-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                          placeholder="0"
                                          value={variant.price}
                                          onChange={(e) => updateVariant(variant.id, { price: e.target.value })}
                                        />
                                      </div>

                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">SKU</label>
                                        <input
                                          type="text"
                                          className="w-full bg-background/80 border border-border/60 h-9 px-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                          placeholder="e.g. SHIRT-BLK-001"
                                          value={variant.sku}
                                          onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                        Images ({variant.images.length})
                                      </label>
                                      <div className="flex flex-wrap gap-2">
                                        {variant.images.map((img, imgIdx) => (
                                          <motion.div
                                            key={imgIdx}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            layout
                                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/60 group/image"
                                          >
                                            <img
                                              src={normalizeImageUrl(img)}
                                              alt={`${variant.colorName} ${imgIdx + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                            <motion.button
                                              type="button"
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              onClick={() => removeVariantImage(variant.id, imgIdx)}
                                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity"
                                            >
                                              <X size={12} className="text-white" />
                                            </motion.button>
                                          </motion.div>
                                        ))}
                                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border/60 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all">
                                          <Upload size={14} className="text-muted-foreground/50" />
                                          <span className="text-[8px] text-muted-foreground/50 mt-0.5">Upload</span>
                                          <span className="text-[6px] text-muted-foreground/30 -mt-0.5">multi</span>
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => {
                                              const files = e.target.files;
                                              if (files) {
                                                Array.from(files).forEach(f => handleVariantImageUpload(variant.id, f));
                                              }
                                              e.currentTarget.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                      </div>

                      <div className={activeTab === 'seo' ? 'space-y-6' : 'hidden'}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rating & Flags</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rating (0-5)</label>
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.1}
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              value={formData.rating}
                              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Reviews Count</label>
                            <input
                              type="number"
                              min={0}
                              className="w-full bg-muted border border-border h-10 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              value={formData.reviews_count}
                              onChange={(e) => setFormData({ ...formData, reviews_count: e.target.value })}
                            />
                          </div>
                          <label className="flex items-center gap-3 p-3 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-lg border border-indigo-500/20 cursor-pointer hover:from-indigo-500/10 transition-all">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-indigo-500"
                              checked={formData.is_new}
                              onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                            />
                            <div>
                              <p className="text-sm font-medium">New Arrival</p>
                              <p className="text-[10px] text-muted-foreground">Show "New" badge</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-lg border border-emerald-500/20 cursor-pointer hover:from-emerald-500/10 transition-all">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-emerald-500"
                              checked={formData.is_trending}
                              onChange={(e) => setFormData({ ...formData, is_trending: e.target.checked })}
                            />
                            <div>
                              <p className="text-sm font-medium">Trending</p>
                              <p className="text-[10px] text-muted-foreground">Show "Trending" badge</p>
                            </div>
                          </label>
                        </div>
                      </motion.div>
                      </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="w-full lg:w-80 shrink-0 space-y-4"
                    >
                      <div className="sticky top-0 space-y-4">
                        <div className="flex items-center gap-2">
                          <Eye size={16} className="text-indigo-500" />
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</h3>
                        </div>

                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                          <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                            {previewImages.length > 0 ? (
                              <motion.img
                                key={`${selectedVariantIndex}-${previewImageIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                src={normalizeImageUrl(previewImages[previewImageIndex])}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
                                <ImageIcon size={40} />
                                <span className="text-xs">No image</span>
                              </div>
                            )}

                            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                              <AnimatePresence>
                                {formData.is_new && (
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded"
                                  >
                                    New
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <AnimatePresence>
                                {previewDiscount > 0 && (
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider rounded"
                                  >
                                    -{previewDiscount}%
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <AnimatePresence>
                                {formData.is_trending && (
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1"
                                  >
                                    <Sparkles size={10} />
                                    Trending
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>

                            {previewImages.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageIndex(prev => (prev - 1 + previewImages.length) % previewImages.length)}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 backdrop-blur rounded-full hover:bg-background transition-colors"
                                >
                                  <ChevronLeft size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageIndex(prev => (prev + 1) % previewImages.length)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 backdrop-blur rounded-full hover:bg-background transition-colors"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </>
                            )}
                          </div>

                          <div className="p-4 space-y-3">
                            <div>
                              <h4 className="text-sm font-medium line-clamp-1">{formData.name || 'Product Name'}</h4>
                              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{previewCategory} {formData.subcategory ? `· ${formData.subcategory}` : ''}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">
                                {variants[selectedVariantIndex]?.price
                                  ? formatPrice(parseFloat(variants[selectedVariantIndex].price))
                                  : formData.price
                                    ? formatPrice(parseFloat(formData.price))
                                    : '₹0'}
                              </span>
                              {formData.original_price && parseFloat(formData.original_price) > (parseFloat(variants[selectedVariantIndex]?.price || formData.price) || 0) && (
                                <span className="text-xs text-muted-foreground line-through">{formatPrice(parseFloat(formData.original_price))}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i < Math.round(parseFloat(formData.rating) || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {formData.rating} ({formData.reviews_count} reviews)
                              </span>
                            </div>

                            {variants.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Colors</p>
                                <div className="flex flex-wrap gap-2">
                                  {variants.map((v, vIdx) => (
                                    <motion.button
                                      key={v.id}
                                      type="button"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => { setSelectedVariantIndex(vIdx); setPreviewImageIndex(0); }}
                                      className="relative"
                                      title={v.colorName}
                                    >
                                      <div
                                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                                          selectedVariantIndex === vIdx
                                            ? 'border-foreground scale-110 shadow-md'
                                            : 'border-border/60 hover:border-foreground/50'
                                        }`}
                                        style={{ backgroundColor: v.colorHex }}
                                      />
                                      {selectedVariantIndex === vIdx && (
                                        <motion.div
                                          layoutId="variant-ring"
                                          className="absolute -inset-1 rounded-full border-2 border-indigo-500"
                                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                        />
                                      )}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}



                            {formData.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {formData.description}
                              </p>
                            )}

                            <button
                              type="button"
                              className="w-full py-2 border border-foreground text-foreground text-[10px] uppercase tracking-widest font-medium flex items-center justify-center gap-2 opacity-50 cursor-default"
                            >
                              Quick Add
                            </button>
                          </div>
                        </div>

                        {previewImages.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {previewImages.map((img, idx) => (
                              <motion.button
                                key={idx}
                                type="button"
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setPreviewImageIndex(idx)}
                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                                  previewImageIndex === idx ? 'border-indigo-500' : 'border-border'
                                }`}
                              >
                                <img src={normalizeImageUrl(img)} alt="" className="w-full h-full object-cover" />
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </form>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="px-6 py-4 border-t border-border bg-gradient-to-r from-muted/50 to-muted/20 flex items-center justify-end gap-3 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={addMutation.isPending || updateMutation.isPending}
                    onClick={() => handleSubmit()}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                  >
                    {(addMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <span>{isEditing ? 'Save Changes' : 'Add Product'}</span>
                    )}
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
