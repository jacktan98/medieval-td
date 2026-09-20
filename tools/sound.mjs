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
  'assets/audio/sfx/Select_Sound.mp3': 0.5,
  'assets/audio/voice/Thug_1.mp3': 2,
  // The three summary clips, at roughly their real lengths — the point of the
  // block that uses them is that a 2s fanfare does NOT gate a chime 0.55s later,
  // and a 0.5s stand-in would not have been long enough to prove it.
  'assets/audio/sfx/Victory_sound.mp3': 2,
  'assets/audio/sfx/Lost_sound.mp3': 2,
  'assets/audio/sfx/Star_sound.mp3': 2
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
// Sources stopped early, and the fades that go with them. Only the priority cut
// in solo() produces either — everything else in the game lets a clip finish.
let stops = [];
let fades = [];
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
        cancelScheduledValues: () => {},
        // Used by the priority cut in solo(): a clip being taken off the channel
        // is faded rather than stopped dead, because a buffer stopped mid-sample
        // is a click. Recorded so the check below can see the fade happen.
        setValueAtTime: () => {},
        linearRampToValueAtTime: (target, at) => fades.push({ bus: name, target, at })
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
      },
      // A real BufferSource has one, and the priority cut calls it. Without it
      // the cut would throw into solo()'s catch and the interruption would look
      // like it worked while nothing was actually stopped.
      stop: at => stops.push({ name: buf.name, at })
    };
  }
};

globalThis.AudioContext = function () { return ctx; };
globalThis.fetch = path => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(path) });

const { loadAudio, play, solo, fanfare, CUE, SHOT, ATTACK, PALADIN, SELECT,
        DEADEYE, HOLY_LIGHT, HEAVY_STRIKE, VICTORY, LOST, STAR,
        selectionCue, familyCue, blowCue, abilityCue, GAIN, CLIPS } = await import('../src/audio.js');
// The two ladders with a tier 4 on them, for the voice and blow checks below.
// Imported here rather than at the top because everything above has to run after
// the fake AudioContext is in place, and this file keeps its imports in one order
// for that reason.
const { archery, barracks, siege, monastery, garrisonUnits } = await import('../src/data/towers.js');
const { ABILITIES, abilityById } = await import('../src/data/abilities.js');
// The two tables that turn an ammunition's "I make a noise" flag into an actual
// clip. Imported for the block at the end of this file — see the note there for
// why a missing row is invisible without it.
const { FIRING } = await import('../src/audio.js');
const { LANDING } = await import('../src/projectiles.js');
const { enemyTypes } = await import('../src/data/waves.js');

// THE MUSKETEER POST, BY NAME. It was archery[3] until the owner swapped the
// order of the ladder's two fourth rungs, and an index into a FORKED ladder was
// only ever right by accident.
const POST = archery.find(d => d.name === 'Musketeer Post');

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

// --- the tap click ------------------------------------------------------------
//
// The UI's one sound, and it is Category B for a reason that has nothing to do
// with the battle: it answers the player's FINGER. A reply that is sometimes
// dropped is worse than no reply at all — a button whose click depends on
// whether a thug happens to be shouting reads as a button that sometimes misses
// the tap.

console.log('\nThe tap click');

ctx.currentTime = 240;
played = [];
solo(CUE.thug);                                    // holds the voice channel
check('a click sounds while a voice is speaking', at(241, () => play(SELECT)), 1);
check('and again a moment later', at(241.5, () => play(SELECT)), 1);

routes = [];
at(242, () => play(SELECT));
check('on the background bus, not the voice one', routes[0] && routes[0].bus, 'busB');

// It de-dupes on the same millisecond like everything else in the category —
// two pointer events for one tap must not double it.
ctx.currentTime = 243;
played = [];
play(SELECT); play(SELECT);
check('two on the same instant come out as one', played.length, 1);

// --- priority: the one thing that may interrupt --------------------------------
//
// The gate is right about almost everything the game says: a swing, a death, a
// selection are all things the GAME decided to voice, and holding them off is
// the whole point. An upgrade is different — it is the player pressing a button
// and spending gold — so the reply has to arrive or the button feels dead.
//
// The failure it fixes was invisible in a quiet game and constant in a busy one,
// which is exactly when an upgrade is most likely to be bought.
//
// TIMES HERE STAY UNDER 300, deliberately. The gate is a timestamp and the
// sections below start at 300 and count up, so a block that ran the clock past
// them would leave the channel shut for every check that follows — which is
// what happened when this was first written at t=600 and it took six unrelated
// failures with it.

console.log('\nPriority — an upgrade takes the channel');

ctx.currentTime = 210;
played = []; stops = []; fades = [];
solo(CUE.thug);                                    // 2s clip, holds A until 212.9
check('an ordinary cue is still held off', at(211, () => solo(CUE.barracks)), 0);

played = []; stops = []; fades = [];
ctx.currentTime = 211.5;
solo(CUE.archery, true);
check('a priority cue plays anyway', played.length, 1);
check('and it stops what was speaking', stops.length, 1);

// Faded, not cut. A buffer stopped mid-sample is a click, and it is louder than
// the word it interrupted — so the stop is scheduled 60ms out with a ramp to
// zero in front of it.
check('after a fade rather than dead', fades.length, 1);
check('the fade lands where the stop does',
  fades.length && stops.length && Math.abs(fades[0].at - stops[0].at) < 1e-9, true);
check('and it is 60ms long',
  stops.length && +(stops[0].at - 211.5).toFixed(3), 0.06);

// Priority is about WHO GETS THE CHANNEL. It does not buy the right to repeat —
// a single-take cue has nothing to rotate to and still waits its turn.
ctx.currentTime = 220;
played = [];
solo(CUE.thug, true);
check('a priority cue with a free channel just plays', played.length, 1);
ctx.currentTime = 220.5;
played = [];
solo(CUE.thug, true);
check('but it still will not repeat itself', played.length, 0);

// And the gate is reset by the NEW clip rather than left where the old one put
// it: interrupting a 2s line with a half-second one must not hold the channel
// for the two seconds that are no longer being played.
ctx.currentTime = 230;
solo(CUE.thug);                                    // would hold until 232.9
ctx.currentTime = 230.5;
played = [];
solo(CUE.archery, true);                           // 0.4s audible: holds to 231.9
check('the interrupting clip sets the gate itself',
  at(232, () => solo(CUE.barracks)), 1);

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
// THE MOST FREQUENT CLIP, FOUND RATHER THAN NAMED. This read
// `share['Arrow_kill_enemy']` — the clip that happened to top the mix when the
// check was written — and a key that no longer exists comes back undefined, falls
// through the `|| 0`, and makes the check pass on a share of zero. It went stale
// the moment the owner renamed that file to Arrow_kill_unit, and nothing would
// have said so. Asking the log which clip is loudest is the same question and it
// cannot rot.
const topShare = Math.max(0, ...Object.values(share)) / log.length;
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

// AND A MAN WHO BELONGS TO NO BARRACKS SPEAKS FOR HIMSELF. Three of them: stage
// 5's bridge crossbowmen, and the pope and the four paladins standing in Dawnford
// Church. They are placed by a level file rather than mustered by a building, so
// there is no building whose lines could answer for them.
//
// CHECKED THROUGH garrisonUnits rather than against a list typed here, so the
// next figure a level stands on a board is covered the day it is added — and the
// failure this replaces is silence you have to listen for: a missing `voice` does
// not throw, it just falls through to the barracks' five and sounds plausible.
for (const [name, want] of [['Crossbowman', 'crossbowman'], ['Pope', 'pope'], ['Paladin', 'paladin']]) {
  const def = garrisonUnits[name];
  check(`  a placed ${name} speaks with his own voice`,
    selectionCue({ kind: 'unit', ref: { def } }), CUE[want]);
}

// AND SO DOES A MAN A BARRACKS MUSTERED, if he is one of the two with a voice.
// The owner's word, twice: "when I select any paladin unit, they should use their
// own paladin voice not the general barracks voice", and then "make the change for
// assassins too".
//
// THIS CHECK USED TO ASSERT THE OPPOSITE and it was not wrong at the time — the
// five barracks lines belong to the BUILDING and answered for every man it
// musters, so what decided was whether there was one behind him. The rule is about
// the man now: a paladin sounds like a paladin wherever he stands, and so does an
// assassin.
//
// ASKED OF BOTH FORKS TOGETHER, because a fork where one brother speaks and the
// other does not would be an accident of the order two asks arrived in rather than
// a decision. These two are the only men a barracks musters who have recordings.
for (const [tier, want] of [['Paladin Keep', 'paladin'], ['Assassin Guild', 'assassin']]) {
  const man = barracks.find(t => t.name === tier).soldier;
  check(`  and so does one mustered by the ${tier}`,
    selectionCue({ kind: 'unit', ref: { def: man } }), CUE[want]);
}

// AND THE CHURCH'S PALADIN GIVES THE SAME ANSWER AS THE KEEP'S, which is the point
// of the change rather than a second way of asking it. He was the exception that
// proved the old rule — a paladin with no building behind him — and there is no
// longer anything for him to be an exception to.
{
  const keepMan = barracks.find(t => t.name === 'Paladin Keep').soldier;
  check('  the church\'s paladin and the Keep\'s give the same answer',
    selectionCue({ kind: 'unit', ref: { def: keepMan } }) ===
    selectionCue({ kind: 'unit', ref: { def: garrisonUnits.Paladin } }), true);
}

// AND THE THREE MILITIA RUNGS STILL SPEAK FOR THEIR BARRACKS, which is what keeps
// the lines above a change to two men rather than to the rule. There is no
// spearman voice to give them, so the building answering for them is not a
// fallback they are stuck with — it is the only thing there is.
{
  const militia = barracks.slice(0, 3).map(t => t.soldier);
  check('  while the three militia rungs still answer with the barracks',
    militia.every(def => selectionCue({ kind: 'unit', ref: { def } }) === CUE.barracks), true);
}
check('an enemy answers', selectionCue({ kind: 'enemy', ref: {} }), CUE.thug);
check('bare ground says nothing', selectionCue(null), null);
check('an artillery tower answers', familyCue('siege'), CUE.artillery);
check('a monastery answers', familyCue('monastery'), CUE.monastery);
// EVERY family has lines now, so the "no voice" case is asked of a family that
// does not exist rather than of the one that had not been recorded yet. The
// check is worth keeping either way: what it actually guards is that a lookup
// miss answers null instead of throwing, which is what lets the next family be
// wired up before its recordings land. It has been siege's job, then the
// monastery's, and it is nobody's now.
check('a family with no voice says nothing', familyCue('alchemy'), null);

// A TIER MAY SPEAK FOR ITSELF, which the Musketeer Post is the first to do. Three
// things have to hold together for that: the tier's own lines answer instead of
// its family's, every OTHER tier of the same family still answers with the
// family's, and a def carrying a voice nobody recorded falls back rather than
// going silent.
check('the Musketeer Post answers with its own voice',
  familyCue('archery', POST), CUE.musketeer);
check('and the tiers below it still answer for archery',
  familyCue('archery', archery[0]), CUE.archery);
check('and an unrecorded voice falls back to the family',
  familyCue('archery', { voice: 'nobody' }), CUE.archery);
check('and selecting one picks the same lines',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'archery' }, def: POST } }), CUE.musketeer);

// The same three things again for the SECOND tier 4, which is the point of asking
// twice: the first one could have been wired by a special case for archery, and
// this is what says it was not.
check('the Paladin Keep answers with its own voice',
  familyCue('barracks', barracks[3]), CUE.paladin);
check('and the tiers below it still answer for barracks',
  familyCue('barracks', barracks[0]), CUE.barracks);
check('and selecting one picks the same lines',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'barracks' }, def: barracks[3] } }), CUE.paladin);

// A MAN'S BLOW, on the same one-word opt-in as a tier's voice and with the same
// three questions. `blowCue` is read once per swing in units.js, so a fallback
// that returned undefined would silence three quarters of the melee in the game.
console.log('\nWhose swing is it\n');
check('a paladin swings with his own sound',
  blowCue(barracks[3].soldier), PALADIN);
check('and the three men below him share the generic takes',
  barracks.slice(0, 3).every(d => blowCue(d.soldier) === ATTACK), true);
check('and a def with no blow falls back rather than going silent',
  blowCue({}), ATTACK);
check('and so does one with a blow nobody recorded',
  blowCue({ blow: 'nobody' }), ATTACK);

// AND THE GENERIC SWING IS TRIMMED UNDER THE TIER 4 BLADES, which is the design
// claim beside `paladin_attack` in audio.js — "a tier 4 squad should be audibly
// the one doing the fighting" — made checkable.
//
// It is asked of GAIN rather than of the levelled result on purpose. The
// leveller brings every clip to one loudness by measurement and cannot be
// asserted against without decoding audio; what is a DECISION, and what can be
// undone by a careless edit, is the deliberate trim on top of it. The paladin's
// and the assassin's blades carry none, so any entry at all on the three generic
// takes puts them under.
check('the three generic swings are trimmed and the tier 4 blades are not',
  ATTACK.every(k => GAIN[k] < 1) && !GAIN.paladin_attack && !GAIN.assassin_melee_attack,
  true);
// One figure for all three, or the levelling that matched them to each other is
// undone by the very table meant to place them: three takes of one sound have to
// stay one sound.
check('and all three are trimmed by the same amount',
  new Set(ATTACK.map(k => GAIN[k])).size, 1);

// AND THE TWO BOOMS ARE TRIMMED UP, which is the other half of the same table and
// the claim beside `cannon_shot` in audio.js: the leveller matches RMS, the ear
// does not, and anything with its energy low down arrives quieter than it
// measures. Asked of GAIN for the same reason the swings above are — a decision
// can be checked, a measurement cannot be without decoding audio.
//
// The three booms are ranked, and the order is the size of the event rather than
// the size of the recording: a bomb takes a squad off the board, a cannon fires
// every few seconds, a rock is one stone landing on a road.
check('the three booms are trimmed up, and the bomb is the loudest',
  GAIN.bomb_sound > GAIN.cannon_shot && GAIN.cannon_shot > GAIN.rock_hit_ground &&
  GAIN.rock_hit_ground > 1, true);

// AND TWO OF THEM AT ONCE STILL CLEAR THE MIXER'S HEADROOM, which is the claim
// after the third round of "louder" and is weaker than the one before it.
//
// Category B has no gate, so nothing stops several Bomb Thugs bursting on the same
// frame. At 3.3 three of them fitted inside PEAK_OUT; at the owner's 4.0 they do
// not — two sum to 0.76 and three to 1.14 — so what is pinned now is the pair. See
// the note beside `bomb_sound` in audio.js, which says what the third one costs and
// that it was accepted rather than missed.
//
// The arithmetic is reproduced here rather than imported, on the rule the top of
// this file already keeps for MEMORY_S: a check that reads the number it is
// checking cannot catch the number changing. 0.0952 is this clip's own output peak
// per unit of trim, measured off the file; PEAK_OUT is 0.95.
check('and two bombs on one frame still clear the mixer\'s headroom',
  +(2 * 0.0952 * GAIN.bomb_sound).toFixed(2) <= 0.95, true);
// AND THE TRIM STILL DOES SOMETHING. Past 4.49 the per-clip peak clamp takes over
// and a bigger number here changes nothing at all, which would be a setting that
// looks like a lever and is not.
check('  and the trim is still under the clamp that would ignore it',
  GAIN.bomb_sound < 4.49, true);

// A NOTE RATHER THAN A CHECK, because what it reports is not wrong — it is just
// worth knowing, and it is the reason the trim above had to be set at all.
{
  const { readFileSync } = await import('node:fs');
  const same = readFileSync('assets/audio/sfx/Bomb_sound.mp3')
    .equals(readFileSync('assets/audio/sfx/Rock_hit_ground.mp3'));
  console.log(`  note  ${'the bomb and the rock landing are one recording'.padEnd(56)} ` +
    (same ? 'identical files — no trim can tell them apart by ear'
          : 'no longer identical, so the trims can be reconsidered'));
}

// AN ABILITY'S NOISE, the third one-word opt-in in audio.js after a tier's `voice`
// and a soldier's `blow`. Same three questions as the other two, and one more that
// is particular to these: an ability may legitimately be SILENT, and the two that
// are silent must be silent for a reason rather than by a typo.
console.log('\nWhat an ability sounds like\n');
check('Holy Light calls the light down in its own voice',
  abilityCue(abilityById('light').cue), HOLY_LIGHT);
check('and Blinding Strike lands in its own',
  abilityCue(abilityById('blinding').cue), HEAVY_STRIKE);
check('Deadeye speaks through its ammunition instead',
  abilityById('deadeye').cue, undefined);
check('and that ammunition is loud',
  abilityById('deadeye').ammo.fireSound, true);
check('and it is the one clip nothing else uses',
  DEADEYE.length === 1 && DEADEYE[0] === 'musketeer_deadeye', true);
check('Burst Fire is silent, and fires the ordinary ball to be so',
  !abilityById('burst').cue && !abilityById('burst').ammo, true);
check('and an ability nobody recorded falls to nothing rather than to undefined',
  abilityCue('nobody'), null);
// Every ability either has a cue this file can answer, fires something, or turns
// its owner's own noise up. An ability with none of the three would be a change
// that landed in silence, which is exactly the failure that is hardest to notice.
//
// `loud` is the third way and the newest: Sneak Attack has no recording, it plays
// the assassin's own blade at 1.8 — see the note on the ability. Held as a field
// rather than a number in units.js so that this line can see it.
check('and every ability is either heard or fires something heard',
  ABILITIES.every(a => abilityCue(a.cue) || a.ammo || a.loud || !a.pose), true);
check('and the one that is only louder says so in its own data',
  abilityById('sneak').loud > 1 && !abilityById('sneak').cue, true);
// The knife is the other half of the Guild's noise, and it is heard ARRIVING
// rather than leaving — the flask's split, not the arrow's. Checked here because
// "silent both ends" is the one way an ammunition can be wired and heard by
// nobody.
check('and the assassin\'s knife is heard landing rather than leaving',
  abilityById('knife').ammo.landSound && !abilityById('knife').ammo.fireSound, true);

// The three ability clips are Category B, which means every one of them plays
// every time — three paladins in trouble at once is three calls for the light, and
// a shared channel would silence two of them.
console.log('\nAbility sounds are Category B');
// 8600 is chosen rather than round: the clock in this file only ever goes forward,
// the busy-fight loop above runs to 8398 and the two sections below are keyed to
// 9000 and 9100. It is also far enough past 8398 for the share memory to have been
// wiped by silence, so the voice check at the end is asking about the gate rather
// than about who spoke last.
//
// THREE DIFFERENT CLIPS, not one played three times. Two identical buffers on the
// same millisecond are deliberately collapsed — see SAME_CLIP_GAP in audio.js,
// which exists because two copies of one waveform add up to one loud click rather
// than to two sounds — so a test of "several at once" has to use several.
ctx.currentTime = 8600;
played = [];
play(HOLY_LIGHT); play(HEAVY_STRIKE); play(DEADEYE);
check('three ability sounds on one frame are three sounds', played.length, 3);
check('and none of them shut the voice channel',
  at(8600.01, () => solo(CUE.paladin)), 1);

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

// --- every shot the game can fire is audible -------------------------------------
//
// THE FLAG AND THE TABLE HAVE TO AGREE, and nothing in the running game notices
// when they do not.
//
// An ammunition declares what it sounds like with two booleans — `fireSound` on
// the release, `landSound` on arrival — and each one is turned into an actual clip
// by a table: FIRING in src/towers.js, LANDING in src/projectiles.js. A `kind`
// that says true and has no row calls `play(undefined)`, which returns quietly
// having done nothing. No warning, no error, no missing file: the weapon simply
// stops making a noise, and everything else about the tower keeps working.
//
// That is a real failure mode and not a hypothetical. The same shape of break —
// a name declared in one table and never resolved in the next — shipped a blank
// upgrade button in this very change, and it took a screenshot to find. This
// block is the sound half of it, and it is cheap: every ammunition the game can
// reach, checked against both tables.
//
// EVERY AMMUNITION THE GAME CAN REACH, gathered the way the game reaches them
// rather than from a list kept here — a tier's `ammo`, an ability's `ammo`, and
// an enemy's. A list would need editing before it could see a new weapon, which
// is the same defect it is meant to catch.
console.log('\nEvery shot is heard, or is silent on purpose\n');
{
  const ammo = new Map();
  const add = (a, from) => { if (a && a.kind && !ammo.has(a.kind)) ammo.set(a.kind, { a, from }); };
  for (const d of [...archery, ...barracks, ...siege, ...monastery]) add(d.ammo, d.name);
  for (const a of ABILITIES) add(a.ammo, a.id);
  // `e.ranged.ammo`, NOT `e.ammo`. This line read the second for as long as it has
  // existed, and an enemy has never carried one — so the archer's arrow, the
  // doctor's flask and the priest's missile were all outside a check that names
  // them in its own comment. It was found by deleting the priest's FIRING row on
  // purpose and watching this file pass.
  for (const [id, e] of Object.entries(enemyTypes)) add(e.ranged && e.ranged.ammo, id);

  const loud = [...ammo.values()].filter(({ a }) => a.fireSound);
  const lands = [...ammo.values()].filter(({ a }) => a.landSound);
  check('every shot that says it is loud leaving has a clip',
    loud.every(({ a }) => Array.isArray(FIRING[a.kind]) && FIRING[a.kind].length > 0), true);
  check('and every shot that says it is loud landing has one',
    lands.every(({ a }) => Array.isArray(LANDING[a.kind]) && LANDING[a.kind].length > 0), true);

  // AND NOTHING IS SILENT AT BOTH ENDS. A projectile the player can neither hear
  // leave nor hear arrive is a weapon that fires in total silence — which is
  // never what anybody meant, and is exactly what a forgotten flag looks like.
  const mute = [...ammo.values()].filter(({ a }) => !a.fireSound && !a.landSound);
  check('and no weapon in the game is silent at both ends',
    mute.map(({ from }) => from).join(', '), '');

  // A row pointing at a cue with no clips is the same failure one layer down: the
  // table resolves, the array is there, and solo/play find nothing to start.
  const rows = [...Object.values(FIRING), ...Object.values(LANDING)].flat();
  check('and every clip those tables name is one the loader knows',
    rows.filter(k => !(k in CLIPS)).join(', '), '');
}

// THE CLOCK ONLY EVER GOES FORWARD IN THIS FILE, and that is why this block is at
// the end rather than beside the two categories it is about. It first sat between
// them at t=600, which is BEHIND the Category B section at 300-500 and on top of
// the fairness run at 600+i — so the gate it left closed at 10s in the future
// silenced six checks that had nothing to do with it. Times here start at 10000.
// --- the summary panel, which is neither category -------------------------------
//
// THE STARS HAVE TO COME OUT ONE BY ONE and the gate would not let them. This is
// the block that says so, and it is written as a comparison: the same three calls
// through `solo` and through `fanfare`, on the same clock.

console.log('\nThe summary panel counts its stars out');

ctx.currentTime = 10000;
played = [];
solo(CUE.thug);                                    // a 2s line, gate closed to 10002.9
check('a fanfare is not silenced by a closed gate', at(10001, () => fanfare(VICTORY)), 1);

// AND FIRING ONE DOES NOT CLOSE THE GATE. On a clean clock, so that the only thing
// which could be holding the channel a second later is the fanfare itself.
ctx.currentTime = 10050;
played = [];
fanfare(VICTORY);
check('and firing one does not close the gate either', at(10051, () => solo(CUE.barracks)), 1);

// THE THING THIS EXISTS FOR. Victory, then the stars — every one of them has to be
// heard.
//
// THE TIMES ARE THE SHIPPED ONES, read off score.js rather than typed, so this can
// never end up proving something about a pace the game does not use. `at` clears the
// log each time it is called, so the sounds are summed rather than counted at the
// end.
const { startReveal, stepStars, STAR_FIRST, STAR_GAP } = await import('../src/score.js');
const beats = [STAR_FIRST, STAR_FIRST + STAR_GAP, STAR_FIRST + STAR_GAP * 2];

let rang = 0;
ctx.currentTime = 10100;
played = [];
fanfare(VICTORY);
rang += played.length;
for (const b of beats) rang += at(10100 + b, () => fanfare(STAR));
check(`a fanfare and three chimes ${STAR_GAP}s apart are four sounds`, rang, 4);

// AND THE SAME FOUR THROUGH THE GATE WOULD NOT BE, which is the whole argument for
// `fanfare` existing. Nothing here says `solo` is wrong — it is doing exactly its
// job, which is the wrong job for a screen with nothing else on it.
//
// HOW MANY IT LOSES DEPENDS ON THE PACE, so this asks "fewer than four" rather than
// a number: at 0.55s apart the gate ate three of them, and at the standardised 1.5
// it eats one or two depending on the clip lengths. Pinning the exact count would be
// pinning the bug's shape rather than the rule.
let gated = 0;
ctx.currentTime = 10200;
played = [];
solo(VICTORY);
gated += played.length;
for (const b of beats) gated += at(10200 + b, () => solo(STAR));
check('where through the gate some of the same four are lost', gated < 4, true);

// It still goes out on Category A's bus, which is what makes it as loud as a line
// rather than as quiet as an arrow.
routes = [];
ctx.currentTime = 10300;
fanfare(LOST);
check('and it leaves on the A bus, at A level', routes[0] && routes[0].bus, 'busA');

// TWO CALLS FOR THE SAME CLIP IN ONE INSTANT ARE ONE SOUND. The one collision this
// path can still have, and the only thing it borrows from Category B.
ctx.currentTime = 10400;
played = [];
fanfare(STAR); fanfare(STAR);
check('two chimes on the same millisecond de-dupe', played.length, 1);

// AND ONE CHIME PER STAR, no more and no fewer. The clock lives in score.js and
// the sound is fired by main.js from the count it returns, so what has to hold is
// that the count over a whole reveal equals the stars earned — for every rating,
// including the loss that earns none.
{
  // The same clamp main.js applies to its delta. Stepping at exactly this is the
  // worst case for the arithmetic: the most frames a reveal can be spread over.
  const DT = 0.05;
  const counts = [];
  for (const stars of [0, 1, 2, 3]) {
    const st = { summary: { stars } };
    startReveal(st);
    let rang = 0;
    for (let i = 0; i < 400; i++) rang += stepStars(st, DT);
    counts.push(rang);
  }
  check('a reveal rings exactly once per star earned', counts.join(','), '0,1,2,3');

  // AND NOT ONE OF THEM BEFORE THE FANFARE HAS SAID ITS PIECE. The victory clip's
  // held chord peaks at 1.15s; the first chime is timed to land on its decay.
  const st = { summary: { stars: 3 } };
  startReveal(st);
  let t = 0, first = null;
  for (let i = 0; i < 400 && first === null; i++) { t += DT; if (stepStars(st, DT)) first = t; }
  check('the first chime lands after the fanfare peaks at 1.15s', first > 1.15, true);
  // THE TWO SHIPPED NUMBERS, pinned as numbers because they are a judgement rather
  // than a derivation — the owner has tuned this beat three times. They were briefly
  // required to be EQUAL, which was wrong: the first interval is the fanfare
  // finishing and the ones after it are a count, so they are not the same kind of
  // interval and have no business being forced to match.
  check('the wait before the first star is 1.5s', STAR_FIRST, 1.5);
  check('and the beat between the rest is 1.2s', STAR_GAP, 1.2);

  // AND THE COUNT NEVER DRAGS. Whatever the two are tuned to, a reveal that slowed
  // down after its first chime would read as the game losing its place; holding or
  // quickening reads as a count. This is the shape, where the two above are today's
  // values of it.
  check('the count does not slow down after it starts', STAR_GAP <= STAR_FIRST, true);

  // AND NO TWO CHIMES OVERLAP. The star clip carries 0.35s of sound inside a 2.04s
  // file, so the floor here is the sound and not the file — a gap under it would be
  // two chimes ringing at once, which is a chord and not a count.
  check('and no chime rings into the next', STAR_GAP > 0.35, true);
}

// --- the two noises the fight makes for itself -------------------------------
//
// BOTH OF THESE ARE DRIVEN THROUGH THE REAL GAME CODE rather than asked of a table.
// The block above proves that every ammunition with `fireSound` has a FIRING row,
// which is a fact about two objects; it says nothing about whether loose() reaches
// the table, and the owner's question — "help me check that archer thugs use the
// arrow shot sound effect" — is about the second thing.
//
// So updateEnemies is run with a real archer on a real route, and what comes back is
// whatever the mixer was actually asked to start.

console.log('\nWhat the enemies sound like\n');

{
  const { updateEnemies } = await import('../src/enemies.js');
  const { levels, useLevel } = await import('../src/level.js');
  const DT = 1 / 60;
  useLevel(0);

  // A figure on the first road of the first board, far enough along to be walking.
  // EVERY CLOCK AN ENEMY RUNS, initialised. `tcd` is the one that caught this out:
  // it is the seconds until the next arrow, and a fixture that leaves it undefined
  // makes `undefined - dt` = NaN on the first frame — a clock that never reaches
  // zero, so the archer walks the whole road and never looses. Nothing errors. See
  // the note on `tcd` beside spawn() in src/enemies.js, which says the same thing
  // about the same field.
  const foe = (id, s, over = {}) => ({
    def: enemyTypes[id], x: 0, y: 0, hp: enemyTypes[id].hp, maxHp: enemyTypes[id].hp,
    route: 0, lane: 1, s, foe: null, acd: 0, tcd: 0, shot: 0, thrust: 0,
    halted: false, leaked: false, statuses: [], face: -1, guard: 0, ...over
  });
  const world = (es, us = []) => ({ towers: [], enemies: es, units: us, shots: [], hits: [],
                                    corpses: [], splats: [], impacts: [], smoke: [],
                                    gold: 0, lives: 20 });

  // THE ARCHER THUG'S ARROW. He needs somebody to shoot at, and the somebody is a
  // REAL SQUAD out of a real barracks rather than a hand-rolled object — the first
  // version of this fixture built a plain `{ def, hp, x, y }` and the archer never
  // took aim at it, because the picker asks questions of a soldier that a stand-in
  // does not answer. makeUnits is the same call the game makes.
  const { makeUnits } = await import('../src/units.js');
  const { makeTower } = await import('../src/towers.js');
  {
    const bar = barracks[0];
    const fam = { id: 'barracks', tiers: barracks };
    const archer = foe('archer_inf', 300);
    const st = world([archer], []);
    const tower = makeTower({ x: 0, y: 0 }, fam, bar);
    st.towers.push(tower);
    makeUnits(st, tower);
    ctx.currentTime = 20000;
    played = [];
    for (let i = 0; i < 60 * 8 && !played.filter(c => c === 'Arrow_shot').length; i++) {
      // Keep the squad standing beside him, inside his 200px reach.
      for (const u of st.units) { u.x = archer.x + 60; u.y = archer.y; u.rx = u.x; u.ry = u.y; }
      tower.x = archer.x + 60; tower.y = archer.y;
      updateEnemies(st, DT);
    }
    // `played` HOLDS FILE NAMES, not cue keys — see the fake decodeAudioData at the
    // top, which names each buffer after its basename. Comparing against 'arrow_shot'
    // read false on a run where the clip really did play, which is the fixture being
    // wrong rather than the game.
    check('an Archer Thug looses with the arrow shot clip',
      played.filter(c => c === 'Arrow_shot').length > 0, true);
    check('  and makes no other noise doing it',
      played.filter(c => c !== 'Arrow_shot').join(', '), '');
  }

  // THE RALLY THUG'S WAR CRY, at the owner's ask, and the three things about it that
  // could each be wrong on their own.
  {
    const near = 200;
    // ONCE, when the mark goes on.
    ctx.currentTime = 30000;
    played = [];
    const thug = foe('light_inf', near);
    const st = world([foe('rally_inf', near), thug]);
    updateEnemies(st, DT);
    check('a Rally Thug cries out when his aura takes hold',
      played.filter(c => c === 'War_cry').length, 1);

    // AND NOT AGAIN on the frames that merely refresh it — which took THREE goes to
    // ask in a way that could come back no.
    //
    // The first version ran 60 frames. A cry requested every frame is dropped for as
    // long as the first one holds the channel, so one second of frames gives exactly
    // one cry whether the rule is in the code or not. The second ran four seconds,
    // reasoning that a dropped request never closes the gate, so the moment the gate
    // opens the next frame's request would start another clip. It passed too, and
    // that was the finding: the war cry has ONE take, and a single-take cue is
    // ineligible for as long as it is the last thing `heard` — see solo() in
    // src/audio.js, and MEMORY_S, which only clears the slate after 20s of silence.
    // A cry asked for every frame on a quiet board is silent anyway.
    //
    // So this puts SOMETHING ELSE on the channel in between, which is the one thing
    // that makes the cry eligible again without waiting out the memory. After the
    // select clip the gate is open, the cry is no longer `last`, and it has been
    // heard once of its allowed two. A version that asks every frame cries here. The
    // one that ships asks only on the transition, and says nothing.
    ctx.currentTime = 30010;
    played = [];
    for (let i = 0; i < 60 * 2; i++) { ctx.currentTime += DT; updateEnemies(st, DT); }
    solo(SELECT);
    ctx.currentTime += 2;
    for (let i = 0; i < 60 * 2; i++) { ctx.currentTime += DT; updateEnemies(st, DT); }
    check('  and not again, for as long as the same enemy stands there',
      played.filter(c => c === 'War_cry').length, 0);
    // ...and the clip that was supposed to clear the way really did sound, because if
    // it had been dropped the check above would be back to proving nothing.
    check('  (the gap was opened by something else on the channel)',
      played.filter(c => c === 'Select_Sound').length, 1);

    // AND AGAIN for somebody new. A second body walks into the same aura — and he is
    // put down BESIDE THE FLAG rather than at the `near` the other two started from,
    // because by now the flag has walked 180px up the road and 200 is no longer next
    // to him. The first version of this spawned at `near`, read a silence, and was
    // measuring the aura's 150px reach rather than the cry.
    //
    // Two frames, not one: a figure is placed by `s` and its x/y is whatever the last
    // frame left there, so the frame that puts him in the right place is not
    // necessarily the frame the aura sees him on.
    ctx.currentTime = 30020;
    played = [];
    st.enemies.push(foe('tough_inf', st.enemies[0].s));
    updateEnemies(st, DT);
    updateEnemies(st, DT);
    check('  and again when it takes hold of a new one',
      played.filter(c => c === 'War_cry').length, 1);
  }

  // AND IT IS CATEGORY A, at the owner's word: one at a time. Asked the way the
  // Category A block above asks it — a second cry inside the first is dropped.
  {
    const near = 200;
    const st = world([foe('rally_inf', near)]);
    ctx.currentTime = 40000;
    played = [];
    st.enemies.push(foe('light_inf', near));
    updateEnemies(st, DT);
    const first = played.filter(c => c === 'War_cry').length;
    // A second body arrives a quarter second later, while the 1.34s clip is sounding.
    ctx.currentTime = 40000.25;
    played = [];
    st.enemies.push(foe('tough_inf', near));
    updateEnemies(st, DT);
    check('the war cry is Category A — a second inside the first is dropped',
      `${first} then ${played.filter(c => c === 'War_cry').length}`, '1 then 0');
  }

  // THE BOMB THUG'S BURST, and it is the other side of the line from the cry
  // above — the owner asked for Category B and this is what that buys.
  {
    const { detonate, updateBombs, dropBomb } = await import('../src/bombs.js');
    const bomb = enemyTypes.bomb_inf;
    const at = (x, y) => ({ def: bomb, x, y, hp: bomb.hp, statuses: [] });

    ctx.currentTime = 50000;
    played = [];
    detonate(world([]), at(100, 100));
    check('a Bomb Thug going off makes the bomb noise',
      played.filter(c => c === 'Bomb_sound').length, 1);

    // AND AGAIN, A TENTH OF A SECOND LATER. This is the whole of the Category B
    // claim and it is the check that could come back no: the same pair of bursts
    // through `solo` gives one sound and a silence, because the first holds the
    // channel for its own length plus a second of quiet — and then the single-take
    // rule keeps it silent for twenty more. A wave can send several Bomb Thugs and
    // they arrive at the line together; hearing one of them is the wrong answer.
    ctx.currentTime = 50000.1;
    played = [];
    detonate(world([]), at(300, 100));
    check('  and a second one right behind it is heard too',
      played.filter(c => c === 'Bomb_sound').length, 1);

    // THE DROPPED BOMB SOUNDS THE SAME. One event, one noise — which of the two
    // ways it went off is something you can see rather than hear.
    ctx.currentTime = 50001;
    played = [];
    const st = world([]);
    dropBomb(st, bomb, 500, 300, bomb.spriteFaces);
    for (let i = 0; i < 60 * 3 && st.bombs.length; i++) { ctx.currentTime += DT; updateBombs(st, DT); }
    check('  and so does one that burns down on the ground',
      played.filter(c => c === 'Bomb_sound').length, 1);
  }
}


console.log(bad ? `\n${bad} sound rule(s) broken.` : '\nAll three sound rules hold.');
process.exit(bad ? 1 : 0);
