import { pickTarget } from './enemies.js';
import { projectileSpeed } from './data/towers.js';

// The building's drawn box in world space. render.js draws the tower from this
// box and both mount and muzzle are measured from its top-left corner, so the
// art and the firing origin cannot drift apart. When real tower sprites land,
// set w/h in data/towers.js to the size the sprite is drawn at — nothing else
// needs to change.
export function towerBox(t) {
  return {
    left: t.x - t.def.w / 2,
    top: t.y + 12 - t.def.h,
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
        target,
        damage: t.def.damage,
        speed: projectileSpeed
      });
      t.cd = t.def.cooldown;
      t.recoil = 1;
    }
  }
}
