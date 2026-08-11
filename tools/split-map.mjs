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
import { allGroups, bounds } from './svg.mjs';

// Which map to split. Every level records the file it was drawn from, so the
// tool finds its own level rather than being told twice.
const SRC = process.argv[2] || 'assets/map/Map_1.svg';
const BASE = SRC.replace(/\.svg$/, '_base.svg');
const MARKER = 'assets/map/Plot_Marker.svg';

const level = levels.find(l => l.src === SRC);
if (!level) {
  throw new Error(`no level in src/level.js has src '${SRC}' — ` +
    `add one before splitting its map, even with an empty plot list`);
}

const svg = readFileSync(SRC, 'utf8');

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

// Several clusters tie at nine: the whole marker repeats nine times, but so
// does the ground ellipse nested inside it, and so does the signpost. Size
// alone picks one of those arbitrarily — the first attempt at this cut out nine
// ellipses and left nine signposts standing on the grass. Break the tie toward
// the biggest drawing, which is the outermost of the nested candidates.
const best = Math.max(...[...clusters.values()].map(c => c.length));
const tied = [...clusters.values()].filter(c => c.length === best);

for (const c of tied) {
  const b = bounds(c[0].subPaths.flat());
  console.log(`  candidate: ${c[0].subPaths.length} sub-paths, ` +
    `${(b.x1-b.x0).toFixed(0)}x${(b.y1-b.y0).toFixed(0)} map units`);
}

let markers = tied
  .sort((a, b) => b[0].subPaths.length - a[0].subPaths.length ||
                  (b[0].end - b[0].start) - (a[0].end - a[0].start))[0] || [];

markers = [...markers].sort((a, b) => a.start - b.start);

console.log(`${groups.length} groups, largest identical-shape cluster has ${markers.length}`);
if (markers.length !== level.plots.length) {
  throw new Error(
    `found ${markers.length} repeated shapes but ${level.id} has ${level.plots.length} plots — ` +
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

const mk = readFileSync(MARKER, 'utf8');
const mkGroups = allGroups(mk);
if (!mkGroups.length) throw new Error(`no geometry found in ${MARKER}`);

const mkPaths = mkGroups.reduce((a, b) => (b.subPaths.length > a.subPaths.length ? b : a)).subPaths;
const mkAll = bounds(mkPaths.flat());
const mkEll = bounds(mkPaths.reduce((a, b) => {
  const [ba, bb] = [bounds(a), bounds(b)];
  return (bb.x1 - bb.x0) > (ba.x1 - ba.x0) ? b : a;
}));

const mkW = mkAll.x1 - mkAll.x0;
const mkH = mkAll.y1 - mkAll.y0;
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
