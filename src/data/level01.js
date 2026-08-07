// Hand-authored waypoints. Enemies walk these in order, then damage the keep.
// Coordinates are in logical canvas space (960x540).

// The top leg sits at y=156 rather than 116. The plot above it has to clear the
// 40px HUD bar, and at the old height there was only room for a plot centred at
// y=54 — half of it lived under the header, so its ring was unreadable and the
// top of its tap target was stolen by the HUD.
//
// Dropping that leg by 40 shortens the walk by 80 — it cuts both of the
// verticals that meet it — so the path is 1566 rather than 1646 and the level
// is about 5% harder. Sweeping the bottom leg to buy that length back was tried
// and abandoned: the sim's surviving-lives figure barely moved and did not move
// monotonically, because which enemy a blocker happens to grab cascades through
// the rest of the wave. Lives-remaining is a noisy read of this map; what is
// stable across the whole sweep is the shape of the result, and that held
// everywhere — archery alone loses, barracks alone loses, mixes win.
export const path = [
  { x: -30, y: 268 },
  { x: 176, y: 268 },
  { x: 176, y: 156 },
  { x: 424, y: 156 },
  { x: 424, y: 402 },
  { x: 700, y: 402 },
  { x: 700, y: 214 },
  { x: 990, y: 214 }
];

// Fixed build plots. Radius 30 logical px — hit target stays above 44 real px
// on a phone once the canvas is scaled down.
//
// Two hard constraints, and on this map they do not overlap in the strip above
// the road's top leg:
//
//   road gap  — centre at least 62 from the path centreline (30 plot radius +
//               30 half-width of the road's cut lip + a hair)
//   HUD gap   — centre at y >= 136. A tower is drawn 96 tall from 12 below the
//               plot, so a lower plot pushes the deck, the archer standing on
//               it and the tier stars up behind the 40px header. At y=92 the
//               plot itself is clear but the archer sits at y=14, invisible.
//
// Above the top leg (y=156) the road gap caps a plot at y<=94, so the old
// top-left plot could not satisfy both wherever it sat in that strip. It moved
// out to (500,136), east of the leg's corner, where the nearest path point is
// 79 away and the whole tower is visible.
export const plots = [
  { x: 104, y: 190 },
  { x: 262, y: 218 },
  { x: 500, y: 136 },
  { x: 348, y: 328 },
  { x: 520, y: 254 },
  { x: 596, y: 476 },
  { x: 636, y: 306 },
  { x: 796, y: 330 }
];

export const keep = { x: 918, y: 214 };

export const startGold = 220;
export const startLives = 20;
