// Taps. Five screens, and each one owns every tap while it is up — the same rule
// the big game's input follows, and for the same reason: a panel covering the
// board must not let the board answer.

import { PLOT_R, BTN_R, menuItems, MAP_BTN, BOOK_ROW, BOOK_START, BOOK_BACK,
         RESULT_AGAIN, RESULT_MAPS, HUD_H, HUD_BTN, PAUSE_ROW, CERT_BTN, ADMIN_DOT,
         KEY_R, keyAt, KEY_BACK, ADMIN_ROW, ADMIN_RESET,
         CERT_SAVE, CERT_BACK, NAME_BOX } from './render.js';
import { family, maps, build, upgrade, sell, towerAt, moveUnit, clampReach, newGame,
         callWaveEarly, pickFigure } from './rules.js';
import { unlock, play, solo, voiceCue, SELECT } from './audio.js';
import { mapOpen, memberOpen, finished, forget, setSwitch, on as switchOn,
         SWITCHES, UNLOCK_PIN } from './progress.js';

// Every box in this file is padded before it is tested. The drawn controls are
// small — this is a 960-unit board on a phone — and shrinking the picture must
// never shrink the target.
const inside = (b, x, y, pad = 8) =>
  x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

export function attach(canvas, state, restart, download) {
  canvas.addEventListener('pointerdown', e => {
    // EVERY TAP, not just the first. A phone locking, a call arriving or the tab
    // going to the background all suspend the audio context again, and without
    // this the game comes back mute.
    unlock();

    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (960 / r.width);
    const y = (e.clientY - r.top) * (540 / r.height);

    // ONE CLICK, AT ONE PLACE, AND ONLY WHEN THE TAP DID SOMETHING. Straight out
    // of the big game, along with the file that makes the noise.
    //
    // The alternative is a play(SELECT) in each of the fifteen branches below,
    // and that is how a control quietly ends up silent: a branch added later
    // simply forgets. Every branch answers the same question instead — did this
    // tap act? — and the click is the answer to it.
    //
    // A tap that does NOTHING stays silent, and that is the useful half of the
    // rule. An unaffordable button absorbs its tap rather than acting, a paused
    // board refuses everything but its three controls, and bare ground with
    // nothing open has nothing to say. Clicking at those would teach the player
    // that the click means "heard you" rather than "done".
    if (tap(state, x, y, restart, download)) play(SELECT);
  });
}

// Returns whether the tap DID anything. See the note above for why that is the
// return value rather than nothing.
function tap(state, x, y, restart, download) {
  if (state.screen === 'maps') {
    // THE KEYPAD OWNS THE SCREEN while it is up, the same rule every panel in this
    // file follows.
    if (state.keypad) return keypad(state, x, y);

    if (inside(ADMIN_DOT, x, y, 10)) {
      state.keypad = { typed: '', wrong: false, open: false, confirm: false, said: null };
      return true;
    }
    if (finished() && inside(CERT_BTN, x, y)) { state.screen = 'certificate'; return true; }

    const i = maps.findIndex((_, n) => inside(MAP_BTN(n), x, y));
    // A LOCKED MAP ABSORBS ITS TAP. It is a picture of somewhere you cannot go
    // yet, and the sentence under it already says why; a click would say "done".
    if (i < 0 || !mapOpen(i)) return false;
    restart(i);
    return true;
  }

  // A CHAPTER HAS ONE WAY ON and nothing else answers, which is the whole of it.
  // Anywhere on the page works as well as the button — a five-year-old reading a
  // story taps the story — but the button is what says so.
  if (state.screen === 'story') {
    state.screen = state.story.then;
    state.story = null;
    return true;
  }

  if (state.screen === 'certificate') {
    // The name field is a real HTML input sitting over this box, so a tap inside
    // it never reaches here — the browser takes it. The test is still worth
    // having: it stops a tap on the field from being read as a tap on nothing and
    // clicking, which would be a click the field did not make.
    if (inside(NAME_BOX, x, y)) return false;
    if (inside(CERT_SAVE, x, y) && !state.saving) { download(); return true; }
    if (inside(CERT_BACK, x, y)) { state.screen = 'maps'; return true; }
    return false;
  }

  if (state.screen === 'won' || state.screen === 'lost') {
    // Straight back into the same map rather than through the picker, which is
    // what somebody who has just lost actually wants.
    if (inside(RESULT_AGAIN, x, y)) { restart(state.mapIndex, true); return true; }
    if (inside(RESULT_MAPS, x, y)) { state.screen = 'maps'; return true; }
    return false;
  }

  // THE FAMILY POP-UP SWALLOWS EVERYTHING while it is up, and it is a pause in
  // itself — main.js only steps the fight on the 'play' screen. Tapping one of the
  // four opens their long description in the same panel.
  if (state.screen === 'family') {
    if (inside(BOOK_START, x, y)) {
      state.screen = 'play';
      state.begun = true;
      state.reading = null;
      return true;
    }
    if (state.reading && inside(BOOK_BACK, x, y)) { state.reading = null; return true; }
    const m = family.find((_, i) => inside(BOOK_ROW(i), x, y));
    // A locked card has no description to open, so its tap does nothing — the
    // card itself already says what would open it.
    if (!m || m === state.reading || !memberOpen(m.id)) return false;
    state.reading = m;
    return true;
  }

  // THE DASHBOARD IS ABOVE THE BOARD, so it is asked first — otherwise a button
  // that happens to sit over a plot's menu would lose to it. 14px of padding takes
  // the 36px-tall controls to 64 tapped.
  if (inside(HUD_BTN.pause, x, y, 14)) { state.paused = !state.paused; return true; }
  if (inside(HUD_BTN.chars, x, y, 14)) {
    // Reading is not playing. Going back for a reminder stops the clock, which is
    // the whole reason the pop-up is a screen rather than an overlay.
    state.screen = 'family';
    state.reading = null;
    state.menu = null;
    state.placing = null;
    return true;
  }
  // The one control that can be pressed and refuse: the button goes dead while a
  // wave is walking, and callWaveEarly says so. A dead button makes no noise.
  if (inside(HUD_BTN.wave, x, y, 14)) return callWaveEarly(state);

  // PAUSED SWALLOWS THE BOARD. Only the three buttons it puts on screen answer, so
  // a paused game cannot be built on, sold from or ordered about — "paused" has to
  // mean the game is not moving in any respect, not just that the thugs are still.
  if (state.paused) {
    if (inside(PAUSE_ROW.resume, x, y)) { state.paused = false; return true; }
    if (inside(PAUSE_ROW.restart, x, y)) { restart(state.mapIndex, true); return true; }
    if (inside(PAUSE_ROW.quit, x, y)) {
      restart(state.mapIndex);
      state.screen = 'maps';
      return true;
    }
    return false;
  }

  // Sending Papa or Mommy somewhere: the whole board is the target, so the tap
  // goes nowhere else.
  if (state.placing) {
    const t = state.placing;
    t.rally = clampReach(t.x, t.y, x, y, t.level.range);
    moveUnit(state, t);
    state.placing = null;
    return true;
  }

  if (state.menu) {
    for (const it of menuItems(state, state.menu)) {
      if (Math.hypot(it.x - x, it.y - y) > BTN_R + 4) continue;
      // An unaffordable button ABSORBS the tap rather than acting on it, which is
      // why this returns false rather than falling through to the board.
      if (!it.on) return false;
      return run(state, it);
    }
    // The hole in the middle closes it, the same as the big game's.
    if (Math.hypot(state.menu.cx - x, state.menu.cy - y) <= 40) {
      state.menu = null;
      return true;
    }
  }

  const plot = state.map.plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
  if (plot) {
    const tower = towerAt(state, plot);
    state.menu = { plot, tower, cx: plot.x, cy: clampY(plot.y) };
    // A plot with somebody on it fills the panel as well as opening the ring; an
    // empty one clears it, because four build buttons are open at once there and
    // the panel can only describe one of them.
    select(state, tower ? { kind: 'tower', ref: tower } : null);
    return true;
  }

  // THE PLOTS ARE ASKED FIRST and the figures second, which is the right way
  // round: a plot is a control and a figure is a thing to look at, and Papa
  // standing over his own plot must not swallow the ring that sells him.
  const figure = pickFigure(state, x, y);
  if (figure) {
    state.menu = null;
    select(state, figure);
    return true;
  }

  // Bare ground. It clears whatever was open, and it is only an ACTION if there
  // was something to clear — tapping empty grass on an empty board does nothing
  // and should sound like nothing.
  const had = !!(state.menu || state.selected);
  state.menu = null;
  select(state, null);
  return had;
}

// THE GROWN-UP'S KEYPAD. Four digits, and then a panel of four things — three
// switches over the story's locks and a reset that undoes the story.
function keypad(state, x, y) {
  const k = state.keypad;

  if (inside(KEY_BACK, x, y, 10)) { state.keypad = null; return true; }
  if (k.open) return admin(state, k, x, y);

  for (let n = 0; n <= 9; n++) {
    const p = keyAt(n);
    if (Math.hypot(p.x - x, p.y - y) > KEY_R + 6) continue;
    k.typed += String(n);
    k.wrong = false;
    if (k.typed.length < UNLOCK_PIN.length) return true;
    // Four in: right or wrong, the slate is cleared either way, so a wrong guess
    // cannot be corrected by adding a fifth digit.
    if (k.typed === UNLOCK_PIN) { k.open = true; k.typed = ''; }
    else { k.typed = ''; k.wrong = true; }
    return true;
  }
  return false;
}

// The panel behind the code. The three switches toggle and say so; the reset asks
// once and then does it.
function admin(state, k, x, y) {
  const i = SWITCHES.findIndex((_, n) => inside(ADMIN_ROW(n), x, y));
  if (i >= 0) {
    const s = SWITCHES[i];
    const want = !switchOn(s.key);
    setSwitch(s.key, want);
    k.confirm = false;
    k.said = `${s.label} — ${want ? 'on' : 'off'}`;
    return true;
  }

  if (inside(ADMIN_RESET, x, y)) {
    // ASKED TWICE, because it is the only tap in this game that destroys
    // something somebody earned, and because the row above it is a toggle — a
    // finger that meant the third switch must not wipe the stars.
    if (!k.confirm) { k.confirm = true; k.said = 'That erases the stars as well'; return true; }
    forget();
    k.confirm = false;
    k.said = 'Back to the beginning';
    return true;
  }

  // Anywhere else on the panel takes back the question rather than answering it.
  if (k.confirm) { k.confirm = false; k.said = null; return true; }
  return false;
}

// Put somebody in the panel, and let them say so. The voice is the big game's
// habit and worth keeping: tapping one of the four should answer, and Category A
// means four taps in a row are four lines rather than four at once.
//
// Only a FAMILY member speaks. A thug has no line recorded, and `voiceCue`
// answering null for anything it does not know is what keeps that from being a
// branch here.
function select(state, sel) {
  const same = state.selected && sel && state.selected.ref === sel.ref;
  state.selected = sel;
  if (!sel || same) return;
  // A plot and the person it sent out both carry `member`; a thug carries `def`
  // and has no line recorded.
  if (sel.kind !== 'enemy') solo(voiceCue(sel.ref.member.id));
}

// Keep the ring off the dashboard and off the bottom edge. The plot itself stays
// where it is; only the ring moves, which is the same trick the big game plays,
// minus the leader line — with four buttons on a 74px ring there is never much of
// a gap to explain.
const clampY = y => Math.max(HUD_H + 74 + BTN_R, Math.min(540 - 74 - BTN_R, y));

// What a ring button does, and whether it did it.
function run(state, it) {
  const menu = state.menu;

  // Building and upgrading select what they just paid for, so the numbers the
  // player was choosing between are still on screen once they have chosen. Both
  // already play their own line inside rules.js, which is why neither goes
  // through select() — it would be the same voice twice.
  if (it.act === 'build') {
    if (!build(state, menu.plot, it.member)) return false;
    state.selected = { kind: 'tower', ref: towerAt(state, menu.plot) };
    state.menu = null;
    return true;
  }
  if (it.act === 'upgrade') {
    if (!upgrade(state, menu.tower)) return false;
    state.selected = { kind: 'tower', ref: menu.tower };
    state.menu = null;
    return true;
  }
  if (it.act === 'sell') {
    sell(state, menu.tower);
    state.selected = null;
    state.menu = null;
    return true;
  }
  if (it.act === 'rally') {
    state.placing = menu.tower;
    state.menu = null;
    return true;
  }
  return false;
}

export { newGame };
