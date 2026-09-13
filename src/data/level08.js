// STAGE 6: Dawnford Bridge, and the first board a wave can leave by two doors.
//
// Every board so far has funnelled: stage 4 has three ways in and one out, stage 5
// has two and one. This one is the other shape. The wave arrives over a single
// bridge at the top-left corner, runs down into the village, and the road FORKS —
// half of it leaves at the bottom and half at the right.
//
// WHAT THAT CHANGES FOR THE PLAYER is where a tower is worth building. On a funnel
// the ground near the exit is worth the most, because everything passes it; here
// there are two of those and the only stretch every enemy walks is the run down from
// the bridge to the fork. A tower on the fork covers half a wave; one above it covers
// all of it and has less time to do it in.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_6_Map --exit bottom,right
//   node tools/split-map.mjs assets/map/Stage_6_Map --over 3c
//
// `--exit` takes a LIST now. It took one edge because every board until this one had
// all its exits on a single side, and the tracer also learned that a road meeting a
// CORNER is one mouth rather than two — this bridge touches both the top edge and the
// left one, 34px apart, and was counted twice.
import { stage6Waves } from './waves.js';

// OVER THE BRIDGE AND OUT AT THE RIGHT, the long way round: down into the village,
// through the fork and away east past the huts. 1199px.
const east = [
  { x: 2, y: -30 },
  { x: 27, y: 1 },
  { x: 28, y: 14 },
  { x: 41, y: 32 },
  { x: 95, y: 87 },
  { x: 144, y: 155 },
  { x: 167, y: 179 },
  { x: 363, y: 289 },
  { x: 383, y: 294 },
  { x: 413, y: 290 },
  { x: 519, y: 265 },
  { x: 641, y: 228 },
  { x: 675, y: 225 },
  { x: 711, y: 228 },
  { x: 771, y: 247 },
  { x: 827, y: 280 },
  { x: 933, y: 367 },
  { x: 953, y: 386 },
  { x: 959, y: 399 },
  { x: 989, y: 426 }
];

// AND THE SAME BRIDGE TO THE BOTTOM EDGE, which is 376px shorter — the fork is much
// nearer the south door than the east one. See `routeMix` for why that matters.
const south = [
  { x: 2, y: -30 },
  { x: 27, y: 1 },
  { x: 28, y: 14 },
  { x: 39, y: 30 },
  { x: 95, y: 87 },
  { x: 163, y: 176 },
  { x: 195, y: 198 },
  { x: 307, y: 255 },
  { x: 360, y: 294 },
  { x: 373, y: 317 },
  { x: 381, y: 383 },
  { x: 394, y: 417 },
  { x: 465, y: 517 },
  { x: 480, y: 534 },
  { x: 493, y: 539 },
  { x: 518, y: 570 }
];

// NINE, in road order — how far each still is from the door it is nearest, along
// whichever road passes closest. Written out by `node tools/split-map.mjs
// assets/map/Stage_6_Map --over 3c`.
//
// THREE READ "FAR" at the splitter's 95px and all three are on the SOUTH road, which
// is not carelessness: that road is the short one and it runs diagonally, so a plot
// set the same distance back from the kerb is further from the centreline a tower
// measures against. Every one of them still covers a real share of the road —
// tools/siege.mjs measures that.
const plots1 = [
  { x: 232, y: 316 },   //  806 from its door,  88 off the road — beside the fish stall
  { x: 432, y: 206 },   //  616 from its door,  77 off the road
  { x: 496, y: 354 },   //  588 from its door,  81 off the road
  { x: 567, y: 168 },   //  471 from its door,  79 off the road
  { x: 682, y: 301 },   //  370 from its door,  75 off the road
  { x: 715, y: 154 },   //  349 from its door,  74 off the road
  { x: 256, y: 407 },   //  235 from its door, 127 off the road — beside the south road
  { x: 311, y: 498 },   //  181 from its door, 115 off the road — beside the south road
  { x: 553, y: 457 }    //   40 from its door, 102 off the road — right at the south door
];

export const level08 = {
  id: 'm8',
  name: 'Dawnford Bridge',
  // The admin panel's map tab is as wide as this name and no wider — see tabW in
  // src/admin.js. Every screen with room shows the full name.
  short: 'Dawnford',
  art: 'map08',
  // THREE FILES FOR LAYER 3. `_Layer_3a` and `_Layer_3b` are the village; `_Layer_3c`
  // is the near side of the bridge, which has to be drawn in front of anything
  // crossing it — the same thing stage 5's `_Layer_3e` does and for the same reason.
  // See `over` below.
  src: 'assets/map/Stage_6_Map',
  routes: [east, south],
  plots: plots1,
  waves: stage6Waves,
  wavesExtended: stage6Waves,
  oneLength: true,

  // HALF THE WAVE OUT OF EACH DOOR, dealt rather than rolled, at the owner's ask:
  // "Assign 50% of enemies to exit bottom road and another 50% for right road."
  //
  // THE FIELD USED TO BE CALLED `entryMix` and this board is why it is not. On every
  // earlier board the routes differed by which MOUTH an enemy came in at; here they
  // share a mouth and differ by which one they leave through. What the shares divide
  // is the route, and always was.
  //
  // DEALT MATTERS MORE HERE THAN ANYWHERE. The two roads are 1199px and 823px, so a
  // run of five down the short one is a third of a wave arriving at the bottom door
  // while the towers covering the east road watch — and rolled, a run of five in
  // sixteen is ordinary. See nextRoute in src/enemies.js. Shares, in the same order
  // as `routes`.
  routeMix: [1, 1],

  // TIER 3, PLUS THREE NAMED RUNGS ABOVE IT: the Crossbow Sentry, the Ballista Turret
  // and the Paladin Keep — which is the first board to let a tier 4 BARRACKS through,
  // and it is the one this board opens with already standing.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep'],

  startGold: 240,
  startLives: 20,

  // A PALADIN KEEP ALREADY STANDING, at the owner's ask: "Switch the prebuilt paladin
  // keep plot to the most top left. Near the fish storage." That is (232, 316), the
  // plot beside the fishermen's stall — first in the list below, because the list is
  // in ROAD order and this is the plot the road reaches first.
  //
  // MOVED FROM THE TOP-MIDDLE PLOT, and the move costs the opening tower a great deal:
  // it stood 616px from a door and now stands 806, on the run down from the bridge
  // BEFORE the fork. Which is the whole point of standing there. A barracks holds
  // ground rather than shooting over it, and the one stretch of road every enemy on
  // this board walks is the one above the fork — a Keep there blocks a whole wave,
  // where the same Keep below the fork could only ever block half of one.
  //
  // A TIER 4 ON A TIER 3 BOARD, which is why `allow` names the Paladin Keep as well
  // as capping at 3: a prebuilt tower is an ordinary tower in every respect except
  // that nobody paid for it, so the board has to permit what is standing on it.
  //
  // SELLING IT RETURNS 60% of the whole 530 ladder a player would have climbed to
  // stand here, exactly as every other prebuilt does. It can be sold, and both of its
  // abilities can be bought; nothing about it is special-cased.
  prebuilt: [
    { plot: 0, family: 'barracks', name: 'Paladin Keep' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the village, and nothing else.
  //
  // THE BRIDGE IS NOT HERE and the splitter says why each time it runs — nothing is
  // drawn under it, because a bridge crosses water and does not stand on the ground,
  // so it has no shadow and no ground line to be sorted at. Given one it would paint
  // the whole span over every enemy crossing, which is the one tile on this board
  // where that must not happen: the bridge is the only way in.
  //
  // Its NEAR side is the half that genuinely is between the camera and the deck, and
  // that comes off as an overlay — see `over`.
  frontArt: 'front08',
  front: [
    { x: 233, y: 128, w:  35, h:  43, g: 169 },   // stands on y 169 — the Dawnford sign
    { x: 841, y: 112, w:  74, h:  91, g: 186 },   // stands on y 186
    { x:  80, y: 203, w:  83, h:  89, g: 274 },   // stands on y 274 — the fish stall
    { x: 111, y: 309, w:  46, h:  36, g: 331 },   // stands on y 331 — the crates below it
    { x: 753, y: 288, w:  74, h:  91, g: 362 },   // stands on y 362
    { x: 825, y: 364, w:  78, h:  91, g: 438 }   // stands on y 438
  ],

  // AND THE NEAR SIDE OF THE BRIDGE, in front of everything on the board.
  //
  // THE OWNER'S ASK: "I also added another layer (3c) which is part of the bridge that
  // will overlap the units crossing it (just like stage 5)." Same mechanism, same
  // reason — see the long note on `over` in level07.js. Written by `--over 3c`.
  overArt: 'over08',
  over: { x: 0, y: 0, w: 112, h: 187 }
};
