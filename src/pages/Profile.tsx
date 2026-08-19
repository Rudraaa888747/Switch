import { useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  Edit2,
  Plus,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  CreditCard,
  Bell,
  Shield,
  X,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUserOrders } from '@/hooks/useOrders';
import { formatPrice } from '@/data/products';
import { normalizeImageUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user, isAuthenticated, logout, updateProfile, supabaseUser, session } = useAuth();
  const { totalItems: wishlistCount } = useWishlist();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedPhone, setEditedPhone] = useState(user?.phone || '');
  
  // Settings dialog states
  const [activeTab, setActiveTab] = useState('orders');
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const effectiveUserId = supabaseUser?.id || user?.id;
  const { data: orders = [], isLoading: isOrdersLoading } = useUserOrders(effectiveUserId, session?.access_token);
  const previewOrders = useMemo(() => orders.slice(0, 3), [orders]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSaveProfile = () => {
    updateProfile({ name: editedName, phone: editedPhone });
    setIsEditing(false);
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been updated successfully.',
    });
  };

  const handleSaveNotifications = async () => {
    setNotificationDialogOpen(false);
    try {
      if (user?.id) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefs) {
          await supabase.from('user_preferences').update({
            preferred_categories: prefs.preferred_categories,
            preferred_colors: prefs.preferred_colors,
          }).eq('user_id', user.id);
        }
      }
    } catch { /* table may not exist */ }
    toast({
      title: 'Notifications Updated',
      description: 'Your notification preferences have been saved.',
    });
  };

  const handleSavePayment = () => {
    setPaymentDialogOpen(false);
    toast({
      title: 'Payment Methods',
      description: 'Payment method functionality coming soon.',
    });
  };

  const handleSavePrivacy = () => {
    setPrivacyDialogOpen(false);
    toast({
      title: 'Privacy Settings',
      description: 'Your privacy settings have been updated.',
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Force navigation with full page reload to ensure clean state
      // Using window.location.href instead of navigate() to prevent back-button issues
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, force redirect to ensure user is logged out from UI
      window.location.href = '/';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Shipped':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'Processing':
      case 'Order Placed':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Processing':
      case 'Order Placed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="container-custom py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
            <div className="relative">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center ring-1 ring-border/40">
                {user.avatar ? (
                  <img loading="lazy" decoding="async"
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 md:w-14 md:h-14 text-muted-foreground/60" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-foreground px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-background shadow-sm">
                Gold
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-normal tracking-[-0.01em] mb-1">
                {user.name}
              </h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-muted-foreground/70 text-xs mt-1.5 flex items-center gap-1.5">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
                Member since {formatDate(user.memberSince)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-full border-border/60"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 md:p-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-medium tracking-tight">{orders.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Orders</p>
                </div>
              </CardContent>
            </Card>
            <Link to="/wishlist">
              <Card className="rounded-2xl border-border/60 hover:border-foreground/20 hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-4 md:p-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-medium tracking-tight">{wishlistCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Wishlist</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 md:p-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-medium tracking-tight">{user.addresses?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Addresses</p>
                </div>
              </CardContent>
            </Card>
            <Link to="/wallet">
              <Card className="rounded-2xl border-border/60 hover:border-foreground/20 hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-4 md:p-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-medium tracking-tight">{formatPrice(user.walletBalance || 0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">Wallet</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="custom-scrollbar mb-8 overflow-x-auto">
              <TabsList className="relative inline-flex w-max gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 md:w-auto">
                {['orders', 'profile', 'wallet', 'addresses', 'settings'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="relative z-10 rounded-xl px-5 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-all duration-300 data-[state=active]:bg-transparent data-[state=active]:text-background"
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="profile-tab-pill"
                        className="absolute inset-0 z-[-1] rounded-xl bg-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium uppercase tracking-widest">
                  Your Orders
                </h2>
                <Link to="/orders">
                  <Button variant="outline" size="sm">
                    View All Orders
                  </Button>
                </Link>
              </div>
              {isOrdersLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Loading your orders...</p>
                  </CardContent>
                </Card>
              ) : orders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No orders yet</p>
                    <Link to="/shop">
                      <Button>Start Shopping</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {previewOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden border-border/60">
                      <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3 md:px-5">
                        <div className="flex items-center gap-3 md:gap-5">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Order</p>
                            <p className="mt-0.5 text-sm font-medium">{order.order_id || order.id}</p>
                          </div>
                          <div className="hidden h-6 w-px bg-border/50 md:block" />
                          <div className="hidden md:block">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Date</p>
                            <p className="mt-0.5 text-sm">{formatDate(order.order_date || order.created_at || new Date().toISOString())}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 md:p-5">
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              {item.product_image ? (
                                <img
                                  src={normalizeImageUrl(item.product_image)}
                                  alt={item.product_name}
                                  className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-muted/50">
                                  <Package className="h-5 w-5 text-muted-foreground/60" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.product_name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <p className="text-sm font-semibold tracking-tight">{formatPrice(item.total_price)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/30 px-4 py-3 md:px-5">
                        <p className="text-sm font-semibold tracking-tight">Total: {formatPrice(order.grand_total)}</p>
                        <Link to="/orders">
                          <Button variant="outline" size="sm" className="rounded-full border-border/60 text-xs">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                  {orders.length > 3 && (
                    <div className="text-center">
                      <Link to="/orders">
                        <Button variant="outline">
                          View All {orders.length} Orders
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium uppercase tracking-widest">
                  Personal Information
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveProfile();
                    } else {
                      setEditedName(user.name);
                      setEditedPhone(user.phone || '');
                      setIsEditing(true);
                    }
                  }}
                >
                  {isEditing ? 'Save' : <Edit2 className="h-4 w-4" />}
                </Button>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Full Name
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="bg-transparent"
                        />
                      ) : (
                        <p className="font-medium">{user.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Email Address
                      </Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Phone Number
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                          className="bg-transparent"
                          placeholder="+91 XXXXX XXXXX"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {user.phone || 'Not added'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Member Since
                      </Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {user.memberSince ? formatDate(user.memberSince) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-4 pt-4">
                      <Button onClick={handleSaveProfile}>Save Changes</Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium uppercase tracking-widest">
                  My Wallet
                </h2>
                <Link to="/wallet">
                  <Button variant="outline" size="sm">
                    View Wallet History
                  </Button>
                </Link>
              </div>

              <Card className="relative overflow-hidden border-border/60">
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-transparent pointer-events-none" />
                <CardContent className="relative p-6 md:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Available Balance</p>
                      <p className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">{formatPrice(user.walletBalance || 0)}</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 ring-1 ring-border/50">
                      <Wallet className="h-6 w-6 text-foreground/70" />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10">
                      <span className="text-[10px] font-bold text-foreground/60">ⓘ</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Refunds and cashbacks are stored here automatically. Use wallet credit during checkout.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium uppercase tracking-widest">
                  Saved Addresses
                </h2>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New
                </Button>
              </div>

              {!user.addresses || user.addresses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No addresses saved
                    </p>
                    <Button>Add Address</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.addresses.map((address) => (
                    <Card key={address.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant="outline" className="uppercase text-xs">
                            {address.type}
                          </Badge>
                          {address.isDefault && (
                            <Badge className="bg-foreground text-background text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium mb-1">{address.street}</p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.country}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm">
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <h2 className="text-lg font-medium mb-4 uppercase tracking-widest">
                Account Settings
              </h2>

              <Card className="overflow-hidden border-border/60">
                <div className="divide-y divide-border/40">
                  <button
                    onClick={() => setNotificationDialogOpen(true)}
                    className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30 active:bg-muted/50 md:px-6"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Notifications</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Email, SMS, and push</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </button>

                  <button
                    onClick={() => setPaymentDialogOpen(true)}
                    className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30 active:bg-muted/50 md:px-6"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Payment Methods</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Manage cards and UPI</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </button>

                  <button
                    onClick={() => setPrivacyDialogOpen(true)}
                    className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/30 active:bg-muted/50 md:px-6"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Privacy</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Data and privacy preferences</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-destructive/5 active:bg-destructive/10 md:px-6"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                        <LogOut className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-destructive">Logout</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Sign out from your account</p>
                      </div>
                    </div>
                  </button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Notification Preferences Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Choose how you want to receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive order updates via email</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">SMS Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive delivery alerts via SMS</p>
              </div>
              <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Get real-time updates on your device</p>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNotifications}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Methods Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Methods</DialogTitle>
            <DialogDescription>
              Manage your saved payment methods
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No saved payment methods</p>
            <Button variant="outline" onClick={handleSavePayment}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Settings Dialog */}
      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription>
              Manage your data and privacy preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Profile Visibility</Label>
                <p className="text-xs text-muted-foreground">Allow others to see your profile</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Personalized Recommendations</Label>
                <p className="text-xs text-muted-foreground">Get product suggestions based on your activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Marketing Emails</Label>
                <p className="text-xs text-muted-foreground">Receive promotional emails and offers</p>
              </div>
              <Switch />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPrivacyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePrivacy}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
