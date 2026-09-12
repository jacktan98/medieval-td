// STAGE 3: the road arrives somewhere.
//
// The two Oakland boards are country — fields, a well, a tavern at a crossroads.
// This is the approach to a town, and what makes it one is the ROUNDABOUT: the
// road opens around a paved island with a statue on it and closes again, so the
// board's whole middle is a thing the road goes AROUND rather than through.
//
// IT IS NOT A WIDER ROAD, and this comment used to say it was — "128px at the
// median where the last three were 44 to 48", which was measured off the road
// BLOB'S BOUNDING BOX rather than off the corridor and was never true of a single
// board. `node tools/trace-road.mjs` reports the real number, and it is 44px at
// the median and 126 at its widest: stage 1 is 44 and 100, stage 2 is 48 and 141.
// This road is the NARROWEST of the three at its widest point. A wrong number in
// a comment is worse than no number, because the next decision gets made against
// it — the balance note that followed from this one, that towers here cover
// proportionally less road, was false for the same reason.
//
// WHAT IT ADDS TO THE LADDER: the Crossbow Sentry, and only that. See `maxTier`
// and `allow` below.
//
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Stage_3_Map`,
// and the plots by `node tools/split-map.mjs assets/map/Stage_3_Map`. The map is
// the source of truth for both. Redraw and re-run rather than nudging numbers here.
import { stage3Waves } from './waves.js';

// THE ROAD GOES AROUND THE ISLAND, and that took a fix in the tool rather than in
// this file. Stage 3's road is one 1068x384 blob with a grass roundabout painted
// ON TOP of it — the island with the statue and the braziers — which is the
// natural way to draw it and was read as 1068x384 of walkable tarmac. The first
// trace ran straight over the statue.
//
// tools/svg.mjs asks per point now, in painter's order: whichever of the road and
// the ground was painted last at that spot is what is there. See roadPolys.
//
// TWO ROUTES ROUND ONE ISLAND, which is what a roundabout is. The board has ONE
// mouth on the left (y 300-374) and ONE on the right (y 328-402) — so the tracer,
// which walks the path between a pair of mouths, found a single route and took the
// southern arm. The northern arm was tarmac nobody walked, and it showed: the four
// plots the artist rang the island with covered 8% and 4% of the road, where
// tools/siege.mjs refuses anything under 10%.
//
// The arms are not a fork like stage 2's — they leave and rejoin the same road, so
// they SHARE their first three points and their last three, and differ only in
// which side of the island they pass. Exactly half the wave comes each way — see
// `entryMix` below — so every plot on the ring has something to shoot at.
const south = [
  { x: -37, y: 327 },
  { x: 1, y: 339 },
  { x: 131, y: 339 },
  { x: 155, y: 351 },
  { x: 213, y: 403 },
  { x: 257, y: 427 },
  { x: 309, y: 440 },
  { x: 409, y: 445 },
  { x: 595, y: 443 },
  { x: 663, y: 438 },
  { x: 735, y: 417 },
  { x: 821, y: 363 },
  { x: 959, y: 365 },
  { x: 998, y: 355 }
];

// The northern arm, hugging the same island from the other side. Traced the same
// way the southern one was — the centre of the road's span in each column, checked
// with `onRoad` at every point of all three lanes so the OUTER lanes stay on the
// tarmac too and not just the middle of the column.
const north = [
  { x: -37, y: 327 },
  { x: 1, y: 339 },
  { x: 131, y: 339 },
  { x: 162, y: 302 },
  { x: 203, y: 255 },
  { x: 245, y: 212 },
  { x: 292, y: 178 },
  { x: 344, y: 154 },
  { x: 400, y: 137 },
  { x: 452, y: 134 },
  { x: 502, y: 138 },
  { x: 552, y: 148 },
  { x: 602, y: 163 },
  { x: 652, y: 188 },
  { x: 702, y: 222 },
  { x: 742, y: 264 },
  { x: 782, y: 310 },
  { x: 821, y: 363 },
  { x: 959, y: 365 },
  { x: 998, y: 355 }
];

// EIGHT, in road order — how far each still is from the keep along whichever of
// the two arms passes nearest, which is the only ordering that means anything on
// a board with more than one route. Seven are buildable and the eighth opens with
// a Crossbow Sentry on it; see `prebuilt` below.
//
// THE RING READS DIFFERENTLY NOW THAT BOTH ARMS ARE WALKED. With the southern arm
// alone, the two plots north of the island sat 211px and 201px off the tarmac —
// past the 95 where the splitter starts calling a plot FAR, and covering 8% and 4%
// of the road where tools/siege.mjs wants 10%. They are 78 and 86 off it now, in
// line with every other plot on the board, because the road they are drawn beside
// is road somebody walks.
//
// The top right is the odd one at 131, and it is the one that opens with a tower
// already on it — a Crossbow Sentry, which out-ranges the gap.
const plots1 = [
  { x:  72, y: 253 },   //  977 from the keep,  86 off the road
  { x:  72, y: 424 },   //  977 from the keep,  85 off the road
  { x: 283, y: 336 },   //  783 from the keep,  92 off the road
  { x: 363, y: 231 },   //  758 from the keep,  78 off the road — beside the north arm
  { x: 565, y: 242 },   //  492 from the keep,  86 off the road — beside the north arm
  { x: 677, y: 342 },   //  315 from the keep,  88 off the road
  { x: 886, y: 231 },   //  244 from the keep, 131 off the road — the top right one
  { x: 880, y: 449 }    //  118 from the keep,  85 off the road
];

export const level05 = {
  id: 'm5',
  name: 'Winchester Entrance',
  // The admin panel's map tab is a chip about nine characters wide — see MAP_W in
  // src/admin.js. Every screen with room shows the full name.
  short: 'Winchester',
  art: 'map05',
  src: 'assets/map/Stage_3_Map',
  routes: [south, north],
  plots: plots1,
  waves: stage3Waves,
  wavesExtended: stage3Waves,
  oneLength: true,

  // HALF THE WAVE ROUND EACH SIDE OF THE ISLAND, dealt rather than rolled.
  //
  // The owner asked to "assign 50% to left road for stage 2 and 3 too", and on this
  // board that needs saying carefully, because THIS BOARD HAS ONLY ONE ROAD IN. Both
  // routes start at the same mouth on the left — they are the two arms of the
  // roundabout, not two entries — so 100% of the wave already comes in from the left
  // and there is no second mouth to take a share from.
  //
  // What the ask means here is the other half of what it meant on stage 4: an even,
  // GUARANTEED split rather than an even average. Half the wave goes round the south
  // of the island and half round the north, dealt from a shuffled bag of two, so the
  // four plots ringing the north arm always have something to shoot at. Rolled, a run
  // of six round the south was ordinary and those four plots watched it go past.
  //
  // See nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  entryMix: [1, 1],

  // TIER 3, PLUS ONE NAMED RUNG ABOVE IT.
  //
  // The owner's ask: "towers that can be built is only restricted to tier 3 and
  // crossbow sentry. For archery tier 3, just show 1 option which is crossbow
  // sentry in the radial menu."
  //
  // So the cap is 3 and `allow` names the one exception. Archery forks at tier 3
  // into a Crossbow Sentry and a Musketeer Post; on this board the fork stops
  // being a fork, and a Crossbow Tower offers exactly one button — which the
  // radial menu draws due east rather than on the two-button arc, because that is
  // what it does with a single choice everywhere else. Nothing about the menu had
  // to learn this board: it asks how many buttons there are.
  //
  // Every other ladder still stops dead at tier 3 and reads "Maxed".
  maxTier: 3,
  allow: ['Crossbow Sentry'],

  startGold: 220,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND. The whole top layer of the artwork, listed one
  // entry per thing that STANDS UP, sorted into the same depth pass the towers and
  // the soldiers are in — see the note in level04.js and drawFigures in
  // src/render.js. Written out by `node tools/split-map.mjs assets/map/Stage_3_Map`.
  frontArt: 'front05',
  front: [
    { x: 745, y: 142, w:  95, h:  80, g: 187 },   // stands on y 187
    { x: 785, y: 234, w:  60, h:  52, g: 283 },   // stands on y 283
    { x: 847, y: 258, w:  99, h:  56, g: 297 },   // stands on y 297
    { x: 347, y: 206, w: 211, h: 144, g: 309 },   // stands on y 309 — the plaza
    { x: 663, y: 432, w:  77, h:  81, g: 497 },   // stands on y 497
    { x: 145, y: 442, w:  80, h:  81, g: 507 },   // stands on y 507
    { x: 788, y: 455, w:  80, h:  81, g: 520 }   // stands on y 520
  ],

  // WHAT IS ALREADY STANDING WHEN THE GAME OPENS.
  //
  // A Crossbow Sentry on the top-right plot, and the one thing that makes it
  // different from stage 2's barracks is that it is a TIER 4 tower, so it has
  // abilities to buy. It opens with NONE of them — the owner's word — which is
  // what an ordinary tower does anyway: `abilities` starts empty in makeTower and
  // the radial menu offers them for the gold like any other tier 4.
  //
  // NAMED rather than numbered, because archery has two tier 4s and a number
  // cannot say which. prebuiltOn refuses a bare tier on a forked ladder rather
  // than taking the first one it finds.
  // The plot is named by INDEX into the list above, which is in road order — so it
  // moves when the order does, and it has: the top-right marker was index 7 while
  // the board had one route round the south, and is index 6 now that the northern
  // arm is walked and two plots on the ring come later than it. The "top right
  // plot" check in tools/campaign.mjs re-measures the artwork rather than trusting
  // the number, which is what caught the move.
  prebuilt: [
    { plot: 6, family: 'archery', name: 'Crossbow Sentry' }
  ]
};
