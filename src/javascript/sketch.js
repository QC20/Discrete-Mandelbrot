let mandel;
let centerPosition;
let zoomRatio;
let targetZoomRatio;
let zoomEasing = 0.08;

// Rotation state
let rotationAngle = 0.0;
let targetRotationAngle = 0.0;
let rotationEasing = 0.1;
let rotationSensitivity = 0.25; // dampen rotation so trackpad circles feel controlled

// Touch gesture tracking
let prevTouchDist = null;
let prevTouchAngle = null;
let prevTouchCenter = null;
let activeTouches = [];

// Safari/WebKit gesture tracking (Mac trackpad + iOS Safari)
let gestureActive = false;
let gestureStartRotation = 0.0;
let gestureStartZoom = 1.0;

// Pan speed multiplier (applied everywhere panning occurs)
let panSpeed = 0.888;

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

  let cnv = document.querySelector('canvas');

  // Prevent default touch behaviour so gestures do not
  // scroll or zoom the page underneath the canvas
  cnv.addEventListener('touchstart', handleTouchStart, { passive: false });
  cnv.addEventListener('touchmove', handleTouchMove, { passive: false });
  cnv.addEventListener('touchend', handleTouchEnd, { passive: false });
  cnv.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // Safari/WebKit gesture events (Mac trackpad + iOS Safari)
  cnv.addEventListener('gesturestart', handleGestureStart, { passive: false });
  cnv.addEventListener('gesturechange', handleGestureChange, { passive: false });
  cnv.addEventListener('gestureend', handleGestureEnd, { passive: false });

  // Chrome/Firefox on desktop: trackpad pinch fires as wheel
  // events with ctrlKey held. We intercept those here so that
  // Chrome does not zoom the page and our fractal zooms instead.
  cnv.addEventListener('wheel', handleWheel, { passive: false });
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
// WHEEL (unified handler for all desktop browsers)
// Chrome/Firefox encode trackpad pinch as wheel + ctrlKey.
// Regular scroll wheel also lands here.
// We call preventDefault to stop Chrome zooming the page.
// -------------------------------------------------------
function handleWheel(e) {
  e.preventDefault();

  if (e.ctrlKey) {
    // Trackpad pinch gesture (Chrome, Firefox, Edge)
    let zoomFactor = 1 - e.deltaY * 0.01;
    targetZoomRatio *= zoomFactor;
    if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;
  } else {
    // Normal scroll wheel
    if (e.deltaY > 0) {
      targetZoomRatio /= 1.0116;
    } else {
      targetZoomRatio *= 1.0116;
    }
    if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;
  }
}

// Disable p5's built-in mouseWheel since handleWheel covers it
function mouseWheel(event) {
  // Intentionally empty: handled by handleWheel on the canvas
}

// -------------------------------------------------------
// MOUSE DRAG (desktop pan)
// -------------------------------------------------------
function mouseDragged() {
  if (activeTouches.length > 0) return;

  let aspect = width / height;
  let dx = (mouseX - pmouseX) / width;
  let dy = (mouseY - pmouseY) / height;

  let cosR = Math.cos(rotationAngle);
  let sinR = Math.sin(rotationAngle);
  let rawDx = panSpeed / zoomRatio * dx * aspect;
  let rawDy = panSpeed / zoomRatio * dy;
  centerPosition[0] -= rawDx * cosR + rawDy * sinR;
  centerPosition[1] += -rawDx * sinR + rawDy * cosR;
}

// -------------------------------------------------------
// KEYBOARD (arrows, zoom, rotation with [ ] and reset with 0)
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
  if (key === '[' || key === ',') {
    targetRotationAngle -= 0.05;
  } else if (key === ']' || key === '.') {
    targetRotationAngle += 0.05;
  }
  if (key === '0') {
    targetRotationAngle = 0.0;
  }
}

// -------------------------------------------------------
// SAFARI / WEBKIT GESTURE EVENTS
// Mac trackpad and iOS Safari two-finger rotate + pinch.
// -------------------------------------------------------
function handleGestureStart(e) {
  e.preventDefault();
  gestureActive = true;
  gestureStartRotation = targetRotationAngle;
  gestureStartZoom = targetZoomRatio;
}

function handleGestureChange(e) {
  e.preventDefault();

  // Apply rotation sensitivity so trackpad circles feel controlled
  let rotationDeg = e.rotation * Math.PI / 180;
  targetRotationAngle = gestureStartRotation + rotationDeg * rotationSensitivity;

  let newZoom = gestureStartZoom * e.scale;
  if (newZoom < 1.0) newZoom = 1.0;
  targetZoomRatio = newZoom;
}

function handleGestureEnd(e) {
  e.preventDefault();
  gestureActive = false;
}

// -------------------------------------------------------
// GENERIC TOUCH EVENTS
// Fallback for Chrome/Firefox on Android. Also handles
// single-finger pan on all touch devices.
// On iOS, Chrome uses WebKit under the hood so Safari
// gesture events fire there too, but these provide a
// safety net regardless.
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
  // Enrich touches with stored previous positions
  for (let t of e.touches) {
    if (_touchPrevMap[t.identifier]) {
      t._prevX = _touchPrevMap[t.identifier].x;
      t._prevY = _touchPrevMap[t.identifier].y;
    }
  }
  activeTouches = Array.from(e.touches);

  if (activeTouches.length === 1 && !gestureActive) {
    // Single finger: pan
    let t = activeTouches[0];
    if (t._prevX !== undefined) {
      let dx = (t.clientX - t._prevX) / width;
      let dy = (t.clientY - t._prevY) / height;
      let aspect = width / height;

      let cosR = Math.cos(rotationAngle);
      let sinR = Math.sin(rotationAngle);
      let rawDx = panSpeed / zoomRatio * dx * aspect;
      let rawDy = panSpeed / zoomRatio * dy;
      centerPosition[0] -= rawDx * cosR + rawDy * sinR;
      centerPosition[1] += -rawDx * sinR + rawDy * cosR;
    }

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

      // Rotation with damping
      let angleDelta = angle - prevTouchAngle;
      while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
      while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
      targetRotationAngle += angleDelta * rotationSensitivity;

      // Two-finger pan
      if (prevTouchCenter !== null) {
        let dx = (center.x - prevTouchCenter.x) / width;
        let dy = (center.y - prevTouchCenter.y) / height;
        let aspect = width / height;

        let cosR = Math.cos(rotationAngle);
        let sinR = Math.sin(rotationAngle);
        let rawDx = panSpeed / zoomRatio * dx * aspect;
        let rawDy = panSpeed / zoomRatio * dy;
        centerPosition[0] -= rawDx * cosR + rawDy * sinR;
        centerPosition[1] += -rawDx * sinR + rawDy * cosR;
      }
    }

    prevTouchDist = dist;
    prevTouchAngle = angle;
    prevTouchCenter = center;
  }

  // Store positions for next frame
  for (let t of e.touches) {
    _touchPrevMap[t.identifier] = { x: t.clientX, y: t.clientY };
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
  // Clean up identifiers that are no longer active
  let activeIds = new Set();
  for (let t of e.touches) activeIds.add(t.identifier);
  for (let id in _touchPrevMap) {
    if (!activeIds.has(Number(id))) delete _touchPrevMap[id];
  }
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

// Map to track previous touch positions for single-finger pan
let _touchPrevMap = {};
