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
import { updateUnits } from '../src/units.js';
import { updateShots } from '../src/projectiles.js';
import { level } from '../src/level.js';
import { ABILITIES } from '../src/data/abilities.js';
import { selectionInfo, traitRow, shownSplash, shownRange } from '../src/select.js';

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

  // AND THE SECOND ROW ITSELF, against the data rather than against another copy of
  // the row — two functions agreeing on a wrong answer is a thing that happens when
  // they are checked in a pair.
  //
  // THE ROW IS EXACTLY WHAT THE FIGURE HAS, and both halves of that are worth
  // holding: a rank it wears is printed, and a rank it does not is NOT. The second
  // half is the owner's ask — "I want those with None for Armor removed" — and it
  // is the half that quietly comes back the next time somebody makes the row
  // uniform.
  const said = (def, kind) => (def.armour && def.armour[kind]) || 'none';
  const wrongRank = [...foes, ...men].filter(d => {
    const row = new Map(traitRow(d));
    for (const [kind, key] of [['physical', 'stat_armour'], ['magic', 'stat_armour_magic']]) {
      const worn = said(d, kind);
      if (worn === 'none' ? row.has(key) : row.get(key) !== RANK_SHORT[worn]) return true;
    }
    return false;
  });
  ok(wrongRank.length === 0, 'and prints every rank it wears and no rank it does not',
    wrongRank.map(d => d.name).join(', ') || `${foes.length + men.length} figures`);

  // THE BREAK IS DRAWN IN THE COLOUR OF THE BLOW IT BELONGS TO. A physical attack
  // can only break physical armour — that is the rule in data/armour.js — so a
  // Cannon Outpost showing the blue shield would be a picture of a mechanic this
  // game does not have. Checked on the defs that actually have a `pierce`.
  const breakers = [...TIERS, ...foes].filter(d => pierceOf(d.soldier || d) > 0);
  const miscoloured = breakers.filter(d => {
    const row = new Map(traitRow(d));
    const want = typeOf(d.soldier || d) === 'magic' ? 'stat_pierce_magic' : 'stat_pierce';
    return row.get(want) !== pierceOf(d.soldier || d);
  });
  ok(miscoloured.length === 0, 'and a break is drawn in the colour of the blow it belongs to',
    miscoloured.map(d => d.name).join(', ') ||
    breakers.map(d => `${d.name} x${pierceOf(d.soldier || d)}`).join(', '));

  // AND A BLAST IS PRINTED WHERE THERE IS ONE. `splash: 0` is a real setting with a
  // comment of its own in data/towers.js — a pure single-target catapult — so the
  // thing to hold is that a 0 draws NOTHING rather than an area-of-damage icon
  // advertising the absence of an area of damage.
  const wide = [...TIERS, ...foes].filter(d => shownSplash(d));
  const shown = [...TIERS, ...foes].filter(d => new Map(traitRow(d)).has('stat_splash'));
  ok(wide.length === shown.length && wide.every(d => shown.includes(d)),
    'and a blast is printed by everything that has one, and nothing that has not',
    wide.map(d => `${d.name} ${shownSplash(d)}`).join(', '));

  // NO REACH ON A FIGURE, at the owner's word — the armour took that row. It is
  // checked because it is a deletion, and a deletion is the kind of thing that
  // comes back the next time somebody adds a stat: the row is not full, it is
  // SPOKEN FOR.
  const reaching = [...foes.map(d => ['enemy', d]), ...men.map(d => ['unit', d])]
    .filter(([k, d]) => panel(k, d, d.hp).range !== null);
  ok(reaching.length === 0, 'and no figure prints a reach, which is the second row now',
    reaching.map(([, d]) => d.name).join(', ') || `${foes.length + men.length} figures`);

  // AND A TOWER KEEPS ITS REACH, which is the half of that deletion that did not
  // apply to buildings — the owner drew the line themselves: "only leave the range
  // for units in towers".
  const mute = TIERS.filter(def =>
    shownRange(def) !== null && panel('tower', def, null).range === null);
  ok(mute.length === 0, 'while a tower keeps the reach a figure gave up',
    mute.map(d => d.name).join(', ') ||
    `${TIERS.filter(d => shownRange(d) !== null).length} tiers that shoot`);

  // AND ITS SECOND ROW IS THE ONE ITS MAN'S CARD PRINTS. A wiring check rather than
  // an arithmetic one — both sides go through traitRow today, and the point is that
  // they keep doing so. The panel had its own copy of the armour row for one build
  // and the two drifted the moment `pierce` arrived: the book knew about the Cannon
  // Outpost's x2 and the panel did not.
  const drifted = TIERS.filter(def =>
    JSON.stringify(panel('tower', def, null).traits) !== JSON.stringify(traitRow(def)));
  ok(drifted.length === 0, 'and its second row is the row its own card prints',
    drifted.map(d => d.name).join(', ') ||
    TIERS.filter(d => traitRow(d).length).map(d => d.name).length + ' tiers with one');
}

// --- the loops -----------------------------------------------------------------

// THE TOWER'S PATH, END TO END. The four sections above ask `taken()` directly,
// which is the arithmetic; this asks the GAME, which is the wiring — shoot, fly,
// land, reduce — and it is the wiring that the five call sites can get wrong one
// at a time.
//
// The thrower's path is not run here: it goes through the same `taken()` with the
// same three arguments, and standing up a squad to watch one flask would be
// tools/plague.mjs with an extra assertion. The ENEMY'S SWING is run — see the
// section at the foot of this file for why it earned a fixture of its own. What is
// worth running end to end first is the path with the most
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


// --- and an enemy's swing, through the man's own plate ----------------------------

// THE GIANT IS THE FIRST THING WALKING IN THAT BREAKS ARMOUR, and that is why this
// path is now run rather than argued about.
//
// Every other `pierce` in the game belongs to a tower and lands through the shot
// loop above. His belongs to a club, and a club goes through units.js — a different
// call site, reading a different pair of defs, with the attacker and the target the
// other way round. It is exactly the fifth site the note at the top of this file
// warns about: four paths reducing correctly and one not is worse than none of them
// doing it, because the one that does not is invisible.
//
// AND THE NUMBER IS THE DESIGN. The owner gave him the break in the same pass that
// took the Paladin from high plate to medium, and the two together are what put the
// barracks back in front of him.
console.log('\nAnd an enemy really does break the plate of the man holding it\n');

{
  const swing = (soldierDef, enemyDef) => {
    // A POST WITH NO ABILITIES ON IT. Every soldier on the board belongs to one and
    // units.js asks it what it has been taught on the frame he swings, so `null`
    // here is not a simpler fixture, it is a crash.
    const post = { def: {}, fam: { id: 'barracks' }, abilities: [], x: 100, y: 100 };
    const u = {
      // AT HIS OWN FULL HEALTH, and not at some large number. Regen clamps a man to
      // `def.hp` every frame, so a fixture that started him at a million watched him
      // snap back to 150 before the giant had swung and reported the fall as the
      // blow.
      def: soldierDef, x: 100, y: 100, rx: 100, ry: 100,
      hp: soldierDef.hp, maxHp: soldierDef.hp,
      foe: null, cd: 0, thrust: 0, hold: 0, respawn: 0, face: 1, statuses: [],
      tower: post, struckFrom: 0
    };
    const e = {
      def: enemyDef, x: u.x + 6, y: u.y, hp: 1e6, maxHp: 1e6, route: 0, lane: 1,
      s: 300, foe: null, acd: 0, thrust: 0, halted: false, leaked: false, statuses: []
    };
    const state = { towers: [post], enemies: [e], units: [u], shots: [], hits: [],
                    corpses: [], splats: [], impacts: [], smoke: [] };
    const before = u.hp;
    for (let i = 0; i < 60 * 8 && u.hp === before; i++) updateUnits(state, DT);
    return Math.round(before - u.hp);
  };

  const giant = enemyTypes.heavy_inf;
  const men = Object.fromEntries(barracks.map(d => [d.soldier.name, d.soldier]));

  ok(pierceOf(giant) === 1, 'the giant breaks one rank of physical plate',
    `x${pierceOf(giant)} ${typeOf(giant)}`);

  // THROUGH THE PLATE HE ACTUALLY BREAKS, one rung of the ladder at a time. The
  // Pikeman wears nothing, so the break is worth nothing against him and the swing
  // lands whole; the Swordsman's low plate is broken to none and the swing lands
  // whole through that too; the Paladin's medium is broken to low, which is the
  // only rung where the number moves.
  const bare = swing(men.Pikeman, giant);
  ok(bare === giant.damage, 'and lands whole on the man wearing none',
    `${bare} of ${giant.damage} on a Pikeman`);

  const low = swing(men.Swordsman, giant);
  ok(low === giant.damage, 'and whole again on low plate, which the break erases',
    `${low} of ${giant.damage} on a Swordsman`);

  const med = swing(men.Paladin, giant);
  ok(med === taken(giant.damage, 'physical', men.Paladin.armour, 1),
    'and takes a quarter off medium, which it breaks to low',
    `${med} of ${giant.damage} on a Paladin`);

  // AND THE BREAK IS DOING IT, which is the half that would pass by accident. The
  // same club with the pierce taken off lands for less, and if that ever stops
  // being true the check above has become a check of nothing.
  const unpierced = swing(men.Paladin, { ...giant, pierce: 0 });
  ok(unpierced < med, 'and the same club without it does not',
    `${unpierced} of ${giant.damage}, against ${med} with the break`);
}

console.log(bad
  ? `\n${bad} thing(s) about the damage triangle are not true.`
  : '\nThe damage triangle holds.');
process.exit(bad ? 1 : 0);
