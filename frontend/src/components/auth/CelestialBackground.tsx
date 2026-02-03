import { useEffect, useState } from 'react';

/**
 * CelestialBackground - Animated starfield and nebula gradient mesh
 *
 * Features:
 * - Multi-layer starfield with twinkling animation (3 sizes: small, medium, large)
 * - Animated nebula gradient mesh with 30-40s cycle
 * - Theme-aware using CSS variables
 * - Responsive (reduced stars on mobile for performance)
 * - Accessibility (respects prefers-reduced-motion)
 *
 * Performance:
 * - Desktop: 105 stars (60 small, 30 medium, 15 large)
 * - Mobile: 53 stars (30 small, 15 medium, 8 large)
 * - Pure CSS animations (GPU accelerated)
 * - Single DOM elements with box-shadow technique
 */
export function CelestialBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile for performance optimization
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {/* Nebula Layer 1: Primary color with slow drift */}
      <div className="celestial-nebula-1" aria-hidden="true" />

      {/* Nebula Layer 2: Offset animation for depth */}
      <div className="celestial-nebula-2" aria-hidden="true" />

      {/* Nebula Layer 3: Subtle accent layer */}
      <div className="celestial-nebula-3" aria-hidden="true" />

      {/* Starfield Small Stars - Layer 1 (furthest) */}
      <div className={`celestial-stars-small ${isMobile ? 'mobile' : ''}`} aria-hidden="true" />

      {/* Starfield Medium Stars - Layer 2 (mid-depth) */}
      <div className={`celestial-stars-medium ${isMobile ? 'mobile' : ''}`} aria-hidden="true" />

      {/* Starfield Large Stars - Layer 3 (closest) */}
      <div className={`celestial-stars-large ${isMobile ? 'mobile' : ''}`} aria-hidden="true" />
    </>
  );
}
