// Headless balance run. Node only — never loaded by the game.
//
//   node tools/sim.mjs
//
// Imports the real update functions and steps them at a fixed 1/60s with no
// canvas, so a full eight-wave run takes about a second instead of five
// minutes. Nothing here is a model of the game; it is the game, minus drawing.
//
// Add an enemy type or retune a tower, then run this before committing. The
// archery baseline below is the balance the project was originally tuned to,
// and it should keep reading "won 20/20" — if it moves, something changed that
// you did not mean to change.

import { updateEnemies } from '../src/enemies.js';
import { updateTowers } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { updateWaves } from '../src/waves.js';
import { updateUnits, makeUnits } from '../src/units.js';
import { updateCorpses } from '../src/corpses.js';
import { updateSplats } from '../src/blood.js';
import { updateImpacts } from '../src/impacts.js';
import { families } from '../src/data/towers.js';
import { level, levels, useLevel } from '../src/level.js';
import { openingDelay } from '../src/data/waves.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, scaleWaves, startingGold } from '../src/data/difficulty.js';

// WHICH DIFFICULTY THE SIM IS MEASURING. Every balance note in data/waves.js was
// written before difficulty existed, so the tables are the middle and the sim
// keeps measuring exactly that unless it is told otherwise: `DIFF=hard node
// tools/sim.mjs 2`. Multipliers of 1 are the tables as written.
const NEUTRAL = { id: 'tuned', name: 'As tuned', count: 1, gold: 1 };
export const difficulty = process.env.DIFF
  ? (DIFFICULTIES.find(d => d.id === process.env.DIFF) || NEUTRAL)
  : NEUTRAL;

const DT = 1 / 60;

// Seconds of game time before a run is called stuck, PER WAVE rather than in
// total. 900 was right for an eight-wave map and is 112 a wave; map 3 runs ten,
// so a flat 900 called its slowest builds stuck for the crime of having two more
// waves to get through. `stuck` is not a loss and not a win — it drops out of
// both counts — so a limit that bites unevenly quietly understates the win rate
// of exactly the grindy, blocker-heavy builds that take longest.
const PER_WAVE = 112;
const timeLimit = () => PER_WAVE * level.waves.length;

// A plan is a shopping list. Towers are bought in order as gold allows, then
// upgraded toward their target tier — roughly how a player spends.
export const A = (plot, tier = 2) => ({ plot, fam: 'archery', tier });
export const B = (plot, tier = 2) => ({ plot, fam: 'barracks', tier });
export const S = (plot, tier = 2) => ({ plot, fam: 'siege', tier });
// The monastery. It is NOT in tools/sweep.mjs and that is deliberate: the sweep
// crosses every plot with every ASSIGNMENT of two families, which is 2^n, and a
// third or fourth family makes it 3^n and 4^n — 4 million builds on map 3 rather
// than two thousand. The invariant the sweep exists to guard is a claim about
// archery and barracks, so the sweep still asks exactly that question, and the
// other two families are held to the same rule here, by hand, in the scenarios
// below: a pure build of one must lose.
export const M = (plot, tier = 2) => ({ plot, fam: 'monastery', tier });

function newState() {
  return {
    // The same two things newGame() in main.js builds, through the same two
    // helpers, so the sim cannot drift from the game about what a difficulty
    // does. The waves are scaled ONCE here for the same reason they are there:
    // waveSize and the spawn loop must agree exactly on how big a group is.
    waves: scaleWaves(level.waves, difficulty),
    gold: startingGold(level.startGold, difficulty),
    lives: level.startLives,
    towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [],
    waveIndex: 0, spawned: 0, timer: openingDelay,
    // Set explicitly rather than left undefined: the game holds everything until
    // the player presses Start, and a headless run has no player. If this is ever
    // missing the sim measures a game that never begins.
    started: true,
    resting: false, menu: null, result: null
  };
}

function build(state, entry) {
  const fam = families.find(f => f.id === entry.fam);
  const def = fam.tiers[0];
  if (state.gold < def.cost) return false;

  const plot = level.plots[entry.plot];
  const t = {
    plot, fam, def,
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0,
    // The animation clock, same as input.js sets on a real build. A catapult
    // that never leaves beat 0 never fires, and it would fail silently: the sim
    // would just report that artillery is worthless.
    beat: 0, beatT: 0, face: 0,
    // The ability fields input.js sets on a real build. Nothing here buys one —
    // the sim measures the game as it is sold, and an ability is 150 gold the
    // player chooses to spend — but a tower without them is a shape the fight
    // code has never seen, and the point of this file is that it runs the real
    // modules on the real objects.
    abilities: [], shots: 0, special: null, burst: 0, burstT: 0, hit: [], locked: null, hold: 0,
    spent: def.cost,
    wantTier: entry.tier
  };
  state.gold -= def.cost;
  state.towers.push(t);
  makeUnits(state, t);
  return true;
}

function upgrade(state) {
  for (const t of state.towers) {
    while (t.def.tier - 1 < t.wantTier) {
      const next = t.fam.tiers[t.def.tier];
      if (!next || state.gold < next.cost) break;
      state.gold -= next.cost;
      t.def = next;
      t.spent += next.cost;
      makeUnits(state, t);
    }
  }
}

// A seeded random number generator, installed over Math.random for the length
// of a run and taken off again afterwards.
//
// The game became RANDOM when enemies got lanes: each one picks a road and a
// side of it at spawn, so no two runs of the same build are the same game. That
// turned this tool from a measurement into a coin toss — the same plan measured
// twice in a row came out "won with 3 lives" and then "lost at wave 7", which is
// not a difference anyone can tune against.
//
// Seeding it puts determinism back without taking the randomness out of the
// game: the same plan and seed always play out identically, and different seeds
// are different battles. That is why the scenarios below are run across several
// seeds rather than one — a single seed is one battle, and the question is how a
// build does in general.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// `patience` multiplies the stuck threshold for this one run.
//
// It exists because `stuck` is not a verdict, it is the absence of one, and
// there is exactly one question where that difference decides whether the game
// is broken: does a single family clear a map ON ITS OWN? A pure-barracks build
// holds enemies alive on the road instead of killing them quickly, so it is the
// build most likely to run out of clock — and for a long time the sweep read
// its `stuck` as "did not win" and passed the invariant. Given 13x the time, it
// wins outright on two maps. See the pure-build re-check at the end of
// tools/sweep.mjs, which is the only caller that raises this.
export function run(plan, seed = 1, patience = 1) {
  const realRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    return play(plan, patience);
  } finally {
    Math.random = realRandom;
  }
}

function play(plan, patience = 1) {
  const state = newState();
  const pending = [...plan];
  let time = 0;

  const limit = timeLimit() * patience;
  while (!state.result && time < limit) {
    // Upgrade before expanding. Spending everything on tier 1s and only then
    // improving them is a strategy no one plays, and modelling it that way made
    // the economy, not the towers, decide the outcome.
    upgrade(state);
    while (pending.length && build(state, pending[0])) pending.shift();

    updateWaves(state, DT);
    updateUnits(state, DT);      // before enemies, so a freshly blocked enemy
    updateEnemies(state, DT);    // is already held when movement is decided
    updateTowers(state, DT);
    updateShots(state, DT);
    updateCorpses(state, DT);    // decoration, but kept so this stays the game
    updateSplats(state, DT);
    // Decoration too, and kept for the same reason: a plague doctor's spill is
    // pushed onto state.impacts by the same land() the sim runs for real, so
    // without this the list grows for the whole run and the sim stops being the
    // game it claims to be.
    updateImpacts(state, DT);
    if (state.lives <= 0) state.result = 'lost';
    time += DT;
  }

  return {
    result: state.result || 'stuck',
    lives: state.lives,
    wave: state.waveIndex,
    gold: state.gold,
    time: Math.round(time),
    // WHAT THE PLAN ACTUALLY BECAME, one digit per tower in build order. A tier
    // in a plan is a target rather than a fact — the ladder is bought as gold
    // arrives, and a tier 4 is 500 to 610 gold on one plot — so a run can end
    // with every tower a rung short of what the list asked for. Without this a
    // balance pass reads "tier 4 changed nothing" and cannot tell a tower that
    // is no better from one the money never reached.
    tiers: state.towers.map(t => t.def.tier).join(''),
    // HOW OFTEN EACH TOWER ACTUALLY FIRED, same order. The companion to `tiers`
    // and the answer to the other way a balance pass can fool itself: a dial that
    // does nothing to the win rate usually means the tower is fine at either
    // setting, but sometimes it means the tower never shot at all — a plot the
    // road does not come near, or a reach too short to touch it. A row of zeroes
    // says the sweep was measuring the plot rather than the tower.
    fired: state.towers.map(t => t.shots || 0).join('/')
  };
}

// The level is meant to need both families. Archery alone must not clear it,
// and blockers alone cannot kill, so the win has to be a mix. Those two are the
// invariants — if either flips, the balance moved.
//
// These are the BEST build of each kind, not a representative one. "Archery
// alone cannot win" is a claim about the best all-archery build that exists, so
// testing a mediocre one proves nothing. Each list is the winner of every
// six-tower combination of the usable plots crossed with all 64 family
// assignments of each — `node tools/sweep.mjs` prints them ready to paste, and
// it is the thing to run after any map redraw, before this.
//
// Plots 2 and 5 sit more than 110px off the road and cover almost none of it,
// so they are left out of the six-tower builds — a player would not take them
// either, and including one measured the dead plot rather than the family.
//
// WHICH build is best moves when the level does. Putting the path's ends back on
// the road shortened it from 1832 to 1804 and lifted the entry leg 40px, and the
// crown passed from the 4+2 build to the 5+1 one. Re-sweep rather than assuming
// the labels below still rank the way they did: 448 builds is 18 seconds.
//
// WHICH plot gets which family is not arbitrary, and getting it wrong makes the
// whole file lie. These indices were carried over unchanged the first time the
// artist moved the markers, and because plots are stored in road order, the
// re-ordering quietly put the barracks on the two highest-coverage plots and the
// archers on the two worst. Every mix "lost", which read as a balance collapse
// and was really a bad shopping list.
//
// Coverage per plot at tier 1 range (190, elliptical) is
//   18.9 / 28.0 / 5.8 / 29.7 / 30.7 / 6.1 / 17.5 / 22.0 / 18.2 percent
// for plots 0..8, and the seven usable ones cover 95.7% between them.
//
// Those are ELLIPSE numbers and are not comparable to the circle numbers this
// comment used to carry. Range went 150 -> 190 at tier 1 in the same change that
// made reach elliptical, and the two roughly cancel: a plot covers about what it
// used to, out of a ring that is 27% wider and 21% shorter. Re-measure after any
// redraw before trusting these, and do not trust the number itself too far: plot
// 8 once rose from 13.3 to 15.3 in the redraw that forced the heavy's hp DOWN.
// See the note on that hp in data/waves.js — coverage says where a tower can
// shoot, not whether anything can shoot the place a blocker stands.
//
// Every list below was re-derived by sweep after reach became elliptical and the
// barracks learned to gang up. Both of those moved which plots are worth taking:
// plot 0 is in three of the four winning builds now and was in none of them, and
// the best 5+1 build no longer wins at all, so the scenario that used to be the
// thinnest win is now listed as a loss. That is not a regression — it is the same
// lesson as every redraw before it, which is that the shopping list goes stale
// before the balance does.
//
// One thing this file CANNOT measure: barracks `range`. It is the leash on the
// rally point, and the sim never moves a rally, so every barracks here fights at
// its default stand. Changing 130 -> 165 showed up as literally identical output
// in all seven scenarios. That number is checked by playing, not by this.
//
// The level is far less brittle than it was. 33 of 448 builds clear it, against 4
// before these changes — and the 4 was fragile enough that a single plot marker
// moving 150px took it to 0. Wider is the point; it is still 7%.
//
// PER LEVEL, because a plot index means a different place on each map and a
// shopping list is only meaningful against the map it was swept on. Run
// `node tools/sweep.mjs 2` after redrawing map 2 and paste its rows here.
// EXPORTED so an experiment can run the real scenarios instead of retyping
// them. Retyping is how a damage sweep spent an afternoon measuring map 2's
// builds on map 1: the plot indices are per-map and the two lists look alike.
export const byLevel = {
m1: {
  'ALL archery x6  (expect LOSS)':  [A(0), A(1), A(4), A(6), A(7), A(8)],
  'ALL archery x8  (expect LOSS)':  [A(0), A(1), A(4), A(6), A(7), A(8), A(2), A(5)],
  'ALL barracks x6 (expect LOSS)':  [B(0), B(1), B(3), B(4), B(6), B(7)],
  // The best 5+1 build there is, and it loses. One blocker is no longer enough
  // to hold wave 8 now that the heavy has 1500hp, which is what makes the two
  // families need each other properly rather than nominally.
  'BEST 5 archery + 1 (expect LOSS)': [A(0), A(1), B(3), A(4), A(6), A(7)],
  // Listed in plot order, which is also BUILD order: the plan is a shopping list
  // spent as gold arrives, so moving a barracks to the end of the line is a
  // different build, not the same one written differently. Sorting these lists
  // "tidily" by family turned a 4+2 win into a wave 7 loss once already.
  'MIX 4 archery + 2 barracks':     [A(0), A(1), A(4), B(6), B(7), A(8)],
  'MIX 3 archery + 3 barracks':     [A(0), B(1), A(4), B(6), B(7), A(8)],
  'MIX 2 archery + 4 barracks':     [A(1), B(3), B(4), B(6), B(7), A(8)],
  // Artillery, held to the SAME two rules as the other families: no family
  // clears the level alone, and five towers behind one blocker is never enough
  // however good the five are. Both hold with an enormous margin — see the
  // plateau note above `siege` in src/data/towers.js, where neither loss flips
  // anywhere between 25 and 55 damage.
  //
  // The mixes SWAP ARCHERY for artillery and keep three blockers, because that
  // is the comparison worth having: a catapult against the tower it competes
  // with for a plot. Swapping a BARRACKS for one just measures what losing a
  // blocker on wave 8 costs, which is already known and is fatal for any family.
  'ALL siege x6    (expect LOSS)':  [S(0), S(1), S(4), S(6), S(7), S(8)],
  'BEST 5 siege + 1 (expect LOSS)': [S(0), S(1), B(3), S(4), S(6), S(7)],
  'MIX 2 archery + 3 barracks + 1 siege': [S(0), B(1), A(4), B(6), B(7), A(8)],
  'MIX 3 siege + 3 barracks':       [S(0), B(1), S(4), B(6), B(7), S(8)],
  // THE SAME TWO BUILDS TAKEN TO TIER 4, which is where the Ballista Turret is.
  // The scenarios above stop at tier 3 and that was fine while tier 4 was one
  // tower on one ladder; with three of them the top of a ladder is somewhere a
  // real game reaches, and the invariant has to hold there too — a family that
  // cannot clear the map alone at tier 3 and can at tier 4 is a family whose top
  // rung has quietly become the game.
  //
  // It holds with room to spare: the pure build is 0 in 20 at either tier, and the
  // mix goes from 17 wins to 20 for 690 gold of upgrades. It was 18 before the
  // owner asked for a wider blast — 55 to 70 is the one change to this tower since
  // the sweep, and those two wins are what it bought here. See the note on the tier
  // in data/towers.js for what the sweep measured on each dial.
  'ALL siege t4 x6 (expect LOSS)':  [S(0, 3), S(1, 3), S(4, 3), S(6, 3), S(7, 3), S(8, 3)],
  'MIX 3 siege t4 + 3 barracks':    [S(0, 3), B(1), S(4, 3), B(6), B(7), S(8, 3)],
  // THE MONASTERY, held to the same two rules and compared the same way. A pure
  // build of it must lose — it does, 0 in 20 on every map, because one blow every
  // 4.5 seconds cannot clear a wave of thirty however hard the blow is — and the
  // mix SWAPS AN ARCHERY TOWER for one, which is the comparison worth having,
  // because a monastery and a watchtower want the same plot.
  //
  // What the swap measures is the family's whole argument: less damage per
  // SECOND than the bow it replaced, far more per SHOT. It wins where the thing
  // that kills you has a lot of health and loses where the thing that kills you
  // is thirty of something small.
  'ALL monastery x6 (expect LOSS)': [M(0), M(1), M(4), M(6), M(7), M(8)],
  'MIX 2 archery + 3 barracks + 1 monastery': [M(0), B(1), A(4), B(6), B(7), A(8)],
  // AND THE SAME PAIR AT TIER 4, for the reason the artillery pair above carries:
  // the top of a ladder is somewhere a real game reaches, so the invariant has to
  // hold there too.
  //
  // It matters more here than anywhere else, because the Judgement Temple is the
  // one tier 4 that gives nothing up — more damage and more reach, no drawback but
  // its price. Six of them clear no map, 0 in 20, exactly as six Abbeys do.
  //
  // THE MIX DOES NOT MOVE ON THIS MAP, 6 wins in 20 either way, and the reason is
  // worth knowing before anybody reads it as the tower doing nothing: at 80 damage
  // it was 8, because a militiaman has 80 health and one missile killed him
  // outright. The owner asked for 75. Five points of damage are two wins here and
  // nothing at all on The Fork, which is the sharpest step in the file and is a
  // fact about the militia rather than about the temple.
  'ALL monastery t4 x6 (expect LOSS)': [M(0, 3), M(1, 3), M(4, 3), M(6, 3), M(7, 3), M(8, 3)],
  'MIX 2A + 3B + 1 monastery t4':   [M(0, 3), B(1), A(4), B(6), B(7), A(8)],
  'under-built     (expect LOSS)':  [A(1, 0)]
},

// Map 2, RE-SWEPT after `march` came out. Its plots are all live — none of them
// is more than 91px off the road — so there is no dead-plot scenario to write.
//
// These are not the builds that were here before, and that is the point of
// re-running the sweep rather than keeping the list: the old ones were the best
// builds on a map whose enemies walked at 62% speed, and two of them lose
// outright now. A stale scenario list looks exactly like a balance collapse.
//
// The two roads are why the mixes look the way they do: plots 0 and 4 watch the
// northern road only, 1, 2 and 3 the southern, and 5 to 8 sit past the junction
// where everything funnels together. A build that ignores one arm loses to the
// half of every wave that walks up it.
m2: {
  'ALL archery x6  (expect LOSS)':  [A(0), A(2), A(5), A(6), A(7), A(8)],
  'ALL barracks x6 (expect LOSS)':  [B(0), B(1), B(2), B(3), B(5), B(6)],
  'BEST 5 archery + 1 (expect LOSS)': [A(0), A(1), A(2), B(5), A(6), A(7)],
  'MIX 4 archery + 2 barracks':     [A(1), A(2), B(5), A(6), B(7), A(8)],
  'MIX 3 archery + 3 barracks':     [A(0), A(2), B(5), A(6), B(7), B(8)],
  'MIX 2 archery + 4 barracks':     [A(1), A(2), B(3), B(5), B(6), B(7)],
  'ALL siege x6    (expect LOSS)':  [S(0), S(2), S(5), S(6), S(7), S(8)],
  'BEST 5 siege + 1 (expect LOSS)': [S(0), S(1), S(2), B(5), S(6), S(7)],
  'MIX 2 archery + 3 barracks + 1 siege': [A(1), S(2), B(5), B(6), A(7), B(8)],
  'MIX 3 siege + 3 barracks':       [S(1), S(2), B(5), B(6), S(7), B(8)],
  // Tier 4, for the reason given on map 1's pair. This map is the flatter of the
  // two: every dial on the Ballista Turret — damage from 30 to 90, reload from
  // 0.9s to 3.2s, blast from 0 to 98 — leaves both rows exactly where they are,
  // because what decides The Fork is whether the wall holds two roads, not how
  // hard the machines hit. A tower that changes nothing here is not a broken
  // tower; it is a map that is not asking artillery the question.
  'ALL siege t4 x6 (expect LOSS)':  [S(0, 3), S(2, 3), S(5, 3), S(6, 3), S(7, 3), S(8, 3)],
  'MIX 3 siege t4 + 3 barracks':    [S(1, 3), S(2, 3), B(5), B(6), S(7, 3), B(8)],
  'ALL monastery x6 (expect LOSS)': [M(0), M(2), M(5), M(6), M(7), M(8)],
  'MIX 2 archery + 3 barracks + 1 monastery': [M(0), A(2), B(5), A(6), B(7), B(8)],
  // Tier 4, for the reason given on map 1's pair. The Fork is the map that suits
  // this family, and it is the map where the temple shows: 14 wins to 15 and a
  // life or two better, with the pure build still at 0.
  'ALL monastery t4 x6 (expect LOSS)': [M(0, 3), M(2, 3), M(5, 3), M(6, 3), M(7, 3), M(8, 3)],
  'MIX 2A + 3B + 1 monastery t4':   [M(0, 3), A(2), B(5), A(6), B(7), B(8)],
  'under-built     (expect LOSS)':  [A(2, 0)]
},

// Map 3, from `node tools/sweep.mjs 3`. ELEVEN TOWERS, not six, and that is the
// map rather than a change of convention: its roads never meet, so six here is
// three per road where six on map 1 all shoot at the one road. The sweep now
// uses every plot the map has rather than a fixed ten — see SIZE there. Tuning this
// map's waves against six-tower builds produced a table that killed everything
// on wave 4 — see wavesLong in src/data/waves.js.
//
// Plots 0, 2, 3, 7 and 10 sit between the two roads and cover both, and 4, 6 and
// 9 watch only the north while 1, 5 and 8 watch only the south — so a build that
// ignores half the map loses to half of every wave, and one that does not is very
// comfortable indeed.
//
// RE-SWEPT AFTER EVERY REDRAW, for the same reason map 2's list was re-swept
// after `march` came out, and it is the same trap every time: the artist moves
// markers, so these plot INDICES point at different ground than they did. The
// latest upload ADDED one at index 2 and pushed eight of the other ten down a
// place. An old list is not wrong about the game, it is wrong about where plot 6
// is — and its mixes lose outright, which reads exactly like a balance collapse
// and is not one.
//
// RE-SWEPT AGAIN when the plague doctor learned to stand off rather than walk
// into the line. That is a rule change and not a map change, and it moved these
// lists on all three maps — which is the point of re-running rather than
// trusting them.
//
// THE INVARIANT ON THIS MAP HAS BEEN BROKEN AND IS BEING REPAIRED, and the note
// is here rather than buried because it is the one thing about map 3 that a
// stale reading would flatter.
//
// Pure barracks has cleared it 4 seeds in 20, then 8 when the plague doctor
// learned to stand off, then 11 when the artist added an eleventh plot — no rule
// changed between those last two, which is the cleanest demonstration this
// project has of what a marker is worth on a map that is HELD BY BLOCKERS. Give
// one more blocker to a map won by blocking and it gets easier faster than it
// gets anything else.
//
// It is 1 in 20 now, which is as close to fixed as this map has been: 11, then 4
// once the barracks men lost a tenth of their health, then 1 after the artist's
// balance pass gave the thug and the giant a harder swing. Maps 1 and 2 are both
// a clean 0 in 20, so this is the only map where the rule does not quite hold,
// and it is holding by a single seed rather than by design.
//
// WHAT THE SAME PASS DID TO THE MAP AS A WHOLE is the more interesting number:
// 40 builds of 2048 clear it, against 198 before. Two roads, ten waves, and a
// giant that kills a tier 1 squad outright is a hard combination — the best mixed
// build there is wins 8 times in 20.
//
// It is left standing rather than tuned away, because the same message that
// asked for the eleventh marker asked for the waves and the difficulty to be
// left alone. The lever is in the owner's hands: the admin dashboard's first tab
// is the number of enemies in every wave of this map.
//
// See the pure-build re-check in tools/sweep.mjs, which runs twenty seeds.
//
// A stale scenario list is worse than no list. Re-run `node tools/sweep.mjs 3`
// and paste after any redraw, not just after a rule change.
m3: {
  'ALL archery x11 (expect LOSS)':  [A(0), A(1), A(2), A(3), A(4), A(5), A(6), A(7), A(8), A(9), A(10)],
  'ALL barracks x11 (expect LOSS)': [B(0), B(1), B(2), B(3), B(4), B(5), B(6), B(7), B(8), B(9), B(10)],
  // The best 8+3 there is, and it loses. The line has moved twice: it was 7+3,
  // then 6+4, and it is 8+3 now that there are eleven plots to spread over. What
  // beats a wall of blockers is enemies arriving faster than the wall can
  // re-engage, and three squads across TWO ROADS is a squad and a half each.
  'BEST 8 archery + 3 (expect LOSS)': [A(0), A(1), B(2), A(3), A(4), A(5), A(6), B(7), B(8), A(9), A(10)],
  'MIX 6 archery + 5 barracks':     [A(0), A(1), A(2), A(3), A(4), B(5), A(6), B(7), B(8), B(9), B(10)],
  'MIX 4 archery + 7 barracks':     [B(0), A(1), A(2), B(3), B(4), A(5), A(6), B(7), B(8), B(9), B(10)],
  'MIX 3 archery + 8 barracks':     [B(0), A(1), B(2), A(3), A(4), B(5), B(6), B(7), B(8), B(9), B(10)],
  // Artillery held to the same two rules as everywhere else, and compared the
  // same way map 1 compares it: take the winning archery mix and SWAP THE BOWS
  // FOR MACHINES, keeping every blocker where it was. That measures a catapult
  // against the tower it competes with for a plot, rather than measuring what
  // losing a blocker costs — which is already known and is fatal for anyone.
  //
  // THESE TWO ROWS DO NOT MEASURE ARTILLERY AND SHOULD NOT BE READ AS IF THEY
  // DID. They lose at wave 3 with FOUR TOWERS BUILT out of eleven — the `tiers`
  // and `fired` fields say so — and the reason is the spending model at the top
  // of this file rather than anything about a catapult. upgrade() runs before
  // build(), so a plan that opens with a machine puts its first 380 gold into one
  // plot's ladder while eight plots stand empty, and on a map with two roads and
  // eleven markers that is not a defence. The same list with bows in those two
  // slots builds all eleven and wins.
  //
  // It is left as it is rather than reordered, because the model is the same for
  // every family and quietly special-casing the dear ones would make every other
  // number here incomparable. What it means in practice is that MAP 3 HAS NO
  // ARTILLERY READING, and that the tier 4 pair on maps 1 and 2 is where the
  // Ballista Turret was actually measured.
  'ALL siege x11   (expect LOSS)':  [S(0), S(1), S(2), S(3), S(4), S(5), S(6), S(7), S(8), S(9), S(10)],
  'MIX 4 archery + 5 barracks + 2 siege': [S(0), A(1), A(2), A(3), S(4), B(5), A(6), B(7), B(8), B(9), B(10)],
  // TWO OF THE SIX BOWS SWAPPED, because at eleven towers one of anything is
  // inside the noise — and the two rows below are the same swap for the two
  // families, which is what makes them worth reading together.
  //
  // BOTH GO TO 0 IN 20 from the mix's 8, and that is the map rather than either
  // family: this build wins by covering two roads with bows and holding both with
  // blockers, and it has no slack anywhere. Trading reach for anything at all
  // breaks it. Compare map 2, where the same swap costs nothing.
  'ALL monastery x11 (expect LOSS)': [M(0), M(1), M(2), M(3), M(4), M(5), M(6), M(7), M(8), M(9), M(10)],
  'MIX 4 archery + 5 barracks + 2 monastery': [M(0), A(1), A(2), A(3), M(4), B(5), A(6), B(7), B(8), B(9), B(10)],
  'under-built     (expect LOSS)':  [A(0, 0)]
}
};

// Which map to balance. `node tools/sim.mjs 2` runs the second one.
//
// Only when this file IS the program. It used to select the level at import
// time from process.argv, which quietly broke every other script that imports
// run() — those scripts have their own arguments, sim.mjs read them as a map
// number, and an experiment that thought it was measuring map 2 measured map 1
// with map 2's plot indices. Two hours of "the second map is unwinnable" came
// out of that.
if (import.meta.url === `file://${process.argv[1]}`) {
  const which = Number(process.argv[2] || 1);
  useLevel(which - 1);
  console.log(`level ${which}: ${level.name}\n`);

  // Five battles per build, not one. See mulberry32 above: with lanes in, a
  // single run is a single battle, and the spread between them is wide enough
  // to flip a verdict.
  const SEEDS = [1, 2, 3, 4, 5];

  const scenarios = byLevel[level.id];
  if (!scenarios) throw new Error(`no scenarios for level ${level.id}`);

  for (const [label, plan] of Object.entries(scenarios)) {
    const rs = SEEDS.map(s => run(plan, s));
    const wins = rs.filter(r => r.result === 'won').length;
    const lives = rs.map(r => r.lives).sort((a, b) => a - b);
    const waves = rs.map(r => r.wave).sort((a, b) => a - b);
    const verdict = wins === SEEDS.length ? 'won' : wins === 0 ? 'lost' : `${wins}/5`;
    console.log(
      `${label.padEnd(38)} ${verdict.padEnd(6)}  lives ${String(lives[2]).padStart(3)}/${level.startLives}` +
      ` (${lives[0]}..${lives[lives.length - 1]})  wave ${waves[2]}`
    );
  }
}
