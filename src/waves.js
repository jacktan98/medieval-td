import { waves, waveClearBonus } from './data/waves.js';
import { spawn } from './enemies.js';

export function updateWaves(state, dt) {
  if (state.waveIndex >= waves.length) {
    if (state.enemies.length === 0 && state.result === null) state.result = 'won';
    return;
  }

  const wave = waves[state.waveIndex];
  state.timer -= dt;

  if (state.spawned < wave.count) {
    if (state.timer <= 0) {
      spawn(state, wave.type);
      state.spawned++;
      state.timer = wave.gap;
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
