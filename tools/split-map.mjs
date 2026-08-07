// Splits the map artwork into a background and a reusable plot marker.
//
//   node tools/split-map.mjs
//
// The artist draws one file: ground, road, and a marker on every build plot.
// The game cannot use it as-is, because a marker painted into the background
// cannot be taken away again — and it has to disappear the moment a tower is
// built on that plot, or the signpost pokes out through the tower's legs.
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

const SRC = 'assets/map/Map_1.svg';
const BASE = 'assets/map/Map_1_base.svg';
const MARKER = 'assets/map/Plot_Marker.svg';

const svg = readFileSync(SRC, 'utf8');

// Walk the tags and record every top-level <g> inside the clipped artboard,
// with the span of text it covers. Regex alone cannot do this — the groups
// nest, so the closing tag has to be matched by depth.
function topLevelGroups(text) {
  const clip = text.indexOf('<g clip-path');
  if (clip < 0) throw new Error('no clipped artboard group found');
  const inner = text.indexOf('>', clip) + 1;

  const out = [];
  const tag = /<(\/?)(\w+)([^>]*?)(\/?)>/g;
  tag.lastIndex = inner;

  let depth = 0, start = -1;
  for (let m; (m = tag.exec(text));) {
    const [, close, name, , selfClose] = m;
    if (name === 'path' || name === 'rect' || selfClose) continue;

    if (!close) {
      if (depth === 0) start = m.index;
      depth++;
    } else {
      depth--;
      if (depth === 0) out.push({ start, end: tag.lastIndex });
      if (depth < 0) break;              // the artboard group's own closing tag
    }
  }
  return out;
}

// A marker group is the ones that carry the repeated signpost sub-transform.
// The road and the HUD strip do not, so this identifies markers by structure
// rather than by counting or by position in the file.
const SIGNPOST = 'matrix(1,0,0,1,-121.256951366,5.464874449)';

const groups = topLevelGroups(svg);
const markers = groups.filter(g => svg.slice(g.start, g.end).includes(SIGNPOST));
console.log(`${groups.length} top-level groups, ${markers.length} of them plot markers`);
if (!markers.length) throw new Error('no plot markers matched — has the artwork changed shape?');

// --- background: the same file with the marker groups cut out ----------------
let base = svg;
for (const g of [...markers].reverse()) base = base.slice(0, g.start) + base.slice(g.end);
writeFileSync(BASE, base);
console.log(`wrote ${BASE}`);

// --- marker: one group, re-based so its ellipse centre is the middle ---------
const one = svg.slice(markers[0].start, markers[0].end);

// Flatten the marker's geometry to find both its full extent and the centre of
// its ellipse. The ellipse is the ground patch — the largest sub-path — and it
// is what has to land on the plot coordinate. The signpost sticks up above it,
// so the full extent is taller and NOT centred on the ellipse.
function points(d, tf) {
  const tk = d.match(/[MmLlCcQqZzHhVv]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const pts = [];
  let i = 0, cur = [0, 0], start = [0, 0], cmd = null;
  const n = () => parseFloat(tk[i++]);
  const push = p => { pts.push([p[0] + tf[0], p[1] + tf[1]]); return p; };
  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++];
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
      let a = n(), b = n(), c = n(), e = n(), x = n(), y = n();
      if (rel) { a += cur[0]; b += cur[1]; c += cur[0]; e += cur[1]; x += cur[0]; y += cur[1]; }
      const p0 = cur;
      for (let s = 1; s <= 16; s++) {
        const u = s / 16, m = 1 - u;
        push([m*m*m*p0[0] + 3*m*m*u*a + 3*m*u*u*c + u*u*u*x,
              m*m*m*p0[1] + 3*m*m*u*b + 3*m*u*u*e + u*u*u*y]);
      }
      cur = [x, y];
    } else if (cmd === 'Z' || cmd === 'z') {
      cur = start;
    } else { i++; }
  }
  return pts;
}

// Each <path> inherits the translate of any <g> wrapping it inside the marker.
const subPaths = [];
{
  const tag = /<(\/?)g[^>]*?>|<path ([^>]*)\/>/g;
  const stack = [[0, 0]];
  for (let m; (m = tag.exec(one));) {
    if (m[0].startsWith('</g')) { stack.pop(); continue; }
    if (m[0].startsWith('<g')) {
      const t = m[0].match(/matrix\(1,0,0,1,([-\d.]+),([-\d.]+)\)/);
      const top = stack[stack.length - 1];
      stack.push(t ? [top[0] + parseFloat(t[1]), top[1] + parseFloat(t[2])] : [...top]);
      continue;
    }
    const d = m[2].match(/d="([^"]*)"/);
    if (d) subPaths.push(points(d[1], stack[stack.length - 1]));
  }
}

const bounds = ps => ({
  x0: Math.min(...ps.map(p => p[0])), x1: Math.max(...ps.map(p => p[0])),
  y0: Math.min(...ps.map(p => p[1])), y1: Math.max(...ps.map(p => p[1]))
});

const all = bounds(subPaths.flat());
const ellipse = bounds(subPaths.reduce((a, b) => (b.length > a.length ? b : a)));
const cx = (ellipse.x0 + ellipse.x1) / 2;
const cy = (ellipse.y0 + ellipse.y1) / 2;

// Pad the viewBox symmetrically about the ellipse centre, so the game can draw
// the marker centred on the plot with no anchor fraction to carry around.
const hw = Math.max(cx - all.x0, all.x1 - cx);
const hh = Math.max(cy - all.y0, all.y1 - cy);

writeFileSync(MARKER,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(cx-hw).toFixed(2)} ${(cy-hh).toFixed(2)} ` +
  `${(hw*2).toFixed(2)} ${(hh*2).toFixed(2)}" width="${(hw*2).toFixed(2)}" height="${(hh*2).toFixed(2)}">` +
  `${one}</svg>\n`);

// The map is authored at 1920x1080 against a 960x540 game, hence the halving.
console.log(`wrote ${MARKER}`);
console.log(`  ellipse centre (${cx.toFixed(1)}, ${cy.toFixed(1)}) in map units`);
console.log(`  draw it ${(hw*2/2).toFixed(1)} x ${(hh*2/2).toFixed(1)} game px, centred on the plot`);
