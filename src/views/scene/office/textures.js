/** @file Textures painted on canvases at startup, so the game needs no image files. */

import * as THREE from 'three';

/**
 * Paints a `width` x `height` canvas with `paint` and wraps it as a texture.
 * @param {number} width
 * @param {number} height
 * @param {(context: CanvasRenderingContext2D) => void} paint
 * @param {{ repeat?: boolean }} [options] - Whether the texture tiles across larger surfaces.
 * @returns {THREE.CanvasTexture}
 */
function paintTexture(width, height, paint, { repeat = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function addGrime(context, spots, random = seededRandom(spots)) {
  const { width, height } = context.canvas;
  for (let i = 0; i < spots; i++) {
    context.fillStyle = `rgba(0, 0, 0, ${random() * 0.12})`;
    const size = 2 + random() * 10;
    context.fillRect(random() * width, random() * height, size, size * (1 + random() * 4));
  }
}

/** Stable noise keeps the same surface from changing between loads or render passes. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Fills the polygon through `points`, given as flat [x0, y0, x1, y1, ...] pairs. */
function fillPolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
  context.closePath();
  context.fill();
}

function fillEllipse(context, centerX, centerY, radiusX, radiusY) {
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

/** Painted plaster with fine grain, old roller marks, hairline cracks and a dark skirting board. */
export const createOfficeWallTexture = () =>
  paintTexture(256, 768, (context) => {
    const { width, height } = context.canvas;
    const random = seededRandom(8193);
    context.fillStyle = '#c2bdb2';
    context.fillRect(0, 0, width, height);
    for (let speck = 0; speck < 24000; speck++) {
      context.fillStyle = random() < .5 ? 'rgba(255,255,250,.055)' : 'rgba(48,43,38,.045)';
      const size = .5 + random() * 1.5;
      context.fillRect(random() * width, random() * height, size, size);
    }
    for (let mark = 0; mark < 55; mark++) {
      const x = random() * width, y = random() * height * .84;
      context.fillStyle = `rgba(62,54,47,${.012 + random() * .027})`;
      context.fillRect(x, y, .7 + random() * 2, 18 + random() * 155);
    }
    for (let stain = 0; stain < 12; stain++) {
      const x = random() * width, y = 180 + random() * (height - 270);
      const radius = 15 + random() * 42;
      const wash = context.createRadialGradient(x, y, 0, x, y, radius);
      wash.addColorStop(0, 'rgba(78,72,60,.07)');
      wash.addColorStop(1, 'rgba(78,72,60,0)');
      context.fillStyle = wash;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    for (let crack = 0; crack < 9; crack++) {
      const x = random() * width, y = 50 + random() * (height - 135);
      context.strokeStyle = 'rgba(62,58,53,.12)';
      context.lineWidth = .7;
      context.beginPath(); context.moveTo(x, y);
      context.lineTo(x + (random() - .5) * 22, y + 20);
      context.lineTo(x + (random() - .5) * 30, y + 37);
      context.stroke();
    }
    const trimY = height - 46;
    context.fillStyle = '#8c877b'; context.fillRect(0, trimY - 3, width, 3);
    context.fillStyle = '#353735'; context.fillRect(0, trimY, width, height - trimY);
    context.fillStyle = 'rgba(255,255,255,.1)'; context.fillRect(0, trimY + 3, width, 2);
  });

/** Shared neutral maps multiply the authored furniture colors without replacing them. */
const FURNITURE_FINISHES = new Map();
export function furnitureFinishTexture(finish) {
  if (FURNITURE_FINISHES.has(finish)) return FURNITURE_FINISHES.get(finish);
  const seeds = { wood: 139, metal: 227, fabric: 313, stone: 419, painted: 521, ceramic: 617, plastic: 719, rubber: 821 };
  const texture = paintTexture(256, 256, (context) => {
    const random = seededRandom(seeds[finish]);
    const size = context.canvas.width;
    context.fillStyle = '#f5f4f0';
    context.fillRect(0, 0, size, size);
    if (finish === 'wood') {
      for (let line = 0; line < 380; line++) {
        const y = random() * size;
        context.strokeStyle = `rgba(64,38,21,${.025 + random() * .095})`;
        context.lineWidth = .35 + random() * 1.5;
        context.beginPath(); context.moveTo(-5, y);
        context.bezierCurveTo(70, y + (random() - .5) * 8, 175, y + (random() - .5) * 9, size + 5, y + (random() - .5) * 5);
        context.stroke();
      }
      for (let knot = 0; knot < 4; knot++) {
        const x = random() * size, y = random() * size;
        context.strokeStyle = 'rgba(64,38,21,.13)';
        context.beginPath(); context.ellipse(x, y, 14 + random() * 12, 3 + random() * 3, 0, 0, Math.PI * 2); context.stroke();
      }
    } else if (finish === 'fabric') {
      context.strokeStyle = 'rgba(45,45,45,.085)'; context.lineWidth = .7;
      for (let line = 0; line < size; line += 5) {
        context.beginPath(); context.moveTo(line, 0); context.lineTo(line, size); context.stroke();
        context.beginPath(); context.moveTo(0, line); context.lineTo(size, line); context.stroke();
      }
    } else if (finish === 'rubber') {
      for (let dot = 0; dot < 7000; dot++) {
        context.fillStyle = random() < .5 ? 'rgba(42,42,42,.12)' : 'rgba(255,255,255,.08)';
        const x = random() * size, y = random() * size;
        context.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
      }
    } else {
      const marks = finish === 'stone' ? 6200 : finish === 'metal' ? 2300 : finish === 'plastic' ? 2400 : finish === 'ceramic' ? 1200 : 1800;
      for (let spot = 0; spot < marks; spot++) {
        const shade = random() < .5 ? 'rgba(35,35,35,.075)' : 'rgba(255,255,255,.08)';
        context.fillStyle = shade;
        const width = finish === 'metal' ? 3 + random() * 18 : 1 + random() * 3;
        context.fillRect(random() * size, random() * size, width, finish === 'metal' ? .5 : 1 + random() * 2);
      }
    }
  });
  FURNITURE_FINISHES.set(finish, texture);
  return texture;
}

/** Two by two large, pale stone tiles with soft veins: 2 m of office floor. */
export const createOfficeFloorTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, tile = size / 2;
    const random = seededRandom(1037);
    for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
      const shade = 201 + Math.floor(random() * 12);
      context.fillStyle = `rgb(${shade + 4},${shade},${shade - 10})`;
      context.fillRect(column * tile, row * tile, tile, tile);
    }
    for (let vein = 0; vein < 75; vein++) {
      context.strokeStyle = `rgba(95, 87, 75, ${0.035 + random() * 0.08})`;
      context.lineWidth = .5 + random() * 2;
      const x = random() * size, y = random() * size;
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + 60 - random() * 120, y + 40, x + 80 - random() * 160, y + 90, x + 120 - random() * 240, y + 140);
      context.stroke();
    }
    for (let grain = 0; grain < 6500; grain++) {
      context.fillStyle = random() < .5 ? 'rgba(255,255,255,.075)' : 'rgba(58,52,45,.035)';
      context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
    }
    for (let line = 0; line < size; line += tile) {
      context.fillStyle = '#958f84';
      context.fillRect(line, 0, 3, size);
      context.fillRect(0, line, size, 3);
      context.fillStyle = 'rgba(255,255,255,.24)';
      context.fillRect(line + 3, 0, 1, size);
      context.fillRect(0, line + 3, size, 1);
    }
    addGrime(context, 90, random);
  });

/** Four by four gray stone tiles of slightly different shades: 2 m of terrace, toilet or walkway. */
export const createStoneTileTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, tile = size / 4;
    const random = seededRandom(2119);
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        const shade = 134 + Math.floor(random() * 30);
        context.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
        context.fillRect(column * tile, row * tile, tile, tile);
      }
    }
    for (let chip = 0; chip < 9000; chip++) {
      context.fillStyle = random() < .55 ? 'rgba(24,26,28,.09)' : 'rgba(245,244,234,.09)';
      context.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 2);
    }
    addGrime(context, 300, random);
    context.fillStyle = '#5f6064';
    for (let line = 0; line < size; line += tile) {
      context.fillRect(line, 0, 3, size);
      context.fillRect(0, line, size, 3);
    }
  });

/** Grass-block paving: a concrete lattice with grass growing through staggered diamond holes. */
export const createGardenPavingTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, spacing = 32;
    const random = seededRandom(3209);
    context.fillStyle = '#aaa99f';
    context.fillRect(0, 0, size, size);
    for (let grit = 0; grit < 8500; grit++) {
      context.fillStyle = random() < .5 ? 'rgba(30,34,27,.06)' : 'rgba(255,255,245,.08)';
      context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
    }
    for (let row = 0; row <= size / spacing; row++) {
      for (let column = -1; column <= size / spacing; column++) {
        const x = column * spacing + (row % 2) * (spacing / 2), y = row * spacing;
        const green = 88 + Math.floor(random() * 35);
        context.fillStyle = `rgb(${green - 31}, ${green}, ${green - 48})`;
        fillPolygon(context, [x, y - 13, x + 11, y, x, y + 13, x - 11, y]);
        context.save();
        context.beginPath(); context.moveTo(x, y - 13); context.lineTo(x + 11, y);
        context.lineTo(x, y + 13); context.lineTo(x - 11, y); context.closePath(); context.clip();
        for (let blade = 0; blade < 9; blade++) {
          const bx = x - 9 + random() * 18, by = y - 10 + random() * 20;
          context.strokeStyle = random() < .5 ? 'rgba(20,58,22,.47)' : 'rgba(153,167,73,.44)';
          context.lineWidth = .7;
          context.beginPath(); context.moveTo(bx, by + 3); context.lineTo(bx + (random() - .5) * 5, by - 4 - random() * 5); context.stroke();
        }
        context.restore();
      }
    }
    addGrime(context, 180, random);
  });

/** Rough gray concrete for the low walls and the street fence. */
export const createConcreteTexture = () =>
  paintTexture(256, 512, (context) => {
    const { width, height } = context.canvas;
    const random = seededRandom(4317);
    context.fillStyle = '#7d7a75';
    context.fillRect(0, 0, width, height);
    for (let speck = 0; speck < 10000; speck++) {
      const light = random() < 0.5;
      context.fillStyle = light ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)';
      context.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 3);
    }
    for (let crack = 0; crack < 8; crack++) {
      const x = random() * width, y = random() * height;
      context.strokeStyle = 'rgba(28,28,27,.19)'; context.lineWidth = .8;
      context.beginPath(); context.moveTo(x, y);
      context.lineTo(x + 9 + random() * 22, y + 20 + random() * 40);
      context.lineTo(x + 5 + random() * 37, y + 40 + random() * 45); context.stroke();
    }
    addGrime(context, 100, random);
  });

/** Aged acoustic ceiling panels: fine fibers, inset edges and occasional water marks. */
export const createCeilingTexture = () =>
  paintTexture(512, 512, (context) => {
    const size = context.canvas.width, tile = size / 4;
    const random = seededRandom(5471);
    context.fillStyle = '#b7b5aa'; context.fillRect(0, 0, size, size);
    for (let panelY = 0; panelY < size; panelY += tile) for (let panelX = 0; panelX < size; panelX += tile) {
      const shade = 169 + Math.floor(random() * 12);
      context.fillStyle = `rgb(${shade + 2},${shade + 1},${shade - 5})`;
      context.fillRect(panelX + 5, panelY + 5, tile - 10, tile - 10);
      context.strokeStyle = 'rgba(55,53,51,.22)'; context.lineWidth = 3;
      context.strokeRect(panelX + 3, panelY + 3, tile - 6, tile - 6);
    }
    for (let fiber = 0; fiber < 18000; fiber++) {
      context.fillStyle = random() < .5 ? 'rgba(35,35,33,.06)' : 'rgba(250,248,238,.09)';
      context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
    }
    for (let stain = 0; stain < 4; stain++) {
      const x = random() * size, y = random() * size, radius = 19 + random() * 39;
      const wash = context.createRadialGradient(x, y, 0, x, y, radius);
      wash.addColorStop(0, 'rgba(70,59,42,.11)'); wash.addColorStop(1, 'rgba(70,59,42,0)');
      context.fillStyle = wash; context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  });

/** Orange skin with darker ribs, laid out for SphereGeometry's UVs. */
export const createPumpkinTexture = () =>
  paintTexture(
    512,
    256,
    (context) => {
      const { width, height } = context.canvas;
      context.fillStyle = '#c4561a';
      context.fillRect(0, 0, width, height);
      const ribWidth = width / 10;
      for (let x = 0; x < width; x += ribWidth) {
        const gradient = context.createLinearGradient(x, 0, x + ribWidth, 0);
        gradient.addColorStop(0, 'rgba(60, 20, 0, 0.55)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 60, 0.15)');
        gradient.addColorStop(1, 'rgba(60, 20, 0, 0.55)');
        context.fillStyle = gradient;
        context.fillRect(x, 0, ribWidth, height);
      }
    },
    { repeat: false },
  );

/** The glowing carved face, centered where SphereGeometry maps its +z side (u = 0.25). */
export const createPumpkinFaceTexture = () =>
  paintTexture(
    512,
    256,
    (context) => {
      context.fillStyle = '#000';
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
      context.fillStyle = '#ffd060';
      fillPolygon(context, [96, 108, 120, 108, 110, 80]);
      fillPolygon(context, [136, 108, 160, 108, 146, 80]);
      fillPolygon(context, [122, 128, 134, 128, 128, 114]);
      fillPolygon(context, [92, 140, 164, 140, 154, 160, 142, 150, 128, 162, 114, 150, 102, 160]);
    },
    { repeat: false },
  );

/** A dim old portrait: a pale face with empty eyes. */
export const createPortraitTexture = () =>
  paintTexture(
    128,
    168,
    (context) => {
      const { width, height } = context.canvas;
      const centerX = width / 2;
      const background = context.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, '#2c2419');
      background.addColorStop(1, '#0c0907');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = '#16110c';
      fillEllipse(context, centerX, height + 10, 56, 62);
      context.fillStyle = '#9c917e';
      fillEllipse(context, centerX, 68, 24, 31);
      context.fillStyle = '#0a0705';
      for (const eyeX of [centerX - 10, centerX + 10]) fillEllipse(context, eyeX, 64, 6, 7);
      context.fillRect(centerX - 8, 84, 16, 2);

      addGrime(context, 120);
    },
    { repeat: false },
  );
