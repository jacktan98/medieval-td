// THE MAN IN AN ARTILLERY DRAWING, so he can turn round on his own while the machine
// stays put — see src/crew.js for how he is cut out and src/towers.js (`idleStep`)
// for when he turns.
//
// Artillery is the one family whose crew is painted INTO the building: the catapult's
// loader, the ballista's engineer and the cannoneer are part of each Default drawing.
// The owner uploaded each Default as an SVG beside its PNG, and the man's own drawing
// (the portrait in assets/units) as an SVG too — and every shape of the man is the
// very same path in both. So he is found in the Default by matching the two.
//
// Keyed by the asset key of the Default drawing (src/assets.js): those are the only
// frames he turns in, because idling is something a crew does at rest. `man` is his
// own drawing; `extra` is what he carries that his portrait does not — the index,
// among the Default's paths in order, of each. The catapult's loader holds a rock and
// stands on a shadow of his own that his portrait draws differently; tools/crew.mjs
// checks every index still lands on those.
const DIR = 'assets/towers/artillery/';
const MEN = 'assets/units/';

export const CREW = {
  artillery_t1:         { svg: DIR + 'Artillery_Default_T1.svg', man: MEN + 'Artillery_Man_T1.svg', extra: [39, 53] },
  artillery_t2:         { svg: DIR + 'Artillery_Default_T2.svg', man: MEN + 'Artillery_Man_T2.svg' },
  artillery_t3:         { svg: DIR + 'Artillery_Default_T3.svg', man: MEN + 'Artillery_Man_T3.svg' },
  artillery_t4:         { svg: DIR + 'Ballista_Turret_Default.svg', man: MEN + 'Ballista_Engineer.svg' },
  artillery_t4_tension: { svg: DIR + 'Ballista_Turret_Default_Reinforced_Tension.svg', man: MEN + 'Ballista_Engineer.svg' },
  artillery_t4b:        { svg: DIR + 'Cannon_Outpost_Default.svg', man: MEN + 'Cannoneer.svg' }
};

// The building's own shadow on the ground, which the board lays separately under the
// range rings (see shadowSplit in src/tint.js) and so is left out of the cut pieces.
export const GROUND_SHADOW = '#37422f';
