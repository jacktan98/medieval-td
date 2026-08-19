// The loop. Nothing here is clever: fit the canvas, step the fight, draw it.
//
// This page is entered from the medieval game's admin keypad on 2208 and knows
// nothing about it — there is no way back except the browser's own Back button,
// which is the right one because that is exactly what it is.

import { loadArt } from './assets.js';
import { newGame, step } from './rules.js';
import { draw } from './render.js';
import { attach } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Same cap as the big game's, for the same reason: a phone at 3x device pixels is
// as sharp as this art can be drawn, and anything past it is fill rate spent on
// nothing.
const MAX_SCALE = 3;

function fit() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(MAX_SCALE, Math.max(1, (rect.width / 960) * dpr));
  const w = Math.round(960 * scale);
  const h = Math.round(540 * scale);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx.setTransform(w / 960, 0, 0, h / 540, 0, 0);
}

// One state object, replaced wholesale when a map is chosen. `restart` is passed
// into the input so the map screen and the result screen can both start a game
// without either of them knowing how one is built.
let state = newGame(0);
state.screen = 'maps';

function restart(mapIndex) {
  const next = newGame(mapIndex ?? state.mapIndex);
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, next);
}

attach(canvas, state, restart);

let last = performance.now();

function frame(now) {
  fit();
  // Clamped for the same reason the big game clamps: a backgrounded tab must not
  // walk a whole wave into the house in one step.
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (state.screen === 'play') step(state, dt);
  draw(ctx, state);
  requestAnimationFrame(frame);
}

loadArt().then(() => requestAnimationFrame(frame));
