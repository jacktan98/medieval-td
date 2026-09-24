// THE TOWNS ON THE WORLD MAP, ALIVE: smoke from Ironforge and from the castles
// and workshops, Oakhaven's campfire, the castle banners, Dawnford's fountain and
// the holy light on it, and the trees in the wind. At the owner's ask, alongside
// the water in src/motion.js.
//
// ONLY WHERE THE PLAYER HAS BEEN. Each town wakes when the first of its stages is
// reached, so unlocking a stage visibly brings a town to life, and the country
// still ahead stays as still as the fog says it is. It is all drawn under the fog
// as well, which dims whatever might stray over its edge.
//
// NOTHING HERE OUTSHINES THE FLAG, the rule src/motion.js is written to: small,
// slow, pale, and on cycles long enough that it is noticed on the second look.
//
// Coordinates are canvas px, read off the map as drawn. A redraw of the world map
// that moves a house moves its chimney away from its smoke — re-read them then.

import { art } from './assets.js';

const ON = { smoke: true, holy: true, fire: true, banners: true, fountain: true, trees: true,
             forest: true, birds: true, tumbleweeds: true, pristine: true, heat: true, boat: true };

// The first stage of each town, by index into STAGES — the town wakes when the
// player has reached it.
const TOWN = { oakhaven: 0, winchester: 2, dawnford: 5, sandshroud: 8, ironforge: 9, serene: 12 };

// SMOKE, AT THE OWNER'S WORD: grey from Ironforge's houses, and black from the
// castles and the workshops of Winchester and Ironforge. The villages of Oakhaven,
// Winchester and Dawnford keep clean roofs — the campfire is Oakhaven's smoke.
const HOUSE_SMOKE = [
  { x: 810, y: 231 }, { x: 783, y: 288 }, { x: 746, y: 302 }, { x: 759, y: 314 },
  { x: 810, y: 325 }, { x: 889, y: 335 }, { x: 879, y: 352 }, { x: 740, y: 355 },
  { x: 767, y: 372 }
].map(c => ({ ...c, town: 'ironforge' }));

const BLACK_SMOKE = [
  { x: 446, y: 57, town: 'winchester' },   // the castle's towers
  { x: 469, y: 50, town: 'winchester' },
  { x: 425, y: 121, town: 'winchester' },  // the workshop
  { x: 909, y: 196, town: 'ironforge' },   // the castle's towers
  { x: 937, y: 205, town: 'ironforge' },
  { x: 878, y: 292, town: 'ironforge' }    // the factory
];

const CAMPFIRE = { x: 18, y: 84, town: 'oakhaven' };

// A banner: the top of it (where it hangs from), its width and its length. They
// hang from the battlements, so the top stays and the foot swings.
const BANNERS = [
  { x: 341, y: 52, w: 5, h: 12, town: 'winchester' },
  { x: 400, y: 70, w: 5, h: 11, town: 'winchester' },
  { x: 488, y: 73, w: 5, h: 12, town: 'winchester' },
  { x: 500, y: 68, w: 5, h: 12, town: 'winchester' },
  { x: 880, y: 216, w: 5, h: 12, town: 'ironforge' },
  { x: 893, y: 221, w: 5, h: 12, town: 'ironforge' },
  { x: 917, y: 326, w: 5, h: 11, town: 'ironforge' },
  { x: 709, y: 346, w: 5, h: 12, town: 'ironforge' },
  { x: 407, y: 262, w: 6, h: 11, town: 'dawnford' },     // the church
  { x: 415, y: 262, w: 6, h: 11, town: 'dawnford' },
  { x: 429, y: 264, w: 6, h: 12, town: 'dawnford' },
  { x: 514, y: 205, w: 7, h: 12, town: 'dawnford' },     // the barracks
  { x: 245, y: 360, w: 6, h: 13, town: 'sandshroud' },   // Sandshroud's barracks
  { x: 823, y: 66, w: 5, h: 13, town: 'serene' }         // Serene Peak's temple
];

const FOUNTAIN = { x: 517.5, y: 264, bowl: 276, town: 'dawnford' };

// A tree: where its canopy meets its trunk, how wide the canopy is either side,
// and how tall. The trunk stays; the crown sways.
const TREES = [
  { x: 136, y: 46, w: 14, h: 20, town: 'oakhaven' },
  { x: 160, y: 60, w: 14, h: 20, town: 'oakhaven' },
  { x: 265, y: 64, w: 13, h: 18, town: 'winchester' },
  { x: 372, y: 55, w: 14, h: 20, town: 'winchester' },
  { x: 571, y: 186, w: 14, h: 18, town: 'dawnford' },
  { x: 566, y: 290, w: 15, h: 20, town: 'dawnford' },
  { x: 782, y: 243, w: 14, h: 20, town: 'ironforge' },
  { x: 802, y: 262, w: 14, h: 18, town: 'ironforge' },
  { x: 724, y: 291, w: 14, h: 18, town: 'ironforge' },
  { x: 941, y: 290, w: 14, h: 18, town: 'ironforge' },
  { x: 784, y: 324, w: 13, h: 18, town: 'ironforge' },
  { x: 856, y: 364, w: 14, h: 20, town: 'ironforge' },
  { x: 926, y: 366, w: 14, h: 20, town: 'ironforge' },
  { x: 737, y: 380, w: 13, h: 18, town: 'ironforge' }
];

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const awake = (town, unlocked) => unlocked > TOWN[town];

// The wind: from the west, gusting. Everything that leans leans with this.
const wind = (t, x) => 0.6 + 0.4 * Math.sin(t * 0.37 - x * 0.006) * Math.sin(t * 0.23 + 1.3);

// --- smoke -------------------------------------------------------------------

// A soft round puff, drawn once per colour and stamped, rather than a new gradient
// built for every puff on every frame.
const sprites = new Map();
function sprite(rgb) {
  let c = sprites.get(rgb);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    sprites.set(rgb, c);
  }
  return c;
}

function puff(ctx, x, y, p, rise, drift, r0, r1, rgb, alpha) {
  const e = 1 - (1 - p) * (1 - p);
  const px = x + drift * p * p + Math.sin(p * 5 + x) * 0.8;
  const py = y - rise * e;
  const r = r0 + (r1 - r0) * p;
  const a = alpha * Math.min(1, p / 0.15) * (1 - p);
  if (a <= 0.005) return;
  ctx.globalAlpha = a;
  ctx.drawImage(sprite(rgb), px - r, py - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function drawSmoke(ctx, t, unlocked) {
  HOUSE_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    for (let k = 0; k < 6; k++) {
      const p = ((t / 9.5) + k / 6 + hash(i)) % 1;
      // A PALE grey: a mid grey is the grass's own brightness and vanished into it.
      puff(ctx, c.x, c.y, p, 22, 10 * w, 1.8, 6.2, '204,200,194', 0.85);
    }
  });
  BLACK_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    // SLOW, at the owner's word: heavy smoke hangs and rolls rather than streams.
    for (let k = 0; k < 8; k++) {
      const p = ((t / 13) + k / 8 + hash(i + 50)) % 1;
      puff(ctx, c.x, c.y, p, 26, 13 * w, 2, 7.5, '26,24,22', 0.8);
    }
    // A spark now and then from the fires under it.
    const sp = ((t / 3.4) + hash(i + 90)) % 1;
    if (sp < 0.35) {
      const q = sp / 0.35;
      ctx.fillStyle = `rgba(255,${170 - 60 * q | 0},70,${0.9 * (1 - q)})`;
      ctx.beginPath();
      ctx.arc(c.x + 3 * w * q + Math.sin(q * 9 + i) * 0.8, c.y - 1 - 11 * q, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// --- the holy light over Dawnford ---------------------------------------------
//
// SHAFTS OF LIGHT FALLING ON THE TOWN, at the owner's ask: subtle, and alive. A
// fan of soft rays from high above the island, each one slowly widening,
// brightening and fading on its own beat so the light seems to breathe, and a few
// motes of light drifting down through it. Laid on with `screen`, so it lightens
// what is there without covering it.
// THE WHOLE ISLAND IS LIT, and the light gathers on the middle of the town: the
// rays fan out to reach every shore, and the ones aimed at its heart are the
// brightest and the widest. `focus` is the angle from the source to SHRINE.
const HOLY = { x: 470, y: -60, town: 'dawnford', reach: 440, from: 0.95, to: 2.08, focus: 1.519 };
const RAYS = 18;
const ISLAND = { x: 512, y: 252, rx: 235, ry: 95 };
const SHRINE = { x: 488, y: 250, rx: 82, ry: 50 };   // the town's middle, drawn towards the church

// Where the holy light may fall, and how strongly: the land, fading to nothing
// over SHORE_FADE px as it nears the water. Worked out once from the map — the
// water is one exact shade, as src/motion.js finds it — at half resolution.
const HOLY_BOX = { x: 250, y: 110, w: 560, h: 260 };
const WATER = [0xbc, 0xc2, 0xc2];
const SHORE_FADE = 14;
let holyLayer = null, shore = null, shoreFrom = null;

function shoreMask() {
  const img = art.overview;
  if (!img) return null;
  if (shoreFrom === img) return shore;
  shoreFrom = img;
  const W = 480, H = 270;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H);
  const px = d.data;
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const wet = Math.abs(px[i * 4] - WATER[0]) <= 14 && Math.abs(px[i * 4 + 1] - WATER[1]) <= 14 &&
      Math.abs(px[i * 4 + 2] - WATER[2]) <= 14;
    dist[i] = wet ? 0 : 1e9;
  }
  // Distance to the nearest water, two chamfer sweeps.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
    if (y > 0) dist[i] = Math.min(dist[i], dist[i - W] + 1);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
    if (y < H - 1) dist[i] = Math.min(dist[i], dist[i + W] + 1);
  }
  for (let i = 0; i < W * H; i++) {
    const k = Math.min(1, (dist[i] * 2) / SHORE_FADE);
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255;
    px[i * 4 + 3] = Math.round(255 * k * k * (3 - 2 * k));
  }
  g.putImageData(d, 0, 0);
  shore = c;
  return shore;
}

function drawHoly(out, t, unlocked) {
  const h = HOLY;
  if (!awake(h.town, unlocked)) return;
  const mask = shoreMask();
  if (!mask) return;
  const L = HOLY_BOX;
  if (!holyLayer) { holyLayer = document.createElement('canvas'); holyLayer.width = L.w; holyLayer.height = L.h; }
  const ctx = holyLayer.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, L.w, L.h);
  ctx.setTransform(1, 0, 0, 1, -L.x, -L.y);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < RAYS; i++) {
    const a = h.from + (h.to - h.from) * (i + 0.5 + (hash(i) - 0.5) * 0.6) / RAYS
      + 0.015 * Math.sin(t * 0.21 + i);
    const near = Math.exp(-(((a - h.focus) / 0.22) ** 2));      // 1 on the shrine
    const width = (0.022 + 0.02 * hash(i + 10)) * (1 + near)
      + 0.008 * Math.sin(t * 0.5 + i * 1.7);
    const glow = (0.08 + 0.095 * (0.5 + 0.5 * Math.sin(t * (0.35 + hash(i + 20) * 0.3) + i * 2.1)))
      * (0.55 + 0.9 * near);
    const len = h.reach * (0.85 + 0.15 * hash(i + 30));
    const g = ctx.createLinearGradient(h.x, h.y, h.x + Math.cos(a) * len, h.y + Math.sin(a) * len);
    // Dark until the rays reach the island, so Winchester across the river is not
    // lit with it.
    g.addColorStop(0, 'rgba(255,238,180,0)');
    g.addColorStop(0.5, 'rgba(255,238,180,0)');
    g.addColorStop(0.7, `rgba(255,236,170,${glow})`);
    g.addColorStop(0.88, `rgba(255,232,160,${glow * 0.8})`);
    g.addColorStop(1, 'rgba(255,232,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(h.x + Math.cos(a - width) * len, h.y + Math.sin(a - width) * len);
    ctx.lineTo(h.x + Math.cos(a + width) * len, h.y + Math.sin(a + width) * len);
    ctx.closePath();
    ctx.fill();
  }
  // Warmth over the whole island, and more of it on the shrine.
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.4);
  for (const [e, a] of [[ISLAND, 0.08 + 0.025 * breathe], [SHRINE, 0.16 + 0.05 * breathe]]) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, e.ry / e.rx);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, e.rx);
    pool.addColorStop(0, `rgba(255,236,170,${a})`);
    pool.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(-e.rx, -e.rx, e.rx * 2, e.rx * 2);
    ctx.restore();
  }
  // Motes of light drifting down through the rays, most of them over the shrine.
  for (let k = 0; k < 24; k++) {
    const life = 6 + hash(k + 40) * 5;
    const p = ((t / life) + hash(k + 50)) % 1;
    const wide = k % 3 === 0 ? SHRINE : ISLAND;
    const x = wide.x + (hash(k + 60) - 0.5) * wide.rx * 1.6 + Math.sin(t * 0.6 + k) * 4;
    const y = wide.y - wide.ry * 0.9 + hash(k + 70) * wide.ry * 1.4 + p * 25;
    const r = 0.8 + hash(k + 80) * 1.6;
    const a = 0.65 * Math.sin(Math.PI * p);
    ctx.globalAlpha = a;
    ctx.drawImage(sprite('255,245,205'), x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // FADED OUT AT THE RIVER. The light is cut to the land and eased off over the
  // last few px before the water, so it lies on the island and not on the river.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, L.x / 2, L.y / 2, L.w / 2, L.h / 2, 0, 0, L.w, L.h);
  ctx.globalCompositeOperation = 'source-over';
  out.save();
  out.globalCompositeOperation = 'screen';
  out.drawImage(holyLayer, L.x, L.y);
  out.restore();
}

// --- the campfire --------------------------------------------------------------

function drawFire(ctx, t, unlocked) {
  const f = CAMPFIRE;
  if (!awake(f.town, unlocked)) return;
  // A warm glow on the ground round it, breathing.
  const flick = 0.75 + 0.15 * Math.sin(t * 9.1) + 0.1 * Math.sin(t * 13.7 + 1);
  const glow = ctx.createRadialGradient(f.x, f.y + 1, 0, f.x, f.y + 1, 11);
  glow.addColorStop(0, `rgba(255,170,70,${0.30 * flick})`);
  glow.addColorStop(1, 'rgba(255,170,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(f.x - 11, f.y - 10, 22, 22);
  // Flames: three tongues licking up out of the logs, each its own height.
  for (let k = 0; k < 3; k++) {
    const h = (3.2 + 1.4 * Math.sin(t * (7 + k * 2.3) + k * 2)) * flick;
    const x = f.x - 1.2 + k * 1.2;
    const lean = Math.sin(t * 5 + k) * 0.6;
    ctx.fillStyle = k === 1 ? 'rgba(255,214,110,0.95)' : 'rgba(240,120,50,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 1, f.y);
    ctx.quadraticCurveTo(x - 0.9, f.y - h * 0.5, x + lean, f.y - h);
    ctx.quadraticCurveTo(x + 0.9, f.y - h * 0.5, x + 1, f.y);
    ctx.closePath();
    ctx.fill();
  }
  // Embers, drifting up and off with the wind.
  for (let k = 0; k < 5; k++) {
    const life = 1.4 + hash(k + 30) * 0.8;
    const p = ((t / life) + hash(k + 40)) % 1;
    ctx.fillStyle = `rgba(255,${150 + 60 * (1 - p) | 0},60,${0.85 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(f.x + (hash(k) - 0.5) * 3 + 4 * p * p, f.y - 3 - 13 * p, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  // And a thread of smoke over it.
  for (let k = 0; k < 4; k++) {
    const p = ((t / 4.5) + k / 4) % 1;
    puff(ctx, f.x, f.y - 5, p, 16, 9 * wind(t, f.x), 1.2, 4.8, '240,236,226', 0.45);
  }
}

// --- the fountain --------------------------------------------------------------

function drawFountain(ctx, t, unlocked) {
  const f = FOUNTAIN;
  if (!awake(f.town, unlocked)) return;
  // Drops thrown up from the spout and falling back into the bowl in arcs.
  for (let k = 0; k < 16; k++) {
    const life = 0.9 + hash(k + 70) * 0.4;
    const p = ((t / life) + hash(k + 80)) % 1;
    const side = (hash(k + 90) - 0.5) * 2;          // which way this drop is thrown
    const x = f.x + side * 6.5 * p;
    const y = f.y - 4 * Math.sin(Math.PI * Math.min(1, p * 1.15)) + (f.bowl - 2 - f.y) * p * p;
    ctx.fillStyle = `rgba(236,244,246,${0.8 * (1 - p * 0.6)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  // The jet itself, a pale column that swells and settles.
  const jet = 5.5 + Math.sin(t * 3.1) * 0.8;
  ctx.strokeStyle = 'rgba(236,244,246,0.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y + 3);
  ctx.lineTo(f.x, f.y + 3 - jet);
  ctx.stroke();
}

// --- banners and trees: the map's own pixels, bent ----------------------------
//
// NOT REDRAWN, MOVED. A banner and a tree are already painted into the map, so they
// are taken off the canvas as it stands — lit, textured and inked exactly as the
// player sees them — and put back a row at a time, each row pushed a fraction of a
// pixel sideways. The top of a banner and the foot of a tree stay where they are
// and the far end swings. The canvas is copied onto itself, which it allows.
// FROM THE STILL MAP, NOT THE CANVAS. Copying pixels off the canvas while it is
// being drawn makes the device finish everything queued so far first, and doing it
// for every tree and banner — twenty-odd times a frame — was what made the map lag.
// src/overview.js hands over the still map it has already built (see stillMap
// there), which is exactly what lies under the trees and the banners, and every
// bend reads from that.
function bend(ctx, src, x0, y0, w, h, shift) {
  const m = ctx.getTransform();
  const k = m.a;
  const sx = x0 * k + m.e, sy = y0 * k + m.f;
  const sw = Math.ceil(w * k), sh = Math.ceil(h * k);
  // ONE DEVICE ROW AT A TIME. A logical row is two or three device rows on a phone,
  // and moving them together turned a smooth lean into a staircase.
  for (let r = 0; r < sh; r++) {
    const dx = shift(r / sh);
    if (Math.abs(dx) < 0.02) continue;
    ctx.drawImage(src, sx, sy + r, sw, 1, x0 + dx, y0 + r / k, sw / k, 1 / k);
  }
}

function drawBanners(ctx, t, unlocked, src) {
  BANNERS.forEach((b, i) => {
    if (!awake(b.town, unlocked)) return;
    const w = wind(t, b.x);
    // Nothing at the top, most at the foot, a ripple running down.
    bend(ctx, src, b.x - b.w / 2 - 1, b.y, b.w + 2, b.h, v =>
      w * 0.9 * v * Math.sin(t * 3.4 + i - v * 4));
  });
}

function drawTrees(ctx, t, unlocked, src) {
  TREES.forEach((tr, i) => {
    if (!awake(tr.town, unlocked)) return;
    // A gust crosses the map west to east, so neighbouring trees lean in turn.
    const gust = wind(t, tr.x);
    const sway = 0.55 * gust * Math.sin(t * 1.3 - tr.x * 0.02 + hash(i) * 2)
      + 0.2 * Math.sin(t * 2.9 + i);
    // v is 0 at the top of the crown and 1 where it meets the trunk.
    bend(ctx, src, tr.x - tr.w - 1, tr.y - tr.h, tr.w * 2 + 2, tr.h, v => sway * (1 - v) * (1 - v));
  });
}

// --- Fernshadow ----------------------------------------------------------------
//
// THE FOREST MOVES AS ONE, a gust rolling through it. Too dense for tree-by-tree
// bending — every crown overlaps its neighbours — so the whole canopy is cut from
// the canvas once and put back in small cells, each row of each column pushed by a
// wave that travels west to east and ripples from row to row, like leaves turning
// over. Clipped to the forest's outline so the river, the sand and the mountain
// beside it stay put. It wakes with Sandshroud, the stage beside it.
const FOREST = [[382, 540], [384, 420], [410, 376], [452, 352], [500, 340], [560, 335],
  [606, 342], [612, 358], [592, 410], [576, 462], [562, 540]];
const FOREST_BOX = { x: 380, y: 332, w: 236, h: 208 };
function drawForest(ctx, t, unlocked, src) {
  if (!awake('sandshroud', unlocked)) return;
  const m = ctx.getTransform(), k = m.a;
  const { x, y, w, h } = FOREST_BOX;
  ctx.save();
  ctx.beginPath();
  FOREST.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.clip();
  const COL = 14, ROW = 3;
  for (let cy = 0; cy < h; cy += ROW) {
    for (let cx = 0; cx < w; cx += COL) {
      const X = x + cx, Y = y + cy;
      const gust = wind(t, X) * (0.7 + 0.3 * Math.sin(t * 0.9 - X * 0.025));
      const dx = 1.2 * gust * Math.sin(t * 1.5 - X * 0.03 + Y * 0.05)
        + 0.4 * Math.sin(t * 3.1 + Y * 0.45 + X * 0.02);
      ctx.drawImage(src, X * k + m.e, Y * k + m.f, COL * k, ROW * k, X + dx - 0.25, Y, COL + 0.5, ROW + 0.05);
    }
  }
  ctx.restore();
}

// --- birds over Oakhaven ---------------------------------------------------------
//
// A small flock now and then, low over the village and away east across the open
// grass, where a dark bird can be seen — over the woods it vanished — wings
// beating, then gone for a while.
// NOT ON A FIXED BEAT. Time is cut into 30-second slots; in each one a flock
// comes or does not, and a flock that comes has its own size (two to seven),
// path, height and moment, all drawn from the slot number so every visit sees the
// same sky but no two slots look alike.
const BIRD_SLOT = 30;
const FLIGHT = 12;                  // seconds a crossing takes

function drawBirds(ctx, t, unlocked) {
  if (!awake('oakhaven', unlocked)) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(34,26,14,0.85)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.1;
  const now = Math.floor(t / BIRD_SLOT);
  for (const n of [now - 1, now]) {
    if (hash(n * 3.1 + 7) < 0.34) continue;            // about a third of the slots are empty
    const start = n * BIRD_SLOT + hash(n * 5.7) * (BIRD_SLOT - FLIGHT);
    const q = (t - start) / FLIGHT;
    if (q < 0 || q > 1) continue;
    const count = 2 + Math.floor(hash(n * 9.3 + 1) * 6);
    const fromY = 100 + hash(n * 2.2) * 35, toY = 45 + hash(n * 4.4) * 35;
    const fromX = -20 + hash(n * 6.6) * 100, toX = fromX + 300 + hash(n * 8.8) * 120;
    const fade = Math.min(1, q / 0.1, (1 - q) / 0.15);
    const bx = fromX + (toX - fromX) * q;
    const by = fromY + (toY - fromY) * q - Math.sin(q * Math.PI) * 10;
    ctx.globalAlpha = fade;
    for (let j = 0; j < count; j++) {
      // A loose V: every other bird to one side, each a little further back.
      const rank = Math.ceil(j / 2), side = j % 2 ? 1 : -1;
      const ox = -rank * (8 + hash(n + j) * 4), oy = side * rank * (4 + hash(n * 2 + j) * 3);
      const x = bx + ox + Math.sin(t * 1.7 + j) * 1.2, y = by + oy + Math.cos(t * 1.3 + j * 2) * 0.8;
      const beat = Math.sin(t * 11 + j * 1.9);
      const sz = 3.6 + hash(n * 3 + j) * 1.4, drop = sz * 0.5 * beat;
      ctx.beginPath();
      ctx.moveTo(x - sz, y - drop);
      ctx.quadraticCurveTo(x - sz * 0.4, y + drop * 0.5, x, y);
      ctx.quadraticCurveTo(x + sz * 0.4, y + drop * 0.5, x + sz, y - drop);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- tumbleweeds across Sandshroud -----------------------------------------------
//
// Now and then one blows in off the western edge and rolls east across the sand,
// spinning and hopping, and fades before it reaches the woods.
// NOT ON A FIXED BEAT either: 25-second slots, each with none, one, two or three
// tumbleweeds — none most often — every one with its own size, line, pace and
// moment. A crossing takes ROLL seconds.
const WEED_SLOT = 25;
const ROLL = 9;

function drawTumbleweeds(ctx, t, unlocked) {
  if (!awake('sandshroud', unlocked)) return;
  ctx.save();
  const now = Math.floor(t / WEED_SLOT);
  for (const n of [now - 1, now]) {
    const roll = hash(n * 4.7 + 3);
    const count = roll < 0.28 ? 0 : roll < 0.68 ? 1 : roll < 0.9 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const pace = 0.75 + hash(n * 7 + i) * 0.5;
      const dur = ROLL / pace;
      const start = n * WEED_SLOT + hash(n * 3.3 + i * 11) * (WEED_SLOT - dur);
      const q = (t - start) / dur;
      if (q < 0 || q > 1) continue;
      const r = 3.4 + hash(n * 5 + i * 3) * 1.8;
      const base = 420 + hash(n * 6.1 + i * 2) * 95;
      const x = -10 + q * 380;
      const hop = Math.abs(Math.sin(q * 28 + i + n)) * 5 * (0.6 + 0.4 * Math.sin(q * 7 + n));
      const ground = base - q * 12;
      const fade = Math.min(1, q / 0.05, (1 - q) / 0.2);
      // Its shadow, on the sand under it.
      ctx.globalAlpha = 0.25 * fade;
      ctx.fillStyle = '#3a2a16';
      ctx.beginPath();
      ctx.ellipse(x, ground + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // A ball of tangled twigs, spinning as it rolls.
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = '#6b4c28';
      ctx.lineWidth = 0.8;
      const spin = q * 60;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(x, ground - hop, r, r * (0.45 + 0.15 * k), spin + k * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// --- heat over Sandshroud --------------------------------------------------------
//
// THE AIR OVER THE SAND WOBBLES. The desert is taken off the still map a row at a
// time and put back pushed a fraction of a pixel sideways, by ripples that climb as
// hot air does — so the dunes, the cacti and the town seem to quiver. Cut to the
// sand itself, found by its one flat colour, so the river and the woods beside it
// stay still. Wakes with Sandshroud.
const DESERT = { x: 0, y: 322, w: 400, h: 218 };
const SAND = [233, 211, 179];
let heat = null, heatMask = null, heatFrom = null, heatSrc = null;

function drawHeat(ctx, t, unlocked, src, srcKey) {
  if (!awake('sandshroud', unlocked) || !src) return;
  const img = art.overview;
  if (!img) return;
  const m = ctx.getTransform(), k = m.a;
  const { x, y, w, h } = DESERT;
  const sw = Math.ceil(w * k), sh = Math.ceil(h * k);
  if (heatFrom !== `${img.src}|${sw}x${sh}`) {
    heatFrom = `${img.src}|${sw}x${sh}`;
    // The sand's own shape: its colour, anywhere in the box, with a soft edge.
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, x * 2, y * 2, w * 2, h * 2, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h);
    const px = d.data;
    let on = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      on[i] = Math.abs(px[j] - SAND[0]) < 14 && Math.abs(px[j + 1] - SAND[1]) < 14 &&
        Math.abs(px[j + 2] - SAND[2]) < 14 ? 1 : 0;
    }
    // CLOSED, so the things drawn ON the sand shimmer with it — the dune lines and
    // the cacti are what make the wobble visible, and on flat sand alone there is
    // nothing to see move. Grown by R and shrunk back by R: every gap narrower than
    // twice R is filled, and the outer edge against the river and the woods comes
    // back to where it was.
    const R = 5;
    const grow = (src, keep) => {
      const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
      for (let y2 = 0; y2 < h; y2++) for (let x2 = 0; x2 < w; x2++) {
        let v = keep;
        for (let d = -R; d <= R && v === keep; d++) {
          const xx = x2 + d;
          // Off the box counts as not-sand, so the shrink pulls the edge back there too.
          if (xx < 0 || xx >= w ? keep === 1 : src[y2 * w + xx] !== keep) v = 1 - keep;
        }
        tmp[y2 * w + x2] = v;
      }
      for (let y2 = 0; y2 < h; y2++) for (let x2 = 0; x2 < w; x2++) {
        let v = keep;
        for (let d = -R; d <= R && v === keep; d++) {
          const yy = y2 + d;
          if (yy < 0 || yy >= h ? keep === 1 : tmp[yy * w + x2] !== keep) v = 1 - keep;
        }
        out[y2 * w + x2] = v;
      }
      return out;
    };
    on = grow(grow(on, 0), 1);
    for (let i = 0; i < w * h; i++) {
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 0;
      px[i * 4 + 3] = on[i] ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
    heatMask = c;
    heat = document.createElement('canvas');
    heat.width = sw; heat.height = sh;
    heatSrc = null;
  }
  // THE DESERT CUT OUT ONCE, from the still map, whenever the still map changes —
  // not cut again every frame. Each frame only copies rows from it.
  if (heatSrc !== srcKey) {
    heatSrc = srcKey;
    const g = heat.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, sw, sh);
    g.drawImage(src, x * k + m.e, y * k + m.f, sw, sh, 0, 0, sw, sh);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(heatMask, 0, 0, sw, sh);
    g.globalCompositeOperation = 'source-over';
  }
  // Three device rows at a time: finer than the eye can count, far fewer copies.
  const STEP = 3;
  for (let r = 0; r < sh; r += STEP) {
    const Y = y + r / k;
    const dx = 0.55 * Math.sin(Y * 0.55 + t * 3.2) * (0.6 + 0.4 * Math.sin(Y * 0.07 - t * 0.9))
      + 0.25 * Math.sin(Y * 1.3 + t * 5.1);
    ctx.drawImage(heat, 0, r, sw, STEP, x + dx, Y, w, STEP / k);
  }
}

// --- a boat on the sea ------------------------------------------------------------
//
// A LITTLE SAILING BOAT GOING ROUND THE SEA, slowly, on a loop that stays on open
// water the whole way (checked against the map's water colour). It turns to face
// the way it goes, bobs a little, and trails a faint wake. Drawn under the fog, so
// it is only seen once the sea is.
const SEA = { x: 160, y: 282, rx: 110, ry: 26, seconds: 90 };

function drawBoat(ctx, t) {
  const a = (t / SEA.seconds) * Math.PI * 2;
  const x = SEA.x + Math.cos(a) * SEA.rx;
  const y = SEA.y + Math.sin(a) * SEA.ry + Math.sin(t * 1.7) * 0.4;
  const vx = -Math.sin(a) * SEA.rx, vy = Math.cos(a) * SEA.ry;
  const face = vx >= 0 ? 1 : -1;
  // Further away (higher up the map) is smaller.
  const s = 0.85 + 0.15 * Math.sin(a);
  ctx.save();
  // The wake: two faint lines opening out behind it.
  const back = Math.atan2(-vy, -vx);
  ctx.strokeStyle = 'rgba(255,252,240,0.45)';
  ctx.lineWidth = 0.7;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(back) * 3 * s, y + 1 + Math.sin(back) * 3 * s);
    ctx.lineTo(x + Math.cos(back + side * 0.35) * 13 * s, y + 1 + Math.sin(back + side * 0.35) * 13 * s * 0.6);
    ctx.stroke();
  }
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  ctx.rotate(Math.sin(t * 1.3) * 0.06);
  // Hull.
  ctx.fillStyle = '#6b4a28';
  ctx.strokeStyle = '#2a1d10';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.lineTo(5, -1);
  ctx.quadraticCurveTo(4, 2, 2, 2.2);
  ctx.lineTo(-3, 2.2);
  ctx.quadraticCurveTo(-4.6, 1.4, -5, -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mast and sail, filling a little with the wind.
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, -9);
  ctx.stroke();
  const fill = 1.2 + 0.4 * Math.sin(t * 0.8);
  ctx.fillStyle = '#f3ead6';
  ctx.beginPath();
  ctx.moveTo(0.4, -8.6);
  ctx.quadraticCurveTo(3 + fill, -5, 4.2, -1.8);
  ctx.lineTo(0.4, -1.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Serene Peak, pristine -------------------------------------------------------
//
// THE GRASS UP BY THE LAKE A LITTLE GREENER, so the high country reads as untouched.
// The map's grass is one flat colour, so it is found by that colour and nothing
// else is touched — not the trees, the houses or the lake — and the tint fades out
// towards the edge of the peak so there is no line where it stops.
const PEAK = { x: 875, y: 55, rx: 150, ry: 95 };
const GRASS = [131, 153, 84];
let pristine = null, pristineFrom = null;

// Baked into the still map by src/overview.js rather than drawn every frame.
export function drawPristine(ctx) {
  if (!ON.pristine) return;
  const img = art.overview;
  if (!img) return;
  if (pristineFrom !== img) {
    pristineFrom = img;
    const c = document.createElement('canvas');
    c.width = 960; c.height = 540;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 960, 540);
    const d = g.getImageData(0, 0, 960, 540);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const p = i / 4, x = p % 960, y = (p / 960) | 0;
      const e = ((x - PEAK.x) / PEAK.rx) ** 2 + ((y - PEAK.y) / PEAK.ry) ** 2;
      const grass = Math.abs(px[i] - GRASS[0]) < 12 && Math.abs(px[i + 1] - GRASS[1]) < 12 &&
        Math.abs(px[i + 2] - GRASS[2]) < 12;
      px[i] = 96; px[i + 1] = 178; px[i + 2] = 72;
      px[i + 3] = grass && e < 1 ? Math.round(255 * Math.min(1, (1 - e) * 2.5)) : 0;
    }
    g.putImageData(d, 0, 0);
    pristine = c;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(pristine, 0, 0, 960, 540);
  ctx.restore();
}

// Called from src/overview.js over the map and under the names and the fog.
// `unlocked` is how many stages the player has reached.
// `src` is the still map the towns stand on — see stillMap in src/overview.js.
export function drawLife(ctx, t, unlocked, src, srcKey = '') {
  if (ON.trees) drawTrees(ctx, t, unlocked, src);
  if (ON.banners) drawBanners(ctx, t, unlocked, src);
  if (ON.fire) drawFire(ctx, t, unlocked);
  if (ON.fountain) drawFountain(ctx, t, unlocked);
  if (ON.smoke) drawSmoke(ctx, t, unlocked);
  if (ON.holy) drawHoly(ctx, t, unlocked);
  if (ON.forest) drawForest(ctx, t, unlocked, src);
  if (ON.birds) drawBirds(ctx, t, unlocked);
  if (ON.tumbleweeds) drawTumbleweeds(ctx, t, unlocked);
  if (ON.heat) drawHeat(ctx, t, unlocked, src, srcKey);
  if (ON.boat) drawBoat(ctx, t);
}
