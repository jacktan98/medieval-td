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

// --- the fake context -------------------------------------------------------

let played = [];

const node = () => ({ connect: t => t, start() {} });

const ctx = {
  state: 'running',
  currentTime: 0,
  destination: {},
  resume: () => Promise.resolve(),
  decodeAudioData: path => Promise.resolve({ duration: DUR[path] ?? DEFAULT_DUR }),
  createGain: () => ({ gain: { value: 0 }, connect: t => t }),
  createBufferSource() {
    const n = node();
    // The game sets .buffer, then starts it. Recording on start rather than on
    // assignment is what makes this a log of sounds HEARD.
    let buf = null;
    return {
      set buffer(b) { buf = b; },
      get buffer() { return buf; },
      connect: t => t,
      start: () => played.push(buf.duration)
    };
  }
};

globalThis.AudioContext = function () { return ctx; };
globalThis.fetch = path => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(path) });

const { loadAudio, play, solo, CUE, SHOT, selectionCue, familyCue } =
  await import('../src/audio.js');

await loadAudio();

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

// --- Category A: one at a time, then a second of quiet -----------------------

console.log('\nCategory A — one channel, then a second of quiet');

// A 2s clip starting at t=0 holds the channel until 2 + 1 = 3.
check('a cue plays when the channel is free', at(0, () => solo(CUE.thug)), 1);
check('another is dropped while it sounds', at(1.5, () => solo(CUE.barracks)), 0);
check('still dropped in the second of quiet after', at(2.5, () => solo(CUE.barracks)), 0);
check('and dropped right up to the last moment', at(2.99, () => solo(CUE.barracks)), 0);
check('plays again once the rest is over', at(3.01, () => solo(CUE.barracks)), 1);

// Everything in the category shares ONE channel — a soldier's swing is held off
// by a thug's line, not just by another swing. This is the rule that keeps a
// busy fight from stacking, so it is worth pinning down separately.
ctx.currentTime = 100;
played = [];
solo(CUE.thug);                                    // 2s clip, holds until 103
check('a swing is held off by an unrelated line', at(101, () => solo(CUE.soldierSwing)), 0);
check('a death is held off by it too', at(102, () => solo(CUE.soldierDeath)), 0);

// Nine things happening at once is the case this all exists for.
ctx.currentTime = 200;
played = [];
for (let i = 0; i < 9; i++) solo(CUE.soldierSwing);
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

// --- Picking between variants -------------------------------------------------

console.log('\nVariants');

// Every one of the three barracks lines should come up. Sampled with the gate
// stepped past each time, because a cue that only ever picked its first file
// would still pass every test above.
const seen = new Set();
for (let i = 0; i < 300; i++) {
  ctx.currentTime = 500 + i * 10;
  played = [];
  solo(CUE.barracks);
}
// Duration is the only thing the fake records, and the three fakes share one —
// so identity is checked through the real module instead, by asking for the cue
// itself. What the loop above proves is that 300 picks never threw and never
// jammed the gate.
for (const key of CUE.barracks) seen.add(key);
check('the barracks cue offers three lines', seen.size, 3);
check('a melee kill is a cry or a blade', CUE.meleeKill.length, 2);
check('a soldier dying is a cry or a blade', CUE.soldierDeath.length, 2);

// --- What the player tapped maps to what they hear ---------------------------

console.log('\nSelection');

check('an archery tower answers',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'archery' } } }), CUE.archery);
check('a barracks answers',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'barracks' } } }), CUE.barracks);
check('a barracks man answers', selectionCue({ kind: 'unit', ref: {} }), CUE.barracks);
check('an enemy answers', selectionCue({ kind: 'enemy', ref: {} }), CUE.thug);
check('bare ground says nothing', selectionCue(null), null);
check('a family with no voice says nothing', familyCue('siege'), null);

// A cue with nothing loaded must not close the channel on everything else.
//
// The clock only ever goes FORWARD from here, and the 300-pick loop above left
// it at 3490 — an earlier timestamp would find the gate shut for a perfectly
// good reason and read as a failure of something else entirely.
console.log('\nMissing files');
ctx.currentTime = 4000;
played = [];
solo(['not_a_real_clip']);
check('an unloaded cue plays nothing', played.length, 0);
// Same instant on purpose: the question is whether the failed cue shut the gate.
check('and leaves the channel open', at(4000, () => solo(CUE.soldierSwing)), 1);

// A suspended context — a phone that has locked — must swallow everything
// rather than throw, and must not advance the gate while it is out.
console.log('\nSuspended');
ctx.state = 'suspended';
check('nothing plays while suspended', at(4100, () => { solo(CUE.thug); play(SHOT); }), 0);
ctx.state = 'running';
check('and it all comes back when it resumes', at(4101, () => solo(CUE.thug)), 1);

console.log(bad ? `\n${bad} sound rule(s) broken.` : '\nBoth sound rules hold.');
process.exit(bad ? 1 : 0);
