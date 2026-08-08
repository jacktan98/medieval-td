// Blood. Two separate effects that happen to share a colour.
//
//   SPATTER  every time something is hit — an arrow landing, a spear going in,
//            a fist coming back. One image, thrown at a random offset near the
//            impact, gone in a third of a second.
//
//   POOL     when something dies. Placed once, under the body, and living
//            exactly as long as the body does, because the two are one picture.
//
// Neither is read by any rule. Like corpses, this is decoration the simulation
// cannot see, so tools/sim.mjs runs identically with it or without it.

// A third of a second. Long enough to register on a 1x board, short enough that
// a dozen overlapping hits during a wave never turn the road red.
export const SPLAT_LIFE = 0.35;
export const SPLAT_FADE = 0.20;

// How far a spatter is thrown from the point of impact. Small: this is meant to
// read as coming OUT of the figure that was hit, not as a separate event
// happening nearby.
const SPLAT_SPREAD_X = 7;
const SPLAT_SPREAD_Y = 6;

// How far a pool sits from the body that made it. Deliberately smaller than the
// spatter's throw: the pool has to stay under the corpse, and a corpse is only
// about 27px long, so an offset much past this would leave blood lying beside a
// clean body rather than beneath a bloody one.
const POOL_SPREAD_X = 6;
const POOL_SPREAD_Y = 3;

const pick = (a, b) => (Math.random() < 0.5 ? a : b);
const jitter = r => (Math.random() * 2 - 1) * r;

// Called from wherever damage is dealt. `x, y` is the victim, not the attacker:
// blood comes out of the thing that was hit.
export function splat(state, x, y) {
  state.splats.push({
    img: pick('blood_1', 'blood_2'),
    x: x + jitter(SPLAT_SPREAD_X),
    y: y + jitter(SPLAT_SPREAD_Y),
    life: SPLAT_LIFE
  });
}

export function updateSplats(state, dt) {
  for (const s of state.splats) s.life -= dt;
  state.splats = state.splats.filter(s => s.life > 0);
}

// The pool a body lies in. Chosen ONCE, when the corpse is created, and carried
// on the corpse itself — picking the image or the offset at draw time would make
// it flicker between the two pictures and jump around every frame.
//
// It has no life of its own for the same reason: it fades with the body it
// belongs to, so there is one lifetime to get right instead of two to keep in
// step.
export function poolFor() {
  return {
    img: pick('blood_dead_1', 'blood_dead_2'),
    dx: jitter(POOL_SPREAD_X),
    dy: jitter(POOL_SPREAD_Y)
  };
}
