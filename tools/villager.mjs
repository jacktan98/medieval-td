// The people who live on the board. Node only.
//
//   node tools/villager.mjs
//
// A villager is the one figure in this game with no part in the fight: nothing
// shoots him, he blocks nobody, and what he does when he is tapped is run to a
// door and stop existing. That makes him easy to get wrong in ways nothing else
// would notice — a board plays exactly the same with all five of them broken.
//
// THE HALF THAT IS NOT CODE. He is PAINTED into stage 1's artwork and cut out of
// the base so the game can move him, which means a redraw, a re-split or a nudged
// anchor can leave a painted villager standing under a live one, or an empty patch
// of grass where a man should be. Both look like art bugs and neither throws. So
// the artwork is checked here beside the behaviour.
import { readFileSync } from 'fs';
import { levels } from '../src/level.js';
import { allGroups, bounds, MAP_SCALE, readArtwork } from './svg.mjs';
import { makeVillagers, updateVillagers, sendVillager, VILLAGER, TAP_PAD } from '../src/villagers.js';
import { pickFigure, selectionInfo } from '../src/select.js';
import { selectionCue } from '../src/audio.js';
import { BOOK_ORDER } from '../src/data/waves.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const DT = 1 / 60;
const peopled = levels.filter(l => (l.villagers || []).length);

// --- the data ------------------------------------------------------------------

console.log('\nWho lives here\n');

{
  ok(peopled.length >= 1, 'at least one board has people living on it',
    peopled.map(l => `${l.name}: ${l.villagers.length}`).join(', ') || 'none');

  // EVERY DOOR INDEX RESOLVES. A villager whose index is out of range keeps no door
  // and simply cannot be sent — a quiet nothing rather than a crash, which is the
  // right failure at runtime and the wrong thing to ship.
  const lost = [];
  for (const l of peopled)
    l.villagers.forEach((v, i) => {
      if (!(l.doors || [])[v.door]) lost.push(`${l.name} villager ${i} -> door ${v.door}`);
    });
  ok(lost.length === 0, 'and every one of them has a door to run to',
    lost.length ? lost.join(', ')
                : peopled.map(l => `${l.doors.length} door(s) on ${l.name}`).join(', '));
}

// AND EVERY DOOR IS IN A BUILDING. The owner's rule was "the nearest house with an
// obvious door", and the thing that could silently go wrong is a doorway measured
// off the artwork and then typed in one digit out — a villager who runs into open
// grass and vanishes there.
//
// The front boxes ARE the buildings, derived from the same artwork by
// tools/split-map.mjs, so this asks the drawing rather than a second list of houses.
//
// INSIDE THE BOX AND IN ITS LOWER HALF, which is what a doorway is. The first
// version of this asked for the box's BOTTOM EDGE and failed on both doors by nine
// pixels — the bottom of a front box is the bottom of the drawing, ground shadow
// and all, and a door's floor is on the wall face above it. The box's own ground
// line is nearer but not exact either. A door is simply a thing low down in a wall,
// and that is all this needs to say.
{
  const strays = [];
  for (const l of peopled) {
    (l.doors || []).forEach((d, i) => {
      const home = (l.front || []).find(b =>
        d.x >= b.x && d.x <= b.x + b.w && d.y >= b.y + b.h / 2 && d.y <= b.y + b.h);
      if (!home) strays.push(`${l.name} door ${i} at (${d.x}, ${d.y})`);
    });
  }
  ok(strays.length === 0, 'every doorway is low down in a building\'s wall',
    strays.length ? strays.join(', ') : 'each one inside a front box, in its lower half');
}

// --- the artwork ----------------------------------------------------------------

console.log('\nCut out of the board\n');

// HE IS PAINTED IN AND HAS TO COME OUT. A live figure drawn over a painted one is
// two figures — the same thing that happens to a plot marker under a tower, and to
// stage 5's crossbowmen.
//
// ASKED OF THE GEOMETRY rather than of the path text: how many pieces of drawing
// sit entirely inside each villager's window, in the artist's file and in the base
// the game loads. The artwork must have some and the base must have none.
{
  const W = 12, UP = 28, DOWN = 6;      // a shade wider than the cutting window
  for (const l of peopled) {
    const art = allGroups(readArtwork(l.src));
    const base = allGroups(readFileSync(`${l.src}_base.svg`, 'utf8'));
    const inside = (groups, at) => groups.filter(g => {
      const b = bounds(g.subPaths.flat());
      return b.x0 * MAP_SCALE >= at.x - W && b.x1 * MAP_SCALE <= at.x + W &&
             b.y0 * MAP_SCALE >= at.y - UP && b.y1 * MAP_SCALE <= at.y + DOWN;
    }).length;

    const drawn = l.villagers.map(v => inside(art, v));
    const left = l.villagers.map(v => inside(base, v));
    ok(drawn.every(n => n >= 4), `${l.name}: the artist painted all of them in`,
      `${drawn.join('/')} piece(s) standing at the five anchors`);
    ok(left.every(n => n === 0), '  and every one is cut out of the base the game draws',
      left.some(n => n) ? `${left.join('/')} left behind` : 'nothing left standing there');
  }
}

// AND THE CUT TAKES NOTHING ELSE WITH IT. This is the failure that shipped for one
// run: the window is sized for stage 5's crossbowmen, who carry a crossbow and a
// quiver, and two of stage 1's villagers stand in front of scenery small enough to
// fit through it — a log by the campfire and a stepping stone on the path. Both
// came out with the man, which leaves a hole in the board and, for the log, its own
// shadow floating over bare grass.
//
// COUNTED RATHER THAN LOOKED AT. A villager is four pieces — a shadow, a body and
// two arms — and every one of the five measures 13 to 17 game px across. Anything
// wider is something he was standing in front of.
{
  for (const l of peopled) {
    const base = readFileSync(`${l.src}_base.svg`, 'utf8');
    const art = readArtwork(l.src);
    const gone = allGroups(art).filter(g => !base.includes(art.slice(g.start, g.end)));
    const near = l.villagers.map(v => gone.filter(g => {
      const b = bounds(g.subPaths.flat());
      const cx = (b.x0 + b.x1) / 2 * MAP_SCALE, cy = (b.y0 + b.y1) / 2 * MAP_SCALE;
      return Math.hypot(cx - v.x, cy - v.y) < 30;
    }));
    const wide = near.flat().map(g => {
      const b = bounds(g.subPaths.flat());
      return (b.x1 - b.x0) * MAP_SCALE;
    }).filter(w => w > 20);
    ok(wide.length === 0, '  and takes nothing but the man with it',
      wide.length ? `${wide.length} piece(s) wider than a villager: ` +
                    wide.map(w => w.toFixed(0) + 'px').join(', ')
                  : `${near.flat().length} piece(s) cut, widest ` +
                    `${Math.max(...near.flat().map(g => { const b = bounds(g.subPaths.flat());
                      return (b.x1 - b.x0) * MAP_SCALE; })).toFixed(0)}px`);
  }
}

// --- what he does ---------------------------------------------------------------

console.log('\nTapped\n');

const board = level => {
  const state = { units: [], enemies: [], towers: [], selected: null };
  makeVillagers(state, level);
  return state;
};

{
  const lvl = peopled[0];
  const state = board(lvl);

  // HE STANDS STILL UNTIL HE IS TAPPED. A villager who wandered off on his own
  // would be the board deciding something without the player.
  for (let i = 0; i < 10 / DT; i++) updateVillagers(state, DT);
  ok(state.villagers.length === lvl.villagers.length &&
     state.villagers.every((v, i) => v.x === lvl.villagers[i].x && v.y === lvl.villagers[i].y),
    'he stands where the artist put him until somebody taps him',
    `${state.villagers.length} still there after ten seconds`);

  // THE TAP FINDS HIM. Through pickFigure, which is the function the board tap
  // actually calls — a fixture with its own hit test would prove nothing.
  //
  // ONE AT A TIME, AND THAT IS NOT A WEAKER CLAIM. Two of stage 1's five stand 13px
  // apart, so their tap boxes overlap and the nearer one wins both — which is the
  // rule every figure in this game is picked by and is what the player expects when
  // two things are stacked. The first version of this asked for all five to be
  // reachable at once and read 4 of 5, which was the check being wrong rather than
  // the board: the man in front runs off and the man behind him is then tappable.
  //
  // So what is checked is the guarantee that matters — every villager can be sent,
  // and no tap on one lands on bare ground.
  const sent = new Set();
  for (let pass = 0; pass < state.villagers.length + 2; pass++) {
    const waiting = state.villagers.filter(v => !v.going);
    if (!waiting.length) break;
    let any = false;
    for (const v of waiting) {
      const hit = pickFigure(state, v.x, v.y - 8);
      if (!hit || hit.kind !== 'villager') continue;
      any = true;
      sendVillager(hit.ref);
      if (hit.ref === v) sent.add(v);
    }
    if (!any) break;
    for (let i = 0; i < 6 / DT; i++) updateVillagers(state, DT);
  }
  ok(sent.size === lvl.villagers.length && state.villagers.length === 0,
    '  and every one of them can be tapped and sent',
    `${sent.size} of ${lvl.villagers.length}, leaving ${state.villagers.length} on the board`);

  // AND HE RUNS THE RIGHT WAY. Not "he moves": toward the door his level names,
  // and facing the way he is going. On a fresh board, since the one above is empty.
  const fresh = board(lvl);
  const one = fresh.villagers[0];
  const door = one.door;
  const was = Math.hypot(door.x - one.x, door.y - one.y);
  sendVillager(one);
  ok(one.going && one.face === (door.x >= one.x ? 1 : -1),
    '  and sets off facing the way he is going',
    `face ${one.face}, door ${door.x > one.x ? 'to his right' : 'to his left'}`);

  for (let i = 0; i < 0.5 / DT; i++) updateVillagers(fresh, DT);
  const now = Math.hypot(door.x - one.x, door.y - one.y);
  ok(now < was - 20, '  closing on the doorway rather than merely moving',
    `${was.toFixed(0)}px to go, ${now.toFixed(0)}px after half a second`);

  // AND THROUGH IT. Ten seconds is far longer than the longest run on this board.
  for (let i = 0; i < 10 / DT; i++) updateVillagers(fresh, DT);
  ok(!fresh.villagers.includes(one), '  then goes through it and is gone',
    `${fresh.villagers.length} left on the board`);

  // A SECOND TAP ON A MAN ALREADY RUNNING IS NOT A SECOND START. It re-selects him
  // and nothing else — otherwise his heading would be redrawn mid-stride every time
  // the player tapped the moving figure.
  const two = fresh.villagers[0];
  sendVillager(two);
  const heading = two.face;
  for (let i = 0; i < 0.25 / DT; i++) updateVillagers(fresh, DT);
  const mid = { x: two.x, y: two.y };
  sendVillager(two);
  ok(two.face === heading && two.x === mid.x && two.y === mid.y,
    '  and tapping him again while he runs changes nothing',
    'same heading, same place');
}

// --- his card -------------------------------------------------------------------

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

// --- and he is not in the fight --------------------------------------------------

console.log('\nOut of the fight altogether\n');

{
  // HE HAS NO HEALTH AND NOTHING TO HIT WITH, which is what makes every other
  // checker in this project safe to ignore him. A villager who grew an `hp` would
  // be a figure the armour table, the health bars and the death sweep all have an
  // opinion about, and none of them has been told he exists.
  const has = ['hp', 'maxHp', 'damage', 'armour', 'speed', 'atkCd']
    .filter(k => VILLAGER[k] !== undefined);
  ok(has.length === 0, 'he has no health, no armour and nothing to hit with',
    has.length ? has.join(', ') : 'a name, a drawing and a radius for the tap');

  // AND HE IS IN A LIST OF HIS OWN. Putting him in `units` or `enemies` would have
  // been a `villager` test threaded through the two busiest loops in the game.
  const state = board(peopled[0]);
  ok(state.units.length === 0 && state.enemies.length === 0 && state.villagers.length > 0,
    'and lives in a list of his own, not among the soldiers or the thugs',
    `${state.villagers.length} villager(s), 0 units, 0 enemies`);

  // A BIGGER TAP BOX THAN A SOLDIER'S, because he is smaller than one and tapping
  // him is the whole of what he is for.
  ok(TAP_PAD > 8, 'and a tap box bigger than a soldier\'s, because a miss costs more',
    `${TAP_PAD}px of padding, on a body ${VILLAGER.r * 2}px across`);
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe village is alive.');
process.exit(bad ? 1 : 0);
