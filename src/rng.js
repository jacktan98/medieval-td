// THE GAME'S OWN DICE, seeded, so a game can be played again exactly — the replay
// viewer's whole trick (see src/replay.js). Every random choice that changes what
// happens on the board — which road an enemy takes, a critical hit, when a soldier
// shifts his stance — rolls these; what only changes how things LOOK (blood, ripples,
// the map's glints) still uses Math.random, so drawing at a different frame rate
// cannot change the game.
//
// mulberry32: small, fast, and the same numbers in every browser, because it is
// whole-number arithmetic and nothing else.
let s = 1;

export function seedRng(seed) { s = seed >>> 0; }

// FOR THE TOOLS, which fix the dice by replacing Math.random (a sure roll for a star
// upgrade's chance, a seed per simulated game): with this on, the game's dice are
// Math.random's, so those tools work exactly as they did before this file.
let useMath = false;
export function useMathRandom(on = true) { useMath = !!on; }

export function rand() {
  if (useMath) return Math.random();
  s = (s + 0x6D2B79F5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// A fresh seed for a new game: the one thing here that is truly random.
export const newSeed = () => (Math.random() * 4294967296) >>> 0;
