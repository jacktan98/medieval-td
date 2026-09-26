// AMBIENT MOTION ON THE WORLD MAP: the water moving, a bird or two, and a light
// running up the road to the flag. Nothing here is part of how the game works. It
// exists so that the map is not a photograph.
//
// THERE WERE CLOUD SHADOWS HERE and they are gone at the owner's word. They were
// four soft brown ellipses drifting across the land, and the honest reading of why
// they went is that a shadow on a map is a thing you have to be told about: on a
// drawing this dense it either reads as one more stain on the parchment or, when
// it is strong enough not to, as a smudge. The map had to be diffed frame against
// frame to prove they were working at all, which is its own verdict.
//
// --- HOW TO TURN IT OFF ------------------------------------------------------
//
// Either switch below turns its own effect off on the next frame, and turning both
// off leaves drawMotion doing nothing at all:
//
//   const SHIMMER = false;    the rivers and the waterfall running
//   const BIRDS   = false;    two birds crossing now and then
//   const PULSE   = false;    a light running up the road to the flag
//
// To remove it outright: delete this file, then delete the one import and the three
// calls (drawMotion, drawWater, drawPulse) in src/overview.js. Nothing else refers
// to it.
// RIVERS and FALLS in src/data/overview.js stop being read and can stay or go as
// you like.
//
// --- WHAT IT IS ALLOWED TO DO ------------------------------------------------
//
// THE FLAG HAS TO STAY THE FASTEST THING ON THE SCREEN. Before this file the flag
// was the ONLY thing on the map that moved, and most of why it reads as "tap here"
// is that fact. Ambient motion that competes with it does not make the map more
// alive, it makes the flag harder to find. So everything here is slow, low in
// contrast, and on a cycle long enough that you notice it on the second look
// rather than the first.

import { art } from './assets.js';
import { RIVERS, FALLS } from './data/overview.js';

const SHIMMER = true;
const BIRDS = true;
const PULSE = true;

// WHETHER THE WATER MOVES IN COUNTRY NOBODY HAS REACHED.
//
// Everything else here is drawn UNDER the fog, so it only happens where the player
// has been. The water is the one thing given a choice, because of where this map's
// water is: the waterfall at Serene Peak is the most obviously animated thing on
// the drawing and the road never goes near it, so under the fog it would be frozen
// for every player, for ever, no matter how far they got.
//
// It WAS drawn over the fog for that reason, and the owner has since ruled the
// other way: water nobody has reached yet stays still. Under the fog, the currents,
// the falls and the lake only move where the player has been — the waterfall comes
// alive when Serene Peak's country is lit — and the dark keeps them hidden until
// then. Set this true and the water runs through the fog everywhere again.
const WATER_THROUGH_FOG = false;

// --- the water ---------------------------------------------------------------

// HIGHLIGHT BANDS, DRIFTING ACROSS THE SURFACE, masked to the water so they cannot
// stray onto the bank. Light rather than dark: this is the sky caught on a moving
// surface, and a dark band reads as a stain instead.
//
// MASKED BY THE WATER'S OWN PIXELS, not clipped to its outline, and that took a
// look at a difference image to work out. Clipping to the path put bands straight
// across the temple, the houses and half of Dawnford — because the water is drawn
// as ONE shape whose outline goes round the islands as well, and under the
// non-zero fill rule an island counts as inside it. The artwork gets away with it
// because the grass is painted over the top afterwards; a clip does not.
//
// So the mask is built by colour instead: the muted map has the water in exactly
// one shade, so every pixel of it can be found and nothing else can be mistaken
// for it. That is not a workaround for the winding — it is a better answer than
// the outline ever was, because it also excludes everything DRAWN ON the water.
// Four bridges cross these rivers and the shimmer must not run over them.
const WATER_SHADE = [0xbc, 0xc2, 0xc2];   // see sepia() in tools/overview.mjs
const WATER_TOLERANCE = 14;               // the interiors are exact; this catches the antialiased rim

// WHICH WAY THE WATER GOES, in degrees, measured the way canvas measures them: 0 is
// east, 90 is south. This is the direction of TRAVEL, so the stripes lie across it.
//
// The owner set both. The river round Dawnford runs east to west, which is 180.
// Serene Peak runs SOUTH ELEVEN DEGREES WEST — a compass bearing, near enough
// straight down the falls with a lean off the vertical — which in this reckoning is
// 90 for south plus 11 towards the west: 101.
const RIVER_FLOW = 180;
const FALLS_FLOW = 101;

// Rivers drift ALONG the surface. Slowly: the whole point is that you see it in the
// corner of your eye.
const RIVER_BANDS = [
  { seconds: 29, phase: 0.00, of: 0.085, alpha: 0.30 },
  { seconds: 41, phase: 0.44, of: 0.130, alpha: 0.22 },
  { seconds: 23, phase: 0.77, of: 0.050, alpha: 0.18 }
];

// A waterfall FALLS, so its bands go much faster: falling water is the one thing on
// this map that is genuinely quick, and a slow waterfall looks like a glacier. It is
// a small part of the picture, so a livelier rate there does not compete with the
// flag.
// AND MUCH SLOWER THAN THEY WERE. The first rate was picked from what falling water
// does rather than from what a map of falling water should do — 1.9 to 3.9 seconds a
// band, three bands, which on a waterfall the size of a thumbnail is a flicker. Three
// times the period puts it at the pace of everything else here: something you catch
// rather than something that catches you.
const FALL_BANDS = [
  { seconds: 8.0, phase: 0.00, of: 0.14, alpha: 0.40 },
  { seconds: 11.5, phase: 0.35, of: 0.22, alpha: 0.30 },
  { seconds: 6.2, phase: 0.68, of: 0.09, alpha: 0.26 }
];

// How strongly the finished band layer is laid over the map. The alphas above are
// relative to each other WITHIN the layer; this is the one number to turn if the
// whole effect is too much or too little.
const SHIMMER_STRENGTH = 0.30;

// The bounds of a set of outlines. Coordinate pairs straight out of the path data:
// these are the artist's own paths, all absolute, all M/L/C.
const NUM = /-?\d+\.?\d*(?:[eE][-+]?\d+)?/g;
function bounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of list) {
    const n = (d.match(NUM) || []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) {
      if (n[i] < x0) x0 = n[i];
      if (n[i] > x1) x1 = n[i];
      if (n[i + 1] < y0) y0 = n[i + 1];
      if (n[i + 1] > y1) y1 = n[i + 1];
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

let maskFrom = null, fallsBox = null;
let river = null, falls = null;      // { mask, layer, rect } per group
let face = null;                     // the falling sheet alone, for drawFalls
let lake = null;                     // Serene Peak's lake alone, for drawCurrents
let riverFlow = null, lakeFlow = null;

const sheet = (w = 960, h = 540) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// The rectangle a mask actually occupies, in canvas px. Everything below is done
// inside it and nowhere else — this is the whole of why the shimmer is affordable.
// Over the full canvas the two passes cost 18ms a frame in a software renderer;
// the water covers about a quarter of the map, and the work drops with it.
function occupied(mask) {
  const d = mask.getContext('2d').getImageData(0, 0, 960, 540).data;
  let x0 = 960, y0 = 540, x1 = -1, y1 = -1;
  for (let y = 0; y < 540; y++) {
    for (let x = 0; x < 960; x++) {
      if (d[(y * 960 + x) * 4 + 3] <= 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// A group ready to draw: its mask cropped to its own rectangle, and a scratch
// layer exactly that size.
function group(mask) {
  const rect = occupied(mask);
  if (!rect) return null;
  const cropped = sheet(rect.w, rect.h);
  cropped.getContext('2d').drawImage(mask, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return { mask: cropped, layer: sheet(rect.w, rect.h), rect };
}

// TWO MASKS, because the two move differently and they touch. The falls run into
// the river at the bottom and the lake sits above them at the top, and both of
// those are water — so bands aimed at the falls landed on a still lake and pulled
// it downhill. The colour key says where water IS; the artist's own waterfall
// outlines say which of it is FALLING.
function buildMasks(img) {
  const wet = sheet();
  const g = wet.getContext('2d');
  g.drawImage(img, 0, 0, 960, 540);

  const px = g.getImageData(0, 0, 960, 540);
  const d = px.data;
  const [wr, wg, wb] = WATER_SHADE;
  for (let i = 0; i < d.length; i += 4) {
    const isWater = Math.abs(d[i] - wr) <= WATER_TOLERANCE &&
                    Math.abs(d[i + 1] - wg) <= WATER_TOLERANCE &&
                    Math.abs(d[i + 2] - wb) <= WATER_TOLERANCE;
    d[i] = d[i + 1] = d[i + 2] = 0;
    d[i + 3] = isWater ? 255 : 0;
  }
  g.putImageData(px, 0, 0);

  // The falls: their own outlines, kept only where the map agrees there is water.
  //
  // EXCEPT THE SHEET AND ITS SPLASH, which drawFalls animates as falling water
  // rather than as light drifting over a surface. The bands stay on the lake that
  // feeds it and on the fountain, and the river mask below still leaves the sheet
  // out, so nothing else moves on it.
  const cut = (list, into) => {
    const g2 = into.getContext('2d');
    g2.setTransform(0.5, 0, 0, 0.5, 0, 0);
    g2.fillStyle = '#000';
    for (const dd of list) g2.fill(new Path2D(dd));
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.globalCompositeOperation = 'destination-in';
    g2.drawImage(wet, 0, 0);
    return into;
  };
  const fallsMask = cut(FALLS, sheet());
  const faceMask = cut(FALLS.slice(FACE_PATH, FACE_PATH + 1), sheet());
  // The bands now only light the fountain: the lake and the rivers carry
  // currents instead — see drawCurrents.
  const bandMask = cut(FALLS.filter((_, i) => i > SPLASH_LAST), sheet());
  const lakeMask = cut(FALLS.slice(0, 1), sheet());

  // And the rivers: everything else that is wet.
  const riverMask = sheet();
  const rg = riverMask.getContext('2d');
  rg.drawImage(wet, 0, 0);
  rg.globalCompositeOperation = 'destination-out';
  rg.drawImage(fallsMask, 0, 0);

  river = group(riverMask);
  falls = group(bandMask);
  face = group(faceMask);
  lake = group(lakeMask);
  // Which way the water runs at every pixel. The rivers run to the sea off the
  // left-hand edge; the lake runs to the lip of the falls.
  // And it comes FROM the foot of the falls, which is what sends the arm round
  // the south of Dawnford downstream: measured from the sea alone, the top of that
  // arm is nearer the sea back past the falls, and ran uphill.
  const [fx, fy] = mix(FOOT[0], FOOT[1], 0.5);
  riverFlow = flowField(riverMask, (x, y) => x <= 1, (x, y) => Math.hypot(x - fx, y - fy) < 22);
  const lip = faceMask.getContext('2d').getImageData(0, 0, 960, 540).data;
  lakeFlow = flowField(lakeMask, (x, y) => {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < 960 && Y >= 0 && Y < 540 && lip[(Y * 960 + X) * 4 + 3] > 8) return true;
    }
    return false;
  });
  currents.river.length = 0;
  currents.lake.length = 0;
  // Where the falls land is not a bank: the foam there is the falls' own.
  const fm = faceMask.getContext('2d').getImageData(0, 0, 960, 540).data;
  const fallsAt = new Uint8Array(960 * 540);
  for (let i = 0; i < fallsAt.length; i++) fallsAt[i] = fm[i * 4 + 3] > 8 ? 1 : 0;
  shore = findShore(riverFlow, fallsAt);
  fallsBox = bounds(FALLS);
  maskFrom = img;
}

// One group of bands: each `of` the run across, travelling along it and wrapping a
// full band past either end so the surface is never bare.
// WATER FLOWS IN A DIRECTION, and the direction is the artist's to choose. This
// took an angle rather than a boolean the moment the owner said the falls run
// north-east to south-west: down and sideways at once is not a flag.
//
// The whole band pass is done in a ROTATED frame — turn the canvas so the flow is
// along +x, draw plain vertical stripes travelling right, turn it back. The stripes
// then run perpendicular to the flow whatever the angle, which is what a current
// looks like, and there is no trigonometry anywhere but the setup.
//
// The travel span is the box's DIAGONAL rather than its width, because a rotated
// box is wider than it was: a stripe has to start clear of one corner and finish
// clear of the opposite one or the surface goes bare at the ends of the cycle.
function bandsOn(g, t, list, box, degrees) {
  const cx = box.x0 + box.w / 2, cy = box.y0 + box.h / 2;
  const run = Math.hypot(box.w, box.h);

  g.save();
  g.translate(cx, cy);
  g.rotate(degrees * Math.PI / 180);

  for (const b of list) {
    const size = Math.max(6, run * b.of);
    const at = -run / 2 - size + (((t / b.seconds) + b.phase) % 1) * (run + size * 2);
    const grad = g.createLinearGradient(at - size / 2, 0, at + size / 2, 0);
    grad.addColorStop(0, 'rgba(255,252,238,0)');
    grad.addColorStop(0.5, `rgba(255,252,238,${b.alpha})`);
    grad.addColorStop(1, 'rgba(255,252,238,0)');
    g.fillStyle = grad;
    g.fillRect(at - size / 2, -run / 2, size, run);
  }
  g.restore();
}

// Lay one group's bands down, cut them to that group's mask, and put the result on
// the map. Done twice rather than once because the two masks are different and a
// band must never be cut to the wrong one.
//
// All of it happens inside the group's own rectangle: the layer is that size, the
// mask is cropped to it, and the transform is set so artboard coordinates still
// land where they should.
function pass(ctx, t, list, box, degrees, grp) {
  const g = grp.layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, grp.rect.w, grp.rect.h);
  // Artboard units, as the outlines are, shifted so the rectangle's corner is the
  // layer's origin.
  g.setTransform(0.5, 0, 0, 0.5, -grp.rect.x, -grp.rect.y);
  bandsOn(g, t, list, box, degrees);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(grp.mask, 0, 0);
  g.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.globalAlpha = SHIMMER_STRENGTH;
  ctx.drawImage(grp.layer, grp.rect.x, grp.rect.y);
  ctx.restore();
}

const WHOLE_BOARD = { x0: 0, y0: 0, w: 1920, h: 1080 };

function drawShimmer(ctx, t) {
  const img = art.overview;
  if (!img || (!RIVERS.length && !FALLS.length)) return;
  if (maskFrom !== img) buildMasks(img);

  // The rivers and the lake carry currents; the bands are left to the fountain.
  if (!CURRENTS && river) pass(ctx, t, RIVER_BANDS, WHOLE_BOARD, RIVER_FLOW, river);
  if (falls) pass(ctx, t, FALL_BANDS, fallsBox, FALLS_FLOW, falls);
  if (CURRENTS) drawCurrents(ctx, t);
  if (CURRENTS) drawShore(ctx, t);
  if (FALLING) drawFalls(ctx, t);
}

// --- the currents ------------------------------------------------------------
//
// THE LAKE AND THE RIVER BELOW THE FALLS, AS MOVING WATER, at the owner's ask.
// Bands of light drifting due west said "water" but not which way any of it went:
// the arm that runs south round Dawnford drifted sideways across its own banks.
//
// So each body of water gets a FLOW FIELD, worked out once from the map itself:
// the distance from every wet pixel to where the water leaves — the sea off the
// left-hand edge for the rivers, the lip of the falls for the lake — measured
// round the islands rather than through them. Downhill on that distance is the
// way the water runs, so a current follows every channel, splits round Dawnford
// and meets again, and nothing here needed a line drawn by hand.
//
// On that field ride CURRENT MARKS — short pale strokes, each drifting along the
// flow for a few seconds and fading in and out — faster where a channel is
// narrow and lazy where it opens into the sea. The lake's run slow in the middle
// and gather speed as they are drawn to the lip. And GLINTS: sunlight catching the
// surface for a moment here and there. Everything is cut to the water's own
// pixels, so no mark crosses a bank or a bridge.
const CURRENTS = true;
const RIVER_MARKS = 150, LAKE_MARKS = 22;
const RIVER_SPEED = 11, LAKE_SPEED = 2.0;          // canvas px a second, in open water
const GLINTS = 9;
const currents = { river: [], lake: [] };
let lastT = null;

// Distance round the water from `sink`, and distance to the nearest bank. Chamfer
// sweeps, repeated until nothing changes, so the distance goes round an island
// rather than through it.
//
// AT HALF RESOLUTION, a quarter of the pixels: a full-size field took most of a
// second to build the first time the map opened. The currents are a few px long
// and a direction every 2px is more than they can show. `R` is that factor, and
// `sink` and `source` are still asked in canvas px.
const R = 2;
function flowField(mask, sink, source = null) {
  const W = 960 / R, H = 540 / R, N = W * H;
  const small = sheet(W, H);
  const sg = small.getContext('2d', { willReadFrequently: true });
  sg.imageSmoothingEnabled = false;
  sg.drawImage(mask, 0, 0, W, H);
  const a = sg.getImageData(0, 0, W, H).data;
  const wet = new Uint8Array(N);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < N; i++) if (a[i * 4 + 3] > 8) {
    wet[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  // Only the water's own box is swept, with a margin for the banks.
  x0 = Math.max(0, x0 - 10); y0 = Math.max(0, y0 - 10);
  x1 = Math.min(W - 1, x1 + 10); y1 = Math.min(H - 1, y1 + 10);
  const INF = 1e9;
  const dist = new Float32Array(N).fill(INF);
  const from = new Float32Array(N).fill(INF);
  const bank = new Float32Array(N).fill(INF);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (!wet[i]) bank[i] = 0;
    else {
      if (sink(x * R, y * R)) dist[i] = 0;
      if (source && source(x * R, y * R)) from[i] = 0;
    }
  }
  // UNDER THE BRIDGES. A bridge is drawn over the river, so its deck is not water
  // and the channel reads as cut in two — the water above it could find no way to
  // the sea. So the distance is let across dry ground too, but at DRY times the
  // price: a bridge's width is cheap to cross, an island costs far more than
  // going round it, and marks only ever travel on the wet pixels anyway.
  const DRY = 9;
  const cost = i => (wet[i] ? 1 : DRY);
  const sweep = (f, weighted) => {
    let changed = false;
    const pass = (ys, ye, dy, xs, xe, dx) => {
      for (let y = ys; y !== ye; y += dy) for (let x = xs; x !== xe; x += dx) {
        const i = y * W + x;
        const c = weighted ? cost(i) : 1;
        let v = f[i];
        const px = x - dx, py = y - dy;
        if (px >= x0 && px <= x1) { const u = f[i - dx] + c; if (u < v) v = u; }
        if (py >= y0 && py <= y1) {
          const u = f[i - dy * W] + c; if (u < v) v = u;
          if (px >= x0 && px <= x1) { const w = f[i - dy * W - dx] + c * Math.SQRT2; if (w < v) v = w; }
          const qx = x + dx;
          if (qx >= x0 && qx <= x1) { const w = f[i - dy * W + dx] + c * Math.SQRT2; if (w < v) v = w; }
        }
        if (v < f[i]) { f[i] = v; changed = true; }
      }
    };
    pass(y0, y1 + 1, 1, x0, x1 + 1, 1);
    pass(y1, y0 - 1, -1, x1, x0 - 1, -1);
    return changed;
  };
  for (let k = 0; k < 60 && sweep(dist, true); k++);
  if (source) {
    for (let k = 0; k < 60 && sweep(from, true); k++);
    // BOTH ENDS AT ONCE: the share of the way from the source to the sea. It is 1
    // at the falls and 0 at the sea, and falls on every branch between them — so
    // water leaves the falls down both arms and meets the sea from both.
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (dist[i] < INF && from[i] < INF) dist[i] = 1000 * dist[i] / (dist[i] + from[i] + 1e-3);
    }
  } else {
    for (let i = 0; i < N; i++) if (dist[i] < INF) dist[i] *= R;
  }
  sweep(bank, false);
  for (let i = 0; i < N; i++) if (bank[i] < INF) bank[i] *= R;
  const cells = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (wet[i] && dist[i] < INF) cells.push(i);
  }
  return { wet, dist, bank, cells, INF, W, H };
}

// The way the water runs at (x, y): down the distance, a few px either side so a
// single pixel's rounding does not turn a mark round. Null off the water.
function flowAt(f, x, y) {
  const W = f.W, xi = Math.round(x / R), yi = Math.round(y / R);
  if (xi < 2 || yi < 2 || xi > W - 3 || yi > f.H - 3) return null;
  const i = yi * W + xi;
  if (!f.wet[i] || f.dist[i] >= f.INF) return null;
  const at = (dx, dy) => { const d = f.dist[i + dy * W + dx]; return d >= f.INF ? f.dist[i] : d; };
  const gx = at(-2, 0) - at(2, 0), gy = at(0, -2) - at(0, 2);
  const m = Math.hypot(gx, gy);
  if (m < 1e-3) return null;
  return [gx / m, gy / m, f.bank[i], f.dist[i]];
}

// A new mark somewhere on the water, favouring the channels over the open sea so
// the sea does not take every mark there is.
function spawn(f) {
  for (let tries = 0; tries < 12; tries++) {
    const i = f.cells[(Math.random() * f.cells.length) | 0];
    const b = f.bank[i];
    if (b < 1.5) continue;
    if (Math.random() > 1 / (1 + b / 14)) continue;
    const life = 2.6 + Math.random() * 2.6;
    return { x: (i % f.W) * R, y: ((i / f.W) | 0) * R, age: Math.random() * life * 0.5, life,
             len: 5 + Math.random() * 6, a: 0.29 + Math.random() * 0.26, glint: false };
  }
  return null;
}

function step(list, f, want, speed, dt, lakeRun) {
  while (list.length < want) { const m = spawn(f); if (!m) break; list.push(m); }
  for (let k = list.length - 1; k >= 0; k--) {
    const m = list[k];
    m.age += dt;
    const v = flowAt(f, m.x, m.y);
    if (!v || m.age > m.life) { list.splice(k, 1); continue; }
    const [dx, dy, bank, dist] = v;
    // Narrow water runs fast and wide water lazily; the lake quickens to the lip.
    let s = speed * Math.max(0.35, Math.min(1.5, 1.6 - bank / 22));
    // A gentle pull towards the lip, not a rush — the owner found the first one too quick.
    if (lakeRun) s = speed * (1 + 1.8 * Math.exp(-dist / 30));
    m.vx = dx; m.vy = dy; m.s = s;
    m.x += dx * s * dt;
    m.y += dy * s * dt;
  }
}

function paintMarks(g, list) {
  g.lineCap = 'round';
  for (const m of list) {
    if (m.vx === undefined) continue;
    const k = m.age / m.life;
    const a = m.a * Math.sin(Math.PI * Math.min(1, k));
    if (a <= 0.01) continue;
    const len = m.len * (0.8 + m.s / 14);
    // A shallow crescent across the flow rather than a straight dash, which is how
    // a map draws moving water.
    const nx = -m.vy, ny = m.vx;
    const x1 = m.x - m.vx * len, y1 = m.y - m.vy * len;
    g.strokeStyle = `rgba(255,252,240,${a})`;
    g.lineWidth = 1.05;
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + m.x) / 2 + nx * 1.4, (y1 + m.y) / 2 + ny * 1.4, m.x, m.y);
    g.stroke();
  }
}

// Sunlight caught on the water: a small four-pointed sparkle that swells and goes.
const mapGlints = [];
function paintGlints(g, f, dt, t, glints = mapGlints, want = GLINTS) {
  // A bounded number of tries: a narrow board river may have few cells that far
  // from a bank, and an unbounded search for one would hang the frame.
  for (let tries = 0; glints.length < want && tries < 60; tries++) {
    const i = f.cells[(Math.random() * f.cells.length) | 0];
    if (f.bank[i] < 3) continue;
    glints.push({ x: (i % f.W) * R, y: ((i / f.W) | 0) * R, age: -Math.random() * 3, life: 0.7 + Math.random() * 0.5 });
  }
  g.fillStyle = 'rgba(255,253,244,0.78)';
  for (let k = glints.length - 1; k >= 0; k--) {
    const s = glints[k];
    s.age += dt;
    if (s.age > s.life) { glints.splice(k, 1); continue; }
    if (s.age < 0) continue;
    const r = 2.2 * Math.sin(Math.PI * s.age / s.life);
    g.globalAlpha = Math.sin(Math.PI * s.age / s.life);
    g.beginPath();
    g.moveTo(s.x - r, s.y); g.lineTo(s.x - r * 0.18, s.y - r * 0.18);
    g.lineTo(s.x, s.y - r * 0.8); g.lineTo(s.x + r * 0.18, s.y - r * 0.18);
    g.lineTo(s.x + r, s.y); g.lineTo(s.x + r * 0.18, s.y + r * 0.18);
    g.lineTo(s.x, s.y + r * 0.8); g.lineTo(s.x - r * 0.18, s.y + r * 0.18);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
}

// Rings on the lake now and then, as if something had broken the surface.
const rings = [];
function paintRings(g, f, dt) {
  if (rings.length < 2 && Math.random() < dt / 1.6) {
    const i = f.cells[(Math.random() * f.cells.length) | 0];
    if (f.bank[i] > 5 && f.dist[i] > 30) rings.push({ x: (i % f.W) * R, y: ((i / f.W) | 0) * R, age: 0, life: 2.4 });
  }
  g.lineWidth = 0.7;
  for (let k = rings.length - 1; k >= 0; k--) {
    const r = rings[k];
    r.age += dt;
    if (r.age > r.life) { rings.splice(k, 1); continue; }
    const p = r.age / r.life;
    for (const lag of [0, 0.25]) {
      const q = p - lag;
      if (q <= 0) continue;
      g.strokeStyle = `rgba(255,252,240,${0.42 * (1 - q)})`;
      g.beginPath();
      g.ellipse(r.x, r.y, 2 + q * 11, (2 + q * 11) * 0.45, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

function layerFor(grp, paint) {
  const g = grp.layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, grp.rect.w, grp.rect.h);
  g.setTransform(1, 0, 0, 1, -grp.rect.x, -grp.rect.y);
  paint(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(grp.mask, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return grp.layer;
}

function drawCurrents(ctx, t) {
  if (!riverFlow || !river) return;
  const dt = lastT === null ? 0 : Math.max(0, Math.min(0.1, t - lastT));
  lastT = t;

  step(currents.river, riverFlow, RIVER_MARKS, RIVER_SPEED, dt, false);
  ctx.drawImage(layerFor(river, g => {
    paintMarks(g, currents.river);
    paintGlints(g, riverFlow, dt, t);
  }), river.rect.x, river.rect.y);

  if (lake && lakeFlow) {
    step(currents.lake, lakeFlow, LAKE_MARKS, LAKE_SPEED, dt, true);
    ctx.drawImage(layerFor(lake, g => {
      paintMarks(g, currents.lake);
      paintRings(g, lakeFlow, dt);
    }), lake.rect.x, lake.rect.y);
  }
}

// --- the waterfall -----------------------------------------------------------
//
// SERENE PEAK'S FALLS, AS FALLING WATER, at the owner's ask: "more realistic".
// Light drifting down the sheet read as a surface, not as water going over an
// edge. Four things make a waterfall read as one, and this draws all four:
//
//   STREAKS down the sheet, many thin lanes of them, each ACCELERATING — slow
//   where the water tips over the lip and fast at the bottom, stretching as they
//   go, because that is what gravity does and a constant speed looks like a
//   conveyor belt.
//   THE LIP, a bright rim where the water turns over the edge, flickering along
//   its length.
//   SPRAY at the foot, white specks thrown up and out of the splash the artist
//   drew, and a soft MIST breathing over it.
//   RIPPLES spreading across the pool below.
//
// All in canvas px. The sheet is the artist's own outline (FALLS[FACE_PATH]) and
// the streaks are cut to it; the corners below only aim the lanes, which lean
// with the water — south a little west, as FALLS_FLOW says.
const FALLING = true;
const FACE_PATH = 1;          // FALLS: the lake, the sheet, then the splash; then the fountain
const SPLASH_LAST = 2;
const LIP = [[666, 111], [714, 119]];      // where the water goes over, left to right
const FOOT = [[637, 177], [692, 186]];     // where it lands
const LANES = 34;
const STREAK_TINT = '255,251,240';
const SHADE_TINT = '84,94,96';
const FOAM_TINT = '250,247,238';

// A fixed scatter, so the lanes and the specks are uneven but the same on every
// frame and every visit.
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// The lane at `u` across the sheet, at `v` down it: a gentle curve rather than a
// ruler line, bowed out at the top where the water rolls over the lip.
function laneAt(u, v) {
  const top = mix(LIP[0], LIP[1], u), foot = mix(FOOT[0], FOOT[1], u);
  const bow = 5 * Math.sin(Math.PI * v) * (1 - v);
  return [top[0] + (foot[0] - top[0]) * v - bow * 0.6, top[1] + (foot[1] - top[1]) * v];
}

function drawFalls(ctx, t) {
  if (!face) return;
  const g = face.layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, face.rect.w, face.rect.h);
  g.setTransform(1, 0, 0, 1, -face.rect.x, -face.rect.y);
  g.lineCap = 'round';

  // THE STREAKS. Each lane has its own pace and a few streaks on it at once.
  for (let i = 0; i < LANES; i++) {
    const u = (i + 0.5 + (hash(i) - 0.5) * 0.7) / LANES;
    const rate = 0.55 + hash(i + 40) * 0.35;          // falls per second
    const dark = hash(i + 80) < 0.28;                 // a few lanes of shade, for depth
    const each = dark ? 1 : 4;
    for (let k = 0; k < each; k++) {
      const p = ((t * rate + k / each + hash(i * 7 + k)) % 1);
      const v = Math.pow(p, 1.5);                     // accelerating
      const len = 0.06 + 0.22 * p;                    // stretching as it speeds up
      const v0 = Math.max(0, v - len);
      const [x0, y0] = laneAt(u, v0), [x1, y1] = laneAt(u, Math.min(1, v));
      const fade = Math.min(1, p / 0.10) * Math.min(1, (1 - p) / 0.06);
      const grad = g.createLinearGradient(x0, y0, x1, y1);
      const tint = dark ? SHADE_TINT : STREAK_TINT;
      const a = (dark ? 0.32 : 0.62 + hash(i + 3 * k) * 0.33) * fade;
      grad.addColorStop(0, `rgba(${tint},0)`);
      grad.addColorStop(1, `rgba(${tint},${a})`);
      g.strokeStyle = grad;
      g.lineWidth = dark ? 1.5 : 0.6 + hash(i + 11 * k) * 0.6;
      g.beginPath();
      const [xm, ym] = laneAt(u, (v0 + Math.min(1, v)) / 2);
      g.moveTo(x0, y0);
      g.quadraticCurveTo(xm, ym, x1, y1);
      g.stroke();
    }
  }

  // THE LIP: a bright rim just under the edge, its brightness running along it.
  // Stroked as one line with a gradient along it, so it reads as a rim rather
  // than as a row of beads.
  const [lx0, ly0] = laneAt(0, 0.03), [lx1, ly1] = laneAt(1, 0.03);
  const rim = g.createLinearGradient(lx0, ly0, lx1, ly1);
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const shine = 0.45 + 0.35 * Math.sin(t * 2.3 + u * 9) * Math.sin(t * 1.1 + u * 4.3);
    rim.addColorStop(u, `rgba(${STREAK_TINT},${Math.max(0, shine)})`);
  }
  g.strokeStyle = rim;
  g.lineWidth = 2.2;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const [x, y] = laneAt(i / 24, 0.03);
    if (i) g.lineTo(x, y + 1.2); else g.moveTo(x, y + 1.2);
  }
  g.stroke();

  // THE CURTAIN'S FOOT: white water where the sheet hits the pool, churning —
  // three bands of foam across the bottom of the sheet, their brightness rolling
  // along it at different speeds.
  for (let i = 0; i <= 36; i++) {
    const u = i / 36;
    const churn = 0.5 + 0.3 * Math.sin(t * 5.1 + u * 13) + 0.25 * Math.sin(t * 3.7 - u * 7);
    for (const [v, r, a] of [[0.96, 3.8, 0.75], [0.89, 3.0, 0.5], [0.8, 2.2, 0.28]]) {
      const [x, y] = laneAt(u, v);
      g.fillStyle = `rgba(${FOAM_TINT},${Math.max(0, Math.min(1, churn * a))})`;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(face.mask, 0, 0);
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(face.layer, face.rect.x, face.rect.y);

  ctx.save();
  const [cx, cy] = mix(FOOT[0], FOOT[1], 0.5);
  const span = Math.hypot(FOOT[1][0] - FOOT[0][0], FOOT[1][1] - FOOT[0][1]);

  // RIPPLES on the pool, under the rest: rings spreading from the foot and fading,
  // flattened to the map's own foreshortening, each a little off-centre and out of
  // step with the last so they read as rings on moving water, not a target.
  for (let k = 0; k < 6; k++) {
    const p = ((t / 3.2) + k / 6) % 1;
    const off = (hash(k + 700) - 0.5) * span * 0.5;
    const rx = span * 0.35 + p * 42, ry = rx * 0.3;
    ctx.strokeStyle = `rgba(${FOAM_TINT},${0.55 * (1 - p) * Math.min(1, p / 0.12)})`;
    ctx.lineWidth = 1.1 - 0.5 * p;
    ctx.beginPath();
    ctx.ellipse(cx + off, cy + 7 + p * 7, rx, ry, 0, 0.04 * Math.PI, 0.96 * Math.PI);
    ctx.stroke();
  }

  // THE BOIL: foam heaving up in the pool just past the foot — soft white blobs
  // that swell, drift away from the falls and melt, all along the landing line.
  for (let k = 0; k < 26; k++) {
    const life = 1.4 + hash(k + 800) * 1.2;
    const p = ((t / life) + hash(k + 810)) % 1;
    const [bx, by] = mix(FOOT[0], FOOT[1], hash(k + 820));
    const x = bx + (hash(k + 830) - 0.5) * 6 + p * (hash(k + 840) - 0.3) * 10;
    const y = by + 2 + p * 7;
    const r = 2 + 4.5 * Math.sin(Math.PI * Math.min(1, p * 1.3));
    ctx.globalAlpha = 0.7 * (1 - p) * Math.min(1, p / 0.1);
    ctx.drawImage(soft(FOAM_TINT), x - r, y - r * 0.7, r * 2, r * 1.4);
  }
  ctx.globalAlpha = 1;

  // MIST: soft clouds rising off the foot, swelling as they climb and drift with
  // the air, thick enough to veil the bottom of the sheet.
  for (let k = 0; k < 9; k++) {
    const life = 3.4 + hash(k + 90) * 2.6;
    const p = ((t / life) + hash(k + 91)) % 1;
    const [mx, my] = mix(FOOT[0], FOOT[1], hash(k + 92));
    const x = mx + (hash(k + 93) - 0.5) * 12 + p * 10 * Math.sin(t * 0.3 + k);
    const y = my - 2 - p * 26;
    const r = 10 + 20 * p;
    ctx.globalAlpha = 0.34 * Math.sin(Math.PI * p);
    ctx.drawImage(soft(FOAM_TINT), x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  // SPRAY: specks and droplets thrown up and out of the splash, arcing and falling
  // back — a few big ones among many fine ones.
  for (let k = 0; k < 90; k++) {
    const life = 0.7 + hash(k + 200) * 0.8;
    const p = ((t / life) + hash(k + 300)) % 1;
    const [sx, sy] = mix(FOOT[0], FOOT[1], hash(k + 400));
    const big = hash(k + 450) < 0.15;
    const up = (big ? 8 : 12) + hash(k + 500) * (big ? 10 : 22);
    const side = (hash(k + 600) - 0.5) * 26;
    const e = 1 - (1 - p) * (1 - p);                  // quick out, slowing
    const x = sx + side * e, y = sy - up * e + 14 * p * p;
    const r = big ? 1.1 + 0.8 * p : 0.5 + 0.9 * p;
    // Stamped rather than traced: at this size a soft dot and a circle look the
    // same, and ninety paths a frame were most of what the spray cost.
    ctx.globalAlpha = 0.85 * (1 - p);
    ctx.drawImage(dot(), x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- spray on the banks ---------------------------------------------------------
//
// WHERE THE RIVER RUNS INTO LAND, it ripples back off the bank, and here and there
// throws up spray: small bursts of white off
// the outside of every bend, and against the rocks and islands in its way. Found
// once from the flow field — a bank cell whose current points into land that goes
// on being land for a good way (so a bridge's thin deck does not count) — and
// spaced out along the banks. Each spot bursts now and then on its own beat.
const SHORE_GAP = 13;         // canvas px between spray spots
let shore = [];

// `opts` loosens it for a board's river, which is far narrower than the map's:
// `wet` is how much water there must be round a spot and `agree` how squarely the
// current must run into the land.
function findShore(f, fallsMask, opts = {}) {
  const minWet = opts.wet ?? 30, agree = opts.agree ?? 0.55, far = opts.far ?? 30;
  const out = [];
  const dry = (x, y) => {
    const xi = Math.round(x / R), yi = Math.round(y / R);
    if (xi < 0 || yi < 0 || xi >= f.W || yi >= f.H) return false;
    return !f.wet[yi * f.W + xi];
  };
  for (const i of f.cells) {
    if (f.bank[i] > R * 1.5) continue;
    const x = (i % f.W) * R, y = ((i / f.W) | 0) * R;
    if (x < 8 || x > 952 || y < 8 || y > 532) continue;
    const v = flowAt(f, x, y);
    if (!v) continue;
    const [dx, dy] = v;
    // Real river, not a speck of water-coloured paint on a wall: plenty of water
    // round it.
    const xi = i % f.W, yi = (i / f.W) | 0;
    let wetAround = 0;
    for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) {
      const X = xi + ox, Y = yi + oy;
      if (X >= 0 && Y >= 0 && X < f.W && Y < f.H && f.wet[Y * f.W + X]) wetAround++;
    }
    if (wetAround < minWet) continue;
    // The current running INTO the bank, not along it: the way to the land (down
    // the distance-to-bank) and the way the water goes have to agree.
    const bk = (ox, oy) => { const X = xi + ox, Y = yi + oy; return X >= 0 && Y >= 0 && X < f.W && Y < f.H ? f.bank[Y * f.W + X] : 0; };
    let lx = bk(-2, 0) - bk(2, 0), ly = bk(0, -2) - bk(0, 2);
    const lm = Math.hypot(lx, ly);
    if (lm < 1e-3 || (dx * lx + dy * ly) / lm < agree) continue;
    // Land straight ahead, and still land well beyond it.
    if (!dry(x + dx * 4, y + dy * 4) || !dry(x + dx * 16, y + dy * 16) || !dry(x + dx * far, y + dy * far)) continue;
    if (fallsMask && fallsMask[Math.round(y) * 960 + Math.round(x)]) continue;
    if (out.some(p => Math.abs(p.x - x) < SHORE_GAP && Math.abs(p.y - y) < SHORE_GAP)) continue;
    out.push({ x, y, dx, dy, n: out.length });
  }
  return out;
}

// `k` sizes it and `a` strengthens it: a board's water is far paler than the map's
// muted blue, and foam drawn at the map's size and strength all but vanished on it.
function drawShore(ctx, t, list = shore, spray = 0.4, k = 1, a = 1, ripples = true) {
  if (!list.length) return;
  ctx.save();
  for (const s of list) {
    const ang = Math.atan2(s.dy, s.dx);
    // RIPPLES OFF THE BANK, at every spot: small arcs spreading out from the land
    // back into the river, fading as they go.
    const rp = ((t / (2.6 + hash(s.n + 940) * 1.6)) + hash(s.n + 950)) % 1;
    for (const lag of ripples ? [0, 0.35] : []) {
      const q = rp - lag;
      if (q <= 0) continue;
      const rr = (2 + q * 9) * k;
      ctx.strokeStyle = `rgba(${FOAM_TINT},${Math.min(1, 0.42 * a) * (1 - q)})`;
      ctx.lineWidth = 0.7 * k;
      ctx.beginPath();
      ctx.ellipse(s.x + s.dx * 3, s.y + s.dy * 3, rr, rr * 0.55, 0, ang + Math.PI - 1, ang + Math.PI + 1);
      ctx.stroke();
    }
    // SPRAY, at four spots in ten (or `spray` of them): the rest only ripple. A spot
    // that says for itself whether it breaks (a board's shore) is taken at its word.
    if (s.spray === false || (s.spray === undefined && hash(s.n + 960) >= spray)) continue;
    const cycle = 2.2 + hash(s.n + 900) * 3.5;
    const p = ((t / cycle) + hash(s.n + 910)) % 1;
    const BURST = 0.3;                                // of the cycle
    if (p > BURST) continue;
    const q = p / BURST;
    // A crescent of foam against the bank.
    ctx.strokeStyle = `rgba(${FOAM_TINT},${Math.min(1, 0.7 * a) * (1 - q)})`;
    ctx.lineWidth = k;
    ctx.beginPath();
    ctx.arc(s.x, s.y, (2 + q * 3) * k, ang - 1.1, ang + 1.1);
    ctx.stroke();
    // And a few specks thrown up and back off it.
    for (let j = 0; j < 4; j++) {
      const spread = (hash(s.n * 4 + j + 920) - 0.5) * 2.2;
      const dir = ang + Math.PI + spread;
      const d = (2 + q * (4 + hash(s.n * 4 + j + 930) * 4)) * k;
      const x = s.x + s.dx * 2 + Math.cos(dir) * d;
      const y = s.y + s.dy * 2 + Math.sin(dir) * d * 0.6 - Math.sin(Math.PI * q) * 3.5 * k;
      const r = (0.55 + 0.35 * q) * k;
      ctx.globalAlpha = Math.min(1, 0.85 * a) * (1 - q);
      ctx.drawImage(dot(), x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// Spots all along a board river's banks, `gap` apart, facing the land, that `keep`
// accepts. Away from the canvas edge, and only where there is real water behind them.
function bankSpots(f, gap, keep) {
  const out = [];
  for (const i of f.cells) {
    if (f.bank[i] > R * 1.5) continue;
    const x = (i % f.W) * R, y = ((i / f.W) | 0) * R;
    if (x < 10 || x > 950 || y < 10 || y > 530) continue;
    const xi = i % f.W, yi = (i / f.W) | 0;
    const bk = (ox, oy) => { const X = xi + ox, Y = yi + oy; return X >= 0 && Y >= 0 && X < f.W && Y < f.H ? f.bank[Y * f.W + X] : 0; };
    // Towards the land: down the distance to the bank.
    const lx = bk(-3, 0) - bk(3, 0), ly = bk(0, -3) - bk(0, 3), lm = Math.hypot(lx, ly);
    if (lm < 1e-3) continue;
    // Water behind it, a few px out from the bank.
    const back = (yi - Math.round(ly / lm * 4)) * f.W + (xi - Math.round(lx / lm * 4));
    if (!f.wet[back]) continue;
    const dx = lx / lm, dy = ly / lm;
    if (!keep(x, y, dx, dy)) continue;
    if (out.some(p => Math.hypot(p.x - x, p.y - y) < gap)) continue;
    out.push({ x, y, dx, dy, spray: true });
  }
  return out;
}

// A small hard-edged droplet, drawn once and stamped.
let dotSheet = null;
function dot() {
  if (!dotSheet) {
    dotSheet = document.createElement('canvas');
    dotSheet.width = dotSheet.height = 16;
    const g = dotSheet.getContext('2d');
    const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, `rgba(${FOAM_TINT},1)`);
    grad.addColorStop(0.6, `rgba(${FOAM_TINT},1)`);
    grad.addColorStop(1, `rgba(${FOAM_TINT},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 16);
  }
  return dotSheet;
}

// A soft round puff, drawn once per colour and stamped.
const softs = new Map();
function soft(rgb) {
  let c = softs.get(rgb);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    softs.set(rgb, c);
  }
  return c;
}

// The one thing src/overview.js calls. `t` is wall-clock seconds — this is screen
// atmosphere, so it is not stepped by the game clock and the fast-forward
// multiplier has no business touching it.
// --- birds -------------------------------------------------------------------

// TWO BIRDS, NOT A FLOCK, and not always. A pair drifts across every so often on a
// shallow arc, fades in, fades out, and is gone — the map is a drawing of a country
// rather than a wildlife film, and a permanent bird is a smudge you stop seeing.
//
// They are the only thing here drawn as a SHAPE rather than as light on something
// that is already there, which is why they are small and few. Two strokes each.
const BIRDS_AT = [
  { seconds: 46, phase: 0.00, from: [-60, 120], to: [1020, 250], rise: 70, size: 5.0 },
  { seconds: 46, phase: 0.06, from: [-60, 150], to: [1020, 285], rise: 62, size: 4.2 },
  { seconds: 67, phase: 0.52, from: [1020, 430], to: [-60, 330], rise: 54, size: 4.6 }
];

// Seen for the middle of the cycle only, easing in and out at the ends, so they
// arrive and leave rather than blinking.
const BIRD_SHOWS = 0.42;

function drawBirds(ctx, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(46,34,18,0.62)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const b of BIRDS_AT) {
    const at = ((t / b.seconds) + b.phase) % 1;
    if (at > BIRD_SHOWS) continue;
    const k = at / BIRD_SHOWS;                       // 0..1 across the crossing
    const fade = Math.sin(k * Math.PI);              // in and out at the ends
    if (fade < 0.02) continue;

    const x = b.from[0] + (b.to[0] - b.from[0]) * k;
    // A shallow arc rather than a straight line: a bird crossing a valley rises
    // and settles, and a ruler-straight bird reads as a UI element.
    const y = b.from[1] + (b.to[1] - b.from[1]) * k - Math.sin(k * Math.PI) * b.rise;

    // The wingbeat. Slow enough to see, and it is the fastest thing here after the
    // flag — which is allowed, because a bird is 10px across and the flag is not.
    const beat = Math.sin(t * 5.2 + b.phase * 20);
    const drop = b.size * 0.42 * beat;

    ctx.globalAlpha = fade * 0.9;
    ctx.lineWidth = Math.max(1, b.size * 0.24);
    ctx.beginPath();
    ctx.moveTo(x - b.size, y - drop);
    ctx.quadraticCurveTo(x - b.size * 0.4, y + drop * 0.6, x, y);
    ctx.quadraticCurveTo(x + b.size * 0.4, y + drop * 0.6, x + b.size, y - drop);
    ctx.stroke();
  }
  ctx.restore();
}

// --- the road pulse ----------------------------------------------------------

// A LIGHT RUNS UP THE ROAD TO THE FLAG, every few seconds, along the last leg only.
//
// This is the one effect here that is not purely decorative: the flag is where the
// player is meant to go, and a light travelling towards it says so in a way a still
// dotted line cannot. It runs the way the army walked, which is also the way the
// eye should travel — from the country behind to the stage in front.
//
// Only the LAST leg. Lighting the whole road would be a Christmas tree, and the
// stages behind the frontier are finished business.
const PULSE_SECONDS = 4.6;
const PULSE_WIDTH = 46;        // canvas px of road lit at once
const PULSE_ALPHA = 0.75;
const PULSE_DOT = 3.4;
const PULSE_GAP = 10;          // DOT_GAP in src/overview.js

// Walk the leg the way drawTrail walks it, so the pulse lands on the dots that are
// actually drawn rather than on a second idea of where they are.
export function drawPulse(ctx, t, leg) {
  if (!PULSE || !leg || leg.length < 2) return;

  let total = 0;
  for (let i = 1; i < leg.length; i++) total += Math.hypot(leg[i][0] - leg[i - 1][0], leg[i][1] - leg[i - 1][1]);
  if (total <= 0) return;

  // The head of the pulse runs from before the start to past the end, so it enters
  // and leaves rather than appearing at the first dot.
  const head = -PULSE_WIDTH + ((t / PULSE_SECONDS) % 1) * (total + PULSE_WIDTH * 2);

  ctx.save();
  ctx.fillStyle = '#FFF3CE';
  let walked = 0, next = PULSE_GAP;
  for (let i = 1; i < leg.length; i++) {
    const [x0, y0] = leg[i - 1], [x1, y1] = leg[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    while (next <= walked + seg) {
      const d = next - head;
      // Brightest at the head and trailing off behind it, nothing in front: a
      // pulse with a tail travels, a symmetrical one just throbs.
      if (d <= 0 && d > -PULSE_WIDTH) {
        const k = 1 + d / PULSE_WIDTH;               // 1 at the head, 0 at the tail
        const f = (next - walked) / seg;
        ctx.globalAlpha = k * k * PULSE_ALPHA;
        ctx.beginPath();
        ctx.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, PULSE_DOT, 0, Math.PI * 2);
        ctx.fill();
      }
      next += PULSE_GAP;
    }
    walked += seg;
  }
  ctx.restore();
}

// Called from src/overview.js UNDER the fog. This is empty while the water is sent
// through the fog, which it is — it stays because WATER_THROUGH_FOG is a real
// switch and this is where the water goes when it is turned off. The cloud shadows
// used to be its other occupant.
export function drawMotion(ctx, t, base = null, baseKey = '') {
  if (SHIMMER && base) drawMapSeams(ctx, t, base, baseKey);
  if (SHIMMER && !WATER_THROUGH_FOG) drawShimmer(ctx, t);
}

// --- a board's fountain -----------------------------------------------------------
//
// STAGE 7'S FOUNTAIN, RUNNING, in the world map's style at the owner's word. Its
// water is one colour (`colour` on the level's `fountain`), drawn as shapes each
// ringed in black, so the shapes come apart by colour alone: each one TALLER than
// it is wide is water falling — a jet arching over, a sheet running down a tier —
// and each one wider than tall is a pool. On the falling water the world map's
// current marks ride down to where each shape ends; on the pools its glints come
// and go; and where a jet lands in a pool, rings spread and spray jumps.
//
// The fountain is part of the board's front sheet, drawn at its own depth among the
// figures, so this is drawn straight after it (see render.js) and on the board's
// clock: it holds still on a paused board. Built once per drawing.
const fountains = new Map();
export function drawFountain(ctx, img, spec, t) {
  if (!img || !spec) return;
  let f = fountains.get(img);
  if (f === undefined) {
    f = null;
    try { f = buildFountain(img, spec); } catch { /* no canvas: still water */ }
    fountains.set(img, f);
  }
  if (!f) return;
  const dt = f.lastT === null ? 0 : Math.max(0, Math.min(0.1, t - f.lastT));
  f.lastT = t;
  // MARKS ON THE FALLING WATER, short and bright — the jets are narrow and pale —
  // spread evenly over every jet rather than gathered where the water is widest,
  // and quickening as they fall.
  const want = spec.marks ?? 40;
  for (let tries = 0; f.marks.length < want && tries < 20; tries++) {
    const i = f.flow.cells[(Math.random() * f.flow.cells.length) | 0];
    const life = 0.8 + Math.random() * 1.0;
    f.marks.push({ x: (i % f.flow.W) * R + Math.random(), y: ((i / f.flow.W) | 0) * R + Math.random(),
                   age: Math.random() * life * 0.3, life, len: 1.6 + Math.random() * 2,
                   a: 0.55 + Math.random() * 0.3 });
  }
  for (let k = f.marks.length - 1; k >= 0; k--) {
    const m = f.marks[k];
    m.age += dt;
    const v = flowAt(f.flow, m.x, m.y);
    if (!v || m.age > m.life) { f.marks.splice(k, 1); continue; }
    m.vx = v[0]; m.vy = v[1];
    m.s = (spec.speed ?? 10) * (0.6 + m.age / m.life);
    m.x += m.vx * m.s * dt;
    m.y += m.vy * m.s * dt;
  }
  ctx.drawImage(layerFor(f.fall, g => paintMarks(g, f.marks)), f.fall.rect.x, f.fall.rect.y);
  // The pools: glints, and rings round every foot.
  ctx.drawImage(layerFor(f.pool, g => {
    paintGlints(g, f.still, dt, t, f.glints, spec.glints ?? 4);
    g.lineWidth = 0.6;
    for (const s of f.feet) {
      const p = ((t / 1.7) + hash(s.n + 70)) % 1;
      for (const lag of [0, 0.5]) {
        const q = (p + lag) % 1;
        g.strokeStyle = `rgba(255,252,240,${0.8 * (1 - q)})`;
        g.beginPath();
        g.ellipse(s.x, s.y + 1, 2 + q * 8, (2 + q * 8) * 0.4, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
  }), f.pool.rect.x, f.pool.rect.y);
  // SPRAY where each jet lands: droplets thrown up and out, over and over.
  ctx.save();
  for (const s of f.feet) {
    for (let j = 0; j < 5; j++) {
      const q = ((t / 0.8) + hash(s.n * 5 + j + 80)) % 1;
      const dir = -Math.PI / 2 + (hash(s.n * 5 + j + 90) - 0.5) * 2.6;
      const d = q * (2.5 + hash(s.n * 5 + j + 100) * 3);
      const x = s.x + Math.cos(dir) * d;
      const y = s.y + Math.sin(dir) * d * 0.5 - Math.sin(Math.PI * q) * 3.4;
      const r = 0.75;
      ctx.globalAlpha = 0.9 * (1 - q);
      ctx.drawImage(dot(), x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
    }
  }
  ctx.restore();
}

function buildFountain(img, spec) {
  const c = sheet();
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 960, 540);
  const d = g.getImageData(0, 0, 960, 540).data;
  c.width = 0; c.height = 0;
  const [bx, by, bw, bh] = spec.box;
  const [cr, cg, cb] = spec.colour;
  const wet = i => d[i * 4 + 3] > 200 && Math.abs(d[i * 4] - cr) <= 12 &&
    Math.abs(d[i * 4 + 1] - cg) <= 12 && Math.abs(d[i * 4 + 2] - cb) <= 12;
  // Each shape of water on its own: the pixels of the colour that touch.
  const lab = new Int32Array(960 * 540).fill(-1);
  const shapes = [];
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
    const i0 = y * 960 + x;
    if (lab[i0] >= 0 || !wet(i0)) continue;
    const s = { px: [], x0: x, y0: y, x1: x, y1: y };
    lab[i0] = shapes.length;
    const todo = [i0];
    while (todo.length) {
      const i = todo.pop(), X = i % 960, Y = (i / 960) | 0;
      s.px.push(i);
      if (X < s.x0) s.x0 = X; if (X > s.x1) s.x1 = X; if (Y < s.y0) s.y0 = Y; if (Y > s.y1) s.y1 = Y;
      for (const k of [i - 1, i + 1, i - 960, i + 960]) {
        const KX = k % 960, KY = (k / 960) | 0;
        if (KX < bx || KX >= bx + bw || KY < by || KY >= by + bh) continue;
        if (lab[k] < 0 && wet(k)) { lab[k] = shapes.length; todo.push(k); }
      }
    }
    shapes.push(s);
  }
  // A speck of the colour is antialiasing, not water.
  const real = shapes.filter(s => s.px.length >= 20);
  for (const s of real) s.falls = s.y1 - s.y0 + 1 > (s.x1 - s.x0 + 1) / 1.6;
  const maskOf = list => {
    const m = sheet(), mg = m.getContext('2d'), md = new ImageData(960, 540);
    for (const s of list) for (const i of s.px) md.data[i * 4 + 3] = 255;
    mg.putImageData(md, 0, 0);
    return m;
  };
  const falling = real.filter(s => s.falls), pools = real.filter(s => !s.falls);
  if (!falling.length || !pools.length) return null;
  const pooled = new Uint8Array(960 * 540);
  for (const s of pools) for (const i of s.px) pooled[i] = 1;
  // WHERE EACH SHAPE OF FALLING WATER ENDS: its lowest px, in runs a few px apart —
  // the two feet of an arch are two. The spout the middle jet rises from is where
  // water starts rather than ends, so the way down runs away from it.
  const [sx, sy] = spec.spout || [-99, -99];
  const nearSpout = (x, y) => Math.hypot(x - sx, y - sy) < 6;
  const ends = new Set(), feet = [];
  for (const s of falling) {
    const low = s.px.filter(i => ((i / 960) | 0) >= s.y1 - 1).map(i => i % 960).sort((a, b) => a - b);
    let run = [];
    const close = () => {
      if (!run.length) return;
      const x = (run[0] + run[run.length - 1]) / 2;
      run = [];
      if (nearSpout(x, s.y1)) return;
      // A foot in a pool — something just below it is pool water — rings and sprays.
      let inPool = false;
      for (let dy = 1; dy <= 8 && !inPool; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (pooled[(s.y1 + dy) * 960 + Math.round(x) + dx]) { inPool = true; break; }
      }
      if (inPool) feet.push({ x, y: s.y1 + 2, n: feet.length });
    };
    // The whole of the bottom edge is where the water goes, so a sheet falls
    // straight down rather than gathering to a point.
    for (const i of s.px) if (((i / 960) | 0) >= s.y1 - 1 && !nearSpout(i % 960, s.y1)) { ends.add(i); ends.add(i - 960); }
    for (const x of low) { if (run.length && x - run[run.length - 1] > 2) close(); run.push(x); }
    close();
  }
  const fallMask = maskOf(falling), poolMask = maskOf(pools);
  const flow = flowField(fallMask, (x, y) => ends.has(y * 960 + x) || ends.has((y + 1) * 960 + x),
                         spec.spout ? nearSpout : null);
  const still = flowField(poolMask, () => true);
  const out = { fall: group(fallMask), pool: group(poolMask), flow, still, feet,
                marks: [], glints: [], lastT: null };
  fallMask.width = 0; fallMask.height = 0; poolMask.width = 0; poolMask.height = 0;
  return out.fall && out.pool ? out : null;
}

// --- the shadows on the world map's water --------------------------------------
//
// THE SHADOW UNDER THE THREE BRIDGES AND ALONG THE FOOT OF THE MOUNTAINS, soft and
// moving where it meets the water, at the owner's word — the same as the bridges'
// shadow on stages 5 and 6 (buildSeam). Here the shadow is the drawing's dark brown,
// painted straight against the water with no outline between, so the line between
// the two is found by colour just as there.
//
// The map under it is not the drawing's flat colours but the drawing with the paper
// and the sun over it (stillMap in src/overview.js), so the band is made from THAT:
// the finished map along the line, blurred across it and nowhere else. It is remade
// when a stage is reached or the screen changes size — not on every step of a road
// being walked, which remakes the finished map thirty times over and would stall
// each of them; for the few seconds of a walk the band keeps the light it had.
// Worked at twice the map's size, as the drawing's own sheet is.
//
// Each piece is drawn in thin columns, each nudged up or down by two slow waves —
// the mountains' shadow runs along the water and the arches' across it on a slant,
// so up and down is what moves them both (the boards' bridges are nudged sideways
// instead) — and cut to the water and the shadow, fading out at either side of the
// band so it sits in the grain of the paper without an edge.
const MAP_SHADOW = [68, 52, 31];
const MAP_SEAM = 2;           // work px (a map px each) either way of the line
const MAP_Z = 2;              // work px per map px
const MAP_STRIP = 4;          // work px per row or column
let mapSeams, mapSeamsKey = '';

function drawMapSeams(ctx, t, base, key) {
  const img = art.overview;
  if (!img || img.complete === false) return;
  if (mapSeams === undefined) {
    mapSeams = null;
    try { mapSeams = findMapSeams(img); } catch { /* no canvas: a still line */ }
  }
  if (!mapSeams) return;
  if (key !== mapSeamsKey) {
    mapSeamsKey = key;
    try { for (const s of mapSeams) paintMapSeam(s, base, ctx.getTransform()); } catch { mapSeams = null; return; }
  }
  for (const s of mapSeams) {
    const r = s.rect;
    const g = s.layer.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, r.w, r.h);
    for (let x = 0; x < r.w; x += MAP_STRIP) {
      const X = (r.x + x) / MAP_Z;
      const dy = MAP_Z * (1.3 * Math.sin(t * 1.2 + X * 0.16) + 0.6 * Math.sin(t * 1.9 - X * 0.06));
      const ww = Math.min(MAP_STRIP, r.w - x);
      g.drawImage(s.band, x, 0, ww, r.h, x, dy, ww, r.h);
    }
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(s.mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(s.layer, r.x / MAP_Z, r.y / MAP_Z, r.w / MAP_Z, r.h / MAP_Z);
  }
}

// WHERE THE LINES ARE, from the drawing: every place the dark brown touches the
// water, gathered into pieces a few dozen px apart, each with how much of the wet
// round every pixel of it is in shadow. Once.
function findMapSeams(img) {
  const W = 960 * MAP_Z, H = 540 * MAP_Z;
  const c = sheet(W, H);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  c.width = 0; c.height = 0;
  const near = (i, col, tol) =>
    Math.abs(d[i] - col[0]) <= tol && Math.abs(d[i + 1] - col[1]) <= tol && Math.abs(d[i + 2] - col[2]) <= tol;
  // 1 water, 2 shadow, 3 the drawing's own soft pixels between the two.
  const light = WATER_SHADE, dark = MAP_SHADOW;
  const dv = [dark[0] - light[0], dark[1] - light[1], dark[2] - light[2]];
  const dd = dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2];
  const kind = new Uint8Array(W * H), mixK = new Float32Array(W * H);
  for (let j = 0; j < W * H; j++) {
    const i = j * 4;
    if (near(i, light, WATER_TOLERANCE)) kind[j] = 1;
    else if (near(i, dark, 10)) kind[j] = 2;
    else {
      const v = [d[i] - light[0], d[i + 1] - light[1], d[i + 2] - light[2]];
      const k = (v[0] * dv[0] + v[1] * dv[1] + v[2] * dv[2]) / dd;
      if (k < 0 || k > 1) continue;
      let off = false;
      for (let n = 0; n < 3; n++) if (Math.abs(v[n] - k * dv[n]) > 14) off = true;
      if (!off) { kind[j] = 3; mixK[j] = k; }
    }
  }
  // ONLY BETWEEN THE TWO: the mountains' grey falls on the line from the water's
  // colour to the shadow's as well, and counted as wet it was blurred smooth. A real
  // mix pixel has the water on one side of it and the shadow on the other.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x;
    if (kind[j] !== 3) continue;
    let w = false, s = false;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const k = kind[Y * W + X];
      if (k === 1) w = true; else if (k === 2) s = true;
    }
    if (!w || !s) kind[j] = 0;
  }
  // The shadow's edge against the water, in tiles, and the tiles that touch joined up.
  const T = 24, tiles = new Map();
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (kind[y * W + x] !== 2) continue;
    let wet = false;
    for (let dy = -2; dy <= 2 && !wet; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (kind[(y + dy) * W + x + dx] === 1) { wet = true; break; }
    }
    if (!wet) continue;
    const k = ((y / T) | 0) * 1000 + ((x / T) | 0);
    tiles.set(k, (tiles.get(k) || 0) + 1);
  }
  const seen = new Set(), pieces = [];
  const pad = MAP_SEAM * 3 + 2 * MAP_Z;
  for (const k0 of tiles.keys()) {
    if (seen.has(k0)) continue;
    seen.add(k0);
    const todo = [k0];
    let tx0 = 1e9, ty0 = 1e9, tx1 = -1, ty1 = -1, n = 0;
    while (todo.length) {
      const k = todo.pop(), tx = k % 1000, ty = (k / 1000) | 0;
      n += tiles.get(k);
      tx0 = Math.min(tx0, tx); tx1 = Math.max(tx1, tx); ty0 = Math.min(ty0, ty); ty1 = Math.max(ty1, ty);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const k2 = (ty + a) * 1000 + tx + b;
        if (tiles.has(k2) && !seen.has(k2)) { seen.add(k2); todo.push(k2); }
      }
    }
    // A pixel or two of brown against the water somewhere is a stray, not a shadow.
    if (n < 10) continue;
    const x0 = Math.max(0, tx0 * T - pad), y0 = Math.max(0, ty0 * T - pad);
    const x1 = Math.min(W, (tx1 + 1) * T + pad), y1 = Math.min(H, (ty1 + 1) * T + pad);
    const w = x1 - x0, h = y1 - y0;
    let a = new Float32Array(w * h), q = new Float32Array(w * h);
    const wet = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = (y + y0) * W + x + x0, s = kind[j];
      if (!s) continue;
      wet[y * w + x] = 1;
      q[y * w + x] = 1;
      a[y * w + x] = s === 2 ? 1 : s === 3 ? mixK[j] : 0;
    }
    a = soften(a, w, h, MAP_SEAM);
    q = soften(q, w, h, MAP_SEAM);
    for (let i = 0; i < a.length; i++) a[i] = q[i] > 1e-3 ? a[i] / q[i] : 0;
    pieces.push({ rect: { x: x0, y: y0, w, h }, v: a, wet, q });
  }
  return pieces.length ? pieces : null;
}

// THE BAND'S COLOURS, from the finished map: what is under the piece, blurred across
// the wet and nothing else, so the stone of a bridge never bleeds into it. The mask
// fades in and out across the band — full strength on the line, nothing where the
// shadow or the water is left to itself.
function paintMapSeam(s, base, tf) {
  const { x, y, w, h } = s.rect;
  const c = sheet(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(MAP_Z / tf.a, 0, 0, MAP_Z / tf.d, -tf.e * MAP_Z / tf.a - x, -tf.f * MAP_Z / tf.d - y);
  g.drawImage(base, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const px = g.getImageData(0, 0, w, h), d = px.data;
  const q = s.q;
  const ch = [0, 1, 2].map(n => {
    const a = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = s.wet[i] ? d[i * 4 + n] : 0;
    return soften(a, w, h, MAP_SEAM);
  });
  const mask = new ImageData(w, h), m = mask.data;
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    if (q[i] > 1e-3) {
      for (let n = 0; n < 3; n++) d[k + n] = ch[n][i] / q[i];
      d[k + 3] = 255;
    } else d[k + 3] = 0;
    if (!s.wet[i]) continue;
    const v = s.v[i];
    m[k + 3] = Math.round(255 * Math.max(0, Math.min(1, Math.min(v, 1 - v) / 0.18)));
  }
  g.putImageData(px, 0, 0);
  if (s.band) { s.band.width = 0; s.band.height = 0; }
  const mc = s.mask || sheet(w, h);
  mc.getContext('2d').putImageData(mask, 0, 0);
  Object.assign(s, { band: c, mask: mc, layer: s.layer || sheet(w, h) });
}

// And OVER the fog, where only the water can go. Both call sites exist whichever
// way the switch is set, so moving the water between them is one word rather than
// a move.
export function drawWater(ctx, t) {
  if (SHIMMER && WATER_THROUGH_FOG) drawShimmer(ctx, t);
  // Birds fly over the far country as readily as the near: they are above the map
  // rather than on it, so the fog has no business hiding them.
  if (BIRDS) drawBirds(ctx, t);
}

// --- a board's own river --------------------------------------------------------
//
// STAGE 5'S RIVER, MOVING, in the world map's style at the owner's word: the same
// pale current marks riding a flow field worked out from the water itself, and the
// same glints of sunlight — see the currents above. `water` on the level says which
// colours in the board's base are the water, the box it runs off the board through
// (`sink`), how many marks it carries and how fast.
//
// On the board's own clock, so it holds still on a paused board. Built once per
// drawing; null (and nothing drawn) if the drawing cannot be read.
const boardWaters = new Map();
export function drawBoardWater(ctx, img, spec, t) {
  if (!img || !spec) return;
  let w = boardWaters.get(img);
  if (w === undefined) {
    w = null;
    try { w = buildBoardWater(img, spec); } catch { /* no canvas: still water */ }
    boardWaters.set(img, w);
  }
  if (!w) return;
  const dt = w.lastT === null ? 0 : Math.max(0, Math.min(0.1, t - w.lastT));
  w.lastT = t;
  step(w.marks, w.flow, spec.marks, spec.speed, dt, false);
  // The line between the bridge's shadow and the open water, soft and moving —
  // under the currents, which run across it.
  if (w.seam) drawSeam(ctx, w.seam, t);
  ctx.drawImage(layerFor(w.grp, g => {
    paintMarks(g, w.marks);
    paintGlints(g, w.flow, dt, t, w.glints, spec.glints);
  }), w.grp.rect.x, w.grp.rect.y);
  // WHERE THE WATER MEETS THE LAND: ripples off the bank and bursts of spray, the
  // world map's own (drawShore) at the spots the current runs into a bank.
  if (w.shore.length) drawShore(ctx, t, w.shore, 1, spec.foam ?? 1.6, spec.foamAlpha ?? 2, false);
  // AND IN THE SHADE, the same marks, dimmer: water under the bridge catches less of
  // the sky, and pale strokes at full strength stood out on the dark blue far more
  // than on the light.
  if (w.shade) {
    ctx.save();
    ctx.globalAlpha *= spec.shadeAlpha ?? 0.45;
    ctx.drawImage(layerFor(w.shade, g => paintMarks(g, w.marks)), w.shade.rect.x, w.shade.rect.y);
    ctx.restore();
  }
}

function buildBoardWater(img, spec) {
  const wet = sheet();
  const g = wet.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 960, 540);
  const px = g.getImageData(0, 0, 960, 540);
  const d = px.data;
  // The drawing itself, kept to tell a bank from a bridge by — see `land` below.
  const art = new Uint8ClampedArray(d);
  // Every shade the water is painted in — open water first, then the same water in
  // the bridge's shadow, which is water all the same. ONE flow field over all of it,
  // so a current runs on under the bridge; two layers, so the shaded part can be
  // drawn dimmer.
  const near = (i, [wr, wg, wb]) =>
    Math.abs(d[i] - wr) <= 10 && Math.abs(d[i + 1] - wg) <= 10 && Math.abs(d[i + 2] - wb) <= 10;
  const [open, ...shaded] = spec.colours;
  const shadeMask = sheet(), sd = new ImageData(960, 540);
  for (let i = 0; i < d.length; i += 4) {
    const inShade = shaded.some(c => near(i, c));
    const isWater = inShade || near(i, open);
    if (inShade) sd.data[i + 3] = 255;
    d[i] = d[i + 1] = d[i + 2] = 0;
    d[i + 3] = isWater && !inShade ? 255 : 0;
  }
  g.putImageData(px, 0, 0);
  shadeMask.getContext('2d').putImageData(sd, 0, 0);
  const grp = group(wet);
  const shade = group(shadeMask);
  if (!grp) return null;
  // The flow over the lot: the shade laid back in with the open water.
  g.drawImage(shadeMask, 0, 0);
  shadeMask.width = 0; shadeMask.height = 0;
  const [x0, y0, x1, y1] = spec.sink;
  const flow = flowField(wet, (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  wet.width = 0; wet.height = 0;
  // THE SHORE: spray all along the banks, where the water meets the LAND — not the
  // bridge, at the owner's word, and no ripples. The bank and the bridge's deck are
  // painted the same brown, so a spot is on land if, looking on from the water's edge
  // into what it meets, grass or sand (`spec.land`) is reached within a few px: a
  // bank is a thin strip of mud before the grass, a bridge is deck for a long way.
  const like = (i, c) => Math.abs(art[i] - c[0]) + Math.abs(art[i + 1] - c[1]) + Math.abs(art[i + 2] - c[2]) < 24;
  const land = (x, y, dx, dy) => {
    for (let r = 3; r <= 26; r++) {
      const X = Math.round(x + dx * r), Y = Math.round(y + dy * r);
      if (X < 0 || Y < 0 || X >= 960 || Y >= 540) return false;
      const i = (Y * 960 + X) * 4;
      if (spec.land.some(c => like(i, c))) return true;
      if (spec.colours.some(c => like(i, c))) return false;
    }
    return false;
  };
  const shore = bankSpots(flow, spec.sprayGap ?? 9, land).map((p, n) => ({ ...p, n }));
  const seam = shaded.length ? buildSeam(d, sd.data, open, shaded[0], art) : null;
  return { grp, shade, seam, flow, shore, marks: [], glints: [], lastT: null };
}

// WHERE THE BRIDGE'S SHADOW MEETS THE OPEN WATER, SOFTENED AND MOVING, at the
// owner's word: "make the dark blue and light blue water sort of wobbly ... so that
// the line between them is less obvious". A band along that line, SEAM px either
// side of it, painted as the one blue fading into the other — worked out once by
// blurring the shadow's outline — and drawn every frame in thin rows, each pushed
// sideways by a slow ripple, and cut to the water so it never touches the bridge.
// The band's edges are the two blues themselves, so wherever it lands it meets the
// water beside it without a line.
const SEAM = 4;
function buildSeam(open, shadow, light, dark, art) {
  const W = 960, H = 540;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!shadow[i + 3]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const pad = SEAM * 3;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  // THE LINE ITSELF IS WATER TOO: the drawing's own soft pixels along it are a mix
  // of the two blues, neither one nor the other, and left out they stayed on the
  // board as a speckled line down the middle of the band. `mix` is how far along
  // from the light blue to the dark one a pixel is, or -1 if it is no mix of them.
  const dv = [dark[0] - light[0], dark[1] - light[1], dark[2] - light[2]];
  const dd = dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2];
  const mix = i => {
    const v = [art[i] - light[0], art[i + 1] - light[1], art[i + 2] - light[2]];
    const k = (v[0] * dv[0] + v[1] * dv[1] + v[2] * dv[2]) / dd;
    if (k < 0 || k > 1) return -1;
    for (let c = 0; c < 3; c++) if (Math.abs(v[c] - k * dv[c]) > 14) return -1;
    return k;
  };
  const wetAt = i => shadow[i + 3] || open[i + 3] || mix(i) >= 0;
  // How much of the WATER round each pixel is in shadow: the shadow and the water
  // each blurred, twice over, by a box SEAM wide, and the one over the other — so the
  // bridge and the banks count for nothing and the ramp is only across the line
  // between the two blues, never along the shadow's edge against the stonework.
  let a = new Float32Array(w * h), q = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y + y0) * W + x + x0) * 4;
    const k = shadow[i + 3] ? 1 : open[i + 3] ? 0 : mix(i);
    a[y * w + x] = Math.max(0, k);
    q[y * w + x] = k >= 0 ? 1 : 0;
  }
  a = soften(a, w, h, SEAM);
  q = soften(q, w, h, SEAM);
  for (let i = 0; i < a.length; i++) a[i] = q[i] > 1e-3 ? a[i] / q[i] : 0;
  const band = new ImageData(w, h), mask = new ImageData(w, h), b = band.data, m = mask.data;
  let any = false;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y + y0) * W + x + x0) * 4, k = (y * w + x) * 4, v = a[y * w + x];
    if (!wetAt(i)) continue;
    m[k + 3] = 255;
    if (v <= 0.02 || v >= 0.98) continue;
    for (let c = 0; c < 3; c++) b[k + c] = Math.round(light[c] + (dark[c] - light[c]) * v);
    b[k + 3] = 255;
    any = true;
  }
  if (!any) return null;
  const put = data => { const c = sheet(w, h); c.getContext('2d').putImageData(data, 0, 0); return c; };
  return { band: put(band), mask: put(mask), layer: sheet(w, h), rect: { x: x0, y: y0, w, h } };
}

// A box blur r px each way, across and then down, twice over — near enough a
// gaussian. Each value is the mean of what the box holds, so the edges of the
// array are not darkened by the nothing beyond them.
function soften(a, w, h, r) {
  const blur = (src, horiz) => {
    const out = new Float32Array(w * h), n = horiz ? w : h, m = horiz ? h : w;
    for (let j = 0; j < m; j++) {
      let sum = 0, cnt = 0;
      const at = k => (horiz ? j * w + k : k * w + j);
      for (let k = -r; k < n + r; k++) {
        const add = k + r, drop = k - r - 1;
        if (add >= 0 && add < n) { sum += src[at(add)]; cnt++; }
        if (drop >= 0 && drop < n) { sum -= src[at(drop)]; cnt--; }
        if (k >= 0 && k < n) out[at(k)] = sum / cnt;
      }
    }
    return out;
  };
  for (let pass = 0; pass < 2; pass++) a = blur(blur(a, true), false);
  return a;
}

// The band, drawn in rows each nudged sideways by two slow waves of their own, and
// cut to the water.
const SEAM_ROW = 2;
function drawSeam(ctx, s, t) {
  const g = s.layer.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, s.rect.w, s.rect.h);
  for (let y = 0; y < s.rect.h; y += SEAM_ROW) {
    const Y = s.rect.y + y;
    const dx = 2.2 * Math.sin(t * 1.3 + Y * 0.19) + 1.1 * Math.sin(t * 2.1 - Y * 0.07);
    const hh = Math.min(SEAM_ROW, s.rect.h - y);
    g.drawImage(s.band, 0, y, s.rect.w, hh, dx, y, s.rect.w, hh);
  }
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(s.mask, 0, 0);
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(s.layer, s.rect.x, s.rect.y);
}
