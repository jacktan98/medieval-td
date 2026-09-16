// The Shadow Thug: an enemy the towers cannot see. Node only.
//
//   node tools/unseen.mjs
//
// Every check below drives the modules that ship — pickTarget from src/enemies.js,
// updateTowers from src/towers.js, updateShots from src/projectiles.js and
// updateUnits from src/units.js — against a board built the way the game builds
// one. Nothing here is a model of the mechanic; it is the mechanic, minus drawing.
//
// IT EXISTS BECAUSE THE RULE IS A NEGATIVE, and a negative is the kind of thing
// that passes by accident. "No projectiles can hit him" is satisfied just as well
// by a tower that is broken, a shot that never spawns, or an enemy who is not on
// the board at all — so every check that asserts nothing happened is paired with
// one that makes the same thing happen once the rule stops applying. A tower that
// will not shoot him has to shoot him the moment a soldier takes hold.
//
// THE OWNER'S BRIEF, which is what the sections below are:
//
//   "a thug that strikes a lot harder and can turn invisible when not facing a
//    soldier. This invisibility is like assassins invisibility where no
//    projectiles can hit it but any AOE damage can still hurt him if he is nearby
//    the blast. Only then when a soldier faces him, he now can be targeted like a
//    normal enemy."
//
// Four claims, and they are checked in that order: he is invisible; projectiles
// cannot reach him; a blast can; a soldier reveals him. The fifth section is the
// pierce, which is measured end to end through units.js rather than read off the
// def — the same path tools/armour.mjs uses for the Giant's club, because an
// enemy's blow is a different call site from a tower's shot.

import { enemyTypes } from '../src/data/waves.js';
import { families, garrisonUnits } from '../src/data/towers.js';
import { pickTarget } from '../src/enemies.js';
import { makeTower, updateTowers } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { updateUnits, unseen, hidden } from '../src/units.js';
import { taken, pierceOf, typeOf } from '../src/data/armour.js';
import { useLevel, levels } from '../src/level.js';

const DT = 1 / 60;
let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(60)} ${detail}`);
  if (!cond) bad++;
};

const SHADOW = enemyTypes.shadow_inf;
const THUG = enemyTypes.light_inf;
const barracks = families.find(f => f.id === 'barracks').tiers;

// A board with one road under it, because a route is what `remaining` is measured
// along and pickTarget sorts on that. The first drawn level serves.
useLevel(0);
const LV = levels[0];

const foe = (def, x, y, over = {}) => ({
  def, x, y, hp: def.hp, maxHp: def.hp, route: 0, lane: 1, s: 200,
  foe: null, acd: 1, thrust: 0, halted: false, leaked: false, statuses: [],
  face: -1, ...over
});

const world = (over = {}) => ({
  towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [],
  splats: [], impacts: [], smoke: [], gold: 0, lives: 20, ...over
});

console.log('\n--- he is not there until somebody has hold of him ---\n');

{
  const e = foe(SHADOW, 300, 200);
  ok(unseen(e), 'a Shadow Thug with no soldier on him is unseen', `foe ${e.foe}`);

  e.foe = { def: {}, x: 300, y: 200 };
  ok(!unseen(e), 'and is plainly there the moment one takes hold', 'foe set');
  e.foe = null;
  ok(unseen(e), 'and gone again when that man lets go or dies', 'foe cleared');

  // EVERY OTHER CREATURE IN THE GAME IS ALWAYS VISIBLE, which is the half that
  // would go unnoticed: a predicate reading the wrong field could make the whole
  // roster invisible and every check above would still pass.
  const always = Object.entries(enemyTypes)
    .filter(([id]) => id !== 'shadow_inf')
    .filter(([, def]) => unseen(foe(def, 300, 200)));
  ok(!always.length, 'and nothing else on the road is ever unseen',
    always.length ? always.map(([id]) => id).join(', ')
                  : `${Object.keys(enemyTypes).length - 1} other type(s) checked`);

  // THE TWO CLOAKS ARE TWO FIELDS, and this is why. `hidden` pairs with a
  // per-frame `exposed` that updateUnits computes for a SOLDIER; an enemy has
  // none, so a Shadow Thug wearing `hidden: true` would read as `!undefined` —
  // invisible from spawn to death with nothing able to touch him but a splash.
  // Neither predicate may answer for the other's creature.
  const assassinMan = barracks.find(t => t.name === 'Assassin Guild').soldier;
  ok(!unseen({ def: assassinMan, foe: null }),
    'an assassin is not "unseen" — that is the enemy\'s field', `hidden ${!!assassinMan.hidden}`);
  ok(!hidden({ def: SHADOW, exposed: false }),
    'and a Shadow Thug is not "hidden" — that is the soldier\'s', `unseen ${!!SHADOW.unseen}`);
}

console.log('\n--- no projectile can reach him ---\n');

{
  // EVERY TOWER IN THE GAME AIMS THROUGH pickTarget, so this one call is the whole
  // of the rule at the aiming end — and it is asked at Infinity as well as at a
  // range, because a global ability sweeps the board with no reach at all.
  const e = foe(SHADOW, 300, 200);
  ok(pickTarget([e], 300, 200, 400) === null,
    'pickTarget will not pick him', 'nothing in reach');
  ok(pickTarget([e], 300, 200, Infinity) === null,
    'and not at Infinity either, which is what a global ability asks',
    'still nothing');

  // AND THE SAME CALL RETURNS HIM the moment he is held, which is the check that
  // stops the two above passing because the fixture was wrong.
  e.foe = { def: {}, x: 300, y: 200 };
  ok(pickTarget([e], 300, 200, 400) === e,
    'and picks him the moment a soldier has him', 'returned');
  e.foe = null;

  // A SHADOW THUG DOES NOT SCREEN AN ORDINARY ONE. A tower offered both must take
  // the thug — not "the nearest", which would be the invisible man standing in
  // front of him.
  const ordinary = foe(THUG, 310, 200, { s: 100 });
  ok(pickTarget([e, ordinary], 300, 200, 400) === ordinary,
    'and shoots past him at the man it can see', ordinary.def.name);
}

{
  // THROUGH THE REAL TOWER LOOP, which is the statement the check above only
  // implies. A Crossbow Tower with him alone in front of it must produce no shot
  // at all over a span several reloads long; the same tower with an ordinary thug
  // there must produce several, or the fixture is what is silent.
  const archery = families.find(f => f.id === 'archery').tiers;
  const rung = archery.find(t => t.tier === 3);

  const shotsAt = def => {
    const t = makeTower({ x: 300, y: 260 }, families.find(f => f.id === 'archery'), rung);
    const st = world({ towers: [t], enemies: [foe(def, 300, 200)] });
    let fired = 0;
    for (let i = 0; i < 60 * 6; i++) {
      const before = st.shots.length;
      updateTowers(st, DT);
      fired += st.shots.length - before;
      st.shots.length = 0;
    }
    return fired;
  };

  const atShadow = shotsAt(SHADOW);
  const atThug = shotsAt(THUG);
  ok(atShadow === 0, `a ${rung.name} standing over him never looses`,
    `${atShadow} shot(s) in six seconds`);
  ok(atThug > 0, 'and empties its quiver at an ordinary thug in the same spot',
    `${atThug} shot(s) in six seconds`);
}

{
  // AND A SHOT ALREADY IN THE AIR does not land on him either. This is the one gap
  // the aiming test cannot close: a tower may loose at him perfectly legally while
  // a soldier has hold of him, and that soldier may die before the arrow arrives.
  //
  // Driven by taking the hold away mid-flight, which is exactly what a dying
  // blocker does.
  const inFlight = release => {
    const e = foe(SHADOW, 300, 120, { foe: { def: {}, x: 300, y: 200 } });
    const arrow = {
      x: 300, y: 260, speed: 220, target: e, damage: 40, type: 'physical', pierce: 0,
      ammo: { kind: 'arrow' }, fromX: 300, angle: 0, dead: false
    };
    const st = world({ enemies: [e], shots: [arrow] });
    for (let i = 0; i < 60 * 3 && !arrow.dead; i++) {
      if (release && i === 6) e.foe = null;
      updateShots(st, DT);
    }
    return e.def.hp - e.hp;
  };

  ok(inFlight(false) === 40, 'an arrow lands on him while a soldier still holds him',
    `${inFlight(false)} of 40`);
  ok(inFlight(true) === 0, 'and passes through him if that man dies on the way',
    `${inFlight(true)} of 40`);
}

console.log('\n--- but a blast still finds him ---\n');

{
  // THE OWNER'S SECOND SENTENCE, and the half that keeps him beatable without a
  // squad. A splash is thrown at a patch of GROUND and hurts whoever is standing
  // in it — there is no aiming step in that loop to skip him at.
  //
  // AIMED AT A DIFFERENT MAN ENTIRELY, on purpose: the rock is targeted at an
  // ordinary thug beside him, so nothing in this fixture ever asks the board about
  // the Shadow Thug at all. He is caught because he is standing there.
  const shadow = foe(SHADOW, 300, 200);
  const mark = foe(THUG, 340, 200, { s: 100 });
  const rock = {
    x: 340, y: 200, groundY: 200, from: { x: 300, y: 300 }, to: { x: 340, y: 200 },
    t: 0, flight: 0.5, lift: 40, speed: 0, target: mark, damage: 60, type: 'physical',
    pierce: 0, splash: 70, ammo: { kind: 'rock', impact: true, landSound: false },
    fromX: 300, dead: false
  };
  const st = world({ enemies: [shadow, mark], shots: [rock] });
  for (let i = 0; i < 60 * 2 && !rock.dead; i++) updateShots(st, DT);

  ok(unseen(shadow), 'he is still unseen when the rock comes down', 'nobody holds him');
  ok(shadow.def.hp - shadow.hp === 60, 'and the blast hurts him anyway, for all of it',
    `${shadow.def.hp - shadow.hp} of 60`);
  ok(mark.def.hp - mark.hp === 60, 'exactly as it hurts the man it was thrown at',
    `${mark.def.hp - mark.hp} of 60`);

  // AND OUT OF THE PATCH HE IS UNTOUCHED, which is what makes the check above a
  // check of the splash rather than of some blanket that hits everything.
  const far = foe(SHADOW, 600, 200);
  const st2 = world({ enemies: [far, mark], shots: [{ ...rock, dead: false, t: 0 }] });
  for (let i = 0; i < 60 * 2; i++) updateShots(st2, DT);
  ok(far.hp === far.def.hp, 'while one standing clear of it takes nothing',
    `${far.def.hp - far.hp} at 300px away`);
}

console.log('\n--- and a soldier is what reveals him ---\n');

{
  // THE COUNTER-PLAY, through updateUnits rather than through the predicate. The
  // block pass deliberately does NOT ask whether it can see him — an enemy nothing
  // could reveal would be an enemy with no answer — so a squad walking into him
  // takes hold, and taking hold is what makes him a target.
  const post = { def: { range: 300 }, fam: { id: 'barracks' }, abilities: [],
                 x: 300, y: 220, rally: { x: 300, y: 200 } };
  const man = barracks.find(t => t.name === 'Knight\'s Hall').soldier;
  const u = {
    def: man, x: 300, y: 205, rx: 300, ry: 205, hp: man.hp, maxHp: man.hp,
    foe: null, holds: false, cd: 0, thrust: 0, hold: 0, respawn: 0, face: 1,
    statuses: [], tower: post, struckFrom: 0
  };
  const e = foe(SHADOW, 300, 200, { hp: 1e6, maxHp: 1e6 });
  const st = world({ towers: [post], enemies: [e], units: [u] });

  const wasUnseen = unseen(e);
  let took = 0;
  for (let i = 0; i < 60 * 2; i++) { updateUnits(st, DT); if (e.foe) { took = i; break; } }

  ok(wasUnseen, 'he walks up to the squad unseen', 'before the pass');
  ok(!!e.foe && !unseen(e), 'a soldier takes hold of him and he is a target again',
    `held after ${took} frame(s)`);
  ok(pickTarget([e], 300, 260, 400) === e,
    'and every tower on the board can see him from that moment',
    'pickTarget returns him');
}

{
  // AND EVERY BOARD CAN BUILD THE THING THAT ANSWERS HIM, which is the assumption
  // his whole design rests on and the one that a future level file could quietly
  // break. Archery, siege and the monastery all shoot; a barracks is the only
  // family that sends a man to take hold of him, and taking hold is the only way
  // he becomes a target.
  //
  // A board that capped the ladder below a barracks and sent Shadow Thugs would be
  // unwinnable, and nothing else in the project would say so — the waves would
  // spawn, the towers would build, and the road would simply never be defended.
  // `?? 4` RATHER THAN `|| 4`, which is the difference between a check and a
  // decoration. The first version read `lv.maxTier || 4`, so a board capped at 0 —
  // the exact thing this is looking for — fell through to 4 and passed. It was
  // caught by trying the mutation: the tutorial was capped at 0 and the check went
  // on saying all twelve were fine.
  const bar = families.find(f => f.id === 'barracks').tiers;
  const bare = levels.filter(lv => {
    const max = lv.maxTier ?? 4;
    return !bar.some(t => t.tier <= max || (lv.allow || []).includes(t.name));
  });
  ok(!bare.length, 'every board in the game can build a barracks to answer him',
    bare.length ? bare.map(l => l.id).join(', ') : `${levels.length} board(s) checked`);
}

console.log('\n--- his blow lands whole on every man in the game ---\n');

{
  // MEASURED END TO END THROUGH units.js, which is a different call site from a
  // tower's shot — the attacker and the target the other way round. tools/armour.mjs
  // makes the same measurement for the Giant's club and the note there explains why
  // it is run rather than argued about.
  const swing = (soldierDef, enemyDef) => {
    const post = { def: {}, fam: { id: 'barracks' }, abilities: [], x: 100, y: 100 };
    const u = {
      def: soldierDef, x: 100, y: 100, rx: 100, ry: 100,
      hp: soldierDef.hp, maxHp: soldierDef.hp,
      foe: null, cd: 0, thrust: 0, hold: 0, respawn: 0, face: 1, statuses: [],
      tower: post, struckFrom: 0
    };
    const e = foe(enemyDef, u.x + 6, u.y, { hp: 1e6, maxHp: 1e6, s: 300 });
    const st = world({ towers: [post], enemies: [e], units: [u] });
    const before = u.hp;
    for (let i = 0; i < 60 * 8 && u.hp === before; i++) updateUnits(st, DT);
    return Math.round(before - u.hp);
  };

  ok(pierceOf(SHADOW) === 2 && typeOf(SHADOW) === 'physical',
    'he breaks two ranks of physical plate', `x${pierceOf(SHADOW)} ${typeOf(SHADOW)}`);

  // TWO RANKS IS THE HEAVIEST PLATE ANY SOLDIER WEARS, so the break is not a
  // discount on this board, it is a flat rate. Read off the roster rather than
  // typed, so a soldier given high plate one day fails this rather than quietly
  // making the paragraph false.
  const men = Object.fromEntries(barracks.filter(t => t.soldier)
    .map(t => [t.soldier.name, t.soldier]));
  const wearers = [...Object.values(men), ...Object.values(garrisonUnits)];
  const heaviest = Math.max(...wearers.map(m =>
    ['none', 'low', 'med', 'high'].indexOf((m.armour && m.armour.physical) || 'none')));
  ok(heaviest <= pierceOf(SHADOW),
    'and nothing in the game wears more physical plate than he breaks',
    `heaviest worn is rank ${heaviest}, he breaks ${pierceOf(SHADOW)}`);

  const landed = Object.entries(men).map(([name, m]) => [name, swing(m, SHADOW)]);
  ok(landed.every(([, n]) => n === SHADOW.damage),
    `so his ${SHADOW.damage} lands whole on every rung of the barracks`,
    landed.map(([n, v]) => `${n} ${v}`).join(', '));

  // AND THE BREAK IS WHAT IS DOING IT. The same swing with the pierce taken off
  // must land for LESS on the one man who wears enough to feel it, or the check
  // above has become a check of nothing.
  const blunt = swing(men.Paladin, { ...SHADOW, pierce: 0 });
  ok(blunt === taken(SHADOW.damage, 'physical', men.Paladin.armour, 0) && blunt < SHADOW.damage,
    'and the same blow without the break does not',
    `${blunt} on a Paladin, against ${SHADOW.damage} with it`);

  // HE IS THE ONLY ONE ON THE ROAD. The Giant breaks one rank, which moves the
  // Paladin alone, and every other creature is stopped by somebody's plate.
  //
  // THE BOSS IS THE OTHER, and the first version of this check said "the only
  // creature in the game" and failed on him. He carries the same two ranks, so the
  // honest claim is narrower: the Captain is a boss, arrives once, and being flat
  // against the ladder is part of being a boss. What is new is an ORDINARY enemy
  // with that property, at wave-three prices.
  const flat = Object.entries(enemyTypes).filter(([, def]) =>
    typeOf(def) === 'physical' &&
    Object.values(men).every(m => taken(def.damage, 'physical', m.armour, pierceOf(def)) === def.damage));
  const rank = flat.filter(([, def]) => !def.boss);
  ok(rank.length === 1 && rank[0][0] === 'shadow_inf',
    'and he is the only creature on the road whose blow is flat against all of them',
    rank.map(([id]) => id).join(', ') || 'none');
  ok(flat.some(([, def]) => def.boss),
    'a thing only the boss could do until now',
    flat.filter(([, def]) => def.boss).map(([id]) => id).join(', ') || 'no boss does');
}

console.log(bad
  ? `\n${bad} thing(s) about the Shadow Thug are not true.`
  : '\nThe Shadow Thug behaves.');
process.exit(bad ? 1 : 0);
