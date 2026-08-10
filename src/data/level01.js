// Hand-authored waypoints. Enemies walk these in order, then damage the keep.
// Coordinates are in logical canvas space (960x540).
//
// TRACED FROM THE ARTWORK. These are not drawn by hand any more: the road in
// assets/map/Map.svg is the level, and this polyline is its centreline,
// extracted by rasterising the map, isolating the road colour, and walking the
// ridge of the distance transform from one end of the shape to the other. The
// art is the source of truth for where the road is; this file just has to agree
// with it. If the map is redrawn, re-extract rather than nudging numbers here.
//
// The first and last points sit off-canvas so enemies enter and leave unseen.
//
// BOTH ENDS WERE RE-MEASURED. The ridge walk that produced this polyline bends
// where the road is cut off by the canvas edge — a distance transform has no way
// to know the shape continues past the crop, so its ridge curls toward the
// middle of the flat end cap. That put the entry at (0, 236) when the road at
// x=0 actually spans y 160..230: the first enemy of every wave walked in six
// pixels BELOW the tarmac and took 80px to find it. The exit had the same fault
// mirrored, drifting 26px above centre and leaving along the top kerb.
//
// The two points at each end now sit on the road's measured centreline (x=0 is
// 195, x=959 is 175) and the off-canvas points extend along the road's own
// slope there rather than toward a corner. The middle of the path was left
// alone: it tracks about 5px below centre the whole way, which is a consistent
// bias on a 70px road and not worth disturbing a tuned level over.
const route1 = [
  { x: -40, y: 203 },
  { x: 0, y: 195 },
  { x: 49, y: 191 },
  { x: 149, y: 174 },
  { x: 428, y: 198 },
  { x: 441, y: 216 },
  { x: 437, y: 236 },
  { x: 416, y: 271 },
  { x: 280, y: 370 },
  { x: 243, y: 421 },
  { x: 247, y: 431 },
  { x: 272, y: 452 },
  { x: 332, y: 466 },
  { x: 582, y: 444 },
  { x: 614, y: 415 },
  { x: 613, y: 405 },
  { x: 544, y: 314 },
  { x: 548, y: 304 },
  { x: 581, y: 263 },
  { x: 637, y: 233 },
  { x: 927, y: 181 },
  { x: 959, y: 176 },
  { x: 1000, y: 174 }
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
  src: 'assets/map/Map.svg',
  routes: [route1],
  plots: plots1,
  march: 1,
  startGold: 220,
  startLives: 20
};
