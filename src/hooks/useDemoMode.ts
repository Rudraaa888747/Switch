import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { demoMessages } from '@/lib/demoMessages';

// Hardcoded to true for this demonstration environment.
// In a real codebase, this would come from an environment variable (e.g., import.meta.env.VITE_DEMO_MODE).
export const isDemoMode = true;

export const useDemoMode = () => {
  const [isSimulating, setIsSimulating] = useState(false);

  /**
   * Simulates an artificial network delay for a premium feel, then executes a callback.
   * Useful for showing a success state in the UI without modifying the database.
   */
  const simulateAction = useCallback(async (
    actionName: string, 
    delayMs = 600, 
    onSuccess?: () => void,
    toastMessage?: string
  ) => {
    if (!isDemoMode) {
      if (onSuccess) onSuccess();
      return;
    }

    setIsSimulating(true);
    
    // Artificial latency
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    setIsSimulating(false);
    
    if (onSuccess) onSuccess();

    if (toastMessage) {
      toast.success(toastMessage, {
        description: 'Demo Mode: Changes are visible locally but not saved to the database.',
      });
    }
  }, []);

  /**
   * Immediately blocks an action and shows a premium warning toast.
   * Useful for destructive actions like Delete that shouldn't be simulated.
   */
  const blockAction = useCallback((actionName: string) => {
    if (!isDemoMode) return false;
    
    const message = demoMessages[actionName as keyof typeof demoMessages] 
      || `Demo Mode Active. ${actionName} is disabled in this demonstration environment.`;
      
    toast.error(message, {
      description: 'This action is available in production deployments.',
    });
    
    return true; // Returns true indicating the action WAS blocked
  }, []);

  return {
    isDemoMode,
    isSimulating,
    simulateAction,
    blockAction
  };
};
