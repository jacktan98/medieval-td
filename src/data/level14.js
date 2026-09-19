// STAGE 12: Ironforge Castle, and the first board where the two ends are
// INDEPENDENT of each other.
//
// Every shape before this could be described from one end. Stage 4 is three roads
// into one door, stage 6 is one mouth forking into two, stage 9 is three roads
// into two doors, stage 11 is two mouths merging and a third forking. This one is
// a MATRIX: three mouths, two doors, and which door you leave by is decided by
// which mouth you came in at — except for the one road that cannot decide.
//
//   the LEFT road       -> the RIGHT door, always
//   the BOTTOM road     -> the TOP door, always
//   the LEFT-BOTTOM road -> either, half and half
//
// So the shares have to be given from the entry end and the exit end falls out,
// which is the opposite of stage 11 where the two readings met in the middle. See
// `routeMix` below for the arithmetic.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_12_Map --exit top,right --pair 0:1,2:0,1:1,1:0
//   node tools/split-map.mjs assets/map/Stage_12_Map
//
// `--exit top,right` IS NOT OPTIONAL HERE. Left to itself the tracer reads the top
// mouth as a way IN — it is 100px of tarmac touching an edge and nothing about the
// drawing says which way anybody walks through it — and reports four entries and
// one exit. Naming the two doors is what turns the same seven shapes into the
// board the owner described.
//
// `--pair 0:1,2:0,1:1,1:0` is the long form, one item per ROUTE. Entry 1 appears
// twice, which is the fork, and entries 0 and 2 go to different doors, which is
// the part no short form can say.
//
// SIX FILES, and the most any board has had: layer 1 is the grass, the roads and
// the nine markers, layer 2 is the scatter, and 3a to 3d are the castle. readArtwork
// sorts them by number then letter — see tools/svg.mjs.
import { stage12Waves } from './waves.js';

// THE LEFT ROAD, in over the left edge at y 268 and out at the RIGHT door. 1088px.
const left = [
  { x: -39, y: 271 },
  { x: 1, y: 269 },
  { x: 79, y: 257 },
  { x: 171, y: 251 },
  { x: 283, y: 254 },
  { x: 403, y: 267 },
  { x: 434, y: 284 },
  { x: 460, y: 327 },
  { x: 479, y: 348 },
  { x: 507, y: 370 },
  { x: 537, y: 381 },
  { x: 591, y: 380 },
  { x: 683, y: 389 },
  { x: 789, y: 389 },
  { x: 959, y: 375 },
  { x: 999, y: 374 }
];

// THE BOTTOM ROAD, in over the bottom edge at x 602 and out at the TOP door. 688px,
// and much the shortest road on the board — the next is 900 and the longest 1088.
//
// IT IS ALSO THE ONE THAT CROSSES EVERYTHING. It comes up the middle of the map
// through the junction every other road passes through, so a tower placed to cover
// it is a tower covering the crossroads, and a tower placed at either end of it is
// covering almost nothing else.
const bottom = [
  { x: 623, y: 574 },
  { x: 603, y: 539 },
  { x: 549, y: 473 },
  { x: 532, y: 441 },
  { x: 517, y: 387 },
  { x: 461, y: 329 },
  { x: 445, y: 289 },
  { x: 447, y: 267 },
  { x: 475, y: 197 },
  { x: 480, y: 125 },
  { x: 487, y: 93 },
  { x: 512, y: 37 },
  { x: 535, y: 1 },
  { x: 551, y: -36 }
];

// THE LEFT-BOTTOM ROAD'S RIGHT-HAND BRANCH, in over the left edge at y 474 and out
// at the RIGHT door. 1072px.
const lowerRight = [
  { x: -38, y: 484 },
  { x: 1, y: 475 },
  { x: 155, y: 451 },
  { x: 235, y: 432 },
  { x: 335, y: 397 },
  { x: 451, y: 341 },
  { x: 469, y: 345 },
  { x: 515, y: 374 },
  { x: 539, y: 381 },
  { x: 591, y: 380 },
  { x: 683, y: 389 },
  { x: 789, y: 389 },
  { x: 959, y: 375 },
  { x: 999, y: 374 }
];

// AND ITS TOP-HAND BRANCH, in at the same mouth and out at the TOP door. 900px. It
// forks from the road above at about (390, 370), which is 430px in — the two share
// nearly half their length before they part.
//
// PASTED AS TRACED rather than snapped onto a shared head, which is the call every
// forked board in this game has made. Measured across the shared stretch the two
// are never more than 3px apart, which is what the simplifier itself works to: they
// are one line described twice, and re-running the tracer after a redraw and
// pasting what it says matters more than making two lists identical by hand.
const lowerTop = [
  { x: -38, y: 484 },
  { x: 1, y: 475 },
  { x: 155, y: 451 },
  { x: 235, y: 432 },
  { x: 335, y: 397 },
  { x: 403, y: 364 },
  { x: 429, y: 347 },
  { x: 445, y: 323 },
  { x: 446, y: 271 },
  { x: 475, y: 197 },
  { x: 480, y: 125 },
  { x: 487, y: 93 },
  { x: 512, y: 37 },
  { x: 535, y: 1 },
  { x: 551, y: -36 }
];

// NINE, in road order, and how far each is from the door it is nearest along
// whichever route passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_12_Map`.
//
// ALL NINE READ CLOSE at the splitter's 95px, which only the Factory has managed
// before — and this board beats it. They run 71 to 82px off the road against the
// Factory's 75 to 99, which is the tightest spread any board has shipped.
//
// THE REASON IS THE CROSSROADS. Four routes meet in the middle of this map, so
// there is no deep grass anywhere near the centre to put a marker in: every plot is
// wedged into a pocket between two roads. Seven of the nine sit inside the fork,
// and the two that do not are the pair by the right-hand door.
//
// AND THE SPREAD FROM THE KEEP IS ENORMOUS — 955px down to 226. The marker at
// (64, 382) is nearly a thousand pixels of road from the nearest exit and the one at
// (774, 461) is a fifth of that, which is the widest range on any board in the game.
// A tower's worth here is decided by WHEN in a run it can be afforded rather than by
// what it can see, because the far plots buy time and the near ones buy nothing but
// a last chance.
const plots1 = [
  { x:  64, y: 382 },   //  955 from its door, 82 off the road
  { x: 158, y: 326 },   //  895 from its door, 74 off the road
  { x: 226, y: 179 },   //  824 from its door, 73 off the road
  { x: 296, y: 327 },   //  744 from its door, 71 off the road
  { x: 316, y: 489 },   //  736 from its door, 81 off the road
  { x: 373, y: 182 },   //  684 from its door, 81 off the road
  { x: 421, y: 446 },   //  632 from its door, 82 off the road
  { x: 651, y: 459 },   //  342 from its door, 73 off the road
  { x: 774, y: 461 }    //  226 from its door, 72 off the road
];
export const level14 = {
  id: 'm14',
  name: 'Ironforge Castle',
  short: 'Castle',
  art: 'map14',
  src: 'assets/map/Stage_12_Map',

  routes: [left, bottom, lowerRight, lowerTop],
  plots: plots1,
  waves: stage12Waves,
  wavesExtended: stage12Waves,
  oneLength: true,

  // 30 / 30 / 20 / 20, and the shares have to be given from the ENTRY end on this
  // board because the exit end cannot determine them.
  //
  // The owner's numbers: "30% of enemies for left road, 30% for bottom middle
  // road, 40% for left bottom road", and the left-bottom road splits half and
  // half. So the four routes are 30, 30, 20, 20 — and the doors come out at 50
  // each, which is the owner's own check on his own arithmetic: "that way, 50% of
  // enemies should exit either top or right road."
  //
  // WHY IT ONLY WORKS ONE WAY ROUND. On stage 11 the two readings met — the entry
  // shares and the exit shares had exactly one solution in common. Here they do
  // not: 50/50 at the doors is satisfied by any split of the left-bottom road that
  // puts 20 on each side, and also by moving 10 from the left road to the bottom
  // one and splitting the fork 30/10. The entry shares are what pick between them,
  // so they are the ones written down. See nextRoute in src/enemies.js.
  routeMix: [3, 3, 2, 2],

  // TIER 3, PLUS SEVEN NAMED RUNGS — the same set Ironforge Town and the Factory
  // open, which makes this the third board in a row to do it and the shape a last
  // board has settled into: every tier 4 in the game except the Trebuchet and the
  // Judgement Temple.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep', 'High Altar',
          'Assassin Guild', 'Musketeer Post', 'Cannon Outpost'],

  startGold: 240,
  startLives: 20,

  // NOTHING IS PREBUILT, and the board gives two men instead. The owner's ask:
  // "There is no prebuilt tower. Instead, there are 2 musketeer units that have the
  // same stats as a musketeer in a tower. Only difference is physical damage is 40."
  //
  // THIRD BOARD WITH A GARRISON, after stage 5's crossbowmen and stage 8's church,
  // and the first where the garrison IS the opening gift rather than something
  // standing beside one. The Factory hands you a Cannon Outpost on a plot; this
  // hands you two guns that need no plot, which leaves all nine markers free and
  // 240 gold to spend on them.
  //
  // WHERE THEY STAND IS THE WHOLE OF WHAT THEY ARE WORTH. Both are on the castle's
  // side of the road, one at each end of it — (773, 321) beside the stone wall below
  // the gate, and (903, 457) behind the lower barricade. Their reach is the
  // Musketeer Post's 480, which is the longest in the game, and between them they
  // cover the crossroads every one of the four routes passes through. So the answer
  // to "which road do they defend" is all of them, and the answer to "for how long"
  // is the middle third of each — the far ends of the two left-hand roads are out of
  // reach of both, which is what leaves the deep plots something to do.
  //
  // THE ANCHORS ARE WHERE EACH MAN'S FEET ARE, read off the artwork rather than
  // guessed: the bottom of his body where it meets the ground shadow, measured by
  // scanning down his centre column in a render of the six layers. split-map cuts
  // the painted figure out of the base around them so the game's live one is not
  // drawn over a picture of itself, and it refuses if there is nothing there — so a
  // redraw that moves them is an error rather than a silent double.
  garrison: [
    { x: 773, y: 321, unit: 'Musketeer' },
    { x: 903, y: 457, unit: 'Musketeer' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the cottage on the left, and the castle.
  //
  // THE CASTLE IS THE WIDEST BOX IN THE GAME at 359px, and it earns it — the road
  // from the bottom passes behind its near wall on the way to the top door, so a
  // column walking up the middle of the board goes behind the stonework and comes
  // out the other side. Stage 8's church is taller; nothing is wider.
  //
  // THE TWO BARRICADES ARE DELIBERATELY NOT HERE, and the splitter says so each time
  // it runs: each stands over a garrison post, so a box would draw the stonework in
  // front of the musketeer the artist drew in front of it. Stage 5's barricade and
  // stage 8's altar are withheld for exactly the same reason, which makes this the
  // third time the rule has been the answer and the first time it was not a
  // surprise.
  frontArt: 'front14',
  front: [
    { x:  30, y: 101, w:  78, h:  81, g: 166 },   // stands on y 166 — the cottage
    { x: 558, y:  68, w: 359, h: 216, g: 227 }    // stands on y 227 — the castle
  ]
};
