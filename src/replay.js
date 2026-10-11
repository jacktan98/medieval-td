// THE REPLAY, at the owner's word: a game recorded as it is played, and played again
// on replay.html exactly as it happened — every enemy, shot and soldier.
//
// WHAT MAKES THAT POSSIBLE is that a game is a machine: the same start, the same dice
// and the same presses at the same moments give the same game. So a recording is
// small — not a film but the recipe:
//
//   the start   which board and difficulty, the dice's seed (src/rng.js), and every
//               saved setting the game reads (`storage`: star upgrades, the creatures
//               already met, the dashboard's numbers), so the replay starts from the
//               very same place even on another device;
//   the presses every tap and every menu a mouse opened by hovering, each with the
//               step of the game's clock it came on (src/main.js runs the game in
//               fixed steps of 1/60 s for exactly this reason);
//   the voices  the few places the game waits on a voice line finishing — the bosses
//               walking out — whose answer depends on the device's sound, so the
//               answer itself is written down (`gate`);
//   the checks  every CHECK_EVERY steps, a fingerprint of the board, so the viewer can
//               say if a replay has drifted from what happened (a different browser can
//               round a sine differently, and a game is chaotic enough to show it).
//
// Kept in this browser's storage, the last MAX_RUNS of them, and exported and
// imported with the player log on stats.html.
export const RUNS_KEY = 'medieval-td/replays';
const MAX_RUNS = 10;
const CHECK_EVERY = 120;
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

let mode = 'off';       // 'off' | 'record' | 'play'
let run = null;         // the recording being made, or played
let cursor = 0;         // play: the next press to apply
let gates = {};         // play: each voice gate's answer as of now
let gateCursor = 0;
let checkCursor = 0;
export let drift = null;   // play: { s } at the first fingerprint that did not match

export const replaying = () => mode === 'play';
export const recording = () => mode === 'record';

// THE BOARD'S FINGERPRINT: what anyone watching would notice was different.
function fingerprint(state) {
  let h = 0;
  const mix = v => { h = Math.imul(h ^ Math.round(v * 16), 0x01000193) >>> 0; };
  mix(state.gold); mix(state.lives); mix(state.waveIndex); mix(state.spawned);
  mix(state.enemies.length); mix(state.units.length); mix(state.towers.length);
  for (const e of state.enemies) { mix(e.hp); mix(e.x); mix(e.y); }
  for (const u of state.units) { mix(u.hp); mix(u.x); mix(u.y); }
  return h.toString(36);
}

// --- recording -----------------------------------------------------------------

// The game has just started: begin a recording of it.
export function startRecording(state, extra = {}) {
  if (mode === 'play') return;
  const storage = {};
  const s = store();
  if (s) {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith('medieval-td/') && k !== RUNS_KEY && k !== 'medieval-td/events') storage[k] = s.getItem(k);
    }
  }
  run = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    at: Date.now(),
    levelIndex: state.levelIndex, difficultyIndex: state.difficultyIndex ?? 0,
    seed: state.seed, anim: state.anim || 0, storage,
    inputs: [], gates: [], checks: [], ...extra
  };
  mode = 'record';
  clock = state.steps || 0;
  lastGate = {};
}

// A press, on the step it came.
export function recordInput(state, input) {
  if (mode !== 'record') return;
  run.inputs.push({ s: state.steps, ...input });
}

// A VOICE GATE: the game asking the sound whether a line has been said. Recorded as
// the steps on which the answer changed; played back from that record, whatever the
// sound on this device says. `site` names the place it is asked.
// The game clock's step, kept here for the gates, which are asked from deep inside
// the villagers where the state is not to hand. Set by `afterStep` and `startRecording`.
let clock = 0;
let lastGate = {};
export function gate(site, actual) {
  if (mode === 'record') {
    if ((lastGate[site] ?? false) !== actual) { run.gates.push({ s: clock, site, v: actual }); lastGate[site] = actual; }
    return actual;
  }
  if (mode === 'play') return gates[site] ?? false;
  return actual;
}

// Once a step, after it: a fingerprint now and then (recording), or the next presses
// and gate answers due (playing). Returns the presses to apply before the next step.
export function afterStep(state) {
  clock = state.steps;
  if (mode === 'record' && state.steps % CHECK_EVERY === 0) run.checks.push({ s: state.steps, h: fingerprint(state) });
  if (mode === 'play' && checkCursor < run.checks.length && run.checks[checkCursor].s === state.steps) {
    if (!drift && run.checks[checkCursor].h !== fingerprint(state)) drift = { s: state.steps };
    checkCursor++;
  }
}

// The presses due at this step, for the player to apply (playing only).
export function duePresses(state) {
  if (mode !== 'play') return [];
  while (gateCursor < run.gates.length && run.gates[gateCursor].s <= state.steps) {
    const g = run.gates[gateCursor++];
    gates[g.site] = g.v;
  }
  const due = [];
  while (cursor < run.inputs.length && run.inputs[cursor].s <= state.steps) due.push(run.inputs[cursor++]);
  return due;
}

// The game is over, or left: keep the recording.
export function stopRecording(state, how) {
  if (mode !== 'record' || !run) return;
  mode = 'off';
  run.end = { s: state.steps, how, lives: state.lives, gold: state.gold, wave: (state.waveIndex || 0) + 1 };
  const r = run;
  run = null;
  // Too short to be worth watching: a start pressed and left at once.
  if (r.end.s < 60 && !r.inputs.length) return;
  const all = loadRuns();
  all.push(r);
  saveRuns(all.slice(-MAX_RUNS));
}

export function loadRuns() {
  try { const v = JSON.parse(store()?.getItem(RUNS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveRuns(all) {
  // A full store drops the oldest until it fits.
  while (all.length) {
    try { store()?.setItem(RUNS_KEY, JSON.stringify(all)); return; } catch { all.shift(); }
  }
}

// --- playing -------------------------------------------------------------------

export function startPlayback(r) {
  run = r;
  mode = 'play';
  cursor = 0; gateCursor = 0; checkCursor = 0; gates = {}; drift = null; clock = 0;
}
export const playing = () => run;
export const ended = state => !!run && run.end && state.steps >= run.end.s && cursor >= run.inputs.length;
