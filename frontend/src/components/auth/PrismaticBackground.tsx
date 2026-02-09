import { useEffect, useState } from 'react';

interface AnalogousColors {
  primary: string;
  warm: string;
  cool: string;
}

// Generates analogous colors by shifting the --primary hue by +/-30 degrees
function useAnalogousColors(): AnalogousColors {
  const [colors, setColors] = useState<AnalogousColors>({
    primary: '221.2 83.2% 53.3%',
    warm: '251.2 83.2% 53.3%',
    cool: '191.2 83.2% 53.3%',
  });

  useEffect(() => {
    const calculateColors = () => {
      const root = document.documentElement;
      const primaryValue = getComputedStyle(root).getPropertyValue('--primary').trim();

      if (primaryValue) {
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

    calculateColors();

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

export function PrismaticBackground() {
  const colors = useAnalogousColors();
  const isMobile = useMobile();

  return (
    <>
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
