import * as THREE from 'three';

// Painted on canvases at startup, so the game needs no image files.

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toTexture(canvas, { repeat = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function addGrime(context, width, height, spots) {
  for (let i = 0; i < spots; i++) {
    context.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.12})`;
    const size = 2 + Math.random() * 10;
    context.fillRect(Math.random() * width, Math.random() * height, size, size * (1 + Math.random() * 4));
  }
}

function fillPolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
  context.closePath();
  context.fill();
}

/** One wall tile from floor to ceiling: striped wallpaper above a wooden wainscot 0.9 m high. */
export function createWallpaperTexture(wallHeight) {
  const width = 256, height = 704;
  const canvas = createCanvas(width, height), context = canvas.getContext('2d');
  const railY = Math.round(height * (1 - 0.9 / wallHeight));

  context.fillStyle = '#3a2836';
  context.fillRect(0, 0, width, railY);
  context.fillStyle = '#442f40';
  for (let x = 0; x < width; x += 64) context.fillRect(x + 22, 0, 20, railY);
  context.fillStyle = '#513849';
  for (let y = 30, row = 0; y < railY - 20; y += 52, row++) {
    for (let x = row % 2 ? 0 : 32; x < width + 32; x += 64) fillPolygon(context, [x, y - 9, x + 6, y, x, y + 9, x - 6, y]);
  }

  context.fillStyle = '#2a1a10';
  context.fillRect(0, railY, width, height - railY);
  context.strokeStyle = '#1c1109';
  context.lineWidth = 6;
  context.strokeRect(24, railY + 30, width - 48, height - railY - 60);
  context.fillStyle = '#4a3020';
  context.fillRect(0, railY - 8, width, 12);
  context.fillStyle = '#1c1109';
  context.fillRect(0, height - 14, width, 14);

  addGrime(context, width, height, 500);
  return toTexture(canvas);
}

/** 2 m × 2 m of old floorboards. */
export function createFloorTexture() {
  const size = 512, rows = 8, rowHeight = size / rows;
  const canvas = createCanvas(size, size), context = canvas.getContext('2d');
  for (let row = 0; row < rows; row++) {
    const top = row * rowHeight;
    let x = -Math.random() * 200;
    while (x < size) {
      const length = 180 + Math.random() * 200;
      const shade = 54 + Math.random() * 22;
      context.fillStyle = `rgb(${shade + 12}, ${shade * 0.68}, ${shade * 0.45})`;
      context.fillRect(x, top, length, rowHeight);
      context.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      context.lineWidth = 1;
      for (let grain = 0; grain < 6; grain++) {
        const y = top + 6 + Math.random() * (rowHeight - 12);
        context.beginPath();
        context.moveTo(x, y);
        context.bezierCurveTo(x + length / 3, y + 3, x + (2 * length) / 3, y - 3, x + length, y);
        context.stroke();
      }
      context.fillStyle = '#140c07';
      context.fillRect(x, top, 3, rowHeight);
      x += length;
    }
    context.fillStyle = '#140c07';
    context.fillRect(0, top, size, 3);
  }
  addGrime(context, size, size, 300);
  return toTexture(canvas);
}

/** Orange skin with darker ribs, laid out for SphereGeometry's UVs. */
export function createPumpkinTexture() {
  const canvas = createCanvas(512, 256), context = canvas.getContext('2d');
  context.fillStyle = '#c4561a';
  context.fillRect(0, 0, 512, 256);
  const ribWidth = 512 / 10;
  for (let x = 0; x < 512; x += ribWidth) {
    const gradient = context.createLinearGradient(x, 0, x + ribWidth, 0);
    gradient.addColorStop(0, 'rgba(60, 20, 0, 0.55)');
    gradient.addColorStop(0.5, 'rgba(255, 150, 60, 0.15)');
    gradient.addColorStop(1, 'rgba(60, 20, 0, 0.55)');
    context.fillStyle = gradient;
    context.fillRect(x, 0, ribWidth, 256);
  }
  return toTexture(canvas, { repeat: false });
}

/** The glowing carved face, centered where SphereGeometry maps its +z side (u = 0.25). */
export function createPumpkinFaceTexture() {
  const canvas = createCanvas(512, 256), context = canvas.getContext('2d');
  context.fillStyle = '#000';
  context.fillRect(0, 0, 512, 256);
  context.fillStyle = '#ffd060';
  fillPolygon(context, [96, 108, 120, 108, 110, 80]);
  fillPolygon(context, [136, 108, 160, 108, 146, 80]);
  fillPolygon(context, [122, 128, 134, 128, 128, 114]);
  fillPolygon(context, [92, 140, 164, 140, 154, 160, 142, 150, 128, 162, 114, 150, 102, 160]);
  return toTexture(canvas, { repeat: false });
}

/** A dim old portrait: a pale face with empty eyes. */
export function createPortraitTexture() {
  const width = 128, height = 168;
  const canvas = createCanvas(width, height), context = canvas.getContext('2d');
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#2c2419');
  background.addColorStop(1, '#0c0907');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#16110c';
  context.beginPath();
  context.ellipse(width / 2, height + 10, 56, 62, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#9c917e';
  context.beginPath();
  context.ellipse(width / 2, 68, 24, 31, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#0a0705';
  for (const eyeX of [width / 2 - 10, width / 2 + 10]) {
    context.beginPath();
    context.ellipse(eyeX, 64, 6, 7, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillRect(width / 2 - 8, 84, 16, 2);

  addGrime(context, width, height, 120);
  return toTexture(canvas, { repeat: false });
}
