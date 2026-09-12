// Splits the map artwork into a background and a reusable plot marker.
//
//   node tools/split-map.mjs
//
// The artist draws one file: ground, road, scenery, and a marker on every build
// plot. The game cannot use it as-is, because a marker painted into the
// background cannot be taken away again — and it has to disappear the moment a
// tower is built on that plot, or the signpost pokes out through the tower's
// legs.
//
// So this writes ONE derived file, committed:
//
//   Map_base.svg      the map with the markers removed
//
// render.js draws the base once and stamps the artist's own `Plot_Marker.svg`
// on each EMPTY plot, which is what makes "occupied" a thing the renderer can
// express at all. That marker is hand-drawn now rather than cut out of the map,
// so this only measures it and prints how to draw it.
//
// It also prints the plot positions the artwork implies, in road order, ready
// to paste into src/data/level01.js. The map is the source of truth for where
// the plots are; the data file only has to agree with it.
//
// Map.svg and Plot Marker.svg are never modified. Re-run after any redraw.

import { readFileSync, writeFileSync } from 'fs';
import { levels } from '../src/level.js';
import { nearestOn } from '../src/route.js';
import { SCALE } from '../src/data/towers.js';
import { allGroups, bounds, MAP_SCALE, readArtwork, layerFiles } from './svg.mjs';

// Which map to split. Every level records the file it was drawn from, so the
// tool finds its own level rather than being told twice.
const SRC = process.argv[2] || 'assets/map/Map_1.svg';
const BASE = SRC.replace(/\.svg$/, '') + '_base.svg';
const MARKER = 'assets/map/Plot_Marker.svg';

const level = levels.find(l => l.src === SRC);
if (!level) {
  throw new Error(`no level in src/level.js has src '${SRC}' — ` +
    `add one before splitting its map, even with an empty plot list`);
}

// A board is one file or a stack of layers, and only readArtwork knows which.
const svg = readArtwork(SRC);
// The layer files themselves, for the front-layer pass at the bottom. Empty for a
// board drawn in one piece, which simply has no front sheet.
const LAYERS = SRC.endsWith('.svg') ? [] : layerFiles(SRC);

// --- geometry ----------------------------------------------------------------

// A group's shape, ignoring where it sits: how many pieces it is drawn from and
// how big each of them is, sorted. Two copies of the same drawing at different
// offsets — which is exactly what eight plot markers are — measure the same.
function shapeOf(g) {
  return {
    n: g.subPaths.length,
    parts: g.subPaths
      .map(ps => { const b = bounds(ps); return [b.x1 - b.x0, b.y1 - b.y0]; })
      .sort((a, b) => b[0] * b[1] - a[0] * a[1])
  };
}

// WHETHER TWO GROUPS ARE THE SAME DRAWING, WITHIN THE ARTIST'S HAND.
//
// THIS WAS AN EXACT STRING MATCH and it cost stage 2 a plot, silently. The
// signature was every piece's size printed to a tenth of a pixel and joined; one
// of the eight markers on that board measures 13.0x9.4 where the other seven
// measure 13.1x9.6, because it was nudged or rotated a hair. Its string differed,
// it formed a cluster of one, singletons are dropped as scenery — and the tool
// reported seven markers on a board with eight, with nothing on screen or in the
// console to say a plot had gone missing.
//
// A TOLERANCE, NOT A ROUNDING. Rounding to whole pixels does not fix it: 193.5
// and 193.4 land either side of a boundary and split apart again, which is the
// same bug with a coarser grid. A tolerance has no boundaries.
//
// AND IT NEEDS A FLOOR AS WELL AS A PERCENTAGE, which the first attempt did not
// have and which is why it still found seven. A percentage is the wrong shape of
// tolerance for a small piece: the odd marker's signpost head is 5.4 map px where
// the others are 5.0, and 0.4 of 5 is EIGHT percent — a difference no eye can see
// on a piece two game pixels wide, and one that no sane percentage would forgive
// without also forgiving 15px on the 193px ellipse. So the two are separate: five
// percent for the big pieces, and a flat pixel for everything, whichever is more
// generous.
//
// Nothing is at risk of merging wrongly: a group must have the same NUMBER of
// pieces to be compared at all, and the nearest six-piece thing on either board is
// a fifth away on its longest side.
const LIKE = 0.05;      // of the larger measurement
const SLOP = 1;         // or a whole map pixel, whichever forgives more
const close = (a, b) => Math.abs(a - b) <= Math.max(LIKE * Math.max(a, b), SLOP);
const alike = (a, b) => a.n === b.n && a.parts.every(([w, h], i) => {
  const [w2, h2] = b.parts[i];
  return close(w, w2) && close(h, h2);
});

// --- find the markers --------------------------------------------------------
//
// They are identified as the largest set of groups that draw the same shape.
// The previous version matched a hard-coded transform string lifted out of the
// file, and a redraw silently changed it; this asks a question about the drawing
// instead of about the export. The scenery repeats too (the same rock is stamped
// five times), so "largest cluster" is the discriminator, and the count is
// checked against the level to make an added or removed marker a loud failure
// rather than a quietly wrong map.

const groups = allGroups(svg);
// Grouped by likeness rather than by an exact key, so a marker the artist moved
// by a fraction of a pixel still joins its own kind. See `alike`.
const found = [];
for (const g of groups) {
  const shape = shapeOf(g);
  const c = found.find(f => alike(f.shape, shape));
  if (c) c.members.push(g);
  else found.push({ shape, members: [g] });
}
const clusters = new Map(found.map((f, i) => [i, f.members]));

// Drop members nested inside another member of the same cluster. The export
// wraps single shapes in a <g> of their own, so an ellipse and the group around
// it are the same drawing counted twice — which made a nine-member cluster look
// like eighteen and beat the real markers on size alone.
const encloses = (o, g) => o.start <= g.start && o.end >= g.end && (o.start < g.start || o.end > g.end);
for (const [k, c] of clusters) clusters.set(k, c.filter(g => !c.some(o => encloses(o, g))));

// WHICH CLUSTER IS THE MARKER. "The one that repeats most" was the whole rule and
// it held for three maps, then stopped: the tutorial board has six plots and eight
// copies of one tuft of grass, so the grass won and the tool cut eight tufts out of
// the map and left six signposts standing in it. Nothing threw — the count check
// below only knows how many plots the level claims, and a level being written for
// the first time claims whatever you last typed.
//
// So the marker is identified by BEING THE MARKER. It is a known drawing —
// Plot_Marker.svg, the same file the game stamps on every empty plot — and its
// proportions are the one thing about it that survives being scaled into a map.
// Every cluster of two or more is scored on how close its box is to that shape, and
// the best match inside a quarter wins. Repeat count is only the tie-break now,
// which is the right way round: nine copies of a rock is not evidence of anything.
//
// The old rule stays as the fallback for a map drawn before there was a shared
// marker file to match against.
const mk = readFileSync(MARKER, 'utf8');
const mkGroups = allGroups(mk);
if (!mkGroups.length) throw new Error(`no geometry found in ${MARKER}`);
const mkPaths = mkGroups.reduce((a, b) => (b.subPaths.length > a.subPaths.length ? b : a)).subPaths;
const mkAll = bounds(mkPaths.flat());
const mkW = mkAll.x1 - mkAll.x0;
const mkH = mkAll.y1 - mkAll.y0;

// The marker drawn at the shared SCALE, in the map's own units. MAP_SCALE is how
// many game px a map unit is, so this is the size the artist's stamp should be.
const wantW = (mkW * SCALE) / MAP_SCALE;
const wantH = (mkH * SCALE) / MAP_SCALE;

const repeated = [...clusters.values()].filter(c => c.length >= 2);
const score = c => {
  const b = bounds(c[0].subPaths.flat());
  return Math.abs((b.x1 - b.x0) - wantW) / wantW + Math.abs((b.y1 - b.y0) - wantH) / wantH;
};

// Only the plausible ones are listed. A map has dozens of repeated tufts and
// pebbles and printing all of them buries the answer.
for (const c of repeated.filter(c => score(c) <= 1.5).sort((a, b) => score(a) - score(b))) {
  const b = bounds(c[0].subPaths.flat());
  console.log(`  candidate: x${String(c.length).padStart(2)}  ${c[0].subPaths.length} sub-paths, ` +
    `${(b.x1-b.x0).toFixed(0)}x${(b.y1-b.y0).toFixed(0)} map units, ` +
    `${(score(c) * 100).toFixed(0)}% off the marker`);
}

const LOOKS_LIKE_IT = 0.5;      // summed relative error across both axes
const like = repeated.filter(c => score(c) <= LOOKS_LIKE_IT)
  .sort((a, b) => score(a) - score(b) || b.length - a.length);

let markers;
if (like.length) {
  markers = like[0];
  const b = bounds(markers[0].subPaths.flat());
  console.log(`  matched the marker: ${markers.length} copies at ` +
    `${(b.x1-b.x0).toFixed(0)}x${(b.y1-b.y0).toFixed(0)}, wanted ${wantW.toFixed(0)}x${wantH.toFixed(0)}`);
} else {
  // Nothing looks like the stamp. Fall back to the old rule and say so, because
  // a silent fallback here is exactly the failure this replaced.
  const best = Math.max(0, ...repeated.map(c => c.length));
  const tied = repeated.filter(c => c.length === best);
  markers = tied.sort((a, b) => b[0].subPaths.length - a[0].subPaths.length ||
                                (b[0].end - b[0].start) - (a[0].end - a[0].start))[0] || [];
  console.log('  NOTHING matched Plot_Marker.svg — falling back to the largest cluster');
}

markers = [...markers].sort((a, b) => a.start - b.start);

console.log(`${groups.length} groups, marker cluster has ${markers.length}`);
if (markers.length !== level.plots.length) {
  throw new Error(
    `found ${markers.length} markers but ${level.id} has ${level.plots.length} plots — ` +
    `if the artwork gained or lost a marker, re-extract the plots before re-running this`);
}

// Guards the tie-break above: "biggest repeated drawing" would happily pick a
// group that wrapped a marker together with half the scenery. A marker is a
// signpost on a patch of dirt, so it is small.
const markerBounds = bounds(markers[0].subPaths.flat());
{
  const b = markerBounds;
  if (b.x1 - b.x0 > 300 || b.y1 - b.y0 > 300) {
    throw new Error(`the shape matched is ${Math.round(b.x1-b.x0)}x${Math.round(b.y1-b.y0)} ` +
      `map units — too big to be a plot marker`);
  }
}

// --- the garrison: figures the artist painted that the GAME will draw instead ---
//
// Stage 5 has two crossbowmen behind a barricade by the bridge. They are painted into
// the artwork, and the owner wants them to be real: to aim, to shoot, to be selectable
// for their numbers. A live figure drawn on top of a painted one is two figures, so
// the painted pair has to come out of the base — exactly what already happens to the
// plot markers, and for the same reason.
//
// FOUND BY ANCHOR RATHER THAN BY LIKENESS, and that is a deliberate retreat from how
// markers are found. Markers are eight identical copies of one drawing and cluster
// cleanly. These do not:
//
//   They are NOT identical to each other. One carries a quiver of arrows and the other
//   does not, so "find every copy of this drawing" finds one of them.
//
//   They ARE nearly identical to the four villagers dotted about the board — 12.8x22
//   against 12.8x20.6 — which is inside a hair of the likeness tolerance that already
//   had to be loosened once to stop it dropping a plot.
//
//   And they OVERLAP THE BARRICADE, so growing a cluster outward from either of them
//   swallows a wall that must stay in the base.
//
// So the level names a point per figure and this cuts what is standing there. The
// window is figure-sized on purpose — 44 wide and 38 tall around the foot — which is
// what keeps the barricade out of it: at 73px across it does not fit through.
//
// IT FAILS LOUDLY. A redraw that moves a figure leaves its anchor over bare ground and
// the tool says "nothing to cut" rather than quietly shipping a board with a painted
// crossbowman and a live one standing in the same place.
const GARRISON_W = 22;    // half-width of the window, game px
const GARRISON_UP = 34;   // how far above the foot it reaches
const GARRISON_DOWN = 4;  // and below

const garrisonGroups = [];
if (level.garrison && level.garrison.length) {
  console.log(`\nthe garrison — figures cut out of the base for the game to draw:`);
  const marks2 = [...svg.matchAll(/<g data-layer="(\d+)">/g)];
  const topN = Math.max(...marks2.map(m => +m[1]));
  const firstTop = marks2.find(m => +m[1] === topN);
  const wrapAt = new Set(marks2.map(m => m.index));
  const inTop2 = allGroups(svg).filter(g => g.start > firstTop.index && !wrapAt.has(g.start));
  const outer2 = inTop2.filter(g => !inTop2.some(o => o !== g && o.start <= g.start && o.end >= g.end));

  // EACH PIECE BELONGS TO ONE MAN. Two figures standing a step apart have windows
  // that overlap, and stage 5's do: the second crossbowman's near boot falls inside
  // the first one's window as well as his own. Claimed by both, that one group went
  // into the cut list TWICE — and the cut is a pair of string slices, so the second
  // pass took the same span of characters out of a file the first pass had already
  // shortened. It does not remove the boot twice, it removes the boot and then four
  // hundred characters of whatever had closed up behind it.
  //
  // So a piece goes to the NEAREST anchor and to no other. Nearest by the anchor
  // point itself, which is the foot of the figure it belongs to.
  const near = (g, at) => {
    const b = bounds(g.subPaths.flat());
    return Math.hypot((b.x0 + b.x1) / 2 * MAP_SCALE - at.x, b.y1 * MAP_SCALE - at.y);
  };
  const owner = new Map();
  for (const g of outer2) {
    const b = bounds(g.subPaths.flat());
    const [x0, y0, x1, y1] = [b.x0 * MAP_SCALE, b.y0 * MAP_SCALE, b.x1 * MAP_SCALE, b.y1 * MAP_SCALE];
    let best = -1, least = Infinity;
    level.garrison.forEach((at, k) => {
      if (x0 < at.x - GARRISON_W || x1 > at.x + GARRISON_W ||
          y0 < at.y - GARRISON_UP || y1 > at.y + GARRISON_DOWN) return;
      const d = near(g, at);
      if (d < least) { least = d; best = k; }
    });
    if (best >= 0) owner.set(g, best);
  }

  for (const [i, at] of level.garrison.entries()) {
    const mine = outer2.filter(g => owner.get(g) === i);
    if (!mine.length) {
      throw new Error(`garrison ${i} is at (${at.x}, ${at.y}) and there is nothing drawn there. ` +
        `If the figure moved in a redraw, move the anchor in the level file to its feet.`);
    }
    const b = bounds(mine.flatMap(g => g.subPaths.flat()));
    console.log(`  ${i}: ${mine.length} piece(s) at ${at.x},${at.y} — ` +
      `${((b.x1 - b.x0) * MAP_SCALE).toFixed(0)}x${((b.y1 - b.y0) * MAP_SCALE).toFixed(0)}px, ` +
      `standing on y ${(b.y1 * MAP_SCALE).toFixed(0)}`);
    garrisonGroups.push(...mine);
  }
}

// --- background: the same file with the marker and garrison groups cut out ----

let base = svg;
const cut = [...markers, ...garrisonGroups].sort((a, b) => a.start - b.start);
for (const g of [...cut].reverse()) base = base.slice(0, g.start) + base.slice(g.end);
writeFileSync(BASE, base);
console.log(`wrote ${BASE}`);

// --- the artist's plot marker, measured --------------------------------------
//
// The marker used to be derived here, cut out of the map and re-based. It is a
// hand-drawn file now — `Plot_Marker.svg`, on the same 512 square canvas as
// every sprite — so this only has to measure it and say how to draw it.
//
// The ellipse is the ground patch, the widest sub-path, and it is what lands on
// the plot coordinate. The signpost sticks up above it, so the pivot is NOT the
// middle of the box.

const mkEll = bounds(mkPaths.reduce((a, b) => {
  const [ba, bb] = [bounds(a), bounds(b)];
  return (bb.x1 - bb.x0) > (ba.x1 - ba.x0) ? b : a;
}));

const pivotX = ((mkEll.x0 + mkEll.x1) / 2 - mkAll.x0) / mkW;
const pivotY = ((mkEll.y0 + mkEll.y1) / 2 - mkAll.y0) / mkH;

console.log(`\n${MARKER}`);
console.log(`  trim   [${mkAll.x0.toFixed(0)}, ${mkAll.y0.toFixed(0)}, ${mkW.toFixed(0)}, ${mkH.toFixed(0)}]  (source px)`);
console.log(`  drawn  ${(mkW * SCALE).toFixed(1)} x ${(mkH * SCALE).toFixed(1)} game px at the shared SCALE`);
console.log(`  pivot  [${pivotX.toFixed(3)}, ${pivotY.toFixed(3)}]  (ellipse centre, as a fraction of the trim)`);
console.log(`  the map's own markers draw ${((markerBounds.x1 - markerBounds.x0) / 2).toFixed(1)} px wide, ` +
  `so this is ${(((mkW * SCALE) / ((markerBounds.x1 - markerBounds.x0) / 2) - 1) * 100).toFixed(1)}% off them`);

// --- where the artist put the plots ------------------------------------------
//
// In road order, because an index into `plots` has to mean something: plot 0 is
// the first one the column walks past. tools/sim.mjs picks plots by index, and
// an arbitrary order there quietly builds a "spread of towers" that is nothing
// of the sort.
//
// On a FORKED map "along the road" is not a single number — a plot beside the
// northern road and one beside the southern are not on the same line. So the
// order is by how far each plot still is FROM THE KEEP, measured along whichever
// route passes nearest. That is the same ordering on a map with one road, and
// the only one that means anything on a map with two.
//
// Printed ready to paste into the level file. The clearance each plot has is
// printed next to it.

const remainingAt = p => {
  const n = nearestOn(level.routes, p.x, p.y);
  return { left: level.routes[n.route].total - n.s, off: n.d };
};

const centres = markers.map(g => {
  const b = bounds(g.subPaths.reduce((a, c) => {
    const [ba, bc] = [bounds(a), bounds(c)];
    return (bc.x1 - bc.x0) > (ba.x1 - ba.x0) ? c : a;
  }));
  return { x: Math.round((b.x0 + b.x1) / 4), y: Math.round((b.y0 + b.y1) / 4) };
}).sort((a, b) => remainingAt(b).left - remainingAt(a).left);

console.log(`\nplots as painted, in road order — paste into the level file:`);
for (const c of centres) {
  const { left, off } = remainingAt(c);
  console.log(`  { x: ${String(c.x).padStart(3)}, y: ${String(c.y).padStart(3)} },` +
    `   // ${String(Math.round(left)).padStart(4)} from the keep, ` +
    `${String(Math.round(off)).padStart(3)} off the road` +
    (off > 95 ? '   FAR' : ''));
}

// --- what a figure can walk behind -------------------------------------------
//
// THE OWNER'S RULE: "buildings are supposed to overlap soldiers if the building
// is in front based on shadow". A board is one flat image drawn under everything,
// so a soldier standing BEHIND a house was drawn on its roof.
//
// The game already sorts everything that stands on the ground into one pass by
// depth — towers, soldiers, enemies, bodies, blood, dust. The map's own buildings
// were the one kind of solid thing not in it. So this writes the top layer out as
// a sheet the renderer can draw FROM at the right moment, and prints the box of
// every thing on it that stands up.
//
// THE SHEET IS THE WHOLE LAYER, and only the standing things get a box. That
// combination is the point, and it took two wrong versions to find:
//
//   The first cut nothing and redrew each building over the board. That re-covered
//   whatever the artist had drawn IN FRONT of it — the little man at the tavern
//   door went behind the wall, because the base had him after the building and the
//   second copy put the building back on top.
//
//   The second lifted the whole layer out of the base and sorted every piece of it
//   by its own shadow. That fixed the double-draw and broke the same man a
//   different way: his shadow is four pixels behind the tavern's, so the sort put
//   him behind it, which is not what the artist drew and not what the owner wants.
//   "The man is supposed to be seen and the back is the tavern building."
//
// So NOTHING is cut and nothing is re-sorted. The artist's layer is drawn exactly
// as drawn, and a building's box is redrawn from the SAME layer — which means the
// slice carries every prop the artist put on top of that building, in their order.
// Between two pieces of artwork nothing changes at all; the only thing the extra
// draw can get in front of is a game figure standing behind the building.
//
// WHICH SHAPES STAND UP is a question the artwork answers rather than the artist:
// a building stands and a road stone lies flat, so height decides. The tool
// refuses rather than guesses if anything sits on the line, because a threshold
// picked in the middle of a crowd will silently make a wall out of a rock.
// A DERIVED SHEET, in the shape stackLayers writes a board in.
//
// The artboard clip is the only thing in here doing work, and it is not clipping:
// `allGroups` in tools/svg.mjs finds where the drawing starts by looking for it, so
// a sheet written without one is an SVG that the reader every other tool uses cannot
// read. They are the two files in this project derived FROM artwork that are also
// artwork, and a checker that wants to ask what is on one should not need a hack to.
const sheet = body =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">\n' +
  '<defs><clipPath id="artboard-sheet"><rect x="0" y="0" width="1920" height="1080"/></clipPath></defs>\n' +
  '<g clip-path="url(#artboard-sheet)">\n' + body + '\n</g>\n</svg>\n';

const FRONT_MIN_H = 30;      // game px: a thing this tall is standing up
// Set by --accept: a human has looked at whatever is sitting on the line and confirmed
// the tool classified it right. It does not change any classification — it only stops
// the refusal — and it is meant to be paired with a note in the level file saying what
// was looked at, so the next person does not have to look again.
const ACCEPT = process.argv.includes('--accept');
const FRONT_CLEAR = 0.15;    // and nothing may sit within this much of the line

// THE NEAR OVERLAY: a piece of the top layer that is in front of EVERYTHING.
//
//   node tools/split-map.mjs assets/map/Stage_5_Map --over 3e
//
// A box is a thing figures walk BEHIND, sorted by its foot, and that is the whole
// vocabulary this tool had. Stage 5's bridge is the case it could not say: the deck
// is a floor that figures walk ON — it must never occlude — and the near railing at
// the bottom of the same bridge is a wall between the camera and the deck, so it
// must occlude everything on it. Both run off the bottom-right corner, so neither
// has a foot on the canvas and geometry cannot tell them apart. The artist can, and
// did: the near railing arrived as `_Layer_3e`, its own file, drawn last.
//
// So the OVERLAY IS NAMED, not inferred, on the same terms as --accept: the tool
// does the measuring, a human says which part is the near one, and the level file
// records the decision beside the box. What it costs if nobody says is nothing new
// — the part stays in the front sheet inside a cluster that is already dropped, and
// the railing does not occlude, which is where stage 5 shipped.
//
// A SHEET OF ITS OWN rather than a box on the shared one, and that is forced. The
// front sheet is the whole top layer flattened, so a rectangle over the railing
// would carry the DECK drawn under it in the same rectangle — and re-drawing the
// deck over everything is precisely the overdraw this is meant to avoid.
const OVER = (() => {
  const i = process.argv.indexOf('--over');
  return i >= 0 ? process.argv[i + 1] : null;
})();

if (LAYERS.length) {
  // The top layer's span in the STACKED text, so what is measured here is what the
  // base actually draws.
  // THE TOP LAYER MAY BE SEVERAL FILES. Stage 5's castle is `_Layer_3a` through
  // `_Layer_3d` — four drawings that are one layer — and stackLayers labels all four
  // `data-layer="3"` for exactly this. So the top layer starts at the FIRST mark
  // carrying the highest number, not at the last mark in the file: taking the last
  // would have made the castle's final piece the whole front sheet and left the other
  // three buried in the base, which is three quarters of a keep that nothing can walk
  // behind.
  const marks = [...svg.matchAll(/<g data-layer="(\d+)">/g)];
  if (!marks.length) throw new Error('the stacked artwork has no labelled layers');
  const top = Math.max(...marks.map(m => +m[1]));
  const first = marks.find(m => +m[1] === top);

  // AND THE LAYER WRAPPERS THEMSELVES ARE NOT THINGS. `<g data-layer="3">` is a group
  // like any other, so with the top layer split across four files the wrappers for the
  // second, third and fourth start after `first.index` and come through as outer
  // groups — each one swallowing everything in its own file. Stage 5 arrived as seven
  // "things": three castle pieces and three whole files pretending to be one object.
  //
  // A single-file layer never showed this, because its one wrapper starts exactly AT
  // `first.index` and the `>` excluded it by luck rather than on purpose.
  const wrappers = new Set(marks.map(m => m.index));

  // WHERE THE NAMED OVERLAY PART LIVES IN THAT TEXT. stackLayers writes one wrapper
  // per file in the order layerFiles returned them, so mark `i` IS layer file `i` —
  // the same correspondence combine.mjs prints its bounding boxes by. No new label
  // is needed on the wrapper and none is wanted: another attribute would have to be
  // matched by every regex in this file and in combine.mjs that finds a layer.
  let overSpan = null;
  if (OVER) {
    const at = LAYERS.findIndex(f => f.endsWith(`_Layer_${OVER}.svg`));
    if (at < 0) {
      throw new Error(`--over ${OVER}: no ${SRC}_Layer_${OVER}.svg among the layers ` +
        `(${LAYERS.map(f => /_Layer_(\w+)\.svg$/.exec(f)[1]).join(', ')})`);
    }
    if (+marks[at][1] !== top) {
      throw new Error(`--over ${OVER}: that part is layer ${marks[at][1]} and the top ` +
        `layer is ${top}. Only the top layer is lifted off the board at all, so a part ` +
        `below it cannot be the nearest thing on it.`);
    }
    overSpan = [marks[at].index, at + 1 < marks.length ? marks[at + 1].index : svg.length];
  }
  const inSpan = g => overSpan && g.start > overSpan[0] && g.start < overSpan[1];

  // AND THE GARRISON IS NOT SCENERY. The two crossbowmen painted at stage 5's bridge
  // are cut out of the base because the game draws a live one on each spot — and the
  // front sheet is a SECOND copy of the top layer, so leaving them in it puts the
  // painted pair back on the board the moment a box happens to cover them.
  //
  // It did. Giving the barricade they stand behind a box of its own is right and it
  // is new; the slice of that box carried both painted men, drawn over the live ones
  // at exactly the same coordinates. Two crossbowmen where there should be two, in
  // the same poses, differing only in that half of them never move.
  //
  // THE WHOLE SPAN OF EACH, not the group that starts it. A figure is a group with
  // groups inside it — a helmet, a body, two boots — and dropping only the outermost
  // one promotes its own children to outermost, which puts the same drawing back on
  // the sheet in pieces. That is not a hypothetical: it is what the first version of
  // this did, and the painted pair came through the barricade's box exactly as
  // before, in four parts instead of one.
  //
  // By span rather than by identity, because this pass walks the text again and gets
  // its own group objects for the same offsets.
  const painted = garrisonGroups.map(g => [g.start, g.end]);
  const isPainted = g => painted.some(([a, b]) => g.start >= a && g.end <= b);
  const inTop = allGroups(svg)
    .filter(g => g.start > first.index && !wrappers.has(g.start) && !inSpan(g) &&
                 !isPainted(g));
  const outer = inTop.filter(g => !inTop.some(o => o !== g && o.start <= g.start && o.end >= g.end));

  const boxes = outer.map(g => {
    const b = bounds(g.subPaths.flat());
    return {
      gs: [g],
      x: b.x0 * MAP_SCALE, y: b.y0 * MAP_SCALE,
      w: (b.x1 - b.x0) * MAP_SCALE, h: (b.y1 - b.y0) * MAP_SCALE
    };
  });

  // A BUILDING'S OWN PARTS JOIN THE BUILDING. Loose flat things stay loose.
  //
  // Stage 4 is where one shape stopped being one thing. The workshop has a STACK OF
  // TIMBER outside it — four planks, drawn as four sibling paths lying on each
  // other. One at a time two of them measure 29.6px tall and two measure 36 to 37,
  // straddling the 30px line that tells a building from a road stone, so the tool
  // refused. As the one object a player sees, the stack is 51px tall and obviously
  // standing.
  //
  // THE FIRST VERSION OF THIS MERGED ANY TWO OVERLAPPING BOXES and was wrong in the
  // way this whole section exists to prevent. On stage 3 two 22px flat props overlap
  // each other; merged, they became a 34px "building", and a rule meant to stop the
  // tool making a wall out of a rock made one geometrically instead. The board went
  // from passing to refusing, which is the only reason it was caught.
  //
  // So a cluster GROWS FROM A STANDING SEED and only from one. A shape joins a
  // cluster if it overlaps something already in it and that cluster began with a
  // shape over the line. Two flat things that overlap are still two flat things, and
  // no combination of flat things can ever add up to a standing one.
  //
  // Every building on the earlier boards already arrived as a single group with
  // sub-paths, so a cluster of one is what they were. What this adds is the props
  // the artist drew as loose siblings ON a building — which is why stage 2's tavern
  // box grows from 139 wide to 155 and its well from 77 to 115: it is the same
  // building with the thing standing against it now inside its box, which is where
  // the drawing always had it.
  //
  // OVERLAP MEANS SHARING INK, NOT SHARING A RECTANGLE, and that distinction is the
  // whole of a bug the owner found on stage 5: "why is the castle overlapping the
  // archery tower? Archery tower should be overlapping instead."
  //
  // The castle's bounding box is 359x113 and covers the whole keep and its shadow.
  // The blue ramp out of its gate clips the bottom-right corner of that rectangle,
  // so the two merged — fairly, they do touch. Then a brazier standing on the grass
  // in FRONT of the castle clipped the ramp's rectangle, and two painted villagers
  // clipped it too, and the castle's box walked down the board to their feet at
  // y 314. A tower built on the plot at y 303 is nearer the camera than a castle
  // whose walls end at 244 and further from it than a villager standing on the
  // grass, so the depth pass put the keep on top of it. The player saw a castle
  // drawn over a watchtower standing well in front of it.
  //
  // Neither the brazier nor either villager shares a single pixel with the castle.
  // They were made part of it by arithmetic on rectangles, which is not a fact
  // about the drawing at all — a diagonal thing's bounding box is mostly the ground
  // beside it. So the test is the drawing: do these two shapes actually cover any
  // of the same ground?
  //
  // Measured on a one-game-pixel grid, which is the same resolution the question is
  // asked at on screen. It costs a few hundred milliseconds per board and it is the
  // only thing in this file that looks at ink rather than at numbers about ink.
  //
  // ACROSS BOTH PASSES — seeds joining seeds and props joining buildings — because
  // it is one claim and not two: a thing that touches nothing is its own thing.
  const rect = (a, b) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // A shape as a one-game-pixel occupancy grid over its own box, by scanline. Even-
  // odd, so a hole drawn as a second sub-path reads as a hole — which errs towards
  // saying two things do NOT touch, and "leave them apart" is the safe answer.
  const maskOf = subPaths => {
    const b = bounds(subPaths.flat());
    const x0 = Math.floor(b.x0 * MAP_SCALE), y0 = Math.floor(b.y0 * MAP_SCALE);
    const w = Math.max(1, Math.ceil(b.x1 * MAP_SCALE) - x0);
    const h = Math.max(1, Math.ceil(b.y1 * MAP_SCALE) - y0);
    const bits = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      const py = (y0 + row + 0.5) / MAP_SCALE;
      const xs = [];
      for (const ps of subPaths) {
        for (let k = 0; k < ps.length; k++) {
          const [ax, ay] = ps[k], [bx, by] = ps[(k + 1) % ps.length];
          if ((ay > py) !== (by > py)) xs.push(ax + (py - ay) / (by - ay) * (bx - ax));
        }
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = Math.max(0, Math.round(xs[i] * MAP_SCALE) - x0);
        const to = Math.min(w, Math.round(xs[i + 1] * MAP_SCALE) - x0);
        for (let c = from; c < to; c++) bits[row * w + c] = 1;
      }
    }
    return { x0, y0, w, h, bits };
  };

  const shareInk = (m, n) => {
    const x0 = Math.max(m.x0, n.x0), x1 = Math.min(m.x0 + m.w, n.x0 + n.w);
    const y0 = Math.max(m.y0, n.y0), y1 = Math.min(m.y0 + m.h, n.y0 + n.h);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (m.bits[(y - m.y0) * m.w + (x - m.x0)] &&
            n.bits[(y - n.y0) * n.w + (x - n.x0)]) return true;
      }
    }
    return false;
  };

  // A cluster carries its members' masks rather than a merged one: the union of two
  // boxes is mostly empty ground, and a prop landing in that emptiness is exactly
  // what this is here to refuse.
  const overlaps = (a, b) =>
    rect(a, b) && a.masks.some(m => b.masks.some(n => rect(
      { x: m.x0, y: m.y0, w: m.w, h: m.h }, { x: n.x0, y: n.y0, w: n.w, h: n.h }
    ) && shareInk(m, n)));

  const grow = (c, b) => {
    const x = Math.min(c.x, b.x), y = Math.min(c.y, b.y);
    c.gs.push(...b.gs);
    c.masks.push(...b.masks);
    c.w = Math.max(c.x + c.w, b.x + b.w) - x;
    c.h = Math.max(c.y + c.h, b.y + b.h) - y;
    c.x = x; c.y = y;
  };

  for (const b of boxes) b.masks = [maskOf(b.gs[0].subPaths)];
  const seeds = boxes.filter(b => b.h >= FRONT_MIN_H)
    .map(b => ({ ...b, gs: [...b.gs], masks: [...b.masks] }));
  const loose = boxes.filter(b => b.h < FRONT_MIN_H)
    .map(b => ({ ...b, gs: [...b.gs], masks: [...b.masks] }));

  // Seeds first, into each other: two halves of one building drawn as two paths are
  // one building. This part IS transitive — everything joined is a standing thing.
  const clusters = [];
  for (const seed of seeds) {
    let cur = seed;
    for (let i = clusters.length - 1; i >= 0; i--) {
      if (overlaps(cur, clusters[i])) { grow(cur, clusters[i]); clusters.splice(i, 1); }
    }
    clusters.push(cur);
  }

  // AND THEN THE FLAT PROPS, EACH ASKED OF THE BUILDING RATHER THAN OF THE PILE.
  //
  // The reach a prop is tested against is the union of the STANDING shapes only,
  // frozen here before anything is absorbed. A prop that overlaps the building joins
  // it; a prop that overlaps a prop that joined it does not.
  //
  // THAT IS THE FIX FOR A REAL BUG AND THE OWNER'S ARTWORK FOUND IT. This pass used
  // to run repeatedly and test against the GROWING cluster — the comment even said
  // so, "because absorbing one can widen a cluster onto the next", which is precisely
  // the wrong behaviour written down as if it were the point. Stage 4 gained a couple
  // of loose planks on the ground between the shed and the woodpile, and they chained:
  // the plank reached the shed, a sawn log reached the plank, four little stones
  // reached the log, and the shed's box walked from 128px wide to 217 — out across a
  // stretch of open grass, sixty pixels past anything that stands up.
  //
  // What that costs on screen is a plank lying flat on the ground being drawn at the
  // SHED'S depth, so it would paint over a soldier standing well in front of it.
  //
  // A prop belongs to a building because it is touching the BUILDING. Anything else
  // is a line of stones dragging a barn across the map.
  const reach = clusters.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h, masks: c.masks }));
  for (let i = loose.length - 1; i >= 0; i--) {
    const k = reach.findIndex(r => overlaps(r, loose[i]));
    if (k >= 0) { grow(clusters[k], loose[i]); loose.splice(i, 1); }
  }

  // AND A BOX WIDER THAN A BUILDING IS BANDED BY ITS OWN GROUND LINE.
  //
  // THE OWNER'S REPORT, on stage 5: "Why is the castle overlapping my barracks tower."
  // A Knight's Hall on the plot beside the keep had its roof clipped by the castle's
  // right-hand corner tower.
  //
  // A box has ONE foot and it is the lowest point of the whole drawing — "the bottom
  // of a thing's box is its shadow", which is true of a house and stops being true of
  // a keep. The castle is 359px wide. Its shadow meets the grass at y 244 under the
  // near corner and at 217 under the right-hand one, a third of a board away; the box
  // claims 244 for both. The hall stands at y 225 — behind the near corner and in
  // front of the far one — so the keep painted over it.
  //
  // TRIMMING THE BOX WAS THE FIRST ANSWER AND IT WAS WRONG. Cutting the box back to
  // the columns whose ink reaches its foot conflates two different things: where a
  // building touches the ground, and how wide it is. Stage 4's practice butt is a
  // target on a post — 92px of board over 13px of timber — and trimming took it down
  // to the post, which is not an occluder any more, it is a stick.
  //
  // So the box is BANDED instead: the drawing is kept whole and cut into vertical
  // strips whose ground lines agree, each strip drawn at its own depth. Every strip
  // still redraws its own slice of the sheet, so nothing is lost from the picture.
  //
  // ONLY THE WIDE ONES. A seam between two strips at different depths is a place a
  // figure can be half-covered, so this is worth doing only where the alternative is
  // worse — a drawing wide enough that its footprint spans a real depth. 200px is
  // wider than every building on every board (the widest is stage 2's tavern at 139)
  // and narrower than the two pieces of terrain that need this: stage 5's castle at
  // 359 and stage 3's plaza at 211.
  //
  // A MAN'S HEIGHT for the tolerance: a militiaman is 23px tall, so two columns whose
  // ground lines agree within it can never put a whole figure on the wrong side.
  const CANVAS_H = 540;
  const FOOT_SLACK = 20;
  const BAND_MIN_W = 200;   // narrower than this is a building, and stays one box
  const BAND_MIN = 24;      // and no strip is thinner than this

  // The lowest ink of a cluster in one column, or null where it draws nothing.
  const groundAt = (c, x) => {
    let lo = null;
    for (const m of c.masks) {
      if (x < m.x0 || x >= m.x0 + m.w) continue;
      for (let row = m.h - 1; row >= 0; row--) {
        if (m.bits[row * m.w + (x - m.x0)]) {
          const y = m.y0 + row + 1;
          if (lo === null || y > lo) lo = y;
          break;
        }
      }
    }
    return lo;
  };

  const banded = [];
  for (const c of clusters) {
    // Nothing off the bottom of the screen is banded: it gets no box at all a few
    // lines down, so cutting it into strips is four ways of saying the same nothing.
    if (c.w < BAND_MIN_W || c.y + c.h > CANVAS_H) { banded.push(c); continue; }
    const x0 = Math.round(c.x), x1 = Math.round(c.x + c.w);
    const bands = [];
    for (let x = x0; x < x1; x++) {
      const g = groundAt(c, x);
      if (g === null) continue;
      // MEASURED AGAINST THE BAND'S OWN LOW AND HIGH, not against a running foot.
      // Comparing each column with the band's deepest point lets a band CREEP: the
      // castle's left corner rises from y 198 to 244 a pixel at a time, every step
      // inside the tolerance, so the whole taper ends up in one band claiming 244 —
      // which is the 46px lie this exists to remove. Holding the whole band inside
      // one slack is the invariant worth having: every column of a band stands
      // within a man's height of the depth the band is drawn at.
      const last = bands[bands.length - 1];
      if (last && x === last.x1 &&
          Math.max(last.hi, g) - Math.min(last.lo, g) <= FOOT_SLACK) {
        last.x1 = x + 1;
        last.lo = Math.min(last.lo, g);
        last.hi = Math.max(last.hi, g);
        last.foot = last.hi;
      } else {
        bands.push({ x0: x, x1: x + 1, foot: g, lo: g, hi: g });
      }
    }
    // A strip too thin to be worth its own depth joins the neighbour it agrees with
    // more closely. Done repeatedly, because merging one can leave the next too thin.
    //
    // A STRIP KEEPS ITS LIE WHEN IT IS MERGED, and that is the accepted cost of not
    // cutting a drawing into slivers. The castle's far-left shadow tip is 17px wide
    // and bottoms 30px above the wall beside it; kept apart it is a 17px box, merged
    // it is 17px of shadow drawn at the wall's depth. Seventeen pixels of shadow over
    // the corner of a tent is not something anybody can see, and a board cut into
    // two-pixel strips is a different kind of wrong. tools/campaign.mjs draws the
    // same line: it ignores an overlap narrower than a hand.
    for (let pass = 0; pass < bands.length; pass++) {
      const i = bands.findIndex(b => b.x1 - b.x0 < BAND_MIN);
      if (i < 0 || bands.length < 2) break;
      const into = i === 0 ? 1
        : i === bands.length - 1 ? i - 1
        : Math.abs(bands[i - 1].foot - bands[i].foot) <= Math.abs(bands[i + 1].foot - bands[i].foot) ? i - 1 : i + 1;
      bands[into].x0 = Math.min(bands[into].x0, bands[i].x0);
      bands[into].x1 = Math.max(bands[into].x1, bands[i].x1);
      bands[into].foot = Math.max(bands[into].foot, bands[i].foot);
      bands[into].lo = Math.min(bands[into].lo, bands[i].lo);
      bands[into].hi = Math.max(bands[into].hi, bands[i].hi);
      bands.splice(i, 1);
    }
    if (bands.length < 2) { banded.push(c); continue; }
    console.log(`  banded: ${Math.round(c.w)}x${Math.round(c.h)} at ${Math.round(c.x)},${Math.round(c.y)} ` +
      `into ${bands.length} strip(s) — its ground line runs from ` +
      `${Math.min(...bands.map(b => b.foot))} to ${Math.max(...bands.map(b => b.foot))}`);
    for (const b of bands) {
      banded.push({ ...c, gs: c.gs, masks: c.masks, x: b.x0, w: b.x1 - b.x0,
                    y: c.y, h: b.foot - c.y });
    }
  }
  clusters.length = 0;
  clusters.push(...banded);

  const measured = [...clusters, ...loose];
  // The sheet is still written in the ARTIST'S order; a cluster's earliest group is
  // only used to sort the printed list.
  for (const m of measured) m.g = m.gs.reduce((a, c) => (c.start < a.start ? c : a));

  // AND A BOX WHOSE FOOT IS OFF THE BOTTOM OF THE SCREEN IS NOT AN OCCLUDER.
  //
  // The depth pass sorts by the foot of a box, so a thing standing at y 651 on a 540px
  // canvas sorts after EVERYTHING, forever. Nothing can ever be in front of it, because
  // there is no ground below the bottom edge for anything to stand on. A box like that
  // is not "a building figures walk behind", it is a guaranteed overdraw.
  //
  // Stage 5's bridge is the case. It is the exit — enemies walk ACROSS it — and it
  // runs off the bottom-right corner, so its box feet at 651. Given one it would paint
  // the whole bridge over every enemy on it, which is the one thing that must not
  // happen on the tile they are walking over.
  //
  // THE NEAR RAILING OF THAT SAME BRIDGE IS THE OPPOSITE CASE, and it is what --over
  // exists for. It is a wall between the camera and the deck, so everything on the
  // deck belongs behind it — "in front of everything, forever" is the RIGHT answer
  // for the rail and the wrong one for the deck it stands at the edge of. Nothing in the
  // geometry separates them; the artist does, by drawing the near rail as its own
  // part file. Name that part with --over and it comes off on a sheet of its own.
  const offBottom = measured.filter(m => m.h >= FRONT_MIN_H && m.y + m.h > CANVAS_H);
  for (const m of offBottom) {
    console.log(`  not boxed: ${Math.round(m.w)}x${Math.round(m.h)} at ${Math.round(m.x)},${Math.round(m.y)} ` +
      `— its foot is at y ${Math.round(m.y + m.h)}, past the ${CANVAS_H}px canvas, so nothing could ` +
      `ever stand in front of it` +
      (OVER ? '' : `. If it is the NEAREST thing on the board rather than a floor, draw it as ` +
        `its own layer part and name it with --over`));
  }

  // AND NOR IS A BOX THAT STANDS OVER A POST THE LEVEL PUTS A FIGURE ON.
  //
  // Stage 5's barricade is the case, and it is the long-diagonal problem again. It is
  // a low wall running up the board from the lower left, so its box FOOT is the
  // bottom of its far end at y 349 while the ground beside the two crossbowmen at its
  // near end is thirty pixels higher. One number cannot be the ground line of a thing
  // like that, and the one its box gives puts the whole wall in front of both men.
  //
  // The artist drew them the other way round — over the wall, plainly visible, which
  // is what a pair of crossbowmen at a barricade should look like — and the drawing is
  // the statement of intent. Boxing it hides them behind it and gains nothing: no
  // enemy comes within ninety pixels of that wall, so those two figures are the only
  // things on the board it could ever occlude.
  //
  // SAID RATHER THAN SUPPRESSED, like the off-canvas boxes above. If it is ever wrong,
  // it is wrong out loud.
  const posts = (level.garrison || []);
  const overPost = measured.filter(m => m.h >= FRONT_MIN_H && m.y + m.h <= CANVAS_H &&
    posts.some(p => p.x > m.x && p.x < m.x + m.w && p.y > m.y && p.y < m.y + m.h));
  for (const m of overPost) {
    console.log(`  not boxed: ${Math.round(m.w)}x${Math.round(m.h)} at ${Math.round(m.x)},${Math.round(m.y)} ` +
      `— it stands over a garrison post, and a box would draw it in front of the figure ` +
      `the artist drew in front of it`);
  }

  const tall = measured
    .filter(m => m.h >= FRONT_MIN_H && m.y + m.h <= CANVAS_H && !overPost.includes(m))
    .sort((a, b) => a.y + a.h - (b.y + b.h));
  const flat = measured.filter(m => m.h < FRONT_MIN_H);
  const shortest = Math.min(Infinity, ...tall.map(m => m.h));
  const tallestFlat = Math.max(0, ...flat.map(m => m.h));
  const low = FRONT_MIN_H * (1 - FRONT_CLEAR), high = FRONT_MIN_H * (1 + FRONT_CLEAR);
  if (tall.length && !ACCEPT && (shortest < high || tallestFlat > low)) {
    // SAY WHICH ONES, because the whole point is that a human has to look. The
    // message used to give two numbers and no way to find the shapes they came from,
    // which left "mark them another way" as advice with nowhere to start.
    const near = measured
      .filter(m => m.h > low && m.h < high)
      .sort((a, b) => a.h - b.h)
      .map(m => `${m.h.toFixed(1)}px at ${Math.round(m.x)},${Math.round(m.y)} (${Math.round(m.w)} wide, ` +
        `${m.h >= FRONT_MIN_H ? 'counted as STANDING' : 'counted as flat'})`);
    throw new Error(
      `the top layer has something sitting on the ${FRONT_MIN_H}px line: its shortest standing ` +
      `thing is ${shortest.toFixed(0)}px and its tallest flat one is ${tallestFlat.toFixed(0)}px, ` +
      `where the clear band is under ${low.toFixed(0)} and over ${high.toFixed(0)}. Height cannot ` +
      `tell them apart here.\n\nIn the band:\n  ${near.join('\n  ')}\n\n` +
      `Either redraw so the two kinds are clearly apart — a flat thing over ${FRONT_MIN_H}px is ` +
      `the case this guard exists for — or, if you have LOOKED at those shapes and the ` +
      `classification above is right, re-run with --accept and say so in the level file.`);
  }

  // The sheet: the same 1920x1080 artboard with the whole layer on it, in the
  // artist's own order, so a slice of it is a slice of the board.
  const FRONT = SRC.replace(/\.svg$/, '') + '_front.svg';
  const body = measured
    .flatMap(m => m.gs)
    .sort((a, b) => a.start - b.start)
    .map(g => svg.slice(g.start, g.end))
    .join('\n');
  writeFileSync(FRONT, sheet(body));

  console.log(`\nwrote ${FRONT} — the whole top layer, ${measured.length} thing(s), ` +
    `${tall.length} of which stand up` +
    (tall.length ? `: shortest ${shortest.toFixed(0)}px against ${tallestFlat.toFixed(0)}px of flat` : ''));
  // AND WHICH PLOTS STAND INSIDE ONE, said rather than judged.
  //
  // A box that covers a plot is a piece of scenery the game will draw AFTER anything
  // built there. That is right when the scenery really is nearer the camera — a plot
  // tucked behind a house is meant to have the house in front of it — and it is the
  // shape of a bug when it is not: stage 5 shipped with a castle box dragged down to
  // a painted villager's feet, and a watchtower on open ground in front of the keep
  // was drawn underneath it.
  //
  // NOT A REFUSAL, because nothing here can tell those two apart. Both are "a box
  // whose foot is below a plot it stands over", and only the drawing says which. So
  // this prints them to be looked at, like the FAR notes on the plot list above.
  const covered = [];
  level.plots.forEach((p, i) => {
    for (const m of tall) {
      if (p.x > m.x && p.x < m.x + m.w && p.y > m.y && p.y < m.y + m.h) {
        covered.push(`  plot ${i} (${p.x}, ${p.y}) stands inside the ${Math.round(m.w)}x` +
          `${Math.round(m.h)} box footing at y ${Math.round(m.y + m.h)} — whatever is built ` +
          `there is drawn BEHIND it. Right if that scenery is nearer the camera, wrong if ` +
          `the box has been dragged down the board by something lying in front of it.`);
      }
    }
  });
  if (covered.length) {
    console.log(`\nlook at these:`);
    for (const line of covered) console.log(line);
  }

  console.log(`front, in depth order — paste into the level file:`);
  for (const m of tall) {
    console.log(`    { x: ${String(Math.round(m.x)).padStart(3)}, y: ${String(Math.round(m.y)).padStart(3)}, ` +
      `w: ${String(Math.round(m.w)).padStart(3)}, h: ${String(Math.round(m.h)).padStart(3)} },` +
      `   // stands on y ${Math.round(m.y + m.h)}`);
  }

  // --- and the near overlay, on a sheet of its own ------------------------------
  if (overSpan) {
    const mine = allGroups(svg).filter(g => inSpan(g) && !wrappers.has(g.start));
    const outerOver = mine.filter(g => !mine.some(o => o !== g && o.start <= g.start && o.end >= g.end));
    if (!outerOver.length) throw new Error(`--over ${OVER}: that part draws nothing`);

    // SLICED OUT OF THE STACKED TEXT, not re-read from the part file. It is the same
    // argument the front sheet is written on: what lands on the sheet is the text the
    // base was built from, so the two copies cannot disagree about where anything is.
    const OVER_F = SRC.replace(/\.svg$/, '') + '_over.svg';
    writeFileSync(OVER_F, sheet(outerOver.map(g => svg.slice(g.start, g.end)).join('\n')));

    const b = bounds(outerOver.flatMap(g => g.subPaths.flat()));
    const [x, y] = [b.x0 * MAP_SCALE, b.y0 * MAP_SCALE];
    const [w, h] = [(b.x1 - b.x0) * MAP_SCALE, (b.y1 - b.y0) * MAP_SCALE];
    console.log(`\nwrote ${OVER_F} — layer ${OVER} alone, ${outerOver.length} thing(s), ` +
      `in front of everything on the board`);
    console.log(`over — paste into the level file:`);
    console.log(`  over: { x: ${Math.round(x)}, y: ${Math.round(y)}, ` +
      `w: ${Math.round(w)}, h: ${Math.round(h)} },` +
      `   // ${Math.round(y + h) > 540 ? 'runs off the bottom of the canvas' : `foot at y ${Math.round(y + h)}`}`);
  }
}
