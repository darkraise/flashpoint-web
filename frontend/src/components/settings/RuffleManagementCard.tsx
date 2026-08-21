import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormattedDate } from '@/components/common/FormattedDate';
import { useDialog } from '@/contexts/DialogContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ruffleApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AxiosError } from 'axios';
import type { RuffleChannel, RuffleUpdateCheck } from '@/lib/api/ruffle';

const CHANNEL_LABELS: Record<RuffleChannel, string> = {
  stable: 'Stable',
  nightly: 'Nightly',
};

export function RuffleManagementCard() {
  const { showToast } = useDialog();
  const queryClient = useQueryClient();

  const [updateCheckResult, setUpdateCheckResult] = useState<RuffleUpdateCheck | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  // Fetch Ruffle version (public - accessible to all users)
  const { data: ruffleVersion } = useQuery({
    queryKey: ['ruffleVersion'],
    queryFn: () => ruffleApi.getVersion(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const invalidateVersion = (): void => {
    queryClient.invalidateQueries({ queryKey: ['ruffleVersion'] });
  };

  const toastError = (error: unknown, fallback: string): void => {
    const axiosError = error instanceof AxiosError ? error : null;
    const message = axiosError?.response?.data?.error?.message || fallback;
    showToast(message, 'error');
  };

  const checkRuffleUpdate = useMutation({
    mutationFn: () => ruffleApi.checkUpdate(),
    onSuccess: (data) => {
      setUpdateCheckResult(data);
      if (data.channelSwitch) {
        showToast(
          `${CHANNEL_LABELS[data.channel]} ${data.latestVersion} is ready to install. Current: ${data.currentVersion}`,
          'success'
        );
      } else if (data.updateAvailable) {
        showToast(
          `Ruffle ${data.latestVersion} is available! Current: ${data.currentVersion}`,
          'success'
        );
      } else {
        showToast('Ruffle is up to date!', 'success');
      }
    },
    onError: (error: unknown) => toastError(error, 'Failed to check for updates'),
  });

  const setChannel = useMutation({
    mutationFn: (channel: RuffleChannel) => ruffleApi.setChannel(channel),
    onSuccess: (data) => {
      setUpdateCheckResult(data);
      invalidateVersion();
      showToast(`Ruffle channel set to ${CHANNEL_LABELS[data.channel]}`, 'success');
    },
    onError: (error: unknown) => toastError(error, 'Failed to change the Ruffle channel'),
  });

  const updateRuffle = useMutation({
    mutationFn: () => ruffleApi.update(),
    onSuccess: (data) => {
      showToast(`${data.message}. Please refresh the page to use the new version.`, 'success');
      invalidateVersion();
      setUpdateCheckResult(null);
    },
    onError: (error: unknown) => toastError(error, 'Failed to update Ruffle'),
  });

  // Auto-expand changelog if new version is available with changelog
  useEffect(() => {
    if (updateCheckResult?.updateAvailable && updateCheckResult?.changelog) {
      setShowChangelog(true);
    } else {
      setShowChangelog(false);
    }
  }, [updateCheckResult]);

  if (!ruffleVersion) {
    return null;
  }

  const isSwitch = updateCheckResult?.channelSwitch ?? false;
  const targetChannel = updateCheckResult?.channel ?? ruffleVersion.channel;
  const actionLabel = isSwitch ? `Install ${CHANNEL_LABELS[targetChannel]}` : 'Update Now';
  const isBusy = setChannel.isPending || checkRuffleUpdate.isPending || updateRuffle.isPending;

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Download size={24} className="text-primary" />
        <h2 className="text-xl font-semibold">Ruffle Emulator Management</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Current Version</Label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {ruffleVersion.currentVersion || 'Not installed'}
              </span>
              {ruffleVersion.installedChannel ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {CHANNEL_LABELS[ruffleVersion.installedChannel]}
                </span>
              ) : null}
              {ruffleVersion.isInstalled ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkRuffleUpdate.mutate()}
            disabled={isBusy}
          >
            {checkRuffleUpdate.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruffle-channel" className="text-sm text-muted-foreground">
            Release Channel
          </Label>
          <Select
            value={ruffleVersion.channel}
            onValueChange={(value: string) => setChannel.mutate(value as RuffleChannel)}
            disabled={isBusy}
          >
            <SelectTrigger id="ruffle-channel" className="w-full sm:w-64">
              <SelectValue placeholder="Select release channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="nightly">Nightly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Stable releases are tested and published every few months. Nightly builds are cut daily
            and carry the newest fixes along with the newest regressions. Changing the channel only
            selects what to install — nothing is downloaded until you install it.
          </p>
        </div>

        {updateCheckResult ? (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">
                  {isSwitch
                    ? `${CHANNEL_LABELS[targetChannel]} ${updateCheckResult.latestVersion} is available`
                    : updateCheckResult.updateAvailable
                      ? `Update Available: ${updateCheckResult.latestVersion}`
                      : "You're up to date!"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isSwitch
                    ? `Installing replaces the current ${CHANNEL_LABELS[updateCheckResult.installedChannel ?? 'stable']} build.`
                    : updateCheckResult.updateAvailable
                      ? 'A new version of Ruffle is available for download.'
                      : 'You have the latest version of Ruffle installed.'}
                </p>
                {updateCheckResult.publishedAt ? (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Published: <FormattedDate date={updateCheckResult.publishedAt} type="date" />
                    </span>
                  </div>
                ) : null}
              </div>
              {updateCheckResult.updateAvailable ? (
                <Button onClick={() => updateRuffle.mutate()} disabled={isBusy}>
                  {updateRuffle.isPending ? (
                    <>
                      <Download className="mr-2 h-4 w-4 animate-pulse" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {actionLabel}
                    </>
                  )}
                </Button>
              ) : null}
            </div>

            {/* Changelog Section - Only show if update is available */}
            {updateCheckResult.updateAvailable && updateCheckResult.changelog ? (
              <div className="border-t pt-3">
                <button
                  onClick={() => setShowChangelog(!showChangelog)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full"
                >
                  {showChangelog ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>{showChangelog ? 'Hide' : 'View'} Changelog</span>
                </button>
                {showChangelog ? (
                  <div className="mt-3 p-3 bg-background border rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">
                      Release Notes:
                    </div>
                    <div className="text-sm text-foreground/90 max-h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-code:text-xs prose-pre:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {updateCheckResult.changelog}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="text-sm text-muted-foreground pt-2 space-y-1">
          <p>
            Ruffle is an open-source Flash Player emulator. Keeping it up to date ensures the best
            compatibility and performance for Flash games.
          </p>
          <p className="text-amber-600 dark:text-amber-400">
            <strong>Note:</strong> After updating Ruffle, you must refresh the browser page for the
            new version to take effect.
          </p>
        </div>
      </div>
    </div>
  );
}
