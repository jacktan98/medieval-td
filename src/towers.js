import { pickTarget } from './enemies.js';
import { BEAT } from './data/towers.js';
import { play, SHOT } from './audio.js';

// The building's drawn box in world space. render.js draws the tower from this
// box and both mount and muzzle are measured from its top-left corner, so the
// art and the firing origin cannot drift apart.
//
// A building is placed by its GROUND SHADOW, not by its bounding box. The
// shadow's centre lands on the plot point, which is the same point the plot
// marker's own dirt ellipse lands on — so a building stands exactly where the
// marker it replaced was standing.
//
// The old rule was "centre the trim on x, put the bottom of the trim 12px below
// the plot", and it is wrong for any drawing with something sticking out. The
// barracks has a row of stakes planted in front of the tent that hang 68 source
// px BELOW its shadow; pinning those to the ground shoved the whole tent 22px
// up the screen. Tier 2's flagpole did the same thing sideways, 7px off centre.
// A bounding box is not where a building is — the shadow is the part that
// touches the ground, so it is the part that decides.
export function towerBox(t) {
  return {
    left: t.x - t.def.groundFrac[0] * t.def.w,
    top: t.y - t.def.groundFrac[1] * t.def.h,
    w: t.def.w,
    h: t.def.h
  };
}

// Where the gunner stands: the centre of the building's platform. Held as a
// fraction of the box rather than a pixel offset, so it follows w/h when a
// tier is resized instead of drifting off the deck.
export function mountPoint(t) {
  const box = towerBox(t);
  return {
    x: box.left + box.w * t.def.mountFrac[0],
    y: box.top + box.h * t.def.mountFrac[1]
  };
}

// Which side the target is on: +1 to the right, -1 to the left.
//
// Figures stay upright and only ever mirror. The art is drawn standing, so
// rotating it to the aim angle lays the figure over — upright with a left/right
// flip is the only orientation that reads correctly for a standing sprite.
export function facing(t) {
  return Math.cos(t.aim) >= 0 ? 1 : -1;
}

// Whether the sprite has to be mirrored to face the target. spriteFaces says
// which way the artwork is drawn, so art drawn facing the other way needs one
// number changed rather than the transform inverted.
export function mirror(def, dir) {
  return dir === def.spriteFaces ? 1 : -1;
}

// Where the projectile leaves the gunner, in world space. The muzzle is
// [sideways, vertical] from the body, and the sideways part flips with the
// sprite so the arrow always leaves the bow.
export function muzzlePoint(t) {
  const m = mountPoint(t);
  const [out, up] = t.def.muzzle;

  return {
    x: m.x + out * facing(t),
    y: m.y + up
  };
}

// Which drawing of the building to show. One-frame towers answer with the only
// picture they have; a catapult answers with the beat it is on.
//
// Read at DRAW time rather than stored on the tower, so the animation cannot get
// out of step with the rule that drives it — there is one clock, `beat`, and the
// picture is a function of it.
export function frameOf(t) {
  return t.def.frames ? t.def.frames[t.beat || 0] : t.def.sprite;
}

// The three beats of a catapult, in order. The index into `def.frames`.
const REST = 0;      // crew holding the rock — also the pose it idles on
const FIRE = 2;      // the arm comes over, and the rock leaves on this beat

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    // Barracks have no weapon — their range is rally reach, not a firing arc,
    // and they carry no mount or muzzle to aim with.
    if (!t.def.cooldown) continue;

    const target = pickTarget(state.enemies, t.x, t.y, t.def.range);
    if (target) t.aim = Math.atan2(target.y - t.y, target.x - t.x);

    if (t.def.frames) stepCrew(state, t, dt, target);
    else stepWeapon(state, t, dt, target);
  }
}

// A tower that simply fires when its cooldown runs out, and whose GUNNER kicks
// backward when it does. Archery, and anything else with one drawing and a man
// standing on it.
//
// `cd` and `recoil` both live here rather than in shoot(), because neither means
// anything to a catapult: its clock is the beat loop below, and its recoil would
// have to be the arm, which the artist has drawn.
function stepWeapon(state, t, dt, target) {
  t.recoil = Math.max(0, t.recoil - dt * 5);
  t.cd -= dt;
  if (!target || t.cd > 0) return;

  shoot(state, t, target);
  t.cd = t.def.cooldown;
  t.recoil = 1;
}

// A tower whose reload is ANIMATED, so the rules and the pictures have to agree.
//
// The loop is three one-second beats — rest, reload, fire — and the shot happens
// on the beat the arm is drawn coming over, not on a cooldown that happens to
// expire somewhere in the middle of it. That is the whole reason this is a
// separate function rather than a frame index derived from `cd`: the machine
// must never fire on a frame it is not drawn firing.
//
// AT REST it sits on beat 0 with the clock stopped, which is what makes an idle
// catapult a still picture rather than a machine miming a reload at nobody. The
// clock only starts when there is something to shoot, so a target walking into
// range always gets the full reload beat before the rock comes — you see it
// being loaded, then you see it thrown.
function stepCrew(state, t, dt, target) {
  t.beatT -= dt;
  if (t.beatT > 0) return;

  // A beat boundary is the ONLY place this decides anything, which is what stops
  // a target dying mid-swing from snapping the arm back down: whatever is drawn
  // now finishes its second first.
  if (!target) {
    t.beat = REST;
    t.beatT = 0;
    return;
  }

  t.beat = (t.beat + 1) % t.def.frames.length;
  t.beatT = BEAT;
  if (t.beat === FIRE) shoot(state, t, target);
}

function shoot(state, t, target) {
  const m = muzzlePoint(t);
  const ammo = t.def.ammo;

  state.shots.push({
    x: m.x,
    y: m.y,
    angle: t.aim,          // so the first frame already points at the target
    // Where it was shot FROM, kept because the projectile's own position at the
    // moment it lands is the target's. A corpse faces the blow, and this is the
    // only record of which side the blow was on.
    fromX: t.x,
    target,
    damage: t.def.damage,
    // 0 or absent on everything but a catapult, and read by projectiles.js as
    // "hit only what you hit".
    splash: t.def.splash || 0,
    ammo,
    speed: ammo.speed
  });

  // Category B: never skipped, never queued. Every arrow you can see leave a bow
  // makes its own noise, because ten towers firing is ten events the player is
  // watching and a shared channel would silence nine of them.
  //
  // A CATAPULT MAKES NO SOUND YET — `sound` is false on the rock. There is no
  // clip for it, and playing the bow release over a swinging arm would be worse
  // than silence: that sample is pinned to a picture of an arrow leaving a
  // string. It wants a timber creak and a thump; see assets/audio/README.md.
  if (ammo.sound) play(SHOT);
}
