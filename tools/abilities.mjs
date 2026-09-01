// What every tier 4 ability actually does, driven through the real modules.
// Node only.
//
//   node tools/abilities.mjs
//
// Every check below steps `updateTowers` or `updateUnits` from src/ — the code
// that ships — against a tower and a squad built the way input.js builds them.
// Nothing here is a model of an ability; it is the ability, minus drawing.
//
// TWO KINDS OF ABILITY LIVE HERE NOW. Most of them change a BUILDING and are
// asked through rangeOf, cooldownOf, framesOf or the shot loop. The Paladin
// Keep's two and the Assassin Guild's two change a MAN, so they are asked of a
// soldier standing on a road — and the Guild's are the first that need
// updateShots as well, because one of them is a thrown knife.
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

import { updateTowers, rangeOf, framesOf, beatsOf, cooldownOf, gunnerOf, auras, boost } from '../src/towers.js';
import { updateUnits, makeUnits, hidden, unhook } from '../src/units.js';
// The knives have to actually fly, or the Guild's section would watch blades
// hang in the air a hundred frames from the man who threw them.
import { updateShots } from '../src/projectiles.js';
import { archery, barracks, siege, monastery } from '../src/data/towers.js';
import { ABILITIES, abilityById, abilitiesOf, owns, ABILITY_COST } from '../src/data/abilities.js';
import { level } from '../src/level.js';
import { paths } from '../src/assets.js';
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
//
// ONE BUILDER FOR ALL SIX TOWERS, and it replaced six copies of the same object
// literal that differed in a family id, a def and a `spent`. They had already
// drifted: the Paladin Keep's board was missing `impacts`, which the Assassin
// Guild's had, so a keep that threw anything would have written to a list that
// was not there. Nothing threw from a keep, which is exactly how a copy stays
// broken.
//
// `beat` and `beatT` are here for every family rather than only for artillery.
// They cost a machine nothing and they are what artillery's clock IS — a def
// whose animation drives its firing reaches a beat boundary with `undefined - dt`
// otherwise, and a NaN clock never fires again with nothing to find.
const tower = (famId, def, spent, ids) => {
  const plot = level.plots[0];
  return {
    plot, fam: { id: famId }, def,
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0,
    aimMode: 0, spent, rally: null,
    abilities: [...ids], shots: 0, special: null, burst: 0, burstT: 0,
    hit: [], locked: null, hold: 0
  };
};

// The empty board a tower stands on. Every list the update loop appends to has
// to exist, which is the other half of what the six copies kept getting wrong.
const board = t => ({
  towers: [t], enemies: [], units: [], shots: [], hits: [],
  corpses: [], splats: [], impacts: []
});

const post = ids => tower('archery', archery[3], 500, ids);

// THE BALLISTA TURRET. Its clock is its animation rather than a cooldown — see
// beatsOf in src/towers.js — which is why the beat fields above are not optional.
const turret = ids => tower('siege', siege[3], 610, ids);

// A Crossbow Sentry: archery[4], because the ladder forks and both fourth rungs
// live in one array.
const sentry = ids => tower('archery', archery[4], 490, ids);

// The Cannon Outpost, artillery's own second fourth rung.
const outpost = ids => tower('siege', siege[4], 610, ids);

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
  const state = board(t);
  state.enemies.push(...Array.from({ length: men }, (_, i) => dummy(t, i)));
  const out = [];
  for (let i = 0; i * DT < seconds; i++) {
    updateTowers(state, DT);
    for (const s of state.shots) {
      // `burn` rather than `kind`, because Fiery Shot's ball IS a cannonball —
      // it inherits the kind so the kill line stays the cannon's. What tells the
      // two apart is what the ammunition leaves on what it hits.
      out.push({ t: i * DT, kind: s.ammo.kind, damage: s.damage, at: s.target.mark,
                 burn: !!s.ammo.burn });
    }
    state.shots.length = 0;
  }
  return out;
}

console.log('\nWhat a tier 4 offers\n');

{
  ok(ABILITIES.every(a => a.cost === ABILITY_COST),
    'every ability costs the same', `${ABILITY_COST}g`);

  // TWO OR NONE, and the "or none" arrived with the Crossbow Sentry.
  //
  // It was "every tier 4 there is offers two", which was true while there were
  // exactly four of them and each had a pair drawn for it. Archery's second tier
  // 4 has no abilities, and that is not an oversight to be papered over with two
  // invented ones: an ability is a button wearing a piece of the artist's
  // artwork, so a pair the artist has not drawn cannot be added by this file.
  //
  // What is still worth holding is the SHAPE — a tower that teaches anything
  // teaches exactly two, so the ring never has one lonely disc on it or three
  // fighting for two angles.
  const owners = [...archery, ...barracks, ...siege, ...monastery].filter(d => d.tier === 4);
  ok(owners.every(d => !d.abilities || d.abilities.length === 2),
    'and every tier 4 tower offers two or none',
    owners.map(d => `${d.name} ${(d.abilities || []).length}`).join(', '));

  // TIER 4 ONLY. Nothing below it may carry an ability, because the whole reason
  // an ability exists is that a topped-out ladder has nothing left to buy — a
  // tier 2 tower has an upgrade instead, and an ability on it would be competing
  // with the thing it is meant to replace.
  const lower = [...archery, ...barracks, ...siege, ...monastery].filter(d => d.tier < 4);
  ok(lower.every(d => !d.abilities), 'and nothing below tier 4 offers any',
    `${lower.length} lower tiers checked`);

  // Every id a tier names has to resolve, or the menu would draw a button for
  // `undefined` and the tower would silently never use it.
  const named = owners.flatMap(d => d.abilities || []);
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

  // AND IT REACHES THE WHOLE BOARD. Every other shot in the game is bounded by
  // the tower's ring; this one is not, so a Post can answer an archer thug
  // standing off in a corner no tower covers.
  //
  // The check needs both kinds of enemy on the board: one inside the ring to keep
  // the musket working — the count is shots FIRED, so a tower with nothing to
  // shoot never reaches its tenth — and one outside it that the standing order
  // prefers. Mode 0 ranks by how far each man still has to walk, so the far one
  // is put further along the road.
  {
    const t2 = post(['deadeye']);
    const inRing = dummy(t2);
    const outside = {
      ...dummy(t2), x: t2.x + 900, y: t2.y + 300, s: 900, mark: 'far'
    };
    inRing.mark = 'near';
    const st = { towers: [t2], enemies: [inRing, outside], shots: [], units: [], hits: [] };
    const got = [];
    for (let i = 0; i * DT < cd * dead.every + 0.1; i++) {
      updateTowers(st, DT);
      for (const sh of st.shots) got.push({ kind: sh.ammo.kind, at: sh.target.mark });
      st.shots.length = 0;
    }
    const reach = rangeOf(t2);
    const away = Math.hypot(900, 300);
    ok(got.slice(0, dead.every - 1).every(g => g.at === 'near'),
      'every ordinary shot stays inside the ring', `${reach}px`);
    ok(got[dead.every - 1] && got[dead.every - 1].kind === 'deadeye' &&
       got[dead.every - 1].at === 'far',
      'and the Deadeye ball reaches a man outside it',
      `${Math.round(away)}px away, against a ${reach}px ring`);
  }

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
  const state = board(tower('barracks', barracks[3], 530, ids));
  makeUnits(state, state.towers[0]);
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

console.log('\nReinforced Tension\n');

{
  const plain = turret([]);
  const far = turret(['ballista_tension']);
  const shot = abilityById('ballista_tension');

  ok(rangeOf(plain) === siege[3].range, 'an untaught turret reaches what its tier says',
    `${rangeOf(plain)}`);
  ok(rangeOf(far) === Math.round(siege[3].range * shot.rangeTimes),
    'and one that has bought Reinforced Tension reaches further',
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
  // THE PAUSE IS PART OF THE CYCLE. `after` is a second the crew spend recovering
  // once the heavy bolt has left, so a cycle is 4 ordinary reloads PLUS it — 8.2s
  // rather than 7.2s. Reading the cycle as cooldown * every alone is what this
  // file did before the pause existed, and it counted 11 bolts where it wanted 12.
  const pause = d => siege[3].cooldown * ((d.afterTimes || 1) - 1);
  const cycle = siege[3].cooldown * heavy.every + pause(heavy);

  // Three whole cycles, less a hair, for the same reason Burst Fire's window is a
  // cycle less a hair: the next shot lands on the boundary.
  const n = heavy.every;
  const shots = fire(t, cycle * 3 - 0.1);
  ok(shots.length === n * 3, `${n * 3} bolts in three cycles of ${n}`, `${shots.length}`);

  // AND THE PAUSE IS WHERE IT IS CLAIMED TO BE: after the heavy one, not spread
  // over the cycle. The gap before bolt 5 has to be a second longer than the gap
  // before bolt 2, or the crew are paying for something the player cannot see.
  const gap = i => shots[i].t - shots[i - 1].t;
  ok(Math.abs(gap(n) - gap(1) - pause(heavy)) < 2 * DT,
    `and the crew lose ${pause(heavy).toFixed(1)}s right after the heavy one`,
    `${gap(1).toFixed(2)}s ordinary, ${gap(n).toFixed(2)}s after it`);

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
  // AND LANDS LIKE ARTILLERY. An ordinary bolt leaves the white ring every arrow
  // leaves; this throws up earth the way a catapult's rock does, which is the
  // artist's own note and the only thing on the board that says a HEAVY one
  // arrived. `impact` is the flag land() reads — see src/projectiles.js.
  ok(heavy.ammo.impact === true && !siege[3].ammo.impact,
    'and kicks up earth where an ordinary bolt does not');
}

console.log('\nBoth of them, on one turret\n');

{
  const both = turret(['ballista_tension', 'heavybolt']);
  const heavy = abilityById('heavybolt');

  // THE OWNER'S OWN CONDITION: buy both and both pictures are used. They are
  // independent — one changes the machine, the other changes what leaves it — so
  // the check is that neither swallows the other.
  ok(rangeOf(both) === Math.round(siege[3].range * abilityById('ballista_tension').rangeTimes),
    'it reaches the far distance',
    `${rangeOf(both)}`);
  ok(framesOf(both.def, both).join() === abilityById('ballista_tension').frames.join(),
    'and is drawn in iron');

  const shots = fire(both, siege[3].cooldown * heavy.every - 0.1);
  ok(shots[heavy.every - 1].damage === siege[3].damage * heavy.times,
    `and bolt ${heavy.every} is still the heavy one`,
    `${shots[heavy.every - 1].damage}`);

  // WHAT THE ABILITY IS WORTH PER SECOND, and the window has to be a WHOLE number
  // of each tower's own cycles or the comparison is an artefact of where it was
  // cut. They are no longer the same length — the pause makes the armed turret's
  // cycle 8.2s against 7.2s — so each is fired for its own 3 cycles and the damage
  // divided by the time it actually took.
  const span = n => n - 0.1;
  const bare = siege[3].cooldown * heavy.every * 3;
  const armedSpan = (siege[3].cooldown * heavy.every +
                     siege[3].cooldown * ((heavy.afterTimes || 1) - 1)) * 3;
  const plain = fire(turret([]), span(bare));
  const armed = fire(turret(['heavybolt']), span(armedSpan));
  const sum = list => list.reduce((s, x) => s + x.damage, 0);
  console.log(`      one turret: ${(sum(plain) / bare).toFixed(1)}/s plain over ` +
              `${plain.length} bolts, ${(sum(armed) / armedSpan).toFixed(1)}/s with ` +
              `Heavy Bolt over ${armed.length} — the pause is already in it`);
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
  ok(auras(bare).length === 0, 'a map with no altar has no aura');
  for (const f of ['archery', 'siege', 'monastery', 'barracks']) {
    ok(boost(bare, 'damage', f) === 1 && boost(bare, 'hp', f) === 1,
      `and nothing is boosted on it (${f})`);
  }

  // ONE ALTAR, TAUGHT BOTH.
  const holy = { towers: [...map(['archery', 'siege', 'monastery', 'barracks']).towers,
                          { ...turret(['wrath', 'fortitude']), fam: { id: 'monastery' },
                            def: monastery[3] }], units: [] };
  ok(auras(holy).length === 2, 'an altar taught both puts two auras on the map');
  ok(boost(holy, 'damage', 'archery') === wrath.aura.damage &&
     boost(holy, 'damage', 'siege') === wrath.aura.damage &&
     boost(holy, 'damage', 'monastery') === wrath.aura.damage,
    'every shooting family hits harder', `x${wrath.aura.damage}`);
  ok(boost(holy, 'damage', 'barracks') === 1, 'and the barracks does not');
  ok(boost(holy, 'hp', 'barracks') === fort.aura.hp, 'the barracks men are tougher',
    `x${fort.aura.hp}`);
  ok(boost(holy, 'hp', 'archery') === 1, 'and nothing else is');

  // AND TWO TEMPLES COMPOUND. 1.1 x 1.1 rather than 1.1, so the second altar's
  // 150 gold buys as much of a step as the first one did — and an altar that has
  // bought nothing adds nothing, which is what the third state below is for.
  const two = { towers: [...holy.towers,
                         { ...turret(['wrath', 'fortitude']), fam: { id: 'monastery' },
                           def: monastery[3] }], units: [] };
  ok(auras(two).length === 4, 'a second taught altar puts its own two on the map');
  ok(near(boost(two, 'damage', 'archery'), wrath.aura.damage ** 2),
    'and the damage buff compounds', `x${boost(two, 'damage', 'archery').toFixed(2)}`);
  ok(near(boost(two, 'hp', 'barracks'), fort.aura.hp ** 2),
    'and so does the health', `x${boost(two, 'hp', 'barracks').toFixed(2)}`);

  const idle = { towers: [...holy.towers,
                          { ...turret([]), fam: { id: 'monastery' }, def: monastery[3] }],
                 units: [] };
  ok(near(boost(idle, 'damage', 'archery'), wrath.aura.damage),
    'but a second altar that has bought nothing adds nothing',
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
  ok(man.maxHp === barracks[3].soldier.hp, 'a man with no altar carries his own health',
    `${man.maxHp}`);

  man.hp = man.maxHp / 2;
  live.towers.push({ ...turret(['fortitude']), fam: { id: 'monastery' }, def: monastery[3] });
  updateUnits(live, DT);
  ok(man.maxHp === barracks[3].soldier.hp * fort.aura.hp,
    'and gains a fifth the moment the altar is taught',
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
    'and gives it back when the altar is sold, without killing him',
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

console.log('\nThe Crossbow Sentry\'s two\n');

{
  const plain = sentry([]);
  const steel = sentry(['sentry_tension']);
  const quick = sentry(['swift']);
  const both  = sentry(['sentry_tension', 'swift']);
  const tension = abilityById('sentry_tension');

  ok(rangeOf(plain) === archery[4].range, 'an untaught sentry reaches what its tier says',
    `${rangeOf(plain)}`);
  ok(rangeOf(steel) === Math.round(archery[4].range * tension.rangeTimes),
    'and one that has bought Reinforced Tension reaches further',
    `${rangeOf(steel)} against ${rangeOf(plain)}`);

  // THE STANDARDISATION, and it is the whole reason the tier's own range came
  // down to 260: the owner wants one ability with one answer on both bows. Two
  // different towers, two different tiers, the same 390 once it is bought.
  const far = turret(['ballista_tension']);
  ok(rangeOf(steel) === rangeOf(far),
    'and lands on exactly the reach a Ballista Turret buys',
    `${rangeOf(steel)} both`);
  ok(abilityById('sentry_tension').name === abilityById('ballista_tension').name &&
     abilityById('sentry_tension').rangeTimes === abilityById('ballista_tension').rangeTimes,
    'under the same name and the same multiple',
    `${tension.name}, x${tension.rangeTimes}`);

  // SWIFT RELOAD, the one absolute in the game. Read through cooldownOf rather
  // than off the ability, so what is checked is the path the shot loop takes.
  ok(cooldownOf(plain) === archery[4].cooldown, 'an untaught sentry reloads at its tier\'s rate',
    `${cooldownOf(plain)}s`);
  // A MULTIPLIER ON THE SPEED, so the check is the RATIO rather than a number:
  // retune the tier's reload and this still has to hold. That is the whole reason
  // the owner moved it off an absolute.
  const swift = abilityById('swift');
  ok(Math.abs(cooldownOf(plain) / cooldownOf(quick) - swift.reloadTimes) < 1e-9,
    'and Swift Reload scales the rate rather than setting it',
    `${cooldownOf(quick).toFixed(2)}s against ${cooldownOf(plain)}s, x${swift.reloadTimes} faster`);
  ok(cooldownOf(quick) < cooldownOf(plain), 'so it is a decrease in time, not an increase',
    `${cooldownOf(quick).toFixed(2)} < ${cooldownOf(plain)}`);
  // AND IT SURVIVES A RETUNE, which an absolute would not have. Same tower, a
  // tier reload moved under it, the ability's own multiple out the other side —
  // read off `swift` rather than typed, which is why the owner's retunes of it
  // (0.50 absolute, then 1.25, now 1.35) have never needed a line changed here.
  {
    const retuned = sentry(['swift']);
    retuned.def = { ...archery[4], cooldown: 1.2 };
    ok(Math.abs(cooldownOf(retuned) - 1.2 / swift.reloadTimes) < 1e-9,
      'and it still scales when the tier is retuned',
      `1.2s becomes ${cooldownOf(retuned).toFixed(2)}s`);
  }

  // THEY STACK RATHER THAN COMPETE, which is the claim the prose makes.
  ok(rangeOf(both) === rangeOf(steel) && cooldownOf(both) === cooldownOf(quick),
    'and the two together are both of them',
    `${rangeOf(both)}px every ${cooldownOf(both).toFixed(2)}s`);

  // THE PICTURE FOLLOWS THE RULE, the same way the ballista's frames do: a man
  // shooting 390 with a timber bow would be the board disagreeing with the fight.
  ok(gunnerOf(plain) === null, 'an untaught crossbowman keeps his timber bow');
  ok(gunnerOf(steel) && gunnerOf(steel).sprite === 'crossbowman_steel' &&
     gunnerOf(steel).attack === 'crossbowman_steel_attack',
    'and Reinforced Tension redraws BOTH his poses in steel',
    gunnerOf(steel).sprite);
  ok(gunnerOf(quick) === null, 'while Swift Reload leaves the drawing alone');

  // AND THE STEEL PAIR REGISTERS ON THE TIMBER PAIR. Same trims to the pixel, so
  // the swap cannot move him — the artist's promise, checked rather than trusted.
  // tools/shadow.mjs holds the other half, that both shadows land on one pixel.
  const A = paths['crossbowman'], B = paths['crossbowman_steel'];
  ok(!!A && !!B, 'and both pairs are wired to files', `${A} / ${B}`);
}

// --- the Assassin Guild's two ----------------------------------------------------
//
// THE FIRST PAIR THAT LIVE IN units.js RATHER THAN towers.js, because they change
// what a MAN does. Everything above this line is asked of a building through
// rangeOf, cooldownOf, framesOf or the shot loop; these two are asked of a soldier
// standing on a road, so the fixture is the paladin's rather than the sentry's.
function guild(ids) {
  const def = barracks.find(d => d.name === 'Assassin Guild');
  const state = board(tower('barracks', def, 530, ids));
  makeUnits(state, state.towers[0]);
  // ONE MAN, for the same reason the Keep's fixture keeps one: every counter here
  // is the soldier's, and three assassins throwing would put three rhythms on one
  // health bar.
  state.units.length = 1;
  // AND STOOD ON HIS POST FROM THE FIRST FRAME. makeUnits puts a man at the tower
  // and lets him march out, and a march is 2s of this fixture in which he throws
  // nothing — but worse than slow, it makes every distance below a lie: a settled
  // man is anywhere within SETTLE of his post, so an enemy placed 205px from the
  // POST can be 190px from the man. Snapping him there first is what lets the
  // reach checks name an exact number.
  state.units[0].x = state.units[0].rx;
  state.units[0].y = state.units[0].ry;
  return state;
}

// An enemy standing a measured distance ALONG X from the point man, out of every
// melee reach. X rather than any other direction on purpose: `inRange` squashes
// the vertical by SQUASH for the board's perspective, so a distance typed here is
// only the distance the ability claims if it is sideways.
function standoff(state, dist) {
  const u = state.units[0];
  const e = {
    def: { r: 10, hp: 1e9, speed: 0, atkCd: 1e9, damage: 0, name: 'dummy' },
    x: u.x + dist, y: u.y, hp: 1e9, maxHp: 1e9,
    route: 0, lane: 1, s: 0,
    foe: null, acd: 1e9, thrust: 0, halted: false, leaked: false
  };
  state.enemies.push(e);
  return e;
}

// Walk the world forward with the knives in it. updateShots is what makes a throw
// land, so a test that only stepped updateUnits would watch blades hang in the air.
function throwFor(state, seconds) {
  const hits = [];
  const seen = [];
  // WHICH BLADE LEFT HIS HAND, recorded as it is created rather than as it lands:
  // Sneak Attack throws a different drawing of the same knife, and that picture is
  // the only thing on the board that says which knives are the heavy ones.
  const blades = [];
  let last = state.enemies[0] ? state.enemies[0].hp : 0;
  for (let i = 0; i < seconds / DT; i++) {
    const before = state.shots.length;
    updateUnits(state, DT);
    for (let k = before; k < state.shots.length; k++) blades.push(state.shots[k].ammo.sprite);
    updateShots(state, DT);
    seen.push(!hidden(state.units[0]));
    if (state.enemies[0] && state.enemies[0].hp !== last) {
      hits.push(Math.round(last - state.enemies[0].hp));
      last = state.enemies[0].hp;
    }
  }
  return { hits, seen, blades };
}

console.log('\nKnife Throw\n');

{
  const man = barracks.find(d => d.name === 'Assassin Guild').soldier;
  const throwing = abilityById('knife');
  // WELL INSIDE HIS REACH, read off the ability rather than typed. The reach has
  // been 200 and is now 100, and a distance written here would have failed every
  // check in this section for a reason that has nothing to do with what they ask.
  const close = Math.round(throwing.reach * 0.7);

  // NOTHING AT ALL UNTIL IT IS BOUGHT, which is the baseline the rest of this
  // section is measured against — and it is also the state of every other barracks
  // in the game: a settled soldier with a man 150px away does exactly nothing.
  {
    const state = guild([]);
    standoff(state, close);
    const { hits } = throwFor(state, 6);
    ok(hits.length === 0, `an untaught assassin throws nothing at a man ${close}px off`,
      `${hits.length} hits in 6s`);
  }

  {
    const state = guild(['knife']);
    standoff(state, close);
    const { hits } = throwFor(state, 6);
    ok(hits.length > 0, 'and one that has bought Knife Throw reaches him', `${hits.length} knives in 6s`);
    ok(hits.length > 0 && hits.every(h => h === Math.round(man.damage * throwing.times)),
      'each worth his whole blade, as a multiple of it',
      `${hits.join(' + ')} against ${man.damage} in the hand`);
    // AT HIS OWN RATE. The throw is the ELSE of the melee branch and shares `cd`,
    // so a man can never throw and swing in the same beat — and the count over six
    // seconds is what says so out loud.
    const want = Math.floor(6 / man.cd);
    ok(Math.abs(hits.length - want) <= 1, 'and thrown at the rate he swings',
      `${hits.length} in 6s against ${want} swings`);
  }

  // THE REACH IS THE ABILITY'S, and 200 is a real edge rather than a number in a
  // file: one man five px inside it is hit and one five px outside is not.
  for (const [dist, want] of [[throwing.reach - 5, true], [throwing.reach + 5, false]]) {
    const state = guild(['knife']);
    standoff(state, dist);
    const { hits } = throwFor(state, 4);
    ok((hits.length > 0) === want, `a man at ${dist}px is ${want ? 'in' : 'out of'} his reach`,
      `${hits.length} knives`);
  }

  // AND IT IS NOT THE TOWER'S RANGE, which is the whole reason the field is called
  // `reach`. rangeOf() returns an ability's `range` in place of the tier's, and the
  // Guild's 210 is the LEASH on its rally point — so a field named `range` here
  // would have silently shortened every taught Guild's leash to 200. The check is
  // cheap and the bug would have had no visible cause.
  {
    const taught = guild(['knife']).towers[0];
    const bare = guild([]).towers[0];
    ok(rangeOf(taught) === rangeOf(bare) && rangeOf(taught) === bare.def.range,
      'and buying it leaves the rally leash exactly where it was',
      `${rangeOf(taught)}px both, the tier's own ${bare.def.range}`);
  }

  // HE STAYS OUT FOR THE WHOLE VOLLEY, and this is the owner's second answer on
  // the question. It was a quarter-second flash per throw, which read as the right
  // idea and had a consequence nobody wants: a man who hides between knives
  // re-arms his Sneak Attack between knives too, and every blade becomes a heavy
  // one. So he now shows himself while anything is in reach and vanishes when the
  // road in front of him is clear.
  //
  // BOTH HALVES, because either alone is satisfiable by a bug: a man permanently
  // visible passes the first, and a man permanently hidden passes the second.
  {
    const state = guild(['knife']);
    const e = standoff(state, close);
    const a = throwFor(state, 4);
    const shownWhileThrowing = a.seen.filter(Boolean).length / a.seen.length;

    // Take the enemy off the board and give him the length of a throw to fade.
    state.enemies.length = 0;
    const b = throwFor(state, 2);
    const shownAfter = b.seen.filter(Boolean).length / b.seen.length;

    ok(shownWhileThrowing > 0.95, 'he is out in the open for the whole volley',
      `visible ${(shownWhileThrowing * 100).toFixed(0)}% of 4s`);
    ok(shownAfter === 0, 'and gone the moment nothing is in reach',
      `visible ${(shownAfter * 100).toFixed(0)}% of the next 2s`);

    // AND WALKING HIDES HIM TOO, which is the other half of the owner's sentence
    // and the half that gives him his opening blow: a man who has been sent
    // somewhere is out of reach of everything by definition, so he fades, re-arms,
    // and arrives with a Sneak Attack ready.
    //
    // THE ENEMY STAYS ON THE BOARD AND INSIDE HIS REACH, or this would pass for
    // the wrong reason — an empty road hides him whether or not walking does. He
    // is sent 40px the OTHER WAY, so for the first part of the march the man is
    // moving and the enemy is still well within 100px.
    //
    // Asserted per frame against whether he ACTUALLY MOVED, rather than over a
    // span of time: "while he is walking" is a property of a frame, and a fixed
    // number of frames would be a guess about how long a 40px walk takes.
    state.enemies.push(e);
    const u = state.units[0];
    u.rx = u.x - 40;
    u.ry = u.y;
    let walked = 0, seenWalking = 0;
    for (let i = 0; i < 60; i++) {
      const wasX = u.x, wasY = u.y;
      updateUnits(state, DT);
      updateShots(state, DT);
      if (Math.hypot(u.x - wasX, u.y - wasY) < 1e-9) continue;
      walked++;
      if (!hidden(u)) seenWalking++;
    }
    ok(walked > 10 && seenWalking === 0, 'and a man on the move is unseen while he moves',
      `${walked} frames of walking, ${seenWalking} of them visible`);
  }
}

console.log('\nSneak Attack\n');

{
  const man = barracks.find(d => d.name === 'Assassin Guild').soldier;
  const sneak = abilityById('sneak');

  // IN MELEE IT IS THE OPENER AND ONLY THE OPENER. He is visible for as long as he
  // has hold of somebody, so nothing re-arms until the fight is over — which is
  // exactly the "resets when they become invisible and visible again" rule read on
  // the half where he never goes invisible.
  {
    const state = guild(['sneak']);
    const u = state.units[0];
    const e = victim(state);
    u.x = e.x - 12;
    u.y = e.y;

    let last = e.hp;
    const blows = [];
    const art = [];
    for (let i = 0; i < 60 * 4; i++) {
      updateUnits(state, DT);
      if (e.hp !== last) { blows.push(Math.round(last - e.hp)); art.push(u.holdArt); last = e.hp; }
    }
    ok(blows.length >= 3, 'he lands a run of blows', `${blows.length} in 4s`);
    ok(blows[0] === man.damage * sneak.times,
      `and the first is worth ${sneak.times} of them`,
      `${blows[0]} against his ${man.damage}`);
    ok(blows.slice(1).every(b => b === man.damage), 'and every one after it is an ordinary blow',
      blows.join(' + '));
    ok(art[0] === sneak.pose && art[1] === null,
      'and only the first is drawn in the sneak pose', sneak.pose.sprite);
  }

  // AND IT COMES BACK BY HIDING, WHICH IS THE ONLY THING THAT BRINGS IT BACK. The
  // fight is ended by taking the enemy away rather than by killing it, so the ONLY
  // thing that changed between the two openers is that he was unseen in between.
  {
    const state = guild(['sneak']);
    const u = state.units[0];
    const e = victim(state);
    u.x = e.x - 12;
    u.y = e.y;

    const strike = () => {
      let hp = e.hp;
      for (let i = 0; i < 60 * 2 && e.hp === hp; i++) updateUnits(state, DT);
      return Math.round(hp - e.hp);
    };
    const first = strike();
    const second = strike();
    // THE FIGHT ENDS AND ANOTHER ONE STARTS, with the same enemy at full health —
    // so the only thing that changed between the two openers is that he was unseen
    // in between, which is precisely the claim.
    //
    // BOTH HALVES OF LEAVING THE BOARD, which is what enemies.js does on a death
    // or a leak and what a shorter version of this got wrong twice. Emptying the
    // array is not enough — `u.foe` is a reference and holds him in the fight —
    // and unhooking is not enough either, because the blocking pass would take
    // hold of the same enemy again on the very next frame. Half a second is
    // comfortably past LUNGE's quarter.
    unhook(e);
    state.enemies.length = 0;
    for (let i = 0; i < 30; i++) updateUnits(state, DT);
    const wasHidden = hidden(u);
    state.enemies.push(e);
    const third = strike();

    ok(first === man.damage * sneak.times && second === man.damage,
      'a fight opens with the bonus and then settles', `${first} then ${second}`);
    ok(wasHidden, 'and he is unseen once the fight is over');
    ok(third === man.damage * sneak.times, 'so the next fight opens with it again',
      `${third}`);
  }

  // THE TWO TOGETHER, and this is the interaction worth writing a test for rather
  // than a sentence about. A thrower is only visible for the quarter second the
  // knife is in his hand, so he is hidden again — and armed again — before the next
  // one. EVERY knife is a sneak. It is the literal reading of the owner's rule and
  // it is what makes the pair worth buying; it is also the number to watch if the
  // Guild turns out too strong, which is why it is stated here in damage a second.
  {
    const state = guild(['knife', 'sneak']);
    standoff(state, Math.round(abilityById('knife').reach * 0.7));
    const { hits } = throwFor(state, 6);
    const alone = Math.round(man.damage * abilityById('knife').times);

    // ONE SNEAK PER VOLLEY, WHICH IS THE WHOLE OF THE OWNER'S CORRECTION. It was
    // every knife, because he hid for half a second between throws and re-armed
    // each time; now he stays out for as long as anything is in reach, so the
    // first blade is the heavy one and the rest are ordinary.
    //
    // AND IT TAKES THE THROWN MULTIPLE, not the blade's. The two are different
    // numbers on purpose — see the note on the ability — so reading the wrong one
    // here would pass while the game did something else.
    const thrownTimes = sneak.thrownTimes ?? sneak.times;
    ok(hits[0] === alone * thrownTimes, 'a volley opens with a sneaked knife',
      `${hits[0]} against ${alone}`);
    ok(hits.slice(1).every(h => h === alone), 'and every knife after it is an ordinary one',
      hits.join(' + '));

    // THE BLADE IS WORTH MORE THAN THE KNIFE, which is the claim the split exists
    // to make. Asserted as an ORDER rather than as two figures, so retuning either
    // one is free and reversing them is not.
    ok(sneak.times > thrownTimes,
      'and creeping to arm\'s length pays better than throwing from cover',
      `x${sneak.times} in the hand against x${thrownTimes} thrown`);

    // AND THE NUMBER THAT COMES OUT OF IT, printed rather than merely asserted,
    // because it is the figure in this file worth arguing about — and because it
    // has moved twice. At half a blow it was 37.5 a second; at a whole blow with a
    // sneak on EVERY knife it was 150, which is what the owner caught. Sustained,
    // it is now the squad's own melee output, with one opener on top of each
    // volley.
    const sustained = (alone / man.cd) * man.count;
    const melee = (man.damage / man.cd) * man.count;
    ok(sustained === melee,
      `which settles at the squad's own melee output, at ${abilityById('knife').reach}px`,
      `${sustained.toFixed(1)}/s thrown against ${melee.toFixed(1)}/s in the hand, ` +
      `plus ${alone * (thrownTimes - 1) * man.count} opening a volley and ` +
      `${man.damage * (sneak.times - 1) * man.count} opening a fight`);
  }

  // --- AND THE BOARD SAYS WHICH IS WHICH -----------------------------------------
  //
  // A squad throwing two different numbers with one drawing is a squad the player
  // cannot read. The heavy knife is the whole of the ranged half's feedback — the
  // POSE cannot carry it, because a man mid-throw looks the same whichever blade
  // is leaving his hand — so it is worth a check of its own rather than a trust in
  // one field being set.
  const plainKnife = abilityById('knife').ammo;
  const heavy = sneak.ammo;

  {
    const bare = guild(['knife']);
    standoff(bare, Math.round(abilityById('knife').reach * 0.7));
    const both = guild(['knife', 'sneak']);
    standoff(both, Math.round(abilityById('knife').reach * 0.7));

    const a = throwFor(bare, 4).blades;
    const b = throwFor(both, 4).blades;

    ok(a.length > 0 && a.every(k => k === plainKnife.sprite),
      'an untaught Guild throws one blade all volley', `${a.length} x ${a[0]}`);
    // THE FIRST ONE AND ONLY THE FIRST, which is now the picture of the rule
    // itself: the drawing in the air changes on exactly the throw the damage does.
    ok(b[0] === heavy.sprite && b.slice(1).every(k => k === plainKnife.sprite),
      'and a taught one opens with the heavy blade and follows with plain',
      `${b[0]} then ${b.length - 1} x ${b[1]}`);
    ok(a[0] !== b[0], 'so the two are not the same picture',
      `${a[0]} against ${b[0]}`);
  }

  // IT IS THE SAME WEAPON, though, and everything but the picture says so. A
  // separate `kind` would have given it its own kill cry and its own landing
  // noise, and there is one recording of a knife going in.
  ok(heavy.kind === plainKnife.kind && heavy.speed === plainKnife.speed &&
     heavy.landSound === plainKnife.landSound && heavy.fireSound === plainKnife.fireSound,
    'it flies, lands and kills as the same knife', `kind ${heavy.kind}`);

  // AND IT LEAVES HIS HAND FROM THE SAME POINT OF THE BLADE. `grip` is a fraction
  // of each trim and the two trims differ, so the fractions HAVE to differ to mean
  // the same thing — 0.08 of 39 and 0.084 of 37 are both about 3.1 source px in
  // from the tip. Checked in px rather than trusted, because this is exactly the
  // arithmetic a re-export silently invalidates.
  const fromTip = a => a.grip * a.trim[2];
  ok(Math.abs(fromTip(heavy) - fromTip(plainKnife)) < 0.25,
    'and from the same point of it, measured from the tip',
    `${fromTip(plainKnife).toFixed(2)}px against ${fromTip(heavy).toFixed(2)}px`);

  ok(!!paths[plainKnife.sprite] && !!paths[heavy.sprite],
    'and both blades are wired to files',
    `${paths[plainKnife.sprite]} / ${paths[heavy.sprite]}`);
}

// --- the Cannon Outpost's two --------------------------------------------------
//
// Both are shapes this file has checked before — a reload multiplier and an
// every-Nth-shot special — on a family where they mean something different.

console.log('\nThe Cannon Outpost\n');

// Built like turret() above and for the same reason: this family's clock is its
// animation, so `beat` and `beatT` are the fields that matter. siege[4], because
// the ladder forks and both fourth rungs live in one array.

{
  const gun = siege[4];
  const plain = outpost([]);
  const quick = outpost(['cannon_swift']);
  const swift = abilityById('cannon_swift');

  ok(near(cooldownOf(plain) / cooldownOf(quick), swift.reloadTimes),
    'Swift Reload scales the cannon\'s rate as it scales the sentry\'s',
    `${cooldownOf(quick).toFixed(2)}s against ${cooldownOf(plain).toFixed(2)}s, x${swift.reloadTimes}`);

  // AND THE ANIMATION FOLLOWS IT, which is the check this ability actually needed
  // and the one nothing else in this file could have caught.
  //
  // ARTILLERY'S CLOCK IS ITS ANIMATION. stepCrew advances on beat boundaries and
  // the shot leaves on the Fire beat; `cooldown` is a DESCRIPTION of the beats
  // that the menu and the encyclopedia read. So a reload ability that divided
  // cooldownOf alone does literally nothing to this tower — the card would promise
  // a ball every 2 seconds, the machine would go on firing every 3, and there
  // would be no error anywhere to find it by. That is what the first version of
  // this ability did, and it is why beatsOf takes a tower now.
  const slow = beatsOf(gun, plain);
  const fast = beatsOf(gun, quick);
  ok(fast.every((b, i) => near(slow[i] / b, swift.reloadTimes)),
    'and every beat of the machine shortens by the same figure',
    `${slow.map(b => b.toFixed(2)).join('/')} -> ${fast.map(b => b.toFixed(2)).join('/')}`);

  const sum = a => a.reduce((x, y) => x + y, 0);
  ok(near(sum(fast), cooldownOf(quick)),
    'so the beats still add up to the cooldown, taught or not',
    `${sum(fast).toFixed(2)}s = ${cooldownOf(quick).toFixed(2)}s`);

  // AND THE OBSERVED GAP IS THE PROMISED ONE. The three above are arithmetic;
  // this is the machine, run for twenty seconds, timed as the balls leave.
  for (const [t, want, label] of [[outpost([]), 3.00, 'untaught'],
                                  [outpost(['cannon_swift']), 2.00, 'taught']]) {
    const shots = fire(t, 20);
    const gaps = shots.slice(1).map((v, i) => v.t - shots[i].t);
    const avg = sum(gaps) / gaps.length;
    ok(Math.abs(avg - want) < 0.05,
      `and a ${label} outpost really fires every ${want.toFixed(2)}s`,
      `${avg.toFixed(2)}s over ${gaps.length} gaps`);
  }

  // FIERY SHOT: one ball in five, and it is the FIFTH rather than the first.
  const fiery = abilityById('fiery');
  const balls = fire(outpost(['fiery']), 40);
  ok(balls.length >= 10, 'a taught outpost keeps firing', `${balls.length} balls`);
  ok(balls.filter(b => b.burn).length === Math.floor(balls.length / fiery.every),
    `and one ball in ${fiery.every} is the burning one`,
    balls.map(b => (b.burn ? 'F' : '.')).join(''));
  ok(balls.slice(0, fiery.every).map(b => (b.burn ? 'F' : '.')).join('')
     === '.'.repeat(fiery.every - 1) + 'F',
    'and it is the fifth rather than the first',
    balls.slice(0, fiery.every).map(b => (b.burn ? 'F' : '.')).join(''));

  // THE BURNING BALL IS STILL A CANNONBALL — same reach, same speed, same arc,
  // same kill line. Everything the ability changes is at the two ends of the
  // flight, which is what its note claims and what makes the `burn` flag above
  // the only way to tell the two apart at all.
  ok(fiery.ammo.speed === gun.ammo.speed && fiery.ammo.kind === gun.ammo.kind &&
     fiery.ammo.arc === gun.ammo.arc && fiery.ammo.lob === gun.ammo.lob,
    'and it flies exactly like an ordinary ball',
    `${fiery.ammo.speed}px/s, arc ${fiery.ammo.arc}, kind ${fiery.ammo.kind}`);

  // AND NO EXTRA DAMAGE ON IMPACT, which is the difference from Heavy Bolt and is
  // worth pinning: this ability's whole magnitude is in the burn, so a `times`
  // creeping in here would be doubling something that is already paid for.
  ok(!fiery.times && !fiery.damage && balls.every(b => b.damage === gun.damage),
    'and hits for the tower\'s ordinary blow, with the burn on top',
    `${gun.damage} + ${fiery.ammo.burn.dps}/s for ${fiery.ammo.burn.seconds}s`);

  // AND THE CREW PAY FOR IT, exactly as the ballista's crew pay for a heavy bolt.
  // The gap before the ball AFTER the burning one is half a reload longer than an
  // ordinary gap — hung on the Fire beat, so the machine holds its firing pose
  // rather than opening a hole in the rhythm. See stepCrew in src/towers.js.
  const gapAfter = i => balls[i].t - balls[i - 1].t;
  const pause = gun.cooldown * ((fiery.afterTimes || 1) - 1);
  ok(Math.abs(gapAfter(fiery.every) - gapAfter(1) - pause) < 2 * DT,
    `and the crew lose ${pause.toFixed(1)}s right after the burning one`,
    `${gapAfter(1).toFixed(2)}s ordinary, ${gapAfter(fiery.every).toFixed(2)}s after it`);

  // AND THE PAUSE FOLLOWS SWIFT RELOAD, which is the whole reason it is written as
  // a multiple rather than as a number of seconds. A crew drilled to load in 2.0s
  // recover from a fiery ball in 1.0s, not in the 1.5s their untaught cooldown
  // would have said. It is taken off cooldownOf — the tower's real reload — so a
  // machine that reloads faster pays less, in the same proportion.
  {
    const both = fire(outpost(['cannon_swift', 'fiery']), 40);
    const gapB = i => both[i].t - both[i - 1].t;
    const quickPause = cooldownOf(outpost(['cannon_swift'])) * (fiery.afterTimes - 1);
    ok(Math.abs(gapB(fiery.every) - gapB(1) - quickPause) < 2 * DT,
      `and a crew that has bought Swift Reload lose only ${quickPause.toFixed(1)}s`,
      `${gapB(1).toFixed(2)}s ordinary, ${gapB(fiery.every).toFixed(2)}s after it`);
  }

  // AND THE FIRE IS WIDER THAN THE BLAST, without the blast moving. The burning
  // pass is a second, larger sweep in land(); `splash` is the number the info box
  // prints and tools/families.mjs checks, so it has to be the same number taught
  // or not. tools/status.mjs stands a man in the gap between the two and checks he
  // burns without being hit.
  ok(fiery.ammo.burn.splashTimes > 1 && fiery.ammo.splash === undefined,
    'and the fire reaches further than the ball breaks',
    `${gun.splash}px of blast inside ` +
    `${(gun.splash * fiery.ammo.burn.splashTimes).toFixed(1)}px of fire`);

  // WHAT THE BURN IS WORTH, printed rather than asserted — it is the owner's to
  // set and the sim has never been run on it. Per second over the whole cycle,
  // against one man, WITH the pause in the cycle; against a rank it is the burn
  // again for every man the fire caught.
  const dps = d => d.damage / d.cooldown;
  const perCycle = gun.damage * fiery.every + fiery.ammo.burn.dps * fiery.ammo.burn.seconds;
  const rate = reload => perCycle / (reload * fiery.every + reload * (fiery.afterTimes - 1));
  const drilled = gun.cooldown / swift.reloadTimes;
  console.log(`      into one man: ${dps(gun).toFixed(1)}/s plain, ` +
    `${rate(gun.cooldown).toFixed(1)}/s with Fiery Shot, ` +
    `${(gun.damage / drilled).toFixed(1)}/s with Swift Reload, ` +
    `${rate(drilled).toFixed(1)}/s with both`);
}

console.log(bad ? `\n${bad} ability rule(s) broken.` : `\nAll ${ABILITIES.length} abilities do what they say.`);
process.exit(bad ? 1 : 0);
