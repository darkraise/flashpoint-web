import { useEffect, useRef } from 'react';

/**
 * Particle data structure
 */
interface Particle {
  x: number; // X position
  y: number; // Y position
  vx: number; // X velocity (slow drift)
  vy: number; // Y velocity (slow drift)
  radius: number; // Particle size (2-4px)
  opacity: number; // Base opacity (0.4-0.8)
}

/**
 * Mouse position tracking
 */
interface MousePosition {
  x: number;
  y: number;
  active: boolean; // Is mouse over canvas?
}

/**
 * Configuration constants for particle network
 */
const CONFIG = {
  PARTICLE_COUNT: 160, // Base count at 1920px reference width
  PARTICLE_MIN_RADIUS: 2,
  PARTICLE_MAX_RADIUS: 4,
  PARTICLE_MIN_SPEED: 0.1, // Slow drift
  PARTICLE_MAX_SPEED: 0.3,
  PARTICLE_MIN_OPACITY: 0.4,
  PARTICLE_MAX_OPACITY: 0.8,
  CONNECTION_DISTANCE: 120, // Max distance for particle-to-particle lines
  MOUSE_CONNECTION_DISTANCE: 150, // Max distance for mouse-to-particle lines
  LINE_OPACITY_MULTIPLIER: 0.5, // Lines are more transparent than particles
};

/**
 * Calculate particle count based on viewport width
 * Scales linearly from a base configuration with min/max bounds
 *
 * @param width - Current viewport width in pixels
 * @returns Calculated particle count clamped between MIN_COUNT and MAX_COUNT
 */
const calculateParticleCount = (width: number): number => {
  const BASE_WIDTH = 1920; // Reference width
  const BASE_COUNT = 160; // Particle count at reference width
  const MIN_COUNT = 40; // Minimum particles (very small screens)
  const MAX_COUNT = 250; // Maximum particles (performance limit)

  // Linear scaling: count = (currentWidth / baseWidth) × baseCount
  const scaledCount = Math.round((width / BASE_WIDTH) * BASE_COUNT);

  // Clamp to prevent extremes
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, scaledCount));
};

/**
 * Initialize particles with random positions, velocities, and properties
 */
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

/**
 * Update particle positions with toroidal wrapping (seamless edges)
 */
const updateParticles = (particles: Particle[], width: number, height: number) => {
  particles.forEach((particle) => {
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Wrap around edges (toroidal topology)
    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;
  });
};

/**
 * Draw connections between nearby particles
 */
const drawConnections = (ctx: CanvasRenderingContext2D, particles: Particle[], color: string) => {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i];
      const p2 = particles[j];

      // Calculate distance
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distSq = dx * dx + dy * dy;

      // Check if within connection distance (using squared distance for performance)
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

/**
 * Draw connections from mouse to nearby particles
 */
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

/**
 * Draw particles as circles
 */
const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[], color: string) => {
  particles.forEach((particle) => {
    ctx.fillStyle = `hsla(${color}, ${particle.opacity})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
};

/**
 * ParticleNetworkBackground - Interactive constellation network effect
 *
 * Features:
 * - 100-150 particles drifting slowly across the screen
 * - Lines connecting nearby particles within 120px
 * - Mouse cursor connects to nearby particles within 150px
 * - Theme-aware colors from design system
 * - Responsive: reduced particles on mobile
 * - Accessibility: respects prefers-reduced-motion
 */
export function ParticleNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0, active: false });
  const animationFrameRef = useRef<number>();
  const primaryColorRef = useRef<string>('221.2, 83.2%, 53.3%');

  // Initialize canvas and particles on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set canvas size with HiDPI support
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Calculate particle count based on viewport width
    const count = calculateParticleCount(width);
    particlesRef.current = initializeParticles(width, height, count);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      particlesRef.current.forEach((particle) => {
        particle.vx *= 0.1;
        particle.vy *= 0.1;
      });
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Update canvas size (this invalidates the canvas context)
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Calculate particle count based on new viewport width
      const count = calculateParticleCount(width);
      particlesRef.current = initializeParticles(width, height, count);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track mouse movement
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

    // Note: pointer-events: none in CSS, but we still track movement for visual effect
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Detect theme color changes
  useEffect(() => {
    const updatePrimaryColor = () => {
      const root = document.documentElement;
      const primaryValue = getComputedStyle(root).getPropertyValue('--primary').trim();
      if (primaryValue) {
        // Convert space-separated format to comma-separated for HSLA compatibility
        // Input:  "221.2 83.2% 53.3%" (space-separated from CSS)
        // Output: "221.2, 83.2%, 53.3%" (comma-separated for hsla())
        const formattedColor = primaryValue.replace(/\s+/g, ', ');
        primaryColorRef.current = formattedColor;
      }
    };

    // Update immediately on mount
    updatePrimaryColor();

    // Listen for theme changes
    const observer = new MutationObserver(updatePrimaryColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  // Animation loop - runs continuously, gets fresh context on each frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const animate = () => {
      // Get FRESH context on each frame (critical for handling resize)
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get current primary color from ref (always up-to-date, no closure issues)
      const currentColor = primaryColorRef.current;

      // Skip frame if no valid color
      if (!currentColor || currentColor.length === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Apply DPR transform
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Reset ALL context state (critical after canvas resize)
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix
      ctx.scale(dpr, dpr); // Apply DPR scaling

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update particle positions
      updateParticles(particlesRef.current, width, height);

      // Draw connections between particles
      drawConnections(ctx, particlesRef.current, currentColor);

      // Draw mouse connections
      if (mouseRef.current.active) {
        drawMouseConnections(ctx, particlesRef.current, mouseRef.current, currentColor);
      }

      // Draw particles
      drawParticles(ctx, particlesRef.current, currentColor);

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // No dependencies - runs once on mount, continues forever

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
