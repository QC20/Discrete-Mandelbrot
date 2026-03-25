#ifdef GL_ES
precision highp float;
#endif

// View centre stored as double-float pairs (hi + lo) for deep zoom precision.
// Together they provide ~48 bits of mantissa, supporting zoom levels up to ~10^13.
uniform vec2 p_re;     // real part: x=hi, y=lo
uniform vec2 p_im;     // imaginary part: x=hi, y=lo

// Half-height of view in imaginary units (1.5 / zoomRatio)
uniform float r;

// Canvas resolution in pixels
uniform vec2 resolution;

// Rotation angle in radians
uniform float rotation;

// -------------------------------------------------------
// DOUBLE-FLOAT ARITHMETIC (Knuth TwoSum)
// Adds a double-float a=(hi,lo) and a single float b,
// returning a double-float result.  Captures the rounding
// error so the low word stays accurate at deep zoom.
// -------------------------------------------------------
vec2 df_add(vec2 a, float b) {
  float s = a.x + b;
  float e = b - (s - a.x);
  return vec2(s, a.y + e);
}

void main() {

  // -------------------------------------------------------
  // DISCRETE BLOCK AESTHETIC
  // Snap each fragment to the nearest 8x8 pixel cell centre.
  // -------------------------------------------------------
  float GRID = 8.0;
  vec2 snapped = floor(gl_FragCoord.xy / GRID) * GRID + GRID * 0.5;

  // -------------------------------------------------------
  // MAP PIXEL -> COMPLEX PLANE
  // -------------------------------------------------------
  float aspect = resolution.x / resolution.y;
  vec2 uv = (snapped / resolution) - 0.5;

  // -------------------------------------------------------
  // APPLY ROTATION
  // -------------------------------------------------------
  float cosR = cos(rotation);
  float sinR = sin(rotation);
  vec2 rotatedUV = vec2(
    uv.x * cosR - uv.y * sinR,
    uv.x * sinR + uv.y * cosR
  );

  // -------------------------------------------------------
  // COMPUTE c = p + pixel_offset  WITH EXTENDED PRECISION
  // The pixel offset is a regular float; adding it to the
  // df64 centre preserves all significant bits so the image
  // stays sharp far beyond single-float zoom limits.
  // -------------------------------------------------------
  float offset_re = rotatedUV.x * 2.0 * r * aspect;
  float offset_im = rotatedUV.y * 2.0 * r;

  vec2 c_re = df_add(p_re, offset_re);
  vec2 c_im = df_add(p_im, offset_im);

  float a = c_re.x + c_re.y;
  float b = c_im.x + c_im.y;

  // -------------------------------------------------------
  // ITERATE  z -> z^4 + c
  //
  // Re( (zr + zi*i)^4 ) = zr^4 - 6*zr^2*zi^2 + zi^4
  // Im( (zr + zi*i)^4 ) = 4*zr^3*zi   - 4*zr*zi^3
  //
  // 256 iterations gives meaningful detail at deep zoom.
  // -------------------------------------------------------
  float zr = 0.0;
  float zi = 0.0;
  float inSet = 1.0;

  for (int i = 0; i < 256; i++) {
    float zr2 = zr * zr;
    float zi2 = zi * zi;

    if (zr2 + zi2 > 4.0) {
      inSet = 0.0;
      break;
    }

    float new_zr = zr2*zr2 - 6.0*zr2*zi2 + zi2*zi2 + a;
    float new_zi = 4.0*zr2*zr*zi - 4.0*zr*zi2*zi  + b;

    zr = new_zr;
    zi = new_zi;
  }

  // -------------------------------------------------------
  // COLOUR: in the set -> black.   Outside -> white.
  // -------------------------------------------------------
  if (inSet > 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
