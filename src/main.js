import { loadArt } from './assets.js';
import { startGold, startLives } from './data/level01.js';
import { openingDelay } from './data/waves.js';
import { updateEnemies } from './enemies.js';
import { updateTowers } from './towers.js';
import { updateUnits } from './units.js';
import { updateShots } from './projectiles.js';
import { updateCorpses } from './corpses.js';
import { updateSplats } from './blood.js';
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
    // Bodies on the road, and the blood thrown by every hit. Cleared with
    // everything else on restart, so a lost game does not hand the next one a
    // battlefield. The pools are not here: each one belongs to a corpse.
    corpses: [],
    splats: [],
    waveIndex: 0,
    spawned: 0,
    timer: openingDelay,
    // Held at the title screen. Nothing steps until the player presses Start —
    // not the spawn clock and not `timer`, which is what the early-call bonus is
    // computed from. Loading the page used to start that draining silently.
    //
    // A restart comes back here rather than straight into a running game, so the
    // second attempt gets the same look at the board as the first.
    started: false,
    resting: false,
    menu: null,
    result: null,
    // Dashboard fast-forward. 1 or 2; multiplies the simulation step, so the
    // game runs at double tempo without any per-system speed constant.
    speed: 1,
    // Desktop-only, and null on a phone for the whole session: the tower under
    // the mouse, and the pointer position while a rally is being placed.
    hoverTower: null,
    ghost: null,
    // The barracks waiting for its rally point to be tapped.
    placing: null
  });
}

newGame();
attachInput(canvas, state, newGame);

let last = performance.now();

function frame(now) {
  fitToDisplay();

  // Clamp dt so a backgrounded tab doesn't teleport every enemy into the keep.
  // The clamp is applied BEFORE the fast-forward multiplier, so 2x is exactly
  // two normal steps' worth of time and never a single huge one — a big step
  // walks enemies straight through a blocker's ENGAGE radius without stopping.
  const real = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (state.started && !state.result) {
    for (let i = 0; i < state.speed; i++) step(state, real);
  }

  draw(ctx, state);
  requestAnimationFrame(frame);
}

function step(state, dt) {
  if (state.result) return;
  updateWaves(state, dt);
  // Units run before enemies so an enemy that just walked into a soldier is
  // already held when the movement step asks whether it may advance.
  updateUnits(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt);
  updateShots(state, dt);
  // Last, so blood and bodies made by this step get their full life rather than
  // being aged by the frame that created them.
  updateCorpses(state, dt);
  updateSplats(state, dt);
  if (state.lives <= 0) state.result = 'lost';
}

loadArt().then(() => requestAnimationFrame(frame));
