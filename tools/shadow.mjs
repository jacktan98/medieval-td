// Every sprite's ground shadow, and whether the anchors in the data files still
// sit on it.
//
//   node tools/shadow.mjs
//
// THE SHADOW IS WHERE A THING STANDS. The artist draws a flat ellipse under
// every building and every figure, and the centre of that ellipse is the anchor:
// `groundFrac` on a building, `pivot` on a figure, `deadPivot` on a body. It
// lands on the plot point, or on the walking position, or on the spot a man
// died. Anchoring by a bounding box instead is what stood the barracks 22px
// above its own plot — a box does not know which of its edges touches the floor.
//
// This prints every shadow blob it can find, and then checks the anchor each
// data file currently holds against them. It does NOT pick for you, and that is
// deliberate — see below.

import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';

// Exactly these, and there are two of them because the artist paints a building
// onto grass and a figure onto whatever it is standing on. Not tolerance ranges
// on purpose: each is one flat colour, and a near-miss should fail loudly rather
// than anchor slightly wrong.
//
// BOTH CHANGED IN THE LAST UPLOAD. Every shadow was 150,150,150 grey before, and
// that grey is still all over the set — it is the metal on every spear, blade
// and mace, and the stone footings under the tier 2 tower. Nothing warns you
// when an artist recolours a shadow, so the failure mode is this tool cheerfully
// measuring a spearhead; the check below is what catches it.
const GROUND = [55, 66, 47];    // under a building: dark green, drawn on grass
const FIGURE = [54, 36, 7];     // under a figure: dark brown

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

function blobs(img, SHADOW) {
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
    const rows = new Map(), cols = new Map();
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
      const c = cols.get(x) || [1e9, -1];
      if (y < c[0]) c[0] = y;
      if (y > c[1]) c[1] = y;
      cols.set(x, c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx;
        if (grey[np] && seen[np] < 0) { seen[np] = id; stack.push(np); }
      }
    }
    out.push({ minX, maxX, minY, maxY, n, rows, cols });
  }
  return out.filter(b => b.n > 40);
}

// A BUILDING'S shadow: fit the whole ellipse.
//
// Two unknowns matter and both are hidden. The tent stands on the top of its own
// ellipse, and the tower has a log lying across the left of its one and a ladder
// planted on the right — so the left tip and the right tip are covered at
// DIFFERENT heights, which is exactly the case the tip rule below cannot handle.
// Reading the tips put the tier 1 tower 9px above its own plot.
//
// So the outline is fitted instead, as an axis-aligned ellipse
// x^2 + Cy^2 + Dx + Ey + F = 0, re-fitted a few times while dropping the worst
// points each round. Occluded boundary lies INSIDE the true ellipse, so it shows
// up as a large residual and falls out; the surviving arc decides the answer.
//
// The check that this is real rather than plausible: the tier 1 tower's shadow
// is a single <path> in the artist's SVG, and the ellipse it describes has its
// centre at (507.9, 736.1). The fit reads (507.3, 735.6) out of the PNG without
// being shown the SVG at all.
function fit(parts) {
  const edge = [], rows = new Map(), cols = new Map();
  for (const p of parts) {
    for (const [y, [lo, hi]] of p.rows) {
      const r = rows.get(y) || [1e9, -1];
      rows.set(y, [Math.min(r[0], lo), Math.max(r[1], hi)]);
    }
    for (const [x, [lo, hi]] of p.cols) {
      const c = cols.get(x) || [1e9, -1];
      cols.set(x, [Math.min(c[0], lo), Math.max(c[1], hi)]);
    }
  }
  for (const [y, [lo, hi]] of rows) edge.push([lo, y], [hi, y]);
  for (const [x, [lo, hi]] of cols) edge.push([x, lo], [x, hi]);

  let use = edge, sol = null;
  for (let round = 0; round < 8; round++) {
    const M = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], v = [0,0,0,0];
    for (const [x, y] of use) {
      const r = [y*y, x, y, 1], b = -(x*x);
      for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) M[i][j] += r[i]*r[j]; v[i] += r[i]*b; }
    }
    const A = M.map((row, i) => [...row, v[i]]);
    for (let c = 0; c < 4; c++) {
      let p = c;
      for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 4; r++) {
        if (r === c) continue;
        const k = A[r][c] / A[c][c];
        for (let j = c; j < 5; j++) A[r][j] -= k * A[c][j];
      }
    }
    const C = A[0][4]/A[0][0], D = A[1][4]/A[1][1], E = A[2][4]/A[2][2], F = A[3][4]/A[3][3];
    const cx = -D / 2, cy = -E / (2 * C);
    const a = Math.sqrt(cx*cx + C*cy*cy - F), b = a / Math.sqrt(C);
    sol = { x: cx, y: cy, a, b };
    const keep = Math.max(20, Math.round(edge.length * (0.85 - round * 0.05)));
    use = edge
      .map(p => ({ p, r: Math.abs(Math.hypot((p[0]-cx)/a, (p[1]-cy)/b) - 1) }))
      .sort((m, n) => m.r - n.r).slice(0, keep).map(o => o.p);
  }
  return sol;
}

// A FIGURE'S shadow: read the tips.
//
// The fit above is wrong for these and it is worth knowing why, because the
// obvious tidy-up is to use one method for everything. A figure's shadow is 58px
// across and 14px tall, and the figure stands on the middle of it — so the arc
// that survives is a thin sliver with almost no curvature in y, and the fit
// happily runs a much taller ellipse through it. On the tier 1 archer it lands
// 13px high. Measured against all ten figures, the tip rule is exact and the fit
// is not; on the four buildings it is the other way round.
//
// The tip rule: the figure sits ON its shadow, so the top middle is painted over
// and only a crescent survives. A bounding box of that crescent has its centre
// too low. But an ellipse's leftmost and rightmost pixels lie exactly on its
// horizontal axis, and those tips are the part a figure standing in the middle
// never covers. So the tips give the centre line and the extremes in x give the
// centre column.
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
const spear3 = towers.barracks[2].soldier;
const light = waves.enemyTypes.light_inf, heavy = waves.enemyTypes.heavy_inf;

// `whole` sprites are the buildings: nothing else in those files is painted the
// ground colour, so every blob of it is part of one ellipse and they are fitted
// together. The rest are figures, and their brown is also the leather and the
// shafts on several of them — so those get checked, not guessed. See the note at
// the bottom.
const SPRITES = [
  ['assets/towers/archery/Archery_Tower_T1.png',    'watchtower.groundFrac',  towers.archery[0].spriteTrim, towers.archery[0].groundFrac, 'whole'],
  ['assets/towers/archery/Archery_Tower_T2.png',    'watchtower2.groundFrac', towers.archery[1].spriteTrim, towers.archery[1].groundFrac, 'whole'],
  ['assets/towers/archery/Archery_Tower_T3.png',    'watchtower3.groundFrac', towers.archery[2].spriteTrim, towers.archery[2].groundFrac, 'whole'],
  ['assets/towers/barracks/Barracks_Tower_T1.png',   'camp.groundFrac',        towers.barracks[0].spriteTrim, towers.barracks[0].groundFrac, 'whole'],
  ['assets/towers/barracks/Barracks_Tower_T2.png',   'camp2.groundFrac',       towers.barracks[1].spriteTrim, towers.barracks[1].groundFrac, 'whole'],
  ['assets/towers/barracks/Barracks_Tower_T3.png',   'camp3.groundFrac',       towers.barracks[2].spriteTrim, towers.barracks[2].groundFrac, 'whole'],
  // ALL THREE CATAPULT FRAMES, against the SAME trim and the SAME anchor, and
  // that is the check rather than a repetition of it. The machine animates by
  // swapping which file is drawn into one unchanging box, so if the three
  // shadows are not in the same place the catapult will visibly hop on its plot
  // every second. Checking one frame would not catch it; checking all three
  // against one number is exactly the question.
  //
  // Fire reads about 2 source px high — half a game pixel — because the raised
  // arm covers a different part of the ellipse than the lowered one does. The
  // resting pose is what the held number comes from.
  ['assets/towers/artillery/Artillery_Default_T1.png', 'catapult.groundFrac', towers.siege[0].spriteTrim, towers.siege[0].groundFrac, 'whole'],
  ['assets/towers/artillery/Artillery_Reload_T1.png',  'catapult.groundFrac', towers.siege[0].spriteTrim, towers.siege[0].groundFrac, 'whole'],
  ['assets/towers/artillery/Artillery_Fire_T1.png',    'catapult.groundFrac', towers.siege[0].spriteTrim, towers.siege[0].groundFrac, 'whole'],
  ['assets/units/Archery_Man_T1.png',       'archer.gunnerPivot',     towers.archery[0].gunnerTrim, towers.archery[0].gunnerPivot],
  ['assets/units/Archery_Man_T2.png',       'archer2.gunnerPivot',    towers.archery[1].gunnerTrim, towers.archery[1].gunnerPivot],
  ['assets/units/Archery_Man_T3.png',       'archer3.gunnerPivot',    towers.archery[2].gunnerTrim, towers.archery[2].gunnerPivot],
  // The catapult crewman. He is not drawn on the board — he is already part of
  // all three machine frames — but the info box and the encyclopedia both stand
  // him on his own, and a figure standing anywhere in this game stands on its
  // shadow. Without a pivot he was the one man on the page centred by his
  // bounding box while everyone beside him was anchored properly.
  ['assets/units/Artillery_Man_T1.png',     'catapult.portraitPivot', towers.siege[0].portraitTrim, towers.siege[0].portraitPivot],
  ['assets/units/Barracks_Man_T1.png',      'spearman.pivot',         spear.spriteTrim, spear.pivot],
  ['assets/units/Barracks_Man_T2.png',      'spearman2.pivot',        spear2.spriteTrim, spear2.pivot],
  ['assets/units/Barracks_Man_T3.png',      'spearman3.pivot',        spear3.spriteTrim, spear3.pivot],
  ['assets/enemies/Enemies_Man_T1a.png',    'light_inf.pivot',        light.spriteTrim, light.pivot],
  ['assets/enemies/Enemies_Man_T1b.png',    'heavy_inf.pivot',        heavy.spriteTrim, heavy.pivot],
  ['assets/dead/Barracks_Man_Dead_T1.png',  'spearman.deadPivot',     spear.deadTrim, spear.deadPivot],
  ['assets/dead/Barracks_Man_Dead_T2.png',  'spearman2.deadPivot',    spear2.deadTrim, spear2.deadPivot],
  ['assets/dead/Barracks_Man_Dead_T3.png',  'spearman3.deadPivot',    spear3.deadTrim, spear3.deadPivot],
  ['assets/dead/Enemies_Man_Dead_T1a.png',  'light_inf.deadPivot',    light.deadTrim, light.deadPivot],
  ['assets/dead/Enemies_Man_Dead_T1b.png',  'heavy_inf.deadPivot',    heavy.deadTrim, heavy.deadPivot]
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
  const found = blobs(img, mode === 'whole' ? GROUND : FIGURE);
  if (!found.length) { console.log(`${file.padEnd(31)} ${holder}   NO SHADOW COLOUR FOUND`); bad++; continue; }

  const [tx, ty, tw, th] = trim;
  const heldPt = { x: tx + held[0] * tw, y: ty + held[1] * th };

  // Which blobs are the shadow: all of them on a building, and on a figure the
  // one the held anchor already sits inside — which is what makes this a check.
  // Strictly inside, not within a few pixels: the militia's club and the dead
  // heavy's boots are the same brown and sit close enough that a padded box
  // swallows them, and one stray blob drags the answer 20px.
  let parts;
  if (mode === 'whole') {
    parts = found;
  } else {
    parts = found.filter(b =>
      heldPt.x >= b.minX && heldPt.x <= b.maxX &&
      heldPt.y >= b.minY && heldPt.y <= b.maxY);
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

  const c = mode === 'whole' ? fit(parts) : centre(parts);
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
// The figure shadow's brown is also the club, the boots and the leather on
// several of them, so a figure has two or three brown blobs and the shadow is
// not reliably any of: the biggest, the lowest, the widest, or the one with the
// figure standing on it. Every cheap rule was tried against all ten and every one
// of them picks the wrong blob on at least one file.
//
// So the choice is made once, by eye, and lives in the data files; this verifies
// it still holds after an upload and prints the candidates when it does not.
//
// The BUILDINGS do not have this problem — their green is used for nothing else,
// so all four are measured outright. If you want the figures automatic too, give
// their shadow a colour nothing else in the drawing uses and the ambiguity
// disappears in one line.
console.log(bad
  ? `\n${bad} anchor(s) no longer sit on a shadow. Paste the measured fractions above.`
  : '\nEvery anchor sits on its sprite\'s shadow, within ' + TOLERANCE + ' source px.');
process.exit(bad ? 1 : 0);
