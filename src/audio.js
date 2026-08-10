// Sound. Two rules, and the rules are the whole design.
//
//   play(key)     Category B — every time, however many at once.
//   solo(cue)     Category A — one at a time, then a second of quiet.
//
// Category A is a SINGLE CHANNEL shared by everything in it. While one of its
// clips is sounding, every other Category A request is dropped on the floor —
// not queued, dropped — and when it finishes nothing else may start for a
// second. That is what keeps a fight from turning into a wall: six soldiers
// swinging, two dying and a thug jeering all land inside the same half second,
// and without the channel you would hear all nine at once.
//
// Dropped rather than queued is the important half. A queue would play the
// death cry of a man who died four seconds ago, which is worse than silence —
// it is sound that lies about what is on the screen right now.
//
// Category B is for the one sound that has to be exact: an arrow leaving a bow.
// Ten towers firing is ten twangs, because each one is a thing you can see
// happen, and the shot you are watching must be the shot you hear.
//
// --- Web Audio, not <audio> ------------------------------------------------
//
// One AudioContext, each file decoded once into a buffer, and a play is a
// throwaway node pointed at it. An <audio> element cannot overlap itself
// without being cloned, and on a phone it carries tens of milliseconds of
// startup lag — which is precisely the lag this game cannot have, since it is
// the gap between the bowstring and the twang.
//
// --- This file must stay importable in Node ---------------------------------
//
// tools/sim.mjs runs the real combat modules headless, and they call in here.
// So nothing at module level may touch a browser API: the context is built
// lazily, and every entry point returns quietly when there is no context. In
// Node there never is one, and the sim runs in silence without knowing why.

// The quiet after a Category A clip, in seconds.
const GAP = 1;

// The shortest gap between two plays of THE SAME Category B clip. This is not a
// throttle and must never grow into one — it exists because at 2x speed the
// game steps twice in one frame, so two towers can fire on the very same
// millisecond. Two identical buffers starting together do not sound like two
// arrows, they sound like one loud click, because the waveforms add. 40ms is
// under the ear's ability to separate two clicks anyway, so nothing audible is
// lost, and two shots 100ms apart are still two shots.
const SAME_CLIP_GAP = 0.04;

// Master level for everything. Per-clip trims go in GAIN below.
const MASTER = 0.9;

// Every clip, by the name the game calls it. Spaces are encoded for the same
// reason they are in assets.js — `Soldier dies.mp3` really does have a space in
// it and a raw space is not legal in a URL. The file is left alone rather than
// renamed: renaming an upload only means renaming it again after the next one,
// and worse, a rename here plus a re-upload there leaves you with two files and
// no idea which one is playing.
const paths = {
  arrow_shot:      'assets/audio/sfx/Arrow_shot.mp3',
  arrow_hit_enemy: 'assets/audio/sfx/Arrow_hit_enemy.mp3',
  stab:            'assets/audio/sfx/Stab.mp3',
  thug_dies:       'assets/audio/sfx/Thug_dies.mp3',
  soldier_dies:    'assets/audio/sfx/Soldier%20dies.mp3',
  soldier_attack:  'assets/audio/sfx/Soldier_attack.mp3',
  archers_1:       'assets/audio/voice/Archers_1.mp3',
  archers_2:       'assets/audio/voice/Archers_2.mp3',
  archers_3:       'assets/audio/voice/Archers_3.mp3',
  barracks_1:      'assets/audio/voice/Barracks_1.mp3',
  barracks_2:      'assets/audio/voice/Barracks_2.mp3',
  barracks_3:      'assets/audio/voice/Barracks_3.mp3',
  thug_1:          'assets/audio/voice/Thug_1.mp3'
};

// Per-clip level, where a file arrived louder or quieter than its neighbours.
// Anything not listed plays at 1. This is the knob to reach for when something
// sits wrong in the mix — it is a number here, not a re-export, so it costs
// nothing to try.
const GAIN = {};

// The cues. A cue is a LIST, and the game asks for the list rather than for a
// file: `solo(CUE.barracks)` picks one of the three at random, so the same
// order twice running is not the same voice twice running.
//
// Two of them mix a cry with a blade on purpose. A barracks kill is either the
// thug's death or the sound of the sword going in — one or the other, never
// both, because Category A is one channel and layering is a thing it cannot do.
export const CUE = {
  archery:      ['archers_1', 'archers_2', 'archers_3'],
  barracks:     ['barracks_1', 'barracks_2', 'barracks_3'],
  thug:         ['thug_1'],
  arrowKill:    ['arrow_hit_enemy'],
  meleeKill:    ['thug_dies', 'stab'],
  soldierDeath: ['soldier_dies', 'stab'],
  soldierSwing: ['soldier_attack']
};

// The Category B clip, alone in its category.
export const SHOT = 'arrow_shot';

let ctx = null;
const buffers = {};

// When Category A may speak again, on the context's clock.
let gateUntil = 0;

// When each Category B clip last started, for the same-millisecond guard.
const lastStart = {};

// Kick off loading. Deliberately NOT awaited by main.js: the game is playable
// without sound, and half a megabyte of mp3 should never be the reason a player
// is still looking at a blank screen. Clips light up as they arrive, and one
// that fails simply never plays.
//
// The context is built here, before any tap, and starts life suspended — which
// is allowed, and decoding works fine in that state. It is only PLAYING that a
// phone refuses until the player has touched the screen. See unlock().
export function loadAudio() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return Promise.resolve();   // Node, or a browser too old to care about

  ctx = new AC();

  const jobs = Object.entries(paths).map(([key, src]) =>
    fetch(src)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then(data => ctx.decodeAudioData(data))
      .then(buf => { buffers[key] = buf; })
      .catch(() => console.warn('Missing or unreadable audio:', src))
  );

  return Promise.all(jobs);
}

// Let sound out. Must be called from inside a real touch or click handler —
// both iOS and Android ignore audio that starts on its own, and a context
// resumed anywhere else stays suspended without reporting an error.
//
// The game already has the perfect place for this and it cost nothing to add:
// the Start button. By the time there is anything to hear, the player has
// pressed it. It is also called on every later tap, which is not redundant —
// a phone locking, a call arriving, or a tab going to the background all
// suspend the context again, and without this the game would come back mute.
export function unlock() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

function fire(key, when = 0) {
  const buf = buffers[key];
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const g = ctx.createGain();
  g.gain.value = MASTER * (GAIN[key] ?? 1);

  src.connect(g).connect(ctx.destination);
  src.start(when);
  return buf.duration;
}

// Category B. Every time it happens, however many at once.
export function play(key) {
  if (!ctx || ctx.state !== 'running' || !buffers[key]) return;

  const now = ctx.currentTime;
  if (now - (lastStart[key] ?? -Infinity) < SAME_CLIP_GAP) return;
  lastStart[key] = now;

  fire(key);
}

// Category A. One at a time, then a second of quiet.
//
// The gate closes for the clip's own length plus the gap, so a three-second
// line holds the channel for four. That is a real cost and it is worth knowing
// where it lands: tapping a thug is the longest silence in the game.
//
// Note the order — the gate is only touched once a clip has actually been
// chosen and started. A cue whose files have not loaded yet must not close the
// channel on everything else while playing nothing.
export function solo(cue) {
  // Callers pass the result of a lookup straight in, and plenty of things have
  // nothing to say — bare ground, a siege plot, a family with no voice yet.
  if (!cue) return;
  if (!ctx || ctx.state !== 'running') return;
  if (ctx.currentTime < gateUntil) return;

  const ready = cue.filter(key => buffers[key]);
  if (!ready.length) return;

  const key = ready[(Math.random() * ready.length) | 0];
  gateUntil = ctx.currentTime + fire(key) + GAP;
}

// A tower family's voice, or null for one with nothing recorded. Siege and the
// monastery have no tiers yet, let alone lines, and a lookup that returns null
// is how a family with no art already gets a button rather than a blank.
export function familyCue(famId) {
  return famId === 'archery' ? CUE.archery
       : famId === 'barracks' ? CUE.barracks
       : null;
}

// The cue for whatever the player just selected, or null for nothing that
// speaks. Here rather than in input.js because selection happens at three call
// sites — tapping a tower, tapping a figure, and finishing a build, which
// selects what it just built — and the mapping should not be written out three
// times.
//
// A giant thug answers with the common thug's line, because there is one enemy
// voice so far. When a heavier one is recorded it becomes a `def` lookup rather
// than a kind check; until then, silence for the giant would read as a bug.
export function selectionCue(sel) {
  if (!sel) return null;
  if (sel.kind === 'enemy') return CUE.thug;
  if (sel.kind === 'unit') return CUE.barracks;
  return familyCue(sel.ref.fam.id);
}
