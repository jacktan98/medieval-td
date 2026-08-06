// Hand-authored waypoints. Enemies walk these in order, then damage the keep.
// Coordinates are in logical canvas space (960x540).

export const path = [
  { x: -30, y: 268 },
  { x: 176, y: 268 },
  { x: 176, y: 116 },
  { x: 424, y: 116 },
  { x: 424, y: 402 },
  { x: 700, y: 402 },
  { x: 700, y: 214 },
  { x: 990, y: 214 }
];

// Fixed build plots. Radius 30 logical px — hit target stays above 44 real px
// on a phone once the canvas is scaled down.
export const plots = [
  { x: 104, y: 190 },
  { x: 262, y: 196 },
  { x: 332, y: 54 },
  { x: 348, y: 328 },
  { x: 520, y: 254 },
  { x: 596, y: 476 },
  { x: 636, y: 306 },
  { x: 796, y: 330 }
];

export const keep = { x: 918, y: 214 };

export const startGold = 220;
export const startLives = 20;
