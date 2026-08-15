import { loadArt } from './assets.js';
import { loadAudio } from './audio.js';
import { level } from './level.js';
import { openingDelay } from './data/waves.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, scaleWaves, startingGold } from './data/difficulty.js';
import { updateEnemies } from './enemies.js';
import { updateTowers, frameOf } from './towers.js';
import { updateUnits } from './units.js';
import { updateShots } from './projectiles.js';
import { updateCorpses } from './corpses.js';
import { updateSplats } from './blood.js';
import { updateImpacts } from './impacts.js';
import { updateWaves } from './waves.js';
import { draw, tierMarks } from './render.js';
import { attachInput } from './input.js';
import { validate, selectionInfo } from './select.js';

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
const MAX_SCALE = 3;   // caps fill rate on very dense displays

function fitToDisplay() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(MAX_SCALE, Math.max(1, (rect.width / 960) * dpr));
  const w = Math.round(960 * scale);
  const h = Math.round(540 * scale);

  // Assigning width or height clears the canvas and resets the context, so
  // only do it when the size actually changed.
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(w / 960, 0, 0, h / 540, 0, 0);
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

  Object.assign(state, {
    levelIndex,
    difficultyIndex,
    // THE WAVES THIS GAME WILL ACTUALLY SEND, scaled once here rather than read
    // through the level every frame. Two things depend on that: `waveSize` and
    // the spawn loop have to agree exactly about how many enemies a group holds,
    // and they cannot if each of them rounds a multiplication separately.
    waves: scaleWaves(level.waves, difficulty),
    gold: startingGold(level, difficulty),
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
    // A half-pressed Quit, as the ms timestamp its window closes at. 0 for not
    // armed, which is also what it resets to — a restart cannot inherit one.
    quitArmed: 0,
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
  if (state.lives <= 0) state.result = 'lost';
}

// Art gates the first frame; sound does not. A player waiting on half a
// megabyte of mp3 before the title screen appears would rightly think the game
// was broken, and every clip is optional at every call site — one still in
// flight simply does not play. It starts alongside the art rather than after
// it, so in practice it is all there before the Start button is pressed.
loadAudio();
loadArt().then(() => requestAnimationFrame(frame));
