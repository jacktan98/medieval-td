// The people who live on the board. Node only.
//
//   node tools/villager.mjs
//
// A villager is the one figure in this game with no part in the fight: nothing
// shoots him, he blocks nobody, and the only thing he does is answer a tap with a
// card. That makes him easy to get wrong in ways nothing else would notice — a
// board plays exactly the same with all five of them broken.
//
// HE RAN FOR A DOOR FOR ONE BUILD. He was cut out of the artwork, drawn live and
// would sprint to a doorway and vanish when tapped; the owner's verdict was "it's
// bad. remove the running completely... Do not change the villager original
// 'pose'." All of that is gone, and this file is now mostly about proving that it
// is gone properly — a half-removed feature leaves the machinery that broke the
// board in place with nothing calling it.
import { readFileSync } from 'fs';
import { levels } from '../src/level.js';
import { allGroups, bounds, MAP_SCALE, readArtwork } from './svg.mjs';
import { makeVillagers, VILLAGER, TAP_PAD, VILLAGER_H } from '../src/villagers.js';
import { pickFigure, selectionInfo, validate } from '../src/select.js';
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
      `${standing.join('/')} piece(s) standing at the five anchors`);
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
  const lvl = peopled[0];
  const state = board(lvl);

  // THE TAP FINDS HIM. Through pickFigure, which is the function the board tap
  // actually calls — a fixture with its own hit test would prove nothing.
  //
  // ONE AT A TIME IS NOT REQUIRED ANY MORE, and that is a quiet gain from taking
  // the running out: nobody leaves the board, so all five have to answer at once.
  // Two of stage 1's five stand 13px apart and their boxes overlap, so the nearer
  // one wins both — which is the rule every figure in this game is picked by. What
  // must hold is that a tap on a villager finds A villager rather than bare ground.
  const found = state.villagers.map(v => {
    const hit = pickFigure(state, v.x, v.y - 8);
    return hit && hit.kind === 'villager';
  });
  ok(found.every(Boolean), 'a tap on any of them lands on a villager',
    `${found.filter(Boolean).length} of ${found.length}`);

  // AND MOST OF THEM ARE THEMSELVES. Only the two that overlap can hand a tap to
  // their neighbour, so four of the five must answer for themselves.
  const own = state.villagers.filter(v => {
    const hit = pickFigure(state, v.x, v.y - 8);
    return hit && hit.ref === v;
  });
  ok(own.length >= state.villagers.length - 1,
    '  and all but the one standing behind another answer for themselves',
    `${own.length} of ${state.villagers.length}`);

  // HE STAYS. There is no update loop any more, so this is a statement about the
  // whole feature rather than about a timer: the board has the same five people on
  // it whatever the player does.
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
