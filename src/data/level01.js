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
export const path = [
  { x: -29, y: 263 },
  { x: 0, y: 236 },
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
  { x: 959, y: 149 },
  { x: 987, y: 121 }
];

// Fixed build plots — the nine markers painted into the map, read out of the
// SVG's group transforms so they line up with the artwork exactly.
//
// They sit much closer to the road than the old hand-placed plots did, which is
// fine: that clearance rule existed so the code-drawn plot discs would not
// overlap the code-drawn road, and neither is drawn any more.
//
// The one rule that still binds is the HUD. A tower is drawn 97 tall from 12
// below its plot and the archer stands on a deck 28% down it, so the archer's
// head lands at plot.y - 86 and the header covers everything above y=40. Any
// plot above y=127 has its archer clipped; the top-left marker was painted at
// 116 and is placed at 127 here, 11px below where it is drawn.
// Ordered by how far along the road they sit, so an index means something: plot
// 0 is the first one the column walks past and plot 8 is the last. tools/sim.mjs
// picks plots by index, so an arbitrary order there quietly builds a "spread"
// of towers that is nothing of the sort.
//
// The two marked FAR are more than 110px off the road. They cover almost none
// of it at tier 1 range (118) — plot 3 covers literally none — so they are
// tier 3 positions or barracks positions, not general-purpose ones.
export const plots = [
  { x: 134, y: 127 },   // 11% along,  49 off
  { x: 454, y: 129 },   // 27% along,  74 off
  { x: 330, y: 257 },   // 35% along,  62 off
  { x: 126, y: 462 },   // 44% along, 124 off   FAR
  { x: 368, y: 409 },   // 52% along,  54 off
  { x: 471, y: 406 },   // 57% along,  48 off
  { x: 706, y: 482 },   // 66% along, 114 off   FAR
  { x: 667, y: 312 },   // 80% along,  83 off
  { x: 714, y: 142 }    // 84% along,  76 off
];

// There is no keep coordinate any more. It existed only so render.js could draw
// a vector castle at the end of the road, and the artwork does not have one yet.
// The rules never read it: an enemy leaks when it runs out of path, not when it
// touches a building. If a keep is drawn later it belongs in the map artwork,
// and it still does not need a coordinate here.

export const startGold = 220;
export const startLives = 20;
