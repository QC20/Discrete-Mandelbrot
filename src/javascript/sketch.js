let mandel;
let centerPosition;
let zoomRatio;
let targetZoomRatio;
let zoomEasing = 0.08; // smoothness factor for zoom transitions (0.08 = smooth organic feel)

function preload() {
  mandel = loadShader('src/shaders/shader.vert', 'src/shaders/shader.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1); // keeps grid squares crisp and consistent across displays
  frameRate(30);
  centerPosition = [-0.5, 0.0];
  zoomRatio = 1.0;
  targetZoomRatio = 1.0;
  shader(mandel);
  noStroke();
}

function draw() {
  // Smoothly interpolate zoomRatio towards targetZoomRatio
  zoomRatio += (targetZoomRatio - zoomRatio) * zoomEasing;
  
  mandel.setUniform('p', centerPosition);
  mandel.setUniform('r', 1.5 / zoomRatio);
  mandel.setUniform('resolution', [width, height]);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  shader(mandel); // re-bind after resize
  noStroke();
}

function mouseWheel(event) {
  if (event.delta > 0) {
    targetZoomRatio /= 1.035;
  } else {
    targetZoomRatio *= 1.035;
  }
  if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;
}

function mouseDragged() {
  let aspect = width / height;
  let dx = (mouseX - pmouseX) / width;
  let dy = (mouseY - pmouseY) / height;
  centerPosition[0] -= (4.0 / 3.0) / zoomRatio * dx * aspect;
  centerPosition[1] += (4.0 / 3.0) / zoomRatio * dy;
}

function keyPressed() {
  let d = (4.0 / 3.0) / zoomRatio / 40.0;
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
    targetZoomRatio *= 1.07;
  } else if (key === '-') {
    targetZoomRatio /= 1.07;
    if (targetZoomRatio < 1.0) targetZoomRatio = 1.0;
  }
}
