import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner } from 'sonner';
import { useThemeStore, resolveActualMode } from '@/store/theme';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const TOAST_DURATION = 4000;

const Toaster = ({ ...props }: ToasterProps) => {
  const mode = useThemeStore((s) => s.mode);

  const actualTheme = resolveActualMode(mode);

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }

        [data-sonner-toast]::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: currentColor;
          opacity: 0.2;
          transform-origin: left;
          animation: toast-progress ${TOAST_DURATION}ms linear forwards;
        }

        [data-sonner-toast][data-type="success"]::after {
          background: hsl(var(--toast-success-icon));
          opacity: 0.6;
        }

        [data-sonner-toast][data-type="error"]::after {
          background: hsl(var(--toast-error-icon));
          opacity: 0.6;
        }

        [data-sonner-toast][data-type="warning"]::after {
          background: hsl(var(--toast-warning-icon));
          opacity: 0.6;
        }

        [data-sonner-toast][data-type="info"]::after {
          background: hsl(var(--toast-info-icon));
          opacity: 0.6;
        }

        [data-sonner-toast]:hover::after {
          animation-play-state: paused;
        }

        /* Hide progress bar for loading toasts (they don't auto-dismiss) */
        [data-sonner-toast][data-type="loading"]::after {
          display: none;
        }

        /* Close button positioning and styling */
        [data-sonner-toast] [data-close-button] {
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          left: auto !important;
          bottom: auto !important;
          transform: none !important;
          background: transparent !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 6px !important;
          width: 28px !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: hsl(var(--muted-foreground));
          opacity: 0.6;
          transition: opacity 150ms, background-color 150ms, color 150ms;
          cursor: pointer;
        }

        [data-sonner-toast] [data-close-button] svg {
          width: 16px !important;
          height: 16px !important;
        }

        [data-sonner-toast] [data-close-button]:hover {
          opacity: 1;
          background: hsl(var(--muted)) !important;
          color: hsl(var(--foreground));
        }

        [data-sonner-toast] [data-close-button]:focus-visible {
          opacity: 1;
          outline: 2px solid hsl(var(--ring));
          outline-offset: 2px;
        }

        /* Type-specific close button colors */
        [data-sonner-toast][data-type="success"] [data-close-button] {
          color: hsl(var(--toast-success-foreground));
        }
        [data-sonner-toast][data-type="success"] [data-close-button]:hover {
          background: hsl(var(--toast-success-foreground) / 0.15) !important;
          color: hsl(var(--toast-success-foreground));
        }

        [data-sonner-toast][data-type="error"] [data-close-button] {
          color: hsl(var(--toast-error-foreground));
        }
        [data-sonner-toast][data-type="error"] [data-close-button]:hover {
          background: hsl(var(--toast-error-foreground) / 0.15) !important;
          color: hsl(var(--toast-error-foreground));
        }

        [data-sonner-toast][data-type="warning"] [data-close-button] {
          color: hsl(var(--toast-warning-foreground));
        }
        [data-sonner-toast][data-type="warning"] [data-close-button]:hover {
          background: hsl(var(--toast-warning-foreground) / 0.15) !important;
          color: hsl(var(--toast-warning-foreground));
        }

        [data-sonner-toast][data-type="info"] [data-close-button] {
          color: hsl(var(--toast-info-foreground));
        }
        [data-sonner-toast][data-type="info"] [data-close-button]:hover {
          background: hsl(var(--toast-info-foreground) / 0.15) !important;
          color: hsl(var(--toast-info-foreground));
        }
      `}</style>
      <Sonner
        theme={actualTheme}
        className="toaster group"
        closeButton
        duration={TOAST_DURATION}
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
              'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:overflow-hidden',
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
    </>
  );
};

export { Toaster };
