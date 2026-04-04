import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  colorClass?: string;
  color?: 'strong' | 'moderate' | 'weak';
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  className,
  colorClass,
  color,
  size = 'md'
}) => {
  const colorMap: Record<NonNullable<ProgressBarProps['color']>, string> = {
    strong: 'bg-success',
    moderate: 'bg-warning',
    weak: 'bg-danger'
  };
  const resolvedColor = colorClass || (color ? colorMap[color] : 'bg-indigo-500');
  const sizeClass = size === 'sm' ? 'h-2' : 'h-1.5';
  return (
    <div className={cn("w-full bg-white/10 rounded-full overflow-hidden", sizeClass, className)}>
      <motion.div
        className={cn("h-full rounded-full", resolvedColor)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
};
