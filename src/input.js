import { level, useLevel } from './level.js';
import { PLOT_R, hitHudButton, hitStart, hitMapButton, hitDifficultyButton, hitPauseButton } from './render.js';
import { openMenu, closeMenu, hitMenu, hitCancel, canUse, refundValue, RING_R } from './menu.js';
import { makeUnits, moveUnits, removeUnits } from './units.js';
import { towerBox } from './towers.js';
import { puff } from './smoke.js';
import { clampToRange } from './ground.js';
import { callWaveEarly } from './waves.js';
import { pickFigure } from './select.js';
import { solo, play, unlock, selectionCue, familyCue, CUE, SELECT } from './audio.js';
import { hitBookButton, openBook, tapBook } from './book.js';
import { ADMIN_BTN, openAdmin, tapAdmin } from './admin.js';
import { AIM_MODES } from './data/towers.js';

// How far outside the menu ring the mouse may stray before a menu that opened
// itself on hover closes again. Without the slack, the gap between the ring and
// a button's edge is enough to make the menu flicker as you cross it.
const HOVER_SLACK = 26;

// A padded hit test for the title screen's own small controls. 10px each side
// takes the 84x38 admin button to 104x58 tapped — the same trick the book footer
// and the pause row use, and for the same reason: shrinking the picture must
// never shrink the target.
const CORNER_PAD = 10;
const inside = (b, x, y) =>
  x >= b.x - CORNER_PAD && x <= b.x + b.w + CORNER_PAD &&
  y >= b.y - CORNER_PAD && y <= b.y + b.h + CORNER_PAD;

export function attachInput(canvas, state, restart) {
  const at = e => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (960 / rect.width),
      y: (e.clientY - rect.top) * (540 / rect.height)
    };
  };

  canvas.addEventListener('pointerdown', e => {
    const { x, y } = at(e);

    // Every tap, not just the first. A phone will not let sound out until the
    // screen has been touched, and it takes that permission back whenever the
    // context is suspended — the phone locking, a call, the tab going to the
    // background. Asking again on each tap is free when it is already running
    // and is the difference between coming back to the game and coming back to
    // a silent game. It sits above the title-screen gate on purpose, so the
    // Start button is itself the tap that unlocks.
    unlock();

    // ONE CLICK, AT ONE PLACE, and only when the tap did something.
    //
    // The alternative is a play(SELECT) in each of the dozen branches below, and
    // the alternative is how a control quietly ends up silent: a branch added
    // later simply forgets. Every branch answers the same question instead —
    // did this tap act? — and the click is the answer to it.
    //
    // A tap that does NOTHING stays silent, and that is the useful half of the
    // rule. An unaffordable button absorbs its tap rather than acting, a paused
    // board refuses everything but two controls, and bare ground with nothing
    // selected has nothing to say. Clicking at those would teach the player that
    // the click means "heard you" rather than "done".
    if (tap(state, x, y, restart)) play(SELECT);
  });

  // --- desktop hover ---------------------------------------------------------
  //
  // Layered ON TOP of the tap behaviour, never replacing it: every one of these
  // handlers is gated on pointerType === 'mouse', so a phone never sees any of
  // it and nothing the game can only do on hover exists. A touch device gets
  // exactly the game it had before.
  //
  // Two separate things happen here. Hovering a BUILT tower shows its range and
  // its next tier's range, which used to need the menu open. Hovering an EMPTY
  // plot opens the build menu outright, which is the thing you want on a mouse
  // and would be unusable on a thumb.
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;

    // A paused game does not follow the mouse either, and neither does one with
    // the book open. Hovering an empty plot opens its build menu on desktop, so
    // without this the one input that needs no tap at all would walk straight
    // through both — and a radial menu opening itself behind the encyclopedia is
    // a menu the player cannot see and did not ask for.
    if (state.paused || state.book !== null || state.admin) {
      state.hoverTower = null;
      state.ghost = null;
      return;
    }

    const { x, y } = at(e);

    if (state.placing) { state.ghost = { x, y }; return; }

    state.hoverTower = state.towers.find(t =>
      Math.hypot(t.plot.x - x, t.plot.y - y) <= PLOT_R + 8) || null;

    const menu = state.menu;

    // A menu the player opened by clicking is theirs to close. Only ones that
    // opened themselves follow the pointer.
    if (menu && menu.viaHover) {
      const onRing = Math.hypot(menu.cx - x, menu.cy - y) <= RING_R + HOVER_SLACK;
      const onPlot = Math.hypot(menu.plot.x - x, menu.plot.y - y) <= PLOT_R + HOVER_SLACK;
      if (!onRing && !onPlot) closeMenu(state);
    }

    if (state.menu) return;   // never steal a menu that is already up

    const plot = level.plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
    if (plot && !state.towers.some(t => t.plot === plot)) {
      openMenu(state, plot, null);
      state.menu.viaHover = true;
    }
  });

  canvas.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse') return;
    state.hoverTower = null;
    state.ghost = null;
    if (state.menu && state.menu.viaHover) closeMenu(state);
  });
}

// WHAT A TAP DOES, and whether it did anything. Every branch returns true when
// it acted and false when it declined, which is what the click above is keyed
// to — see the note there for why that is one question rather than twelve.
//
// The ORDER is the whole design. Each layer that is up owns the whole screen
// while it is: the book covers the board, the title screen covers the board, the
// HUD sits over both the board and any menu on it. A tap is offered to them in
// that order and the first one that wants it keeps it.
function tap(state, x, y, restart) {
  // THE ADMIN DASHBOARD SWALLOWS EVERYTHING, and it is tested first because it
  // covers the whole board AND is opened from the title screen — so its keypad
  // sits on top of the map buttons, and a digit key must not be answered by the
  // map underneath it.
  if (state.admin) return tapAdmin(state, x, y, restart);

  // THE BOOK SWALLOWS EVERYTHING while it is open, for the same reason and on
  // the same terms. Its own footer is the only thing on screen that acts.
  if (state.book !== null) return tapBook(state, x, y);

  // The title screen owns the whole board: nothing under it may act on a tap,
  // including a plot the Start button happens to be sitting over.
  if (!state.started) {
    if (hitBookButton(state, x, y)) { openBook(state); return true; }

    // The corner button, and the only way into the dashboard. Tested before the
    // map row for the usual reason — it is drawn on top, so it answers first.
    if (inside(ADMIN_BTN, x, y)) { openAdmin(state); return true; }

    const pick = hitMapButton(state, x, y);
    if (pick !== null) {
      // Switching maps rebuilds the game rather than just remembering the
      // choice, because the board behind the title screen is the chosen map:
      // its roads, its plots, its purse. Anything already placed belonged to
      // the other map's plots and cannot come along.
      state.levelIndex = pick;
      useLevel(pick);
      restart();
      return true;
    }

    // Same treatment as the map: a difficulty is a property of the game about
    // to be played, so changing it rebuilds rather than being remembered for
    // later. It scales the wave table and the purse, both of which are read
    // once at newGame.
    const harder = hitDifficultyButton(state, x, y);
    if (harder !== null) {
      state.difficultyIndex = harder;
      restart();
      return true;
    }

    if (hitStart(state, x, y)) { state.started = true; return true; }
    return false;
  }

  if (state.result) { restart(); return true; }

  // The HUD sits above everything and is not part of the board, so it is
  // asked first — otherwise a button that happens to overlap a plot's menu
  // would lose to it.
  const hud = hitHudButton(state, x, y);
  if (hud === 'pause') { togglePause(state); return true; }

  // PAUSED SWALLOWS EVERYTHING ELSE. Not just the board — the speed toggle and
  // the early wave call go too, because "paused" has to mean the game is not
  // moving in any respect. Half a pause, where you can still queue the next
  // wave or spend gold with the clock stopped, is not a pause; it is free
  // thinking time with the shop open.
  //
  // Only the button that undoes it still answers, which is why it is tested
  // first — and the two the pause itself puts on screen. Reading is not playing
  // and neither is leaving: the book spends no gold and starts no wave, and
  // quitting ends the game rather than advancing it.
  if (state.paused) return tapPaused(state, x, y, restart);

  if (hud === 'speed') { toggleSpeed(state); return true; }
  if (hud === 'wave') { callWaveEarly(state); return true; }

  // Placing a rally point swallows the tap: the whole board is the target,
  // so nothing underneath may act on it.
  if (state.placing) {
    setRally(state, state.placing, x, y);
    state.placing = null;
    return true;
  }

  // A menu button wins over anything underneath it, including the plot ring
  // the menu is anchored to.
  const item = hitMenu(state, x, y);
  if (item) {
    // An unaffordable button absorbs the tap rather than closing — and answers
    // with nothing, because nothing happened.
    if (!canUse(state, item)) return false;
    run(state, item);
    return true;
  }

  // Clicking the plot whose menu opened itself on hover PINS that menu rather
  // than dismissing it. Without this, the most natural thing a mouse user does
  // — point at a plot, then click it — lands in the cancel hole at the middle
  // of the ring and closes the menu the hover just opened, so the game looks
  // like it ignored the click.
  if (state.menu && state.menu.viaHover &&
      Math.hypot(state.menu.plot.x - x, state.menu.plot.y - y) <= PLOT_R + 8) {
    state.menu.viaHover = false;
    return true;
  }

  if (hitCancel(state, x, y)) { closeMenu(state); return true; }

  const plot = level.plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
  if (plot) {
    const tower = state.towers.find(t => t.plot === plot) || null;
    openMenu(state, plot, tower);
    // Opened deliberately, so moving the mouse away must not take it back.
    state.menu.viaHover = false;
    // A built tower fills the info box the moment its menu opens: you are
    // deciding whether to upgrade it, which is the one moment its numbers
    // matter. An empty plot has nothing to describe.
    //
    // AND IT DOES SO WITHOUT A VOICE. Selecting a tower is how you read its
    // numbers, and it is done constantly — every time you weigh an upgrade,
    // every time you check what is already there. A line on each of those taps
    // is the same clip several times a minute, which is exactly what the
    // Category A share rules exist to stop, and this was slipping past them by
    // being a different event each time. Building and upgrading still speak;
    // those happen once each. The tap's own click is not a voice and is not
    // subject to any of that.
    state.selected = tower ? { kind: 'tower', ref: tower } : null;
    return true;
  }

  // Nothing to build on here, so this is a look. A figure under the tap gets
  // selected; bare ground clears whatever was.
  //
  // AFTER the plot check, deliberately: soldiers stand on the road and plots
  // sit off it, so the two rarely overlap — but where they do, building is the
  // action and looking is the fallback.
  const had = state.selected;
  closeMenu(state);
  state.selected = pickFigure(state, x, y);
  solo(selectionCue(state.selected));
  // Picking somebody up is an action and so is putting them down; tapping bare
  // ground twice is not.
  return !!(state.selected || had);
}

// The two controls a paused game puts on the board, and nothing else answers.
//
// QUITTING ASKS TWICE. It is the one control in the game that throws away work —
// a wave 7 board is half an hour — and it sits next to the button a player
// presses to read something, which is the mis-tap that would hurt. So the first
// tap ARMS it and the label says so; the second, within a few seconds, does it.
//
// The arming is cleared by anything else that happens, including unpausing, so a
// half-pressed quit can never wait around to catch a later tap.
function tapPaused(state, x, y, restart) {
  const hit = hitPauseButton(state, x, y);

  if (hit === 'book') { state.quitArmed = 0; openBook(state); return true; }

  if (hit === 'quit') {
    const now = performance.now();
    if (state.quitArmed && now < state.quitArmed) {
      // Back to the title screen with the map still chosen — newGame() keeps
      // levelIndex, because which map you are playing is a menu setting rather
      // than part of the game being thrown away.
      restart();
      return true;
    }
    state.quitArmed = now + QUIT_WINDOW;
    return true;
  }

  state.quitArmed = 0;
  return false;
}

// How long a half-pressed quit stays armed, in ms. Long enough to read the
// changed label and press again, short enough that it is never still waiting
// when a thumb comes back to the screen.
const QUIT_WINDOW = 3000;

// Stopping the game also puts away anything the player was in the middle of.
//
// A radial menu left open across a pause is the worst of both: it is the one
// thing on screen that looks like it should still answer a tap, and every one of
// its buttons is dead. Same for a rally point half-placed — the board is armed
// for a tap that will now be ignored. Both are cleared, so a paused game shows
// nothing that invites an action it will refuse.
function togglePause(state) {
  state.paused = !state.paused;
  // A half-pressed Quit never survives the pause it was pressed in, in either
  // direction. Unpausing takes the button off the screen, and pausing again is a
  // new decision rather than the second half of an old one.
  state.quitArmed = 0;
  if (!state.paused) return;
  closeMenu(state);
  state.placing = null;
  state.ghost = null;
}

// 1x and 2x only. A third speed sounds generous and mostly produces a setting
// nobody can tell apart from the one next to it.
function toggleSpeed(state) {
  state.speed = state.speed === 2 ? 1 : 2;
}

// The rally is clamped to the tower's reach here as well as in stations(), so
// the stored point is always one the barracks could actually use — otherwise
// dragging far away and then upgrading would silently teleport the squad.
//
// moveUnits, not makeUnits: the squad walks to the new flag. Rebuilding it here
// is what used to make a rally change replace three wounded men with three fresh
// ones standing back at the barracks.
function setRally(state, tower, x, y) {
  tower.rally = clampToRange(tower.x, tower.y, x, y, tower.def.range);
  moveUnits(state, tower);
  // The squad answering the order. Here rather than on the menu button, because
  // the button only arms the placement — this is the tap that actually moves
  // them, and a voice on the earlier tap would answer an order not yet given.
  //
  // Through familyCue rather than CUE.barracks directly, so the tier that has a
  // voice of its own uses it: a Paladin Keep answers a rally point in the same
  // voice it was built in, and every rung below it still answers for the barracks.
  solo(familyCue(tower.fam.id, tower.def));
}

function run(state, item) {
  const menu = state.menu;

  if (item.act === 'build') {
    const def = item.family.tiers[0];
    state.gold -= def.cost;
    state.towers.push({
      plot: menu.plot,
      fam: item.family,
      def,
      x: menu.plot.x,
      y: menu.plot.y,
      aim: 0,
      cd: 0,
      recoil: 0,
      // Which drawing an animated building is showing, and how long is left of
      // it. Only artillery uses them; every other family has one frame and never
      // touches these. Set here rather than defaulted in the update, because
      // `undefined - dt` is NaN and a NaN clock never reaches a beat boundary —
      // the catapult would stand still forever with no error anywhere.
      beat: 0,
      beatT: 0,
      // Which way an animated building is drawn facing. Latched once per firing
      // cycle rather than per frame — see stepCrew — and 0 means "not decided
      // yet", which reads as the direction the artwork was drawn in.
      face: 0,
      spent: def.cost,
      rally: null,
      // The archer's standing order, and it survives an upgrade for the same
      // reason the rally point does: it is an instruction the player gave, not a
      // property of the tier they gave it to. See AIM_MODES in data/towers.js.
      aimMode: 0,
      // --- abilities ---------------------------------------------------------
      //
      // What this tower has been taught, by id, and the counters the teaching
      // needs. All five are set here rather than appearing on the first tier 4
      // that buys something, for the same reason `beat` and `beatT` are: a field
      // that springs into existence is a field that is `undefined - dt` on the
      // frame before, and a NaN clock never reaches a boundary.
      //
      // They survive an upgrade, exactly as the rally point and the standing order
      // do — though nothing in the game can upgrade INTO an ability today, since
      // only tier 4 offers any and tier 4 is the top of every ladder.
      abilities: [],
      shots: 0,       // ordinary and special alike, for whose cycle is due
      special: null,  // the ability currently being fired or held
      burst: 0,       // balls still to leave in this burst
      burstT: 0,
      hit: [],        // who this burst has already hit, so the next ball picks somebody else
      locked: null,   // the man Deadeye has painted, during its second of wind-up
      hold: 0         // seconds committed to a special pose: no shot, no swap
    });
    const built = state.towers[state.towers.length - 1];
    makeUnits(state, built);
    // The dust. All three money buttons raise one — see smoke.js for why the
    // BOX is passed rather than the tower.
    puff(state, built.x, built.y, towerBox(built));
    // Show what you just bought. The menu closes on a build, so without this the
    // one moment you most want its numbers is the one moment nothing is selected.
    state.selected = { kind: 'tower', ref: built };
    // PRIORITY, for the same reason an upgrade has it: this is a button the
    // player pressed and gold they spent. Building and upgrading are the two
    // moments a family speaks, and both are deliberate purchases — a swing or a
    // death cry holding either of them off is the channel getting the priority
    // exactly backwards.
    solo(selectionCue(state.selected), true);
  }

  if (item.act === 'upgrade') {
    const t = menu.tower;
    const next = t.fam.tiers[t.def.tier];
    state.gold -= next.cost;
    t.def = next;
    t.spent += next.cost;
    t.cd = 0;
    // AFTER the def is swapped, so the cloud is sized to the building that is
    // arriving rather than the one that just left. On the monastery that is a
    // 29px difference in height between tiers 1 and 2, which is the difference
    // between covering the new roof and not.
    puff(state, t.x, t.y, towerBox(t));
    // Rebuilt rather than patched: the new tier has its own soldier stats and
    // a longer reach, so the rally point moves too.
    makeUnits(state, t);
    // PRIORITY. An upgrade is a button the player pressed and gold they spent,
    // so the reply has to arrive — a Category A channel busy with a swing or a
    // death cry used to swallow it, and that is precisely the moment an upgrade
    // is most likely to be bought. See solo() in audio.js.
    solo(familyCue(t.fam.id, t.def), true);
  }

  if (item.act === 'refund') {
    const t = menu.tower;
    // BEFORE the tower is taken off the board, because the box is measured from
    // its def and there will not be one in a moment. puff() copies what it needs
    // rather than holding the tower, so the cloud outlives it safely.
    puff(state, t.x, t.y, towerBox(t));
    state.gold += refundValue(t);
    removeUnits(state, t);
    state.towers = state.towers.filter(other => other !== t);
    if (state.hoverTower === t) state.hoverTower = null;
    // PRIORITY, and it completes the set: building, upgrading and selling are
    // the three things the player does with gold, and all three now answer
    // whatever else the battle is saying. This one is a noise rather than a
    // voice because there is nobody left in the tower to speak — the selection
    // it would have spoken for has just been taken off the board.
    solo(CUE.sell, true);
  }

  // Arming the placement rather than doing it: the next tap on the board is the
  // rally point. render.js draws the reach and a ghost flag while this is set.
  if (item.act === 'rally') {
    state.placing = menu.tower;
  }

  // TEACHING THE TOWER SOMETHING. The fourth thing gold buys, beside building,
  // upgrading and selling, and it answers in the same voice as the first two — the
  // artist asked for the build-and-upgrade line, and it is the right one: this is
  // the tower's own men being given something, so the tower is who should speak.
  //
  // ADDED TO `spent`, which is what makes the refund honest. Taking down a
  // Musketeer Post that has been taught Deadeye gives back 60% of 650 rather than
  // of 500 — the same rule that stops an upgrade losing you the tiers under it.
  //
  // It LEAVES THE MENU OPEN, like the targeting button and for the same reason:
  // there are two of these side by side, and buying both should be two taps rather
  // than two trips through the ring. The item is rebuilt in place so the price
  // comes off the button under the finger that just paid it.
  if (item.act === 'ability') {
    const t = menu.tower;
    t.abilities.push(item.ability.id);
    state.gold -= item.cost;
    t.spent += item.cost;
    item.owned = true;
    item.available = false;
    item.cost = null;
    // AND THE REFUND BUTTON BESIDE IT, because this menu stays open and that
    // button is quoting a figure that has just changed. It is worked out once when
    // the ring is built — see towerItems — which is right for every other button
    // there, and wrong for this one moment: buying an ability raises `spent` by
    // 150, so the Refund button would go on offering 60% of the old total until
    // the player closed the ring and opened it again.
    const back = menu.items.find(other => other.act === 'refund');
    if (back) back.gain = refundValue(t);
    solo(familyCue(t.fam.id, t.def), true);
    return;
  }

  // THE OTHER BUTTON THAT LEAVES THE MENU OPEN, and it has to: it is a three-way
  // switch, so the second and third settings are one more tap rather than
  // another trip through the ring. The item is rebuilt so the glyph under the
  // finger is the order that is now in force.
  if (item.act === 'target') {
    const t = menu.tower;
    t.aimMode = ((t.aimMode || 0) + 1) % AIM_MODES.length;
    const mode = AIM_MODES[t.aimMode];
    item.glyph = mode.glyph;
    item.label = mode.label;
    // The archers answer, and with PRIORITY. It is the same argument as the
    // three gold buttons: this is an order the player gave, and an order that is
    // sometimes acknowledged and sometimes not reads as a button that sometimes
    // misses. It is also the only feedback that the order LANDED on men rather
    // than on a menu — the glyph changes under a thumb that is covering it.
    //
    // Unlike a build or an upgrade it can be pressed three times in a row, which
    // is exactly what the share rules in audio.js are for: five takes, never the
    // same one twice running, so cycling through all three modes is three
    // different archers answering rather than one line stuttering.
    solo(familyCue(t.fam.id, t.def), true);
    return;
  }

  closeMenu(state);
}
