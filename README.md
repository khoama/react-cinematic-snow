# React Cinematic Snow ❄️

A high-performance, cinematic, and realistic snowfall effect for React applications, built with TypeScript and dual WebGL/Canvas rendering.

![License](https://img.shields.io/npm/l/react-cinematic-snow)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

## Features

- 🚀 **High Performance**: WebGL-accelerated rendering by default, with Canvas 2D fallback.
- 🎨 **Fully Customizable**: Control density, speed, wind, color, size, and more.
- 🌬️ **Dynamic Wind**: Realistic wind patterns with natural oscillation and occasional gusts.
- 🌫️ **Advanced Physics**: Snowflakes **rotate and tumble** as they fall. Fall speed is **physically calculated based on size** (larger flakes fall faster), enhancing the gravity effect.
- 🕶️ **Automatic Parallax**: Built-in multi-layer system (Back, Middle, Front) creates instant depth.
- 💎 **Irregular Shapes**: Snowflakes are procedurally generated polygons, not just circles.
- 📸 **Depth of Field**: Foreground flakes are automatically blurred for a cinematic look.
- 🌙 **Dark/Light Mode**: Works with any background color.

## Installation

```bash
npm install react-cinematic-snow
# or
yarn add react-cinematic-snow
```

## Basic Usage

The component automatically generates three layers of snow based on your settings.

```tsx
import React from 'react';
import Snowfall from 'react-cinematic-snow';

const MyComponent = () => {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0f172a' }}>
      <Snowfall 
        density={1200} 
        speed={1.2} 
        wind={0.2} 
        color="#ffffff" 
      />
      <h1 style={{ color: 'white', position: 'relative', zIndex: 10 }}>Winter is Coming</h1>
    </div>
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `density` | `number` | `1200` | Base number of snowflakes. Actual count will be higher (~1.4x) due to layering. |
| `speed` | `number` | `1.2` | The vertical falling speed multiplier. |
| `wind` | `number` | `0.2` | Base horizontal wind force. Negative values blow left, positive blow right. Wind dynamically varies over time. |
| `color` | `string` | `'#ffffff'` | The color of the snowflakes (Hex or RGBA). |
| `minRadius` | `number` | `0.2` | The minimum size of a snowflake in pixels. |
| `maxRadius` | `number` | `2.3` | The maximum size of a snowflake in pixels. |
| `roughness` | `number` | `0.9` | How irregular the snowflakes are (0 = smooth, higher = more jagged). |
| `opacity` | `number` | `1.0` | Global opacity multiplier (0 to 1). |
| `renderer` | `'auto' \| 'webgl' \| 'canvas'` | `'auto'` | Rendering engine. `auto` uses WebGL if available, falls back to Canvas. |
| `className` | `string` | `''` | Custom CSS classes for the container element. |
| `style` | `CSSProperties` | `undefined` | Custom inline styles for the container element. |

## Rendering Engines

### WebGL (Default)
- GPU-accelerated particle rendering
- Best performance for high density (1000+ particles)
- Procedural polygon shapes generated in fragment shader
- Smooth dots for distant particles, detailed polygons for closer ones

### Canvas 2D (Fallback)
- CPU-based rendering using HTML5 Canvas
- Good compatibility across all browsers
- Automatic fallback when WebGL is unavailable

```tsx
// Force a specific renderer
<Snowfall renderer="webgl" />  // Force WebGL
<Snowfall renderer="canvas" /> // Force Canvas 2D
<Snowfall renderer="auto" />   // Auto-detect (default)
```

## Dynamic Wind System

The wind simulation includes natural variation for realistic movement:

- **Slow oscillation**: Wind direction gradually shifts every ~20-40 seconds
- **Medium oscillation**: Adds variation within the primary wave
- **Quick flutter**: Small rapid variations for organic movement
- **Random gusts**: Occasional stronger wind bursts (~every 30-45 seconds) that smoothly fade in and out

The `wind` prop controls the *base* wind strength, and all natural variations are applied as multipliers.

## Performance & Benchmarks

The library automatically manages three canvas layers with optimized rendering.

| Parameter | Impact | Notes |
|-----------|--------|-------|
| **Density** | High | Default `1200` creates ~1680 flakes across 3 layers. WebGL handles 5000+ easily. Canvas may struggle above 2000 on mobile. |
| **Renderer** | High | WebGL is ~2-3x faster than Canvas for high particle counts. |
| **Roughness** | Low | Irregular shapes (polygons) take slightly longer to draw than circles. |
| **Rotation** | Low | Per-particle rotation adds a small matrix calculation overhead but significantly improves realism. |
| **Blur** | Medium | The foreground layer uses a CSS blur filter (3px). This is efficient but still has a small cost. |

**Performance Tips:**
- For mobile devices, keep `density` under 800 with Canvas, or under 2000 with WebGL
- Use `renderer="webgl"` for best performance on modern devices
- Lower `roughness` for slightly better performance with many particles

## Architecture & Technical Design

This library uses a **Three-Layer Canvas Architecture** instead of a single canvas to achieve cinematic depth while maintaining 60 FPS.

### Layer System

| Layer | Purpose | Particle Size | Speed | Blur |
|-------|---------|---------------|-------|------|
| Back | Distant snow | 50-60% of base size | 0.6x | None |
| Mid | Standard snow | Full size range | 1.0x | None |
| Front | Close snow + "camera" flakes | 100-180% + rare large flakes | 1.4-2.0x | 3px CSS blur |

### Why 3 Canvases?

1.  **Efficient Blur (Depth of Field)**
    *   **The Problem**: Applying a blur filter (`ctx.filter`) to specific particles inside a single canvas render loop is extremely expensive, forcing the browser to constantly switch context states.
    *   **The Solution**: We separate foreground particles onto their own canvas and apply a CSS `filter: blur(3px)` to the entire DOM element. This offloads the blur calculation to the GPU's compositor, making it virtually free.

2.  **No Z-Index Sorting**
    *   **The Problem**: To make large foreground flakes always appear on top of small background flakes in a single canvas, you must sort thousands of particles by size every single frame ($O(n \log n)$).
    *   **The Solution**: By using fixed DOM layers (Back, Mid, Front), the browser handles the layering order automatically. The render loop remains purely linear ($O(n)$).

3.  **Modular Opacity**
    *   It allows for efficient batch opacity adjustments per layer to simulate atmospheric density without complex alpha blending calculations per particle.
    *   Layer opacities: Back (0.3), Mid (0.6), Front (0.8)

### WebGL Implementation

The WebGL renderer uses:
- **Vertex Shader**: Handles particle positioning, size calculation, and rotation
- **Fragment Shader**: Procedurally generates irregular polygon shapes using ray-casting
- **Layer-based rendering**: Back layer uses simple dots for performance, mid/front use detailed polygons
- **Optimized buffer management**: Single draw call per layer

## License

MIT © 2024
