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
  name: 'Oakhaven Village',
  // AND A SHORT ONE FOR THE ADMIN PANEL'S TAB, which is a chip in a row that now
  // holds five of them and is hard against the length buttons and the purse.
  // "Village" and "Outskirts" are also what tells these two apart at a glance,
  // which "Oakhaven" on both would not. Everywhere a name has room to be read in
  // full it is the full one: the stage panel, the pause banner and the score record
  // all use `name`.
  short: 'Village',
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

  // THE FIVE PEOPLE WHO LIVE HERE, as points rather than as figures.
  //
  // They are painted into the artwork and they STAY painted into it — the base the
  // game loads has them in it, in the pose the artist drew. What this list is for
  // is the tap: a player can select any of them and read his card, and a tap needs
  // somewhere to land. The anchor is the centre of each one's own ground shadow,
  // read off the drawing, which is the same thing `pivot` means for every other
  // figure in the game.
  //
  // THEY WERE CUT OUT AND ANIMATED FOR ONE BUILD, running to a doorway and
  // vanishing when tapped, and the owner's verdict was "it's bad". With the running
  // gone there is nothing left to move, and cutting a figure out of the board is
  // only worth its risks when the game needs to move him. So the `doors` that went
  // with it are gone too, and so is every field on a villager but where he stands.
  // THE VILLAGERS ARE ALIVE HERE — cut out of the artwork and drawn by the game,
  // at the owner's word. See src/villagers.js for what they do and when.
  villagerPlay: 'oakhaven',

  villagers: [
    { x: 176, y: 351 },   // by the campfire
    { x: 155, y: 387 },   // and the other one
    { x: 495, y: 460 },   // outside the bottom house
    { x: 918, y: 298 },   // the pair up at the top right
    { x: 905, y: 319 }
  ],

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
    // THREE OF THESE MOVED BY A PIXEL when the list was last re-derived: two houses
    // at the top left went 81 tall to 82 and the signpost 44 to 43. Nothing about
    // the villagers did it — the base is byte-identical to the one before they were
    // added, and nothing is cut out for them — the committed numbers had simply
    // drifted from the tool at some earlier change.
    { x:  18, y:  76, w:  77, h:  81, g: 141 },   // stands on y 141
    { x: 140, y: 106, w:  77, h:  81, g: 170 },   // stands on y 170
    { x:  80, y: 155, w:  46, h:  45, g: 198 },   // stands on y 198
    { x: 873, y: 181, w:  77, h:  81, g: 246 },   // stands on y 246
    { x: 782, y: 226, w:  77, h:  81, g: 290 },   // stands on y 290
    { x:  67, y: 346, w: 107, h:  43, g: 383 },   // stands on y 383 — the campfire
    { x: 397, y: 361, w:  77, h:  81, g: 426 },   // stands on y 426
    { x: 522, y: 403, w:  84, h:  81, g: 467 }   // stands on y 467
  ]
};
