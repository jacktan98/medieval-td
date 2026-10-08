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
import { levels, useLevel } from '../src/level.js';
import { allGroups, bounds, MAP_SCALE, readArtwork, shapesByFill } from './svg.mjs';
import { makeVillagers, updateVillagers, VILLAGER, TAP_PAD, VILLAGER_H } from '../src/villagers.js';
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
      // `w` is allowed: it is not about the man at all but about cutting his painted
      // figure out of the base (tools/split-map.mjs) — a narrower window beside
      // something of the scenery that must stay. And `g`: where he is drawn in depth,
      // not a thing he does — stage 10's lumberjack, in front of the tree he fells. And
      // `up`, a taller window for one holding something up — stage 12's lit pole — and
      // `down`, a deeper one for one whose drawing stands in front of him: stage 15's
      // smith and his anvil.
      const keys = Object.keys(v).filter(k => !['x', 'y', 'w', 'up', 'down', 'g'].includes(k));
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
  //
  // AND ONE SHAPE THAT ONLY LOOKS LIKE A SHADOW: the brim of the Crow Harbinger's hat on
  // Dark Hollow Citadel's balcony, the same size and colour — he is listed, at his own
  // shadow on the planks below it.
  const NOT_VILLAGERS = { m10: [{ x: 189, y: 303 }], m18: [{ x: 161, y: 208 }] };
  // AND SIX ON THE LIST WHO STAND ON NO SHADOW: Dark Hollow Citadel's crows, perched
  // on the battlements and in the trees — a bird on a merlon or a branch stands on
  // stone or wood, and the artist drew none.
  const PERCHED = { m18: [{ x: 56.5, y: 155.5 }, { x: 76, y: 159 }, { x: 158, y: 133 },
                          { x: 235, y: 207.5 }, { x: 415, y: 59 }, { x: 439.5, y: 471.5 }] };
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
      if (near(PERCHED[l.id], v, 1)) continue;
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
  // EXCEPT ON A BOARD WHOSE VILLAGERS MOVE — `villagerPlay` — where the owner has
  // drawn them running, praying and hopping, and the painted ones are cut out so
  // the game can draw those instead. Asked the other way round below.
  for (const l of peopled.filter(l => !l.villagerPlay)) {
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
  for (const l of peopled.filter(l => !l.villagerPlay)) {
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

// AND ON A BOARD WHOSE VILLAGERS MOVE, THE OPPOSITE: none of them is left painted
// in the base — a painted one under a live one is the same man twice — and the
// game draws every one of them.
{
  for (const l of peopled.filter(l => l.villagerPlay)) {
    const base = allGroups(readFileSync(`${l.src}_base.svg`, 'utf8'));
    const left = l.villagers.filter(v => base.some(g => {
      const b = bounds(g.subPaths.flat());
      return b.x0 * MAP_SCALE >= v.x - 12 && b.x1 * MAP_SCALE <= v.x + 12 &&
             b.y0 * MAP_SCALE >= v.y - 28 && b.y1 * MAP_SCALE <= v.y + 6 &&
             (b.y1 - b.y0) * MAP_SCALE > 12;
    }));
    ok(left.length === 0, `${l.name}: its villagers are cut out, for the game to draw`,
      left.length ? left.map(v => `(${v.x},${v.y})`).join(' ') + ' still painted' : `${l.villagers.length} cut`);
    const state = { units: [], enemies: [], towers: [] };
    makeVillagers(state, l);
    ok(state.villagers.every(v => v.live), '  and every one of them is drawn live',
      `${state.villagers.filter(v => v.live).length} of ${state.villagers.length}`);
  }

  // AND ONLY THERE. A board that has not asked for it keeps its villagers as points,
  // with nothing drawn over the painted men.
  const quiet = peopled.filter(l => !l.villagerPlay).filter(l => {
    const state = { units: [], enemies: [], towers: [] };
    makeVillagers(state, l);
    return state.villagers.some(v => v.live);
  });
  ok(quiet.length === 0, 'and on every other board none of them is drawn',
    quiet.length ? quiet.map(l => l.name).join(', ') : 'painted, and left painted');
  ok(/if \(v\.live && !v\.hidden && !v\.ride\) add\(raised\(v\), 1, \(\) => drawVillager/.test(code('render.js')),
    '  the render pass draws only the live ones', 'drawVillager behind v.live');
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
      // One out of sight — stage 2's villager 4, indoors until the first wave —
      // is not there to tap. See the check below.
      if (v.hidden) continue;
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

  // AND ONE OUT OF SIGHT CANNOT BE TAPPED — there is nobody on the board to have
  // tapped. Stage 2's villager 4, gone into the tavern once the wave comes.
  {
    const lvl = peopled.find(l => l.villagerPlay === 'outskirts');
    const state = board(lvl);
    const v = state.villagers[3];
    const seen = v && pickFigure(state, v.x, v.y - VILLAGER_MID);
    if (v) v.hidden = true;
    const gone = v && pickFigure(state, v.x, v.y - VILLAGER_MID);
    ok(!!v && seen && seen.ref === v && (!gone || gone.ref !== v),
      '  one out of sight is not tappable',
      v ? `${lvl.name} (${v.x},${v.y}): ${seen && seen.ref === v ? 'tapped outside' : 'NOT outside'}, ${gone && gone.ref === v ? 'tapped once gone in' : 'not once gone in'}` : 'no villager 4 on stage 2');
  }

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

  // HIS OWN SOUND, at the owner's word: "Use villager_selected sound everytime a
  // villager is selected" — three takes of it now, one at random. Not a fighter's
  // voice, and asked without the `fam` he has not got, so no crash either.
  const cue = selectionCue(state.selected);
  ok(Array.isArray(cue) && cue.join() === 'villager_selected_1,villager_selected_2,villager_selected_3',
    '  and a tap plays one of his own three',
    cue ? cue.join(', ') : 'nothing');

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

// --- stage 5's box carrier --------------------------------------------------------

console.log('\nThe box carrier\n');

{
  // THE OWNER'S LOOP: villager 7 carries a box along the drawn line to the crates by
  // the barricade, tosses it on, walks back off the right edge and comes back with
  // the next — for as long as the game goes on, whatever the waves are doing.
  const level = levels.find(l => l.villagerPlay === 'castle');
  const state = { villagers: [], enemies: [], lives: level.startLives || 20 };
  makeVillagers(state, level);
  const v = state.villagers[6];
  const [sx, sy] = [v.x, v.y];
  const seen = { carry: 0, toss: 0, gone: 0, back: 0, left: Infinity, right: -Infinity, boxes: 0 };
  let wasGone = false;
  for (let i = 0; i < 150 * 30; i++) {
    updateVillagers(state, 1 / 30);
    const c = state.villagerPlay.crews[1];
    if (v.pose === 'carry_box') seen.carry++;
    if (v.pose === 'throw_box') seen.toss++;
    if (v.hidden) seen.gone++;
    if (wasGone && !v.hidden) seen.back++;
    wasGone = v.hidden;
    if (!v.hidden) { seen.left = Math.min(seen.left, v.x); seen.right = Math.max(seen.right, v.x); }
    seen.boxes = Math.max(seen.boxes, c.planks.filter(p => p.piece.key === 'vill_box').length);
  }
  ok(sx > 830 && sy > 340, 'he starts where he is painted, box in hand', `${sx},${sy}`);
  ok(seen.carry && seen.toss && seen.boxes, 'carries a box, tosses it, and it flies', `${seen.toss} frames tossing`);
  ok(seen.left < 680, 'as far as the crates by the barricade', `${seen.left.toFixed(0)}px`);
  ok(seen.right > 955 && seen.gone && seen.back >= 2, 'off the right edge and back, again and again', `${seen.back} return(s)`);
}

// --- stage 15's Captain ------------------------------------------------------------

console.log('\nStage 15, the Captain at the camp wall\n');

{
  // THE OWNER'S WORDS: he stands at the wall's corner and watches his men, now and
  // then in his Idle drawing; he walks out only when every enemy is dead, up to the
  // top road and across the link to the bottom door; and the board is not won until
  // he is.
  const level = levels.find(l => l.villagerPlay === 'quarters');
  useLevel(levels.indexOf(level));
  const waves = level.waves.map(w => ({ ...w }));
  const state = { villagers: [], enemies: [], lives: level.startLives, waves, waveIndex: 0, spawned: 0, resting: false };
  makeVillagers(state, level);
  const cap = state.villagers[10];
  const home = level.villagers[10];
  const poses = new Set();
  for (let i = 0; i < 60 * 30; i++) {
    updateVillagers(state, 1 / 30);
    if (!cap.hidden && cap.x === home.x) poses.add(cap.lookPose || 'default');
  }
  const vp = state.villagerPlay;
  ok(cap.lookType === 'captain_thug' && vp.muster[10].phase === 'stand',
    'the Captain walks in and stands at the wall\'s corner', `${cap.lookType}, ${vp.muster[10].phase}`);
  ok(poses.has('default') && poses.has('idle'), '  watching his men, now and then in his Idle drawing',
    [...poses].join(' and '));
  ok(vp.holdWin === true, '  and while he stands there the board cannot be won', `holdWin ${vp.holdWin}`);

  // An enemy still on the road at the end: he stays.
  state.waveIndex = waves.length;
  state.enemies = [{ def: {}, hp: 1 }];
  for (let i = 0; i < 30; i++) updateVillagers(state, 1 / 30);
  ok(vp.muster[10].phase === 'stand', '  he does not walk out while an enemy is alive', vp.muster[10].phase);

  // The field clear: TWO SECONDS of quiet first, then out he goes, onto the link.
  state.enemies = [];
  for (let i = 0; i < 57; i++) updateVillagers(state, 1 / 30);
  ok(vp.muster[10].phase === 'stand', '  the field clear, he waits two seconds first', `still ${vp.muster[10].phase} at 1.9s`);
  for (let i = 0; i < 6; i++) updateVillagers(state, 1 / 30);
  // THEN HIS LINE, AND A SECOND MORE STANDING THERE ONCE IT HAS FINISHED before he goes
  // — at the owner's word, as the Crow Harbinger does on stage 16. There is no sound
  // here, so the line "finishes" when its asking gives up (SAY_WAIT); the second is
  // counted from then.
  ok(vp.muster[10].phase === 'ready', '  and then says his line where he stands', `${vp.muster[10].phase} at 2.1s`);
  let t = 0, doneAt = null;
  while (vp.muster[10].phase === 'ready' && t < 15) {
    updateVillagers(state, 1 / 30); t += 1 / 30;
    if (doneAt === null && !vp.say) doneAt = t;
  }
  ok(vp.muster[10].phase === 'charge' && doneAt !== null && t - doneAt > 0.95 && t - doneAt < 1.1,
    '  and sets off a second after it has finished', `${vp.muster[10].phase}, ${(t - (doneAt ?? t)).toFixed(2)}s after`);
  let turned = null;
  for (let i = 0; i < 60 * 30 && !turned; i++) {
    updateVillagers(state, 1 / 30);
    turned = (vp.turned || []).find(t => t.who === 10) || null;
  }
  const link = level.routes[1].pts;
  ok(!!turned && turned.type === 'captain_thug' && turned.route === 1,
    '  once every enemy is dead he walks out, onto the link road',
    turned ? `${turned.type} on route ${turned.route}` : 'never left');
  ok(link[0].y < 270 && link[link.length - 1].y > 270,
    '  which runs from the top road down to the bottom door',
    `in at y ${link[0].y}, out at y ${link[link.length - 1].y}`);
  ok(vp.holdWin === false && turned && turned.quiet,
    '  the board can be won from then, and he steps on without a second entrance line',
    `holdWin ${vp.holdWin}, quiet ${turned && turned.quiet}`);
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe village is where it was.');
process.exit(bad ? 1 : 0);
