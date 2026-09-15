// STAGE 8: Dawnford Church, and the first board where the two roads CROSS.
//
// Stage 7 is two roads that never meet. This is two that meet exactly once, in the
// open ground south of the church, and every enemy on the board passes through that
// one patch. The owner's ask is what makes it: "enemies who enter the top left will
// exit at the bottom right road. As for enemies who enter the top right will exit at
// the bottom left road."
//
// WHAT THAT CHANGES FOR THE PLAYER is that there is a bullseye again. On stage 7 a
// tower covered half the game or none of it; here a tower on the crossing covers
// everything, and the whole board is a question about whether you can afford to hold
// that one place or have to hold four ends instead.
//
// IT IS ALSO THE FIRST BOARD THE TRACER COULD NOT WORK OUT. See `--pair` in
// tools/trace-road.mjs: a crossing makes the two ribbons one connected blob of ink,
// so a flood from either exit reaches either entry and BOTH pairings are routable.
// The note there predicted the opposite — "it will be wrong loudly" — and it was
// wrong quietly instead, which is the more expensive kind.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_8_Map --exit bottom --pair 1,0
//   node tools/split-map.mjs assets/map/Stage_8_Map --accept
//
// The `--accept` is a decision and belongs here rather than only in a shell history.
// The church's stone wall is drawn as five separate courses of masonry, each 110px
// wide and 28 to 31 tall, so they straddle the 30px line the splitter uses to tell a
// standing thing from a flat one. They were looked at. They are brickwork painted on
// the side of a building, the building itself is the 105px thing beside them, and
// "flat" is right.
import { stage8Waves } from './waves.js';

// IN OVER THE TOP LEFT, down past the west side of the church, through the crossing
// and out at the BOTTOM RIGHT. 901px.
const east = [
  { x: 220, y: -38 },
  { x: 211, y: 1 },
  { x: 200, y: 19 },
  { x: 191, y: 53 },
  { x: 191, y: 83 },
  { x: 199, y: 115 },
  { x: 240, y: 189 },
  { x: 324, y: 297 },
  { x: 359, y: 323 },
  { x: 427, y: 344 },
  { x: 449, y: 356 },
  { x: 499, y: 423 },
  { x: 543, y: 461 },
  { x: 617, y: 499 },
  { x: 667, y: 534 },
  { x: 685, y: 539 },
  { x: 721, y: 539 },
  { x: 758, y: 553 }
];

// AND IN OVER THE TOP RIGHT, down the east side, through the same crossing and out at
// the BOTTOM LEFT. 1020px — 119 longer, which is the one asymmetry on an otherwise
// mirrored board.
const west = [
  { x: 827, y: -34 },
  { x: 807, y: 1 },
  { x: 795, y: 12 },
  { x: 772, y: 49 },
  { x: 691, y: 207 },
  { x: 654, y: 253 },
  { x: 619, y: 284 },
  { x: 579, y: 305 },
  { x: 459, y: 346 },
  { x: 425, y: 343 },
  { x: 371, y: 328 },
  { x: 343, y: 327 },
  { x: 255, y: 375 },
  { x: 232, y: 392 },
  { x: 217, y: 419 },
  { x: 223, y: 449 },
  { x: 264, y: 513 },
  { x: 280, y: 533 },
  { x: 293, y: 539 },
  { x: 318, y: 571 }
];

// EIGHT, in road order — one fewer than the last four boards, and how far each still
// is from the door it is nearest along whichever road passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_8_Map --accept`.
//
// FIVE READ "FAR" at the splitter's 95px, and it is the same cause as stage 7's:
// both roads bend for their whole length, so a plot set the usual distance back from
// the kerb is further from the centreline a tower measures against than one beside a
// straight. tools/siege.mjs measures what each actually covers.
const plots1 = [
  { x: 804, y: 241 },   //  764 from its door, 116 off the road
  { x: 724, y: 331 },   //  684 from its door, 105 off the road
  { x: 141, y: 242 },   //  658 from its door, 112 off the road
  { x: 605, y: 387 },   //  590 from its door,  86 off the road
  { x: 346, y: 426 },   //  302 from its door,  88 off the road
  { x: 426, y: 495 },   //  297 from its door, 103 off the road — under the crossing
  { x: 101, y: 459 },   //  171 from its door, 122 off the road
  { x: 746, y: 458 }    //   40 from its door,  85 off the road
];

export const level10 = {
  id: 'm10',
  name: 'Dawnford Church',
  short: 'Church',
  art: 'map10',
  // FOUR FILES. `_Layer_3a` and `_Layer_3b` are the church and the village; there is
  // no overlay part, because nothing here is drawn between the camera and a road.
  src: 'assets/map/Stage_8_Map',
  routes: [east, west],
  plots: plots1,
  waves: stage8Waves,
  wavesExtended: stage8Waves,
  oneLength: true,

  // HALF THE WAVE DOWN EACH ROAD, dealt rather than rolled, at the owner's ask:
  // "Assign 50% of enemies to exit bottom left road and another 50% for bottom right
  // road." As on stage 7 a route here is a whole road, so an even deal settles both
  // ends at once — half in at each mouth and half out of each door.
  //
  // See nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  routeMix: [1, 1],

  // TIER 3, PLUS THE SAME FOUR NAMED RUNGS STAGE 7 LETS THROUGH.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep', 'High Altar'],

  startGold: 240,
  startLives: 20,

  // NOTHING IS PREBUILT, and the board opens with five men on it instead. This is the
  // second board with a garrison and the first with two KINDS, which between them are
  // the two answers to a question stage 5 only asked half of.
  //
  // THE POPE AT THE ALTAR IS THE CROSSBOWMAN'S SHAPE: "a pope at an altar that can
  // attack enemies just like a pope on top a high altar tower... and the unit cannot
  // be attacked." A fixture — nothing aims at him, nothing lands on him, nothing
  // closes with him — throwing the High Altar's own missile for the High Altar's own
  // 70 magic damage at 220 reach. See `Pope` in data/towers.js.
  //
  // THE FOUR PALADINS ARE THE OTHER ANSWER and they are the first figures in this
  // game that can die and STAY dead: "they can die just like a normal paladin and
  // will not be able to respawn." Not fixtures, so every way a soldier can be hurt
  // reaches them; no `respawn`, so there is no muster to come back from. That second
  // half needed real work — see `fallen` in src/units.js, where a man with no
  // respawn used to be neither restored nor removed and healed himself off the floor.
  //
  // TWO AT EACH DOOR, and which door matters more than it looks. The pair at
  // (221, 481) and (249, 481) stand on the road the EASTERN mouth feeds — the one
  // that comes in top right — and the pair at 549 and 578 on the road from the top
  // left. The crossing is what swaps them.
  //
  // THE ANCHORS ARE WHERE EACH MAN'S FEET ARE, and split-map cuts the painted figure
  // out of the base around them so the game's live one is not drawn over a picture of
  // itself. It refuses if there is nothing there, so a redraw that moves them is an
  // error rather than a silent double.
  garrison: [
    { x: 206, y: 300, unit: 'Pope' },
    { x: 221, y: 481, unit: 'Paladin' },
    { x: 249, y: 481, unit: 'Paladin' },
    { x: 549, y: 481, unit: 'Paladin' },
    { x: 578, y: 481, unit: 'Paladin' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the church, and the congregation on its mat.
  //
  // THE CHURCH IS THE TALLEST BOX IN THE GAME at 259px — bell tower, cross and all —
  // and it stands on y 225, which is the centre of its shadow rather than the bottom.
  // The two roads pass either side of it and both go BEHIND it for a stretch, so this
  // is the box doing the most work on any board so far.
  //
  // THE ALTAR IS DELIBERATELY NOT HERE, and the splitter says why each time it runs:
  // it stands over a garrison post, so a box would draw the stonework in front of the
  // pope the artist drew standing on it. Stage 5's barricade is withheld for exactly
  // the same reason.
  frontArt: 'front10',
  front: [
    { x: 354, y:  13, w: 224, h: 259, g: 225 },   // stands on y 225 — the church
    { x:  11, y: 300, w: 173, h: 105, g: 360 }    // stands on y 360 — the congregation
  ]
};
