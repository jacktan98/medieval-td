// THE START PAGE, at the owner's word: the first screen after the loading bar, before
// the world map, as Kingdom Rush 1 opens. The artist's scene in four layers
// (assets/start), the game's name over it, and Start. A tap on Start goes to the world
// map; nothing else on the page answers. Once per visit: back from a stage is the map.
//
// THE LOOK IS THE OWNER'S PICK OF THE PREVIEWS ("5c"): the scene a shade calmer than
// as drawn — a touch of its colour taken out, a light wash over it, darker towards
// the edges — and the name on top of all that, untouched, as drawn.
//
// Not in a replay (replay.html), which goes straight to its board, nor in the tools
// and test pages, which build their own state: `state.title` is set by main.js alone.
import { art } from './assets.js';
import { UI_BACK, UI_EDGE, UI_INK } from './render.js';

// START, at the bottom middle on the road, in the Admin button's style (render.js
// panelBox and drawAdminDoor), larger — and larger again at the owner's word, with a
// ring pulsing round it to draw the eye.
export const TITLE_START = { x: 480 - 100, y: 540 - 62 - 34, w: 200, h: 62 };
const FONT = '36px Lobster, system-ui, sans-serif';
const RADIUS = 16;
// THE PULSE, AS THE TUTORIAL'S RINGS PULSE, at the owner's word (arrowAt in
// src/tutorial.js): one cream ring just outside the button, breathing 2px in and out
// and brightening and dimming with it, about once a second. A dark edge
// under it, so it shows on the pale road.
const RING_GAP = 6, RING_SWAY = 2, RING_RATE = 6;

// THE WASH, the gentlest of the three softenings the owner was shown.
const GREY = 0.06;            // how much of the colour is taken out
const WASH = [[0, '#f2f4f6'], [0.4, '#f4f0e8'], [1, '#ebe3d6']];   // multiplied over it, top to bottom
const EDGE_DARK = 0.42;       // the darkest the corners go

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function tapTitle(state, x, y) {
  if (!inside(TITLE_START, x, y)) return false;
  state.title = false;
  return true;
}

// THE SCENE, WASHED, made once per screen size rather than every frame: four whole-
// screen pictures and three blends are too much to redo sixty times a second.
let sheet = null, sheetKey = '';
function scene(ctx) {
  const c = ctx.canvas, tf = ctx.getTransform();
  const ready = [1, 2, 3, 4].every(n => art[`start_${n}`]);
  const key = `${c.width}x${c.height}|${tf.a},${tf.e},${tf.f}|${ready}`;
  if (sheet && key === sheetKey) return sheet;
  sheetKey = key;
  sheet = sheet || document.createElement('canvas');
  sheet.width = c.width;
  sheet.height = c.height;
  const g = sheet.getContext('2d');
  g.setTransform(tf);
  g.clearRect(0, 0, 960, 540);
  g.fillStyle = '#23201c';
  g.fillRect(0, 0, 960, 540);
  for (let n = 1; n <= 4; n++) if (art[`start_${n}`]) g.drawImage(art[`start_${n}`], 0, 0, 960, 540);
  g.save();
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = `rgba(128,128,128,${GREY})`;
  g.fillRect(0, 0, 960, 540);
  g.globalCompositeOperation = 'multiply';
  const wash = g.createLinearGradient(0, 0, 0, 540);
  for (const [o, col] of WASH) wash.addColorStop(o, col);
  g.fillStyle = wash;
  g.fillRect(0, 0, 960, 540);
  g.restore();
  const edge = g.createRadialGradient(480, 259, 243, 480, 270, 567);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, `rgba(0,0,0,${EDGE_DARK})`);
  g.fillStyle = edge;
  g.fillRect(0, 0, 960, 540);
  return sheet;
}

export function drawTitle(ctx) {
  // Made under the screen's own transform, then laid down pixel for pixel.
  const washed = scene(ctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(washed, 0, 0);
  ctx.restore();
  // The name over the wash, as drawn.
  if (art.start_name) ctx.drawImage(art.start_name, 0, 0, 960, 540);
  const b = TITLE_START;
  ctx.save();
  // On the wall clock: the page is up before any game has a clock of its own.
  const t = performance.now() / 1000;
  const wave = Math.sin(t * RING_RATE);
  const out = RING_GAP + wave * RING_SWAY;
  ctx.globalAlpha = 0.5 + 0.3 * wave;
  ctx.beginPath();
  ctx.roundRect(b.x - out, b.y - out, b.w + 2 * out, b.h + 2 * out, RADIUS + out);
  ctx.strokeStyle = 'rgba(14,12,10,0.6)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = UI_INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, RADIUS);
  ctx.fillStyle = UI_BACK;
  ctx.fill();
  ctx.strokeStyle = UI_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = UI_INK;
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Start', b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}
