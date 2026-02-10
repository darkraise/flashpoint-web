import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';
import { useThemeStore, resolveActualMode } from '@/store/theme';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const mode = useThemeStore((s) => s.mode);

  const actualTheme = resolveActualMode(mode);

  return (
    <Sonner
      theme={actualTheme}
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4 text-toast-success-icon" />,
        info: <Info className="h-4 w-4 text-toast-info-icon" />,
        warning: <TriangleAlert className="h-4 w-4 text-toast-warning-icon" />,
        error: <OctagonX className="h-4 w-4 text-toast-error-icon" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:bg-toast-success group-[.toaster]:text-toast-success-foreground group-[.toaster]:border-toast-success-border',
          error:
            'group-[.toaster]:bg-toast-error group-[.toaster]:text-toast-error-foreground group-[.toaster]:border-toast-error-border',
          warning:
            'group-[.toaster]:bg-toast-warning group-[.toaster]:text-toast-warning-foreground group-[.toaster]:border-toast-warning-border',
          info: 'group-[.toaster]:bg-toast-info group-[.toaster]:text-toast-info-foreground group-[.toaster]:border-toast-info-border',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
