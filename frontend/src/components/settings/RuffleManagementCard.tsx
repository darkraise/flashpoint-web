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
import { FormattedDate } from '@/components/common/FormattedDate';
import { useDialog } from '@/contexts/DialogContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ruffleApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AxiosError } from 'axios';

interface UpdateCheckResult {
  latestVersion: string;
  updateAvailable: boolean;
  changelog?: string;
  publishedAt?: string;
}

export function RuffleManagementCard() {
  const { showToast } = useDialog();

  const [updateCheckResult, setUpdateCheckResult] = useState<UpdateCheckResult | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  // Fetch Ruffle version (public - accessible to all users)
  const { data: ruffleVersion, refetch: refetchRuffleVersion } = useQuery({
    queryKey: ['ruffleVersion'],
    queryFn: () => ruffleApi.getVersion(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check for Ruffle update mutation
  const checkRuffleUpdate = useMutation({
    mutationFn: () => ruffleApi.checkUpdate(),
    onSuccess: (data) => {
      setUpdateCheckResult({
        latestVersion: data.latestVersion,
        updateAvailable: data.updateAvailable,
        changelog: data.changelog,
        publishedAt: data.publishedAt,
      });
      if (data.updateAvailable) {
        showToast(
          `Ruffle ${data.latestVersion} is available! Current: ${data.currentVersion}`,
          'success'
        );
      } else {
        showToast('Ruffle is up to date!', 'success');
      }
    },
    onError: (error: unknown) => {
      const axiosError = error instanceof AxiosError ? error : null;
      const message = axiosError?.response?.data?.error?.message || 'Failed to check for updates';
      showToast(message, 'error');
    },
  });

  // Update Ruffle mutation
  const updateRuffle = useMutation({
    mutationFn: () => ruffleApi.update(),
    onSuccess: (data) => {
      showToast(`${data.message}. Please refresh the page to use the new version.`, 'success');
      refetchRuffleVersion();
      setUpdateCheckResult(null);
    },
    onError: (error: unknown) => {
      const axiosError = error instanceof AxiosError ? error : null;
      const message = axiosError?.response?.data?.error?.message || 'Failed to update Ruffle';
      showToast(message, 'error');
    },
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
            disabled={checkRuffleUpdate.isPending}
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

        {updateCheckResult ? (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">
                  {updateCheckResult.updateAvailable
                    ? `Update Available: ${updateCheckResult.latestVersion}`
                    : "You're up to date!"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {updateCheckResult.updateAvailable
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
                <Button onClick={() => updateRuffle.mutate()} disabled={updateRuffle.isPending}>
                  {updateRuffle.isPending ? (
                    <>
                      <Download className="mr-2 h-4 w-4 animate-pulse" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Update Now
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
