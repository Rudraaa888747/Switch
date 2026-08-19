import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

import { PageSkeleton } from '@/components/ui/PageSkeleton';

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div className="fixed top-0 left-0 right-0 h-[2px] bg-foreground origin-left z-50" style={{ scaleX }} />
  );
};

const Layout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const showFooter = !isAdminRoute;

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollProgress />
      <Header />
      <main className={`flex-1 pt-safe md:pt-20 ${!showFooter ? 'mobile-nav-clearance' : ''}`}>
        <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {showFooter && <Footer />}
      {!isAdminRoute && <MobileBottomNav />}
    </div>
  );
};

export default Layout;
