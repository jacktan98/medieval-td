// DERIVE THE CAMPAIGN MAP FROM THE ARTIST'S LAYERS.
//
// Reads assets/map/Overview_Map_Layer_*.svg and writes four things:
//
//   src/data/overview.js            where the stages are, and the road into each
//   assets/map/Overview_Map_merged.svg  every layer stacked into one, in colour
//   assets/map/Overview_Map_sepia.svg   the picture, muted — the map the game loads
//   assets/map/Overview_Map_names.svg   the region names, untouched, drawn over it
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
// THREE KINDS OF LAYER, and only one of them is the picture:
//
//   THE GUIDE is layer 1. It holds the road and the ten markers on a plain green
//   field, and it is not drawn. All of the geometry below is read off it and then
//   it is dropped — everything except its background, which is the grass the other
//   layers sit on and the only opaque ground in the stack.
//
//   THE PICTURE is everything else, in the order it is numbered. It is muted and
//   stacked into the map the game loads, and the game lays a sheet of parchment
//   over the whole of it.
//
//   THE NAMES are a layer of lettering, found by its colour rather than by its
//   number. It is pulled out of the picture and written to a file of its own,
//   because the parchment is a MULTIPLY and the owner asked for the names exactly
//   as drawn: the only place a name can be untouched by the sheet is on top of it,
//   and the only way to be on top of it is not to be in the picture underneath.
//
// --- WHAT IT HAS TO FIND, and why none of it is hand-typed -------------------
//
//   THE MARKERS are the ten paths filled #d30000. Their centres are the bounding
//   box centres, which is exact for the ellipse the artist drew and would still
//   be close enough for any blob.
//
//   THE ROAD is the ten STROKED paths — on the guide, a path with no fill is road.
//   One line per stage, each running from one marker to the next, except the one
//   that comes in from off the left edge so stage 1 has an opening.
//
//   That is the whole of it, and it is worth saying how much it used to be. The
//   road was a filled RIBBON, because that is what a road looks like on a map, and
//   the line down the middle of it had to be recovered by pairing the two sides of
//   the outline and averaging them. The ribbon came in pieces, so the pieces were
//   chained end to end. The chains overlapped at their joins, so the overlaps had
//   to be unpicked. The unpicking could not tell an overlap from a switchback, so
//   it had to learn. Four hundred lines, five tuned constants, and every one of
//   them answering a question the artist could answer with one stroke of a pen —
//   which is what happened, and all of it is gone.
//
// THE ROAD IS A TREE, NOT A LINE. It forks: one branch runs east and up to the
// top-right corner, the other dead-ends in the south-west. So each stage is given
// the ONE leg that leads into it from its parent, rather than a leg per
// consecutive pair — which means the play order below can be shuffled without any
// leg becoming wrong. That part is still real work and is still here.

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
// The region names, alone and untouched, drawn over the sheet rather than under it.
const NAMES = 'assets/map/Overview_Map_names.svg';

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

// How close a road line's end has to be to a marker centre to count as arriving
// there: half the marker's drawn width plus slack. Every end in the current
// drawing lands within 24.
const AT_MARKER = 36;

// --- path parsing -----------------------------------------------------------

// M, L, C, Q, Z — every command Graphite emits, and QUADRATICS ARE NOT OPTIONAL.
// The scenery layers are all cubics, so this read C and skipped anything else for
// as long as the map was only scenery. Then a layer of region names arrived, and
// text converts to outlines as QUADRATIC curves: every Q in it fell through to the
// skip below, its numbers were eaten one at a time as if they were stray, and the
// letters came back as a handful of disconnected corners.
//
// It cost nothing at first — that layer happens to carry no group transform, so
// transformPath hands the string back untouched and the letters reach the merged
// file whole. That is luck, not design. The day the artist nudges the group, every
// name on the map is destroyed, silently, in a file nobody thinks to open.
function parse(d) {
  const toks = d.match(/[MLCQZmlcqz]|-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || [];
  const out = [];
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    if (/[MLml]/.test(t)) { out.push([t.toUpperCase(), +toks[i + 1], +toks[i + 2]]); i += 3; }
    else if (/[Cc]/.test(t)) { out.push(['C', ...toks.slice(i + 1, i + 7).map(Number)]); i += 7; }
    else if (/[Qq]/.test(t)) { out.push(['Q', ...toks.slice(i + 1, i + 5).map(Number)]); i += 5; }
    else if (/[Zz]/.test(t)) { out.push(['Z']); i += 1; }
    else i += 1;
  }
  return out;
}

// Flatten to a dense polyline, CLOSED ONLY IF THE PATH SAYS SO. Every path this
// read for its first year was a closed outline, so it closed the polyline
// unconditionally; the road is an open line now, and joining its far end back to
// its near one would send the trail home along a road that is not there.
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
    } else if (c[0] === 'Q') {
      const [, x1, y1, x2, y2] = c;
      const [x0, y0] = cur;
      for (let k = 1; k <= per; k++) {
        const t = k / per, m = 1 - t;
        pts.push([
          m * m * x0 + 2 * m * t * x1 + t * t * x2,
          m * m * y0 + 2 * m * t * y1 + t * t * y2
        ]);
      }
      cur = [x2, y2];
    }
  }
  const closed = cmds.length && cmds[cmds.length - 1][0] === 'Z';
  if (closed && pts.length && dist(pts[pts.length - 1], pts[0]) > 1e-6) pts.push(pts[0]);
  return pts;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

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
    else if (c[0] === 'Q') out += `Q${pt(c[1], c[2])} ${pt(c[3], c[4])}`;
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
    if (!dm) continue;
    const fm = /\bfill="(#[0-9a-fA-F]{6})"/.exec(attrs);
    const sm = /\bstroke="(#[0-9a-fA-F]{6})"/.exec(attrs);
    // A STROKED PATH IS A SHAPE TOO. This read fills only for as long as everything
    // it had to find was a filled one; the road is a bare line now, drawn with no
    // fill at all, and skipping it would leave the guide with markers and nothing
    // to walk between them.
    if (!fm && !sm) continue;

    const d = transformPath(dm[1], stack[stack.length - 1]);
    const nums = (d.match(/-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    out.push({ d, fill: fm ? fm[1].toLowerCase() : null,
               stroke: sm ? sm[1].toLowerCase() : null,
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

// THE NAMES ARE NOT PART OF THE PICTURE EITHER. The owner asked for them to reach
// the player exactly as drawn — not muted, and not under the paper. The paper is a
// multiply over the whole map, so the only way a name can be untouched by it is to
// be drawn AFTER it, which means it cannot be in the map image at all. It goes to
// its own file, and the game lays it over the sheet.
//
// Found by colour rather than by layer number, because the artist adds and reorders
// layers and a rule that says "the last one" would quietly start eating scenery.
// A layer every one of whose shapes is drawn in the lettering colour is lettering.
const LETTERING_FILL = '#fff5e1';
const isLettering = l => l.shapes.length > 0 && l.shapes.every(s => s.fill === LETTERING_FILL);
const names = layers.slice(1).filter(isLettering);
const picture = layers.slice(1).filter(l => !isLettering(l));

if (names.length > 1) {
  throw new Error(`expected one layer of region names, found ${names.length}: ` +
    names.map(l => l.file).join(', '));
}

// WHERE THE WATER IS, so the game can move it.
//
// The map is one flat picture to the game, which is why nothing on it has ever
// been able to do anything. Water is the exception worth making: it is the one
// thing on a map that is obviously supposed to be moving, and it is the one thing
// the tool can find without the artist marking anything, because it is already
// drawn in its own two colours.
//
// TWO LISTS, because the two move differently. A river drifts along itself and a
// waterfall falls, and one shimmer for both would have the falls sliding sideways.
//
// Emitted at ARTBOARD scale like the road, and used the same way: the game clips
// to these outlines and draws inside them.
const RIVER_FILL = '#61a6ff';
const FALLS_FILL = '#a6d5ff';
const riverPaths = picture.flatMap(l => l.shapes.filter(sh => sh.fill === RIVER_FILL)).map(sh => sh.d);
const fallsPaths = picture.flatMap(l => l.shapes.filter(sh => sh.fill === FALLS_FILL)).map(sh => sh.d);

const GROUND = guide.background;
if (!GROUND) throw new Error(`${guide.file}: the guide layer has no background to use as ground`);

const markers = [];
const drawn = [];
for (const s of guide.shapes) {
  if (s.fill === MARKER_FILL) markers.push([(s.box[0] + s.box[2]) / 2, (s.box[1] + s.box[3]) / 2]);
  else if (s.fill === null && s.stroke) drawn.push(flatten(parse(s.d)));
}

if (markers.length !== 10) throw new Error(`expected 10 markers in ${guide.file}, found ${markers.length}`);
if (drawn.length !== markers.length) {
  throw new Error(`expected one road line per marker in ${guide.file}, found ${drawn.length} line(s) for ${markers.length} marker(s)`);
}

// --- follow the road ---------------------------------------------------------

// THE ROAD IS A LINE THE ARTIST DREW, and this reads it and stops.
//
// It was not always. The road used to be a filled RIBBON — a closed outline running
// up one side and back down the other — because that is what it looks like on the
// map, and everything the game needed had to be recovered from it. Finding the
// centre of a ribbon is not a lookup: the two sides had to be paired by walking the
// loop from both directions and minimising the distance between the pairs, and the
// answer came out in pieces, because a ribbon is drawn in pieces. So the pieces were
// chained end to end, and the chains overlapped at their joins, and the overlaps
// doubled the line back on itself, and the doubling bunched the trail dots — which
// took a pass that removed reversals, which then had to learn the difference between
// an overlap and a switchback the artist meant.
//
// All of that was arithmetic in service of a question the drawing could simply
// answer. The road is one stroked line per leg now, ten lines for ten stages, each
// running from one marker to the next. There is no centre to find, nothing to stitch
// and nothing to unpick: flatten the curve and that is the road. Four hundred lines
// of this file went with the ribbon, and so did every bug that lived in them.
//
// What the tool still has to work out is which leg leads into which stage, because
// the road FORKS and the play order is a decision. That part is below and unchanged.

const markerAt = p => markers.findIndex(m => dist(p, m) <= AT_MARKER);

const joined = [];
let approach = null;
let approachAt = -1;

for (const [i, line] of drawn.entries()) {
  const a = markerAt(line[0]);
  const b = markerAt(line[line.length - 1]);

  if (a >= 0 && b >= 0) { joined.push({ from: a, to: b, line }); continue; }

  // A line with only one end at a marker is the approach, coming in from off the
  // left edge so stage 1 has a road to arrive by. There is exactly one in a correct
  // drawing; a second would mean a leg left dangling.
  const at = a >= 0 ? a : b;
  if (at < 0) {
    throw new Error(`road line ${i} touches no marker at either end ` +
      `(${line[0].map(Math.round)} and ${line[line.length - 1].map(Math.round)})`);
  }
  if (approach) {
    throw new Error(`two roads run off the map: from marker ${approachAt} and from marker ${at}`);
  }
  approach = a >= 0 ? [...line].reverse() : line;   // pointed AT its marker
  approachAt = at;
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

// WHICH MAP EACH STAGE PLAYS. Six are drawn; the rest are markers on a road with
// nothing behind them yet and the game shows them locked.
//
// SIX BOARDS NOW, and this table is the identity map because src/level.js already
// lists the levels IN PLAY ORDER. That is the whole of "move the three testing maps
// to further stages": Oakland Outskirts went in second in that array and the three
// older boards slid down to 3, 4 and 5 behind it. A stage's board is this table and
// the order of that array, and nothing else.
//
// It is left written out rather than generated from the array's length, because the
// day a stage is drawn out of order — a board finished for stage 7 before stage 6 —
// this is the one line that says so.
//
// A PLAYER MID-CAMPAIGN KEEPS THEIR STARS AND LOSES THEIR PLACE, and this is the
// second time that has been true. Star records key on the level's own id, so every
// result already recorded still points at the board it was won on; progress counts
// STAGES, so somebody who had cleared three now stands at stage 3 with two boards
// behind them they have never played. There is no migration that could do better
// without inventing a result, and Reset campaign in the admin panel puts anyone
// testing back to the start.
const LEVEL_OF = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

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

// --- THE DEPTH PASS IS GONE ---------------------------------------------------
//
// The map is one flat picture, so anything the game draws on it lands over scenery
// it may be behind. There used to be a pass here that worked out which shapes those
// were and put them back on top: it sampled every marker and every step of every
// leg, collected the small shapes whose feet were lower on the screen, vetoed the
// ones that would swallow a medallion, vetoed the ones the road runs ACROSS so the
// bridges did not paint out the dots crossing them, and handed the game a list to
// mask and redraw.
//
// The owner asked for the dots on top of everything and moved the buildings clear
// of the medallions in the drawing, which is the same answer arrived at with a pen.
// Nothing is left for the pass to do, and a rule with no cases is worse than no rule
// — so the whole of it is deleted rather than kept switched off, along with the four
// tuned constants it needed and the argument about what a bridge is.

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
// AND THEN BACK UP AGAIN, at the owner's ask, which is worth writing down rather
// than just changing: 0.55 -> 0.38 -> 0.52. The first move was made on the theory
// that a sunlit map wants its colour back; what it actually produced was a lit
// pocket of near-raw greens sitting in drained brown country, so the reached half
// read as a different drawing rather than the same one in better light. Muting BOTH
// halves further and lifting the light instead is the version that holds together —
// the sun does the work, not the pigment.
const DESATURATE = 0.52;
const WARMTH = 0.28;

// AND NOTHING MAY END UP LOUDER THAN THIS, whatever it started as. The gold in a
// stage medallion runs from 96 up; a map colour at 70 sits plainly under it, and
// under the 80 tools/campaign.mjs holds the whole palette to.
const SATURATION_CEILING = 70;

// AND THE BOTTOM OF THE RAMP IS LIFTED OFF BLACK. Every outline on this map lands
// on the darkest stop, and at 0x3B2917 they read as holes — a drawing this dense is
// mostly outline by area, so the darkest colour sets how heavy the whole thing
// looks. Lifting the first two stops takes the weight out without touching the top,
// which is where the road and the paper live.
// LIFTED AGAIN, twice now, and the second time on the owner's word about black
// spots. The dark end of this ramp is not "shadow" on this map — it is every
// outline in a drawing that is mostly outline by area, plus the ellipse under every
// building. Those are the spots, and lifting the first two stops is what takes the
// weight out of them. The top of the ramp is left where it is: that is the road and
// the paper, and it was never the problem.
const RAMP = [
  [0.00, [0x63, 0x4C, 0x33]],   // outlines and deep shadow
  [0.30, [0x99, 0x76, 0x4D]],
  [0.55, [0xBD, 0x96, 0x62]],
  [0.78, [0xD5, 0xB7, 0x8A]],
  [1.00, [0xEE, 0xE1, 0xBE]]    // the road, and paper
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

// GOLD LEAF IS NOT A MATERIAL BEING LIT, it is a thing that shines, and the muting
// has no way to know the difference. Every other colour on the map is a surface
// under one light and belongs in one range; the cross on the temple at Dawnford is
// meant to CATCH that light, and putting it through the same desaturation left it
// as one more shade of the tan roof it stands on.
//
// So it keeps its own colour, exactly as the region names do and for the same
// reason. It is the artist's own #ffd700, and it is a STROKE rather than a fill —
// the cross is two thin lines — which is why the exemption is applied to both.
const GOLD = new Set(['#ffd700']);

function sepia(hex) {
  if (GOLD.has(hex)) return hex;
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
function stack({ recolour, guides, only = null, ground = true }) {
  const seen = new Map();
  const brown = hex => {
    const key = hex.toLowerCase();
    if (!seen.has(key)) seen.set(key, sepia(key));
    return seen.get(key);
  };

  let dropped = 0;
  const parts = [];
  const defs = [];

  const use = only ? only : (guides ? layers : picture);
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
    // The names layer is laid OVER a finished map, so it must not bring a field of
    // grass with it.
    ...(ground ? [`<rect fill="${GROUND}" x="0" y="0" width="1920" height="1080"/>`] : []),
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
  console.log(`  ${picture.length} picture layer(s), ${shown.colours} colour(s) muted, ` +
    `guide and names dropped`);

  // NOT RECOLOURED AND NOT ON A GROUND: this one is laid over a finished map.
  const named = stack({ recolour: false, guides: false, only: names, ground: false });
  writeFileSync(NAMES, named.doc);
  console.log(`wrote ${NAMES}`);
  console.log(`  ${names.length} lettering layer(s), untouched, to go over the paper`);
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
// artboard. \`leg\` is the line the artist drew for the road that arrives at that
// stage, running from the previous stage to this one — the game reveals it a fraction at
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

// THE WATER, in the artist's own coordinates, for src/motion.js to shimmer inside.
// Two lists because the two move differently: a river drifts along itself, a
// waterfall falls. Nothing else reads these, and nothing breaks if motion.js is
// deleted — they simply stop being used.
export const RIVERS = ${JSON.stringify(riverPaths)};
export const FALLS = ${JSON.stringify(fallsPaths)};
`;

writeFileSync(OUT, body);

const built = stages.filter(s => s.level !== null).length;
console.log(`wrote ${OUT}`);
console.log(`  ${stages.length} stages, ${built} playable, ${joined.length + 1} road lines followed`);
console.log(`  ${riverPaths.length} river shape(s) and ${fallsPaths.length} waterfall shape(s) for the shimmer`);
for (const [i, s] of stages.entries()) {
  console.log(`  stage ${String(i + 1).padStart(2)}  marker ${s.marker}  (${String(s.x).padStart(6)}, ${String(s.y).padStart(5)})  ` +
    `level ${s.level === null ? '-' : s.level}  leg ${s.leg.length}pts`);
}
