// STAGE 1, AND THE ONLY TUTORIAL. The first board a new player ever sees, and the
// only one whose job is teaching rather than testing.
//
// Everything about it is deliberately the simplest version of itself: one road in
// and one road out with no fork, six plots rather than nine or eleven, five waves
// rather than eight, and two kinds of enemy in the whole level. A player who
// finishes it has met a thug, met a thug that takes longer to kill, built a tower,
// upgraded a tower, and watched a wave die. That is the entire syllabus.
//
// TIER 2 IS THE CEILING HERE, and it is a property of the level rather than of the
// player — see `maxTier` below and how src/render.js draws the rungs above it.
//
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Stage_1_Map`, and
// the plots by `node tools/split-map.mjs assets/map/Stage_1_Map`. The map is the
// source of truth for both. Redraw and re-run rather than nudging numbers here.
import { tutorialWaves } from './waves.js';

const route1 = [
  { x: -36, y: 193 },
  { x: 1, y: 207 },
  { x: 85, y: 249 },
  { x: 125, y: 263 },
  { x: 169, y: 271 },
  { x: 333, y: 282 },
  { x: 497, y: 345 },
  { x: 645, y: 350 },
  { x: 741, y: 360 },
  { x: 959, y: 415 },
  { x: 999, y: 421 }
];

// Five, in road order — the order tools/sim.mjs and every "spread of towers" test
// index into. Both sides of the road are used, which is the other thing this board
// teaches: that a plot's side matters.
const plots1 = [
  { x: 297, y: 363 },   //  716 from the keep,  83 off the road
  { x: 326, y: 197 },   //  698 from the keep,  84 off the road
  { x: 544, y: 270 },   //  465 from the keep,  77 off the road
  { x: 687, y: 273 },   //  328 from the keep,  81 off the road
  { x: 727, y: 439 }    //  260 from the keep,  80 off the road
];

export const level00 = {
  id: 'm0',
  name: 'Oakland Town',
  // AND A SHORT ONE FOR THE ADMIN PANEL'S TAB, which is a chip in a row that now
  // holds five of them and is hard against the length buttons and the purse. "Town"
  // and "Outskirts" are also what tells these two apart at a glance, which "Oakland"
  // on both would not. Everywhere a name has room to be read in full it is the full
  // one: the stage panel, the pause banner and the score record all use `name`.
  short: 'Town',
  art: 'map00',
  // DRAWN IN LAYERS rather than in one file, which is why this names a stem
  // rather than an .svg: the artwork is Stage_1_Map_Layer_1..3.svg and the tools
  // stack it — see readArtwork in tools/svg.mjs. Layer 2 carries the road and the
  // plot markers; the buildings and trees are in layer 3, ABOVE it, so a house
  // beside the road is stood on the ground rather than paved over by it.
  src: 'assets/map/Stage_1_Map',
  routes: [route1],
  plots: plots1,
  // FIVE WAVES, and the same five whichever length is chosen. Every other level
  // has a longer table for Extended; a tutorial that got longer when you asked for
  // more of it would be teaching the same lesson twice.
  waves: tutorialWaves,
  wavesExtended: tutorialWaves,
  // SAID OUT LOUD rather than inferred from the tier cap. The checkers used to read
  // `maxTier` as "this is a tutorial, so its two tables may match", which happened
  // to be true while the tutorial was the only capped board — stage 2 has a cap of
  // 3 and is not a tutorial. A cap and a fixed length are two decisions.
  oneLength: true,
  // THE CEILING ON THIS BOARD. Tier 1 and tier 2 only — the rungs above are drawn
  // and priced as normal and refuse the purchase, so a player learns that the
  // ladder exists here and climbs it somewhere else.
  maxTier: 2,
  startGold: 200,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND.
  //
  // The board is one flat image drawn under everything, so a soldier standing
  // BEHIND a house was drawn on its roof. These are the things in the top layer of
  // the artwork that STAND UP, each with the box it occupies; the renderer draws
  // that box a second time from `Stage_1_Map_front.svg`, sorted into the same depth
  // pass the towers and the soldiers are in, at the FOOT of the box — which is the
  // bottom of the shadow, and the word the owner used.
  //
  // NOTHING IS CUT AND NOTHING IS RE-SORTED. The sheet is the WHOLE top layer in
  // the artist's own order, so a slice of it carries every prop drawn on top of
  // that building — the little man at the tavern door comes with the tavern and
  // stays in front of it. Between two pieces of artwork the second draw changes
  // nothing at all; the only thing it can get in front of is a game figure.
  //
  // Two earlier versions each broke that man. The first redrew the building alone
  // and put its wall back over him. The second lifted the whole layer out of the
  // base and sorted every piece by its own shadow, which put him behind the tavern
  // because his shadow is four pixels further back — true to the rule and not to
  // the drawing. The owner's word: he is supposed to be seen.
  //
  // Written out by `node tools/split-map.mjs assets/map/Stage_1_Map`, which finds them
  // in the top layer by height and refuses if anything is sitting on the line.
  frontArt: 'front00',
  front: [
    { x:  30, y:  71, w:  77, h:  81 },   // stands on y 153
    { x: 157, y: 109, w:  77, h:  81 },   // stands on y 191
    { x:  80, y: 157, w:  35, h:  44 },   // stands on y 200
    { x: 873, y: 181, w:  77, h:  81 },   // stands on y 262
    { x: 782, y: 226, w:  77, h:  81 },   // stands on y 307
    { x:  67, y: 346, w: 107, h:  43 },   // stands on y 389 — the campfire
    { x: 397, y: 361, w:  77, h:  81 },   // stands on y 442
    { x: 526, y: 403, w:  80, h:  81 }   // stands on y 484
  ]
};
