import { loadArt } from './assets.js';
import { startGold, startLives } from './data/level01.js';
import { updateEnemies } from './enemies.js';
import { updateTowers } from './towers.js';
import { updateShots } from './projectiles.js';
import { updateWaves } from './waves.js';
import { draw } from './render.js';
import { attachInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {};

function newGame() {
  Object.assign(state, {
    gold: startGold,
    lives: startLives,
    towers: [],
    enemies: [],
    shots: [],
    hits: [],
    waveIndex: 0,
    spawned: 0,
    timer: 2,
    resting: false,
    selected: null,
    result: null
  });
}

newGame();
attachInput(canvas, state, newGame);

let last = performance.now();

function frame(now) {
  // Clamp dt so a backgrounded tab doesn't teleport every enemy into the keep.
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!state.result) {
    updateWaves(state, dt);
    updateEnemies(state, dt);
    updateTowers(state, dt);
    updateShots(state, dt);
    if (state.lives <= 0) state.result = 'lost';
  }

  draw(ctx, state);
  requestAnimationFrame(frame);
}

loadArt().then(() => requestAnimationFrame(frame));
