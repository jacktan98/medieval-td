// THE PLAYER'S TOTALS, at the owner's word: page 2 of the achievements screen, behind
// its Stats button. Every battle adds to them — stages won and lost, enemies
// defeated, gold earned and spent, towers built by family, bosses brought down,
// villagers greeted, lives lost and time spent in battle — and they are kept on the
// player's own device, as the achievements are.
//
// COUNTED HERE AND NOWHERE ELSE. The achievements stop counting a thing once it is
// earned and the player log (src/analytics.js) keeps only its latest events, so
// neither can say how many enemies a player has defeated in all. These are plain
// running totals that never stop.
//
// NOT IN A REPLAY, which is somebody watching a game rather than playing one, and
// written at most once a second (flushStats, from the frame loop): time in battle
// changes every frame.
import { families } from './data/towers.js';

export const STATS_KEY = 'medieval-td/stats';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

const blank = () => ({ won: 0, lost: 0, kills: 0, bosses: 0, goldEarned: 0, goldSpent: 0,
  towers: {}, villagers: 0, lives: 0, seconds: 0 });

let saved = (() => {
  try { return { ...blank(), ...(JSON.parse(store()?.getItem(STATS_KEY)) || {}) }; } catch { return blank(); }
})();
let dirty = false;
const live = () => !globalThis.__replayRun;

// ADDS TO A TOTAL. `key` is one of blank()'s.
export function stat(key, by = 1) {
  if (!live() || !by) return;
  saved[key] = (saved[key] || 0) + by;
  dirty = true;
}

// A TOWER BUILT, by its family, for the favourite.
export function statTower(familyId) {
  if (!live()) return;
  saved.towers[familyId] = (saved.towers[familyId] || 0) + 1;
  dirty = true;
}

let lastFlush = 0;
export function flushStats(now = Date.now()) {
  if (!dirty || now - lastFlush < 1000) return;
  dirty = false;
  lastFlush = now;
  try { store()?.setItem(STATS_KEY, JSON.stringify(saved)); } catch { /* full or private: this visit only */ }
}

// FORGOTTEN, for the dashboard's campaign reset, with the achievements.
export function clearStats() {
  saved = blank();
  dirty = true;
  lastFlush = 0;
  flushStats();
}

export const stats = () => saved;
export const towersBuilt = () => Object.values(saved.towers).reduce((n, k) => n + k, 0);

// THE FAMILY BUILT MOST, by the name the game gives it ("Archery", "Artillery"), or
// null before the first tower. A tie goes to the one first in the build menu.
export function favouriteTower() {
  let best = null, most = 0;
  for (const f of families) {
    const k = saved.towers[f.id] || 0;
    if (k > most) { most = k; best = f; }
  }
  return best ? best.tiers[0].title.replace(/^Tier 1 /, '') : null;
}

// TIME IN BATTLE as the page shows it: "2 h 15 m", "45 m", "0 m".
export function playTime(seconds = saved.seconds) {
  const m = Math.floor(seconds / 60), h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} m` : `${m} m`;
}
