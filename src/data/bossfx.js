// THE BOSS FIGHT'S EXTRA EFFECTS, each one a switch, at the owner's word: "ensure
// they are easy to remove if I find them not suitable."
//
// SET ANY OF THESE TO false AND THAT EFFECT IS GONE — nothing else needs changing.
// Each is drawn on top of the fight rather than being part of it: none of them
// touches his health, his timing or what can hit him.
export const BOSS_FX = {
  healGlow: true,     // a soft light behind him, pulsing, while he mends
  healFloor: true,    // a soft oval of light on the ground under him while he mends
  bareHeal: true,     // his Heal drawing without its painted dome and floor — the glow and its floor stand in for them
  rageBurst: true,    // a ring out from his feet and a short shake of the board as he turns enraged
  rageTint: true,     // his drawing flushes red as he turns enraged, and fades back
  weaponPop: true     // the shield and bow jump up as he throws them down, then land
};

// AND THEIR NUMBERS, for tuning rather than removing.

// The glow behind him while he mends, DOME-SHAPED, at the owner's word: a tall oval
// of light round his middle, cut flat just under his feet like the radiance painted in
// his Heal drawing. Its colour (#BAAC97, that radiance's grey); its half-width and
// half-height (board px); how strong it is in the middle; how far out (a share of the
// way to its edge) it stays nearly solid before thinning; where its middle sits (a
// share of his height up from his feet); how far (board px) its flat foot fades in
// over, so it stands on the ground without a hard line; and how fast it pulses.
// 20% smaller than it first was, at the owner's word (40 x 62).
export const HEAL_GLOW = { rgb: [0xBA, 0xAC, 0x97], w: 32, h: 50, alpha: 1, core: 0.6, mid: 0.3, foot: 8, pulse: 5 };

// The glow's FLOOR, at the owner's word — the brown oval painted under his feet in the
// Heal drawing, as light on the ground: its colour (#74592E, that oval's brown); its
// half-width and half-height (board px); how strong in the middle; and how far out it
// stays nearly solid before thinning.
export const HEAL_FLOOR = { rgb: [0x74, 0x59, 0x2E], w: 46, h: 14, alpha: 1, core: 0.6 };

// The moment he turns: the ring's life and how far it spreads, and the board's shake —
// how far (board px) and for how long.
export const RAGE_BURST = { seconds: 0.7, r: 95, width: 4, shake: 3, shakeSeconds: 0.45 };

// The red flush as he turns: its colour, how strong at first, and how long it takes
// to fade.
export const RAGE_TINT = { color: '#D8261C', alpha: 0.75, seconds: 1.1 };

// The thrown shield and bow: how long their hop takes, and how high it goes (board px).
export const WEAPON_POP = { seconds: 0.5, height: 12 };

// --- AND THE SAME LIGHT FOR THE PALADIN'S HOLY LIGHT ------------------------------
//
// At the owner's word: "I want this style when paladins cast the spell too." His Holy
// Light drawing paints the same kind of radiance, in yellow, and it is drawn the same
// way: taken out of the drawing (tools/heal-bare.mjs) and drawn live as a dome of
// light and a floor, for the three seconds he kneels. Each a switch, like the above.
export const UNIT_FX = {
  holyGlow: true,     // a dome of pale yellow light round him while he kneels
  holyFloor: true,    // a soft oval of yellow light on the ground under him
  bareHoly: true      // his Holy Light drawing without its painted dome and floor
};

// The same shape as the Captain's, scaled to a paladin — his kneeling drawing stands
// about 0.8 of the Captain's mending one. #FFF3B3 and #FFEB7E, the drawing's own.
// 20% smaller than it first was, at the owner's word (32 x 50).
export const HOLY_GLOW = { rgb: [0xFF, 0xF3, 0xB3], w: 26, h: 40, alpha: 1, core: 0.6, mid: 0.3, foot: 6, pulse: 5 };
export const HOLY_FLOOR = { rgb: [0xFF, 0xEB, 0x7E], w: 37, h: 11, alpha: 1, core: 0.6 };
