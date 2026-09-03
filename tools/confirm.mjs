// The confirm step: what it takes to spend gold, and what the board promises
// while you are deciding. Node only.
//
//   node tools/confirm.mjs
//
// WHY THIS IS ITS OWN FILE. Every other tool here checks a thing the game DOES.
// This one checks a thing it deliberately does NOT do — a press that spends
// nothing — and an absence is the easiest kind of behaviour to lose. Nothing looks
// broken when a confirm step stops working; the game simply goes back to buying on
// one press, which is exactly what it did before and exactly what the owner asked
// to be rid of: "there are times where I would misclick and an upgrade is done
// accidentally".
//
// Three things can go quietly:
//
//   THE FIRST PRESS STARTS BUYING AGAIN, because a new act was added to the menu
//   and nobody put it in NEEDS_CONFIRM. Then one of the six buttons is armed and
//   the rest are not, which is worse than none of them being — a player who has
//   learnt to tap twice taps twice on a button that acted the first time.
//
//   THE SECOND PRESS STOPS BUYING, if arming is cleared somewhere it should not
//   be. That one is loud and would be found in a minute of play.
//
//   THE DOTTED RING GOES BACK TO PROMISING THE WRONG THING. This is the one that
//   was actually wrong for months: it was drawn at the FURTHEST upgrade a tower
//   could buy, so a Crossbow Tower — which forks into a Musketeer Post at 480 and
//   a Crossbow Sentry at 260 — always drew 480, whichever button you meant. The
//   owner caught it by eye. It now belongs to the armed button, and this checks
//   that it is that button's own answer and not the best of them.
//
// THE FIXTURE PRESSES REAL BUTTONS. `tap` in src/input.js is what a finger reaches,
// and the whole point is that the first press through THAT function spends nothing
// — so this drives it rather than re-implementing the branch it is checking.

import { tap } from '../src/input.js';
import { openMenu, NEEDS_CONFIRM, needsConfirm, armed, armedRange } from '../src/menu.js';
import { level } from '../src/level.js';
import { archery, families } from '../src/data/towers.js';
import { rangeOf } from '../src/towers.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
  if (!cond) bad++;
};

// A board with nothing on it but a purse. `book` and `admin` are null rather than
// missing, because tap() tests `state.book !== null` first and an undefined one
// swallows every press — which is a fixture bug that looks exactly like a broken
// menu, and cost a few minutes here before it was one.
const board = () => ({
  gold: 9999, lives: 20, towers: [], enemies: [], units: [], shots: [], hits: [],
  corpses: [], splats: [], impacts: [], smoke: [],
  menu: null, selected: null, book: null, admin: null, zoom: null,
  started: true, paused: false, result: null, placing: null,
  hoverTower: null, ghost: null, speed: 1
});

const tower = (state, plot, fam, def) => {
  const t = { def, fam, x: plot.x, y: plot.y, plot, tier: def.tier, cd: 0, recoil: 0,
              hold: 0, face: 1, abilities: [], spent: def.cost, aim: 'first',
              aimMode: 0, rally: null, beat: 0, beatT: 0, shots: 0, special: null,
              burst: 0, burstT: 0, hit: [], locked: null, turn: 0 };
  state.towers.push(t);
  return t;
};

const press = (state, item) => tap(state, item.x, item.y);
const button = (state, want) => state.menu.items.find(want);

// --- which buttons ask twice --------------------------------------------------

console.log('\nWhich buttons ask twice\n');

{
  // THE OWNER'S OWN LIST: "this includes selling, building, upgrading, owning
  // abilities". Quoted here rather than derived, so changing the rule has to be
  // done twice — once in the menu and once in the check that says what the menu
  // was supposed to do.
  const WANT = ['build', 'upgrade', 'refund', 'ability'];
  ok(WANT.every(a => NEEDS_CONFIRM.has(a)) && NEEDS_CONFIRM.size === WANT.length,
    'every act that moves gold asks twice', [...NEEDS_CONFIRM].join(', '));

  // AND THE TWO THAT COST NOTHING DO NOT. `rally` only arms a placement — the tap
  // after it is what moves anybody — and `target` cycles a standing order that can
  // be cycled straight back. Ceremony around a free, reversible choice is how a
  // confirm step stops being read.
  ok(!needsConfirm({ act: 'rally' }) && !needsConfirm({ act: 'target' }),
    'and the two that cost nothing do not', 'rally, target');

  // EVERY ACT THE MENU CAN ACTUALLY PRODUCE is on one side of that line or the
  // other. A seventh act added to towerItems and left out of both would be a
  // button that quietly buys on one press.
  const state = board();
  const acts = new Set();
  openMenu(state, level.plots[0], null);
  for (const it of state.menu.items) acts.add(it.act);
  for (const fam of families) {
    if (!fam.tiers) continue;
    for (const def of fam.tiers) {
      const s = board();
      const t = tower(s, level.plots[0], fam, def);
      openMenu(s, t.plot, t);
      for (const it of s.menu.items) acts.add(it.act);
    }
  }
  const known = new Set([...NEEDS_CONFIRM, 'rally', 'target']);
  const loose = [...acts].filter(a => !known.has(a));
  ok(loose.length === 0, 'and the menu makes no act that neither list has heard of',
    loose.join(', ') || [...acts].sort().join(', '));
}

// --- the two presses ------------------------------------------------------------

console.log('\nWhat a press costs\n');

{
  // BUILDING, from an empty plot.
  const state = board();
  openMenu(state, level.plots[0], null);
  const build = button(state, it => it.act === 'build');
  const purse = state.gold;

  press(state, build);
  ok(state.gold === purse && state.towers.length === 0,
    'the first press of a build spends nothing and builds nothing',
    `${state.gold}g, ${state.towers.length} towers`);
  ok(armed(state, build), 'and the button it was is now a tick', build.label);

  press(state, build);
  ok(state.towers.length === 1 && state.gold === purse - build.cost,
    'and the second press builds it',
    `${state.gold}g, ${state.towers.length} tower`);
}

{
  // UPGRADING, and REFUNDING, on a tower that has both.
  for (const [act, tiers] of [['upgrade', archery], ['refund', archery]]) {
    const state = board();
    const t = tower(state, level.plots[0], families[0], tiers[0]);
    openMenu(state, t.plot, t);
    const it = button(state, b => b.act === act);
    const purse = state.gold;
    const was = t.def;

    press(state, it);
    ok(state.gold === purse && t.def === was && state.towers.length === 1,
      `the first press of ${act} changes nothing at all`,
      `${state.gold}g, still ${was.name}`);

    press(state, it);
    const done = act === 'upgrade' ? t.def !== was : state.towers.length === 0;
    ok(done, `and the second press ${act === 'upgrade' ? 'buys the tier' : 'sells the tower'}`,
      act === 'upgrade' ? t.def.name : `${state.gold}g back`);
  }
}

{
  // AN ABILITY, which is the one purchase whose button is a picture rather than a
  // plate — see plateFace in render.js. It arms like the rest.
  const state = board();
  const post = archery.find(d => d.name === 'Musketeer Post');
  const t = tower(state, level.plots[0], families[0], post);
  openMenu(state, t.plot, t);
  const it = button(state, b => b.act === 'ability');
  const purse = state.gold;

  press(state, it);
  ok(state.gold === purse && t.abilities.length === 0,
    'the first press of an ability teaches nothing', it.ability.name);

  press(state, it);
  ok(t.abilities.length === 1 && state.gold === purse - it.ability.cost,
    'and the second press teaches it', t.abilities.join(', '));
}

// --- and what disarms it ----------------------------------------------------------

console.log('\nWhat puts the tick away\n');

{
  // THE OTHER HALF OF A FORK. Arming one of two upgrade buttons and then pressing
  // the other must re-arm rather than buy: the second press is a confirmation of
  // the button under it, not of "the last thing I pressed".
  const state = board();
  const t3 = archery.find(d => d.tier === 3);
  const t = tower(state, level.plots[0], families[0], t3);
  openMenu(state, t.plot, t);
  const [a, b] = state.menu.items.filter(it => it.act === 'upgrade');
  ok(a && b, 'the archery fork puts two upgrade buttons on the ring',
    `${a && a.to.name} / ${b && b.to.name}`);

  press(state, a);
  press(state, b);
  ok(t.def === t3 && armed(state, b) && !armed(state, a),
    'and arming one then pressing the other arms the other, and buys nothing',
    `still ${t.def.name}`);
}

{
  // A FREE BUTTON IN BETWEEN. Pressing the standing order while an upgrade is armed
  // must put the tick away — it is a different button and the menu stays open, so
  // this is the one path where a stale `arming` would survive to be confirmed by a
  // press the player meant for something else.
  const state = board();
  const post = archery.find(d => d.name === 'Musketeer Post');
  const t = tower(state, level.plots[0], families[0], post);
  openMenu(state, t.plot, t);
  const ability = button(state, b => b.act === 'ability');
  const order = button(state, b => b.act === 'target');

  press(state, ability);
  press(state, order);
  ok(!armed(state, ability) && t.abilities.length === 0,
    'a free button in between puts the tick away', `aim mode ${t.aimMode}`);
}

{
  // AND THE HOLE IN THE MIDDLE, which is the dismiss target every plot has.
  const state = board();
  const t = tower(state, level.plots[0], families[0], archery[0]);
  openMenu(state, t.plot, t);
  press(state, button(state, b => b.act === 'upgrade'));
  tap(state, state.menu.cx, state.menu.cy);
  ok(!state.menu && t.def === archery[0], 'and cancelling takes the whole menu with it');
}

// --- the ring the board draws -----------------------------------------------------

console.log('\nWhat the dotted ring promises\n');

{
  const state = board();
  const t3 = archery.find(d => d.tier === 3);
  const t = tower(state, level.plots[0], families[0], t3);
  openMenu(state, t.plot, t);

  // NOTHING UNTIL SOMETHING IS ARMED, which is the owner's ask in as many words:
  // "when players hover the tower, only show the actual range".
  ok(armedRange(state, t) === null, 'an open menu on its own promises nothing',
    `the tower reaches ${rangeOf(t)}`);

  const posts = state.menu.items.filter(it => it.act === 'upgrade');
  const far = posts.reduce((best, it) => !best || it.to.range > best.to.range ? it : best, null);
  const near = posts.reduce((best, it) => !best || it.to.range < best.to.range ? it : best, null);

  press(state, far);
  ok(armedRange(state, t) === far.to.range, 'arming the longer rung promises the longer rung',
    `${armedRange(state, t)} for a ${far.to.name}`);

  press(state, near);
  ok(armedRange(state, t) === near.to.range || armedRange(state, t) === null,
    'and arming the shorter one does NOT keep promising the longer',
    `${armedRange(state, t)} for a ${near.to.name}, not ${far.to.range}`);

  // THE BUG THIS FILE EXISTS FOR, stated as a number. The Crossbow Sentry reaches
  // less than the Crossbow Tower it upgrades from, so there is no further ring to
  // draw at all — and the old code drew the Musketeer Post's 480 over it.
  ok(near.to.range <= rangeOf(t) ? armedRange(state, t) === null : true,
    'and a rung that buys no reach draws no ring',
    `${near.to.name} reaches ${near.to.range}, the tower already reaches ${rangeOf(t)}`);
}

{
  // AND AN ABILITY THAT BUYS REACH GETS THE SAME PREVIEW. Reinforced Tension is a
  // multiplier on the tower's own range rather than a number of its own, which is
  // why armedRange asks rangeOf a hypothetical tower instead of reading a def.
  const state = board();
  const sentry = archery.find(d => d.name === 'Crossbow Sentry');
  const t = tower(state, level.plots[0], families[0], sentry);
  openMenu(state, t.plot, t);
  const tension = button(state, b => b.act === 'ability' && b.ability.rangeTimes);

  press(state, tension);
  const want = Math.round(sentry.range * tension.ability.rangeTimes);
  ok(armedRange(state, t) === want,
    'an armed ability that lengthens the reach previews it',
    `${armedRange(state, t)} from ${rangeOf(t)}, at x${tension.ability.rangeTimes}`);
}

{
  // AND ONE THAT DOES NOT, DOES NOT. Swift Reload buys rate, and a dotted ring over
  // a tower that is about to shoot at exactly the same distance would be a promise
  // of nothing.
  const state = board();
  const sentry = archery.find(d => d.name === 'Crossbow Sentry');
  const t = tower(state, level.plots[0], families[0], sentry);
  openMenu(state, t.plot, t);
  const swift = button(state, b => b.act === 'ability' && b.ability.reloadTimes);

  press(state, swift);
  ok(armedRange(state, t) === null, 'and one that buys rate promises no ring at all',
    swift.ability.name);
}

console.log(bad
  ? `\n${bad} thing(s) about the confirm step are not true.`
  : '\nA purchase takes two presses, and the ring belongs to the button.');
process.exit(bad ? 1 : 0);
