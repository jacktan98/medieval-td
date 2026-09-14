// STAGE 7: Dawnford Fountain, and the first board with two ways in AND two ways out.
//
// Every shape before this had a single one of the two. Stage 4 is three mouths into
// one exit, stage 5 is two into one, stage 6 is one into two. This is two into two —
// and what makes it different from all of them is that the roads NEVER MEET. There
// is no stretch of ground every enemy walks, no fork to hold, no gate to stand at.
//
// WHAT THAT CHANGES FOR THE PLAYER is that a tower covers half the game or none of
// it. On a funnel a badly-placed tower is still doing something; here a tower on the
// west road will not fire a single shot at anything on the east one. The board is
// two boards, and the purse buys one set of answers for both.
//
// THE FOUNTAIN IS THE ONLY THING BETWEEN THEM and it is scenery, not a route. It
// gets a front box like any other standing thing — see `front` — and no road passes
// behind it.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_7_Map --exit bottom
//   node tools/split-map.mjs assets/map/Stage_7_Map
//
// Two entries and two exits is the case the tracer already had: equal counts pair in
// order, and here that order is the geometry — the western road runs top to bottom
// left, the eastern one top-right to bottom middle, and neither crosses the other.
import { stage7Waves } from './waves.js';

// IN OVER THE TOP LEFT and out at the bottom left, round the west side of the
// fountain. 732px, the shorter of the two.
const west = [
  { x: 261, y: -39 },
  { x: 261, y: 1 },
  { x: 247, y: 39 },
  { x: 247, y: 77 },
  { x: 261, y: 111 },
  { x: 316, y: 177 },
  { x: 336, y: 213 },
  { x: 340, y: 259 },
  { x: 331, y: 317 },
  { x: 314, y: 361 },
  { x: 286, y: 399 },
  { x: 185, y: 483 },
  { x: 129, y: 539 },
  { x: 100, y: 567 }
];

// AND IN OVER THE TOP RIGHT CORNER, out at the bottom middle, round the east side.
// 830px — 98 longer than the west road, which `routeMix` below is written against.
//
// THE MOUTH IS ON THE RIGHT EDGE, not the top, and the owner called it the top right
// road. Both are true: the sand crosses the corner, touching the top edge and the
// right one 68px apart, and tools/trace-road.mjs merges a pair that close into one
// mouth rather than reporting two ways in. It picked the right edge because that is
// where the road's own direction carries it — an enemy walking this road at the
// corner is heading down and west, so he comes in from the side rather than over
// the top. See CORNER in the tracer, which stage 6's bridge is the other user of.
const east = [
  { x: 996, y: 55 },
  { x: 959, y: 69 },
  { x: 891, y: 86 },
  { x: 833, y: 108 },
  { x: 779, y: 139 },
  { x: 733, y: 175 },
  { x: 687, y: 221 },
  { x: 655, y: 267 },
  { x: 642, y: 305 },
  { x: 630, y: 377 },
  { x: 611, y: 413 },
  { x: 573, y: 449 },
  { x: 465, y: 527 },
  { x: 446, y: 538 },
  { x: 431, y: 539 },
  { x: 397, y: 560 }
];

// NINE, in road order — how far each still is from the door it is nearest, along
// whichever road passes closest. Written out by `node tools/split-map.mjs
// assets/map/Stage_7_Map`.
//
// SEVEN OF THE NINE READ "FAR" at the splitter's 95px, which is more than any board
// so far and is not carelessness. Both roads on this board run on a long diagonal
// for their whole length — there is no straight stretch anywhere — and a plot set
// the same distance back from the kerb is further from the centreline a tower
// measures against than one beside a straight. tools/siege.mjs measures what each
// plot actually covers, and every one of them holds a real share of its own road.
const plots1 = [
  { x: 857, y: 206 },   //  630 from its door,  97 off the road — east road, top
  { x: 159, y: 170 },   //  577 from its door, 118 off the road — west road, top
  { x: 575, y: 187 },   //  436 from its door, 111 off the road
  { x: 465, y: 243 },   //  409 from its door, 126 off the road — above the fountain
  { x: 748, y: 393 },   //  307 from its door, 119 off the road
  { x: 677, y: 485 },   //  261 from its door,  98 off the road
  { x: 158, y: 383 },   //  163 from its door,  94 off the road
  { x:  69, y: 444 },   //   65 from its door, 110 off the road — at the west door
  { x: 376, y: 463 }    //   33 from its door,  94 off the road — the bottom middle one
];

export const level09 = {
  id: 'm9',
  name: 'Dawnford Fountain',
  // The admin panel shows the full name now — it is a dropdown rather than a row of
  // tabs — but `short` is still what the road tab's narrow rows use.
  short: 'Fountain',
  art: 'map09',
  // FOUR FILES FOR THE BOARD. `_Layer_3a` and `_Layer_3b` are the village and the
  // fountain; there is no overlay part on this board, because nothing here is drawn
  // between the camera and a road. Stage 5 and stage 6 each needed one for a bridge.
  src: 'assets/map/Stage_7_Map',
  routes: [west, east],
  plots: plots1,
  waves: stage7Waves,
  wavesExtended: stage7Waves,
  oneLength: true,

  // HALF THE WAVE OUT OF EACH DOOR, dealt rather than rolled, at the owner's ask:
  // "Assign 50% of enemies to exit bottom left road and another 50% for bottom
  // middle road."
  //
  // ON THIS BOARD THE SHARES DECIDE BOTH ENDS AT ONCE, which they have not done
  // before. A route here is a whole road from its own mouth to its own door, so
  // dealing the wave evenly between the two routes puts half the enemies in at the
  // top left and half in over the top-right corner as well as half out of each exit.
  // The owner named the exits; the entries follow because the roads never meet.
  //
  // DEALT RATHER THAN ROLLED matters more here than on a funnel. A run of five down
  // one road is five enemies the towers on the other road cannot touch, and rolled,
  // a run of five in sixteen is ordinary. See nextRoute in src/enemies.js.
  routeMix: [1, 1],

  // TIER 3, PLUS FOUR NAMED RUNGS ABOVE IT — one more than any board so far, and the
  // new one is the HIGH ALTAR, which is the board that opens with one standing.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep', 'High Altar'],

  startGold: 240,
  startLives: 20,

  // A HIGH ALTAR ALREADY STANDING, at the owner's ask: "There is a prebuilt high
  // altar at the bottom middle at the beginning of the game. Players can sell or own
  // abilities for that prebuilt tower."
  //
  // (376, 463) is the bottom middle plot — of the three along the bottom of the
  // board, at y 444, 463 and 485, it is the one in the middle by x. It is last in
  // the list because the list is in ROAD order and it sits 33px from the eastern
  // door, nearer a door than anything else on the board.
  //
  // AND IT IS THE ONE PLOT THAT COVERS BOTH ROADS. The eastern road passes 94px
  // away and the western door is 150px further on, which on a board whose two halves
  // never meet is the only ground with a claim on both. A monastery tower is the
  // right thing to be standing there: its shot is magic, and this is the first table
  // with healers in it.
  prebuilt: [
    { plot: 8, family: 'monastery', name: 'High Altar' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the four stone huts, and the fountain.
  //
  // THE FOUNTAIN IS THE BIGGEST BOX ON ANY BOARD at 149 x 141, and it earns it the
  // ordinary way — it stands on the ground, it has a shadow, and its ground line is
  // the centre of that shadow at y 395. No road passes behind it, so what the box
  // actually does is catch a tower built on the plot above it at (465, 243): that
  // tower stands 152px in front of the fountain's line and is drawn over it, which
  // is right, and would not have been under the old rule that read the BOTTOM of a
  // shadow rather than its middle.
  frontArt: 'front09',
  front: [
    { x: 602, y:  27, w:  73, h:  91, g: 102 },   // stands on y 102
    { x: 106, y: 192, w:  74, h:  91, g: 267 },   // stands on y 267
    { x: 753, y: 212, w:  73, h:  91, g: 287 },   // stands on y 287
    { x: 183, y: 251, w:  78, h:  91, g: 326 },   // stands on y 326
    { x: 397, y: 284, w: 149, h: 141, g: 395 }    // stands on y 395 — the fountain
  ]
};
