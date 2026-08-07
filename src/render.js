import { path, plots, keep } from './data/level01.js';
import { waves } from './data/waves.js';
import { SCALE, arrow } from './data/towers.js';
import { art } from './assets.js';
import { towerBox, mountPoint, muzzlePoint, facing, mirror } from './towers.js';
import { BTN_R, CANCEL_R, canUse } from './menu.js';

const PLOT_R = 30;

// Draws a red dot at each tower's firing origin. Off by default; add ?muzzle
// to the URL to switch it on, so offsets can be checked on a phone without
// editing a file and redeploying.
const DEBUG_MUZZLE = new URLSearchParams(location.search).has('muzzle');

export function draw(ctx, state) {
  ctx.clearRect(0, 0, 960, 540);

  ctx.fillStyle = '#4A5744';
  ctx.fillRect(0, 0, 960, 540);

  drawPath(ctx);
  drawKeep(ctx);
  drawPlots(ctx, state);
  drawTowers(ctx, state);
  drawEnemies(ctx, state);
  drawUnits(ctx, state);
  drawShots(ctx, state);
  drawHits(ctx, state);
  drawHud(ctx, state);
  drawMenu(ctx, state);

  if (state.result) drawResult(ctx, state);
}

// Road width. tools/formation.mjs reads this to check the barracks squad fits,
// so widening the road there and here must stay in step.
export const ROAD_W = 52;

// Drawn as stacked strokes rather than one flat band: a dark cut edge, the
// sunken roadbed, then a lighter crown down the middle. Cheap, and it reads as
// a track worn into the ground instead of a painted line.
function drawPath(ctx) {
  const lay = (width, colour) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  };

  lay(ROAD_W + 8, '#3B4436');   // shadowed lip where the ground is cut away
  lay(ROAD_W, '#6B5844');       // the roadbed
  lay(ROAD_W - 10, '#7A6650');  // worn crown, lit from above
  lay(ROAD_W - 26, '#84705A');  // the rut down the middle
}

function drawKeep(ctx) {
  ctx.fillStyle = '#8A8478';
  ctx.fillRect(keep.x - 22, keep.y - 40, 52, 80);
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(keep.x - 8, keep.y + 6, 20, 34);
}

function drawPlots(ctx, state) {
  for (const p of plots) {
    const taken = state.towers.some(t => t.plot === p);
    if (taken) continue;
    // The open menu draws its own marker on its plot; two rings read as noise.
    if (state.menu && state.menu.plot === p) continue;
    drawGroundDisc(ctx, p.x, p.y);
  }
}

// A raised patch of bare earth rather than a dashed outline: an ellipse for the
// ground plane, a darker skirt under it for thickness, and a lighter top face.
function drawGroundDisc(ctx, x, y) {
  const rx = PLOT_R;
  const ry = PLOT_R * 0.62;   // squashed, because the ground is seen at an angle
  const lift = 5;

  ctx.fillStyle = 'rgba(28,32,24,0.30)';        // contact shadow
  ctx.beginPath();
  ctx.ellipse(x, y + 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5E5140';                     // the side of the mound
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8A7355';                     // the lit top face
  ctx.beginPath();
  ctx.ellipse(x, y - lift, rx - 2, ry - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#A98D66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - lift, rx - 2, ry - 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTowers(ctx, state) {
  for (const t of state.towers) {
    if (state.menu && state.menu.tower === t) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.def.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    const box = towerBox(t);
    drawBuilding(ctx, t, box);
    if (t.def.gunner) drawGunner(ctx, t);
    drawTierStars(ctx, t, box);

    if (DEBUG_MUZZLE) {
      // Drawn from muzzlePoint itself, so the dot marks where arrows really
      // spawn rather than where the sprite transform thinks they should.
      const m = muzzlePoint(t);
      ctx.fillStyle = '#D4453A';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Tiers are all drawn at the same size — the art's scale is fixed by the
// export and must not be stretched — so the upgrade reads as stars over the
// roof instead of a bigger building.
function drawTierStars(ctx, t, box) {
  const n = t.def.tier;
  const cx = box.left + box.w / 2;
  const y = box.top - 7;
  const gap = 9;

  for (let i = 0; i < n; i++) star(ctx, cx + (i - (n - 1) / 2) * gap, y, 4);
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#F2C64B';
  ctx.fill();
  ctx.strokeStyle = '#5A4415';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

const OUTLINE = '#22201C';
const DECK_H = 7;      // thickness of the platform slab the gunner stands on

// Lighten (positive) or darken (negative) a #rrggbb by a fraction of full
// range. Saves carrying three shades of every tower colour in the data.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Real artwork if the tier has any, otherwise the vector building. Families
// get wired up one tier at a time as art arrives, and a PNG that fails to
// load falls back to something drawn rather than to an empty plot.
function drawBuilding(ctx, t, box) {
  const img = t.def.sprite && art[t.def.sprite];
  if (img) {
    const [sx, sy, sw, sh] = t.def.spriteTrim;
    ctx.drawImage(img, sx, sy, sw, sh, box.left, box.top, box.w, box.h);
    return;
  }
  if (t.def.shape === 'camp') drawCamp(ctx, t, box);
  else drawStoneTower(ctx, t, box);
}

// Fallback archery tower, drawn only when the sprite fails to load. Side
// elevation rather than top-down, so it will not match a rotating gunner —
// it exists so a failed image leaves a building rather than bare ground.
function drawStoneTower(ctx, t, box) {
  const stone = t.def.colour;
  const deckTop = box.top + box.h * 0.15;
  const deckBottom = deckTop + DECK_H;
  const bottom = box.top + box.h;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Shaft, wider at the base so it reads as load-bearing.
  const topIn = box.w * 0.13;
  const baseIn = box.w * 0.05;
  ctx.fillStyle = shade(stone, -0.06);
  ctx.beginPath();
  ctx.moveTo(box.left + topIn, deckBottom);
  ctx.lineTo(box.left + box.w - topIn, deckBottom);
  ctx.lineTo(box.left + box.w - baseIn, bottom);
  ctx.lineTo(box.left + baseIn, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arrow slit, centred on the shaft.
  const slitH = Math.min(14, (bottom - deckBottom) * 0.3);
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - 2, deckBottom + 9, 4, slitH);

  // Door at the foot.
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - 6, bottom - 13, 12, 13);
  ctx.strokeRect(box.left + box.w / 2 - 6, bottom - 13, 12, 13);

  // Platform slab, overhanging the shaft on both sides.
  ctx.fillStyle = shade(stone, 0.1);
  ctx.fillRect(box.left, deckTop, box.w, DECK_H);
  ctx.strokeRect(box.left, deckTop, box.w, DECK_H);

  // Merlons at the ends only. The gunner stands in the gap between them, feet
  // on the slab, which is the whole point of drawing the deck at all.
  const mw = box.w * 0.27;
  const mh = box.h * 0.15;
  ctx.fillStyle = stone;
  ctx.fillRect(box.left, deckTop - mh, mw, mh);
  ctx.strokeRect(box.left, deckTop - mh, mw, mh);
  ctx.fillRect(box.left + box.w - mw, deckTop - mh, mw, mh);
  ctx.strokeRect(box.left + box.w - mw, deckTop - mh, mw, mh);
}

// Barracks: a timber hall under a pitched roof. No gunner, so nothing has to
// line up with the roofline.
function drawCamp(ctx, t, box) {
  const wall = t.def.colour;
  const bottom = box.top + box.h;
  const eaves = box.top + box.h * 0.46;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Walls.
  ctx.fillStyle = shade(wall, 0.04);
  ctx.fillRect(box.left + 4, eaves, box.w - 8, bottom - eaves);
  ctx.strokeRect(box.left + 4, eaves, box.w - 8, bottom - eaves);

  // Roof, overhanging the walls at the eaves.
  ctx.fillStyle = shade(wall, -0.2);
  ctx.beginPath();
  ctx.moveTo(box.left, eaves);
  ctx.lineTo(box.left + box.w / 2, box.top + 3);
  ctx.lineTo(box.left + box.w, eaves);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Doorway.
  const dw = 13;
  const dh = (bottom - eaves) * 0.66;
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - dw / 2, bottom - dh, dw, dh);
  ctx.strokeRect(box.left + box.w / 2 - dw / 2, bottom - dh, dw, dh);

  // A banner from tier 2, so the upgrade is visible at a glance.
  if (t.def.tier < 2) return;
  const px = box.left + box.w - 7;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(px, eaves + 2);
  ctx.lineTo(px, box.top - 12);
  ctx.stroke();
  ctx.fillStyle = t.def.tier === 3 ? '#C4A574' : '#8C4A3C';
  ctx.beginPath();
  ctx.moveTo(px, box.top - 12);
  ctx.lineTo(px + 14, box.top - 8);
  ctx.lineTo(px, box.top - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Gunners stay upright and only mirror. The art is drawn standing, so rotating
// it to the aim angle lays the figure on its side; a left/right flip is the
// only orientation that reads correctly for a standing sprite.
//
// The drawn size comes from gunnerR, so the body reads at a known radius
// whatever the source art's proportions are, and it mirrors about the body
// rather than the middle of a box that a bow pulls off-centre.
function drawGunner(ctx, t) {
  const d = t.def;
  const m = mountPoint(t);
  const img = art[d.gunner];

  if (!img) {
    ctx.fillStyle = '#E0D6C2';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = d.gunnerTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;

  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(mirror(d, facing(t)), 1);
  ctx.translate(-t.recoil * 3, 0);   // kicks backward, opposite the shot
  ctx.drawImage(img, sx, sy, sw, sh, -d.gunnerPivot[0] * dw, -d.gunnerPivot[1] * dh, dw, dh);
  ctx.restore();
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const bob = Math.sin(e.t * 9) * 2;

    ctx.fillStyle = e.def.colour;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, e.def.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.stroke();

    healthBar(ctx, e.x, e.y - e.def.r - 6 + bob, e.def.r, e.hp / e.maxHp);
  }
}

// Sized to the thing it belongs to, and hidden at full health. Fixed-width bars
// over 12px soldiers read as a wall of stripes and hide the fight underneath.
function healthBar(ctx, x, y, r, pct) {
  if (pct >= 1) return;
  const w = Math.max(14, r * 2.6);
  ctx.fillStyle = 'rgba(34,32,28,0.85)';
  ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = pct > 0.5 ? '#6BBF59' : '#D4453A';
  ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, pct), 2);
}

// Soldiers stay upright and only mirror, same as the gunners — the art is
// drawn standing, and a standing figure rotated to face north-east is a
// standing figure lying down.
//
// The drawn size comes from the soldier's own radius via bodyFrac, so the
// sprite's body always matches the radius the formation layout and
// tools/formation.mjs use.
function drawSoldier(ctx, u) {
  const s = u.def;
  const img = s.sprite && art[s.sprite];

  if (!img) {
    ctx.fillStyle = s.colour;
    ctx.beginPath();
    ctx.arc(u.x, u.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = s.spriteTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const dir = Math.cos(u.face) >= 0 ? 1 : -1;

  ctx.save();
  // Lunge toward the foe on the swing, so a spear thrust reads as a thrust.
  ctx.translate(u.x + dir * u.thrust * s.lunge, u.y);
  ctx.scale(mirror(s, dir), 1);
  ctx.drawImage(img, sx, sy, sw, sh, -s.pivot[0] * dw, -s.pivot[1] * dh, dw, dh);
  ctx.restore();
}

// Barracks soldiers, plus a muster ring on the barracks for any that are dead.
function drawUnits(ctx, state) {
  for (const u of state.units) {
    if (u.respawn > 0) {
      // Muster ring on the barracks, so a dead squad reads as coming back
      // rather than as a tower that stopped working.
      const left = u.respawn / u.def.respawn;
      ctx.strokeStyle = 'rgba(240,230,210,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // One ring per slot, nested, so three reviving soldiers read as three.
      ctx.arc(u.tower.x, u.tower.y, 11 + u.slot * 4, -Math.PI / 2, -Math.PI / 2 + (1 - left) * Math.PI * 2);
      ctx.stroke();
      continue;
    }

    drawSoldier(ctx, u);
    healthBar(ctx, u.x, u.y - u.def.r - 8, u.def.r, u.hp / u.maxHp);
  }
}

// Arrows are the only sprite that rotates: a projectile has no upright, and it
// has to point where it is flying. The art is drawn pointing left, so the
// rotation is the heading plus a half turn.
function drawShots(ctx, state) {
  const img = art[arrow.sprite];
  const [sx, sy, sw, sh] = arrow.trim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const flip = arrow.faces < 0 ? Math.PI : 0;

  for (const s of state.shots) {
    const a = s.angle || 0;

    if (!img) {
      ctx.strokeStyle = '#F0E6D2';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - Math.cos(a) * 10, s.y - Math.sin(a) * 10);
      ctx.stroke();
      continue;
    }

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a + flip);
    // Anchored at the head, so the point sits on the target rather than the
    // shaft ending there.
    ctx.drawImage(img, sx, sy, sw, sh, -dw * 0.08, -dh / 2, dw, dh);
    ctx.restore();
  }
}

function drawHits(ctx, state) {
  for (const h of state.hits) {
    ctx.strokeStyle = `rgba(255,255,255,${h.life * 4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, (0.25 - h.life) * 60, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.75)';
  ctx.fillRect(0, 0, 960, 40);

  ctx.fillStyle = '#F0E6D2';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillText(`Gold ${state.gold}`, 16, 21);
  ctx.fillText(`Lives ${state.lives}`, 150, 21);
  ctx.fillText(`Wave ${Math.min(state.waveIndex + 1, waves.length)} / ${waves.length}`, 280, 21);

  const hint = state.menu
    ? (state.menu.tower ? 'Upgrade or sell' : 'Pick a tower')
    : 'Tap a plot to build';
  ctx.fillStyle = '#C4A574';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(hint, 470, 21);
}

function drawMenu(ctx, state) {
  const menu = state.menu;
  if (!menu) return;

  const clamped = menu.cx !== menu.plot.x || menu.cy !== menu.plot.y;

  // Leader first, so the ring and buttons draw over it.
  if (clamped) {
    ctx.strokeStyle = 'rgba(240,230,210,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(menu.plot.x, menu.plot.y);
    ctx.lineTo(menu.cx, menu.cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Marks which plot the menu will act on. A clamped menu puts a button on top
  // of the plot, so use a small dot there instead of the full ring.
  ctx.strokeStyle = '#F0E6D2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (clamped) ctx.arc(menu.plot.x, menu.plot.y, 5, 0, Math.PI * 2);
  else ctx.arc(menu.plot.x, menu.plot.y, PLOT_R, 0, Math.PI * 2);
  ctx.stroke();

  drawCancel(ctx, menu);
  for (const it of menu.items) drawButton(ctx, state, it);
}

function drawCancel(ctx, menu) {
  ctx.fillStyle = 'rgba(34,32,28,0.7)';
  ctx.beginPath();
  ctx.arc(menu.cx, menu.cy, CANCEL_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8A8478';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(menu.cx - 5, menu.cy - 5);
  ctx.lineTo(menu.cx + 5, menu.cy + 5);
  ctx.moveTo(menu.cx + 5, menu.cy - 5);
  ctx.lineTo(menu.cx - 5, menu.cy + 5);
  ctx.stroke();
}

function drawButton(ctx, state, it) {
  const on = canUse(state, it);

  ctx.fillStyle = on ? 'rgba(34,32,28,0.92)' : 'rgba(34,32,28,0.55)';
  ctx.beginPath();
  ctx.arc(it.x, it.y, BTN_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = on ? '#C4A574' : '#5A5348';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(it.x, it.y - 5);
  ctx.strokeStyle = ctx.fillStyle = on ? '#F0E6D2' : '#6E665A';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawGlyph(ctx, it.glyph);
  ctx.restore();

  const caption = it.gain !== null ? `+${it.gain}g`
                : it.cost !== null ? `${it.cost}g`
                : it.available ? '' : 'soon';
  if (!caption) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (caption) {
    ctx.fillStyle = it.gain !== null ? '#6BBF59' : (on ? '#C4A574' : '#6E665A');
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText(caption, it.x, it.y + 14);
  }

  // Named, not just glyphed. Four vector glyphs are not self-explanatory, and
  // there is no hover on a touch screen to reveal what they mean.
  if (it.label) {
    const ly = it.y + BTN_R + 10;
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(34,32,28,0.85)';
    ctx.strokeText(it.label, it.x, ly);       // outline, so it reads over any ground
    ctx.fillStyle = on ? '#F0E6D2' : '#8A8478';
    ctx.fillText(it.label, it.x, ly);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

// Vector glyphs rather than sprites — UI art is still unspecced, and these
// need to stay legible at 52px on a phone. Each draws centred on the origin
// in roughly a 22px box.
function drawGlyph(ctx, kind) {
  ctx.beginPath();

  if (kind === 'bow') {
    ctx.arc(-3, 0, 9, -Math.PI / 2.2, Math.PI / 2.2);
    ctx.moveTo(3, -8); ctx.lineTo(3, 8);
    ctx.moveTo(-6, 0); ctx.lineTo(9, 0);
    ctx.stroke();
  } else if (kind === 'swords') {
    ctx.moveTo(-8, 8); ctx.lineTo(7, -8);
    ctx.moveTo(8, 8); ctx.lineTo(-7, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 3); ctx.lineTo(-3, 9);
    ctx.moveTo(9, 3); ctx.lineTo(3, 9);
    ctx.stroke();
  } else if (kind === 'catapult') {
    ctx.moveTo(-9, 8); ctx.lineTo(0, -2); ctx.lineTo(9, 8);
    ctx.moveTo(-5, 3); ctx.lineTo(5, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -2); ctx.lineTo(8, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, -9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'cross') {
    ctx.moveTo(0, -9); ctx.lineTo(0, 9);
    ctx.moveTo(-6, -3); ctx.lineTo(6, -3);
    ctx.stroke();
  } else if (kind === 'up') {
    ctx.moveTo(-7, 2); ctx.lineTo(0, -6); ctx.lineTo(7, 2);
    ctx.moveTo(-7, 9); ctx.lineTo(0, 1); ctx.lineTo(7, 9);
    ctx.stroke();
  } else if (kind === 'max') {
    ctx.moveTo(-8, -6); ctx.lineTo(8, -6);
    ctx.moveTo(-7, 2); ctx.lineTo(0, -5); ctx.lineTo(7, 2);
    ctx.moveTo(-7, 9); ctx.lineTo(0, 2); ctx.lineTo(7, 9);
    ctx.stroke();
  } else if (kind === 'coin') {
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawResult(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.82)';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.result === 'won' ? 'Waves cleared' : 'The keep has fallen', 480, 250);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Tap to play again', 480, 306);
  ctx.textAlign = 'left';
}

export { PLOT_R };
