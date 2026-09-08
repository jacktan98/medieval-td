// Splits the map's flag into a pole that stands and a cloth that waves.
//
//   node tools/split-flag.mjs
//
// The owner drew Rally_Flag.svg as two paths — a brown pole and a blue pennant —
// and asked for the pole to stop waving with the cloth. One picture cannot do
// that: whatever is done to the drawing is done to the whole of it, and the old
// map flag was a single PNG sheared about its foot, so the pole leaned with the
// pennant.
//
// So this writes TWO derived files, committed:
//
//   Rally_Flag_pole.svg    the pole alone
//   Rally_Flag_cloth.svg   the pennant alone
//
// BOTH CARRY THE SAME viewBox, cropped to the two paths together. That is the
// whole trick: drawn into the same rectangle they land exactly where the artist
// put them, so overview.js can transform one and not the other and the cloth
// still meets the mast. Two separately-cropped files would each be flush to
// their own art and would have to be re-registered by hand.
//
// It also prints the three anchors the drawing implies, which src/overview.js
// holds as constants and tools/campaign.mjs checks against this same artwork.
//
// Rally_Flag.svg is never modified. Re-run after any redraw.

import { readFileSync, writeFileSync } from 'fs';

const SRC = process.argv[2] || 'assets/map/Rally_Flag.svg';
const POLE = 'assets/map/Rally_Flag_pole.svg';
const CLOTH = 'assets/map/Rally_Flag_cloth.svg';

// WHICH PATH IS WHICH, BY COLOUR. The pole is the brown one and the cloth is the
// blue one, which is how the artist tells them apart and does not depend on the
// order they happen to be written in — a redraw that reorders the file must not
// silently swap the two.
const POLE_FILL = '#74592e';
const CLOTH_FILL = '#055dab';

const svg = readFileSync(SRC, 'utf8');

// Every <path> with the transform its <g> carries. The file nests each path in a
// group with a matrix on it, so the matrix has to come along or the geometry is
// read in the wrong space.
function paths(s) {
  const out = [];
  const re = /<g transform="matrix\(([^)]*)\)">\s*(<path\b[^>]*\/>)/g;
  let m;
  while ((m = re.exec(s))) {
    const mat = m[1].split(',').map(Number);
    const path = m[2];
    const fill = (/fill="([^"]*)"/.exec(path) || [])[1] || '';
    const width = +((/stroke-width="([^"]*)"/.exec(path) || [])[1] || 0);
    const d = (/ d="([^"]*)"/.exec(path) || [])[1] || '';
    out.push({ mat, path, fill: fill.toLowerCase(), width, d });
  }
  return out;
}

// The corners of a path, in the space its matrix puts it in. The flag is drawn
// with straight segments only, so the points in the `d` ARE the outline and
// there is no curve to flatten.
function box(p) {
  const pts = [...p.d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]);
  if (!pts.length) throw new Error('a path in the flag has no points in it');
  const [a, b, c, d, e, f] = p.mat;
  const at = pts.map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  // TWO BOXES, AND THE DIFFERENCE MATTERS. The stroke is centred on the outline, so
  // half of it hangs outside: the CROP has to allow for that or the black edge is
  // shaved off, while the ANCHORS must not, because the cloth hangs from the pole's
  // drawn edge rather than from the outside of its outline. Reporting the inflated
  // box as the mast put the pivot two pixels into thin air.
  const half = (p.width * Math.abs(a)) / 2;
  const g = {
    x0: Math.min(...at.map(q => q[0])), x1: Math.max(...at.map(q => q[0])),
    y0: Math.min(...at.map(q => q[1])), y1: Math.max(...at.map(q => q[1]))
  };
  return { ...g, ink: { x0: g.x0 - half, x1: g.x1 + half, y0: g.y0 - half, y1: g.y1 + half } };
}

const all = paths(svg);
const pole = all.find(p => p.fill === POLE_FILL);
const cloth = all.find(p => p.fill === CLOTH_FILL);
if (!pole || !cloth) {
  throw new Error(`${SRC} needs a ${POLE_FILL} pole and a ${CLOTH_FILL} cloth — ` +
    `found ${all.map(p => p.fill).join(', ') || 'nothing'}`);
}

const pb = box(pole), cb = box(cloth);
const x0 = Math.min(pb.ink.x0, cb.ink.x0), x1 = Math.max(pb.ink.x1, cb.ink.x1);
const y0 = Math.min(pb.ink.y0, cb.ink.y0), y1 = Math.max(pb.ink.y1, cb.ink.y1);
const w = x1 - x0, h = y1 - y0;

const r = n => +n.toFixed(3);
const sheet = (p) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(x0)} ${r(y0)} ${r(w)} ${r(h)}" ` +
  `width="${r(w)}" height="${r(h)}">\n` +
  `<g transform="matrix(${p.mat.join(',')})">${p.path}</g>\n</svg>\n`;

writeFileSync(POLE, sheet(pole));
writeFileSync(CLOTH, sheet(cloth));

console.log(`${SRC} -> ${POLE}, ${CLOTH}`);
console.log(`shared viewBox  ${r(x0)} ${r(y0)} ${r(w)} ${r(h)}`);
console.log('');
console.log('The anchors src/overview.js holds, as fractions of that box:');
console.log(`  FLAG_FOOT  [${(((pb.x0 + pb.x1) / 2 - x0) / w).toFixed(4)}, 1]   the bottom of the pole`);
console.log(`  FLAG_MAST  ${((pb.x1 - x0) / w).toFixed(4)}           the edge the cloth hangs from`);
console.log(`  FLAG_HEAD  ${((cb.y0 - y0) / h).toFixed(4)}           the top of the cloth`);
console.log(`  FLAG_HEM   ${((cb.y1 - y0) / h).toFixed(4)}           and where it ends`);
