// THE ACHIEVEMENTS: that their numbers are the game's, that their words follow the
// house style, and that each one counts what it says. See src/data/achievements.js
// and src/achievements.js.
//
// What has to hold:
//   - 20 achievements, 4 to a row, each with its own id and name;
//   - every goal is the game's own count — the stages, the upgrade rungs, the
//     pictures in the encyclopedia, the enemies off the road, the tier 4 towers;
//   - digits for numbers and no contractions;
//   - nothing counts until the game turns counting on (the replay viewer never does);
//   - a count is earned at its goal, a set when it is whole, and Hard brings Normal;
//   - a Heavy Bolt, a Crossbow Sentry's quarrel and a monk's slowing blast are each
//     counted where they happen, and the hooks for the rest are in place.
import { readFileSync, existsSync } from 'node:fs';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import * as A from '../src/achievements.js';
import { PER_ROW, achBox, achAt, tapAchievements, openAchievements, ACH_DONE, ACHIEVE_BTN, hitAchievementsButton }
  from '../src/achievepage.js';
import { UPGRADES_BTN } from '../src/upgradepage.js';
import { BOOK_ICON_HIT } from '../src/book.js';
import { pageItems, PAGES } from '../src/book.js';
import { UPGRADES, UPGRADE_FAMILIES } from '../src/data/upgrades.js';
import { STAGES } from '../src/data/overview.js';
import { levels } from '../src/level.js';
import { setStars, clearStars } from '../src/score.js';
import { paths as ASSET_URLS } from '../src/assets.js';
import { updateTowers } from '../src/towers.js';
import { countKill } from '../src/enemies.js';
import { updateShots } from '../src/projectiles.js';
import { archery, siege, monastery } from '../src/data/towers.js';
import { useMathRandom } from '../src/rng.js';
useMathRandom();

let bad = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(64)} ${detail}`);
  if (!ok) bad++;
};
const goal = id => A.byId(id).goal;

console.log('\nThe list\n');
check(ACHIEVEMENTS.length === 20, '20 achievements', String(ACHIEVEMENTS.length));
check(PER_ROW === 4 && ACHIEVEMENTS.length / PER_ROW === 5, '4 to a row, 5 rows');
check(new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length, 'every id is its own');
check(new Set(ACHIEVEMENTS.map(a => a.name)).size === ACHIEVEMENTS.length, 'every name is its own');

console.log('\nThe goals are the game\'s numbers\n');
const rungs = UPGRADE_FAMILIES.reduce((n, f) => n + UPGRADES[f].length, 0);
const pictures = Array.from({ length: PAGES }, (_, p) => pageItems(p).length).reduce((a, b) => a + b, 0);
const off = Object.values(A.OFFROAD).reduce((n, l) => n + l.length, 0);
check(goal('normal') === STAGES.length && goal('hard') === STAGES.length, 'Normal and Hard: every stage', String(STAGES.length));
check(goal('upgrades') === rungs, 'Master Smith: every upgrade rung', String(rungs));
check(goal('book') === pictures, 'Patron of the Arts: every picture in the encyclopedia', String(pictures));
check(goal('offroad') === off, 'No Stone Unturned: every enemy off the road', String(off));
check(goal('tier4') === A.TIER4.length && A.TIER4.length === 8, 'Grand Arsenal: all 8 tier 4 towers', A.TIER4.join(', '));
for (const id of ['winchester', 'dawnford', 'ironforge', 'hollow']) check(goal(id) === 3, `${A.byId(id).name}: 3 stages`);
// The enemies off the road, on stages 14, 15 and 16, each a villager the board has.
const ids = Object.keys(A.OFFROAD);
check(ids.join() === [14, 15, 16].map(n => levels[STAGES[n - 1].level].id).join(), 'off the road: stages 14, 15 and 16', ids.join(', '));
for (const id of ids) {
  const lv = levels.find(l => l.id === id);
  check(A.OFFROAD[id].every(n => n >= 0 && n < lv.villagers.length), `${lv.name}: each one is a villager on the board`);
}
// Words named in the text match the numbers.
check(A.byId('tier4').text.includes(String(A.TIER4.length)), 'Grand Arsenal says how many');

console.log('\nThe words\n');
// Not "one", which is as often a word as a number: "in one stage".
const NUMBER_WORDS = /\b(two|three|four|five|six|seven|eight|nine|ten|twenty|hundred|thousand)\b/i;
for (const a of ACHIEVEMENTS) {
  const all = `${a.name} ${a.text}`;
  if (/n't|'re|'ll|'ve|'d\b|'m\b/.test(all)) check(false, `${a.name}: no contractions`, all);
  if (NUMBER_WORDS.test(a.text)) check(false, `${a.name}: digits for numbers`, a.text);
  if (a.goal >= 1000 && !a.text.includes(a.goal.toLocaleString('en-US'))) check(false, `${a.name}: says ${a.goal.toLocaleString('en-US')}`, a.text);
  if (a.icon) check(!!ASSET_URLS[a.icon] && existsSync(ASSET_URLS[a.icon]), `${a.name}: its icon is a file`, a.icon);
}
check(true, 'every text checked for digits and contractions');
check(!!ASSET_URLS.icon_achievements && existsSync(ASSET_URLS.icon_achievements), 'the trophy on the map is a file');

console.log('\nThe screen and its door\n');
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
check(!overlap(ACHIEVE_BTN, UPGRADES_BTN) && !overlap(ACHIEVE_BTN, BOOK_ICON_HIT), 'the trophy\'s tap box is clear of the hammer and the book');
check(ACHIEVE_BTN.x + ACHIEVE_BTN.w <= UPGRADES_BTN.x, 'and stands left of the hammer');
check(hitAchievementsButton(ACHIEVE_BTN.x + 5, ACHIEVE_BTN.y + 5), 'the trophy answers a tap');
check(ACHIEVEMENTS.every((_, i) => achAt(achBox(i).cx, achBox(i).cy) === i), 'every button answers a tap on itself');
{
  const st = {};
  openAchievements(st);
  tapAchievements(st, achBox(13).cx, achBox(13).cy);
  check(st.achPick === 13, 'a tap picks the one it lands on');
  tapAchievements(st, ACH_DONE.x + 5, ACH_DONE.y + 5);
  check(st.achievements === false, 'Done closes the screen');
}

console.log('\nCounting\n');
A.clearAchievements();
A.countAchievements(false);
A.note('villagers', 500);
check(!A.earned('villagers') && A.progressOf('villagers')[0] === 0, 'nothing counts until the game says so (a replay never does)');
A.countAchievements(true);
A.noteVillagerTap('m16', { n: 0, voice: 'enemy_villager' });
A.noteVillagerTap('m18', { n: 4, voice: 'perched_crow' });
check(A.progressOf('villagers')[0] === 0, 'a thug or a crow tapped is not a villager for Friend of the People');
A.noteVillagerTap('m1', { n: 0, voice: null });
check(A.progressOf('villagers')[0] === 1, 'a villager tapped is');
A.clearAchievements();
A.note('villagers', 99);
check(!A.earned('villagers') && A.progressOf('villagers')[0] === 99, '99 of 100 is not earned', String(A.progressOf('villagers')));
A.note('villagers');
check(A.earned('villagers') && A.toasts.some(t => t.id === 'villagers'), 'the 100th earns it, and it pops up');
A.note('villagers', 50);
check(A.progressOf('villagers')[0] === 100, 'and the count stops at its goal');

A.noteVillagerTap('m0', { n: 0, voice: null });
A.noteVillagerTap('m18', { n: 4, voice: 'perched_crow' });
A.noteVillagerTap('m18', { n: 4, voice: 'perched_crow' });
check(A.progressOf('offroad')[0] === 1, 'an enemy off the road counts once, however often tapped');
for (const [id, list] of Object.entries(A.OFFROAD)) for (const n of list) A.noteVillagerTap(id, { n, voice: 'enemy_villager' });
check(A.earned('offroad'), 'all of them earns No Stone Unturned');

{
  const st = {};
  for (const name of A.TIER4.slice(0, 7)) A.noteTier4(st, { name });
  A.noteTier4(st, { name: A.TIER4[0] });
  A.noteTier4(st, { name: 'Watchtower' });
  check(!A.earned('tier4') && A.progressOf('tier4')[0] === 7, '7 different tier 4 towers is not enough', String(A.progressOf('tier4')));
  A.noteTier4({}, { name: A.TIER4[7] });
  check(!A.earned('tier4'), 'the 8th on another stage does not count');
  A.noteTier4(st, { name: A.TIER4[7] });
  check(A.earned('tier4'), 'all 8 in one stage earns Grand Arsenal');
}

for (let p = 0; p < PAGES; p++) pageItems(p).forEach((_, i) => { A.noteBookPicture(p, i); A.noteBookPicture(p, i); });
check(A.earned('book'), 'every picture opened earns Patron of the Arts');

clearStars();
const lid = n => levels[STAGES[n - 1].level].id;
setStars(lid(1), 'normal', 2);
A.checkRecords();
check(!A.earned('tutorial'), 'the tutorial on 2 stars is not Fast Learner');
setStars(lid(1), 'hard', 3);
A.checkRecords();
check(A.earned('tutorial'), '3 stars on the tutorial, on either setting, is');
for (const n of [3, 4]) setStars(lid(n), 'normal', 3);
A.checkRecords();
check(!A.earned('winchester') && A.progressOf('winchester')[0] === 2, '2 of Winchester\'s 3 is not Shield of Winchester');
setStars(lid(5), 'hard', 3);
A.checkRecords();
check(A.earned('winchester'), 'all 3, on any setting, is');
for (let n = 1; n <= STAGES.length; n++) setStars(lid(n), 'hard', 3);
A.checkRecords();
check(A.earned('hard') && A.earned('normal'), 'every stage on Hard earns Legend of the Realm, and Seasoned General with it');
check(A.earned('dawnford') && A.earned('ironforge') && A.earned('hollow'), 'and every region');
clearStars();

A.clearAchievements();
check(A.earnedCount() === 0 && A.progressOf('villagers')[0] === 0 && A.toasts.length === 0, 'the dashboard\'s reset forgets them all');
{
  A.countAchievements(true);
  A.toasts.length = 0;
  setStars(lid(1), 'normal', 3);
  A.checkRecords({ quiet: true });
  check(A.earned('tutorial') && A.toasts.length === 0, 'what the save already shows is given quietly as the game loads');
  clearStars();
  A.clearAchievements();
}

console.log('\nCounted where it happens\n');
const plot = { x: 300, y: 300 };
const tower = (famId, def, abilities = []) => ({
  plot, fam: { id: famId }, def, x: plot.x, y: plot.y,
  aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0, aimMode: 0, spent: def.cost, rally: null,
  abilities, shots: 0, special: null, burst: 0, burstT: 0, hit: [], locked: null, hold: 0
});
const dummy = (t, away, hp = 1e9) => ({
  def: { r: 10, hp, speed: 0, atkCd: 1, damage: 0 },
  x: t.x + away, y: t.y, hp, maxHp: hp, route: 0, lane: 1, s: 300,
  foe: null, acd: 1, thrust: 0, halted: false, leaked: false
});
function battle(t, seconds, enemies) {
  const state = { towers: [t], enemies, units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  for (let i = 0; i < seconds * 60; i++) { updateTowers(state, 1 / 60); updateShots(state, 1 / 60); }
  return state;
}
{
  // Heavy Hitter: a man brought down by a Heavy Bolt, or by the fire it left, counts;
  // one brought down by a plain bolt does not.
  const def = siege.find(d => d.name === 'Ballista Turret');
  const marks = new Set();
  const man = dummy({ x: 300, y: 300 }, 150);
  const st = { towers: [tower('siege', def, ['heavybolt'])], enemies: [man], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  for (let i = 0; i < 30 * 60; i++) { updateTowers(st, 1 / 60); updateShots(st, 1 / 60); marks.add(`${man.killedBy}/${man.killedWith}`); }
  check(marks.has('bolt/heavybolt') && marks.has('bolt/null'), 'a Heavy Bolt marks its man as its own, and a plain bolt does not', [...marks].join(' '));
  A.clearAchievements();
  countKill({ killedBy: 'bolt', killedWith: 'heavybolt' });
  countKill({ killedBy: 'bolt', killedWith: null });
  countKill({ killedBy: 'melee', killedWith: 'heavybolt' });
  check(A.progressOf('heavykill')[0] === 1, 'only the Heavy Bolt\'s kill counts for Heavy Hitter', String(A.progressOf('heavykill')[0]));
  countKill({ killedBy: 'knife' });
  countKill({ killedBy: 'deadeye' });
  check(A.progressOf('knife')[0] === 1 && A.progressOf('deadeye')[0] === 1, 'a Knife Throw kill and a Deadeye kill count for theirs');
}
{
  const def = archery.find(d => d.name === 'Crossbow Sentry');
  A.clearAchievements();
  const st = battle(tower('archery', def), 10, [dummy({ x: 300, y: 300 }, 120)]);
  const n = A.progressOf('quarrels')[0];
  check(n > 0, 'a Crossbow Sentry\'s quarrels count their damage', String(n));
  A.clearAchievements();
  battle(tower('archery', def), 10, [dummy({ x: 300, y: 300 }, 120, 30)]);
  const m = A.progressOf('quarrels')[0];
  check(m === 30, 'no more than the man had left', String(m));
  void st;
}
{
  const def = monastery.find(d => d.name === 'Judgment Temple');
  A.clearAchievements();
  battle(tower('monastery', def, ['pulse']), 10, [dummy({ x: 300, y: 300 }, 100), dummy({ x: 300, y: 300 }, 110)]);
  const n = A.progressOf('monks')[0];
  check(n >= 1 && n <= 2, 'a monk\'s slowing blast counts each enemy once', String(n));
}
A.clearAchievements();
A.countAchievements(false);

// The rest are counted inside the battle's own loops; the hooks are checked by eye
// in their files and named here so a refactor that drops one is caught.
const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const hooks = [
  ['enemies.js', /st\.id === 'burnt' && st\.by === 'cannonball'/, 'Fiery Shot\'s burn damage'],
  ['enemies.js', /countKill\(e\);/, 'Knife Throw, Deadeye and Heavy Bolt kills'],
  ['units.js', /note\('holylight'\)/, 'a Holy Light finished'],
  ['input.js', /noteVillagerTap\(level\.id/, 'a villager tapped'],
  ['input.js', /noteTier4\(state, next\)/, 'a tier 4 tower built'],
  ['input.js', /t\.abilities\.includes\('fortitude'\)\) note\('blessing'\)/, 'a pope given both Holy Wrath and Divine Fortitude'],
  ['book.js', /noteBookPicture\(/, 'a picture opened'],
  ['upgradepage.js', /checkRecords\(\)/, 'an upgrade bought'],
  ['main.js', /countAchievements\(true\)/, 'counting on in the game'],
  ['main.js', /if \(!REPLAY\) \{\n  countAchievements/, 'and not in a replay'],
  ['admin.js', /clearAchievements\(\)/, 'the campaign reset'],
];
for (const [f, re, what] of hooks) check(re.test(src(f)), `hooked: ${what}`, f);

console.log(bad ? `\n${bad} FAILED\n` : '\nAll achievement checks pass.\n');
process.exit(bad ? 1 : 0);
