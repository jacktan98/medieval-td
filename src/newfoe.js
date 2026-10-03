// "NEW ENEMY!" — the alert under the gold the first time a creature walks onto the
// board, and the card it opens.
//
// The owner's ask: "Every time a player faces a new enemy, a notification pops out
// below gold numbers that is clickable. If a player clicks on it, a card with
// details on the new enemy pops out in the middle of the screen, pausing the game
// ... The player can press x button so that they can resume the game while closing
// the card. This new enemy card only appears once for each new enemy and won't
// appear anymore unless they restart the game with a fresh start with no memory."
//
// ONCE EVER, NOT ONCE A GAME. Which creatures the player has met is saved, like the
// stars, and a creature is marked met the moment its alert goes up — so an alert
// that was never opened is not offered again on the next attempt. Meeting a Thug on
// stage 1 is meeting a Thug; nobody needs to be introduced to him twice.
//
// "A FRESH START WITH NO MEMORY" is the dashboard's reset-progress button, which
// clears this with the stars and the road (see tapAdmin in src/admin.js) — and
// clearing the browser's saved data, which clears all three anyway.
//
// The geometry lives here and the drawing in render.js, the same split as book.js,
// so input.js hit-tests exactly the rects that get drawn.
import { enemyTypes } from './data/waves.js';

const KEY = 'medieval-td/met';

// Wrapped at every touch, as score.js's store is: localStorage throws in private
// browsing on some phones and is missing in Node, where the tools import this.
const store = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

function load() {
  const s = store();
  if (!s) return new Set();
  try {
    const list = JSON.parse(s.getItem(KEY));
    return new Set(Array.isArray(list) ? list.filter(id => id in enemyTypes) : []);
  } catch { return new Set(); }
}

let met = load();

function persist() {
  const s = store();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify([...met])); } catch { /* full, or refused */ }
}

export const hasMet = id => met.has(id);

// The dashboard's reset. Forgets every creature, so each one is new again.
export function forgetFoes() {
  met = new Set();
  persist();
}

// A live enemy carries its def, not its name in the table — so the name is found
// by the def. Built once; a def that is not in the table (none today) is ignored.
const ID_OF = new Map(Object.entries(enemyTypes).map(([id, d]) => [d, id]));

// --- noticing -----------------------------------------------------------------
//
// Called once a step, after everything that can put a creature on the board has
// run: the waves, and stage 15's villagers turning into Thugs. A creature never
// met before puts its alert up and is marked met there and then.
export function noticeFoes(state) {
  for (const e of state.enemies) {
    const id = ID_OF.get(e.def);
    if (!id || met.has(id)) continue;
    met.add(id);
    persist();
    (state.foeAlerts ||= []).push(id);
  }
}

// --- the alerts, under the gold -------------------------------------------------
//
// One round badge each, stacked downwards from just under the readout bars, oldest
// on top. A wave that brings two new creatures at once shows two.
export const ALERT_D = 44;                 // the badge's diameter
const ALERT_X = 14;
const ALERT_Y = 40;                        // the bars end at 32
const ALERT_STEP = ALERT_D + 10;
// How far the label tag reaches right of the badge — part of the target, because
// it is part of the picture.
export const ALERT_TAG_W = 100;

export const alertRect = i => ({
  x: ALERT_X, y: ALERT_Y + i * ALERT_STEP, w: ALERT_D + ALERT_TAG_W, h: ALERT_D
});

// Which alert a tap is on, or -1. Padded like the book footer's buttons, so a
// thumb that lands just off the badge still finds it.
const PAD = 6;
export function hitAlert(state, x, y) {
  const alerts = state.foeAlerts || [];
  for (let i = 0; i < alerts.length; i++) {
    const r = alertRect(i);
    if (x >= r.x - PAD && x <= r.x + r.w + PAD && y >= r.y - PAD && y <= r.y + r.h + PAD) return i;
  }
  return -1;
}

// --- the card -----------------------------------------------------------------
//
// Opening it takes the alert down and stops the game — main.js does not step while
// `foeCard` is set, and neither does the board's own clock. The X is the only
// thing on screen that answers a tap while it is up.
export function openFoeCard(state, i) {
  const [id] = state.foeAlerts.splice(i, 1);
  state.foeCard = id;
  state.menu = null;
  state.placing = null;
}

export const closeFoeCard = state => { state.foeCard = null; };

export const FOE_CARD = { x: 480 - 290, y: 270 - 175, w: 580, h: 350 };
export const FOE_CLOSE = { x: FOE_CARD.x + FOE_CARD.w - 46, y: FOE_CARD.y + 12, w: 34, h: 34 };
// The picture's slot, down the left of the card under the title band.
export const FOE_PICTURE = { x: FOE_CARD.x + 22, y: FOE_CARD.y + 86, w: 200, h: 240 };

export function tapFoeCard(state, x, y) {
  const b = FOE_CLOSE, p = 10;
  if (x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p) {
    closeFoeCard(state);
    return true;
  }
  return false;
}
