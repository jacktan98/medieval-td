// Pulls the road's centreline out of a map, as the waypoints enemies walk.
//
//   node tools/trace-road.mjs assets/map/Map_2.svg
//
// The art is the source of truth for where the road is; src/data/level*.js only
// has to agree with it. Map 1's polyline was extracted this way once and the
// tool was never committed, so when map 2 arrived there was nothing to re-run —
// which is the whole reason this file exists. Run it after any redraw and paste
// the result rather than nudging numbers by hand.
//
// It does NOT rasterise. The road is a single filled path in the artist's
// exports, so the shape is read straight out of the SVG and tested analytically
// with a point-in-polygon. There is no image decoder in this project and no npm
// to install one, the same constraint that makes tools/trim.mjs read PNGs by
// hand and tools/audio.mjs parse MP3 frames.
//
// A BRANCHING road is the point of the rewrite. Map 2 has two entries that
// merge into one exit, so a single ridge walk from end to end cannot describe
// it. Instead every entry gets its own route to the exit, and where the roads
// have merged the two routes simply agree — which is exactly what the game
// wants, since a route is just a list of waypoints and two of them sharing a
// tail costs nothing.

import { readFileSync } from 'fs';
import { shapesByFill } from './svg.mjs';

const SRC = process.argv[2] || 'assets/map/Map_2.svg';

// The artist's road colour, in both maps so far.
const ROAD = '#ffde9e';

// The map is drawn at 1920x1080 and the game is 960x540.
const SCALE = 0.5;
const W = 960, H = 540;

// Grid step for the search, in game px. 2 is fine: the road is ~70px wide, so a
// 2px cell still has 35 cells across it, and the polyline gets simplified to
// about twenty points afterwards anyway.
const STEP = 2;
const GW = Math.ceil(W / STEP), GH = Math.ceil(H / STEP);

// How hard the walk is pulled toward the middle of the road. The cost of a step
// is its length times (1 + PULL * offCentre^2), where offCentre is 0 on the
// ridge and 1 at the kerb — so a detour is worth it only if it buys a lot of
// clearance. Too low and the route cuts corners onto the grass; too high and it
// wanders looking for the exact ridge and comes out wobbly.
const PULL = Number(process.env.PULL || 10);

// How many grid cells either side the raw walk is averaged over before it is
// simplified. Wider than it first looks it needs to be, and the reason is the
// junction: where two roads meet, the widest point of the tarmac is up in the
// crotch of the Y, well off the line either road actually takes through it. The
// ridge is genuinely there, so no amount of tuning PULL removes it — the first
// run put a 40px spike in both routes at exactly that spot. A window of 12
// cells is 48px, wide enough to average the spike away without rounding off the
// bends that matter.
const SMOOTH = Number(process.env.SMOOTH || 12);

// How far a simplified point may sit from the traced line, in game px. The road
// is 70 wide, so 3px of error is invisible and cuts the point count by 20x.
const TOLERANCE = 3;

// --- the road as a polygon ---------------------------------------------------

const svg = readFileSync(SRC, 'utf8');
const roads = shapesByFill(svg).filter(s => (s.fill || '').toLowerCase() === ROAD);
if (!roads.length) throw new Error(`no shape filled ${ROAD} in ${SRC}`);

// Game-space rings. One `d` can hold several sub-paths; they are split on the
// jumps the flattener leaves between them.
const poly = roads.flatMap(s => s.pts).map(p => [p[0] * SCALE, p[1] * SCALE]);

console.log(`${SRC}: ${roads.length} road shape(s), ${poly.length} points`);

// Even-odd point-in-polygon over the whole ring soup. The road is one closed
// outline in both maps, so this is a single ring in practice.
function inside(x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// --- mask and clearance ------------------------------------------------------

const road = new Uint8Array(GW * GH);
for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    road[gy * GW + gx] = inside(gx * STEP + STEP / 2, gy * STEP + STEP / 2) ? 1 : 0;
  }
}

// Clearance: distance from each road cell to the nearest grass, by chamfer.
//
// Off the LEFT and RIGHT edges is not grass — the road runs off the side of the
// canvas and continues. Seeding a wall there would make the mouth of every road
// look like a dead end, and the route would bend away from its own entry to
// avoid it. Off the top and bottom is grass, which it genuinely is.
const clear = new Float32Array(GW * GH);
for (let i = 0; i < road.length; i++) clear[i] = road[i] ? Infinity : 0;

const NEIGHBOURS = [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
                    [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414]];

const chamfer = order => {
  for (const [gx, gy] of order) {
    const i = gy * GW + gx;
    if (!road[i]) continue;
    for (const [dx, dy, w] of NEIGHBOURS) {
      const nx = gx + dx, ny = gy + dy;
      // Sideways off-canvas: the road goes on, so this neighbour constrains
      // nothing. Vertically off-canvas: grass, so it is a wall at distance 0
      // and falls out of the `road[ni]` test below anyway.
      if (nx < 0 || nx >= GW) continue;
      const nv = (ny < 0 || ny >= GH) ? 0 : clear[ny * GW + nx];
      if (nv + w < clear[i]) clear[i] = nv + w;
    }
  }
};

const fwd = [];
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) fwd.push([gx, gy]);
const rev = [...fwd].reverse();
for (let pass = 0; pass < 3; pass++) { chamfer(fwd); chamfer(rev); }

let maxClear = 0;
for (const c of clear) if (isFinite(c) && c > maxClear) maxClear = c;

// --- where the road meets the edges ------------------------------------------
//
// A run of road cells down the first or last column is a mouth. Two on the left
// and one on the right is map 2; one of each is map 1.
function mouths(gx) {
  const out = [];
  let run = null;
  for (let gy = 0; gy < GH; gy++) {
    if (road[gy * GW + gx]) { if (!run) run = { a: gy, b: gy }; else run.b = gy; }
    else if (run) { out.push(run); run = null; }
  }
  if (run) out.push(run);
  // Ignore slivers — a couple of cells is the corner of a kerb, not a road.
  return out.filter(r => (r.b - r.a + 1) * STEP > 20);
}

const entries = mouths(0);
const exits = mouths(GW - 1);
console.log(`  ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} on the left, ${exits.length} exit(s) on the right`);
if (!entries.length || !exits.length) throw new Error('road does not reach both edges');

const mid = (gx, run) => [gx, Math.round((run.a + run.b) / 2)];

// --- ridge walk --------------------------------------------------------------
//
// Dijkstra from the exit, so one sweep serves every entry. Cost per step is its
// length times a penalty for being off the ridge, which is what keeps the route
// down the middle of the tarmac instead of cutting the inside of every bend.

function costField(goal) {
  // Float64, and it has to be. With a Float32Array the distance written into
  // the grid is rounded while the copy carried in the heap is not, so the stale
  // check `d > dist[i]` fires on a node that is not stale — it is the same node,
  // half an ulp apart. The pop is discarded, that node never expands, and
  // everything behind it is unreachable. It presented as "an entry cannot reach
  // the exit" on a road a flood fill crosses without trouble, and it moved
  // around when unrelated constants changed, because which node loses the
  // rounding depends on the exact costs.
  const dist = new Float64Array(GW * GH).fill(Infinity);
  const from = new Int32Array(GW * GH).fill(-1);
  const gi = goal[1] * GW + goal[0];
  dist[gi] = 0;

  // A simple binary heap. There are ~65k cells; an array scan would be O(n^2).
  const heap = [[0, gi]];
  const push = (d, i) => {
    heap.push([d, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]]; c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1, r = l + 1;
        let s = p;
        if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
        if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
        if (s === p) break;
        [heap[p], heap[s]] = [heap[s], heap[p]]; p = s;
      }
    }
    return top;
  };

  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const gx = i % GW, gy = (i / GW) | 0;

    for (const [dx, dy, w] of [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
                               [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414]]) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      const ni = ny * GW + nx;
      if (!road[ni]) continue;
      const off = 1 - Math.min(1, clear[ni] / maxClear);
      const nd = d + w * (1 + PULL * off * off);
      if (nd < dist[ni]) { dist[ni] = nd; from[ni] = i; push(nd, ni); }
    }
  }
  return { dist, from };
}

const { dist, from } = costField(mid(GW - 1, exits[0]));

function routeFrom(start) {
  let i = start[1] * GW + start[0];
  if (!isFinite(dist[i])) throw new Error('an entry cannot reach the exit — is the road connected?');
  const pts = [];
  while (i >= 0) {
    pts.push([(i % GW) * STEP + STEP / 2, ((i / GW) | 0) * STEP + STEP / 2]);
    i = from[i];
  }
  return pts;
}

// --- simplify ----------------------------------------------------------------

// An 8-connected grid cannot draw a smooth diagonal — it staircases by a cell
// either way, and on a road that runs at 20 degrees that reads as a 30px
// wobble in the finished polyline. Simplifying does not remove it, because the
// wobble is bigger than any tolerance worth using.
//
// So the raw walk is averaged over a window first. The ends are PINNED: they
// sit in the mouth of the road and an average would drag them inward, which is
// the one place the polyline has to be exact.
function smooth(pts, window) {
  if (pts.length < 3) return pts;
  const out = pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const a = Math.max(0, i - window), b = Math.min(pts.length - 1, i + window);
    let sx = 0, sy = 0;
    for (let k = a; k <= b; k++) { sx += pts[k][0]; sy += pts[k][1]; }
    return [sx / (b - a + 1), sy / (b - a + 1)];
  });
  return out;
}

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let far = 0, best = -1;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const L = Math.hypot(bx - ax, by - ay) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
    if (d > far) { far = d; best = i; }
  }
  if (far <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, best + 1), tol).slice(0, -1), ...simplify(pts.slice(best), tol)];
}

// --- print -------------------------------------------------------------------
//
// Ends are pushed off-canvas along the road's own slope there, so enemies enter
// and leave unseen rather than appearing on the kerb. Map 1's notes record what
// happens without this: the first enemy of every wave walked in below the
// tarmac and took 80px to find it.
function extend(pts, howFar) {
  const [x0, y0] = pts[0], [x1, y1] = pts[Math.min(3, pts.length - 1)];
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  return [x0 - ((x1 - x0) / L) * howFar, y0 - ((y1 - y0) / L) * howFar];
}

console.log(`\nroutes for ${SRC} — paste into the level's \`routes\`:`);

entries.forEach((run, n) => {
  // Already entry -> exit: the search ran FROM the exit, so following `from`
  // out of an entry walks toward it. Reversing here was the first version's
  // bug and produced routes that ran backwards into the spawn.
  const raw = routeFrom(mid(0, run));
  const line = simplify(smooth(raw, SMOOTH), TOLERANCE).map(p => [Math.round(p[0]), Math.round(p[1])]);

  const head = extend(line, 40);
  const tail = extend([...line].reverse(), 40);
  const full = [head, ...line, tail];

  const len = full.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - full[i][0], p[1] - full[i][1]), 0);

  // How much road there is either side of the line, at its NARROWEST. This is
  // what the lane offsets in src/route.js have to fit inside: a lane pushed
  // further out than this walks the enemy onto the grass at the tightest point
  // of the road, which reads as the pathing being broken.
  //
  // Measured only over the on-canvas part — the off-canvas tails are past the
  // edge of the mask by construction.
  let narrow = Infinity;
  for (const [x, y] of line) {
    const gx = Math.round((x - STEP / 2) / STEP), gy = Math.round((y - STEP / 2) / STEP);
    if (gx < 0 || gx >= GW || gy < 0 || gy >= GH) continue;
    const c = clear[gy * GW + gx];
    if (isFinite(c)) narrow = Math.min(narrow, c * STEP);
  }

  console.log(`\n  // route ${n} — ${full.length} points, ${Math.round(len)}px long, ` +
    `${Math.round(narrow)}px of road either side at its narrowest`);
  console.log('  [');
  for (const [x, y] of full) console.log(`    { x: ${Math.round(x)}, y: ${Math.round(y)} },`);
  console.log('  ],');
});

// Width, because the lane offsets in src/data/level.js have to fit inside it.
const widths = [];
for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx;
    if (road[i] && isFinite(clear[i])) widths.push(clear[i] * STEP * 2);
  }
}
widths.sort((a, b) => a - b);
console.log(`\nroad width: median ${Math.round(widths[widths.length >> 1])}px, ` +
  `widest ${Math.round(maxClear * STEP * 2)}px`);
