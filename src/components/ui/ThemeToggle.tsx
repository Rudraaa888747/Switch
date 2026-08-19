import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  
  const isDark = theme === 'dark';

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/50 hover:bg-muted/80 backdrop-blur-md border border-border/50 text-foreground transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      <div className="relative h-5 w-5">
        <motion.div
          initial={false}
          animate={{
            scale: isDark ? 1 : 0,
            opacity: isDark ? 1 : 0,
            rotate: isDark ? 0 : 90,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          className="absolute inset-0 origin-center"
        >
          <Moon size={20} strokeWidth={1.5} />
        </motion.div>
        
        <motion.div
          initial={false}
          animate={{
            scale: isDark ? 0 : 1,
            opacity: isDark ? 0 : 1,
            rotate: isDark ? -90 : 0,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          className="absolute inset-0 origin-center"
        >
          <Sun size={20} strokeWidth={1.5} />
        </motion.div>
      </div>
    </motion.button>
  );
};
