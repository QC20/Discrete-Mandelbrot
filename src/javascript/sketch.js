let mandel;
let centerPosition;
let zoomRatio;
let targetZoomRatio;
let zoomEasing = 0.08;

// Rotation state
let rotationAngle = 0.0;
let targetRotationAngle = 0.0;
let rotationEasing = 0.1;

// Touch gesture tracking
let prevTouchDist = null;
let prevTouchAngle = null;
let prevTouchCenter = null;
let activeTouches = [];

// Safari/WebKit gesture tracking (Mac trackpad + iOS Safari)
let gestureActive = false;
let gestureStartRotation = 0.0;
let gestureStartZoom = 1.0;

function preload() {
  mandel = loadShader('src/shaders/shader.vert', 'src/shaders/shader.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  frameRate(30);
  centerPosition = [-0.5, 0.0];
  zoomRatio = 1.0;
  targetZoomRatio = 1.0;
  shader(mandel);
  noStroke();

  // Prevent default touch behaviour so gestures work without
  // the page scrolling or zooming underneath the canvas
  let cnv = document.querySelector('canvas');

  cnv.addEventListener('touchstart', handleTouchStart, { passive: false });
  cnv.addEventListener('touchmove', handleTouchMove, { passive: false });
  cnv.addEventListener('touchend', handleTouchEnd, { passive: false });
  cnv.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // Safari/WebKit gesture events (Mac trackpad rotation + pinch,
  // and iOS Safari two-finger gestures)
  cnv.addEventListener('gesturestart', handleGestureStart, { passive: false });
  cnv.addEventListener('gesturechange', handleGestureChange, { passive: false });
  cnv.addEventListener('gestureend', handleGestureEnd, { passive: false });
}

function draw() {
  // Smooth interpolation for zoom and rotation
  zoomRatio += (targetZoomRatio - zoomRatio) * zoomEasing;
  rotationAngle += (targetRotationAngle - rotationAngle) * rotationEasing;

  mandel.setUniform('p', centerPosition);
  mandel.setUniform('r', 1.5 / zoomRatio);
  mandel.setUniform('resolution', [width, height]);
  mandel.setUniform('rotation', rotationAngle);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  shader(mandel);
  noStroke();
}

// -------------------------------------------------------
// MOUSE WHEEL (desktop scroll zoom, unchanged)
// -------------------------------------------------------
function mouseWheel(event) {
  if (event.delta > 0) {
    targetZoomRatio /= 1.0116;
  } else {
    targetZoomRatio *= 1.0116;
  }
  if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;
}

// -------------------------------------------------------
// MOUSE DRAG (desktop pan, unchanged)
// -------------------------------------------------------
function mouseDragged() {
  // Skip mouse-drag panning when a touch gesture is active,
  // because p5 fires mouseDragged for single-finger touch too
  if (activeTouches.length > 0) return;

  let aspect = width / height;
  let dx = (mouseX - pmouseX) / width;
  let dy = (mouseY - pmouseY) / height;

  // Pan must respect the current rotation so dragging feels
  // natural relative to the visible orientation
  let cosR = Math.cos(rotationAngle);
  let sinR = Math.sin(rotationAngle);
  let rawDx = 0.222 / zoomRatio * dx * aspect;
  let rawDy = 0.222 / zoomRatio * dy;
  centerPosition[0] -= rawDx * cosR + rawDy * sinR;
  centerPosition[1] += -rawDx * sinR + rawDy * cosR;
}

// -------------------------------------------------------
// KEYBOARD (arrows + rotation with [ ] or R/L keys)
// -------------------------------------------------------
function keyPressed() {
  let d = (4.0 / 9.0) / zoomRatio / 40.0;
  if (keyCode === LEFT_ARROW) {
    centerPosition[0] += d;
  } else if (keyCode === RIGHT_ARROW) {
    centerPosition[0] -= d;
  } else if (keyCode === UP_ARROW) {
    centerPosition[1] -= d;
  } else if (keyCode === DOWN_ARROW) {
    centerPosition[1] += d;
  }
  if (key === '+') {
    targetZoomRatio *= 1.0228;
  } else if (key === '-') {
    targetZoomRatio /= 1.0228;
    if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;
  }

  // Rotation via keyboard: [ and ] brackets, or < and >
  if (key === '[' || key === ',') {
    targetRotationAngle -= 0.05;
  } else if (key === ']' || key === '.') {
    targetRotationAngle += 0.05;
  }

  // Reset rotation with 0 key
  if (key === '0') {
    targetRotationAngle = 0.0;
  }
}

// -------------------------------------------------------
// SAFARI / WEBKIT GESTURE EVENTS
// These fire on Mac trackpad (two-finger rotate and pinch)
// and on iOS Safari (two-finger gestures).
// When these are available they give the cleanest data,
// so we prefer them and skip the manual touch math.
// -------------------------------------------------------
function handleGestureStart(e) {
  e.preventDefault();
  gestureActive = true;
  gestureStartRotation = targetRotationAngle;
  gestureStartZoom = targetZoomRatio;
}

function handleGestureChange(e) {
  e.preventDefault();

  // e.rotation is cumulative degrees since gesturestart
  targetRotationAngle = gestureStartRotation + (e.rotation * Math.PI / 180);

  // e.scale is cumulative scale factor since gesturestart
  let newZoom = gestureStartZoom * e.scale;
  if (newZoom < 1.0) newZoom = 1.0;
  targetZoomRatio = newZoom;
}

function handleGestureEnd(e) {
  e.preventDefault();
  gestureActive = false;
}

// -------------------------------------------------------
// GENERIC TOUCH EVENTS (fallback for non-WebKit browsers,
// e.g. Chrome/Firefox on Android or desktop)
// Also handles single-finger pan on all touch devices.
// -------------------------------------------------------
function handleTouchStart(e) {
  e.preventDefault();
  activeTouches = Array.from(e.touches);

  if (activeTouches.length === 2 && !gestureActive) {
    let t0 = activeTouches[0];
    let t1 = activeTouches[1];
    prevTouchDist = touchDistance(t0, t1);
    prevTouchAngle = touchAngle(t0, t1);
    prevTouchCenter = touchCenter(t0, t1);
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  activeTouches = Array.from(e.touches);

  if (activeTouches.length === 1 && !gestureActive) {
    // Single finger: pan
    let t = activeTouches[0];
    // We need a previous position; store it on the touch object
    if (t._prevX !== undefined) {
      let dx = (t.clientX - t._prevX) / width;
      let dy = (t.clientY - t._prevY) / height;
      let aspect = width / height;

      let cosR = Math.cos(rotationAngle);
      let sinR = Math.sin(rotationAngle);
      let rawDx = 0.222 / zoomRatio * dx * aspect;
      let rawDy = 0.222 / zoomRatio * dy;
      centerPosition[0] -= rawDx * cosR + rawDy * sinR;
      centerPosition[1] += -rawDx * sinR + rawDy * cosR;
    }
    // Store for next frame (touch objects are recreated each event,
    // so we tag the identifier-based position in a small map)
    storeTouchPrev(t);

  } else if (activeTouches.length === 2 && !gestureActive) {
    // Two fingers: rotate + pinch-zoom + pan
    let t0 = activeTouches[0];
    let t1 = activeTouches[1];

    let dist = touchDistance(t0, t1);
    let angle = touchAngle(t0, t1);
    let center = touchCenter(t0, t1);

    if (prevTouchDist !== null) {
      // Pinch zoom
      let scaleFactor = dist / prevTouchDist;
      targetZoomRatio *= scaleFactor;
      if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;

      // Rotation (angle delta)
      let angleDelta = angle - prevTouchAngle;
      // Normalise to [-PI, PI] to avoid jumps when fingers cross axes
      while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
      while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
      targetRotationAngle += angleDelta;

      // Two-finger pan
      if (prevTouchCenter !== null) {
        let dx = (center.x - prevTouchCenter.x) / width;
        let dy = (center.y - prevTouchCenter.y) / height;
        let aspect = width / height;

        let cosR = Math.cos(rotationAngle);
        let sinR = Math.sin(rotationAngle);
        let rawDx = 0.222 / zoomRatio * dx * aspect;
        let rawDy = 0.222 / zoomRatio * dy;
        centerPosition[0] -= rawDx * cosR + rawDy * sinR;
        centerPosition[1] += -rawDx * sinR + rawDy * cosR;
      }
    }

    prevTouchDist = dist;
    prevTouchAngle = angle;
    prevTouchCenter = center;
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  activeTouches = Array.from(e.touches);
  if (activeTouches.length < 2) {
    prevTouchDist = null;
    prevTouchAngle = null;
    prevTouchCenter = null;
  }
  clearTouchPrev();
}

// -------------------------------------------------------
// TOUCH GEOMETRY HELPERS
// -------------------------------------------------------
function touchDistance(t0, t1) {
  let dx = t1.clientX - t0.clientX;
  let dy = t1.clientY - t0.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchAngle(t0, t1) {
  return Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);
}

function touchCenter(t0, t1) {
  return {
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2
  };
}

// Simple map to track previous touch positions for single-finger pan
let _touchPrevMap = {};
function storeTouchPrev(t) {
  _touchPrevMap[t.identifier] = { x: t.clientX, y: t.clientY };
  // Attach to next event's touch by reading the map
  t._prevX = _touchPrevMap[t.identifier] ? _touchPrevMap[t.identifier].x : t.clientX;
  t._prevY = _touchPrevMap[t.identifier] ? _touchPrevMap[t.identifier].y : t.clientY;
}
function clearTouchPrev() {
  _touchPrevMap = {};
}

// Patch: on touchmove, look up previous position from the map
let _origHandleTouchMove = handleTouchMove;
handleTouchMove = function(e) {
  // Enrich touches with previous positions before processing
  for (let t of e.touches) {
    if (_touchPrevMap[t.identifier]) {
      t._prevX = _touchPrevMap[t.identifier].x;
      t._prevY = _touchPrevMap[t.identifier].y;
    }
  }
  _origHandleTouchMove(e);
  // Update stored positions after processing
  for (let t of e.touches) {
    _touchPrevMap[t.identifier] = { x: t.clientX, y: t.clientY };
  }
};
