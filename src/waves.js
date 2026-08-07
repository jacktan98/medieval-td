import { waves, waveClearBonus, earlyCallRate, waveSize } from './data/waves.js';
import { spawn } from './enemies.js';

// state.spawned counts enemies spawned in the CURRENT wave, across all of its
// groups, so a wave that sends militia and then heavies is still one wave with
// one counter. Which group that count falls in is worked out here rather than
// stored, so nothing can drift out of sync with the data.
function groupAt(wave, spawned) {
  let n = 0;
  for (const g of wave.groups) {
    if (spawned < n + g.count) return g;
    n += g.count;
  }
  return null;
}

export function updateWaves(state, dt) {
  if (state.waveIndex >= waves.length) {
    if (state.enemies.length === 0 && state.result === null) state.result = 'won';
    return;
  }

  const wave = waves[state.waveIndex];
  state.timer -= dt;

  const group = groupAt(wave, state.spawned);
  if (group) {
    if (state.timer <= 0) {
      spawn(state, group.type);
      state.spawned++;
      // Read the group again: the one that just filled up hands over to the
      // next, and its gap is what should govern the pause before that spawn.
      const next = groupAt(wave, state.spawned);
      state.timer = (next || group).gap;
    }
    return;
  }

  // Wave fully spawned — wait for the field to clear, then bank the bonus.
  if (state.enemies.length === 0) {
    if (!state.resting) {
      state.gold += waveClearBonus;
      state.resting = true;
      state.timer = wave.rest;
    }
    if (state.timer <= 0) {
      state.waveIndex++;
      state.spawned = 0;
      state.resting = false;
      state.timer = 0;
    }
  }
}

// True when the player may call the next wave in early. Only during the rest
// between waves: calling mid-wave would stack two waves on the road, which is a
// different game and not one this level is balanced for.
export function canCallWave(state) {
  return !state.result && state.resting && state.timer > 0 &&
         state.waveIndex < waves.length;
}

// Gold for the rest you give up. Paid immediately, so the trade is visible: you
// are buying that gold with the time you would have spent rebuilding.
export function callWaveEarly(state) {
  if (!canCallWave(state)) return 0;
  const bonus = Math.round(state.timer * earlyCallRate);
  state.gold += bonus;
  state.timer = 0;
  return bonus;
}

export function earlyCallBonus(state) {
  return canCallWave(state) ? Math.round(state.timer * earlyCallRate) : 0;
}

export { waveSize };
