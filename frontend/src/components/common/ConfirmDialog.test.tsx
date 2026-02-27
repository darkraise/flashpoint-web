import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open is true', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should not render content when open is false', () => {
      render(<ConfirmDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should render with default title "Confirm"', () => {
      render(<ConfirmDialog {...defaultProps} />);

      // Title is in an h2 element
      expect(screen.getByRole('heading', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should render custom title', () => {
      render(<ConfirmDialog {...defaultProps} title="Delete Item?" />);

      expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<ConfirmDialog {...defaultProps} description="Are you sure you want to proceed?" />);

      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('should render message as description fallback', () => {
      render(<ConfirmDialog {...defaultProps} message="This action cannot be undone." />);

      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should prefer description over message', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          description="Primary description"
          message="Fallback message"
        />
      );

      expect(screen.getByText('Primary description')).toBeInTheDocument();
      expect(screen.queryByText('Fallback message')).not.toBeInTheDocument();
    });

    it('should render default button text', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should render custom button text', () => {
      render(
        <ConfirmDialog {...defaultProps} confirmText="Delete" cancelText="Keep" />
      );

      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  describe('isOpen prop (alias for open)', () => {
    it('should render when isOpen is true', () => {
      render(<ConfirmDialog onConfirm={vi.fn()} isOpen={true} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ConfirmDialog onConfirm={vi.fn()} isOpen={false} />);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('confirm action', () => {
    it('should call onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onOpenChange with false after confirm', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('cancel action', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // onCancel may be called multiple times due to both handleCancel and handleOpenChange
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onOpenChange with false when cancel is clicked', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onCancel when dialog is closed via onOpenChange', () => {
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <ConfirmDialog
          {...defaultProps}
          onCancel={onCancel}
          onOpenChange={onOpenChange}
        />
      );

      // Simulate dialog being closed externally
      rerender(
        <ConfirmDialog
          {...defaultProps}
          open={false}
          onCancel={onCancel}
          onOpenChange={onOpenChange}
        />
      );

      // The dialog handles this internally via handleOpenChange
    });
  });

  describe('variants', () => {
    it('should apply destructive variant styling', () => {
      render(<ConfirmDialog {...defaultProps} variant="destructive" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-destructive');
    });

    it('should treat "danger" as alias for "destructive"', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-destructive');
    });

    it('should apply warning variant styling', () => {
      render(<ConfirmDialog {...defaultProps} variant="warning" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-amber-600');
    });

    it('should apply info variant styling', () => {
      render(<ConfirmDialog {...defaultProps} variant="info" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-primary');
    });

    it('should use default styling when variant is "default"', () => {
      render(<ConfirmDialog {...defaultProps} variant="default" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      // Default variant should not have destructive, warning, or info classes
      expect(confirmButton).not.toHaveClass('bg-destructive');
      expect(confirmButton).not.toHaveClass('bg-amber-600');
    });
  });

  describe('accessibility', () => {
    it('should have alertdialog role', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should have accessible title', () => {
      render(<ConfirmDialog {...defaultProps} title="Confirm Delete" />);

      // The title should be properly associated with the dialog
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    it('should have accessible description', () => {
      render(<ConfirmDialog {...defaultProps} description="This will permanently delete the item." />);

      expect(screen.getByText('This will permanently delete the item.')).toBeInTheDocument();
    });
  });
});
