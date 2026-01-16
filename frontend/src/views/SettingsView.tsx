import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle, Settings, Database, Info } from 'lucide-react';
import { useDialog } from '@/contexts/DialogContext';
import { Button } from '@/components/ui/button';

interface ComponentStatus {
  id: string;
  name: string;
  state: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'CHECKING' | 'ERROR';
  currentVersion?: string;
  latestVersion?: string;
}

interface UpdateInfo {
  version: string;
  buildDate: string;
  componentsStatus: ComponentStatus[];
  lastChecked?: string;
}

interface MetadataUpdateInfo {
  hasUpdates: boolean;
  gamesUpdateAvailable: boolean;
  tagsUpdateAvailable: boolean;
  gamesUpdateCount?: number;
  tagsUpdateCount?: number;
  lastCheckedTime?: string;
  lastUpdateTime?: string;
}

export function SettingsView() {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [metadataInfo, setMetadataInfo] = useState<MetadataUpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useDialog();

  // Use ref to track poll interval (avoids stale closure issues)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we're currently fetching to prevent duplicate calls
  const isFetchingMetadata = useRef(false);

  // Load metadata update info on component mount
  useEffect(() => {
    // Use AbortController for proper cleanup
    const abortController = new AbortController();

    const fetchMetadata = async () => {
      // Prevent duplicate calls
      if (isFetchingMetadata.current) {
        return;
      }

      isFetchingMetadata.current = true;

      try {
        const response = await fetch('/api/updates/metadata', {
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error('Failed to check metadata updates');
        }

        const data = await response.json();

        // Only update state if not aborted
        if (!abortController.signal.aborted) {
          setMetadataInfo(data);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error checking metadata updates:', err);
      } finally {
        isFetchingMetadata.current = false;
      }
    };

    fetchMetadata();

    // Cleanup: abort fetch if component unmounts
    return () => {
      abortController.abort();
      isFetchingMetadata.current = false;
    };
  }, []);

  const checkMetadataUpdates = async () => {
    // Prevent duplicate calls
    if (isFetchingMetadata.current) {
      return;
    }

    isFetchingMetadata.current = true;

    try {
      const response = await fetch('/api/updates/metadata');
      if (!response.ok) {
        throw new Error('Failed to check metadata updates');
      }

      const data = await response.json();
      setMetadataInfo(data);
    } catch (err) {
      console.error('Error checking metadata updates:', err);
      // Don't show error to user - this is optional info
    } finally {
      isFetchingMetadata.current = false;
    }
  };

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    // Reset flag to allow explicit refresh
    isFetchingMetadata.current = false;

    try {
      // Check both component updates and metadata updates
      isFetchingMetadata.current = true;
      const [componentResponse, metadataResponse] = await Promise.all([
        fetch('/api/updates/check'),
        fetch('/api/updates/metadata')
      ]);

      if (!componentResponse.ok) {
        throw new Error('Failed to check for updates');
      }

      const componentData = await componentResponse.json();
      setUpdateInfo(componentData);

      // Metadata check is optional - don't fail if it errors
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        setMetadataInfo(metadataData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setIsChecking(false);
      isFetchingMetadata.current = false;
    }
  };

  const installUpdates = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/updates/install', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to install updates');
      }

      const result = await response.json();

      // Refresh update status
      await checkForUpdates();

      if (result.success) {
        showToast('Updates installed successfully! Please restart the application.', 'success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install updates');
    } finally {
      setIsUpdating(false);
    }
  };

  const syncMetadata = async () => {
    setIsSyncingMetadata(true);
    setSyncProgress(0);
    setSyncMessage('Starting sync...');
    setError(null);

    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      // Start the sync (non-blocking)
      const startResponse = await fetch('/api/updates/metadata/sync', {
        method: 'POST'
      });

      if (!startResponse.ok) {
        if (startResponse.status === 409) {
          showToast('Sync is already in progress', 'warning');
          setIsSyncingMetadata(false);
          return;
        }
        throw new Error('Failed to start metadata sync');
      }

      showToast('Metadata sync started. Polling for progress...', 'info');

      // Poll for status updates
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/updates/metadata/sync/status');
          if (!statusResponse.ok) {
            throw new Error('Failed to get sync status');
          }

          const status = await statusResponse.json();

          // Update progress state
          if (status.isRunning) {
            setSyncProgress(status.progress);
            setSyncMessage(status.message);
          } else {
            // Sync completed or failed - STOP POLLING IMMEDIATELY
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
              const message = `Metadata sync completed! ${result.gamesUpdated} games updated, ${result.tagsUpdated} tags, ${result.platformsUpdated} platforms, ${result.gamesDeleted} deleted.`;
              showToast(message, 'success');

              // Refresh metadata status
              await checkMetadataUpdates();
            } else if (status.stage === 'failed') {
              throw new Error(status.error || 'Metadata sync failed');
            }
          }
        } catch (pollError) {
          // Stop polling on error
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
          throw pollError;
        }
      }, 1000); // Poll every second

      // Set timeout to stop polling after 10 minutes (safety)
      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsSyncingMetadata(false);
        setSyncProgress(0);
        setSyncMessage('');
        showToast('Sync timeout - please check server logs', 'warning');
      }, 600000); // 10 minutes

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync metadata';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setIsSyncingMetadata(false);
      setSyncProgress(0);
      setSyncMessage('');

      // Clean up polling on error
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

  // Cleanup on unmount
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

  const hasUpdates = updateInfo?.componentsStatus.some(
    c => c.state === 'UPDATE_AVAILABLE'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings size={32} className="text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Version Info */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h2 className="text-xl font-semibold mb-4">Version Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Flashpoint Version:</span>
            <span className="font-medium">14.0.3 Infinity - Kingfisher</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Web App Version:</span>
            <span className="font-medium">{updateInfo?.version || '1.0.0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Build Date:</span>
            <span className="font-medium">{updateInfo?.buildDate || 'Unknown'}</span>
          </div>
          {updateInfo?.lastChecked && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Update Check:</span>
              <span className="font-medium">
                {new Date(updateInfo.lastChecked).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Update Section */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Updates</h2>
          <Button
            onClick={checkForUpdates}
            disabled={isChecking}
            className="gap-2"
          >
            <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {hasUpdates && updateInfo && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 font-medium mb-1">Updates Available</p>
                  <p className="text-yellow-400 text-sm">
                    {updateInfo.componentsStatus.filter(c => c.state === 'UPDATE_AVAILABLE').length} component(s) can be updated
                  </p>
                </div>
              </div>
              <Button
                onClick={installUpdates}
                disabled={isUpdating}
                variant="default"
                className="gap-2 flex-shrink-0"
              >
                <Download size={16} />
                {isUpdating ? 'Installing...' : 'Install Updates'}
              </Button>
            </div>
          </div>
        )}

        {updateInfo && !hasUpdates && !error && (
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <p className="text-green-300">All components are up to date</p>
          </div>
        )}

        {/* Game Metadata Updates (like Flashpoint Launcher) */}
        {!metadataInfo && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Database size={20} className="text-primary" />
              <h3 className="text-lg font-semibold">Game Metadata</h3>
            </div>

            {/* Skeleton Loading State */}
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
          </div>
        )}

        {metadataInfo && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Database size={20} className="text-primary" />
              <h3 className="text-lg font-semibold">Game Metadata</h3>
            </div>

            {metadataInfo.gamesUpdateAvailable ? (
              <div className="bg-primary-500/10 border border-primary-500 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Info size={20} className="text-primary-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-primary-300 font-medium mb-1">
                        {metadataInfo.gamesUpdateCount !== undefined && metadataInfo.gamesUpdateCount >= 0
                          ? `${metadataInfo.gamesUpdateCount} Game Info Update${metadataInfo.gamesUpdateCount !== 1 ? 's' : ''} Ready`
                          : 'Game Info Updates Ready'}
                      </p>
                      <p className="text-primary-400 text-sm">
                        {metadataInfo.gamesUpdateCount !== undefined && metadataInfo.gamesUpdateCount >= 0 ? (
                          <>There {metadataInfo.gamesUpdateCount === 1 ? 'is' : 'are'} {metadataInfo.gamesUpdateCount} game info update{metadataInfo.gamesUpdateCount !== 1 ? 's' : ''} available</>
                        ) : (
                          <>Game metadata updates are available</>
                        )}
                      </p>
                      {metadataInfo.lastCheckedTime && (
                        <p className="text-muted-foreground text-xs mt-2">
                          Last synced: {new Date(metadataInfo.lastCheckedTime).toLocaleString()}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {isSyncingMetadata && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-primary">{syncMessage}</span>
                            <span className="text-primary font-medium">{syncProgress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300 ease-out"
                              style={{ width: `${syncProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={syncMetadata}
                    disabled={isSyncingMetadata}
                    className="gap-2 flex-shrink-0"
                  >
                    {isSyncingMetadata ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {isSyncingMetadata ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400" />
                <div>
                  <p className="text-green-300">Game metadata is up to date</p>
                  {metadataInfo.lastCheckedTime && (
                    <p className="text-muted-foreground text-xs mt-1">
                      Last synced: {new Date(metadataInfo.lastCheckedTime).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Component Status */}
        {updateInfo?.componentsStatus && updateInfo.componentsStatus.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Component Status</h3>
            <div className="space-y-2">
              {updateInfo.componentsStatus.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-3 bg-accent rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    {component.state === 'UP_TO_DATE' && (
                      <CheckCircle size={18} className="text-green-400" />
                    )}
                    {component.state === 'UPDATE_AVAILABLE' && (
                      <AlertCircle size={18} className="text-yellow-400" />
                    )}
                    {component.state === 'ERROR' && (
                      <AlertCircle size={18} className="text-red-400" />
                    )}
                    {component.state === 'CHECKING' && (
                      <RefreshCw size={18} className="text-muted-foreground animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-xs text-muted-foreground">{component.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {component.currentVersion && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Current:</span>{' '}
                        <span className="font-medium">{component.currentVersion}</span>
                      </p>
                    )}
                    {component.state === 'UPDATE_AVAILABLE' && component.latestVersion && (
                      <p className="text-sm text-yellow-400">
                        <span className="text-muted-foreground">Available:</span>{' '}
                        <span className="font-medium">{component.latestVersion}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Settings Sections (for future expansion) */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h2 className="text-xl font-semibold mb-4">Preferences</h2>
        <p className="text-muted-foreground text-sm">
          Additional settings will be available in future updates.
        </p>
      </div>
    </div>
  );
}
