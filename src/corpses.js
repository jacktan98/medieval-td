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

// How far back the blow throws him. A man who is speared or shot does not fold
// up on the spot he was standing on — he goes over backwards, away from whatever
// hit him — and 5px is enough to read as that without the body looking like it
// teleported.
//
// Backwards means opposite the way he was FACING, which is the direction the
// thing that killed him came from: both sides of a fight stand nose to nose, and
// the lunge in enemies.js/units.js already uses the same axis. Sideways is not
// an option here — these figures never move up and down.
export const KNOCKBACK = 5;

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
  //
  // The pool moves back with him, not with the spot he was killed on: the blood
  // under a body belongs to the body. The spatter from the killing blow was
  // already thrown at the fight, and that one stays put.
  state.corpses.push({ def, x: x - face * KNOCKBACK, y, face, life: CORPSE_LIFE, pool: poolFor() });
}

export function updateCorpses(state, dt) {
  for (const c of state.corpses) c.life -= dt;
  state.corpses = state.corpses.filter(c => c.life > 0);
}
