import type { CSSProperties } from 'react';

export interface SnowfallProps {
  /** Base number of snowflakes to render (distributed across layers). Default: 400 */
  density?: number;
  /** Base vertical speed of snowflakes. Default: 1.2 */
  speed?: number;
  /** Horizontal wind speed. Default: 0.2 */
  wind?: number;
  /** Color of the snowflakes (hex or rgba). Default: #ffffff */
  color?: string;
  /** Minimum radius of a snowflake. Default: 0.2 */
  minRadius?: number;
  /** Maximum radius of a snowflake. Default: 2.3 */
  maxRadius?: number;
  /** Variance in snowflake shape (0 = perfect circle, 1 = very jagged). Default: 1.6 */
  roughness?: number;
  /** Global opacity multiplier (0 to 1). Default: 1.0 */
  opacity?: number;
  /** Custom CSS classes for the container element */
  className?: string;
  /** Inline styles merged with the default container styles */
  style?: CSSProperties;
  /** Renderer to use: 'auto' (default), 'webgl', or 'canvas' */
  renderer?: 'auto' | 'webgl' | 'canvas';
}

export interface Particle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  vx: number; // velocity x
  vy: number; // velocity y
  wobble: number; // phase for horizontal oscillation (animates)
  wobbleSpeed: number;
  swayAmplitude: number; // How wide the flake swings side-to-side
  shapeOffsets: { x: number; y: number }[]; // Pre-calculated offsets for irregular shape
  shapeSeed: number; // Stable random seed for WebGL shape generation
}
