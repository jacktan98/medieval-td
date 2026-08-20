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
// The borrowed icons' trims, read from the big game's own table rather than
// copied — see the note in assets.js. RALLY_FLAG_H and FLAG_FOOT come with the
// flag because a planted flag is drawn by its POLE FOOT, and that measurement
// belongs beside the picture it was taken from.
import { ui, RALLY_FLAG_H, FLAG_FOOT } from '../../src/data/ui.js';
import { family, enemyTypes, maps, mapNames, inReach, SQUASH, SCALE, levelOf, refundValue,
         refundOf, waveSize, canCallWave, earlyBonus, selectionInfo, buildable } from './rules.js';
import { stars, mapOpen, memberOpen, howToOpen, finished, PASS,
         SWITCHES, on as switchOn } from './progress.js';
import { render as certificate } from './certificate.js';

const W = 960, H = 540;

const INK = '#3A3026';
const INK_MUTED = 'rgba(58,48,38,0.62)';
const SHEET = '#EFE4C8';
const EDGE = '#8A7A56';
const CREAM = '#F0E6D2';

export const PLOT_R = 30;

// --- the board ------------------------------------------------------------------

export function draw(ctx, state) {
  ctx.clearRect(0, 0, W, H);

  if (state.screen === 'maps') { drawMapPick(ctx, state); return; }
  if (state.screen === 'certificate') { drawCertificate(ctx, state); return; }

  drawGround(ctx, state);
  drawPlots(ctx, state);
  // The reach of whoever is being looked at or ordered about — and the flag
  // showing where the order last landed. While `placing` is on, the ring is the
  // only thing telling the player how far they may send somebody, so it has to
  // be up then too rather than only while the menu is.
  const showing = state.placing || (state.menu && state.menu.tower);
  if (showing) { drawReach(ctx, showing); drawPost(ctx, state, showing); }
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
// `k` on the pose is how much bigger than the board's scale it is drawn, and only
// the two projectiles carry one — a pellet measured honestly is four pixels long.
function pose(ctx, p, x, y, dir = 1) {
  const img = p && art[p.sprite];
  if (!img) return false;
  const [sx, sy, sw, sh] = p.trim;
  const k = SCALE * (p.k || 1);
  const dw = sw * k, dh = sh * k;
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, sw, sh, -p.pivot[0] * dw, -p.pivot[1] * dh, dw, dh);
  ctx.restore();
  return true;
}

// A projectile, POINTED WHERE IT IS GOING. Its `faces` says which way the drawing
// already points, so Mommy's pellet — drawn facing left, like she is — is turned
// half a turn further than one drawn facing right. Ella's slime carries no
// `faces` at all, because a blob has no front and turning it would be motion
// nobody asked for.
function flying(ctx, p, x, y, angle) {
  const img = p && art[p.sprite];
  if (!img) return false;
  const [sx, sy, sw, sh] = p.trim;
  const k = SCALE * (p.k || 1);
  const dw = sw * k, dh = sh * k;
  ctx.save();
  ctx.translate(x, y);
  if (p.faces) ctx.rotate(angle + (p.faces < 0 ? Math.PI : 0));
  ctx.drawImage(img, sx, sy, sw, sh, -p.pivot[0] * dw, -p.pivot[1] * dh, dw, dh);
  ctx.restore();
  return true;
}

// A drawing on a CARD or in a PANEL rather than on the board, and the difference
// is the anchor. On the board Papa has to stand where Papa stands, so he is drawn
// from his shadow; off it he has to sit in the middle of a column beside his
// name, and anchoring by the pivot hung his swords over the card's left edge —
// the pivot is under his feet and his feet are nowhere near the middle of a man
// holding two swords out to one side. So this centres the BOX and stands it on a
// baseline.
function standing(ctx, p, cx, groundY, k) {
  const img = p && art[p.sprite];
  if (!img) return false;
  const [sx, sy, sw, sh] = p.trim;
  ctx.drawImage(img, sx, sy, sw, sh, cx - (sw * k) / 2, groundY - sh * k, sw * k, sh * k);
  return true;
}

// The biggest box in a set of poses, so a slot can be sized from the art rather
// than from a number somebody typed and stopped checking.
const widest = poses => Math.max(...poses.map(p => p.trim[2]));
const tallest = poses => Math.max(...poses.map(p => p.trim[3]));

// Which way a drawing has to be turned to be looking at `look` (+1 right, -1
// left). A member with no `faces` is drawn facing the camera and never turns.
const turn = (member, look) =>
  member.art.faces && look !== member.art.faces ? -1 : 1;

// --- the rally flag ---------------------------------------------------------------
//
// The big game's own picture, doing both of its jobs: the button that gives the
// order, and the marker showing where the order landed. It is PLANTED rather
// than centred — FLAG_FOOT puts the bottom of the pole on the point, because the
// point is what is being marked, not the middle of the drawing.
function flag(ctx, x, y, h = RALLY_FLAG_H) {
  const img = art.icon_flag;
  if (!img) return false;
  const [sx, sy, sw, sh] = ui.glyph_flag.trim;
  const w = (sw / sh) * h;
  ctx.drawImage(img, sx, sy, sw, sh, x - FLAG_FOOT[0] * w, y - FLAG_FOOT[1] * h, w, h);
  return true;
}

// Where a road character has been told to stand. Only Papa and Mommy have one,
// and it is only up while they are selected or being sent somewhere — a flag on
// every filled plot all game would be four more things on a board that already
// has thugs walking through it.
function drawPost(ctx, state, t) {
  if (t.member.kind !== 'road') return;
  const u = state.units.find(other => other.tower === t);
  if (!u) return;
  if (!flag(ctx, u.rx, u.ry)) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,230,210,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(u.rx, u.ry);
    ctx.lineTo(u.rx, u.ry - 16);
    ctx.stroke();
    ctx.restore();
  }
}

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
  // The pips go over the head, and how high the head is depends on who it is —
  // Rei is a baby 13px tall and Ella is nearly twice that. A fixed height left
  // his pips floating in the air well above him.
  tierPips(ctx, t.x, t.y - 12 - headroom(t.member), t.tier);
}

// How far above the ground a member's resting pose reaches.
const headroom = m => m.art.idle.trim[3] * SCALE * m.art.idle.pivot[1];

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
  // `look` is decided in rules.js and REMEMBERED between frames — see the note on
  // LOOK_DEADBAND there for why it cannot be taken from the angle.
  const dir = turn(u.member, u.look);
  // The lunge goes the way they are looking rather than the way the drawing does,
  // so a mirrored Papa still steps into his swing.
  const lunge = u.look * u.thrust * 4;
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
    if (flying(ctx, s.art, s.x, s.y, s.angle || 0)) continue;
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

// --- what you are looking at ---------------------------------------------------------
//
// The panel in the top right, and it is the big game's info box in miniature: a
// picture of whoever is selected with their numbers beside it, out of the way of
// the road, live for as long as the selection is.
//
// FOUR THINGS CAN PUT SOMETHING IN IT — a plot with somebody on it, Papa or Mommy
// standing on the road, and a thug. That is what the artist asked for, and it is
// also the only way a five-year-old choosing between Ella and Rei can find out
// what the difference is without leaving the board.
//
// An EMPTY plot still shows nothing, deliberately: four build buttons are open at
// once there and a panel can only describe one of them. The four descriptions are
// what The Family button is for.
//
// What it says is decided in rules.js by selectionInfo(); this is only a layout.
const STAT_BOX = { x: W - HUD_PAD - 238, y: HUD_H + 12, w: 238 };

// The portrait slot, and ONE factor for everything that can appear in it — the
// four of them and the three thugs alike. Worked out from the art rather than
// typed, so a Giant Thug is genuinely bigger than a Thug and Rei is genuinely
// smaller than Papa, and a re-export cannot silently overflow the box.
const PANEL_SLOT = { w: 64, h: 54 };
const PANEL_ART = [
  ...family.map(m => m.art.idle),
  ...Object.values(enemyTypes).map(d => ({ trim: d.spriteTrim }))
];
const PANEL_K = Math.min(PANEL_SLOT.w / widest(PANEL_ART), PANEL_SLOT.h / tallest(PANEL_ART));

// The bands inside the panel: a title, then icon rows, then the small print.
const PANEL_TITLE = 24;
const PANEL_ROW = 21;
const PANEL_NOTE = 15;

function drawStats(ctx, state) {
  const info = selectionInfo(state);
  if (!info) return;

  const rows = [];
  if (info.hp !== null) rows.push(['icon_health', 'stat_health', `${info.hp}/${info.maxHp}`]);
  rows.push(['icon_damage', 'stat_damage', info.damage]);

  const { x, y, w } = STAT_BOX;
  const text = PANEL_TITLE + rows.length * PANEL_ROW + info.notes.length * PANEL_NOTE;
  const h = Math.max(text + 22, PANEL_SLOT.h + 20);

  ctx.save();
  ctx.fillStyle = 'rgba(34,32,28,0.86)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = info.colour;
  ctx.lineWidth = 2;
  ctx.stroke();

  // The picture, standing on the floor of its own slot rather than on the floor
  // of the panel, so a tall Papa and a tiny Rei share a baseline.
  standing(ctx, info.pose, x + 12 + PANEL_SLOT.w / 2, y + h / 2 + PANEL_SLOT.h / 2, PANEL_K);

  const tx = x + 12 + PANEL_SLOT.w + 12;
  let ty = y + (h - text) / 2 + PANEL_TITLE / 2;

  ctx.fillStyle = CREAM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(info.name, tx, ty);
  // The level badge, and only a family member has one — a thug is a thug.
  if (info.tier) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#E0B24C';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(`Lv ${info.tier}`, x + w - 12, ty);
  }

  ty += PANEL_TITLE / 2;
  ctx.fillStyle = CREAM;
  ctx.font = '600 12px system-ui, sans-serif';
  for (const [key, slot, label] of rows) {
    reading(ctx, key, slot, tx, ty + PANEL_ROW / 2, 15, label, 6);
    ty += PANEL_ROW;
  }

  ctx.fillStyle = 'rgba(240,230,210,0.62)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const note of info.notes) {
    ctx.fillText(note, tx, ty + PANEL_NOTE / 2);
    ty += PANEL_NOTE;
  }
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
    // ONLY THE PEOPLE WHO HAVE BEEN EARNED, and the ring divides itself between
    // however many that is: two buttons opposite each other on the first map,
    // three at the points of a triangle on the second, four at the compass points
    // on the third. A greyed-out button for somebody who cannot be built would be
    // a tap that does nothing, four times a plot.
    const who = buildable();
    const step = Math.PI * 2 / who.length;
    who.forEach((m, i) => {
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
    // THE FLAG RATHER THAN THE WORD "GO". It is the big game's own rally icon, and
    // the button now looks like the marker it plants — which is the whole reason
    // to borrow a picture instead of drawing a second one.
    put(Math.PI / 2,
      { act: 'rally', cost: null, label: 'Go', icon: 'flag', colour: '#3A6EA8', on: true });
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

    // A button with a picture on it says nothing: the flag IS the label. It falls
    // back to the word if the file has not loaded, which is the same bargain
    // every other drawing in this folder makes.
    if (it.icon === 'flag' && flag(ctx, it.x, it.y + 15, 30)) continue;

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

export const MAP_BTN = i => ({ x: 120 + i * 250, y: 208, w: 220, h: 150 });

// The certificate, offered on the picker once all three are passed. It is the end
// of the story, so it sits under the three maps rather than beside them.
export const CERT_BTN = { x: W / 2 - 150, y: 434, w: 300, h: 44 };

// THE WAY IN FOR A GROWN-UP, in the bottom right, small and unlabelled. Same
// manners as the big game's own admin door: a five-year-old should not find it by
// wondering what a button does, and the owner knows where it is.
export const ADMIN_DOT = { x: W - 46, y: H - 46, w: 34, h: 34 };

function drawMapPick(ctx, state) {
  ctx.fillStyle = '#2A2E24';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 32px system-ui, sans-serif';
  ctx.fillText('Happy Birthday, Mommy', W / 2, 74);
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.7)';
  ctx.fillText('Pick a place to defend', W / 2, 112);

  maps.forEach((m, i) => {
    const b = MAP_BTN(i);
    const open = mapOpen(i);
    const img = art[m.art];

    ctx.save();
    ctx.globalAlpha = open ? 1 : 0.28;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.clip();
    if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
    else { ctx.fillStyle = '#4E7A46'; ctx.fillRect(b.x, b.y, b.w, b.h); }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = open ? EDGE : 'rgba(138,122,86,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = open ? CREAM : 'rgba(240,230,210,0.45)';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(m.name, b.x + b.w / 2, b.y + b.h + 24);

    if (open) {
      // What has been earned here, out of three. Drawn hollow for the ones that
      // have not, so the row always says how many there are to get.
      starRow(ctx, b.x + b.w / 2, b.y + b.h + 50, stars(i), 11);
    } else {
      padlock(ctx, b.x + b.w / 2, b.y + b.h / 2, 26);
      ctx.fillStyle = 'rgba(240,230,210,0.6)';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(`${PASS} stars on ${mapNames[i - 1]}`, b.x + b.w / 2, b.y + b.h + 50);
    }
  });

  if (finished()) button(ctx, CERT_BTN, 'Print your certificate', true, true);

  // The grown-up's door. A ring with three dots in it — no word, because a word
  // is an invitation.
  ctx.save();
  ctx.strokeStyle = 'rgba(240,230,210,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(ADMIN_DOT.x, ADMIN_DOT.y, ADMIN_DOT.w, ADMIN_DOT.h, 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,230,210,0.3)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(ADMIN_DOT.x + 10 + i * 7, ADMIN_DOT.y + ADMIN_DOT.h / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (state.keypad) drawKeypad(ctx, state);
}

// --- the certificate --------------------------------------------------------------
//
// The page on the left at whatever size the board can hold, and the controls on
// the right. The preview is the offscreen A4 canvas scaled down — literally the
// file, not a second drawing of it, so what is on screen is a promise about what
// comes out of the printer.
const CERT_H = 452;
const CERT_W = Math.round(CERT_H * (8.27 / 11.69));
const CERT_AT = { x: 64, y: 44 };

export const NAME_BOX = { x: 400, y: 190, w: 470, h: 52 };
export const CERT_SAVE = { x: 400, y: 292, w: 226, h: 50 };
export const CERT_BACK = { x: 644, y: 292, w: 160, h: 50 };

function drawCertificate(ctx, state) {
  ctx.fillStyle = '#2A2E24';
  ctx.fillRect(0, 0, W, H);

  const page = certificate(state.name || '');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.drawImage(page, CERT_AT.x, CERT_AT.y, CERT_W, CERT_H);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 26px system-ui, sans-serif';
  // TWO WAYS TO BE HERE, and the page says which. Three maps passed is "you did
  // it"; the grown-up's switch is a certificate that has been allowed rather than
  // won, and it should not congratulate anybody for something they have not done.
  const earned = [0, 1, 2].every(i => stars(i) >= PASS);
  ctx.fillText(earned ? 'You did it' : 'Your certificate', 400, 88);
  ctx.fillStyle = 'rgba(240,230,210,0.72)';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(earned ? 'All three held. Put your name on it and print it out.'
                      : 'Put your name on it and print it out.', 400, 124);

  ctx.fillStyle = 'rgba(240,230,210,0.6)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('YOUR NAME', NAME_BOX.x, NAME_BOX.y - 14);

  // The box the HTML field sits over. It is drawn as well as being a real input,
  // so the layout is right even in the moment before the field is positioned —
  // and so a browser that refuses to show the field still shows a form.
  ctx.strokeStyle = 'rgba(240,230,210,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(NAME_BOX.x, NAME_BOX.y, NAME_BOX.w, NAME_BOX.h, 8);
  ctx.stroke();

  button(ctx, CERT_SAVE, state.saving ? 'Making it...' : 'Download PDF', !state.saving, true);
  button(ctx, CERT_BACK, 'Back', true);
}

// --- stars ---------------------------------------------------------------------------
//
// One shape, drawn everywhere a score is shown: the picker, the result screen and
// the certificate. A five-pointed star as a path rather than a character, for the
// same reason the pause glyph is drawn rather than typed — U+2605 is a box in a
// font that has not got it, and which fonts a phone has is not this game's call.
function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.44 : r;
    const x = cx + Math.cos(a) * k;
    const y = cy + Math.sin(a) * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export function starRow(ctx, cx, cy, got, r, gold = '#E0B24C') {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    star(ctx, cx + (i - 1) * (r * 2.4), cy, r);
    if (i < got) { ctx.fillStyle = gold; ctx.fill(); }
    ctx.strokeStyle = i < got ? gold : 'rgba(240,230,210,0.32)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// --- the grown-up's keypad ------------------------------------------------------------
//
// Ten digits and a way out, over the map picker, and a small panel of switches
// behind them. It exists for one stated reason: if Ella cannot finish the game,
// the owner still wants the certificate to be printable, so there has to be a way
// to open things by hand.
//
// Deliberately plain, and deliberately not on the game screen — it is a tool, not
// a feature, and the fewer people who find it the better it works.
export const KEY_R = 34;
export const KEY_PAD = { cx: W / 2, cy: 280, gap: 88 };

// 1-9 in a grid with 0 under the middle, which is every phone's keypad and so
// needs no learning.
export const keyAt = n => {
  const col = n === 0 ? 1 : (n - 1) % 3;
  const row = n === 0 ? 3 : ((n - 1) / 3) | 0;
  return {
    x: KEY_PAD.cx + (col - 1) * KEY_PAD.gap,
    y: KEY_PAD.cy + (row - 1.2) * KEY_PAD.gap
  };
};

// Clear of the 0 key BELOW it, which it was not: the pad's bottom row reaches
// y 472 and this used to start at 470, so the word sat across the key.
export const KEY_BACK = { x: W / 2 - 70, y: 488, w: 140, h: 40 };

// --- what is behind the code ----------------------------------------------------
//
// Four things, and the owner named all four. Three of them are switches over the
// story's locks and the fourth undoes the story altogether, so the fourth is
// drawn apart from the others, in a different colour, and asks a second time
// before it does anything.
export const ADMIN_ROW = i => ({ x: W / 2 - 214, y: 116 + i * 74, w: 428, h: 58 });
export const ADMIN_RESET = { x: W / 2 - 214, y: 356, w: 428, h: 52 };

function drawKeypad(ctx, state) {
  // SOLID, not a wash. At 92% the picker's own title showed through and sat
  // across this panel's heading — two headings in the same place, one of them a
  // ghost. A modal that covers the screen should cover it.
  ctx.save();
  ctx.fillStyle = '#1A1C15';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (state.keypad.open) drawAdmin(ctx, state);
  else drawPad(ctx, state);

  button(ctx, KEY_BACK, state.keypad.open ? 'Done' : 'Back', true);
}

// The panel the code opens: three switches and a reset.
function drawAdmin(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('For grown-ups', W / 2, 62);
  ctx.fillStyle = 'rgba(240,230,210,0.55)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(state.keypad.said || 'Anything opened here can be closed again',
               W / 2, 90);

  SWITCHES.forEach((s, i) => {
    const b = ADMIN_ROW(i);
    const lit = switchOn(s.key);

    ctx.fillStyle = lit ? 'rgba(224,178,76,0.14)' : 'rgba(240,230,210,0.06)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.strokeStyle = lit ? 'rgba(224,178,76,0.7)' : 'rgba(240,230,210,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = CREAM;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(s.label, b.x + 18, b.y + 22);
    ctx.fillStyle = 'rgba(240,230,210,0.5)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(s.note, b.x + 18, b.y + 41);

    // The tick box on the right. A drawn tick rather than a character, the same
    // bargain the padlock and the stars make.
    const cx = b.x + b.w - 34;
    const cy = b.y + b.h / 2;
    ctx.beginPath();
    ctx.roundRect(cx - 13, cy - 13, 26, 26, 6);
    ctx.fillStyle = lit ? '#E0B24C' : 'rgba(240,230,210,0.08)';
    ctx.fill();
    ctx.strokeStyle = lit ? '#E0B24C' : 'rgba(240,230,210,0.35)';
    ctx.stroke();
    if (lit) {
      ctx.strokeStyle = '#241F16';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx - 1, cy + 5);
      ctx.lineTo(cx + 7, cy - 6);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  });

  // The one destructive thing in the game, so it looks like one and it asks.
  const asking = state.keypad.confirm;
  const b = ADMIN_RESET;
  ctx.fillStyle = asking ? 'rgba(168,67,67,0.35)' : 'rgba(168,67,67,0.14)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = asking ? '#D07C7C' : 'rgba(208,124,124,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = asking ? '#F0D6D6' : 'rgba(240,214,214,0.85)';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(asking ? 'Tap again to erase everything' : 'Reset all progress',
               b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

function drawPad(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CREAM;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText(state.keypad.wrong ? 'Not that one' : 'Code', W / 2, 74);

  // What has been typed, as dots rather than digits — the one thing a keypad
  // should not do is show the code to whoever is standing behind you.
  ctx.fillStyle = 'rgba(240,230,210,0.8)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 - 33 + i * 22, 112, 6, 0, Math.PI * 2);
    if (i < state.keypad.typed.length) ctx.fill(); else ctx.stroke();
  }

  ctx.font = '700 22px system-ui, sans-serif';
  for (let n = 0; n <= 9; n++) {
    const p = keyAt(n);
    ctx.fillStyle = 'rgba(240,230,210,0.10)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, KEY_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,210,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.fillText(String(n), p.x, p.y + 1);
  }
  ctx.restore();
}

// A padlock, also drawn rather than typed, and for the same reason. Two of them,
// because the two panels it appears on are opposite colours and one shape tinted
// at the call site would need every caller to know that.
const padlockInk = (ctx, cx, cy, h) => padlockIn(ctx, cx, cy, h, 'rgba(58,48,38,0.5)');
const padlock = (ctx, cx, cy, h) => padlockIn(ctx, cx, cy, h, 'rgba(240,230,210,0.75)');

function padlockIn(ctx, cx, cy, h, ink) {
  const w = h * 0.78;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = h * 0.13;
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.18, w * 0.3, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h * 0.18, w, h * 0.55, 3);
  ctx.fill();
  ctx.restore();
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
    const got = memberOpen(m.id);
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

    const tx = b.x + 10 + CARD.w + 12;
    ctx.textAlign = 'left';

    // A LOCKED CARD SHOWS NOBODY. Not a greyed portrait and not their name — the
    // owner asked for Papa and Rei to be a surprise until they are earned, and a
    // silhouette with a name under it gives away most of the surprise. What it
    // does say is exactly how to open it, because a locked door with no sign on
    // it is just a broken door.
    if (!got) {
      padlockInk(ctx, b.x + 10 + CARD.w / 2, b.y + b.h / 2, 30);
      ctx.fillStyle = INK;
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText('Locked', tx, b.y + 28);
      ctx.fillStyle = INK_MUTED;
      ctx.font = '600 12px system-ui, sans-serif';
      paragraphs(ctx, howToOpen(m.id, mapNames), tx, b.y + 50, b.w - (tx - b.x) - 14, 15);
      ctx.restore();
      return;
    }

    // The column is CARD.w wide and Mommy's shotgun fills every pixel of it, so
    // the text starts clear of the whole slot rather than clear of the average
    // card.
    portrait(ctx, m, b.x + 10 + CARD.w / 2, b.y + b.h - 10);

    ctx.fillStyle = INK;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(m.name, tx, b.y + 24);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '600 12px system-ui, sans-serif';
    const lv = levelOf(m, 1);
    ctx.fillText(role(m), tx, b.y + 45);
    ctx.fillText(`${lv.cost}g`, tx, b.y + 63);
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
    // FOUR NAMES AND FOUR SHORT PARAGRAPHS, and the column has to end above the
    // two buttons in the corner. At two lines each this finishes about 27px clear
    // of them, which is the slack that lets one of the four run to three lines
    // without the last sentence disappearing under Start — which is exactly what
    // happened when the blurbs were first written to whatever length they wanted.
    // The long version is one tap away; a list is meant to be skimmed.
    ctx.fillStyle = INK_MUTED;
    ctx.font = '500 13px system-ui, sans-serif';
    let y = BOOK.y + 80;
    for (const m of family) {
      const got = memberOpen(m.id);
      ctx.fillStyle = got ? m.colour : 'rgba(58,48,38,0.45)';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText(got ? m.name : 'Still to come', tx, y);
      ctx.fillStyle = INK_MUTED;
      ctx.font = '500 13px system-ui, sans-serif';
      y = paragraphs(ctx, got ? m.blurb : howToOpen(m.id, mapNames) + '.',
                     tx, y + 18, tw, 18) + 10;
    }
  }

  // The same panel is the introduction and the reminder, so the button that leaves
  // it says which one this is. `begun` is set the first time it is pressed.
  button(ctx, BOOK_START, state.begun ? 'Back to the game' : 'Start', true);
  if (open) button(ctx, BOOK_BACK, 'All', true);
}

// A CARD'S PICTURE, AND ALL FOUR AT ONE SCALE.
//
// This is the fix for the thing that was wrong with the first set of cards: each
// drawing was fitted to its column, so Rei — a baby 71 source pixels tall — came
// out exactly as big as Papa, and four people of wildly different sizes read as
// four adults of the same height. The factor is worked out ONCE, from the widest
// and the tallest of the four, and every card is drawn at it. Rei ends up about
// two fifths of Papa's height, because he is.
//
// Derived rather than typed so a redrawn Papa resizes the whole set instead of
// silently overflowing his column. See `standing` for why a card is anchored by
// its box rather than by its shadow.
const CARD = { w: 76, h: 62 };
const CARD_ART = family.map(m => m.art.idle);
const CARD_K = Math.min(CARD.w / widest(CARD_ART), CARD.h / tallest(CARD_ART));

function portrait(ctx, m, cx, groundY) {
  if (!standing(ctx, m.art.idle, cx, groundY, CARD_K)) {
    placeholder(ctx, m, cx, groundY, m.art.idle.trim[3] * CARD_K);
  }
}

const role = m =>
  m.gun ? 'Shoots from the road'
  : m.kind === 'road' ? 'Stands on the road'
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
  ctx.fillText(m.gun ? `Shoots ${m.gun}, and sent up to ${lv.range}`
             : m.kind === 'road' ? `Sent up to ${lv.range}`
             : `Reach ${lv.range}`, x, row + 26);
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
// TWO WAYS ON from a finished game, because they are two different intentions:
// have another go at this map, or go and pick a different one. The big game makes
// you go back through the title screen for both; a five-year-old who has just lost
// The Bend wants the left-hand button.
export const RESULT_AGAIN = { x: W / 2 - 200, y: 402, w: 180, h: 46 };
export const RESULT_MAPS = { x: W / 2 + 20, y: 402, w: 180, h: 46 };

function drawResult(ctx, state) {
  ctx.fillStyle = 'rgba(20,22,18,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const won = state.result === 'won';
  ctx.fillStyle = CREAM;
  ctx.font = '700 36px system-ui, sans-serif';
  ctx.fillText(won ? 'The house is safe!' : 'The thugs got in', W / 2, 96);

  // THE STARS ARE THE SCORE and they are the biggest thing on the page, because
  // they are what the next map is bought with. A loss shows three hollow ones
  // rather than nothing: the shape of what was missed is the point.
  starRow(ctx, W / 2, 168, state.score || 0, 26);

  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.75)';
  ctx.fillText(won
    ? `All ${state.map.waves.length} waves held, with ${state.lives} lives left`
    : `They got through on wave ${state.waveIndex + 1}`, W / 2, 214);

  // WHAT THIS WON, and it is the only place the story moves forward. `state.won`
  // is set once when the map is finished, so replaying a map you have already
  // passed does not announce the same unlock again.
  if (state.won) {
    const m = family.find(f => f.id === state.won.member);
    ctx.fillStyle = 'rgba(240,230,210,0.10)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 260, 246, 520, 106, 12);
    ctx.fill();
    ctx.strokeStyle = m.colour;
    ctx.lineWidth = 2;
    ctx.stroke();

    portrait(ctx, m, W / 2 - 200, 336);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#E0B24C';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('UNLOCKED', W / 2 - 150, 272);
    ctx.fillStyle = CREAM;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(`${m.name} joins the family`, W / 2 - 150, 298);
    ctx.fillStyle = 'rgba(240,230,210,0.7)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`and ${mapNames[state.won.map]} is open`, W / 2 - 150, 322);
    ctx.textAlign = 'center';
  } else if (won && state.mapIndex === maps.length - 1 && finished()) {
    // The last door. Nothing is unlocked by finishing Two Rivers, so what it says
    // instead is that the certificate is waiting on the map screen.
    ctx.fillStyle = '#E0B24C';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText('All three held — your certificate is on the map screen', W / 2, 300);
  } else if (won && state.score < PASS) {
    // The useful half of a one-star win: it says WHY nothing opened, which is not
    // obvious when you have just been told the house is safe.
    ctx.fillStyle = 'rgba(240,230,210,0.7)';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`${PASS} stars opens the next one — keep more of your ${20} lives`,
                 W / 2, 300);
  }

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
