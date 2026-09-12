// STAGE 5: Winchester Castle, and the first board whose keep is not on the right.
//
// The Workshop was the yard outside the town. This is the castle itself: a keep in
// the top-left corner with its gate and its two banners, a wooded park around it,
// and a river along the bottom-right with a wooden bridge over it.
//
// THE ENEMIES LEAVE OVER THE BRIDGE, which is the thing about this board. Every
// board before it ran west to east and ended at a keep off the RIGHT edge — a
// convention so old that tools/trace-road.mjs was built on it and refused this map
// outright ("road does not reach both edges", three mouths and no exit). The exit is
// an argument now:
//
//   node tools/trace-road.mjs assets/map/Stage_5_Map --exit bottom
//
// TWO WAYS IN, ONE OUT: down from the top and in from the west, meeting in front of
// the castle and leaving together over the bridge. The two roads are almost the same
// length — 999px and 1066px — which is what makes the even split below fair here in
// a way it was not on stage 4.
//
// TRACED FROM THE ARTWORK, and the plots by `node tools/split-map.mjs
// assets/map/Stage_5_Map --accept`. The map is the source of truth for both. Redraw
// and re-run rather than nudging numbers here.
import { stage5Waves } from './waves.js';

// IN FROM THE WEST, along the bottom of the park and round to the bridge.
const west = [
  { x: -36, y: 280 },
  { x: 1, y: 295 },
  { x: 61, y: 326 },
  { x: 119, y: 349 },
  { x: 191, y: 370 },
  { x: 257, y: 381 },
  { x: 337, y: 379 },
  { x: 467, y: 341 },
  { x: 525, y: 339 },
  { x: 549, y: 351 },
  { x: 607, y: 403 },
  { x: 647, y: 425 },
  { x: 695, y: 440 },
  { x: 797, y: 459 },
  { x: 829, y: 471 },
  { x: 863, y: 496 },
  { x: 905, y: 539 },
  { x: 937, y: 563 }
];

// And down from the top right, round the outside of the park and back across to the
// same bridge. It joins the western road at about x 560 and they share the last
// third of the board.
const north = [
  { x: 702, y: -29 },
  { x: 729, y: 1 },
  { x: 742, y: 5 },
  { x: 763, y: 25 },
  { x: 800, y: 79 },
  { x: 810, y: 115 },
  { x: 802, y: 147 },
  { x: 782, y: 175 },
  { x: 747, y: 205 },
  { x: 577, y: 303 },
  { x: 557, y: 327 },
  { x: 556, y: 349 },
  { x: 583, y: 384 },
  { x: 627, y: 416 },
  { x: 683, y: 437 },
  { x: 785, y: 456 },
  { x: 823, y: 468 },
  { x: 859, y: 493 },
  { x: 905, y: 539 },
  { x: 938, y: 562 }
];

// NINE, in road order — how far each still is from the bridge along whichever road
// passes nearest. None of them opens with a tower on it; this is the first board
// since stage 1 with nothing prebuilt.
//
// TWO READ "FAR" at the splitter's 95px and both are the same case: they sit outside
// a bend rather than beside a straight, so the nearest point of road is further away
// than their clearance suggests. Every plot still covers a real share of the road —
// tools/siege.mjs measures that.
const plots1 = [
  { x:  71, y: 223 },   //  997 from the bridge,  96 off the road
  { x:  66, y: 421 },   //  919 from the bridge,  86 off the road
  { x: 255, y: 303 },   //  769 from the bridge,  77 off the road
  { x: 882, y: 226 },   //  763 from the bridge, 111 off the road — outside the top bend
  { x: 794, y: 285 },   //  701 from the bridge,  93 off the road
  { x: 322, y: 458 },   //  691 from the bridge,  79 off the road
  { x: 657, y: 155 },   //  648 from the bridge,  88 off the road
  { x: 465, y: 427 },   //  565 from the bridge,  82 off the road
  { x: 566, y: 211 },   //  541 from the bridge,  85 off the road
];

export const level07 = {
  id: 'm7',
  name: 'Winchester Castle',
  // The admin panel's map tab is as wide as this name and no wider — see tabW in
  // src/admin.js. Every screen with room shows the full name.
  short: 'Castle',
  art: 'map07',
  // FOUR FILES FOR ONE LAYER. The castle is drawn as separable pieces —
  // `_Layer_3a` through `_Layer_3d` — which is new, and `layerFiles` in tools/svg.mjs
  // learned lettered parts for it: they stack alphabetically among themselves and as
  // a group in layer 3's place, and all four are labelled `data-layer="3"` so that
  // "the top layer" is all of them rather than only the last.
  src: 'assets/map/Stage_5_Map',
  routes: [west, north],
  plots: plots1,
  waves: stage5Waves,
  wavesExtended: stage5Waves,
  oneLength: true,

  // HALF THE WAVE DOWN EACH ROAD, dealt rather than rolled, at the owner's ask.
  // See nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  entryMix: [1, 1],

  // TIER 3, PLUS THE SAME TWO NAMED RUNGS STAGE 4 LETS THROUGH: the Crossbow Sentry
  // and the Ballista Turret. Neither archery nor siege forks on this board — each
  // offers one button at tier 3 — and the Musketeer Post and Cannon Outpost stay
  // above the cap and read "Maxed".
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret'],

  // FORTY MORE THAN THE WORKSHOP, at the owner's ask, and it buys about half a tier 1
  // tower. This board has nothing prebuilt where stage 4 opened with a Ballista
  // Turret standing, so the opening purse is doing work the free tower used to.
  startGold: 240,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND. Two things: the castle, and one brazier.
  //
  // THE BRIDGE IS DELIBERATELY NOT HERE, and it is the biggest thing on the board.
  // Its box feet at y 651 on a 540px canvas — it runs off the bottom-right corner —
  // and the depth pass sorts by the foot of a box, so a box down there sorts after
  // everything forever and nothing could ever be drawn in front of it. Given one, the
  // bridge would paint over every enemy walking across it, which is the one tile on
  // this board where that must not happen: the bridge IS the exit.
  //
  // What it costs is that the near railing does not occlude either — a figure on the
  // deck draws over the rail rather than behind it. See the note in tools/split-map.mjs
  // for the artist-side fix if that ever matters.
  //
  // Written out by `node tools/split-map.mjs assets/map/Stage_5_Map --accept`. The
  // `--accept` is a decision and belongs here rather than only in a shell history: the
  // felled timber at (517, 468) measures 29.7px tall against a 30px line, so the tool
  // refused to classify it on its own. It is a pile of logs lying on the ground, it
  // was looked at, and "flat" is right.
  frontArt: 'front07',
  front: [
    { x: 498, y: 207, w:  14, h:  63 },   // stands on y 270 — the brazier by the gate
    { x: 127, y:  29, w: 369, h: 285 }   // stands on y 314 — the castle, all four pieces
  ]
};
