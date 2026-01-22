import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "@/store/ui";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} />

        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
