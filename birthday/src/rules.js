// THE FIGHT. Everything that moves, in one file, because this game is small
// enough that splitting it would cost more than it saved.
//
// It borrows exactly one thing from the big game: `../../src/route.js`, which is
// pure geometry — how long a polyline is, where you are `s` metres along it, and
// which point of it is nearest a plot. The three maps are the big game's roads, so
// they are measured with the big game's ruler. Every RULE below is this folder's
// own and none of them match medieval-td's.
//
// --- how this game differs, in one place --------------------------------------
//
// FOUR CHARACTERS, NOT FOUR FAMILIES. There is no ladder of unrelated buildings;
// there are four people, each with three levels of themselves.
//
// TWO OF THEM STAND ON THE ROAD. Papa and Mommy walk out of their plot to a point
// on the road and block one thug each. The big game musters a squad of three; here
// each plot puts out exactly one person, because there is exactly one of each of
// them.
//
// ONE OF THEM NEVER AIMS. Rei has no target and no cooldown — he damages
// every thug inside his reach, continuously, which is a shape the big game has
// nothing like.
//
// NOBODY LEAVES A BODY. No corpses, no blood, no smoke. This is a birthday
// present.

import { prepare, at as pointOn, laneOf, nearestOn, randomLane } from '../../src/route.js';
import { enemyTypes, maps, mapNames, family, memberById, START_LIVES, REFUND_RATE,
         spentTo, SCALE } from './data.js';
import { play, solo, voiceCue, killCue, blowCue, ENEMY_BLOW } from './audio.js';
import { starsFor, memberOpen, record, opened, stars } from './progress.js';
import { ENDING } from './story.js';

// Reach is an ELLIPSE, flattened by this, for the same reason the big game's is:
// the board is drawn in perspective, so a patch of ground is wider than it is
// deep. Borrowed as an idea rather than as code — it is one line.
export const SQUASH = 0.62;

export const inReach = (ax, ay, bx, by, r) => {
  const dx = bx - ax;
  const dy = (by - ay) / SQUASH;
  return dx * dx + dy * dy <= r * r;
};

// Pull a point back inside a reach, so a rally flag dropped across the map lands
// somewhere the person could actually stand.
export function clampReach(ax, ay, x, y, r) {
  if (inReach(ax, ay, x, y, r)) return { x, y };
  const dx = x - ax;
  const dy = (y - ay) / SQUASH;
  const k = r / (Math.hypot(dx, dy) || 1);
  return { x: ax + dx * k, y: ay + (dy * k) * SQUASH };
}

// --- the game -----------------------------------------------------------------

// How long you get to look at the board before the first thug arrives, and the
// rest between waves. Longer than the big game's on both counts: the point of
// this one is the four people in it, not the pressure.
const OPENING = 12;
const REST = 10;

// WHAT CALLING A WAVE EARLY PAYS, per second of waiting given up.
//
// The trade is the point: the gold arrives now and so do the thugs, so it is a
// choice rather than free money — and it cannot be farmed, because the only way to
// earn it is to shorten the rest you were going to spend building anyway.
//
// 7 a second is up to 84 for the opening twelve seconds and up to 70 for a rest,
// which is most of an Ella. Big enough to be worth pressing, small enough that
// missing it is not a mistake.
const EARLY_GOLD = 7;

// WHEN THE BUTTON IS LIVE: while a clock is running and nothing is due to walk
// out. That is the rest between waves, and the long look at the board before the
// first one.
export const canCallWave = state =>
  !state.result && state.timer > 0 &&
  (state.resting || (state.waveIndex === 0 && state.spawned === 0));

export const earlyBonus = state =>
  canCallWave(state) ? Math.round(state.timer * EARLY_GOLD) : 0;

// Take the money and start the wave. `timer` going to zero is all it takes —
// updateWaves does the rest on the next step, so there is one place that knows how
// a wave begins.
export function callWaveEarly(state) {
  if (!canCallWave(state)) return false;
  state.gold += earlyBonus(state);
  state.timer = 0;
  return true;
}

// Wave tables are the map's own — the big game's, untouched. This is only how they
// are read.
export function newGame(mapIndex) {
  const map = maps[mapIndex];
  // Measure every road once. `prepare` is idempotent in effect but not in cost, and
  // the big game may already have done it to these very objects, so the result is
  // cached on the level rather than recomputed per game.
  if (!map.routes[0].lanes) map.routes = map.routes.map(prepare);

  return {
    mapIndex,
    map,
    gold: map.gold,
    lives: START_LIVES,
    towers: [],
    units: [],
    enemies: [],
    shots: [],
    waveIndex: 0,
    spawned: 0,
    timer: OPENING,
    resting: false,
    // The screens: 'maps' to choose one, 'family' for the pop-up that introduces
    // the four of them, 'play', and then 'won' or 'lost'.
    screen: 'family',
    // Whether the family pop-up has been through once. It is the same screen
    // whether it is the introduction or somebody going back for a reminder, and
    // this is what tells its button whether to say Start or Back.
    begun: false,
    // Stopped by the player. Separate from the screens because the board stays on
    // show underneath — the whole point of pausing here is to look at it.
    paused: false,
    // Which family card the pop-up has open, or null for the list.
    reading: null,
    // WHO THE PANEL IN THE TOP RIGHT IS ABOUT, as { kind, ref } — a direct
    // reference to the live thing rather than an index, which is what makes the
    // health readout live: the panel re-reads `hp` off the same object the fight
    // is damaging, every frame, with nothing to keep in step. The cost of a
    // direct reference is that it can outlive what it points at, which is what
    // validate() is for.
    selected: null,
    menu: null,
    placing: null,
    speed: 1,
    result: null,
    // Filled in by finish(): the stars this game scored, and what passing it
    // opened, or null.
    score: 0,
    won: null,
    // The grown-up's keypad on the map screen, or null. It lives on the state
    // rather than in input.js so the renderer can draw it.
    keypad: null,
    // The chapter on screen, or null. Set by main.js when a map is chosen from
    // the picker, and by finish() when the last map is held — see story.js for
    // when each one appears and why it is not remembered between visits.
    story: null,
    // The certificate's two: the name typed into the HTML field over the canvas,
    // and whether a PDF is being made right now. `name` is carried across a
    // restart by main.js — see the note there.
    name: '',
    saving: false
  };
}

const waveOf = state => state.map.waves[state.waveIndex];

export const waveSize = w => w.groups.reduce((n, g) => n + g.count, 0);

// Which group of the current wave the nth arrival belongs to, and how long after
// the one before it. Groups run in order and each has its own spacing.
function arrival(wave, n) {
  let seen = 0;
  for (const g of wave.groups) {
    if (n < seen + g.count) return g;
    seen += g.count;
  }
  return null;
}

export function updateWaves(state, dt) {
  if (state.result) return;

  const wave = waveOf(state);
  state.timer -= dt;
  if (state.timer > 0) return;

  if (state.resting) {
    state.resting = false;
    state.spawned = 0;
    state.timer = 0;
    return;
  }

  const g = arrival(wave, state.spawned);
  if (g) {
    spawn(state, g.type);
    state.spawned++;
    state.timer = g.gap;
    return;
  }

  // The wave is out. Wait for the board to clear before the next one, so a slow
  // build is never buried by a table that keeps counting.
  if (state.enemies.length) { state.timer = 0.4; return; }

  if (state.waveIndex >= state.map.waves.length - 1) {
    finish(state, 'won');
    return;
  }

  state.waveIndex++;
  state.resting = true;
  state.timer = REST;
  // What clearing a wave pays. The numbers are the MAP'S — see `purse` in data.js
  // for why they are per map and what to turn first.
  state.gold += state.map.purse.base + state.waveIndex * state.map.purse.step;
}

function spawn(state, type) {
  const def = enemyTypes[type];
  const route = (Math.random() * state.map.routes.length) | 0;
  const lane = randomLane();
  const road = laneOf(state.map.routes[route], lane);
  const p = pointOn(road, 0);

  state.enemies.push({
    def, route, lane, s: 0,
    x: p.x, y: p.y,
    hp: def.hp, maxHp: def.hp,
    face: 1,
    foe: null,        // the family member blocking it, or null
    acd: def.atkCd,
    thrust: 0,
    // How much of its speed it keeps, and for how long. Ella's slime.
    slow: 1, slowFor: 0
  });
}

// --- the thugs -----------------------------------------------------------------

// WHO GETS THE LINE OVER THE BODY. Every point of damage in this game goes
// through here, for one reason: the member who takes the last of a thug's health
// is the one who says something about it, and that has to be recorded on the way
// DOWN. By the time the sweep below runs, whatever hit it is long gone — a
// bullet has been swept up, a smell has no shooter, and a blow is a number that
// was subtracted three frames ago.
//
// The guard on the front matters too. Two bullets from the same blast can arrive
// on the same frame, and without it the second one would take the kill off the
// first — and, worse, pay the bounty for a thug that was already dead.
function hurt(e, amount, by) {
  if (e.hp <= 0 || e.leaked) return;
  e.hp -= amount;
  if (e.hp <= 0) e.killedBy = by;
}

export function updateEnemies(state, dt) {
  for (const e of state.enemies) {
    e.thrust = Math.max(0, e.thrust - dt * 4);

    if (e.slowFor > 0) {
      e.slowFor -= dt;
      if (e.slowFor <= 0) e.slow = 1;
    }

    // Blocked: stand and fight whoever stopped you.
    if (e.foe) {
      if (e.foe.hp <= 0 || e.foe.down > 0) { e.foe = null; }
      else {
        e.acd -= dt;
        if (e.acd <= 0) {
          e.foe.hp -= e.def.damage;
          e.acd = e.def.atkCd;
          e.thrust = 1;
          // Category B, beside the family's own four: a fist landing is a thing
          // on the screen, and several thugs can be landing one at once.
          play(ENEMY_BLOW);
        }
        continue;
      }
    }

    const road = laneOf(state.map.routes[e.route], e.lane);
    e.s += e.def.speed * e.slow * dt;

    if (e.s >= road.total) {
      e.leaked = true;
      state.lives -= e.def.leak;
      continue;
    }

    const p = pointOn(road, e.s);
    e.face = p.tx >= 0 ? 1 : -1;
    e.x = p.x;
    e.y = p.y;
  }

  // Pay for the dead, then sweep. One pass, so a thug killed by two things at once
  // is still paid for once — and the same pass is where whoever finished it gets
  // to say so. `killCue` answers null for Rei, and solo() does nothing with a
  // null cue, which is the whole of "the baby does not gloat".
  for (const e of state.enemies) {
    if (e.hp <= 0 && !e.leaked && !e.paid) {
      e.paid = true;
      state.gold += e.def.bounty;
      solo(killCue(e.killedBy));
    }
  }
  state.enemies = state.enemies.filter(e => {
    const gone = e.leaked || e.hp <= 0;
    if (gone && e.foe) e.foe.foe = null;
    return !gone;
  });

  if (state.lives <= 0 && !state.result) {
    state.lives = 0;
    finish(state, 'lost');
  }
}

// THE END OF A GAME, and the one place the story moves forward.
//
// `score` is what the result screen shows and `won` is what it announces. Both are
// worked out HERE and kept on the state rather than recomputed while drawing,
// because both are answers to "what just happened" — asking progress.js again on
// the next frame would say what is true now, which after `record` is a different
// question. Replaying a map you have already passed announces nothing.
function finish(state, how) {
  state.result = how;
  state.screen = how;
  state.score = how === 'won' ? starsFor(state.lives) : 0;
  const before = stars(state.mapIndex);
  state.won = how === 'won' ? opened(state.mapIndex, state.score, before) : null;
  if (how === 'won') record(state.mapIndex, state.score);

  // THE END OF THE STORY GOES BEFORE THE SCORE, not instead of it. Holding the
  // last map is the moment the whole thing was written towards, and a stars
  // screen is the wrong place to say so — so the ending is shown first and its
  // one button opens the result behind it, which still has the stars on it.
  if (how === 'won' && state.mapIndex === maps.length - 1) {
    state.story = { ...ENDING, then: 'won' };
    state.screen = 'story';
  }
}

// --- the family ----------------------------------------------------------------

// How close a thug has to come to a road character before it is stopped, and how
// close they stand to trade blows.
const LOOK_DEADBAND = 10;

const ENGAGE = 30;
const REACH = 22;
const SETTLE = 14;
// How far Papa will reach to hit something SOMEBODY ELSE has stopped. See quarry.
const HELP = 36;

// WHICH WAY SOMEBODY IS LOOKING, remembered between frames and only changed when
// what they are looking at is CLEARLY to one side. `side` is how far to the right
// of them it is; anything inside the deadband leaves the last answer alone.
//
// All four use this now. It was written for the two on the road — where a blocked
// thug stands almost on top of whoever stopped it, and a facing taken from that
// flips several times a second — and Ella and Rei need it for the same reason at
// a different scale: a thug walking down a north-south stretch of road passes
// through their column, and without a deadband they would spin as it went by.
function face(who, side) {
  if (Math.abs(side) > LOOK_DEADBAND) who.look = side >= 0 ? 1 : -1;
}

// Where a road character stands: the nearest point of road to their plot, or to
// wherever the player has sent them, pulled back inside their reach.
export function station(state, t) {
  const want = t.rally || { x: t.x, y: t.y };
  const near = nearestOn(state.map.routes, want.x, want.y);
  const held = clampReach(t.x, t.y, near.x, near.y, t.level.range);
  const on = nearestOn(state.map.routes, held.x, held.y);
  return { x: on.x, y: on.y, face: Math.atan2(-on.ty, -on.tx) };
}

export function makeUnit(state, t) {
  removeUnit(state, t);
  if (t.member.kind !== 'road') return;

  const post = station(state, t);
  state.units.push({
    tower: t,
    member: t.member,
    rx: post.x, ry: post.y,
    x: t.x, y: t.y,
    face: post.face,
    faceIdle: post.face,
    hp: t.level.hp,
    maxHp: t.level.hp,
    foe: null,
    cd: 0,
    thrust: 0,
    // WHICH WAY THEY ARE DRAWN, kept rather than derived. See the note on
    // LOOK_DEADBAND in updateUnits.
    look: Math.cos(post.face) >= 0 ? 1 : -1,
    down: 0        // seconds until they are back on their feet
  });
}

export function moveUnit(state, t) {
  const u = state.units.find(u => u.tower === t);
  if (!u) { makeUnit(state, t); return; }
  const post = station(state, t);
  u.rx = post.x;
  u.ry = post.y;
  u.faceIdle = post.face;
  // They drop what they are holding to obey the order, exactly as the big game's
  // squads do — an order they will not follow until the current fight ends is not
  // an order.
  if (u.foe) { u.foe.foe = null; u.foe = null; }
}

export function removeUnit(state, t) {
  for (const u of state.units) if (u.tower === t && u.foe) u.foe.foe = null;
  state.units = state.units.filter(u => u.tower !== t);
}

export function updateUnits(state, dt) {
  for (const u of state.units) {
    if (u.down > 0) {
      u.down -= dt;
      if (u.down <= 0) {
        u.hp = u.maxHp;
        u.x = u.tower.x;
        u.y = u.tower.y;
      }
      continue;
    }

    if (u.foe && (u.foe.hp <= 0 || u.foe.leaked)) { u.foe = null; }

    // Grab the nearest unblocked thug in reach. One each: there is one Papa.
    if (!u.foe) {
      let best = null, bestD = ENGAGE;
      for (const e of state.enemies) {
        if (e.foe || e.hp <= 0) continue;
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) { u.foe = best; best.foe = u; }
    }

    const tx = u.foe ? u.foe.x : u.rx;
    const ty = u.foe ? u.foe.y : u.ry;
    const d = Math.hypot(tx - u.x, ty - u.y);
    u.face = d > SETTLE || u.foe ? Math.atan2(ty - u.y, tx - u.x) : u.faceIdle;

    if (d > SETTLE) {
      const step = Math.min(u.tower.level.speed * dt, d);
      u.x += ((tx - u.x) / d) * step;
      u.y += ((ty - u.y) / d) * step;
    }

    u.cd -= dt;
    u.thrust = Math.max(0, u.thrust - dt * 4);

    const at = quarry(state, u, d);
    if (at && u.cd <= 0) {
      // She turns to shoot whatever she is shooting, which is not always the
      // thing she is blocking. Papa's target is already what he is facing.
      if (at !== u.foe) u.face = Math.atan2(at.y - u.y, at.x - u.x);
      strike(state, u, at);
      u.cd = u.tower.level.cd;
      u.thrust = 1;
    }

    // WHICH WAY THE DRAWING FACES, and it is NOT taken from the angle each frame.
    //
    // The art is drawn facing left and mirrored to face right, and that part was
    // always correct — measured over a real fight the mirrored figure agreed with
    // the enemy's side on 349 samples out of 349. What was wrong is that a
    // BLOCKED thug stands almost exactly on top of whoever stopped it: the median
    // horizontal gap is 5px, and more than half of all samples were inside 5px.
    // A facing decided by that flips several times a second and reads as somebody
    // spinning on the spot rather than as somebody fighting.
    //
    // So the direction is remembered and only changed when the thing being
    // attacked is CLEARLY to one side. In the common case — a thug directly above
    // or below on a north-south stretch of road — there is no correct answer, and
    // keeping the last one is the only stable one.
    const focus = at || u.foe;
    face(u, (focus ? focus.x : u.rx) - u.x);

    if (u.hp <= 0) {
      if (u.foe) { u.foe.foe = null; u.foe = null; }
      u.down = u.tower.level.respawn;
    } else if (!u.foe && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + u.tower.level.regen * dt);
    }
  }
}

// WHAT A ROAD CHARACTER IS ABOUT TO HIT, and the two of them answer differently.
//
// PAPA REACHES. His target is the thug in his hands and nothing else, and `d` is
// already the distance to it — so a thug he has stopped but which has not closed
// on him yet is not hittable, which is what makes his blows land where he is.
//
// MOMMY SHOOTS. Her `gun` is a reach of its own and it does not need anything
// blocked at all, so she takes whatever is nearest inside it: usually the thug
// she has stopped, sometimes the one walking up behind it, and often something
// she has not been touched by at all. Short on purpose — she is a woman standing
// on the road who fires, not a second tower.
function quarry(state, u, d) {
  const gun = u.member.gun;

  if (gun) {
    let best = null, least = gun;
    for (const e of state.enemies) {
      if (e.hp <= 0 || e.leaked) continue;
      const r = Math.hypot(e.x - u.x, e.y - u.y);
      if (r < least) { least = r; best = e; }
    }
    return best;
  }

  // The thug in his own hands first, always — it is the one hitting him back.
  if (u.foe && d <= REACH) return u.foe;

  // AND OTHERWISE HE HELPS, which is what the owner asked for: a Papa with
  // nobody in his hands swings at whatever is within arm's length even if
  // somebody else has stopped it. Two of them shoulder to shoulder used to mean
  // one fighting and one watching, because a blocked thug belongs to whoever
  // blocked it — which is right for who it hits, and silly for who may hit it.
  //
  // A LITTLE FURTHER THAN HIS OWN REACH (36 against 22) for a plain geometric
  // reason: a thug he has stopped stands on top of him, and a thug somebody else
  // has stopped is a body's width further away. At 22 he could not have reached
  // past his own wife.
  let best = null, least = HELP;
  for (const e of state.enemies) {
    if (e.hp <= 0 || e.leaked) continue;
    const r = Math.hypot(e.x - u.x, e.y - u.y);
    if (r < least) { least = r; best = e; }
  }
  return best;
}

// What a blow does. Papa's lands where he is standing; Mommy's leaves the barrel.
function strike(state, u, at) {
  const dmg = u.tower.level.damage;
  play(blowCue(u.member.id));

  if (!u.member.gun) { hurt(at, dmg, u.member.id); return; }

  // ONE TRIGGER PULL, A BULLET DRAWN PER THUG IT CATCHES. That is the picture the
  // artist asked for and it is also the honest one: the blast is measured from
  // whatever she AIMED at rather than from her, so a queue standing on top of
  // each other is worth far more to her than the same thugs spread down the road.
  const from = { x: u.x, y: u.y - 20 };
  for (const e of blast(state, u, at)) {
    state.shots.push({
      x: from.x, y: from.y, target: e,
      damage: dmg,
      speed: u.member.speed,
      by: u.member.id,
      colour: u.member.colour,
      art: u.member.shot,
      angle: Math.atan2(e.y - from.y, e.x - from.x),
      spin: 0
    });
  }
}

// Whatever one shot catches: the thing aimed at, plus up to `extra` more inside
// `splash` of it.
function blast(state, u, at) {
  const out = [at];
  let left = u.member.extra;
  for (const e of state.enemies) {
    if (left <= 0) break;
    if (e === at || e.hp <= 0 || e.leaked) continue;
    if (Math.hypot(e.x - at.x, e.y - at.y) > u.member.splash) continue;
    out.push(e);
    left--;
  }
  return out;
}

// --- the two on their towers ----------------------------------------------------

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    if (t.member.kind === 'thrower') stepThrower(state, t, dt);
    else if (t.member.kind === 'aura') stepAura(state, t, dt);
  }
}

// Ella. Picks whatever is nearest the end of the road, throws, and the slime
// slows what it lands on.
function stepThrower(state, t, dt) {
  t.recoil = Math.max(0, (t.recoil || 0) - dt * 4);
  t.cd -= dt;
  if (t.cd > 0) return;

  const target = pickTarget(state, t);
  if (!target) return;

  t.cd = t.level.cd;
  t.recoil = 1;
  t.aim = Math.atan2(target.y - t.y, target.x - t.x);
  face(t, target.x - t.x);
  play(blowCue(t.member.id));
  state.shots.push({
    x: t.x, y: t.y - 26, target,
    damage: t.level.damage,
    speed: t.member.speed,
    slow: t.member.slow,
    slowFor: t.member.slowFor,
    by: t.member.id,
    colour: t.member.colour,
    // The drawing travels with the shot rather than being looked up by the
    // renderer, so a second thrower with different ammunition would need nothing
    // added to render.js.
    art: t.member.shot,
    spin: 0
  });
}

// Rei. No target, no cooldown, no projectile: everything in the smell loses
// health for as long as it is in there. Damage is per SECOND, so it is multiplied
// by dt rather than applied whole — which is also what makes it fair at 2x speed.
function stepAura(state, t, dt) {
  t.stink = ((t.stink || 0) + dt) % 1;
  let any = false;
  // WHICH WAY TO TURN, for somebody with no target to turn towards. The middle of
  // whoever is in the smell with him: one thug on his right turns him right, a
  // crowd on both sides leaves him where he is, which is the honest answer.
  let middle = 0;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (!inReach(t.x, t.y, e.x, e.y, t.level.range)) continue;
    hurt(e, t.level.damage * dt, t.member.id);
    middle += e.x - t.x;
    any = true;
  }
  if (any) face(t, middle);
  // Which pose he is in. He has no cooldown to animate, so the drawing follows
  // the only fact there is: whether anything is currently in there with him.
  t.stinking = any;

  // HIS NOISE IS ON A CLOCK OF ITS OWN, because he is the one member with no
  // cooldown to hang it on. Everybody else makes their sound when they swing or
  // fire; he is simply always doing it, and "always" is not a thing that can be
  // played. So it repeats while there is somebody in there with him.
  //
  // IT RUNS ITS WHOLE LENGTH AND THEN RESTS, and neither half is a guess.
  //
  // The clip is never restarted while it is still sounding — the interval is
  // asked of the audio rather than typed here, so the 7.7 seconds of audible baby
  // that arrived play through once as one noise. That is the whole of "do not
  // replay it when triggered": there is nothing to interrupt it, because nothing
  // asks again until it has finished.
  //
  // Then REEK_REST of silence before he may start again. Without it he is a drone
  // — a continuous smell playing back to back for the length of a wave is the one
  // sound in this game with no event behind it, and it wears out fastest.
  //
  // Both numbers stay right if a shorter clip is ever recorded, because only the
  // rest is written down. REEK is a FLOOR for the clip's part: what to assume if
  // it has not loaded, if the page is muted, or if a future take is very short.
  //
  // The clock keeps running while the reach is empty rather than being reset, so
  // the first thug to walk in after a lull is greeted immediately.
  t.reek = (t.reek || 0) - dt;
  if (any && t.reek <= 0) {
    t.reek = Math.max(REEK, play(blowCue(t.member.id))) + REEK_REST;
  }
}

const REEK = 1.6;
const REEK_REST = 10;

// WHERE THE SMELL IS DRAWN, and it is on the ROAD rather than around him.
//
// The reach is already shown as a ring; what the stink marks say is the thing the
// ring does not — that the road itself is the part that matters, so a plot beside
// a bend is worth more than one beside a straight. They are placed once, when he
// is built or upgraded, because the road does not move.
//
// FOUR OF THEM AT MOST, spaced 80 apart. The artist asked for these not to be
// overused and was right to: they are three black squiggles, and a dozen of them
// along a bend stops reading as a smell and starts reading as damage to the map.
const SMELL_STEP = 12;
const SMELL_GAP = 80;
const SMELL_MAX = 4;

export function smellSpots(state, t) {
  const out = [];
  for (const route of state.map.routes) {
    // Lane 1 is the centreline — see LANES in ../../src/route.js. The thugs walk
    // one of three, and the smell belongs on the road rather than on a lane.
    const road = laneOf(route, 1);
    let since = SMELL_GAP;
    for (let s = 0; s < road.total; s += SMELL_STEP) {
      const p = pointOn(road, s);
      if (!inReach(t.x, t.y, p.x, p.y, t.level.range)) { since = SMELL_GAP; continue; }
      since += SMELL_STEP;
      if (since < SMELL_GAP) continue;
      since = 0;
      out.push({ x: p.x, y: p.y });
    }
  }
  // Thinned from the middle out if a long road through a wide reach offers more
  // than four, so what survives is spread rather than the first four.
  while (out.length > SMELL_MAX) out.splice(Math.floor(out.length / 2), 1);
  return out;
}

// Nearest the exit, which is the only standing order this game has. The big game
// offers three; four characters and a birthday do not need a preferences menu.
function pickTarget(state, t) {
  let best = null, least = Infinity;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (!inReach(t.x, t.y, e.x, e.y, t.level.range)) continue;
    const road = laneOf(state.map.routes[e.route], e.lane);
    const left = road.total - e.s;
    if (left < least) { least = left; best = e; }
  }
  return best;
}

export function updateShots(state, dt) {
  for (const s of state.shots) {
    s.spin += dt * 8;
    // Slime is steered: it follows its target and gives up if the target dies.
    if (!s.target || s.target.hp <= 0 || s.target.leaked) { s.done = true; continue; }

    const dx = s.target.x - s.x;
    const dy = s.target.y - s.y;
    const d = Math.hypot(dx, dy);
    const step = s.speed * dt;

    if (d <= step) {
      hurt(s.target, s.damage, s.by);
      // Only Ella's slime carries a slow. A pellet has nothing to leave behind,
      // and copying `undefined` onto the thug would clear whatever slime was
      // already on it — a shotgun that cured the slow would be a strange bug to
      // find by eye.
      if (s.slowFor) { s.target.slow = s.slow; s.target.slowFor = s.slowFor; }
      s.done = true;
      continue;
    }

    // Which way it is pointing. Recomputed as it flies rather than kept from the
    // muzzle, because these are steered — a pellet chasing a thug that walks
    // across it should turn with it.
    s.angle = Math.atan2(dy, dx);
    s.x += (dx / d) * step;
    s.y += (dy / d) * step;
  }
  state.shots = state.shots.filter(s => !s.done);
}

// --- building -------------------------------------------------------------------

export const levelOf = (member, n) => member.levels[n - 1];

// WHO THE PLAYER HAS. The build ring asks this rather than reading `family`, so a
// character who has not been earned is not a greyed-out button — they are simply
// not on the ring. The order is the family's own, so Mommy is always where Mommy
// was.
export const buildable = () => family.filter(m => memberOpen(m.id));

export function build(state, plot, member) {
  const level = levelOf(member, 1);
  if (state.gold < level.cost) return false;

  state.gold -= level.cost;
  const t = {
    plot, member, level, tier: 1,
    x: plot.x, y: plot.y,
    spent: level.cost,
    cd: 0, recoil: 0, aim: 0, stink: 0, stinking: false,
    // Which way they are facing, remembered between frames — see `face`. It
    // starts as the way the drawing was made, so nobody is mirrored until there
    // is something on their right to be mirrored at.
    look: member.art.faces || 1,
    rally: null,
    smell: null
  };
  state.towers.push(t);
  if (t.member.kind === 'aura') t.smell = smellSpots(state, t);
  makeUnit(state, t);
  // They answer for themselves when they arrive, the same as the big game's four
  // families do. Category A, so building three in a row is three lines rather
  // than three at once.
  solo(voiceCue(member.id));
  return true;
}

export function upgrade(state, t) {
  const next = levelOf(t.member, t.tier + 1);
  if (!next || state.gold < next.cost) return false;

  state.gold -= next.cost;
  t.tier++;
  t.level = next;
  t.spent += next.cost;
  t.cd = 0;
  // His reach grew, so the road inside it did too.
  if (t.member.kind === 'aura') t.smell = smellSpots(state, t);
  // The person is the same person, so they are not replaced — they are just
  // stronger. Their health goes up by the difference rather than being refilled,
  // so upgrading mid-fight is not a heal.
  const u = state.units.find(u => u.tower === t);
  if (u) {
    const gain = next.hp - u.maxHp;
    u.maxHp = next.hp;
    u.hp = Math.min(u.maxHp, u.hp + Math.max(0, gain));
  } else {
    makeUnit(state, t);
  }
  solo(voiceCue(t.member.id));
  return true;
}

export const refundValue = t => Math.floor(t.spent * REFUND_RATE);
export const refundOf = (member, level) => Math.floor(spentTo(member, level) * REFUND_RATE);

export function sell(state, t) {
  state.gold += refundValue(t);
  removeUnit(state, t);
  state.towers = state.towers.filter(other => other !== t);
}

export function towerAt(state, plot) {
  return state.towers.find(t => t.plot === plot) || null;
}

// --- who you are looking at --------------------------------------------------------
//
// THREE THINGS CAN BE SELECTED and they are not symmetrical:
//
//   a plot     stands there              name, level, damage, reach
//   a unit     walks, fights, respawns   the same, plus LIVE health
//   a thug     walks, fights, dies       name, live health, damage, speed
//
// The panel that shows them is in render.js; everything about WHAT it shows is
// here, so the three kinds are reconciled in one place and the drawing is only a
// layout. That is the big game's split — src/select.js against src/render.js —
// and it is worth keeping at this size too.

// Slack around a figure's drawn box, in board px. Papa is 30px tall and 15
// across; without the padding he is a target about 4mm square on a phone, which
// is well under the 44px minimum. It does not have to be exact — this is a
// look-at, not a fire button — so it errs generous.
const PICK_PAD = 12;

// The figure under a tap, or null. NEAREST THE CAMERA WINS: `y` is the ground a
// figure stands on, so the largest y is the one drawn last and therefore on top,
// which is the one the player believes they tapped.
export function pickFigure(state, x, y) {
  let best = null;

  for (const [kind, list] of [['unit', state.units], ['enemy', state.enemies]]) {
    for (const f of list) {
      // Somebody waiting to get up is a ring, not a person. There is nothing on
      // the board to have tapped.
      if (kind === 'unit' && f.down > 0) continue;
      if (kind === 'enemy' && (f.hp <= 0 || f.leaked)) continue;

      const [, , bw, bh] = kind === 'unit' ? f.member.art.idle.trim : f.def.spriteTrim;
      const half = (bw * SCALE) / 2 + PICK_PAD;
      const top = f.y - bh * SCALE - PICK_PAD;
      if (x < f.x - half || x > f.x + half || y < top || y > f.y + PICK_PAD) continue;
      if (!best || f.y > best.ref.y) best = { kind, ref: f };
    }
  }

  return best;
}

// Drop a selection whose subject has left the game — a thug killed, a plot sold,
// a family member cut down. Called once a frame from main.js rather than from
// the draw, so the renderer stays a pure reader of state.
//
// A unit who is merely DOWN stays selected: they respawn into the same object,
// so the panel keeps their slot and shows them coming back. It is only removal
// from the list that ends a selection.
export function validate(state) {
  const s = state.selected;
  if (!s) return;

  const list = s.kind === 'unit' ? state.units
             : s.kind === 'enemy' ? state.enemies
             : state.towers;

  if (!list.includes(s.ref)) state.selected = null;
}

// Everything the panel draws, or null when nothing is selected.
export function selectionInfo(state) {
  const s = state.selected;
  if (!s) return null;

  if (s.kind === 'enemy') {
    const e = s.ref;
    return {
      name: e.def.name,
      colour: e.def.colour,
      pose: { sprite: e.def.sprite, trim: e.def.spriteTrim, pivot: e.def.pivot },
      hp: Math.max(0, Math.round(e.hp)),
      maxHp: e.maxHp,
      damage: `${e.def.damage} every ${e.def.atkCd}s`,
      notes: [`Walks at ${e.def.speed}`]
    };
  }

  // A plot and the person it put on the road are the same selection wearing two
  // hats: tapping the plot says what it is worth, tapping the figure says how
  // they are doing. Both read their numbers off the plot's current level.
  const t = s.kind === 'unit' ? s.ref.tower : s.ref;
  const u = s.kind === 'unit' ? s.ref : state.units.find(other => other.tower === t);
  const m = t.member;
  const lv = t.level;

  const notes = [];
  if (m.gun) notes.push(`Shoots ${m.gun}`);
  notes.push(m.kind === 'road' ? `Sent up to ${lv.range}` : `Reach ${lv.range}`);
  if (m.slowFor) notes.push(`Slows for ${m.slowFor}s`);

  return {
    name: m.name,
    colour: m.colour,
    pose: m.art.idle,
    tier: t.tier,
    // NULL RATHER THAN ZERO for the two on their plots. Nothing in this game can
    // reach Ella or Rei, so a health row would be a number that never moves.
    hp: u ? Math.max(0, Math.round(u.hp)) : null,
    maxHp: u ? u.maxHp : null,
    damage: m.kind === 'aura' ? `${lv.damage} a second` : `${lv.damage} every ${lv.cd}s`,
    notes
  };
}

export function step(state, dt) {
  updateWaves(state, dt);
  updateTowers(state, dt);
  updateUnits(state, dt);
  updateShots(state, dt);
  updateEnemies(state, dt);
}

export { family, memberById, maps, mapNames, enemyTypes, START_LIVES, SCALE };
