import React from 'react';
import { useLogo } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';

/** Logo del local (si el administrador subió uno) o la marca por defecto. */
export const BrandMark: React.FC<{ className?: string }> = ({ className }) => {
  const logo = useLogo();
  if (logo) {
    return <img src={logo} alt="Logo del local" className={cn('shrink-0 rounded-xl bg-white/5 object-contain', className)} />;
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong font-bold tracking-wider text-white',
        className
      )}
      aria-hidden
    >
      X
    </div>
  );
};
