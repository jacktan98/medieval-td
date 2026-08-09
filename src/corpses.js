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

// How far back the blow throws him, in game px.
//
// Backwards means opposite the way the BODY faces, and the body faces the thing
// that killed it — see dropCorpse. So a man shot from the right lies looking
// right and is thrown left, which is the only combination that reads as being
// hit. Sideways is not an option here: these figures never move up and down.
//
// This was 5px and applied instantly, and that read as nothing at all: a body
// that appears 5px from where the man stood has not been thrown, it has been
// placed. What sells a knockback is the MOVEMENT, so the distance went to 10 —
// half a militiaman's width — and the body now travels it.
export const KNOCKBACK = 10;

// How long the throw takes. Short enough to belong to the blow that caused it
// rather than looking like the corpse is sliding downhill; long enough to be
// several frames at 1x, and still 3-4 frames on the dashboard's 2x.
export const KNOCKBACK_TIME = 0.18;

// Ease-out cubic: fastest at the instant of the hit, then settling. The opposite
// curve would look like the body pushing itself along the ground.
const eased = p => 1 - (1 - p) ** 3;

// How far through the throw a body is, 0 at the moment of death to 1 once it has
// settled. A corpse with no `kb` — corpse-test.html places its bodies directly —
// is treated as having landed already, so nothing there moves.
const thrown = c => (c.kb ? eased(Math.min(1, (CORPSE_LIFE - c.life) / KNOCKBACK_TIME)) : 1);

// The body's offset from its resting place, in world px. Positive is back toward
// the spot the man was killed on, which is where the throw starts.
export const knockbackOffset = c => c.face * (c.kb || 0) * (1 - thrown(c));

// The pool's opacity ramp. Blood spreads once the body is down, so the stain
// arrives with the landing rather than being on the ground ahead of it.
export const settled = thrown;

// `def` is the living figure's def, not a separate corpse def: the body is drawn
// from `def.dead` and positioned from the same trim and pivot the standing
// sprite uses, so a re-export moves both together.
//
// A def with no `dead` sprite makes no body, which is what keeps the whole
// feature inert until the art lands.
//
// `face` IS NOT THE WAY HE WAS WALKING. It is the side the killing blow came
// from, +1 for the right, recorded as `struckFrom` wherever damage is dealt.
// A militiaman walking left who takes an arrow from a tower on his right used to
// keep facing left, so the body lay with its back to the arrow and was thrown
// toward the archer that shot it. Both halves of that read as wrong, and both
// come from this one number: the throw is derived from the facing, so fixing the
// facing fixes the direction he flies for free.
//
// Walking direction is still the fallback, for a death with no recorded blow.
// Nothing can currently die that way — you have to be hit to lose hp — so it is
// there to keep a body pointing somewhere sane rather than because it happens.
export function dropCorpse(state, def, x, y, face) {
  if (!def.dead) return;
  // The pool comes with the body rather than being its own effect, so the two
  // always appear together, sit together and fade together. render.js draws it
  // in an earlier pass, which is what keeps the body on top of it.
  //
  // `x` is where he ENDS UP, one knockback back from where he was killed — the
  // pool belongs to the body and it forms where the body comes to rest, not
  // along the path it took. The spatter from the killing blow was already thrown
  // at the fight, and that one stays put.
  state.corpses.push({
    def, y, face,
    x: x - face * KNOCKBACK,
    kb: KNOCKBACK,
    life: CORPSE_LIFE,
    pool: poolFor()
  });
}

export function updateCorpses(state, dt) {
  for (const c of state.corpses) c.life -= dt;
  state.corpses = state.corpses.filter(c => c.life > 0);
}
