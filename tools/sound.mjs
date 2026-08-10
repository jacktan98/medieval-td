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

// Must match src/audio.js. Duplicated rather than exported because a test that
// imports the number it is checking cannot catch the number changing.
const MEMORY_S = 20;

// --- the fake context -------------------------------------------------------

let played = [];

const node = () => ({ connect: t => t, start() {} });

const ctx = {
  state: 'running',
  currentTime: 0,
  destination: {},
  resume: () => Promise.resolve(),
  // The fake buffer carries its own filename, so the log below says WHICH clip
  // was heard. Counting alone cannot see a cue playing its first take five
  // times running, which is the whole thing under test here.
  decodeAudioData: path => Promise.resolve({
    duration: DUR[path] ?? DEFAULT_DUR,
    name: decodeURIComponent(path.split('/').pop().replace('.mp3', ''))
  }),
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
      start: () => played.push(buf.name)
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

console.log('\nVariants, and never the same clip twice running');

// Ask for the same cue 300 times over, stepping the clock past the gate each
// time. All three takes must appear, and no two neighbours may match.
let log = [];
for (let i = 0; i < 300; i++) {
  ctx.currentTime = 5000 + i * 3;
  played = [];
  solo(CUE.barracks);
  log.push(...played);
}
check('300 asks of a 3-take cue all played', log.length, 300);
check('all three takes came up', new Set(log).size, 3);
check('no two in a row were the same', log.some((k, i) => i && k === log[i - 1]), false);

// A cue with only ONE file cannot alternate, so it must fall silent instead of
// repeating. This is the case that made the whole change necessary: a soldier
// swinging is one clip asking over and over.
console.log('\nA one-clip cue cannot repeat itself');
ctx.currentTime = 6000;
played = [];
solo(CUE.soldierSwing);
check('the swing plays when nothing precedes it', played.length, 1);
check('the very next swing is passed over', at(6002, () => solo(CUE.soldierSwing)), 0);
check('and so is the one after that', at(6004, () => solo(CUE.soldierSwing)), 0);

// ...but being passed over must not close the channel. This is what "give
// priority to other sound" actually means: the swing yields its slot rather
// than spending it.
check('something else takes the slot instead', at(6006, () => solo(CUE.arrowKill)), 1);
check('and now the swing may go again', at(6009, () => solo(CUE.soldierSwing)), 1);

// The memory has to expire, or a fight with nothing but swings in it plays one
// swing and then nothing for the rest of the game.
console.log('\nThe memory expires');
ctx.currentTime = 7000;
played = [];
solo(CUE.soldierSwing);
check('blocked while it is still remembered', at(7000 + MEMORY_S - 1, () => solo(CUE.soldierSwing)), 0);
check('allowed once it has been forgotten', at(7000 + MEMORY_S + 1, () => solo(CUE.soldierSwing)), 1);

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
  solo(CUE.soldierSwing);           // asks every time — the dominant one
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
const swingShare = (share['Soldier_attack'] || 0) / log.length;
check('the swing is capped at 2/5 of the mix', swingShare <= 0.4, true);
console.log(`        (swing took ${(swingShare * 100).toFixed(0)}% of ${log.length} plays: ` +
  Object.entries(share).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') + ')');

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
ctx.currentTime = 9000;
played = [];
solo(['not_a_real_clip']);
check('an unloaded cue plays nothing', played.length, 0);
// Same instant on purpose: the question is whether the failed cue shut the gate.
check('and leaves the channel open', at(9000, () => solo(CUE.soldierSwing)), 1);

// A suspended context — a phone that has locked — must swallow everything
// rather than throw, and must not advance the gate while it is out.
console.log('\nSuspended');
ctx.state = 'suspended';
check('nothing plays while suspended', at(9100, () => { solo(CUE.thug); play(SHOT); }), 0);
ctx.state = 'running';
check('and it all comes back when it resumes', at(9101, () => solo(CUE.thug)), 1);

console.log(bad ? `\n${bad} sound rule(s) broken.` : '\nBoth sound rules hold.');
process.exit(bad ? 1 : 0);
