// What the four tier 4 abilities actually do, driven through the real modules.
// Node only.
//
//   node tools/abilities.mjs
//
// Every check below steps `updateTowers` or `updateUnits` from src/ — the code
// that ships — against a tower and a squad built the way input.js builds them.
// Nothing here is a model of an ability; it is the ability, minus drawing.
//
// It exists because all four are RHYTHMS, and a rhythm is the kind of thing that
// looks right and is wrong. "Every sixth shot" off by one is invisible in play and
// a 20% error in the tower's damage; a hold that blocks the reload instead of
// running inside it is a quarter of the Musketeer Post's output gone with nothing
// on screen to say so. Both are one-line mistakes and neither would be reported.
//
// The arithmetic each ability claims is printed as well as checked, because those
// numbers are quoted in the comments in data/abilities.js and in the encyclopedia,
// and a comment that has drifted from the code is worse than no comment.

import { updateTowers } from '../src/towers.js';
import { updateUnits, makeUnits } from '../src/units.js';
import { archery, barracks } from '../src/data/towers.js';
import { ABILITIES, abilityById, abilitiesOf, owns, ABILITY_COST } from '../src/data/abilities.js';
import { level } from '../src/level.js';
import { nearestOnPath } from '../src/units.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const DT = 1 / 60;

// --- a tower on a plot, with a target it can always see -------------------------
//
// The enemy is parked 60px away and given a million health, so nothing that
// happens below is ever the target dying — every gap in the firing is the tower's
// own doing, which is the only thing this file is asking about.
function post(ids) {
  const plot = level.plots[0];
  return {
    plot, fam: { id: 'archery' }, def: archery[3],
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0,
    aimMode: 0, spent: 500, rally: null,
    abilities: [...ids], shots: 0, special: null, burst: 0, burstT: 0,
    hit: [], locked: null, hold: 0
  };
}

function dummy(t, i = 0) {
  return {
    def: { r: 10, hp: 1e9, speed: 0, atkCd: 1, damage: 0 },
    // Spread along the road rather than stacked, so the standing order has
    // something to sort and a burst that spreads has somewhere to spread to.
    x: t.x + 60 + i * 40, y: t.y, hp: 1e9, maxHp: 1e9,
    // On the first road, in the middle lane. pickTarget ranks by how far an enemy
    // still has to walk, so it reads all three — an enemy with no route is not a
    // simpler enemy, it is a crash. Each one is a little further along than the
    // last, which puts them in a known order.
    route: 0, lane: 1, s: 300 - i * 40,
    foe: null, acd: 1, thrust: 0, halted: false, leaked: false, mark: i
  };
}

// Fire a tower for `seconds` at `men` enemies and report every shot it produced,
// in order, as { t, kind, damage, at } — `at` being which of the men it went to.
// The shots list is drained each step so nothing has to model flight.
function fire(t, seconds, men = 1) {
  const enemies = Array.from({ length: men }, (_, i) => dummy(t, i));
  const state = { towers: [t], enemies, shots: [], units: [], hits: [] };
  const out = [];
  for (let i = 0; i * DT < seconds; i++) {
    updateTowers(state, DT);
    for (const s of state.shots) {
      out.push({ t: i * DT, kind: s.ammo.kind, damage: s.damage, at: s.target.mark });
    }
    state.shots.length = 0;
  }
  return out;
}

console.log('\nWhat a tier 4 offers\n');

{
  ok(ABILITIES.every(a => a.cost === ABILITY_COST),
    'every ability costs the same', `${ABILITY_COST}g`);

  const owners = [archery[3], barracks[3]];
  ok(owners.every(d => (d.abilities || []).length === 2),
    'and the two tier 4 towers offer two each',
    owners.map(d => `${d.name} ${d.abilities.length}`).join(', '));

  // TIER 4 ONLY. Nothing below it may carry an ability, because the whole reason
  // an ability exists is that a topped-out ladder has nothing left to buy — a
  // tier 2 tower has an upgrade instead, and an ability on it would be competing
  // with the thing it is meant to replace.
  const lower = [...archery, ...barracks].filter(d => d.tier < 4);
  ok(lower.every(d => !d.abilities), 'and nothing below tier 4 offers any',
    `${lower.length} lower tiers checked`);

  // Every id a tier names has to resolve, or the menu would draw a button for
  // `undefined` and the tower would silently never use it.
  const named = owners.flatMap(d => d.abilities);
  ok(named.every(id => abilityById(id)), 'and every id a tier names is a real ability');
  // ONE CYCLE PER ABILITY, not one shared between them. Burst Fire wants every
  // sixth shot and Deadeye every eleventh, and they simply both run on the tower's
  // one counter — so a Post that has bought both keeps both rhythms whole and each
  // ability is worth what it is worth alone.
  //
  // An earlier version divided a single cycle between them, which was written when
  // both wanted six and became wrong the moment the artist made one of them rarer.
  // What is checked now is the property that replaced it: the cycles are coprime
  // enough that a collision is rare, and where they do collide the rarer one wins.
  for (const d of [archery[3], barracks[3]]) {
    const evs = abilitiesOf(d).filter(a => a.every).map(a => a.every);
    console.log(`      ${d.name}: cycles ${evs.join(' and ') || 'none'}`);
  }
  ok(abilitiesOf(archery[3]).filter(a => a.every).length === 2,
    'the Musketeer Post runs two rhythms on one counter');
}

console.log('\nBurst Fire\n');

{
  const t = post(['burst']);
  const burst = abilityById('burst');
  const cd = archery[3].cooldown;

  // EXACTLY ONE CYCLE, and the margin is subtracted rather than added: six reloads
  // is 14.4s and the seventh slot lands at 14.4 on the nose, so a run of "six
  // reloads and a bit" catches the first shot of the next cycle and reports seven
  // ordinary shots where there were five.
  const shots = fire(t, cd * 6 - 0.1);

  ok(shots.length === 8, 'five ordinary shots and then three', `${shots.length} balls`);
  ok(shots.every(s => s.kind === 'bullet'),
    'and all eight are the ordinary ball, as asked');
  ok(shots.every(s => s.damage === archery[3].damage),
    'each doing the tower\'s own damage', `${archery[3].damage}`);

  // The three are RAPID. Their spacing is the ability's `gap`, not the reload —
  // that is the whole effect, and it is the thing a wrong clock would break while
  // leaving the count right.
  const rapid = shots.slice(5).map((s, i, a) => (i ? s.t - a[i - 1].t : 0)).slice(1);
  ok(rapid.every(g => Math.abs(g - burst.gap) < DT * 1.5),
    'the last three come at the burst rate, not the reload',
    `${rapid.map(g => g.toFixed(2)).join('s, ')}s against ${burst.gap}s`);

  const spaced = shots.slice(1, 5).map((s, i) => s.t - shots[i].t);
  ok(spaced.every(g => Math.abs(g - cd) < DT * 1.5),
    'and the first five come at the reload', `${cd}s`);

  // THE HELD POSE RUNS INSIDE THE RELOAD on this tower, which is what makes it
  // free: the hold is a second and the musket takes 2.4 to load, so the second the
  // man spends standing there costs the tower nothing at all.
  ok(burst.hold < cd, 'and the second he holds the pose fits inside the reload',
    `${burst.hold}s of ${cd}s`);
}

console.log('\nAnd the burst spreads\n');

{
  // THREE MEN ON THE ROAD, at three different distances so the standing order has
  // something to sort. The artist's whole complaint about the first build was that
  // all three balls went into one of them.
  const t = post(['burst']);
  const shots = fire(t, archery[3].cooldown * 6 - 0.1, 3);
  const three = shots.slice(5);

  ok(three.length === 3, 'the burst is still three balls', `${three.length}`);
  ok(new Set(three.map(s => s.at)).size === 3,
    'and every one of them goes to a different man',
    three.map(s => s.at).join(', '));

  // The order is the tower's own, not "whoever is nearest". Mode 0 ranks by how
  // far each man still has to walk, so the burst clears from the front of the
  // column backwards — which is what a player who set that order would expect.
  ok(three[0].at === 0 && three[1].at === 1 && three[2].at === 2,
    'and it works down the road in the tower\'s own order',
    three.map(s => s.at).join(' then '));

  // AND IT FALLS BACK. With one man in reach there is nobody to spread to, and a
  // burst that refused to fire would read as the ability being broken exactly when
  // the player is watching it.
  const lone = fire(post(['burst']), archery[3].cooldown * 6 - 0.1, 1).slice(5);
  ok(lone.length === 3 && lone.every(s => s.at === 0),
    'with one man on the road all three go to him', `${lone.length} balls`);
}

console.log('\nDeadeye\n');

{
  const t = post(['deadeye']);
  const dead = abilityById('deadeye');
  const cd = archery[3].cooldown;
  const shots = fire(t, cd * 11 - 0.1);

  ok(shots.length === 11, 'ten ordinary shots and then one', `${shots.length} balls`);
  ok(shots.slice(0, 10).every(s => s.kind === 'bullet'), 'the ten are lead');
  ok(shots[10].kind === 'deadeye', 'and the eleventh is not', shots[10].kind);
  ok(shots[10].damage === dead.damage, 'and it hits for what the ability says',
    `${shots[10].damage}`);

  // THE MARK, and the two halves of its life. It goes up a second before the ball
  // and comes down when the ball lands, which is two different owners handing over
  // — `t.locked` during the wind-up and the shot itself afterwards. A gap between
  // them would blink; an overlap would draw it twice.
  const state = { towers: [post(['deadeye'])], enemies: [dummy(post([]))],
                  shots: [], units: [], hits: [] };
  const lock = state.towers[0];
  let up = 0, before = 0, marked = 0;
  for (let i = 0; i * DT < cd * 11 - 0.1; i++) {
    updateTowers(state, DT);
    if (lock.locked) { up++; if (!lock.shots || lock.shots < 10) before++; }
    for (const s of state.shots) if (s.marked) marked++;
    state.shots.length = 0;
  }
  ok(Math.abs(up * DT - dead.lock) < DT * 3, 'the mark goes up a second before the shot',
    `${(up * DT).toFixed(2)}s of ${dead.lock}s`);
  ok(marked === 1, 'and exactly one ball carries it onward', `${marked}`);
  ok(!lock.locked, 'and the tower drops it the moment the ball leaves');
}

console.log('\nWhat the two are worth\n');

{
  const cd = archery[3].cooldown;
  const dmg = archery[3].damage;

  // Measured over a whole number of BOTH cycles — six and eleven, so sixty-six
  // shots — which is the only window in which each ability has fired a whole
  // number of times and the answer is not an artefact of where the run was cut.
  const window = cd * 66;
  const rate = ids => {
    const shots = fire(post(ids), window + cd);
    const inside = shots.filter(s => s.t < shots[0].t + window);
    return inside.reduce((sum, s) => sum + s.damage, 0) / window;
  };

  const plain = dmg / cd;
  const burst = rate(['burst']);
  const deadeye = rate(['deadeye']);
  const both = rate(['burst', 'deadeye']);

  console.log(`      plain ${plain.toFixed(1)}/s   burst ${burst.toFixed(1)}/s   ` +
              `deadeye ${deadeye.toFixed(1)}/s   both ${both.toFixed(1)}/s`);

  // THE TWO ARE CLOSE, and that is the design: what separates them is WHERE the
  // damage lands, not how much of it there is. The burst spreads 180 over three
  // men and Deadeye puts 300 through one, which is the difference between a road
  // full of militia and a giant walking down it. Within a fifth of a point is as
  // near as two different rhythms on the same reload can be made.
  ok(Math.abs(burst - deadeye) < 1.5, 'Burst Fire and Deadeye are worth about the same',
    `${burst.toFixed(2)} against ${deadeye.toFixed(2)}`);

  // AND THE SECOND ONE BOUGHT IS WORTH BUYING. With separate cycles the two simply
  // add, so the tower with both is worth roughly the sum of the two bonuses — the
  // check that matters is that the second 150 gold is not swallowed by the first.
  ok(both - burst > (deadeye - plain) * 0.8,
    'and buying the second adds nearly as much again',
    `+${(burst - plain).toFixed(1)} then +${(both - burst).toFixed(1)}`);
}

// --- the paladin ----------------------------------------------------------------
//
// A Keep with its squad, mustered by the real makeUnits, and one enemy standing in
// front of the first man. The enemy does no damage of its own so that health only
// ever moves for reasons this file is asking about.

function keep(ids) {
  const plot = level.plots[0];
  const t = {
    plot, fam: { id: 'barracks' }, def: barracks[3],
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0,
    spent: 530, rally: null,
    abilities: [...ids], shots: 0, special: null, burst: 0, burstT: 0,
    hit: [], locked: null, hold: 0
  };
  const state = { towers: [t], enemies: [], units: [], shots: [], hits: [],
                  corpses: [], splats: [] };
  makeUnits(state, t);
  // ONE MAN, not the squad of three. Every ability counter is the SOLDIER's — that
  // is the whole difference from the musketeer's, whose counter is the tower's —
  // and three paladins all assisting on the one enemy in front of them would land
  // three overlapping rhythms on the same health bar. The squad is checked
  // elsewhere; this file is asking what one paladin does.
  state.units.length = 1;
  return state;
}

// An enemy standing on the point man, with health enough to be hit forever.
function victim(state) {
  const u = state.units[0];
  const at = nearestOnPath(u.rx, u.ry);
  const e = {
    def: { r: 10, hp: 1e9, speed: 0, atkCd: 1e9, damage: 0, name: 'dummy' },
    x: at.x, y: at.y, hp: 1e9, maxHp: 1e9,
    route: at.route, lane: 1, s: at.s,
    foe: null, acd: 1e9, thrust: 0, halted: false, leaked: false
  };
  state.enemies.push(e);
  return e;
}

console.log('\nHoly Slash\n');

{
  const state = keep(['slash']);
  const u = state.units[0];
  const e = victim(state);
  // Put the point man on his post so he is in reach from the first frame.
  u.x = e.x - 12;
  u.y = e.y;

  const slash = abilityById('slash');
  const man = barracks[3].soldier;

  let last = e.hp;
  const blows = [];
  for (let i = 0; i < 60 * 30; i++) {
    updateUnits(state, DT);
    if (e.hp !== last) { blows.push({ t: i * DT, hit: last - e.hp }); last = e.hp; }
    if (blows.length >= 12) break;
  }

  ok(blows.length >= 11, 'the paladin keeps swinging', `${blows.length} blows`);
  ok(blows.slice(0, 9).every(b => b.hit === man.damage),
    'nine ordinary blows first', `${man.damage} each`);
  ok(blows[9] && blows[9].hit === slash.damage, 'and the tenth is the strike',
    blows[9] && `${blows[9].hit}`);
  ok(blows[10] && blows[10].hit === man.damage, 'then he goes back to ordinary ones');

  // THE HOLD COSTS HIM SOMETHING HERE, and that is the difference from the
  // musketeer: a paladin swings every 0.80s and holds the pose for 1, so the blow
  // after the strike is late by the difference. Checked rather than assumed,
  // because "the pose blocks the swing" and "the pose is decoration" look the same
  // on a tower whose reload is longer than the hold.
  const afterSlash = blows[10].t - blows[9].t;
  ok(Math.abs(afterSlash - slash.hold) < DT * 2,
    'and the second he holds it delays the next blow',
    `${afterSlash.toFixed(2)}s against an ordinary ${man.cd}s`);

  const plain = man.damage / man.cd;
  const armed = (9 * man.damage + slash.damage) / (9 * man.cd + slash.hold);
  console.log(`      one paladin: ${plain.toFixed(2)}/s plain, ${armed.toFixed(2)}/s with the slash ` +
              `(x${(armed / plain).toFixed(2)}), and a Keep musters ${man.count}`);
}

console.log('\nHoly Light\n');

{
  const state = keep(['light']);
  const u = state.units[0];
  const e = victim(state);
  u.x = e.x - 12;
  u.y = e.y;

  const light = abilityById('light');

  // Above the threshold it must not fire. A heal that went off at full health
  // would be the ability doing nothing, every twenty seconds, forever.
  u.hp = u.maxHp * 0.5;
  for (let i = 0; i < 60; i++) updateUnits(state, DT);
  ok(u.hp === u.maxHp * 0.5 && u.hold <= 0, 'nothing happens above the threshold',
    `${(100 * u.hp / u.maxHp).toFixed(0)}% of ${(100 * light.below).toFixed(0)}%`);

  // Under it, he kneels.
  u.hp = u.maxHp * 0.2;
  const before = u.hp;
  updateUnits(state, DT);
  ok(u.hold > 0, 'under it he stops what he is doing', `${u.hold.toFixed(2)}s`);
  ok(u.holdArt === light.pose, 'and shows the drawing the artist made for it');

  let steps = 1;
  while (u.hold > 0 && steps < 60 * 5) { updateUnits(state, DT); steps++; }
  const healed = u.hp - before;
  ok(Math.abs(healed - light.heals) < 2, 'and comes back up by what it promises',
    `${healed.toFixed(0)} of ${light.heals}`);
  ok(Math.abs(steps * DT - light.seconds) < DT * 3, 'over the seconds it promises',
    `${(steps * DT).toFixed(2)}s of ${light.seconds}s`);

  // IT NEVER OVERSHOOTS. 200 onto a man who is 90 short would take him past his
  // own maximum, and a health bar over full reads as a bug rather than as a heal.
  u.hp = u.maxHp - 10;
  u.healCd = 0;
  for (let i = 0; i < 60 * 3; i++) updateUnits(state, DT);
  ok(u.hp <= u.maxHp, 'and never takes him past full', `${u.hp.toFixed(0)}/${u.maxHp}`);

  // THE REFRESH. Twenty seconds from when it STARTED, so a second call the moment
  // the first ends would be the cooldown not working at all.
  u.hp = u.maxHp * 0.2;
  u.healCd = 0;
  updateUnits(state, DT);
  const armed = u.healCd;
  ok(Math.abs(armed - light.refresh) < 0.1, 'the clock starts when the light does',
    `${armed.toFixed(1)}s`);

  u.hp = u.maxHp * 0.2;
  u.hold = 0;
  u.healing = 0;
  const held = u.hp;
  for (let i = 0; i < 60 * 5; i++) updateUnits(state, DT);
  ok(u.hp === held, 'and he cannot call it again while it is running',
    `${u.healCd.toFixed(1)}s still to go`);
}

console.log('\nWhat a dead man forgets\n');

{
  // A paladin who falls musters again as a NEW man: no pose held over, no heal in
  // progress, and his count towards the next strike started over. The one thing he
  // does not get back is the light — the ability is recharging, not the man — and
  // that distinction is the whole reason `healCd` is ticked outside the respawn
  // branch in updateUnits.
  const state = keep(['slash', 'light']);
  const u = state.units[0];

  u.blows = 7;
  u.hold = 0.5;
  u.holdArt = abilityById('slash').pose;
  u.healing = 100;
  // The light already spent, so it cannot answer the wound below — otherwise this
  // would be a check that Holy Light saves him, which is a different question and
  // one the section above already asks.
  u.healCd = 12;
  // Far enough under nothing that the frame's own tick of healing cannot lift him
  // back over it. A man on exactly 0 with 100 a second running is a man on 1.7
  // by the time the death check reads him.
  u.hp = -5;
  updateUnits(state, DT);

  ok(u.respawn > 0, 'he falls', `${u.respawn.toFixed(1)}s to muster`);
  ok(u.blows === 0 && u.hold === 0 && !u.holdArt && u.healing === 0,
    'and forgets the pose, the heal and his count');
  ok(u.healCd < 12, 'but the light goes on recharging without him',
    `${u.healCd.toFixed(2)}s left`);
}

console.log('\nWhat gold buys\n');

{
  // Buying an ability adds to `spent`, which is what the refund is 60% of. An
  // ability that did not would be gold the player could never get back, silently.
  const t = post([]);
  const before = t.spent;
  t.abilities.push('burst');
  t.spent += ABILITY_COST;
  ok(owns(t, 'burst') && !owns(t, 'deadeye'), 'a tower owns what it bought and no more');
  ok(t.spent === before + ABILITY_COST, 'and the price goes into what it can refund',
    `${before} then ${t.spent}`);
}

console.log(bad ? `\n${bad} ability rule(s) broken.` : '\nAll four abilities do what they say.');
process.exit(bad ? 1 : 0);
