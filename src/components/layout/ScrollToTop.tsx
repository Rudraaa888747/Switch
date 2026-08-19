import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SCROLL_KEY = (path: string) => `scroll:${path}`;

const readSavedScroll = (path: string): number => {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY(path));
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

const writeSavedScroll = (path: string) => {
  try {
    sessionStorage.setItem(SCROLL_KEY(path), String(window.scrollY || window.pageYOffset || 0));
  } catch {
    // sessionStorage unavailable (private mode etc.) — restore degrades to top.
  }
};

const unlockScroll = () => {
  if (typeof document === 'undefined') return;
  document.body.dataset.mobileMenu = 'closed';
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
  document.documentElement.style.overflow = '';
  document.documentElement.style.touchAction = '';
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // Enforce manual scroll restoration globally to prevent browser jumps
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Navigation effect — declared BEFORE the persist effect so that on POP the
  // saved position is read before any current-scroll write can clobber it.
  useEffect(() => {
    // 1. Force release any stuck body or document scroll locks on navigation
    unlockScroll();

    // 2. POP (browser back/forward): restore the exact position this page
    //    was at previously instead of jumping to the top.
    if (navigationType === 'POP') {
      const saved = readSavedScroll(pathname);

      // rAF aligns with the paint cycle so the restore lands after Framer
      // Motion's compositor layer commits, not during it.
      const rafId = requestAnimationFrame(() => {
        window.scrollTo({ top: saved, left: 0, behavior: 'instant' });
      });

      // One late sweep re-applies the position once async images/data have
      // had a chance to change the layout height.
      const lateTimer = setTimeout(() => {
        const current = readSavedScroll(pathname);
        if (current === saved) {
          window.scrollTo({ top: saved, left: 0, behavior: 'instant' });
        }
      }, 150);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(lateTimer);
      };
    }

    // 3. PUSH (new page): scroll to top. Use rAF for the initial reset, then
    //    backup sweeps to handle cases where async images/data expand the page
    //    after the initial reset. Covers the 30-300ms window where layout shifts
    //    happen. Deliberately stop at 300ms — long-running timers fight the
    //    user's own scrolling.
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

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
  }, [pathname, navigationType]);

  // Persist the current scroll position while the user scrolls, and capture
  // the final position in the cleanup that runs when leaving this page — so a
  // later POP navigation can restore it exactly.
  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        writeSavedScroll(pathname);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      writeSavedScroll(pathname);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
