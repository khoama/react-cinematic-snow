import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { SnowfallProps, Particle } from '../types';
import { initWebGL, renderWebGL, isWebGLSupported, WebGLState } from './WebGLRenderer';

const containerBaseStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

const canvasBaseStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  display: 'block',
};

const Snowfall: React.FC<SnowfallProps> = ({
  density = 1200,
  speed = 1.2,
  wind = 0.2,
  color = '#ffffff',
  minRadius = 0.2,
  maxRadius = 2.3,
  roughness = 0.9,
  opacity: globalOpacity = 1.0,
  renderer = 'auto',
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const midCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // WebGL state for each layer
  const webglStateRef = useRef<{
    back: WebGLState | null;
    mid: WebGLState | null;
    front: WebGLState | null;
  }>({ back: null, mid: null, front: null });

  // Determine if we should use WebGL based on prop and support
  const webglSupported = useMemo(() => isWebGLSupported(), []);
  const useWebGL = useMemo(() => {
    if (renderer === 'canvas') return false;
    if (renderer === 'webgl') return webglSupported;
    return webglSupported; // 'auto' - use WebGL if available
  }, [renderer, webglSupported]);

  // Store particles for each layer
  const particlesRef = useRef<{
    back: Particle[];
    mid: Particle[];
    front: Particle[];
  }>({ back: [], mid: [], front: [] });

  // Dynamic wind state for realistic variation
  const windStateRef = useRef({
    time: 0,
    gustTime: 0,
    gustStrength: 0,
    gustDirection: 1,
  });

  // Stable dimensions for mobile viewport stability
  const stableDimensionsRef = useRef({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Helper to detect mobile device
  const detectMobile = useCallback((): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    // Check for touch capability and mobile user agent
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Also check screen size as a fallback
    const isSmallScreen = window.innerWidth <= 768;

    return hasTouchScreen && (mobileUA || isSmallScreen);
  }, []);

  // Helper to generate a random number between min and max
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Handle scroll detection for mobile devices
  const handleScroll = useCallback(() => {
    if (!detectMobile()) return;

    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150); // Consider scroll active for 150ms after last event
  }, [detectMobile]);

  // Calculate dynamic wind with natural variation
  const getDynamicWind = useCallback((baseWind: number) => {
    const state = windStateRef.current;
    state.time += 0.016; // ~60fps increment

    // Primary slow oscillation (direction changes every ~20-40 seconds)
    const slowWave = Math.sin(state.time * 0.05) * 0.7;

    // Secondary faster oscillation for variation
    const mediumWave = Math.sin(state.time * 0.15) * 0.3;

    // Tertiary quick flutter
    const quickWave = Math.sin(state.time * 0.8) * 0.1;

    // Random gusts
    state.gustTime -= 0.016;
    if (state.gustTime <= 0) {
      // Start a new gust randomly (average every 30-45 seconds)
      if (Math.random() < 0.0005) {
        state.gustStrength = 0.5 + Math.random() * 1.5; // Gust intensity
        state.gustDirection = Math.random() > 0.5 ? 1 : -1;
        state.gustTime = 2 + Math.random() * 3; // Gust duration 2-5 seconds
      }
    }

    // Gust easing (smooth fade in/out)
    const gustFactor = state.gustTime > 0
      ? Math.sin((state.gustTime / 3) * Math.PI) * state.gustStrength * state.gustDirection
      : 0;

    // Combine all factors with the base wind
    const dynamicMultiplier = 1 + slowWave + mediumWave + quickWave + gustFactor;

    return baseWind * dynamicMultiplier;
  }, []);

  // Helper to create irregular polygon offsets for a flake
  const createIrregularShape = useCallback((radius: number, rough: number) => {
    const points = 5 + Math.floor(Math.random() * 4); // 5 to 8 vertices
    const offsets = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const variance = 1 + (Math.random() - 0.5) * rough;
      offsets.push({
        x: Math.cos(angle) * radius * variance,
        y: Math.sin(angle) * radius * variance,
      });
    }
    return offsets;
  }, []);

  const generateParticles = useCallback((
    width: number,
    height: number,
    count: number,
    rMin: number,
    rMax: number,
    sMult: number // Speed Multiplier (applied to vy)
  ) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const radius = random(rMin, rMax);
      // Normalized size factor 0..1
      const sizeFactor = (radius - rMin) / (rMax - rMin || 1);

      // Opacity calculation: larger = more visible, plus randomness
      let opacity = 0.1 + (sizeFactor * 0.7) + (Math.random() * 0.6 - 0.3);
      opacity = Math.max(0.1, Math.min(1.0, opacity));

      // Speed calculation: correlated with absolute radius.
      // Parallax effect: Larger flakes (closer) must fall faster.
      // We assume standard 'Mid' radius is roughly 2.5px.
      // We normalize by dividing by 2.5 to get a base factor around 1.0 for mid-sized flakes.
      // sMult further separates the layers (Back=0.6, Front=1.4).
      const baseSpeed = (radius / 2.5) * sMult;
      const speedVariance = random(0.85, 1.15);

      // Parallax Sway: Larger flakes should sway more in absolute pixels than tiny background dots
      const sizeScale = Math.max(0.5, radius / 2.5);

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        opacity,
        vx: random(-0.1, 0.1) * sizeScale, // Scale drift with size 
        vy: baseSpeed * speedVariance,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: random(0.005, 0.03),
        swayAmplitude: random(0.3, 0.8) * sizeScale, // Scale sway with size
        shapeOffsets: createIrregularShape(radius, roughness),
        shapeSeed: Math.random() * 1000, // Stable seed for WebGL shape
      });
    }
    return particles;
  }, [roughness, createIrregularShape]);

  const initParticles = useCallback((width: number, height: number) => {
    // 1. Back Layer: Small, slow, hazy (High count)
    particlesRef.current.back = generateParticles(
      width, height,
      Math.floor(density * 0.8),
      minRadius * 0.5,
      maxRadius * 0.6,
      0.6 // Speed multiplier (Slow)
    );

    // 2. Middle Layer: Standard props (Medium count)
    particlesRef.current.mid = generateParticles(
      width, height,
      Math.floor(density * 0.5),
      minRadius,
      maxRadius,
      1.0 // Speed multiplier (Normal)
    );

    // 3. Front Layer: Large, fast (Low count)
    const frontParticles = generateParticles(
      width, height,
      Math.max(5, Math.floor(density * 0.1)),
      Math.max(maxRadius, 2), // Start at max of mid layer
      maxRadius * 1.8,
      1.4 // Speed multiplier (Fast)
    );

    // 4. "Camera" Layer: Massive, very fast "close call" flakes (Very Rare)
    // These simulates flakes passing right by the lens
    const cameraParticles = generateParticles(
      width, height,
      Math.max(2, Math.floor(density * 0.004)), // Very few (e.g., 2-4 flakes)
      maxRadius * 3.5, // 3.5x to 5.5x larger than normal max
      maxRadius * 5.5,
      2.0 // Very fast (Reduced from 2.5)
    );

    // Merge camera particles into the front layer so they get the same blur/opacity treatment
    particlesRef.current.front = [...frontParticles, ...cameraParticles];

  }, [density, minRadius, maxRadius, generateParticles]);

  const updateParticles = useCallback((
    particles: Particle[],
    width: number,
    height: number,
    wMult: number, // Wind multiplier for this layer
    currentWind: number // Dynamic wind value
  ) => {
    particles.forEach((p) => {
      p.wobble += p.wobbleSpeed;

      const primarySway = Math.sin(p.wobble) * p.swayAmplitude;
      const secondarySway = Math.cos(p.wobble * 1.8 + p.y * 0.01) * (p.swayAmplitude * 0.2);

      // Apply dynamic wind * layer multiplier + individual drift + sway
      p.x += (currentWind * wMult) + p.vx + primarySway + secondarySway;
      p.y += speed * p.vy;

      // Wrap logic
      if (p.y > height + p.radius) {
        p.y = -p.radius;
        p.x = Math.random() * width;
      }
      if (p.x > width + p.radius) {
        p.x = -p.radius;
      } else if (p.x < -p.radius) {
        p.x = width + p.radius;
      }
    });
  }, [speed]);

  // Canvas 2D drawing function (fallback)
  const drawParticlesCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    width: number,
    height: number,
    layerOpacity: number
  ) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    particles.forEach((p) => {
      // Combine particle opacity * layer multiplier * global opacity
      ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity * layerOpacity * globalOpacity));

      // Save context state for rotation
      ctx.save();
      ctx.translate(p.x, p.y);
      // Apply rotation based on wobble phase (oscillates back and forth)
      ctx.rotate(Math.sin(p.wobble));

      ctx.beginPath();

      if (p.shapeOffsets.length > 0) {
        // Draw relative to translated origin (0,0)
        ctx.moveTo(p.shapeOffsets[0].x, p.shapeOffsets[0].y);
        for (let i = 1; i < p.shapeOffsets.length; i++) {
          ctx.lineTo(p.shapeOffsets[i].x, p.shapeOffsets[i].y);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    });
  }, [color, globalOpacity]);

  // Key to force canvas remount when switching renderers
  // A canvas can only have one context type, so we need new canvas elements when switching
  const canvasKey = useWebGL ? 'webgl' : 'canvas';

  useEffect(() => {
    // Clear WebGL state when not using WebGL
    if (!useWebGL) {
      webglStateRef.current = { back: null, mid: null, front: null };
    }

    // Function to actually update dimensions and reinitialize
    const applyResize = (width: number, height: number) => {
      if (!containerRef.current || !backCanvasRef.current || !midCanvasRef.current || !frontCanvasRef.current) {
        return;
      }

      // Update stable dimensions
      stableDimensionsRef.current = { width, height };

      // Set dimensions for all canvases
      [backCanvasRef, midCanvasRef, frontCanvasRef].forEach(ref => {
        if (ref.current) {
          ref.current.width = width;
          ref.current.height = height;
        }
      });

      // Initialize WebGL contexts if using WebGL
      if (useWebGL) {
        webglStateRef.current.back = initWebGL(backCanvasRef.current);
        webglStateRef.current.mid = initWebGL(midCanvasRef.current);
        webglStateRef.current.front = initWebGL(frontCanvasRef.current);

        // Log which renderer is being used
        if (webglStateRef.current.back && webglStateRef.current.mid && webglStateRef.current.front) {
          console.log('Snowfall: Using WebGL renderer');
        } else {
          console.log('Snowfall: WebGL init failed, using Canvas fallback');
        }
      } else {
        console.log('Snowfall: Using Canvas 2D renderer');
      }

      initParticles(width, height);
    };

    // Modified handleResize with debounce and validation
    const handleResize = () => {
      if (!containerRef.current) return;

      // Ignore during scroll on mobile
      if (isScrollingRef.current && detectMobile()) return;

      const { clientWidth, clientHeight } = containerRef.current;
      const stable = stableDimensionsRef.current;

      // Only update if change is significant (>50px in any dimension)
      const widthDiff = Math.abs(clientWidth - stable.width);
      const heightDiff = Math.abs(clientHeight - stable.height);

      // If dimensions are not initialized yet, apply immediately
      if (stable.width === 0 || stable.height === 0) {
        applyResize(clientWidth, clientHeight);
        return;
      }

      // Ignore very small changes
      if (widthDiff < 50 && heightDiff < 50) {
        return;
      }

      // Debounce: wait for 300ms of stability
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (!containerRef.current || (isScrollingRef.current && detectMobile())) {
          return;
        }

        const { clientWidth: w, clientHeight: h } = containerRef.current;
        applyResize(w, h);
      }, 300);
    };

    // Initialize dimensions on mount
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      stableDimensionsRef.current = { width: clientWidth, height: clientHeight };
      applyResize(clientWidth, clientHeight);
    }

    // Use ResizeObserver instead of window.resize for better control
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserverRef.current.observe(containerRef.current);
    } else {
      // Fallback to window resize if ResizeObserver is not available
      window.addEventListener('resize', handleResize);
    }

    // Add scroll listener for mobile detection
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    const loop = () => {
      if (!containerRef.current) return;

      // Use stable dimensions instead of reading clientWidth/clientHeight every frame
      const { width, height } = stableDimensionsRef.current;

      // Fallback to current dimensions if stable dimensions are not set
      const currentWidth = width > 0 ? width : containerRef.current.clientWidth;
      const currentHeight = height > 0 ? height : containerRef.current.clientHeight;

      const webgl = webglStateRef.current;

      // Calculate dynamic wind with natural variation
      const currentWind = getDynamicWind(wind);

      // Update and Draw Back Layer (layer 0 - dots only for performance)
      updateParticles(particlesRef.current.back, currentWidth, currentHeight, 0.5, currentWind);
      if (useWebGL && webgl.back) {
        renderWebGL(webgl.back, particlesRef.current.back, currentWidth, currentHeight, color, globalOpacity, 0.3, roughness, 0);
      } else if (backCanvasRef.current) {
        const ctx = backCanvasRef.current.getContext('2d');
        if (ctx) drawParticlesCanvas(ctx, particlesRef.current.back, currentWidth, currentHeight, 0.3);
      }

      // Update and Draw Mid Layer (layer 1 - polygons)
      updateParticles(particlesRef.current.mid, currentWidth, currentHeight, 1.0, currentWind);
      if (useWebGL && webgl.mid) {
        renderWebGL(webgl.mid, particlesRef.current.mid, currentWidth, currentHeight, color, globalOpacity, 0.6, roughness, 1);
      } else if (midCanvasRef.current) {
        const ctx = midCanvasRef.current.getContext('2d');
        if (ctx) drawParticlesCanvas(ctx, particlesRef.current.mid, currentWidth, currentHeight, 0.6);
      }

      // Update and Draw Front Layer (layer 2 - polygons, reduced opacity for depth effect)
      updateParticles(particlesRef.current.front, currentWidth, currentHeight, 1.5, currentWind);
      if (useWebGL && webgl.front) {
        renderWebGL(webgl.front, particlesRef.current.front, currentWidth, currentHeight, color, globalOpacity, 0.8, roughness, 2);
      } else if (frontCanvasRef.current) {
        const ctx = frontCanvasRef.current.getContext('2d');
        if (ctx) drawParticlesCanvas(ctx, particlesRef.current.front, currentWidth, currentHeight, 0.8);
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (resizeObserverRef.current && containerRef.current) {
        resizeObserverRef.current.unobserve(containerRef.current);
        resizeObserverRef.current.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, [initParticles, updateParticles, drawParticlesCanvas, useWebGL, color, globalOpacity, roughness, wind, getDynamicWind, handleScroll, detectMobile]);

  const combinedClassName = ['rrs-snowfall-container', className].filter(Boolean).join(' ');
  const baseCanvasProps = { style: canvasBaseStyle };

  return (
    <div ref={containerRef} className={combinedClassName} style={{ ...containerBaseStyle, ...style }}>
      <canvas key={`back-${canvasKey}`} ref={backCanvasRef} {...baseCanvasProps} />
      <canvas key={`mid-${canvasKey}`} ref={midCanvasRef} {...baseCanvasProps} />
      <canvas
        key={`front-${canvasKey}`}
        ref={frontCanvasRef}
        {...baseCanvasProps}
        style={{ ...canvasBaseStyle, filter: 'blur(3px)' }}
      />
    </div>
  );
};

export default Snowfall;
