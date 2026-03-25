#ifdef GL_ES
precision highp float;
#endif

// View centre stored as double-float pairs (hi + lo) for deep zoom precision.
// Together they provide ~48 bits of mantissa, supporting zoom levels up to ~10^13.
uniform vec2 p_re;     // real part:      x=hi, y=lo
uniform vec2 p_im;     // imaginary part: x=hi, y=lo

// Half-height of view in imaginary units (1.5 / zoomRatio)
uniform float r;

// Canvas resolution in pixels
uniform vec2 resolution;

// Rotation angle in radians
uniform float rotation;

// -------------------------------------------------------
// DOUBLE-FLOAT ARITHMETIC (Knuth TwoSum)
// Adds a double-float a=(hi,lo) and a single float b.
// -------------------------------------------------------
vec2 df_add(vec2 a, float b) {
  float s = a.x + b;
  float e = b - (s - a.x);
  return vec2(s, a.y + e);
}

// -------------------------------------------------------
// MANDELBROT ITERATION  z -> z^4 + c
//
// Re( (zr + zi·i)^4 ) = zr^4 - 6·zr^2·zi^2 + zi^4
// Im( (zr + zi·i)^4 ) = 4·zr^3·zi - 4·zr·zi^3
//
// Returns 1.0 if c is in the set, 0.0 if it escaped.
// -------------------------------------------------------
float iterate(float a, float b) {
  float zr = 0.0;
  float zi = 0.0;
  for (int i = 0; i < 128; i++) {
    float zr2 = zr * zr;
    float zi2 = zi * zi;
    if (zr2 + zi2 > 4.0) return 0.0;
    float nr = zr2*zr2 - 6.0*zr2*zi2 + zi2*zi2 + a;
    float ni = 4.0*zr2*zr*zi - 4.0*zr*zi2*zi  + b;
    zr = nr;
    zi = ni;
  }
  return 1.0;
}

// -------------------------------------------------------
// MAP A SCREEN PIXEL -> COMPLEX PLANE -> IN-SET TEST
// Uses df64 for the centre coordinate so deep zooms stay
// sharp.  cosR/sinR are pre-computed in main().
// -------------------------------------------------------
float sampleAt(vec2 px, float aspect, float cosR, float sinR) {
  vec2 uv = px / resolution - 0.5;
  vec2 rotUV = vec2(uv.x * cosR - uv.y * sinR,
                    uv.x * sinR + uv.y * cosR);
  vec2 cre = df_add(p_re, rotUV.x * 2.0 * r * aspect);
  vec2 cim = df_add(p_im, rotUV.y * 2.0 * r);
  return iterate(cre.x + cre.y, cim.x + cim.y);
}

void main() {

  // -------------------------------------------------------
  // DISCRETE BLOCK AESTHETIC
  // All fragments in a GRID×GRID cell share the same block
  // origin; we sample within that block, not outside it.
  // -------------------------------------------------------
  float GRID = 8.0;
  vec2 orig = floor(gl_FragCoord.xy / GRID) * GRID;

  float aspect = resolution.x / resolution.y;
  float cosR   = cos(rotation);
  float sinR   = sin(rotation);

  // -------------------------------------------------------
  // 2×2 SUPER-SAMPLE  (quadrant centres of the block)
  //
  // Single-point sampling lets boundary blocks be decided
  // by one lucky/unlucky pixel, producing scattered noise.
  // Sampling all four quadrant centres and using a majority
  // vote (≥ 2 of 4 inside → black) makes each block's colour
  // proportional to how much of its area lies inside the set,
  // giving a faithful shape with a clean blocky aesthetic.
  // -------------------------------------------------------
  float s = sampleAt(orig + vec2(GRID * 0.25, GRID * 0.25), aspect, cosR, sinR)
          + sampleAt(orig + vec2(GRID * 0.75, GRID * 0.25), aspect, cosR, sinR)
          + sampleAt(orig + vec2(GRID * 0.25, GRID * 0.75), aspect, cosR, sinR)
          + sampleAt(orig + vec2(GRID * 0.75, GRID * 0.75), aspect, cosR, sinR);

  // -------------------------------------------------------
  // COLOUR
  // Majority vote: ≥ 2 quadrants inside → black block.
  // -------------------------------------------------------
  if (s >= 2.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
