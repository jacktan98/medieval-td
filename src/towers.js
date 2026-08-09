import { pickTarget } from './enemies.js';
import { projectileSpeed } from './data/towers.js';

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

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    // Barracks have no weapon — their range is rally reach, not a firing arc,
    // and they carry no mount or muzzle to aim with.
    if (!t.def.cooldown) continue;

    t.cd -= dt;
    t.recoil = Math.max(0, t.recoil - dt * 5);

    const target = pickTarget(state.enemies, t.x, t.y, t.def.range);
    if (!target) continue;

    t.aim = Math.atan2(target.y - t.y, target.x - t.x);

    if (t.cd <= 0) {
      const m = muzzlePoint(t);
      state.shots.push({
        x: m.x,
        y: m.y,
        angle: t.aim,          // so the first frame already points at the target
        // Where it was shot FROM, kept because the arrow's own position at the
        // moment it lands is the target's. A corpse faces the blow, and this is
        // the only record of which side the blow was on.
        fromX: t.x,
        target,
        damage: t.def.damage,
        speed: projectileSpeed
      });
      t.cd = t.def.cooldown;
      t.recoil = 1;
    }
  }
}
