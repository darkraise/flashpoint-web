import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface MousePosition {
  x: number;
  y: number;
  active: boolean;
}

const CONFIG = {
  PARTICLE_COUNT: 160,
  PARTICLE_MIN_RADIUS: 2,
  PARTICLE_MAX_RADIUS: 4,
  PARTICLE_MIN_SPEED: 0.1,
  PARTICLE_MAX_SPEED: 0.5,
  PARTICLE_MIN_OPACITY: 0.4,
  PARTICLE_MAX_OPACITY: 0.8,
  CONNECTION_DISTANCE: 120,
  MOUSE_CONNECTION_DISTANCE: 150,
  LINE_OPACITY_MULTIPLIER: 0.5,
};

// Scales linearly with viewport width, clamped to prevent performance issues
const calculateParticleCount = (width: number): number => {
  const BASE_WIDTH = 1920;
  const BASE_COUNT = 160;
  const MIN_COUNT = 40;
  const MAX_COUNT = 250;

  const scaledCount = Math.round((width / BASE_WIDTH) * BASE_COUNT);
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, scaledCount));
};

const initializeParticles = (width: number, height: number, count: number): Particle[] => {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (CONFIG.PARTICLE_MAX_SPEED * 2),
      vy: (Math.random() - 0.5) * (CONFIG.PARTICLE_MAX_SPEED * 2),
      radius:
        CONFIG.PARTICLE_MIN_RADIUS +
        Math.random() * (CONFIG.PARTICLE_MAX_RADIUS - CONFIG.PARTICLE_MIN_RADIUS),
      opacity:
        CONFIG.PARTICLE_MIN_OPACITY +
        Math.random() * (CONFIG.PARTICLE_MAX_OPACITY - CONFIG.PARTICLE_MIN_OPACITY),
    });
  }

  return particles;
};

// Toroidal wrapping so particles seamlessly reappear on the opposite edge
const updateParticles = (particles: Particle[], width: number, height: number) => {
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;
  });
};

const drawConnections = (ctx: CanvasRenderingContext2D, particles: Particle[], color: string) => {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];

      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distSq = dx * dx + dy * dy;

      // Squared distance comparison avoids sqrt for particles outside range
      if (distSq < CONFIG.CONNECTION_DISTANCE * CONFIG.CONNECTION_DISTANCE) {
        const distance = Math.sqrt(distSq);
        const opacity =
          (1 - distance / CONFIG.CONNECTION_DISTANCE) * CONFIG.LINE_OPACITY_MULTIPLIER;

        ctx.strokeStyle = `hsla(${color}, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
};

const drawMouseConnections = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  mouse: MousePosition,
  color: string
) => {
  particles.forEach((particle) => {
    const dx = mouse.x - particle.x;
    const dy = mouse.y - particle.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < CONFIG.MOUSE_CONNECTION_DISTANCE * CONFIG.MOUSE_CONNECTION_DISTANCE) {
      const distance = Math.sqrt(distSq);
      const opacity = (1 - distance / CONFIG.MOUSE_CONNECTION_DISTANCE) * 0.7;

      ctx.strokeStyle = `hsla(${color}, ${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mouse.x, mouse.y);
      ctx.lineTo(particle.x, particle.y);
      ctx.stroke();
    }
  });
};

const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[], color: string) => {
  particles.forEach((particle) => {
    ctx.fillStyle = `hsla(${color}, ${particle.opacity})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
};

export function ParticleNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0, active: false });
  const animationFrameRef = useRef<number>();
  const primaryColorRef = useRef<string>('221.2, 83.2%, 53.3%');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    const count = calculateParticleCount(width);
    particlesRef.current = initializeParticles(width, height, count);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      particlesRef.current.forEach((particle) => {
        particle.vx *= 0.1;
        particle.vy *= 0.1;
      });
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const count = calculateParticleCount(width);
      particlesRef.current = initializeParticles(width, height, count);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    // pointer-events: none in CSS, but we track movement on window for the visual effect
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Sync particle color with theme's --primary CSS variable
  useEffect(() => {
    const updatePrimaryColor = () => {
      const root = document.documentElement;
      const primaryValue = getComputedStyle(root).getPropertyValue('--primary').trim();
      if (primaryValue) {
        // CSS uses space-separated HSL ("221.2 83.2% 53.3%"), hsla() needs commas
        const formattedColor = primaryValue.replace(/\s+/g, ', ');
        primaryColorRef.current = formattedColor;
      }
    };

    updatePrimaryColor();

    const observer = new MutationObserver(updatePrimaryColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const animate = () => {
      // Must re-acquire context each frame because canvas resize invalidates it
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentColor = primaryColorRef.current;

      if (!currentColor || currentColor.length === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Reset transform after potential canvas resize, then apply DPR scaling
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);
      updateParticles(particlesRef.current, width, height);
      drawConnections(ctx, particlesRef.current, currentColor);

      if (mouseRef.current.active) {
        drawMouseConnections(ctx, particlesRef.current, mouseRef.current, currentColor);
      }

      drawParticles(ctx, particlesRef.current, currentColor);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
