import { GamePlayer } from '@/components/player';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface GamePlayerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  platform: string;
  contentUrl?: string;
  launchCommand?: string;
  canPlayInBrowser: boolean;
}

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
        <div className="flex items-center justify-between bg-muted px-6 py-4 border-b border-border rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">Platform: {platform}</p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <GamePlayer
            title={title}
            platform={platform}
            contentUrl={contentUrl}
            launchCommand={launchCommand}
            canPlayInBrowser={canPlayInBrowser}
            allowFullscreen={false}
            showControls={true}
            height="calc(90vh - 80px)"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
