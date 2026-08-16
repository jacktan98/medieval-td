// What a finished game was worth, and what the player has managed before.
//
// Three stars for a keep that barely got touched, two for one that held, one for
// a win that cost most of the garrison, and none for a loss. The thresholds are
// the artist's: 18 of 20 lives for three, 10 of 20 for two.
//
// THEY ARE STORED AS FRACTIONS rather than as 18 and 10, and that is the one
// liberty taken with the numbers. Every map starts with 20 lives today, so 0.9
// and 0.5 reproduce the two figures exactly; if a map ever starts with a
// different garrison, "nearly untouched" and "half of it left" are still what the
// two ratings mean, where 18 and 10 would quietly become "almost all of it" and
// "you lost".
//
// A LOSS IS ZERO STARS AND NOT ONE. The game only ends `won` when every wave is
// cleared and only ends `lost` when lives reach zero, so a win always has at
// least one life and a loss always has none — the two never meet in the middle.
const STAR_HIGH = 0.9;
const STAR_MID = 0.5;

export const MAX_STARS = 3;

export function starsFor(lives, startLives) {
  if (lives <= 0) return 0;
  if (lives >= Math.round(startLives * STAR_HIGH)) return 3;
  if (lives >= Math.round(startLives * STAR_MID)) return 2;
  return 1;
}

// What the two thresholds are in lives, for the summary to print. Derived rather
// than typed for the same reason the ratings are fractions.
export const starCuts = startLives => [
  Math.round(startLives * STAR_HIGH),
  Math.round(startLives * STAR_MID)
];

// --- what is remembered -------------------------------------------------------
//
// The BEST rating on each map at each difficulty, and nothing else. Not the last
// result, not a history: what a player wants to see beside a map button is the
// high-water mark, and a run that goes badly should never take a star away from
// one that went well.
//
// PER DIFFICULTY, because the two settings are not the same achievement. Three
// stars on Normal is a real thing and it is not three stars on Hard, and one
// number per map would let the easier setting quietly light up the harder one.
// The start page shows the row for whichever difficulty is currently selected,
// so the stars change under the map buttons as you tap between them — which is
// also the clearest way to say that they are two different ladders.
//
// localStorage is wrapped in try/catch at every touch. It throws in private
// browsing on some phones and it does not exist at all in Node, where the tools
// import this file through render.js; a game that cannot save progress should
// still be a game.
const KEY = 'medieval-td/stars';

const store = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

function load() {
  const s = store();
  if (!s) return {};
  try { return JSON.parse(s.getItem(KEY)) || {}; } catch { return {}; }
}

function persist(table) {
  const s = store();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(table)); } catch { /* full, or refused */ }
}

let table = load();

const slot = (levelId, difficultyId) => `${levelId}/${difficultyId}`;

export const bestStars = (levelId, difficultyId) => table[slot(levelId, difficultyId)] || 0;

// Returns true only when this run BEAT the record, which is what the summary
// uses to say so. A run that merely matches it is not news.
export function recordStars(levelId, difficultyId, stars) {
  const key = slot(levelId, difficultyId);
  if (stars <= (table[key] || 0)) return false;
  table[key] = stars;
  persist(table);
  return true;
}

export function clearStars() {
  table = {};
  persist(table);
}

// Everything the end-of-game panel shows, worked out ONCE at the moment the game
// ends and then kept on the state.
//
// Once, rather than per frame, because recording is a side effect: `beat` is true
// only for the run that set the record, and a summary rebuilt every frame would
// answer true on the first frame and false for the rest of the time the panel is
// on screen. It is also the only place the store is written.
export function finish(state, level, difficulty) {
  const stars = state.result === 'won' ? starsFor(state.lives, level.startLives) : 0;
  const before = bestStars(level.id, difficulty.id);
  const beat = recordStars(level.id, difficulty.id, stars);

  return {
    won: state.result === 'won',
    stars,
    best: Math.max(stars, before),
    beat,
    lives: Math.max(0, state.lives),
    startLives: level.startLives,
    // How far they got. `waveIndex` counts waves COMPLETED, so a loss on the
    // opening wave reads 0 of 8 and a win reads all of them.
    waves: Math.min(state.waveIndex, state.waves.length),
    ofWaves: state.waves.length,
    map: level.name,
    difficulty: difficulty.name
  };
}
