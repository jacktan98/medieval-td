// Every sprite's ground shadow, and whether the anchors in the data files still
// sit on it.
//
//   node tools/shadow.mjs
//
// THE SHADOW IS WHERE A THING STANDS. The artist draws a grey ellipse under
// every building and every figure, and the centre of that ellipse is the anchor:
// `groundFrac` on a building, `pivot` on a figure, `deadPivot` on a body. It
// lands on the plot point, or on the walking position, or on the spot a man
// died. Anchoring by a bounding box instead is what stood the barracks 22px
// above its own plot — a box does not know which of its edges touches the floor.
//
// This prints every grey blob it can find, and then checks the anchor each data
// file currently holds against them. It does NOT pick for you, and that is
// deliberate — see below.

import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';

// Exactly this, in every file. Not a tolerance range on purpose: the artist uses
// one flat grey, and a near-miss should fail loudly rather than anchor slightly
// wrong.
const SHADOW = [150, 150, 150];

// --- minimal PNG reader (no dependencies, same rules as tools/trim.mjs) -------

function decode(buf) {
  let p = 8, w = 0, h = 0, bits = 0, colour = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bits = data[8]; colour = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += len + 12;
  }
  if (bits !== 8 || colour !== 6) throw new Error(`expected 8-bit RGBA, got bits=${bits} colour=${colour}`);
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h * 4);
  const stride = w * 4;
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[y * stride + x - 4] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, px };
}

// --- grey blobs ---------------------------------------------------------------

function blobs(img) {
  const { w: W, h: H, px } = img;
  const grey = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (px[i + 3] > 200 && px[i] === SHADOW[0] && px[i + 1] === SHADOW[1] && px[i + 2] === SHADOW[2]) grey[p] = 1;
  }
  const seen = new Int32Array(W * H).fill(-1);
  const out = [];
  for (let p = 0; p < W * H; p++) {
    if (!grey[p] || seen[p] >= 0) continue;
    const id = out.length, stack = [p];
    seen[p] = id;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
    const rows = new Map();
    while (stack.length) {
      const q = stack.pop(), x = q % W, y = (q / W) | 0;
      n++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const r = rows.get(y) || [1e9, -1];
      if (x < r[0]) r[0] = x;
      if (x > r[1]) r[1] = x;
      rows.set(y, r);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx;
        if (grey[np] && seen[np] < 0) { seen[np] = id; stack.push(np); }
      }
    }
    out.push({ minX, maxX, minY, maxY, n, rows });
  }
  return out.filter(b => b.n > 40);
}

// The centre of a part-hidden ellipse.
//
// The figure sits ON its shadow, so the top middle is painted over and only a
// crescent survives. A bounding box of that crescent has its centre too low — by
// 10px on the barracks tent, whose shadow is 20px covered. But an ellipse's
// leftmost and rightmost pixels lie exactly on its horizontal axis, and those
// tips are the part a figure standing in the middle never covers. So the tips
// give the centre line and the extremes in x give the centre column.
function centre(parts) {
  const rows = new Map();
  let minX = 1e9, maxX = -1;
  for (const p of parts) {
    for (const [y, [lo, hi]] of p.rows) {
      const r = rows.get(y) || [1e9, -1];
      rows.set(y, [Math.min(r[0], lo), Math.max(r[1], hi)]);
    }
    minX = Math.min(minX, p.minX);
    maxX = Math.max(maxX, p.maxX);
  }
  let wide = [-1, -1];
  const tips = [];
  for (const [y, [lo, hi]] of rows) {
    if (hi - lo > wide[1]) wide = [y, hi - lo];
    if (lo === minX || hi === maxX) tips.push(y);
  }
  const tipY = tips.reduce((a, b) => a + b, 0) / tips.length;
  return { x: (minX + maxX) / 2, y: (wide[0] + tipY) / 2, minX, maxX, widest: wide[0], tipY };
}

// --- what the data files claim ------------------------------------------------

const towers = await import('../src/data/towers.js');
const waves = await import('../src/data/waves.js');
const spear = towers.barracks[0].soldier, spear2 = towers.barracks[1].soldier;
const light = waves.enemyTypes.light_inf, heavy = waves.enemyTypes.heavy_inf;

// `whole` sprites have no grey anywhere except their shadow, so every blob is
// part of it and they are merged. The rest are figures, and the same flat grey
// is the metal on every spear, blade and mace in the set — so those get checked,
// not guessed. See the note at the bottom.
const SPRITES = [
  ['assets/towers/Archers_Tower_T1.png',   'watchtower.groundFrac',  towers.archery[0].spriteTrim, towers.archery[0].groundFrac, 'whole'],
  ['assets/towers/Archers_Tower_T2.png',   'watchtower2.groundFrac', towers.archery[1].spriteTrim, towers.archery[1].groundFrac, 'whole'],
  ['assets/towers/Barracks_Tower_T1.png',  'camp.groundFrac',        towers.barracks[0].spriteTrim, towers.barracks[0].groundFrac, 'whole'],
  ['assets/units/Archers_Man_T1.png',      'archer.gunnerPivot',     towers.archery[0].gunnerTrim, towers.archery[0].gunnerPivot],
  ['assets/units/Archers_Man_T2.png',      'archer2.gunnerPivot',    towers.archery[1].gunnerTrim, towers.archery[1].gunnerPivot],
  ['assets/units/Barracks_Man_T1.png',     'spearman.pivot',         spear.spriteTrim, spear.pivot],
  ['assets/units/Barracks_Man_T2.png',     'spearman2.pivot',        spear2.spriteTrim, spear2.pivot],
  ['assets/enemies/Enemies_Man_T1.png',    'light_inf.pivot',        light.spriteTrim, light.pivot],
  ['assets/enemies/Enemies_Man_T2.png',    'heavy_inf.pivot',        heavy.spriteTrim, heavy.pivot],
  ['assets/dead/Barracks_Man_Dead_T1.png', 'spearman.deadPivot',     spear.deadTrim, spear.deadPivot],
  ['assets/dead/Barracks_Man_Dead_T2.png', 'spearman2.deadPivot',    spear2.deadTrim, spear2.deadPivot],
  ['assets/dead/Enemies_Man_Dead_T1.png',  'light_inf.deadPivot',    light.deadTrim, light.deadPivot],
  ['assets/dead/Enemies_Man_Dead_T2.png',  'heavy_inf.deadPivot',    heavy.deadTrim, heavy.deadPivot]
];

// How far the held anchor may sit from the measured centre before it is wrong,
// in source px. 6 is under 1.5 game px on a 512 canvas and under 0.7 on a 1024,
// which is below anything visible, and it is tight enough to catch a re-export
// that moved a figure inside its canvas.
const TOLERANCE = 6;

let bad = 0;
console.log('sprite                          holds                     measured centre   held        off');
console.log('-'.repeat(100));

for (const [file, holder, trim, held, mode] of SPRITES) {
  const img = decode(readFileSync(file));
  const found = blobs(img);
  if (!found.length) { console.log(`${file.padEnd(31)} ${holder}   NO GREY FOUND`); bad++; continue; }

  const [tx, ty, tw, th] = trim;
  const heldPt = { x: tx + held[0] * tw, y: ty + held[1] * th };

  // Which blobs are the shadow: all of them on a tower, and on a figure the one
  // the held anchor already sits in — which is what makes this a check.
  let parts;
  if (mode === 'whole') {
    const main = found.reduce((a, b) => (b.n > a.n ? b : a));
    parts = found.filter(b => b.maxY >= main.minY && b.minY <= main.maxY);
  } else {
    parts = found.filter(b =>
      heldPt.x >= b.minX - 12 && heldPt.x <= b.maxX + 12 &&
      heldPt.y >= b.minY - 12 && heldPt.y <= b.maxY + 12);
  }

  if (!parts.length) {
    console.log(`${file.replace('assets/', '').padEnd(31)} ${holder.padEnd(25)} ` +
      `held [${held.join(', ')}] is not on any grey blob. Candidates:`);
    for (const b of found) {
      const c = centre([b]);
      console.log(`      x ${String(b.minX).padStart(3)}..${String(b.maxX).padStart(3)}  ` +
        `centre (${c.x.toFixed(1)}, ${c.y.toFixed(1)})  ->  ` +
        `[${((c.x - tx) / tw).toFixed(3)}, ${((c.y - ty) / th).toFixed(3)}]`);
    }
    bad++;
    continue;
  }

  const c = centre(parts);
  const off = Math.hypot(c.x - heldPt.x, c.y - heldPt.y);
  const ok = off <= TOLERANCE;
  if (!ok) bad++;
  console.log(
    `${file.replace('assets/', '').padEnd(31)} ${holder.padEnd(25)} ` +
    `(${c.x.toFixed(1)}, ${c.y.toFixed(1)})`.padEnd(18) +
    `[${((c.x - tx) / tw).toFixed(3)}, ${((c.y - ty) / th).toFixed(3)}]  ` +
    `${off.toFixed(1)}px` + (ok ? '' : `   WRONG — paste the fraction on the left`)
  );
}

// Why this checks instead of picking.
//
// The shadow grey is also the metal on every spear, blade and mace, so a figure
// has two to four grey blobs and the shadow is not reliably any of: the biggest
// (the dead heavy's blade is bigger), the lowest (the dead spearman's spear tip
// is lower), the widest (the dead militia's blade is wider), or the one with the
// figure standing on it (that blade has a head on it too). Every cheap rule was
// tried against all thirteen sprites and every one of them picks a weapon on at
// least one file.
//
// So the choice is made once, by eye, and lives in the data files; this verifies
// it still holds after an upload and prints the candidates when it does not.
//
// If you want it automatic: give the shadow a colour nothing else uses — 151 grey
// would do — and the ambiguity disappears in one line.
console.log(bad
  ? `\n${bad} anchor(s) no longer sit on a shadow. Paste the measured fractions above.`
  : '\nEvery anchor sits on its sprite\'s shadow, within ' + TOLERANCE + ' source px.');
process.exit(bad ? 1 : 0);
