import { useState, useEffect, useRef } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

export function useHideOnScroll(options?: { idleHideMs?: number }) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const idleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    
    // Hide when scrolling down and passed 150px
    if (latest > previous && latest > 150) {
      setHidden(true);
    } 
    // Show when scrolling up or at the very top
    else if (latest < previous - 10 || latest < 50) {
      setHidden(false);
    }

    // Optional idle hide logic
    if (options?.idleHideMs) {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
      
      // Only set idle timeout if we're not at the very top
      if (latest > 150) {
        idleTimeoutRef.current = window.setTimeout(() => {
          setHidden(true);
        }, options.idleHideMs);
      }
    }
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  return { hidden, isReducedMotion };
}
