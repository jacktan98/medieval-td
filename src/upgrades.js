// WHAT THE PLAYER HAS BOUGHT WITH STARS, and what the game does about it.
//
// Saved like the stars are — a small table in localStorage, wrapped at every
// touch, because it throws in private browsing on some phones and is missing in
// Node, where the tools import this. A game that cannot save is still a game; it
// just starts every session with nothing bought, which is also exactly what every
// tool sees, so no check written before upgrades existed can tell they do.
//
// THE TABLE IS A COUNT PER FAMILY — { archery: 2 } is the first two rungs — and
// not a list of rungs, because the rungs are bought in order. A count cannot say
// "the third without the second", so that rule needs no enforcing anywhere else.
import { UPGRADES, UPGRADE_COSTS, UPGRADE_FAMILIES } from './data/upgrades.js';
import { STAGES } from './data/overview.js';
import { levels } from './level.js';
import { bestStars } from './score.js';
import { DIFFICULTIES } from './data/difficulty.js';

const KEY = 'medieval-td/upgrades';

const store = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

function load() {
  const s = store();
  const out = {};
  for (const f of UPGRADE_FAMILIES) out[f] = 0;
  if (!s) return out;
  try {
    const raw = JSON.parse(s.getItem(KEY)) || {};
    for (const f of UPGRADE_FAMILIES) {
      const n = Math.floor(Number(raw[f]));
      out[f] = Number.isFinite(n) ? Math.max(0, Math.min(UPGRADES[f].length, n)) : 0;
    }
  } catch { /* a bad blob is nothing bought */ }
  return out;
}

let bought = load();
// What the bought rungs add up to, per family — see upgradeFx below. Dropped by
// anything that changes what is bought.
let cache = null;

function persist() {
  const s = store();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(bought)); } catch { /* full, or refused */ }
}

// How many rungs of a family are bought.
export const boughtIn = fam => bought[fam] || 0;

// --- the budget ------------------------------------------------------------------
//
// STARS EARNED are the ones the world map shows: each stage's BEST, across every
// difficulty and both lengths, so a stage is worth at most three however many ways
// it has been beaten. Read fresh rather than kept, so a run that earns a star is in
// the budget the moment the player is back on the map.
export function starsEarned() {
  let n = 0;
  for (const s of STAGES) {
    if (s.level === null || !levels[s.level]) continue;
    const id = levels[s.level].id;
    let best = 0;
    for (const d of DIFFICULTIES) best = Math.max(best, bestStars(id, d.id));
    n += best;
  }
  return n;
}

export function starsSpent() {
  let n = 0;
  for (const f of UPGRADE_FAMILIES) for (let i = 0; i < boughtIn(f); i++) n += UPGRADE_COSTS[i];
  return n;
}

// Never below zero on the screen. It can be, underneath: the dashboard can take
// stars away after they were spent, and then nothing more can be bought until the
// player earns their way back — which is the honest reading of an overdraft.
export const starsLeft = () => Math.max(0, starsEarned() - starsSpent());

// --- buying ----------------------------------------------------------------------

// What a rung is to the player right now: 'bought', 'next' (the one above the
// last bought — the only one that can be bought) or 'locked'.
export function rungState(fam, i) {
  const n = boughtIn(fam);
  return i < n ? 'bought' : i === n ? 'next' : 'locked';
}

export const canBuy = (fam, i) =>
  rungState(fam, i) === 'next' && starsEarned() - starsSpent() >= UPGRADE_COSTS[i];

export function buy(fam, i) {
  if (!canBuy(fam, i)) return false;
  bought[fam] = i + 1;
  persist();
  cache = null;
  return true;
}

// Every star back, every rung unbought — the screen's Reset, and the dashboard's
// reset-progress, which is a fresh start in every respect.
export function resetUpgrades() {
  for (const f of UPGRADE_FAMILIES) bought[f] = 0;
  persist();
  cache = null;
}

// --- what the game asks --------------------------------------------------------
//
// Every effect the bought rungs of one family add up to, as one object: the
// multipliers multiplied, the additions added, and the chances kept as the rung
// wrote them. Rebuilt on every purchase rather than on every shot.
function effectsOf(fam) {
  const fx = { rangeTimes: 1, damageTimes: 1, reloadTimes: 1, splashTimes: 1, hpTimes: 1,
    blowTimes: 1, respawnLess: 0, deathSave: 0, crit: null, stun: null, slow: null };
  for (const u of (UPGRADES[fam] || []).slice(0, boughtIn(fam))) {
    for (const k of ['rangeTimes', 'damageTimes', 'reloadTimes', 'splashTimes', 'hpTimes', 'blowTimes'])
      if (u[k]) fx[k] *= u[k];
    for (const k of ['respawnLess', 'deathSave']) if (u[k]) fx[k] += u[k];
    for (const k of ['crit', 'stun', 'slow']) if (u[k]) fx[k] = u[k];
  }
  return fx;
}

const NONE = effectsOf('');
const refresh = () => { cache = Object.fromEntries(UPGRADE_FAMILIES.map(f => [f, effectsOf(f)])); };

// Everything the bought upgrades do to a family, or nothing for a family with no
// upgrades (or none at all, which is every tool).
export function upgradeFx(fam) {
  if (!cache) refresh();
  return cache[fam] || NONE;
}

// For the tools: put a table in place without a store, and read it back.
export function setBoughtForTest(table) {
  for (const f of UPGRADE_FAMILIES) bought[f] = table[f] || 0;
  cache = null;
}
