// STAGE 9: Sandshroud Settlement, and the first board in this game that is not
// drawn on grass.
//
// THE PALETTE IS THE STORY OF THIS FILE. Eight boards are green, and for eight
// boards every tool could find the road by asking for one hard-coded colour. This
// one is sand, its roads are a darker sand, and its shadows are warm brown — and
// the first run of the tracer over it did not fail. It said "4 road shape(s) and
// 6 patches of ground painted back over them" and then refused, and both numbers
// were scenery: the four shapes wearing the old road colour are HIGHLIGHTS ON FOUR
// CLAY POTS, and the six wearing the old ground colour are the CACTI. Every colour
// in the grass palette is still on this board and not one of them means what it
// used to. See `palette` below and PALETTE in tools/svg.mjs.
//
// THREE ROADS IN AND TWO OUT, which no board has had. Stage 4 has three in and one
// out, stage 6 one in and two out; this is the first that is neither a funnel nor a
// fork but both at once — two of the three roads merge, and the third never touches
// either.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_9_Map --exit bottom --pair 0,1,0
//   node tools/split-map.mjs assets/map/Stage_9_Map
//
// No `--accept` on this one: nothing on the board sits near the 30px line the
// splitter uses to tell a standing thing from a flat one.
import { stage9Waves } from './waves.js';

// THE NORTH-WEST ROAD, in over the top-LEFT — and it comes in over the LEFT EDGE
// rather than the top one, at y 51, which is what makes it the longest of the three
// at 904px. It runs down and east to the junction at about (360, 230), and from
// there it is the same tarmac as the road above.
const west = [
  { x: -36, y: 35 },
  { x: 1, y: 51 },
  { x: 151, y: 91 },
  { x: 191, y: 107 },
  { x: 331, y: 192 },
  { x: 348, y: 209 },
  { x: 360, y: 231 },
  { x: 387, y: 353 },
  { x: 414, y: 401 },
  { x: 453, y: 441 },
  { x: 559, y: 524 },
  { x: 582, y: 538 },
  { x: 597, y: 539 },
  { x: 630, y: 562 }
];

// THE NORTH ROAD, in over the top at x 464, down to the same junction and out of
// the same door. 751px — the shortest road on the board, and 153px shorter than the
// one it merges with, which is the whole of why the two ends of this board are not
// the same problem.
const mid = [
  { x: 484, y: -34 },
  { x: 465, y: 1 },
  { x: 441, y: 69 },
  { x: 372, y: 167 },
  { x: 358, y: 197 },
  { x: 360, y: 227 },
  { x: 384, y: 341 },
  { x: 406, y: 389 },
  { x: 441, y: 430 },
  { x: 563, y: 527 },
  { x: 582, y: 538 },
  { x: 597, y: 539 },
  { x: 630, y: 562 }
];

// THESE TWO ARE PASTED AS TRACED rather than snapped onto one shared tail, and
// stage 2's are not — its two routes share their last four points exactly. The
// difference is the simplifier, not the drawing: measured across the merged stretch
// these two are never more than 2px apart, against the 3px tolerance the simplifier
// itself simplifies to, and their mean clearance is 51.7px and 51.5px. They are one
// line described twice. Nudging them together by hand would buy nothing and would
// break the rule that matters more — re-run the tracer after a redraw and paste what
// it says, rather than keeping numbers alive that nothing regenerates.

// THE NORTH-EAST ROAD, in over the top at x 766 and out at the bottom right. 727px,
// and it touches neither of the others at any point.
const east = [
  { x: 768, y: -39 },
  { x: 767, y: 1 },
  { x: 780, y: 41 },
  { x: 780, y: 79 },
  { x: 764, y: 113 },
  { x: 710, y: 179 },
  { x: 693, y: 207 },
  { x: 687, y: 245 },
  { x: 693, y: 305 },
  { x: 711, y: 357 },
  { x: 736, y: 393 },
  { x: 767, y: 423 },
  { x: 845, y: 486 },
  { x: 891, y: 539 },
  { x: 920, y: 566 }
];

// NINE, in road order, and how far each is from the door it is nearest along
// whichever road passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_9_Map`.
//
// ALL NINE READ "FAR" at the splitter's 95px, which no previous board has managed —
// stage 7 and stage 8 had five each. The nearest is 95px off the centreline and the
// furthest 123, and the cause is the drawing rather than a mistake: every road on
// this board bends for its whole length and the markers sit on flat sand a clear
// step back from the kerb, so the distance to the line a tower measures against is
// longer than it looks.
//
// AND IT COSTS THE BOARD NOTHING, which is worth measuring rather than assuming,
// because nine plots all reading FAR looks like a board nobody can defend. Sampled
// every 4px along all three roads, the WORST plot here covers MORE road than the
// worst plot on Dawnford Church does at every rung but one: 288px against 204 for a
// Watchtower, 304 against 216 for an Assassin Guild, 388 against 308 for a Crossbow
// Sentry. The exception is the Trebuchet at 676 against 804, and that is the reach
// being longer than the gaps between these roads rather than the plots being poor.
//
// The shortest reach in the game is the Wayside Shrine's 160px, which is still 37px
// more than the furthest any plot here sits from a road. Nothing on this board is
// out of range of anything.
const plots1 = [
  { x: 213, y: 232 },   //  582 from its door,  95 off the road
  { x: 486, y: 207 },   //  552 from its door, 116 off the road — the top middle
  { x: 807, y: 242 },   //  496 from its door, 115 off the road
  { x: 262, y: 311 },   //  396 from its door, 113 off the road
  { x: 566, y: 274 },   //  396 from its door, 123 off the road
  { x: 823, y: 328 },   //  236 from its door, 107 off the road
  { x: 371, y: 501 },   //  233 from its door, 100 off the road
  { x: 684, y: 478 },   //  231 from its door,  97 off the road
  { x: 894, y: 400 }    //  126 from its door,  98 off the road
];

export const level11 = {
  id: 'm11',
  name: 'Sandshroud Settlement',
  short: 'Sandshroud',
  art: 'map11',
  // THREE FILES. Layer 1 is the sand, the roads and the nine markers; layer 2 is
  // the cacti; layer 3 is the settlement.
  src: 'assets/map/Stage_9_Map',

  // THE DESERT PALETTE, and the three colours every tool that reads this board has
  // to be told. Sand for the ground, a darker sand for the roads, warm brown for
  // the shadows. A board that says nothing gets the grass palette, which is every
  // board but this one.
  //
  // GROUND IS DECLARED EVEN THOUGH IT IS ALSO THE BACKGROUND RECT, because map 1's
  // rect is white and its grass is a path drawn over it — deriving would be right
  // eight times in nine, which is the worst kind of rule. tools/campaign.mjs checks
  // this against the rect so the two cannot drift apart.
  palette: { ground: '#fad5a5', road: '#be9f6d', shadow: '#655a48' },

  routes: [west, mid, east],
  plots: plots1,
  // THE PEOPLE WHO LIVE HERE, as points: selectable, never drawn — see level00.
  // Each anchor is the centre of the figure's own ground shadow.
  villagers: [
    { x: 568, y: 363 },       // at the middle house
    { x: 276, y: 390 },       // by the left-hand houses
    { x: 306, y: 443 }
  ],
  waves: stage9Waves,
  wavesExtended: stage9Waves,
  oneLength: true,

  // HALF THE WAVE OUT OF EACH DOOR, at the owner's ask: "Assign 50% of enemies to
  // exit bottom middle road and another 50% for bottom right road."
  //
  // AND THIS IS THE FIRST BOARD WHERE THE SHARES ARE NOT ALL ONE. On stages 7 and 8
  // a route is a whole road from its own mouth to its own door, so an even deal
  // settled both ends at once. Here TWO of the three roads end at the same door, so
  // an even deal — 1, 1, 1 — would put two thirds of every wave out of the middle
  // and one third out of the right, which is not what was asked.
  //
  // So the eastern road carries as much as the other two together: west 1, mid 1,
  // east 2. Half the wave out of each door, and the half that leaves by the middle
  // splits evenly between the two roads that feed it — a quarter in at the top left
  // and a quarter in at the top middle, which is the even reading of an ask that
  // named the exits and left the entries to follow.
  //
  // See nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  routeMix: [1, 1, 2],

  // TIER 3, PLUS FIVE NAMED RUNGS — and the fifth is the first time any board has
  // opened TWO tier-4 rungs in one family. Paladin Keep and Assassin Guild are both
  // the barracks' tier 4, so this is the first board where reaching the top of a
  // family is still a choice rather than a single door.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep', 'High Altar', 'Assassin Guild'],

  startGold: 240,
  startLives: 20,

  // AN ASSASSIN GUILD ALREADY STANDING, at the owner's ask: "There is a prebuilt
  // tower, Assassin Guild at the beginning of the game. This tower is placed at the
  // top middle plot marker. Players can sell or own abilities for this tower."
  //
  // (486, 207) IS THE TOP MIDDLE PLOT AND IT WINS ON BOTH READINGS OF THE PHRASE,
  // which is what makes the index safe to write down. It is the topmost marker on
  // the board — y 207 against 232 for the next — and it is the nearest to the middle
  // by x, 6px off centre against 86 for the next. No other plot is first on either
  // count. tools/campaign.mjs asks the geometry rather than trusting this number,
  // because a redraw renumbers the list and stage 6 has already shipped a prebuilt
  // pinned to an index the artwork moved.
  //
  // AND IT IS THE PLOT THAT SEES THE JUNCTION. The two western roads merge at about
  // (360, 230) and this marker stands 128px from that spot — near enough that a
  // tower on it covers both roads before they meet AND the merged road after. The
  // eastern road it cannot touch at all. An Assassin Guild is a barracks, so what
  // stands there is three men who walk to the fighting rather than a shot with a
  // range, which is the one kind of tower that can make use of a junction.
  prebuilt: [
    { plot: 1, family: 'barracks', name: 'Assassin Guild' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: six mud-brick houses and the village signpost,
  // and nothing else on the board is tall enough to need a box.
  //
  // NOT ONE OF THEM EVER OCCLUDES ANYTHING, and that is worth writing down rather
  // than discovering twice. Measured against all three roads, no road passes behind
  // any of these boxes — the nearest approach is the top-left house, whose box
  // comes within 17px of the western road and is passed BESIDE rather than behind,
  // and the sign stands in the crotch of the junction 72px from the nearest kerb.
  // No plot stands behind one either. So the boxes are correct and idle: they are
  // here because the things stand up and the rule is the rule, not because anything
  // on this board is currently hidden by them.
  //
  // AND THE SANDSHROUD SIGNPOST, which is the seventh and was the sixth-and-a-half
  // for one build. It shipped with its shadow painted #37422f, the green of the
  // grass boards, so the desert palette could not see it and the splitter withheld
  // its box — "no #655a48 shadow under it", which is the message that named the
  // cause rather than the effect. The owner repainted the shadow and it boxed
  // itself on the next run. Nothing else on the board changed: the same nine plots,
  // the same six houses, the same ground lines.
  //
  // IT IS THE SHORTEST BOX ON THE BOARD at 44px, which is what makes this a board
  // with no `--accept`: 45px of standing thing against 21px of flat is still a
  // clear gap either side of the splitter's 30px line.
  frontArt: 'front11',
  front: [
    { x: 306, y:  60, w:  39, h:  44, g: 102 },   // stands on y 102 — the signpost
    { x:  30, y: 103, w:  99, h:  88, g: 169 },   // stands on y 169
    { x: 836, y: 114, w:  99, h:  87, g: 180 },   // stands on y 180
    { x: 470, y: 296, w:  82, h:  79, g: 356 },   // stands on y 356
    { x: 157, y: 328, w:  84, h:  79, g: 388 },   // stands on y 388
    { x: 559, y: 368, w:  82, h:  81, g: 430 },   // stands on y 430
    { x: 215, y: 401, w:  82, h:  79, g: 461 }    // stands on y 461
  ]
};
