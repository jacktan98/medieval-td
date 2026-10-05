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
import { SCALE, families } from './data/towers.js';
import { INFO_PORTRAIT } from './data/ui.js';
import { levels } from './level.js';
import { STAGES } from './data/overview.js';
import { sealOf } from './score.js';

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

// --- the towers the player has been offered -----------------------------------------
//
// "NEW TOWER!", at the owner's word: "create a new unit/tower notification once a stage
// with new tower starts (just like new enemy style). The image used will be the unit
// not the tower." And the encyclopedia locks what has not been offered yet — a tower,
// the man it musters and the abilities it teaches go together.
//
// A TOWER IS OFFERED BY A STAGE THAT LETS IT BE BUILT — its tier inside the board's
// cap, or named on its `allow` list — and it is marked offered the moment that stage
// STARTS, as a creature is marked met the moment it walks on. Saved, like `met`.
const TOWERS_KEY = 'medieval-td/towers';

// Every tower a board lets the player build, by name — the build menu's own rule
// (`capped` in src/menu.js).
export const offeredOn = lv => families.flatMap(f => f.tiers
  .filter(d => !lv.maxTier || d.tier <= lv.maxTier || (lv.allow || []).includes(d.name))
  .map(d => d.name));

// THE STAGES ON THE ROAD, in order, as boards.
const road = () => STAGES.map(s => (s.level === null ? null : levels[s.level])).filter(Boolean);

function loadTowers() {
  const s = store();
  const names = new Set(families.flatMap(f => f.tiers.map(d => d.name)));
  try {
    const list = s && JSON.parse(s.getItem(TOWERS_KEY));
    if (Array.isArray(list)) return new Set(list.filter(n => names.has(n)));
  } catch { /* unreadable: start again below */ }
  // A SAVE FROM BEFORE THIS WAS RECORDED: every stage already won has certainly been
  // started, so what those offered is known — a returning player's book does not
  // lock what they have already built.
  return new Set(road().filter(lv => sealOf(lv.id)).flatMap(offeredOn));
}

let offered = null;
const towersKnown = () => (offered ||= loadTowers());

function persistTowers() {
  const s = store();
  if (!s) return;
  try { s.setItem(TOWERS_KEY, JSON.stringify([...towersKnown()])); } catch { /* full, or refused */ }
}

export const hasTower = name => towersKnown().has(name);

// The dashboard's reset, beside forgetFoes.
export function forgetTowers() {
  offered = new Set();
  persistTowers();
}

// AS A STAGE STARTS: whatever it offers that was never offered before is marked, and
// each one puts its alert up under the gold — EXCEPT ON STAGE 1, whose eight are the
// whole starting kit, unlocked quietly: eight medallions on the first screen of the
// game would bury the first enemy's under them. A board off the road (the testing
// maps) offers nothing.
export function noticeTowers(state, lv) {
  const stage = road().indexOf(lv);
  if (stage < 0) return;
  const known = towersKnown();
  const fresh = offeredOn(lv).filter(n => !known.has(n));
  if (!fresh.length) return;
  for (const n of fresh) known.add(n);
  persistTowers();
  if (stage > 0) (state.foeAlerts ||= []).push(...fresh.map(tower => ({ tower })));
}

// EVERYTHING KNOWN, in memory only — for the tools, which check what the encyclopedia
// SAYS about each thing and would otherwise find every page locked on an empty save.
export function knowEverything() {
  met = new Set(Object.keys(enemyTypes));
  offered = new Set(families.flatMap(f => f.tiers.map(d => d.name)));
}

// The tower's def by its name — what a tower alert carries.
export const towerNamed = name => {
  for (const f of families) for (const d of f.tiers) if (d.name === name) return d;
  return null;
};

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

// --- the info box's medallion ----------------------------------------------------
//
// The figure drawn at INFO_PORTRAIT * SCALE, as the info box draws every portrait,
// and the ring grown from 36 until the drawing's top corners are inside it, with
// the feet 0.62 of the radius below the middle. Asked by drawInfo in render.js.
//
// THE ALERT DOES NOT USE IT ANY MORE. It did for one build, at the owner's word,
// and the owner then found it too big: "go back to the previous size and make the
// unit image even smaller so that there is good space between the image and edge
// of medallion." See alertFigure below.
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
// AN ALERT IS A CREATURE'S ID, or `{ tower: name }` for a tower the stage has just
// offered (noticeTowers above) — drawn with the man it musters.
//
// 44 ACROSS, the size it first had, with the figure fitted INSIDE a smaller circle
// rather than to the ring: its corners stay ALERT_AIR clear of the edge, so there
// is a clear band of parchment all the way round whatever the drawing's shape.
export const ALERT_D = 44;
export const ALERT_AIR = 7;
const ALERT_X = 14;
const ALERT_Y = 40;                        // the bars end at 32
const ALERT_GAP = 8;
// How far the bar reaches right of the medallion's middle — part of the target,
// because it is part of the picture.
// 100, AND IT WAS 122: the bar ran well past "New Enemy!" when that was set in a
// wide bold face ("more tint to the right"); Lobster sets it at 57px, so the bar
// was cut back to end 16px past the word, at the owner's word.
export const ALERT_BAR_W = 100;
export const ALERT_BAR_H = 24;

// The figure's drawn size: its box's half-diagonal on the inner circle.
export function alertFigure(trim) {
  const [, , sw, sh] = trim;
  const k = (ALERT_D / 2 - ALERT_AIR) / Math.hypot(sw / 2, sh / 2);
  return { dw: sw * k, dh: sh * k };
}

export function alertRects(state) {
  const R = ALERT_D / 2;
  return (state.foeAlerts || []).map((id, i) => {
    const y = ALERT_Y + i * (ALERT_D + ALERT_GAP);
    return { id, R, cx: ALERT_X + R, cy: y + R, x: ALERT_X, y, w: R + ALERT_BAR_W, h: ALERT_D };
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
  state.foeTip = null;
  state.menu = null;
  state.placing = null;
}

export const closeFoeCard = state => { state.foeCard = null; state.foeTip = null; };

// THE CARD IS SIZED BY render.js, which is the only place that knows how big the
// picture can be drawn on this screen and how long the description wraps — see
// drawFoeCard. It leaves the X where it drew it, here, so the tap and the picture
// are the same rect.
export const FOE_CLOSE = { x: 0, y: 0, w: 30, h: 30 };

// AND EACH STAT'S ICON AND NUMBER, as { x, y, w, h, key }, for the same reason.
// The card prints icons and numbers only; what an icon MEANS — Health, Range — is
// shown when the mouse is over it or it is tapped, at the owner's word: "remove
// the icon names and only show the icon name when a player hovers or clicks on
// the small icon". Which one is showing is `state.foeTip`.
export const FOE_STATS = [];

const inRect = (b, x, y, p) => x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p;

export const hitFoeStat = (x, y) => FOE_STATS.findIndex(b => inRect(b, x, y, 2));

// The X closes the card. A stat shows its name, and a tap anywhere else puts a
// name that is showing away. Nothing else on screen answers.
export function tapFoeCard(state, x, y) {
  if (inRect(FOE_CLOSE, x, y, 10)) {
    closeFoeCard(state);
    return true;
  }
  const i = hitFoeStat(x, y);
  if (i >= 0) { state.foeTip = i; return true; }
  if (state.foeTip !== null && state.foeTip !== undefined) { state.foeTip = null; return true; }
  return false;
}
