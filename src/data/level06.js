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

  // TIER 3, PLUS TWO NAMED RUNGS ABOVE IT.
  //
  // Stage 3 let one tower through its cap; this lets two. The Crossbow Sentry is the
  // same exception it was there, and the BALLISTA TURRET is the new one, at the
  // owner's ask: "ballista turrets are no longer restricted for towers built so it
  // will be seen in artillery tier 3 radial menu."
  //
  // WHAT THAT DOES TO EACH FORK. Both ladders fork at tier 4 into a pair, and `allow`
  // names one of each pair, so on this board neither fork IS a fork: a Crossbow Tower
  // offers only the Crossbow Sentry and a Trebuchet offers only the Ballista Turret,
  // each drawn due east as a single choice. The Musketeer Post and the Cannon Outpost
  // are still tier 4 and still above the cap, so both read "Maxed".
  //
  // AND THE PREBUILT IS NOW SOMETHING A PLAYER CAN BUILD, which it was not an hour
  // ago. That is the point of this change rather than a side effect of it: the board
  // opens with a Ballista Turret standing and the ladder to a second one is open.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret'],

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
  // A BALLISTA TURRET on the middle plot — the ordinary tier 4 siege tower, on its
  // own stone, with both of its abilities to buy and neither of them bought. It is
  // an ordinary tower in every respect: sellable, and buildable again on any other
  // plot now that `allow` lets a Trebuchet reach it.
  //
  // IT WAS A GROUND BALLISTA FOR ONE BUILD — the same machine with no stone under it,
  // off the siege ladder so nothing could offer it for sale, one ability. The owner
  // sent it back: "change it to normal tower ballista turret. put the ballista back
  // on the tower. players can also own both abilities." So the def, the family
  // `extra` that carried it, and the render rule that drew a machine with no
  // building are all gone rather than left standing unused.
  //
  // NAMED rather than numbered, because siege has two tier 4s and a number cannot
  // say which — prebuiltOn refuses a bare tier on a forked ladder.
  //
  // WHAT SELLING IT RETURNS is 366: 60% of the whole 610 ladder a player would have
  // climbed to stand here, which is what every other prebuilt is worth. The ground
  // version was worth 138 because it had no ladder under it; this one does.
  //
  // THE PLOT IS NAMED BY INDEX into the list above, which is in road order, so a
  // redraw that moves the markers moves this with them. Index 4 is the middle one —
  // fourth of nine from the keep, and the plot that sits between the two roads out of
  // the trees, which is why the owner put a ballista on it.
  prebuilt: [
    { plot: 4, family: 'siege', name: 'Ballista Turret' }
  ]
};
