// THE CLOTH ON THE TOWERS THAT MOVES IN THE WIND, keyed by the drawing it is in
// (the asset keys in src/assets.js). See swayBanner in src/render.js for how.
//
// Every drawing is the 1024 x 1024 export, and every number is a source pixel in it.
// Tier 4's were measured again after the owner's redraw of the walls behind them.
// The cloth is found by its `colour` inside `box` — the box keeps out the same colour
// elsewhere on the tower (a book, a spire) — together with its black edge and
// whatever is painted on it.
//
// `bottom` IS THE LOWEST PIXEL OF THE CLOTH'S COLOUR, measured, and THE BOX REACHES
// 22px PAST IT: at each point the black edge runs on 8 to 10px below the colour, and
// whatever of it fell outside the box was left on the wall as a speck when the tail
// swung — the High Altar's box once stopped 4px short of its tip.
//
// A BANNER hangs from the battlements: draped over them above `top`, where it stays
// put, and hanging free from there to its tails at `bottom`, where it swings most.
// A FLAG flies from a pole at `pole` to its tip at `tip`, and ripples up and down,
// most at the tip. Tier 4's banners and tiers 1 to 3's flags, at the owner's word.
const BLUE = [5, 93, 171], PURPLE = [98, 0, 171], WHITE = [233, 233, 233];
const BROWN = [116, 89, 46], ORANGE = [217, 102, 0];

const banner = (colour, box, top, bottom) => ({ kind: 'banner', colour, box, top, bottom });
const flag = (x0, y0, x1, y1) => ({ kind: 'flag', colour: BLUE, box: [x0 - 8, y0 - 8, x1 + 8, y1 + 8], pole: x0, tip: x1 });

export const BANNERS = {
  // Tier 4.
  archery_t4:         banner(PURPLE, [390, 250, 612, 629], 350, 607),   // Musketeer Post
  archery_t4b:        banner(BLUE,   [390, 262, 606, 633], 362, 611),   // Crossbow Sentry
  barracks_t4:        banner(WHITE,  [320, 262, 672, 707], 405, 685),   // Paladin Keep
  barracks_t4b:       banner(BROWN,  [320, 262, 672, 711], 405, 689),   // Assassin Guild
  artillery_t4_base:  banner(BLUE,   [384, 442, 530, 689], 492, 667),   // Ballista Turret
  artillery_t4b_base: banner(PURPLE, [384, 442, 530, 693], 492, 671),   // Cannon Outpost
  monastery_t4:       banner(WHITE,  [376, 530, 622, 833], 615, 811),   // High Altar
  monastery_t4b:      banner(ORANGE, [376, 515, 622, 815], 612, 793),   // Judgement Temple
  // Tiers 1 to 3: the blue flag on its pole at the top of each.
  archery_t1:   flag(661, 217, 751, 272),
  archery_t2:   flag(569, 145, 659, 201),
  archery_t3:   flag(536, 145, 625, 201),
  barracks_t1:  flag(718, 254, 807, 310),
  barracks_t2:  flag(728, 202, 817, 258),
  barracks_t3:  flag(728, 207, 817, 263),
  monastery_t1: flag(687, 269, 776, 325),
  monastery_t2: flag(561, 171, 651, 227),
  monastery_t3: flag(558, 174, 647, 222)
};
