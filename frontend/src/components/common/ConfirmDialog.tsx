import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  // Support both API styles for backward compatibility
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  message?: string; // Alias for description
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'danger' | 'warning' | 'info';
}

/**
 * Reusable confirmation dialog for destructive or important actions
 * Prevents accidental data loss by requiring explicit user confirmation
 */
export function ConfirmDialog({
  open,
  isOpen,
  onOpenChange,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  // Support both prop names
  const isDialogOpen = open ?? isOpen ?? false;
  const dialogTitle = title ?? 'Confirm';
  const desc = description ?? message ?? '';

  // Normalize variant to supported types
  const variantNormalized = variant === 'danger' ? 'destructive' : variant;

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!newOpen && onCancel) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  // Determine button styling based on variant
  const getButtonClassName = () => {
    if (variantNormalized === 'destructive') {
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    }
    if (variantNormalized === 'warning') {
      return 'bg-yellow-600 text-white hover:bg-yellow-700';
    }
    if (variantNormalized === 'info') {
      return 'bg-blue-600 text-white hover:bg-blue-700';
    }
    return undefined;
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className={getButtonClassName()}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
