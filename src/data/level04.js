// STAGE 2: the first board that is a game rather than a lesson.
//
// It is the tutorial's country one step out — same fields, same houses, a well
// and a signpost — and the first thing on it that stage 1 does not have is a
// SECOND ROAD. One arm comes down from the north and one in from the west, they
// meet at the junction by the well, and everything walks the same tarmac from
// there to the keep. Two ways in and one way out, which is the whole lesson of
// the board: a tower that covers the west road covers nothing until the join.
//
// THE LADDER OPENS ONE RUNG. Stage 1 stops at tier 2 and this stops at 3, so the
// tower a player has been saving for is still one board away — see `maxTier`
// below and how src/menu.js draws the rungs above it.
//
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Stage_2_Map`,
// and the plots by `node tools/split-map.mjs assets/map/Stage_2_Map`. The map is
// the source of truth for both. Redraw and re-run rather than nudging numbers here.
import { stage2Waves } from './waves.js';

// ROUTE 0 COMES DOWN FROM THE TOP OF THE MAP, which no board had done before this
// one and which the tracer had to be taught to see — it looked for mouths on the
// left and the right only. The first point is off-canvas above the edge, the same
// way every other route starts off-canvas beside it: an enemy walks on rather
// than appearing on the kerb.
const north = [
  { x: 236, y: -39 },
  { x: 233, y: 1 },
  { x: 216, y: 85 },
  { x: 216, y: 127 },
  { x: 222, y: 153 },
  { x: 241, y: 197 },
  { x: 264, y: 233 },
  { x: 319, y: 295 },
  { x: 343, y: 313 },
  { x: 365, y: 319 },
  { x: 575, y: 326 },
  { x: 853, y: 352 },
  { x: 959, y: 355 },
  { x: 999, y: 357 }
];

// And route 1 in from the west, joining it at the junction. The two share every
// pixel of road east of about x 370, which is why a plot beside the junction is
// worth more than two beside the arms.
const west = [
  { x: -39, y: 411 },
  { x: 1, y: 405 },
  { x: 95, y: 406 },
  { x: 197, y: 393 },
  { x: 267, y: 368 },
  { x: 327, y: 328 },
  { x: 355, y: 319 },
  { x: 575, y: 326 },
  { x: 853, y: 352 },
  { x: 959, y: 355 },
  { x: 999, y: 357 }
];

// SEVEN, in road order — the order tools/sim.mjs and every "spread of towers"
// test indexes into. On a forked map "along the road" is not one number: it is
// how far each plot still is from the keep along whichever route passes nearest,
// which is the only ordering that means anything with two roads in play.
//
// THREE OF THEM SIT FURTHER OFF THE TARMAC than any plot on any other board —
// 98, 117 and 101px, where the splitter starts calling them FAR at 95. That is
// the artwork's own spacing and not a mistake to correct here; what it costs is
// a barracks squad walking a little further to its post, which tools/formation.mjs
// measures on every plot of every board.
const plots1 = [
  { x: 104, y: 332 },   //  906 from the keep,  72 off the road
  { x: 234, y: 467 },   //  811 from the keep,  82 off the road
  { x: 368, y: 197 },   //  729 from the keep, 102 off the road
  { x: 375, y: 423 },   //  622 from the keep, 103 off the road
  { x: 517, y: 401 },   //  481 from the keep,  77 off the road
  { x: 845, y: 433 },   //  147 from the keep,  81 off the road
  { x: 862, y: 267 }    //  140 from the keep,  85 off the road — the top right one
];

export const level04 = {
  id: 'm4',
  name: 'Oakland Outskirts',
  // Short enough for the admin panel's map tab, which is a chip in a row that now
  // holds five of them. The full name is what every screen with room shows.
  short: 'Outskirts',
  art: 'map04',
  // Drawn in layers, like stage 1 — the artwork is Stage_2_Map_Layer_1..3.svg and
  // the tools stack it. See readArtwork in tools/svg.mjs.
  src: 'assets/map/Stage_2_Map',
  routes: [north, west],
  plots: plots1,
  waves: stage2Waves,
  // SIX WAVES AT EITHER LENGTH, like the tutorial and for a plainer reason: the
  // owner wrote down six and there is no seventh to run. `oneLength` says so out
  // loud rather than leaving it to be inferred from the tier cap, which is what
  // the checkers used to do — a cap and a fixed length are two different
  // decisions and a board can have either without the other.
  wavesExtended: stage2Waves,
  oneLength: true,
  // TIER 3 IS THE CEILING HERE, at the owner's ask: stage 1 stops at 2, this stops
  // at 3, and tier 4 waits for a board further down the road. The rungs above the
  // cap are drawn and priced as normal and refuse the purchase, which reads as
  // "Maxed" — see `capped` in src/menu.js.
  maxTier: 3,
  // THE HARD PURSE, which is what the owner named. Hard multiplies by 1 so this is
  // literally what a Hard game opens with; Normal gets 10% more, as it does
  // everywhere — see startingGold in data/difficulty.js.
  startGold: 200,
  startLives: 20,

  // WHAT A FIGURE CAN WALK BEHIND.
  //
  // The board is one flat image drawn under everything, so a soldier standing
  // BEHIND a house was drawn on its roof. These are the things in the top layer of
  // the artwork that STAND UP, each with the box it occupies; the renderer draws
  // that box a second time from `Stage_2_Map_front.svg`, sorted into the same depth
  // pass the towers and the soldiers are in, at the FOOT of the box — which is the
  // bottom of the shadow, and the word the owner used.
  //
  // NOTHING IS CUT AND NOTHING IS RE-SORTED. The sheet is the WHOLE top layer in
  // the artist's own order, so a slice of it carries every prop drawn on top of
  // that building — the little man at the tavern door comes with the tavern and
  // stays in front of it. Between two pieces of artwork the second draw changes
  // nothing at all; the only thing it can get in front of is a game figure.
  //
  // Two earlier versions each broke that man. The first redrew the building alone
  // and put its wall back over him. The second lifted the whole layer out of the
  // base and sorted every piece by its own shadow, which put him behind the tavern
  // because his shadow is four pixels further back — true to the rule and not to
  // the drawing. The owner's word: he is supposed to be seen.
  //
  // Written out by `node tools/split-map.mjs assets/map/Stage_2_Map`, which finds them
  // in the top layer by height and refuses if anything is sitting on the line.
  frontArt: 'front04',
  front: [
    { x: 611, y: 175, w: 139, h:  95 },   // stands on y 270
    { x: 174, y: 255, w:  48, h:  65 },   // stands on y 320
    { x: 694, y: 358, w:  77, h:  81 },   // stands on y 439
    { x: 573, y: 401, w:  77, h:  81 }   // stands on y 482
  ],

  // WHAT IS ALREADY STANDING WHEN THE GAME OPENS.
  //
  // The owner's ask: a tier 3 barracks on the top-right plot, there from the first
  // frame. It is an ordinary tower in every other respect — it can be sold, its
  // squad can be rallied, and taking it down refunds what building it would have
  // cost — because a tower the player cannot touch is scenery, and scenery that
  // fights is the kind of thing that makes a board feel broken rather than
  // generous.
  //
  // The plot is named by INDEX into the list above, which is in road order — so a
  // redraw that moves the markers moves this with them, where a pinned coordinate
  // would be left behind. It does mean the INDEX moves too: the top right marker
  // was 5 and is 6 after the road widened, because the plot at (845, 433) came
  // seven pixels closer to the keep and took its place in the order. That is what
  // the "top right plot" check in tools/campaign.mjs is for — it re-measures the
  // artwork rather than trusting the number. See prebuiltOn in src/towers.js.
  prebuilt: [
    { plot: 6, family: 'barracks', tier: 3 }
  ]
};
