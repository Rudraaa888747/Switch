import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AdminProvider } from "@/contexts/AdminContext";

import Layout from "./components/layout/Layout";
import ScrollToTop from "./components/layout/ScrollToTop";
const FloatingChatWidget = lazy(() => import("./components/FloatingChatWidget"));
const CartDrawer = lazy(() => import("./components/CartDrawer"));
import { PageSkeleton } from "./components/ui/PageSkeleton";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { useDevicePerformance } from "./hooks/useDevicePerformance";

const PerformanceObserver = () => {
  useDevicePerformance();
  return null;
};

import { useGlobalRealtime } from "./hooks/useGlobalRealtime";

const RealtimeObserver = () => {
  useGlobalRealtime();
  return null;
};

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const OfflineObserver = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: "You are offline",
        description: "Some features may be unavailable. The app will reconnect automatically.",
        variant: "destructive",
        duration: 8000,
      });
    };

    const handleOnline = () => {
      toast({
        title: "Back online",
        description: "Your connection has been restored.",
        duration: 4000,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [toast]);

  return null;
};

const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Shop = lazy(() => import("./pages/Shop"));
const Men = lazy(() => import("./pages/Men"));
const Women = lazy(() => import("./pages/Women"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const StyleAdvisor = lazy(() => import("./pages/StyleAdvisor"));
const OutfitMatching = lazy(() => import("./pages/OutfitMatching"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Profile = lazy(() => import("./pages/Profile"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Lookbook = lazy(() => import("./pages/Lookbook"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HowToUse = lazy(() => import("./pages/HowToUse"));

// Legal Pages
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refunds = lazy(() => import("./pages/Refunds"));

// Global components
const WelcomePopup = lazy(() => import("./components/WelcomePopup"));

// Admin Pages
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));

// QueryClient is cached in globalThis during dev HMR to prevent stale data
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 30 * 60_000, // 30 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

type GlobalCache = { _queryClient?: QueryClient };
const g = globalThis as unknown as GlobalCache;
const queryClient = import.meta.env.DEV
  ? (g._queryClient ??= createQueryClient())
  : createQueryClient();

const App = () => (
  <ErrorBoundary label="Application">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PerformanceObserver />
        <RealtimeObserver />
        <OfflineObserver />
        <AuthProvider>
          <AdminProvider>
            <CartProvider>
              <WishlistProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <ScrollToTop />
                    <Suspense fallback={<PageSkeleton />}>
                      <Routes>
                        {/* ── Public routes ── */}
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />

                        {/* ── Admin auth (public) ── */}
                        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/admin/login" element={<AdminLogin />} />

                        {/* ── Storefront routes ── */}
                        <Route element={<Layout />}>
                          <Route path="/" element={<Home />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/shop" element={<Shop />} />
                          <Route path="/men" element={<Men />} />
                          <Route path="/women" element={<Women />} />
                          <Route path="/product/:id" element={<ProductDetail />} />
                          <Route path="/ai-assistant" element={<AIAssistant />} />
                          <Route path="/style-advisor" element={<StyleAdvisor />} />
                          <Route path="/outfit-matching" element={<OutfitMatching />} />
                          <Route path="/cart" element={<Cart />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/wallet" element={<Wallet />} />
                          <Route path="/wishlist" element={<Wishlist />} />
                          <Route path="/orders" element={<MyOrders />} />
                          <Route path="/lookbook" element={<Lookbook />} />
                          <Route path="/size-guide" element={<SizeGuide />} />
                          <Route path="/faq" element={<FAQ />} />
                          <Route path="/how-to-use" element={<HowToUse />} />
                          <Route path="/privacy" element={<Privacy />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/refunds" element={<Refunds />} />
                          <Route path="*" element={<NotFound />} />
                        </Route>

                        {/* ── Protected admin routes (ALL behind ProtectedAdminRoute) ── */}
                        <Route element={<ProtectedAdminRoute />}>
                          <Route path="/admin/dashboard" element={<AdminDashboard />} />
                          <Route path="/admin/products" element={<AdminProducts />} />
                          <Route path="/admin/orders" element={<AdminOrders />} />
                          <Route path="/admin/users" element={<AdminUsers />} />
                          <Route path="/admin/reviews" element={<AdminReviews />} />
                          <Route path="/admin/inventory" element={<AdminInventory />} />
                          <Route path="/admin/analytics" element={<AdminAnalytics />} />
                          <Route path="/admin/returns" element={<AdminReturns />} />
                          <Route path="/admin/marketing" element={<AdminMarketing />} />
                          <Route path="/admin/marketing/:section" element={<AdminMarketing />} />
                          <Route path="/admin/reports" element={<AdminReports />} />
                          <Route path="/admin/reports/:section" element={<AdminReports />} />
                          <Route path="/admin/settings" element={<AdminSettings />} />
                          <Route path="/admin/settings/:section" element={<AdminSettings />} />
                          <Route path="/admin/staff" element={<AdminStaff />} />
                          <Route path="/admin/staff/:section" element={<AdminStaff />} />
                        </Route>
                      </Routes>

                      {/* Global overlays — not rendered on admin pages by design */}
                      <WelcomePopup />
                      <FloatingChatWidget />
                      <CartDrawer />
                    </Suspense>
                  </BrowserRouter>
                </TooltipProvider>
              </WishlistProvider>
            </CartProvider>
          </AdminProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
