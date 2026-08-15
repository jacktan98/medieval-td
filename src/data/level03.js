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
// and paste; do not nudge them by hand.

// The two roads, north then south, each entry to its own exit.
//
// The tracer pairs them by vertical order, which is exact rather than a guess:
// two roads that do not cross cannot swap which one is the upper. Both are about
// 1050px long — within 2% of each other — so neither is the fast way in, and
// "closest to the exit" means the same thing on both. That matters more here
// than on either other map, because it is what lets an archery tower's targeting
// compare an enemy on the north road with one on the south.
//
// Both are 36px of road either side of the centreline at their narrowest, which
// is what the lane offsets in route.js have to fit inside. Tighter than map 1's,
// so a barracks wedge at across = +/-20 has 16px of margin rather than 40.
import { wavesLong } from './waves.js';

const north = [
  { x: -39, y: 246 },
  { x: 1, y: 241 },
  { x: 67, y: 219 },
  { x: 109, y: 213 },
  { x: 169, y: 218 },
  { x: 347, y: 245 },
  { x: 405, y: 241 },
  { x: 503, y: 223 },
  { x: 611, y: 234 },
  { x: 807, y: 239 },
  { x: 865, y: 232 },
  { x: 959, y: 207 },
  { x: 999, y: 204 }
];

const south = [
  { x: -39, y: 381 },
  { x: 1, y: 385 },
  { x: 109, y: 386 },
  { x: 167, y: 393 },
  { x: 239, y: 408 },
  { x: 297, y: 408 },
  { x: 373, y: 392 },
  { x: 479, y: 350 },
  { x: 519, y: 343 },
  { x: 555, y: 351 },
  { x: 649, y: 391 },
  { x: 829, y: 411 },
  { x: 893, y: 399 },
  { x: 959, y: 369 },
  { x: 999, y: 366 }
];

// The ten markers painted into the map, in road order — the order the splitter
// prints them in, which is the order a player meets them.
//
// They sit 70 to 87px off the nearest road, which is the band map 2's nine sit
// in too, so a tier 1 barracks can reach the tarmac from any of them.
//
// FOUR OF THE TEN LIE BETWEEN THE TWO ROADS — 0, 2, 6 and 9 — and those are the
// interesting ones: an archery tower there covers both roads at once, while a
// barracks there has to choose which one to stand its squad on. Of the rest, 3,
// 5 and 8 watch only the north road and 1, 4 and 7 only the south. That split is
// the whole map: a build that ignores half of it loses to half of every wave.
//
// TWO OF THESE ARE NOT WHAT THE SPLITTER PRINTED, and they are the only
// hand-edited numbers in this file. Plots 3 and 5 were painted at y 159 and 163,
// which is 8 to 12px above the highest marker on any other map — and map 1's
// highest already clears the HUD by exactly one pixel. A tier 2 archery tower on
// either of them put its roof under the pause button and the next-wave button.
// `node tools/hud-clear.mjs` prints the minimum each one needs; they are moved
// to exactly that and no further, which is 11px and 7px — invisible on the
// board, and both still clear the road by more than the marker's own dirt patch.
//
// THE ARTWORK SHOULD BE CORRECTED so these can go back to being pasted. Until it
// is, re-running the splitter will print the old values and quietly undo this.
const plots3 = [
  { x: 92,  y: 304 },   // between the roads,  82 off
  { x: 108, y: 456 },   // south of the south road,  70 off
  { x: 302, y: 323 },   // between the roads,  82 off
  { x: 342, y: 170 },   // north — painted at 159, moved 11 to clear the HUD
  { x: 513, y: 432 },   // south,  87 off
  { x: 627, y: 170 },   // north — painted at 163, moved 7 to clear the HUD
  { x: 693, y: 313 },   // between the roads,  77 off
  { x: 727, y: 475 },   // south,  75 off
  // Painted at (804, 163) and LEFT THERE. It needs y >= 214 to clear the
  // description panel, and 214 is on the tarmac; sideways it would either still
  // be under the panel or 80px from plot 5, which is closer than two markers are
  // wide. There is no fix in this file — the marker has to move in the artwork.
  // What it costs meanwhile is the top third of a tall tower being hidden while
  // something is selected, which is milder than plots 3 and 5 were: the
  // description panel is not always on screen, and the two buttons are.
  { x: 804, y: 163 },   // north,  76 off
  { x: 840, y: 323 }    // between the roads,  84 off
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
