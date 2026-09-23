// The Dark Crow: what can reach him, how he flies and how he falls. Node only.
//
//   node tools/crow.mjs
//
// The owner's brief: "A crow that flies to the exit fast. Does not attack anybody.
// Only archery and monastery towers/units and assassins with knife throw can attack
// crows... Shadow will be the centre point of the crow in 3d like world. When the
// crow is shot down, it will fall and use 'falling'. Help me get the shadow right on
// the ground. Use 'dead' when the crow landed on the ground."
//
// EVERY RULE HERE IS ONE THE BOARD WOULD HIDE IF IT BROKE. A catapult that could
// hit him would still look like a catapult hitting a thug; a soldier who could hold
// him would look like a soldier doing his job. So each check is run against the
// same fight with an ordinary Thug in the crow's place, and the Thug's result is
// what proves the fixture is capable of the thing the crow must not suffer.
import { readFileSync } from 'fs';
import { decode } from './png.mjs';
import { enemyTypes, MARCH_ORDER, BOOK_ORDER } from '../src/data/waves.js';
import { families, garrisonUnits, SCALE, knife } from '../src/data/towers.js';
import { abilityById } from '../src/data/abilities.js';
import { pickTarget, updateEnemies, wingbeat, airLift, flapped } from '../src/enemies.js';
import { CUE, FLAP, FLAP_LEAD, CUTS, GAIN, CLIPS } from '../src/audio.js';
import { makeTower, updateTowers } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { updateUnits } from '../src/units.js';
import { updateCorpses, falling, dropHeight, settled, CORPSE_LIFE } from '../src/corpses.js';
import { selectionInfo, strikes } from '../src/select.js';
import { units as adminUnits } from '../src/admin.js';
import { paths } from '../src/assets.js';
import { useLevel, levels } from '../src/level.js';

const DT = 1 / 60;
let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(62)} ${detail}`);
  if (!cond) bad++;
};

const CROW = enemyTypes.crow;
const THUG = enemyTypes.light_inf;
const F = CROW.flying;

useLevel(0);

const foe = (def, x, y, over = {}) => ({
  def, x, y, hp: def.hp, maxHp: def.hp, route: 0, lane: 1, s: 200,
  foe: null, acd: 1, thrust: 0, halted: false, leaked: false, statuses: [],
  face: 1, guard: 0, cast: 0, act: null, ...over
});

const world = (over = {}) => ({
  towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [],
  splats: [], impacts: [], smoke: [], bombs: [], gold: 0, lives: 20, ...over
});

// --- who he is -------------------------------------------------------------------

console.log('\n--- the card ---\n');

{
  ok(CROW.name === 'Dark Crow' && CROW.hp === 60, 'a Dark Crow, with 60 health', `${CROW.name}, ${CROW.hp}`);
  ok(CROW.armour.physical === 'none' && CROW.armour.magic === 'high',
    '  no physical plate and a high magic ward', `${CROW.armour.physical} / ${CROW.armour.magic}`);

  // FAST, AT THE OWNER'S WORD, and "fast" has to mean faster than anything else on
  // the road or it means nothing.
  const walkers = Object.values(enemyTypes).filter(d => d !== CROW && !d.boss);
  const quickest = Math.max(...walkers.map(d => d.speed));
  ok(CROW.speed > quickest, '  and faster than anything walking',
    `${CROW.speed} against the quickest walker's ${quickest}`);

  // HE ATTACKS NOBODY, and the card and the panel say so by leaving the sword off.
  ok(CROW.damage === 0 && !CROW.atkCd && !CROW.ranged && !strikes(CROW),
    'he attacks nobody', `damage ${CROW.damage}, no swing clock, no missile`);
  const others = walkers.filter(d => d !== CROW && !strikes(d));
  ok(others.length === 0, '  and is the only creature that does not',
    others.map(d => d.name).join(', ') || 'every other one strikes');

  const info = selectionInfo({ selected: { kind: 'enemy', ref: foe(CROW, 0, 0) } });
  ok(info && info.hp === CROW.hp && info.damage === null, '  so his panel shows health and no attack',
    info ? `health ${info.hp}, attack ${info.damage}` : 'no panel');

  const row = adminUnits().find(u => u.id === 'enemy/crow');
  ok(row && row.hp && !row.dmg, '  and the dashboard offers no attack to edit',
    row ? `health ${row.hp}, attack ${row.dmg}` : 'no row');

  ok(BOOK_ORDER.includes('crow') && MARCH_ORDER.includes('crow'),
    'he is in the encyclopedia and the march order', 'both lists');
}

// --- what can reach him --------------------------------------------------------

console.log('\n--- what can reach him ---\n');

{
  // EVERY TIER OF EVERY FAMILY THAT SHOOTS, through the real tower loop, against a
  // crow and then a Thug on the same spot. Archery and the monastery must fire at
  // both; artillery must fire at the Thug and never at the crow.
  const shotsAt = (fam, rung, def) => {
    const t = makeTower({ x: 300, y: 330 }, fam, rung);
    // Close for the bows and altars, whose tier 1 rings are small; further for the
    // machines, which have a dead zone at their own feet.
    const y = fam.id === 'siege' ? 200 : 250;
    const st = world({ towers: [t], enemies: [foe(def, 300, y)] });
    let fired = 0;
    for (let i = 0; i < 60 * 8; i++) {
      const before = st.shots.length;
      updateTowers(st, DT);
      fired += st.shots.length - before;
      st.shots.length = 0;
    }
    return fired;
  };

  const AIR = { archery: true, monastery: true, siege: false };
  for (const fam of families.filter(f => f.id in AIR)) {
    for (const rung of fam.tiers) {
      const atCrow = shotsAt(fam, rung, CROW);
      const atThug = shotsAt(fam, rung, THUG);
      ok(atThug > 0 && (AIR[fam.id] ? atCrow > 0 : atCrow === 0),
        `${rung.name} ${AIR[fam.id] ? 'shoots him down' : 'cannot aim at him'}`,
        `${atCrow} shot(s) at a crow, ${atThug} at a thug`);
    }
  }

  // THE AMMUNITION IS WHAT DECIDES, and a weapon that says nothing cannot reach
  // him — pickTarget's default. The knife and every garrison man's missile say yes.
  const e = foe(CROW, 300, 200);
  ok(pickTarget([e], 300, 250, 200) === null, 'a weapon that does not say it reaches the air cannot pick him',
    'pickTarget with no `air`');
  ok(pickTarget([e], 300, 250, 200, 0, 0, true) === e, '  and one that says it does, can', 'air: true');

  const throwKnife = abilityById('knife');
  ok(throwKnife.ammo.air === true && knife.air === true, "the assassin's Knife Throw reaches him",
    `${throwKnife.name}: ${throwKnife.ammo.kind}`);

  const garrison = Object.values(garrisonUnits || {}).filter(d => d.ranged);
  ok(garrison.length > 0 && garrison.every(d => d.ranged.ammo.air),
    '  and so does every garrison man who shoots', garrison.map(d => `${d.name}: ${d.ranged.ammo.kind}`).join(', '));
}

{
  // NO SOLDIER TAKES HOLD OF HIM. Through updateUnits with a squad man standing
  // on his shadow; the same man takes hold of a Thug on the first frame.
  const barracks = families.find(f => f.id === 'barracks').tiers;
  const man = barracks.find(t => t.name === 'Knight\'s Hall').soldier;
  const holds = def => {
    const post = { def: { range: 300 }, fam: { id: 'barracks' }, abilities: [],
                   x: 300, y: 220, rally: { x: 300, y: 200 } };
    const u = { def: man, x: 300, y: 205, rx: 300, ry: 205, hp: man.hp, maxHp: man.hp,
                foe: null, holds: false, cd: 0, thrust: 0, hold: 0, respawn: 0, face: 1,
                statuses: [], tower: post, struckFrom: 0 };
    const e = foe(def, 300, 200, { hp: 1e6, maxHp: 1e6 });
    const st = world({ towers: [post], enemies: [e], units: [u] });
    let held = 0;
    for (let i = 0; i < 60 * 2; i++) { updateUnits(st, DT); if (e.foe) held++; }
    return held;
  };
  const crowHeld = holds(CROW), thugHeld = holds(THUG);
  ok(crowHeld === 0 && thugHeld > 0, 'no soldier ever takes hold of him',
    `held ${crowHeld} frame(s); a thug on the same spot, ${thugHeld}`);
}

{
  // AND A BLAST DOES NOT CATCH HIM. A rock thrown at a Thug standing on the crow's
  // shadow hurts the Thug and not the bird twenty pixels over him.
  const crow = foe(CROW, 300, 200);
  const mark = foe(THUG, 305, 200, { s: 100 });
  const rock = {
    x: 305, y: 200, groundY: 200, from: { x: 300, y: 320 }, to: { x: 305, y: 200 },
    t: 0, flight: 0.5, lift: 40, speed: 0, target: mark, damage: 60, type: 'physical',
    pierce: 0, splash: 70, ammo: { kind: 'rock', impact: true, landSound: false },
    fromX: 300, dead: false
  };
  const st = world({ enemies: [crow, mark], shots: [rock] });
  for (let i = 0; i < 60 * 2 && !rock.dead; i++) updateShots(st, DT);
  ok(crow.hp === CROW.hp && mark.hp < THUG.hp, 'a rock landing on his shadow leaves him flying',
    `crow took ${CROW.hp - crow.hp}, the thug beside him ${THUG.hp - mark.hp}`);

  // ONE THAT CAN REACH THE AIR, bursting in the same place, does catch him.
  const crow2 = foe(CROW, 300, 200);
  const burst = { ...rock, dead: false, t: 0, ammo: { kind: 'arcane', air: true, impact: true, landSound: false } };
  const st2 = world({ enemies: [crow2, foe(THUG, 305, 200)], shots: [burst] });
  for (let i = 0; i < 60 * 2 && !burst.dead; i++) updateShots(st2, DT);
  ok(crow2.hp < CROW.hp, '  while a burst from something that reaches the air does not',
    `${CROW.hp - crow2.hp} of 60`);
}

{
  // AN ARROW GOES INTO THE BIRD, NOT THE GRASS. Steered at his body: the last point
  // it flew to before landing is `airLift` above his shadow.
  const e = foe(CROW, 300, 150);
  const arrow = { x: 300, y: 300, speed: 400, target: e, damage: 30, type: 'physical', pierce: 0,
                  ammo: { kind: 'arrow', air: true }, fromX: 300, angle: 0, dead: false };
  const st = world({ enemies: [e], shots: [arrow] });
  let last = null;
  for (let i = 0; i < 60 && !arrow.dead; i++) { last = { x: arrow.x, y: arrow.y }; updateShots(st, DT); }
  const aimY = e.y - airLift(e);
  ok(e.hp === CROW.hp - 30 && Math.abs(last.y - aimY) < 8,
    'an arrow flies into the bird rather than his shadow',
    `last at y ${last.y.toFixed(1)}, bird at ${aimY.toFixed(1)}, shadow at ${e.y}`);
}

// --- how he flies ---------------------------------------------------------------

console.log('\n--- the wingbeat, and the shadow under it ---\n');

// THE SHADOW, FOUND IN THE PIXELS. The artist's brown, #362407, and its centre.
const read = key => decode(readFileSync(new URL(`../${decodeURIComponent(paths[key])}`, import.meta.url)));
const brown = img => {
  const { w, h, ch, px } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch;
    if (px[i + ch - 1] > 200 && px[i] === 0x36 && px[i + 1] === 0x24 && px[i + 2] === 0x07) {
      n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  return n ? { x0, y0, x1, y1, n } : null;
};

{
  // ONE SHADOW ON ONE PIXEL, whichever beat he is on, and the pivot of every frame
  // lands on it. That is what keeps the ground under him still while the wings move.
  const shadows = F.frames.map(f => brown(read(f.sprite)));
  const same = shadows.every(s => s && s.x0 === shadows[0].x0 && s.y0 === shadows[0].y0 &&
                                   s.x1 === shadows[0].x1 && s.y1 === shadows[0].y1);
  ok(same, 'all three flight drawings put the shadow on the same pixels',
    shadows.map(s => s ? `${s.x0},${s.y0}-${s.x1},${s.y1}` : 'none').join(' | '));

  const at = f => [f.trim[0] + f.pivot[0] * f.trim[2], f.trim[1] + f.pivot[1] * f.trim[3]];
  const pts = F.frames.map(at);
  const spread = Math.max(...pts.map(p => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1])));
  ok(spread < 0.5, '  and every frame is drawn from that one point', `${spread.toFixed(2)} source px apart`);

  // THE CUT-OUT THE FALL LAYS ON THE GROUND is the shadow, whole.
  const s = shadows[0], [sx, sy, sw, sh] = F.shadow;
  ok(sx <= s.x0 && sy <= s.y0 && sx + sw > s.x1 && sy + sh > s.y1 && sw - (s.x1 - s.x0 + 1) <= 2,
    '  and `flying.shadow` cuts out exactly that shadow', `[${F.shadow}] around ${s.x0},${s.y0}-${s.x1},${s.y1}`);

  // AND THE FALLING DRAWING HAS NONE — if it ever gets one, the ground would show two.
  ok(brown(read(F.fallen.sprite)) === null, 'the Falling drawing carries no shadow of its own', 'none found');

  // EACH `lift` IS THE MIDDLE OF THAT FRAME'S BIRD. The bird is everything above
  // the shadow; its middle, measured, against the number an arrow is steered by.
  const pivotY = pts[0][1];
  const lifts = F.frames.map(f => {
    const img = read(f.sprite), { w, ch, px } = img;
    let y0 = 1e9, y1 = -1;
    for (let y = 0; y < s.y0 - 2; y++) for (let x = 0; x < w; x++)
      if (px[(y * w + x) * ch + ch - 1] > 8) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return pivotY - (y0 + y1 + 1) / 2;
  });
  ok(F.frames.every((f, i) => Math.abs(f.lift - lifts[i]) <= 1.5),
    'the height of the bird in each frame is where the arrows go',
    F.frames.map((f, i) => `${f.lift} (${lifts[i].toFixed(1)})`).join(', '));

  // THE BEAT: Default, 1, 2, 1, round again, and never 2 straight to Default.
  const seen = [];
  for (let s2 = 0; s2 < F.stride * 8; s2 += F.stride) seen.push(F.frames.indexOf(wingbeat({ def: CROW, s: s2 + 1 })));
  const jumps = seen.slice(1).filter((f, i) => Math.abs(f - seen[i]) > 1).length;
  ok(seen.slice(0, 4).join('') === '0121' && jumps === 0, 'the wings beat up, level, down, level',
    seen.join(' '));
}

// --- how he falls ---------------------------------------------------------------

console.log('\n--- shot down ---\n');

{
  // THROUGH THE REAL DEATH PATH: a crow with no health left in updateEnemies.
  const e = foe(CROW, 400, 250, { hp: 0, s: 1, killedBy: 'arrow', struckFrom: -1 });
  const st = world({ enemies: [e] });
  updateEnemies(st, DT);
  const c = st.corpses[0];
  ok(st.enemies.length === 0 && c && falling(c), 'a crow shot dead leaves a body that is falling',
    c ? `fall ${c.fall}s` : 'no body');

  // Where he died, which is where updateEnemies left him on his lane this frame.
  ok(c.x === e.x && c.y === e.y, '  straight down, onto the spot his shadow was on',
    `body at ${c.x.toFixed(1)},${c.y.toFixed(1)}, shadow was at ${e.x.toFixed(1)},${e.y.toFixed(1)}`);
  ok(c.face === 1, '  still facing the way he flew, not the way the arrow came', `face ${c.face}`);
  ok(Math.abs(dropHeight(c) - airLift(e)) < 0.01, '  starting from the height he was flying at',
    `${dropHeight(c).toFixed(1)}px, flying at ${airLift(e).toFixed(1)}px`);
  // HE BLEEDS, at the owner's word, but not until he is down: the pool is his from
  // the frame he dies and invisible for as long as he is in the air.
  ok(c.pool && settled(c) === 0, '  and a pool that waits under him until he lands',
    c.pool ? `${c.pool.img}, at ${settled(c)} while falling` : 'no pool');

  // THE DROP: accelerating, ending where the Dead drawing has his body, and the two
  // seconds every body gets only starting once he is down.
  const heights = [], lives = [];
  let t = 0;
  while (falling(c) && t < 5) { heights.push(dropHeight(c)); lives.push(c.life); updateCorpses(st, DT); t += DT; }
  const steps = heights.slice(1).map((h, i) => heights[i] - h);
  const speeding = steps.slice(1).every((d, i) => d >= steps[i] - 1e-9);
  ok(Math.abs(t - F.fall) < 2 * DT && speeding, 'he falls for half a second, faster as he goes',
    `${t.toFixed(2)}s, ${steps[0].toFixed(2)}px then ${steps[steps.length - 1].toFixed(2)}px a frame`);
  ok(lives.every(l => l === CORPSE_LIFE), '  and the body\'s fade has not started while he is in the air',
    `life ${CORPSE_LIFE}s throughout`);
  const early = settled(c);
  updateCorpses(st, 0.1);
  ok(early < 0.2 && settled(c) > early, '  then the pool spreads from the landing',
    `${early.toFixed(2)} on landing, ${settled(c).toFixed(2)} a tenth of a second later`);
  ok(Math.abs(dropHeight(c) - F.rest * SCALE) < 0.01, '  landing where the Dead drawing has his body',
    `${dropHeight(c).toFixed(2)}px above the shadow`);

  // AND `rest` IS WHAT THE DEAD DRAWING SAYS: its body's middle above its shadow.
  const dead = read(CROW.dead);
  const [tx, ty, , th] = CROW.deadTrim;
  const shadowY = ty + CROW.deadPivot[1] * th;
  const { h, w, ch, px } = dead;
  let y0 = 1e9, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch;
    if (px[i + ch - 1] > 8 && !(px[i] === 0x36 && px[i + 1] === 0x24 && px[i + 2] === 0x07)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const rest = shadowY - (y0 + y1 + 1) / 2;
  ok(Math.abs(rest - F.rest) <= 1.5, '  which is measured off the Dead drawing', `${F.rest} (${rest.toFixed(1)})`);

  // THEN HE LIES THERE FOR THE TWO SECONDS ANY BODY DOES, and is gone.
  let lying = 0;
  while (st.corpses.length && lying < 10) { updateCorpses(st, DT); lying += DT; }
  ok(Math.abs(lying + 0.1 - CORPSE_LIFE) < 2 * DT, 'then lies for two seconds like any body and is gone',
    `${(lying + 0.1).toFixed(2)}s on the ground`);
}

{
  // AND IT IS HIS ALONE. A Thug dies on his feet, with the throw and the pool.
  const e = foe(THUG, 400, 250, { hp: 0, killedBy: 'arrow', struckFrom: -1 });
  const st = world({ enemies: [e] });
  updateEnemies(st, DT);
  const c = st.corpses[0];
  ok(c && !falling(c) && c.pool && c.kb > 0, 'a Thug still drops where he stood, thrown back, in a pool',
    c ? `kb ${c.kb}` : 'no body');
}

// --- what he sounds like -----------------------------------------------------------

console.log('\n--- his cry and his wings ---\n');

{
  // "crow dies — use it when it is shot and falling down. Category A." His def names
  // the cue, and the death path plays the def's cry in place of the weapon's line.
  const cue = CUE[CROW.cry];
  ok(cue && cue.length === 1 && CLIPS[cue[0]] === 'assets/audio/sfx/Crow_dies.mp3',
    'he has his own cry, and it is Crow_dies', cue ? `${CROW.cry} -> ${cue.join(', ')}` : 'no cue');
  const death = readFileSync(new URL('../src/enemies.js', import.meta.url), 'utf8');
  ok(/solo\(e\.def\.cry \? CUE\[e\.def\.cry\]/.test(death),
    '  played through solo — Category A — in place of the kill line', 'the death path in src/enemies.js');

  // "wings flap — use it every time crow flaps its wing... category B... soft." Three
  // wingbeats cut out of one recording, taken in turn.
  ok(FLAP.length === 3 && FLAP.every(k => CLIPS[k] === 'assets/audio/sfx/Wings_flap.mp3' && CUTS[k] && GAIN[k] < 1),
    'his wings are three flaps cut out of Wings_flap, under full level',
    FLAP.map(k => `${k} [${CUTS[k].map(v => v.toFixed(3)).join('-')}] x${GAIN[k]}`).join(', '));

  // ONCE PER STROKE, at the owner's count: down is a flap and back up is another.
  // Flown at his own speed a frame at a time for ten wingbeats: twenty flaps.
  const stroke = F.stride * 2;
  const e = foe(CROW, 0, 0, { s: 0.5 });
  let flaps = 0;
  const starts = [];
  while (e.s < stroke * 20 + 0.5) {
    const before = e.s; e.s += CROW.speed * DT;
    if (flapped(e, before)) { flaps++; starts.push(e.s); }
  }
  ok(flaps === 20, '  once a stroke: twenty flaps in ten wingbeats', `${flaps}`);
  ok(/if \(e\.def\.flying && flapped\(e, flown\)\) play\(FLAP\)/.test(death),
    '  played through play — Category B — from the step that moves him', 'updateEnemies in src/enemies.js');

  // THE CLAP LANDS ON THE ARRIVAL. Every cut starts FLAP_LEAD before its clap, so a
  // flap started at distance s claps at s + FLAP_LEAD x speed — which must be the
  // frame the wings reach Flying 2 or the Default, within the one frame step.
  const step = CROW.speed * DT;
  const off = starts.map(s0 => {
    const clapAt = s0 + FLAP_LEAD * CROW.speed;
    const r = ((clapAt % stroke) + stroke) % stroke;
    return Math.min(r, stroke - r);
  });
  ok(Math.max(...off) <= step + 1e-9, '  and each clap lands on the frame the wings arrive',
    `within ${Math.max(...off).toFixed(2)}px of it, a frame's step is ${step.toFixed(2)}px`);
  const arrivals = starts.map(s0 => {
    const w = wingbeat({ def: CROW, s: s0 + FLAP_LEAD * CROW.speed + step });
    return F.frames.indexOf(w);
  });
  ok(arrivals.every(f => f === 0 || f === 2) && arrivals.includes(0) && arrivals.includes(2),
    '  down to Flying 2 and back up to the Default, in turn', arrivals.slice(0, 6).join(' '));

  // AND ONE FLAP HAS FINISHED BEFORE THE NEXT BEGINS. The longest cut, against the
  // time a stroke takes at his speed.
  const longest = Math.max(...FLAP.map(k => CUTS[k][1] - CUTS[k][0]));
  const strokeS = stroke / CROW.speed;
  ok(longest <= strokeS + 0.01, '  and no flap is still sounding when the next one starts',
    `longest flap ${longest.toFixed(3)}s, a stroke ${strokeS.toFixed(3)}s`);
  ok(CROW.speed === 80, 'he flies at 80', `${CROW.speed}`);
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe crow flies over the wall and falls where his shadow was.');
process.exit(bad ? 1 : 0);
