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

const { loadAudio, play, solo, CUE, SHOT, ATTACK, PALADIN, SELECT,
        DEADEYE, HOLY_LIGHT, HOLY_SLASH,
        selectionCue, familyCue, blowCue, abilityCue, GAIN } = await import('../src/audio.js');
// The two ladders with a tier 4 on them, for the voice and blow checks below.
// Imported here rather than at the top because everything above has to run after
// the fake AudioContext is in place, and this file keeps its imports in one order
// for that reason.
const { archery, barracks } = await import('../src/data/towers.js');
const { ABILITIES, abilityById } = await import('../src/data/abilities.js');

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
  familyCue('archery', archery[3]), CUE.musketeer);
check('and the tiers below it still answer for archery',
  familyCue('archery', archery[0]), CUE.archery);
check('and an unrecorded voice falls back to the family',
  familyCue('archery', { voice: 'nobody' }), CUE.archery);
check('and selecting one picks the same lines',
  selectionCue({ kind: 'tower', ref: { fam: { id: 'archery' }, def: archery[3] } }), CUE.musketeer);

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

// AN ABILITY'S NOISE, the third one-word opt-in in audio.js after a tier's `voice`
// and a soldier's `blow`. Same three questions as the other two, and one more that
// is particular to these: an ability may legitimately be SILENT, and the two that
// are silent must be silent for a reason rather than by a typo.
console.log('\nWhat an ability sounds like\n');
check('Holy Light calls the light down in its own voice',
  abilityCue(abilityById('light').cue), HOLY_LIGHT);
check('and Holy Slash lands in its own',
  abilityCue(abilityById('slash').cue), HOLY_SLASH);
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
play(HOLY_LIGHT); play(HOLY_SLASH); play(DEADEYE);
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

console.log(bad ? `\n${bad} sound rule(s) broken.` : '\nBoth sound rules hold.');
process.exit(bad ? 1 : 0);
