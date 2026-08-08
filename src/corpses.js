// Bodies left behind by anything that dies on the road.
//
// A figure has three states and only the third needs its own artwork: standing
// is the sprite, attacking is that same sprite lunged forward in code, and dying
// is the PNG in assets/dead. See that folder's README for the drawing rules.
//
// Purely decorative. Nothing targets a corpse, blocks on one, or reads this list
// except the renderer, so adding bodies cannot move the balance — tools/sim.mjs
// runs with an empty art table and never creates one.

import { poolFor } from './blood.js';

// How long a body stays, in GAME seconds. On 2x from the dashboard that is one
// real second, because the fast-forward runs the whole simulation twice per
// frame. That is the right behaviour: bodies that ignored the speed control
// would stack up exactly when the road is busiest.
export const CORPSE_LIFE = 2;

// The last half second fades. It eats into CORPSE_LIFE rather than extending it,
// so a body is still on screen for two seconds — a corpse that pops out of
// existence draws the eye straight to the frame it disappears on.
export const CORPSE_FADE = 0.5;

// `def` is the living figure's def, not a separate corpse def: the body is drawn
// from `def.dead` and positioned from the same trim and pivot the standing
// sprite uses, so a re-export moves both together.
//
// A def with no `dead` sprite makes no body, which is what keeps the whole
// feature inert until the art lands.
export function dropCorpse(state, def, x, y, face) {
  if (!def.dead) return;
  // The pool comes with the body rather than being its own effect, so the two
  // always appear together, sit together and fade together. render.js draws it
  // in an earlier pass, which is what keeps the body on top of it.
  state.corpses.push({ def, x, y, face, life: CORPSE_LIFE, pool: poolFor() });
}

export function updateCorpses(state, dt) {
  for (const c of state.corpses) c.life -= dt;
  state.corpses = state.corpses.filter(c => c.life > 0);
}
