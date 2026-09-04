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
import { enemyTypes, MARCH_ORDER, defaultGap, MODES, tableFor } from './data/waves.js';
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
//   waves   "m3|extended|4|heavy_inf"   level, MODE, wave, enemy type -> count
//   gaps    "m3|extended|4|heavy_inf"    the same, in its own bag      -> seconds
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
  if (!s) return { waves: {}, gaps: {}, gold: {}, units: {} };
  try {
    const held = JSON.parse(s.getItem(KEY)) || {};
    // `gaps` reads as empty when it is absent, which is what lets it be added
    // without throwing anybody's stored counts away — the same courtesy `gold`
    // was given when it arrived.
    return {
      waves: migrate(held.waves || {}),
      gaps: migrate(held.gaps || {}),
      gold: held.gold || {},
      units: held.units || {}
    };
  } catch { return { waves: {}, gaps: {}, gold: {}, units: {} }; }
}

// WAVE KEYS USED TO END IN A GROUP INDEX and now end in an enemy type, and a
// saved blob from before that change is somebody's actual tuning work sitting in
// their browser.
//
// Left alone it would not throw — "m1|0|0" simply never matches a lookup — it
// would just silently stop applying, which is the worst of the three options: the
// panel would show shipped numbers, the game would play shipped waves, and the
// edits would still be in localStorage looking like they had been kept.
//
// So an old key is READ ONCE and rewritten. The index is looked up in the level's
// own shipped table, which is the only place that ever knew what group 1 of wave 4
// meant. An index that no longer resolves — a table retyped with fewer groups
// since the edit was made — is dropped, because a count with nothing to attach to
// is not recoverable and keeping it would make it reappear on some later table
// that happened to grow that far.
let migrated = false;

// A wave key has grown TWICE, and a saved blob can be from before either change:
//
//   "m1|3|1"                  level, wave, GROUP INDEX      the original
//   "m1|3|heavy_inf"          level, wave, enemy type       once any enemy could
//                                                           be put in any wave
//   "m1|normal|3|heavy_inf"   level, MODE, wave, type       once Extended became
//                                                           editable too
//
// Both old shapes are rewritten here, in that order, and the result is persisted
// on the load that noticed. An index that no longer resolves is dropped: a count
// with nothing to attach to is not recoverable, and keeping it would make it
// reappear on some later table that happened to grow that far.
//
// EVERYTHING OLD IS NORMAL'S. There was only one editable table before this, and
// it was the one the game plays on Normal — so an edit made then meant that
// table, and an Extended run picking it up as well was a side effect of sharing
// an index rather than anything anybody asked for.
function migrate(bag) {
  const out = {};
  for (const [key, value] of Object.entries(bag)) {
    const parts = key.split('|');
    if (parts.length >= 4) { out[key] = value; continue; }
    migrated = true;
    const [levelId, wave, tail] = parts;
    let type = tail;
    if (/^\d+$/.test(tail || '')) {
      const lv = levels.find(l => l.id === levelId);
      const group = lv && lv.waves[+wave] && lv.waves[+wave].groups[+tail];
      if (!group) continue;
      type = group.type;
    }
    out[`${levelId}|normal|${wave}|${type}`] = value;
  }
  return out;
}

function persist() {
  const s = store();
  if (!s) return;
  try { s.setItem(KEY, JSON.stringify(edits)); } catch { /* full, or refused */ }
}

const edits = load();

// WRITTEN BACK AT ONCE when anything was rewritten above, rather than waiting for
// the next edit to persist it. Both work — the migration is in memory either way,
// and it is idempotent, so re-running it every load would be harmless — but a
// store that heals on the load that noticed leaves nothing in the browser that
// still looks like the old shape. It also drops the entries migrate() could not
// resolve, which otherwise sit there forever being skipped.
//
// After the assignment, not inside load(): persist() reads `edits`, which does
// not exist until this line has run.
if (migrated) persist();

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
        // KEYED BY THE TOWER'S OWN NAME, not by its tier number, and that changed
        // when archery grew a second tier 4. `archery/4` named two rows the day
        // the Crossbow Sentry landed, and this id is what an edit is SAVED under
        // — so a clash is not a duplicate row, it is two towers sharing one
        // stored damage number. Names are unique across the game and stable
        // across a re-tiering, which the number was not.
        id: `${fam.id}/${def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: man ? man.name : def.unit,
        // The tower rather than the rung, for the same reason: two rows reading
        // "Archery T4" tells the reader nothing about which is which.
        of: def.tier === 4 ? def.name : `${fam.name} T${def.tier}`,
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
// EVERY TYPE FOR EVERY WAVE, including the ones a wave does not send — those ship
// at zero, which is what makes "add a Giant to wave 1" an ordinary edit rather
// than a special case. A count put back to 0 on a wave that never had one clears
// the override entirely, the same as any other value returning to its shipped one.
// BOTH LENGTHS, because both are editable now. Each is a table of its own in
// data/waves.js — the Extended ones were derived from the Normal ones until the
// owner tuned all three by hand — so what is captured here is each table as
// shipped, and editing one never moves the other.
for (const l of levels) {
  for (const mode of MODES) tableFor(l, mode.id).forEach((w, i) => {
    const sends = new Map(w.groups.map(g => [g.type, g]));
    for (const t of MARCH_ORDER) {
      const g = sends.get(t);
      SHIPPED.set(`${l.id}|${mode.id}|${i}|${t}`, g ? g.count : 0);
      // THE RATE, under a key with one more field so it cannot collide with the
      // count above. A type the wave does not send ships at the rate that type is
      // usually sent at, so the "was" marker under the stepper compares against
      // the number the game would actually have used.
      SHIPPED.set(`${l.id}|${mode.id}|${i}|${t}|gap`, g ? g.gap : defaultGap(t));
    }
  });
  // The purse, keyed on the level id alone — there is one per map, so there is
  // nothing to index it by. It cannot collide with a wave key above, which always
  // carries two more fields.
  SHIPPED.set(`${l.id}|gold`, l.startGold);
}

export const shipped = key => SHIPPED.get(key);

// --- reading and writing -------------------------------------------------------

// EVERY WAVE LOOKUP CARRIES A MODE NOW. It is a required argument rather than one
// defaulting to 'normal', which is the whole reason this change is safe: a call
// site that has not been told which table it means fails loudly here instead of
// quietly editing the Normal one.
const waveKey = (levelId, mode, wave, type) => `${levelId}|${mode}|${wave}|${type}`;

export const waveCount = (levelId, mode, wave, type) =>
  edits.waves[waveKey(levelId, mode, wave, type)] ??
  SHIPPED.get(waveKey(levelId, mode, wave, type)) ?? 0;

// HOW FAST THAT TYPE COMES in that wave: the override if one has been set, else
// the shipped table's own gap where the wave sends it, else the type's usual rate.
//
// IT IS AN EDIT NOW. It was a lookup for one build — the panel set who was in a
// wave and how many, and the rate was whatever the tables already used — and the
// owner asked for the third control: a wave of six giants at 1.6s and the same six
// at 3.0s are different waves, and the count alone could not say which.
export const waveGap = (levelId, mode, wave, type) =>
  edits.gaps[waveKey(levelId, mode, wave, type)] ??
  SHIPPED.get(`${waveKey(levelId, mode, wave, type)}|gap`) ??
  defaultGap(type);

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
  Object.keys(edits.gaps).length +
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

// A TENTH OF A SECOND, flat, and it is the one step in this panel that is not
// proportional. Gaps run 0.4 to 2.0 across every shipped table, so the whole
// useful range is sixteen taps wide — there is nothing to hurry past, and a
// proportional step would move 0.4 by 0.02 and 2.0 by 0.1, which reads as the
// button doing different things at different ends of the same row.
export const gapStep = () => 0.1;
export const statStep = value => Math.max(1, Math.round(Math.abs(value) * 0.05));
export const goldStep = value => Math.max(10, Math.round(Math.abs(value) * 0.1 / 10) * 10);

// ZERO IS THE FLOOR NOW, and it is the whole of what "place any enemy in any
// wave" means: 0 is how a type says it is not in this wave. It used to be 1,
// because a group that existed in the table was a group that sent somebody and
// taking it to nothing would have left an empty group behind.
//
// A wave CAN now be taken to no enemies at all. That is deliberate and it does not
// hang: updateWaves finds no group to spawn from, the wave has nothing left on the
// field, and it clears immediately into the next one — an empty wave is a pause,
// which is a real thing to want while testing a later one.
// ROUNDED UP, on the same rule the rate follows: "units — any decimal place is
// rounded up." Nothing here ever hands it a fraction, because the step is one
// whole enemy, so this is the rule being stated in the one place a count is
// written rather than a behaviour anybody will see.
//
// IT IS THIS TOOL'S RULE AND NOT THE GAME'S. scaleWaves in data/difficulty.js
// rounds to NEAREST, on purpose: ceil there adds up to a whole enemy per group,
// and seven groups in a late wave read as one extra of everything. The rule is
// right for a person turning a dial and wrong for a multiplier applied to a whole
// table at once.
export function setWaveCount(levelId, mode, wave, type, count) {
  const key = waveKey(levelId, mode, wave, type);
  put(edits.waves, key, Math.max(0, Math.min(99, Math.ceil(count))), SHIPPED.get(key));
}

// HOW LONG BETWEEN ONE AND THE NEXT, in seconds.
//
// FLOORED AT A TENTH RATHER THAN AT ZERO, and the floor is doing real work. `gap`
// is what updateWaves puts on the clock after each spawn, so 0 spawns one enemy
// EVERY FRAME — a wave of thirty arriving in half a second, stacked on one point
// of road. That is not a rate anybody wants and it is not a rate the rest of the
// game is built for; a tenth is already four times faster than anything shipped.
//
// ROUNDED UP TO ONE DECIMAL, at the owner's word: "any 2 decimal place is rounded
// up to 1 decimal place." A tenth is the step, so a tenth is the precision the
// readout carries, and anything finer is taken to the next one rather than to the
// nearer one.
//
// IT WENT ONE DECIMAL -> TWO -> ONE AGAIN, and the middle step is worth keeping in
// view because it was a real bug for a real reason. Map 3's SHORT table used to run
// rates of 1.05, 0.65 and 1.23, and rounding those to a tenth meant the first tap
// on any of them snapped to 1.1, 0.7 or 1.2 with no route home — every way back
// landed on the same tenth, so the "was" line stayed on screen with nothing but
// Reset to clear it. Two decimals fixed that by holding the awkward values.
//
// The awkward values are gone. Every table in the game is now the owner's own, and
// every rate in them sits on a tenth, so one decimal is once again the precision
// of the data as well as of the step — and the round trip comes home. That is
// checked rather than assumed: tools/admin.mjs walks every count and rate of both
// lengths of all three maps through this setter and asserts that writing a shipped
// value back leaves no override behind.
//
// CEIL, NOT ROUND, and the multiply-then-divide is what makes it safe on floats:
// 1.15 * 10 is 11.499999999999998, and ceil on that is 12 rather than the 11.5
// the arithmetic means. Rounding to a whole number of tenths first is what stops
// a tap from climbing by 0.2.
export function setWaveGap(levelId, mode, wave, type, gap) {
  const key = waveKey(levelId, mode, wave, type);
  const tenths = Math.round(Math.max(0.1, Math.min(10, gap)) * 100) / 10;
  const held = Math.ceil(tenths) / 10;
  put(edits.gaps, key, held, SHIPPED.get(`${key}|gap`));
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
  edits.gaps = {};
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
// IT TAKES A MODE RATHER THAN A TABLE, and the two lengths are edited SEPARATELY.
//
// It took the caller's table for one build, and the overrides were keyed by wave
// index alone — so an edit to wave 3 landed on wave 3 of either length, and the
// two extra waves of an Extended run could not be reached at all. Both halves of
// that were side effects of sharing an index rather than anything anybody chose.
//
// The owner asked for the Extended tables in the panel, and once both are in
// front of you they have to be separable: changing wave 3 of the long game must
// not change wave 3 of the short one. So the mode is part of the key, and this
// takes the id rather than the array — tableFor is the one place that turns a
// mode into a table, and a caller passing its own would be a second.
// A GROUP PER TYPE THE WAVE SENDS, in MARCH_ORDER, built rather than copied.
//
// It has to be built now: the dashboard can put a creature into a wave whose
// shipped table has no group for it, so there is nothing to spread from. What
// keeps that honest is that MARCH_ORDER reproduces every shipped table exactly —
// see the note beside it in data/waves.js — so an untouched dashboard hands back
// the same waves in the same order, which tools/admin.mjs checks table by table.
//
// A TYPE AT ZERO IS SIMPLY NOT A GROUP. It is left out rather than emitted empty,
// because groupAt in waves.js walks groups by cumulative count and a zero-count
// group in the middle of that walk is a group it can never be inside.
//
// THE GAP COMES FROM THE SHIPPED TABLE where the wave already sends that type, so
// editing a count never disturbs the rhythm the map was balanced at, and from
// defaultGap where it does not.
export function adminWaves(level, mode = 'normal') {
  return tableFor(level, mode).map((w, i) => {
    const own = new Map(w.groups.map(g => [g.type, g]));
    const groups = [];
    for (const type of MARCH_ORDER) {
      const count = waveCount(level.id, mode, i, type);
      if (!count) continue;
      const g = own.get(type);
      groups.push({ ...(g || { type }), type, count, gap: waveGap(level.id, mode, i, type) });
    }
    return { ...w, groups };
  });
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
// 128 RATHER THAN 148, and the twenty pixels went to the two buttons beside them.
// "Two Rivers" is the longest map name in the game and sets at 87px in the 15px
// bold this row draws in, so 128 still holds it with room; tools/admin.mjs checks
// that against the real names rather than against this sentence.
const MAP_W = 128, MAP_H = 40, MAP_GAP = 10;
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

// WHICH LENGTH OF THE MAP, on the same row as the maps and immediately after
// them, because the two questions are the same question: which table am I
// editing. The wave numbers below say which wave OF it, which is a different
// thing and belongs on its own line.
//
// A map has two lengths — see MODES in data/waves.js — and until now the panel
// only ever showed the Normal one. The owner asked for both.
// 86 wide, and the width is set by what is on either side rather than by taste.
// The map tabs end at 428 and the "Start gold" label starts at about 627 — it is
// right-aligned 14px from the stepper — so there is 199px for two buttons and a
// gap, and 86 + 8 + 86 leaves 7px at the far end. "Extended" is the longer label
// and sets at 65px in this row's type. tools/admin.mjs checks both clearances
// against the real geometry, and it caught this at 96 wide.
const MODE_W = 86, MODE_GAP = 8;
// Off the LAST MAP TAB'S RIGHT EDGE rather than off a count times a pitch: the
// arithmetic version included a trailing gap that is not there and put these 12px
// further right than intended, which is most of what went wrong at 96.
const MODE_X = INNER.x + (levels.length - 1) * (MAP_W + MAP_GAP) + MAP_W + 12;
export const modeTabs = () => MODES.map((m, i) => ({
  i,
  id: m.id,
  label: m.name,
  x: MODE_X + i * (MODE_W + MODE_GAP),
  y: MAP_Y,
  w: MODE_W,
  h: MAP_H
}));

// How many waves this map has at this length, which is what the row of numbered
// buttons is built from and what a wave index has to be clamped to when the
// length changes under it.
export const waveCountFor = (levelIndex, mode) => tableFor(levels[levelIndex], mode).length;

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
export const waveTabs = (levelIndex, mode = 'normal') => {
  const n = waveCountFor(levelIndex, mode);
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
  return stepperAt(COLS[col], rowY, field);
}

// The same control at an ARBITRARY x, which the waves tab needs and the units tab
// does not: the units tab has two fixed columns hung off the right margin, and the
// waves tab now lays its rows out in a grid whose x depends on which side of the
// page the row is on. One builder either way, so the two tabs cannot end up with
// steppers of different sizes or different padding.
export function stepperAt(x, rowY, field, w = STEP_W, valueW = 96) {
  return {
    minus: { x, y: rowY, w, h: STEP_H },
    value: { x: x + w, y: rowY, w: valueW, h: STEP_H },
    plus:  { x: x + w + valueW, y: rowY, w, h: STEP_H },
    field
  };
}

// THE WAVES TAB'S OWN STEPPER, and it is smaller than the units tab's because it
// has to be: that tab shows one control per row and this one now shows TWO — how
// many of a creature, and how fast they come — in a cell half the page wide.
//
// 46 x 40 DRAWN, 58 x 52 TAPPED, against the 52 x 40 and 64 x 52 everywhere else.
// That is 6 logical px off the tap box, which is the whole cost and it is worth
// naming: the standard 64 is 44 real px on the narrowest canvas this game targets,
// and 58 is about 40. Under the guideline, and accepted here rather than anywhere
// else in the game — this panel is behind a four-digit PIN and is a tool for the
// person building the levels, not a control anybody plays with.
//
// The alternatives were both worse. Full-size steppers do not fit two to a cell
// at any label width — two groups of 200 in a cell of 450 leaves 50px for
// "Plague Doctor" — so keeping them would have meant one column of enemies and
// four rows a page, which is paging the roster on the one panel whose whole
// purpose is seeing the roster at once.
const WAVE_STEP_W = 46;
export const waveStepper = (x, rowY, field, valueW) =>
  stepperAt(x, rowY, field, WAVE_STEP_W, valueW);

// The two value boxes are different widths because they hold different things: a
// count is at most two digits and its "was" line at most six characters, while a
// rate is always four ("1.60") and its "was" line eight ("was 1.60").
export const COUNT_VALUE_W = 52;
export const GAP_VALUE_W = 60;

// The rows of the WAVES tab: ONE PER ENEMY IN THE GAME, whether or not this wave
// sends it, which is the owner's ask — "allow me to place any enemy for any wave,
// basically list all the enemy units in all waves so that I have more control".
//
// It used to be one row per GROUP, so the panel could only ever change how many of
// something a wave already sent. Adding a Giant to wave 1 was not a thing the
// dashboard could express, because there was no row to press.
//
// TWO COLUMNS, because six rows at the 60px pitch this dashboard uses everywhere
// do not fit between the wave tabs and the footer, and the alternatives are both
// worse: a tighter pitch puts the padded tap boxes of one row inside the next, and
// paging hides half the roster behind a button on the one panel whose whole
// purpose is seeing the roster at once. Across is where the room is — the page is
// 944 wide and a label plus a stepper is 444 of it.
//
// IN MARCH_ORDER, so the list reads top-left to bottom-right in the order the wave
// actually arrives — see data/waves.js. The rows do not move as counts change,
// which is what makes the panel tappable: a row that jumped to the top when you
// added one of something would move the button out from under the finger that was
// about to press it again.
// RAISED FROM 210 TO 188 when the roster reached seven and the grid needed a
// fourth row. The wave tabs end at 178, so this is 10px of air under them rather
// than 32 — the tightest band on the panel, and the one that gives way first
// because it is the only one with nothing in it.
export const GROUP_TOP = INNER.y + 164;
// 12 rather than 24, for the same reason the steppers shrank: the second control
// per cell had to come from somewhere, and the gutter between two columns is the
// cheapest 12px on the page.
const WAVE_CELL_GAP = 12;
const WAVE_CELL_W = (INNER.r - INNER.x - WAVE_CELL_GAP) / 2;
export const WAVE_COLS = 2;
export const groupRows = (levelIndex, wave, mode = 'normal') => {
  const lv = levels[levelIndex];
  const countW = 2 * WAVE_STEP_W + COUNT_VALUE_W;
  const gapW = 2 * WAVE_STEP_W + GAP_VALUE_W;
  return MARCH_ORDER.map((type, i) => {
    const col = i % WAVE_COLS;
    const x = INNER.x + col * (WAVE_CELL_W + WAVE_CELL_GAP);
    // COUNT FIRST, THEN RATE, left to right, because that is the order the
    // question is asked in: how many of these, and then how fast. Both hard
    // against the right edge of the cell so the columns line up with each other
    // down the page and the right-hand pair lines up with Start gold above it.
    const gapX = x + WAVE_CELL_W - gapW;
    return {
      type,
      def: enemyTypes[type],
      y: GROUP_TOP + Math.floor(i / WAVE_COLS) * ROW_H,
      x,
      stepX: gapX - countW - 8,
      gapX,
      count: waveCount(lv.id, mode, wave, type),
      gap: waveGap(lv.id, mode, wave, type)
    };
  });
};

// Where the wave's summary line sits: under the last row of the grid, wherever
// that falls. Derived rather than typed so it follows the roster — the day a
// seventh enemy is drawn the grid grows a row and this moves with it.
//
// tools/admin.mjs checks that it still clears the footer. That is the failure this
// layout has: enough enemies and the grid runs into the Reset button, silently,
// because nothing about drawing text off the bottom of a panel throws.
export const SUMMARY_Y = () =>
  GROUP_TOP + Math.ceil(MARCH_ORDER.length / WAVE_COLS) * ROW_H + 16;

// AND THE SECOND LINE UNDER IT, which is the one that actually has to clear the
// footer. It used to hang off the last ROW — the same place as this while the grid
// had three rows, and not the same place at four, which is how it ended up drawn
// through the Reset button. One anchor now, and the check reads this rather than
// the line above it.
export const SUMMARY2_Y = () => SUMMARY_Y() + 22;

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
  // `mode` is which LENGTH of the map is being edited, and it opens on Normal
  // because that is the table a map is tuned at. It is the panel's own setting
  // rather than the title screen's: what you are editing and what you last played
  // are different questions, and tying them would mean a run on Extended silently
  // moving which table the next edit lands on.
  state.admin = { stage: 'pin', typed: '', wrong: false, tab: 'waves',
                  map: 0, mode: 'normal', wave: 0, page: 0 };
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
    // SWITCHING LENGTH KEEPS THE WAVE YOU WERE ON, clamped to the shorter table.
    // Going Normal -> Extended on wave 8 should leave you on wave 8 of the long
    // game rather than back at the top, because comparing the same wave at the two
    // lengths is most of what this button is for; going the other way from wave 12
    // has nowhere to land, so it takes the last wave there is.
    for (const m of modeTabs()) {
      if (!on(m)) continue;
      a.mode = m.id;
      a.wave = Math.min(a.wave, waveCountFor(a.map, a.mode) - 1);
      return true;
    }
    for (const w of waveTabs(a.map, a.mode)) {
      if (!on(w)) continue;
      a.wave = w.i;
      return true;
    }
    const levelId = levels[a.map].id;
    for (const r of groupRows(a.map, a.wave, a.mode)) {
      const c = waveStepper(r.stepX, r.y, 'count', COUNT_VALUE_W);
      if (on(c.minus)) { setWaveCount(levelId, a.mode, a.wave, r.type, r.count - countStep()); return true; }
      if (on(c.plus)) { setWaveCount(levelId, a.mode, a.wave, r.type, r.count + countStep()); return true; }
      const g = waveStepper(r.gapX, r.y, 'gap', GAP_VALUE_W);
      if (on(g.minus)) { setWaveGap(levelId, a.mode, a.wave, r.type, r.gap - gapStep()); return true; }
      if (on(g.plus)) { setWaveGap(levelId, a.mode, a.wave, r.type, r.gap + gapStep()); return true; }
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
