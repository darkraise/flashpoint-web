import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface PlatformIconProps {
  platformName: string;
  size?: number;
  className?: string;
}

/**
 * PlatformIcon component that displays a platform logo image
 * Falls back to a Badge if the image fails to load
 */
export function PlatformIcon({ platformName, size = 20, className = '' }: PlatformIconProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const logoUrl = `/proxy/logos/${platformName}.png`;

  if (imageError) {
    // Fallback to Badge if image fails to load
    return <Badge variant="platform">{platformName}</Badge>;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="relative inline-flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {imageLoading ? (
          <div
            className="absolute inset-0 bg-muted rounded animate-pulse"
            style={{ width: size, height: size }}
          />
        ) : null}
        <img
          src={logoUrl}
          alt={`${platformName} logo`}
          className="relative z-10 object-contain"
          style={{ width: size, height: size }}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
      </div>
      <span className="font-medium text-sm">{platformName}</span>
    </div>
  );
}
