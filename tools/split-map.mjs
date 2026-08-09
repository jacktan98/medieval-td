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
// render.js draws the base once and stamps the artist's own `Plot Marker.svg`
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
import { path, plots } from '../src/data/level01.js';
import { nearestOnPath } from '../src/units.js';
import { SCALE } from '../src/data/towers.js';

const SRC = 'assets/map/Map.svg';
const BASE = 'assets/map/Map_base.svg';
const MARKER = 'assets/map/Plot Marker.svg';

const svg = readFileSync(SRC, 'utf8');

// --- geometry ----------------------------------------------------------------

// Flatten a path's `d` to points under a 2x3 affine. Curves are sampled rather
// than solved: this is measuring bounding boxes, not rendering.
function points(d, tf) {
  const [a, b, c, e, f, g] = tf;
  const tk = d.match(/[MmLlCcQqZzHhVv]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const pts = [];
  let i = 0, cur = [0, 0], start = [0, 0], cmd = null;
  const n = () => parseFloat(tk[i++]);
  const push = p => { pts.push([a * p[0] + c * p[1] + f, b * p[0] + e * p[1] + g]); return p; };

  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++];
    if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();

    if (cmd === 'M' || cmd === 'm') {
      let x = n(), y = n();
      if (rel) { x += cur[0]; y += cur[1]; }
      cur = push([x, y]); start = cur; cmd = rel ? 'l' : 'L';
    } else if (cmd === 'L' || cmd === 'l') {
      let x = n(), y = n();
      if (rel) { x += cur[0]; y += cur[1]; }
      cur = push([x, y]);
    } else if (cmd === 'H' || cmd === 'h') {
      let x = n(); if (rel) x += cur[0]; cur = push([x, cur[1]]);
    } else if (cmd === 'V' || cmd === 'v') {
      let y = n(); if (rel) y += cur[1]; cur = push([cur[0], y]);
    } else if (cmd === 'C' || cmd === 'c') {
      let x1 = n(), y1 = n(), x2 = n(), y2 = n(), x = n(), y = n();
      if (rel) { x1 += cur[0]; y1 += cur[1]; x2 += cur[0]; y2 += cur[1]; x += cur[0]; y += cur[1]; }
      const p0 = cur;
      for (let s = 1; s <= 16; s++) {
        const u = s / 16, m = 1 - u;
        push([m*m*m*p0[0] + 3*m*m*u*x1 + 3*m*u*u*x2 + u*u*u*x,
              m*m*m*p0[1] + 3*m*m*u*y1 + 3*m*u*u*y2 + u*u*u*y]);
      }
      cur = [x, y];
    } else if (cmd === 'Q' || cmd === 'q') {
      let x1 = n(), y1 = n(), x = n(), y = n();
      if (rel) { x1 += cur[0]; y1 += cur[1]; x += cur[0]; y += cur[1]; }
      const p0 = cur;
      for (let s = 1; s <= 12; s++) {
        const u = s / 12, m = 1 - u;
        push([m*m*p0[0] + 2*m*u*x1 + u*u*x, m*m*p0[1] + 2*m*u*y1 + u*u*y]);
      }
      cur = [x, y];
    } else if (cmd === 'Z' || cmd === 'z') {
      cur = start;
    } else { i++; }
  }
  return pts;
}

function compose(p, q) {
  // p and q are [a,b,c,d,e,f] as in SVG's matrix(a,b,c,d,e,f).
  return [
    p[0]*q[0] + p[2]*q[1],
    p[1]*q[0] + p[3]*q[1],
    p[0]*q[2] + p[2]*q[3],
    p[1]*q[2] + p[3]*q[3],
    p[0]*q[4] + p[2]*q[5] + p[4],
    p[1]*q[4] + p[3]*q[5] + p[5]
  ];
}

function parseTransform(attr) {
  if (!attr) return [1, 0, 0, 1, 0, 0];
  const m = attr.match(/matrix\(([^)]*)\)/);
  if (m) return m[1].split(/[,\s]+/).map(Number);
  const t = attr.match(/translate\(([^)]*)\)/);
  if (t) { const v = t[1].split(/[,\s]+/).map(Number); return [1, 0, 0, 1, v[0], v[1] || 0]; }
  return [1, 0, 0, 1, 0, 0];
}

const bounds = ps => ({
  x0: Math.min(...ps.map(p => p[0])), x1: Math.max(...ps.map(p => p[0])),
  y0: Math.min(...ps.map(p => p[1])), y1: Math.max(...ps.map(p => p[1]))
});

// --- walk every group, at every depth ----------------------------------------
//
// Regex alone cannot do this: groups nest, so a closing tag has to be matched by
// depth. For each group we record its text span, the transform it inherits, and
// the sub-paths it draws.

function allGroups(text) {
  const clip = text.indexOf('<g clip-path');
  if (clip < 0) throw new Error('no clipped artboard group found');

  const tag = /<(\/?)(g|path|rect)\b([^>]*?)(\/?)>/g;
  tag.lastIndex = text.indexOf('>', clip) + 1;

  const stack = [];                       // open groups
  const out = [];
  let tf = [[1, 0, 0, 1, 0, 0]];           // inherited transform per open group

  for (let m; (m = tag.exec(text));) {
    const [, close, name, attrs, selfClose] = m;

    if (name === 'path' || name === 'rect') {
      const d = attrs.match(/\bd="([^"]*)"/);
      if (d) {
        const pts = points(d[1], tf[tf.length - 1]);
        if (pts.length) for (const g of stack) g.subPaths.push(pts);
      }
      continue;
    }

    if (!close && !selfClose) {
      const local = parseTransform((attrs.match(/transform="([^"]*)"/) || [])[1]);
      tf.push(compose(tf[tf.length - 1], local));
      stack.push({ start: m.index, subPaths: [] });
    } else if (close) {
      tf.pop();
      const g = stack.pop();
      if (!g) break;                       // the artboard group's own closing tag
      g.end = tag.lastIndex;
      if (g.subPaths.length) out.push(g);
    }
  }
  return out;
}

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
if (markers.length !== plots.length) {
  throw new Error(
    `found ${markers.length} repeated shapes but level01.js has ${plots.length} plots — ` +
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
// hand-drawn file now — `Plot Marker.svg`, on the same 512 square canvas as
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
// Printed ready to paste into src/data/level01.js. Only the HUD nudge is left to
// apply by hand, and the clearance each plot has is printed next to it.

const along = p => {
  const n = nearestOnPath(p.x, p.y);
  let d = 0;
  for (let i = 0; i < n.seg; i++) d += Math.hypot(path[i+1].x - path[i].x, path[i+1].y - path[i].y);
  return d + n.t * Math.hypot(path[n.seg+1].x - path[n.seg].x, path[n.seg+1].y - path[n.seg].y);
};
const total = path.slice(1).reduce((a, p, i) => a + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0);

const centres = markers.map(g => {
  const b = bounds(g.subPaths.reduce((a, c) => {
    const [ba, bc] = [bounds(a), bounds(c)];
    return (bc.x1 - bc.x0) > (ba.x1 - ba.x0) ? c : a;
  }));
  return { x: Math.round((b.x0 + b.x1) / 4), y: Math.round((b.y0 + b.y1) / 4) };
}).sort((a, b) => along(a) - along(b));

console.log('\nplots as painted, in road order — paste into src/data/level01.js:');
for (const c of centres) {
  const n = nearestOnPath(c.x, c.y);
  console.log(`  { x: ${String(c.x).padStart(3)}, y: ${String(c.y).padStart(3)} },` +
    `   // ${String(Math.round(along(c) / total * 100)).padStart(2)}% along, ` +
    `${String(Math.round(n.d)).padStart(3)} off` +
    (n.d > 110 ? '   FAR' : ''));
}
