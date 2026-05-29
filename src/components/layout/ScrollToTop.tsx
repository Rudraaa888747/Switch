import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  // Enforce manual scroll restoration globally to prevent browser jumps
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // 1. Force release any stuck body or document scroll locks on navigation
    if (typeof document !== 'undefined') {
      document.body.dataset.mobileMenu = 'closed';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    }

    // 2. Use rAF for the initial scroll reset — aligns with the browser paint cycle
    // so it fires after Framer Motion's compositor layer commits, not during it.
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

    // 3. Backup sweeps to handle cases where async images/data expand the page
    // after the initial reset. Covers the 30-300ms window where layout shifts happen.
    // Deliberately stop at 300ms — long-running timers fight the user's own scrolling.
    const intervals = [50, 120, 250];
    const timers = intervals.map(delay =>
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, delay)
    );

    return () => {
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
