// THE SETTINGS, at the owner's word: a gear in the top right corner of the start page
// and of the world map. Tapped, it opens a dark panel with the Music and Effects
// sliders — the pause menu's own (drawSoundPanel in render.js) — Send feedback (src/
// feedback.js), and, on the world
// map only, Reset campaign, which asks before it acts as Restart and Quit do: the
// first tap arms it and reads "Confirm?", the second, within a few seconds, does it.
//
// The geometry lives here and the drawing in render.js and the taps in input.js, the
// same split as achievepage.js, so input.js hit-tests exactly the rects that get drawn.

// THE GEAR, top right: its centre, and the tap round it (64 across, as every control).
export const SETTINGS_ICON = { cx: 914, cy: 44 };
export const SETTINGS_BTN = { x: 880, y: 10, w: 68, h: 68 };

// FULL SCREEN, at the owner's word, where the device allows it — a phone's browser on
// Android, a computer — and nowhere else: an iPhone's Safari lets nothing but a video
// fill its screen, and a button there would do nothing. Asked of the page once.
const doc = typeof document !== 'undefined' ? document : null;
// NOT ON CRAZYGAMES, whose page has its own and forbids one in the game (window.__portal
// is set by their build: tools/itch.mjs --crazygames).
const PORTAL = typeof window !== 'undefined' && window.__portal;
export const FULLSCREEN_OK = !PORTAL && !!(doc && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled));
export const isFullscreen = () => !!(doc && (doc.fullscreenElement || doc.webkitFullscreenElement));

// THE PANEL, in the middle of the screen: the title, the two sliders, a row under them
// with Full screen (where the device has it) and Send feedback, and the buttons in a
// row at the foot — Reset campaign and Done on the map, Done alone on the start page.
// Send feedback takes the whole middle row where there is no Full screen.
const TOP = 92;
export const SETTINGS_SHEET = { x: 290, y: TOP, w: 380, h: 306 };
export const SETTINGS_TITLE_Y = TOP + 38;
export const SETTINGS_SOUND = { x: 330, y: TOP + 66, w: 300, h: 92 };
export const SETTINGS_FULL = { x: 328, y: TOP + 186, w: 145, h: 38 };
export const SETTINGS_FEEDBACK = FULLSCREEN_OK
  ? { x: 487, y: TOP + 186, w: 145, h: 38 }
  : { x: 380, y: TOP + 186, w: 200, h: 38 };
const ROW_Y = TOP + 242, ROW_H = 38;
export const SETTINGS_RESET = { x: 328, y: ROW_Y, w: 170, h: ROW_H };
export const SETTINGS_DONE_MAP = { x: 522, y: ROW_Y, w: 110, h: ROW_H };
export const SETTINGS_DONE_TITLE = { x: 425, y: ROW_Y, w: 110, h: ROW_H };
export const settingsDone = state => state.settings === 'map' ? SETTINGS_DONE_MAP : SETTINGS_DONE_TITLE;

const inside = (b, x, y, p = 0) => x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p;
export const hitSettingsButton = (x, y) => inside(SETTINGS_BTN, x, y);
export const insideSettings = (x, y) => inside(SETTINGS_SHEET, x, y);
export const hitSettingsReset = (state, x, y) => state.settings === 'map' && inside(SETTINGS_RESET, x, y, 8);
export const hitSettingsDone = (state, x, y) => inside(settingsDone(state), x, y, 8);
export const hitSettingsFull = (x, y) => FULLSCREEN_OK && inside(SETTINGS_FULL, x, y, 8);
export const hitSettingsFeedback = (x, y) => inside(SETTINGS_FEEDBACK, x, y, 8);

// INTO FULL SCREEN, or out of it — the whole page, so the board keeps its own fitting,
// and on a phone turned sideways for good while it lasts. A browser takes it only from
// the player's own press, and on a touch screen that is the finger LIFTING, not landing
// — so the tap asks (`state.wantFullscreen`) and input.js answers on pointerup.
export function toggleFullscreen() {
  if (!FULLSCREEN_OK) return;
  if (isFullscreen()) {
    (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc)?.catch?.(() => {});
    return;
  }
  const el = doc.documentElement;
  const ask = el.requestFullscreen || el.webkitRequestFullscreen;
  const done = ask.call(el, { navigationUI: 'hide' });
  const lock = () => { try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch { /* not this device */ } };
  if (done && done.then) done.then(lock).catch(() => {}); else lock();
}

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
