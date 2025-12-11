import { Particle } from '../types';

// Vertex shader - positions points and passes data to fragment shader
const VERTEX_SHADER = `
attribute vec2 a_position;
attribute float a_size;
attribute float a_opacity;
attribute float a_seed;
attribute float a_rotation;

uniform vec2 u_resolution;

varying float v_opacity;
varying float v_seed;
varying float v_rotation;
varying float v_size;

void main() {
  // Convert pixel coordinates to clip space (-1 to 1)
  vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
  clipSpace.y *= -1.0; // Flip Y axis
  
  gl_Position = vec4(clipSpace, 0.0, 1.0);
  gl_PointSize = a_size;
  v_opacity = a_opacity;
  v_seed = a_seed;
  v_rotation = a_rotation;
  v_size = a_size;
}
`;

// Fragment shader - draws snowflakes (smooth circles for small, polygons for large)
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform vec3 u_color;
uniform float u_roughness;
uniform float u_layer; // 0 = back (dots), 1 = mid, 2 = front (polygons)
uniform float u_isMobile; // 1.0 for mobile, 0.0 for desktop

varying float v_opacity;
varying float v_seed;
varying float v_rotation;
varying float v_size;

// Hash function matching the randomness pattern
float hash(float n) {
  return fract(sin(n * 12.9898) * 43758.5453123);
}

// Rotate a 2D point
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Get vertex position for polygon (matching Canvas createIrregularShape logic)
vec2 getVertex(int i, int numPoints, float seed) {
  float fi = float(i);
  float fn = float(numPoints);
  float angle = (fi / fn) * 6.28318530718; // 2 * PI
  
  // Generate per-vertex random variance using seed + vertex index
  float randomVal = hash(seed + fi * 7.31);
  float variance = 1.0 + (randomVal - 0.5) * u_roughness;
  
  return vec2(cos(angle) * 0.38 * variance, sin(angle) * 0.38 * variance);
}

// Check if point is inside polygon using ray casting
bool pointInPolygon(vec2 p, int numPoints, float seed) {
  int crossings = 0;
  
  for (int i = 0; i < 8; i++) {
    if (i >= numPoints) break;
    
    int nextI = i + 1;
    if (nextI >= numPoints) nextI = 0;
    
    vec2 v1 = getVertex(i, numPoints, seed);
    vec2 v2 = getVertex(nextI, numPoints, seed);
    
    if (((v1.y > p.y) != (v2.y > p.y)) &&
        (p.x < (v2.x - v1.x) * (p.y - v1.y) / (v2.y - v1.y) + v1.x)) {
      crossings++;
    }
  }
  
  return mod(float(crossings), 2.0) > 0.5;
}

// Calculate distance to polygon edge for soft edges
float distToPolygonEdge(vec2 p, int numPoints, float seed) {
  float minDist = 1.0;
  
  for (int i = 0; i < 8; i++) {
    if (i >= numPoints) break;
    
    int nextI = i + 1;
    if (nextI >= numPoints) nextI = 0;
    
    vec2 v1 = getVertex(i, numPoints, seed);
    vec2 v2 = getVertex(nextI, numPoints, seed);
    
    vec2 edge = v2 - v1;
    float t = clamp(dot(p - v1, edge) / dot(edge, edge), 0.0, 1.0);
    vec2 closest = v1 + t * edge;
    float dist = length(p - closest);
    minDist = min(minDist, dist);
  }
  
  return minDist;
}

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  // Back layer (u_layer == 0): Always use smooth dots for performance
  // These are far away, so detail isn't visible anyway
  if (u_layer < 0.5) {
    // Soft circular shape with gentle falloff
    float alpha = 1.0 - smoothstep(0.25, 0.5, dist);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(u_color, alpha * v_opacity);
    return;
  }
  
  // Mobile devices: use simpler irregular shapes (distorted circles)
  // This avoids the complex polygon ray-casting that fails on some mobile GPUs
  if (u_isMobile > 0.5) {
    // Create irregular shape by varying the radius based on angle
    float angle = atan(coord.y, coord.x);
    float irregularity = 0.0;
    
    // Add multiple harmonics for irregular shape (like a bumpy circle)
    irregularity += sin(angle * 5.0 + v_seed) * 0.08 * u_roughness;
    irregularity += sin(angle * 7.0 + v_seed * 2.3) * 0.05 * u_roughness;
    irregularity += sin(angle * 3.0 + v_seed * 0.7) * 0.06 * u_roughness;
    
    float threshold = 0.35 + irregularity;
    float alpha = 1.0 - smoothstep(threshold - 0.05, threshold + 0.05, dist);
    
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(u_color, alpha * v_opacity);
    return;
  }
  
  // Desktop: Use polygon shapes for visible detail
  // But still use circles for very small particles
  if (v_size < 6.0) {
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(u_color, alpha * v_opacity);
    return;
  }
  
  // Polygon rendering for larger mid/front particles (desktop only)
  vec2 rotatedCoord = rotate2D(coord, v_rotation);
  
  int numPoints = 5 + int(hash(v_seed * 3.7) * 4.0);
  
  bool inside = pointInPolygon(rotatedCoord, numPoints, v_seed);
  
  if (!inside) {
    discard;
  }
  
  float edgeDist = distToPolygonEdge(rotatedCoord, numPoints, v_seed);
  float alpha = smoothstep(0.0, 0.04, edgeDist);
  
  gl_FragColor = vec4(u_color, alpha * v_opacity);
}
`;

export interface WebGLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  sizeBuffer: WebGLBuffer;
  opacityBuffer: WebGLBuffer;
  seedBuffer: WebGLBuffer;
  rotationBuffer: WebGLBuffer;
  isMobile: boolean;
  locations: {
    position: number;
    size: number;
    opacity: number;
    seed: number;
    rotation: number;
    resolution: WebGLUniformLocation;
    color: WebGLUniformLocation;
    roughness: WebGLUniformLocation;
    layer: WebGLUniformLocation;
    isMobile: WebGLUniformLocation;
  };
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  
  if (!vertexShader || !fragmentShader) return null;
  
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

// Detect if running on a mobile device
function detectMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  // Check for touch capability and mobile user agent
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Also check screen size as a fallback
  const isSmallScreen = window.innerWidth <= 768;
  
  return hasTouchScreen && (mobileUA || isSmallScreen);
}

export function initWebGL(canvas: HTMLCanvasElement): WebGLState | null {
  const gl = canvas.getContext('webgl', { 
    alpha: true, 
    premultipliedAlpha: false,
    antialias: true 
  });
  
  if (!gl) return null;
  
  const program = createProgram(gl);
  if (!program) return null;
  
  // Get attribute locations
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  const sizeLoc = gl.getAttribLocation(program, 'a_size');
  const opacityLoc = gl.getAttribLocation(program, 'a_opacity');
  const seedLoc = gl.getAttribLocation(program, 'a_seed');
  const rotationLoc = gl.getAttribLocation(program, 'a_rotation');
  
  // Get uniform locations
  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const colorLoc = gl.getUniformLocation(program, 'u_color');
  const roughnessLoc = gl.getUniformLocation(program, 'u_roughness');
  const layerLoc = gl.getUniformLocation(program, 'u_layer');
  const isMobileLoc = gl.getUniformLocation(program, 'u_isMobile');
  
  if (!resolutionLoc || !colorLoc || !roughnessLoc || !layerLoc || !isMobileLoc) return null;
  
  // Create buffers
  const positionBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();
  const opacityBuffer = gl.createBuffer();
  const seedBuffer = gl.createBuffer();
  const rotationBuffer = gl.createBuffer();
  
  if (!positionBuffer || !sizeBuffer || !opacityBuffer || !seedBuffer || !rotationBuffer) return null;
  
  // Detect mobile once during initialization
  const isMobile = detectMobile();
  
  return {
    gl,
    program,
    positionBuffer,
    sizeBuffer,
    opacityBuffer,
    seedBuffer,
    rotationBuffer,
    isMobile,
    locations: {
      position: positionLoc,
      size: sizeLoc,
      opacity: opacityLoc,
      seed: seedLoc,
      rotation: rotationLoc,
      resolution: resolutionLoc,
      color: colorLoc,
      roughness: roughnessLoc,
      layer: layerLoc,
      isMobile: isMobileLoc,
    },
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function renderWebGL(
  state: WebGLState,
  particles: Particle[],
  width: number,
  height: number,
  color: string,
  globalOpacity: number,
  layerOpacity: number,
  roughness: number,
  layer: number // 0 = back, 1 = mid, 2 = front
): void {
  const { gl, program, locations } = state;
  
  if (particles.length === 0) return;
  
  // Set viewport
  gl.viewport(0, 0, width, height);
  
  // Clear with transparent
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  // Use shader program
  gl.useProgram(program);
  
  // Set uniforms
  gl.uniform2f(locations.resolution, width, height);
  const [r, g, b] = hexToRgb(color);
  gl.uniform3f(locations.color, r, g, b);
  gl.uniform1f(locations.roughness, roughness);
  gl.uniform1f(locations.layer, layer);
  gl.uniform1f(locations.isMobile, state.isMobile ? 1.0 : 0.0);
  
  // Prepare particle data
  const positions = new Float32Array(particles.length * 2);
  const sizes = new Float32Array(particles.length);
  const opacities = new Float32Array(particles.length);
  const seeds = new Float32Array(particles.length);
  const rotations = new Float32Array(particles.length);
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    positions[i * 2] = p.x;
    positions[i * 2 + 1] = p.y;
    
    // Size calculation: WebGL point sprites need to be scaled to match Canvas pixel size
    // On mobile, use smaller multipliers to avoid overcrowding
    // Canvas draws at actual radius, WebGL needs point sprite size
    if (state.isMobile) {
      // Mobile: more conservative sizing to match Canvas appearance
      const sizeMultiplier = p.radius < 1.0 ? 3.0 : (p.radius < 1.5 ? 2.5 : 2.0);
      sizes[i] = Math.max(2, p.radius * sizeMultiplier);
    } else {
      // Desktop: slightly larger for visibility on bigger screens
      const sizeMultiplier = p.radius < 1.0 ? 5.5 : (p.radius < 1.5 ? 4.5 : 3.5);
      sizes[i] = Math.max(5, p.radius * sizeMultiplier);
    }
    
    // Opacity boost for visibility
    // Mobile needs less boost since particles are smaller and don't overlap as much
    const opacityBoost = state.isMobile 
      ? (p.radius < 1.0 ? 1.5 : (p.radius < 1.5 ? 1.3 : 1.1))
      : (p.radius < 1.0 ? 2.2 : (p.radius < 1.5 ? 1.8 : 1.4));
    opacities[i] = Math.min(1.0, p.opacity * layerOpacity * globalOpacity * opacityBoost);
    
    // Use stable shapeSeed for consistent shape
    seeds[i] = p.shapeSeed;
    // Match Canvas rotation: Math.sin(p.wobble)
    rotations[i] = Math.sin(p.wobble);
  }
  
  // Upload position data
  gl.bindBuffer(gl.ARRAY_BUFFER, state.positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
  
  // Upload size data
  gl.bindBuffer(gl.ARRAY_BUFFER, state.sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(locations.size);
  gl.vertexAttribPointer(locations.size, 1, gl.FLOAT, false, 0, 0);
  
  // Upload opacity data
  gl.bindBuffer(gl.ARRAY_BUFFER, state.opacityBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, opacities, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(locations.opacity);
  gl.vertexAttribPointer(locations.opacity, 1, gl.FLOAT, false, 0, 0);
  
  // Upload seed data for shape variation
  gl.bindBuffer(gl.ARRAY_BUFFER, state.seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(locations.seed);
  gl.vertexAttribPointer(locations.seed, 1, gl.FLOAT, false, 0, 0);
  
  // Upload rotation data (matching Canvas: Math.sin(wobble))
  gl.bindBuffer(gl.ARRAY_BUFFER, state.rotationBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rotations, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(locations.rotation);
  gl.vertexAttribPointer(locations.rotation, 1, gl.FLOAT, false, 0, 0);
  
  // Draw all particles as points
  gl.drawArrays(gl.POINTS, 0, particles.length);
}

export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

