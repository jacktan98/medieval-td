// Sound. The big game's two rules, kept, and a third thing it does not have.
//
//   play(cue)    Category B — every time, however many at once.
//   solo(cue)    Category A — one at a time, then a moment of quiet.
//   music()      the party, underneath all of it.
//
// WHY THIS IS NOT `../../src/audio.js`. That file is the same design and a much
// better implementation of it, and it cannot be used here for one dull reason:
// every path in it is relative to the page, and this page is one folder down. It
// would load fifteen files from `birthday/assets/audio/` and find none of them.
// Everything else about it — the shared channel, the ducking bus, the measured
// levelling — is worth having, so it is here in short form. If a rule below
// disagrees with the big game's, the big game's is the considered one.
//
// --- the two categories, in this game --------------------------------------
//
// CATEGORY A is the four of them speaking: a line when they are built or
// upgraded or tapped, and a line when they finish a thug off. One channel for
// all of it, so four people fighting at once do not talk over each other.
//
// CATEGORY B is the fighting itself — Papa's swords, Mommy's gun, Ella's throw,
// Rei's smell, and a thug landing a blow. Every one of those is a thing on
// screen, so every one of them makes its noise.
//
// --- and the music -----------------------------------------------------------
//
// Three songs, one at a time, chosen at random and never the same one twice
// running. It plays through a plain <audio> element rather than the graph above,
// which is the right tool for the job: a four-minute song decoded into a buffer
// is forty megabytes of float per channel, and nothing here needs a song to
// start with sub-millisecond accuracy.
//
// It is mixed WELL under everything, because the artist asked for it: the voices
// and the fighting are what the game is saying, and the songs are what the room
// sounds like.
//
// --- importable in Node ------------------------------------------------------
//
// birthday/tools/sim.mjs runs the real rules headless and they call in here, so
// nothing at module level may touch a browser API. Every entry point returns
// quietly when there is no context, and in Node there never is one.

// --- the mix -------------------------------------------------------------------

const MASTER = 0.9;

// Where the fighting sits under the voices, and where it drops to while one is
// speaking. Straight from the big game, which explains the two numbers at
// length; the short version is 7dB under normally and 9dB further while a line
// is in the air.
const BG_LEVEL = 0.45;
const BG_DUCKED = 0.15;
const DUCK_IN = 0.04;
const DUCK_OUT = 0.25;

// How loud the party is. Low, and lower than anything in the big game, because
// this is the one sound in the mix that is not telling the player anything.
const MUSIC_LEVEL = 0.18;

// The quiet after a Category A line, and the shortest gap between two plays of
// the same Category B clip. The second is not a throttle: two identical buffers
// starting on the same millisecond add into one loud click rather than sounding
// like two events.
const GAP = 0.9;
const SAME_CLIP_GAP = 0.04;

// --- levelling, measured rather than declared ----------------------------------
//
// The same mechanism as the big game's and for the same reason: these clips are
// home recordings made on different days, they arrive tens of decibels apart,
// and a hand-written table of trims would be silently wrong the first time one
// was re-recorded. Every clip is analysed once at load and given the gain that
// brings it to a common loudness, and `report()` says what had to move.
const TARGET_LOUD = 0.09;
const LOUD_WINDOW = 0.3;
const GAIN_MIN = 0.1;
const GAIN_MAX = 5;
const FLOOR = 0.01;

// Category A share rules: never the same clip twice running, never more than
// twice in the last five, and the memory is wiped by silence rather than by age.
const MEMORY_N = 5;
const MAX_REPEATS = 2;
const MEMORY_S = 20;

// --- the files -------------------------------------------------------------------
//
// SPACES ARE ENCODED, NOT RENAMED. Three of these are songs with the artist's
// names on them, and the artist's filename is the artist's filename — %20 costs
// nothing and a rename is a thing to remember.
const DIR = 'assets/family/';

const paths = {
  // Category A. Two lines each for three of them and ONE for Rei, which is not
  // an omission — he is a baby, he has one noise, and the share rules below
  // handle a single-take cue without a special case: it simply comes up less
  // often than a pair does.
  papa_1: `${DIR}Papa_1.mp3`,
  papa_2: `${DIR}Papa_2.mp3`,
  mommy_1: `${DIR}Mommy_1.mp3`,
  mommy_2: `${DIR}Mommy_2.mp3`,
  ella_1: `${DIR}Ella_1.mp3`,
  ella_2: `${DIR}Ella_2.mp3`,
  rei_1: `${DIR}Rei_1.mp3`,

  // Category A, and the second half of the same idea: what they say when they
  // are the one who finishes a thug off. THREE, not four. Rei has none, and that
  // is deliberate rather than missing — he never means to kill anybody.
  papa_kill: `${DIR}Papa_kill_enemy.mp3`,
  mommy_kill: `${DIR}Mommy_kill_enemy.mp3`,
  ella_kill: `${DIR}Ella_kill_enemy.mp3`,

  // Category B. The fighting: two swords, a shotgun, a slime leaving a hand, a
  // smell arriving, and a thug's fist landing.
  papa_attack: `${DIR}Papa_attack.mp3`,
  mommy_attack: `${DIR}Mommy_attack.mp3`,
  ella_attack: `${DIR}Ella_attack.mp3`,
  rei_attack: `${DIR}Rei_attack.mp3`,
  enemy_attack: `${DIR}Enemy_attack.mp3`
};

// The party. Not in `paths` above and not decoded — see the note at the top.
const SONGS = [
  `${DIR}Britney%20Spears%20-%20Circus.mp3`,
  `${DIR}Nicki%20Minaj%20-%20The%20Night%20Is%20Still%20Young.mp3`,
  `${DIR}Ryan%20Tedder%20-%20Rocketeer.mp3`
];

// --- the cues ---------------------------------------------------------------------
//
// A cue is a LIST of interchangeable takes and the game asks for the list, so
// two Papas built in a row are two different lines.

// Category A, keyed by the member's id — what they say when they arrive, are
// upgraded, or are tapped.
const VOICE = {
  papa: ['papa_1', 'papa_2'],
  mommy: ['mommy_1', 'mommy_2'],
  ella: ['ella_1', 'ella_2'],
  rei: ['rei_1']
};

// Category A, keyed the same way — what they say over a thug they just finished.
// REI IS ABSENT, and `killCue` returning null is how that is expressed: solo()
// already does nothing with a null cue, so there is no branch anywhere else.
const KILL = {
  papa: ['papa_kill'],
  mommy: ['mommy_kill'],
  ella: ['ella_kill']
};

// Category B, keyed the same way again.
const BLOW = {
  papa: ['papa_attack'],
  mommy: ['mommy_attack'],
  ella: ['ella_attack'],
  rei: ['rei_attack']
};

export const ENEMY_BLOW = ['enemy_attack'];

export const voiceCue = id => VOICE[id] || null;
export const killCue = id => KILL[id] || null;
export const blowCue = id => BLOW[id] || null;

// --- the graph ---------------------------------------------------------------------

let ctx = null;
let master = null;
let busA = null;
let busB = null;

const clips = {};

let gateUntil = 0;
let heard = [];
const lastStart = {};
const lastB = new WeakMap();

let song = null;      // the <audio> element currently playing
let songIndex = -1;

// Kick off loading. Not awaited by main.js, on purpose: the game is playable in
// silence and a megabyte of mp3 should never be why somebody is looking at a
// blank screen. Clips light up as they arrive.
export function loadAudio() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return Promise.resolve();

  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = MASTER;
  master.connect(ctx.destination);

  busA = ctx.createGain();
  busA.connect(master);

  busB = ctx.createGain();
  busB.gain.value = BG_LEVEL;
  busB.connect(master);

  const jobs = Object.entries(paths).map(([key, src]) =>
    fetch(src)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then(data => ctx.decodeAudioData(data))
      .then(buf => { clips[key] = analyse(buf); })
      .catch(() => console.warn('Birthday: missing or unreadable audio', src))
  );

  return Promise.all(jobs).then(report);
}

// Everything the mix needs to know about a clip, worked out from the audio
// itself: how loud it is, and where in the file the sound actually starts.
function analyse(buf) {
  const n = buf.length;
  const mix = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) mix[i] += d[i] / buf.numberOfChannels;
  }

  // Loudest window, as a running sum — the naive version is O(n * window) and
  // would take a bite out of startup.
  const w = Math.min(n, Math.max(1, Math.round(buf.sampleRate * LOUD_WINDOW)));
  let run = 0;
  for (let i = 0; i < w; i++) run += mix[i] * mix[i];
  let best = run;
  for (let i = w; i < n; i++) {
    run += mix[i] * mix[i] - mix[i - w] * mix[i - w];
    if (run > best) best = run;
  }
  const loud = Math.sqrt(best / w);

  let head = 0;
  while (head < n && Math.abs(mix[head]) < FLOOR) head++;
  let tail = n - 1;
  while (tail > head && Math.abs(mix[tail]) < FLOOR) tail--;

  const silent = head >= n || loud <= 0;

  return {
    buf,
    gain: silent ? 1 : Math.min(GAIN_MAX, Math.max(GAIN_MIN, TARGET_LOUD / loud)),
    // Playback starts here, past the dead air at the front. This is the whole
    // fix for a swing that lands a quarter of a second after the blow: it is
    // real time removed from the sound, not a delay compensated for elsewhere.
    offset: silent ? 0 : head / buf.sampleRate,
    audible: silent ? buf.duration : (tail - head + 1) / buf.sampleRate
  };
}

// A short note about anything the analysis had to move a long way. A console
// that prints on every load is a console nobody reads, so this only speaks up
// when a file could be better.
function report() {
  const notes = [];
  for (const [key, c] of Object.entries(clips)) {
    const bits = [];
    const db = 20 * Math.log10(c.gain);
    if (Math.abs(db) > 3) bits.push(`${db > 0 ? '+' : ''}${db.toFixed(1)}dB`);
    if (c.offset > 0.05) bits.push(`skipped ${Math.round(c.offset * 1000)}ms of silence`);
    if (bits.length) notes.push(`${key} ${bits.join(', ')}`);
  }
  if (notes.length) console.info('Birthday audio levelled:', notes.join(' | '));
}

// Let sound out, and start the party if it is not going. Must be called from
// inside a real touch or click handler — phones ignore audio that starts on its
// own, and a context resumed anywhere else stays suspended without saying so.
//
// input.js calls this on EVERY tap, which is not redundant: a phone locking, a
// call arriving or a tab going to the background all suspend the context again.
export function unlock() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  if (!song) nextSong();
}

// --- the party ----------------------------------------------------------------------
//
// One song at a time, never the same one twice running, and the next one starts
// when this one ends. There is no fading and no crossfade: three songs and a
// birthday do not need a mixing desk.
function nextSong() {
  if (typeof Audio === 'undefined') return;

  let i = (Math.random() * SONGS.length) | 0;
  if (SONGS.length > 1 && i === songIndex) i = (i + 1) % SONGS.length;
  songIndex = i;

  song = new Audio(SONGS[i]);
  song.volume = MUSIC_LEVEL;
  song.addEventListener('ended', nextSong);
  // A song that will not play is not worth reporting twice: the catch keeps the
  // promise rejection off the console, and the next tap tries again.
  song.play().catch(() => { song = null; });
}

// NOTHING STOPS THE MUSIC, on purpose. Quitting to the map picker, restarting and
// finishing a map all keep the same song going — it is the room this game is
// played in rather than part of any one map, and cutting it at every screen
// change would make the party feel like a menu.

// --- playing ---------------------------------------------------------------------

// The big game keeps a handle on the line currently in the air so that buying an
// upgrade can cut it off. Nothing here needs to: with one channel, four speakers
// and a 0.9s gate, a line that is dropped is a line one of them did not get to
// say, and in a game this size that is not worth a mechanism.
function fire(key, bus) {
  const c = clips[key];
  const src = ctx.createBufferSource();
  src.buffer = c.buf;

  const g = ctx.createGain();
  g.gain.value = c.gain;

  src.connect(g).connect(bus);
  // Second argument is WHERE IN THE CLIP to begin. Starting past the dead air is
  // what makes a hit sound land on the hit.
  src.start(0, c.offset);
  return c.audible;
}

// Get the fighting out of the way for the length of a line, then let it back up.
// Scheduled on the audio clock rather than driven by a timer, so it keeps its
// timing whatever the frame rate is doing.
function duck(now, seconds) {
  const g = busB.gain;
  if (g.cancelScheduledValues) g.cancelScheduledValues(now);
  g.setTargetAtTime(BG_DUCKED, now, DUCK_IN);
  g.setTargetAtTime(BG_LEVEL, now + seconds, DUCK_OUT);
}

// Category B. Every time it happens, however many at once.
export function play(cue) {
  if (!cue || !ctx || ctx.state !== 'running') return;

  const ready = cue.filter(key => clips[key]);
  if (!ready.length) return;

  const prev = lastB.get(cue);
  const choices = ready.length > 1 ? ready.filter(key => key !== prev) : ready;
  const key = choices[(Math.random() * choices.length) | 0];

  const now = ctx.currentTime;
  if (now - (lastStart[key] ?? -Infinity) < SAME_CLIP_GAP) return;
  lastStart[key] = now;
  lastB.set(cue, key);

  fire(key, busB);
}

// Category A. One at a time, then a moment of quiet — and never the same clip
// twice running, nor more than twice in the last five.
//
// Note the order of the exits: the gate is only touched once a clip has actually
// been chosen and started, so a cue that is passed over leaves the channel open
// for whatever asks next. That is the whole mechanism by which a swing yields to
// a death cry.
export function solo(cue) {
  if (!cue || !ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  if (now < gateUntil) return;

  // Silence clears the slate; otherwise the last five stand however old they
  // are. A busy fight never forgets and a lull forgets everything at once.
  if (heard.length && now - heard[heard.length - 1].t >= MEMORY_S) heard = [];

  const last = heard.length ? heard[heard.length - 1].key : null;
  const times = key => heard.reduce((n, h) => n + (h.key === key ? 1 : 0), 0);

  const ready = cue.filter(key => clips[key]);
  let eligible = ready.filter(key => key !== last && times(key) < MAX_REPEATS);

  // A cue with alternatives must never talk itself into silence: five remembered
  // plays of two takes can put both at their limit, and with the share rule held
  // absolute Papa would then say nothing at all until something aged out. So a
  // cue that HAS alternatives relaxes to "not the one just heard".
  //
  // A single-take cue — Rei's — gets no such relief, and that asymmetry is the
  // point: with nothing to rotate to, the share rule is the only thing standing
  // between one clip and the whole soundtrack.
  if (!eligible.length && ready.length > 1) eligible = ready.filter(key => key !== last);
  if (!eligible.length) return;

  const key = eligible[(Math.random() * eligible.length) | 0];

  heard.push({ key, t: now });
  if (heard.length > MEMORY_N) heard.shift();

  const seconds = fire(key, busA);
  duck(now, seconds);
  gateUntil = now + seconds + GAP;
}
