// AMBIENT MOTION ON THE WORLD MAP: cloud shadows crossing the land, and the water
// moving. Nothing here is part of how the game works. It exists so that the map is
// not a photograph.
//
// --- HOW TO TURN IT OFF ------------------------------------------------------
//
// Either switch below turns its own effect off on the next frame, and turning both
// off leaves drawMotion doing nothing at all:
//
//   const CLOUDS  = false;
//   const SHIMMER = false;
//
// To remove it outright: delete this file, then delete the one import and the two
// calls (drawMotion and drawWater) in src/overview.js. Nothing else refers to it.
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
// rather than the first — a cloud takes most of a minute to cross.
//
// The cloud shadows sit UNDER the fog: unexplored country is a drained still copy
// of the map, so a shadow only crosses land the player has actually been to. The
// water is the one exception and WATER_THROUGH_FOG below says why.

import { art } from './assets.js';
import { RIVERS, FALLS } from './data/overview.js';

const CLOUDS = true;
const SHIMMER = true;

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

// --- cloud shadows -----------------------------------------------------------

// Three, at different sizes and speeds, so they never line up into a pattern the
// eye can lock on to. Positions are the fraction of a full crossing each one has
// completed, offset from each other so they are spread out rather than in convoy.
//
// The map is 960 wide and a cloud is up to 520 across, so a crossing runs from
// well off one edge to well off the other: -600 to 1560, which is 2160 of travel.
const CLOUD_SPAN = 2160;
const CLOUD_FROM = -600;

const CLOUDS_AT = [
  { seconds: 74, phase: 0.00, y: 150, rx: 260, ry: 120, alpha: 0.13 },
  { seconds: 96, phase: 0.38, y: 350, rx: 210, ry: 95, alpha: 0.10 },
  { seconds: 61, phase: 0.71, y: 470, rx: 170, ry: 78, alpha: 0.08 }
];

// A shadow rather than a cloud: this is what the land looks like with something
// passing over the sun, so it is a soft darkening and never has an edge. Brown
// rather than grey, because everything else on this map is.
function drawClouds(ctx, t) {
  ctx.save();
  for (const c of CLOUDS_AT) {
    const at = ((t / c.seconds) + c.phase) % 1;
    const x = CLOUD_FROM + at * CLOUD_SPAN;

    // The vertical drift is a slow sine rather than a straight line, so a cloud
    // wanders down the map as it crosses instead of running on rails.
    const y = c.y + Math.sin(at * Math.PI * 2 + c.phase * 6.283) * 26;

    const g = ctx.createRadialGradient(x, y, 0, x, y, c.rx);
    g.addColorStop(0, `rgba(38,26,12,${c.alpha})`);
    g.addColorStop(0.55, `rgba(38,26,12,${c.alpha * 0.72})`);
    g.addColorStop(1, 'rgba(38,26,12,0)');

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, c.ry / c.rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, c.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

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

// Rivers drift ALONG the surface, which on this map runs broadly east-west, so the
// bands are near-vertical and travel sideways. Slowly: the whole point is that you
// see it in the corner of your eye.
const RIVER_BANDS = [
  { seconds: 29, phase: 0.00, of: 0.085, alpha: 0.30 },
  { seconds: 41, phase: 0.44, of: 0.130, alpha: 0.22 },
  { seconds: 23, phase: 0.77, of: 0.050, alpha: 0.18 }
];

// A waterfall FALLS, so its bands travel down instead, and much faster: falling
// water is the one thing on this map that is genuinely quick, and a slow waterfall
// looks like a glacier. It is a small part of the picture, so a livelier rate there
// does not compete with the flag.
const FALL_BANDS = [
  { seconds: 2.6, phase: 0.00, of: 0.14, alpha: 0.40 },
  { seconds: 3.9, phase: 0.35, of: 0.22, alpha: 0.30 },
  { seconds: 1.9, phase: 0.68, of: 0.09, alpha: 0.26 }
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
function bandsOn(g, t, list, box, vertical) {
  const run = vertical ? box.h : box.w;
  const from = vertical ? box.y0 : box.x0;
  for (const b of list) {
    const size = Math.max(6, run * b.of);
    const at = from - size + (((t / b.seconds) + b.phase) % 1) * (run + size * 2);
    const grad = vertical
      ? g.createLinearGradient(0, at - size / 2, 0, at + size / 2)
      : g.createLinearGradient(at - size / 2, 0, at + size / 2, 0);
    grad.addColorStop(0, 'rgba(255,252,238,0)');
    grad.addColorStop(0.5, `rgba(255,252,238,${b.alpha})`);
    grad.addColorStop(1, 'rgba(255,252,238,0)');
    g.fillStyle = grad;
    if (vertical) g.fillRect(box.x0, at - size / 2, box.w, size);
    else g.fillRect(at - size / 2, box.y0, size, box.h);
  }
}

// Lay one group's bands down, cut them to that group's mask, and put the result on
// the map. Done twice rather than once because the two masks are different and a
// band must never be cut to the wrong one.
//
// All of it happens inside the group's own rectangle: the layer is that size, the
// mask is cropped to it, and the transform is set so artboard coordinates still
// land where they should.
function pass(ctx, t, list, box, vertical, grp) {
  const g = grp.layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, grp.rect.w, grp.rect.h);
  // Artboard units, as the outlines are, shifted so the rectangle's corner is the
  // layer's origin.
  g.setTransform(0.5, 0, 0, 0.5, -grp.rect.x, -grp.rect.y);
  bandsOn(g, t, list, box, vertical);
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
  if (river) pass(ctx, t, RIVER_BANDS, WHOLE_BOARD, false, river);
  if (falls) pass(ctx, t, FALL_BANDS, fallsBox, true, falls);
}

// The one thing src/overview.js calls. `t` is wall-clock seconds — this is screen
// atmosphere, so it is not stepped by the game clock and the fast-forward
// multiplier has no business touching it.
// Called from src/overview.js UNDER the fog. Cloud shadows always go here; the
// water joins them unless it has been sent through the fog instead.
export function drawMotion(ctx, t) {
  if (CLOUDS) drawClouds(ctx, t);
  if (SHIMMER && !WATER_THROUGH_FOG) drawShimmer(ctx, t);
}

// And OVER the fog, where only the water can go. Both call sites exist whichever
// way the switch is set, so moving the water between them is one word rather than
// a move.
export function drawWater(ctx, t) {
  if (SHIMMER && WATER_THROUGH_FOG) drawShimmer(ctx, t);
}
