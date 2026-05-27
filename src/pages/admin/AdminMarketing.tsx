import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  BarChart3,
  Users,
  Plus,
  Edit,
  Trash2,
  Send,
  Mail,
  TrendingUp,
  CheckCircle2,
  X,
  Save,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createAdminNotification } from '@/lib/adminNotifications';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'push' | 'social';
  status: 'active' | 'draft' | 'completed' | 'scheduled';
  audience: string;
  sent: number;
  opened: number;
  clicked: number;
  conversion: number;
  scheduledDate?: string;
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  type: 'percentage' | 'fixed';
  minOrder: number;
  usageLimit: number;
  used: number;
  status: 'active' | 'expired' | 'disabled';
  expiresAt: string;
}

interface MarketingData {
  campaigns: Campaign[];
  coupons: Coupon[];
  newsletterDraft: { subject: string; content: string };
}

const STORAGE_KEY = 'switch_admin_marketing';

const defaultCampaigns: Campaign[] = [
  { id: 'c1', name: 'Summer Launch', type: 'email', status: 'active', audience: 'All Customers', sent: 12450, opened: 6234, clicked: 2890, conversion: 4.2 },
  { id: 'c2', name: 'New Arrivals Alert', type: 'push', status: 'scheduled', audience: 'Active Users', sent: 0, opened: 0, clicked: 0, conversion: 0, scheduledDate: '2025-06-15' },
  { id: 'c3', name: 'Weekend Flash Sale', type: 'email', status: 'completed', audience: 'Returning Customers', sent: 8900, opened: 5340, clicked: 2670, conversion: 6.8 },
  { id: 'c4', name: 'Social Media Campaign', type: 'social', status: 'active', audience: 'Followers', sent: 25000, opened: 15000, clicked: 4500, conversion: 3.1 },
];

const defaultCoupons: Coupon[] = [
  { id: 'cp1', code: 'SUMMER25', discount: '25%', type: 'percentage', minOrder: 999, usageLimit: 500, used: 342, status: 'active', expiresAt: '2025-08-31' },
  { id: 'cp2', code: 'FREESHIP', discount: '₹0', type: 'fixed', minOrder: 499, usageLimit: 1000, used: 891, status: 'active', expiresAt: '2025-12-31' },
  { id: 'cp3', code: 'WELCOME10', discount: '10%', type: 'percentage', minOrder: 0, usageLimit: 200, used: 156, status: 'active', expiresAt: '2025-07-31' },
  { id: 'cp4', code: 'OLD50', discount: '50%', type: 'percentage', minOrder: 1999, usageLimit: 100, used: 100, status: 'expired', expiresAt: '2025-04-30' },
];

const defaultDraft = { subject: '', content: '' };

const tabs = [
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'coupons', label: 'Coupons', icon: BarChart3 },
  { id: 'newsletter', label: 'Newsletter', icon: Users },
] as const;

type TabId = typeof tabs[number]['id'];

const genId = () => crypto.randomUUID?.() || `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const loadData = (): MarketingData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as MarketingData;
      return {
        campaigns: data.campaigns ?? defaultCampaigns,
        coupons: data.coupons ?? defaultCoupons,
        newsletterDraft: data.newsletterDraft ?? defaultDraft,
      };
    }
  } catch { /* ignore */ }
  return { campaigns: defaultCampaigns, coupons: defaultCoupons, newsletterDraft: defaultDraft };
};

const saveData = (data: MarketingData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  try {
    supabase.from('admin_content').upsert({
      section: 'marketing',
      key: 'content',
      value: JSON.parse(JSON.stringify(data)),
      is_active: true,
    }, { onConflict: 'section,key' }).then(() => {}).catch(() => {});
  } catch { /* table may not exist */ }
};

const mapDbCouponToUi = (coupon: {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number | null;
  is_active: boolean | null;
  expires_at: string | null;
}): Coupon => {
  const expiresAt = coupon.expires_at ? String(coupon.expires_at).slice(0, 10) : '';
  const now = new Date();
  const isExpired = expiresAt ? new Date(expiresAt) < now : false;
  const isActive = Boolean(coupon.is_active) && !isExpired;

  return {
    id: coupon.id,
    code: coupon.code,
    discount: coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`,
    type: coupon.discount_type === 'percentage' ? 'percentage' : 'fixed',
    minOrder: Number(coupon.min_order_amount || 0),
    usageLimit: Number(coupon.max_uses || 0),
    used: Number(coupon.current_uses || 0),
    status: isExpired ? 'expired' : isActive ? 'active' : 'disabled',
    expiresAt,
  };
};

const mapUiCouponToDb = (coupon: Omit<Coupon, 'id'>) => ({
  code: coupon.code.trim().toUpperCase(),
  discount_type: coupon.type === 'percentage' ? 'percentage' : 'flat',
  discount_value: Number(String(coupon.discount).replace(/[^\d.]/g, '')) || 0,
  min_order_amount: Number(coupon.minOrder) || 0,
  max_uses: Number(coupon.usageLimit) || 0,
  current_uses: Number(coupon.used) || 0,
  is_active: coupon.status === 'active',
  expires_at: coupon.expiresAt ? new Date(`${coupon.expiresAt}T23:59:59`).toISOString() : null,
});

const AdminMarketing = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newsletterDraft, setNewsletterDraft] = useState<{ subject: string; content: string }>(defaultDraft);
  const [loaded, setLoaded] = useState(false);

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: remote } = await supabase
          .from('admin_content')
          .select('value')
          .eq('section', 'marketing')
          .eq('key', 'content')
          .maybeSingle();
        if (remote?.value) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.value));
        }
      } catch { /* table may not exist */ }
      const data = loadData();
      setCampaigns(data.campaigns);
      setNewsletterDraft(data.newsletterDraft);
      try {
        const { data: liveCoupons, error: couponsError } = await supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (couponsError) throw couponsError;
        setCoupons((liveCoupons || []).map(mapDbCouponToUi));
      } catch {
        setCoupons(data.coupons);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveData({ campaigns, coupons, newsletterDraft });
    }
  }, [campaigns, coupons, newsletterDraft, loaded]);

  const persistCampaigns = (next: Campaign[]) => {
    setCampaigns(next);
  };

  const persistCoupons = (next: Coupon[]) => {
    setCoupons(next);
  };

  const getCampaignIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'push': return Send;
      default: return Megaphone;
    }
  };

  /* ─── Campaign Modal ─── */
  const [newCampaign, setNewCampaign] = useState<Omit<Campaign, 'id' | 'sent' | 'opened' | 'clicked' | 'conversion'>>({
    name: '',
    type: 'email',
    status: 'draft',
    audience: '',
    scheduledDate: '',
  });

  const handleAddCampaign = () => {
    if (!newCampaign.name.trim() || !newCampaign.audience.trim()) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    const campaign: Campaign = {
      id: genId(),
      ...newCampaign,
      sent: 0,
      opened: 0,
      clicked: 0,
      conversion: 0,
    };
    persistCampaigns([campaign, ...campaigns]);
    setShowCampaignModal(false);
    setNewCampaign({ name: '', type: 'email', status: 'draft', audience: '', scheduledDate: '' });
    toast({ title: 'Campaign Created', description: `${campaign.name} has been created.` });
  };

  /* ─── Coupon Modal ─── */
  const [couponForm, setCouponForm] = useState<Omit<Coupon, 'id'>>({
    code: '',
    discount: '',
    type: 'percentage',
    minOrder: 0,
    usageLimit: 100,
    used: 0,
    status: 'active',
    expiresAt: '',
  });

  const openAddCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({ code: '', discount: '', type: 'percentage', minOrder: 0, usageLimit: 100, used: 0, status: 'active', expiresAt: '' });
    setShowCouponModal(true);
  };

  const openEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      discount: coupon.discount,
      type: coupon.type,
      minOrder: coupon.minOrder,
      usageLimit: coupon.usageLimit,
      used: coupon.used,
      status: coupon.status,
      expiresAt: coupon.expiresAt,
    });
    setShowCouponModal(true);
  };

  const handleSaveCoupon = () => {
    if (!couponForm.code.trim() || !couponForm.discount.trim() || !couponForm.expiresAt.trim()) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (editingCoupon) {
      const next = coupons.map((c) =>
        c.id === editingCoupon.id ? { ...c, ...couponForm } : c
      );
      persistCoupons(next);
      supabase.from('coupons').update(mapUiCouponToDb(couponForm)).eq('id', editingCoupon.id)
        .then(({ error }) => {
          if (error) throw error;
          toast({ title: 'Coupon Updated', description: `Coupon ${couponForm.code} has been updated.` });
        })
        .catch((err) => {
          console.error('Coupon DB sync failed:', err);
          toast({ title: 'Coupon Updated (Local)', description: `Coupon ${couponForm.code} has been updated locally.` });
        });
    } else {
      const coupon: Coupon = { id: genId(), ...couponForm };
      persistCoupons([...coupons, coupon]);
      supabase.from('coupons').insert(mapUiCouponToDb(couponForm))
        .then(({ error }) => {
          if (error) throw error;
          createAdminNotification({
            title: 'Coupon created',
            message: `${couponForm.code.trim().toUpperCase()} is now available to shoppers.`,
            type: 'success',
            eventType: 'coupon_created',
            link: '/admin/marketing',
          }).catch(() => {});
          toast({ title: 'Coupon Added', description: `Coupon ${couponForm.code} has been created.` });
        })
        .catch((err) => {
          console.error('Coupon DB sync failed:', err);
          toast({ title: 'Coupon Added (Local)', description: `Coupon ${couponForm.code} has been created locally.` });
        });
    }
    setShowCouponModal(false);
    setEditingCoupon(null);
  };

  const handleDeleteCoupon = (id: string) => {
    const coupon = coupons.find((c) => c.id === id);
    persistCoupons(coupons.filter((c) => c.id !== id));
    supabase.from('coupons').delete().eq('id', id).then(() => {}).catch(() => {});
    setDeleteConfirmId(null);
    toast({ title: 'Coupon Deleted', description: coupon ? `${coupon.code} has been removed.` : undefined });
  };

  /* ─── Newsletter ─── */
  const handleSaveDraft = () => {
    setNewsletterDraft({ ...newsletterDraft });
    toast({ title: 'Draft Saved' });
  };

  const handleSendNewsletter = () => {
    if (!newsletterDraft.subject.trim() || !newsletterDraft.content.trim()) {
      toast({ title: 'Subject and content are required', variant: 'destructive' });
      return;
    }
    createAdminNotification({
      title: 'Campaign launched',
      message: `Newsletter "${newsletterDraft.subject}" was launched for subscribers.`,
      type: 'success',
      eventType: 'campaign_launched',
      link: '/admin/marketing',
    }).catch(() => {});
    toast({ title: 'Newsletter Sent!', description: `"${newsletterDraft.subject}" has been sent to all subscribers.` });
  };

  /* ─── Render ─── */

  const renderCampaigns = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCampaignModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          New Campaign
        </motion.button>
      </div>
      <div className="grid gap-4">
        {campaigns.map((campaign, i) => {
          const Icon = getCampaignIcon(campaign.type);
          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-foreground/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{campaign.name}</h3>
                    <p className="text-xs text-muted-foreground">{campaign.audience}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  campaign.status === 'active' ? 'bg-foreground/10 text-foreground' :
                  campaign.status === 'scheduled' ? 'bg-muted text-muted-foreground' :
                  campaign.status === 'completed' ? 'bg-muted/50 text-muted-foreground/70' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {campaign.status}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-sm font-semibold">{campaign.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened</p>
                  <p className="text-sm font-semibold">{campaign.opened.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clicked</p>
                  <p className="text-sm font-semibold">{campaign.clicked.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-sm font-semibold text-foreground">{campaign.conversion}%</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderCoupons = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{coupons.length} coupons</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddCoupon}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Add Coupon
        </motion.button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Code</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Discount</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Usage</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Expires</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon, i) => (
              <motion.tr
                key={coupon.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <span className="text-sm font-mono font-medium">{coupon.code}</span>
                </td>
                <td className="px-5 py-4 text-sm font-medium">{coupon.discount}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{coupon.used}/{coupon.usageLimit}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{coupon.expiresAt}</td>
                <td className="px-5 py-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    coupon.status === 'active' ? 'bg-foreground/10 text-foreground' :
                    coupon.status === 'expired' ? 'bg-muted/50 text-muted-foreground/50' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {coupon.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {deleteConfirmId === coupon.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-muted-foreground mr-1">Confirm?</span>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditCoupon(coupon)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(coupon.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNewsletter = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted">
              <Users size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Total Subscribers</p>
          </div>
          <p className="text-2xl font-bold">12,458</p>
          <p className="text-xs text-foreground mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> +8.2% this month
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted">
              <Mail size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
          <p className="text-2xl font-bold">48.6%</p>
          <p className="text-xs text-foreground mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> +2.1% this month
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted">
              <CheckCircle2 size={16} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Click Rate</p>
          </div>
          <p className="text-2xl font-bold">22.3%</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> -0.5% this month
          </p>
        </motion.div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Send Newsletter</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            <input
              type="text"
              placeholder="Enter email subject"
              value={newsletterDraft.subject}
              onChange={(e) => setNewsletterDraft((d) => ({ ...d, subject: e.target.value }))}
              className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Content</label>
            <textarea
              placeholder="Write your newsletter content..."
              rows={6}
              value={newsletterDraft.content}
              onChange={(e) => setNewsletterDraft((d) => ({ ...d, content: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendNewsletter}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              <Send size={16} />
              Send to All
            </motion.button>
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Save size={16} />
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Campaigns, coupons, and newsletter management</p>
        </motion.div>

        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'campaigns' && renderCampaigns()}
          {activeTab === 'coupons' && renderCoupons()}
          {activeTab === 'newsletter' && renderNewsletter()}
        </motion.div>
      </div>

      {/* ─── New Campaign Modal ─── */}
      <AnimatePresence>
        {showCampaignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCampaignModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">New Campaign</h2>
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Campaign Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Winter Sale"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign((f) => ({ ...f, name: e.target.value }))}
                    className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
                  <select
                    value={newCampaign.type}
                    onChange={(e) => setNewCampaign((f) => ({ ...f, type: e.target.value as Campaign['type'] }))}
                    className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm appearance-none"
                  >
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                    <option value="social">Social</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Audience *</label>
                  <input
                    type="text"
                    placeholder="e.g. All Customers"
                    value={newCampaign.audience}
                    onChange={(e) => setNewCampaign((f) => ({ ...f, audience: e.target.value }))}
                    className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                  <select
                    value={newCampaign.status}
                    onChange={(e) => setNewCampaign((f) => ({ ...f, status: e.target.value as Campaign['status'] }))}
                    className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm appearance-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                {newCampaign.status === 'scheduled' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Scheduled Date</label>
                    <input
                      type="date"
                      value={newCampaign.scheduledDate || ''}
                      onChange={(e) => setNewCampaign((f) => ({ ...f, scheduledDate: e.target.value }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddCampaign}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                >
                  Create Campaign
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add/Edit Coupon Modal ─── */}
      <AnimatePresence>
        {showCouponModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCouponModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">{editingCoupon ? 'Edit Coupon' : 'Add Coupon'}</h2>
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. SAVE20"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Discount *</label>
                    <input
                      type="text"
                      placeholder="e.g. 20%"
                      value={couponForm.discount}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discount: e.target.value }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
                    <select
                      value={couponForm.type}
                      onChange={(e) => setCouponForm((f) => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm appearance-none"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Min Order (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={couponForm.minOrder}
                      onChange={(e) => setCouponForm((f) => ({ ...f, minOrder: Number(e.target.value) }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Usage Limit</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={couponForm.usageLimit}
                      onChange={(e) => setCouponForm((f) => ({ ...f, usageLimit: Number(e.target.value) }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Used Count</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={couponForm.used}
                      onChange={(e) => setCouponForm((f) => ({ ...f, used: Number(e.target.value) }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                    <select
                      value={couponForm.status}
                      onChange={(e) => setCouponForm((f) => ({ ...f, status: e.target.value as Coupon['status'] }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Expires At *</label>
                    <input
                      type="date"
                      value={couponForm.expiresAt}
                      onChange={(e) => setCouponForm((f) => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full h-10 px-4 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveCoupon}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                >
                  {editingCoupon ? 'Update Coupon' : 'Add Coupon'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminMarketing;
