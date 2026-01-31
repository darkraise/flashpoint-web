import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useEnableSharing,
  useDisableSharing,
  useRegenerateShareToken,
} from '@/hooks/useUserPlaylists';
import { UserPlaylist, ShareLinkData } from '@/types/playlist';
import { Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/api-error';
import { userPlaylistsApi } from '@/lib/api/userPlaylists';

interface SharePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: UserPlaylist;
}

export function SharePlaylistDialog({
  isOpen,
  onClose,
  playlist,
}: SharePlaylistDialogProps) {
  const [isSharing, setIsSharing] = useState(playlist.isPublic);
  const [shareData, setShareData] = useState<ShareLinkData | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    playlist.shareExpiresAt ? new Date(playlist.shareExpiresAt) : undefined
  );
  const [showOwner, setShowOwner] = useState(playlist.showOwner || false);
  const [isLoadingShareData, setIsLoadingShareData] = useState(false);

  const enableSharingMutation = useEnableSharing();
  const disableSharingMutation = useDisableSharing();
  const regenerateTokenMutation = useRegenerateShareToken();

  // Load initial share data if already shared
  useEffect(() => {
    if (isOpen && playlist.isPublic && playlist.shareToken) {
      setShareData({
        shareToken: playlist.shareToken,
        shareUrl: `${window.location.origin}/playlists/shared/${playlist.shareToken}`,
        expiresAt: playlist.shareExpiresAt || null,
        showOwner: playlist.showOwner || false,
      });
    }
  }, [isOpen, playlist]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsSharing(playlist.isPublic);
      setExpiresAt(
        playlist.shareExpiresAt ? new Date(playlist.shareExpiresAt) : undefined
      );
      setShowOwner(playlist.showOwner || false);
      setShareData(null);
    }
  }, [isOpen, playlist]);

  const handleToggleSharing = async (enabled: boolean) => {
    setIsSharing(enabled);

    if (enabled) {
      // Enable sharing
      try {
        const data = await enableSharingMutation.mutateAsync({
          id: playlist.id,
          options: {
            expiresAt: expiresAt?.toISOString() || null,
            showOwner,
          },
        });
        setShareData(data);
        toast.success('Sharing enabled');
      } catch (error) {
        setIsSharing(false);
        toast.error(getErrorMessage(error) || 'Failed to enable sharing');
      }
    } else {
      // Disable sharing
      try {
        await disableSharingMutation.mutateAsync(playlist.id);
        setShareData(null);
        toast.success('Sharing disabled');
      } catch (error) {
        setIsSharing(true);
        toast.error(getErrorMessage(error) || 'Failed to disable sharing');
      }
    }
  };

  const handleUpdateSettings = async () => {
    if (!isSharing) return;

    setIsLoadingShareData(true);
    try {
      const data = await userPlaylistsApi.updateShareSettings(playlist.id, {
        expiresAt: expiresAt?.toISOString() || null,
        showOwner,
      });
      setShareData(data);
      toast.success('Share settings updated');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to update settings');
    } finally {
      setIsLoadingShareData(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareData) return;

    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const data = await regenerateTokenMutation.mutateAsync(playlist.id);
      setShareData(data);
      toast.success('Share link regenerated. Old links are now invalid.');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to regenerate link');
    }
  };

  // Check if settings have changed
  const hasSettingsChanged = () => {
    if (!shareData) return false;
    const currentExpiry = expiresAt?.toISOString() || null;
    const savedExpiry = shareData.expiresAt;
    return currentExpiry !== savedExpiry || showOwner !== shareData.showOwner;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Share Playlist</DialogTitle>
          <DialogDescription>
            Allow others to view this playlist via a shareable link
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 py-4">
          {/* Enable Sharing Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enable-sharing" className="text-base font-medium">
                Enable Sharing
              </Label>
              <p className="text-sm text-muted-foreground">
                Make this playlist accessible via link
              </p>
            </div>
            <Switch
              id="enable-sharing"
              checked={isSharing}
              onCheckedChange={handleToggleSharing}
              disabled={
                enableSharingMutation.isPending ||
                disableSharingMutation.isPending
              }
            />
          </div>

          {isSharing && (
            <>
              {/* Warning Alert */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Anyone with the link can view this playlist and its games,
                  regardless of guest access settings.
                </AlertDescription>
              </Alert>

              {/* Share URL */}
              {shareData && (
                <div className="space-y-2">
                  <Label htmlFor="share-url">Share URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="share-url"
                      value={shareData.shareUrl}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyUrl}
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiry-date">Link Expiry (Optional)</Label>
                <DatePicker
                  id="expiry-date"
                  date={expiresAt}
                  onDateChange={setExpiresAt}
                  placeholder="Never expires"
                  clearable
                  disabledDates={(date) => date < new Date()}
                />
                <p className="text-xs text-muted-foreground">
                  Set when the share link should stop working
                </p>
              </div>

              {/* Show Owner */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="show-owner"
                  checked={showOwner}
                  onCheckedChange={(checked) =>
                    setShowOwner(checked as boolean)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="show-owner"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Show Creator Name
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your username on the shared playlist page
                  </p>
                </div>
              </div>

              {/* Update Settings Button */}
              {shareData && hasSettingsChanged() && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUpdateSettings}
                  disabled={isLoadingShareData}
                  className="w-full"
                >
                  {isLoadingShareData
                    ? 'Updating...'
                    : 'Update Share Settings'}
                </Button>
              )}

              {/* Regenerate Link */}
              {shareData && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Regenerate Link</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create a new share link and invalidate the old one
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRegenerateToken}
                    disabled={regenerateTokenMutation.isPending}
                    className="w-full"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        regenerateTokenMutation.isPending ? 'animate-spin' : ''
                      }`}
                    />
                    {regenerateTokenMutation.isPending
                      ? 'Regenerating...'
                      : 'Regenerate Link'}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
