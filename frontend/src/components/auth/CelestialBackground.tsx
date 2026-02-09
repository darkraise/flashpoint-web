import { useEffect, useState } from 'react';

export function CelestialBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <div className="celestial-nebula-1" aria-hidden="true" />
      <div className="celestial-nebula-2" aria-hidden="true" />
      <div className="celestial-nebula-3" aria-hidden="true" />

      <div className={`celestial-stars-small ${isMobile ? 'mobile' : ''}`} aria-hidden="true" />
      <div className={`celestial-stars-medium ${isMobile ? 'mobile' : ''}`} aria-hidden="true" />
      <div className={`celestial-stars-large ${isMobile ? 'mobile' : ''}`} aria-hidden="true" />
    </>
  );
}
