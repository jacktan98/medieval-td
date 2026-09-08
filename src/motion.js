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
// So it is drawn over the fog instead. The drain still does its job — the far
// country keeps no colour and no detail — and a river you can see from a distance
// still runs, which is true of rivers. Set this false and the water goes back under
// the fog with the clouds, still as everything else out there.
const WATER_THROUGH_FOG = true;

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
  const fallsMask = sheet();
  const fg = fallsMask.getContext('2d');
  fg.setTransform(0.5, 0, 0, 0.5, 0, 0);
  fg.fillStyle = '#000';
  for (const dd of FALLS) fg.fill(new Path2D(dd));
  fg.setTransform(1, 0, 0, 1, 0, 0);
  fg.globalCompositeOperation = 'destination-in';
  fg.drawImage(wet, 0, 0);

  // And the rivers: everything else that is wet.
  const riverMask = sheet();
  const rg = riverMask.getContext('2d');
  rg.drawImage(wet, 0, 0);
  rg.globalCompositeOperation = 'destination-out';
  rg.drawImage(fallsMask, 0, 0);

  river = group(riverMask);
  falls = group(fallsMask);
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

  // The rivers get the whole artboard to travel across; the mask decides where
  // that actually lands.
  if (river) pass(ctx, t, RIVER_BANDS, WHOLE_BOARD, RIVER_FLOW, river);
  if (falls) pass(ctx, t, FALL_BANDS, fallsBox, FALLS_FLOW, falls);
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
export function drawMotion(ctx, t) {
  if (SHIMMER && !WATER_THROUGH_FOG) drawShimmer(ctx, t);
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
