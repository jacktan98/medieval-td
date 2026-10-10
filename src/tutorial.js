// STAGE 1 IS THE TUTORIAL, at the owner's word: "Let's make stage 1 a tutorial for new
// players." A run of steps, each a line of advice typed out in Lobster on a dark panel
// in the top right of the board — as if someone were writing it down — and most with an
// arrow at the one thing to press next. A line that asks for something stays up until it has been
// done and then fades; a line of advice fades once it has been read. Each arrives with
// the alert chime. While an arrow is up, that thing (and the pause button) is all the
// board answers.
//
//   before wave 1  — a welcome; the first plot; Archery; how to select a tower (its shadow); the
//                    second plot; Barracks; its rally point; Next wave.
//   wave 1         — the Thug's new-enemy card; then the board stays locked to the end.
//   after wave 1   — Next wave again, early, for the gold; build more towers.
//   after wave 2   — the tier 2 towers arrive as new-tower cards; the first archery
//                    tower selected (by its shadow) and upgraded; and good luck.
//
// TIER 1 ONLY until the tier 2 cards come up (`cap`), and the two towers the player
// was walked through building can never be sold (`kept` on the tower) — upgraded or
// not, at the owner's word.
//
// FOR A NEW PLAYER: it runs on stage 1 until stage 1 has been won once. The admin
// dashboard's fresh start brings it back.
//
// THE STEPS ARE READ OFF THE GAME, not off the taps: a step is done when the board
// shows it done — a menu open on the plot, a tower standing on it, the wave called.
// So the two taps a purchase takes (press, then Confirm), a hover that opens a menu
// with a mouse, and a menu closed halfway all come out right without the tutorial
// having to know about them.
import { level, levels } from './level.js';
import { families } from './data/towers.js';
import { sealOf } from './score.js';
import { alertRects } from './newfoe.js';
import { nearestOn } from './route.js';
import { inRange } from './ground.js';
import { HUD_BTN } from './render.js';
import { BTN_R, HIT_R } from './menu.js';
import { chime, CUE } from './audio.js';
import { BOOK_ICON_HIT } from './book.js';
import { UPGRADES_BTN } from './upgradepage.js';
import { STAGES } from './data/overview.js';

const PLOT_HIT = 38;          // a plot's tap radius, as input.js's (PLOT_R + 8)
const ROAD_HALF = 30;         // how far from the middle of the road a rally tap may land (about half its width)
const TYPE_RATE = 32;         // characters a second, typed
const READ = 3;               // seconds a line stays once typed, and a second per 25 characters more
const FADE = 0.8;             // seconds to fade
// The two plots the player is walked to, by index into stage 1's `plots`: the top one
// by Oakhaven's houses, then the one below it.
const FIRST = 1, SECOND = 0;

// THE WORDS, the owner's, put into plain English. `{click}` is "click" with a mouse and
// "tap" on a phone, at the owner's word — see `touch` below.
const SAY = {
  welcome:  'Welcome, General! There is no time for pleasantries. The thugs are coming, and we need to get you up to speed.',
  plot1:    '{Click} this plot to build a tower to defend the village.',
  archery:  'The Archery tower is reliable and shoots enemies from afar.',
  shadow:   'To select a tower, {click} its shadow on the ground. {Clicking} the top of the tower will not select it.',
  plot2:    '{Click} this plot to build another tower to defend the village.',
  barracks: 'Barracks hold soldiers who block enemies, giving your ranged towers more time to attack them.',
  rallyTap: '{Click} your barracks again to adjust its rally point.',
  rallyBtn: '{Click} here to adjust the rally point.',
  rallySet: '{Click} anywhere on the road inside the circle to move your soldiers there.',
  rallyWhy: 'Rally points are useful: they help create choke points where your ranged towers can deal more damage.',
  call:     'When you are ready, {click} here to start the first wave.',
  foe:      'Reading the cards of new enemies helps you learn how to counter them.',
  early:    '{Click} Next wave as soon as it appears to earn extra gold.',
  more:     'Build more towers to strengthen your defense. More enemies are coming!',
  cards:    'Reading the cards of new towers helps you learn how to use them.',
  select:   'Time to upgrade to a Tier 2 tower. Select your archery tower. Remember: always {click} a tower\'s shadow to select it.',
  upgrade:  '{Click} Upgrade to turn it into a Tier 2 Archery Tower.',
  congrats: 'Congratulations, you now have a Tier 2 Archery Tower!',
  farewell: 'All the best, General! We trust the village is in safe hands.',
  // ON THE WORLD MAP, once stage 1 is won: see MAP_STEPS.
  book:     '{Click} here to review towers, units and enemies. It will help you plan a better defense.',
  upgrades: '{Click} here to spend your hard-earned stars. Upgrades make your towers stronger.',
  next:     'Your next battle is here, General. {Click} here when you are ready!',
  // A NEW GAME'S FIRST WORDS, on the world map: see INTRO.
  intro:    'General, our scouts report large numbers of thugs heading towards Oakhaven. {Click} here to head there!'
};

// A PHONE OR A MOUSE: a coarse pointer to begin with, and then whatever the player
// last pressed with (setTouch, from src/input.js).
let touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const setTouch = on => { touch = !!on; };
const VERB = { click: ['click', 'tap'], Click: ['Click', 'Tap'], clicking: ['clicking', 'tapping'],
               Clicking: ['Clicking', 'Tapping'] };

const plotAt = i => level.plots[i];
const towerOn = (state, i) => state.towers.find(t => t.plot === plotAt(i)) || null;
const menuOn = (state, i) => state.menu && state.menu.plot === plotAt(i) ? state.menu : null;
const tier2 = () => families.map(f => f.tiers[1] && f.tiers[1].name).filter(Boolean);

// A target the arrow points at and a tap may land on: a circle { x, y, r } or a box
// { x, y, w, h }, and which way the arrow comes in from (`from`).
// A PLOT'S RING IS AN OVAL round the marker, at the owner's word: the marker is drawn
// about 99 x 49 px, centred on the plot, so `oval` is its two radii with a little air.
const plotSpot = i => ({ x: plotAt(i).x, y: plotAt(i).y, r: PLOT_HIT, oval: [54, 28], from: 'up' });
const itemSpot = it => ({ x: it.x, y: it.y, r: HIT_R, ring: BTN_R, from: 'up' });
const waveSpot = () => ({ ...HUD_BTN.wave, from: 'down' });
const alertSpot = (state, match) => {
  const r = alertRects(state).find(a => match(a.id));
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h, from: 'right' } : null;
};

// THE STEPS. Each one: `say`, a key into SAY; `when`, whether it may begin (it waits
// until then, saying nothing); `point`, where the arrow is (null for none); `lock`,
// whether only the arrow's target answers taps; `done`, whether it is over; `hold`,
// whether the next wave waits for it; `start`, anything it does as it begins; `skip`,
// whether the game has already gone past it. A step with no `done` is a line of
// advice, over once it has faded — or as soon as it has been typed, if the step after
// it is due (the wave it waits for has ended while the player was still reading).
const STEPS = [
  // THE BOARD LOCKED while the welcome is read, at the owner's word — from the very
  // first frame (see tutorialAllows), so nothing can be built before it.
  // Up for `read` seconds once it is fully typed, at the owner's word, then faded.
  { say: 'welcome', lock: true, read: 5 },
  { say: 'plot1', lock: true, point: () => plotSpot(FIRST),
    done: s => !!menuOn(s, FIRST) || !!towerOn(s, FIRST) },
  { say: 'archery', lock: true, family: 'archery',
    point: s => {
      const m = menuOn(s, FIRST);
      const it = m && !m.tower && m.items.find(i => i.act === 'build' && i.family.id === 'archery');
      return it ? itemSpot(it) : plotSpot(FIRST);
    },
    also: s => { const m = menuOn(s, FIRST); return m ? [plotSpot(FIRST)] : []; },
    done: s => { const t = towerOn(s, FIRST); if (t) t.kept = true; return !!t; } },
  { say: 'shadow', lock: true, point: () => plotSpot(FIRST) },
  { say: 'plot2', lock: true, point: () => plotSpot(SECOND),
    done: s => !!menuOn(s, SECOND) || !!towerOn(s, SECOND) },
  { say: 'barracks', lock: true, family: 'barracks',
    point: s => {
      const m = menuOn(s, SECOND);
      const it = m && !m.tower && m.items.find(i => i.act === 'build' && i.family.id === 'barracks');
      return it ? itemSpot(it) : plotSpot(SECOND);
    },
    also: s => { const m = menuOn(s, SECOND); return m ? [plotSpot(SECOND)] : []; },
    done: s => { const t = towerOn(s, SECOND); if (t) t.kept = true; return !!t; } },
  // THE RALLY POINT, at the owner's word: the barracks again, its Rally button, and a
  // spot on the road inside its reach — only a spot that is one (`allow`), so a tap
  // off the road or outside the ring does nothing and the line stays up.
  { say: 'rallyTap', lock: true, point: () => plotSpot(SECOND),
    done: s => !!(menuOn(s, SECOND) && menuOn(s, SECOND).tower) || s.placing === towerOn(s, SECOND) },
  { say: 'rallyBtn', lock: true,
    point: s => {
      const m = menuOn(s, SECOND);
      const it = m && m.tower && m.items.find(i => i.act === 'rally');
      return it ? itemSpot(it) : plotSpot(SECOND);
    },
    also: s => { const m = menuOn(s, SECOND); return m ? [plotSpot(SECOND)] : []; },
    done: s => !!s.placing && s.placing === towerOn(s, SECOND) },
  { say: 'rallySet', lock: true,
    start: (s, tut) => { tut.rally = (towerOn(s, SECOND) || {}).rally; },
    allow: (s, x, y) => {
      const t = towerOn(s, SECOND);
      return !!t && inRange(t.x, t.y, x, y, t.def.range) && nearestOn(level.routes, x, y).d <= ROAD_HALF;
    },
    done: (s, tut) => !s.placing && (towerOn(s, SECOND) || {}).rally !== tut.rally },
  { say: 'rallyWhy', lock: true },
  { say: 'call', lock: true, point: () => waveSpot(), done: s => s.called !== false },
  // THE THUG'S CARD, as he comes: raised here if the player has met him before and the
  // game did not raise it — a second try at stage 1 still teaches the card.
  { say: 'foe', lock: true, when: s => s.enemies.length > 0,
    start: s => { if (!(s.foeAlerts || []).includes('light_inf')) (s.foeAlerts ||= []).push('light_inf'); },
    point: s => alertSpot(s, id => id === 'light_inf'),
    done: s => !(s.foeAlerts || []).includes('light_inf') && !s.foeCard },
  // AND NOTHING ELSE TO DO IN WAVE 1 but watch it, at the owner's word: no line, and
  // the board still locked, until it is over.
  { lock: true, done: s => s.resting || s.waveIndex >= 1 },
  // THE BONUS RUNS DOWN SLOWLY here (`slow`, a share of the clock's own pace — see
  // updateWaves), at the owner's word, so a new player has the time to find the
  // button and press it while it is still worth something.
  { say: 'early', lock: true, slow: 0.25, when: s => s.resting && s.waveIndex === 0, skip: s => s.waveIndex >= 1,
    point: () => waveSpot(),
    done: s => s.waveIndex >= 1 && !s.resting },
  { say: 'more' },
  // THE TIER 2 TOWERS, as new-tower cards, once wave 2 is beaten — and the next wave
  // waits until the archery tower has been upgraded.
  { say: 'cards', lock: true, hold: true, when: s => (s.resting && s.waveIndex === 1) || s.waveIndex >= 2,
    start: (s, tut) => {
      tut.cap = 2;
      (s.foeAlerts ||= []).push(...tier2().map(tower => ({ tower })));
    },
    point: s => alertSpot(s, id => id && id.tower === tier2()[0]),
    done: s => !(s.foeAlerts || []).some(id => id && id.tower === tier2()[0]) && !s.foeCard },
  { say: 'select', lock: true, hold: true, point: () => plotSpot(FIRST),
    done: s => !!(menuOn(s, FIRST) && menuOn(s, FIRST).tower) || (towerOn(s, FIRST) || {}).def?.tier >= 2 },
  { say: 'upgrade', lock: true, hold: true,
    point: s => {
      const m = menuOn(s, FIRST);
      const it = m && m.tower && m.items.find(i => i.act === 'upgrade' && i.to);
      return it ? itemSpot(it) : plotSpot(FIRST);
    },
    also: s => { const m = menuOn(s, FIRST); return m ? [plotSpot(FIRST)] : []; },
    done: s => ((towerOn(s, FIRST) || {}).def || {}).tier >= 2 },
  { say: 'congrats' },
  { say: 'farewell' }
];

// AND ON THE WORLD MAP, ONCE STAGE 1 IS WON, at the owner's word: the encyclopedia,
// opened and closed, and then the upgrades. It waits for the road to finish drawing
// itself to stage 2, and for nothing else to be open.
const onMap = s => !s.started && (s.stage === null || s.stage === undefined) && !s.reveal &&
  (s.pendingReveal === null || s.pendingReveal === undefined) && s.book === null && !s.upgrades && !s.admin;
const MAP_STEPS = [
  { say: 'book', lock: true, when: onMap, point: () => ({ ...BOOK_ICON_HIT, from: 'up' }),
    done: (s, tut) => { if (s.book !== null) tut.opened = true; return !!tut.opened && s.book === null; } },
  { say: 'upgrades', lock: true, when: onMap, point: () => ({ ...UPGRADES_BTN, from: 'up' }),
    done: s => !!s.upgrades },
  // AND BACK FROM THE UPGRADES, stage 2's flag, until its panel is opened.
  // NOT LOCKED, at the owner's word: the player is free from here, and the arrow is a
  // pointer rather than a gate.
  { say: 'next', when: onMap, point: () => flagSpot(1), done: s => s.stage === 1 }
];
// A STAGE'S FLAG on the world map: the box round the flag standing on its marker (it is
// FLAG_H tall in src/overview.js) down to just under the marker, with the arrow coming
// up from below it, at the owner's word.
const flagSpot = i => ({ x: STAGES[i].x - 24, y: STAGES[i].y - 44, w: 48, h: 56, from: 'down' });

// A NEW GAME'S FIRST STEP, at the owner's word: stage 1's flag, until the player has
// opened it once (kept, `INTRO_KEY`) — or won it, which a saved game from before this
// has. The admin dashboard's fresh start asks for it again (forgetIntro).
const INTRO = [
  { say: 'intro', lock: true, when: onMap, point: () => flagSpot(0),
    done: s => { if (s.stage !== 0) return false; saveIntro(); return true; } }
];
const LISTS = { game: STEPS, map: MAP_STEPS, intro: INTRO };

const INTRO_KEY = 'medieval-td/intro';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const introSeen = () => { try { return !!store()?.getItem(INTRO_KEY); } catch { return true; } };
function saveIntro() { try { store()?.setItem(INTRO_KEY, '1'); } catch { /* private mode: this visit only */ } }
export function forgetIntro() { try { store()?.removeItem(INTRO_KEY); } catch { /* nothing kept */ } }
const stepsOf = tut => LISTS[tut.list];

// A new game's tutorial, or null: stage 1, not yet won.
export function makeTutorial(lv) {
  if (!lv.tutorial || sealOf(lv.id)) return null;
  return { list: 'game', i: 0, begun: false, t: 0, cap: 1, hold: false, done: false, leaving: null, slow: 1 };
}

// The world map's, for a player who has just won stage 1 with the tutorial running.
export const makeMapTour = () => ({ list: 'map', i: 0, begun: false, t: 0, done: false, leaving: null });

// One step of the game's clock: begin the step when it may, end it when it is done.
export function updateTutorial(state, dt) {
  // The menu up now, as this step wants it — every frame, because a menu opened by
  // a hover in the step before is still up in this one.
  if (state.tutorial && !state.tutorial.done) shapeMenu(state);
  run(state, state.tutorial, dt);
}
// And the world map's, on real seconds, while the map is up — the new game's first
// step among them, begun here when it is wanted.
export function updateMapTour(state, dt) {
  if ((!state.mapTour || state.mapTour.done) && !introSeen() && !sealOf(firstStage())) {
    state.mapTour = { list: 'intro', i: 0, begun: false, t: 0, done: false, leaving: null };
  }
  run(state, state.mapTour, dt);
}
const firstStage = () => levels[STAGES[0].level].id;

function run(state, tut, dt) {
  if (!tut || tut.done) return;
  const STEPS = stepsOf(tut);
  const step = STEPS[tut.i];
  if (!tut.begun && step.skip && step.skip(state)) { advance(tut); return; }
  if (!tut.begun) {
    if (step.when && !step.when(state)) return;
    tut.begun = true;
    tut.t = 0;
    tut.leaving = null;
    if (step.start) step.start(state, tut);
    // EVERY LINE ARRIVES WITH THE ALERT, at the owner's word.
    if (step.say) chime(CUE.alert);
  }
  tut.t += dt;
  tut.hold = !!step.hold;
  tut.slow = step.slow || 1;
  // DONE, AND FADING: the line goes once the player has done what it asked, and the
  // next one comes when it has gone.
  if (tut.leaving !== null) {
    if (tut.t - tut.leaving >= FADE) advance(tut);
    return;
  }
  const next = STEPS[tut.i + 1];
  const due = !step.done && next && next.when && next.when(state);
  const over = step.done ? step.done(state, tut) : tut.t >= lineLife(step) || due;
  if (!over) return;
  // A LINE THAT ASKED FOR SOMETHING stays up until it is done, at the owner's word,
  // and then fades.
  // (A step with no line has nothing to fade.)
  if (step.done) { if (step.say) tut.leaving = tut.t; else advance(tut); return; }
  // A line of advice is let finish typing before the next one replaces it.
  if (tut.t < typed(step)) return;
  advance(tut);
}

function advance(tut) {
  tut.leaving = null;
  tut.i++;
  tut.begun = false;
  tut.hold = false;
  tut.slow = 1;
  if (tut.i >= stepsOf(tut).length) tut.done = true;
}

const words = step => (step.say ? SAY[step.say] : '')
  .replace(/\{(\w+)\}/g, (m, w) => (VERB[w] ? VERB[w][touch ? 1 : 0] : m));
const typed = step => words(step).length / TYPE_RATE;
const lineLife = step => typed(step) + (step.read ?? READ + words(step).length / 25) + FADE;

// THE STEP UNDER WAY, or null.
const current = tut => (tut && !tut.done && tut.begun ? stepsOf(tut)[tut.i] : null);

// Whether the next wave is to wait — see updateWaves.
export const tutorialHolds = state => !!(state.tutorial && state.tutorial.hold);

const inSpot = (sp, x, y) => sp && (sp.r !== undefined
  ? Math.hypot(sp.x - x, sp.y - y) <= sp.r
  : x >= sp.x - 4 && x <= sp.x + sp.w + 4 && y >= sp.y - 4 && y <= sp.y + sp.h + 4);

// MAY A TAP HERE DO ANYTHING? Everything, unless a step has locked the board to the
// thing its arrow is on (and the plot under an open menu, so the menu stays up).
export function tutorialAllows(state, x, y) {
  const tut = state.tutorial;
  if (tut && !tut.done && !tut.begun && tut.i === 0) return false;
  return allows(state, tut, x, y);
}
// And on the world map.
export const mapTourAllows = (state, x, y) => allows(state, state.mapTour, x, y);

function allows(state, tut, x, y) {
  const step = current(tut);
  if (!step || !step.lock || tut.leaving !== null) return true;
  if (step.allow) return step.allow(state, x, y);
  const spots = [step.point && step.point(state), ...(step.also ? step.also(state) : [])];
  return spots.some(sp => inSpot(sp, x, y));
}

// A MENU AS THE TUTORIAL WANTS IT, on the plot it has just opened over: only the
// family being taught while one is, no tier past the cap, and no refund on a tower
// the player was walked through building.
export function shapeMenu(state) {
  const tut = state.tutorial, m = state.menu;
  if (!tut || !m) return;
  const step = current(tut);
  for (const it of m.items) {
    if (it.act === 'build' && step && step.family && it.family.id !== step.family) it.available = false;
    if (it.act === 'upgrade' && it.to && it.to.tier > tut.cap) it.available = false;
    if (it.act === 'refund' && m.tower && m.tower.kept) it.available = false;
  }
}

// --- drawn -------------------------------------------------------------------------

// THE LINE ON A DARK PANEL, at the owner's word. `cx` is the panel's centre across,
// `top` its top edge (or `mid`, its centre down), `w` its width. In a game, in the top
// right corner, right of the Next wave button and the arrow under it; on the world
// map, in the middle, clear of the encyclopedia and the upgrades at the bottom.
const BOX = { cx: 826, top: 10, w: 248 };
const MAP_BOX = { cx: 480, mid: 250, w: 340 };
const PAD = 14;               // the panel's margin round the words
const PANEL = 'rgba(20,16,12,0.62)';
const FONT = '17px Lobster, system-ui, sans-serif';
const LINE = 22;
const INK = '#F0E6D2';
// THE ARROW AND ITS RING IN THE GAME'S CREAM, at the owner's word — the #FFEFD4 every
// plate and button is drawn on.
const CREAM = '#FFEFD4';
const EDGE = 'rgba(14,12,10,0.85)';

function wrap(ctx, text, w) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > w && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// The line being typed, on its panel, and the arrow at what to press. Nothing while a
// card is open over the board — it has the player's attention, and the arrow would
// be pointing at something underneath it.
export function drawTutorial(ctx, state) {
  if (state.foeCard || state.result) return;
  drawLine(ctx, state, state.tutorial, BOX);
}
// And the world map's — not over the encyclopedia or the upgrades, which it waits on.
export function drawMapTour(ctx, state) {
  if (state.book !== null || state.upgrades || state.admin) return;
  drawLine(ctx, state, state.mapTour, MAP_BOX);
}

function drawLine(ctx, state, tut, BOX) {
  const step = current(tut);
  if (!step) return;
  const text = words(step);
  const shown = Math.min(text.length, Math.floor(tut.t * TYPE_RATE));
  // A line that asked for something is up until it is done (`leaving`), then fades;
  // a line of advice fades once it has been read.
  const life = lineLife(step);
  const alpha = step.done
    ? (tut.leaving === null ? 1 : Math.max(0, 1 - (tut.t - tut.leaving) / FADE))
    : tut.t < life - FADE ? 1 : Math.max(0, (life - tut.t) / FADE);

  ctx.save();
  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  if (alpha > 0 && text) {
    ctx.globalAlpha = alpha;
    // Laid out on the whole line, so the panel is its full size from the first letter
    // and nothing moves as it is typed.
    const lines = wrap(ctx, text, BOX.w - 2 * PAD);
    const h = lines.length * LINE + 2 * PAD - 4;
    const x = BOX.cx - BOX.w / 2;
    const top = BOX.top ?? BOX.mid - h / 2;
    ctx.beginPath();
    ctx.roundRect(x, top, BOX.w, h, 12);
    ctx.fillStyle = PANEL;
    ctx.fill();
    let left = shown;
    lines.forEach((line, i) => {
      const part = line.slice(0, Math.max(0, left));
      left -= line.length + 1;
      if (!part) return;
      const y = top + PAD + i * LINE;
      ctx.lineWidth = 4;
      ctx.strokeStyle = EDGE;
      ctx.strokeText(part, x + PAD, y);
      ctx.fillStyle = INK;
      ctx.fillText(part, x + PAD, y);
    });
    ctx.globalAlpha = 1;
  }
  const sp = tut.leaving === null && step.point && step.point(state);
  if (sp) arrowAt(ctx, sp, tut.t);
  ctx.restore();
}

// A CREAM ARROW WITH A DARK EDGE, bobbing towards its target, and a ring pulsing round
// a round one.
function arrowAt(ctx, sp, t) {
  const bob = Math.sin(t * 6) * 4;
  let tip, dir;
  if (sp.r !== undefined) {
    const R = sp.ring || sp.r - 8;
    const [rx, ry] = sp.oval || [R + 3, R + 3];
    const pulse = Math.sin(t * 6) * 2;
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
    ctx.lineWidth = 3;
    ctx.strokeStyle = CREAM;
    ctx.beginPath();
    ctx.ellipse(sp.x, sp.y, rx + pulse, ry + pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    tip = [sp.x, sp.y - ry - 6 - bob]; dir = [0, 1];
  } else if (sp.from === 'up') {
    tip = [sp.x + sp.w / 2, sp.y - 4 - bob]; dir = [0, 1];
  } else if (sp.from === 'down') {
    // From below, at the middle of the button, at the owner's word.
    tip = [sp.x + sp.w / 2, sp.y + sp.h + 4 + bob]; dir = [0, -1];
  } else {
    tip = [sp.x + sp.w + 6 + bob, sp.y + sp.h / 2]; dir = [-1, 0];
  }
  // Drawn pointing along `dir`, its tip at `tip`: a head 18 across and 14 deep on a
  // shaft 8 across and 18 long.
  const [tx, ty] = tip, [dx, dy] = dir, nx = -dy, ny = dx;
  const P = (along, side) => [tx - dx * along + nx * side, ty - dy * along + ny * side];
  const pts = [P(0, 0), P(14, 9), P(14, 4), P(32, 4), P(32, -4), P(14, -4), P(14, -9)];
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = EDGE;
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.fill();
}
