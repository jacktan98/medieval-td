// STAGE 10: Ironforge Town, and the first board in this game with THREE doors.
//
// TWO WAYS IN AND THREE OUT, which is a shape no board has had. Stage 4 is three in
// and one out, stage 6 one in and two, stage 9 three in and two — every one of them
// a funnel or a fork or a funnel with a fork at the end. This one FORKS ONE OF ITS
// TWO ROADS: the road in at the top left runs the length of the board to the bottom
// left and never meets anything, and the road in at the top right splits at about
// (685, 179), one branch going out at the bottom right and the other running east to
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
// IT MOVED DOWN THE BOARD AND KEPT ITS HEIGHT. The owner adjusted it for the
// composition, which was not the change that would clear the band; a target drawn
// 5px TALLER is. So the flag stays and so does this note.
//
// SHIPPED THAT WAY BECAUSE IT COSTS ALMOST NOTHING, measured rather than assumed.
// No road passes behind it: the nearest point of any road ON THE CANVAS is 91px
// away, and the only route samples inside its 27px of x are the west road's lead-in
// above y 0, which is off the top of the board and drawn nowhere. No plot stands
// behind it either. The ONE case left is a rally flag — plot 0 is 110px off and a
// barracks ring reaches 210 — so a player who sells the free Musketeer Post, builds a
// barracks there and posts a squad on that exact spot gets a soldier whose ankles
// draw over the target's base. He is 105px tall and the target is 29.5, so what is
// not hidden is his shins.
import { stage10Waves } from './waves.js';

// THE WEST ROAD, in over the top at x 166 and out at the bottom at x 368. 708px, the
// shortest of the three and the only one that touches neither of the others at any
// point. It carries the largest share of the wave — see `routeMix`.
const west = [
  { x: 139, y: -28 },
  { x: 167, y: 1 },
  { x: 191, y: 47 },
  { x: 217, y: 79 },
  { x: 301, y: 138 },
  { x: 330, y: 163 },
  { x: 350, y: 191 },
  { x: 368, y: 229 },
  { x: 381, y: 271 },
  { x: 385, y: 303 },
  { x: 378, y: 359 },
  { x: 355, y: 449 },
  { x: 357, y: 497 },
  { x: 369, y: 539 },
  { x: 367, y: 579 }
];

// THE EAST ROAD'S SOUTHERN BRANCH, in over the top at x 458 and out at the bottom at
// x 710. 769px, the longest road on the board.
const south = [
  { x: 425, y: -21 },
  { x: 459, y: 1 },
  { x: 472, y: 6 },
  { x: 525, y: 51 },
  { x: 627, y: 109 },
  { x: 663, y: 143 },
  { x: 685, y: 179 },
  { x: 721, y: 273 },
  { x: 736, y: 335 },
  { x: 731, y: 359 },
  { x: 685, y: 433 },
  { x: 673, y: 463 },
  { x: 682, y: 503 },
  { x: 698, y: 530 },
  { x: 711, y: 539 },
  { x: 729, y: 575 }
];

// AND ITS EASTERN BRANCH, in at the same mouth and out at the right edge at y 408.
// 767px — two pixels shorter than the branch it forks from, which is as near to the
// same length as two different roads get.
//
// PASTED AS TRACED rather than snapped onto a shared head, which is the same call
// stage 9 made for its two western roads and for the same reason. These two are one
// piece of tarmac from the mouth to the fork and the simplifier describes it twice,
// never more than 7px apart across that stretch. Nudging them together by hand would
// buy nothing and would break the rule that matters more: re-run the tracer after a
// redraw and paste what it says, rather than keeping numbers alive that nothing
// regenerates.
const east = [
  { x: 425, y: -21 },
  { x: 459, y: 1 },
  { x: 472, y: 6 },
  { x: 529, y: 54 },
  { x: 619, y: 103 },
  { x: 658, y: 137 },
  { x: 685, y: 179 },
  { x: 733, y: 311 },
  { x: 755, y: 343 },
  { x: 777, y: 355 },
  { x: 889, y: 393 },
  { x: 959, y: 409 },
  { x: 997, y: 421 }
];

// NINE, in road order, and how far each is from the door it is nearest along
// whichever road passes closest. Written out by
// `node tools/split-map.mjs assets/map/Stage_10_Map --accept`.
//
// TWO OF THEM MOVED DOWN in the owner's second upload of layer 1 — the pair in the
// middle of the board went from (486, 187) and (568, 240) to (508, 391) and
// (605, 327). That fixed a real thing as well as a compositional one: the middle
// house cluster moved UP the board in the same pass, and where the old marker at
// (486, 187) stood inside the cluster's new box, both now clear it. The splitter said
// so by name on the run in between — "whatever is built there is drawn BEHIND it" —
// and says nothing now.
//
// SEVEN OF THE NINE READ "FAR" at the splitter's 95px, against all nine on Sandshroud
// and five on the two Dawnford boards. The two that do not are the pair beside the
// eastern fork, at 93 and 94px, and they are the two plots on this board that matter
// most — a tower there covers two roads instead of one.
//
// THE SPREAD IS WIDE: 93px at the closest and 147 at the furthest, which is the
// widest range any board has shipped. The cause is the drawing — three roads across
// a board this size leaves large pockets of grass between them, and four of the
// markers sit in the middle of one. The shortest reach in the game is the Wayside
// Shrine's 160px, which is still 13px more than the furthest any plot here sits from
// a road, so nothing on this board is out of range of anything. But a Watchtower at
// 200px on plot 7 covers a good deal less road than the same tower on plot 4, and
// that difference is the board's own shape rather than a mistake.
const plots1 = [
  { x: 228, y: 226 },   //  481 from its door, 114 off the road — the top left
  { x: 831, y: 217 },   //  349 from its door, 123 off the road
  { x: 258, y: 305 },   //  263 from its door, 126 off the road
  { x: 508, y: 391 },   //  225 from its door, 134 off the road
  { x: 605, y: 327 },   //  209 from its door, 124 off the road
  { x: 810, y: 464 },   //  164 from its door,  93 off the road
  { x: 894, y: 295 },   //  138 from its door,  94 off the road
  { x: 528, y: 488 },   //  128 from its door, 147 off the road
  { x: 220, y: 485 }    //  101 from its door, 136 off the road
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
  // it that is on the canvas, 630 of 630 — and 52% of each branch.
  //
  // SO THE BOARD OPENS WITH ITS BIGGEST SHARE ALREADY ANSWERED. The west road carries
  // 40% of every wave and the Post covers the whole of it, which is the largest thing
  // a prebuilt has ever been given. What it half-covers is the other 60%: each branch
  // is watched for its last 360px and walks the first 330 with nothing on it, so the
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
  // NOT ONE OF THEM EVER OCCLUDES AN ENEMY, which is worth writing down rather than
  // discovering twice. Sampled every 2px along all three roads, no road passes
  // through any of these boxes at all. The middle houses come CLOSE — the southern
  // branch passes 9px from the box's right edge, near enough that a redraw either way
  // would put men behind it — but nothing walks through it today. So the boxes are
  // correct and idle: they are here because the things stand up and the rule is the
  // rule, not because anything on this board is currently hidden by them.
  //
  // AND NO PLOT STANDS INSIDE ONE, which took the owner's second upload. The middle
  // house cluster moved up the board to y 92..227 and the marker that used to sit at
  // (486, 187) would have been inside it — the splitter said so by name — and the
  // same pass moved that marker down to (508, 391). Nothing is hidden and nothing
  // pokes through.
  frontArt: 'front12',
  front: [
    { x: 717, y:  56, w:  35, h:  44, g:  98 },   // stands on y 98 — the signpost
    { x: 459, y:  92, w: 119, h: 152, g: 227 },   // stands on y 227
    { x: 116, y: 291, w: 131, h: 135, g: 409 }    // stands on y 409
  ]
};
