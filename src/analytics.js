// WHAT PLAYERS DO, kept on their own device, at the owner's word ("option A"): every
// button they press and every tap that pressed nothing, how long each tutorial line
// took them, where each stage was won or lost, and what slipped past. Read on
// stats.html, which can export the log to a file and load files back in, so a
// playtester's run can be sent and looked at.
//
// NOTHING LEAVES THE BROWSER. It is localStorage and nothing else: no server, no
// request, no identifier beyond a random one per visit. Clearing site data clears it.
//
// SMALL AND BOUNDED: an event is a few short fields, the log keeps the latest
// MAX_EVENTS, and it is written at most once every SAVE_MS (and when the page is
// hidden), so a busy wave of taps does not rewrite the whole log on every one.
//
// Not in the admin dashboard: the owner's own testing is not a player's play.
import { STAGES } from './data/overview.js';
import { DIFFICULTIES } from './data/difficulty.js';

export const EVENTS_KEY = 'medieval-td/events';
const MAX_EVENTS = 5000;
const SAVE_MS = 2000;
const REPEAT_MS = 1500;

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
// One visit's id, so a log from several visits can be told apart.
const visit = Math.random().toString(36).slice(2, 8);
let log = null;
let timer = null;

function load() {
  if (log) return log;
  try { log = JSON.parse(store()?.getItem(EVENTS_KEY) || '[]'); } catch { log = []; }
  if (!Array.isArray(log)) log = [];
  return log;
}
function save() {
  timer = null;
  if (!log) return;
  if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS);
  try { store()?.setItem(EVENTS_KEY, JSON.stringify(log)); } catch { /* full or private: this visit only */ }
}
if (typeof addEventListener === 'function') {
  addEventListener('pagehide', save);
  addEventListener('visibilitychange', () => { if (typeof document !== 'undefined' && document.hidden) save(); });
}

// Record one event. `k` is its kind; the rest is whatever it carries.
export function track(k, data = {}) {
  if (!store()) return;
  const now = Date.now(), list = load(), last = list[list.length - 1];
  // THE SAME TAP AGAIN, on the same thing within REPEAT_MS, is counted on the one
  // before (`n`) rather than logged again: a frustrated player hammering a button the
  // tutorial will not let through is one fact, not a hundred.
  if (k === 'tap' && last && last.k === 'tap' && last.v === visit && last.b === data.b &&
      last.x === data.x && last.y === data.y && now - (last.last || last.t) < REPEAT_MS) {
    last.n = (last.n || 1) + 1;
    last.last = now;
  } else {
    list.push({ t: now, v: visit, k, ...data });
  }
  if (!timer) timer = setTimeout(save, SAVE_MS);
}

// WHERE THE PLAYER IS, stamped on game events: the stage's number on the road, the
// difficulty, and the wave.
export function where(state) {
  const i = STAGES.findIndex(s => s.level === state.levelIndex);
  return {
    stage: i + 1,
    diff: (DIFFICULTIES[state.difficultyIndex ?? 0] || {}).name,
    wave: Math.min((state.waveIndex || 0) + 1, (state.waves || []).length || 1)
  };
}

// The layer a tap landed on, for telling a miss on the board from one on the map.
export function layerOf(state) {
  if (state.admin) return 'admin';
  if (state.book !== null && state.book !== undefined) return 'book';
  if (state.upgrades) return 'upgrades';
  if (state.foeCard) return 'card';
  if (!state.started) return state.stage === null || state.stage === undefined ? 'map' : 'panel';
  if (state.result) return 'result';
  if (state.paused) return 'paused';
  return 'game';
}

// THE GAME'S OWN TURNS, watched once a frame rather than wired into each place they
// happen: a stage starting, each wave going out, and the stage ending — won or lost.
// (Quitting and restarting are told from input.js, which is where they happen.)
export function watchGame(state) {
  const w = state._watch ||= { started: false, wave: -1, result: null };
  if (state.admin) return;
  if (state.started && !w.started) {
    track('stage_start', { ...where(state), gold: state.gold, lives: state.lives });
    w.wave = -1;
    w.result = null;
    w.at = Date.now();
  }
  w.started = !!state.started;
  if (!state.started) return;
  const out = state.spawned > 0 || state.waveIndex > 0;
  if (out && state.waveIndex !== w.wave && state.waveIndex < (state.waves || []).length) {
    w.wave = state.waveIndex;
    track('wave', { ...where(state), lives: state.lives, gold: state.gold });
  }
  if (state.result && state.result !== w.result) {
    w.result = state.result;
    track('stage_end', { ...where(state), result: state.result, lives: state.lives,
      secs: Math.round((Date.now() - (w.at || Date.now())) / 1000) });
  }
}

// A game thrown away from the pause menu, before the board is rebuilt.
export function trackLeave(state, how) {
  const w = state._watch;
  if (!state.started || state.result || (w && w.result)) return;
  track('stage_end', { ...where(state), result: how, lives: state.lives,
    secs: Math.round((Date.now() - ((w && w.at) || Date.now())) / 1000) });
}
