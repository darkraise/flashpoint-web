import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib';

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        platform: '',
        tag: 'bg-gray-700 text-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function getPlatformColor(platformName: string): string {
  const platform = platformName.toLowerCase();

  if (platform.includes('flash')) {
    return 'bg-green-900/50 text-green-300 border border-green-700';
  } else if (platform.includes('html5') || platform.includes('html')) {
    return 'bg-blue-900/50 text-blue-300 border border-blue-700';
  } else if (platform.includes('shockwave')) {
    return 'bg-purple-900/50 text-purple-300 border border-purple-700';
  } else if (platform.includes('java')) {
    return 'bg-orange-900/50 text-orange-300 border border-orange-700';
  } else if (platform.includes('unity')) {
    return 'bg-slate-900/50 text-slate-300 border border-slate-700';
  } else if (platform.includes('silverlight')) {
    return 'bg-indigo-900/50 text-indigo-300 border border-indigo-700';
  } else if (platform.includes('activex')) {
    return 'bg-red-900/50 text-red-300 border border-red-700';
  } else {
    return 'bg-gray-900/50 text-gray-300 border border-gray-700';
  }
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  // Special handling for platform variant
  const platformClass =
    variant === 'platform' && typeof children === 'string' ? getPlatformColor(children) : '';

  return (
    <div className={cn(badgeVariants({ variant }), platformClass, className)} {...props}>
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
