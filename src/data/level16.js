// STAGE 14: Dark Hollow Woods, a grey board of dead trees and stumps.
//
// TWO IN AND TWO OUT, and each mouth keeps to its own door, at the owner's word:
// "enemies who enter the left middle will exit only at right middle road. Enemies
// that enter the left bottom will exit only at right bottom road."
//
//   the LEFT MIDDLE road -> the RIGHT MIDDLE door
//   the LEFT BOTTOM road -> the RIGHT BOTTOM door
//
// BUT THEY SHARE THE WHOLE MIDDLE OF THE BOARD. The bottom road climbs to meet the
// middle one at (373, 173), the two run together down the channel between the
// islands and round the bottom of the middle one, and only part at (620, 453): one
// back up the right-hand side to the middle door, the other on along the bottom.
// So the two are one road for about 400px, and every plot in the middle sees both.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_14_Map --exit right
//   node tools/split-map.mjs assets/map/Stage_14_Map
//
// The tracer pairs them the right way round on its own — top mouth to top door —
// so there is no `--pair`.
import { stage14Waves } from './waves.js';

// THE LEFT-MIDDLE ROAD, in at y 176 and out at the RIGHT MIDDLE door. 1504px.
const middle = [
  { x: -38, y: 169 },
  { x: 1, y: 177 },
  { x: 51, y: 178 },
  { x: 103, y: 189 },
  { x: 147, y: 207 },
  { x: 217, y: 244 },
  { x: 241, y: 251 },
  { x: 265, y: 243 },
  { x: 325, y: 196 },
  { x: 373, y: 173 },
  { x: 429, y: 166 },
  { x: 487, y: 178 },
  { x: 516, y: 201 },
  { x: 528, y: 241 },
  { x: 526, y: 277 },
  { x: 506, y: 361 },
  { x: 512, y: 403 },
  { x: 525, y: 425 },
  { x: 547, y: 442 },
  { x: 571, y: 451 },
  { x: 605, y: 454 },
  { x: 639, y: 449 },
  { x: 681, y: 436 },
  { x: 713, y: 419 },
  { x: 729, y: 404 },
  { x: 737, y: 381 },
  { x: 746, y: 283 },
  { x: 753, y: 245 },
  { x: 767, y: 213 },
  { x: 789, y: 187 },
  { x: 815, y: 172 },
  { x: 851, y: 163 },
  { x: 903, y: 159 },
  { x: 959, y: 161 },
  { x: 999, y: 158 }
];
// THE LEFT-BOTTOM ROAD, in at y 496 and out at the RIGHT BOTTOM door. 1458px.
const bottom = [
  { x: -37, y: 508 },
  { x: 1, y: 497 },
  { x: 67, y: 485 },
  { x: 127, y: 466 },
  { x: 165, y: 449 },
  { x: 201, y: 424 },
  { x: 227, y: 399 },
  { x: 242, y: 373 },
  { x: 250, y: 337 },
  { x: 250, y: 279 },
  { x: 264, y: 249 },
  { x: 303, y: 212 },
  { x: 337, y: 188 },
  { x: 373, y: 173 },
  { x: 413, y: 166 },
  { x: 445, y: 167 },
  { x: 485, y: 177 },
  { x: 506, y: 190 },
  { x: 520, y: 209 },
  { x: 527, y: 233 },
  { x: 528, y: 263 },
  { x: 508, y: 349 },
  { x: 506, y: 383 },
  { x: 522, y: 421 },
  { x: 551, y: 444 },
  { x: 583, y: 453 },
  { x: 621, y: 453 },
  { x: 735, y: 417 },
  { x: 843, y: 436 },
  { x: 959, y: 431 },
  { x: 999, y: 428 }
];
// NINE, in road order, as `node tools/split-map.mjs assets/map/Stage_14_Map`
// printed them. Four read FAR at the splitter's 95px, which is the big islands
// between the loops: a marker in the middle of one is a long way from every edge.
// The two in the middle-right island moved up when the owner put the archers'
// barricade at its foot.
const plots1 = [
  { x:  79, y: 394 },   // 1312 from the keep,  83 off the road
  { x: 124, y: 297 },   // 1292 from the keep,  90 off the road
  { x: 357, y: 334 },   // 1097 from the keep, 107 off the road
  { x: 421, y: 246 },   // 1016 from the keep,  78 off the road
  { x: 402, y: 425 },   //  535 from the keep, 112 off the road
  { x: 636, y: 297 },   //  347 from the keep, 108 off the road
  { x: 644, y: 208 },   //  284 from the keep, 115 off the road
  { x: 849, y: 351 },   //  147 from the keep,  85 off the road
  { x: 875, y: 244 }    //  131 from the keep,  83 off the road
]

export const level16 = {
  id: 'm16',
  name: 'Dark Hollow Woods',
  short: 'Dark Hollow',
  art: 'map16',
  src: 'assets/map/Stage_14_Map',

  // GREY, the first board that is: ground #868686, road #c9c9c9, and the shadows
  // under the huts, trees and stumps #595959. Tower shadows built here take that
  // grey too (see src/tint.js), and every tool reads the board through it.
  palette: { ground: '#868686', road: '#c9c9c9', shadow: '#595959' },

  routes: [middle, bottom],
  plots: plots1,
  // THE PEOPLE WHO LIVE HERE, and none of them is on your side: two thugs and two
  // enemy villagers, each at the centre of his own ground shadow. At the owner's word
  // they are the game's to move — see `hollow` in src/villagers.js — and a tap turns
  // any of them into a creature on the road.
  villagers: [
    { x: 128.8, y: 135.0 },   // 1, the thug by the top hut
    { x: 162.0, y: 115.7 },   // 2, carrying a box to the top hut
    { x: 306.7, y: 440.5 },   // 3, by the bottom hut
    { x: 306.3, y: 478.9 }    // 4, the thug below him
  ],
  villagerPlay: 'hollow',

  // TWO ELITE ARCHERS BEHIND THE LOG BARRICADE, at the owner's word: "3b has 2 elite
  // archers with 20 physical damage but others same stats as elite archer in tower.
  // Voices follow elite archer in tower." The Crossbow Tower's man, whose card says
  // Elite Archer — see `Elite Archer` in garrisonUnits. Each anchor is the centre of
  // his ground shadow in Layer 3b.
  garrison: [
    { x: 611.0, y: 361.9, unit: 'Elite Archer' },
    { x: 638.1, y: 366.2, unit: 'Elite Archer' }
  ],

  waves: stage14Waves,
  wavesExtended: stage14Waves,
  oneLength: true,

  // 50 / 50, at the owner's word, and like Serene Peak the same two numbers at
  // both ends: one route per mouth and one door per route.
  routeMix: [1, 1],

  // NO CAP, at the owner's word — "Towers are not restricted anymore." No
  // `maxTier` and no `allow`, as on Serene Peak. And NOTHING PREBUILT.
  startGold: 300,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND: the two stone huts and the Dark Hollow signpost.
  frontArt: 'front16',
  front: [
    { x: 728, y:  96, w:  41, h:  45, g: 138 },   // stands on y 138 — the signpost
    { x: 195, y:  76, w:  77, h:  81, g: 140 },   // stands on y 140 — the top hut
    { x: 211, y: 430, w:  79, h:  82, g: 495 }    // stands on y 495 — the bottom hut
  ]
};
