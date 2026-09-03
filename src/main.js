import { loadArt } from './assets.js';
import { loadAudio } from './audio.js';
import { level } from './level.js';
import { openingDelay, MODES } from './data/waves.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, scaleWaves, startingGold } from './data/difficulty.js';
import { adminWaves, adminGold } from './admin.js';
import { finish } from './score.js';
import { updateEnemies } from './enemies.js';
import { updateTowers, frameOf } from './towers.js';
import { updateUnits } from './units.js';
import { updateShots } from './projectiles.js';
import { updateCorpses } from './corpses.js';
import { updateSplats } from './blood.js';
import { updateImpacts } from './impacts.js';
import { updateSmoke } from './smoke.js';
import { updateWaves } from './waves.js';
import { draw, tierMarks, setDeviceScale } from './render.js';
import { attachInput } from './input.js';
import { validate, selectionInfo } from './select.js';
import { canvasScale } from './data/ui.js';

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

const state = {};

function newGame() {
  // Survives the reset: the map the player chose is a menu setting, not part of
  // the game being reset. Without this, switching to map 2 on the title screen
  // would bounce straight back to map 1, and so would losing a game on it.
  const levelIndex = state.levelIndex ?? 0;
  // Survives the reset for the same reason the map does: it is a menu setting
  // rather than part of the game being reset.
  const difficultyIndex = state.difficultyIndex ?? DEFAULT_DIFFICULTY;
  const difficulty = DIFFICULTIES[difficultyIndex];
  // WHICH LENGTH, and it survives a reset for the same reason the map and the
  // difficulty do: it is a menu setting rather than part of the game being reset.
  const modeIndex = state.modeIndex ?? 0;
  const mode = MODES[modeIndex];

  Object.assign(state, {
    levelIndex,
    difficultyIndex,
    modeIndex,
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
    waves: scaleWaves(adminWaves(level, mode.id), difficulty),
    // The same two layers the wave table above has, in the same order: the
    // dashboard replaces the map's own purse, and the difficulty scales what it
    // finds. A purse dialled to 2000 for testing is still 2200 on Easy.
    gold: startingGold(adminGold(level), difficulty),
    lives: level.startLives,
    towers: [],
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
    waveIndex: 0,
    spawned: 0,
    timer: openingDelay,
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
    // The admin dashboard, or null for closed. Cleared with everything else for
    // the same reason the book is: a panel left open across a rebuild would be
    // sitting on top of a game it no longer describes.
    admin: null,
    // What the end-of-game panel shows, built ONCE at the moment the game ends —
    // see finish() in score.js, which also writes the star record. Null until
    // then, and null again on a restart.
    summary: null,
    // What the info box is describing: { kind, ref } or null. A direct reference
    // to the live enemy, soldier or tower, which is what makes the health in the
    // box the same number the health bar over its head is reading.
    selected: null
  });
}

newGame();
attachInput(canvas, state, newGame);

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
  window.__game = { state, level, frameOf, selectionInfo, tierMarks };
}

let last = performance.now();

function frame(now) {
  fitToDisplay();

  // Clamp dt so a backgrounded tab doesn't teleport every enemy into the keep.
  // The clamp is applied BEFORE the fast-forward multiplier, so 2x is exactly
  // two normal steps' worth of time and never a single huge one — a big step
  // walks enemies straight through a blocker's ENGAGE radius without stopping.
  const real = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (state.started && !state.paused && !state.result) {
    for (let i = 0; i < state.speed; i++) step(state, real);
  }

  // The moment a game ends, once. Outside the step because a result can be set
  // by either of two places — updateWaves for a win, the lives check for a loss —
  // and this is the one line both of them pass through afterwards.
  //
  // It has a side effect: it writes the star record. That is why it is guarded on
  // `summary` being null rather than rebuilt each frame — "did this run beat your
  // best" is true exactly once, and a summary recomputed every frame would say so
  // for one frame and then contradict itself for the rest of the panel's life.
  if (state.result && !state.summary) {
    state.summary = finish(state, level, DIFFICULTIES[state.difficultyIndex], MODES[state.modeIndex ?? 0]);
  }

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
  // Last, so blood and bodies made by this step get their full life rather than
  // being aged by the frame that created them.
  updateCorpses(state, dt);
  updateSplats(state, dt);
  updateImpacts(state, dt);
  updateSmoke(state, dt);
  if (state.lives <= 0) state.result = 'lost';
}

// Art gates the first frame; sound does not. A player waiting on half a
// megabyte of mp3 before the title screen appears would rightly think the game
// was broken, and every clip is optional at every call site — one still in
// flight simply does not play. It starts alongside the art rather than after
// it, so in practice it is all there before the Start button is pressed.
loadAudio();
loadArt().then(() => requestAnimationFrame(frame));
