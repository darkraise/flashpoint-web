import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { RefreshCw, Download, CheckCircle, Database, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormattedDate } from '@/components/common/FormattedDate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDialog } from '@/contexts/DialogContext';
import { useMountEffect } from '@/hooks/useMountEffect';
import {
  updatesApi,
  MetadataUpdateInfo,
  systemSettingsApi,
  type AssetDownloadProgress,
} from '@/lib/api';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/types/api-error';
import { AxiosError } from 'axios';

/** The source the Infinity build ships with; the only one offered by the override. */
const DEFAULT_METADATA_SOURCE = 'https://fpfss.flashpointarchive.org';

export function MetadataUpdateCard() {
  const { showToast, showConfirm } = useDialog();
  const { data: publicSettings } = usePublicSettings();
  const isUltimate = publicSettings?.metadata?.flashpointEdition === 'ultimate';

  const [downloadAssetsEnabled, setDownloadAssetsEnabled] = useState(false);
  const [assetProgress, setAssetProgress] = useState<AssetDownloadProgress | null>(null);
  const [customSourceEnabled, setCustomSourceEnabled] = useState(false);
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [isSavingSource, setIsSavingSource] = useState(false);

  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [metadataInfo, setMetadataInfo] = useState<MetadataUpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Use ref for the fetch guard to avoid stale closure issues in interval callbacks
  const isFetchingRef = useRef(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Use ref to track poll interval (avoids stale closure issues)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetadataInfo = async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsFetchingMetadata(true);

    try {
      const data = await updatesApi.getMetadataInfo();
      setMetadataInfo(data);
    } catch (err) {
      logger.error('Error checking metadata updates:', err);
      setMetadataInfo({
        hasUpdates: false,
        gamesUpdateAvailable: false,
        tagsUpdateAvailable: false,
      });
      setError('Failed to check metadata updates. Please try again later.');
    } finally {
      isFetchingRef.current = false;
      setIsFetchingMetadata(false);
    }
  };

  const loadSourceSettings = async () => {
    try {
      const settings = await systemSettingsApi.getCategory('metadata');
      setCustomSourceEnabled(settings.customSourceEnabled === true);
      setCustomSourceUrl(
        typeof settings.customSourceUrl === 'string' ? settings.customSourceUrl : ''
      );
      setDownloadAssetsEnabled(settings.downloadAssetsEnabled === true);
    } catch (err) {
      logger.error('Error loading metadata source settings:', err);
    }
  };

  useMountEffect(() => {
    fetchMetadataInfo();
    loadSourceSettings();
  });

  const handleToggleCustomSource = async (enabled: boolean) => {
    if (enabled) {
      const confirmed = await showConfirm({
        title: 'Enable metadata updates?',
        message:
          'Metadata sync rewrites your Flashpoint database. It adds games released since your ' +
          'package was built — which have no files on disk until downloaded — and removes games ' +
          'deleted upstream, even when you still have their files. No backup is taken. Enable only ' +
          'if you accept a library that mixes installed and not-installed games.',
        confirmText: 'Enable',
        variant: 'warning',
      });

      if (!confirmed) {
        return;
      }
    }

    setIsSavingSource(true);
    try {
      const url = enabled ? customSourceUrl || DEFAULT_METADATA_SOURCE : customSourceUrl;
      await systemSettingsApi.updateCategory('metadata', {
        customSourceEnabled: enabled,
        customSourceUrl: url,
      });

      setCustomSourceEnabled(enabled);
      setCustomSourceUrl(url);
      showToast(enabled ? 'Metadata source enabled' : 'Metadata source disabled', 'success');

      isFetchingRef.current = false;
      await fetchMetadataInfo();
    } catch (err) {
      logger.error('Error updating metadata source:', err);
      showToast(getErrorMessage(err) || 'Failed to update metadata source', 'error');
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleToggleDownloadAssets = async (enabled: boolean) => {
    setIsSavingSource(true);
    try {
      await systemSettingsApi.updateCategory('metadata', { downloadAssetsEnabled: enabled });
      setDownloadAssetsEnabled(enabled);
      showToast(
        enabled ? 'Images will download after each sync' : 'Images will load on demand',
        'success'
      );
    } catch (err) {
      logger.error('Error updating asset download setting:', err);
      showToast(getErrorMessage(err) || 'Failed to update setting', 'error');
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleCancelAssetDownload = async () => {
    try {
      await updatesApi.cancelAssetDownload();
      showToast('Stopping image download...', 'info');
    } catch (err) {
      logger.error('Error cancelling asset download:', err);
    }
  };

  // Poll only while a download is running, so an idle page stays quiet.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const progress = await updatesApi.getAssetDownloadStatus();
        if (!cancelled) {
          setAssetProgress(progress.isRunning || progress.processed > 0 ? progress : null);
        }
      } catch {
        // A failed poll is not worth surfacing; the next tick retries.
      }
    };

    poll();
    const interval = setInterval(poll, assetProgress?.isRunning ? 2000 : 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [assetProgress?.isRunning]);

  const checkMetadataUpdates = async () => {
    isFetchingRef.current = false;
    await fetchMetadataInfo();
  };

  const syncMetadata = async () => {
    setIsSyncingMetadata(true);
    setSyncProgress(0);
    setSyncMessage('Starting sync...');
    setError(null);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const startResult = await updatesApi.startMetadataSync();

      if (!startResult.success) {
        showToast('Sync is already in progress', 'warning');
        setIsSyncingMetadata(false);
        return;
      }

      showToast('Metadata sync started. Polling for progress...', 'info');

      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await updatesApi.getMetadataSyncStatus();

          if (status.isRunning) {
            setSyncProgress(status.progress);
            setSyncMessage(status.message);
          } else {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            setIsSyncingMetadata(false);
            setSyncProgress(0);
            setSyncMessage('');

            if (status.stage === 'completed' && status.result) {
              const result = status.result;
              const message = `Metadata sync completed! ${result.gamesUpdated} game${result.gamesUpdated !== 1 ? 's' : ''} updated.`;
              showToast(message, 'success');
              await checkMetadataUpdates();
            } else if (status.stage === 'failed') {
              throw new Error(status.error || 'Metadata sync failed');
            }
          }
        } catch (pollError) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setIsSyncingMetadata(false);
          setSyncProgress(0);
          setSyncMessage('');
          // Handle error within the interval callback instead of throwing
          // (thrown errors from setInterval callbacks become unhandled rejections)
          const errorMsg = pollError instanceof Error ? pollError.message : 'Metadata sync failed';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        }
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsSyncingMetadata(false);
        setSyncProgress(0);
        setSyncMessage('');
        showToast('Sync timeout - please check server logs', 'warning');
      }, 600000);
    } catch (err: unknown) {
      // Handle 409 conflict (sync already in progress)
      const axiosError = err instanceof AxiosError ? err : null;
      if (axiosError?.response?.status === 409) {
        showToast('Sync is already in progress', 'warning');
      } else {
        const errorMsg =
          axiosError?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Failed to sync metadata');
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }

      setIsSyncingMetadata(false);
      setSyncProgress(0);
      setSyncMessage('');

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database size={24} className="text-primary" />
          <h2 className="text-xl font-semibold">Game Metadata</h2>
        </div>
        {metadataInfo?.hasMetadataSource ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={checkMetadataUpdates}
                disabled={isFetchingMetadata}
                size="icon"
                variant="outline"
              >
                <RefreshCw size={18} className={isFetchingMetadata ? 'animate-spin' : ''} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFetchingMetadata ? 'Checking...' : 'Check for Updates'}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* Skeleton Loading State */}
      {!metadataInfo ? (
        <div className="bg-muted border border-border rounded-lg p-4 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-5 h-5 bg-accent rounded-full flex-shrink-0 mt-0.5"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-accent rounded w-48"></div>
                <div className="h-4 bg-accent rounded w-64"></div>
                <div className="h-3 bg-accent rounded w-40"></div>
              </div>
            </div>
            <div className="w-10 h-10 bg-accent rounded-lg flex-shrink-0"></div>
          </div>
        </div>
      ) : null}

      {/* No metadata source configured: Sync not available */}
      {metadataInfo && !metadataInfo.hasMetadataSource ? (
        <div className="bg-muted border border-border rounded-lg p-4 flex items-start gap-3">
          <Info size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground font-medium">Metadata sync not available</p>
            {isUltimate ? (
              <p className="text-muted-foreground text-sm mt-1">
                The Ultimate edition ships without a metadata source, so it does not support
                metadata updates. Updating means downloading a newer full package. Advanced
                administrators can still enable updates below.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">
                No metadata source is configured. Metadata sync requires a configured metadata
                source in the Flashpoint preferences, or the advanced override below.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Advanced: admin-configured metadata source */}
      {metadataInfo ? (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="metadata-custom-source" className="text-base">
                Advanced: Set Metadata Source
              </Label>
              <p className="text-sm text-muted-foreground">
                Sync metadata from {DEFAULT_METADATA_SOURCE} even when Flashpoint preferences define
                no source.
              </p>
            </div>
            <Switch
              id="metadata-custom-source"
              checked={customSourceEnabled}
              disabled={isSavingSource}
              onCheckedChange={handleToggleCustomSource}
            />
          </div>

          {customSourceEnabled ? (
            <p className="text-xs text-muted-foreground mt-3">
              Source:{' '}
              <span className="font-mono">{customSourceUrl || DEFAULT_METADATA_SOURCE}</span>
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4 mt-4">
            <div className="space-y-0.5">
              <Label htmlFor="metadata-download-assets" className="text-base">
                Download Images After Sync
              </Label>
              <p className="text-sm text-muted-foreground">
                Fetch logos and screenshots for newly synced games instead of loading them on
                demand. Useful when the server is offline for its users.
              </p>
            </div>
            <Switch
              id="metadata-download-assets"
              checked={downloadAssetsEnabled}
              disabled={isSavingSource}
              onCheckedChange={handleToggleDownloadAssets}
            />
          </div>

          {assetProgress ? (
            <div className="mt-3 bg-muted border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-foreground">
                  {assetProgress.isRunning ? 'Downloading images' : 'Last image download'}:{' '}
                  {assetProgress.processed}/{assetProgress.total} checked,{' '}
                  {assetProgress.downloaded} downloaded, {assetProgress.skipped} already present
                  {assetProgress.cancelled ? ' (cancelled)' : ''}
                </p>
                {assetProgress.isRunning ? (
                  <Button variant="outline" size="sm" onClick={handleCancelAssetDownload}>
                    Stop
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Metadata source configured: Sync UI */}
      {metadataInfo?.hasMetadataSource ? (
        <>
          {/* Error Message */}
          {error ? (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-4 flex items-start gap-2">
              <p className="text-foreground text-sm font-medium">{error}</p>
            </div>
          ) : null}

          {/* Metadata Update Info */}
          {metadataInfo.gamesUpdateAvailable ? (
            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-foreground font-medium mb-1">
                      {metadataInfo.gamesUpdateCount !== undefined &&
                      metadataInfo.gamesUpdateCount >= 0
                        ? `${metadataInfo.gamesUpdateCount} Game Info Update${metadataInfo.gamesUpdateCount !== 1 ? 's' : ''} Ready`
                        : 'Game Info Updates Ready'}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {metadataInfo.gamesUpdateCount !== undefined &&
                      metadataInfo.gamesUpdateCount >= 0 ? (
                        <>
                          There {metadataInfo.gamesUpdateCount === 1 ? 'is' : 'are'}{' '}
                          {metadataInfo.gamesUpdateCount} game info update
                          {metadataInfo.gamesUpdateCount !== 1 ? 's' : ''} available
                        </>
                      ) : (
                        <>Game metadata updates are available</>
                      )}
                    </p>
                    {metadataInfo.lastCheckedTime ? (
                      <p className="text-muted-foreground text-xs mt-2">
                        Last synced:{' '}
                        <FormattedDate date={metadataInfo.lastCheckedTime} type="datetime" />
                      </p>
                    ) : null}

                    {/* Progress Bar */}
                    {isSyncingMetadata ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-primary">{syncMessage}</span>
                          <span className="text-primary font-medium">{syncProgress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{
                              width: `${syncProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={syncMetadata}
                      disabled={isSyncingMetadata}
                      size="icon"
                      className="flex-shrink-0"
                    >
                      {isSyncingMetadata ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSyncingMetadata ? 'Syncing...' : 'Sync Now'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <p className="text-foreground font-medium">Game metadata is up to date</p>
                {metadataInfo.lastCheckedTime ? (
                  <p className="text-muted-foreground text-xs mt-1">
                    Last synced:{' '}
                    <FormattedDate date={metadataInfo.lastCheckedTime} type="datetime" />
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
