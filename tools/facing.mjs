// Which way a body lies, and which way it is thrown. Node only.
//
//   node tools/facing.mjs
//
// A corpse faces the blow that killed it, and is thrown away from it. That is
// one rule but it lives in four files — the shot records where it was fired
// from, projectiles.js and units.js stamp `struckFrom` on the victim, the two
// death sweeps pass it to dropCorpse, and corpses.js derives the throw from it.
// Nothing in any of those files reads wrong on its own if the rule breaks, which
// is why it is checked here.
//
// It replaced "the body keeps the facing it was walking with", and the case that
// showed the difference is the common one: a militiaman walking left, shot by a
// tower on his right. He used to fall with his back to the arrow and fly toward
// the archer that killed him. Both halves came from the one number, so both are
// fixed by the one change.
//
// Melee sets `struckFrom` the same way, from the attacker's x, at both of the
// places damage is dealt in units.js. It is not exercised here because standing
// a fight up needs a tower, a rally point and a path; the arrow is the same rule
// through the same funnel.

import { updateShots } from '../src/projectiles.js';
import { updateEnemies } from '../src/enemies.js';
import { enemyTypes } from '../src/data/waves.js';
import { arrow, barracks } from '../src/data/towers.js';
// The soldiers throw now too — see the last block of the thrower section.
import { makeUnits, updateUnits } from '../src/units.js';
import { abilityById } from '../src/data/abilities.js';
import { level } from '../src/level.js';
import { at as pointOn, laneOf } from '../src/route.js';
import { KNOCKBACK } from '../src/corpses.js';
import { enemyStance } from '../src/render.js';
import { raiseGuard } from '../src/enemies.js';
import { wornBy, stageOf } from '../src/data/armour.js';

// Where on the road the test stands its victim. An enemy's position is DERIVED
// from its route and how far along it has walked — setting x and y directly does
// nothing, they are overwritten on the next step — so the fixture has to name a
// place on the road instead of a coordinate. 400px along route 0 is somewhere in
// the middle of map 1's first straight.
const AT = 400;
const SPOT = pointOn(laneOf(level.routes[0], 1), AT);

// One arrow, lethal, fired from `side` of the enemy, at one walking `walkFace`.
// Everything else about the enemy is the minimum updateEnemies will accept.
function kill(side, walkFace) {
  const state = {
    enemies: [], corpses: [], shots: [], hits: [], splats: [], impacts: [], units: [],
    gold: 0, lives: 20
  };
  // `route` and `s` are how an enemy knows where it is now — a road index and a
  // distance along it. Route 0 at s 0 is the spawn end of the first road, which
  // is fine here: the arrow kills it on the first step and nothing about this
  // test depends on where it was standing.
  const e = {
    // Standing still, so "the body starts on the spot the man died" is an exact
    // claim. A walking victim advances a pixel in the frame the arrow lands and
    // the body drops a pixel further on, which is correct behaviour and just
    // noise in a test about which way it falls.
    def: { ...enemyTypes.light_inf, speed: 0 }, x: SPOT.x, y: SPOT.y, hp: 1, maxHp: 80,
    face: walkFace, route: 0, s: AT, lane: 1,
    acd: 0, thrust: 0, leaked: false
  };
  state.enemies.push(e);
  // `ammo` is not optional furniture: it carries the projectile's speed, its
  // drawing, and the `kind` stamped on the victim as `killedBy`. A shot in the
  // game always has one, so a fixture without one is testing something the game
  // cannot produce.
  state.shots.push({
    x: SPOT.x + 1, y: SPOT.y, angle: 0, ammo: arrow,
    fromX: SPOT.x + side * 200, target: e, damage: 99, speed: 999
  });

  updateShots(state, 1 / 60);
  updateEnemies(state, 1 / 60);

  const c = state.corpses[0];
  if (!c) throw new Error('no body was dropped');
  // dropCorpse stores where the body ENDS UP and animates back from the spot
  // the man died on, so the death spot is one knockback the other way.
  return { face: c.face, rest: c.x, death: c.x + c.face * KNOCKBACK };
}

// The tower is named as a SIDE of the victim rather than an absolute x, since
// where the victim stands is now the road's business and not the test's.
const CASES = [
  ['walking LEFT,  shot from the RIGHT',  1, -1,  1],
  ['walking LEFT,  shot from the LEFT ', -1, -1, -1],
  ['walking RIGHT, shot from the RIGHT',  1,  1,  1],
  ['walking RIGHT, shot from the LEFT ', -1,  1, -1]
];

let bad = 0;
for (const [label, side, walkFace, wantFace] of CASES) {
  const r = kill(side, walkFace);
  const facesBlow = r.face === wantFace;
  // Thrown away from what it faces, and starting on the spot the man died.
  const thrownBack = Math.sign(r.rest - r.death) === -r.face;
  const onTheSpot = Math.abs(r.death - SPOT.x) < 1e-6;
  const ok = facesBlow && thrownBack && onTheSpot;
  if (!ok) bad++;

  console.log(
    `${label}  ->  faces ${r.face > 0 ? 'RIGHT' : 'LEFT '}, ` +
    `dies at ${r.death.toFixed(0)}, settles at ${r.rest.toFixed(0)} ` +
    (ok ? '  ok'
        : `  WRONG:${facesBlow ? '' : ' should face the blow'}` +
          `${thrownBack ? '' : ' should be thrown away from its facing'}` +
          `${onTheSpot ? '' : ' should start on the death spot'}`)
  );
}

// The whole point of the change: facing must depend on the blow and NOT on the
// direction of travel. Same tower side, both headings, same answer.
const pair = [kill(600, -1).face, kill(600, 1).face];
if (pair[0] !== pair[1]) {
  bad++;
  console.log('\nWRONG: the body still turns with the way it was walking.');
}

// --- WHICH DRAWING AN ENEMY IS SHOWING ----------------------------------------
//
// Two enemies fight at both distances now, and each carries two Defaults and two
// Attacks — or, for the doctor, one Default and two Attacks. Four states, and
// the rule that picks between them is one line in render.js that no screenshot
// would catch getting subtly wrong: a swapped pair reads as "the artist drew him
// oddly" rather than as a bug.
//
// `e.foe` is the whole test. It is not how near the soldier is: it is whether one
// has hold of him.
console.log('\nWhich drawing an enemy shows\n');
{
  const ok = (cond, label, detail = '') => {
    console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
    if (!cond) bad++;
  };
  const state = (def, foe, thrust) => ({ def, foe, thrust });

  // DERIVED, not listed. It was ['archer_inf', 'plague_inf'] and the Dark Priest
  // arrived with a `melee` block of his own — a list would have quietly not
  // checked him, which is the failure mode a hand-written roster always has.
  for (const [id, d] of Object.entries(enemyTypes)) {
    if (!d.melee) continue;
    const far = enemyStance(state(d, null, 0));
    const loose = enemyStance(state(d, null, 1));
    const near = enemyStance(state(d, {}, 0));
    const swing = enemyStance(state(d, {}, 1));

    console.log(`      ${d.name}: standing ${far.stand.sprite} / ${near.stand.sprite}, ` +
      `striking ${loose.swing.sprite} / ${swing.swing.sprite}`);

    ok(far.stand.sprite === d.sprite, `${d.name} walks in his own Default`, far.stand.sprite);
    ok(loose.swing.sprite === d.attack.sprite,
      'and strikes at a distance with his ranged Attack', loose.swing.sprite);
    ok(swing.swing.sprite === d.melee.attack.sprite,
      'and with the close one the moment somebody has hold of him', swing.swing.sprite);
    // THE DOCTOR SHARES ONE STANDING POSE and the archer does not, which is the
    // artist's decision rather than the code's — so what is checked is that each
    // gets what his own def carries.
    const expect = d.melee.default ? d.melee.default.sprite : d.sprite;
    ok(near.stand.sprite === expect,
      d.melee.default ? 'and stands differently while he is held'
                      : 'and keeps his one standing pose while he is held',
      near.stand.sprite);
  }

  // AND NOTHING ELSE CHANGED. An enemy with no `melee` block has one pair and
  // shows it whatever is happening to him.
  const thug = enemyTypes.light_inf;
  const held = enemyStance({ def: thug, foe: {}, thrust: 1 });
  ok(held.stand.sprite === thug.sprite && held.swing.sprite === thug.attack.sprite,
    'a thug has one pair and shows it however he is caught', thug.sprite);

  // THE BLOCKER'S THIRD STANCE, and the check that matters is not which drawing
  // he shows — it is that the drawing and the PLATE agree.
  //
  // Two files answer "what state is this man in": enemyStance in render.js picks
  // the picture, wornBy in data/armour.js picks what a blow meets. They read the
  // same three conditions in the same order, in different files, and nothing but
  // this makes them stay in step. A Blocker drawn behind his shield while taking
  // arrows as though it were down is the bug this enemy would ship with, and it
  // is invisible: the numbers are right on the card, the drawing is right on the
  // road, and only the damage is wrong.
  const bl = enemyTypes.blocker_inf;
  const CASES = [
    ['walking',  { def: bl, foe: null, guard: 0, thrust: 0 }, bl.sprite,       bl.armour],
    ['guarding', { def: bl, foe: null, guard: 3, thrust: 0 }, bl.guard.sprite, bl.guard.armour],
    ['held',     { def: bl, foe: {},   guard: 0, thrust: 0 }, bl.sprite,       bl.fightArmour],
    // BOTH AT ONCE, and this is the row that pins the precedence down. A Blocker
    // who was shot and then caught is FIGHTING: he cannot hold a shield up and
    // swing, which is the whole counter-play. If this row ever flips, shooting
    // him first becomes the way to protect him.
    ['held while guarding', { def: bl, foe: {}, guard: 3, thrust: 0 }, bl.sprite, bl.fightArmour]
  ];
  for (const [label, e, sprite, armour] of CASES) {
    const st = enemyStance(e);
    const worn = wornBy(e);
    ok(st.stand.sprite === sprite, `a Blocker ${label} is drawn as ${sprite}`, st.stand.sprite);
    ok(worn === armour,
      `and takes a blow on ${armour.physical}/${armour.magic} plate`,
      `${worn.physical}/${worn.magic}`);
  }
  // He never swings with anything but his one Attack: the guard is a stance, not
  // a blow, so it must not reach the swing half of the pair.
  ok(CASES.every(([, e]) => enemyStance(e).swing.sprite === bl.attack.sprite),
    'and swings with his one Attack in every state', bl.attack.sprite);

  // AND THE PRIEST'S CAST, which is the same shape of thing: a stance that
  // replaces the standing half and leaves the swing alone. Two creatures now have
  // one, so what is checked is the RULE rather than either of them — held beats
  // the stance, the stance beats the Default, and nothing touches the swing.
  const dp = enemyTypes.dark_priest;
  const casting = enemyStance({ def: dp, foe: null, guard: 0, cast: 1.2, thrust: 0 });
  ok(casting.stand.sprite === dp.heal.sprite, 'a Dark Priest casting is drawn as his Heal pose',
    casting.stand.sprite);
  ok(casting.swing.sprite === dp.attack.sprite,
    'and still strikes with his own Attack', casting.swing.sprite);
  // PINNED MID-CAST HE IS FIGHTING, not casting. updateEnemies clears the clock on
  // that frame; this is the drawing agreeing with it, so a priest cannot be shown
  // healing while a spearman has hold of him.
  const caught = enemyStance({ def: dp, foe: {}, guard: 0, cast: 1.2, thrust: 0 });
  ok(caught.stand.sprite === dp.sprite && caught.swing.sprite === dp.melee.attack.sprite,
    'and being caught mid-cast puts him back in the melee pair', caught.swing.sprite);

  // AND A SHIELD BELONGS TO WHOEVER HAS ONE IN THE DATA. Every enemy without a
  // `guard` block answers the same however long its `guard` field has been sitting
  // at zero — the field is on all of them so that nothing has to test for it, and
  // that is only safe if it does nothing.
  //
  // DERIVED RATHER THAN A LIST OF EXCEPTIONS. It read `if (id === 'blocker_inf')
  // continue` until the Captain Thug arrived carrying a shield of his own, and a
  // hard-coded exception is a check that quietly stops being about anything the
  // second the data grows. Asking the def is the same question and it stays true.
  for (const [id, d] of Object.entries(enemyTypes)) {
    if (d.guard) continue;
    const calm = enemyStance({ def: d, foe: null, guard: 0, cast: 0, thrust: 0 });
    const shot = enemyStance({ def: d, foe: null, guard: 5, cast: 0, thrust: 0 });
    ok(calm.stand.sprite === shot.stand.sprite && wornBy({ def: d, foe: null, guard: 5 }) === (d.armour || null),
      `${d.name} has no shield to raise`, calm.stand.sprite);
  }

  // --- AND THE BOSS, WHOSE TEN LIVING DRAWINGS ARE THE POINT OF THIS FILE -------
  //
  // He swaps between more pictures than anything else in the game by a factor of
  // two, and every one of them has a plate that has to agree with it. This walks
  // all ten and checks the DRAWING against the ARMOUR each time, which is the one
  // thing that has to hold: a boss shown behind a shield while taking damage as
  // though it were down is the bug this whole file exists for.
  {
    const c = enemyTypes.captain_thug;
    const base = { def: c, foe: null, guard: 0, cast: 0, thrust: 0, nock: 0, shot: 0, act: null, stage: 1 };
    const rank = f => { const a = wornBy(f); return `${a.physical}/${a.magic}`; };
    const shows = (f, sprite, plate, label) => {
      const s = enemyStance(f);
      ok(s.stand.sprite === sprite && rank(f) === plate, label, `${s.stand.sprite} in ${rank(f)}`);
    };

    shows({ ...base }, 'captain', 'med/med', 'walking, he is his own Default in medium plate');
    shows({ ...base, guard: 5 }, 'captain_guard', 'high/high', 'shot at, the shield is up and the plate with it');
    shows({ ...base, nock: 0.3 }, 'captain_reload', 'med/med', 'nocking, he is drawn reloading and the shield is off');
    shows({ ...base, act: 'pause' }, 'captain_pause', 'med/med', 'channelling, he is exposed in medium');
    shows({ ...base, act: 'mend' }, 'captain_mend', 'high/high', 'mending, he is behind high plate again');
    shows({ ...base, stage: 2 }, 'captain_raged', 'low/low', 'enraged, he is a new figure in low plate');
    shows({ ...base, act: 'fall' }, 'captain_fall', 'med/med', 'beaten, he holds the dropped sword');
    shows({ ...base, act: 'rest' }, 'captain_dead', 'med/med', 'and then he is on the ground');

    // THE SCRIPT OUTRANKS BEING HELD, which is the one ordering that differs from
    // every other stance in this file. A boss on the ground does not get up
    // because a spearman is standing over him.
    const heldDown = enemyStance({ ...base, act: 'fall', foe: {} });
    ok(heldDown.stand.sprite === 'captain_fall',
      'and a soldier standing over him cannot take the beat away', heldDown.stand.sprite);

    // AND THE TWO ATTACKS, which is where the stage decides what he even has.
    const far = enemyStance({ ...base });
    const near = enemyStance({ ...base, foe: {} });
    ok(far.swing.sprite === 'captain_shoot' && near.swing.sprite === 'captain_swing',
      'he looses at range and swings when held', `${far.swing.sprite} / ${near.swing.sprite}`);
    const raged = enemyStance({ ...base, stage: 2 });
    const ragedHeld = enemyStance({ ...base, stage: 2, foe: {} });
    ok(raged.swing.sprite === 'captain_rage_swing' && ragedHeld.swing.sprite === 'captain_rage_swing',
      'and enraged he has only the sword, at either distance', raged.swing.sprite);

    // HE HAS NOTHING LEFT TO RAISE OR DRAW IN STAGE 2, and it is an absence in the
    // data rather than a test in the loop: `rage` declares no guard, no bow and no
    // reload. Checked here because the ABSENCE is the mechanism — the drawing and
    // the behaviour both read the same block, so they cannot come apart.
    const now = stageOf({ def: c, stage: 2 });
    ok(!now.guard && !now.ranged && !now.reload,
      'and enraged he has no shield, no bow and no wind-up',
      `guard ${!!now.guard}, bow ${!!now.ranged}, reload ${!!now.reload}`);
    ok(enemyStance({ ...base, stage: 2, guard: 5 }).stand.sprite === 'captain_raged',
      'so a hit that would have raised his shield leaves him walking');
  }
}

// HOW LONG THE SHIELD STAYS UP, through the real updateEnemies rather than by
// reading the number back out of the def.
//
// Three things are being checked and each was a plausible way to get this wrong:
// that a hit raises it at all, that a LATER hit refreshes the full five seconds
// rather than topping up or being ignored, and that it comes down on its own.
// The last is the one with teeth — a shield that never lowered would make him
// unkillable by anything but a soldier, and the wave would still end, so nothing
// would crash and nobody would notice for a while.
console.log('\nHow long the Blocker keeps his shield up\n');
{
  const ok = (cond, label, detail = '') => {
    console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
    if (!cond) bad++;
  };
  const bl = enemyTypes.blocker_inf;
  const road = laneOf(level.routes[0], 1);
  const make = () => {
    const at = pointOn(road, 0);
    return { def: bl, x: at.x, y: at.y, hp: bl.hp, maxHp: bl.hp, face: 1, route: 0, s: 0,
             lane: 1, acd: 0, tcd: 0, thrust: 0, foe: null, halted: false, guard: 0,
             statuses: [], leaked: false };
  };
  const world = e => ({ enemies: [e], units: [], corpses: [], shots: [], hits: [],
                        splats: [], impacts: [], gold: 0, lives: 20 });
  const run = (state, seconds) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) updateEnemies(state, 1 / 60);
  };

  const e = make(); const st = world(e);
  ok(e.guard === 0, 'he walks in with no shield up', String(e.guard));
  raiseGuard(e);
  ok(e.guard === bl.guard.seconds, 'a projectile puts it up for the full time',
    `${e.guard}s`);
  run(st, 3);
  const after3 = e.guard;
  ok(after3 > 1.9 && after3 < 2.1, 'and it counts down in real seconds', `${after3.toFixed(2)}s left`);
  raiseGuard(e);
  ok(e.guard === bl.guard.seconds, 'a second hit refreshes the whole five',
    `${e.guard}s`);
  run(st, 5.2);
  ok(e.guard === 0, 'and it comes down when nothing has hit him for five',
    `${e.guard}s`);

  // AND HE WALKS SLOWER WHILE IT IS UP. Measured as ground covered rather than
  // read off the multiplier, so it is the game's own movement being checked.
  const fast = make(); const fs = world(fast);
  run(fs, 4);
  const slowOne = make(); const ss = world(slowOne);
  raiseGuard(slowOne);
  run(ss, 4);
  const ratio = slowOne.s / fast.s;
  ok(Math.abs(ratio - bl.guard.slow) < 0.02,
    'and covers half the ground while he is behind it',
    `${slowOne.s.toFixed(0)}px against ${fast.s.toFixed(0)}px, ratio ${ratio.toFixed(3)}`);
}

// --- WHICH WAY A THROWER LOOKS ------------------------------------------------
//
// He turns to shoot. The bug this replaces is the one nothing else in the file
// would have caught, because it is not about the drawing — it is about the sign
// the drawing is mirrored by:
//
//   an unheld enemy's heading came from the ROAD and from nothing else. Halted,
//   he never reached the line that sets it, so he kept whatever he had when he
//   stopped walking; walking, the road overwrote it every frame. Either way a
//   thrower could put an arrow into a man standing behind his own shoulder.
//
// So the test stands a soldier on each side of a thrower in turn and asks which
// way he ends up looking. Both cases matter and they take different paths through
// updateEnemies: a man far enough down the road blocks him and he HALTS, and a
// man behind him does not, so he walks on and only turns for the shot.
console.log('\nWhich way a thrower looks\n');
{
  const ok = (cond, label, detail = '') => {
    console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
    if (!cond) bad++;
  };

  // The road at AT and a little either side of it, so "in front" and "behind"
  // are places on his own lane rather than screen coordinates — which is exactly
  // the distinction the bug turned on.
  const ROAD = laneOf(level.routes[0], 1);
  const spotAt = s => pointOn(ROAD, s);

  // One thrower on the road, one soldier at `s` along the same lane, one step.
  // `face` starts pointing the WRONG way on purpose: if the step leaves it
  // alone the test fails, which is what the old code did.
  function look(id, s, startFace) {
    const d = enemyTypes[id];
    const here = spotAt(AT);
    const there = spotAt(s);
    const e = {
      def: d, x: here.x, y: here.y, hp: d.hp, maxHp: d.hp,
      face: startFace, route: 0, s: AT, lane: 1,
      acd: 0, tcd: 0, thrust: 0, foe: null, halted: false, leaked: false
    };
    const u = { x: there.x, y: there.y, hp: 100, maxHp: 100, respawn: 0, def: {} };
    const state = {
      enemies: [e], units: [u], corpses: [], shots: [], hits: [],
      splats: [], impacts: [], gold: 0, lives: 20
    };
    updateEnemies(state, 1 / 60);
    return { face: e.face, halted: e.halted, toward: Math.sign(there.x - here.x) };
  }

  // Every thrower in the game, derived for the same reason the stance loop above
  // is: the Dark Priest throws too, and a list would not have known.
  for (const [id, d] of Object.entries(enemyTypes)) {
    if (!d.ranged) continue;
    // Inside his reach on both sides, whatever that reach is — the priest's 100
    // is half the archer's 200, so one fixed offset no longer serves all three.
    const near = Math.round(d.ranged.range * 0.5);
    const ahead = look(id, AT + near, -1);
    const behind = look(id, AT - near, 1);

    ok(ahead.face === ahead.toward,
      `${d.name} faces a soldier in front of him`,
      `${ahead.face > 0 ? 'RIGHT' : 'LEFT '}, halted ${ahead.halted}`);
    ok(behind.face === behind.toward,
      'and turns round for one behind him',
      `${behind.face > 0 ? 'RIGHT' : 'LEFT '}, halted ${behind.halted}`);
    // The two answers must DIFFER, or the test would pass on a figure that
    // simply always looked one way.
    ok(ahead.face !== behind.face, 'and the two are not the same answer',
      `${ahead.face} vs ${behind.face}`);
  }

  // AND A MAN WITH NOTHING IN RANGE STILL FOLLOWS THE ROAD. The turn must not
  // have cost the walk its heading — this is the case that would break if the
  // road's line were simply deleted rather than yielded on the shot.
  {
    const d = enemyTypes.archer_inf;
    const here = spotAt(AT);
    const e = {
      def: d, x: here.x, y: here.y, hp: d.hp, maxHp: d.hp,
      face: 0, route: 0, s: AT, lane: 1,
      acd: 0, tcd: 0, thrust: 0, foe: null, halted: false, leaked: false
    };
    const state = {
      enemies: [e], units: [], corpses: [], shots: [], hits: [],
      splats: [], impacts: [], gold: 0, lives: 20
    };
    updateEnemies(state, 1 / 60);
    const road = Math.sign(pointOn(ROAD, AT).tx);
    ok(e.face === road, 'and an empty road still sets his heading',
      `${e.face > 0 ? 'RIGHT' : 'LEFT '}`);
  }

  // AND A CAPTOR OUTRANKS A MARK. A doctor held from one side while a soldier
  // stands on the other faces the man with hold of him — the two blocks run in
  // that order for exactly this reason.
  {
    const d = enemyTypes.plague_inf;
    const here = spotAt(AT);
    const e = {
      def: d, x: here.x, y: here.y, hp: d.hp, maxHp: d.hp,
      face: 0, route: 0, s: AT, lane: 1,
      acd: 0, tcd: 0, thrust: 0, foe: null, halted: false, leaked: false
    };
    const captor = { x: here.x - 10, y: here.y, hp: 100, maxHp: 100, respawn: 0, def: {} };
    const mark = { x: here.x + 60, y: here.y, hp: 100, maxHp: 100, respawn: 0, def: {} };
    e.foe = captor;
    const state = {
      enemies: [e], units: [captor, mark], corpses: [], shots: [], hits: [],
      splats: [], impacts: [], gold: 0, lives: 20
    };
    updateEnemies(state, 1 / 60);
    ok(e.face === -1, 'and a captor outranks a mark on the other side',
      `${e.face > 0 ? 'RIGHT' : 'LEFT '}`);
  }

  // --- AND NOW THE OTHER ARMY THROWS TOO -----------------------------------------
  //
  // An assassin with Knife Throw is the first SOLDIER in the game that attacks
  // something it is not standing next to, so he inherits the whole of the bug this
  // section was written for: a settled man faces the heading of his post, and
  // without a rule of his own he would flick a knife over his shoulder at a man
  // behind him and be drawn looking the other way.
  //
  // His rule is the enemies' rule with the same ranking. `foe` first — somebody
  // with hold of him outranks a mark at 200px — then the throw, then the post. It
  // is checked here rather than in tools/abilities.mjs because this is the file
  // that owns the question, and because the failure is identical: it is the exact
  // 202-of-264-wrong that the thrower block above was written to fix.
  {
    const plot = level.plots[0];
    const guild = barracks.find(d => d.name === 'Assassin Guild');

    const throwAt = side => {
      const t = {
        plot, fam: { id: 'barracks' }, def: guild, x: plot.x, y: plot.y,
        rally: null, abilities: ['knife'], hold: 0
      };
      const state = { towers: [t], enemies: [], units: [], shots: [], hits: [],
                      corpses: [], splats: [], impacts: [] };
      makeUnits(state, t);
      state.units.length = 1;
      const u = state.units[0];
      // On his post from the first frame, so nothing below is a man mid-march.
      u.x = u.rx;
      u.y = u.ry;
      // Well inside his reach on either side, and read OFF the ability rather than
      // typed: it has been 200 and is now 100, and a number written here would
      // have made this section fail for a reason that has nothing to do with
      // facing. X rather than any other direction because inRange squashes the
      // vertical for the board's perspective — and because left and right is the
      // only thing `face` decides.
      const near = abilityById('knife').reach * 0.7;
      state.enemies.push({
        def: { r: 10, hp: 1e9, speed: 0, atkCd: 1e9, damage: 0, name: 'dummy' },
        x: u.x + near * side, y: u.y, hp: 1e9, maxHp: 1e9,
        route: 0, lane: 1, s: 0,
        foe: null, acd: 1e9, thrust: 0, halted: false, leaked: false
      });
      // One frame is enough now: the heading is taken from the mark in the same
      // pass that decides whether to throw at it, rather than stored on the throw
      // and read back on the frame after. See the facing chain in units.js.
      updateUnits(state, 1 / 60);
      return { dir: Math.sign(Math.cos(u.face)), threw: state.shots.length };
    };

    const right = throwAt(1);
    const left = throwAt(-1);

    ok(right.threw === 1 && right.dir === 1, 'an assassin faces the man he throws at',
      `RIGHT, ${right.threw} knife`);
    ok(left.threw === 1 && left.dir === -1, 'and turns round for one behind him',
      `LEFT , ${left.threw} knife`);
    ok(right.dir !== left.dir, 'and the two are not the same answer',
      `${right.dir} vs ${left.dir}`);
  }

  // AND HE DOES NOT SPIN, which is the bug that made this block worth writing.
  //
  // The reveal is a quarter second and the reload is eight tenths. The first
  // version turned him toward his mark for the reveal and let him snap back to his
  // post's heading for the rest — so an enemy on his off side flipped him TWICE
  // PER KNIFE, and the owner reported assassins that "flip left and right after
  // throwing knife". The count is the check: over five seconds he throws six times
  // and should turn exactly once, when the first mark appears.
  //
  // Counted rather than asserted as a boolean, because "does it flip" has no good
  // yes/no answer — one turn is correct and eleven is the bug, and only a number
  // tells them apart.
  {
    const plot = level.plots[0];
    const guild = barracks.find(d => d.name === 'Assassin Guild');
    const t = {
      plot, fam: { id: 'barracks' }, def: guild, x: plot.x, y: plot.y,
      rally: null, abilities: ['knife'], hold: 0
    };
    const state = { towers: [t], enemies: [], units: [], shots: [], hits: [],
                    corpses: [], splats: [], impacts: [] };
    makeUnits(state, t);
    state.units.length = 1;
    const u = state.units[0];
    u.x = u.rx;
    u.y = u.ry;

    // ON HIS OFF SIDE, whichever that is: the flip only happens when the mark and
    // the post disagree about which way he should be looking, so the fixture has
    // to put them on opposite sides rather than guess that they are.
    const idle = Math.sign(Math.cos(u.faceIdle)) || 1;
    state.enemies.push({
      def: { r: 10, hp: 1e9, speed: 0, atkCd: 1e9, damage: 0, name: 'dummy' },
      x: u.x - idle * abilityById('knife').reach * 0.7, y: u.y, hp: 1e9, maxHp: 1e9,
      route: 0, lane: 1, s: 0,
      foe: null, acd: 1e9, thrust: 0, halted: false, leaked: false
    });

    let flips = 0;
    let was = Math.sign(Math.cos(u.face)) || 1;
    let knives = 0;
    for (let i = 0; i < 5 * 60; i++) {
      const before = state.shots.length;
      updateUnits(state, 1 / 60);
      if (state.shots.length > before) knives++;
      state.shots.length = 0;          // drained, so nothing has to model flight
      const now = Math.sign(Math.cos(u.face)) || 1;
      if (now !== was) flips++;
      was = now;
    }

    ok(knives >= 5, 'he throws a run of knives at a man on his off side',
      `${knives} in 5s`);
    ok(flips <= 1, 'and turns round once for him rather than once a knife',
      `${flips} turn(s) in ${knives} throws`);
  }
}

console.log(bad
  ? `\n${bad} case(s) wrong.`
  : '\nEvery body faces the blow, every thrower faces his mark, ' +
    'and every figure shows the drawing it should.');
process.exit(bad ? 1 : 0);
