// Measure the family drawings.
//
//   node birthday/tools/art.mjs
//
// The numbers in src/data.js are pasted from here. It is the big game's
// tools/trim.mjs and tools/shadow.mjs boiled down to the two questions this
// folder actually has, and it borrows the big game's PNG decoder rather than
// carrying a third copy of one.
//
// TWO MEASUREMENTS PER DRAWING:
//
//   trim   the box of non-transparent pixels, so a 512x512 export is drawn as
//          the 144x168 of it that has ink on it.
//   pivot  where the drawing meets the ground, as a fraction of that box. The
//          artist paints a flat brown ellipse under every figure and the centre
//          of it is where they stand — anchoring to the bottom of the box
//          instead puts a figure holding a sword low and one holding nothing
//          high, and the error reads as the art having shifted.
//
// The nameplates have no shadow: they ARE the ground, so their anchor is simply
// the middle of the box, and the tool says so rather than guessing at a blob.

import { readFileSync } from 'fs';
import { decodeRGBA } from '../../tools/png.mjs';

const DIR = new URL('../assets/family/', import.meta.url);

// The artist's shadow brown, the same value the big game's figures use. Exact
// rather than a tolerance: a near miss should fail loudly rather than quietly
// measure somebody's hair.
const SHADOW = [54, 36, 7];
const ALPHA = 8;

const FIGURES = [
  'Papa_Default', 'Papa_Attack', 'Mommy_Default', 'Mommy_Attack',
  'Ella_Default', 'Ella_Attack', 'Rei_Default', 'Rei_Attack'
];
const FLAT = ['Papa_Plot', 'Mommy_Plot', 'Ella_Plot', 'Rei_Plot',
              'Ella_Slime', 'Mommy_Bullet', 'Rei_Smell'];

function read(name) {
  return decodeRGBA(readFileSync(new URL(`${name}.png`, DIR)));
}

function trim({ w, h, px }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] <= ALPHA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

// Every run of that brown, as connected blobs.
//
// THE COLOUR IS NOT ONLY THE SHADOW. Mommy's hair is painted the same brown as
// the ground she stands on, and reading every pixel of it as one shape put her
// anchor halfway up her back — 0.439 down a box whose true footing is 0.9. So
// the pixels are grouped first and only the LOWEST group is measured: whatever
// else the artist paints in this brown, the shadow is the part at the bottom.
function blobs({ w, h, px }) {
  const lit = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (px[i + 3] < 200) continue;
    if (px[i] === SHADOW[0] && px[i + 1] === SHADOW[1] && px[i + 2] === SHADOW[2]) lit[p] = 1;
  }

  const seen = new Uint8Array(w * h);
  const out = [];
  for (let p = 0; p < w * h; p++) {
    if (!lit[p] || seen[p]) continue;
    const stack = [p];
    seen[p] = 1;
    const rows = new Map();
    let minX = 1e9, maxX = -1, maxY = -1, n = 0;
    while (stack.length) {
      const q = stack.pop(), x = q % w, y = (q / w) | 0;
      n++;
      const r = rows.get(y) || [1e9, -1];
      rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (lit[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
      }
    }
    if (n > 40) out.push({ rows, minX, maxX, maxY });
  }
  return out;
}

// The shadow, by the tip rule the big game's tools/shadow.mjs explains at
// length: the figure stands on the middle of its own ellipse, so the top of it
// is painted over and a bounding box of what survives sits too low. The leftmost
// and rightmost pixels of an ellipse lie on its horizontal axis and are the part
// a figure in the middle never covers, so those tips give the centre line.
function ground(img) {
  const all = blobs(img);
  if (!all.length) return null;

  // The lowest group, plus anything sharing its floor — a figure planted in the
  // middle of its own shadow can cut it into a left and a right crescent, and
  // both halves are the same ellipse.
  const floor = Math.max(...all.map(b => b.maxY));
  const parts = all.filter(b => b.maxY >= floor - 6);

  const rows = new Map();
  let minX = 1e9, maxX = -1;
  for (const b of parts) {
    for (const [y, [lo, hi]] of b.rows) {
      const r = rows.get(y) || [1e9, -1];
      rows.set(y, [Math.min(r[0], lo), Math.max(r[1], hi)]);
    }
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
  }

  let widest = -1, span = -1;
  const tips = [];
  for (const [y, [lo, hi]] of rows) {
    if (hi - lo > span) { span = hi - lo; widest = y; }
    if (lo === minX || hi === maxX) tips.push(y);
  }
  const tipY = tips.reduce((a, b) => a + b, 0) / tips.length;
  return { x: (minX + maxX) / 2, y: (widest + tipY) / 2 };
}

const f3 = n => n.toFixed(3);

console.log('FIGURES — trim, then pivot as a fraction of it\n');
for (const name of FIGURES) {
  const img = read(name);
  const box = trim(img);
  const g = ground(img);
  if (!g) { console.log(`${name.padEnd(16)} NO SHADOW FOUND — is it painted ${SHADOW}?`); continue; }
  const px = (g.x - box[0]) / box[2];
  const py = (g.y - box[1]) / box[3];
  console.log(`${name.padEnd(16)} trim: [${box.join(', ')}]   pivot: [${f3(px)}, ${f3(py)}]`);
}

console.log('\nFLAT — trim only; these lie on the ground, so the anchor is the middle\n');
for (const name of FLAT) {
  console.log(`${name.padEnd(16)} trim: [${trim(read(name)).join(', ')}]`);
}

// How big each one lands on the board, and whether it survives it. The big game
// draws its figures at 105/512 of source and this folder uses the same scale, so
// a drawing is crisp while its drawn size times the 3x device-pixel cap fits
// inside its trim.
//
// TWO FILES ARE NOT DRAWN AT THAT SCALE and this table has to know, because
// without it the verdict lies in the most dangerous direction: it would report a
// comfortably sharp pellet that the game actually draws 60% bigger. Both are
// projectiles, both are tiny, and both are enlarged for the same reason — a
// 20-pixel pellet measured honestly is four pixels long and invisible to
// somebody who is five. The numbers are the `k` on each `shot` in src/data.js
// and have to be kept in step with it by hand; there are two of them.
const SCALE = 105 / 512;
const ZOOM = { Ella_Slime: 1.4, Mommy_Bullet: 1.6 };
const MAX = 3;
console.log('\nSHARPNESS at 105/512, capped at 3x device pixels\n');
for (const name of [...FIGURES, ...FLAT]) {
  const [, , w, h] = trim(read(name));
  const k = SCALE * (ZOOM[name] || 1);
  const dw = w * k, dh = h * k;
  const need = Math.max(dw * MAX, dh * MAX);
  const have = Math.max(w, h);
  const note = ZOOM[name] ? ` (x${ZOOM[name]})` : '';
  console.log(`${name.padEnd(16)} drawn ${dw.toFixed(1)} x ${dh.toFixed(1)}${note} ` +
              `— needs ${need.toFixed(0)} source px, has ${have} ${need <= have ? 'ok' : 'SOFT'}`);
}
