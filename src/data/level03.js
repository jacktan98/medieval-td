// The third stage: two roads that never meet.
//
// Maps 1 and 2 both funnel to one keep — map 1 has a single road, map 2 has two
// that merge before the end. This one has two SEPARATE roads, each with its own
// entry on the left and its own exit on the right, and nothing crosses. Six ways
// in altogether, three lanes on each road.
//
// That changes what a plot is worth in a way no number here expresses. On the
// other two maps every tower is on the same problem; here a tower covers one
// road or the other, and the markers are split between them. A build that
// stacks one road is not half a build, it is a build that loses to the other
// road — which is why this map gets eleven plots and ten waves rather than nine
// and eight. There is more board to cover and more time to cover it in.
//
// EVERY NUMBER BELOW IS MEASURED FROM THE ARTWORK. The routes come from
// `node tools/trace-road.mjs assets/map/Map_3.svg` and the plots from
// `node tools/split-map.mjs assets/map/Map_3.svg`. Re-run both after any redraw
// and paste; do not nudge them by hand, except for the two markers the HUD
// forces and which are called out over the list.
//
// `node tools/split-map.mjs` also REBUILDS assets/map/Map_3_base.svg, which is
// the file the game actually draws — Map_3.svg is the artist's copy, markers and
// all. Deleting the base and re-uploading the source leaves the map blank until
// the splitter is run again.

// The two roads, north then south, each entry to its own exit.
//
// The tracer pairs them by vertical order, which is exact rather than a guess:
// two roads that do not cross cannot swap which one is the upper. 1049 and
// 1068px — within 2% of each other — so neither is the fast way in, and
// "closest to the exit" means the same thing on both. That matters more here
// than on either other map, because it is what lets an archery tower's targeting
// compare an enemy on the north road with one on the south.
//
// Both are 34px of road either side of the centreline at their narrowest, which
// is what the lane offsets in route.js have to fit inside. Tighter than map 1's,
// so a barracks wedge at across = +/-20 has 14px of margin rather than 40.
//
// THE LATEST REDRAW LEFT THE ROADS ALONE. 1049 and 1068px, against 1049 and
// 1069 before it — the tracer picked up one extra vertex on the north road at
// (547, 231) and moved three others by a handful of pixels, and that is the
// whole difference. The waves were tuned against those lengths, so this upload
// changes the PLOTS and nothing about the pace.
import { wavesLong, extendedOf } from './waves.js';

const north = [
  { x: -39, y: 246 },
  { x: 1, y: 241 },
  { x: 67, y: 220 },
  { x: 119, y: 213 },
  { x: 197, y: 218 },
  { x: 333, y: 243 },
  { x: 503, y: 225 },
  { x: 547, y: 231 },
  { x: 655, y: 255 },
  { x: 757, y: 269 },
  { x: 909, y: 269 },
  { x: 959, y: 275 },
  { x: 999, y: 278 }
];

const south = [
  { x: -39, y: 382 },
  { x: 1, y: 385 },
  { x: 129, y: 388 },
  { x: 239, y: 409 },
  { x: 287, y: 409 },
  { x: 373, y: 393 },
  { x: 475, y: 350 },
  { x: 513, y: 343 },
  { x: 547, y: 352 },
  { x: 617, y: 395 },
  { x: 649, y: 407 },
  { x: 781, y: 404 },
  { x: 905, y: 426 },
  { x: 959, y: 429 },
  { x: 999, y: 432 }
];

// The ELEVEN markers painted into the map, in road order — the order the
// splitter prints them in, which is the order a player meets them.
//
// NOT ONE OF THEM IS NUDGED. Every pair below is exactly what `node
// tools/split-map.mjs assets/map/Map_3.svg` prints, and that is the point: the
// artist looks at the board and compares it with the file they drew, so a marker
// the game puts anywhere else is a bug in the game however good the reason was.
//
// TWO OF THEM USED TO BE, and it is worth knowing what it cost, because the
// reasons were real. One was pushed 4px down to keep a watchtower's roof out of
// the pause plate, and the marker at 853,200 was pushed 14px down to keep one
// out of the info panel. 4px is invisible. 14px is not: the marker's dirt patch
// is 46px deep, so shifting its centre 14 put its lower edge on the north road's
// kerb at y 237, and on screen the plot looked like it was sitting in the road.
// That was reported from a screenshot within a day.
//
// So the HUD moved instead, as far as it could. The button row starts at 415
// rather than 405 — see HUD_LEAD in render.js — which costs nothing, since the
// row had 46px of slack before the info panel. Plot 9 has no such answer: the
// panel is in the corner, it is 197 wide, and a tower on that marker is inside it
// whatever either of them does. So the tallest tower there — an Archery Tier II,
// 153px of it — loses the top 13px of its roof behind the panel WHILE SOMETHING
// IS SELECTED, and nothing at all the rest of the time. tools/hud-clear.mjs
// reports it rather than failing on it; see the note there about controls and
// panels being different problems.
//
// THE ELEVENTH MARKER IS 206,311, and it is the one addition this upload makes.
// Two others moved with it — 369,166 -> 346,174 and 727,475 -> 755,478 — and
// nothing else did. In particular the two markers nearest the description panel,
// 682,190 and 853,200, are at exactly the pixels they were at before, so the
// 13px of roof above is unchanged: pushing THOSE two down is what would close it.
//
// They sit 67 to 92px off the nearest road's CENTRELINE, which is what decides
// whether a tower reaches: a tier 1 barracks has 165 of range and the board is
// squashed to 0.62 vertically, so it reaches 102px straight up or down and every
// marker is inside that. The splitter prints a smaller figure per marker (67 to
// 90) because it measures to the kerb, and the kerb is nearer than the lane the
// enemies actually walk in.
//
// FIVE OF THE ELEVEN LIE BETWEEN THE TWO ROADS — 0, 2, 3, 7 and 10 — and those
// are the interesting ones: an archery tower there covers both roads at once,
// while a barracks there has to choose which one to stand its squad on. Of the
// rest, 4, 6 and 9 watch only the north road and 1, 5 and 8 only the south. The
// new marker went into the middle, so the map is now five-three-three where it
// was four-three-three. That split is the whole map — a build that ignores half
// of it loses to half of every wave.
//
// 6 AND 7 ARE A HAIR APART AND THE ORDER IS NOT ARBITRARY. 682,190 has 328 of
// road still to walk and 679,333 has 320, so the north one is met first and goes
// first. They were pasted the other way round once. Nothing on the board looks
// any different, and every plot index in tools/sim.mjs quietly points at the
// other tower.
const plots3 = [
  { x:  79, y: 304 },   // between the roads — 83 from both, the truest middle
  { x:  91, y: 457 },   // south,  70 off
  { x: 206, y: 311 },   // between the roads — THE NEW ONE, 92 north / 91 south
  { x: 329, y: 317 },   // between the roads,  74 north / 83 south
  { x: 346, y: 174 },   // north,  67 off
  { x: 513, y: 432 },   // south,  86 off
  { x: 682, y: 190 },   // north,  68 off
  { x: 679, y: 333 },   // between the roads,  75 north / 73 south
  { x: 755, y: 478 },   // south,  73 off
  { x: 853, y: 200 },   // north,  69 off — the one the info panel overlaps
  { x: 864, y: 342 }    // between the roads,  73 north / 76 south
];

export const level03 = {
  id: 'm3',
  name: 'Two Rivers',
  art: 'map03',
  src: 'assets/map/Map_3.svg',
  routes: [north, south],
  plots: plots3,
  // TEN, where the other two run eight. More board to cover and more time to
  // cover it in — see wavesLong in data/waves.js for why they are bigger as
  // well as more numerous.
  waves: wavesLong,
  wavesExtended: extendedOf(wavesLong),
  // 260 RATHER THAN THE OTHER TWO MAPS' 220, and it is the map's own answer to
  // its first problem: nothing here can be defended until two roads are
  // defended, and 220 is three tier 1 towers, which is a good start on one road
  // and a bad one on two. Over 12 seeds and four hand-made mixed builds the
  // extra 40 is worth about 15 points of win rate: 29% at 220, 44% at 260, 54%
  // at 300.
  //
  // The waves were then tuned around this purse rather than the other way about,
  // because the purse is the map's character and the waves are a dial. See
  // wavesLong in data/waves.js for the whole search.
  startGold: 260,
  startLives: 20
};
