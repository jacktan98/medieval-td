import { loadArt, ensureBoard, boardReady, prefetchBoards, versioned } from './assets.js';
import { loadAudio, fanfare, setLoop, chime, CUE, VICTORY, LOST, STAR, ACHIEVED } from './audio.js';
import { level, levels } from './level.js';
import { STAGES } from './data/overview.js';
import { openingDelay } from './data/waves.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, scaleWaves, startingGold } from './data/difficulty.js';
import { adminWaves, adminGold } from './admin.js';
import { finish, saveUnlocked, startReveal as startStars, stepStars, savedDifficulty } from './score.js';
import { startReveal, stepReveal, stageOfLevel, openedStages, roadGrew, mapAudio, mapFontReady } from './overview.js';
import { STAGE_COUNT } from './data/overview.js';
import { updateEnemies, spawn } from './enemies.js';
import { updateTowers, frameOf, prebuiltOn } from './towers.js';
// The families, for resolving what a level says is already standing by name.
import { families } from './data/towers.js';
import { updateUnits, makeUnits, makeGarrison, addGarrison } from './units.js';
import { makeVillagers, updateVillagers } from './villagers.js';
import { updateShots } from './projectiles.js';
import { updateCorpses } from './corpses.js';
import { updateBombs } from './bombs.js';
import { updateSplats } from './blood.js';
import { updateImpacts } from './impacts.js';
import { updateSmoke } from './smoke.js';
import { updateWaves } from './waves.js';
import { draw, tierMarks, setDeviceScale, stagePhoto } from './render.js';
import { attachInput } from './input.js';
import { validate, selectionInfo } from './select.js';
import { noticeFoes, noticeTowers } from './newfoe.js';
import { makeTutorial, updateTutorial, makeMapTour, updateMapTour } from './tutorial.js';
import { track, watchGame, gameVersion } from './analytics.js';
import { noteBattle, startEnding, updateEnding, lastStage } from './ending.js';
import { seedRng, newSeed } from './rng.js';
import { startRecording, stopRecording, recording, replaying, afterStep, duePresses, startPlayback, ended, drift } from './replay.js';
import { tap } from './input.js';
import { openMenu, closeMenu } from './menu.js';
import { shapeMenu, setTouch, isTouch } from './tutorial.js';
import { useLevel } from './level.js';
import { soundLevel, setSoundLevel } from './audio.js';
import { canvasScale } from './data/ui.js';
import { countAchievements, checkRecords, flushAchievements, toasts } from './achievements.js';

// HOW LONG AFTER A STAGE STARTS ITS NEW TOWERS ARE ANNOUNCED. Game seconds.
const TOWER_ALERT_DELAY = 1;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The game is drawn in a fixed 960x540 coordinate space, but the backing store
// is sized to real device pixels. Without this the canvas holds 960 pixels and
// the browser stretches them across a phone's ~2500 physical ones, so art is
// downscaled into the canvas and then blown back up — detail thrown away, then
// re-inflated. Sprites are the obvious casualty; text and thin lines suffer too.
//
// Nothing else has to care: the transform keeps every draw call in 960x540
// units, and input.js converts taps through the CSS box, which is unaffected.
//
// THE TWO NUMBERS AND THE RULE THAT PICKS THEM live in data/ui.js — see
// canvasScale, and the note above MIN_SCALE for why the floor is 2 and not 1.
// They are there rather than here because this file cannot be imported by a tool
// without starting a game, and the rule is worth checking.

function fitToDisplay() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  const dpr = window.devicePixelRatio || 1;
  const { shown, backing } = canvasScale(rect.width, dpr);
  const w = Math.round(960 * backing);
  const h = Math.round(540 * backing);

  // Assigning width or height clears the canvas and resets the context, so
  // only do it when the size actually changed.
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(w / 960, 0, 0, h / 540, 0, 0);
  // Tell the renderer how many real pixels a logical one is worth. Exactly one
  // thing reads it — the encyclopedia's pop-up, which promises to show art at its
  // own resolution and cannot keep that promise without knowing. Pushed rather
  // than imported: this module already imports render.js.
  //
  // `shown` and NOT `backing`: the promise is about the glass. Handed the backing
  // scale, the pop-up would read a supersampled canvas as a denser screen and
  // shrink the picture it was meant to be showing at full size.
  setDeviceScale(shown);
}

// Every background loop any board asks for — see `ambience` on the levels.
const AMBIENT = [...new Set(levels.flatMap(l => (l.ambience || []).map(a => a.clip)))];

const state = {};

// A REPLAY BEING WATCHED (replay.html), or null: the recording to play. See src/replay.js.
const REPLAY = globalThis.__replayRun || null;

function newGame() {
  // THE DICE, SEEDED, before anything on the new board rolls them — the villagers,
  // the prebuilt towers' men. A replay seeds them as its recording did. See src/rng.js.
  state.seed = REPLAY ? REPLAY.seed : newSeed();
  seedRng(state.seed);
  // The game clock's step count — what every recorded press is timed by.
  state.steps = 0;
  // Survives the reset: the map the player chose is a menu setting, not part of
  // the game being reset. Without this, switching to map 2 on the title screen
  // would bounce straight back to map 1, and so would losing a game on it.
  const levelIndex = state.levelIndex ?? 0;
  // Survives the reset for the same reason the map does: it is a menu setting
  // rather than part of the game being reset.
  // AND ON FIRST LOAD, the one the player last left the button on.
  const difficultyIndex = state.difficultyIndex ?? savedDifficulty() ?? DEFAULT_DIFFICULTY;
  const difficulty = DIFFICULTIES[difficultyIndex];

  // WHERE ON THE WORLD MAP THE PLAYER IS, and how much of it has opened. Both
  // survive the reset for the same reason the map and the difficulty do — they
  // are not part of the board being thrown away — but they are not quite menu
  // settings either: `unlocked` is saved progress, read off storage the first
  // time and kept on the state after that.
  //
  // `stage` is null on the world map and an index while the panel for one is up.
  // Whoever wants to land on the map rather than the panel sets it to null BEFORE
  // calling this, which is what quitting and finishing a game both do.
  const stage = state.stage ?? null;
  const unlocked = state.unlocked ?? openedStages();
  // A stage opened by a win that has not yet been shown opening. Set when the
  // game is won and spent here, on the way back to the map.
  const pendingReveal = state.pendingReveal ?? roadGrew();

  Object.assign(state, {
    levelIndex,
    difficultyIndex,
    stage,
    unlocked,
    // The road drawing itself, or null. Never carried across a rebuild — it is
    // started below from `pendingReveal`, so that a reveal cannot be inherited
    // half-finished by a game that has nothing to do with it.
    reveal: null,
    // A Start held for the board's pictures (see the frame loop) is never carried
    // into another game — backing out to the map rebuilds through here.
    startWhenReady: false,
    // THE UNDEALT ROADS, on a board that divides its wave between its entries —
    // see nextRoute in src/enemies.js. Cleared here with everything else, because
    // a bag half dealt into a lost game is not the bag the next one should open
    // with: the first four men of a new attempt would arrive on whatever the last
    // attempt happened to leave behind.
    routeBag: null,
    pendingReveal: null,
    // THE WAVES THIS GAME WILL ACTUALLY SEND, scaled once here rather than read
    // through the level every frame. Two things depend on that: `waveSize` and
    // the spawn loop have to agree exactly about how many enemies a group holds,
    // and they cannot if each of them rounds a multiplication separately.
    //
    // TWO LAYERS, in this order, and the order is the design: the admin
    // dashboard replaces the level's own counts, and THEN the difficulty scales
    // whatever it finds. So a wave the owner sets to 20 is 17 on Normal and 22 on
    // Hard, exactly as a wave the data file sets to 20 would be — the dashboard
    // edits the table, it does not sit outside the difficulty.
    waves: scaleWaves(adminWaves(level), difficulty),
    // The same two layers the wave table above has, in the same order: the
    // dashboard replaces the map's own purse, and the difficulty scales what it
    // finds. A purse dialled to 2000 for testing is still 2200 on Easy.
    gold: startingGold(adminGold(level), difficulty),
    lives: level.startLives,
    // WHAT THE BOARD OPENS WITH, which on every map but one is nothing.
    //
    // Stage 2 starts with a tier 3 barracks on its top-right plot, at the owner's
    // ask. It is an ordinary tower from here on — the squad can be rallied, the
    // building can be sold, and the refund is what the same ladder would have cost
    // — because the alternative is a thing on the board that does not answer taps,
    // which reads as broken rather than as a gift.
    //
    // Rebuilt on every newGame rather than kept across one, exactly like the rest
    // of this object: a restart puts the board back as it started, and "as it
    // started" includes this.
    towers: prebuiltOn(level, families),
    enemies: [],
    units: [],
    shots: [],
    hits: [],
    // Bodies on the road, and the blood thrown by every hit. Cleared with
    // everything else on restart, so a lost game does not hand the next one a
    // battlefield. The pools are not here: each one belongs to a corpse.
    corpses: [],
    splats: [],
    // Earth thrown up where a rock landed. A separate list from the blood rather
    // than a flag on it: the two are different pictures at different scales with
    // different lifetimes, and the only thing they share is being decoration.
    impacts: [],
    // The dust over a plot that has just been built on, upgraded or cleared.
    // Cleared with everything else, so a restart never inherits a cloud.
    smoke: [],
    // Live bombs, left by a Bomb Thug shot down before he reached anybody. The
    // only decoration in this list that is not decoration: it goes off. See
    // src/bombs.js.
    bombs: [],
    waveIndex: 0,
    spawned: 0,
    // THE EXIT FLAGS STAND AGAIN on a new game or a restart; they lift away only
    // when its first wave comes. See flagAway in src/render.js.
    flagsAway: undefined,
    // THE FALLEN, counted for the villagers' hops (src/villagers.js). It was never
    // cleared, so a game started after one with kills in it began with the count
    // already past a hop, and the villagers hopped on the first frame.
    slain: 0,
    timer: openingDelay,
    // THE FIRST WAVE IS HELD until the player presses Next wave — see updateWaves.
    called: false,
    // Held at the title screen. Nothing steps until the player presses Start —
    // not the spawn clock and not `timer`, which is what the early-call bonus is
    // computed from. Loading the page used to start that draining silently.
    //
    // A restart comes back here rather than straight into a running game, so the
    // second attempt gets the same look at the board as the first.
    started: false,
    // Stopped by the player rather than by the title screen. Kept separate from
    // `started` because they mean different things to the rest of the game: a
    // paused game is running and simply not stepping, so its board, its menus
    // and its info box all stay live and a tower can still be bought.
    paused: false,
    resting: false,
    // Seconds left before the current wave gives up waiting for its stragglers,
    // or null while it is still spawning them. See stallClock in waves.js — a
    // wave no longer ends only when the field is clear, because the field is no
    // longer guaranteed to clear.
    stall: null,
    menu: null,
    result: null,
    // Dashboard fast-forward. 1 or 2; multiplies the simulation step, so the
    // game runs at double tempo without any per-system speed constant.
    speed: 1,
    // Desktop-only, and null on a phone for the whole session: the tower under
    // the mouse, and the pointer position while a rally is being placed.
    hoverTower: null,
    ghost: null,
    // The barracks waiting for its rally point to be tapped.
    placing: null,
    // Which page of the encyclopedia is open, or null for closed. It is a mode
    // rather than a screen: while it is set, every tap on the board goes to the
    // book and nothing else answers. See src/book.js.
    //
    // Reset with everything else, so a book left open on the title screen is not
    // still up when a map switch rebuilds the game underneath it.
    book: null,
    // Which half of a two-stage boss the encyclopedia is showing. Reset by
    // openBook as well; here so that a state built and never opened still has the
    // field, on the same rule every other one in this object follows.
    bookStage: 1,
    // Which picture each of the book's four pages is describing, and the stat band
    // the mouse is over. See openBook in book.js.
    bookPick: [0, 0, 0, 0],
    bookTip: null,
    // The encyclopedia's picture pop-up: the drawing a card was tapped to open,
    // or null. A mode inside a mode — while it is set the book's own footer stops
    // answering and any tap closes it. Only ever set while `book` is, and cleared
    // whenever the book is opened, so a restart cannot inherit one.
    zoom: null,
    // A half-pressed button in the pause row — Restart or Quit — as its id and the
    // ms timestamp its window closes at, or null for nothing armed. Both throw a
    // board away, so both ask twice; one field rather than two because arming
    // either has to disarm the other.
    //
    // Null is also what it resets to: a restart cannot inherit a half-press.
    armed: null,
    // The sound slider a finger or mouse is dragging, 'ambience' or 'effects', or
    // null. See tapPaused in input.js.
    soundDrag: null,
    // The admin dashboard, or null for closed. Cleared with everything else for
    // the same reason the book is: a panel left open across a rebuild would be
    // sitting on top of a game it no longer describes.
    admin: null,
    // What the end-of-game panel shows, built ONCE at the moment the game ends —
    // see finish() in score.js, which also writes the star record. Null until
    // then, and null again on a restart.
    summary: null,
    // AND HOW FAR THROUGH ANNOUNCING ITSELF THAT PANEL IS. Kept beside the summary
    // rather than inside it because the summary is the RECORD — what was achieved —
    // and these two are where the animation has got to. Both are reset here as well
    // as by startReveal, so a restart cannot land on a panel that thinks it has
    // already counted its stars out.
    summaryClock: 0,
    starsShown: 0,
    // What the info box is describing: { kind, ref } or null. A direct reference
    // to the live enemy, soldier or tower, which is what makes the health in the
    // box the same number the health bar over its head is reading.
    selected: null,
    // "NEW ENEMY" — the creatures met for the first time in this game whose alert
    // is up under the gold, oldest first, and the one whose card is open (or null).
    // The card stops the game while it is up. Both reset here: an alert left
    // unopened goes with the game it was raised in. See src/newfoe.js.
    foeAlerts: [],
    foeCard: null,
    // And the cards opened in this game — see openFoeCard in src/newfoe.js.
    cardsRead: new Set(),
    // The rally flag just planted, and the last spot refused — see the placing tap in
    // src/input.js.
    rallyMark: null,
    badTap: null,
    // STAGE 1'S TUTORIAL, for a player who has not yet won it — or null. See
    // src/tutorial.js.
    tutorial: makeTutorial(level),
    // Whether this game's stage has had its towers noticed yet — see noticeTowers —
    // and the game seconds still to wait before it does.
    towersNoticed: false,
    towerWait: TOWER_ALERT_DELAY,
    // Which of the card's stat icons is showing its name, or null.
    foeTip: null,
    // THE UPGRADES SCREEN, opened from the world map: whether it is up, the rung
    // last tapped and the rung under the mouse (each { fam, i } or null), and a
    // half-pressed Reset's deadline. See src/upgradepage.js.
    upgrades: false,
    upPick: null,
    upHover: null,
    upArmed: null,
    // THE ACHIEVEMENTS SCREEN, beside it: whether it is up, the one last tapped and
    // the one under the mouse (each an index, or null). See src/achievepage.js.
    achievements: false,
    achPick: 0,
    achHover: null,
    // The tier 4 towers built on this stage, for Grand Arsenal. See src/achievements.js.
    tier4: [],
    // THE BOSS WHO GOT AWAY, by name, if one walked out of the exit — which is a loss
    // whatever the lives said, and the summary says so (src/render.js).
    bossEscaped: null
  });

  // AND ANY PREBUILT BARRACKS GETS ITS SQUAD, which cannot happen inside the
  // Object.assign above: makeUnits pushes onto state.units, and state.units is one
  // of the fields that assign is in the middle of replacing. Same call the build
  // button makes, so a squad that starts on the board is the squad any other
  // barracks would have — it musters, it walks to its post, and it answers a rally
  // point like any other.
  for (const t of state.towers) makeUnits(state, t);
  // AND THE FIGURES THE BOARD IS BORN WITH, which belong to no tower — stage 5's two
  // crossbowmen at the bridge. After the squads for the same reason the squads are
  // here at all: state.units is rebuilt by the Object.assign above, so anything that
  // pushes onto it has to run after it.
  makeGarrison(state, level);
  // AND THE PEOPLE WHO LIVE THERE. Not figures the game draws — they stay painted
  // into the board — but points a tap can find, so their card can be opened. See
  // src/villagers.js.
  makeVillagers(state, level);

  // A PLAYER WHO HAS NEVER SEEN THE MAP. Nothing is unlocked, so the road comes
  // in from off the left edge of the world, draws itself to the first marker and
  // plants a flag there — which is both the opening of the game and the only
  // instruction it gives. Saved immediately, so it happens exactly once.
  if (state.unlocked === 0) {
    state.unlocked = 1;
    saveUnlocked(1);
    startReveal(state, 0);
  } else if (pendingReveal !== null) {
    // A stage opened by the run that just ended. Shown now rather than over the
    // result panel, because the point of it is the map.
    startReveal(state, pendingReveal);
  }
}

// HOW LONG AN ACHIEVEMENT'S POP-UP WAITS after the result's last star has rung, in
// ms, and the wall-clock time before which it may not come in. See below in frame.
const TOAST_AFTER_STARS = 1000;
let toastHold = 0;

// THE ACHIEVEMENTS COUNT IN A GAME BEING PLAYED, and not in one being watched again.
// Anything the save already shows — the stars, the upgrades — is given now, quietly,
// to a player who did it before achievements existed. See src/achievements.js.
if (!REPLAY) {
  countAchievements(true);
  checkRecords({ quiet: true });
}

// A REPLAY STARTS ON ITS OWN BOARD, at its own difficulty, and goes straight in.
if (REPLAY) {
  startPlayback(REPLAY);
  state.levelIndex = REPLAY.levelIndex;
  state.difficultyIndex = REPLAY.difficultyIndex;
  useLevel(REPLAY.levelIndex);
}
newGame();
if (REPLAY) {
  state.stage = 0;
  state.anim = REPLAY.anim || 0;
  state.pendingReveal = null;
  state.reveal = null;
  state.startWhenReady = true;
  setTouch(!!REPLAY.touch);
} else {
  // THE START PAGE FIRST, once a visit, before the world map. See src/titlepage.js.
  state.title = true;
  attachInput(canvas, state, newGame);
  // A game left by closing the page is still worth watching, up to where it was left.
  addEventListener('pagehide', () => { if (state.started && !state.result) stopRecording(state, 'left'); });
}
// A VISIT, into the player log: phone or mouse, and the screen it is played on.
track('visit', { ver: gameVersion(), touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
  w: innerWidth, h: innerHeight });

// A window onto the live game, for `?debug` only — the same trick as render.js's
// `?muzzle`, and for the same reason: something has to be checkable from outside
// without editing a file and redeploying.
//
// `state` is deliberately not exported. It is one mutable object the whole game
// writes to, and a module that can import it is a module that can quietly start
// depending on a field it has no business reading. A query-string hatch is
// visible, opt-in, and impossible to reach by accident from inside the game.
//
// What it is FOR: driving the browser checks. Reading `towers[0].beat` from a
// script is how the catapult's beat loop was verified to hold its poses for the
// lengths it claims — and how every rock was confirmed to LAND while the Fire
// pose is still up, which is the one thing about the lob that cannot be seen by
// watching it once.
if (new URLSearchParams(location.search).has('debug')) {
  window.__game = { state, frameOf, selectionInfo, tierMarks };
  // `level` THROUGH A GETTER, because it is a live binding and this object is
  // built once. Put in the literal it was a COPY of whichever board happened to be
  // current at load — always stage 1 — so every check driven through this hatch
  // read stage 1's plots however far into the campaign the game was. It reported
  // the prebuilt barracks as standing on "plot -1" of a board it was not on, which
  // is a debugging tool inventing a bug rather than finding one.
  Object.defineProperty(window.__game, 'level', { get: () => level, enumerable: true });
}

let last = performance.now();
const STEP = 1 / 60;
const MAX_SLICES = 3;
let acc = 0;
let recordedSeed = null;

// --- the replay viewer's side of the loop -------------------------------------------
//
// The controls on replay.html write `window.__replayView` (speed, paused, seekTo) and
// read back where the replay is. The presses are applied through the very functions
// the player's taps went through (input.js `tap`), and a hover-opened menu as the
// hover opened it.
function replayView() {
  return globalThis.__replayView || (globalThis.__replayView = { speed: 1, paused: false });
}
function applyPresses() {
  for (const p of duePresses(state)) {
    if (p.k === 'tap') {
      setTouch(!!p.touch);
      // A press that would leave the game (Quit, Restart, the result screen) ends the
      // replay instead of rebuilding the board.
      tap(state, p.x, p.y, () => { state.replayLeft = true; });
      // AND DRAWN, before the next press: some buttons learn where they are by being
      // drawn (the card's X, for one), and in the real game a frame always came
      // between a press that opened something and the press on it.
      draw(ctx, state);
    } else if (p.k === 'hover') {
      const plot = level.plots[p.plot];
      if (plot && !state.menu) { openMenu(state, plot, null); shapeMenu(state); state.menu.viaHover = true; }
    } else if (p.k === 'unhover') {
      if (state.menu && state.menu.viaHover) closeMenu(state);
    }
  }
}
function reportReplay(view) {
  view.step = state.steps;
  view.total = REPLAY.end ? REPLAY.end.s : null;
  view.drift = drift;
  view.ended = ended(state) || !!state.result || !!state.replayLeft;
  view.wave = (state.waveIndex || 0) + 1;
  view.lives = state.lives;
  view.gold = state.gold;
  // SKIPPING AHEAD: the game run silent, as fast as it goes, a slice of it a frame so
  // the page stays responsive, until it reaches the step asked for.
  if (view.seekTo != null && view.seekTo > state.steps && !view.ended) {
    const sound = view.sound ?? [soundLevel('effects'), soundLevel('ambience')];
    view.sound = sound;
    setSoundLevel('effects', 0); setSoundLevel('ambience', 0);
    const until = performance.now() + 25;
    while (state.steps < view.seekTo && performance.now() < until && !state.result && !ended(state)) {
      applyPresses();
      // Held (paused, a card up) with nothing more due at this step: the recording
      // ends here, so there is nothing to skip to.
      if (!state.started || state.paused || state.foeCard) break;
      for (let i = 0; i < state.speed; i++) { step(state, STEP); state.steps++; afterStep(state); applyPresses(); }
      state.anim = (state.anim || 0) + STEP;
    }
    if (state.steps >= view.seekTo || state.result || ended(state)) {
      view.seekTo = null;
      setSoundLevel('effects', sound[0]); setSoundLevel('ambience', sound[1]);
      view.sound = null;
    }
  }
}

function frame(now) {
  fitToDisplay();

  // Clamp dt so a backgrounded tab doesn't teleport every enemy into the keep.
  // The clamp is applied BEFORE the fast-forward multiplier, so 2x is exactly
  // two normal steps' worth of time and never a single huge one — a big step
  // walks enemies straight through a blocker's ENGAGE radius without stopping.
  const real = Math.min((now - last) / 1000, 0.05);
  last = now;

  // THE BOARD IN VIEW HAS ITS PICTURES, or is getting them — see ensureBoard in
  // src/assets.js. A Start pressed before they have all arrived (`startWhenReady`,
  // src/input.js) starts the game the frame they have.
  ensureBoard(level);
  if (state.startWhenReady && boardReady(level)) { state.startWhenReady = false; state.started = true; }

  // THE NEW-ENEMY CARD STOPS THE GAME as the pause does, at the owner's word, so
  // the player can read it; closing it with its X lets the game run again.
  // A RECORDING BEGINS with the game — see src/replay.js.
  // A NEW game, told by its seed: Restart goes straight from one game into the next
  // without ever being "not started" in between.
  if (state.started && state.seed !== recordedSeed && !REPLAY) {
    recordedSeed = state.seed;
    startRecording(state, { ver: gameVersion(), touch: isTouch(), stage: (state.stage ?? -1) + 1 });
  }

  // IN FIXED STEPS OF 1/60 s, not in whatever time the frame took, so the same
  // presses at the same steps make the same game — what a replay depends on, and
  // the same work a second as before. `speed` steps a slice, as the 2x button asks;
  // at most MAX_SLICES slices a frame, the old 0.05 s clamp in another form.
  const view = REPLAY ? replayView() : null;
  if (view && view.paused) { acc = 0; } else {
    if (REPLAY) applyPresses();
    const held = () => !!state.foeCard;
    const running = () => state.started && !state.paused && !held() && !state.result && !(REPLAY && ended(state));
    if (running()) {
      acc += real * (view ? view.speed : 1);
      let n = 0;
      const most = MAX_SLICES * (view ? Math.max(1, view.speed) : 1);
      while (acc >= STEP && n < most && running()) {
        for (let i = 0; i < state.speed && running(); i++) {
          step(state, STEP);
          state.steps++;
          afterStep(state);
          if (REPLAY) applyPresses();
        }
        // THE BOARD'S OWN CLOCK, for what moves on it without being part of the game —
        // fires, flags, a waving hand. It runs while a game is on and stops dead on the
        // pause, at the owner's word: "All animations should be paused when pause button
        // is used." A slice at a time, not a step, so 2x does not set the fires racing.
        state.anim = (state.anim || 0) + STEP;
        acc -= STEP;
        n++;
      }
      if (n >= most) acc = 0;
    } else {
      acc = 0;
      // After the end, the fires still burn: the board's clock on real seconds.
      if (state.started && !state.paused && !held()) state.anim = (state.anim || 0) + real;
    }
  }
  if (view) reportReplay(view);
  // THE NEW-ENEMY CARD STOPS THE GAME as the pause does, at the owner's word — and the
  // board's loops below hold with it.
  const reading = !!state.foeCard;

  // The moment a game ends, once. Outside the step because a result can be set
  // by either of two places — updateWaves for a win, the lives check for a loss —
  // and this is the one line both of them pass through afterwards.
  //
  // It has a side effect: it writes the star record. That is why it is guarded on
  // `summary` being null rather than rebuilt each frame — "did this run beat your
  // best" is true exactly once, and a summary recomputed every frame would say so
  // for one frame and then contradict itself for the rest of the panel's life.
  if (state.result && !state.summary) {
    // The recording ends with the game. See src/replay.js.
    stopRecording(state, state.result);
    // THE PLAYER'S CAMPAIGN, for the ending's tally — see src/ending.js.
    if (!REPLAY) noteBattle(state, level.startLives);
    state.summary = finish(state, level, DIFFICULTIES[state.difficultyIndex]);
    // AND WHAT THE NEW STARS EARN. See src/achievements.js.
    checkRecords();

    // AND THE PANEL ANNOUNCES ITSELF. Here rather than in `finish` because finish
    // is a record-keeper — it writes the star table — and a function that saves a
    // result should not also be the thing that makes a noise. This block is already
    // the one place both endings pass through exactly once.
    //
    // `fanfare` rather than `solo`: these ring OVER each other by design, and the
    // gate would space them seven seconds apart. See the note beside it in audio.js.
    startStars(state);
    fanfare(state.result === 'won' ? VICTORY : LOST);

    // A WIN OPENS THE NEXT PLACE ON THE ROAD, once, and only from the front of
    // it: replaying stage 1 after reaching stage 3 opens nothing, because the
    // road past it is already drawn. Saved here rather than shown here — the
    // animation belongs to the map, which the player has not gone back to yet.
    //
    // The unlock does NOT depend on the difficulty or the length. Those are two
    // ladders for how well a stage went; this is one road, and clearing a stage
    // clears it. See unlockedStages in score.js for why that is a separate key.
    // STAGE 1 WON WITH THE TUTORIAL RUNNING: the world map shows the encyclopedia and
    // the upgrades next — see makeMapTour in src/tutorial.js.
    if (state.result === 'won' && state.tutorial) state.mapTour = makeMapTour();
    if (state.result === 'won') {
      const here = stageOfLevel(state.levelIndex);
      // THE LAST STAGE WON: the ending plays on the world map — EVERY TIME, at the
      // owner's word, not only the first; its Skip is there for a player who has seen
      // it. See src/ending.js.
      if (here !== null && lastStage(here) && !REPLAY) state.pendingEnding = true;
      if (here !== null && here + 1 === state.unlocked && state.unlocked < STAGE_COUNT) {
        state.unlocked += 1;
        saveUnlocked(state.unlocked);
        state.pendingReveal = state.unlocked - 1;
      }
    }
  }

  // The world map's one moving part, and it only moves while the map is up.
  // Stepped on real time rather than through step(): it is a screen animation,
  // so the fast-forward multiplier has no business touching it.
  // None of it while the start page is up: the road a new player's map opens with
  // draws itself once they are looking at it.
  if (!state.started && !state.title) stepReveal(state, real);
  // And the world map's tour of the encyclopedia and the upgrades, once stage 1 is won.
  if (!state.started && !state.ending && !state.title) updateMapTour(state, real);
  // THE ENDING, on the world map, once the board behind it is gone and the map is at
  // rest. See src/ending.js.
  if (!state.started && state.pendingEnding && (state.stage === null || state.stage === undefined) &&
      !state.reveal && state.book === null && !state.upgrades && !state.achievements && !state.admin) {
    state.pendingEnding = false;
    startEnding(state);
  }
  if (!state.started && !state.book && !state.upgrades && !state.achievements) updateEnding(state, real);
  // The achievements' counts, saved now and then rather than every frame.
  flushAchievements();
  // AND THE NEXT POP-UP COMES IN WITH ITS SOUND — but not over the result's stars:
  // an achievement a stage's stars earned waits until the last one has rung, and a
  // second beat after it. render.js draws only a pop-up that has been let in here.
  const wall = performance.now();
  if (state.summary && state.starsShown < state.summary.stars) toastHold = wall + TOAST_AFTER_STARS;
  if (toasts[0] && !toasts[0].heard && wall >= toastHold) {
    toasts[0].heard = true;
    fanfare(ACHIEVED);
  }
  // THE PLAYER LOG's stage starts, waves and results — see src/analytics.js.
  watchGame(state);

  // THE STARS COMING OUT, one by one, each with its own chime. Out here beside the
  // map's reveal and for the same two reasons: it is a screen animation, so it runs
  // on REAL seconds rather than through step(), and it has to keep running on a
  // screen where the simulation has stopped — `state.result` is exactly what stops
  // the loop above.
  //
  // The count comes back rather than the sound being played inside score.js, which
  // keeps that file about scoring and out of the audio graph.
  for (let n = stepStars(state, real); n > 0; n--) fanfare(STAR);
  // AND WHAT THE MAP SOUNDS LIKE, every frame and in every state — including the
  // ones where the answer is silence, which is how the three loops get turned off
  // by starting a game rather than by somebody remembering to stop them.
  mapAudio(state);
  // A BOARD'S OWN BACKGROUND — birdsong, a fire crackling, a river — each a loop of
  // its own, for as long as that board is being played, paused or not, and off at the
  // result. Every clip any board uses is asked about every frame, so leaving a board
  // turns its sounds off without anybody remembering to.
  const playing = state.started && !state.result;
  const vp = state.villagerPlay;
  // A LOOP THAT WAITS FOR A TORCH (`lit`): stage 12's fire crackling, from the moment
  // the torch-lighter lights his first torch (`litAt` in src/villagers.js).
  const burning = a => a.lit === undefined || !!(vp && vp.litAt && vp.litAt[a.lit] !== undefined);
  const want = playing ? (level.ambience || []).filter(burning) : [];
  for (const clip of AMBIENT) {
    const a = want.find(x => x.clip === clip);
    setLoop(clip, !!a, a ? a.level : 1, `board_${clip}`);
  }
  // AND STAGE 4'S SMITH WELDING, while his pipe is in the fire — not on a paused
  // board, where he is held with it in.
  setLoop('steel_welding', playing && !state.paused && !reading && !!(vp && vp.welding), 1, 'board_weld');
  // AND STAGE 6'S ANGLER'S REEL, soft, for as long as he is tugging at his line.
  setLoop('fishing_reel', playing && !state.paused && !reading && !!(vp && vp.reeling), 1, 'board_reel');
  // AND STAGE 7'S FISH SIZZLING, for as long as the cook holds it over the fire.
  setLoop('fish_cooking', playing && !state.paused && !reading && !!(vp && vp.cooking), 1, 'board_cook');

  // Outside the step, so a selection is dropped even while the game is paused at
  // a result — and before the draw, so the box never renders a dead reference.
  validate(state);
  draw(ctx, state);
  requestAnimationFrame(frame);
}

function step(state, dt) {
  if (state.result) return;
  updateWaves(state, dt);
  // Units run before enemies so an enemy that just walked into a soldier is
  // already held when the movement step asks whether it may advance.
  updateUnits(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt);
  updateShots(state, dt);
  // BEFORE the decoration below and after everything that can drop one. A fuse
  // that runs out takes soldiers with it, which makes this the last thing in the
  // frame that can change the state of the board rather than the look of it.
  updateBombs(state, dt);
  // Last, so blood and bodies made by this step get their full life rather than
  // being aged by the frame that created them.
  updateCorpses(state, dt);
  updateSplats(state, dt);
  updateImpacts(state, dt);
  updateSmoke(state, dt);
  updateVillagers(state, dt);
  // A VILLAGER WHO HAS TAKEN UP A POST — stage 12's, a musketeer now — joins the
  // garrison where he stands. See `recruit` in src/villagers.js.
  if (state.villagerPlay && state.villagerPlay.recruit) {
    const r = state.villagerPlay.recruit;
    state.villagerPlay.recruit = null;
    const u = addGarrison(state, r, (level.garrison || []).length, level.id);
    // Holding his aim — his Attack drawing — before the first shot.
    if (r.aim) u.hold = r.aim;
    // A player who had him selected now has the musketeer selected.
    const sel = state.selected;
    if (sel && sel.kind === 'villager' && sel.ref === state.villagers[r.who]) state.selected = { kind: 'unit', ref: u };
  }
  // DARK HOLLOW'S VILLAGERS WHO HAVE REACHED THE ROAD are creatures on it from here:
  // a Thug or a Tough Thug where each one stands. See hollowRound in src/villagers.js.
  if (state.villagerPlay && state.villagerPlay.turned) {
    for (const t of state.villagerPlay.turned) {
      const e = spawn(state, t.type, { route: t.route, s: t.s, quiet: t.quiet });
      // A player who had him selected now has the creature selected.
      const sel = state.selected;
      if (sel && sel.kind === 'villager' && sel.ref === state.villagers[t.who]) state.selected = { kind: 'enemy', ref: e };
    }
    state.villagerPlay.turned = null;
  }
  const alerts = (state.foeAlerts || []).length;
  // THE TOWERS THIS STAGE OFFERS, a second after it starts — not on its first frame,
  // at the owner's word, so the player has the board in front of them and sees the
  // alert arrive.
  if (!state.towersNoticed) {
    state.towerWait -= dt;
    if (state.towerWait <= 0) { state.towersNoticed = true; noticeTowers(state, level); }
  }
  // AFTER EVERYTHING THAT CAN PUT A CREATURE ON THE BOARD — the waves above and
  // the villagers turning just now — so one met for the first time raises its
  // alert on the step it arrives.
  noticeFoes(state);
  // STAGE 1'S TUTORIAL, which raises cards of its own — before the chime, so they
  // sound as any other does.
  updateTutorial(state, dt);
  // AND THE ALERT SOUNDS as one goes up — once, however many arrive together.
  // Over the village's shout if the two arrive together — see chime() in audio.js.
  if ((state.foeAlerts || []).length > alerts) chime(CUE.alert);
  if (state.lives <= 0) state.result = 'lost';
}

// Art gates the first frame; sound does not. A player waiting on half a
// megabyte of mp3 before the title screen appears would rightly think the game
// was broken, and every clip is optional at every call site — one still in
// flight simply does not play. It starts alongside the art rather than after
// it, so in practice it is all there before the Start button is pressed.
//
// AND WHILE IT LOADS, A BAR: the game's name (the start page's, see NAME_SRC) and how
// much of its art has arrived, on the page's own dark colour, so the first few seconds
// are a loading screen rather than an empty box. Drawn straight onto the canvas as
// each picture lands; the first frame of the game paints over it.
//
// THE WORDS WAIT FOR THE FONT, at the owner's word: drawn before Lobster had arrived
// they showed for a moment in the system face and then changed. Until it is in (or
// has failed, or 3 seconds have passed), the screen is the bar alone.
let loadingFrac = 0, loadingWords = false, gameUp = false;
const showWords = () => { if (loadingWords) return; loadingWords = true; if (!gameUp) drawLoading(loadingFrac); };
// THE START PAGE'S NAME IN PLACE OF THE WORDS "Medieval TD", at the owner's word: the
// artist's lettering, arrow, shield, sword and torch (assets/start), fetched first and
// on its own so it is up before the rest of the art. NAME_CROP is the drawing within
// its 1920 x 1080 sheet, its shadow included. Until it has arrived the screen is the
// bar alone; if it never does, the words stand in.
const NAME_SRC = 'assets/start/Start_Page_Name.svg';
const NAME_CROP = { x: 470, y: 106, w: 922, h: 398 };
const NAME_W = 440;
let loadingName = null, nameFailed = false;
{
  const img = new Image();
  img.onload = () => { loadingName = img; if (!gameUp) drawLoading(loadingFrac); };
  img.onerror = () => { nameFailed = true; if (!gameUp) drawLoading(loadingFrac); };
  img.src = versioned(NAME_SRC);
}
mapFontReady.then(showWords);
setTimeout(showWords, 3000);
function drawLoading(frac) {
  loadingFrac = frac;
  if (gameUp) return;
  fitToDisplay();
  ctx.save();
  ctx.fillStyle = '#23201c';
  ctx.fillRect(0, 0, 960, 540);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '44px Lobster, Georgia, serif';
  if (loadingName) {
    const h = NAME_W * NAME_CROP.h / NAME_CROP.w;
    ctx.drawImage(loadingName, NAME_CROP.x, NAME_CROP.y, NAME_CROP.w, NAME_CROP.h, 480 - NAME_W / 2, 302 - h, NAME_W, h);
  } else if (loadingWords && nameFailed) ctx.fillText('Medieval TD', 480, 266);
  // The name, the bar and the count, as one group in the middle of the screen.
  const w = 360, h = 14, x = 480 - w / 2, y = 324;
  ctx.fillStyle = 'rgba(240,230,210,0.15)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = '#E0B24C';
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(h, w * frac), h, h / 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(240,230,210,0.7)';
  ctx.font = '16px Lobster, Georgia, serif';
  if (loadingWords) ctx.fillText(`Loading… ${Math.round(frac * 100)}%`, 480, 362);
  ctx.restore();
}
drawLoading(0);
loadAudio();
loadArt(drawLoading).then(() => {
  gameUp = true;
  requestAnimationFrame(frame);
  // THEN EVERY STAGE'S BOARD, quietly, the furthest stage reached first and back down
  // the road, then the ones still ahead — and each one's preview photo made as it
  // lands, so tapping a stage on the map shows it at once. Not in a replay, which
  // plays one board it has already asked for.
  if (REPLAY) return;
  const reached = Math.max(1, Math.min(STAGES.length, state.unlocked || 1));
  const order = [...Array(reached).keys()].reverse().concat([...Array(STAGES.length).keys()].slice(reached));
  const keys = order.map(i => STAGES[i].level === null ? null : levels[STAGES[i].level].art).filter(Boolean);
  prefetchBoards(keys, stagePhoto);
});
