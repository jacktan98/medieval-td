// The road, as waypoints enemies walk. Coordinates are in the logical canvas
// space (960x540), and the first and last points sit off-canvas so enemies
// enter and leave unseen.
//
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Map_1.svg`.
// The road in assets/map/Map_1.svg is the level; this is its centreline. Redraw
// and re-run rather than nudging numbers here.
//
// IT USED TO BE HAND-TUNED, and that is what had to go. The old polyline was
// extracted before the tool existed and then patched by hand at both ends; its
// own notes admitted it "tracks about 5px below centre the whole way", which was
// harmless while enemies walked it single file. It stopped being harmless when
// they got lanes: a line 5px off centre in the straights and further through the
// bends left only 10px of road beside it in places, so the outer lane walked on
// the grass for a tenth of the route. The fix is not a narrower lane, it is a
// line that is actually down the middle — this one has 32px of road either side
// at its narrowest, which fits every lane with room to spare.
//
// `node tools/trace-road.mjs assets/map/Map_1.svg` checks that, at the end of its
// output, against the routes the game actually loads.
import { waves, wavesExtended } from './waves.js';

const route1 = [
  { x: -39, y: 198 },
  { x: 1, y: 195 },
  { x: 145, y: 170 },
  { x: 227, y: 163 },
  { x: 339, y: 168 },
  { x: 387, y: 178 },
  { x: 415, y: 189 },
  { x: 429, y: 202 },
  { x: 436, y: 219 },
  { x: 433, y: 237 },
  { x: 421, y: 257 },
  { x: 381, y: 297 },
  { x: 279, y: 368 },
  { x: 257, y: 393 },
  { x: 251, y: 413 },
  { x: 264, y: 437 },
  { x: 297, y: 453 },
  { x: 351, y: 463 },
  { x: 439, y: 465 },
  { x: 493, y: 460 },
  { x: 551, y: 448 },
  { x: 579, y: 436 },
  { x: 596, y: 420 },
  { x: 604, y: 405 },
  { x: 602, y: 389 },
  { x: 558, y: 329 },
  { x: 551, y: 305 },
  { x: 565, y: 275 },
  { x: 603, y: 245 },
  { x: 669, y: 217 },
  { x: 761, y: 193 },
  { x: 847, y: 182 },
  { x: 959, y: 177 },
  { x: 999, y: 172 }
];

// Fixed build plots — the nine markers painted into the map, read out of the
// SVG's group transforms so they line up with the artwork exactly.
//
// They sit much closer to the road than the old hand-placed plots did, which is
// fine: that clearance rule existed so the code-drawn plot discs would not
// overlap the code-drawn road, and neither is drawn any more.
//
// These are exactly where the markers are painted — no nudging any more. The
// old note here said a plot above y=127 had its archer clipped by the HUD, and
// that stopped being true when the HUD stopped painting a bar over the board:
// the header is part of the map now, drawn first, so a tall tower stands in
// front of it rather than being cut off by it. Only the HUD *text* is drawn
// after the towers, and tools/hud-clear.mjs checks that no tower reaches it.
//
// Ordered by how far along the road they sit, so an index means something: plot
// 0 is the first one the column walks past and plot 8 is the last. tools/sim.mjs
// picks plots by index, so an arbitrary order there quietly builds a "spread"
// of towers that is nothing of the sort.
//
// Both the positions and this ordering come out of `node tools/split-map.mjs`,
// which reads them off the artwork. Do not hand-edit them; redraw and re-run.
//
// The two marked FAR are more than 110px off the road and cover very little of
// it, so they are tier 3 positions or barracks positions, not general-purpose
// ones.
//
// A REDRAW CAN RENUMBER THESE, and once did: the road did not move, but two
// markers did, and because the list is in road order that was enough to shuffle
// the indices — the top-middle plot went from index 2 (26% along) to index 6
// (77% along) and everything after it shifted down one. Anything that names a
// plot by number — tools/sim.mjs does — has to be re-derived, not carried over.
// That is the single most expensive mistake available in this file.
//
// The redraw that made the plot marker bigger moved all nine and renumbered
// none of them: every marker slid a little to make room, and each stayed on its
// own stretch of road. Check the percentages against the previous list rather
// than assuming it, though — that check is cheap and the mistake is not.
//
// The last entry then moved again on its own, from (721, 128), because a tier 2
// tower there was cut off by the top of the board and stood inside the speed
// button. It is a better plot now by every measure that can be counted — and it
// still cost the heavy 25 hp to keep the level winnable. The note on that hp in
// data/waves.js is the one to read before moving a marker.
const plots1 = [
  { x: 153, y: 247 },   // 11% along,  72 off
  { x: 311, y: 239 },   // 20% along,  51 off
  { x: 105, y: 454 },   // 44% along, 142 off   FAR
  { x: 373, y: 395 },   // 52% along,  67 off
  { x: 484, y: 392 },   // 58% along,  60 off
  { x: 734, y: 471 },   // 66% along, 132 off   FAR
  { x: 561, y: 171 },   // 78% along,  91 off
  { x: 670, y: 305 },   // 81% along,  77 off
  { x: 809, y: 262 }    // 89% along,  59 off
];

// There is no keep coordinate any more. It existed only so render.js could draw
// a vector castle at the end of the road, and the artwork does not have one yet.
// The rules never read it: an enemy leaks when it runs out of path, not when it
// touches a building. If a keep is drawn later it belongs in the map artwork,
// and it still does not need a coordinate here.



// The level, as the game asks for it. `routes` is a LIST because a map can have
// more than one road in — map 2 has two. This one has a single road, so it has
// a single route, and nothing about it changed when the list arrived.
export const level01 = {
  id: 'm1',
  name: 'The Bend',
  art: 'map01',
  src: 'assets/map/Map_1.svg',
  routes: [route1],
  plots: plots1,
  // The shared eight-wave table, which map 2 runs too. A level names its own table so the
  // difficulty of a map is a property of the map. See data/waves.js.
  waves,
  // THE SAME MAP, TWO WAVES LONGER, and a table of its own rather than a
  // derivation of the one above it. It was `extendedOf(waves)` — add one to the
  // throwers from wave 5 on, then step the last wave twice — until the owner
  // played it and hand-tuned all ten. See wavesExtended in data/waves.js.
  wavesExtended,
  startGold: 220,
  startLives: 20
};
