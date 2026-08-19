import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const WelcomePopup = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const hasFired = React.useRef(false);

  useEffect(() => {
    // Only show if user is authenticated and hasn't dismissed it before
    if (isAuthenticated && !hasFired.current) {
      const hasDismissed = localStorage.getItem('switch_onboarding_dismissed');
      if (!hasDismissed) {
        hasFired.current = true;
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated]);

  const handleDismiss = () => {
    localStorage.setItem('switch_onboarding_dismissed', 'true');
    setIsOpen(false);
  };

  const handleReadGuide = () => {
    handleDismiss();
    navigate('/how-to-use');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] bg-background/40 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md relative overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-2xl backdrop-blur-xl">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent opacity-50" />
              
              <button 
                onClick={handleDismiss}
                className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <X size={20} />
              </button>

              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A96E]/10 text-[#C9A96E]">
                <Hand size={24} />
              </div>

              <h2 className="mb-2 text-2xl font-serif font-medium text-foreground">
                Welcome, {user?.name?.split(' ')[0] || 'there'}!
              </h2>
              
              <p className="mb-8 text-foreground/60 text-sm leading-relaxed font-light">
                If you're new here, we highly recommend reading our quick "How to Use" guide before placing your first order. It covers everything from tracking to our instant wallet refunds.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 rounded-full text-black bg-[#C9A96E] hover:bg-[#b0935e]" 
                  size="lg"
                  onClick={handleReadGuide}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read How to Use
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full border-border text-foreground hover:bg-accent" 
                  size="lg"
                  onClick={handleDismiss}
                >
                  Skip
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WelcomePopup;
