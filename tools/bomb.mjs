// The Bomb Thug: the one enemy who cannot be fought, only avoided. Node only.
//
//   node tools/bomb.mjs
//
// Every check below drives the modules that ship — updateUnits from src/units.js,
// updateEnemies from src/enemies.js and updateBombs from src/bombs.js — against a
// squad mustered by the game's own makeUnits. Nothing here is a model of the
// mechanic; it is the mechanic, minus drawing.
//
// THE OWNER'S BRIEF, which is what the sections below are:
//
//   "a thug that sacrifices himself by bombing himself when in contact with a
//    soldier. Deals a lot of damage but kills himself in the process."
//
//   "If bomb thug explodes by himself, do not use Bomb Thug Dead png and there is
//    no blood. He just vanishes as the explosion is too strong."
//
//   "Bomb Thug Dead png is separated into Bomb Thug Self png and Bomb Thug Bomb
//    png. This is because the bomb has not been triggered, it will explode in 2
//    seconds once bomb thug is dead... (Same AOE 100, physical damage 120, pierce
//    physical damage: 1 rank)."
//
// FIVE CLAIMS, checked in that order: he goes off on contact, he takes everybody
// in reach with him, he leaves nothing behind, a projectile kill leaves a live
// bomb instead, and that bomb is worth exactly what he was.
//
// AND EVERY "NOTHING HAPPENED" IS PAIRED. Four of the claims above are negatives —
// no body, no blood, no gold, no second blow — and a negative passes just as well
// against a creature that never spawned or a loop that never ran. So each of them
// is asked beside the case where the same thing SHOULD happen: a Bomb Thug shot
// down does leave a body, does pay, and an ordinary Thug in his place does swing
// twice. That is the rule tools/unseen.mjs set for the Shadow Thug and it is the
// reason this file is twice as long as the mechanic.

import { enemyTypes } from '../src/data/waves.js';
import { families } from '../src/data/towers.js';
import { makeTower } from '../src/towers.js';
import { updateUnits, makeUnits } from '../src/units.js';
import { updateEnemies } from '../src/enemies.js';
import { updateBombs, dropBomb, FUSE, FLASH } from '../src/bombs.js';
import { taken, wornBy, typeOf, pierceOf } from '../src/data/armour.js';
import { inRange } from '../src/ground.js';
import { useLevel, levels } from '../src/level.js';

const DT = 1 / 60;
let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(58)} ${detail}`);
  if (!cond) bad++;
};

const BOMB = enemyTypes.bomb_inf;
const THUG = enemyTypes.light_inf;
const barracks = families.find(f => f.id === 'barracks').tiers;

// A board with a road under it, because an enemy's position comes from `s` along
// a route and updateEnemies recomputes x and y from it every frame. The first
// drawn level serves.
useLevel(0);

// EVERY CLOCK AN ENEMY RUNS, initialised. `acd` is the one that matters here: it
// is the seconds until the next blow, it starts a creature's life at zero, and it
// is only ticked by the man holding it — so a fixture that sets it to 1 is a
// fixture where the bomb goes off a second late and the frame counts below are all
// wrong. Zero is what the spawner writes.
const foe = (def, over = {}) => ({
  def, x: 0, y: 0, hp: def.hp, maxHp: def.hp, route: 0, lane: 1, s: 200,
  foe: null, acd: 0, tcd: 0, shot: 0, thrust: 0, halted: false, leaked: false,
  statuses: [], face: -1, guard: 0, ...over
});

const world = (over = {}) => ({
  towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [],
  splats: [], impacts: [], smoke: [], bombs: [], gold: 0, lives: 20, ...over
});

// A REAL SQUAD OUT OF A REAL BARRACKS, because a hand-rolled `{ def, hp, x, y }`
// is not a valid target: the engagement asks questions of a soldier that a
// stand-in does not answer, and a fixture built that way reports a Bomb Thug who
// walks past the line without going off. makeUnits is the call the game makes.
function squad(state, tier = 0, at = { x: 0, y: 0 }) {
  const fam = { id: 'barracks', tiers: barracks };
  const tower = makeTower(at, fam, barracks[tier]);
  state.towers.push(tower);
  makeUnits(state, tower);
  return tower;
}

// Put the men where we want them and let go of the rally point, so the squad does
// not spend the run walking back to its flag while the thing being measured
// happens somewhere else.
const stand = (state, x, y, spread = 0) => {
  state.units.forEach((u, i) => {
    u.x = x + i * spread;
    u.y = y;
    u.rx = u.x;
    u.ry = u.y;
  });
};

console.log('\n--- he goes off the moment a soldier has hold of him ---\n');

{
  const st = world();
  const e = foe(BOMB);
  st.enemies.push(e);
  const tower = squad(st, 0);
  updateEnemies(st, DT);            // gives the enemy its x/y off `s`
  stand(st, e.x + 10, e.y);
  tower.x = e.x; tower.y = e.y;

  const before = st.units.map(u => u.hp);
  let frames = 0;
  while (frames < 60 * 4 && st.enemies.length) {
    updateUnits(st, DT);
    updateEnemies(st, DT);
    stand(st, e.x + 10, e.y);
    frames++;
  }
  ok(!st.enemies.length, 'a Bomb Thug who reaches a squad does not survive it',
    `gone after ${frames} frame(s)`);
  ok(st.units.some((u, i) => u.hp < before[i]), '  and the men he reached are hurt',
    st.units.map(u => Math.round(u.hp)).join(', '));

  // AND HE NEVER SWINGS. `blown` is the flag the death path reads and it is the
  // only evidence that this was a detonation rather than a creature that happened
  // to die — an ordinary Thug in the same fixture is killed by the squad too, at
  // about the same time, and every check above would pass on him.
  ok(e.blown === true, '  and it was his own bomb rather than the squad',
    `blown ${e.blown}, hp ${e.hp}`);
}

{
  // THE PAIRED CASE. An ordinary Thug in exactly the same fixture swings, keeps
  // swinging, and is still there — so the section above is measuring the Bomb
  // Thug and not measuring a squad that kills anything put in front of it.
  const st = world();
  const e = foe(THUG);
  st.enemies.push(e);
  const tower = squad(st, 0);
  updateEnemies(st, DT);
  stand(st, e.x + 10, e.y);
  tower.x = e.x; tower.y = e.y;
  for (let i = 0; i < 60 * 2; i++) {
    updateUnits(st, DT);
    updateEnemies(st, DT);
    stand(st, e.x + 10, e.y);
  }
  ok(!e.blown && st.enemies.length === 1,
    'an ordinary Thug in the same fixture fights instead', `blown ${!!e.blown}`);
}

console.log('\n--- everybody inside the blast, and nobody outside it ---\n');

{
  // THE REACH, asked of the game's own `inRange` rather than of a radius. The
  // board is drawn in perspective so a round patch of ground is drawn squashed;
  // a check that used a plain hypot would pass men standing above and below the
  // bomb that the game does not reach, and this is the axis that catches it.
  ok(inRange(0, 0, BOMB.splash, 0, BOMB.splash) &&
     !inRange(0, 0, BOMB.splash + 1, 0, BOMB.splash),
    'the blast reaches exactly its own 100px along the road',
    `${BOMB.splash}px in, ${BOMB.splash + 1} out`);

  // A LINE OF MEN, one inside the blast and one well outside it, and the far man
  // is the half that matters: a burst that hurt everybody on the board would pass
  // every other check in this file.
  const st = world();
  const e = foe(BOMB);
  st.enemies.push(e);
  const tower = squad(st, 3);          // paladins: they survive one and can be read
  updateEnemies(st, DT);
  tower.x = e.x; tower.y = e.y;
  const near = st.units[0];
  const far = st.units[1];
  const rest = st.units.slice(2);
  const place = () => {
    near.x = e.x + 20; near.y = e.y; near.rx = near.x; near.ry = near.y;
    far.x = e.x + 400; far.y = e.y; far.rx = far.x; far.ry = far.y;
    // The others parked well out of it too, so only two men are being read.
    rest.forEach((u, i) => { u.x = e.x + 600 + i * 20; u.y = e.y; u.rx = u.x; u.ry = u.y; });
  };
  place();
  const full = near.maxHp;
  for (let i = 0; i < 60 * 4 && st.enemies.length; i++) {
    updateUnits(st, DT);
    updateEnemies(st, DT);
    place();
  }
  // WHAT A PALADIN SHOULD HAVE LOST, worked out the way the game works it out
  // rather than typed: the blast's damage through his own plate with the bomb's
  // own pierce. A number typed here would go stale the day either is retuned, and
  // it would go stale silently.
  const want = taken(BOMB.damage, typeOf(BOMB), wornBy(near), pierceOf(BOMB));
  ok(Math.round(full - near.hp) === want, 'the man beside him takes the full blast',
    `${Math.round(full - near.hp)} lost, want ${want} (${BOMB.damage} through ${wornBy(near).physical} plate, ${BOMB.pierce} rank)`);
  ok(far.hp === far.maxHp, '  and the man 400px away takes none of it',
    `${Math.round(far.hp)}/${far.maxHp}`);
}

console.log('\n--- he vanishes: no body, no blood, no bounty ---\n');

{
  const st = world();
  const e = foe(BOMB);
  st.enemies.push(e);
  const tower = squad(st, 3);
  updateEnemies(st, DT);
  stand(st, e.x + 10, e.y);
  tower.x = e.x; tower.y = e.y;
  for (let i = 0; i < 60 * 4 && st.enemies.length; i++) {
    updateUnits(st, DT);
    updateEnemies(st, DT);
    stand(st, e.x + 10, e.y);
  }
  // HIS OWN BODY, not any body: the paladins standing in the blast can die too and
  // leave corpses of their own, which is right and would hide this if the list were
  // counted rather than filtered.
  const his = st.corpses.filter(c => c.def === BOMB);
  ok(!his.length, 'he leaves no body', `${his.length} of his, ${st.corpses.length} corpse(s) in all`);
  // THE POOL COMES WITH THE BODY — dropCorpse makes it — so no body is no blood.
  // Asked separately anyway, because they are separate at the call site and a
  // future change could sever them.
  ok(!his.some(c => c.pool), '  and no blood of his own', 'the pool belongs to the corpse');
  ok(st.gold === 0, '  and pays nothing, because nobody killed him', `${st.gold} gold`);
  ok(!st.bombs.length, '  and leaves nothing on the ground',
    `${st.bombs.length} live bomb(s)`);
}

{
  // THE PAIRED CASE, and it is the one that proves the four above are about the
  // detonation rather than about the Bomb Thug never dying properly. Shot down
  // where he stands, with no soldier anywhere: body, blood, bounty, and a bomb.
  const st = world();
  const e = foe(BOMB);
  st.enemies.push(e);
  updateEnemies(st, DT);
  e.hp = 0;
  e.struckFrom = 1;
  e.killedBy = 'arrow';
  updateEnemies(st, DT);
  const his = st.corpses.filter(c => c.def === BOMB);
  ok(his.length === 1, 'shot down instead, he leaves a body', `${his.length} corpse(s)`);
  ok(!!(his[0] && his[0].pool), '  and blood under it', his[0] && his[0].pool ? 'pool set' : 'none');
  ok(st.gold === BOMB.bounty, '  and pays his bounty', `${st.gold} gold`);
  ok(st.bombs.length === 1, '  and the bomb he was carrying is still live',
    `${st.bombs.length} on the ground, ${st.bombs[0] && st.bombs[0].fuse.toFixed(2)}s of fuse`);
}

console.log('\n--- and the bomb he drops is worth exactly what he was ---\n');

{
  const st = world();
  const e = foe(BOMB);
  st.enemies.push(e);
  const tower = squad(st, 3);
  updateEnemies(st, DT);
  // The squad parked ON the spot he falls, which is the case the owner's rule is
  // for: shooting one down over your own line does not save the line.
  stand(st, e.x, e.y);
  tower.x = e.x; tower.y = e.y;
  e.hp = 0;
  e.struckFrom = 1;
  updateEnemies(st, DT);

  const man = st.units[0];
  const full = man.hp;
  // NOT YET. A fuse that went off on the frame it was dropped would pass the
  // damage check below and be the wrong mechanic entirely.
  for (let i = 0; i < 60 * 1.5; i++) { updateBombs(st, DT); }
  ok(man.hp === full, 'it does nothing for the first second and a half',
    `${Math.round(man.hp)}/${full}, ${st.bombs[0] && st.bombs[0].fuse.toFixed(2)}s left`);

  let frames = 60 * 1.5;
  while (frames < 60 * 4 && st.bombs.length) { updateBombs(st, DT); frames++; }
  const at = frames * DT;
  ok(Math.abs(at - FUSE) < 0.05, `  and bursts ${FUSE} seconds after he fell`,
    `${at.toFixed(2)}s`);
  const want = taken(BOMB.damage, typeOf(BOMB), wornBy(man), pierceOf(BOMB));
  ok(Math.round(full - man.hp) === want, '  for the same blow he would have struck',
    `${Math.round(full - man.hp)} lost, want ${want}`);
  ok(!st.bombs.length, '  and is gone once it has', `${st.bombs.length} left`);
  // THE PICTURE, through the same impact system every other burst in the game
  // uses. 0.2s at the owner's word.
  const flash = st.impacts.filter(i => i.img === 'bomb_blast');
  ok(flash.length === 1 && Math.abs(flash[0].life - FLASH) < 1e-9,
    `  and puts its own burst on the board for ${FLASH}s`,
    `${flash.length} mark(s), life ${flash[0] && flash[0].life}`);
  // AND IT IS DRAWN SOLID ON THE FRAME IT APPEARS. The renderer's opacity is
  // life/fade capped at 1, so a mark shorter than its fade is never once at full —
  // which is what the burst did at 0.2s under the 0.25s default, and it read as a
  // puff rather than a bang. Nothing clamps this: 0.3 clears 0.25 because it was
  // chosen to, and if it is ever shortened again this is the line that says so.
  ok(flash[0] && flash[0].life / flash[0].fade >= 1,
    '  at full opacity rather than part-faded from birth',
    flash[0] ? `${flash[0].life} life against ${flash[0].fade} fade` : 'no mark');
}

console.log('\n--- where the bomb lands ---\n');

{
  // OFF THE COMPOSITE THE ARTIST DREW. Enemies_Bomb_Thug_Dead.png is the body and
  // the bomb in one frame; the two halves the game loads were cut out of it
  // without either moving. So the gap between them is not a choice, and this is
  // the check that the constant in src/bombs.js still reproduces it.
  //
  // The numbers: the body's ground shadow is centred at source (195.0, 282.5), the
  // bomb's trim box has its bottom middle at (315.0, 295.0), and the game draws at
  // SCALE. Re-measure with tools/trim.mjs and tools/shadow.mjs after a re-export.
  const SCALE = 105 / 512;
  const st = world();
  const e = foe(BOMB, { x: 500, y: 300 });
  dropBomb(st, BOMB, e.x, e.y, BOMB.spriteFaces);
  const b = st.bombs[0];
  ok(Math.abs((b.x - (e.x - BOMB.spriteFaces * 10)) - (315.0 - 195.0) * SCALE) < 0.01 &&
     Math.abs((b.y - e.y) - (295.0 - 282.5) * SCALE) < 0.01,
    'it lies where the composite puts it, beside the body',
    `${(b.x - e.x).toFixed(1)}, +${(b.y - e.y).toFixed(1)} from where he fell`);

  // AND IT TURNS ROUND WITH HIM. The corpse's drawing is mirrored when the blow
  // came from the other side, so a bomb that did not mirror would stand on the
  // wrong side of the body half the time — and half the time is exactly the kind
  // of wrong that looks like a one-off when you see it.
  const st2 = world();
  dropBomb(st2, BOMB, 500, 300, -BOMB.spriteFaces);
  ok(Math.sign(st2.bombs[0].x - 500) === -Math.sign(b.x - 500),
    '  and swaps sides when he falls the other way',
    `${(b.x - 500).toFixed(1)} against ${(st2.bombs[0].x - 500).toFixed(1)}`);
}

console.log('\n--- what the rest of the roster is not ---\n');

{
  // ONE CREATURE CARRIES THIS, and the three fields that make him are asked of
  // every other def. A flag that leaked onto the Thug would turn the opening wave
  // of the game into a minefield, and nothing else in this file would notice.
  const others = Object.entries(enemyTypes).filter(([id]) => id !== 'bomb_inf');
  ok(!others.some(([, d]) => d.bomb), 'nothing else on the road carries a bomb',
    `${others.length} other type(s) checked`);
  // AND HE IS THE ONE WITHOUT AN ATTACK DRAWING, which is load-bearing rather than
  // trivia: tools/facing.mjs and the renderer both used to assume the pair, and
  // `pose` falling through to the Default is what keeps him walking right up to
  // the frame he is not there.
  const poseless = Object.entries(enemyTypes).filter(([, d]) => !d.attack).map(([id]) => id);
  ok(poseless.join(',') === 'bomb_inf', 'and he is the only one with no attack pose',
    poseless.join(', ') || 'none');
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe Bomb Thug goes off exactly twice, and never a third time.');
process.exit(bad ? 1 : 0);
