// The third stage: two roads that never meet.
//
// Maps 1 and 2 both funnel to one keep — map 1 has a single road, map 2 has two
// that merge before the end. This one has two SEPARATE roads, each with its own
// entry on the left and its own exit on the right, and nothing crosses. Six ways
// in altogether, three lanes on each road.
//
// That changes what a plot is worth in a way no number here expresses. On the
// other two maps every tower is on the same problem; here a tower covers one
// road or the other, and the ten markers are split between them. A build that
// stacks one road is not half a build, it is a build that loses to the other
// road — which is why this map gets ten plots and ten waves rather than nine
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
// THE NORTH ROAD NOW FALLS AWAY RATHER THAN CLIMBING. It used to leave at y 204
// and it leaves at 278, which is 74px lower and most of the way to the south
// road's old exit.
//
// BOTH ROADS ARE THE SAME LENGTH THEY WERE — 1051 and 1068 before, 1049 and
// 1069 now — which is the number the waves were tuned against, so the redraw is
// a change of shape and not of pace. What did move is the markers: eight of the
// ten, up to 74px, so the list below is not the one this file shipped with even
// where the roads look the same.
import { wavesLong } from './waves.js';

const north = [
  { x: -39, y: 247 },
  { x: 1, y: 241 },
  { x: 75, y: 218 },
  { x: 119, y: 213 },
  { x: 181, y: 216 },
  { x: 347, y: 241 },
  { x: 505, y: 226 },
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

// The ten markers painted into the map, in road order — the order the splitter
// prints them in, which is the order a player meets them.
//
// TWO ARE STILL NUDGED, and they are the only hand-edited numbers here. The
// redraw moved eight of the ten, and it moved both problem markers down — plot
// 3 from y 159 to 166 and plot 8 from y 163 to 200 — but `node
// tools/hud-clear.mjs` still wants 170 and 214, so they are 4px and 14px short
// rather than 11 and 51. They are moved to exactly what it asks and no further.
//
// WHAT CHANGED IS THAT PLOT 8 CAN NOW BE FIXED AT ALL. It was left broken last
// time with a note saying only the artwork could help: it needed y >= 214 then
// too, and 214 was tarmac, so there was nowhere to put it. The north road falls
// away in the redraw and the tarmac under that marker starts at y 237 — the
// dirt patch of a marker at 214 ends at 237, flush with the kerb and not over
// it. A 51px problem with no legal answer became a 14px one with an exact answer
// because the road moved, not because the marker did.
//
// Re-running the splitter will print 166 and 200 and quietly undo both.
//
// They sit 68 to 86px off the nearest road's CENTRELINE, which is what decides
// whether a tower reaches: a tier 1 barracks has 165 of range and the board is
// squashed to 0.62 vertically, so it reaches 102px straight up or down and every
// marker is inside that. The splitter prints a smaller figure per marker (33 to
// 87) because it measures to the kerb, and the kerb is up to 45px nearer than
// the lane the enemies actually walk in.
//
// FOUR OF THE TEN LIE BETWEEN THE TWO ROADS — 0, 2, 5 and 9 — and those are the
// interesting ones: an archery tower there covers both roads at once, while a
// barracks there has to choose which one to stand its squad on. Of the rest, 3,
// 6 and 8 watch only the north road and 1, 4 and 7 only the south. The redraw
// shuffled which index is which but not the split itself: four in the middle and
// three on each side, before and after. That split is the whole map — a build
// that ignores half of it loses to half of every wave.
const plots3 = [
  { x: 79,  y: 304 },   // between the roads — 83 from both, the truest middle
  { x: 91,  y: 457 },   // south of the south road,  70 off
  { x: 329, y: 317 },   // between the roads,  78 north / 83 south
  { x: 369, y: 170 },   // north — painted at 166, moved 4 to clear the pause button
  { x: 513, y: 432 },   // south,  86 off
  { x: 679, y: 333 },   // between the roads,  74 north / 73 south
  { x: 682, y: 190 },   // north,  68 off
  { x: 727, y: 475 },   // south,  70 off
  { x: 853, y: 214 },   // north — painted at 200, moved 14 to clear the info box
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
