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
// So this writes two derived files, both committed:
//
//   Map_1_base.svg    the map with the markers removed
//   Plot_Marker.svg   one marker on its own, centred on its ellipse
//
// render.js draws the base once and stamps the marker on each EMPTY plot, which
// is what makes "occupied" a thing the renderer can express at all.
//
// Map_1.svg is never modified. Re-run this after any redraw.

import { readFileSync, writeFileSync } from 'fs';
import { plots } from '../src/data/level01.js';

const SRC = 'assets/map/Map_1.svg';
const BASE = 'assets/map/Map_1_base.svg';
const MARKER = 'assets/map/Plot_Marker.svg';

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
{
  const b = bounds(markers[0].subPaths.flat());
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

// --- marker: one group, re-based so its ellipse centre is the middle ---------
//
// The ellipse is the ground patch — the widest sub-path — and it is what has to
// land on the plot coordinate. The signpost sticks up above it, so the group's
// full extent is taller and NOT centred on the ellipse.

const one = markers[0];
const all = bounds(one.subPaths.flat());
const wide = one.subPaths.reduce((a, b) => {
  const [ba, bb] = [bounds(a), bounds(b)];
  return (bb.x1 - bb.x0) > (ba.x1 - ba.x0) ? b : a;
});
const ell = bounds(wide);
const cx = (ell.x0 + ell.x1) / 2;
const cy = (ell.y0 + ell.y1) / 2;

// Pad the viewBox symmetrically about the ellipse centre, so the game can draw
// the marker centred on the plot with no anchor fraction to carry around.
const hw = Math.max(cx - all.x0, all.x1 - cx);
const hh = Math.max(cy - all.y0, all.y1 - cy);

writeFileSync(MARKER,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(cx-hw).toFixed(2)} ${(cy-hh).toFixed(2)} ` +
  `${(hw*2).toFixed(2)} ${(hh*2).toFixed(2)}" width="${(hw*2).toFixed(2)}" height="${(hh*2).toFixed(2)}">` +
  `${svg.slice(one.start, one.end)}</svg>\n`);

// The map is authored at 1920x1080 against a 960x540 game, hence the halving.
console.log(`wrote ${MARKER}`);
console.log(`  draw it ${(hw).toFixed(1)} x ${(hh).toFixed(1)} game px, centred on the plot`);

// Where the artist actually put each marker, in game coordinates, next to where
// level01.js says the plot is. They are allowed to differ — plot 0 is nudged
// down so the HUD does not clip its archer — but a large gap means the map moved
// and the level needs re-extracting.
console.log('  marker centres vs plots (game px):');
const centres = markers.map(g => {
  const w = g.subPaths.reduce((a, b) => {
    const [ba, bb] = [bounds(a), bounds(b)];
    return (bb.x1 - bb.x0) > (ba.x1 - ba.x0) ? b : a;
  });
  const b = bounds(w);
  return { x: (b.x0 + b.x1) / 4, y: (b.y0 + b.y1) / 4 };
}).sort((a, b) => a.x - b.x);

for (const c of [...plots].sort((a, b) => a.x - b.x)) {
  const near = centres.reduce((a, b) =>
    Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? b : a);
  const d = Math.hypot(near.x - c.x, near.y - c.y);
  console.log(`    plot (${String(c.x).padStart(3)}, ${String(c.y).padStart(3)})  ` +
    `marker (${near.x.toFixed(0).padStart(3)}, ${near.y.toFixed(0).padStart(3)})  off by ${d.toFixed(1)}`);
}
