// Splits the map artwork into a background and a reusable plot marker.
//
//   node tools/split-map.mjs
//
// The artist draws one file: ground, road, scenery, and a marker on every build
// plot. The game cannot use it as-is, because a marker painted into the
// background cannot be taken away again — and it has to disappear the moment a
// tower is built on that plot, or the signpost pokes out through the tower's
// legs.
//
// So this writes ONE derived file, committed:
//
//   Map_base.svg      the map with the markers removed
//
// render.js draws the base once and stamps the artist's own `Plot_Marker.svg`
// on each EMPTY plot, which is what makes "occupied" a thing the renderer can
// express at all. That marker is hand-drawn now rather than cut out of the map,
// so this only measures it and prints how to draw it.
//
// It also prints the plot positions the artwork implies, in road order, ready
// to paste into src/data/level01.js. The map is the source of truth for where
// the plots are; the data file only has to agree with it.
//
// Map.svg and Plot Marker.svg are never modified. Re-run after any redraw.

import { readFileSync, writeFileSync } from 'fs';
import { levels } from '../src/level.js';
import { nearestOn } from '../src/route.js';
import { SCALE } from '../src/data/towers.js';
import { allGroups, bounds, MAP_SCALE, readArtwork, layerFiles } from './svg.mjs';

// Which map to split. Every level records the file it was drawn from, so the
// tool finds its own level rather than being told twice.
const SRC = process.argv[2] || 'assets/map/Map_1.svg';
const BASE = SRC.replace(/\.svg$/, '') + '_base.svg';
const MARKER = 'assets/map/Plot_Marker.svg';

const level = levels.find(l => l.src === SRC);
if (!level) {
  throw new Error(`no level in src/level.js has src '${SRC}' — ` +
    `add one before splitting its map, even with an empty plot list`);
}

// A board is one file or a stack of layers, and only readArtwork knows which.
const svg = readArtwork(SRC);
// The layer files themselves, for the front-layer pass at the bottom. Empty for a
// board drawn in one piece, which simply has no front sheet.
const LAYERS = SRC.endsWith('.svg') ? [] : layerFiles(SRC);

// --- geometry ----------------------------------------------------------------

// A shape signature that ignores where the group sits: the sorted list of
// sub-path sizes. Two copies of the same drawing at different offsets — which is
// exactly what nine plot markers are — produce the same string.
function signature(g) {
  return g.subPaths
    .map(ps => { const b = bounds(ps); return `${(b.x1-b.x0).toFixed(1)}x${(b.y1-b.y0).toFixed(1)}`; })
    .sort().join(' ');
}

// --- find the markers --------------------------------------------------------
//
// They are identified as the largest set of groups that draw the same shape.
// The previous version matched a hard-coded transform string lifted out of the
// file, and a redraw silently changed it; this asks a question about the drawing
// instead of about the export. The scenery repeats too (the same rock is stamped
// five times), so "largest cluster" is the discriminator, and the count is
// checked against the level to make an added or removed marker a loud failure
// rather than a quietly wrong map.

const groups = allGroups(svg);
const clusters = new Map();
for (const g of groups) {
  const k = signature(g);
  if (!clusters.has(k)) clusters.set(k, []);
  clusters.get(k).push(g);
}

// Drop members nested inside another member of the same cluster. The export
// wraps single shapes in a <g> of their own, so an ellipse and the group around
// it are the same drawing counted twice — which made a nine-member cluster look
// like eighteen and beat the real markers on size alone.
const encloses = (o, g) => o.start <= g.start && o.end >= g.end && (o.start < g.start || o.end > g.end);
for (const [k, c] of clusters) clusters.set(k, c.filter(g => !c.some(o => encloses(o, g))));

// WHICH CLUSTER IS THE MARKER. "The one that repeats most" was the whole rule and
// it held for three maps, then stopped: the tutorial board has six plots and eight
// copies of one tuft of grass, so the grass won and the tool cut eight tufts out of
// the map and left six signposts standing in it. Nothing threw — the count check
// below only knows how many plots the level claims, and a level being written for
// the first time claims whatever you last typed.
//
// So the marker is identified by BEING THE MARKER. It is a known drawing —
// Plot_Marker.svg, the same file the game stamps on every empty plot — and its
// proportions are the one thing about it that survives being scaled into a map.
// Every cluster of two or more is scored on how close its box is to that shape, and
// the best match inside a quarter wins. Repeat count is only the tie-break now,
// which is the right way round: nine copies of a rock is not evidence of anything.
//
// The old rule stays as the fallback for a map drawn before there was a shared
// marker file to match against.
const mk = readFileSync(MARKER, 'utf8');
const mkGroups = allGroups(mk);
if (!mkGroups.length) throw new Error(`no geometry found in ${MARKER}`);
const mkPaths = mkGroups.reduce((a, b) => (b.subPaths.length > a.subPaths.length ? b : a)).subPaths;
const mkAll = bounds(mkPaths.flat());
const mkW = mkAll.x1 - mkAll.x0;
const mkH = mkAll.y1 - mkAll.y0;

// The marker drawn at the shared SCALE, in the map's own units. MAP_SCALE is how
// many game px a map unit is, so this is the size the artist's stamp should be.
const wantW = (mkW * SCALE) / MAP_SCALE;
const wantH = (mkH * SCALE) / MAP_SCALE;

const repeated = [...clusters.values()].filter(c => c.length >= 2);
const score = c => {
  const b = bounds(c[0].subPaths.flat());
  return Math.abs((b.x1 - b.x0) - wantW) / wantW + Math.abs((b.y1 - b.y0) - wantH) / wantH;
};

// Only the plausible ones are listed. A map has dozens of repeated tufts and
// pebbles and printing all of them buries the answer.
for (const c of repeated.filter(c => score(c) <= 1.5).sort((a, b) => score(a) - score(b))) {
  const b = bounds(c[0].subPaths.flat());
  console.log(`  candidate: x${String(c.length).padStart(2)}  ${c[0].subPaths.length} sub-paths, ` +
    `${(b.x1-b.x0).toFixed(0)}x${(b.y1-b.y0).toFixed(0)} map units, ` +
    `${(score(c) * 100).toFixed(0)}% off the marker`);
}

const LOOKS_LIKE_IT = 0.5;      // summed relative error across both axes
const like = repeated.filter(c => score(c) <= LOOKS_LIKE_IT)
  .sort((a, b) => score(a) - score(b) || b.length - a.length);

let markers;
if (like.length) {
  markers = like[0];
  const b = bounds(markers[0].subPaths.flat());
  console.log(`  matched the marker: ${markers.length} copies at ` +
    `${(b.x1-b.x0).toFixed(0)}x${(b.y1-b.y0).toFixed(0)}, wanted ${wantW.toFixed(0)}x${wantH.toFixed(0)}`);
} else {
  // Nothing looks like the stamp. Fall back to the old rule and say so, because
  // a silent fallback here is exactly the failure this replaced.
  const best = Math.max(0, ...repeated.map(c => c.length));
  const tied = repeated.filter(c => c.length === best);
  markers = tied.sort((a, b) => b[0].subPaths.length - a[0].subPaths.length ||
                                (b[0].end - b[0].start) - (a[0].end - a[0].start))[0] || [];
  console.log('  NOTHING matched Plot_Marker.svg — falling back to the largest cluster');
}

markers = [...markers].sort((a, b) => a.start - b.start);

console.log(`${groups.length} groups, marker cluster has ${markers.length}`);
if (markers.length !== level.plots.length) {
  throw new Error(
    `found ${markers.length} markers but ${level.id} has ${level.plots.length} plots — ` +
    `if the artwork gained or lost a marker, re-extract the plots before re-running this`);
}

// Guards the tie-break above: "biggest repeated drawing" would happily pick a
// group that wrapped a marker together with half the scenery. A marker is a
// signpost on a patch of dirt, so it is small.
const markerBounds = bounds(markers[0].subPaths.flat());
{
  const b = markerBounds;
  if (b.x1 - b.x0 > 300 || b.y1 - b.y0 > 300) {
    throw new Error(`the shape matched is ${Math.round(b.x1-b.x0)}x${Math.round(b.y1-b.y0)} ` +
      `map units — too big to be a plot marker`);
  }
}

// --- background: the same file with the marker groups cut out ----------------

let base = svg;
for (const g of [...markers].reverse()) base = base.slice(0, g.start) + base.slice(g.end);
writeFileSync(BASE, base);
console.log(`wrote ${BASE}`);

// --- the artist's plot marker, measured --------------------------------------
//
// The marker used to be derived here, cut out of the map and re-based. It is a
// hand-drawn file now — `Plot_Marker.svg`, on the same 512 square canvas as
// every sprite — so this only has to measure it and say how to draw it.
//
// The ellipse is the ground patch, the widest sub-path, and it is what lands on
// the plot coordinate. The signpost sticks up above it, so the pivot is NOT the
// middle of the box.

const mkEll = bounds(mkPaths.reduce((a, b) => {
  const [ba, bb] = [bounds(a), bounds(b)];
  return (bb.x1 - bb.x0) > (ba.x1 - ba.x0) ? b : a;
}));

const pivotX = ((mkEll.x0 + mkEll.x1) / 2 - mkAll.x0) / mkW;
const pivotY = ((mkEll.y0 + mkEll.y1) / 2 - mkAll.y0) / mkH;

console.log(`\n${MARKER}`);
console.log(`  trim   [${mkAll.x0.toFixed(0)}, ${mkAll.y0.toFixed(0)}, ${mkW.toFixed(0)}, ${mkH.toFixed(0)}]  (source px)`);
console.log(`  drawn  ${(mkW * SCALE).toFixed(1)} x ${(mkH * SCALE).toFixed(1)} game px at the shared SCALE`);
console.log(`  pivot  [${pivotX.toFixed(3)}, ${pivotY.toFixed(3)}]  (ellipse centre, as a fraction of the trim)`);
console.log(`  the map's own markers draw ${((markerBounds.x1 - markerBounds.x0) / 2).toFixed(1)} px wide, ` +
  `so this is ${(((mkW * SCALE) / ((markerBounds.x1 - markerBounds.x0) / 2) - 1) * 100).toFixed(1)}% off them`);

// --- where the artist put the plots ------------------------------------------
//
// In road order, because an index into `plots` has to mean something: plot 0 is
// the first one the column walks past. tools/sim.mjs picks plots by index, and
// an arbitrary order there quietly builds a "spread of towers" that is nothing
// of the sort.
//
// On a FORKED map "along the road" is not a single number — a plot beside the
// northern road and one beside the southern are not on the same line. So the
// order is by how far each plot still is FROM THE KEEP, measured along whichever
// route passes nearest. That is the same ordering on a map with one road, and
// the only one that means anything on a map with two.
//
// Printed ready to paste into the level file. The clearance each plot has is
// printed next to it.

const remainingAt = p => {
  const n = nearestOn(level.routes, p.x, p.y);
  return { left: level.routes[n.route].total - n.s, off: n.d };
};

const centres = markers.map(g => {
  const b = bounds(g.subPaths.reduce((a, c) => {
    const [ba, bc] = [bounds(a), bounds(c)];
    return (bc.x1 - bc.x0) > (ba.x1 - ba.x0) ? c : a;
  }));
  return { x: Math.round((b.x0 + b.x1) / 4), y: Math.round((b.y0 + b.y1) / 4) };
}).sort((a, b) => remainingAt(b).left - remainingAt(a).left);

console.log(`\nplots as painted, in road order — paste into the level file:`);
for (const c of centres) {
  const { left, off } = remainingAt(c);
  console.log(`  { x: ${String(c.x).padStart(3)}, y: ${String(c.y).padStart(3)} },` +
    `   // ${String(Math.round(left)).padStart(4)} from the keep, ` +
    `${String(Math.round(off)).padStart(3)} off the road` +
    (off > 95 ? '   FAR' : ''));
}

// --- what a figure can walk behind -------------------------------------------
//
// THE OWNER'S RULE: "buildings are supposed to overlap soldiers if the building
// is in front based on shadow". A board is one flat image drawn under everything,
// so a soldier standing BEHIND a house was drawn on its roof.
//
// The game already sorts everything that stands on the ground into one pass by
// depth — towers, soldiers, enemies, bodies, blood, dust. The map's own buildings
// were the one kind of solid thing not in it. So this writes the top layer out as
// a sheet the renderer can draw FROM at the right moment, and prints the box of
// every thing on it that stands up.
//
// THE SHEET IS THE WHOLE LAYER, and only the standing things get a box. That
// combination is the point, and it took two wrong versions to find:
//
//   The first cut nothing and redrew each building over the board. That re-covered
//   whatever the artist had drawn IN FRONT of it — the little man at the tavern
//   door went behind the wall, because the base had him after the building and the
//   second copy put the building back on top.
//
//   The second lifted the whole layer out of the base and sorted every piece of it
//   by its own shadow. That fixed the double-draw and broke the same man a
//   different way: his shadow is four pixels behind the tavern's, so the sort put
//   him behind it, which is not what the artist drew and not what the owner wants.
//   "The man is supposed to be seen and the back is the tavern building."
//
// So NOTHING is cut and nothing is re-sorted. The artist's layer is drawn exactly
// as drawn, and a building's box is redrawn from the SAME layer — which means the
// slice carries every prop the artist put on top of that building, in their order.
// Between two pieces of artwork nothing changes at all; the only thing the extra
// draw can get in front of is a game figure standing behind the building.
//
// WHICH SHAPES STAND UP is a question the artwork answers rather than the artist:
// a building stands and a road stone lies flat, so height decides. The tool
// refuses rather than guesses if anything sits on the line, because a threshold
// picked in the middle of a crowd will silently make a wall out of a rock.
const FRONT_MIN_H = 30;      // game px: a thing this tall is standing up
const FRONT_CLEAR = 0.15;    // and nothing may sit within this much of the line

if (LAYERS.length) {
  // The top layer's span in the STACKED text, so what is measured here is what the
  // base actually draws.
  const mark = /<g data-layer="(\d+)">/g;
  let last = null;
  for (let m; (m = mark.exec(svg));) last = m;
  if (!last) throw new Error('the stacked artwork has no labelled layers');

  const inTop = allGroups(svg).filter(g => g.start > last.index);
  const outer = inTop.filter(g => !inTop.some(o => o !== g && o.start <= g.start && o.end >= g.end));

  const measured = outer.map(g => {
    const b = bounds(g.subPaths.flat());
    return {
      g,
      x: b.x0 * MAP_SCALE, y: b.y0 * MAP_SCALE,
      w: (b.x1 - b.x0) * MAP_SCALE, h: (b.y1 - b.y0) * MAP_SCALE
    };
  });

  const tall = measured.filter(m => m.h >= FRONT_MIN_H).sort((a, b) => a.y + a.h - (b.y + b.h));
  const flat = measured.filter(m => m.h < FRONT_MIN_H);
  const shortest = Math.min(Infinity, ...tall.map(m => m.h));
  const tallestFlat = Math.max(0, ...flat.map(m => m.h));
  const low = FRONT_MIN_H * (1 - FRONT_CLEAR), high = FRONT_MIN_H * (1 + FRONT_CLEAR);
  if (tall.length && (shortest < high || tallestFlat > low)) {
    throw new Error(
      `the top layer has something sitting on the ${FRONT_MIN_H}px line: its shortest standing ` +
      `thing is ${shortest.toFixed(0)}px and its tallest flat one is ${tallestFlat.toFixed(0)}px, ` +
      `where the clear band is under ${low.toFixed(0)} and over ${high.toFixed(0)}. Height cannot ` +
      `tell them apart here — mark them another way before trusting this.`);
  }

  // The sheet: the same 1920x1080 artboard with the whole layer on it, in the
  // artist's own order, so a slice of it is a slice of the board.
  const FRONT = SRC.replace(/\.svg$/, '') + '_front.svg';
  const body = measured
    .slice()
    .sort((a, b) => a.g.start - b.g.start)
    .map(m => svg.slice(m.g.start, m.g.end))
    .join('\n');
  writeFileSync(FRONT,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">\n' +
    '<g>\n' + body + '\n</g>\n</svg>\n');

  console.log(`\nwrote ${FRONT} — the whole top layer, ${measured.length} thing(s), ` +
    `${tall.length} of which stand up` +
    (tall.length ? `: shortest ${shortest.toFixed(0)}px against ${tallestFlat.toFixed(0)}px of flat` : ''));
  console.log(`front, in depth order — paste into the level file:`);
  for (const m of tall) {
    console.log(`    { x: ${String(Math.round(m.x)).padStart(3)}, y: ${String(Math.round(m.y)).padStart(3)}, ` +
      `w: ${String(Math.round(m.w)).padStart(3)}, h: ${String(Math.round(m.h)).padStart(3)} },` +
      `   // stands on y ${Math.round(m.y + m.h)}`);
  }
}
