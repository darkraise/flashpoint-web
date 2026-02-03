import { Shield, Calendar, HardDrive } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, Variants } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authSettingsApi, ruffleApi, usersApi, systemSettingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useDialog } from "@/contexts/DialogContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GeneralSettingsTabProps {
  tabContentVariants: Variants;
}

export function GeneralSettingsTab({
  tabContentVariants,
}: GeneralSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const isAdmin = user?.permissions.includes("settings.update");

  // Fetch metadata settings (for edition)
  const { data: metadataSettings } = useQuery({
    queryKey: ["systemSettings", "metadata"],
    queryFn: () => systemSettingsApi.getCategory("metadata"),
    staleTime: 5 * 60 * 1000,
    enabled: isAdmin,
  });

  // Update edition setting mutation
  const updateEdition = useMutation({
    mutationFn: (edition: string) =>
      systemSettingsApi.updateSetting("metadata", "flashpoint_edition", edition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings", "metadata"] });
      showToast("Flashpoint edition updated", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message || "Failed to update edition";
      showToast(message, "error");
    },
  });

  // Fetch auth settings
  const { data: authSettings, refetch: refetchAuthSettings } = useQuery({
    queryKey: ["authSettings"],
    queryFn: () => authSettingsApi.get(),
    enabled: isAdmin,
  });

  // Fetch Ruffle version (public - accessible to all users)
  const { data: ruffleVersion, isLoading: isLoadingRuffleVersion } = useQuery({
    queryKey: ["ruffleVersion"],
    queryFn: () => ruffleApi.getVersion(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user settings (for date/time format preferences)
  const { data: userSettings, refetch: refetchUserSettings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: () => usersApi.getAllSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Update user settings mutation (for date/time format preferences)
  const updateUserSettings = useMutation({
    mutationFn: (settings: Record<string, string>) =>
      usersApi.updateSettings(settings),
    onSuccess: () => {
      refetchUserSettings();
      showToast("Settings updated successfully", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message || "Failed to update settings";
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
            <span className="font-medium">
              {metadataSettings?.flashpointVersion
                ? String(metadataSettings.flashpointVersion)
                : "Unknown"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Web App Version:</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ruffle Emulator:</span>
            <span className="font-medium">
              {isLoadingRuffleVersion
                ? "Loading..."
                : ruffleVersion?.currentVersion || "Not installed"}
            </span>
          </div>
        </div>
      </div>

      {/* Flashpoint Edition (Admin Only) */}
      {isAdmin && metadataSettings && (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Flashpoint Edition</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="flashpoint-edition" className="text-base">
              Edition
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Select the Flashpoint edition you are running. This affects
              metadata sync availability and game data schema.
            </p>
            <Select
              value={
                (metadataSettings.flashpointEdition as string) || "infinity"
              }
              onValueChange={(value: string) => {
                updateEdition.mutate(value);
              }}
              disabled={updateEdition.isPending}
            >
              <SelectTrigger id="flashpoint-edition" className="w-full">
                <SelectValue placeholder="Select edition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="infinity">
                  Infinity
                </SelectItem>
                <SelectItem value="ultimate">
                  Ultimate
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {(metadataSettings.flashpointEdition as string) === "ultimate"
                ? "Ultimate edition: Metadata sync is not available. Game images are served from local files only."
                : "Infinity edition: Metadata sync is available. Game table includes logo and screenshot paths."}
            </p>
          </div>
        </div>
      )}

      {/* Date & Time Format Settings - Available to all authenticated users */}
      {userSettings && (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Date & Time Format</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date-format" className="text-base">
                Date Format
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose how dates are displayed throughout the application
              </p>
              <Select
                value={userSettings.date_format || "MM/dd/yyyy"}
                onValueChange={(value: string) => {
                  updateUserSettings.mutate({ date_format: value });
                }}
                disabled={updateUserSettings.isPending}
              >
                <SelectTrigger id="date-format" className="w-full">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (01/24/2026)</SelectItem>
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (24/01/2026)</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2026-01-24)</SelectItem>
                  <SelectItem value="MMM dd, yyyy">MMM DD, YYYY (Jan 24, 2026)</SelectItem>
                  <SelectItem value="MMMM dd, yyyy">MMMM DD, YYYY (January 24, 2026)</SelectItem>
                  <SelectItem value="dd MMM yyyy">DD MMM YYYY (24 Jan 2026)</SelectItem>
                  <SelectItem value="dd MMMM yyyy">DD MMMM YYYY (24 January 2026)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-format" className="text-base">
                Time Format
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose how times are displayed throughout the application
              </p>
              <Select
                value={userSettings.time_format || "hh:mm a"}
                onValueChange={(value: string) => {
                  updateUserSettings.mutate({ time_format: value });
                }}
                disabled={updateUserSettings.isPending}
              >
                <SelectTrigger id="time-format" className="w-full">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hh:mm a">12-hour (02:30 PM)</SelectItem>
                  <SelectItem value="HH:mm">24-hour (14:30)</SelectItem>
                  <SelectItem value="hh:mm:ss a">12-hour with seconds (02:30:45 PM)</SelectItem>
                  <SelectItem value="HH:mm:ss">24-hour with seconds (14:30:45)</SelectItem>
                </SelectContent>
              </Select>
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
