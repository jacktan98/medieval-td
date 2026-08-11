import { splat } from './blood.js';
import { impact } from './impacts.js';
import { inRange } from './ground.js';
import { play, LAND } from './audio.js';

// TWO KINDS OF PROJECTILE, and the difference is not cosmetic.
//
// An arrow is STEERED. It chases one man, follows him, and dies with him — there
// is nothing left to aim at.
//
// A rock is THROWN. towers.js committed it, at the moment of release, to a patch
// of ground worked out from where its target would be when it got there; from
// then on it is a lump on a parabola and nothing can call it back. It lands
// where it was going whether or not anyone is still standing there. Most of the
// time the lead is right and a marching column walks into it; sometimes a man
// gets blocked, or killed, or reaches a bend, and the rock comes down just
// behind him. That miss is the tower's character, not a bug in it.
export function updateShots(state, dt) {
  for (const s of state.shots) {
    if (s.flight) { fly(s, dt); if (s.t >= s.flight) land(state, s); continue; }

    const step = s.speed * dt;
    if (s.target.hp <= 0) { s.dead = true; continue; }

    const ax = s.target.x - s.x, ay = s.target.y - s.y;
    const adist = Math.hypot(ax, ay);

    if (adist <= step) {
      land(state, s);
    } else {
      s.x += (ax / adist) * step;
      s.y += (ay / adist) * step;
      s.angle = Math.atan2(ay, ax);
    }
  }

  state.shots = state.shots.filter(s => !s.dead);

  for (const h of state.hits) h.life -= dt;
  state.hits = state.hits.filter(h => h.life > 0);
}

// One step of a lob.
//
// The rock runs from the sling bucket to the aim point at a constant rate along
// the straight between them, and the arc is a LIFT added on top: `4h·u(1-u)`, a
// parabola that is zero at both ends and `h` at the halfway mark. Subtracted
// from y, because up the screen is negative.
//
// That "zero at both ends" is what keeps the sum honest. At u = 1 the lift is
// exactly nothing, so the rock's drawn position and the ground it was thrown at
// are the same point — which means the splash can be measured from `s.x, s.y`
// with no second set of coordinates to keep in step. The one place a projectile
// is allowed to be above the ground is in the middle of its flight.
function fly(s, dt) {
  s.t += dt;
  const u = Math.min(1, s.t / s.flight);
  s.x = s.from.x + (s.to.x - s.from.x) * u;
  // The point on the ground the rock is currently over, kept because the
  // renderer draws a shadow there. Without it the height is unreadable: a rock
  // 60px up over a road drawn in perspective is indistinguishable from a rock
  // 60px further away, and the player cannot tell where it is going to come
  // down. That matters more here than it would for any other projectile,
  // because a catapult aims AHEAD and the landing spot is genuinely news.
  s.groundY = s.from.y + (s.to.y - s.from.y) * u;
  s.y = s.groundY - 4 * s.lift * u * (1 - u);
}

// Where the shot arrives. One victim for an arrow, everything standing in a
// patch of ground for a rock.
//
// THE SPLASH IS AN ELLIPSE, through the same inRange() that every tower's reach
// and every rally clamp goes through. That is not tidiness: the board is drawn
// in perspective, so a round patch of ground is drawn squashed, and a splash
// tested as a circle would kill men who are visibly outside it and spare men who
// are visibly inside. src/ground.js has the whole story — the game has already
// paid for that lesson once, with a tower that read as aiming at heads.
function land(state, s) {
  s.dead = true;

  // WHAT ARRIVING LOOKS LIKE, and the two projectiles no longer share an answer.
  //
  // A rock throws up earth: real artwork, at the point it came down, and it goes
  // in whether or not it hit anybody — a rock cratering an empty road is the
  // miss the player needs to SEE, the same argument that puts the landing noise
  // on arrival rather than on release.
  //
  // An arrow keeps the white ring, which is what both used to get. It is a
  // placeholder and it is honest about being one: an arrow lands inside a man
  // and there is nothing drawn for that yet.
  if (s.ammo.impact) impact(state, s.x, s.y);
  else state.hits.push({ x: s.x, y: s.y, life: 0.12 });

  // Category B, on the ARRIVAL rather than the release — a rock is silent in the
  // air and announces itself by landing, which is also where the player is
  // looking. It plays whether or not it hit anybody, because a rock cratering an
  // empty road is exactly the miss the player needs to hear.
  if (s.ammo.landSound) play(LAND);

  if (!s.splash) {
    // Nothing left to hit: a steered shot cannot arrive at a dead man, but an
    // unsteered one with no splash can.
    if (s.target.hp > 0) hit(state, s, s.target);
    return;
  }

  // Everything under it takes the FULL damage — there is no falloff, and the
  // one number in the info box is the number every man in the patch takes. A
  // gradient would be more realistic and would make the tower impossible to
  // describe on a button.
  //
  // Measured from where the rock actually landed rather than from the target,
  // so a shot that arrives after its man has walked on hits the ground it was
  // thrown at and whoever is standing there now.
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (!inRange(s.x, s.y, e.x, e.y, s.splash)) continue;
    hit(state, s, e);
  }
}

function hit(state, s, e) {
  // Damage only — the bounty and the kill FX are paid out in enemies.js, which
  // is the one place that sees every death however it was caused.
  e.hp -= s.damage;
  // On the man, not on the projectile. An arrow is inside its target by the time
  // it lands so the two are the same point, but a rock has a patch of victims
  // and blood belongs on each of them rather than in a heap at the impact.
  splat(state, e.x, e.y, e.y);
  // Which side the blow came from, so the body ends up facing it. The TOWER's
  // x, not the projectile's: at the moment of impact the projectile is on top of
  // the target, so its own position says nothing about where it was shot from.
  // Overwritten by every hit, so the last blow is the one that counts, which is
  // the one that killed him.
  e.struckFrom = s.fromX >= e.x ? 1 : -1;
  // Who to credit if this is the killing blow — see enemies.js, which is the one
  // place that sees every death however it was caused, and so the only place
  // that can tell an arrow kill from a rock kill from a sword kill. The
  // ammunition names itself rather than being mapped here, so a third projectile
  // needs no branch.
  e.killedBy = s.ammo.kind;
}
