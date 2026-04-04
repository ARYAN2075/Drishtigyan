import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'critical' | 'warning' | 'success' | 'info' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    
    const variants: Record<BadgeVariant, string> = {
      default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      critical: "bg-red-500/10 text-red-500 border-red-500/20",
      warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      outline: "bg-transparent border-white/10 text-slate-300"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export const TopicBadge: React.FC<{ status: 'strong' | 'moderate' | 'weak' | 'critical' }> = ({ status }) => {
  const variant: BadgeVariant =
    status === 'strong' ? 'success' :
    status === 'moderate' ? 'warning' :
    status === 'critical' ? 'critical' :
    'warning';

  return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
};
