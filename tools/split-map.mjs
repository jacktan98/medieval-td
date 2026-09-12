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

  for (const [i, at] of level.garrison.entries()) {
    const win = { x0: at.x - GARRISON_W, x1: at.x + GARRISON_W,
                  y0: at.y - GARRISON_UP, y1: at.y + GARRISON_DOWN };
    const mine = outer2.filter(g => {
      const b = bounds(g.subPaths.flat());
      const [x0, y0, x1, y1] = [b.x0 * MAP_SCALE, b.y0 * MAP_SCALE, b.x1 * MAP_SCALE, b.y1 * MAP_SCALE];
      return x0 >= win.x0 && x1 <= win.x1 && y0 >= win.y0 && y1 <= win.y1;
    });
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
const FRONT_MIN_H = 30;      // game px: a thing this tall is standing up
// Set by --accept: a human has looked at whatever is sitting on the line and confirmed
// the tool classified it right. It does not change any classification — it only stops
// the refusal — and it is meant to be paired with a note in the level file saying what
// was looked at, so the next person does not have to look again.
const ACCEPT = process.argv.includes('--accept');
const FRONT_CLEAR = 0.15;    // and nothing may sit within this much of the line

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
  const inTop = allGroups(svg).filter(g => g.start > first.index && !wrappers.has(g.start));
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
  // Overlap has to be real in both axes; boxes that merely touch stay apart.
  const overlaps = (a, b) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const grow = (c, b) => {
    const x = Math.min(c.x, b.x), y = Math.min(c.y, b.y);
    c.gs.push(...b.gs);
    c.w = Math.max(c.x + c.w, b.x + b.w) - x;
    c.h = Math.max(c.y + c.h, b.y + b.h) - y;
    c.x = x; c.y = y;
  };

  const seeds = boxes.filter(b => b.h >= FRONT_MIN_H).map(b => ({ ...b, gs: [...b.gs] }));
  const loose = boxes.filter(b => b.h < FRONT_MIN_H).map(b => ({ ...b, gs: [...b.gs] }));

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
  const reach = clusters.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h }));
  for (let i = loose.length - 1; i >= 0; i--) {
    const k = reach.findIndex(r => overlaps(r, loose[i]));
    if (k >= 0) { grow(clusters[k], loose[i]); loose.splice(i, 1); }
  }

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
  // The cost is that its near railing does not occlude either: a figure on the deck is
  // drawn over the rail rather than behind it. That is a small wrongness in exchange
  // for the figure being visible at all, and the fix if it ever matters is on the
  // artist's side — the near rail as its own group, on the ground, inside the canvas.
  const CANVAS_H = 540;
  const offBottom = measured.filter(m => m.h >= FRONT_MIN_H && m.y + m.h > CANVAS_H);
  for (const m of offBottom) {
    console.log(`  not boxed: ${Math.round(m.w)}x${Math.round(m.h)} at ${Math.round(m.x)},${Math.round(m.y)} ` +
      `— its foot is at y ${Math.round(m.y + m.h)}, past the ${CANVAS_H}px canvas, so nothing could ` +
      `ever stand in front of it`);
  }

  const tall = measured
    .filter(m => m.h >= FRONT_MIN_H && m.y + m.h <= CANVAS_H)
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
  writeFileSync(FRONT,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">\n' +
    '<g>\n' + body + '\n</g>\n</svg>\n');

  console.log(`\nwrote ${FRONT} — the whole top layer, ${measured.length} thing(s), ` +
    `${tall.length} of which stand up` +
    (tall.length ? `: shortest ${shortest.toFixed(0)}px against ${tallestFlat.toFixed(0)}px of flat` : ''));
  console.log(`front, in depth order — paste into the level file:`);
  for (const m of tall) {
    console.log(`    { x: ${String(Math.round(m.x)).padStart(3)}, y: ${String(Math.round(m.y)).padStart(3)}, ` +
      `w: ${String(Math.round(m.w)).padStart(3)}, h: ${String(Math.round(m.h)).padStart(3)} },` +
      `   // stands on y ${Math.round(m.y + m.h)}`);
  }
}
