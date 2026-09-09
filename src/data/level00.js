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
  { x: -36, y: 195 },
  { x: 1, y: 209 },
  { x: 81, y: 253 },
  { x: 133, y: 270 },
  { x: 187, y: 279 },
  { x: 325, y: 289 },
  { x: 515, y: 353 },
  { x: 663, y: 361 },
  { x: 767, y: 374 },
  { x: 907, y: 411 },
  { x: 959, y: 419 },
  { x: 998, y: 427 }
];

// Five, in road order — the order tools/sim.mjs and every "spread of towers" test
// index into. Both sides of the road are used, which is the other thing this board
// teaches: that a plot's side matters.
const plots1 = [
  { x: 291, y: 379 },   //  718 from the keep,  92 off the road
  { x: 325, y: 204 },   //  697 from the keep,  85 off the road
  { x: 523, y: 265 },   //  511 from the keep,  86 off the road
  { x: 752, y: 284 },   //  263 from the keep,  87 off the road
  { x: 731, y: 453 }    //  263 from the keep,  83 off the road
];

export const level00 = {
  id: 'm0',
  name: 'Oakhaven Outskirts',
  // AND A SHORT ONE FOR THE ADMIN PANEL'S TAB, which is a 100px chip in a row that
  // is already hard against the length buttons and the purse — the full name sets at
  // 157px in that type and there is nowhere for the row to give. Everywhere a name
  // has room to be read in full it is the full one: the stage panel, the pause
  // banner and the score record all use `name`.
  short: 'Oakhaven',
  art: 'map00',
  // DRAWN IN LAYERS rather than in one file, which is why this names a stem
  // rather than an .svg: the artwork is Stage_1_Map_Layer_1..3.svg and the tools
  // stack it — see readArtwork in tools/svg.mjs. Layer 3 carries the road and the
  // plot markers.
  src: 'assets/map/Stage_1_Map',
  routes: [route1],
  plots: plots1,
  // FIVE WAVES, and the same five whichever length is chosen. Every other level
  // has a longer table for Extended; a tutorial that got longer when you asked for
  // more of it would be teaching the same lesson twice.
  waves: tutorialWaves,
  wavesExtended: tutorialWaves,
  // THE CEILING ON THIS BOARD. Tier 1 and tier 2 only — the rungs above are drawn
  // and priced as normal and refuse the purchase, so a player learns that the
  // ladder exists here and climbs it somewhere else.
  maxTier: 2,
  startGold: 200,
  startLives: 20
};
