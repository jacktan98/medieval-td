// DERIVE THE CAMPAIGN MAP'S GEOMETRY FROM THE ARTIST'S SVG.
//
// Reads assets/map/Overview_Map.svg and writes src/data/overview.js: where the
// ten stage markers sit, and the centreline of the road that leads into each of
// them. The game animates those centrelines — a leg draws itself when a stage is
// cleared, and a flag plants at its far end.
//
// DERIVED AND COMMITTED, exactly like Map_1_base.svg and for the same reason:
// there is no build step, so the artist's upload alone is not enough. Re-run this
// after every redraw of Overview_Map.svg or the game keeps the old road.
//
//   node tools/overview.mjs
//
// WHAT IT HAS TO FIND, and why none of it is hand-typed:
//
//   THE MARKERS are the ten paths filled #d30000. Their centres are the bounding
//   box centres, which is exact for the ellipse the artist drew and would still
//   be close enough for any blob.
//
//   THE ROAD is filled #ffde9e everywhere except the desert stretch, which is
//   #ffefd4 — the artist lightened it to sit on the sand. Both count.
//
//   A ROAD LEG IS A FILLED RIBBON, not a stroke: a closed outline that runs up
//   one side and back down the other. What the game needs is the CENTRELINE, so
//   the two sides have to be found and averaged. They cannot be found by looking
//   for the end caps — some legs cap with a line, some with a curve, and some
//   have straight sections in the middle that look exactly like a cap. See
//   centreline() for the method that does work.
//
//   LEGS ARE SPLIT WHERE A BRIDGE CROSSES THEM. The bridge is drawn on top in
//   brown, so the road under it simply stops and starts again ~120px later. Four
//   legs are split this way; they are rejoined here by matching loose ends.
//
// THE ROAD IS A TREE, NOT A CHAIN. It forks at marker 5: one branch runs east and
// up to the top-right corner, the other dead-ends in the bottom-left desert. So
// each stage is given the ONE leg that leads into it from its parent, rather than
// a leg per consecutive pair — which means the play order below can be shuffled
// without any leg becoming wrong.

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'assets/map/Overview_Map.svg';
const OUT = 'src/data/overview.js';
const SEPIA = 'assets/map/Overview_Map_sepia.svg';

// The artboard is 1920x1080 and the game is drawn in 960x540, so every
// coordinate is exactly halved. Not a fit or a scale-to-cover: the artist drew it
// at 2x, which is why nothing here has to letterbox.
const SCALE = 0.5;

const MARKER_FILL = '#d30000';
const ROAD_FILLS = new Set(['#ffde9e', '#ffefd4']);

// THE BEACH IS THE SAME COLOUR AS THE ROAD. It is one shape of 631,000 square
// units where the largest actual leg is 38,000, so size tells them apart with a
// margin of more than ten to one — and nothing else could, because the artist is
// using one sand colour for both and is right to.
//
// This mattered more than it looks. The first version of this file read paths
// with a regex that happened not to match the beach, so the count came out at 14
// and everything worked by luck. Reading the drawing properly found it, and
// feeding a landmass to centreline() would have produced a "road" through the
// middle of the sea.
const ROAD_MAX_AREA = 100000;

// How close a leg end has to be to a marker centre to count as arriving there,
// and to another leg's end to count as the far side of a bridge. The first is
// half the marker's drawn width plus slack; the second has to clear the widest
// bridge on the map (~135px) without joining two legs that merely pass near each
// other.
const AT_MARKER = 36;
const ACROSS_BRIDGE = 150;

// --- path parsing -----------------------------------------------------------

function parse(d) {
  const toks = d.match(/[MLCZmlcz]|-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || [];
  const out = [];
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    if (/[MLml]/.test(t)) { out.push([t.toUpperCase(), +toks[i + 1], +toks[i + 2]]); i += 3; }
    else if (/[Cc]/.test(t)) { out.push(['C', ...toks.slice(i + 1, i + 7).map(Number)]); i += 7; }
    else if (/[Zz]/.test(t)) { out.push(['Z']); i += 1; }
    else i += 1;
  }
  return out;
}

// Flatten to a dense closed polyline. 20 samples a curve is far more than the
// game needs to draw, but the pairing below is measured on these points and a
// coarse curve pairs badly with a fine one.
function flatten(cmds, per = 20) {
  const pts = [];
  let cur = null, start = null;
  for (const c of cmds) {
    if (c[0] === 'M' || c[0] === 'L') {
      cur = [c[1], c[2]];
      if (start === null) start = cur;
      pts.push(cur);
    } else if (c[0] === 'C') {
      const [, x1, y1, x2, y2, x3, y3] = c;
      const [x0, y0] = cur;
      for (let k = 1; k <= per; k++) {
        const t = k / per, m = 1 - t;
        pts.push([
          m * m * m * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3,
          m * m * m * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3
        ]);
      }
      cur = [x3, y3];
    }
  }
  if (pts.length && dist(pts[pts.length - 1], pts[0]) > 1e-6) pts.push(pts[0]);
  return pts;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Resample a closed polyline to n points evenly spaced by arc length.
function resampleClosed(poly, n) {
  const acc = [0];
  for (let i = 1; i < poly.length; i++) acc.push(acc[i - 1] + dist(poly[i - 1], poly[i]));
  const total = acc[acc.length - 1];
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = total * i / n;
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const seg = acc[j + 1] - acc[j];
    const t = seg === 0 ? 0 : (target - acc[j]) / seg;
    out.push([poly[j][0] + (poly[j + 1][0] - poly[j][0]) * t,
              poly[j][1] + (poly[j + 1][1] - poly[j][1]) * t]);
  }
  return out;
}

function resampleOpen(poly, n) {
  const acc = [0];
  for (let i = 1; i < poly.length; i++) acc.push(acc[i - 1] + dist(poly[i - 1], poly[i]));
  const total = acc[acc.length - 1];
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = total * i / (n - 1);
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const seg = acc[j + 1] - acc[j];
    const t = seg === 0 ? 0 : (target - acc[j]) / seg;
    out.push([poly[j][0] + (poly[j + 1][0] - poly[j][0]) * t,
              poly[j][1] + (poly[j + 1][1] - poly[j][1]) * t]);
  }
  return out;
}

// THE CENTRELINE OF A FILLED RIBBON.
//
// Walk the closed outline as M evenly spaced points. Somewhere on that loop is an
// offset K such that point i and point (K - i) are on OPPOSITE sides of the
// ribbon, directly across from each other — that is what "opposite" means on a
// shape that is long and thin. Search every K and keep the one where the paired
// points are closest on average; the ribbon's width is small and everything else
// on the loop is far apart, so the minimum is unambiguous.
//
// The two fixed points of i -> K - i are the ribbon's ends, half a loop apart,
// and the midpoints between each pair from one end to the other are the
// centreline. This needs no assumption about how the ends are drawn, which is why
// it survives caps that are lines on some legs and curves on others.
function centreline(d, N = 64) {
  const M = 2 * N;
  const loop = resampleClosed(flatten(parse(d)), M);

  let best = Infinity, bestK = 0;
  for (let K = 0; K < M; K++) {
    let cost = 0;
    for (let i = 0; i < M; i += 2) cost += dist(loop[i], loop[(((K - i) % M) + M) % M]);
    if (cost < best) { best = cost; bestK = K; }
  }

  const half = bestK >> 1;
  const line = [];
  for (let s = 0; s <= N; s++) {
    const i = (half + s) % M;
    const q = (((bestK - i) % M) + M) % M;
    line.push([(loop[i][0] + loop[q][0]) / 2, (loop[i][1] + loop[q][1]) / 2]);
  }
  return line;
}

// --- read the drawing -------------------------------------------------------

const svg = readFileSync(SRC, 'utf8');

// GROUPS CARRY TRANSFORMS, and half of them are mirrors. Graphite exports a
// building drawn once and flipped as `matrix(-1,0,0,1,...)` on the group around
// it, so the numbers inside that path are nowhere near where the building is
// drawn. Reading path data without walking the group stack finds the road and the
// markers — those happen to sit at the top level — and puts every building in the
// artboard hundreds of pixels from where it appears.
//
// That was worth catching rather than working around: the road and the markers
// come out identical either way, so nothing about the stages moved, but the depth
// pass below is entirely about where BUILDINGS are.
const IDENTITY = [1, 0, 0, 1, 0, 0];

// Standard 2D affine compose: the parent's frame applied to the child's.
const compose = (P, C) => [
  P[0] * C[0] + P[2] * C[1],
  P[1] * C[0] + P[3] * C[1],
  P[0] * C[2] + P[2] * C[3],
  P[1] * C[2] + P[3] * C[3],
  P[0] * C[4] + P[2] * C[5] + P[4],
  P[1] * C[4] + P[3] * C[5] + P[5]
];

const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function matrixOf(attrs) {
  const m = /transform="matrix\(([^)]+)\)"/.exec(attrs);
  if (!m) return IDENTITY;
  const n = m[1].split(',').map(Number);
  return n.length === 6 && n.every(Number.isFinite) ? n : IDENTITY;
}

const round = n => Math.round(n * 100) / 100;

// Rewrite a path's coordinates through a matrix, command by command. Every
// command in this file is M, L, C or Z with absolute coordinates — Graphite
// writes nothing else — so each one is a whole number of points and the letters
// come back out unchanged.
//
// Done through the parser rather than by substituting numbers in the string: a
// path whose M was rewritten as an L closes a shape that was never meant to
// close, and the difference does not show until something is drawn.
function transformPath(d, m) {
  if (m === IDENTITY) return d;
  const pt = (x, y) => { const [a, b] = apply(m, x, y); return `${round(a)},${round(b)}`; };
  let out = '';
  for (const c of parse(d)) {
    if (c[0] === 'Z') { out += 'Z'; continue; }
    if (c[0] === 'C') out += `C${pt(c[1], c[2])} ${pt(c[3], c[4])} ${pt(c[5], c[6])}`;
    else out += `${c[0]}${pt(c[1], c[2])}`;
  }
  return out;
}

const markers = [];
const legs = [];
// Every path, kept whole and placed where it is actually drawn, because the depth
// pass needs to know what each shape IS and where its feet are.
const shapes = [];

{
  const stack = [IDENTITY];
  const TAG = /<(\/?)(g|path)\b([^>]*)>/g;
  for (let t; (t = TAG.exec(svg));) {
    const [, close, name, attrs] = t;
    if (name === 'g') {
      if (close) stack.pop();
      else stack.push(compose(stack[stack.length - 1], matrixOf(attrs)));
      continue;
    }
    if (close) continue;

    const dm = /\bd="([^"]+)"/.exec(attrs);
    const fm = /\bfill="(#[0-9a-fA-F]{6})"/.exec(attrs);
    if (!dm || !fm) continue;

    const here = stack[stack.length - 1];
    const d = transformPath(dm[1], here);
    const fill = fm[1].toLowerCase();
    const nums = (d.match(/-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    shapes.push({ d, fill, box });

    const area = (box[2] - box[0]) * (box[3] - box[1]);
    if (fill === MARKER_FILL) markers.push([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]);
    else if (ROAD_FILLS.has(fill) && area <= ROAD_MAX_AREA) legs.push(centreline(d));
  }
}

if (markers.length !== 10) throw new Error(`expected 10 markers, found ${markers.length}`);
if (legs.length !== 14) throw new Error(`expected 14 road paths, found ${legs.length}`);

// --- stitch the road --------------------------------------------------------

// Which marker a loose end arrives at, or -1.
const markerAt = p => markers.findIndex(m => dist(p, m) <= AT_MARKER);

// Every leg, described by what each of its two ends touches.
const ends = legs.map((c, i) => ({
  i, line: c,
  a: markerAt(c[0]),
  b: markerAt(c[c.length - 1])
}));

// A leg that reaches a marker at both ends is already a whole connection.
const joined = [];
const used = new Set();
for (const L of ends) {
  if (L.a >= 0 && L.b >= 0) { joined.push({ from: L.a, to: L.b, line: L.line }); used.add(L.i); }
}

// Everything left has exactly one loose end, because a bridge cut it in half.
// Pair the halves by their loose ends and splice each pair into one line running
// marker -> gap -> marker. The gap itself is left as a straight join: the bridge
// is drawn on top of it, so nothing of that segment is ever visible.
const looseEnd = L => (L.a < 0 ? L.line[0] : L.line[L.line.length - 1]);
const farMarker = L => (L.a < 0 ? L.b : L.a);

for (const L of ends) {
  if (used.has(L.i)) continue;
  const mine = looseEnd(L);
  const mate = ends.find(O => !used.has(O.i) && O.i !== L.i &&
    dist(mine, looseEnd(O)) <= ACROSS_BRIDGE);
  if (!mate) continue;

  // Orient each half so the pair reads marker -> gap -> marker.
  const head = L.a < 0 ? [...L.line].reverse() : L.line;             // ends at the gap
  const tail = mate.a < 0 ? mate.line : [...mate.line].reverse();    // starts at the gap
  joined.push({ from: farMarker(L), to: farMarker(mate), line: [...head, ...tail] });
  used.add(L.i); used.add(mate.i);
}

// WHATEVER IS STILL UNPAIRED IS THE APPROACH: the road arriving from off the left
// edge of the artboard, with a marker at one end and nothing at all at the other.
// It is what a player with no progress sees drawn before their first flag.
const spare = ends.filter(L => !used.has(L.i));
if (spare.length !== 1) {
  throw new Error(`expected exactly one unpaired leg (the approach), found ${spare.length}`);
}
const approachLeg = spare[0];
// Point it AT its marker rather than away from it.
const approach = approachLeg.a >= 0 ? [...approachLeg.line].reverse() : approachLeg.line;
const approachAt = farMarker(approachLeg);

// --- the play order ---------------------------------------------------------

// THE OWNER'S ORDER, and the one thing in this file that is a decision rather
// than a measurement. Stage 1 is the top-left marker; from there the road is
// forced as far as marker 5, where it forks — east and up to the top-right
// corner, or south-west into the desert. This takes the desert as the detour and
// finishes in the corner.
//
// SHUFFLE IT FREELY. Each stage draws the leg that leads into it from its
// neighbour on the road, so reordering these cannot make a leg wrong; the only
// rule is that a stage must come after the one the road reaches it through.
const ORDER = [0, 1, 2, 3, 4, 5, 9, 7, 8, 6];

// WHICH MAP EACH STAGE PLAYS. Three are drawn; the rest are markers on a road
// with nothing behind them yet and the game shows them locked.
const LEVEL_OF = { 0: 0, 1: 1, 2: 2 };

// The approach has to arrive at whatever the order calls stage 1, or one of the
// two is wrong and the campaign would start in the middle of the road.
if (approachAt !== ORDER[0]) {
  throw new Error(`the approach road arrives at marker ${approachAt}, but ORDER starts at ${ORDER[0]}`);
}

// Walk out from stage 1 so every marker learns which leg reaches it.
const incoming = new Map([[ORDER[0], approach]]);
const seen = new Set([ORDER[0]]);
for (let pass = 0; pass < ORDER.length; pass++) {
  for (const J of joined) {
    for (const [near, far] of [[J.from, J.to], [J.to, J.from]]) {
      if (!seen.has(near) || seen.has(far)) continue;
      const line = J.from === near ? J.line : [...J.line].reverse();
      incoming.set(far, line);
      seen.add(far);
    }
  }
}
for (const m of ORDER) if (!incoming.has(m)) throw new Error(`marker ${m} is not on the road`);

// --- what stands in front of a marker ---------------------------------------

// THE MAP IS ONE FLAT PICTURE, so nothing in it can be behind anything the game
// draws on top. A stage medallion sitting on the ground beside a tower therefore
// covers the tower, which is exactly backwards: the tower is nearer the viewer.
//
// The fix is to name the shapes that stand IN FRONT of each marker and let the
// game redraw those, clipped to their own outlines, over the medallion. It is the
// same depth rule the board itself uses — see drawFigures in src/render.js —
// applied to a picture instead of a list: a thing whose FEET are lower on the
// screen is nearer, so it wins.
//
// Which shapes qualify:
//
//   IT HAS TO BE NEAR THE MARKER. Anything not touching the medallion's footprint
//   cannot occlude it, and emitting it would make the game redraw half the map.
//
//   ITS FEET HAVE TO BE LOWER. `box[3]`, the bottom of the shape, below the
//   marker's centre. A roof drawn high above the marker is behind it.
//
//   IT HAS TO BE AN OBJECT, not the ground. The terrain blobs pass both tests
//   above — the whole green landmass has feet at the bottom of the artboard — and
//   redrawing one would paint the entire map back over the medallion. Anything
//   bigger than a fiftieth of the artboard is scenery, not a building.
const ART = 1920 * 1080;
const BIG = ART / 50;

// The medallion's drawn footprint in artboard units: NODE_R in src/overview.js is
// 14 canvas px, so 28 here, and a little wider than tall because it is an ellipse
// lying on the ground rather than a disc facing the camera.
const FOOT_X = 34;
const FOOT_Y = 26;

function inFrontOf([mx, my]) {
  const out = [];
  for (const s of shapes) {
    if (s.fill === MARKER_FILL || ROAD_FILLS.has(s.fill)) continue;
    const [x0, y0, x1, y1] = s.box;
    if ((x1 - x0) * (y1 - y0) > BIG) continue;
    if (y1 <= my) continue;
    if (x1 < mx - FOOT_X || x0 > mx + FOOT_X) continue;
    if (y1 < my - FOOT_Y || y0 > my + FOOT_Y) continue;
    out.push(s.d);
  }
  return out;
}

// --- the same drawing, in browns --------------------------------------------

// A PARCHMENT MAP, and it is a recolour rather than a repaint: every fill keeps
// its brightness and loses its hue, which is the "turn it black and white, then
// tint it" the owner asked for. So the artist goes on drawing in colour and this
// derives the map the game shows.
//
// THE ONE PLACE IT IS NOT PURELY BRIGHTNESS is water. Blue reads bright to the
// formula — the sea comes out at 0.61 where the grass is 0.53 — so a straight
// conversion makes the sea LIGHTER than the land it cuts through, which is the
// wrong way round on every map ever drawn. Cool hues are pushed down; greens are
// nudged a hair to keep them off the mountains. Nothing else is touched.
const RAMP = [
  [0.00, [0x3B, 0x29, 0x17]],   // outlines and deep shadow
  [0.30, [0x7A, 0x59, 0x34]],
  [0.55, [0xA9, 0x81, 0x4E]],
  [0.78, [0xC9, 0xA8, 0x78]],
  [1.00, [0xEA, 0xDC, 0xB8]]    // the road, and paper
];

function hueOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return -1;                       // grey has no hue to bias
  const c = mx - mn;
  let h;
  if (mx === r) h = ((g - b) / c) % 6;
  else if (mx === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  return ((h * 60) % 360 + 360) % 360;
}

function sepia(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const h = hueOf(r, g, b);
  if (h >= 175 && h <= 265) L -= 0.14;            // water, and anything else cool
  else if (h >= 70 && h < 175) L -= 0.02;         // keep grass off the mountains
  L = Math.max(0, Math.min(1, L));

  let i = 0;
  while (i < RAMP.length - 2 && L > RAMP[i + 1][0]) i++;
  const [l0, c0] = RAMP[i], [l1, c1] = RAMP[i + 1];
  const t = l1 === l0 ? 0 : (L - l0) / (l1 - l0);
  const mix = k => Math.round(c0[k] + (c1[k] - c0[k]) * t)
    .toString(16).padStart(2, '0');
  return `#${mix(0)}${mix(1)}${mix(2)}`;
}

{
  const seen = new Map();
  const browned = svg.replace(/(fill|stroke)="(#[0-9a-fA-F]{6})"/g, (_, attr, hex) => {
    const key = hex.toLowerCase();
    if (!seen.has(key)) seen.set(key, sepia(key));
    return `${attr}="${seen.get(key)}"`;
  });
  writeFileSync(SEPIA, browned);
  console.log(`wrote ${SEPIA}`);
  console.log(`  ${seen.size} colour(s) mapped to browns`);
}

// --- write it out -----------------------------------------------------------

// 40 points a leg. The longest is ~380 artboard px, so that is a point every 5
// canvas px — smooth at the size it is drawn, and small enough that all ten legs
// together are a few kilobytes of source.
const POINTS = 40;
const px = n => Math.round(n * SCALE * 10) / 10;

const stages = ORDER.map((m, i) => ({
  marker: m,
  x: px(markers[m][0]),
  y: px(markers[m][1]),
  level: LEVEL_OF[i] ?? null,
  leg: resampleOpen(incoming.get(m), POINTS).map(([x, y]) => [px(x), px(y)]),
  // The shapes that stand in front of this marker, as the artist's own path data
  // in ARTBOARD units — not halved like everything else here, because the game
  // clips with them under a 0.5 scale and re-scaled path data would round twice.
  front: inFrontOf(markers[m])
}));

const body = `// THE CAMPAIGN MAP, DERIVED FROM THE ARTWORK. Do not edit by hand.
//
// Written by tools/overview.mjs from assets/map/Overview_Map.svg. Re-run it after
// every redraw of that file:
//
//   node tools/overview.mjs
//
// Coordinates are in the game's 960x540 space, halved from the 1920x1080
// artboard. \`leg\` is the centreline of the road that arrives at that stage,
// running from the previous stage to this one — the game reveals it a fraction at
// a time when the stage before it is cleared, then plants a flag at its end.
//
// Stage 1's leg comes in from off the left edge of the map, which is what a
// player with no progress at all sees drawn before their first flag.
//
// \`level\` indexes LEVELS in src/level.js, or is null for a marker the artist has
// drawn but that has no map behind it yet. The game draws those locked.

export const STAGES = ${JSON.stringify(stages, null, 2)
  .replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2]')};

// How many stages the campaign holds, which is a property of the drawing rather
// than of the game: markers exist ahead of the maps behind them.
export const STAGE_COUNT = STAGES.length;

// Which stages can actually be played. Everything else draws locked.
export const playable = i => STAGES[i] && STAGES[i].level !== null;
`;

writeFileSync(OUT, body);

const built = stages.filter(s => s.level !== null).length;
console.log(`wrote ${OUT}`);
console.log(`  ${stages.length} stages, ${built} playable, ${joined.length} road legs stitched`);
for (const [i, s] of stages.entries()) {
  console.log(`  stage ${String(i + 1).padStart(2)}  marker ${s.marker}  (${String(s.x).padStart(6)}, ${String(s.y).padStart(5)})  ` +
    `level ${s.level === null ? '-' : s.level}  leg ${s.leg.length}pts  ` +
    `${s.front.length} shape(s) in front`);
}
