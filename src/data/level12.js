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
// rally flag: plot 0 is 110px off and a barracks ring reaches 210, so a player who
// sells the free Musketeer Post, builds a barracks there and posts a squad on that
// exact spot gets a soldier whose ankles draw over the target's base. He is 105px
// tall and the target is 29.5, so what is not hidden is his shins.
import { stage10Waves } from './waves.js';

// THE WEST ROAD, in over the top at x 154 and out at the bottom at x 358. 710px, the
// shortest of the three and the only one that touches neither of the others at any
// point — its closest approach to either eastern branch is 220px. It carries the
// largest share of the wave — see `routeMix`.
const west = [
  { x: 131, y: -31 },
  { x: 155, y: 1 },
  { x: 181, y: 51 },
  { x: 202, y: 79 },
  { x: 235, y: 109 },
  { x: 317, y: 163 },
  { x: 340, y: 191 },
  { x: 356, y: 225 },
  { x: 369, y: 265 },
  { x: 373, y: 303 },
  { x: 367, y: 359 },
  { x: 343, y: 449 },
  { x: 346, y: 491 },
  { x: 359, y: 539 },
  { x: 357, y: 579 }
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
// THE OWNER HAS BROUGHT THEM IN, twice. The first pass moved the two middle markers
// down; this one narrowed the roads and walked most of the markers closer to them —
// "Made the road path narrower and moved the plot markers nearer to the road."
//
// WHAT THAT DID TO THE SPREAD is the number worth keeping. They ran 76 to 147px off
// the road, which was the widest range any board had shipped; they now run 76 to 133.
// Seven of the nine still read "FAR" at the splitter's 95px, which sounds like
// nothing changed and is not what the board plays like — the ROADS moved too. Median
// road width went from 68px to 56, so a narrower ribbon further from a marker is
// still less road inside a ring than it was.
//
// SO IT IS MEASURED AS ROAD COVERED rather than as distance. A 200px Watchtower,
// sampled every 2px along every road on the canvas:
//
//   plot 0  422px     plot 3  382px     plot 6  482px
//   plot 1  702px     plot 4  716px     plot 7  412px
//   plot 2  440px     plot 5  652px     plot 8  200px
//
// Three good plots, four ordinary ones and plot 8 in a corner of its own — it sits
// 117px off the bottom of the western road with nothing else in reach, and covers a
// third of what plot 4 does. It is the plot a player should be last to build on.
//
// AND IT IS NOW UNDER THE SIEGE FLOOR, which is a live failure rather than a note.
// tools/siege.mjs asks whether a CATAPULT on each plot still keeps a tenth of the
// board's road — "does any plot lose so much road that building a catapult there is a
// mistake the game never warns you about" — and plot 8 answers 9.2%, the worst figure
// in the game. The next worst anywhere is 13%.
//
// IT WAS ALREADY THE WORST AND ALREADY MARGINAL, at 10.55%, so this redraw did not
// create the problem; it pushed a plot that was a hair over the line a hair under it.
// The marker itself barely moved (220,485 -> 228,487) and is actually 19px CLOSER to
// the road than it was — what moved is the road, which now bends away from it further
// up, so less of it lands inside a 300px ring.
//
// THE FIX IS ON THE ARTBOARD and it is small: the marker 20px UP reads 10.2%, and
// 20px LEFT reads 10.6%. Moving it right or down makes it worse. Left for the owner
// rather than fudged here, because these nine numbers are read off the artwork by
// tools/split-map.mjs and a plot typed to a different place than the marker it is
// drawn on is a lie this file cannot contain.
//
// The shortest reach in the game is the Wayside Shrine's 160px, which is still 27px
// more than the furthest any plot here sits from a road, so nothing on this board is
// out of range of anything.
const plots1 = [
  { x: 228, y: 226 },   //  481 from its door, 114 off the road — the top left
  { x: 804, y: 211 },   //  364 from its door, 100 off the road
  { x: 258, y: 305 },   //  263 from its door, 126 off the road
  { x: 481, y: 375 },   //  225 from its door, 104 off the road
  { x: 605, y: 327 },   //  209 from its door, 124 off the road
  { x: 775, y: 442 },   //  201 from its door,  81 off the road
  { x: 888, y: 312 },   //  139 from its door,  76 off the road
  { x: 540, y: 457 },   //  128 from its door, 133 off the road
  { x: 228, y: 487 }    //   99 from its door, 128 off the road
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
  // it that is on the canvas, 632 of 632 — and 53% of each branch.
  //
  // THE REDRAW DID NOT MOVE IT. The roads narrowed and shifted and the markers came
  // in, and this plot's answer went from 100 / 52 / 52 to 100 / 53 / 54 — which is
  // worth recording precisely because it is a non-event: it says the shape of the
  // board survived the pass rather than having to be re-argued.
  //
  // SO THE BOARD OPENS WITH ITS BIGGEST SHARE ALREADY ANSWERED. The west road carries
  // 40% of every wave and the Post covers the whole of it, which is the largest thing
  // a prebuilt has ever been given. What it half-covers is the other 60%: each branch
  // is watched for its last 365px and walks the first 320 with nothing on it, so the
  // part a player has to build for is the TOP RIGHT, where the road comes in and
  // forks. The old corner placement was the mirror of that — two roads well held and
  // the biggest one barely — and this one is the stronger opening of the two, because
  // a road held whole leaks nothing at all.
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
  // FOUR OF THEM NOW, where there were three: the redraw added something standing at
  // (752, 25), up beside the signpost.
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
  // the splitter said so by name. It has stayed right through this one — the markers
  // moved again and all four boxes are still clear of all nine.
  frontArt: 'front12',
  front: [
    { x: 752, y:  25, w:  77, h:  89, g:  89 },   // stands on y 89
    { x: 693, y:  63, w:  35, h:  44, g: 105 },   // stands on y 105 — the signpost
    { x: 447, y:  94, w: 132, h: 139, g: 216 },   // stands on y 216
    { x: 116, y: 291, w: 131, h: 135, g: 409 }    // stands on y 409
  ]
};
