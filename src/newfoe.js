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
import { SCALE } from './data/towers.js';
import { INFO_PORTRAIT } from './data/ui.js';

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

// --- the medallion ----------------------------------------------------------------
//
// THE INFO BOX'S OWN, at the owner's word: "make the medallion and unit image same
// size as the ones in description panel". So the figure is drawn at INFO_PORTRAIT *
// SCALE, as the info box draws every portrait, and the ring grows from 36 until the
// drawing's top corners are inside it, with the feet 0.62 of the radius below the
// middle. drawInfo in render.js asks this too, so the two cannot drift apart.
export const MEDALLION_FEET = 0.62;
export function medallionOf(trim) {
  const dw = trim ? trim[2] * SCALE * INFO_PORTRAIT : 58;
  const dh = trim ? trim[3] * SCALE * INFO_PORTRAIT : 50;
  let R = 36;
  while (Math.hypot(dw / 2, dh - MEDALLION_FEET * R) > R - 3) R++;
  return { dw, dh, R };
}

// --- the alerts, under the gold -------------------------------------------------
//
// One medallion each with its bar, stacked downwards from just under the readout
// bars, oldest on top. A wave that brings two new creatures at once shows two.
// Each is as tall as its own medallion, so a giant's sits a little lower than a
// thug's would.
const ALERT_X = 12;
const ALERT_Y = 38;                        // the bars end at 32
const ALERT_GAP = 6;
// How far the bar reaches right of the medallion's middle — part of the target,
// because it is part of the picture.
export const ALERT_BAR_W = 140;
export const ALERT_BAR_H = 28;

export function alertRects(state) {
  let y = ALERT_Y;
  return (state.foeAlerts || []).map(id => {
    const d = enemyTypes[id];
    const m = medallionOf(d && d.spriteTrim);
    const cx = ALERT_X + m.R, cy = y + m.R;
    const r = { id, ...m, cx, cy, feet: cy + MEDALLION_FEET * m.R,
      x: ALERT_X, y, w: m.R + ALERT_BAR_W, h: 2 * m.R };
    y += 2 * m.R + ALERT_GAP;
    return r;
  });
}

// Which alert a tap is on, or -1. Padded like the book footer's buttons, so a
// thumb that lands just off the medallion still finds it.
const PAD = 4;
export function hitAlert(state, x, y) {
  return alertRects(state).findIndex(r =>
    x >= r.x - PAD && x <= r.x + r.w + PAD && y >= r.y - PAD && y <= r.y + r.h + PAD);
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

// THE CARD IS SIZED BY render.js, which is the only place that knows how big the
// picture can be drawn on this screen and how long the description wraps — see
// drawFoeCard. It leaves the X where it drew it, here, so the tap and the picture
// are the same rect.
export const FOE_CLOSE = { x: 0, y: 0, w: 30, h: 30 };

export function tapFoeCard(state, x, y) {
  const b = FOE_CLOSE, p = 10;
  if (x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p) {
    closeFoeCard(state);
    return true;
  }
  return false;
}
