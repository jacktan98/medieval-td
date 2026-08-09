// Hand-authored waypoints. Enemies walk these in order, then damage the keep.
// Coordinates are in logical canvas space (960x540).
//
// TRACED FROM THE ARTWORK. These are not drawn by hand any more: the road in
// assets/map/Map_1.svg is the level, and this polyline is its centreline,
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
export const path = [
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
// THE LAST REDRAW RENUMBERED THESE. The road did not move, but two markers did,
// and because the list is in road order that was enough to shuffle the indices:
// the top-middle plot went from index 2 (26% along) to index 6 (77% along), and
// everything between it and the end shifted down one. Anything that names a plot
// by number — tools/sim.mjs does — has to be re-derived, not carried over. That
// is the single most expensive mistake available in this file and it has already
// been made once.
export const plots = [
  { x:  91, y: 245 },   //  7% along,  60 off
  { x: 335, y: 238 },   // 21% along,  48 off
  { x: 124, y: 452 },   // 44% along, 123 off   FAR
  { x: 360, y: 404 },   // 51% along,  59 off
  { x: 495, y: 396 },   // 59% along,  55 off
  { x: 717, y: 466 },   // 66% along, 115 off   FAR
  { x: 557, y: 185 },   // 77% along,  80 off
  { x: 652, y: 306 },   // 78% along,  71 off
  { x: 664, y: 153 }    // 82% along,  74 off
];

// There is no keep coordinate any more. It existed only so render.js could draw
// a vector castle at the end of the road, and the artwork does not have one yet.
// The rules never read it: an enemy leaks when it runs out of path, not when it
// touches a building. If a keep is drawn later it belongs in the map artwork,
// and it still does not need a coordinate here.

export const startGold = 220;
export const startLives = 20;
