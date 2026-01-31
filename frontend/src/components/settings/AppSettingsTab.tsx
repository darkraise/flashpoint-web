import { useState, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, Variants } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemSettingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useDialog } from "@/contexts/DialogContext";
import { AppSettings } from "@/types/settings";

interface AppSettingsTabProps {
  tabContentVariants: Variants;
}

export function AppSettingsTab({ tabContentVariants }: AppSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const isAdmin = user?.permissions.includes("settings.update");

  // Local state for site name input
  const [siteNameInput, setSiteNameInput] = useState("");

  // Fetch app settings
  const { data: appSettings } = useQuery({
    queryKey: ["systemSettings", "app"],
    queryFn: async () => systemSettingsApi.getCategory("app") as unknown as AppSettings,
    enabled: isAdmin,
  });

  // Sync local state with fetched settings
  useEffect(() => {
    if (appSettings?.siteName) {
      setSiteNameInput(appSettings.siteName);
    }
  }, [appSettings?.siteName]);

  // Update system settings mutation
  const updateSystemSettings = useMutation({
    mutationFn: ({
      category,
      settings,
    }: {
      category: string;
      settings: Record<string, unknown>;
    }) => systemSettingsApi.updateCategory(category, settings),
    onSuccess: (updatedSettings, variables) => {
      // Use response data instead of refetching
      queryClient.setQueryData(
        ["systemSettings", variables.category],
        updatedSettings
      );

      // Invalidate public settings cache so header updates
      queryClient.invalidateQueries({
        queryKey: ["system-settings", "public"],
      });

      showToast("Settings updated successfully", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.message || "Failed to update settings";
      showToast(message, "error");
    },
  });

  // Handler to save site name
  const handleSaveSiteName = () => {
    if (siteNameInput.trim() === "") {
      showToast("Site name cannot be empty", "error");
      return;
    }
    updateSystemSettings.mutate({
      category: "app",
      settings: { siteName: siteNameInput.trim() },
    });
  };

  return (
    <motion.div
      key="app"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {isAdmin && appSettings && (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Application Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="site-name" className="text-base">
                Site Name
              </Label>
              <p className="text-sm text-muted-foreground">
                The name displayed in the application header and browser title.
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="site-name"
                  type="text"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={siteNameInput}
                  onChange={(e) => setSiteNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveSiteName();
                    }
                  }}
                  disabled={updateSystemSettings.isPending}
                  placeholder="Enter site name"
                />
                <Button
                  onClick={handleSaveSiteName}
                  disabled={
                    updateSystemSettings.isPending ||
                    siteNameInput.trim() === "" ||
                    siteNameInput === appSettings?.siteName
                  }
                  size="icon"
                  title="Save site name"
                >
                  <Check size={18} />
                </Button>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode" className="text-base">
                  Maintenance Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable maintenance mode to prevent non-admin users from
                  accessing the application.
                </p>
              </div>
              <Switch
                id="maintenance-mode"
                checked={appSettings.maintenanceMode || false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: "app",
                    settings: { maintenanceMode: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {/* Default Theme */}
            <div className="space-y-2">
              <Label htmlFor="default-theme" className="text-base">
                Default Theme
              </Label>
              <p className="text-sm text-muted-foreground">
                Default theme mode for new users (light, dark, or system).
              </p>
              <Select
                value={appSettings.defaultTheme || "dark"}
                onValueChange={(value: string) => {
                  updateSystemSettings.mutate({
                    category: "app",
                    settings: { defaultTheme: value },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              >
                <SelectTrigger id="default-theme" className="w-full">
                  <SelectValue placeholder="Select default theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="default-primary-color" className="text-base">
                Default Primary Color
              </Label>
              <p className="text-sm text-muted-foreground">
                Default primary color for new users.
              </p>
              <Select
                value={appSettings.defaultPrimaryColor || "blue"}
                onValueChange={(value: string) => {
                  updateSystemSettings.mutate({
                    category: "app",
                    settings: {
                      defaultPrimaryColor: value,
                    },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              >
                <SelectTrigger id="default-primary-color" className="w-full">
                  <SelectValue placeholder="Select default primary color" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="slate">Slate</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="zinc">Zinc</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="stone">Stone</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="lime">Lime</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="teal">Teal</SelectItem>
                  <SelectItem value="cyan">Cyan</SelectItem>
                  <SelectItem value="sky">Sky</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="indigo">Indigo</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="fuchsia">Fuchsia</SelectItem>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
