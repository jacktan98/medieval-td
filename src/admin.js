// The admin dashboard: the owner's own way to retune the game without editing a
// file, and the state and geometry behind it.
//
// Three things can be changed from here, and they are the three the artist asked
// for:
//
//   HOW MANY ENEMIES each group of each wave of each map sends.
//   HOW MUCH GOLD each map starts you with.
//   HOW MUCH HEALTH AND DAMAGE every fighting figure in the game has.
//
// The purse is the newest and it is a TESTING control before it is a tuning one:
// a Musketeer Post is 500 gold of ladder and 300 more in abilities, which is most
// of a map's income, so seeing one in the state it is meant to be judged in used
// to mean playing eight waves first. It sits on the Waves tab because it belongs
// to a map rather than to a figure, and it sits on the map row because that is the
// row that says which map.
//
// The drawing lives in render.js and the geometry lives here, which is the same
// split menu.js and book.js already use — input.js hit-tests exactly the rects
// that get drawn, and two copies of a button's position is how a tap target
// drifts off the picture it belongs to.
//
// --- what "the password" is and is not ---------------------------------------
//
// A four-digit PIN, tapped on a keypad drawn on the canvas. It is a keypad rather
// than a text field because this game takes no keyboard input at all — it is
// played with a thumb in landscape, and a field that summons a phone keyboard
// over the board would be the only one of its kind.
//
// IT IS NOT SECURITY AND MUST NOT BE TREATED AS ANY. The game is static files
// served to the browser, so the number below is in the JavaScript anybody can
// read, and there is no server to check it against. What it buys is exactly what
// it is for: a player poking at the title screen cannot wander into the tuning
// panel by accident. Anything that actually needed protecting would need a
// back end, which this game does not have and does not want.
//
// TO CHANGE IT, change this constant. Four digits, as a string.
export const PIN = '1349';

// A SECOND CODE ON THE SAME KEYPAD, and it is not a second dashboard: it walks out
// of this game entirely and into `birthday/`, which is a separate page with a
// separate loop and separate rules that happens to live in the same repository.
//
// It is a door and nothing more. Nothing in that folder is imported here, nothing
// here is imported there, and the whole of this game's involvement is the three
// lines in tapAdmin that read this constant — so the mini-game can be deleted, or
// left to rot, without a single other line of this project changing.
export const PARTY_PIN = '2208';
export const PARTY_HREF = 'birthday/';

import { levels } from './level.js';
import { enemyTypes } from './data/waves.js';
import { families } from './data/towers.js';

// --- what is stored -----------------------------------------------------------
//
// Only the OVERRIDES, never the whole table. Two reasons and both bite:
//
//   A saved copy of every wave on every map would go stale the moment the data
//   files were edited — the artist's own retune would be silently overwritten by
//   a year-old snapshot in somebody's browser.
//
//   And an override that equals the shipped value is not an override. Setting a
//   count back to what it started as REMOVES the entry rather than storing it, so
//   a dashboard nobody has touched leaves nothing behind at all.
//
// Keys are strings so the whole thing is one flat JSON object:
//
//   waves   "m3|4|1"          level id, wave index, group index   -> count
//   gold    "m3"              level id                            -> starting purse
//   units   "barracks/2|hp"   unit id, field                      -> number
const KEY = 'medieval-td/admin';

const store = () => {
  try { return globalThis.localStorage || null; } catch { return null; }
};

// A bag that is absent from an older saved blob reads as empty rather than
// undefined, which is what lets `gold` be added without anybody's stored edits
// being thrown away.
function load() {
  const s = store();
  if (!s) return { waves: {}, gold: {}, units: {} };
  try {
    const held = JSON.parse(s.getItem(KEY)) || {};
    return { waves: held.waves || {}, gold: held.gold || {}, units: held.units || {} };
  } catch { return { waves: {}, gold: {}, units: {} }; }
}

function persist() {
  const s = store();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(edits)); } catch { /* full, or refused */ }
}

const edits = load();

// --- the units the dashboard can edit ------------------------------------------
//
// DERIVED FROM THE GAME'S OWN DATA, never listed here. A hand-written list is a
// list that silently misses the next enemy and the next family — the monastery
// landed with four tiers of nothing and appeared in this panel without a line
// being changed, which is the whole point.
//
// A "unit" is the figure whose numbers the info box already shows, which makes
// the panel and the box answer the same question the same way:
//
//   an enemy          has health and does damage
//   a barracks tier   IS its soldier: his health, his damage
//   any other tier    is a man who cannot be reached, so damage only
//
// `hp: false` on that last group is not an omission. Nothing in this game can
// hurt a building, so an archer on his deck and a crewman behind his machine have
// no health to edit — see selectionInfo in select.js, which leaves the row out
// for exactly the same reason.
export function units() {
  const out = [];

  for (const [id, def] of Object.entries(enemyTypes)) {
    out.push({ id: `enemy/${id}`, name: def.name, of: 'Enemy', def, hp: true });
  }

  for (const fam of families) {
    for (const def of fam.tiers || []) {
      const man = def.soldier;
      out.push({
        id: `${fam.id}/${def.tier}`,
        name: man ? man.name : def.unit,
        of: `${fam.name} T${def.tier}`,
        // The object the numbers actually live on, which is the SOLDIER for a
        // barracks and the TIER itself for everyone else. Held as a reference so
        // an edit lands on the same object the fight reads from.
        def: man || def,
        hp: !!man
      });
    }
  }

  return out;
}

// The shipped value of every editable number, captured ONCE before anything is
// applied. This is what "reset" restores to and what "is this an override"
// compares against, and it has to be taken at import time: after the first edit
// is applied the def no longer knows what it used to say.
const SHIPPED = new Map();
for (const u of units()) {
  SHIPPED.set(`${u.id}|damage`, u.def.damage);
  if (u.hp) SHIPPED.set(`${u.id}|hp`, u.def.hp);
}
for (const l of levels) {
  l.waves.forEach((w, i) => w.groups.forEach((g, j) => {
    SHIPPED.set(`${l.id}|${i}|${j}`, g.count);
  }));
  // The purse, keyed on the level id alone — there is one per map, so there is
  // nothing to index it by. It cannot collide with a wave key above, which always
  // carries two more fields.
  SHIPPED.set(`${l.id}|gold`, l.startGold);
}

export const shipped = key => SHIPPED.get(key);

// --- reading and writing -------------------------------------------------------

export const waveCount = (levelId, wave, group) =>
  edits.waves[`${levelId}|${wave}|${group}`] ?? SHIPPED.get(`${levelId}|${wave}|${group}`);

export const unitStat = (unitId, field, def) =>
  edits.units[`${unitId}|${field}`] ?? def[field];

// What a map starts you with, override or shipped. Read by main.js instead of
// `level.startGold`, and the mirror of adminWaves below: the dashboard edits the
// level's own number, and the DIFFICULTY still scales whatever it finds — so a
// purse set to 2000 is 2200 on Easy and 2000 on Hard, exactly as a purse the data
// file set to 2000 would be.
export const adminGold = level =>
  edits.gold[level.id] ?? SHIPPED.get(`${level.id}|gold`);

// Whether anything at all has been changed, so the dashboard can say so and the
// Reset button can be drawn dead when there is nothing to reset.
export const touched = () =>
  Object.keys(edits.waves).length +
  Object.keys(edits.gold).length +
  Object.keys(edits.units).length > 0;

function put(bag, key, value, base) {
  if (value === base) delete bag[key];
  else bag[key] = value;
  persist();
}

// How much one tap moves a number.
//
// COUNTS GO BY ONE, because a wave of 11 and a wave of 12 are different waves and
// the range is 1 to about 35 — there is nothing to hurry past.
//
// STATS GO BY A TWENTIETH of where they already are, and that is the difference
// between a usable panel and one nobody would use twice: health in this game runs
// from 3 to 1500, so a fixed step is either 500 taps across the giant or a step
// that cannot express a spearman's damage at all. Five per cent is about fourteen
// taps to double or halve anything, whatever it started at, and it never lands on
// zero because the step has a floor of one.
// GOLD GOES BY A TENTH, rounded to a round number, and it is the coarsest of the
// three on purpose. The shipped purses are 220 to 260 and the reason this control
// exists is to reach the four figures a tier 4 tower with both abilities costs —
// a fixed step fine enough to dial 240 exactly would be sixty taps to reach 2000.
// A tenth is about eight taps to double whatever is showing, so 220 to 2000 is
// twenty-three, and the rounding keeps the readout on numbers a person would
// choose: 220, 240, 260, 290, 320.
export const countStep = () => 1;
export const statStep = value => Math.max(1, Math.round(Math.abs(value) * 0.05));
export const goldStep = value => Math.max(10, Math.round(Math.abs(value) * 0.1 / 10) * 10);

export function setWaveCount(levelId, wave, group, count) {
  const key = `${levelId}|${wave}|${group}`;
  put(edits.waves, key, Math.max(1, Math.min(99, Math.round(count))), SHIPPED.get(key));
}

// Zero IS allowed, unlike a wave of no enemies or a figure with no health: a map
// you have to earn every coin on is a real thing to want to test, and nothing
// breaks — the build menu simply refuses every button until the first kill pays.
// The ceiling keeps the readout to four digits, which is what the column is drawn
// for.
export function setStartGold(levelId, gold) {
  const held = Math.max(0, Math.min(9990, Math.round(gold)));
  put(edits.gold, levelId, held, SHIPPED.get(`${levelId}|gold`));
}

// Damage may be taken to zero — a figure that does nothing but soak is a real
// thing to want to try — but health may not, because a unit with no health is
// dead on the frame it musters and the respawn loop would never stop.
export function setUnitStat(unitId, field, value) {
  const key = `${unitId}|${field}`;
  const floor = field === 'hp' ? 1 : 0;
  const held = Math.max(floor, Math.round(value));
  put(edits.units, key, held, SHIPPED.get(key));
  apply();
}

export function reset() {
  edits.waves = {};
  edits.gold = {};
  edits.units = {};
  persist();
  apply();
}

// --- putting the edits into the game -------------------------------------------
//
// UNIT STATS ARE WRITTEN STRAIGHT ONTO THE DEFS, once here and again after every
// edit, rather than being looked up at each of the dozen places a stat is read.
// That is deliberate: `hp` and `damage` are read by the fight, the info box, the
// encyclopedia and every tool, and a layer that only some of those went through
// would be a panel that changed the game without changing what the game says
// about itself.
//
// `maxHp` is not touched. A figure already on the board keeps the health it
// mustered with — the edit takes effect the next time one is made, which is the
// next game, because the dashboard is only reachable from the title screen.
export function apply() {
  for (const u of units()) {
    u.def.damage = unitStat(u.id, 'damage', { damage: SHIPPED.get(`${u.id}|damage`) });
    if (u.hp) u.def.hp = unitStat(u.id, 'hp', { hp: SHIPPED.get(`${u.id}|hp`) });
  }
}

apply();

// A level's wave table with the count overrides folded in, ready for
// scaleWaves() to apply the difficulty on top.
//
// A COPY, always, even when nothing has been edited. Handing back the level's own
// array when there are no overrides and a fresh one when there are would make
// "does the game own this table" depend on the contents of localStorage, and the
// first thing to write through it would corrupt the shipped data for the rest of
// the session.
export function adminWaves(level) {
  return level.waves.map((w, i) => ({
    ...w,
    groups: w.groups.map((g, j) => ({ ...g, count: waveCount(level.id, i, j) }))
  }));
}

// --- geometry ------------------------------------------------------------------
//
// The button on the title screen, in the bottom-right corner as asked. Small and
// quiet on purpose: it is not part of the game, and a full-sized panel button
// down there would read as a third thing to press before starting.
export const ADMIN_BTN = { x: 858, y: 484, w: 84, h: 38 };

// Everything below is laid out inside the full 960x540 board, because the
// dashboard covers it completely — the same as the encyclopedia, and for the same
// reason: while it is up, nothing underneath may act on a tap.
export const PANEL = { x: 8, y: 8, w: 944, h: 524 };
const PAD = 16;
const INNER = { x: PANEL.x + PAD, r: PANEL.x + PANEL.w - PAD, y: PANEL.y + PAD, b: PANEL.y + PANEL.h - PAD };

export const TITLE_Y = INNER.y + 14;

// The top-right controls: the two tabs, then Close hard against the margin.
const TAB_W = 104, TAB_H = 38, TAB_GAP = 8;
const CLOSE_W = 92;

export const CLOSE_BTN = { x: INNER.r - CLOSE_W, y: INNER.y, w: CLOSE_W, h: TAB_H };
export const TABS = [
  { id: 'waves', label: 'Waves' },
  { id: 'units', label: 'Units' }
].map((t, i) => ({
  ...t,
  x: CLOSE_BTN.x - 24 - (2 - i) * (TAB_W + TAB_GAP) + TAB_GAP,
  y: INNER.y,
  w: TAB_W,
  h: TAB_H
}));

// The map row on the Waves tab, laid out from the left margin rather than
// centred: it is a filter on the list below it, not a headline.
const MAP_W = 148, MAP_H = 40, MAP_GAP = 10;
const MAP_Y = INNER.y + 54;
export const mapTabs = () => levels.map((l, i) => ({
  i,
  id: l.id,
  label: l.name,
  x: INNER.x + i * (MAP_W + MAP_GAP),
  y: MAP_Y,
  w: MAP_W,
  h: MAP_H
}));

// The starting purse, on the map row and hard against the right margin.
//
// SAME ROW AS THE MAPS because it is a property of the map, not of the wave: the
// tabs on the left say which map and this says what it hands you, and putting it
// on a row of its own below would have said it belonged to the wave underneath it.
// There is room — three tabs end at x 494 and the stepper group starts at 736 —
// and the stepper is 40 tall, which is the map buttons' own height.
export const GOLD_ROW_Y = MAP_Y;
export const goldStepper = () => stepper('damage', GOLD_ROW_Y, 'gold');

// One button per wave. Sized so ten of them fit the page width with room —
// map 3 runs ten and is the binding case, and a row that had to reflow for it
// would put map 1's eight somewhere else on the screen.
const WAVE_W = 56, WAVE_H = 44, WAVE_GAP = 6;
export const waveTabs = levelIndex => {
  const n = levels[levelIndex].waves.length;
  return Array.from({ length: n }, (_, i) => ({
    i,
    x: INNER.x + i * (WAVE_W + WAVE_GAP),
    y: INNER.y + 110,
    w: WAVE_W,
    h: WAVE_H
  }));
};

// A row of the list, on either tab: a label on the left and one or two
// [-] value [+] steppers on the right.
//
// The steppers are 52 x 40 DRAWN and 64 x 52 TAPPED, the same trick every other
// control in the game uses — 64 logical px is 44 real ones on the narrowest
// canvas this game targets, and the row pitch is 60 so a padded box never reaches
// into the row above or below.
export const ROW_H = 60;
const STEP_W = 52, STEP_H = 40;
export const STEP_PAD = 6;

// Where the two stepper groups sit across the row. `hp` first because health is
// the bigger number and the eye reads the columns left to right; `damage` is the
// one every row has, so it is the one hard against the right margin and it lines
// up whether or not the row above it had health.
const GROUP_W = STEP_W * 2 + 96;
export const COLS = {
  hp: INNER.r - 2 * GROUP_W - 40,
  damage: INNER.r - GROUP_W
};

export function stepper(col, rowY, field) {
  const x = COLS[col];
  return {
    minus: { x, y: rowY, w: STEP_W, h: STEP_H },
    value: { x: x + STEP_W, y: rowY, w: 96, h: STEP_H },
    plus:  { x: x + STEP_W + 96, y: rowY, w: STEP_W, h: STEP_H },
    field
  };
}

// The rows of the WAVES tab: one per group of the selected wave, so at most three
// and usually one. They start below the wave row with a band of air.
export const GROUP_TOP = INNER.y + 186;
export const groupRows = (levelIndex, wave) => {
  const w = levels[levelIndex].waves[wave];
  return w.groups.map((g, j) => ({ j, group: g, y: GROUP_TOP + j * ROW_H }));
};

// The rows of the UNITS tab. Fifteen of them today — three enemies and four
// families of three — so they are paged rather than crammed: six a page at the
// same 60px pitch the waves tab uses, which keeps one row height in the whole
// dashboard.
export const UNIT_TOP = INNER.y + 76;
export const PER_PAGE = 6;
export const unitPages = () => Math.ceil(units().length / PER_PAGE);
export const unitRows = page =>
  units().slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
    .map((u, i) => ({ ...u, y: UNIT_TOP + i * ROW_H }));

// The footer: Reset on the left where it is furthest from anything else, and the
// page flip on the right for the Units tab. Both hang off the bottom margin, so
// their lower edge is PAD from the panel exactly like the sides.
const FOOT_H = 40;
export const FOOT_Y = INNER.b - FOOT_H;
export const RESET_BTN = { x: INNER.x, y: FOOT_Y, w: 140, h: FOOT_H };
export const PREV_BTN = { x: INNER.r - 210, y: FOOT_Y, w: 52, h: FOOT_H };
export const NEXT_BTN = { x: INNER.r - 52, y: FOOT_Y, w: 52, h: FOOT_H };

// --- the keypad ----------------------------------------------------------------
//
// Twelve keys in a 3 x 4 grid, centred: 1-9, then Clear, 0, and the backspace.
// 76 x 60 drawn with 8px of padding is 92 x 76 tapped, comfortably over the
// minimum, and there is no submit key — the PIN is checked the moment the fourth
// digit lands, so a correct code needs exactly four taps.
const KEY_W = 76, KEY_H = 60, KEY_GAP = 12;
const PAD_W = 3 * KEY_W + 2 * KEY_GAP;
const PAD_H = 4 * KEY_H + 3 * KEY_GAP;
const PAD_X = Math.round(480 - PAD_W / 2);
const PAD_Y = 176;

export const KEY_PAD = 8;
export const keys = () => {
  const face = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];
  return face.map((k, i) => ({
    k,
    x: PAD_X + (i % 3) * (KEY_W + KEY_GAP),
    y: PAD_Y + Math.floor(i / 3) * (KEY_H + KEY_GAP),
    w: KEY_W,
    h: KEY_H
  }));
};

// Where the typed digits are shown, as four rings above the pad.
export const PIN_DOTS = { y: PAD_Y - 42, r: 11, gap: 34 };

export const PIN_CANCEL = { x: Math.round(480 - 70), y: PAD_Y + PAD_H + 14, w: 140, h: 40 };

// --- opening and closing -------------------------------------------------------

export function openAdmin(state) {
  state.admin = { stage: 'pin', typed: '', wrong: false, tab: 'waves', map: 0, wave: 0, page: 0 };
}

export function closeAdmin(state) {
  state.admin = null;
}

// A tap while the dashboard is up. Returns true when it acted, which is what the
// one click in input.js is keyed to.
//
// EVERY TAP COMES HERE and none go anywhere else: the panel covers the whole
// board, so nothing underneath may answer one — including the Start button a
// stepper happens to be drawn over.
//
// `restart` is called on close rather than on each edit. A wave count is read
// once, when a game is built, so the title screen behind the panel has to be
// rebuilt for a change to mean anything — and rebuilding on every tap of a `+`
// would throw the board away thirty times while somebody dials a number in.
export function tapAdmin(state, x, y, restart) {
  const a = state.admin;
  const on = b => x >= b.x - HIT && x <= b.x + b.w + HIT && y >= b.y - HIT && y <= b.y + b.h + HIT;

  if (a.stage === 'pin') {
    if (on(PIN_CANCEL)) { closeAdmin(state); return true; }
    for (const key of keys()) {
      if (!on(key)) continue;
      a.wrong = false;
      if (key.k === 'clear') a.typed = '';
      else if (key.k === 'back') a.typed = a.typed.slice(0, -1);
      else if (a.typed.length < PIN.length) a.typed += key.k;

      if (a.typed.length === PIN.length) {
        if (a.typed === PIN) { a.stage = 'board'; a.typed = ''; }
        // The door out. Guarded on `location` existing because this module is
        // imported by tools/admin.mjs, which runs in Node — the same reason the
        // localStorage access at the top of this file is wrapped.
        else if (a.typed === PARTY_PIN && typeof location !== 'undefined') {
          location.href = PARTY_HREF;
        }
        else { a.wrong = true; a.typed = ''; }
      }
      return true;
    }
    return false;
  }

  if (on(CLOSE_BTN)) { closeAdmin(state); restart(); return true; }

  for (const t of TABS) {
    if (!on(t)) continue;
    a.tab = t.id;
    a.page = 0;
    return true;
  }

  if (on(RESET_BTN)) {
    if (!touched()) return false;
    reset();
    return true;
  }

  if (a.tab === 'waves') {
    // Before the map tabs, because it shares their row: the stepper is drawn on
    // top of nothing, but a tap that misses a map button by a few pixels to the
    // right must not be answered by the map row's hit box growing into it.
    {
      const s = goldStepper();
      const levelId = levels[a.map].id;
      const now = adminGold(levels[a.map]);
      if (on(s.minus)) { setStartGold(levelId, now - goldStep(now)); return true; }
      if (on(s.plus)) { setStartGold(levelId, now + goldStep(now)); return true; }
    }

    for (const m of mapTabs()) {
      if (!on(m)) continue;
      a.map = m.i;
      a.wave = 0;
      return true;
    }
    for (const w of waveTabs(a.map)) {
      if (!on(w)) continue;
      a.wave = w.i;
      return true;
    }
    const levelId = levels[a.map].id;
    for (const r of groupRows(a.map, a.wave)) {
      const s = stepper('damage', r.y, 'count');
      const now = waveCount(levelId, a.wave, r.j);
      if (on(s.minus)) { setWaveCount(levelId, a.wave, r.j, now - countStep()); return true; }
      if (on(s.plus)) { setWaveCount(levelId, a.wave, r.j, now + countStep()); return true; }
    }
    return false;
  }

  // Units.
  const pages = unitPages();
  if (on(PREV_BTN)) { a.page = (a.page + pages - 1) % pages; return true; }
  if (on(NEXT_BTN)) { a.page = (a.page + 1) % pages; return true; }

  for (const u of unitRows(a.page)) {
    for (const field of ['hp', 'damage']) {
      if (field === 'hp' && !u.hp) continue;
      const s = stepper(field, u.y, field);
      const now = u.def[field];
      if (on(s.minus)) { setUnitStat(u.id, field, now - statStep(now)); return true; }
      if (on(s.plus)) { setUnitStat(u.id, field, now + statStep(now)); return true; }
    }
  }

  return false;
}

// The slack around every box in this file, so a 52x40 stepper is a 64x52 target.
const HIT = 6;
