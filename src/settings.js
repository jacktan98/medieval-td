// THE SETTINGS, at the owner's word: a gear in the top right corner of the start page
// and of the world map. Tapped, it opens a dark panel with the Music and Effects
// sliders — the pause menu's own (drawSoundPanel in render.js) — and, on the world
// map only, Reset campaign, which asks before it acts as Restart and Quit do: the
// first tap arms it and reads "Confirm?", the second, within a few seconds, does it.
//
// The geometry lives here and the drawing in render.js and the taps in input.js, the
// same split as achievepage.js, so input.js hit-tests exactly the rects that get drawn.

// THE GEAR, top right: its centre, and the tap round it (64 across, as every control).
export const SETTINGS_ICON = { cx: 914, cy: 44 };
export const SETTINGS_BTN = { x: 880, y: 10, w: 68, h: 68 };

// THE PANEL, in the middle of the screen: the title, the two sliders, and the buttons
// in a row under them — Reset campaign and Done on the map, Done alone on the start page.
export const SETTINGS_SHEET = { x: 290, y: 120, w: 380, h: 250 };
export const SETTINGS_TITLE_Y = 158;
export const SETTINGS_SOUND = { x: 330, y: 186, w: 300, h: 92 };
const ROW_Y = 306, ROW_H = 38;
export const SETTINGS_RESET = { x: 328, y: ROW_Y, w: 170, h: ROW_H };
export const SETTINGS_DONE_MAP = { x: 522, y: ROW_Y, w: 110, h: ROW_H };
export const SETTINGS_DONE_TITLE = { x: 425, y: ROW_Y, w: 110, h: ROW_H };
export const settingsDone = state => state.settings === 'map' ? SETTINGS_DONE_MAP : SETTINGS_DONE_TITLE;

const inside = (b, x, y, p = 0) => x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p;
export const hitSettingsButton = (x, y) => inside(SETTINGS_BTN, x, y);
export const insideSettings = (x, y) => inside(SETTINGS_SHEET, x, y);
export const hitSettingsReset = (state, x, y) => state.settings === 'map' && inside(SETTINGS_RESET, x, y, 8);
export const hitSettingsDone = (state, x, y) => inside(settingsDone(state), x, y, 8);

// WHERE IT WAS OPENED is what it offers: 'title' or 'map'.
export function openSettings(state, where) {
  state.settings = where;
  state.armed = null;
}
export function closeSettings(state) {
  state.settings = null;
  state.armed = null;
  state.soundDrag = null;
}

// THE WORLD MAP AT REST, where the gear is drawn and answers: no stage's panel up,
// no road drawing itself, and not the ending.
export const mapGearShown = state => !state.started && !state.title &&
  (state.stage === null || state.stage === undefined) && !state.reveal && !state.ending &&
  state.book === null && !state.upgrades && !state.achievements && !state.admin;
