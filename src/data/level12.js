// STAGE 10: Ironforge Town, and the first board in this game with THREE doors.
//
// TWO WAYS IN AND THREE OUT, which is a shape no board has had. Stage 4 is three in
// and one out, stage 6 one in and two, stage 9 three in and two — every one of them
// a funnel or a fork or a funnel with a fork at the end. This one FORKS ONE OF ITS
// TWO ROADS: the road in at the top left runs the length of the board to the bottom
// left and never meets anything, and the road in at the top right splits at about
// (724, 332), one branch going out at the bottom right and the other running east to
// the right edge. So there are three routes over two entries, and that is the thing
// this board taught the tools.
//
// TRACED FROM THE ARTWORK:
//
//   node tools/trace-road.mjs assets/map/Stage_10_Map --exit bottom,right --pair 0:1,1:2,1:0
//   node tools/split-map.mjs assets/map/Stage_10_Map
//
// `--pair 0:1,1:2,1:0` IS A NEW FORM and this board is why. The short form is one
// exit index per ENTRY, which can never name more routes than there are entries —
// and here entry 1 needs two. The long form names each route as `entry:exit`. See
// PAIRING in tools/trace-road.mjs.
//
// No `palette` on this one: Ironforge is grass, and its road, ground and shadow are
// the three colours every board but Sandshroud uses. The tracer prints the pair it
// looked for on every run, so a board that quietly wore a different green would say
// so rather than finding four cart wheels and calling them roads.
//
// `--accept` IS ON THIS ONE, and it is the first board to need it, so here is the
// shape that is being accepted rather than just the flag.
//
// The splitter tells a standing thing from a flat one by height, at 30px, and it
// refuses when anything sits in the 26–35 band because there height cannot tell them
// apart. Ironforge has one: THE ARCHERY TARGET on the grass at (121, 138), 27 wide
// and 29.5 tall. It is a butt on a tripod with its own shadow — a standing thing, by
// half a pixel classified as flat — so it gets no box and a figure at its foot would
// be drawn over it rather than behind it.
//
// IT HAS KEPT ITS HEIGHT THROUGH TWO REDRAWS. The owner has moved it and reworked
// the art around it; neither was the change that clears the band, which is a target
// drawn 5px TALLER. So the flag stays and so does this note.
//
// SHIPPED THAT WAY BECAUSE IT COSTS ALMOST NOTHING, measured rather than assumed,
// and re-measured after the roads narrowed. No road passes through it at all: the
// nearest point of any road ON THE CANVAS is 80px away — it was 91 before the redraw
// brought the western road in — and no plot stands behind it. The ONE case left is a
// rally flag: plot 0 is 117px off and a barracks ring reaches 210, so a player who
// sells the free Musketeer Post, builds a barracks there and posts a squad on that
// exact spot gets a soldier whose ankles draw over the target's base. He is 105px
// tall and the target is 29.5, so what is not hidden is his shins.
import { stage10Waves } from './waves.js';

// THE WEST ROAD, in over the top at x 154 and out at the bottom at x 358. 715px, the
// shortest of the three and the only one that touches neither of the others at any
// point — its closest approach to either eastern branch is 214px. It carries the
// largest share of the wave — see `routeMix`.
const west = [
  { x: 131, y: -31 },
  { x: 155, y: 1 },
  { x: 181, y: 51 },
  { x: 206, y: 83 },
  { x: 241, y: 112 },
  { x: 323, y: 161 },
  { x: 343, y: 183 },
  { x: 359, y: 215 },
  { x: 371, y: 259 },
  { x: 374, y: 305 },
  { x: 368, y: 353 },
  { x: 347, y: 425 },
  { x: 343, y: 457 },
  { x: 346, y: 491 },
  { x: 359, y: 539 },
  { x: 363, y: 579 }
];

// THE EAST ROAD'S SOUTHERN BRANCH, in over the top at x 466 and out at the bottom at
// x 708. 769px, the longest road on the board.
const south = [
  { x: 435, y: -23 },
  { x: 467, y: 1 },
  { x: 523, y: 48 },
  { x: 629, y: 115 },
  { x: 659, y: 147 },
  { x: 683, y: 189 },
  { x: 717, y: 287 },
  { x: 724, y: 331 },
  { x: 715, y: 357 },
  { x: 664, y: 435 },
  { x: 655, y: 469 },
  { x: 663, y: 495 },
  { x: 676, y: 517 },
  { x: 695, y: 536 },
  { x: 709, y: 539 },
  { x: 738, y: 567 }
];

// AND ITS EASTERN BRANCH, in at the same mouth and out at the right edge at y 410.
// 759px — ten pixels shorter than the branch it forks from, which is as near to the
// same length as two different roads get. They part at (724, 332), 480px in, and
// their doors end 296px apart.
//
// PASTED AS TRACED rather than snapped onto a shared head, which is the same call
// stage 9 made for its two western roads and for the same reason. These two are one
// piece of tarmac from the mouth to the fork and the simplifier describes it twice,
// never more than 15px apart across that stretch. Nudging them together by hand would
// buy nothing and would break the rule that matters more: re-run the tracer after a
// redraw and paste what it says, rather than keeping numbers alive that nothing
// regenerates.
const east = [
  { x: 435, y: -23 },
  { x: 467, y: 1 },
  { x: 523, y: 48 },
  { x: 615, y: 104 },
  { x: 651, y: 137 },
  { x: 681, y: 185 },
  { x: 723, y: 305 },
  { x: 744, y: 334 },
  { x: 769, y: 349 },
  { x: 879, y: 391 },
  { x: 959, y: 411 },
  { x: 997, y: 424 }
];

// NINE, in road order, and how far each is from the door it is nearest along
// whichever road passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_10_Map --accept`.
//
// THE OWNER HAS BROUGHT THEM IN OVER THREE PASSES. The first moved the two middle
// markers down; the second narrowed the roads and walked most of the markers closer
// to them; the third nudged the road again and moved ONE marker — plot 0, from
// (228, 226) to (239, 219), which took it from 114px off the road to 90.
//
// THEY RAN 76 TO 147px OFF THE ROAD when this board shipped, which was the widest
// range any board had. They now run 77 to 117, and the tightest of them is no longer
// a plot that reads "FAR" at all.
//
// DISTANCE IS THE WRONG MEASURE HERE, though, and it always was: the roads moved as
// well as the markers, and median road width came down from 68px to 56. A marker the
// same distance from a narrower ribbon that bends differently is not the same plot.
// So it is measured as ROAD COVERED. A 200px Watchtower, sampled every 2px along
// every road on the canvas:
//
//   plot 0  436px     plot 3  716px     plot 6  482px
//   plot 1  702px     plot 4  384px     plot 7  410px
//   plot 2  446px     plot 5  652px     plot 8  200px
//
// Three good plots, five ordinary ones, and plot 8 in a corner of its own — it sits
// 117px off the bottom of the western road with nothing else in reach, and covers a
// third of what plot 3 does. It is the plot a player should be last to build on.
//
// AND IT IS UNDER THE SIEGE FLOOR, which is a live failure rather than a note.
// tools/siege.mjs asks whether a CATAPULT on each plot still keeps a tenth of the
// board's road — "does any plot lose so much road that building a catapult there is a
// mistake the game never warns you about" — and plot 8 answers 9.3%, the worst figure
// in the game. The next worst anywhere is 13%.
//
// IT WAS ALREADY THE WORST AND ALREADY MARGINAL, at 10.55% two redraws ago, so none
// of this created the problem; a plot that sat a hair over the line went a hair under
// it when the road moved. The marker has not been touched in either pass since — it
// is still where it was — and it is the road bending away from it further up that
// costs it, not the marker.
//
// THE FIX IS ON THE ARTBOARD and it is small: 20px UP reads 10.0%, 20px LEFT reads
// 10.5%, and 20px up AND left reads 11.3%. Right or down makes it worse. Left for the
// owner rather than fudged here, because these nine numbers are read off the artwork
// by tools/split-map.mjs and a plot typed to a different place than the marker it is
// drawn on is a lie this file cannot contain. The floor is not lowered either: the
// check is doing exactly what it exists to do.
//
// The shortest reach in the game is the Wayside Shrine's 160px, which is still 43px
// more than the furthest any plot here sits from a road, so nothing on this board is
// out of range of anything.
const plots1 = [
  { x: 239, y: 219 },   //  470 from its door,  90 off the road — the top left
  { x: 804, y: 211 },   //  378 from its door, 107 off the road
  { x: 258, y: 305 },   //  267 from its door, 114 off the road
  { x: 605, y: 327 },   //  228 from its door, 108 off the road
  { x: 481, y: 375 },   //  225 from its door, 115 off the road
  { x: 775, y: 442 },   //  202 from its door,  85 off the road
  { x: 888, y: 312 },   //  142 from its door,  77 off the road
  { x: 540, y: 457 },   //  134 from its door, 116 off the road
  { x: 228, y: 487 }    //  102 from its door, 117 off the road
];

export const level12 = {
  id: 'm12',
  name: 'Ironforge Town',
  short: 'Ironforge',
  art: 'map12',
  // THREE FILES. Layer 1 is the grass, the roads and the nine markers; layer 2 is
  // the trees and the scatter; layer 3 is the town.
  src: 'assets/map/Stage_10_Map',

  routes: [west, south, east],
  plots: plots1,
  waves: stage10Waves,
  wavesExtended: stage10Waves,
  oneLength: true,

  // 40 / 30 / 30, at the owner's ask: "Assign 40% of enemies to exit bottom left road
  // and another 30% each for bottom right and right road."
  //
  // AND HERE THE SHARES ARE THE ANSWER DIRECTLY, which stage 9's were not. There the
  // two doors were fed by three roads, so the shares had to be worked back from the
  // doors to the roads; here each route ends at a door of its own, so a share of the
  // wave and a share of a door are the same number. 4, 3, 3 of ten.
  //
  // WHAT IT MEANS FOR THE ENTRIES is worth naming, because the owner named exits and
  // the entries follow: 40% of every wave comes in at the top left and 60% at the top
  // right, and that 60% splits evenly at the fork. The top-right mouth is therefore
  // the busy one, and it is also the one the prebuilt tower cannot see.
  //
  // See nextRoute in src/enemies.js. Shares, in the same order as `routes`.
  routeMix: [4, 3, 3],

  // TIER 3, PLUS SIX NAMED RUNGS — one more than any board before it, and the first
  // to open three of the four families' tops at once. Sandshroud opened both barracks
  // rungs; this opens both of those AND the archery top, which is the tower it hands
  // the player for free.
  maxTier: 3,
  allow: ['Crossbow Sentry', 'Ballista Turret', 'Paladin Keep', 'High Altar',
          'Assassin Guild', 'Musketeer Post'],

  startGold: 240,
  startLives: 20,

  // A MUSKETEER POST ALREADY STANDING, at the owner's ask — first at the bottom
  // right, then "Move the prebuilt tower, musketeer post to the top left plot
  // marker". Players can sell it or buy abilities for it, as on every prebuilt.
  //
  // (228, 226) IS THE TOP LEFT MARKER, and it is the nearest of the nine to the
  // board's top-left corner by 78px — see the check in tools/campaign.mjs, which asks
  // the geometry rather than trusting this index, because a redraw renumbers the list
  // and stage 6 has already shipped a prebuilt pinned to an index the artwork moved.
  //
  // AND THE MOVE CHANGED WHAT THE FREE TOWER IS FOR. Sampled every 2px along each
  // road, from the bottom-right corner it held 84% of each eastern branch and the
  // last 46% of the western; from here it holds ALL of the western — every pixel of
  // it that is on the canvas, 636 of 636 — and 62% of the southern branch and 57% of
  // the eastern.
  //
  // THE MARKER MOVED AND MADE IT BETTER. Plot 0 went from (228, 226) to (239, 219) in
  // the owner's third pass, 24px closer to the road, and this plot's answer went from
  // 100 / 53 / 54 to 100 / 62 / 57 — nine points more of the busiest branch, for a
  // nudge. The two passes before it moved the roads and left the answer alone at
  // 100 / 52 / 52, which is the other thing worth knowing: the shape of this board is
  // robust to the roads and sensitive to THIS marker.
  //
  // SO THE BOARD OPENS WITH ITS BIGGEST SHARE ALREADY ANSWERED. The west road carries
  // 40% of every wave and the Post covers the whole of it, which is the largest thing
  // a prebuilt has ever been given. What it part-covers is the other 60%: the southern
  // branch is watched for its last 430px and the eastern for its last 390, so the part
  // a player has to build for is the TOP RIGHT, where the road comes in and forks. The
  // old corner placement was the mirror of that — two roads well held and the biggest
  // one barely — and this one is the stronger opening of the two, because a road held
  // whole leaks nothing at all.
  //
  // A MUSKETEER POST IS A TIER 4, which makes this the largest gift any board has
  // made — Sandshroud's Assassin Guild is the only other tier 4 handed over, and this
  // one shoots. It is also the tower whose two abilities are the most expensive
  // decision in the game, and the board opens its own rung in `allow` so a player who
  // sells it can build another.
  prebuilt: [
    { plot: 0, family: 'archery', name: 'Musketeer Post' }
  ],

  // WHAT A FIGURE CAN WALK BEHIND: the Ironforge signpost and the two clusters of
  // stone houses, each of which the artist drew as ONE group of two buildings and so
  // gets one box with one ground line.
  //
  // FOUR OF THEM, since the redraw that added something standing at (752, 25), up
  // beside the signpost. The pass after it left all four exactly where they were.
  //
  // NOT ONE OF THEM EVER OCCLUDES AN ENEMY, which is worth writing down rather than
  // discovering twice. Sampled every 2px along all three roads, no road passes
  // through any of these boxes at all. The middle houses come CLOSE — the southern
  // branch passes 9px from the box, near enough that a redraw either way would put
  // men behind it, and it has now survived one — but nothing walks through it today.
  // So the boxes are correct and idle: they are here because the things stand up and
  // the rule is the rule, not because anything on this board is currently hidden by
  // them.
  //
  // AND NO PLOT STANDS INSIDE ONE, which took the owner's second upload to get right:
  // the marker that used to sit at (486, 187) was inside the middle cluster's box and
  // the splitter said so by name. It has stayed right through two passes since — the
  // markers have moved twice more and all four boxes are still clear of all nine.
  frontArt: 'front12',
  front: [
    { x: 752, y:  25, w:  77, h:  89, g:  89 },   // stands on y 89
    { x: 693, y:  63, w:  35, h:  44, g: 105 },   // stands on y 105 — the signpost
    { x: 447, y:  94, w: 132, h: 139, g: 216 },   // stands on y 216
    { x: 116, y: 291, w: 131, h: 135, g: 409 }    // stands on y 409
  ]
};
