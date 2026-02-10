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
        tag: 'bg-muted text-muted-foreground',
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
    return 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/25';
  } else if (platform.includes('html5') || platform.includes('html')) {
    return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25';
  } else if (platform.includes('shockwave')) {
    return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25';
  } else if (platform.includes('java')) {
    return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25';
  } else if (platform.includes('unity')) {
    return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25';
  } else if (platform.includes('silverlight')) {
    return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25';
  } else if (platform.includes('activex')) {
    return 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25';
  } else {
    return 'bg-muted/50 text-muted-foreground border border-border';
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
