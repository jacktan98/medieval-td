// Drawing. One file, no depth sorting beyond a y-sort, no ghosting, no blood —
// this game shows a map, four people, some thugs and four screens.
//
// EVERYTHING IS DRAWN AT THE BIG GAME'S SCALE, 105/512 of the source file. That
// is not a coincidence or a copied constant: the thugs on this board ARE the big
// game's thugs, so anything standing next to one has to be measured with the same
// ruler or the family come out as giants.
//
// The vector placeholders are still here, under every drawing, and they are worth
// keeping now that the art has landed: they are what a missing file looks like,
// and a game that draws a plain disc is a game that can still be played.

import { art } from './assets.js';
// The four borrowed icons' trims, read from the big game's own table rather than
// copied — see the note in assets.js.
import { ui } from '../../src/data/ui.js';
import { family, maps, inReach, SQUASH, levelOf, refundValue, refundOf, waveSize,
         canCallWave, earlyBonus } from './rules.js';

const W = 960, H = 540;

const INK = '#3A3026';
const INK_MUTED = 'rgba(58,48,38,0.62)';
const SHEET = '#EFE4C8';
const EDGE = '#8A7A56';
const CREAM = '#F0E6D2';

export const PLOT_R = 30;

// The board's scale, and the shot's. The slime is 50 source pixels across, which
// at the board scale is a 10px blob — too small to see coming on a phone held by
// somebody who is five. 1.4x puts it at 14, which still has source pixels to
// spare at the 3x device cap (see birthday/tools/art.mjs).
const SCALE = 105 / 512;
const SHOT_SCALE = SCALE * 1.4;

// --- the board ------------------------------------------------------------------

export function draw(ctx, state) {
  ctx.clearRect(0, 0, W, H);

  if (state.screen === 'maps') { drawMapPick(ctx, state); return; }

  drawGround(ctx, state);
  drawPlots(ctx, state);
  if (state.menu) drawReach(ctx, state.menu.tower);
  drawShots(ctx, state);
  drawFigures(ctx, state);
  drawHud(ctx, state);
  drawMenu(ctx, state);
  // AFTER the menu, because the ring can be opened on a plot in the top right and
  // a panel half under it says nothing. The ring is the control; this is the
  // reading, and the reading wins.
  drawStats(ctx, state);

  // NO VEIL OVER A PAUSED BOARD, and that is on purpose — the reason to pause this
  // game is to look at what is happening, and greying out the thing you paused to
  // study answers the wrong question. The menu sits in the strip above it instead.
  if (state.paused) drawPauseMenu(ctx, state);
  if (state.screen === 'family') drawFamilyBook(ctx, state);
  if (state.screen === 'won' || state.screen === 'lost') drawResult(ctx, state);
}

function drawGround(ctx, state) {
  const img = art[state.map.art];
  if (img) { ctx.drawImage(img, 0, 0, W, H); return; }
  ctx.fillStyle = '#4E7A46';
  ctx.fillRect(0, 0, W, H);
}

function drawPlots(ctx, state) {
  const marker = art.plot_marker;
  for (const p of state.map.plots) {
    if (state.towers.some(t => t.plot === p)) continue;
    if (marker) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(marker, p.x - 34, p.y - 20, 68, 40);
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = 'rgba(240,230,210,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, PLOT_R, PLOT_R * SQUASH, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// The reach of whatever the menu is open on, or of the person being placed. An
// ellipse, because the rule is an ellipse — see inReach in rules.js.
function drawReach(ctx, t) {
  if (!t) return;
  ctx.save();
  ctx.fillStyle = 'rgba(240,230,210,0.10)';
  ctx.strokeStyle = 'rgba(240,230,210,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, t.level.range, t.level.range * SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- one way to put a drawing on the board ----------------------------------------
//
// A pose is `{ sprite, trim, pivot }` out of data.js. It is drawn STANDING ON the
// point given: the pivot is the middle of the shadow the artist painted, so the
// point is the ground, not the middle of the picture. `dir` of -1 mirrors it.
//
// Returns false if the file is not loaded, so the caller can fall back.
function pose(ctx, p, x, y, dir = 1, k = SCALE) {
  const img = p && art[p.sprite];
  if (!img) return false;
  const [sx, sy, sw, sh] = p.trim;
  const dw = sw * k, dh = sh * k;
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, sw, sh, -p.pivot[0] * dw, -p.pivot[1] * dh, dw, dh);
  ctx.restore();
  return true;
}

// Which way a drawing has to be turned to be looking at `look` (+1 right, -1
// left). A member with no `faces` is drawn facing the camera and never turns.
const turn = (member, look) =>
  member.art.faces && look !== member.art.faces ? -1 : 1;

// --- everybody on the board -----------------------------------------------------

function drawFigures(ctx, state) {
  // Rei's smell, under everything, so figures walk through it rather than behind
  // it.
  for (const t of state.towers) if (t.member.kind === 'aura') drawStink(ctx, t);

  const all = [
    ...state.towers.map(t => ({ y: t.y, run: () => drawTower(ctx, t) })),
    ...state.units.filter(u => u.down <= 0).map(u => ({ y: u.y, run: () => drawUnit(ctx, u) })),
    ...state.enemies.map(e => ({ y: e.y, run: () => drawEnemy(ctx, e) }))
  ];
  all.sort((a, b) => a.y - b.y);
  for (const item of all) item.run();

  for (const u of state.units) if (u.down > 0) drawDown(ctx, u);
}

// A soft ring that breathes, so the reach reads as doing something even when
// nothing is in it — and up to four stink marks ON THE ROAD inside it, which is
// where the smell actually matters. rules.js decides where those go.
function drawStink(ctx, t) {
  const pulse = 0.5 + 0.5 * Math.sin((t.stink || 0) * Math.PI * 2);
  ctx.save();
  ctx.fillStyle = `rgba(150,170,60,${0.09 + 0.04 * pulse})`;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, t.level.range, t.level.range * SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(150,170,60,${0.30 + 0.15 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // The marks rise and fade on the same beat as the ring, offset a little each so
  // they are not one flashing row.
  for (let i = 0; i < (t.smell || []).length; i++) {
    const s = t.smell[i];
    const beat = ((t.stink || 0) + i * 0.25) % 1;
    ctx.globalAlpha = 0.20 + 0.45 * Math.sin(beat * Math.PI);
    pose(ctx, t.member.cloud, s.x, s.y - 10 - beat * 8, 1);
  }
  ctx.restore();
}

// What a plot shows, and it is two things stacked.
//
// THE NAMEPLATE IS ALWAYS THERE. A flat sign on the ground with the person's
// name, drawn for all four, so a plot says whose it is whether or not anybody is
// standing on it.
//
// ELLA AND REI STAND ON THEIRS and work from there, so the plot draws them too.
// PAPA AND MOMMY DO NOT: they walk out to the road, and drawing them here as well
// put two of each of them on the board, which was the first thing wrong with the
// first build. Their plate stands alone, which is exactly what it is for.
function drawTower(ctx, t) {
  if (!pose(ctx, t.member.art.plate, t.x, t.y, 1)) homePlate(ctx, t);

  if (t.member.kind === 'road') { tierPips(ctx, t.x, t.y - 22, t.tier); return; }

  const swing = t.member.kind === 'aura' ? t.stinking : (t.recoil || 0) > 0;
  const kick = t.member.kind === 'thrower' ? (t.recoil || 0) * 3 : 0;
  // Stood on the plate rather than in the middle of it: the sign lies flat and
  // the person is at the back of it, which is what stops the name being covered.
  figure(ctx, t.member, swing, t.x, t.y - 4 - kick, 1);
  tierPips(ctx, t.x, t.y - 44, t.tier);
}

// The nameplate's stand-in, for the day a plate file goes missing: a flat disc in
// their colour with their initial.
function homePlate(ctx, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,34,24,0.30)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 2, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = t.member.colour;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#22201C';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = CREAM;
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.member.name[0], t.x, t.y);
  ctx.restore();
}

function drawUnit(ctx, u) {
  const look = Math.cos(u.face) >= 0 ? 1 : -1;
  const dir = turn(u.member, look);
  // The lunge goes the way they are looking rather than the way the drawing does,
  // so a mirrored Papa still steps into his swing.
  const lunge = look * u.thrust * 4;
  figure(ctx, u.member, u.thrust > 0, u.x + lunge, u.y, dir);
  bar(ctx, u.x, u.y - 40, 26, u.hp / u.maxHp, '#6BBF59');
}

// The ring a downed family member leaves behind while they pick themselves up,
// borrowed in spirit from the big game's muster rings.
function drawDown(ctx, u) {
  const done = 1 - u.down / u.tower.level.respawn;
  ctx.save();
  ctx.strokeStyle = 'rgba(240,230,210,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(u.tower.x, u.tower.y - 40, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = u.member.colour;
  ctx.beginPath();
  ctx.arc(u.tower.x, u.tower.y - 40, 9, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx, e) {
  const hit = e.thrust > 0 && e.def.attack;
  const p = hit
    ? { sprite: e.def.attack.sprite, trim: e.def.attack.trim, pivot: e.def.attack.pivot }
    : { sprite: e.def.sprite, trim: e.def.spriteTrim, pivot: e.def.pivot };

  if (!pose(ctx, p, e.x, e.y, e.face === e.def.spriteFaces ? 1 : -1)) {
    ctx.fillStyle = e.def.colour;
    ctx.beginPath();
    ctx.arc(e.x, e.y - e.def.r, e.def.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (e.hp < e.maxHp) bar(ctx, e.x, e.y - e.def.r * 3 - 6, e.def.r * 2.6, e.hp / e.maxHp, '#D4453A');
  // Slimed. A green pip under the health bar, so the slow is visible rather than
  // just felt.
  if (e.slowFor > 0) {
    ctx.fillStyle = '#4FA85A';
    ctx.beginPath();
    ctx.arc(e.x, e.y - e.def.r * 3 - 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShots(ctx, state) {
  for (const s of state.shots) {
    if (pose(ctx, s.art, s.x, s.y, 1, SHOT_SCALE)) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.spin);
    ctx.fillStyle = s.colour;
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// A family member on the board, in whichever of their two poses fits.
function figure(ctx, member, swinging, x, y, dir) {
  const p = swinging ? member.art.attack : member.art.idle;
  if (pose(ctx, p, x, y, dir)) return;
  placeholder(ctx, member, x, y, 32);
}

// What a missing file looks like: a coloured disc with an initial, standing ON
// the point like everything else.
function placeholder(ctx, member, x, y, size) {
  const r = size * 0.38;
  const cy = y - r - 4;

  ctx.save();
  ctx.fillStyle = 'rgba(30,34,24,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, r * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = member.colour;
  ctx.strokeStyle = '#22201C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = CREAM;
  ctx.font = `700 ${Math.round(r * 1.1)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(member.name[0], x, cy + 1);
  ctx.restore();
}

// Which level a plot is on, as pips over the head. Cheaper than three sets of art
// and it is the only thing on the board that says a person has been upgraded.
function tierPips(ctx, x, y, tier) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < tier ? '#E0B24C' : 'rgba(34,32,28,0.35)';
    ctx.beginPath();
    ctx.arc(x - 8 + i * 8, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function bar(ctx, x, y, w, pct, colour) {
  ctx.fillStyle = 'rgba(34,32,28,0.85)';
  ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = colour;
  ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, pct)), 2);
}

// --- the borrowed icons -----------------------------------------------------------
//
// Four pictures standing in for four words. `key` is this folder's asset key and
// `slot` is the big game's entry in data/ui.js, which is where the trim lives.
// Drawn to a HEIGHT, because they sit beside text on a baseline and the gold coins
// are twice as wide as they are tall — fitting that into a square would draw it a
// third of the size of the heart next to it.
function icon(ctx, key, slot, x, cy, h) {
  const img = art[key];
  const [sx, sy, sw, sh] = ui[slot].trim;
  const w = (sw / sh) * h;
  if (img) ctx.drawImage(img, sx, sy, sw, sh, x, cy - h / 2, w, h);
  return w;
}

// An icon and a number, left to right, returning where it ended.
function reading(ctx, key, slot, x, cy, h, text, gap = 7) {
  const w = icon(ctx, key, slot, x, cy, h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w + gap, cy + 1);
  return x + w + gap + ctx.measureText(text).width;
}

// --- the dashboard --------------------------------------------------------------

export const HUD_H = 48;

// How far anything in the strip stays off the edge of the screen. The board is
// 960 wide and phones round their corners; a control flush against the glass is
// one a thumb has to be careful about.
const HUD_PAD = 18;

// The three controls in the strip, right to left: the wave call, pause, and the
// way back to the four descriptions.
//
// 36 DRAWN AND 64 TAPPED. This is played on a phone by a five-year-old, so every
// one of them is padded out in the hit test — the same trick the big game uses
// everywhere, and the reason the boxes here are smaller than they feel.
export const HUD_BTN = {
  chars: { x: 584, y: 6, w: 108, h: 36 },
  pause: { x: 702, y: 6, w: 62, h: 36 },
  wave: { x: 774, y: 6, w: 168, h: 36 }
};

function drawHud(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(34,32,28,0.72)';
  ctx.fillRect(0, 0, W, HUD_H);

  const mid = HUD_H / 2;
  ctx.fillStyle = CREAM;
  ctx.font = '700 18px system-ui, sans-serif';
  reading(ctx, 'icon_gold', 'hud_gold', HUD_PAD, mid, 20, `${state.gold}`);
  reading(ctx, 'icon_life', 'hud_life', HUD_PAD + 118, mid, 22, `${state.lives}`);
  ctx.fillText(`Wave ${state.waveIndex + 1} / ${state.map.waves.length}`, HUD_PAD + 222, mid + 1);

  hudButton(ctx, HUD_BTN.chars, 'The Family', true);
  hudButton(ctx, HUD_BTN.pause, '', true);
  transportGlyph(ctx, HUD_BTN.pause, state.paused);

  // THE WAVE BUTTON SAYS WHAT IT PAYS, which is the whole reason to press it. While
  // the clock is not running it goes dead and reports what the board is doing
  // instead, so the same slot is never blank.
  const live = canCallWave(state);
  const bonus = earlyBonus(state);
  hudButton(ctx, HUD_BTN.wave,
    live ? `Wave now  +${bonus}g` : `${waveSize(state.map.waves[state.waveIndex])} thugs`,
    live, 14, live ? '#8FD07F' : null);
  ctx.restore();
}

// The two bars and the triangle, DRAWN rather than typed. U+23F8 and U+25B6 look
// like a pause and a play in a font that has them and like a tofu box or a stray
// vertical bar in one that does not — and which fonts a phone has is not something
// this game gets to decide. Two rects and a path always work.
function transportGlyph(ctx, b, paused) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctx.save();
  ctx.fillStyle = CREAM;
  if (paused) {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx - 5, cy + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(cx - 6, cy - 8, 4, 16);
    ctx.fillRect(cx + 2, cy - 8, 4, 16);
  }
  ctx.restore();
}

function hudButton(ctx, b, label, on, size = 14, ink = null) {
  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.4;
  ctx.fillStyle = 'rgba(240,230,210,0.14)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,230,210,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = ink || CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

// --- what the selected person is worth ---------------------------------------------
//
// The ring on a plot says what you can DO — build, upgrade, sell, send. It has no
// room to say what you would be getting, and a five-year-old choosing between
// Ella and Rei has no way to find out otherwise. So selecting somebody puts their
// numbers in the top right, out of the way of the road, and it stays up as long as
// the ring does.
//
// AN EMPTY PLOT SHOWS NOTHING, deliberately: four buttons are open at once there
// and a panel can only describe one of them. The four descriptions are what The
// Family button is for.
const STAT_BOX = { x: W - HUD_PAD - 196, y: HUD_H + 12, w: 196 };

function drawStats(ctx, state) {
  const t = state.menu && state.menu.tower;
  if (!t) return;

  const lv = t.level;
  const rows = [];
  if (lv.hp) rows.push(['icon_health', 'stat_health', `${lv.hp}`]);
  rows.push(['icon_damage', 'stat_damage',
    t.member.kind === 'aura' ? `${lv.damage} a second` : `${lv.damage} every ${lv.cd}s`]);

  const h = 46 + rows.length * 22 + 26;
  ctx.save();
  ctx.fillStyle = 'rgba(34,32,28,0.86)';
  ctx.beginPath();
  ctx.roundRect(STAT_BOX.x, STAT_BOX.y, STAT_BOX.w, h, 10);
  ctx.fill();
  ctx.strokeStyle = t.member.colour;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText(t.member.name, STAT_BOX.x + 14, STAT_BOX.y + 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#E0B24C';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(`Lv ${t.tier}`, STAT_BOX.x + STAT_BOX.w - 14, STAT_BOX.y + 22);

  ctx.fillStyle = CREAM;
  ctx.font = '600 13px system-ui, sans-serif';
  rows.forEach(([key, slot, text], i) => {
    reading(ctx, key, slot, STAT_BOX.x + 14, STAT_BOX.y + 46 + i * 22, 16, text);
  });

  ctx.fillStyle = 'rgba(240,230,210,0.62)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Reach ${lv.range}`, STAT_BOX.x + 14, STAT_BOX.y + 46 + rows.length * 22 + 6);
  ctx.restore();
}

// --- paused -----------------------------------------------------------------------
//
// Three buttons in a row under the dashboard. Restart plays this map again from
// the beginning; Quit goes back to the three maps. Neither asks twice: this is a
// birthday game with nothing to lose but a few minutes, and the big game's
// armed-Quit ceremony would be silly here.
//
// THE ROW STANDS CLEAR OF THE STRIP. It used to start 14px under it and the two
// read as one crowded block of controls, which on a paused board is the only thing
// on screen asking to be pressed. 40 is enough to see it as its own thing.
const PAUSE_LABEL_Y = HUD_H + 24;
const PAUSE_ROW_Y = HUD_H + 42;

export const PAUSE_ROW = {
  resume: { x: 293, y: PAUSE_ROW_Y, w: 110, h: 44 },
  restart: { x: 417, y: PAUSE_ROW_Y, w: 118, h: 44 },
  quit: { x: 549, y: PAUSE_ROW_Y, w: 118, h: 44 }
};

function drawPauseMenu(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('Paused', W / 2, PAUSE_LABEL_Y);
  ctx.restore();

  button(ctx, PAUSE_ROW.resume, 'Resume', true);
  button(ctx, PAUSE_ROW.restart, 'Restart', true);
  button(ctx, PAUSE_ROW.quit, 'Quit', true);
}

// --- the ring on a plot ----------------------------------------------------------

export const BTN_R = 30;
export const RING_R = 74;

// Four buttons on an empty plot — one per family member — and two or three on a
// built one. The geometry is here and input.js reads it back, so what is drawn is
// what is tapped.
export function menuItems(state, menu) {
  const items = [];
  const put = (angle, item) => {
    items.push({ ...item, x: menu.cx + Math.cos(angle) * RING_R, y: menu.cy + Math.sin(angle) * RING_R });
  };

  if (!menu.tower) {
    const step = Math.PI * 2 / family.length;
    family.forEach((m, i) => {
      const lv = levelOf(m, 1);
      put(-Math.PI / 2 + i * step, {
        act: 'build', member: m, cost: lv.cost,
        label: m.name, colour: m.colour, on: state.gold >= lv.cost
      });
    });
    return items;
  }

  const t = menu.tower;
  const next = levelOf(t.member, t.tier + 1);
  put(0, next
    ? { act: 'upgrade', cost: next.cost, label: `Lv ${t.tier + 1}`,
        colour: t.member.colour, on: state.gold >= next.cost }
    : { act: 'max', cost: null, label: 'Max', colour: '#6A6458', on: false });
  put(Math.PI, { act: 'sell', gain: refundValue(t), label: 'Sell', colour: '#2F6B27', on: true });
  if (t.member.kind === 'road') {
    put(Math.PI / 2, { act: 'rally', cost: null, label: 'Go', colour: '#3A6EA8', on: true });
  }
  return items;
}

function drawMenu(ctx, state) {
  const menu = state.menu;
  if (!menu) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(240,230,210,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(menu.plot.x, menu.plot.y, PLOT_R, 0, Math.PI * 2);
  ctx.stroke();

  for (const it of menuItems(state, menu)) {
    ctx.globalAlpha = it.on ? 1 : 0.45;
    ctx.fillStyle = 'rgba(34,32,28,0.94)';
    ctx.beginPath();
    ctx.arc(it.x, it.y, BTN_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = it.colour;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = CREAM;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(it.label, it.x, it.y - (it.cost != null || it.gain != null ? 7 : 0));

    if (it.cost != null) {
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText(`${it.cost}g`, it.x, it.y + 10);
    } else if (it.gain != null) {
      ctx.fillStyle = '#8FD07F';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText(`+${it.gain}g`, it.x, it.y + 10);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- the screens ------------------------------------------------------------------

export const MAP_BTN = i => ({ x: 120 + i * 250, y: 220, w: 220, h: 150 });

function drawMapPick(ctx, state) {
  ctx.fillStyle = '#2A2E24';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('Happy Birthday, Mommy', W / 2, 90);
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.7)';
  ctx.fillText('Pick a place to defend', W / 2, 132);

  maps.forEach((m, i) => {
    const b = MAP_BTN(i);
    const img = art[m.art];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.clip();
    if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
    else { ctx.fillStyle = '#4E7A46'; ctx.fillRect(b.x, b.y, b.w, b.h); }
    ctx.restore();

    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.stroke();

    ctx.fillStyle = CREAM;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(m.name, b.x + b.w / 2, b.y + b.h + 26);
  });
}

// The pop-up that introduces the four of them, before a single thug arrives. Four
// down the left with what they do on the right, which is what the artist asked
// for — and tapping one opens the longer version in the same panel.
export const BOOK = { x: 60, y: 44, w: 840, h: 452 };
export const BOOK_ROW = i => ({ x: BOOK.x + 22, y: BOOK.y + 74 + i * 88, w: 300, h: 78 });
export const BOOK_START = { x: BOOK.x + BOOK.w - 212, y: BOOK.y + BOOK.h - 60, w: 190, h: 42 };
// BOTH BUTTONS SIT IN THE BOTTOM RIGHT, side by side, and that is the second time
// this one has moved. Under the four cards it covered Rei; under the text column
// it covered the last line of the description it was there to leave. The corner is
// the only part of the panel nothing is written in.
export const BOOK_BACK = { x: BOOK_START.x - 116, y: BOOK_START.y, w: 104, h: 42 };

// Where the reading stops. The stats sit above the two buttons with a clear gap,
// and the description above them.
const BOOK_TEXT_Y = BOOK.y + 116;
const BOOK_STATS_Y = BOOK.y + BOOK.h - 122;

function drawFamilyBook(ctx, state) {
  ctx.fillStyle = 'rgba(20,22,18,0.86)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = SHEET;
  ctx.beginPath();
  ctx.roundRect(BOOK.x, BOOK.y, BOOK.w, BOOK.h, 14);
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('The Family', W / 2, BOOK.y + 36);

  const open = state.reading;

  family.forEach((m, i) => {
    const b = BOOK_ROW(i);
    const lit = !open || open === m;

    ctx.save();
    ctx.globalAlpha = lit ? 1 : 0.4;
    ctx.fillStyle = 'rgba(58,48,38,0.06)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.strokeStyle = open === m ? m.colour : 'rgba(58,48,38,0.20)';
    ctx.lineWidth = open === m ? 2.5 : 1;
    ctx.stroke();

    portrait(ctx, m, b.x + 42, b.y + b.h - 10);

    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(m.name, b.x + 82, b.y + 24);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '600 12px system-ui, sans-serif';
    const lv = levelOf(m, 1);
    ctx.fillText(role(m), b.x + 82, b.y + 45);
    ctx.fillText(`${lv.cost}g`, b.x + 82, b.y + 63);
    ctx.restore();
  });

  // The right-hand column: what they do. The short version for all four, or the
  // long version for the one that is open.
  const tx = BOOK.x + 350;
  const tw = BOOK.w - 350 - 30;
  ctx.textAlign = 'left';

  if (open) {
    ctx.fillStyle = INK;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(open.name, tx, BOOK.y + 84);
    ctx.fillStyle = INK_MUTED;
    ctx.font = '500 13px system-ui, sans-serif';
    paragraphs(ctx, open.detail, tx, BOOK_TEXT_Y, tw, 19);
    ctx.fillStyle = INK;
    ctx.font = '600 13px system-ui, sans-serif';
    stats(ctx, open, tx, BOOK_STATS_Y);
  } else {
    ctx.fillStyle = INK_MUTED;
    ctx.font = '500 13px system-ui, sans-serif';
    let y = BOOK.y + 84;
    for (const m of family) {
      ctx.fillStyle = m.colour;
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText(m.name, tx, y);
      ctx.fillStyle = INK_MUTED;
      ctx.font = '500 13px system-ui, sans-serif';
      y = paragraphs(ctx, m.blurb, tx, y + 20, tw, 18) + 14;
    }
  }

  // The same panel is the introduction and the reminder, so the button that leaves
  // it says which one this is. `begun` is set the first time it is pressed.
  button(ctx, BOOK_START, state.begun ? 'Back to the game' : 'Start', true);
  if (open) button(ctx, BOOK_BACK, 'All', true);
}

// A card's picture, and it is the one place a drawing is NOT anchored to its
// shadow. On the board Papa has to stand where Papa stands; on a card he has to
// sit in the middle of a 64px column beside his name, and anchoring by the pivot
// hung his swords over the card's left edge — the pivot is under his feet, and his
// feet are nowhere near the middle of a man holding two swords out to one side.
// So the card centres the BOX and stands it on a baseline.
//
// Fitted rather than drawn at the board's scale, too: Rei is a baby and Papa is a
// man, and at the board's scale one card would be a third the size of the other.
// The cost is that Rei — 71 source pixels tall — is upscaled about twice on a very
// wide monitor, which flat art with a heavy outline carries and a photograph
// would not.
const CARD_W = 64;
const CARD_H = 58;

function portrait(ctx, m, cx, groundY) {
  const p = m.art.idle;
  const img = art[p.sprite];
  const [sx, sy, sw, sh] = p.trim;
  if (!img) { placeholder(ctx, m, cx, groundY, CARD_H); return; }
  const k = Math.min(CARD_W / sw, CARD_H / sh);
  ctx.drawImage(img, sx, sy, sw, sh, cx - (sw * k) / 2, groundY - sh * k, sw * k, sh * k);
}

const role = m =>
  m.kind === 'road' ? 'Stands on the road'
  : m.kind === 'aura' ? 'Works from the plot, no aiming'
  : 'Throws from the plot';

// The numbers that matter, with the big game's own heart and sword standing in for
// the words. Health only for the two who can be hurt: nothing in this game can
// reach Ella or Rei on their plots.
function stats(ctx, m, x, y) {
  const lv = levelOf(m, 1);
  let row = y;
  if (lv.hp) {
    reading(ctx, 'icon_health', 'stat_health', x, row, 16, `${lv.hp}`);
    row += 22;
  }
  reading(ctx, 'icon_damage', 'stat_damage', x, row, 16,
    m.kind === 'aura' ? `${lv.damage} a second, to everything in reach`
                      : `${lv.damage} every ${lv.cd}s`);
  ctx.fillText(`Reach ${lv.range}`, x, row + 26);
}

// Wrap a string of paragraphs into `w`, returning the y it finished at. Blank
// lines are paragraph breaks.
function paragraphs(ctx, text, x, y, w, lead) {
  for (const para of text.split('\n\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > w) {
        ctx.fillText(line, x, y);
        y += lead;
        line = word;
      } else line = next;
    }
    if (line) { ctx.fillText(line, x, y); y += lead; }
    y += lead * 0.4;
  }
  return y;
}

// TWO WAYS ON from a finished game, because they are two different intentions:
// have another go at this map, or go and pick a different one. The big game makes
// you go back through the title screen for both; a five-year-old who has just lost
// The Bend wants the left-hand button.
export const RESULT_AGAIN = { x: W / 2 - 200, y: 330, w: 180, h: 48 };
export const RESULT_MAPS = { x: W / 2 + 20, y: 330, w: 180, h: 48 };

function drawResult(ctx, state) {
  ctx.fillStyle = 'rgba(20,22,18,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText(state.result === 'won' ? 'The house is safe!' : 'The thugs got in', W / 2, 220);
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.75)';
  ctx.fillText(state.result === 'won'
    ? `All ${state.map.waves.length} waves held, with ${state.lives} lives left`
    : `They got through on wave ${state.waveIndex + 1}`, W / 2, 268);
  button(ctx, RESULT_AGAIN, 'Play again', true, true);
  button(ctx, RESULT_MAPS, 'Another map', true);
}

function button(ctx, b, label, on, dark = false) {
  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.4;
  ctx.fillStyle = dark ? 'rgba(240,230,210,0.92)' : 'rgba(40,36,28,0.9)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = dark ? INK : CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

export { refundOf, inReach };
