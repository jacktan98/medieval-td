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
import { DIFFICULTIES } from './data/difficulty.js';

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
// It does run DOWNWARDS, though — a Hard result fills in the Normal one. See
// recordStars, where the asymmetry is the whole of the argument.
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

// WHERE A RESULT IS FILED, and Normal deliberately keeps the key it has always
// had. A map has two lengths now, and they are two separate records — clearing
// eight waves is not clearing ten — so Extended carries a suffix and Normal
// carries none. Written this way round so that every star already saved on
// somebody's phone still counts: adding the mode to the key unconditionally would
// have quietly wiped the board for everyone who had played before today.
const slot = (levelId, difficultyId, modeId = 'normal') =>
  `${levelId}${modeId === 'normal' ? '' : '+' + modeId}/${difficultyId}`;

export const bestStars = (levelId, difficultyId, modeId) =>
  table[slot(levelId, difficultyId, modeId)] || 0;

// The settings that are strictly easier than a given one. DIFFICULTIES is listed
// on the title screen in the order it is written, easiest first, and that order IS
// the ranking — there is one lever between the two entries and Hard turns it up.
// A third setting inserted in the right place therefore needs no code here.
function easierThan(difficultyId) {
  const i = DIFFICULTIES.findIndex(d => d.id === difficultyId);
  return i <= 0 ? [] : DIFFICULTIES.slice(0, i).map(d => d.id);
}

// Returns true only when this run BEAT the record AT THE SETTING IT WAS PLAYED
// ON, which is what the summary uses to say so. A run that merely matches it is
// not news, and neither is a record filled in below it by the rule that follows.
//
// THREE STARS ON HARD IS THREE STARS ON NORMAL, and on anything else below it.
// The two ladders are still two ladders — that is what the note above is about,
// and the easier setting must never light up the harder one — but the implication
// runs one way and it is not symmetric. Hard sends the full table through the map
// on a smaller purse where Normal thins it to four fifths and pays 10% more for
// the privilege, so a keep that finished it untouched has, by any reading a
// player would accept, done the Normal run as well. Making them go back and
// prove it on the easier setting is book-keeping, not an achievement.
//
// It fills in rather than overwrites: `stars >` at each rung, so a better Normal
// record already standing is left alone.
export function recordStars(levelId, difficultyId, stars, modeId) {
  const key = slot(levelId, difficultyId, modeId);
  const beat = stars > (table[key] || 0);
  if (beat) table[key] = stars;

  // THE FILL-IN STAYS INSIDE ONE LENGTH. Three stars on Hard is three stars on
  // Normal difficulty at the SAME length — an Extended run says nothing about a
  // Normal one, because it is a different map's worth of waves rather than the
  // same map turned up.
  let filled = false;
  for (const id of easierThan(difficultyId)) {
    const below = slot(levelId, id, modeId);
    if (stars > (table[below] || 0)) { table[below] = stars; filled = true; }
  }

  if (beat || filled) persist(table);
  return beat;
}

export function clearStars() {
  table = {};
  persist(table);
}

// SET a record rather than beat one, and the difference is the whole reason it
// exists. recordStars only ever raises — a run that did worse than your best does
// not overwrite it, which is right for playing and useless for testing, because
// there is then no way back down from three stars without wiping the table.
//
// Only the dashboard's Road tab calls it. Nothing in a played game does, and it
// does NOT fill in the easier difficulties the way recordStars does: this writes
// the one slot it is given and no other.
export function setStars(levelId, difficultyId, modeId, stars) {
  const key = slot(levelId, difficultyId, modeId);
  if (stars > 0) table[key] = stars;
  else delete table[key];
  persist(table);
}

// --- HOW FAR ALONG THE ROAD THE PLAYER HAS GOT -------------------------------
//
// A SEPARATE KEY FROM THE STARS, and separate on purpose. A star record is per
// map, per difficulty and per length — three ladders that say how WELL a stage
// went. This is one number that says how far the campaign has opened, and it is
// none of those things: beating stage 2 on Easy opens stage 3 exactly as beating
// it on Hard does. Filing it in the stars table would have meant inventing an
// answer to "unlocked at which difficulty", and there isn't one.
//
// The value is a COUNT, not an index: 0 is a player who has never seen the map,
// which is the state the opening animation plays for, and 1 is a player standing
// on stage 1 with nothing cleared. Same try/catch treatment as the stars for the
// same reason — a game that cannot save progress should still be a game.
const PROGRESS_KEY = 'medieval-td/progress';

// NULL AND ZERO ARE DIFFERENT ANSWERS, and the difference is the whole reason
// this returns null at all. Null means NOTHING HAS EVER BEEN WRITTEN — a player
// who predates the key, whose progress has to be worked out from their star
// records instead (see openedStages in overview.js). Zero means somebody wrote a
// zero on purpose: the campaign was reset, and it must NOT be seeded back from
// the stars that are still sitting there.
//
// Collapsing the two is how a reset button appears to do nothing.
export function unlockedStages() {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(PROGRESS_KEY);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch { return null; }
}

export function saveUnlocked(n) {
  const s = store();
  if (!s) return;
  try { s.setItem(PROGRESS_KEY, String(n)); } catch { /* full, or refused */ }
}

// Back to a player who has never walked the road, so the opening animation plays
// again. Writes an explicit zero rather than removing the key, for the reason
// above — and leaves the STAR RECORDS alone, because they are not progress. What
// a stage was beaten with and how far the road has opened are two different
// facts, and resetting one should not throw away the other.
export const resetProgress = () => saveUnlocked(0);

// Everything the end-of-game panel shows, worked out ONCE at the moment the game
// ends and then kept on the state.
//
// Once, rather than per frame, because recording is a side effect: `beat` is true
// only for the run that set the record, and a summary rebuilt every frame would
// answer true on the first frame and false for the rest of the time the panel is
// on screen. It is also the only place the store is written.
export function finish(state, level, difficulty, mode) {
  const stars = state.result === 'won' ? starsFor(state.lives, level.startLives) : 0;
  const before = bestStars(level.id, difficulty.id, mode && mode.id);
  const beat = recordStars(level.id, difficulty.id, stars, mode && mode.id);

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
    difficulty: difficulty.name,
    // The length, for the summary line. Two records per map per difficulty now,
    // and a summary that did not say which one this was would be the same panel
    // for two different achievements.
    mode: mode ? mode.name : 'Normal'
  };
}
