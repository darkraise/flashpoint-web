import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Loader2 } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { gamesApi } from '@/lib/api/games';
import { useUIStore } from '@/store/ui';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleFeelingLucky = async () => {
    setIsNavigating(true);
    try {
      const game = await gamesApi.getRandom();
      navigate(`/games/${game.id}`, {
        state: { breadcrumbContext: { label: 'Home', href: '/' } },
      });
    } catch {
      // silently fail
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-40 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to navigation
      </a>

      <Header />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar isOpen={sidebarOpen} />

        <main id="main-content" className="flex-1 overflow-auto bg-background p-6 min-h-0">
          {children}
        </main>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={handleFeelingLucky}
            disabled={isNavigating}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="I'm Feeling Lucky — open a random game"
          >
            {isNavigating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Shuffle className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">I'm Feeling Lucky</TooltipContent>
      </Tooltip>
    </div>
  );
}
