// The loop. Nothing here is clever: fit the canvas, step the fight, draw it.
//
// This page is entered from the medieval game's admin keypad on 2208 and knows
// nothing about it — there is no way back except the browser's own Back button,
// which is the right one because that is exactly what it is.

import { loadArt } from './assets.js';
import { loadAudio } from './audio.js';
import { newGame, step, validate } from './rules.js';
import { draw, NAME_BOX } from './render.js';
import { attach } from './input.js';
import { save } from './certificate.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nameField = document.getElementById('name');

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
  // THE NAME OUTLIVES A GAME. Everything else about a state object belongs to one
  // playthrough and is thrown away with it, but somebody who typed their name on
  // the certificate, went back for one more go at Two Rivers and came round again
  // should not have to type it twice.
  const keep = { name: state.name || '' };
  const next = newGame(mapIndex ?? state.mapIndex);
  if (skipIntro) { next.screen = 'play'; next.begun = true; }
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, next, keep);
}

// THE NAME FIELD lives over the canvas rather than in it, and this is everything
// that takes: keep the typed value on the state, and put the element where the
// renderer drew its box. Two lines of arithmetic and no framework.
nameField.addEventListener('input', () => { state.name = nameField.value; });

function placeNameField() {
  const on = state.screen === 'certificate';
  nameField.hidden = !on;
  if (!on) return;
  const r = canvas.getBoundingClientRect();
  const kx = r.width / 960;
  const ky = r.height / 540;
  nameField.style.left = `${r.left + NAME_BOX.x * kx}px`;
  nameField.style.top = `${r.top + NAME_BOX.y * ky}px`;
  nameField.style.width = `${NAME_BOX.w * kx}px`;
  nameField.style.height = `${NAME_BOX.h * ky}px`;
  nameField.style.fontSize = `${Math.round(18 * ky)}px`;
}

// Making the PDF is a couple of hundred milliseconds of JPEG encoding, so the
// button says so while it happens rather than appearing to do nothing.
async function download() {
  if (state.saving) return;
  state.saving = true;
  try { await save(state.name || ''); }
  catch (e) { console.warn('Birthday: could not make the certificate', e); }
  state.saving = false;
}

attach(canvas, state, restart, download);

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
  placeNameField();
  requestAnimationFrame(frame);
}

// THE SOUND IS NOT WAITED FOR. The game is playable in silence and a few
// megabytes of mp3 should never be the reason somebody is looking at a blank
// screen; clips light up as they arrive. Nothing can be heard until the first
// tap in any case — see unlock() in audio.js.
loadAudio();
loadArt().then(() => requestAnimationFrame(frame));
