// STAGE 16: Dark Hollow Citadel, the Crow Harbinger's keep — a stone citadel at the
// left with a balcony half-way up it and two torches at its door, dead trees and
// stumps on grey ground.
//
// TWO ROADS AND A LINK, at the owner's word:
//
//   "40% enemies enter top left road path and exit top right road path. 60% enemies
//    enter bottom left road path. 20% cross the link and exit top right road path.
//    40% exit bottom right road path."
//
//   the TOP road    (in from the top edge)  -> the TOP door                    40%
//   the BOTTOM road (in from the left edge) -> up the link -> the TOP door     20%
//   the BOTTOM road                          -> the BOTTOM door                40%
//
// The link is the stretch of road between the middle island and the right-hand one,
// leaving the bottom road at about (700, 395) and joining the top one at about
// (790, 170).
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_16_Map --exit right --pair 0:0,1:0,1:1
//   node tools/split-map.mjs assets/map/Stage_16_Map
//
// (The top road's mouth is on the TOP edge, at x 222; the bottom road's on the left.)
import { stage16Waves } from './waves.js';

// THE TOP ROAD, in from the top edge and out at the TOP door. 912px.
const top = [
  { x: 203, y: -34 },
  { x: 223, y: 1 },
  { x: 240, y: 55 },
  { x: 276, y: 117 },
  { x: 311, y: 151 },
  { x: 351, y: 167 },
  { x: 393, y: 174 },
  { x: 481, y: 175 },
  { x: 639, y: 163 },
  { x: 693, y: 163 },
  { x: 755, y: 172 },
  { x: 839, y: 163 },
  { x: 959, y: 181 },
  { x: 999, y: 184 }
];
// IN BY THE BOTTOM ROAD, UP THE LINK and out at the TOP door. 1219px.
const link = [
  { x: -38, y: 511 },
  { x: 1, y: 501 },
  { x: 18, y: 502 },
  { x: 141, y: 474 },
  { x: 199, y: 452 },
  { x: 265, y: 419 },
  { x: 299, y: 409 },
  { x: 347, y: 409 },
  { x: 445, y: 427 },
  { x: 517, y: 429 },
  { x: 601, y: 422 },
  { x: 671, y: 406 },
  { x: 697, y: 392 },
  { x: 710, y: 375 },
  { x: 758, y: 201 },
  { x: 774, y: 177 },
  { x: 797, y: 167 },
  { x: 839, y: 163 },
  { x: 959, y: 181 },
  { x: 999, y: 182 }
];
// THE BOTTOM ROAD, in from the left edge and out at the BOTTOM door. 1062px.
const bottom = [
  { x: -38, y: 511 },
  { x: 1, y: 501 },
  { x: 18, y: 502 },
  { x: 141, y: 474 },
  { x: 199, y: 452 },
  { x: 275, y: 415 },
  { x: 311, y: 407 },
  { x: 347, y: 409 },
  { x: 445, y: 427 },
  { x: 517, y: 429 },
  { x: 601, y: 422 },
  { x: 711, y: 398 },
  { x: 801, y: 418 },
  { x: 959, y: 433 },
  { x: 999, y: 434 }
];
// TEN, in road order, as `node tools/split-map.mjs assets/map/Stage_16_Map` printed
// them: one below the bottom road, five on the middle island, two below the bottom
// road on the right and two on the right-hand island. All within 70–80px of a road.
const plots = [
  { x: 317, y: 482 },   // 847 from the keep, 73 off the road
  { x: 471, y: 355 },   // 693 from the keep, 73 off the road
  { x: 349, y: 242 },   // 641 from the keep, 74 off the road
  { x: 600, y: 340 },   // 543 from the keep, 80 off the road
  { x: 504, y: 249 },   // 504 from the keep, 76 off the road
  { x: 648, y: 490 },   // 372 from the keep, 76 off the road
  { x: 641, y: 235 },   // 366 from the keep, 72 off the road
  { x: 781, y: 489 },   // 203 from the keep, 74 off the road
  { x: 825, y: 346 },   // 182 from the keep, 74 off the road
  { x: 859, y: 237 }    // 131 from the keep, 70 off the road
];

export const level18 = {
  id: 'm18',
  name: 'Dark Hollow Citadel',
  short: 'Hollow Citadel',
  art: 'map18',
  src: 'assets/map/Stage_16_Map',

  // Grey, as the other two Dark Hollow boards: ground #868686, road #c9c9c9,
  // shadows #595959.
  palette: { ground: '#868686', road: '#c9c9c9', shadow: '#595959' },

  routes: [top, link, bottom],
  plots,
  // WHO IS HERE, each at the centre of his own ground shadow, and none of them on your
  // side. Cut out of the board and drawn by the game — see `citadel` in
  // src/villagers.js.
  villagers: [
    // 1-5 (Layer 3b), standing about, each made for the road when tapped: 1 the Thug
    // above the top road, 2 the Tough Thug beside him, 3 the Thug and 4 the Tough
    // Thug on the middle island, 5 the Tough Thug by the bottom road's mouth.
    { x: 397, y: 111 },
    { x: 447.5, y: 120 },
    { x: 303, y: 341 },
    { x: 384.5, y: 350.5 },
    { x: 43.5, y: 427.5 },
    // 6-7 (Layer 3a), the two dark crows perched on the citadel's battlements — 6 on
    // the left merlon, 7 on the right corner one — each standing on the merlon's top,
    // with a window cut to a bird. Drawn in front of the citadel (`g`).
    { x: 57, y: 155.5, w: 7, up: 11, down: 1, g: 352 },
    { x: 157.25, y: 133, w: 7, up: 11, down: 1, g: 352 },
    // 8, the Crow Harbinger on the balcony, facing right — at his shadow on its
    // planks, in front of the citadel's wall (`g`) and behind the one line of the
    // stonework that is drawn across him (`balcony.line` below).
    { x: 161.25, y: 234, w: 16, up: 35, down: 3, g: 352 }
  ],
  villagerPlay: 'citadel',
  // THE CROW HARBINGER'S BALCONY. `line` is the one black line of the citadel drawn
  // over him in the artwork (Layer 3a), holding up the balcony, at the owner's word:
  // drawn again over him by the game — from, to, in game px, and its width. `door` is
  // the balcony's doorway he walks back into and `gate` the citadel's ground-floor
  // door he comes out of — see `balcony` in src/villagers.js.
  balcony: {
    line: { from: [129.53, 203.77], to: [162.68, 241.44], w: 1 },
    // A STEP INTO THE DOORWAY and no further, at the owner's word — he used to cross
    // the whole of it to the far post before he faded.
    door: [[154, 231]],
    gate: { at: [186, 362], way: [[196, 380], [204, 404]] }
  },
  // THE PAINTED FLAMES of the two torches at the citadel's door are taken out of the
  // board by tools/split-map.mjs and burn live instead: see `fires`.
  unpaint: [
    { box: [222, 301, 236, 320], fills: ['#d30000', '#ffaa36'] },
    { box: [156, 327, 171, 347], fills: ['#d30000', '#ffaa36'] }
  ],
  // LIVE FIRES where the painted ones were, a little down in their cups as stage 15's
  // torches are, sorted at the foot of each pole.
  fires: [
    { x: 228.75, y: 317.8, s: 2.5, g: 362.5, smoke: 0.5 },
    { x: 163.5, y: 344.8, s: 2.5, g: 389, smoke: 0.5 }
  ],
  // The dark woods' own sound, as on the other two Dark Hollow boards, and the
  // torches crackling.
  ambience: [{ clip: 'dark_background', level: 1 }, { clip: 'crows_cawing', level: 0.5 },
             { clip: 'fire_crackling', level: 1 }],

  waves: stage16Waves,

  // 40 / 20 / 40, at the owner's word: the top mouth takes 40%; the bottom mouth takes
  // the other 60% and sends a third of it up the link.
  routeMix: [2, 1, 2],

  // NO CAP and NOTHING PREBUILT, at the owner's word. 300 gold, as stage 15.
  startGold: 300,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND: the citadel, torches and all.
  frontArt: 'front18',
  front: [
    { x: 0, y: 144, w: 257, h: 254, g: 351 }    // stands on y 351 — the citadel
  ]
};
