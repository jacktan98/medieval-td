import { splat } from './blood.js';
import { impact } from './impacts.js';
import { inRange } from './ground.js';
import { play, LAND, BREAK } from './audio.js';

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
  //
  // A flask leaves the third kind: a spill that lies flat and stays for exactly
  // as long as its poison works.
  if (s.ammo.impact) {
    impact(state, s.x, s.y, s.ammo.impact === true ? null : s.ammo.impact,
      s.ammo.poison ? s.ammo.poison.seconds : undefined);
  } else {
    state.hits.push({ x: s.x, y: s.y, life: 0.12 });
  }

  // Category B, on the ARRIVAL rather than the release — a rock is silent in the
  // air and announces itself by landing, which is also where the player is
  // looking. It plays whether or not it hit anybody, because a rock cratering an
  // empty road is exactly the miss the player needs to hear.
  //
  // Keyed on the ammunition's own name, which it already carries for `killedBy`.
  // Nothing new had to go on the ammo for the flask to get its own noise: "what
  // does this sound like landing" has exactly one answer per kind.
  if (s.ammo.landSound) play(LANDING[s.ammo.kind]);

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
  for (const v of victims(state, s)) {
    if (v.hp <= 0 || v.respawn > 0) continue;
    if (!inRange(s.x, s.y, v.x, v.y, s.splash)) continue;
    hit(state, s, v);
  }
}

// WHO A SHOT CAN HURT. One line, and it is the whole of what it took to point
// this file at both armies.
//
// Everything a tower fires leaves `side` unset, which reads as the player's, and
// looks for enemies. A plague doctor's flask says `side: 'enemy'` and looks for
// soldiers instead. Nothing else in the flight, the arc, the landing or the
// splash test cares which way round it is — a projectile is a projectile.
//
// A respawning soldier is skipped by the caller for the same reason nothing may
// aim at one: he is not on the board, he is a muster ring over a barracks.
const victims = (state, s) => (s.side === 'enemy' ? state.units : state.enemies);

// What arriving SOUNDS like, by ammunition. An arrow is not here on purpose: it
// makes its noise leaving the bow, because that is the moment you watch.
const LANDING = { rock: LAND, flask: BREAK };

function hit(state, s, v) {
  // POISON OR DAMAGE, never both. A flask does nothing at all on impact — what
  // it leaves is a patch of ground that trickles health out of whoever was
  // standing in it — and that is the difference between this and every other
  // projectile in the game rather than a variation on it.
  //
  // It REFRESHES rather than stacks: a second flask on the same man restarts the
  // clock at the same rate. Stacking reads as a bug the first time three doctors
  // delete a squad in a second, and "how long since the last flask" is a thing
  // the player can see, where "how many are on him" is not.
  if (s.ammo.poison) {
    v.poison = { dps: s.ammo.poison.dps, left: s.ammo.poison.seconds };
  } else {
    v.hp -= s.damage;
    // SLOW AND DAMAGE TOGETHER, which is the other way round from the flask
    // above. An arcane missile is a real hit that also takes the legs off what it
    // hit; a flask is only ever the ground it leaves behind.
    //
    // It REFRESHES the clock and keeps the STRONGER factor, which is not the same
    // rule as the poison's plain refresh and the difference matters: a Wayside
    // Shrine firing into an enemy an Abbey has already caught would otherwise
    // hand it most of its speed back. Strongest-wins means an upgrade can never
    // be undone by the tier below it, and refreshing means the slow lasts as long
    // as somebody keeps working on it rather than stacking into a stop.
    if (s.ammo.slow) {
      const held = v.slow && v.slow.left > 0 ? v.slow.factor : 1;
      v.slow = { factor: Math.min(held, s.ammo.slow.factor), left: s.ammo.slow.seconds };
    }
    // On the man, not on the projectile. An arrow is inside its target by the
    // time it lands so the two are the same point, but a rock has a patch of
    // victims and blood belongs on each of them rather than in a heap at the
    // impact. Poison draws no blood: nothing has broken the skin.
    splat(state, v.x, v.y, v.y);
  }
  // Which side the blow came from, so the body ends up facing it. The THROWER's
  // x, not the projectile's: at the moment of impact the projectile is on top of
  // the target, so its own position says nothing about where it was shot from.
  // Overwritten by every hit, so the last blow is the one that counts, which is
  // the one that killed him.
  v.struckFrom = s.fromX >= v.x ? 1 : -1;
  // Who to credit if this is the killing blow — see enemies.js, which is the one
  // place that sees every death however it was caused, and so the only place
  // that can tell an arrow kill from a rock kill from a sword kill. The
  // ammunition names itself rather than being mapped here, so a third projectile
  // needs no branch.
  v.killedBy = s.ammo.kind;
}
