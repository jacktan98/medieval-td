// Checks the two sound rules against the real src/audio.js. Node only.
//
//   node tools/sound.mjs
//
// The rules are easy to state and easy to get subtly wrong, and both failures
// are hard to hear: a gate that opens too early sounds "a bit busy", one that
// never reopens sounds like the audio broke ten minutes ago and you have been
// playing in silence since. Neither is something you would catch by listening
// once.
//
// So this drives the actual module — no reimplementation, no test hooks in the
// game — by standing a fake AudioContext and a fake fetch in front of it before
// it is imported. Every call the game makes goes through the code that ships.
//
// Durations here are invented (0.5s and 2s), deliberately. The point is the
// arithmetic of the gate, and a test keyed to the real clips would start
// failing the day someone re-records a line half a second longer.

const DUR = {
  'assets/audio/sfx/Arrow_shot.mp3': 0.5,
  'assets/audio/voice/Thug_1.mp3': 2
};
const DEFAULT_DUR = 0.5;

// Must match src/audio.js, for the ducking checks.
const BG_LEVEL = 0.45;
const BG_DUCKED = 0.15;

// The shape of every fake clip: LEAD seconds of silence, then a tone at AMP.
// The module should skip the silence and level the tone to TARGET_LOUD.
const LEAD = 0.1;
const AMP = 0.3;
const TARGET_LOUD = 0.09;

// Must match src/audio.js. Duplicated rather than exported because a test that
// imports the number it is checking cannot catch the number changing.
const MEMORY_S = 20;

// --- the fake context -------------------------------------------------------

let played = [];
let routes = [];
let ducks = [];
const gains = [];

const ctx = {
  state: 'running',
  currentTime: 0,
  destination: {},
  resume: () => Promise.resolve(),
  // A real buffer of samples, not a stub, because the module analyses what it
  // loads — loudness, peak, and where the sound starts and stops. A stub with
  // only a duration would make analyse() divide by nothing.
  //
  // The shape is deliberate and the tests below read it back: LEAD seconds of
  // silence, then a constant tone at AMP. That gives a known loudness, a known
  // offset to skip, and a known audible length, so the gate arithmetic can be
  // checked against numbers rather than against whatever the real files happen
  // to contain this week.
  decodeAudioData: path => {
    const duration = DUR[path] ?? DEFAULT_DUR;
    const sampleRate = 1000;
    const n = Math.round(duration * sampleRate);
    const lead = Math.round(LEAD * sampleRate);
    const data = new Float32Array(n);
    for (let i = lead; i < n; i++) data[i] = AMP;
    return Promise.resolve({
      duration, sampleRate, length: n,
      numberOfChannels: 1,
      getChannelData: () => data,
      name: decodeURIComponent(path.split('/').pop().replace('.mp3', ''))
    });
  },
  // Gain nodes are named by creation order, because that is the only thing the
  // module tells us about them: it builds master, then busA, then busB, and
  // every later one is a per-play trim. Naming them is what lets the routing
  // checks below say WHICH bus a clip went out on.
  createGain() {
    const name = ['master', 'busA', 'busB'][gains.length] || 'clip';
    const g = {
      _name: name,
      _out: null,
      gain: {
        value: 0,
        setTargetAtTime: (target, at) => ducks.push({ bus: name, target, at }),
        cancelScheduledValues: () => {}
      },
      connect(t) { g._out = t; return t; }
    };
    gains.push(g);
    return g;
  },
  createBufferSource() {
    // The game sets .buffer, connects through a trim gain to a bus, then starts
    // it. Recording on start rather than on assignment is what makes this a log
    // of sounds HEARD.
    let buf = null, trim = null;
    return {
      set buffer(b) { buf = b; },
      get buffer() { return buf; },
      connect(t) { trim = t; return t; },
      start: (when, offset) => {
        played.push(buf.name);
        routes.push({
          name: buf.name,
          bus: trim && trim._out && trim._out._name,
          offset: +Number(offset).toFixed(3),
          gain: +Number(trim.gain.value).toFixed(3)
        });
      }
    };
  }
};

globalThis.AudioContext = function () { return ctx; };
globalThis.fetch = path => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(path) });

const { loadAudio, play, solo, CUE, SHOT, ATTACK, selectionCue, familyCue } =
  await import('../src/audio.js');

// Load with console.info muted. The module reports anything it had to move a
// long way, which is useful in a browser and pure noise here — every fake clip
// is identical by construction, so it would print the same line fourteen times
// above the results. Silenced rather than skipped so the reporting still runs.
const info = console.info;
console.info = () => {};
await loadAudio();
console.info = info;

// --- helpers ----------------------------------------------------------------

let bad = 0;

function check(label, got, want) {
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${got} (want ${want})`);
}

// Run something at a given moment on the context clock and report how many
// sounds it produced.
function at(t, fn) {
  ctx.currentTime = t;
  played = [];
  fn();
  return played.length;
}

// --- Levelling and the dead air at the front --------------------------------

console.log('\nEvery clip is measured and levelled at load');

routes = [];
at(0, () => solo(CUE.thug));
check('playback skips the silent lead-in', routes[0] && routes[0].offset, LEAD);
check('and the tone is levelled to the target', routes[0] && routes[0].gain, +(TARGET_LOUD / AMP).toFixed(3));

// --- Category A: one at a time, then a second of quiet -----------------------

console.log('\nCategory A — one channel, then a second of quiet');

// The fake Thug_1 is 2s long with 0.1s of that silent, so it is AUDIBLE for
// 1.9s and holds the channel until 1.9 + 1 = 2.9. Holding it for the full 2s
// would be a tenth of a second spent saying nothing.
check('a cue plays when the channel is free', at(30, () => solo(CUE.thug)), 1);
check('another is dropped while it sounds', at(31.5, () => solo(CUE.barracks)), 0);
check('still dropped in the second of quiet after', at(32.5, () => solo(CUE.barracks)), 0);
check('and dropped right up to the last moment', at(32.89, () => solo(CUE.barracks)), 0);
check('plays again once the rest is over', at(32.91, () => solo(CUE.barracks)), 1);

// Everything in the category shares ONE channel — a soldier's swing is held off
// by a thug's line, not just by another swing. This is the rule that keeps a
// busy fight from stacking, so it is worth pinning down separately.
ctx.currentTime = 100;
played = [];
solo(CUE.thug);                                    // 2s clip, holds until 103
check('a swing is held off by an unrelated line', at(101, () => solo(CUE.arrowKill)), 0);
check('a death is held off by it too', at(102, () => solo(CUE.soldierDeath)), 0);

// Nine things happening at once is the case this all exists for.
ctx.currentTime = 200;
played = [];
for (let i = 0; i < 9; i++) solo(CUE.arrowKill);
check('nine at the same instant come out as one', played.length, 1);

// --- Category B: every time ---------------------------------------------------

console.log('\nCategory B — every time it happens');

ctx.currentTime = 300;
played = [];
play(SHOT); play(SHOT); play(SHOT);
check('three shots on the same millisecond de-dupe', played.length, 1);

check('a shot 100ms later still sounds', at(300.1, () => play(SHOT)), 1);

// The one that matters: Category B must be deaf to the Category A gate.
ctx.currentTime = 400;
played = [];
solo(CUE.thug);                                    // holds A until 403
check('an arrow is not silenced by a held channel', at(401, () => play(SHOT)), 1);

// ...and must not close it either.
check('and firing does not close the A channel', at(403.5, () => solo(CUE.barracks)), 1);

// --- Category B is background, and gets out of the way -----------------------

console.log('\nCategory B is background');

// Routing is the whole mechanism: everything in Category B has to leave through
// busB, or the duck moves a bus with nothing on it and the mix never changes.
routes = [];
ctx.currentTime = 500;
play(SHOT);
play(ATTACK);
check('the shot goes out on the background bus', routes[0] && routes[0].bus, 'busB');
check('a sword swing does too', routes[1] && routes[1].bus, 'busB');

routes = [];
at(510, () => solo(CUE.arrowKill));
check('a Category A clip goes out on its own bus', routes[0] && routes[0].bus, 'busA');

// The duck itself: down when a Category A clip starts, back up when it ends.
// Thug_1 is 2s in this fake, so the return is scheduled for 2s later.
ducks = [];
at(520, () => solo(CUE.thug));
check('the background is pulled down', ducks[0] && ducks[0].target, BG_DUCKED);
check('on the background bus', ducks[0] && ducks[0].bus, 'busB');
check('and let back up afterwards', ducks[1] && ducks[1].target, BG_LEVEL);
// 520 + 1.9 audible seconds, not 520 + the clip's 2s length.
check('exactly when the clip stops sounding', ducks[1] && ducks[1].at, 521.9);

// A Category B sound that is passed over for de-duping must not duck anything —
// only Category A moves the bus.
ducks = [];
at(530, () => { play(SHOT); play(ATTACK); });
check('the battle never ducks itself', ducks.length, 0);

// Three takes of a sword, and no two in a row. Category B has none of the
// Category A share rules, but an identical clip forty times a wave is the same
// machine-gun problem.
const swings = [];
for (let i = 0; i < 200; i++) {
  played = [];
  ctx.currentTime = 600 + i;
  play(ATTACK);
  swings.push(...played);
}
check('200 swings all played', swings.length, 200);
check('every take came up', new Set(swings).size, ATTACK.length);
check('no two swings in a row matched', swings.some((k, i) => i && k === swings[i - 1]), false);

// --- Picking between variants -------------------------------------------------

console.log('\nVariants, and never the same clip twice running');

// Ask for the same cue 300 times over, stepping the clock past the gate each
// time. Every take must appear, and no two neighbours may match.
//
// Read the cue's own length rather than writing a number here: takes get added
// — the barracks went from three to five — and a test that has to be edited
// every time one lands is a test that gets edited without being thought about.
let log = [];
for (let i = 0; i < 300; i++) {
  ctx.currentTime = 5000 + i * 3;
  played = [];
  solo(CUE.barracks);
  log.push(...played);
}
check('300 asks of a multi-take cue all played', log.length, 300);
check('every take came up', new Set(log).size, CUE.barracks.length);
check('no two in a row were the same', log.some((k, i) => i && k === log[i - 1]), false);

// With five takes the share rule can no longer talk the cue into silence at
// all: jamming needs every take but the last to be at its limit of two, which
// is eight plays inside a memory of five. Worth pinning, because it means the
// relaxation below is now only reachable by the three-take cues.
const spread = {};
for (const k of log) spread[k] = (spread[k] || 0) + 1;
check('and no take was starved', Math.min(...Object.values(spread)) > 300 / CUE.barracks.length / 2, true);

// A cue with only ONE file cannot alternate, so it must fall silent instead of
// repeating. That is the common case now rather than a corner: an arrow kill, a
// melee kill and a soldier dying are one clip each.
console.log('\nA one-clip cue cannot repeat itself');
ctx.currentTime = 6000;
played = [];
solo(CUE.arrowKill);
check('it plays when nothing precedes it', played.length, 1);
check('the very next ask is passed over', at(6002, () => solo(CUE.arrowKill)), 0);
check('and so is the one after that', at(6004, () => solo(CUE.arrowKill)), 0);

// ...but being passed over must not close the channel. This is what "give
// priority to other sound" actually means: it yields its slot rather than
// spending it.
check('a different cue takes the slot instead', at(6006, () => solo(CUE.meleeKill)), 1);
check('and now the first may go again', at(6009, () => solo(CUE.arrowKill)), 1);

// The memory has to expire, or a stretch where one thing keeps happening plays
// it once and then nothing for the rest of the game.
console.log('\nThe memory expires');
ctx.currentTime = 7000;
played = [];
solo(CUE.arrowKill);
check('blocked while it is still remembered', at(7000 + MEMORY_S - 1, () => solo(CUE.arrowKill)), 0);
check('allowed once it has been forgotten', at(7000 + MEMORY_S + 1, () => solo(CUE.arrowKill)), 1);

// --- No more than twice in five ---------------------------------------------

console.log('\nNever more than twice in the last five');

// Drive a realistic busy fight: swings asking constantly, with a kill and a
// death mixed in, and check no clip takes more than two of any five.
// The clock jump past MEMORY_S is the reset — the module has no test hook and
// should not grow one.
ctx.currentTime = 8000;
log = [];
for (let i = 0; i < 200; i++) {
  ctx.currentTime = 8000 + i * 2;
  played = [];
  solo(CUE.arrowKill);           // asks every time — the dominant one
  if (i % 3 === 0) solo(CUE.meleeKill);
  if (i % 7 === 0) solo(CUE.barracks);
  log.push(...played);
}

let overrun = 0;
for (let i = 4; i < log.length; i++) {
  const five = log.slice(i - 4, i + 1);
  for (const k of new Set(five)) {
    if (five.filter(x => x === k).length > 2) overrun++;
  }
}
check('no clip exceeds 2 of any 5 heard', overrun, 0);

const share = {};
for (const k of log) share[k] = (share[k] || 0) + 1;
const topShare = (share['Arrow_kill_enemy'] || 0) / log.length;
check('the most frequent is capped at 2/5 of the mix', topShare <= 0.4, true);
console.log(`        (it took ${(topShare * 100).toFixed(0)}% of ${log.length} plays: ` +
  Object.entries(share).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') + ')');

// --- What the player tapped maps to what they hear ---------------------------

console.log('\nSelection');

check('an archery tower answers',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'archery' } } }), CUE.archery);
check('a barracks answers',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'barracks' } } }), CUE.barracks);
check('a barracks man answers', selectionCue({ kind: 'unit', ref: {} }), CUE.barracks);
check('an enemy answers', selectionCue({ kind: 'enemy', ref: {} }), CUE.thug);
check('bare ground says nothing', selectionCue(null), null);
check('an artillery tower answers', familyCue('siege'), CUE.artillery);
// The monastery is the last family with nothing recorded, and this is the check
// that a family with no voice returns null rather than crashing a lookup — it
// used to be siege's job and siege has lines now.
check('a family with no voice says nothing', familyCue('monastery'), null);

// A cue with nothing loaded must not close the channel on everything else.
//
// The clock only ever goes FORWARD from here, and the 300-pick loop above left
// it at 3490 — an earlier timestamp would find the gate shut for a perfectly
// good reason and read as a failure of something else entirely.
console.log('\nMissing files');
ctx.currentTime = 9000;
played = [];
solo(['not_a_real_clip']);
check('an unloaded cue plays nothing', played.length, 0);
// Same instant on purpose: the question is whether the failed cue shut the gate.
check('and leaves the channel open', at(9000, () => solo(CUE.arrowKill)), 1);

// A suspended context — a phone that has locked — must swallow everything
// rather than throw, and must not advance the gate while it is out.
console.log('\nSuspended');
ctx.state = 'suspended';
check('nothing plays while suspended', at(9100, () => { solo(CUE.thug); play(SHOT); }), 0);
ctx.state = 'running';
check('and it all comes back when it resumes', at(9101, () => solo(CUE.thug)), 1);

console.log(bad ? `\n${bad} sound rule(s) broken.` : '\nBoth sound rules hold.');
process.exit(bad ? 1 : 0);
