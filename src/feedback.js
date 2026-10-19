// THE FEEDBACK FORM, at the owner's word: a Google Form, opened in a new tab from the
// settings panel (src/settings.js) and from under the ending's credits (src/ending.js).
//
// FILLED IN BEFORE IT OPENS: what the game knows for certain — the device, how far
// along the road the player has got, and the difficulty they have won at — so the
// player types less and the owner knows where each answer came from. Nothing else is
// filled in: the opinions are the player's. The player can change any of it.
//
// THE `entry.` NUMBERS are the form's own, from its pre-filled link. A choice is
// ticked only when the word sent matches the form's option word for word, so the
// words below are the form's options: "Computer", "Android phone or tablet",
// "iPhone or iPad"; "Normal", "Hard", "Both".
//
// OPENED AS THE FINGER LIFTS, as Full screen is: a browser lets a page open a tab only
// from the player's own press. The tap asks (`state.wantFeedback`) and input.js
// answers on pointerup.
import { STAGES, STAGE_COUNT, playable } from './data/overview.js';
import { levels } from './level.js';
import { bestStars, savedDifficulty } from './score.js';
import { DIFFICULTIES } from './data/difficulty.js';

const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf7B1byD8PJsh2vcflfOnigbjUA8e2BOwVI5QF9UNFYCeWgAQ/viewform';
const ENTRY = { device: 'entry.1061187526', stage: 'entry.634020165', difficulty: 'entry.2068689737' };

function device() {
  const nav = globalThis.navigator || {}, ua = nav.userAgent || '';
  // An iPad says it is a Mac, and gives itself away by its touch screen.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return 'iPhone or iPad';
  if (/Android/.test(ua)) return 'Android phone or tablet';
  return 'Computer';
}

const cleared = (i, diff) => {
  const id = levels[STAGES[i].level].id;
  return diff ? bestStars(id, diff) > 0 : DIFFICULTIES.some(d => bestStars(id, d.id) > 0);
};
const stages = () => [...Array(STAGE_COUNT).keys()].filter(playable);

// HOW FAR: the stage the player is up to — the one after the last they have won.
function stage() {
  const all = stages();
  const won = all.filter(i => cleared(i)).length;
  if (all.length && won === all.length) return `Finished all ${all.length} stages`;
  return `Stage ${won + 1}`;
}

// WHICH DIFFICULTY: by the wins. A Hard win fills in the Normal stars as well (see
// recordStars in src/score.js), so "Both" is a stage won on Normal and not on Hard
// beside one won on Hard. No win yet: the difficulty last chosen.
function difficulty() {
  const all = stages();
  const hard = all.some(i => cleared(i, 'hard'));
  const normal = all.some(i => cleared(i, 'normal') && !cleared(i, 'hard'));
  if (hard && normal) return 'Both';
  if (hard) return 'Hard';
  if (normal) return 'Normal';
  return DIFFICULTIES[savedDifficulty() ?? 0].name;
}

export function feedbackUrl() {
  const q = new URLSearchParams({ usp: 'pp_url' });
  q.set(ENTRY.device, device());
  q.set(ENTRY.stage, stage());
  q.set(ENTRY.difficulty, difficulty());
  return `${FORM}?${q}`;
}

export function openFeedback() {
  try { globalThis.open?.(feedbackUrl(), '_blank', 'noopener'); } catch { /* no tab for us */ }
}
