// The loop. Nothing here is clever: fit the canvas, step the fight, draw it.
//
// This page is entered from the medieval game's admin keypad on 2208 and knows
// nothing about it — there is no way back except the browser's own Back button,
// which is the right one because that is exactly what it is.

import { loadArt } from './assets.js';
import { loadAudio } from './audio.js';
import { newGame, step, validate } from './rules.js';
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

// `skipIntro` is what Restart and Play again pass: the family have already read
// the four descriptions and making them press Start again is a tap for nothing.
// Choosing a map from the picker does not pass it, so the introduction still comes
// up the first time each map is played.
function restart(mapIndex, skipIntro = false) {
  const next = newGame(mapIndex ?? state.mapIndex);
  if (skipIntro) { next.screen = 'play'; next.begun = true; }
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, next);
}

attach(canvas, state, restart);

// The same door the big game opens on `?debug`, for the same reason: a browser
// driving this page needs somewhere to read the board from. It is behind the
// query string, so nothing is exposed to somebody playing it.
if (location.search.includes('debug')) window.__birthday = state;

let last = performance.now();

function frame(now) {
  fit();
  // Clamped for the same reason the big game clamps: a backgrounded tab must not
  // walk a whole wave into the house in one step.
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  // Two ways the fight stops, and they are different things. `paused` is the
  // player pressing pause and leaves the board on show; any screen other than
  // 'play' is a panel over the top of it — the family pop-up is a pause in its own
  // right, which is what makes going back for a reminder safe mid-wave.
  if (state.screen === 'play' && !state.paused) step(state, dt);
  // Drop a selection whose subject has left the game. Here rather than inside
  // draw(), so the renderer stays a pure reader of state — and unconditionally,
  // because a thug can be swept up on the frame the player pauses.
  validate(state);
  draw(ctx, state);
  requestAnimationFrame(frame);
}

// THE SOUND IS NOT WAITED FOR. The game is playable in silence and a few
// megabytes of mp3 should never be the reason somebody is looking at a blank
// screen; clips light up as they arrive. Nothing can be heard until the first
// tap in any case — see unlock() in audio.js.
loadAudio();
loadArt().then(() => requestAnimationFrame(frame));
