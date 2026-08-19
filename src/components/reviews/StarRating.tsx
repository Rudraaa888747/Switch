import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating = ({ rating, onRatingChange, readonly = false, size = 'md' }: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        
        return (
          <motion.button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onRatingChange?.(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
            whileHover={!readonly ? { scale: 1.15 } : undefined}
            whileTap={!readonly ? { scale: 0.95 } : undefined}
          >
            <Star
              className={`${sizeClasses[size]} transition-all duration-200 ${
                isFilled 
                  ? 'fill-primary text-primary' 
                  : 'text-muted-foreground/70 dark:text-muted-foreground/40'
              }`}
            />
          </motion.button>
        );
      })}
    </div>
  );
};

export default StarRating;
