// STAGE 11: Ironforge Factory, and the first board where BOTH ends branch.
//
// THREE IN AND THREE OUT, over FOUR routes. Every shape before this had a simple
// end: stage 4 is three roads into one door, stage 6 is one mouth forking into two,
// stage 9 is three roads into two doors, stage 10 is two mouths and a fork. This one
// is a funnel AND a fork at once — two of the three roads merge and leave together,
// and the third splits in half — so the count of routes is neither the count of
// mouths nor the count of doors. Four, over three of each.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_11_Map --exit right --pair 0:0,1:0,2:1,2:2
//   node tools/split-map.mjs assets/map/Stage_11_Map
//
// ALL THREE DOORS ARE ON THE RIGHT EDGE, which is worth saying because the owner
// named them "top right, right and bottom right" and those read like three different
// edges. They are three mouths on the one edge, at y 106, 286 and 462 — so `--exit
// right` is the whole of it and the tracer needed no new form for this board.
//
// `--pair 0:0,1:0,2:1,2:2` is the long form stage 10 added: one item per ROUTE,
// naming its entry and its exit. Entry 0 and entry 1 both take exit 0, which no
// short-form pairing can say, and entry 2 takes both of the others.
//
// AND THE BOTTOM-LEFT ROAD RUNS OFF OVER THE CORNER. The tarmac touches the left
// edge for 92px at y 494 and the bottom edge for 42px at x 20, so the tracer sees
// four mouths where the artist drew three roads. The CORNER rule folds the narrower
// into the wider and now says so in the listing — see `merged` in trace-road.mjs,
// which this board is the reason for.
//
// No `palette` on this one: the Factory is grass like every board but Sandshroud.
//
// `--accept` on the splitter, and what is being accepted is named beside `front`.
import { stage11Waves } from './waves.js';

// THE MIDDLE-LEFT ROAD, in over the left edge at y 250 and out at the TOP RIGHT
// door. 1087px — the second longest road in the game, and the two that beat it are
// both on this board.
const upper = [
  { x: -38, y: 243 },
  { x: 1, y: 251 },
  { x: 47, y: 253 },
  { x: 103, y: 263 },
  { x: 177, y: 289 },
  { x: 235, y: 318 },
  { x: 257, y: 321 },
  { x: 283, y: 312 },
  { x: 385, y: 258 },
  { x: 459, y: 230 },
  { x: 723, y: 181 },
  { x: 921, y: 115 },
  { x: 959, y: 107 },
  { x: 998, y: 97 }
];

// THE BOTTOM-LEFT ROAD, in over the left edge at y 494 — round the corner from the
// bottom edge — and out at the SAME top-right door. 1135px, the longest road in the
// game, and it spends the last 782 of them as the same tarmac as the road above.
//
// PASTED AS TRACED rather than snapped onto a shared tail, which is the call stages
// 9 and 10 both made. Measured across the merged stretch the two are never more than
// 4px apart, against the 3px the simplifier itself works to. They are one line
// described twice, and re-running the tracer after a redraw and pasting what it says
// matters more than making two lists identical by hand.
const lower = [
  { x: -35, y: 513 },
  { x: 1, y: 495 },
  { x: 33, y: 486 },
  { x: 189, y: 413 },
  { x: 222, y: 387 },
  { x: 259, y: 335 },
  { x: 281, y: 315 },
  { x: 333, y: 284 },
  { x: 411, y: 247 },
  { x: 491, y: 222 },
  { x: 627, y: 201 },
  { x: 729, y: 179 },
  { x: 921, y: 115 },
  { x: 959, y: 107 },
  { x: 997, y: 96 }
];

// THE BOTTOM ROAD'S UPPER BRANCH, in over the bottom edge at x 348 and out at the
// MIDDLE-RIGHT door. 751px, and the shortest road on the board by three pixels.
const right = [
  { x: 313, y: 557 },
  { x: 349, y: 539 },
  { x: 363, y: 537 },
  { x: 427, y: 491 },
  { x: 521, y: 450 },
  { x: 619, y: 417 },
  { x: 705, y: 404 },
  { x: 773, y: 348 },
  { x: 817, y: 325 },
  { x: 883, y: 303 },
  { x: 959, y: 287 },
  { x: 997, y: 275 }
];

// AND ITS LOWER BRANCH, in at the same mouth and out at the BOTTOM-RIGHT door.
// 748px. It forks from the road above at (708, 402), 430px in and well past halfway,
// and the two doors end 176px apart.
const lowerRight = [
  { x: 314, y: 558 },
  { x: 349, y: 539 },
  { x: 363, y: 537 },
  { x: 423, y: 493 },
  { x: 493, y: 461 },
  { x: 583, y: 428 },
  { x: 645, y: 412 },
  { x: 685, y: 409 },
  { x: 705, y: 414 },
  { x: 767, y: 470 },
  { x: 805, y: 486 },
  { x: 837, y: 488 },
  { x: 875, y: 484 },
  { x: 959, y: 463 },
  { x: 999, y: 457 }
];

// NINE, in road order, and how far each is from the door it is nearest along
// whichever road passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_11_Map --accept`.
//
// EIGHT OF THE NINE READ CLOSE at the splitter's 95px, which no board has managed —
// Sandshroud read FAR on all nine and Ironforge Town on seven. They run 75 to 99px
// off the road, the tightest spread any board has shipped, and that is the Factory's
// own shape: four roads crossing one canvas leaves no deep pockets of grass to put a
// marker in.
//
// AND THE TWO LEFT-HAND ROADS RUN THE LENGTH OF THE BOARD, so the plots at that end
// are a long way from any door — 900px and 836 — while the three by the right edge
// are 81, 152 and 184. A tower's worth on this board is decided by which of the four
// roads it can see rather than by how much road is in its ring, which is the thing
// four routes over three mouths does to a map.
const plots1 = [
  { x: 118, y: 354 },   //  900 from its door, 81 off the road
  { x: 244, y: 221 },   //  836 from its door, 91 off the road
  { x: 325, y: 450 },   //  711 from its door, 92 off the road
  { x: 374, y: 376 },   //  700 from its door, 99 off the road
  { x: 640, y: 493 },   //  408 from its door, 77 off the road
  { x: 656, y: 274 },   //  372 from its door, 77 off the road — beside the cannonballs
  { x: 794, y: 246 },   //  184 from its door, 82 off the road
  { x: 842, y: 412 },   //  152 from its door, 75 off the road
  { x: 902, y: 215 }    //   81 from its door, 82 off the road
];

export const level13 = {
  id: 'm13',
  name: 'Ironforge Factory',
  short: 'Factory',
  art: 'map13',
  // FOUR FILES, and the first board with two LETTERED parts at the top: layer 1 is
  // the grass, the roads and the nine markers, layer 2 is the scatter, and 3a and 3b
  // are the factory. readArtwork sorts them by number then letter — see tools/svg.mjs.
  src: 'assets/map/Stage_11_Map',

  routes: [upper, lower, right, lowerRight],
  plots: plots1,
  // THE PEOPLE WHO LIVE HERE, as points: selectable, never drawn — see level00.
  // Each anchor is the centre of the figure's own ground shadow.
  villagers: [
    { x: 452, y: 144 },       // at the mill door
    { x: 394, y: 160 },       // carrying a crate from the store
    { x: 137, y: 207 },       // by the top-left house
    { x: 623, y: 326 }        // at the stone pile
  ],
  waves: stage11Waves,
  wavesExtended: stage11Waves,
  oneLength: true,

  // 30 / 30 / 20 / 20, which is BOTH of the owner's asks at once and the reason this
  // board's shares are worth a note.
  //
  // He gave them from both ends: "assign 30% of enemies for left middle and left
  // bottom each and assign 40% for bottom middle road", and "60% of enemies for top
  // right road and 20% for right and bottom right road each". On stage 9 those two
  // readings had to be reconciled by hand, because two roads shared a door and the
  // entry shares did not determine the exit shares. Here they agree exactly: the two
  // left roads carry 30 each and both leave by the top right, which is 60; the bottom
  // road's 40 splits evenly between its two branches, which is 20 and 20.
  //
  // So there is one set of four numbers that satisfies both, and it is these. See
  // nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  routeMix: [3, 3, 2, 2],

  // TIER 3, PLUS SEVEN NAMED RUNGS — one more than Ironforge Town and the most any
  // board has opened. Every tier 4 in the game is buildable here except the Trebuchet
  // and the Judgement Temple, which is what a last board should look like.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep', 'High Altar',
          'Assassin Guild', 'Musketeer Post', 'Cannon Outpost'],

  startGold: 240,
  startLives: 20,

  // A CANNON OUTPOST ALREADY STANDING, at the owner's ask: "There is a prebuilt
  // tower, Cannon Outpost at the beginning of the game. This tower is placed at the
  // fourth plot marker (when counting from the top), the one in the middle beside
  // cannonballs drawn in other layer."
  //
  // (656, 274) ANSWERS BOTH HALVES OF THAT, which is what makes the index safe to
  // write down. Sorted by y the markers run 215, 221, 246, 274, ... so it is the
  // fourth from the top; and the stack of cannonballs in layer 2 sits at about
  // (650, 315), 41px below it and nearer to it than to any other marker by 180px.
  // tools/campaign.mjs asks the geometry rather than trusting this number, because a
  // redraw renumbers the list and stage 6 has already shipped a prebuilt pinned to an
  // index the artwork moved.
  //
  // A CANNON OUTPOST IS ARTILLERY, which no prebuilt has been. Sandshroud gives a
  // barracks and Ironforge Town an archery tower; this one gives the family with a
  // BLAST and a 130px hole in the middle of its reach, which is a different kind of
  // gift — it answers a crowd rather than a body, and it cannot answer anything that
  // walks up to it.
  //
  // AND IT STANDS WHERE THE BOARD IS BUSIEST. All four routes pass within 140px of
  // this plot — 79, 77, 132 and 137 — and a Cannon Outpost reaches 360 with no dead
  // zone at all, so it covers 64%, 61%, 78% and 52% of them. It is the only marker on
  // the board that sees every road. That is what a free machine wants: not the longest
  // stretch of road, but the place where the most of them cross.
  //
  // THE ARTIST PUT THE CANNONBALLS THERE, which is the part worth noticing. The plot
  // the owner picked by pointing at a pile of ammunition is also the plot the geometry
  // would pick for artillery, and nothing about the drawing had to be measured for
  // that to come out.
  prebuilt: [
    { plot: 5, family: 'siege', name: 'Cannon Outpost' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the sawmill, the mill house with the wheel, the
  // cottage on the left and the pair of stone houses in the middle of the board.
  //
  // `--accept` IS ON THIS ONE, and what it accepts is the reverse of stage 10's. The
  // splitter refuses when anything sits in the 26–35px band where height cannot tell
  // a standing thing from a flat one; here the shortest STANDING thing is 81px and
  // the tallest flat one 22, which is the clearest gap any board has had. What it
  // objects to is the COUNT — sixty things on the top layer, most of them the
  // factory's scattered planks and crates — and four of them standing. The flag says
  // the classification has been looked at, and it has: nothing on this board is
  // anywhere near the line.
  frontArt: 'front13',
  front: [
    { x: 301, y:  53, w:  86, h: 114, g: 133 },   // stands on y 133 — the sawmill
    { x: 455, y:  33, w: 138, h: 122, g: 133 },   // stands on y 133 — the mill house
    { x:  30, y: 101, w:  78, h:  81, g: 166 },   // stands on y 166
    { x: 485, y: 239, w:  84, h: 149, g: 371 }    // stands on y 371
  ]
};
