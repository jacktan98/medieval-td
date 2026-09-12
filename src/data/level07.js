// STAGE 5: Winchester Castle, and the first board whose keep is not on the right.
//
// The Workshop was the yard outside the town. This is the castle itself: a keep in
// the top-left corner with its gate and its two banners, a wooded park around it,
// and a river along the bottom-right with a wooden bridge over it.
//
// THE ENEMIES LEAVE OVER THE BRIDGE, which is the thing about this board. Every
// board before it ran west to east and ended at a keep off the RIGHT edge — a
// convention so old that tools/trace-road.mjs was built on it and refused this map
// outright ("road does not reach both edges", three mouths and no exit). The exit is
// an argument now:
//
//   node tools/trace-road.mjs assets/map/Stage_5_Map --exit bottom
//
// TWO WAYS IN, ONE OUT: down from the top and in from the west, meeting in front of
// the castle and leaving together over the bridge. The two roads are almost the same
// length — 999px and 1066px — which is what makes the even split below fair here in
// a way it was not on stage 4.
//
// TRACED FROM THE ARTWORK, and the plots by `node tools/split-map.mjs
// assets/map/Stage_5_Map --accept --over 3e`. The map is the source of truth for
// both. Redraw and re-run rather than nudging numbers here — see the notes on
// `garrison`, `front` and `over` below for what each of those flags decides.
import { stage5Waves } from './waves.js';

// IN FROM THE WEST, along the bottom of the park and round to the bridge.
const west = [
  { x: -36, y: 280 },
  { x: 1, y: 295 },
  { x: 61, y: 326 },
  { x: 119, y: 349 },
  { x: 191, y: 370 },
  { x: 257, y: 381 },
  { x: 337, y: 379 },
  { x: 467, y: 341 },
  { x: 525, y: 339 },
  { x: 549, y: 351 },
  { x: 607, y: 403 },
  { x: 647, y: 425 },
  { x: 695, y: 440 },
  { x: 797, y: 459 },
  { x: 829, y: 471 },
  { x: 863, y: 496 },
  { x: 905, y: 539 },
  { x: 937, y: 563 }
];

// And down from the top right, round the outside of the park and back across to the
// same bridge. It joins the western road at about x 560 and they share the last
// third of the board.
const north = [
  { x: 702, y: -29 },
  { x: 729, y: 1 },
  { x: 742, y: 5 },
  { x: 763, y: 25 },
  { x: 800, y: 79 },
  { x: 810, y: 115 },
  { x: 802, y: 147 },
  { x: 782, y: 175 },
  { x: 747, y: 205 },
  { x: 577, y: 303 },
  { x: 557, y: 327 },
  { x: 556, y: 349 },
  { x: 583, y: 384 },
  { x: 627, y: 416 },
  { x: 683, y: 437 },
  { x: 785, y: 456 },
  { x: 823, y: 468 },
  { x: 859, y: 493 },
  { x: 905, y: 539 },
  { x: 938, y: 562 }
];

// NINE, in road order — how far each still is from the bridge along whichever road
// passes nearest. None of them opens with a tower on it; this is the first board
// since stage 1 with nothing prebuilt.
//
// TWO READ "FAR" at the splitter's 95px and both are the same case: they sit outside
// a bend rather than beside a straight, so the nearest point of road is further away
// than their clearance suggests. Every plot still covers a real share of the road —
// tools/siege.mjs measures that.
const plots1 = [
  { x:  71, y: 223 },   //  997 from the bridge,  96 off the road
  { x:  66, y: 421 },   //  919 from the bridge,  86 off the road
  { x: 255, y: 303 },   //  769 from the bridge,  77 off the road
  { x: 882, y: 226 },   //  763 from the bridge, 111 off the road — outside the top bend
  { x: 794, y: 285 },   //  701 from the bridge,  93 off the road
  { x: 322, y: 458 },   //  691 from the bridge,  79 off the road
  { x: 657, y: 155 },   //  648 from the bridge,  88 off the road
  { x: 465, y: 427 },   //  565 from the bridge,  82 off the road
  { x: 527, y: 225 },   //  504 from the bridge,  93 off the road
];

export const level07 = {
  id: 'm7',
  name: 'Winchester Castle',
  // The admin panel's map tab is as wide as this name and no wider — see tabW in
  // src/admin.js. Every screen with room shows the full name.
  short: 'Castle',
  art: 'map07',
  // FIVE FILES FOR ONE LAYER. The castle is drawn as separable pieces — `_Layer_3a`
  // through `_Layer_3d` — and the bridge's near handrail is a fifth, `_Layer_3e`.
  // `layerFiles` in tools/svg.mjs learned lettered parts for this: they stack
  // alphabetically among themselves and as a group in layer 3's place, and all five
  // are labelled `data-layer="3"` so that "the top layer" is all of them rather than
  // only the last.
  src: 'assets/map/Stage_5_Map',
  routes: [west, north],
  plots: plots1,
  waves: stage5Waves,
  wavesExtended: stage5Waves,
  oneLength: true,

  // HALF THE WAVE DOWN EACH ROAD, dealt rather than rolled, at the owner's ask.
  // See nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  entryMix: [1, 1],

  // TIER 3, PLUS THE SAME TWO NAMED RUNGS STAGE 4 LETS THROUGH: the Crossbow Sentry
  // and the Ballista Turret. Neither archery nor siege forks on this board — each
  // offers one button at tier 3 — and the Musketeer Post and Cannon Outpost stay
  // above the cap and read "Maxed".
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret'],

  // FORTY MORE THAN THE WORKSHOP, at the owner's ask, and it buys about half a tier 1
  // tower. This board has nothing prebuilt where stage 4 opened with a Ballista
  // Turret standing, so the opening purse is doing work the free tower used to.
  startGold: 240,
  startLives: 20,

  // TWO CROSSBOWMEN BEHIND THE BARRICADE BY THE BRIDGE, and they are the first
  // figures in this game that belong to no tower.
  //
  // THE OWNER'S ASK: "there are 2 independent crossbowman near the bridge that can
  // attack normally to enemies but has no upgrade abilities nor can player sell them.
  // They can select the unit and see the stats in description panel but that's it."
  //
  // The artist painted them into the artwork. `node tools/split-map.mjs` CUTS them out
  // of the base — the same thing it does to the plot markers, and for the same reason:
  // the game draws a live one on that spot, and a live figure over a painted one is
  // two figures. Each anchor is the point the figure STANDS ON; the tool cuts whatever
  // is drawn in a figure-sized window around it and refuses if there is nothing there,
  // so a redraw that moves them is an error rather than a silent double.
  //
  // MOVED ONCE ALREADY, in the redraw that added `_Layer_3e`: both men shifted about
  // sixteen px left and a dozen up, and the anchors moved with them. That is the
  // mechanism working — the tool cut three stray fragments instead of a man and said
  // so in its own output, where a silently doubled crossbowman would have shipped.
  garrison: [
    { x: 660, y: 336, unit: 'Crossbowman' },
    { x: 684, y: 323, unit: 'Crossbowman' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND. One thing: the castle.
  //
  // THE BRIDGE IS DELIBERATELY NOT HERE, and it is the biggest thing on the board.
  // Its box feet at y 651 on a 540px canvas — it runs off the bottom-right corner —
  // and the depth pass sorts by the foot of a box, so a box down there sorts after
  // everything forever and nothing could ever be drawn in front of it. Given one, the
  // bridge would paint over every enemy walking across it, which is the one tile on
  // this board where that must not happen: the bridge IS the exit.
  //
  // Its near railing is the opposite case and has its own answer — see `over` below.
  //
  // Written out by:
  //
  //   node tools/split-map.mjs assets/map/Stage_5_Map --accept --over 3e
  //
  // The `--accept` is a decision and belongs here rather than only in a shell history:
  // the felled timber at (517, 468) measures 29.7px tall against a 30px line, so the
  // tool refused to classify it on its own. It is a pile of logs lying on the ground,
  // it was looked at, and "flat" is right.
  frontArt: 'front07',
  front: [
    { x: 127, y:  35, w: 359, h: 209 }   // stands on y 244 — the castle and its braziers
  ],
  // ONE BOX WHERE THERE WERE TWO, and both halves of that are the redraw rather than
  // a change here. The blue ramp out of the gate is a scatter of cobbles now, which
  // is flat and gets no box; without it bridging them, the castle's own walls decide
  // its ground line and it foots at 244 rather than 294. And both braziers moved from
  // the open grass to the gate itself, so they stand against the wall and come through
  // inside the castle's box rather than each holding one of their own.
  // THE BARRICADE AT THE BRIDGE IS NOT HERE, and the splitter says why each time it
  // runs: it is a low wall drawn on a long diagonal, so the one ground line its box
  // can give is the bottom of its far end and that puts the whole wall in front of
  // both crossbowmen — whom the artist drew in front of IT. Nothing else on the board
  // ever comes near it; the road passes ninety pixels away.


  // AND THE ONE THING THAT IS IN FRONT OF EVERYTHING: the bridge's near handrail.
  //
  // THE OWNER'S ASK: "This part of the bridge must overlap units that walk on the
  // bridge as it is 'nearer to the player' perspective. If can, use the transparency
  // rule here too." Both halves are here — it draws over every figure on the board,
  // and every figure it covers is redrawn through it at the same GHOST alpha a house
  // shows a soldier through.
  //
  // NOT A `front` BOX, and it cannot be one, for two separate reasons:
  //
  //   A box sorts by its FOOT, and this rail's foot is at y 634 — off the bottom of a
  //   540px canvas, along with the rest of the bridge. The depth pass has nowhere to
  //   put it. "After everything" is exactly right for this rail and exactly wrong for
  //   the deck it stands at the edge of, which figures walk ON.
  //
  //   And the front sheet is the whole top layer flattened, so a rectangle over the
  //   rail would carry the DECK UNDER IT in the same rectangle. Drawing that over a
  //   figure crossing the bridge is the overdraw the box was withheld to prevent.
  //
  // So the artist drew the rail as `_Layer_3e`, its own file, and split-map lifts that
  // part alone onto a sheet of its own. The rectangle below is the sheet's own ink —
  // where to draw it, and where the ghost is clipped — and not a ground line at all.
  overArt: 'over07',
  over: { x: 695, y: 418, w: 220, h: 216 }
};
