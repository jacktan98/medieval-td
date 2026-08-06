import { loadArt } from './assets.js';
import { startGold, startLives } from './data/level01.js';
import { updateEnemies } from './enemies.js';
import { updateTowers } from './towers.js';
import { updateUnits } from './units.js';
import { updateShots } from './projectiles.js';
import { updateWaves } from './waves.js';
import { draw } from './render.js';
import { attachInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The game is drawn in a fixed 960x540 coordinate space, but the backing store
// is sized to real device pixels. Without this the canvas holds 960 pixels and
// the browser stretches them across a phone's ~2500 physical ones, so art is
// downscaled into the canvas and then blown back up — detail thrown away, then
// re-inflated. Sprites are the obvious casualty; text and thin lines suffer too.
//
// Nothing else has to care: the transform keeps every draw call in 960x540
// units, and input.js converts taps through the CSS box, which is unaffected.
const MAX_SCALE = 3;   // caps fill rate on very dense displays

function fitToDisplay() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(MAX_SCALE, Math.max(1, (rect.width / 960) * dpr));
  const w = Math.round(960 * scale);
  const h = Math.round(540 * scale);

  // Assigning width or height clears the canvas and resets the context, so
  // only do it when the size actually changed.
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(w / 960, 0, 0, h / 540, 0, 0);
}

const state = {};

function newGame() {
  Object.assign(state, {
    gold: startGold,
    lives: startLives,
    towers: [],
    enemies: [],
    units: [],
    shots: [],
    hits: [],
    waveIndex: 0,
    spawned: 0,
    timer: 2,
    resting: false,
    menu: null,
    result: null
  });
}

newGame();
attachInput(canvas, state, newGame);

let last = performance.now();

function frame(now) {
  fitToDisplay();

  // Clamp dt so a backgrounded tab doesn't teleport every enemy into the keep.
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!state.result) {
    updateWaves(state, dt);
    // Units run before enemies so an enemy that just walked into a soldier is
    // already held when the movement step asks whether it may advance.
    updateUnits(state, dt);
    updateEnemies(state, dt);
    updateTowers(state, dt);
    updateShots(state, dt);
    if (state.lives <= 0) state.result = 'lost';
  }

  draw(ctx, state);
  requestAnimationFrame(frame);
}

loadArt().then(() => requestAnimationFrame(frame));
