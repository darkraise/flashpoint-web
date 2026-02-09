import { useState } from 'react';
import { Star, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import { useMountEffect } from '@/hooks/useMountEffect';
import { githubApi } from '@/lib/api';

export function GitHubButton() {
  const [stars, setStars] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const repoUrl = 'https://github.com/darkraise/flashpoint-web';

  useMountEffect(() => {
    const fetchStarCount = async () => {
      try {
        const result = await githubApi.getStarCount();
        setStars(result.stars);
        logger.debug(`GitHub stars fetched: ${result.stars}`);
      } catch (error) {
        logger.warn('Failed to fetch GitHub stars:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStarCount();
  });

  const formatStarCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const handleClick = () => {
    window.open(repoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="h-10 gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
      title="Star on GitHub"
    >
      <Github className="h-4 w-4" />
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
        <Star className="h-3 w-3 fill-current" />
        {isLoading ? (
          <Skeleton className="h-3 w-6" />
        ) : (
          <span className="text-xs font-semibold">{formatStarCount(stars)}</span>
        )}
      </div>
    </Button>
  );
}
