import { useState, useEffect, useRef } from "react";
import { logger } from '@/lib/logger';
import {
  RefreshCw,
  Download,
  CheckCircle,
  Database,
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormattedDate } from "@/components/common/FormattedDate";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/auth";
import { useDialog } from "@/contexts/DialogContext";
import { useMountEffect } from "@/hooks/useMountEffect";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ruffleApi, updatesApi } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MetadataUpdateInfo {
  hasUpdates: boolean;
  gamesUpdateAvailable: boolean;
  tagsUpdateAvailable: boolean;
  gamesUpdateCount?: number;
  tagsUpdateCount?: number;
  lastCheckedTime?: string;
  lastUpdateTime?: string;
  edition?: string;
}

interface UpdateSettingsTabProps {
  tabContentVariants: Variants;
}

export function UpdateSettingsTab({
  tabContentVariants,
}: UpdateSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const isAdmin = user?.permissions.includes("settings.update");

  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [metadataInfo, setMetadataInfo] = useState<MetadataUpdateInfo | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [updateCheckResult, setUpdateCheckResult] = useState<{
    latestVersion: string;
    updateAvailable: boolean;
    changelog?: string;
    publishedAt?: string;
  } | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  // Use ref to track poll interval (avoids stale closure issues)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingMetadata = useRef(false);

  // Fetch metadata update info from backend
  const fetchMetadataInfo = async () => {
    if (isFetchingMetadata.current) {
      return;
    }

    isFetchingMetadata.current = true;

    try {
      const response = await fetch("/api/updates/metadata");
      if (!response.ok) {
        throw new Error("Failed to check metadata updates");
      }

      const data = await response.json();
      setMetadataInfo(data);
    } catch (err) {
      logger.error("Error checking metadata updates:", err);
      setMetadataInfo({
        hasUpdates: false,
        gamesUpdateAvailable: false,
        tagsUpdateAvailable: false,
      });
      setError("Failed to check metadata updates. Please try again later.");
    } finally {
      isFetchingMetadata.current = false;
    }
  };

  // Load metadata update info on component mount
  useMountEffect(() => {
    fetchMetadataInfo();
  });

  const checkMetadataUpdates = async () => {
    isFetchingMetadata.current = false;
    await fetchMetadataInfo();
  };

  const syncMetadata = async () => {
    setIsSyncingMetadata(true);
    setSyncProgress(0);
    setSyncMessage("Starting sync...");
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
      const startResult = await updatesApi.startMetadataSync();

      if (!startResult.success) {
        showToast("Sync is already in progress", "warning");
        setIsSyncingMetadata(false);
        return;
      }

      showToast("Metadata sync started. Polling for progress...", "info");

      // Poll for status updates
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
            setSyncMessage("");

            if (status.stage === "completed" && status.result) {
              const result = status.result;
              const message = `Metadata sync completed! ${result.gamesUpdated} game${result.gamesUpdated !== 1 ? 's' : ''} updated.`;
              showToast(message, "success");
              await checkMetadataUpdates();
            } else if (status.stage === "failed") {
              throw new Error(status.error || "Metadata sync failed");
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
          setSyncMessage("");
          throw pollError;
        }
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsSyncingMetadata(false);
        setSyncProgress(0);
        setSyncMessage("");
        showToast("Sync timeout - please check server logs", "warning");
      }, 600000);
    } catch (err: any) {
      // Handle 409 conflict (sync already in progress)
      if (err?.response?.status === 409) {
        showToast("Sync is already in progress", "warning");
      } else {
        const errorMsg = err?.response?.data?.error || err?.message || "Failed to sync metadata";
        setError(errorMsg);
        showToast(errorMsg, "error");
      }

      setIsSyncingMetadata(false);
      setSyncProgress(0);
      setSyncMessage("");

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

  // Fetch Ruffle version (public - accessible to all users)
  const { data: ruffleVersion, refetch: refetchRuffleVersion } = useQuery({
    queryKey: ["ruffleVersion"],
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
          "success",
        );
      } else {
        showToast("Ruffle is up to date!", "success");
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message || "Failed to check for updates";
      showToast(message, "error");
    },
  });

  // Update Ruffle mutation
  const updateRuffle = useMutation({
    mutationFn: () => ruffleApi.update(),
    onSuccess: (data) => {
      showToast(
        `${data.message}. Please refresh the page to use the new version.`,
        "success",
      );
      refetchRuffleVersion();
      setUpdateCheckResult(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message || "Failed to update Ruffle";
      showToast(message, "error");
    },
  });

  // Auto-expand changelog if new version is available with changelog
  useEffect(() => {
    if (
      updateCheckResult?.updateAvailable &&
      updateCheckResult?.changelog
    ) {
      setShowChangelog(true);
    } else {
      setShowChangelog(false);
    }
  }, [updateCheckResult]);

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

  return (
    <motion.div
      key="update"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* Game Metadata Updates Section */}
      {isAdmin ? (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={24} className="text-primary" />
              <h2 className="text-xl font-semibold">Game Metadata</h2>
            </div>
            {metadataInfo?.edition !== "ultimate" ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={checkMetadataUpdates}
                    disabled={isFetchingMetadata.current}
                    size="icon"
                    variant="outline"
                  >
                    <RefreshCw
                      size={18}
                      className={isFetchingMetadata.current ? "animate-spin" : ""}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isFetchingMetadata.current
                      ? "Checking..."
                      : "Check for Updates"}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          {/* Ultimate Edition: No metadata sync available */}
          {metadataInfo?.edition === "ultimate" ? (
            <div className="bg-muted border border-border rounded-lg p-4 flex items-center gap-3">
              <Info size={20} className="text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-foreground font-medium">
                  Metadata sync not available
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Flashpoint Ultimate edition does not include a metadata source
                  server. Metadata sync is only available with Flashpoint Infinity.
                </p>
              </div>
            </div>
          ) : null}

          {/* Infinity Edition: Metadata sync UI */}
          {metadataInfo?.edition !== "ultimate" ? (
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
                      <Info
                        size={20}
                        className="text-primary flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-foreground font-medium mb-1">
                          {metadataInfo.gamesUpdateCount !== undefined &&
                          metadataInfo.gamesUpdateCount >= 0
                            ? `${metadataInfo.gamesUpdateCount} Game Info Update${metadataInfo.gamesUpdateCount !== 1 ? "s" : ""} Ready`
                            : "Game Info Updates Ready"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {metadataInfo.gamesUpdateCount !== undefined &&
                          metadataInfo.gamesUpdateCount >= 0 ? (
                            <>
                              There{" "}
                              {metadataInfo.gamesUpdateCount === 1
                                ? "is"
                                : "are"}{" "}
                              {metadataInfo.gamesUpdateCount} game info update
                              {metadataInfo.gamesUpdateCount !== 1
                                ? "s"
                                : ""}{" "}
                              available
                            </>
                          ) : (
                            <>Game metadata updates are available</>
                          )}
                        </p>
                        {metadataInfo.lastCheckedTime ? (
                          <p className="text-muted-foreground text-xs mt-2">
                            Last synced:{" "}
                            <FormattedDate date={metadataInfo.lastCheckedTime} type="datetime" />
                          </p>
                        ) : null}

                        {/* Progress Bar */}
                        {isSyncingMetadata ? (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-primary">
                                {syncMessage}
                              </span>
                              <span className="text-primary font-medium">
                                {syncProgress}%
                              </span>
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
                        <p>{isSyncingMetadata ? "Syncing..." : "Sync Now"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500" />
                  <div>
                    <p className="text-foreground font-medium">
                      Game metadata is up to date
                    </p>
                    {metadataInfo.lastCheckedTime ? (
                      <p className="text-muted-foreground text-xs mt-1">
                        Last synced:{" "}
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
      ) : null}

      {/* Ruffle Emulator Management (Admin Only) */}
      {isAdmin && ruffleVersion ? (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Download size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">
              Ruffle Emulator Management
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Current Version
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {ruffleVersion.currentVersion || "Not installed"}
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
                        ? "A new version of Ruffle is available for download."
                        : "You have the latest version of Ruffle installed."}
                    </p>
                    {updateCheckResult.publishedAt ? (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Published:{" "}
                          <FormattedDate
                            date={updateCheckResult.publishedAt}
                            type="date"
                          />
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {updateCheckResult.updateAvailable ? (
                    <Button
                      onClick={() => updateRuffle.mutate()}
                      disabled={updateRuffle.isPending}
                    >
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
                {updateCheckResult.updateAvailable &&
                  updateCheckResult.changelog ? (
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
                        <span>{showChangelog ? "Hide" : "View"} Changelog</span>
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
                Ruffle is an open-source Flash Player emulator. Keeping it up
                to date ensures the best compatibility and performance for Flash
                games.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> After updating Ruffle, you must refresh
                the browser page for the new version to take effect.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
