// STAGE 15: Dark Hollow Quarters, the camp behind the woods — a forge, a stone
// wall with thugs drawn up behind it, two huts, and dead trees on grey ground.
//
// TWO IN AND TWO OUT, and a LINK ROAD between them, at the owner's word:
//
//   "60% of the enemies will enter left top. 40% will exit right top road. 20% will
//    cross the road path in between to exit right bottom road. 40% of the enemies
//    will enter left bottom and will exit right bottom road."
//
//   the TOP road    -> the TOP door                    40%
//   the TOP road    -> down the link -> the BOTTOM door 20%
//   the BOTTOM road -> the BOTTOM door                 40%
//
// The two long roads never meet except through the link, which leaves the top road
// at about (510, 190) and joins the bottom one at about (630, 420).
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_15_Map --exit right --pair 0:0,0:1,1:1
//   node tools/split-map.mjs assets/map/Stage_15_Map
//
// `--pair` in its long form (`entry:exit`, as on Ironforge Town), because the top
// mouth feeds both doors.
import { stage15Waves } from './waves.js';

// THE TOP ROAD, in at y 171 and out at the TOP door. 1051px.
const top = [
  { x: -39, y: 173 },
  { x: 1, y: 171 },
  { x: 71, y: 183 },
  { x: 137, y: 186 },
  { x: 293, y: 156 },
  { x: 365, y: 151 },
  { x: 425, y: 157 },
  { x: 507, y: 182 },
  { x: 607, y: 160 },
  { x: 789, y: 179 },
  { x: 865, y: 172 },
  { x: 959, y: 155 },
  { x: 999, y: 154 }
];
// IN BY THE TOP ROAD, DOWN THE LINK and out at the BOTTOM door. 1197px.
const link = [
  { x: -39, y: 169 },
  { x: 1, y: 171 },
  { x: 61, y: 182 },
  { x: 125, y: 187 },
  { x: 177, y: 181 },
  { x: 315, y: 153 },
  { x: 387, y: 152 },
  { x: 431, y: 159 },
  { x: 485, y: 177 },
  { x: 517, y: 203 },
  { x: 582, y: 319 },
  { x: 603, y: 397 },
  { x: 614, y: 411 },
  { x: 631, y: 422 },
  { x: 691, y: 440 },
  { x: 751, y: 447 },
  { x: 847, y: 443 },
  { x: 959, y: 425 },
  { x: 999, y: 423 }
];
// THE BOTTOM ROAD, in at y 435 and out at the BOTTOM door. 1050px.
const bottom = [
  { x: -39, y: 435 },
  { x: 1, y: 435 },
  { x: 69, y: 449 },
  { x: 165, y: 454 },
  { x: 349, y: 433 },
  { x: 517, y: 442 },
  { x: 603, y: 416 },
  { x: 691, y: 440 },
  { x: 751, y: 447 },
  { x: 847, y: 443 },
  { x: 959, y: 425 },
  { x: 999, y: 423 }
];
// NINE, in road order, as `node tools/split-map.mjs assets/map/Stage_15_Map`
// printed them: four on the island between the roads left of the link, two right
// of it, and two below the bottom road. All within 71–79px of a road.
const plots1 = [
  { x: 269, y: 240 },   // 902 from the keep, 76 off the road
  { x: 275, y: 365 },   // 725 from the keep, 76 off the road
  { x: 353, y: 506 },   // 651 from the keep, 73 off the road
  { x: 392, y: 228 },   // 609 from the keep, 74 off the road
  { x: 486, y: 368 },   // 526 from the keep, 72 off the road
  { x: 616, y: 501 },   // 366 from the keep, 79 off the road
  { x: 646, y: 235 },   // 348 from the keep, 71 off the road
  { x: 706, y: 365 },   // 317 from the keep, 76 off the road
  { x: 810, y: 253 }    // 198 from the keep, 76 off the road
];

export const level17 = {
  id: 'm17',
  name: 'Dark Hollow Quarters',
  short: 'Hollow Quarters',
  art: 'map17',
  src: 'assets/map/Stage_15_Map',

  // Grey, as Dark Hollow Woods: ground #868686, road #c9c9c9, shadows #595959.
  palette: { ground: '#868686', road: '#c9c9c9', shadow: '#595959' },

  routes: [top, link, bottom],
  plots: plots1,
  // THE PEOPLE HERE, each at the centre of his own ground shadow, and none of them on
  // your side. Cut out of the board and drawn by the game — see `quarters` in
  // src/villagers.js.
  villagers: [
    // 1, the smith heating a blade at the brazier.
    { x: 103.7, y:  78.4 },
    // 2, the smith at the anvil — his window wider and deeper than a man's, so his
    // anvil is cut out with him: his drawing has its own.
    { x: 100.3, y: 110.0, w: 19, down: 9 },
    // 3-10, the eight thugs behind the long wall, in two files: the back line on the
    // left (3, 5, 7, 9) and the front line nearer the wall (4, 6, 8, 10).
    { x:  45.9, y: 274.1 },
    { x:  77.6, y: 278.3 },
    { x:  40.3, y: 307.4 },
    { x:  71.9, y: 311.6 },
    { x:  33.3, y: 340.8 },
    { x:  64.6, y: 344.7 },
    { x:  25.7, y: 373.7 },
    { x:  57.4, y: 378.4 },
    // 11, the Captain Thug at the wall's corner, watching his men — sword up on one
    // side, his quiver on the other, so his window is wider than a man's.
    { x: 121.5, y: 327, w: 24, up: 36 },
    // 12, the thug by the left hut, and 13 the enemy villager between the huts.
    { x: 679.6, y: 106.3 },
    { x: 809.8, y:  86.9 }
  ],
  villagerPlay: 'quarters',
  // THE PAINTED FLAMES — the brazier's and the two torches' — are taken out of the
  // board by tools/split-map.mjs (each a box in game px and the flame's colours) and
  // burn live instead: see `fires`. And the anvil's own shadow with them, which the
  // anvil smith's drawing brings again.
  unpaint: [
    { box: [72, 52, 97, 69], fills: ['#d30000', '#ffaa36'] },
    { box: [104, 183, 119, 203], fills: ['#d30000', '#ffaa36'] },
    { box: [102, 338, 117, 359], fills: ['#d30000', '#ffaa36'] },
    { box: [86, 104, 114, 112], fills: ['#595959'] },
    // and the dark flag's cloth, which waves (`flags`)
    { box: [250, 20, 279, 38], fills: ['#362407'] }
  ],
  // THE DARK FLAG ON THE POLE AT THE TOP LEFT, waving, at the owner's word: its cloth
  // drawn by the game from the artist's own outline in Layer 3a (`d`, `m`), in the
  // artwork's pixels — tied on at `pole`, free at `tip`, inside `box` — and drawn just
  // after the flagpole (`g`). See drawBoardFlag in src/render.js.
  flags: [{
    d: 'M500.04619306247986,29.360123649836428 L500.04619306248,54.77081573950477 C506.5921719395204,59.0897935312578 520.4863782315485,59.465502908935754 526.8942128553786,54.770815739504854 C537.4236840204733,47.05641983486819 553.0002786018701,54.770815739504854 553.0002786018701,54.770815739504854 L553.0002786018701,29.360123649836428 C553.0002786018701,29.360123649836428 538.9990277269935,25.132205745294115 526.3762569220332,29.360123649836428 C512.6657939897555,33.95235720985339 504.3208995559709,33.58602295444216 500.04619306247986,29.360123649836428 Z',
    m: [1, 0, 0, 1, 2.34316959, 16.11874988], fill: '#362407',
    pole: 502.4, tip: 555.4, box: [502.4, 36, 560, 82], g: 102.01
  }],
  // LIVE FIRES where the painted ones were. THE BRAZIER'S is the owner's shape —
  // two flames, the front one lower and to the left overlapping the one behind it
  // (`flames`: offset and size of each, back first), held low (`tall`) and flaring
  // together while the smith's blade is in (`flare`); sorted at the brazier's shadow,
  // so the blade, held in it by a man standing in front of it, lies over the flame.
  // Its sparks fly off the blade, not out of the flame (`metalSparks`).
  // THE TWO TORCHES burn a little down in their cups, as stage 5's castle torches do —
  // just below the middle of the cup's rim, and their size (2.5) — sorted at the foot
  // of each pole.
  fires: [
    { x: 84.5, y: 65, s: 2.6, flames: [[3.6, -1.4, 1], [-3.6, 0.8, 0.92]], tall: 0.8, g: 73.8, over: 79,
      flare: true, smoke: 0.35, metalSparks: true },
    { x: 111.8, y: 201.8, s: 2.5, g: 247, smoke: 0.5 },
    { x: 109.6, y: 357.1, s: 2.5, g: 402, smoke: 0.5 }
  ],
  // The dark woods' own sound, as on Dark Hollow Woods, and the fires crackling.
  ambience: [{ clip: 'dark_background', level: 1 }, { clip: 'crows_cawing', level: 0.5 },
             { clip: 'fire_crackling', level: 1 }],

  waves: stage15Waves,

  // 40 / 20 / 40, at the owner's word: the top mouth takes 60% and sends a third of
  // it down the link; the bottom mouth takes the other 40%.
  routeMix: [2, 1, 2],

  // NO CAP and NOTHING PREBUILT, at the owner's word. 300 gold on Hard.
  startGold: 300,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND: the two huts, the forge's wall, its flagpole and
  // stacked logs and pipes, the long wall the thugs stand behind, and the two torches
  // by that wall — which stand up now that they cast the board's grey shadow, at the
  // owner's re-export (they had been drawn with a grass board's).
  frontArt: 'front17',
  front: [
    { x:   0, y:  45, w:  58, h:  39, g:  75 },   // stands on y 75  — the plank stack
    { x: 172, y:  25, w:  67, h: 100, g:  89 },   // stands on y 89  — the forge wall
    { x: 838, y:  25, w:  77, h:  81, g:  89 },   // stands on y 89  — the right hut
    { x:   0, y:  68, w:  55, h:  37, g:  93 },   // stands on y 93  — the pipes
    { x: 701, y:  28, w:  77, h:  81, g:  93 },   // stands on y 93  — the left hut
    { x: 243, y:  22, w:  14, h:  83, g: 102 },   // stands on y 102 — the flagpole
    { x: 105, y: 199, w:  13, h:  49, g: 245 },   // stands on y 245 — the upper torch
    { x: 123, y: 228, w:  70, h: 166, g: 356 },   // stands on y 356 — the long wall
    { x: 102, y: 354, w:  14, h:  50, g: 401 }    // stands on y 401 — the lower torch
  ]
};
