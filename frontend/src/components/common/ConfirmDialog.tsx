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
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'danger' | 'warning' | 'info';
}

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
  const isDialogOpen = open ?? isOpen ?? false;
  const dialogTitle = title ?? 'Confirm';
  const desc = description ?? message ?? '';

  const variantNormalized = variant === 'danger' ? 'destructive' : variant;

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
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

  const getButtonClassName = () => {
    if (variantNormalized === 'destructive') {
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    }
    if (variantNormalized === 'warning') {
      return 'bg-amber-600 text-white hover:bg-amber-700';
    }
    if (variantNormalized === 'info') {
      return 'bg-primary text-primary-foreground hover:bg-primary/90';
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
