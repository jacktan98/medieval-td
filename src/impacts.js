// The earth a rock throws up when it lands.
//
// One image, at the point the rock came down, gone in under half a second. Like
// blood, nothing in the rules can see it: tools/sim.mjs runs identically with it
// or without it, because it is a picture of something that already happened.
//
// It replaces the white ring that used to expand out of every landing. That ring
// was a placeholder standing in for artwork nobody had drawn yet, and it said
// the same thing for an arrow going into a man as for a hundredweight of rock
// hitting a road. Arrows keep it; a rock has its own drawing now.

import { SCALE } from './data/towers.js';

// Measured by tools/trim.mjs, same as every other trim in the game. Kept here
// beside the thing that uses them rather than in data/towers.js, because these
// are not a tower's numbers — the catapult knows it throws a rock and knows
// nothing about what the ground does afterwards.
export const IMPACT_TRIM = {
  impact_1: [198, 221, 116, 70],
  impact_2: [222, 233, 68, 47],
  // FIERY SHOT'S PAIR, AND THEY ARE THE SAME RECTS. The artist drew the burning
  // versions over the plain ones and each trims to its sibling's box to the pixel,
  // so these are the same constants rather than the same numbers typed again — if
  // a re-export ever moves one, both move together or tools/trim.mjs says so.
  fiery_1:  [198, 221, 116, 70],
  fiery_2:  [222, 233, 68, 47],
  // REDRAWN, and 16px narrower than it was: [180, 242, 152, 28] before. Same
  // height, same top, so the puddle sits exactly where it did and only its spread
  // changed.
  spill:    [188, 242, 136, 28]
};

// TWO KINDS OF MARK, and the difference is which way the drawing hangs.
//
// Earth thrown up by a rock is in the AIR above the point of impact, so it is
// anchored at the bottom of its trim and drawn upward — centre it and half the
// spray is underground. A spill of plague lies FLAT on the ground the flask
// broke on, so it is anchored at its middle like a pool of blood.
//
// Kept as a table rather than a flag on each pushed mark: what a picture is, is
// a property of the picture.
export const IMPACT_LIE = { spill: true };

// 1.6x the board scale, and the number is chosen against the sharpness ceiling
// rather than by eye — exactly like PORTRAIT_SCALE in data/ui.js, and it is the
// same 1.625 = 1 / (3 * SCALE) ceiling for the same reason. At 1x the bigger
// spray draws 24px across, which is smaller than the rock that made it looks
// like it should manage; at the ceiling it is 39px, which reads as a burst
// without pretending to be the width of the splash.
//
// It is NOT the splash radius and must not grow into one. The splash is 150 to
// 196 game px across and drawing earth over all of it would be a picture of the
// damage rather than of the impact — the shadow under the falling rock is what
// tells the player where the patch is, in time to matter.
export const IMPACT_SCALE = SCALE * 1.6;

// Long enough to register at 2x fast-forward, short enough that a battery of
// catapults working one bend does not leave the road permanently brown. The
// spray fades over the back half rather than snapping out.
export const IMPACT_LIFE = 0.45;
export const IMPACT_FADE = 0.25;

// A SPILL LASTS AS LONG AS ITS POISON DOES, which is what keeps the picture
// honest: while there is plague on the ground it is still working, and when it
// stops working it is gone. A puddle that outlived its effect would be a patch
// of road that looks dangerous and is not — worse than no drawing, because the
// player would learn to walk their squad around nothing.
//
// It is the one number here that must be kept in step with something else; it
// reads `flask.poison.seconds` rather than repeating it.
export const SPILL_FADE = 0.6;

const pick = list => list[(Math.random() * list.length) | 0];

// The plain pair, and the default for anything that does not name its own.
const EARTH = ['impact_1', 'impact_2'];

// `x, y` is where the projectile hit the ground.
//
// `img` NAMES THE PICTURE, OR NAMES SEVERAL. Absent means the plain earth a rock
// throws up, one of two at random, because a catapult fires every three seconds at
// the same stretch of road and one image repeated is a stamp rather than an event.
// A flask names its single spill. Fiery Shot names a PAIR — it wants the same
// one-of-two treatment the rock gets, in its own colours — so the field takes a
// list as readily as a name and this picks from whatever it is handed.
//
// A list rather than a second flag, because "which picture" already had exactly
// one answer per ammunition and the only thing that changed is that an answer may
// now be plural. See `impact` on the ammunition in data/towers.js.
export function impact(state, x, y, img, life = IMPACT_LIFE) {
  state.impacts.push({
    img: pick(Array.isArray(img) ? img : img ? [img] : EARTH),
    x,
    y,
    life,
    // Kept so the renderer can fade over the right stretch: earth is gone in
    // under half a second and a spill sits there for three.
    fade: img === 'spill' ? SPILL_FADE : IMPACT_FADE
  });
}

export function updateImpacts(state, dt) {
  for (const i of state.impacts) i.life -= dt;
  state.impacts = state.impacts.filter(i => i.life > 0);
}
