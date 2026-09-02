// The damage triangle: what an attack is, what it runs into, and what is left.
// Node only.
//
//   node tools/armour.mjs
//
// WHY THIS IS ITS OWN FILE. Armour is the first mechanic in this game that sits
// BETWEEN two numbers that were previously the same number. A tower's card says
// 60 and the thing it shot loses 15, and both are correct — so every failure mode
// here is a quiet one, and none of them looks like a crash:
//
//   THE WRONG ARMOUR ANSWERS. The two ranks do not stand in for each other. A
//   physical shot must read the target's PHYSICAL rank and nothing else, and the
//   moment it reads whichever rank is higher, or the sum, or "armour", a plague
//   thug in magic plate starts shrugging off musket balls and the tower that was
//   meant to answer him stops working. The arithmetic still runs; the matchup is
//   simply gone.
//
//   A PATH THAT MISSES THE REDUCTION ENTIRELY. Damage lands in five separate
//   places — a tower's shot, a soldier's swing, an enemy's swing, an enemy's
//   throw, and a status tick — and four of them going through the armour is worse
//   than none of them, because the one that does not is invisible until somebody
//   notices a thug dying too fast.
//
//   PIERCE OFF BY ONE, or applied to the wrong side. `x1` means one rank OFF THE
//   TARGET, floored at none. Applied as a bonus to the attacker, or uncapped, it
//   reads as roughly right on most of the board and wildly wrong on the giant.
//
//   AND TRUE DAMAGE QUIETLY BECOMING PHYSICAL. Both statuses are true damage. A
//   burn that armour turned aside would be the Cannon Outpost's ability silently
//   losing half its worth against the one enemy it is bought for.

import { RANKS, TAKES, taken, rankAgainst, typeOf, pierceOf,
         RANK_NAME, RANK_SHORT } from '../src/data/armour.js';
import { archery, barracks, siege, monastery } from '../src/data/towers.js';
import { enemyTypes } from '../src/data/waves.js';
import { STATUS } from '../src/data/status.js';
import { apply, tick } from '../src/status.js';
import { updateTowers } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { level } from '../src/level.js';
import { ABILITIES } from '../src/data/abilities.js';
import { selectionInfo, shownArmour } from '../src/select.js';

const DT = 1 / 60;
let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const TIERS = [...archery, ...barracks, ...siege, ...monastery];

// --- the table itself -----------------------------------------------------------

console.log('\nThe four ranks\n');

{
  ok(RANKS.length === TAKES.length && RANKS.length === 4,
    'there are 4 ranks and a fraction for each', RANKS.join(' / '));

  // THE OWNER'S OWN NUMBERS, and they are quoted here rather than derived so that
  // a change to the ladder has to be made twice — once in the data and once in
  // the check that says what the data was supposed to be.
  ok(TAKES[0] === 1 && TAKES[1] === 0.75 && TAKES[2] === 0.5 && TAKES[3] === 0.25,
    'and each rank takes a quarter less than the last',
    TAKES.map(t => `${t * 100}%`).join(' / '));

  // EVEN STEPS, which is what makes `pierce` mean one thing everywhere. Checked
  // rather than eyeballed: it is the property the encyclopedia's prose relies on.
  const steps = TAKES.slice(1).map((t, i) => TAKES[i] - t);
  ok(steps.every(d => Math.abs(d - steps[0]) < 1e-9),
    'and the steps are even, so a rank is always worth the same',
    steps.map(d => `${(d * 100).toFixed(0)}pp`).join(' '));
}

console.log('\nWhat gets through\n');

{
  const none = { physical: 'none', magic: 'none' };
  const plate = { physical: 'high', magic: 'none' };
  const wards = { physical: 'none', magic: 'high' };

  ok(taken(100, 'physical', none) === 100, 'no armour takes the blow whole', '100 of 100');
  ok(taken(100, 'physical', plate) === 25, 'high plate takes a quarter of a physical blow', '25 of 100');

  // THE RULE THAT SURPRISES PEOPLE, in the owner's own words: "if physical attacks
  // hit units with high magic armor means the unit take in full damage as there is
  // no physical armor". This is the check that the two ranks never stand in for
  // each other — the single most likely way to get this mechanic wrong.
  ok(taken(100, 'physical', wards) === 100,
    'and high MAGIC armour does nothing at all to a physical blow', '100 of 100');
  ok(taken(100, 'magic', plate) === 100,
    'and high PHYSICAL armour does nothing at all to a magic blow', '100 of 100');
  ok(taken(100, 'magic', wards) === 25, 'while the right armour answers it', '25 of 100');

  // TRUE DAMAGE IGNORES BOTH, which is what the statuses do.
  const full = { physical: 'high', magic: 'high' };
  ok(taken(100, 'true', full) === 100,
    'and true damage goes through everything', '100 of 100 against high/high');
}

console.log('\nBreaking it\n');

{
  const high = { physical: 'high' };
  const low = { physical: 'low' };

  ok(taken(100, 'physical', high, 1) === 50,
    'x1 against high armour lands as though it were medium', '50 of 100');
  ok(taken(100, 'physical', high, 2) === 100 * TAKES[1],
    'x2 against high armour lands as though it were low', `${taken(100, 'physical', high, 2)} of 100`);

  // THE FLOOR, and it is the half a careless subtraction gets wrong: breaking more
  // ranks than the target wears does not start handing out bonus damage.
  ok(taken(100, 'physical', low, 3) === 100,
    'and breaking past none stops at none rather than going further', '100 of 100, not more');
  ok(rankAgainst({ physical: 'none' }, 'physical', 2) === 0,
    'the rank an attack meets never goes below 0');

  // AND PIERCE ONLY BREAKS ITS OWN KIND. A physical attack that broke magic armour
  // would make the Cannon Outpost an answer to the plague thug, which is exactly
  // the matchup the triangle exists to deny it.
  ok(taken(100, 'physical', { physical: 'none', magic: 'high' }, 2) === 100 &&
     taken(100, 'magic', { physical: 'none', magic: 'high' }, 2) === 75,
    'and a physical break does nothing to magic plate',
    'physical 100 of 100, magic 75 of 100');
}

// --- the data ---------------------------------------------------------------------

console.log('\nEvery def says what kind of blow it strikes\n');

{
  const KINDS = ['physical', 'magic', 'true'];
  const bads = TIERS.filter(d => !KINDS.includes(typeOf(d.soldier || d)));
  ok(bads.length === 0, 'every tower deals a kind this game knows',
    bads.map(d => d.name).join(', ') || `${TIERS.length} tiers`);

  const foes = Object.values(enemyTypes);
  ok(foes.every(e => KINDS.includes(typeOf(e))), 'and so does every enemy',
    foes.map(e => `${e.name} ${typeOf(e)}`).join(', '));

  // A RANK THIS FILE DOES NOT KNOW reads as `none`, which is a quiet wrong answer
  // rather than a crash — so it is checked here instead of being relied on.
  const wearers = [...TIERS.map(d => d.soldier).filter(Boolean), ...foes];
  const junk = wearers.filter(m => m.armour &&
    Object.values(m.armour).some(r => !RANKS.includes(r)));
  ok(junk.length === 0, 'and every armour rank written down is a real one',
    junk.map(m => m.name).join(', ') || `${wearers.filter(m => m.armour).length} figures wear armour`);

  // THE MONASTERY IS THE MAGIC FAMILY AND THE ONLY ONE. This is a design claim
  // rather than a data one: it is what makes "bring a monastery" the answer to
  // armoured infantry, and a second family quietly turning magic would erase it.
  const magic = TIERS.filter(d => typeOf(d.soldier || d) === 'magic');
  ok(magic.length === monastery.length && magic.every(d => monastery.includes(d)),
    'and the monastery is the whole of the magic in this game',
    magic.map(d => d.name).join(', '));

  // PIERCE SITS BESIDE THE KIND IT BREAKS. Nothing enforces that in the data — a
  // def could carry `pierce` and no `damageType` — so it is stated here.
  const pierced = TIERS.filter(d => pierceOf(d.soldier || d) > 0);
  ok(pierced.every(d => typeOf(d.soldier || d) !== 'true'),
    'and nothing that breaks armour deals true damage',
    pierced.map(d => `${d.name} x${pierceOf(d.soldier || d)}`).join(', '));

  // BOTH WORDS FOR A RANK, and the reason this is checked rather than trusted: they
  // are two hand-written tables of the same four keys, and a rank added to RANKS
  // with only one of them filled in would print `undefined` on a card. Silently —
  // a canvas draws the word "undefined" as happily as it draws "Med".
  const missing = RANKS.filter(r => !RANK_NAME[r] || !RANK_SHORT[r]);
  ok(missing.length === 0, 'every rank has a word for prose and a word for a row',
    missing.join(', ') || RANKS.map(r => `${RANK_NAME[r]}/${RANK_SHORT[r]}`).join(' '));

  // AND THEY DIFFER ON EXACTLY ONE. The short table exists for `med` alone — see
  // the note beside it in data/armour.js — and the claim worth holding is that
  // nothing else was quietly abbreviated with it, because every rank that CAN be
  // one word across both surfaces should be.
  const split = RANKS.filter(r => RANK_NAME[r] !== RANK_SHORT[r]);
  ok(split.length === 1 && split[0] === 'med',
    'and only the one that does not fit is abbreviated', split.join(', ') || 'none');

  // The panel's own row is measured in the browser, not here: node has no canvas to
  // set a font in. tools/book.mjs measures the encyclopedia's copy of the same row
  // against the card, pessimistically, which is the half that can be checked out
  // here — and the two rows print the same words.
}

// --- what the two surfaces say about a figure --------------------------------------

// THE CARD AND THE PANEL HAVE TO AGREE, and until this section they did not.
//
// A figure's armour is stated in two places — his card in the encyclopedia and the
// description panel when he is tapped on the board — and they are built by two
// different functions from the same def. So is the icon over his damage. The
// panel's copy carried NO icon at all for a build, which fell through to the sword
// for everybody: the plague doctor, who is the only magic on the road, was drawn
// swinging one on the board while his card showed the wand.
//
// That is exactly the failure this repository's rule is written against — nothing
// about a picture typed in by hand — so both surfaces are asked here, per def,
// rather than trusted to have called the same helper.
console.log('\nWhat the card and the panel say about a figure\n');

{
  // The panel, without a game. selectionInfo reads `state.selected` and nothing
  // else about the world for a figure, so a state of one selection is the whole of
  // what it needs — and asking it is what makes this a check of the PANEL rather
  // than of the helper it happens to call.
  const panel = (kind, def, hp) => kind === 'tower'
    ? selectionInfo({ towers: [],
        selected: { kind, ref: { def, fam: { id: 'archery' }, abilities: [] } } })
    : selectionInfo({ selected: { kind, ref: { def, hp, maxHp: hp, tower: null } } });

  const wants = def => typeOf(def) === 'magic' ? 'stat_damage_magic' : 'stat_damage';

  const foes = Object.values(enemyTypes);
  const men = TIERS.map(d => d.soldier).filter(Boolean);

  const wrongIcon = [
    ...foes.map(d => [d, panel('enemy', d, d.hp).attack]),
    ...men.map(d => [d, panel('unit', d, d.hp).attack])
  ].filter(([d, icon]) => icon !== wants(d));
  ok(wrongIcon.length === 0, 'the panel draws the wand over a magic figure and the sword over the rest',
    wrongIcon.map(([d, i]) => `${d.name} ${i}`).join(', ') ||
    foes.concat(men).map(d => `${d.name} ${typeOf(d)}`).filter(s => s.includes('magic')).join(', '));

  // AND THE RANKS THEMSELVES, on both surfaces, against the data rather than
  // against each other — two functions agreeing on a wrong answer is a thing that
  // happens when they are checked in a pair.
  const said = (def, kind) => (def.armour && def.armour[kind]) || 'none';
  const wrongRank = [...foes, ...men].filter(d => {
    const a = shownArmour(d);
    return a.physical !== RANK_SHORT[said(d, 'physical')] ||
           a.magic !== RANK_SHORT[said(d, 'magic')];
  });
  ok(wrongRank.length === 0, 'and every rank it prints is the rank the def wears',
    wrongRank.map(d => d.name).join(', ') || `${foes.length + men.length} figures`);

  // NO REACH ON A FIGURE, at the owner's word — the armour took that row. It is
  // checked because it is a deletion, and a deletion is the kind of thing that
  // comes back the next time somebody adds a stat: the row is not full, it is
  // SPOKEN FOR.
  const reaching = [...foes.map(d => ['enemy', d]), ...men.map(d => ['unit', d])]
    .filter(([k, d]) => panel(k, d, d.hp).range !== null);
  ok(reaching.length === 0, 'and no figure prints a reach, which is the armour row now',
    reaching.map(([, d]) => d.name).join(', ') || `${foes.length + men.length} figures`);

  // AND A TOWER IS THE OTHER WAY ROUND: no armour, and its reach kept. Its man's
  // plate is not the tower's fact — a barracks sends him out, and tapping HIM is
  // where the question is answered.
  const armoured = TIERS.filter(def => panel('tower', def, null).armour !== null);
  ok(armoured.length === 0, 'while a tower prints no armour and keeps its reach',
    armoured.map(d => d.name).join(', ') || `${TIERS.length} tiers`);
}

// --- the loops -----------------------------------------------------------------

// THE TOWER'S PATH, END TO END. The four sections above ask `taken()` directly,
// which is the arithmetic; this asks the GAME, which is the wiring — shoot, fly,
// land, reduce — and it is the wiring that the five call sites can get wrong one
// at a time.
//
// The two melee paths and the thrower's are not run here: they go through the
// same `taken()` with the same three arguments, and standing up a squad to watch
// one swing would be tools/squad.mjs with an extra assertion rather than a check
// of this mechanic. What is worth running end to end is the path with the most
// between the number and the health bar, which is a shot in flight.
console.log('\nAnd a shot really is reduced where it lands\n');

// A tower on a plot, firing at one enemy whose armour is ours to set. The point is
// to read what the ENEMY LOSES rather than what the shot carries, so the whole
// path — shoot, fly, land, reduce — runs.
function shootAt(def, famId, armour) {
  const plot = level.plots[0];
  const t = {
    plot, fam: { id: famId }, def, x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0, aimMode: 0, spent: 500,
    rally: null, abilities: [], shots: 0, special: null, burst: 0, burstT: 0,
    hit: [], locked: null, hold: 0, turn: 0
  };
  const e = {
    def: { r: 10, hp: 1e6, speed: 0, atkCd: 1, damage: 0, armour }, x: t.x + 60, y: t.y,
    hp: 1e6, maxHp: 1e6, route: 0, lane: 1, s: 300,
    foe: null, acd: 1, thrust: 0, halted: false, leaked: false, statuses: []
  };
  const state = { towers: [t], enemies: [e], units: [], shots: [], hits: [],
                  corpses: [], splats: [], impacts: [], smoke: [] };
  const before = e.hp;
  for (let i = 0; i < 60 * 8 && e.hp === before; i++) {
    updateTowers(state, DT);
    updateShots(state, DT);
  }
  return before - e.hp;
}

{
  const post = archery.find(d => d.name === 'Musketeer Post');
  const bare = shootAt(post, 'archery', { physical: 'none', magic: 'none' });
  const plate = shootAt(post, 'archery', { physical: 'high', magic: 'none' });
  const wards = shootAt(post, 'archery', { physical: 'none', magic: 'high' });

  // 60 damage, breaking 1 rank: high becomes medium, so 30.
  ok(bare === post.damage, 'a tower\'s shot lands whole on an unarmoured man',
    `${bare} of ${post.damage}`);
  ok(plate === Math.round(post.damage * TAKES[3 - post.pierce]),
    'and its break is taken off the plate at the landing',
    `${plate} of ${post.damage} through high armour, x${post.pierce}`);
  ok(wards === post.damage, 'and magic plate does nothing to it', `${wards} of ${post.damage}`);

  // AND THE MONASTERY IS THE OTHER WAY ROUND, which is the whole matchup in two
  // numbers: the same giant that halves a bolt takes a blast in full.
  const temple = monastery.find(d => d.name === 'Judgement Temple');
  const giant = enemyTypes.heavy_inf.armour;
  const bolt = shootAt(siege.find(d => d.name === 'Ballista Turret'), 'siege', giant);
  const blast = shootAt(temple, 'monastery', giant);
  ok(blast === temple.damage,
    'a monk\'s blast goes through the giant\'s plate whole', `${blast} of ${temple.damage}`);
  ok(bolt < siege.find(d => d.name === 'Ballista Turret').damage,
    'while a bolt does not', `${bolt} of ${siege.find(d => d.name === 'Ballista Turret').damage}`);
}

console.log('\nAnd a status is true damage, on both armies\n');

{
  // THE FIERY SHOT'S BURN, laid on a figure in the heaviest plate in the game. If
  // a status ever started reading armour this is where it would show.
  const v = { hp: 1000, maxHp: 1000, statuses: [],
              def: { armour: { physical: 'high', magic: 'high' } } };
  const fiery = ABILITIES.find(a => a.id === 'fiery');
  const { dps, seconds } = fiery.ammo.burn;
  apply(v, 'burnt', dps, seconds, 'cannonball');
  let hurt = 0;
  for (let i = 0; i < seconds / DT + 1; i++) hurt += tick(v, DT);
  ok(Math.abs(hurt - dps * seconds) < 0.2,
    'a burn does its whole dose through high plate',
    `${hurt.toFixed(1)} of ${dps * seconds}`);

  ok(Object.values(STATUS).filter(s => s.hurts).length === 2,
    'and both of the statuses that hurt are true damage', 'burnt and poisoned');
}

console.log(bad
  ? `\n${bad} thing(s) about the damage triangle are not true.`
  : '\nThe damage triangle holds.');
process.exit(bad ? 1 : 0);
