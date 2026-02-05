import { useEffect, useState } from 'react';

interface AnalogousColors {
  primary: string;
  warm: string;
  cool: string;
}

/**
 * Custom hook: Calculate analogous colors from CSS primary variable
 *
 * Reads the --primary CSS variable and generates analogous colors by shifting
 * the hue by ±30° on the color wheel while maintaining saturation and lightness.
 *
 * @returns Analogous color scheme with primary, warm (+30°), and cool (-30°) variants
 */
function useAnalogousColors(): AnalogousColors {
  const [colors, setColors] = useState<AnalogousColors>({
    primary: '221.2 83.2% 53.3%',
    warm: '251.2 83.2% 53.3%',
    cool: '191.2 83.2% 53.3%',
  });

  useEffect(() => {
    const calculateColors = () => {
      // Read --primary from root element
      const root = document.documentElement;
      const primaryValue = getComputedStyle(root).getPropertyValue('--primary').trim();

      if (primaryValue) {
        // Parse HSL values (format: "221.2 83.2% 53.3%")
        const values = primaryValue.split(' ').map((v) => parseFloat(v.replace('%', '')));

        if (values.length >= 3) {
          const [h, s, l] = values;

          setColors({
            primary: `${h} ${s}% ${l}%`,
            warm: `${(h + 30) % 360} ${s}% ${l}%`,
            cool: `${(h - 30 + 360) % 360} ${s}% ${l}%`,
          });
        }
      }
    };

    // Calculate colors on mount
    calculateColors();

    // Listen for theme changes via MutationObserver
    const observer = new MutationObserver(() => {
      calculateColors();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}

/**
 * Custom hook: Detect mobile for performance optimization
 *
 * @returns True if viewport width is less than 1024px
 */
function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * PrismaticBackground - Multi-colored light gradient ambient background
 *
 * Creates a sophisticated ambient effect using radial gradients that simulate
 * light diffused through frosted glass. Uses analogous color harmony based on
 * the theme's primary color.
 *
 * Features:
 * - Three radial gradient layers with analogous color scheme
 * - Slow circular drift and scale pulsing (60-80s cycles)
 * - Theme-aware: Calculates analogous colors from --primary CSS variable
 * - Responsive: Reduces to 2 layers on mobile (< 1024px)
 * - Accessibility: Respects prefers-reduced-motion
 *
 * Design Philosophy:
 * - Prismatic Light Diffusion aesthetic
 * - Simulates ambient light diffused through frosted glass
 * - Uses theme primary + analogous hues (±30° on color wheel)
 * - Subtle opacity (2-5%) for sophisticated, non-distracting effect
 *
 * Performance:
 * - GPU-accelerated animations (transform only)
 * - Minimal DOM (2-3 elements)
 * - CSS variables for dynamic opacity
 * - MutationObserver for efficient theme change detection
 */
export function PrismaticBackground() {
  const colors = useAnalogousColors();
  const isMobile = useMobile();

  return (
    <>
      {/* Light Layer 1: Primary color - Large ellipse, slow drift */}
      <div
        className="prismatic-light-1"
        style={{
          background: `radial-gradient(
            ellipse 150% 140% at 50% 50%,
            hsl(${colors.primary} / var(--prismatic-opacity-1)) 0%,
            transparent 85%
          )`,
        }}
        aria-hidden="true"
      />

      {/* Light Layer 2: Warm analogous - Medium ellipse, counter-drift */}
      <div
        className="prismatic-light-2"
        style={{
          background: `radial-gradient(
            ellipse 140% 160% at 50% 50%,
            hsl(${colors.warm} / var(--prismatic-opacity-2)) 0%,
            transparent 85%
          )`,
        }}
        aria-hidden="true"
      />

      {/* Light Layer 3: Cool analogous - Desktop only, vertical wave */}
      {!isMobile ? (
        <div
          className="prismatic-light-3"
          style={{
            background: `radial-gradient(
              ellipse 145% 130% at 50% 50%,
              hsl(${colors.cool} / var(--prismatic-opacity-3)) 0%,
              transparent 85%
            )`,
          }}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}
