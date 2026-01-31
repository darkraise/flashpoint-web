import { useState } from "react";
import { Settings } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { ruffleApi, systemSettingsApi } from "@/lib/api";

// Tab components
import { GeneralSettingsTab } from "@/components/settings/GeneralSettingsTab";
import { AppSettingsTab } from "@/components/settings/AppSettingsTab";
import { UpdateSettingsTab } from "@/components/settings/UpdateSettingsTab";
import { FeaturesSettingsTab } from "@/components/settings/FeaturesSettingsTab";

// Animation variants for tab transitions - smooth cross-fade
const tabContentVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("general");
  const { user } = useAuthStore();
  const isAdmin = user?.permissions.includes("settings.update");

  // Fetch Ruffle version for non-admin users
  const { data: ruffleVersion, isLoading: isLoadingRuffleVersion } = useQuery({
    queryKey: ["ruffleVersion"],
    queryFn: () => ruffleApi.getVersion(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isAdmin, // Only fetch for non-admin users (admin users get it from GeneralSettingsTab)
  });

  // Fetch metadata settings for Flashpoint version
  const { data: metadataSettings } = useQuery({
    queryKey: ["systemSettings", "metadata"],
    queryFn: () => systemSettingsApi.getCategory("metadata"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isAdmin, // Only fetch for non-admin users
  });

  // Get version strings
  const flashpointVersion =
    (typeof metadataSettings?.flashpointVersion === 'string' ? metadataSettings.flashpointVersion : null) || "Unknown";
  const webAppVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Tabbed Interface - Only show tabs for admin users */}
        {isAdmin ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 border-2 border-primary/60 h-full">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="app">App</TabsTrigger>
              <TabsTrigger value="update">Update</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {activeTab === "general" && (
                  <GeneralSettingsTab tabContentVariants={tabContentVariants} />
                )}

                {activeTab === "app" && (
                  <AppSettingsTab tabContentVariants={tabContentVariants} />
                )}

                {activeTab === "update" && (
                  <UpdateSettingsTab tabContentVariants={tabContentVariants} />
                )}

                {activeTab === "features" && (
                  <FeaturesSettingsTab tabContentVariants={tabContentVariants} />
                )}
              </AnimatePresence>
            </div>
          </Tabs>
        ) : (
          // Non-admin users: Show only Version Info without tabs
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 border border-border shadow-md">
              <h2 className="text-xl font-semibold mb-4">
                Version Information
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Flashpoint Version:
                  </span>
                  <span className="font-medium">
                    {flashpointVersion}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Web App Version:
                  </span>
                  <span className="font-medium">{webAppVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Ruffle Emulator:
                  </span>
                  <span className="font-medium">
                    {isLoadingRuffleVersion
                      ? "Loading..."
                      : ruffleVersion?.currentVersion || "Not installed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
