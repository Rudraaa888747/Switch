import { useEffect, useState } from 'react';

declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

export const useDevicePerformance = () => {
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    // Basic detection for low-end devices
    // Lower cores or low memory usually indicate a budget device
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = navigator.deviceMemory || 4;
    
    // Check if the user has requested reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // We classify as low-end ONLY based on hardware limitations
    if (hardwareConcurrency <= 4 && deviceMemory <= 4) {
      setIsLowEnd(true);
      document.documentElement.classList.add('low-end-device');
    } else {
      setIsLowEnd(false);
      document.documentElement.classList.remove('low-end-device');
    }
  }, []);

  return { isLowEnd };
};
