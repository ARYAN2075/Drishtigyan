import React from 'react';
import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'default' | 'lg';

export function DrashtiGyanLogo({ size = 'default' }: { size?: LogoSize }) {
  const sizes: Record<LogoSize, { box: string; text: string; tagline: boolean; dot: string }> = {
    sm: { box: 'w-7 h-7', text: 'text-sm', tagline: false, dot: 'w-1.5 h-1.5' },
    default: { box: 'w-9 h-9', text: 'text-lg', tagline: false, dot: 'w-2 h-2' },
    lg: { box: 'w-14 h-14', text: 'text-3xl', tagline: true, dot: 'w-3 h-3' },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className={cn('relative flex-shrink-0', s.box)}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-mid via-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-white font-black tracking-tighter"
            style={{ fontSize: size === 'lg' ? '1.6rem' : size === 'sm' ? '0.75rem' : '1rem' }}
          >
            DG
          </span>
        </div>
        <div
          className={cn(
            'absolute -top-0.5 -right-0.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50',
            s.dot
          )}
        />
      </div>

      <div>
        <h1 className={cn(s.text, 'font-heading font-bold text-text-primary leading-none tracking-tight')}>
          Drashti
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-mid to-violet-400">
            Gyan
          </span>
        </h1>
        {s.tagline && (
          <p className="text-xs text-text-muted font-medium mt-1 tracking-wide">ज्ञान की नई दृष्टि</p>
        )}
      </div>
    </div>
  );
}
