import { GamePlayer } from '@/components/player';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface GamePlayerDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Game title */
  title: string;
  /** Platform (Flash, HTML5, etc.) */
  platform: string;
  /** Content URL for the game */
  contentUrl?: string;
  /** Launch command (if any) */
  launchCommand?: string;
  /** Whether the game can be played in browser */
  canPlayInBrowser: boolean;
}

/**
 * Example dialog component showing how to use GamePlayer in a modal/dialog context.
 * This demonstrates the flexibility of the GamePlayer component.
 */
export function GamePlayerDialog({
  isOpen,
  onClose,
  title,
  platform,
  contentUrl,
  launchCommand,
  canPlayInBrowser,
}: GamePlayerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0">
        {/* Dialog Header */}
        <div className="flex items-center justify-between bg-muted px-6 py-4 border-b border-border rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">Platform: {platform}</p>
          </div>
        </div>

        {/* Game Player */}
        <div className="flex-1 overflow-hidden">
          <GamePlayer
            title={title}
            platform={platform}
            contentUrl={contentUrl}
            launchCommand={launchCommand}
            canPlayInBrowser={canPlayInBrowser}
            allowFullscreen={false} // Disable fullscreen in dialog
            showControls={true}
            height="calc(90vh - 80px)" // Account for dialog header
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
