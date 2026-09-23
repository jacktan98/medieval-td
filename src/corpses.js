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
import { SCALE } from './data/towers.js';

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

// --- A BODY THAT FALLS FIRST --------------------------------------------------
//
// A CROW DIES IN THE AIR, and the owner's rule for it is "when the crow is shot
// down, it will fall and use 'falling'... Use 'dead' when the crow landed on the
// ground and vanishes like normal units when dead." So his body has a beat nobody
// else's has: `fall` seconds of dropping, and only then the two seconds every
// corpse gets. The clock that fades a body does not start until it is on the
// ground, so a crow is on screen for exactly as long dead as a man is.
//
// STRAIGHT DOWN, onto the spot his shadow was on. The shadow is where he WAS all
// along — every reach and every lane position in the game measured him from it —
// so it is where he lands, and it stays on the ground under him the whole way.
// See drawCorpse in src/render.js, which lays it there.
//
// Is this body still in the air?
export const falling = c => !!c.fall && c.fallT < c.fall;

// HOW HIGH ITS MIDDLE IS ABOVE ITS SHADOW, in game px, on this frame. From the
// height the bird was flying at — `from`, which the death path reads off the wing
// frame he was showing — to the height his body lies at in the Dead drawing, so
// the Falling bird lands exactly where the Dead one takes over.
//
// ACCELERATING, on the square of the time: a thing that falls starts slowly and
// hits the ground fast. A straight line would read as being lowered.
export function dropHeight(c) {
  const land = c.def.flying.rest * SCALE;
  if (!falling(c)) return land;
  const p = c.fallT / c.fall;
  return c.from + (land - c.from) * p * p;
}

// The pool's opacity ramp. Blood spreads once the body is down, so the stain
// arrives with the landing rather than being on the ground ahead of it — and a
// body still falling is not down at all.
export const settled = c => (falling(c) ? 0 : thrown(c));

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
// `opts` is for a body that is ALREADY on the ground when it gets here, which is
// one creature: a boss lies in his own Dead drawing for two seconds before the
// corpse takes over. He brings his own `pool` — made when he fell, so the stain
// does not appear late or jump to a new picture at the changeover — and `kb: 0`,
// because a body that has been still for two seconds must not suddenly slide.
export function dropCorpse(state, def, x, y, face, opts = {}) {
  if (!def.dead) return;
  const kb = opts.kb ?? KNOCKBACK;
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
    x: x - face * kb,
    kb,
    life: CORPSE_LIFE,
    // NO POOL UNDER A CROW. The stain is drawn for a man — it is wider than the
    // whole bird — and one spreading under a body a third its size read as a
    // second, bigger creature having died there. A flyer lies on his own shadow
    // and nothing else, which is what the Dead drawing already has painted in.
    pool: def.flying ? null : (opts.pool || poolFor()),
    // A FLYER'S DROP: how long it takes, how far through it he is, and the height
    // he started from. Zero `fall` on everything that dies on its feet, which is
    // what `falling` reads as "already down".
    fall: def.flying ? def.flying.fall : 0,
    fallT: 0,
    from: opts.from || 0
  });
}

export function updateCorpses(state, dt) {
  for (const c of state.corpses) {
    // IN THE AIR, THE BODY'S TWO SECONDS HAVE NOT STARTED. The part of this frame
    // left over after he lands comes off `life`, so the drop and the fade add up to
    // exactly the time they are meant to at any frame rate.
    if (falling(c)) {
      c.fallT += dt;
      if (falling(c)) continue;
      c.life -= c.fallT - c.fall;
      continue;
    }
    c.life -= dt;
  }
  state.corpses = state.corpses.filter(c => c.life > 0);
}
