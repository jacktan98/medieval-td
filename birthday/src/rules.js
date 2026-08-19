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
import { enemyTypes, maps, family, memberById, START_GOLD, START_LIVES, REFUND_RATE, spentTo }
  from './data.js';

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
    gold: START_GOLD,
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
    menu: null,
    placing: null,
    speed: 1,
    result: null
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
    state.result = 'won';
    state.screen = 'won';
    return;
  }

  state.waveIndex++;
  state.resting = true;
  state.timer = REST;
  // WHAT A CLEARED WAVE PAYS, and it is the one lever that moves the whole game at
  // once. Bounties alone do not fund a board here: the big game's wave tables
  // assume a plot whose output triples over eight waves, and a family member tops
  // out at about 500 gold of levels, so the money has to arrive at roughly the rate
  // the thugs do.
  //
  // It is the first number to turn if the game plays too easy or too hard, BEFORE
  // touching anybody's damage — it lifts or drops every build equally and so does
  // not change which of the four is worth having. `node birthday/tools/sim.mjs`
  // says what it did.
  state.gold += 85 + state.waveIndex * 22;
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
  // is still paid for once.
  for (const e of state.enemies) {
    if (e.hp <= 0 && !e.leaked && !e.paid) { e.paid = true; state.gold += e.def.bounty; }
  }
  state.enemies = state.enemies.filter(e => {
    const gone = e.leaked || e.hp <= 0;
    if (gone && e.foe) e.foe.foe = null;
    return !gone;
  });

  if (state.lives <= 0 && !state.result) {
    state.lives = 0;
    state.result = 'lost';
    state.screen = 'lost';
  }
}

// --- the family ----------------------------------------------------------------

// How close a thug has to come to a road character before it is stopped, and how
// close they stand to trade blows.
const ENGAGE = 30;
const REACH = 22;
const SETTLE = 14;

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

    if (u.foe && d <= REACH && u.cd <= 0) {
      strike(state, u);
      u.cd = u.tower.level.cd;
      u.thrust = 1;
    }

    if (u.hp <= 0) {
      if (u.foe) { u.foe.foe = null; u.foe = null; }
      u.down = u.tower.level.respawn;
    } else if (!u.foe && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + u.tower.level.regen * dt);
    }
  }
}

// What a blow does. Papa's lands on one thug; Mommy's sprays.
function strike(state, u) {
  const dmg = u.tower.level.damage;
  u.foe.hp -= dmg;

  const spread = u.member.splash;
  if (!spread) return;

  let left = u.member.extra;
  for (const e of state.enemies) {
    if (left <= 0) break;
    if (e === u.foe || e.hp <= 0) continue;
    if (Math.hypot(e.x - u.foe.x, e.y - u.foe.y) > spread) continue;
    e.hp -= dmg;
    left--;
  }
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
  state.shots.push({
    x: t.x, y: t.y - 26, target,
    damage: t.level.damage,
    speed: t.member.speed,
    slow: t.member.slow,
    slowFor: t.member.slowFor,
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
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (!inReach(t.x, t.y, e.x, e.y, t.level.range)) continue;
    e.hp -= t.level.damage * dt;
    any = true;
  }
  // Which pose he is in. He has no cooldown to animate, so the drawing follows
  // the only fact there is: whether anything is currently in there with him.
  t.stinking = any;
}

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
      s.target.hp -= s.damage;
      s.target.slow = s.slow;
      s.target.slowFor = s.slowFor;
      s.done = true;
      continue;
    }

    s.x += (dx / d) * step;
    s.y += (dy / d) * step;
  }
  state.shots = state.shots.filter(s => !s.done);
}

// --- building -------------------------------------------------------------------

export const levelOf = (member, n) => member.levels[n - 1];

export function build(state, plot, member) {
  const level = levelOf(member, 1);
  if (state.gold < level.cost) return false;

  state.gold -= level.cost;
  const t = {
    plot, member, level, tier: 1,
    x: plot.x, y: plot.y,
    spent: level.cost,
    cd: 0, recoil: 0, aim: 0, stink: 0, stinking: false,
    rally: null,
    smell: null
  };
  state.towers.push(t);
  if (t.member.kind === 'aura') t.smell = smellSpots(state, t);
  makeUnit(state, t);
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

export function step(state, dt) {
  updateWaves(state, dt);
  updateTowers(state, dt);
  updateUnits(state, dt);
  updateShots(state, dt);
  updateEnemies(state, dt);
}

export { family, memberById, maps, enemyTypes, START_GOLD, START_LIVES };
