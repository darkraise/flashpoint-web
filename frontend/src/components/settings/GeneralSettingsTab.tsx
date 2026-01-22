import {
  Shield,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authSettingsApi, ruffleApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useDialog } from "@/contexts/DialogContext";
import { useState } from "react";

interface GeneralSettingsTabProps {
  tabContentVariants: any;
}

export function GeneralSettingsTab({
  tabContentVariants,
}: GeneralSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const isAdmin = user?.permissions.includes("settings.update");
  const [updateCheckResult, setUpdateCheckResult] = useState<{
    latestVersion: string;
    updateAvailable: boolean;
  } | null>(null);

  // Fetch auth settings
  const { data: authSettings, refetch: refetchAuthSettings } = useQuery({
    queryKey: ["authSettings"],
    queryFn: () => authSettingsApi.get(),
    enabled: isAdmin,
  });

  // Fetch Ruffle version
  const { data: ruffleVersion, refetch: refetchRuffleVersion } = useQuery({
    queryKey: ["ruffleVersion"],
    queryFn: () => ruffleApi.getVersion(),
  });

  // Update auth settings mutation
  const updateAuthSettings = useMutation({
    mutationFn: (settings: Partial<any>) => authSettingsApi.update(settings),
    onSuccess: () => {
      refetchAuthSettings();
      showToast("Settings updated successfully", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message || "Failed to update settings";
      showToast(message, "error");
    },
  });

  // Check for Ruffle update mutation
  const checkRuffleUpdate = useMutation({
    mutationFn: () => ruffleApi.checkUpdate(),
    onSuccess: (data) => {
      setUpdateCheckResult({
        latestVersion: data.latestVersion,
        updateAvailable: data.updateAvailable,
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

  return (
    <motion.div
      key="general"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
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
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ruffle Emulator:</span>
            <span className="font-medium">
              {ruffleVersion?.currentVersion || "Not installed"}
            </span>
          </div>
        </div>
      </div>

      {/* Ruffle Management (Admin Only) */}
      {isAdmin && ruffleVersion && (
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
                <Label className="text-sm text-muted-foreground">Current Version</Label>
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

            {updateCheckResult && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
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
                  </div>
                  {updateCheckResult.updateAvailable && (
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
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground pt-2 space-y-1">
              <p>
                Ruffle is an open-source Flash Player emulator. Keeping it up to
                date ensures the best compatibility and performance for Flash
                games.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> After updating Ruffle, you must refresh
                the browser page for the new version to take effect.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Settings (Admin Only) */}
      {isAdmin && (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Authentication Settings</h2>
          </div>

          {authSettings && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="user-registration" className="text-base">
                    Allow User Registration
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, anonymous users can create their own accounts.
                    When disabled, only administrators can create users.
                  </p>
                </div>
                <Switch
                  id="user-registration"
                  checked={authSettings.userRegistrationEnabled}
                  onCheckedChange={(checked: boolean) => {
                    updateAuthSettings.mutate({
                      userRegistrationEnabled: checked,
                    });
                  }}
                  disabled={updateAuthSettings.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="guest-access" className="text-base">
                    Allow Guest Access
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users can browse games without logging in.
                    When disabled, authentication is required to access the
                    application.
                  </p>
                </div>
                <Switch
                  id="guest-access"
                  checked={authSettings.guestAccessEnabled}
                  onCheckedChange={(checked: boolean) => {
                    updateAuthSettings.mutate({
                      guestAccessEnabled: checked,
                    });
                  }}
                  disabled={updateAuthSettings.isPending}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
