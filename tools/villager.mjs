// The people who live on the board. Node only.
//
//   node tools/villager.mjs
//
// A villager is the one figure in this game with no part in the fight: nothing
// shoots him, he blocks nobody, and the only thing he does is answer a tap with a
// card. That makes him easy to get wrong in ways nothing else would notice — a
// board plays exactly the same with every one of them broken.
//
// HE RAN FOR A DOOR FOR ONE BUILD. He was cut out of the artwork, drawn live and
// would sprint to a doorway and vanish when tapped; the owner's verdict was "it's
// bad. remove the running completely... Do not change the villager original
// 'pose'." All of that is gone, and this file is now mostly about proving that it
// is gone properly — a half-removed feature leaves the machinery that broke the
// board in place with nothing calling it.
import { readFileSync } from 'fs';
import { levels } from '../src/level.js';
import { allGroups, bounds, MAP_SCALE, readArtwork, shapesByFill } from './svg.mjs';
import { makeVillagers, VILLAGER, TAP_PAD, VILLAGER_H } from '../src/villagers.js';
import { pickFigure, selectionInfo, validate, VILLAGER_MID } from '../src/select.js';
import { selectionCue } from '../src/audio.js';
import { BOOK_ORDER } from '../src/data/waves.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const code = f => src(f).replace(/^\s*\/\/.*$/gm, '');
const peopled = levels.filter(l => (l.villagers || []).length);

// --- who lives here --------------------------------------------------------------

console.log('\nWho lives here\n');

{
  ok(peopled.length >= 1, 'at least one board has people living on it',
    peopled.map(l => `${l.name}: ${l.villagers.length}`).join(', ') || 'none');

  // A POINT AND NOTHING ELSE. Every other field a villager carried a build ago —
  // a door, a heading, a speed, a flag saying he was running — was a thing that
  // could be wrong about a man who does not move. This is what says they are gone
  // from the DATA as well as from the code.
  const extra = [];
  for (const l of peopled) {
    l.villagers.forEach((v, i) => {
      const keys = Object.keys(v).filter(k => k !== 'x' && k !== 'y');
      if (keys.length) extra.push(`${l.name} villager ${i}: ${keys.join(', ')}`);
    });
    if (l.doors) extra.push(`${l.name} still lists doors`);
  }
  ok(extra.length === 0, 'and each of them is a place and nothing more',
    extra.length ? extra.join('; ') : 'x and y, on every one of them');

  // EVERY STAGE, at the owner's word: "Make every villager clickable (same as stage
  // 1) in other stages." The campaign is the head of `levels` up to the three
  // testing boards, which have nobody painted on them.
  const campaign = levels.slice(0, levels.indexOf(levels.find(l => l.id === 'm1')));
  const empty = campaign.filter(l => !(l.villagers || []).length);
  ok(empty.length === 0, 'every stage of the campaign has its people listed',
    empty.length ? empty.map(l => l.name).join(', ') + ' has none'
                 : `${campaign.length} stage(s), ${campaign.reduce((n, l) => n + l.villagers.length, 0)} villager(s)`);

  // AND NOBODY PAINTED IS LEFT OFF THE LIST. A figure stands on the artist's
  // #362407 ground shadow, 11 x 3 at game scale — a man kneeling, 16 x 5. Every one
  // of those that is not a plot marker or a garrison post is somebody a player can
  // see and try to tap, so it must be on the list; and every point on the list must
  // stand on one, or it is a tap box over bare grass.
  //
  // ONE PAINTED FIGURE IS NOT A VILLAGER: the robed priest at his lectern on
  // Dawnford Church, who is drawn as nobody else on any board is.
  const NOT_VILLAGERS = { m10: [{ x: 189, y: 303 }] };
  const missing = [], stray = [];
  for (const l of campaign) {
    const feet = shapesByFill(readArtwork(l.src))
      .filter(s => (s.fill || '').toLowerCase() === '#362407')
      .map(s => {
        const b = bounds(s.pts);
        return { w: (b.x1 - b.x0) * MAP_SCALE, h: (b.y1 - b.y0) * MAP_SCALE,
                 x: (b.x0 + b.x1) / 2 * MAP_SCALE, y: (b.y0 + b.y1) / 2 * MAP_SCALE };
      })
      .filter(f => (Math.abs(f.w - 11) < 1.5 && Math.abs(f.h - 3) < 1) ||
                   (Math.abs(f.w - 16) < 1 && Math.abs(f.h - 5) < 1));
    const near = (list, f, d) => (list || []).some(p => Math.hypot(p.x - f.x, p.y - f.y) < d);
    for (const f of feet) {
      if (near(l.plots, f, 8) || near(l.garrison, f, 12) || near(NOT_VILLAGERS[l.id], f, 4)) continue;
      if (!near(l.villagers, f, 3)) missing.push(`${l.name} (${f.x.toFixed(0)},${f.y.toFixed(0)})`);
    }
    for (const v of l.villagers || []) {
      if (!near(feet, v, 3)) stray.push(`${l.name} (${v.x},${v.y})`);
    }
  }
  ok(missing.length === 0, '  and every figure painted on a board is on its list',
    missing.length ? missing.join(', ') + ' not listed' : 'every figure shadow accounted for');
  ok(stray.length === 0, '  and every point on a list is standing on one',
    stray.length ? stray.join(', ') + ' on bare ground' : 'no tap box over empty grass');
}

// --- and he stays painted on the board --------------------------------------------

console.log('\nStill in the picture\n');

// THE POSE IS THE ARTIST'S, AT THE OWNER'S WORD. The surest way to keep a figure in
// the pose he was drawn in is not to redraw him, so a villager is left in the base
// the game loads and the game never draws one.
//
// ASKED OF THE GEOMETRY: how many pieces of drawing sit inside each villager's own
// window, in the base. A cut would empty it.
{
  const W = 12, UP = 28, DOWN = 6;
  for (const l of peopled) {
    const base = allGroups(readFileSync(`${l.src}_base.svg`, 'utf8'));
    const standing = l.villagers.map(v => base.filter(g => {
      const b = bounds(g.subPaths.flat());
      return b.x0 * MAP_SCALE >= v.x - W && b.x1 * MAP_SCALE <= v.x + W &&
             b.y0 * MAP_SCALE >= v.y - UP && b.y1 * MAP_SCALE <= v.y + DOWN;
    }).length);
    ok(standing.every(n => n >= 4),
      `${l.name}: every one of them is still painted on the board`,
      `${standing.join('/')} piece(s) standing at the anchors`);
  }

  // AND THE BASE IS THE ONE THE BOARD HAD BEFORE THEY WERE NAMED. Nothing is cut
  // for a villager, so adding the list must not have moved a single byte of the
  // artwork — which is the strongest form of "his pose is unchanged" there is.
  for (const l of peopled) {
    const art = readArtwork(l.src);
    const base = readFileSync(`${l.src}_base.svg`, 'utf8');
    const kept = l.villagers.filter(v => {
      const near = allGroups(art).filter(g => {
        const b = bounds(g.subPaths.flat());
        const cx = (b.x0 + b.x1) / 2 * MAP_SCALE, cy = (b.y0 + b.y1) / 2 * MAP_SCALE;
        return Math.hypot(cx - v.x, cy - v.y) < 12;
      });
      return near.length > 0 && near.every(g => base.includes(art.slice(g.start, g.end)));
    });
    ok(kept.length === l.villagers.length,
      '  and nothing about any of them is cut out of it',
      `${kept.length} of ${l.villagers.length} untouched between the artwork and the base`);
  }
}

// AND NOTHING IN THE GAME DRAWS ONE. The draw, the update loop and the tap that
// sent him running were three separate edits and all three had to come out; a
// villager still in the render pass would be a second copy of a man who is already
// painted on the board, drawn over himself.
{
  const files = ['render.js', 'main.js', 'input.js', 'villagers.js'];
  const ghosts = files.filter(f => /drawVillager|updateVillagers|sendVillager/.test(code(f)));
  ok(ghosts.length === 0, 'and nothing in the game draws, moves or sends one',
    ghosts.length ? ghosts.join(', ') + ' still reference the running'
                  : 'no draw, no update loop, no door');

  // NOR CARRIES THE MACHINERY WITH NOTHING CALLING IT. A module that still exported
  // a `sendVillager` nobody calls is a feature waiting to be switched back on by
  // somebody who finds it and assumes it is wanted.
  const left = ['going', 'door', 'face', 'SPEED', 'ARRIVED']
    .filter(w => new RegExp(`\\b${w}\\b`).test(code('villagers.js')));
  ok(left.length === 0, '  and src/villagers.js keeps none of it either',
    left.length ? left.join(', ') : 'a def, a tap pad and a list of points');
}

// --- what a tap does ---------------------------------------------------------------

console.log('\nTapped\n');

const board = level => {
  const state = { units: [], enemies: [], towers: [], selected: null };
  makeVillagers(state, level);
  return state;
};

{
  // THE TAP FINDS HIM, on every board. Through pickFigure, which is the function
  // the board tap actually calls — a fixture with its own hit test would prove
  // nothing.
  //
  // AND IT FINDS HIM, NOT HIS NEIGHBOUR. Villagers stand close — stage 8's
  // congregation is nine men in a patch of ground two soldiers wide — so their tap
  // boxes overlap, and under the nearest-the-camera rule every other figure is
  // picked by, four of those nine could not be selected at all. Among villagers the
  // nearer BODY wins instead, and this is what says it is enough: a tap on the
  // middle of each man's drawing opens his card.
  const lost = [];
  let total = 0;
  for (const lvl of peopled) {
    const state = board(lvl);
    for (const v of state.villagers) {
      total++;
      const hit = pickFigure(state, v.x, v.y - VILLAGER_MID);
      if (!hit || hit.ref !== v) {
        lost.push(`${lvl.name} (${v.x},${v.y})` +
          (hit ? ` -> (${hit.ref.x},${hit.ref.y})` : ' -> nothing'));
      }
    }
  }
  ok(lost.length === 0, 'a tap on any of them opens his card and nobody else\'s',
    lost.length ? lost.join('; ') : `${total} of ${total}, on ${peopled.length} board(s)`);

  // AND THE REST OF THE GAME STILL PICKS NEAREST THE CAMERA. The exception is for
  // villagers among themselves; a soldier walking in front of one must still be
  // the one a tap finds.
  {
    const state = board(peopled[0]);
    const v = state.villagers[0];
    const man = { def: { r: 6, spriteTrim: [0, 0, 60, 110] }, x: v.x, y: v.y + 4, respawn: 0 };
    state.units.push(man);
    const hit = pickFigure(state, v.x, v.y - VILLAGER_MID);
    ok(hit && hit.ref === man, '  and a soldier in front of him still takes the tap',
      hit ? hit.kind : 'nothing');
  }

  const lvl = peopled[0];
  const state = board(lvl);

  // HE STAYS. There is no update loop any more, so this is a statement about the
  // whole feature rather than about a timer: the board has the same people on it
  // whatever the player does.
  state.selected = { kind: 'villager', ref: state.villagers[0] };
  for (let i = 0; i < 600; i++) validate(state);
  ok(state.villagers.length === lvl.villagers.length && state.selected,
    '  and nothing ever takes him off the board or drops his card',
    `${state.villagers.length} of ${lvl.villagers.length}, still selected`);

  // AND HIS BOX IS BUILT OFF HIS OWN DRAWING. `artHeight` in select.js reads a def's
  // `spriteTrim` and a villager's is his portrait rather than his board pose, so the
  // tap box says so in his own terms — see VILLAGER_H.
  ok(VILLAGER_H > 15 && VILLAGER_H < 35, '  over a box the size of the man',
    `${VILLAGER_H.toFixed(1)}px tall, ${VILLAGER.r * 2}px across, ${TAP_PAD}px of padding`);
}

// --- his card ----------------------------------------------------------------------

console.log('\nWhat the panel says\n');

{
  const state = board(peopled[0]);
  state.selected = { kind: 'villager', ref: state.villagers[0] };
  const info = selectionInfo(state);

  ok(info && info.title === VILLAGER.name && info.sprite === VILLAGER.sprite,
    'his card is his own picture and his own name',
    info ? `"${info.title}", ${info.sprite}` : 'no card');

  // AND NOTHING ELSE, at the owner's word: "there will be no stats at all."
  //
  // EVERY FIELD, not just the two the panel happens to read today. A card that
  // carried a number nothing draws would be a stat waiting to appear the next time
  // the layout changed.
  const stats = ['hp', 'maxHp', 'damage', 'attack', 'range'].filter(k => info[k] !== null);
  ok(stats.length === 0 && info.traits.length === 0, '  and carries no statistic at all',
    stats.length ? stats.join(', ') + ' set' : 'health, attack, reach and traits all empty');

  // HE SAYS NOTHING EITHER. The five voices in this game belong to men who fight,
  // and the line that answers for everything else would ask his `fam` — which he
  // has not got, so this is a crash as well as a wrong noise.
  ok(selectionCue(state.selected) === null, '  and has no voice, which is not an oversight',
    'the five lines belong to men who fight');

  // AND HE IS NOT IN THE BOOK, at the owner's word: "no need to add this villager
  // in encyclopedia." Asked of the order the encyclopedia is built from.
  ok(!BOOK_ORDER.includes('villager') && !BOOK_ORDER.includes(VILLAGER.sprite),
    'and he is not in the encyclopedia', `${BOOK_ORDER.length} card(s), none of them his`);
}

// --- and he is not in the fight ------------------------------------------------------

console.log('\nOut of the fight altogether\n');

{
  // HE HAS NO HEALTH AND NOTHING TO HIT WITH, which is what makes every other
  // checker in this project safe to ignore him. A villager who grew an `hp` would
  // be a figure the armour table, the health bars and the death sweep all have an
  // opinion about, and none of them has been told he exists.
  const has = ['hp', 'maxHp', 'damage', 'armour', 'speed', 'atkCd']
    .filter(k => VILLAGER[k] !== undefined);
  ok(has.length === 0, 'he has no health, no armour and nothing to hit with',
    has.length ? has.join(', ') : 'a name, a drawing for his card, and a radius for the tap');

  const state = board(peopled[0]);
  ok(state.units.length === 0 && state.enemies.length === 0 && state.villagers.length > 0,
    'and lives in a list of his own, not among the soldiers or the thugs',
    `${state.villagers.length} villager(s), 0 units, 0 enemies`);
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe village is where it was.');
process.exit(bad ? 1 : 0);
