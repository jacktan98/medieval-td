// What the six tier 4 abilities actually do, driven through the real modules.
// Node only.
//
//   node tools/abilities.mjs
//
// Every check below steps `updateTowers` or `updateUnits` from src/ — the code
// that ships — against a tower and a squad built the way input.js builds them.
// Nothing here is a model of an ability; it is the ability, minus drawing.
//
// It exists because most of them are RHYTHMS, and a rhythm is the kind of thing
// that looks right and is wrong. "Every sixth shot" off by one is invisible in play
// and a 20% error in the tower's damage; a hold that blocks the reload instead of
// running inside it is a quarter of the Musketeer Post's output gone with nothing
// on screen to say so. Both are one-line mistakes and neither would be reported.
//
// The two that are not rhythms are checked for the opposite failure. Holy Light
// fires on a threshold and Far Shot fires never — it is bought, and the tower is
// simply better afterwards — so what can go wrong there is a passive that does not
// reach everything it should. Far Shot's range has five readers and its pictures
// two, and a tower that shot the long range while drawn in timber, or drew its ring at 260
// while shooting further, would be a bug the player sees before any tool does.
//
// The arithmetic each ability claims is printed as well as checked, because those
// numbers are quoted in the comments in data/abilities.js and in the encyclopedia,
// and a comment that has drifted from the code is worse than no comment.

import { updateTowers, rangeOf, framesOf, auras, boost } from '../src/towers.js';
import { updateUnits, makeUnits } from '../src/units.js';
import { archery, barracks, siege, monastery } from '../src/data/towers.js';
import { ABILITIES, abilityById, abilitiesOf, owns, ABILITY_COST } from '../src/data/abilities.js';
import { level } from '../src/level.js';
import { nearestOnPath } from '../src/units.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const DT = 1 / 60;

// Two multipliers agree. 1.1 x 1.1 is 1.2100000000000002 in binary floating
// point, so the compounding checks below cannot ask for equality.
const near = (a, b) => Math.abs(a - b) < 1e-9;

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

// THE BALLISTA TURRET, built the same way, and it needs its own builder for one
// reason: this family's clock is its animation. `beat` and `beatT` are the fields
// that matter, and input.js sets them on a real build exactly as they are here.
function turret(ids) {
  const plot = level.plots[0];
  return {
    plot, fam: { id: 'siege' }, def: siege[3],
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0,
    aimMode: 0, spent: 610, rally: null,
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

  // ALL FOUR LADDERS, two each. The Judgement Temple was the last one without any,
  // and now that it has a pair the list is complete — so the check is no longer
  // "every tier 4 that has any" but every tier 4 there is.
  const owners = [archery[3], barracks[3], siege[3], monastery[3]];
  ok(owners.every(d => (d.abilities || []).length === 2),
    'and every tier 4 tower offers two',
    owners.map(d => `${d.name} ${d.abilities.length}`).join(', '));

  // TIER 4 ONLY. Nothing below it may carry an ability, because the whole reason
  // an ability exists is that a topped-out ladder has nothing left to buy — a
  // tier 2 tower has an upgrade instead, and an ability on it would be competing
  // with the thing it is meant to replace.
  const lower = [...archery, ...barracks, ...siege, ...monastery].filter(d => d.tier < 4);
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
  for (const d of owners) {
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

  // EXACTLY ONE CYCLE, read off the ability rather than typed: `every` reloads is
  // the cycle and the next slot lands on the nose, so the margin is SUBTRACTED —
  // "one cycle and a bit" would catch the first shot of the next one and report an
  // extra ordinary shot.
  const plain = burst.every - 1;              // ordinary shots before the burst
  const total = plain + burst.shots;
  const shots = fire(t, cd * burst.every - 0.1);

  ok(shots.length === total, `${plain} ordinary shots and then ${burst.shots}`,
    `${shots.length} balls`);
  ok(shots.every(s => s.kind === 'bullet'),
    `and all ${total} are the ordinary ball, as asked`);
  ok(shots.every(s => s.damage === archery[3].damage),
    'each doing the tower\'s own damage', `${archery[3].damage}`);

  // The three are RAPID. Their spacing is the ability's `gap`, not the reload —
  // that is the whole effect, and it is the thing a wrong clock would break while
  // leaving the count right.
  const rapid = shots.slice(plain).map((s, i, a) => (i ? s.t - a[i - 1].t : 0)).slice(1);
  ok(rapid.every(g => Math.abs(g - burst.gap) < DT * 1.5),
    `the last ${burst.shots} come at the burst rate, not the reload`,
    `${rapid.map(g => g.toFixed(2)).join('s, ')}s against ${burst.gap}s`);

  const spaced = shots.slice(1, plain).map((s, i) => s.t - shots[i].t);
  ok(spaced.every(g => Math.abs(g - cd) < DT * 1.5),
    `and the first ${plain} come at the reload`, `${cd}s`);

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
  const burst = abilityById('burst');
  const t = post(['burst']);
  const shots = fire(t, archery[3].cooldown * burst.every - 0.1, 3);
  const three = shots.slice(burst.every - 1);

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
  const lone = fire(post(['burst']), archery[3].cooldown * burst.every - 0.1, 1)
    .slice(burst.every - 1);
  ok(lone.length === 3 && lone.every(s => s.at === 0),
    'with one man on the road all three go to him', `${lone.length} balls`);
}

console.log('\nDeadeye\n');

{
  const t = post(['deadeye']);
  const dead = abilityById('deadeye');
  const cd = archery[3].cooldown;
  const plain = dead.every - 1;
  const shots = fire(t, cd * dead.every - 0.1);

  ok(shots.length === dead.every, `${plain} ordinary shots and then one`,
    `${shots.length} balls`);
  ok(shots.slice(0, plain).every(s => s.kind === 'bullet'), `the ${plain} are lead`);
  const last = shots[plain];
  ok(last.kind === 'deadeye', `and number ${dead.every} is not`, last.kind);
  // A MULTIPLE OF THE TOWER'S OWN SHOT, so the check is the multiplier rather than
  // a number — the whole point of `times`, which is what the flat 300 became.
  ok(last.damage === archery[3].damage * dead.times,
    'and it hits for the multiple the ability claims',
    `${archery[3].damage} x${dead.times} = ${last.damage}`);

  // THE MARK, and the two halves of its life. It goes up a second before the ball
  // and comes down when the ball lands, which is two different owners handing over
  // — `t.locked` during the wind-up and the shot itself afterwards. A gap between
  // them would blink; an overlap would draw it twice.
  const state = { towers: [post(['deadeye'])], enemies: [dummy(post([]))],
                  shots: [], units: [], hits: [] };
  const lock = state.towers[0];
  let up = 0, before = 0, marked = 0;
  for (let i = 0; i * DT < cd * dead.every - 0.1; i++) {
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
  // damage lands, not how much of it there is. The burst spreads three balls over
  // three men and Deadeye puts six times one shot through one of them, which is the
  // difference between a road full of militia and a giant walking down it.
  //
  // WITHIN A TENTH OF EACH OTHER rather than within a fifth of a point. The owner
  // now sets both rhythms directly — one in four and one in eight — so the tolerance
  // has to be a share of what they are worth rather than an absolute, or it would
  // fail on the next tuning pass for being 3 points apart out of 40.
  ok(Math.abs(burst - deadeye) / Math.max(burst, deadeye) < 0.10,
    'Burst Fire and Deadeye are worth about the same',
    `${burst.toFixed(2)} against ${deadeye.toFixed(2)}`);

  // AND THE SECOND ONE BOUGHT IS STILL WORTH BUYING — but no longer worth the same
  // as the first, and that is a consequence of the numbers rather than a bug.
  //
  // THE CYCLES STILL SHARE A FACTOR, and how much that costs is what this measures.
  // Where they collide the rarer one wins, so a Post that has bought both loses a
  // burst to any Deadeye landing on a burst slot. At 4 and 8 that was EVERY Deadeye
  // and the second ability was worth 60% of its solo value; at 4 and 10 it is every
  // other one — one burst in twenty shots — and it is worth 86%.
  //
  // What is checked is therefore the thing that matters to a player: the second 150
  // gold still buys most of what it would have bought on its own. If this ever
  // drops below half, make the rarer cycle odd and the two go back to being fully
  // independent.
  const alone = deadeye - plain;
  const second = both - burst;
  ok(second > alone * 0.5, 'and buying the second still adds most of its own worth',
    `+${(burst - plain).toFixed(1)} then +${second.toFixed(1)} of ${alone.toFixed(1)}`);
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
    // The pose is recorded ON the frame the blow lands, because it is cleared as
    // soon as the hold runs out — and this ability's hold is now one swing long, so
    // by the next blow there is nothing left to look at.
    if (e.hp !== last) { blows.push({ t: i * DT, hit: last - e.hp, art: u.holdArt }); last = e.hp; }
    if (blows.length >= 12) break;
  }

  const n = slash.every;   // the strike is the LAST blow of the cycle
  ok(blows.length >= n + 2, 'the paladin keeps swinging', `${blows.length} blows`);
  ok(blows.slice(0, n - 1).every(b => b.hit === man.damage),
    `${n - 1} ordinary blows first`, `${man.damage} each`);
  // A MULTIPLE OF HIS OWN BLOW, checked as the multiplier rather than as a number.
  const strike = man.damage * slash.times;
  ok(blows[n - 1] && blows[n - 1].hit === strike, `and blow ${n} is the strike`,
    blows[n - 1] && `${blows[n - 1].hit} = ${man.damage} x${slash.times}`);
  ok(blows[n] && blows[n].hit === man.damage, 'then he goes back to ordinary ones');

  // AND IT COSTS HIM NOTHING, which is the change the artist asked for and the
  // opposite of what this checked before. `hold` is null on this ability, so the
  // pose runs for the man's own 0.80s swing: it is up for a full beat of fighting
  // and the blow after the strike lands exactly on time.
  //
  // Worth a check rather than an assumption in either direction — "the pose blocks
  // the swing" and "the pose is decoration" look identical from outside, and a
  // hold a frame longer than the swing would quietly cost a blow every cycle.
  const afterSlash = blows[n].t - blows[n - 1].t;
  ok(Math.abs(afterSlash - man.cd) < DT * 2,
    'and he holds the pose for exactly one swing, so nothing is lost',
    `${afterSlash.toFixed(2)}s against an ordinary ${man.cd}s`);

  // The strike still SHOWS, and that is the other half of "held for a normal
  // attack time": a hold shortened to nothing would be an ability with no picture.
  ok(blows[n - 1] && blows[n - 1].art === slash.pose && !blows[n - 2].art,
    'and the strike is the only blow with a drawing of its own');

  const plain = man.damage / man.cd;
  const armed = ((n - 1) * man.damage + man.damage * slash.times) / (n * man.cd);
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
  // A SHARE OF HIS OWN MAXIMUM, not a number of points — so what is checked is the
  // fraction, and a paladin standing under a Divine Fortitude heals more without a
  // line of this file changing.
  const promised = light.healFrac * u.maxHp;
  ok(Math.abs(healed - promised) < 2, 'and comes back up by what it promises',
    `${healed.toFixed(0)} of ${promised.toFixed(0)} (${(100 * light.healFrac).toFixed(0)}% of ${u.maxHp})`);
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
  // progress, his count towards the next strike started over — and, since the
  // artist asked, his Holy Light ready again. The clock belongs to the man rather
  // than to the ability, so it dies with him.
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
  ok(u.healCd === 0, 'and the man who takes his place can call the light at once',
    `${u.healCd.toFixed(2)}s left of ${abilityById('light').refresh}`);
}

console.log('\nFar Shot\n');

{
  const plain = turret([]);
  const far = turret(['farshot']);
  const shot = abilityById('farshot');

  ok(rangeOf(plain) === siege[3].range, 'an untaught turret reaches what its tier says',
    `${rangeOf(plain)}`);
  ok(rangeOf(far) === Math.round(siege[3].range * shot.rangeTimes),
    'and one that has bought Far Shot reaches further',
    `${rangeOf(far)} against ${rangeOf(plain)}`);
  // SECOND-LONGEST IN THE GAME, and no longer level with the Musketeer Post — the
  // owner brought it down from the Post's own 480. What the check asks is the
  // shape of that decision rather than the number: further than the turret's own
  // reach by half again, and still short of the longest arm there is.
  ok(rangeOf(far) < archery[3].range && rangeOf(far) > siege[3].range,
    'further than its own tier, shorter than a Musketeer Post',
    `${siege[3].range} -> ${rangeOf(far)}, Post ${archery[3].range}`);
  ok(Math.abs(rangeOf(far) / siege[3].range - shot.rangeTimes) < 0.02,
    'by exactly the multiple it claims',
    `x${(rangeOf(far) / siege[3].range).toFixed(2)}`);

  // THE PICTURE FOLLOWS THE RULE. The iron frames are what says on the board that
  // the ability is bought, and a tower that reached the long distance while still
  // drawn in timber would be the ring lying about the tower.
  ok(framesOf(plain.def, plain).join() === siege[3].machine.frames.join(),
    'an untaught turret is drawn in timber');
  ok(framesOf(far.def, far).join() === shot.frames.join(),
    'and a taught one in iron', shot.frames[0]);
  // A DEF WITHOUT A TOWER still answers with the tier's own pictures, because the
  // encyclopedia and the tools are asking about the tower as it is sold.
  ok(framesOf(siege[3]).join() === siege[3].machine.frames.join(),
    'and the tier itself still ships in timber');

  // IT IS NOT A RHYTHM. Nothing about the shots changes — no count, no heavier
  // bolt, no pause — which is what makes it the first ability of its kind here.
  const shots = fire(far, 12);
  ok(shots.length > 3 && shots.every(s => s.damage === siege[3].damage),
    'and every bolt it fires is still an ordinary one',
    `${shots.length} bolts at ${siege[3].damage}`);
}

console.log('\nHeavy Bolt\n');

{
  const t = turret(['heavybolt']);
  const heavy = abilityById('heavybolt');
  const cycle = siege[3].cooldown * heavy.every;

  // Three whole cycles, less a hair, for the same reason Burst Fire's window is a
  // cycle less a hair: the next shot lands on the boundary.
  const n = heavy.every;
  const shots = fire(t, cycle * 3 - 0.1);
  ok(shots.length === n * 3, `${n * 3} bolts in three cycles of ${n}`, `${shots.length}`);

  const heavies = shots.filter(s => s.damage > siege[3].damage);
  ok(heavies.length === 3, `and one in ${n} is the heavy one`, `${heavies.length}`);
  ok([n - 1, 2 * n - 1, 3 * n - 1].every(i => shots[i].damage === siege[3].damage * heavy.times),
    `every ${n}th, and ${heavy.times}x the tower's own damage`,
    `${siege[3].damage} then ${siege[3].damage * heavy.times}`);

  // DOUBLE AS A MULTIPLIER, which is the property that survives a retune. The
  // turret's damage has moved twice already; a number typed into the ability would
  // have been right on the day and silently wrong after either move.
  const was = siege[3].damage;
  siege[3].damage = was + 7;
  const after = fire(turret(['heavybolt']), cycle - 0.1);
  ok(after[n - 1].damage === (was + 7) * heavy.times,
    'and it stays a multiple when the tier is retuned',
    `${was + 7} then ${after[n - 1].damage}`);
  siege[3].damage = was;

  // The bolt that leaves is the artist's burning one, and it is louder. Both ride
  // on the ammunition rather than on a branch in the firing code.
  ok(heavy.ammo.sprite === 'heavy_bolt', 'the heavy bolt is its own drawing');
  ok(heavy.ammo.kind === siege[3].ammo.kind,
    'and still a ballista bolt, so a kill by it cries as one', heavy.ammo.kind);
  ok(heavy.ammo.fireGain > 1, 'and leaves louder than an ordinary one',
    `x${heavy.ammo.fireGain}`);
  ok(heavy.ammo.clear === siege[3].ammo.clear && heavy.ammo.speed === siege[3].ammo.speed,
    'and flies exactly as the ordinary one does');
}

console.log('\nBoth of them, on one turret\n');

{
  const both = turret(['farshot', 'heavybolt']);
  const heavy = abilityById('heavybolt');

  // THE OWNER'S OWN CONDITION: buy both and both pictures are used. They are
  // independent — one changes the machine, the other changes what leaves it — so
  // the check is that neither swallows the other.
  ok(rangeOf(both) === Math.round(siege[3].range * abilityById('farshot').rangeTimes),
    'it reaches the far distance',
    `${rangeOf(both)}`);
  ok(framesOf(both.def, both).join() === abilityById('farshot').frames.join(),
    'and is drawn in iron');

  const shots = fire(both, siege[3].cooldown * heavy.every - 0.1);
  ok(shots[heavy.every - 1].damage === siege[3].damage * heavy.times,
    `and bolt ${heavy.every} is still the heavy one`,
    `${shots[heavy.every - 1].damage}`);

  const plain = fire(turret([]), siege[3].cooldown * 9 - 0.1).length;
  const armed = fire(turret(['heavybolt']), siege[3].cooldown * 9 - 0.1);
  const rate = armed.reduce((sum, s) => sum + s.damage, 0) / (siege[3].cooldown * 9);
  console.log(`      one turret: ${(siege[3].damage / siege[3].cooldown).toFixed(1)}/s plain, ` +
              `${rate.toFixed(1)}/s with Heavy Bolt, over ${plain} shots either way`);
}

console.log('\nHoly Wrath and Divine Fortitude\n');

{
  const wrath = abilityById('wrath');
  const fort = abilityById('fortitude');

  // WHAT EACH ONE COVERS, read out of the data rather than watched. The `on` list
  // is a list of family ids exactly so this can be a table rather than an
  // experiment, and so a family added later is visibly not covered.
  for (const a of [wrath, fort]) {
    console.log(`      ${a.name}: ${Object.entries(a.aura)
      .filter(([k]) => k !== 'on' && k !== 'badge')
      .map(([k, v]) => `${k} x${v}`).join(', ')} on ${a.aura.on.join(', ')}`);
  }

  ok(!wrath.aura.on.includes('barracks'),
    'Holy Wrath does not reach a barracks man', wrath.aura.on.join('/'));
  ok(fort.aura.on.length === 1 && fort.aura.on[0] === 'barracks',
    'and Divine Fortitude reaches nothing else');

  // A TOWER OF EVERY FAMILY, so the boost can be asked about each of them at once.
  const map = fams => ({ towers: fams.map(f => ({ ...turret([]), fam: { id: f } })), units: [] });
  const bare = map(['archery', 'siege', 'monastery', 'barracks']);
  ok(auras(bare).length === 0, 'a map with no temple has no aura');
  for (const f of ['archery', 'siege', 'monastery', 'barracks']) {
    ok(boost(bare, 'damage', f) === 1 && boost(bare, 'hp', f) === 1,
      `and nothing is boosted on it (${f})`);
  }

  // ONE TEMPLE, TAUGHT BOTH.
  const holy = { towers: [...map(['archery', 'siege', 'monastery', 'barracks']).towers,
                          { ...turret(['wrath', 'fortitude']), fam: { id: 'monastery' },
                            def: monastery[3] }], units: [] };
  ok(auras(holy).length === 2, 'a temple taught both puts two auras on the map');
  ok(boost(holy, 'damage', 'archery') === wrath.aura.damage &&
     boost(holy, 'damage', 'siege') === wrath.aura.damage &&
     boost(holy, 'damage', 'monastery') === wrath.aura.damage,
    'every shooting family hits harder', `x${wrath.aura.damage}`);
  ok(boost(holy, 'damage', 'barracks') === 1, 'and the barracks does not');
  ok(boost(holy, 'hp', 'barracks') === fort.aura.hp, 'the barracks men are tougher',
    `x${fort.aura.hp}`);
  ok(boost(holy, 'hp', 'archery') === 1, 'and nothing else is');

  // AND TWO TEMPLES COMPOUND. 1.1 x 1.1 rather than 1.1, so the second temple's
  // 150 gold buys as much of a step as the first one did — and a temple that has
  // bought nothing adds nothing, which is what the third state below is for.
  const two = { towers: [...holy.towers,
                         { ...turret(['wrath', 'fortitude']), fam: { id: 'monastery' },
                           def: monastery[3] }], units: [] };
  ok(auras(two).length === 4, 'a second taught temple puts its own two on the map');
  ok(near(boost(two, 'damage', 'archery'), wrath.aura.damage ** 2),
    'and the damage buff compounds', `x${boost(two, 'damage', 'archery').toFixed(2)}`);
  ok(near(boost(two, 'hp', 'barracks'), fort.aura.hp ** 2),
    'and so does the health', `x${boost(two, 'hp', 'barracks').toFixed(2)}`);

  const idle = { towers: [...holy.towers,
                          { ...turret([]), fam: { id: 'monastery' }, def: monastery[3] }],
                 units: [] };
  ok(near(boost(idle, 'damage', 'archery'), wrath.aura.damage),
    'but a second temple that has bought nothing adds nothing',
    `x${boost(idle, 'damage', 'archery')}`);

  // WHAT IT IS WORTH ON A SHOT, through the real firing code rather than the
  // multiplier alone: a Musketeer Post under a Holy Wrath fires for 66 instead of
  // 60, and Deadeye's own 300 goes with it.
  const t = post([]);
  const state = { towers: [t, { ...turret(['wrath']), fam: { id: 'monastery' }, def: monastery[3] }],
                  enemies: [dummy(t)], shots: [], units: [], hits: [] };
  let shot = null;
  for (let i = 0; i * DT < archery[3].cooldown + 0.1 && !shot; i++) {
    updateTowers(state, DT);
    if (state.shots.length) shot = state.shots[0];
    state.shots.length = 0;
  }
  ok(shot && shot.damage === Math.round(archery[3].damage * wrath.aura.damage),
    'and a shot fired under it really does land harder',
    `${archery[3].damage} becomes ${shot && shot.damage}`);

  // THE HEALTH SIDE, through updateUnits, including the case a hook would have
  // missed: the ability bought while the men are already standing there.
  const live = keep([]);
  const man = live.units[0];
  updateUnits(live, DT);
  ok(man.maxHp === barracks[3].soldier.hp, 'a man with no temple carries his own health',
    `${man.maxHp}`);

  man.hp = man.maxHp / 2;
  live.towers.push({ ...turret(['fortitude']), fam: { id: 'monastery' }, def: monastery[3] });
  updateUnits(live, DT);
  ok(man.maxHp === barracks[3].soldier.hp * fort.aura.hp,
    'and gains a fifth the moment the temple is taught',
    `${barracks[3].soldier.hp} becomes ${man.maxHp}`);
  // WOUNDED EXACTLY AS HE WAS. The aura raises the ceiling and lifts his health
  // with it, so a man at half stays at half rather than being handed the whole
  // difference. The slack is the one frame of out-of-combat regen that runs in the
  // same update — that heals him, the aura does not.
  const drift = (barracks[3].soldier.regen * DT) / man.maxHp + 1e-9;
  ok(Math.abs(man.hp / man.maxHp - 0.5) <= drift,
    'wounded exactly as he was, not healed by it',
    `${(100 * man.hp / man.maxHp).toFixed(1)}%`);

  live.towers.pop();
  updateUnits(live, DT);
  ok(man.maxHp === barracks[3].soldier.hp && man.hp > 0,
    'and gives it back when the temple is sold, without killing him',
    `${man.maxHp}, at ${(100 * man.hp / man.maxHp).toFixed(0)}%`);
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

console.log(bad ? `\n${bad} ability rule(s) broken.` : `\nAll ${ABILITIES.length} abilities do what they say.`);
process.exit(bad ? 1 : 0);
