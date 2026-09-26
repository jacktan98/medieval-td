// Men in towers turning round while idle, and the artillery crewman cut out of his
// machine to do it. Node only.
//
//   node tools/crew.mjs
//
// The owner's brief: "When idle, units in towers at random can turn to otherside
// (mirror). For artillery, since they are part of the weapon, I uploaded svgs so that
// you can cut the unit out when they are in default. Idle only happens when they are
// in default and there is no enemy for awhile. So, same technique by just mirroring
// the unit and not the weapon when idle."
//
// Two halves. The CUT (src/data/crew.js, src/crew.js) is checked against the SVGs on
// disk: every shape of the man's own drawing must be a shape of the Default, and the
// extra shapes listed for him must still be what they were chosen as. The RHYTHM
// (idleStep in src/towers.js) is checked on a tower standing alone and then with an
// enemy walked into its ring.
import { readFileSync, existsSync } from 'fs';
import { CREW, GROUND_SHADOW } from '../src/data/crew.js';
import { paths } from '../src/assets.js';
import { families } from '../src/data/towers.js';
import { makeTower, updateTowers, turnedAway } from '../src/towers.js';
import { spawn } from '../src/enemies.js';
import { useLevel, levels } from '../src/level.js';
import { makeGarrison, updateUnits } from '../src/units.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(62)} ${detail}`);
  if (!cond) bad++;
};

const PATH = /<path[^>]*\/>/g;
const attr = (el, name) => (el.match(new RegExp(` ${name}="([^"]+)"`)) || [])[1];

console.log('THE CUT');
// What each extra shape was chosen as: its fill, in painting order.
const EXTRA_FILLS = { artillery_t1: ['#362407', '#969696'] };
for (const [key, c] of Object.entries(CREW)) {
  ok(key in paths, `${key} is a drawing the game loads`);
  ok(existsSync(c.svg) && existsSync(c.man), `${key}: both SVGs are on disk`, `${c.svg}, ${c.man}`);
  if (!existsSync(c.svg) || !existsSync(c.man)) continue;
  const whole = readFileSync(c.svg, 'utf8').match(PATH) || [];
  const own = (readFileSync(c.man, 'utf8').match(PATH) || []).map(el => attr(el, 'd'));
  const ds = new Set(whole.map(el => attr(el, 'd')));
  const found = own.filter(d => ds.has(d)).length;
  const need = own.length - (c.extra || []).length;
  ok(found >= need, `${key}: his shapes are in the Default`, `${found} of ${own.length}`);
  const fills = (c.extra || []).map(i => (attr(whole[i] || '', 'fill') || '').toLowerCase());
  ok(JSON.stringify(fills) === JSON.stringify(EXTRA_FILLS[key] || []), `${key}: what he carries is still at its index`, fills.join(' '));
  const png = c.svg.replace(/\.svg$/, '.png');
  ok(paths[key] === png, `${key}: the SVG is the one beside its PNG`, png);
  ok(whole.some(el => (attr(el, 'fill') || '').toLowerCase() !== GROUND_SHADOW), `${key}: there is a machine left once he is out`);
}

console.log('\nTHE RHYTHM');
useLevel(0);
// A SEEDED COIN, so a quiet minute and a half turns out the same on every run and a
// man who happens to draw "face the post" seven times running cannot fail the check.
let seed = 7;
Math.random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const DT = 1 / 30;
const defOf = sprite => {
  for (const f of families) for (const d of f.tiers) if (d.sprite === sprite) return [f, d];
  return [];
};
const plot = { x: 300, y: 300 };
const state = () => ({ towers: [], enemies: [], shots: [], units: [], corpses: [], bombs: [], impacts: [], smoke: [], gold: 0 });

for (const sprite of ['archery_t1', 'monastery_t4b', 'artillery_t1', 'artillery_t4_base']) {
  const [fam, def] = defOf(sprite);
  const s = state();
  const t = makeTower(plot, fam, def);
  s.towers.push(t);
  const men = def.pair ? def.pair.length : 1;
  let early = false, turned = new Set(), back = 0, apart = 0;
  for (let i = 0; i < 4.5 / DT; i++) { updateTowers(s, DT); for (let k = 0; k < men; k++) early ||= turnedAway(t, k); }
  ok(!early, `${def.name}: faces his post for the first seconds of quiet`);
  for (let i = 0; i < 90 / DT; i++) {
    updateTowers(s, DT);
    for (let k = 0; k < men; k++) {
      if (turnedAway(t, k)) turned.add(k);
      if (k && turnedAway(t, k) !== turnedAway(t, 0)) apart++;
      else if (turned.has(k)) back++;
    }
  }
  ok(turned.size === men, `${def.name}: each man turns away in a quiet minute and a half`, `${turned.size} of ${men}`);
  ok(back > 0, `${def.name}: and turns back again`);
  // THE TWO MONKS ON THEIR OWN: one facing left while the other faces right, at the
  // owner's word, for a fair share of the quiet rather than a moment of it.
  if (men > 1) ok(apart * DT > 10, `${def.name}: the two face opposite ways some of the time`, `${(apart * DT).toFixed(0)}s of 90`);
  // An enemy in the ring: everyone is facing the fight on the very next frame.
  for (let k = 0; k < men; k++) t.idle.men[k].away = true;
  spawn(s, 'light_inf');
  const e = s.enemies[s.enemies.length - 1];
  // Clear of a catapult's minimum range and inside everybody's reach.
  if (e) { e.x = t.x + 160; e.y = t.y + 10; }
  updateTowers(s, DT);
  let any = false;
  for (let k = 0; k < men; k++) any ||= turnedAway(t, k);
  ok(e && !any, `${def.name}: an enemy in range turns him back at once`);
}

console.log('\nMEN WITHOUT A TOWER');
// The owner's word: the crossbowmen, the Pope and the musketeers who stand on the
// board with no tower under them idle too. None has an idle drawing, so it is the
// heading alone: a quiet spell turns each of them the other way now and then.
for (const unit of ['Crossbowman', 'Pope', 'Musketeer']) {
  const li = levels.findIndex(l => (l.garrison || []).some(g => g.unit === unit));
  ok(li >= 0, `a board stands a ${unit} without a tower`, li >= 0 ? levels[li].name : '');
  if (li < 0) continue;
  const level = useLevel(li);
  const s = state();
  makeGarrison(s, level);
  const his = s.units.filter(u => u.def.name === unit);
  let turned = 0, early = false, posed = false;
  for (let i = 0; i < 90 / DT; i++) {
    updateUnits(s, DT);
    for (const u of his) {
      const away = Math.cos(u.face - u.faceIdle) < 0;
      if (i * DT < 4.5) early ||= away;
      if (away) turned++;
      posed ||= u.easy;
    }
  }
  ok(!early, `${level.name}: the ${unit} faces his post for the first seconds of quiet`);
  ok(turned > 0, `${level.name}: and looks the other way now and then`, `${(turned * DT / his.length).toFixed(0)}s of 90 each`);
  ok(!posed, `${level.name}: without a pose he was never drawn in`);
}

console.log(bad ? `\n${bad} FAILED` : '\nall ok');
process.exit(bad ? 1 : 0);
