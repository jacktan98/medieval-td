// "NEW ENEMY!" — the alert under the gold and the card it opens. See src/newfoe.js.
//
// What has to hold:
//   - every creature has a line for its card;
//   - a creature raises its alert the first time it is on the board, and never
//     again — not later in the same game, and not in the next one;
//   - the memory survives a reload and the dashboard's reset wipes it;
//   - a stored list that has gone bad costs nothing but the memory;
//   - the card closes on its X and on nothing else;
//   - the alerts sit clear of the HUD's buttons.
//
// THIS FILE STUBS localStorage, because the memory is the feature. It is installed
// before the module is imported, since the module reads the store as it loads, and
// a FRESH module per case is taken through a cache-busting query — an ES module is
// evaluated once per specifier.
import { enemyTypes, FOE_NOTES } from '../src/data/waves.js';

let bad = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!ok) bad++;
};

let held = null;
globalThis.localStorage = {
  getItem: () => held,
  setItem: (_, v) => { held = v; },
  removeItem: () => { held = null; }
};

let n = 0;
const fresh = () => import(`../src/newfoe.js?case=${n++}`);
const board = (...ids) => ({ enemies: ids.map(id => ({ def: enemyTypes[id] })), foeAlerts: [], foeCard: null });

console.log('\nThe words\n');

const missing = Object.keys(enemyTypes).filter(id => !FOE_NOTES[id]);
check(!missing.length, 'every creature has a line for its card', missing.join(', ') || `${Object.keys(enemyTypes).length} of them`);
const strays = Object.keys(FOE_NOTES).filter(id => !(id in enemyTypes));
check(!strays.length, 'and no line is for a creature the game does not have', strays.join(', ') || 'none');

console.log('\nOnce, and once only\n');

{
  const m = await fresh();
  const s = board('light_inf', 'light_inf', 'tough_inf');
  m.noticeFoes(s);
  check(s.foeAlerts.join() === 'light_inf,tough_inf', 'two kinds on the board raise two alerts, oldest first', s.foeAlerts.join(', '));
  m.noticeFoes(s);
  check(s.foeAlerts.length === 2, 'and noticing again raises nothing', `${s.foeAlerts.length} alerts`);

  const next = board('light_inf', 'archer_inf');
  m.noticeFoes(next);
  check(next.foeAlerts.join() === 'archer_inf', 'the next game alerts only for the one not yet met', next.foeAlerts.join(', '));
}

{
  const m = await fresh();
  check(m.hasMet('light_inf') && m.hasMet('archer_inf') && !m.hasMet('crow'),
    'the memory survives a reload', held);
  const s = board('light_inf', 'tough_inf', 'archer_inf');
  m.noticeFoes(s);
  check(!s.foeAlerts.length, 'and nobody met before is announced after it', `${s.foeAlerts.length} alerts`);

  m.forgetFoes();
  m.noticeFoes(s);
  check(s.foeAlerts.length === 3, 'the dashboard\'s reset makes every creature new again', s.foeAlerts.join(', '));
}

console.log('\nA store that has gone bad\n');

for (const [label, blob] of [
  ['not JSON at all', '{oops'],
  ['not a list', '"light_inf"'],
  ['a creature the game no longer has', '["ghost_inf"]']
]) {
  held = blob;
  let m, ok = true;
  try { m = await fresh(); } catch { ok = false; }
  const s = board('light_inf');
  if (ok) m.noticeFoes(s);
  check(ok && s.foeAlerts.join() === 'light_inf', `${label}: forgotten, not fatal`, ok ? s.foeAlerts.join(', ') : 'threw');
}

console.log('\nThe card\n');

{
  const m = await fresh();
  const s = board();
  s.foeAlerts = ['plague_inf', 'crow'];
  s.menu = { open: true };
  m.openFoeCard(s, 1);
  check(s.foeCard === 'crow' && s.foeAlerts.join() === 'plague_inf', 'opening an alert takes it down and opens its card',
    `${s.foeCard}, left ${s.foeAlerts.join(', ')}`);
  check(s.menu === null, 'and closes a build menu left open under it');

  const c = m.FOE_CARD, x = m.FOE_CLOSE;
  const hits = [[c.x + 40, c.y + 40], [480, 270], [10, 10], [c.x + c.w - 4, c.y + c.h - 4]]
    .filter(([px, py]) => m.tapFoeCard(s, px, py));
  check(!hits.length && s.foeCard === 'crow', 'a tap anywhere but the X leaves it open', `${hits.length} closed it`);
  check(m.tapFoeCard(s, x.x + x.w / 2, x.y + x.h / 2) && s.foeCard === null, 'and the X closes it');

  const inside = r => r.x >= c.x && r.y >= c.y && r.x + r.w <= c.x + c.w && r.y + r.h <= c.y + c.h;
  check(inside(x) && inside(m.FOE_PICTURE), 'the X and the picture are on the card');
  check(c.x >= 0 && c.y >= 0 && c.x + c.w <= 960 && c.y + c.h <= 540, 'and the card is on the board');
}

console.log('\nUnder the gold\n');

{
  const m = await fresh();
  const { HUD_BTN } = await import('../src/render.js');
  const left = Math.min(...Object.values(HUD_BTN).map(b => b.x));
  const rects = [0, 1, 2, 3].map(m.alertRect);
  check(rects.every(r => r.x + r.w + 6 < left), 'four alerts stacked stay clear of the HUD buttons',
    `right edge ${Math.max(...rects.map(r => r.x + r.w))} against ${left}`);
  check(rects[0].y >= 32, 'and start under the readout bars', `top ${rects[0].y}`);
  check(rects.every((r, i) => !i || r.y >= rects[i - 1].y + rects[i - 1].h), 'and do not overlap one another');

  const s = board();
  s.foeAlerts = ['crow', 'bomb_inf'];
  const r = m.alertRect(1);
  check(m.hitAlert(s, r.x + 10, r.y + r.h / 2) === 1, 'a tap on the second alert finds the second');
  check(m.hitAlert(s, 600, 300) === -1, 'and a tap on the board finds none');
}

console.log(bad ? `\n${bad} failed.` : '\nThe new-enemy alerts behave.');
process.exit(bad ? 1 : 0);
