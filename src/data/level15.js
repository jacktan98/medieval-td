// STAGE 13: Serene Peak Lake, and the first board with NO CAP AT ALL.
//
// EVERY BOARD ON THE ROAD BEFORE THIS ONE HAS A CAP. Stage 1 stops at tier 2, the
// other eleven stop at tier 3 and buy their way past it one named rung at a time —
// one on stage 3, growing to the three Ironforge boards' seven, which is every
// fourth rung in the game except the Judgement Temple. This one has no `maxTier`
// and no `allow`, at the owner's word: "towers are no longer restricted and can
// access all towers for this stage."
//
// SO THE JUDGEMENT TEMPLE IS BUILDABLE FOR THE FIRST TIME, on the board that also
// hands you one. It is the last rung the campaign had never opened: eight fourth
// rungs exist and seven of them are on an `allow` list somewhere behind this board.
//
// THREE IN AND THREE OUT, ONE TO ONE. No merging and no forking: each mouth leads
// to its own door and nothing in between decides anything. That is the simplest
// shape a three-road board can have and it is the first time the game has used it —
// stage 4 merges, stage 9 shares, stage 11 does both, stage 12 pairs across. Here
// the three roads simply cross.
//
//   the BOTTOM LEFT road   -> the RIGHT door
//   the BOTTOM MIDDLE road -> the TOP RIGHT door
//   the BOTTOM RIGHT road  -> the TOP door
//
// AND THAT MAKES THE SHARES THE SAME AT BOTH ENDS, which the owner said in one
// line: "exiting should have the same percentage." With one route per mouth there
// is nothing that could make them differ.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_13_Map --exit top,right --pair 0:2,1:1,2:0
//   node tools/split-map.mjs assets/map/Stage_13_Map
//
// `--exit top,right` NAMES BOTH EDGES THE DOORS ARE ON. Left to itself the tracer
// reads the top mouth as a way in and reports four entries and two exits; the two
// right-hand mouths it gets right on its own, because a road touching the right
// edge of a board has never been anything but a way out.
//
// `--pair 0:2,1:1,2:0` IS THE CROSSING. Read in order it is bottom-left to the
// LOWEST door, bottom-middle to the middle one, bottom-right to the TOP — so the
// three roads change places on the way across, which is what the junction in the
// middle of this board is for.
import { stage13Waves } from './waves.js';

// THE BOTTOM-LEFT ROAD, in over the bottom edge at x 152 and out at the RIGHT door.
// 1204px — the longest road in the game by a hundred pixels, and it earns it: it
// climbs the left side to the junction, runs the whole width of the board along the
// top, and comes back down to the right edge.
const left = [
  { x: 121, y: 563 },
  { x: 153, y: 539 },
  { x: 169, y: 538 },
  { x: 193, y: 524 },
  { x: 356, y: 387 },
  { x: 366, y: 371 },
  { x: 368, y: 355 },
  { x: 334, y: 291 },
  { x: 332, y: 275 },
  { x: 339, y: 257 },
  { x: 364, y: 225 },
  { x: 395, y: 199 },
  { x: 433, y: 177 },
  { x: 485, y: 155 },
  { x: 515, y: 150 },
  { x: 579, y: 152 },
  { x: 659, y: 139 },
  { x: 735, y: 149 },
  { x: 766, y: 168 },
  { x: 791, y: 225 },
  { x: 831, y: 267 },
  { x: 885, y: 290 },
  { x: 959, y: 305 },
  { x: 995, y: 322 }
];

// THE BOTTOM-MIDDLE ROAD, in at x 500 and out at the TOP RIGHT door. 1084px, and it
// shares the top stretch with the road above: the two run together from the
// junction at (335, 285) as far as (735, 145) before one goes on and the other
// turns down. 400px of the board is carrying two routes.
const middle = [
  { x: 518, y: 575 },
  { x: 501, y: 539 },
  { x: 481, y: 465 },
  { x: 459, y: 417 },
  { x: 431, y: 386 },
  { x: 371, y: 348 },
  { x: 335, y: 293 },
  { x: 332, y: 275 },
  { x: 338, y: 259 },
  { x: 375, y: 215 },
  { x: 433, y: 177 },
  { x: 507, y: 151 },
  { x: 571, y: 152 },
  { x: 659, y: 139 },
  { x: 701, y: 142 },
  { x: 773, y: 157 },
  { x: 857, y: 143 },
  { x: 959, y: 143 },
  { x: 999, y: 143 }
];

// THE BOTTOM-RIGHT ROAD, in at x 860 and out at the TOP door. 751px, and it touches
// neither of the others: a straight diagonal from the bottom right corner to the top
// middle, crossing both of them without joining either.
//
// IT IS 453px SHORTER THAN THE LEFT ROAD, which is the widest spread any board has
// had between its shortest and longest route — the Factory's was 387 and every other
// board is inside 200. A creature dealt this road is on the board for half as long as
// one dealt the left, so the 40% that comes in here is 40% that has to be stopped in
// half the time. That is the shape of this board and it is why the deep plots on the
// right are worth more than their distance from a door suggests.
const right = [
  { x: 892, y: 564 },
  { x: 861, y: 539 },
  { x: 848, y: 538 },
  { x: 830, y: 524 },
  { x: 747, y: 447 },
  { x: 665, y: 363 },
  { x: 605, y: 287 },
  { x: 574, y: 231 },
  { x: 553, y: 169 },
  { x: 524, y: 123 },
  { x: 505, y: 1 },
  { x: 494, y: -37 }
];

// NINE, in road order, and how far each is from the door it is nearest along
// whichever route passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_13_Map`.
//
// TWO OF THEM READ FAR at the splitter's 95px — (510, 324) at 100 and (208, 258) at
// 125 — and that is this board's shape rather than a slip. Three roads cross in the
// middle of it and the grass between them comes in big wedges, so a marker put in the
// middle of a wedge is a long way from any of the three. Sandshroud read FAR on all
// nine and Ironforge Town on seven; two is the third-best score any board has had.
//
// AND THE SPREAD FROM THE KEEP IS 976 DOWN TO 99, on a board whose shortest road is
// 751px. The plot at (900, 215) sits 99px from a door — the closest any plot in the
// game is to an exit — and the one at (248, 366) is nearly a thousand. What that
// means in play is that the near plots are a last line and nothing else: a creature
// on the bottom-right road reaches the top door in twelve seconds, and a tower at
// (900, 215) sees it for the last two of them.
const plots1 = [
  { x: 248, y: 366 },   //  976 from its door,  86 off the road
  { x: 376, y: 490 },   //  958 from its door,  92 off the road
  { x: 510, y: 324 },   //  880 from its door, 100 off the road
  { x: 208, y: 258 },   //  784 from its door, 125 off the road — the top left, and the temple's
  { x: 472, y: 252 },   //  562 from its door,  84 off the road
  { x: 593, y: 423 },   //  444 from its door,  94 off the road
  { x: 676, y: 218 },   //  380 from its door,  76 off the road
  { x: 737, y: 300 },   //  215 from its door,  91 off the road
  { x: 900, y: 215 }    //   99 from its door,  72 off the road
];

export const level15 = {
  id: 'm15',
  name: 'Serene Peak Lake',
  short: 'Serene Peak',
  art: 'map15',
  src: 'assets/map/Stage_13_Map',

  routes: [left, middle, right],
  plots: plots1,
  // THE PEOPLE WHO LIVE HERE, as points: selectable, never drawn — see level00.
  // Each anchor is the centre of the figure's own ground shadow.
  villagers: [
    { x: 410, y: 124 },       // at the hut steps
    { x: 118, y: 266 },       // the two by the lake
    { x: 102, y: 275 },
    { x: 835, y: 337 }        // between the two right-hand huts
  ],
  waves: stage13Waves,
  wavesExtended: stage13Waves,
  oneLength: true,

  // 30 / 30 / 40, and for once there is nothing to reconcile.
  //
  // The owner's numbers: "30% of enemies for bottom left road, 30% for bottom
  // middle road, 40% for bottom right road", and then "exiting should have the same
  // percentage." With one route per mouth and one door per route those are the same
  // three numbers said twice — this is the only board in the game where the entry
  // shares and the exit shares cannot disagree, because there is no fork or merge
  // anywhere for them to disagree across. See nextRoute in src/enemies.js.
  routeMix: [3, 3, 4],

  // NO CAP, at the owner's word. No `maxTier` and no `allow`, which together mean
  // every rung of every ladder — the only board on the road that says that, and so
  // the only one where a player can build a Judgement Temple of their own.
  //
  // It is written as an ABSENCE rather than as a list of all eleven names, because
  // that is what `capped` in src/menu.js reads: a board with neither field lets
  // everything through, and a board that listed them all would have to be edited
  // every time a rung is added.

  startGold: 240,
  startLives: 20,

  // A JUDGEMENT TEMPLE ALREADY STANDING, at the owner's ask: "There is a prebuilt
  // tower, Judgement Temple at the beginning of the game. This tower is placed at the
  // most top left plot marker."
  //
  // PLOT 3 IS THAT MARKER, and the index is safe to write down because the geometry
  // is checked rather than trusted — see tools/campaign.mjs. Of the nine, (208, 258)
  // is nearest the top-left corner by 111px: it is 331 from it and the next, (248,
  // 366), is 442. No small redraw closes that.
  //
  // IT IS THE BIGGEST GIFT ANY BOARD MAKES. Sandshroud gives a barracks, Ironforge
  // Town an archery tower, the Factory a Cannon Outpost — all tier 4s, and all of
  // them on a board that names the same rung in `allow`, so the gift is a head start
  // on something you could build anyway. This one is the rung NO board has ever
  // opened, which is the owner's other decision here working with this one: he
  // lifted the cap and handed over the one thing the cap was holding back.
  //
  // AND IT STANDS AT THE FAR END. 784px of road from the nearest door and 125 off
  // the road, which is the deepest and the loneliest marker on the board. A temple's
  // blast is 50 magic over a wide ring and its reach is the monastery's own, so what
  // it buys from up there is the whole of the left road's climb and the first third
  // of the middle one — the part of the board where a wave is still a column rather
  // than a crowd.
  prebuilt: [
    { plot: 3, family: 'monastery', name: 'Judgement Temple' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the four watchtowers, two at each end of the
  // board, and the Serene Peak signpost.
  //
  // THE LAKE IS DELIBERATELY NOT HERE, and the splitter says why each time it runs:
  // 214 x 423 of water with no ground shadow under it, so it is not standing on
  // anything and has no depth to be sorted at. It stays in the base, which is right —
  // nothing walks behind a lake.
  frontArt: 'front15',
  front: [
    { x: 377, y:   4, w:  74, h: 120, g:  95 },   // stands on y 95
    { x: 284, y:  30, w:  74, h: 107, g: 120 },   // stands on y 120
    { x: 864, y: 284, w:  79, h: 108, g: 375 },   // stands on y 375
    { x: 776, y: 310, w:  75, h: 107, g: 401 },   // stands on y 401
    { x: 540, y: 446, w:  39, h:  45, g: 489 }    // stands on y 489 — the signpost
  ]
};
