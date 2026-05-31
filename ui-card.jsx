import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * Reusable Card component with variant support.
 * Variants: default, elevated, flat, gradient, statistics, testimonial, course, student, instructor, analytics.
 */
const Card = React.forwardRef(
  (
    {
      children,
      variant = 'default',
      className,
      onClick,
      hoverable = true,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'p-4 bg-surface border border-muted rounded-md transition-all duration-200 focus:outline-none';

    const variants = {
      default: 'shadow-sm',
      elevated: 'shadow-md',
      flat: '',
      gradient: 'bg-gradient-to-br from-primary to-secondary text-white',
      // Content‑specific visual tweaks
      statistics: 'bg-primary text-white shadow-lg',
      testimonial: 'bg-muted border-l-4 border-primary',
      course: 'bg-white hover:bg-muted shadow-sm',
      student: 'bg-white border border-muted',
      instructor: 'bg-white shadow-md',
      analytics: 'bg-white shadow-lg',
    };

    const interactive = hoverable ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : '';

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant] ?? variants['default'], interactive, className)}
        onClick={onClick}
        whileHover={hoverable ? { scale: 1.02 } : {}}
        whileTap={hoverable ? { scale: 0.98 } : {}}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
