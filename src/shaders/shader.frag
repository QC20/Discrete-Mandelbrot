#ifdef GL_ES
precision highp float;
#endif

// View center in complex plane
uniform vec2 p;

// Half-height of view in imaginary units (1.5 / zoomRatio)
uniform float r;

// Canvas resolution in pixels
uniform vec2 resolution;

void main() {

  // -------------------------------------------------------
  // DISCRETE BLOCK AESTHETIC
  // Snap each fragment to the nearest 4x4 pixel cell centre,
  // creating a more prominent blocky visual language.
  // -------------------------------------------------------
  float GRID = 4.0;
  vec2 snapped = floor(gl_FragCoord.xy / GRID) * GRID + GRID * 0.5;

  // -------------------------------------------------------
  // MAP PIXEL -> COMPLEX PLANE
  // Imaginary axis is the reference dimension (height).
  // Real axis stretches with aspect ratio so nothing is squashed.
  // -------------------------------------------------------
  float aspect = resolution.x / resolution.y;
  vec2 uv = (snapped / resolution) - 0.5;  // range [-0.5 , 0.5]
  float a = p.x + uv.x * 2.0 * r * aspect;
  float b = p.y + uv.y * 2.0 * r;

  // -------------------------------------------------------
  // ITERATE  z -> z^4 + c  (the original formula, degree 4)
  //
  // Re( (zr + zi*i)^4 ) = zr^4 - 6*zr^2*zi^2 + zi^4
  // Im( (zr + zi*i)^4 ) = 4*zr^3*zi   - 4*zr*zi^3
  //
  // Branchless GLSL ES 1.0 style: use mix() instead of break.
  // -------------------------------------------------------
  float zr = 0.0;
  float zi = 0.0;
  float inSet = 1.0;   // 1.0 = still alive,  0.0 = escaped

  for (int i = 0; i < 64; i++) {

    float zr2 = zr * zr;
    float zi2 = zi * zi;

    // Check escape BEFORE updating (matches original iteration count)
    float escaped = step(4.0, zr2 + zi2);   // 1.0 if escaped
    float alive   = (1.0 - escaped) * inSet; // 0.0 once escaped

    // z^4 + c
    float new_zr = zr2*zr2 - 6.0*zr2*zi2 + zi2*zi2 + a;
    float new_zi = 4.0*zr2*zr*zi - 4.0*zr*zi2*zi  + b;

    // Only advance the orbit while still alive
    zr    = mix(zr,    new_zr, alive);
    zi    = mix(zi,    new_zi, alive);
    inSet = alive;
  }

  // -------------------------------------------------------
  // COLOUR: mirror the original exactly.
  // In the set -> black.   Outside -> white.
  // -------------------------------------------------------
  if (inSet > 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
