// STAGE 4: the workshop outside the town, and three ways to reach it.
//
// Stage 3 was the town's gate. This is the yard in front of it — a timber shed, a
// stack of planks, a forge with the fire lit, a practice butt up in the trees — and
// the board's own lesson is in the ROADS rather than in the buildings.
//
// THREE WAYS IN, ONE WAY OUT. Two roads come down out of the trees at the top and
// one in from the west; all three meet above the workshop and everything leaves by
// the same gate on the right. Stage 2 taught two-in-one-out with a junction near
// the end, where a tower on either arm covered almost nothing until the join. This
// widens that to three and moves the meeting point earlier, so the arms are shorter
// and the shared road is longer — the board rewards covering the join and punishes
// spreading thin across three mouths.
//
// AND THE WAVE IS DEALT RATHER THAN ROLLED, which is the other half of the same
// design and the owner's ask. See `entryMix` below.
//
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Stage_4_Map`,
// and the plots by `node tools/split-map.mjs assets/map/Stage_4_Map`. The map is
// the source of truth for both. Redraw and re-run rather than nudging numbers here.
import { stage4Waves } from './waves.js';

// THE WESTERN ROAD, in low across the fields and up to the meeting point. The
// longest of the three at 1060px.
const west = [
  { x: -38, y: 420 },
  { x: 1, y: 413 },
  { x: 101, y: 406 },
  { x: 189, y: 389 },
  { x: 279, y: 360 },
  { x: 355, y: 326 },
  { x: 469, y: 324 },
  { x: 595, y: 304 },
  { x: 621, y: 307 },
  { x: 687, y: 330 },
  { x: 755, y: 347 },
  { x: 959, y: 363 },
  { x: 998, y: 370 }
];

// The left-hand road out of the trees, 1018px.
const north = [
  { x: 263, y: -38 },
  { x: 273, y: 1 },
  { x: 276, y: 75 },
  { x: 292, y: 147 },
  { x: 344, y: 291 },
  { x: 353, y: 306 },
  { x: 367, y: 318 },
  { x: 389, y: 325 },
  { x: 449, y: 326 },
  { x: 603, y: 304 },
  { x: 755, y: 347 },
  { x: 959, y: 363 },
  { x: 999, y: 366 }
];

// And the right-hand one, which is much the shortest at 745px — it comes down
// almost on top of the gate. That is what makes the entry split matter: a man sent
// down this road is 315px nearer the keep than one sent down the west, so an even
// three-way split is not an even fight.
const northEast = [
  { x: 505, y: -37 },
  { x: 519, y: 1 },
  { x: 560, y: 95 },
  { x: 582, y: 159 },
  { x: 598, y: 217 },
  { x: 606, y: 275 },
  { x: 625, y: 302 },
  { x: 671, y: 325 },
  { x: 755, y: 347 },
  { x: 959, y: 363 },
  { x: 998, y: 370 }
];

// NINE, in road order — how far each still is from the keep along whichever of the
// three roads passes nearest, which is the only ordering that means anything on a
// board with more than one. Eight are buildable and the ninth opens with a ballista
// standing on it; see `prebuilt` below.
//
// FIVE OF THEM READ "FAR" at the splitter's 95px, and on this board that is the
// artwork being consistent rather than careless: the road is 55px at its median
// against the earlier boards' 44 to 48, so a plot set the same distance back from
// the KERB is further from the centreline the tower actually measures against.
// Every one of them still covers a real share of the road — tools/siege.mjs
// measures that, and the worst here is well clear of its floor.
const plots1 = [
  { x:  80, y: 496 },   //  947 from the keep,  88 off the road
  { x:  71, y: 308 },   //  943 from the keep, 100 off the road
  { x: 232, y: 470 },   //  814 from the keep,  90 off the road
  { x: 192, y: 254 },   //  786 from the keep, 128 off the road
  { x: 461, y: 222 },   //  532 from the keep, 101 off the road — between the two top roads
  { x: 749, y: 243 },   //  279 from the keep,  98 off the road
  { x: 735, y: 427 },   //  244 from the keep,  82 off the road
  { x: 883, y: 258 },   //  124 from the keep,  99 off the road
  { x: 880, y: 448 }    //  112 from the keep,  91 off the road
];

export const level06 = {
  id: 'm6',
  name: 'Winchester Workshop',
  // The admin panel's map tab is a chip about nine characters wide — see MAP_W in
  // src/admin.js. Every screen with room shows the full name.
  short: 'Workshop',
  art: 'map06',
  src: 'assets/map/Stage_4_Map',
  routes: [west, north, northEast],
  plots: plots1,
  waves: stage4Waves,
  wavesExtended: stage4Waves,
  oneLength: true,

  // HALF THE WAVE COMES UP THE WEST ROAD. The other half is shared by the two out
  // of the trees.
  //
  // THE OWNER'S ASK, in their own words: "Although enemies come out from each entry
  // randomly (Correct me if i am wrong). Assign only 50% of enemies to left road and
  // another 50% for 2 top roads to share. This is because in a unlucky situation,
  // all enemies can come from top right road and crush the player as there is not
  // enough defenses."
  //
  // They were right about the mechanism. Every board until this one rolls a die per
  // enemy, independently, and on three roads that is 33/33/33 with a tail: a run of
  // ten down the short north-east road is not rare, and this is the board where that
  // loses a game, because that road reaches the gate 315px sooner than the west one.
  //
  // AND WEIGHTING THE DIE WOULD NOT HAVE FIXED IT. Loaded dice give the right
  // AVERAGE and the same bad tail. So `entryMix` is DEALT rather than rolled — a bag
  // of [west, west, north, north-east], shuffled and handed out, refilled when it
  // empties. Every four men are exactly two, one and one; the order inside a bag is
  // still shuffled so a wave does not arrive metronomically. See nextRoute in
  // src/enemies.js.
  //
  // The numbers are SHARES rather than percentages, in the same order as `routes`.
  entryMix: [2, 1, 1],

  // TIER 3, PLUS THE ONE NAMED RUNG ABOVE IT — the same rule as stage 3, at the
  // owner's ask. Archery's fork stops being a fork here and a Crossbow Tower offers
  // exactly one button; every other ladder reads "Maxed" at tier 3.
  //
  // THE BALLISTA IS NOT AN EXCEPTION TO THIS, and that is worth being clear about,
  // because it looks like one. It is a tier 4 machine standing on the board and it
  // is not in `allow` — it does not need to be. `allow` lets a rung through a cap,
  // and the Ground Ballista is not a rung: it is off the siege ladder entirely, so
  // no menu can offer it whatever the cap says. See `groundBallista` in
  // data/towers.js.
  maxTier: 3,
  allow: ['Crossbow Sentry'],

  startGold: 220,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND. The whole top layer of the artwork, one entry per
  // thing that STANDS UP, sorted into the same depth pass as the towers and the
  // soldiers — see the long note in level00.js and drawFigures in src/render.js.
  //
  // FOUR THINGS, and one of them is why the splitter learned to cluster. The stack
  // of planks by the forge is four sibling paths lying on each other, and measured
  // one at a time two of them fall just under the 30px line that tells a building
  // from a road stone and two fall just over it. The tool refused the board rather
  // than pick a threshold inside that crowd, which was the right answer; it groups a
  // building's own parts into one thing now, so the stack is the 51px object a
  // player actually sees.
  //
  // Written out by `node tools/split-map.mjs assets/map/Stage_4_Map`.
  frontArt: 'front06',
  front: [
    { x: 633, y:  64, w:  92, h:  78 },   // stands on y 141 — the practice butt
    { x: 473, y: 369, w:  73, h:  51 },   // stands on y 421 — the stack of planks
    { x: 547, y: 369, w:  83, h:  89 },   // stands on y 458 — the forge
    { x: 314, y: 359, w: 128, h: 108 }   // stands on y 468 — the shed and its sign
  ],

  // WHAT IS ALREADY STANDING WHEN THE GAME OPENS.
  //
  // THE OWNER'S ASK: "the middle plot is a prebuilt ballista without abilities at
  // the start of the game. Players can choose to sell or own heavy bolt ability when
  // they have the gold. This prebuilt ballista is not on top of a tower but on the
  // ground... It only has one ability to own which is heavy bolt. One exception is
  // that there is only one prebuilt ballista but if players sell it, they cannot
  // build another one anymore."
  //
  // ALL FOUR OF THOSE ARE THE SAME ONE DECISION: the Ground Ballista is not on the
  // siege ladder. Everything that offers a purchase — the build menu, `upgradesFrom`,
  // the encyclopedia, the admin panel — walks a family's `tiers`, and this tower is
  // in the family's `extra` instead. So there is nowhere to build it from, selling it
  // leaves an ordinary empty plot, and "they cannot build another one" needed no rule
  // written anywhere. It carries one ability because its def lists one.
  //
  // It opens with NONE bought, which is what any tower does: `abilities` starts empty
  // in makeTower and the radial menu offers Heavy Bolt for the gold like any tier 4's.
  //
  // WHAT SELLING IT RETURNS is 138 — 60% of its own 230, and its own cost alone
  // because there is no ladder underneath it that anybody could have climbed. That is
  // a real choice against a 220 purse: sell for most of another tower, or save 150 for
  // the Heavy Bolt.
  //
  // THE PLOT IS NAMED BY INDEX into the list above, which is in road order, so a
  // redraw that moves the markers moves this with them. Index 4 is the middle one —
  // fourth of nine from the keep, and the plot that sits between the two roads out of
  // the trees, which is why the owner put a ballista on it.
  prebuilt: [
    { plot: 4, family: 'siege', name: 'Ground Ballista' }
  ]
};
