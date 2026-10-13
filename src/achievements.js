// THE ACHIEVEMENTS: what the player has earned, what they are counting towards, and
// the pop-up that says so. Their names and words are in src/data/achievements.js;
// the page that lists them is drawn by render.js from src/achievepage.js.
//
// Saved like the stars and the upgrades — one small table in localStorage, wrapped
// at every touch, because it throws in private browsing on some phones and is
// missing in Node, where the tools import this.
//
// NOTHING COUNTS UNTIL main.js SAYS SO. The game turns counting on as it starts;
// the replay viewer does not (a game watched again is not a game played again), and
// neither do the test pages and the tools, which play thousands of battles nobody
// earned anything in.
//
// COUNTED ACROSS THE WHOLE CAMPAIGN, every stage and every visit, except Grand
// Arsenal, which is about one stage: see noteTier4.
import { ACHIEVEMENTS } from './data/achievements.js';
import { STAGES } from './data/overview.js';
import { levels } from './level.js';
import { bestStars, MAX_STARS } from './score.js';
import { UPGRADES, UPGRADE_FAMILIES } from './data/upgrades.js';
import { boughtIn } from './upgrades.js';
import { families } from './data/towers.js';

const KEY = 'medieval-td/achievements';

const store = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

const blank = () => ({ got: {}, n: {}, book: [], off: [], tier4: 0 });

function load() {
  const s = store();
  if (!s) return blank();
  try {
    const raw = JSON.parse(s.getItem(KEY)) || {};
    return {
      got: raw.got && typeof raw.got === 'object' ? raw.got : {},
      n: raw.n && typeof raw.n === 'object' ? raw.n : {},
      book: Array.isArray(raw.book) ? raw.book : [],
      off: Array.isArray(raw.off) ? raw.off : [],
      tier4: Number(raw.tier4) || 0
    };
  } catch { return blank(); }
}

let saved = load();

function persist() {
  const s = store();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(saved)); } catch { /* full, or refused */ }
}

let live = false;
export function countAchievements(on = true) { live = !!on; }

export const byId = id => ACHIEVEMENTS.find(a => a.id === id);
export const earned = id => !!saved.got[id];
export const earnedCount = () => ACHIEVEMENTS.filter(a => saved.got[a.id]).length;

// --- the pop-up -------------------------------------------------------------------
//
// One at a time, in the order they were earned, at the top right. render.js draws
// the first and drops it when it has faded; `at` is set the first time it is drawn,
// so one earned behind a loading screen still gets its full few seconds.
export const toasts = [];

function award(id) {
  if (saved.got[id] || !byId(id)) return;
  saved.got[id] = Date.now();
  persist();
  toasts.push({ id, at: null });
  // THREE STARS ON HARD IS THREE STARS ON NORMAL, as the star table already says.
  if (id === 'hard') award('normal');
}

// --- the stages -------------------------------------------------------------------
//
// STAGES BY NUMBER, 1 to 16, as the map counts them.
const levelIdOf = n => levels[STAGES[n - 1].level].id;
const REGIONS = {
  winchester: [3, 4, 5],
  dawnford: [6, 7, 8],
  ironforge: [10, 11, 12],
  hollow: [14, 15, 16]
};
const ALL = STAGES.map((_, i) => i + 1);
const perfect = (n, diff) => diff
  ? bestStars(levelIdOf(n), diff) >= MAX_STARS
  : ['normal', 'hard'].some(d => bestStars(levelIdOf(n), d) >= MAX_STARS);
const perfects = (list, diff) => list.filter(n => perfect(n, diff)).length;

const rungs = () => UPGRADE_FAMILIES.reduce((n, f) => n + UPGRADES[f].length, 0);
const rungsBought = () => UPGRADE_FAMILIES.reduce((n, f) => n + Math.min(boughtIn(f), UPGRADES[f].length), 0);

// EVERYTHING THAT IS A FACT ABOUT THE SAVE rather than a count: the stars and the
// upgrades. Asked after a stage is finished, after an upgrade is bought, and once
// as the game loads, so a player who had already done these before achievements
// existed is given them — quietly, without a pop-up for each.
export function checkRecords({ quiet = false } = {}) {
  if (!live) return;
  const before = toasts.length;
  if (perfect(1)) award('tutorial');
  if (perfects(ALL, 'hard') === ALL.length) award('hard');
  if (perfects(ALL, 'normal') === ALL.length) award('normal');
  for (const [id, list] of Object.entries(REGIONS))
    if (perfects(list) === list.length) award(id);
  if (rungsBought() >= rungs()) award('upgrades');
  if (quiet) toasts.splice(before);
}

// --- the counts -------------------------------------------------------------------

// ADDS TO A COUNT and awards it at its goal. Fractions are kept (a burn deals a
// little every frame) and the page shows the whole number.
export function note(id, by = 1) {
  if (!live || saved.got[id]) return;
  const a = byId(id);
  if (!a) return;
  saved.n[id] = (saved.n[id] || 0) + by;
  if (saved.n[id] >= a.goal) award(id);
  dirty = true;
}

// A COUNT THAT CHANGES EVERY FRAME is not written every frame: `dirty` is saved
// once a second by flushAchievements, which main.js calls. An award saves at once.
let dirty = false;
let lastFlush = 0;
export function flushAchievements(now = Date.now()) {
  if (!dirty || now - lastFlush < 1000) return;
  dirty = false;
  lastFlush = now;
  persist();
}

// ADDS TO A SET — a picture in the book, an enemy off the road — and awards it when
// the set is whole. A key already in it changes nothing.
function noteOnce(id, list, key) {
  if (!live || saved.got[id]) return;
  if (!saved[list].includes(key)) {
    saved[list].push(key);
    persist();
  }
  if (saved[list].length >= byId(id).goal) award(id);
}

// A picture in the encyclopedia opened large: its page and its place on the page.
export const noteBookPicture = (page, i) => noteOnce('book', 'book', `${page}:${i}`);

// THE ENEMIES WAITING OFF THE ROAD, by board and by their place in its `villagers`
// list: stage 14's five, stage 15's two by the huts (the smiths work on and the men
// behind the wall are not tapped onto the road), and stage 16's four thugs and six
// perched crows. tools/achievements.mjs holds this against the boards.
export const OFFROAD = {
  m16: [0, 1, 2, 3, 4],
  m17: [11, 12],
  m18: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
};
// FRIEND OF THE PEOPLE counts the people: not Dark Hollow's thugs and enemy villagers,
// and not its crows, at the owner's word.
const NOT_PEOPLE = ['enemy_villager', 'enemy_box', 'enemy_anvil', 'enemy_steel', 'perched_crow'];
export function noteVillagerTap(levelId, v) {
  if (!NOT_PEOPLE.includes(v.voice)) note('villagers');
  if (OFFROAD[levelId] && OFFROAD[levelId].includes(v.n)) noteOnce('offroad', 'off', `${levelId}:${v.n}`);
}

// GRAND ARSENAL: every tier 4 tower, each built at some point in ONE stage — sold
// and built again counts, so a board with fewer plots than there are towers can
// still be done. The stage's own list lives on the game state, which a new stage
// rebuilds; the best any stage has reached is kept for the progress line.
export const TIER4 = families.flatMap(f => f.tiers.slice(3).map(d => d.name));
export function noteTier4(state, def) {
  if (!live || !TIER4.includes(def.name)) return;
  const had = state.tier4 || (state.tier4 = []);
  if (!had.includes(def.name)) had.push(def.name);
  if (had.length > saved.tier4) { saved.tier4 = had.length; persist(); }
  if (had.length >= TIER4.length) award('tier4');
}

// --- the page ---------------------------------------------------------------------

// How far along one is, as [done, goal], or null for one with no count.
export function progressOf(id) {
  const a = byId(id);
  if (!a || !a.goal) return null;
  const done = saved.got[id] ? a.goal
    : id === 'normal' || id === 'hard' ? perfects(ALL, id)
    : REGIONS[id] ? perfects(REGIONS[id])
    : id === 'upgrades' ? rungsBought()
    : id === 'book' ? saved.book.length
    : id === 'offroad' ? saved.off.length
    : id === 'tier4' ? saved.tier4
    : Math.floor(saved.n[id] || 0);
  return [Math.min(done, a.goal), a.goal];
}

// When it was earned, as a time, or null.
export const earnedAt = id => saved.got[id] || null;

// FORGOTTEN, for the dashboard's campaign reset: nothing earned, nothing counted.
export function clearAchievements() {
  saved = blank();
  toasts.length = 0;
  persist();
}

// For tests: the table as it stands, and a way to set it.
export const achievementsForTest = () => saved;
export function setAchievementsForTest(table) { saved = { ...blank(), ...table }; }
