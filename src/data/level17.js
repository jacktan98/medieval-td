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
  // THE PEOPLE PAINTED HERE, each at the centre of his own ground shadow, listed so
  // they can be tapped. They stay as painted for now; the animations come next.
  villagers: [
    { x: 103.7, y:  78.4 },   // 1, the smith at the forge fire
    { x: 100.3, y: 110.0 },   // 2, the smith at the anvil
    { x:  57.6, y: 269.1 },   // 3-10, the eight thugs drawn up behind the long wall,
    { x:  89.3, y: 273.8 },   //       in two files
    { x:  49.8, y: 301.1 },
    { x:  81.4, y: 305.8 },
    { x:  41.5, y: 334.5 },
    { x:  73.1, y: 339.2 },
    { x:  32.4, y: 367.9 },
    { x:  64.1, y: 372.6 },
    { x: 125.5, y: 324.3 }    // 11, the Rally Thug at the wall's corner
  ],
  // The dark woods' own sound, as on Dark Hollow Woods.
  ambience: [{ clip: 'dark_background', level: 1 }, { clip: 'crows_cawing', level: 0.5 }],

  waves: stage15Waves,
  wavesExtended: stage15Waves,
  oneLength: true,

  // 40 / 20 / 40, at the owner's word: the top mouth takes 60% and sends a third of
  // it down the link; the bottom mouth takes the other 40%.
  routeMix: [2, 1, 2],

  // NO CAP and NOTHING PREBUILT, at the owner's word. 300 gold on Hard.
  startGold: 300,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND: the two huts, the forge's wall, its flagpole and
  // stacked logs and pipes, and the long wall the thugs stand behind. The two
  // torches by that wall have no grey shadow, so the splitter leaves them flat.
  frontArt: 'front17',
  front: [
    { x:   0, y:  45, w:  58, h:  39, g:  75 },   // stands on y 75  — the plank stack
    { x: 172, y:  25, w:  67, h: 100, g:  89 },   // stands on y 89  — the forge wall
    { x: 838, y:  25, w:  77, h:  81, g:  89 },   // stands on y 89  — the right hut
    { x:   0, y:  68, w:  55, h:  37, g:  93 },   // stands on y 93  — the pipes
    { x: 701, y:  28, w:  77, h:  81, g:  93 },   // stands on y 93  — the left hut
    { x: 243, y:  22, w:  35, h:  83, g: 102 },   // stands on y 102 — the flagpole
    { x: 123, y: 228, w:  70, h: 166, g: 356 }    // stands on y 356 — the long wall
  ]
};
