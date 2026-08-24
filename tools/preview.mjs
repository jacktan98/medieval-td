// Does the wave preview tell the truth? Node only — never loaded by the game.
//
//   node tools/preview.mjs
//
// The row of faces under the Next wave button is a PROMISE: 20 thugs, 3 giants,
// a plague doctor. A promise the road then breaks is worse than no promise at
// all — a player who called a wave in early on the strength of it has been
// misled by the game's own UI, and nothing on screen would ever say so.
//
// So this drives the real updateWaves through every wave of every map at every
// difficulty, tallies what actually walks out of the gate, and compares it with
// what upcomingWave() said was coming before it started. Nothing here models the
// spawner; it IS the spawner, minus drawing.
//
// It also guards the two edges the preview has:
//
//   the FIRST wave is previewed during the opening delay, when there is no
//   "current" wave to be after — the one case where the row is the wave the HUD
//   is already naming rather than the one after it
//
//   the LAST wave previews nothing, because there is nothing after it, and an
//   empty row appearing only at the end reads as something having broken

import { updateWaves, upcomingWave } from '../src/waves.js';
import { enemyTypes, openingDelay, MODES, tableFor } from '../src/data/waves.js';
import { levels, useLevel, level } from '../src/level.js';
import { DIFFICULTIES, scaleWaves } from '../src/data/difficulty.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const DT = 1 / 60;

// A wave's composition as one comparable string, so a mismatch prints as the two
// lines a reader can hold side by side rather than as two object dumps.
const show = counts => [...counts.entries()]
  .map(([type, n]) => `${enemyTypes[type].name} x${n}`).join(', ') || '(nothing)';

// Run one map at one difficulty to the end, and hand back what was PROMISED for
// each wave and what was actually SENT.
//
// The field is cleared every frame, which is what makes this fast and is also
// exactly the condition updateWaves is waiting for between waves: no towers, no
// fight, no walking — the spawner alone, running its own clock.
function run(modeId = 'normal') {
  const state = {
    waves: scaleWaves(tableFor(level, modeId), DIFFICULTIES[0]),
    enemies: [], waveIndex: 0, spawned: 0, timer: openingDelay,
    resting: false, gold: 0, result: null
  };
  // The difficulty is replaced per caller below; this shape is the game's.
  return state;
}

function play(state) {
  const promised = new Map();   // wave index -> Map(type -> count)
  const sent = new Map();       // the same, tallied off the spawner
  let steps = 0;

  while (state.result === null && steps < 60 * 60 * 60) {
    // WHAT THE PLAYER IS BEING TOLD, right now. Recorded the first time each
    // wave is named, which is the moment the row goes up for it — before a
    // single enemy of that wave has been spawned, which is the whole point.
    const next = upcomingWave(state);
    if (next && !promised.has(next.index)) {
      promised.set(next.index, new Map(next.groups.map(g => [g.type, g.count])));
    }

    const before = state.enemies.length;
    const at = state.waveIndex;
    updateWaves(state, DT);
    steps++;

    // WHAT ACTUALLY LEFT THE GATE. Read off state.enemies rather than counted
    // from the table, so a spawner that sent the wrong thing is caught here and
    // not merely re-described.
    for (let i = before; i < state.enemies.length; i++) {
      const type = Object.keys(enemyTypes).find(k => enemyTypes[k] === state.enemies[i].def);
      if (!sent.has(at)) sent.set(at, new Map());
      const m = sent.get(at);
      m.set(type, (m.get(type) || 0) + 1);
    }
    // Cleared immediately: this file is asking what the spawner sends, not what
    // a fight does with it.
    state.enemies.length = 0;
  }

  return { promised, sent, steps };
}

for (const [li, lv] of levels.entries()) {
  useLevel(li);
  console.log(`\n${lv.id} ${lv.name}\n`);

  for (const mode of MODES) {
  for (const diff of DIFFICULTIES) {
    const state = run(mode.id);
    state.waves = scaleWaves(tableFor(level, mode.id), diff);
    const { promised, sent } = play(state);

    let wrong = 0;
    for (let i = 0; i < state.waves.length; i++) {
      const p = promised.get(i);
      const s = sent.get(i) || new Map();
      if (!p) { wrong++; continue; }
      const same = p.size === s.size && [...p].every(([t, n]) => s.get(t) === n);
      if (!same) {
        wrong++;
        console.log(`      wave ${i + 1} promised ${show(p)}`);
        console.log(`             but sent ${show(s)}`);
      }
    }

    ok(wrong === 0, `${mode.name} / ${diff.name}: every wave sends what was shown`,
      `${state.waves.length} waves`);
  }
  }

  // AND THE LENGTHS ARE THE LENGTHS THE OWNER ASKED FOR: two more waves than the
  // map's own table, whatever that table is. Checked here rather than typed as 10
  // and 12, so a map that grows a wave keeps the relationship.
  ok(tableFor(level, 'extended').length === tableFor(level, 'normal').length + 2,
    'and Extended is exactly two waves longer',
    `${tableFor(level, 'normal').length} -> ${tableFor(level, 'extended').length}`);

  // THE FIRST WAVE IS PREVIEWED, and it is the one time the row names the wave
  // the HUD is already showing rather than the one after it — nothing has
  // started, so "next" is wave 1.
  const opening = run();
  const first = upcomingWave(opening);
  ok(first && first.index === 0, 'the opening delay previews wave 1',
    first && show(new Map(first.groups.map(g => [g.type, g.count]))));

  // AND THE LAST WAVE PREVIEWS NOTHING, from either state it can be in: still
  // spawning, or spawned and waiting for the field to clear.
  const last = run();
  last.waveIndex = last.waves.length - 1;
  last.spawned = 1;
  ok(upcomingWave(last) === null, 'and the last wave has nothing after it');
  last.resting = true;
  ok(upcomingWave(last) === null, 'even once it has finished spawning');
}

// The preview must survive a wave table the dashboard has edited, because that
// is the one table that is not in a file: it is read from the state, which is
// where the admin's numbers land. A row still quoting the data file after the
// owner dialled wave 5 down to 4 enemies would be lying by a factor of four.
console.log('\nWhat the dashboard changes\n');
{
  useLevel(0);
  const state = run();
  const wave = 3;
  state.waves[wave] = { rest: 9, groups: [{ type: 'heavy_inf', count: 7, gap: 2 }] };
  state.waveIndex = wave - 1;
  state.spawned = 1;
  const seen = upcomingWave(state);
  ok(seen && seen.index === wave && seen.groups.length === 1 &&
     seen.groups[0].type === 'heavy_inf' && seen.groups[0].count === 7,
    'the row reads the table the game is playing',
    seen && show(new Map(seen.groups.map(g => [g.type, g.count]))));
}

// EVERY THROWER HAS SOMETHING TO THROW. The ammunition moved from the throwing
// code onto the enemy when the archer arrived, and a `ranged` block without an
// `ammo` is a crash the first time that enemy sees a soldier — which is exactly
// the sort of thing that only shows up in a run, and only for one enemy type.
console.log('\nWhat each thrower throws\n');
for (const [id, d] of Object.entries(enemyTypes)) {
  if (!d.ranged) continue;
  ok(!!(d.ranged.ammo && d.ranged.ammo.sprite && d.ranged.speed !== null),
    `${d.name} has ammunition to loose`, d.ranged.ammo && d.ranged.ammo.sprite);
  // AND HE STOPS SOMEWHERE HIS ENEMY CAN REACH. `stopAt` may be shorter than
  // `range` but never longer: an enemy that plants himself further out than he
  // can shoot would stand there doing nothing, and one that stops beyond every
  // answer on the board hangs the wave instead of ending it.
  const stop = d.ranged.stopAt ?? d.ranged.range;
  ok(stop <= d.ranged.range, 'and stops no further out than he can hit',
    `stops at ${stop}, hits to ${d.ranged.range}`);
}

console.log(bad ? `\n${bad} preview rule(s) broken.` : '\nThe preview promises what the road delivers.');
process.exit(bad ? 1 : 0);
