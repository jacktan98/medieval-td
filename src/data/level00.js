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
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Stage_1_Map.svg`,
// and the plots by `node tools/split-map.mjs assets/map/Stage_1_Map.svg`. The map is
// the source of truth for both. Redraw and re-run rather than nudging numbers here.
import { tutorialWaves } from './waves.js';

const route1 = [
  { x: -37, y: 195 },
  { x: 1, y: 209 },
  { x: 73, y: 249 },
  { x: 121, y: 268 },
  { x: 207, y: 283 },
  { x: 331, y: 290 },
  { x: 497, y: 350 },
  { x: 669, y: 361 },
  { x: 757, y: 372 },
  { x: 907, y: 410 },
  { x: 959, y: 417 },
  { x: 998, y: 425 }
];

// Six, in road order — the order tools/sim.mjs and every "spread of towers" test
// index into. Three above the road and three below, which is the other thing this
// board teaches: that a plot's side matters.
const plots1 = [
  { x: 297, y: 362 },   // 714 from the keep, 74 off the road
  { x: 329, y: 209 },   // 691 from the keep, 81 off the road
  { x: 523, y: 265 },   // 488 from the keep, 86 off the road
  { x: 513, y: 432 },   // 487 from the keep, 81 off the road
  { x: 731, y: 453 },   // 263 from the keep, 84 off the road
  { x: 751, y: 296 }    // 262 from the keep, 75 off the road
];

export const level00 = {
  id: 'm0',
  name: 'Oakhaven',
  art: 'map00',
  src: 'assets/map/Stage_1_Map.svg',
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
  startGold: 220,
  startLives: 20
};
