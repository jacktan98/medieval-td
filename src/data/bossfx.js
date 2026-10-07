// THE BOSS FIGHT'S EXTRA EFFECTS, each one a switch, at the owner's word: "ensure
// they are easy to remove if I find them not suitable."
//
// SET ANY OF THESE TO false AND THAT EFFECT IS GONE — nothing else needs changing.
// Each is drawn on top of the fight rather than being part of it: none of them
// touches his health, his timing or what can hit him.
export const BOSS_FX = {
  healGlow: true,     // a soft light behind him, pulsing, while he mends
  rageBurst: true,    // a ring out from his feet and a short shake of the board as he turns enraged
  rageTint: true,     // his drawing flushes red as he turns enraged, and fades back
  weaponPop: true,    // the shield and bow jump up as he throws them down, then land
  slowFinish: true    // the game slows for a moment as he is beaten
};

// AND THEIR NUMBERS, for tuning rather than removing.

// The glow behind him while he mends: its colour, how far it reaches (board px),
// how strong at its brightest, and how fast it pulses (beats a second, roughly).
export const HEAL_GLOW = { rgb: [190, 245, 110], r: 46, alpha: 0.8, pulse: 5 };

// The moment he turns: the ring's life and how far it spreads, and the board's shake —
// how far (board px) and for how long.
export const RAGE_BURST = { seconds: 0.7, r: 95, width: 4, shake: 3, shakeSeconds: 0.45 };

// The red flush as he turns: its colour, how strong at first, and how long it takes
// to fade.
export const RAGE_TINT = { color: '#D8261C', alpha: 0.75, seconds: 1.1 };

// The thrown shield and bow: how long their hop takes, and how high it goes (board px).
export const WEAPON_POP = { seconds: 0.5, height: 12 };

// The slow finish as he is beaten: how slow (a share of normal speed), for how many
// real seconds, and how long it takes to come back up to speed after.
export const SLOW_FINISH = { speed: 0.3, seconds: 1.2, ease: 0.5 };
