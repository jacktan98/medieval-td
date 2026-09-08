// DERIVE THE CAMPAIGN MAP FROM THE ARTIST'S LAYERS.
//
// Reads assets/map/Overview_Map_Layer_*.svg and writes three things:
//
//   src/data/overview.js            where the stages are, the road into each of
//                                   them, and what stands in front of them
//   assets/map/Overview_Map_merged.svg  every layer stacked into one, in colour
//   assets/map/Overview_Map_sepia.svg   the same, muted, guides removed —
//                                   this is the one the game loads
//
// DERIVED AND COMMITTED, exactly like Map_1_base.svg and for the same reason:
// there is no build step, so the artist's upload alone is not enough. Re-run this
// after every redraw of any layer.
//
//   node tools/overview.mjs
//
// --- WHY THERE ARE LAYERS AT ALL ---------------------------------------------
//
// The map was one file until it got detailed enough to make Graphite struggle on
// the machine it is drawn on. Splitting it is the artist's own working
// arrangement, and it costs the game nothing: every layer is the SAME 1920x1080
// artboard, so stacking them is stacking, with no offsets and no arithmetic.
//
// LAYER 1 IS THE GUIDE, and it is not part of the picture. It holds the road and
// the ten markers on a plain green field: the road the game reveals a leg at a
// time, and the places the medallions stand. All of the geometry below is read
// off it, and then it is dropped — everything except its background, which is the
// grass the other layers sit on and the only opaque ground in the stack.
//
// LAYERS 2 AND UP ARE THE PICTURE, in the order they are numbered.
//
// --- WHAT IT HAS TO FIND, and why none of it is hand-typed -------------------
//
//   THE MARKERS are the ten paths filled #d30000. Their centres are the bounding
//   box centres, which is exact for the ellipse the artist drew and would still
//   be close enough for any blob.
//
//   THE ROAD is filled #ffde9e. On the old single-file map that colour was shared
//   with the beach and the two had to be told apart by size; the beach lives in
//   its own layer now and the guide holds nothing but road, so the size guard
//   below is a belt on top of braces.
//
//   A ROAD LEG IS A FILLED RIBBON, not a stroke: a closed outline that runs up
//   one side and back down the other. What the game needs is the CENTRELINE, so
//   the two sides have to be found and averaged. They cannot be found by looking
//   for the end caps — some legs cap with a line, some with a curve, and some
//   have straight sections in the middle that look exactly like a cap. See
//   centreline() for the method that does work.
//
//   THE ROAD COMES IN PIECES, and how many pieces a connection takes is the
//   artist's business. A leg may run marker to marker on its own, or a connection
//   may be a chain of several with the joins a few pixels apart. They are walked
//   end to end here rather than paired, so either works — see the note above the
//   walk for what changed and why pairing stopped being enough.
//
// THE ROAD IS A TREE, NOT A LINE. It forks: one branch runs east and up to the
// top-right corner, the other dead-ends in the south-west. So each stage is given
// the ONE leg that leads into it from its parent, rather than a leg per
// consecutive pair — which means the play order below can be shuffled without any
// leg becoming wrong.

import { readFileSync, writeFileSync } from 'node:fs';

import { readdirSync } from 'node:fs';

const DIR = 'assets/map';
const OUT = 'src/data/overview.js';
// NOT called Overview_Map.svg. That was the artist's own single file, and a
// DERIVED file wearing the name of a hand-drawn one is an invitation to open it,
// edit it, and lose the work on the next run of this tool. The layers are the
// source now; this is a stitched copy for looking at.
const MERGED = 'assets/map/Overview_Map_merged.svg';
const SEPIA = 'assets/map/Overview_Map_sepia.svg';

// Sorted by the number in the name, not by string, so a tenth layer lands after
// the ninth rather than after the first.
const LAYERS = readdirSync(DIR)
  .filter(f => /^Overview_Map_Layer_\d+\.svg$/.test(f))
  .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))
  .map(f => `${DIR}/${f}`);

if (LAYERS.length < 2) throw new Error(`expected layer files in ${DIR}, found ${LAYERS.length}`);

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

// How close a leg end has to be to a marker centre to count as arriving there:
// half the marker's drawn width plus slack. The distance between two legs that
// count as joined is JOIN, down beside the walk that uses it.
const AT_MARKER = 36;

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

// --- read the layers ---------------------------------------------------------

// Everything between a layer's artboard clip group and the end of the document,
// which is the layer's actual content. Found by counting groups rather than by
// matching to the end of the string, so a file that ever gains a trailing element
// does not swallow it.
function contentOf(svg, file) {
  const open = /<g\s+clip-path="url\(#(artboard-[^)"]+)\)"\s*>/.exec(svg);
  if (!open) throw new Error(`${file}: no artboard group`);
  const from = open.index + open[0].length;
  let depth = 1, i = from;
  const TAG = /<(\/?)g\b[^>]*?(\/?)>/g;
  TAG.lastIndex = from;
  for (let m; (m = TAG.exec(svg));) {
    if (m[2] === '/') continue;                 // self-closing group, no depth
    depth += m[1] ? -1 : 1;
    if (depth === 0) { i = m.index; break; }
    i = svg.length;
  }
  return { clip: open[1], body: svg.slice(from, i) };
}

// The background rect each export carries. Layer 1's is the grass every other
// layer sits on; the rest are fully transparent and are dropped.
const bgOf = svg => {
  const m = /<rect\s+fill="(#[0-9a-fA-F]{6})"(?![^>]*fill-opacity="0")[^>]*\/>/.exec(svg);
  return m ? m[1].toLowerCase() : null;
};

const IDENTITY = [1, 0, 0, 1, 0, 0];

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
// command in these files is M, L, C or Z with absolute coordinates — Graphite
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

// GROUPS CARRY TRANSFORMS, and many of them are mirrors — Graphite exports a
// building drawn once and flipped as matrix(-1,0,0,1,...). Reading path data
// without walking the group stack finds the guide layer perfectly, because it has
// no transforms at all, and puts every building in the picture layers hundreds of
// pixels from where it is drawn.
function shapesIn(body) {
  const out = [];
  const stack = [IDENTITY];
  const TAG = /<(\/?)(g|path)\b([^>]*)>/g;
  for (let t; (t = TAG.exec(body));) {
    const [, close, name, attrs] = t;
    if (name === 'g') {
      if (close) stack.pop();
      else if (!/\/$/.test(attrs.trim())) stack.push(compose(stack[stack.length - 1], matrixOf(attrs)));
      continue;
    }
    if (close) continue;

    const dm = /\bd="([^"]+)"/.exec(attrs);
    const fm = /\bfill="(#[0-9a-fA-F]{6})"/.exec(attrs);
    if (!dm || !fm) continue;

    const d = transformPath(dm[1], stack[stack.length - 1]);
    const nums = (d.match(/-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    out.push({ d, fill: fm[1].toLowerCase(),
               box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
  }
  return out;
}

const layers = LAYERS.map(file => {
  const svg = readFileSync(file, 'utf8');
  const { clip, body } = contentOf(svg, file);
  return { file, clip, body, background: bgOf(svg), shapes: shapesIn(body) };
});

// LAYER 1 IS THE GUIDE and nothing else reads from it. The markers and the road
// are both taken from here alone, so a red ellipse the artist draws in a picture
// layer is scenery rather than a stage — which is what lets the picture use any
// colour it likes.
const guide = layers[0];
const picture = layers.slice(1);

const GROUND = guide.background;
if (!GROUND) throw new Error(`${guide.file}: the guide layer has no background to use as ground`);

const markers = [];
const legs = [];
for (const s of guide.shapes) {
  const area = (s.box[2] - s.box[0]) * (s.box[3] - s.box[1]);
  if (s.fill === MARKER_FILL) markers.push([(s.box[0] + s.box[2]) / 2, (s.box[1] + s.box[3]) / 2]);
  else if (ROAD_FILLS.has(s.fill) && area <= ROAD_MAX_AREA) legs.push(centreline(s.d));
}

if (markers.length !== 10) throw new Error(`expected 10 markers in ${guide.file}, found ${markers.length}`);
if (legs.length < 2) throw new Error(`expected road legs in ${guide.file}, found ${legs.length}`);

// Everything drawn in the picture layers, which is what the depth pass searches.
const shapes = picture.flatMap(l => l.shapes);

// --- stitch the road --------------------------------------------------------

// THE ROAD IS DRAWN IN PIECES, and how many pieces a connection takes is the
// artist's business rather than the game's.
//
// It used to be two: a leg ran up to a bridge, stopped, and started again on the
// far side, and the tool paired the halves by their loose ends. The bridges are
// drawn ON the road now — the artist carried the path across them — so a
// connection can be a chain of three, and the pairing that assumed exactly two
// halves found five legs it could not place and stopped.
//
// So it walks instead of pairing. Start at a leg that touches a marker, follow it
// to its far end, and if that end is loose, hop to the nearest unused loose end
// and keep going until a marker turns up. One leg or six, it is the same walk —
// and a chain that never reaches a marker is reported rather than silently
// dropped.
//
// The hop distance is the one number to watch. Every real join in the current
// drawing is 23px or less; 40 clears them all with most of a marker's width to
// spare, and is small enough that two legs merely passing near each other cannot
// be mistaken for a join. It was 150 while a hop had to clear a whole bridge.
const JOIN = 40;

const markerAt = p => markers.findIndex(m => dist(p, m) <= AT_MARKER);

const ends = legs.map((line, i) => ({
  i, line,
  a: markerAt(line[0]),
  b: markerAt(line[line.length - 1])
}));

const used = new Set();

// The free end of a leg, given which end we came in by. `from` is the index of
// the end we started at, so the far end is the other one.
const tail = (L, fromA) => (fromA ? L.line[L.line.length - 1] : L.line[0]);
const oriented = (L, fromA) => (fromA ? L.line : [...L.line].reverse());
const farMarker = (L, fromA) => (fromA ? L.b : L.a);

// TAKE THE DOUBLING BACK OUT OF A JOINED LINE.
//
// The artist draws the road up to a bridge and the bridge's own piece starting a
// little way back along it, so the two OVERLAP. Laid end to end the line goes
// forward, back, and forward again — invisible on the map, but not in the dots,
// because the trail is spaced by ARC LENGTH. A 6px doubling spends 12px of walking
// without going anywhere, so two dots land almost on top of each other: measured
// at 3.4px apart where they should be 10, on all four bridges.
//
// Trimming at the seam was the obvious fix and it only half worked. The two pieces
// meet at an ANGLE, so "behind the direction of travel" tested at the join misses
// points that are behind the road while being ahead of that one line — it cleaned
// up one bridge of four, then two of four.
//
// This asks the simpler question instead, everywhere rather than at the seams: does
// this step reverse against the one before it? A road drawn by a person never does
// — the six legs with no seam in them have not one reversal between them — so any
// step that turns back more than ninety degrees is the overlap and nothing else.
// Dropping the point that causes it is enough, and comparing against the last KEPT
// direction rather than the original one lets a run of several go in a single pass.
//
// The last point is always kept: it is the marker the leg arrives at, and a leg
// that stops short of its own stage would fail the check in tools/campaign.mjs.
// A TURN SHARPER THAN THIS IS AN ARTEFACT, not a corner. The road is sampled
// every 4px or so and a person drawing one does not hairpin inside 4px; the six
// legs with no seam in them turn by at most a few degrees a step. 80 rather than
// 90 because the residual zigs after one pass came in at 105 and 114 degrees, and
// there is nothing between that and a genuine bend to protect.
const KINK = Math.cos(80 * Math.PI / 180);

const unit = (a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  return l ? [dx / l, dy / l] : null;
};

function unkink(line) {
  if (line.length < 3) return line;

  // ONE PASS IS NOT ENOUGH, and finding that out is what took two attempts.
  // Dropping a point changes the direction the NEXT point is judged against, so a
  // run of overlap can let its own tail through — both remaining bridges came back
  // with exactly one reversal left. Repeating until a pass changes nothing is the
  // only version that can promise none, and it converges in two or three.
  let out = line;
  for (let pass = 0; pass < 8; pass++) {
    const kept = [out[0]];
    let dir = null;
    for (let i = 1; i < out.length; i++) {
      const last = kept[kept.length - 1];
      const dx = out[i][0] - last[0], dy = out[i][1] - last[1];
      const len = Math.hypot(dx, dy);
      if (!len) continue;
      const d = [dx / len, dy / len];
      if (dir && d[0] * dir[0] + d[1] * dir[1] < KINK) continue;
      kept.push(out[i]);
      dir = d;
    }

    // THE FAR END IS ALWAYS KEPT: it is the marker the leg arrives at, and a leg
    // that stopped short of its own stage would fail tools/campaign.mjs.
    //
    // But pushing it back on blindly was a bug that hid the whole problem. When
    // the overlap is AT the marker end, the last point kept sits past it, so
    // adding the end reverses — the pass drops it, the push adds it back, and the
    // loop oscillates for ever while reporting one reversal left on three legs.
    // Whatever is in the way is popped instead, which converges.
    const end = out[out.length - 1];
    if (kept[kept.length - 1] !== end) {
      while (kept.length >= 2) {
        const a = kept[kept.length - 1], b = kept[kept.length - 2];
        const d1 = unit(b, a), d2 = unit(a, end);
        if (!d1 || !d2 || d1[0] * d2[0] + d1[1] * d2[1] >= KINK) break;
        kept.pop();
      }
      kept.push(end);
    }

    if (kept.length === out.length) return kept;
    out = kept;
  }
  return out;
}

// Walk out from one end of one leg, gathering legs until a marker or a dead end.
function walk(L, fromA) {
  let line = oriented(L, fromA);
  let far = farMarker(L, fromA);
  let here = L;
  let cameA = fromA;
  used.add(L.i);

  while (far < 0) {
    const p = tail(here, cameA);

    // The nearest unused leg with a loose end in reach. Nearest rather than first
    // found: with the road in this many pieces, two joins can be close together
    // and taking whichever the loop happened to reach first is an ordering
    // accident rather than a decision.
    let best = null;
    for (const O of ends) {
      if (used.has(O.i)) continue;
      for (const startA of [true, false]) {
        // entering O at the end nearest p means the end we come IN by is loose
        const entry = startA ? O.line[0] : O.line[O.line.length - 1];
        const isLoose = startA ? O.a < 0 : O.b < 0;
        if (!isLoose) continue;
        const d = dist(p, entry);
        if (d <= JOIN && (!best || d < best.d)) best = { O, startA, d };
      }
    }
    if (!best) return { line, to: -1 };

    used.add(best.O.i);
    line = [...line, ...oriented(best.O, best.startA)];
    here = best.O;
    cameA = best.startA;
    far = farMarker(best.O, best.startA);
  }
  return { line: unkink(line), to: far };
}

const joined = [];
let approach = null;
let approachAt = -1;

// Every leg that touches a marker starts a walk. A leg with markers at BOTH ends
// is a whole connection on its own and the walk ends immediately.
for (const L of ends) {
  for (const fromA of [true, false]) {
    if (used.has(L.i)) continue;
    const startMarker = fromA ? L.a : L.b;
    if (startMarker < 0) continue;

    const { line, to } = walk(L, fromA);
    if (to >= 0) { joined.push({ from: startMarker, to, line }); continue; }

    // A chain that ran out of road without finding a marker. There is exactly one
    // of those in a correct drawing — the approach, coming in from off the left
    // edge — and anything else is a leg the artist has left dangling.
    if (approach) {
      throw new Error(`two roads run off the map: from marker ${approachAt} and from marker ${startMarker}`);
    }
    approach = [...line].reverse();     // pointed AT its marker, not away
    approachAt = startMarker;
  }
}

const stranded = ends.filter(L => !used.has(L.i));
if (stranded.length) {
  throw new Error(`${stranded.length} road leg(s) touch no marker and no other leg — ` +
    stranded.map(L => `leg ${L.i}`).join(', '));
}
if (!approach) throw new Error('no road runs in from off the map; stage 1 has no opening');

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

// HOW MUCH OF THE MEDALLION A SHAPE MAY SWALLOW.
//
// This was 0.45 for one release, to keep a stage NUMBER readable under the
// crossbow sentry that stands almost on top of stage 3's marker. There are no
// numbers on the medallions any more — the owner took them off, on the grounds
// that which stage this is matters far less than where it is — so the reason for
// holding the scenery back has gone with them, and the owner's verdict on the
// uncapped version was that it was working fine.
//
// It is not raised all the way to 1, though. A medallion that vanishes completely
// is a stage that cannot be found or tapped, and a gold disc showing under the
// edge of a tower is all it takes to avoid that. This is the ceiling, not the
// target: nothing on the map currently comes near it.
const MOST_OF_IT = 0.88;

// MEASURED AS A UNION, not shape by shape. A building is not one path — the
// sentry beside stage 3 is a body, a roof, a window and a door — and each of the
// four covers well under half the medallion while the four together bury it.
// Testing them one at a time let every one through and changed nothing.
//
// So coverage is accumulated on a grid over the medallion's footprint, and a
// shape is taken only while the running total stays under the cap. Shapes are
// considered nearest-first, so when the budget runs out it is the furthest-back
// scenery that gets dropped.
const GRID_X = 24, GRID_Y = 18;

function inFrontOf([mx, my]) {
  const ex0 = mx - FOOT_X, ey0 = my - FOOT_Y;
  const cw = (FOOT_X * 2) / GRID_X, ch = (FOOT_Y * 2) / GRID_Y;
  const cells = GRID_X * GRID_Y;
  const covered = new Uint8Array(cells);
  let used = 0;

  const near = shapes
    .filter(s => {
      if (s.fill === MARKER_FILL || ROAD_FILLS.has(s.fill)) return false;
      const [x0, y0, x1, y1] = s.box;
      if ((x1 - x0) * (y1 - y0) > BIG) return false;
      if (y1 <= my) return false;
      return x1 >= ex0 && x0 <= ex0 + FOOT_X * 2 &&
             y1 >= ey0 && y0 <= ey0 + FOOT_Y * 2;
    })
    .sort((a, b) => b.box[3] - a.box[3]);      // lowest feet first: nearest first

  const out = [];
  for (const s of near) {
    const [x0, y0, x1, y1] = s.box;
    const hits = [];
    for (let gy = 0; gy < GRID_Y; gy++) {
      const cy = ey0 + (gy + 0.5) * ch;
      if (cy < y0 || cy > y1) continue;
      for (let gx = 0; gx < GRID_X; gx++) {
        const cx = ex0 + (gx + 0.5) * cw;
        if (cx < x0 || cx > x1) continue;
        const k = gy * GRID_X + gx;
        if (!covered[k]) hits.push(k);
      }
    }
    if ((used + hits.length) / cells > MOST_OF_IT) continue;
    for (const k of hits) covered[k] = 1;
    used += hits.length;
    out.push(s.d);
  }
  return out;
}

// --- the same drawing, muted -------------------------------------------------

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
// HOW MUCH LIFE COMES OUT OF EVERY HUE, and how far the result is then warmed
// towards parchment. Applied in that order — see the note in sepia() for why
// warming first destroys water and warming second does not.
//
// 0.55 and 0.28 is the pair that leaves grass readable as grass and sea readable
// as sea while putting both far enough back that a gold medallion wins. Raising
// DESATURATE walks towards the old full-sepia map; raising WARMTH walks towards
// it faster and takes the blues first.
const DESATURATE = 0.55;
const WARMTH = 0.28;

// AND NOTHING MAY END UP LOUDER THAN THIS, whatever it started as. The gold in a
// stage medallion runs from 96 up; a map colour at 72 sits plainly under it, and
// under the 80 tools/campaign.mjs holds the whole palette to.
const SATURATION_CEILING = 72;

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

// ONE WATER, NOT TWO. The artist drew the sea and rivers in a mid blue and the
// waterfall and its lake in a pale one, and through a brightness ramp those come
// out two clearly different browns — which reads as two different substances
// rather than one body of water catching the light. The owner asked for one, and
// the pale one is the one to keep: it is the lighter of the two, so the sea stops
// competing with the land for weight.
const WATER = '#61a6ff';
const WATERFALL = '#a6d5ff';

function sepia(hex) {
  if (hex === WATER) hex = WATERFALL;

  const r0 = parseInt(hex.slice(1, 3), 16);
  const g0 = parseInt(hex.slice(3, 5), 16);
  const b0 = parseInt(hex.slice(5, 7), 16);
  const isWater = hex === WATERFALL || (hueOf(r0, g0, b0) >= 175 && hueOf(r0, g0, b0) <= 265);

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const h = hueOf(r, g, b);
  // A SMALLER PUSH THAN IT USED TO BE. Blue reads bright to this formula, so a
  // straight conversion puts the sea lighter than the land it cuts through; the
  // correction was -0.14 while tone was the ONLY thing separating them. Hue does
  // most of that work now, so this only has to stop water floating above the land
  // rather than carry the whole distinction.
  if (h >= 175 && h <= 265) L -= 0.08;            // water, and anything else cool
  else if (h >= 70 && h < 175) L -= 0.02;         // keep grass off the mountains
  L = Math.max(0, Math.min(1, L));

  let i = 0;
  while (i < RAMP.length - 2 && L > RAMP[i + 1][0]) i++;
  const [l0, c0] = RAMP[i], [l1, c1] = RAMP[i + 1];
  const t = l1 === l0 ? 0 : (L - l0) / (l1 - l0);
  let rgb = [0, 1, 2].map(k => c0[k] + (c1[k] - c0[k]) * t);

  // AND THEN ONLY PART OF THE WAY THERE.
  //
  // FULL SEPIA WAS TRIED AND IT COST TOO MUCH. A luminance ramp separates land,
  // water and sand by TONE alone, and on a map with this much in it that is not
  // enough signal: the rivers came out within a few percent of the grass they run
  // through, and no ramp adjustment fixed that without flattening something else.
  // Hue was doing work brightness cannot do on its own.
  //
  // SO THE HUE STAYS, PULLED WELL DOWN, and the order of the two steps is the
  // whole trick. Blending straight towards the brown ramp was the obvious way and
  // it does not work: brown is the opposite of blue, so a mix that mutes grass
  // pleasantly destroys water completely — the sea came out a warm neutral with no
  // blue left in it at all.
  //
  // Each colour is desaturated towards ITS OWN grey instead, which takes the same
  // amount of life out of every hue rather than out of the cool ones only. Then
  // the whole thing is warmed a little towards the parchment answer, which is what
  // stops the result reading as a photograph with the saturation slider pulled
  // down. Water is still blue, grass is still green, and both sit far enough back
  // that the gold medallions and the blue flag are the brightest things on screen —
  // which was the point of desaturating in the first place.
  const raw = [r, g, b];
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  const muted = raw.map(v => v + (grey - v) * DESATURATE);
  rgb = muted.map((v, k) => v + (rgb[k] - v) * WARMTH);

  // AND A CEILING ON TOP OF THE FRACTION, because a fraction alone cannot promise
  // anything. Taking 55% of the life out of a colour leaves 45% of whatever it
  // started with, so the loudest thing on the map is however loud the loudest
  // thing the artist drew was — and layer 8 arrived with a gold at saturation 255
  // and an orange at 217, which came through at 105 and 95 where the medallions
  // sit at 96 and up. Two roofs were about to compete with the stage markers.
  //
  // So anything still over the ceiling is pulled the rest of the way to its own
  // grey. It bites on almost nothing — twelve of the fifteen shades are nowhere
  // near it — and it means a colour that has never been drawn yet cannot break the
  // rule when it arrives.
  const sat = Math.max(...rgb) - Math.min(...rgb);
  if (sat > SATURATION_CEILING) {
    const mid = (Math.max(...rgb) + Math.min(...rgb)) / 2;
    const k = SATURATION_CEILING / sat;
    rgb = rgb.map(v => mid + (v - mid) * k);
  }

  const chan = k => Math.round(Math.max(0, Math.min(255, rgb[k])))
    .toString(16).padStart(2, '0');
  return `#${chan(0)}${chan(1)}${chan(2)}`;
}

// THE ROAD AND THE MARKERS ARE TAKEN OUT OF THE PICTURE.
//
// They were the artist's guide for placing the medallions, and the game has read
// what it needed off them — the geometry above is derived from these very shapes.
// Leaving them drawn does two bad things: the road the game reveals a leg at a
// time sits on top of a road already painted in full, which makes the reveal
// decorative rather than informative; and a player can see the whole route and
// every waypoint on it before reaching any of them.
//
// So the display map is terrain only. What the player learns about the road, they
// learn by walking it.
//
// THE BEACH SURVIVES, and it is why this cannot simply drop everything in the two
// road fills: the sand the road is drawn in is the sand the beach is drawn in, and
// the beach is a landmass. Same area split as everywhere else in this file.
//
// STROKES ARE THINNED. Every shape in the artist's file carries a 4px outline,
// which at the size the map is drawn reads as a colouring book — one heavy line
// of one weight around everything, whether it is a mountain range or a window.
// Two thirds of that keeps the drawing legible and lets the fills do more of the
// work, which is what an old map looks like.
const STROKE_W = 2.6;

// Build one document out of the stack. `recolour` decides whether the fills go
// through the ramp, and `guides` whether layer 1's road and markers come with it.
//
// EVERY LAYER KEEPS ITS OWN CLIP, which is why the ids are left alone: Graphite
// gives each export a different artboard id, so seven of them can sit in one set
// of defs without colliding. If two ever did collide, one layer would be clipped
// by the other's rectangle — identical here, but not a thing to rely on.
function stack({ recolour, guides }) {
  const seen = new Map();
  const brown = hex => {
    const key = hex.toLowerCase();
    if (!seen.has(key)) seen.set(key, sepia(key));
    return seen.get(key);
  };

  let dropped = 0;
  const parts = [];
  const defs = [];

  const use = guides ? layers : picture;
  for (const l of use) {
    defs.push(`<clipPath id="${l.clip}"><rect x="0" y="0" width="1920" height="1080"/></clipPath>`);
    let body = l.body;

    // The guide's own shapes only ever go in when guides are asked for; the
    // picture layers are never filtered.
    if (l === guide && !guides) { body = ''; }

    parts.push(`<g clip-path="url(#${l.clip})">${body}</g>`);
  }

  let out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">`,
    `<defs>${defs.join('')}</defs>`,
    `<g>`,
    `<rect fill="${GROUND}" x="0" y="0" width="1920" height="1080"/>`,
    ...parts,
    `</g></svg>`
  ].join('\n');

  if (recolour) {
    // ONE PASS, over the whole document, after the stacking. A brown put through
    // the ramp a second time comes out a different brown and the map loses its
    // range: an earlier version browned each layer and then browned the file,
    // which doubled the conversion on every shape.
    out = out.replace(/(fill|stroke)="(#[0-9a-fA-F]{6})"/g,
      (_, attr, hex) => `${attr}="${brown(hex)}"`);

    // STROKES ARE THINNED. Every shape carries a 4px outline, which at the size
    // the map is drawn reads as a colouring book — one heavy line of one weight
    // around everything, whether it is a mountain range or a window. Two thirds
    // of that keeps the drawing legible and lets the fills do more of the work,
    // which is what an old map looks like.
    out = out.replace(/stroke-width="4"/g, `stroke-width="${STROKE_W}"`);
  }

  return { doc: out, colours: seen.size, dropped };
}

{
  const full = stack({ recolour: false, guides: true });
  writeFileSync(MERGED, full.doc);
  console.log(`wrote ${MERGED}`);
  console.log(`  ${layers.length} layer(s) stacked in colour, guides included`);

  const shown = stack({ recolour: true, guides: false });
  writeFileSync(SEPIA, shown.doc);
  console.log(`wrote ${SEPIA}`);
  console.log(`  ${picture.length} picture layer(s), ${shown.colours} colour(s) muted, guide layer dropped`);
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
