import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { RefreshCw, Download, CheckCircle, Database, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormattedDate } from '@/components/common/FormattedDate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDialog } from '@/contexts/DialogContext';
import { useMountEffect } from '@/hooks/useMountEffect';
import { updatesApi, MetadataUpdateInfo } from '@/lib/api';
import { AxiosError } from 'axios';

export function MetadataUpdateCard() {
  const { showToast } = useDialog();

  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [metadataInfo, setMetadataInfo] = useState<MetadataUpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Use ref to track poll interval (avoids stale closure issues)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetadataInfo = async () => {
    if (isFetchingMetadata) {
      return;
    }

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
      setIsFetchingMetadata(false);
    }
  };

  useMountEffect(() => {
    fetchMetadataInfo();
  });

  const checkMetadataUpdates = async () => {
    setIsFetchingMetadata(false);
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
        {metadataInfo?.edition !== 'ultimate' ? (
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

      {/* Ultimate Edition: No metadata sync available */}
      {metadataInfo?.edition === 'ultimate' ? (
        <div className="bg-muted border border-border rounded-lg p-4 flex items-center gap-3">
          <Info size={20} className="text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-foreground font-medium">Metadata sync not available</p>
            <p className="text-muted-foreground text-sm mt-1">
              Flashpoint Ultimate edition does not include a metadata source server. Metadata sync
              is only available with Flashpoint Infinity.
            </p>
          </div>
        </div>
      ) : null}

      {/* Infinity Edition: Metadata sync UI */}
      {metadataInfo?.edition !== 'ultimate' ? (
        <>
          {/* Error Message */}
          {error ? (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-4 flex items-start gap-2">
              <p className="text-foreground text-sm font-medium">{error}</p>
            </div>
          ) : null}

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
                <div className="w-24 h-10 bg-accent rounded-lg flex-shrink-0"></div>
              </div>
            </div>
          ) : null}

          {/* Metadata Update Info */}
          {metadataInfo ? (
            <div>
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
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
