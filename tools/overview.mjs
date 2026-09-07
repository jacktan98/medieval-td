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

// The artboard is 1920x1080 and the game is drawn in 960x540, so every
// coordinate is exactly halved. Not a fit or a scale-to-cover: the artist drew it
// at 2x, which is why nothing here has to letterbox.
const SCALE = 0.5;

const MARKER_FILL = '#d30000';
const ROAD_FILLS = new Set(['#ffde9e', '#ffefd4']);

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
    if (/[MLml]/.test(t)) { out.push(['ML', +toks[i + 1], +toks[i + 2]]); i += 3; }
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
    if (c[0] === 'ML') {
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

const markers = [];
const legs = [];
const RE = /<path\s+d="([^"]+)"\s+fill="(#[0-9a-fA-F]{6})"|<path\s+fill="(#[0-9a-fA-F]{6})"\s+d="([^"]+)"/g;
for (let m; (m = RE.exec(svg));) {
  const d = m[1] || m[4];
  const fill = (m[2] || m[3]).toLowerCase();
  if (fill === MARKER_FILL) {
    const nums = (d.match(/-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    markers.push([(Math.min(...xs) + Math.max(...xs)) / 2,
                  (Math.min(...ys) + Math.max(...ys)) / 2]);
  } else if (ROAD_FILLS.has(fill)) {
    legs.push(centreline(d));
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
  leg: resampleOpen(incoming.get(m), POINTS).map(([x, y]) => [px(x), px(y)])
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
    `level ${s.level === null ? '-' : s.level}  leg ${s.leg.length}pts`);
}
