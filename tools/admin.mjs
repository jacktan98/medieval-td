// The admin dashboard's data model and the star rating, checked headlessly.
// Node only.
//
//   node tools/admin.mjs
//
// Neither of these can be checked by tools/sim.mjs and neither is visible on the
// board. What they do is quietly REWRITE the game's own numbers — the dashboard
// writes health and damage straight onto the defs the fight reads from, and the
// score writes to localStorage — so a bug in either is a bug that changes the
// game while looking like nothing happened.
//
// The two things most worth guarding, and both have already bitten in projects
// shaped like this one:
//
//   An override that EQUALS the shipped value must not be stored. Otherwise a
//   dashboard somebody opened and closed leaves a snapshot behind, and the next
//   time the data files are retuned that snapshot silently wins.
//
//   Reset must reach the DEFS, not just the store. The stats are applied by
//   writing onto shared objects, so forgetting to re-apply after clearing leaves
//   the game running the edits it just told you it had thrown away.
//
// There is no localStorage in Node, and that is deliberately not stubbed: every
// entry point in src/admin.js and src/score.js is written to work without a
// store, because the tools import them through render.js. If this file ever
// throws on a missing store, the game has picked up a hard dependency on the
// browser that the whole tool suite would trip over.

import { enemyTypes, MARCH_ORDER, defaultGap, MODES, tableFor } from '../src/data/waves.js';
import { levels, useLevel } from '../src/level.js';
import { families } from '../src/data/towers.js';
import {
  units, shipped, waveCount, setWaveCount, setUnitStat, touched, reset,
  adminWaves, adminGold, setStartGold, goldStep, goldStepper,
  statStep, countStep, PIN, ADMIN_BTN, mapTabs, waveTabs,
  groupRows, unitRows, unitPages, stepper, keys, PANEL, RESET_BTN, CLOSE_BTN,
  PREV_BTN, NEXT_BTN, TABS, ROW_H, stepperAt, SUMMARY_Y, SUMMARY2_Y, FOOT_Y,
  waveStepper, COUNT_VALUE_W, GAP_VALUE_W, STEP_PAD, setWaveGap, waveGap, gapStep,
  modeTabs, waveCountFor
} from '../src/admin.js';
import { starsFor, starCuts, bestStars, recordStars, clearStars, MAX_STARS } from '../src/score.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
  if (!cond) bad++;
};

// --- what the dashboard can reach ---------------------------------------------

console.log('\nWhat the dashboard can edit\n');

{
  const list = units();
  const tiers = families.reduce((n, f) => n + (f.tiers || []).length, 0);
  const enemies = Object.keys(enemyTypes).length;

  ok(list.length === tiers + enemies, 'every enemy and every tier has a row',
    `${list.length} = ${enemies} enemies + ${tiers} tiers`);
  ok(new Set(list.map(u => u.id)).size === list.length, 'and no two rows share an id');
  ok(list.every(u => typeof u.def.damage === 'number'),
    'and every row points at a live damage number');
  ok(list.filter(u => u.hp).every(u => typeof u.def.hp === 'number'),
    'and every row with health points at a live one');

  // A barracks tier's row must be its SOLDIER, not the building. The building
  // has no hp and no damage at all, so a row pointing at it would edit nothing
  // and read as undefined.
    // Found by the tower it belongs to rather than by a typed id: the id is the
  // tower's name now, since two archery rows are tier 4 and a tier number no
  // longer identifies a row. See units() in src/admin.js.
  const byTier = (famId, tier) => {
    const f = families.find(x => x.id === famId);
    const def = f.tiers.find(d => d.tier === tier);
    return list.find(u => u.name === (def.soldier ? def.soldier.name : def.unit));
  };
  const spear = byTier('barracks', 1);
  ok(spear && spear.def === families.find(f => f.id === 'barracks').tiers[0].soldier,
    'a barracks row edits the man, not the tent', spear && spear.name);

  // And an archery tier's row IS the tier, because the archer's damage is the
  // tower's — he has no stat block of his own.
  const archer = byTier('archery', 1);
  ok(archer && archer.def === families.find(f => f.id === 'archery').tiers[0],
    'an archery row edits the tier itself', archer && archer.name);
  ok(archer && archer.hp === false, 'and offers no health, because nothing can hurt him');
}

console.log('\nAn override is only an override while it differs\n');

{
  const u = units().find(x => x.id === 'enemy/light_inf');
  const base = shipped('enemy/light_inf|hp');

  ok(!touched(), 'nothing is stored to begin with');

  setUnitStat('enemy/light_inf', 'hp', base + 10);
  ok(touched(), 'setting a value stores it');
  ok(u.def.hp === base + 10, 'and it lands on the def the fight reads',
    `${u.def.hp} of ${base + 10}`);

  setUnitStat('enemy/light_inf', 'hp', base);
  ok(!touched(), 'setting it BACK removes the entry rather than storing it');
  ok(u.def.hp === base, 'and the def is the shipped number again', `${u.def.hp}`);
}

console.log('\nReset reaches the defs, not just the store\n');

{
  // Taken from units() rather than typed, for the same reason the two rows above
  // are found by their tower: a row's id is its tower's name now.
  const u = units().find(x => x.of === 'Barracks T2');
  const hp = shipped(`${u.id}|hp`);
  const dmg = shipped(`${u.id}|damage`);

  setUnitStat(u.id, 'hp', hp * 2);
  setUnitStat(u.id, 'damage', dmg + 5);
  setWaveCount('m1', 'normal', 0, 'light_inf', 99);

  ok(u.def.hp === hp * 2 && u.def.damage === dmg + 5 && waveCount('m1', 'normal', 0, 'light_inf') === 99,
    'three edits take',
    `${u.def.hp} / ${u.def.damage} / ${waveCount('m1', 'normal', 0, 'light_inf')}`);

  reset();
  ok(!touched(), 'reset empties the store');
  ok(u.def.hp === hp && u.def.damage === dmg,
    'and puts the DEFS back too', `${u.def.hp} / ${u.def.damage}`);
  ok(waveCount('m1', 'normal', 0, 'light_inf') === shipped('m1|normal|0|light_inf'),
    'and the wave counts with them');
}

console.log('\nLimits\n');

{
  setUnitStat('enemy/light_inf', 'hp', -50);
  ok(units().find(x => x.id === 'enemy/light_inf').def.hp >= 1,
    'health can never reach zero', 'a figure with none never finishes respawning');

  setUnitStat('enemy/light_inf', 'damage', -50);
  ok(units().find(x => x.id === 'enemy/light_inf').def.damage === 0,
    'damage CAN, because a body that only soaks is a thing to try');

  // ZERO IS A REAL SETTING NOW and it is how a type says it is not in this wave —
  // the floor used to be 1, back when a row could only exist for a group the table
  // already had. See setWaveCount.
  setWaveCount('m1', 'normal', 0, 'light_inf', -3);
  ok(waveCount('m1', 'normal', 0, 'light_inf') === 0,
    'a count can be taken to none, which is how a type leaves a wave');
  setWaveCount('m1', 'normal', 0, 'light_inf', 5000);
  ok(waveCount('m1', 'normal', 0, 'light_inf') === 99, 'and never above ninety-nine');
  reset();

  ok(countStep() === 1, 'a count moves by one');
  ok(statStep(1500) === 75 && statStep(3) === 1 && statStep(105) === 5,
    'and a stat by a twentieth, with a floor of one', '1500 -> 75, 105 -> 5, 3 -> 1');
}

console.log('\nThe wave table the game is handed\n');

{
  const lv = levels[0];
  const plain = adminWaves(lv, 'normal');

  ok(plain !== lv.waves, 'adminWaves always returns a COPY');
  ok(plain[0].groups !== lv.waves[0].groups, 'and copies the groups too');
  ok(plain.every((w, i) => w.groups.every((g, j) => g.count === lv.waves[i].groups[j].count)),
    'and matches the level exactly when nothing is overridden');

  setWaveCount(lv.id, 'normal', 2, 'light_inf', 20);
  const edited = adminWaves(lv, 'normal');
  ok(edited[2].groups[0].count === 20, 'an override shows up in it', `${edited[2].groups[0].count}`);
  ok(lv.waves[2].groups[0].count === shipped(`${lv.id}|normal|2|light_inf`),
    'and the LEVEL is untouched underneath it', `${lv.waves[2].groups[0].count}`);
  reset();
}

// --- putting anything in any wave -----------------------------------------------
//
// The dashboard's rows are per ENEMY now rather than per group, so it can place a
// creature into a wave whose shipped table has no group for it at all. That is a
// different thing from changing a count and it needs its own section: the table
// handed to the game is BUILT here rather than copied, and a builder can get the
// order, the rhythm and the emptiness wrong in ways a copy never could.
console.log('\nAnything, in any wave\n');

{
  const lv = levels[0];

  // THE ONE THAT MATTERS MOST: with nothing edited, the builder must hand the
  // game back its own tables, group for group, count for count, gap for gap and
  // IN THE SAME ORDER. Groups spawn one after another, so a builder that emitted
  // the right groups in the wrong order would silently reshape every wave on every
  // map — militia behind giants instead of in front of them — and nothing else in
  // this project would notice.
  let waves = 0, matched = 0;
  for (const l of levels) {
    const built = adminWaves(l, 'normal');
    l.waves.forEach((w, i) => {
      waves++;
      const a = JSON.stringify(w.groups.map(g => [g.type, g.count, g.gap]));
      const b = JSON.stringify(built[i].groups.map(g => [g.type, g.count, g.gap]));
      if (a === b) matched++;
    });
  }
  ok(matched === waves, 'an untouched dashboard rebuilds every shipped wave exactly',
    `${matched} of ${waves} waves on ${levels.length} maps`);

  // AND MARCH_ORDER IS WHY. It has to name every enemy in the game — one the list
  // forgot would be one the dashboard could not place and the builder would drop
  // from a wave that shipped with it.
  ok(MARCH_ORDER.length === Object.keys(enemyTypes).length &&
     MARCH_ORDER.every(t => enemyTypes[t]) &&
     new Set(MARCH_ORDER).size === MARCH_ORDER.length,
    'and every enemy in the game is in the marching order exactly once',
    `${MARCH_ORDER.length} of ${Object.keys(enemyTypes).length}`);

  // A CREATURE THE WAVE NEVER HAD. Wave 1 of map 1 is four militia and nothing
  // else; this is the edit the whole change exists for.
  ok(waveCount(lv.id, 'normal', 0, 'heavy_inf') === 0, 'wave 1 ships with no Giant in it');
  setWaveCount(lv.id, 'normal', 0, 'heavy_inf', 2);
  const withGiant = adminWaves(lv, 'normal')[0];
  const giant = withGiant.groups.find(g => g.type === 'heavy_inf');
  ok(!!giant && giant.count === 2, 'and one can be placed into it', `${giant && giant.count}`);
  ok(giant.gap === defaultGap('heavy_inf'),
    'at the rate that creature is usually sent at', `every ${giant.gap}s`);
  // BEHIND the militia, not in front of them, which is what MARCH_ORDER decides.
  ok(withGiant.groups.map(g => g.type).join() === 'light_inf,heavy_inf',
    'and falls into the queue where the marching order puts it',
    withGiant.groups.map(g => g.type).join(' -> '));

  // AND OUT AGAIN, all the way to an empty wave. groupAt walks groups by
  // cumulative count, so a type at zero must be ABSENT rather than an empty group
  // sitting in the middle of that walk.
  setWaveCount(lv.id, 'normal', 0, 'light_inf', 0);
  const noMilitia = adminWaves(lv, 'normal')[0];
  ok(noMilitia.groups.every(g => g.count > 0),
    'a type at zero leaves no empty group behind',
    noMilitia.groups.map(g => `${g.type} x${g.count}`).join(', '));
  setWaveCount(lv.id, 'normal', 0, 'heavy_inf', 0);
  ok(adminWaves(lv, 'normal')[0].groups.length === 0, 'and a wave can be emptied completely');
  reset();

  // AND HOW FAST THEY COME, which is the third control on a row and the newest.
  const shippedGap = waveGap(lv.id, 'normal', 3, 'light_inf');
  ok(shippedGap === lv.waves[3].groups[0].gap,
    'an untouched rate is the one the table ships', `every ${shippedGap}s`);
  setWaveGap(lv.id, 'normal', 3, 'light_inf', shippedGap + gapStep());
  ok(adminWaves(lv, 'normal')[3].groups[0].gap === +(shippedGap + 0.1).toFixed(1),
    'and an override reaches the wave the game is handed',
    `every ${adminWaves(lv, 'normal')[3].groups[0].gap}s`);
  ok(lv.waves[3].groups[0].gap === shippedGap,
    'while the LEVEL keeps its own underneath', `every ${lv.waves[3].groups[0].gap}s`);
  setWaveGap(lv.id, 'normal', 3, 'light_inf', shippedGap);
  ok(!touched(), 'and stepping it back to the shipped rate clears the edit');

  // A TENTH IS NOT REPRESENTABLE IN BINARY, so ten taps down from 2.0 lands on
  // 0.9999999999999999 unless the setter rounds — which prints as 1.00 and stores
  // as an override that can never equal its shipped value again. This is that
  // rounding, run through the real setter ten times rather than asserted.
  let g = 2.0;
  for (let i = 0; i < 10; i++) { setWaveGap(lv.id, 'normal', 5, 'light_inf', g - gapStep()); g = waveGap(lv.id, 'normal', 5, 'light_inf'); }
  ok(g === 1, 'ten taps down from 2.0 lands exactly on 1', `${g}`);
  reset();

  // AND THE FLOOR IS A TENTH RATHER THAN ZERO. `gap` is what goes on the spawn
  // clock, so 0 puts one enemy on the road every frame — thirty of them in half a
  // second, stacked on one point of the map.
  setWaveGap(lv.id, 'normal', 0, 'light_inf', -5);
  ok(waveGap(lv.id, 'normal', 0, 'light_inf') === 0.1,
    'a rate can never reach zero, which would spawn one a frame',
    `${waveGap(lv.id, 'normal', 0, 'light_inf')}s`);
  setWaveGap(lv.id, 'normal', 0, 'light_inf', 999);
  ok(waveGap(lv.id, 'normal', 0, 'light_inf') === 10, 'and is capped at ten seconds');
  reset();

  // --- AND THE OTHER LENGTH OF THE MAP ------------------------------------------
  //
  // A map has two wave tables — see MODES in data/waves.js — and the panel only
  // ever showed the Normal one. The owner asked for both, and the thing that makes
  // that more than a second tab is that they have to be SEPARATE: with both in
  // front of you, changing wave 3 of the long game must not change wave 3 of the
  // short one.
  //
  // They shared a key before this, because a key was level-plus-wave-plus-type and
  // had no room to say which table. So the first thing checked is the separation,
  // and it is checked in both directions — a Normal edit not reaching Extended is
  // the same bug as the reverse and would pass a one-way test.
  ok(MODES.length === 2 && MODES.map(m => m.id).join() === 'normal,extended',
    'a map has two lengths and both are named', MODES.map(m => m.name).join(' / '));

  const nWaves = waveCountFor(0, 'normal');
  const xWaves = waveCountFor(0, 'extended');
  ok(xWaves === nWaves + 2, 'and the long one is two waves longer',
    `${nWaves} against ${xWaves}`);

  const nBefore = waveCount(lv.id, 'normal', 2, 'light_inf');
  const xBefore = waveCount(lv.id, 'extended', 2, 'light_inf');
  setWaveCount(lv.id, 'extended', 2, 'light_inf', 42);
  ok(waveCount(lv.id, 'extended', 2, 'light_inf') === 42,
    'an Extended edit takes', `${waveCount(lv.id, 'extended', 2, 'light_inf')}`);
  ok(waveCount(lv.id, 'normal', 2, 'light_inf') === nBefore,
    'and does not touch the same wave of the Normal table', `still ${nBefore}`);
  ok(adminWaves(lv, 'extended')[2].groups.some(g => g.type === 'light_inf' && g.count === 42) &&
     adminWaves(lv, 'normal')[2].groups.every(g => g.type !== 'light_inf' || g.count === nBefore),
    'and the two tables the game is handed differ by exactly that',
    `extended 42, normal ${nBefore}`);
  reset();

  setWaveCount(lv.id, 'normal', 2, 'light_inf', 7);
  ok(waveCount(lv.id, 'extended', 2, 'light_inf') === xBefore,
    'and a Normal edit does not reach Extended either', `still ${xBefore}`);
  reset();

  // THE TWO EXTRA WAVES ARE REACHABLE AT ALL, which they were not: the panel's
  // wave row was built from the level's own table, so waves 9 and 10 of an
  // Extended run had no button and no shipped entry.
  const lastWave = xWaves - 1;
  ok(shipped(`${lv.id}|extended|${lastWave}|light_inf`) !== undefined,
    'the last wave of the long game has a shipped entry to compare against',
    `wave ${lastWave + 1}`);
  setWaveCount(lv.id, 'extended', lastWave, 'heavy_inf', 9);
  ok(adminWaves(lv, 'extended')[lastWave].groups.some(g => g.type === 'heavy_inf' && g.count === 9),
    'and can be edited like any other', 'nine giants on the last wave');
  reset();

  // AND AN UNTOUCHED DASHBOARD REBUILDS THE EXTENDED TABLES TOO, on the same
  // terms as the Normal ones above. The Extended table is DERIVED from the shipped
  // Normal one at level-load time, so this is also what says the derivation and
  // the rebuild agree.
  let xw = 0, xm = 0;
  for (const l of levels) {
    const built = adminWaves(l, 'extended');
    tableFor(l, 'extended').forEach((w, i) => {
      xw++;
      const a = JSON.stringify(w.groups.map(g => [g.type, g.count, g.gap]));
      const b = JSON.stringify(built[i].groups.map(g => [g.type, g.count, g.gap]));
      if (a === b) xm++;
    });
  }
  ok(xm === xw, 'and an untouched dashboard rebuilds every Extended wave exactly',
    `${xm} of ${xw} waves on ${levels.length} maps`);

  // THE WAVE ROW FOLLOWS THE LENGTH, and the longest one still fits the panel.
  // Twelve buttons is map 3 at Extended, which is the widest this row will ever be
  // unless a map grows.
  const longest = Math.max(...levels.map((_, i) => waveCountFor(i, 'extended')));
  const tabs = waveTabs(levels.findIndex((_, i) => waveCountFor(i, 'extended') === longest), 'extended');
  ok(tabs.length === longest, 'the wave row has a button per wave of the chosen length',
    `${tabs.length} buttons`);
  ok(tabs[tabs.length - 1].x + tabs[tabs.length - 1].w <= PANEL.x + PANEL.w - 16,
    'and the longest row still fits the panel',
    `ends ${tabs[tabs.length - 1].x + tabs[tabs.length - 1].w}`);

  // AND THE LENGTH BUTTONS SIT CLEAR of the maps on their left and the purse on
  // their right. They were squeezed onto that row by taking 20px off each map tab,
  // so both of those clearances are new and neither is generous.
  const maps = mapTabs();
  const modes = modeTabs();
  ok(modes[0].x > maps[maps.length - 1].x + maps[maps.length - 1].w,
    'the length buttons clear the map tabs',
    `${modes[0].x - (maps[maps.length - 1].x + maps[maps.length - 1].w)}px apart`);
  // The purse's label is right-aligned 14px from its stepper, so where it STARTS
  // is that minus its own width — estimated pessimistically, the way every other
  // text fit in this file is.
  const purse = goldStepper();
  const labelLeft = purse.minus.x - 14 - 'Start gold'.length * 14 * 0.58;
  ok(modes[modes.length - 1].x + modes[modes.length - 1].w < labelLeft,
    'and clear the Start gold label',
    `${Math.round(labelLeft - (modes[modes.length - 1].x + modes[modes.length - 1].w))}px before it`);
  // And the longer of the two labels fits its own button.
  const longestMode = MODES.map(m => m.name).reduce((a, b) => a.length > b.length ? a : b);
  ok(longestMode.length * 14 * 0.58 < modes[0].w - 12,
    'and the longer length name fits its button',
    `"${longestMode}" at ${Math.round(longestMode.length * 14 * 0.58)} of ${modes[0].w - 12}px`);
  // The map names still fit the narrower tab. Estimated the way the row's own
  // labels are, pessimistically — see the note on the enemy names below.
  const longestName = levels.map(l => l.name).reduce((a, b) => a.length > b.length ? a : b);
  ok(longestName.length * 15 * 0.58 < maps[0].w - 12,
    'and the longest map name still fits its narrower tab',
    `"${longestName}" at ${Math.round(longestName.length * 15 * 0.58)} of ${maps[0].w - 12}px`);

  // THE PANEL SHOWS THE WHOLE ROSTER. This is the owner's actual ask, and it is
  // checked against enemyTypes rather than against a number, so a creature drawn
  // tomorrow appears here without this line being touched.
  const rows = groupRows(0, 0);
  ok(rows.length === Object.keys(enemyTypes).length,
    'the waves tab lists every enemy in the game', `${rows.length} rows`);
  ok(rows.map(r => r.type).join() === MARCH_ORDER.join(),
    'in the order they would arrive in');

  // AND THE ROWS FIT. Two columns at a 60px pitch, and the failure mode if the
  // roster outgrows the panel is silent — text drawn past the bottom edge does not
  // throw, it just is not there.
  const last = rows[rows.length - 1];
  ok(last.y + ROW_H <= SUMMARY_Y(), 'the grid clears its own summary line',
    `last row ends ${last.y + ROW_H}, summary at ${SUMMARY_Y()}`);
  // THE LOWER OF THE TWO SUMMARY LINES, not the upper. Checking the first one is
  // what let the second be drawn through the Reset button when the grid grew a
  // fourth row: it passed, because the line it was measuring was 22px higher than
  // the line that overlapped.
  ok(SUMMARY2_Y() < FOOT_Y, 'and both summary lines clear the footer',
    `lower line ${SUMMARY2_Y()} against ${FOOT_Y}`);

  // The two columns must not overlap each other, and the right-hand one must stay
  // on the panel — the same pair of checks the units tab's columns already get.
  const lefts = rows.filter((_, i) => i % 2 === 0);
  const rights = rows.filter((_, i) => i % 2 === 1);
  // TWO STEPPERS PER CELL NOW — how many, and how fast — so there are three gaps
  // to keep open across a row rather than one: count clear of the label, rate
  // clear of count, and the right column clear of the panel edge.
  const count0 = waveStepper(lefts[0].stepX, 0, 'count', COUNT_VALUE_W);
  const gap0 = waveStepper(lefts[0].gapX, 0, 'gap', GAP_VALUE_W);
  ok(count0.plus.x + count0.plus.w <= gap0.minus.x,
    'a row\'s two steppers do not overlap each other',
    `${gap0.minus.x - (count0.plus.x + count0.plus.w)}px apart`);
  ok(gap0.plus.x + gap0.plus.w < rights[0].x,
    'the left column clears the right column\'s label',
    `${rights[0].x - (gap0.plus.x + gap0.plus.w)}px apart`);
  const gap1 = waveStepper(rights[0].gapX, 0, 'gap', GAP_VALUE_W);
  ok(gap1.plus.x + gap1.plus.w <= PANEL.x + PANEL.w - 16,
    'and the right column stays on the panel');
  // AND THE ROWS DO NOT REACH INTO EACH OTHER. The tap box is the drawn button
  // plus STEP_PAD on every side, and the pitch has to clear it — this is the
  // check that a tighter grid would fail, and a tighter grid is exactly what the
  // next creature drawn will ask for.
  ok(count0.minus.h + 2 * STEP_PAD <= ROW_H,
    'and a row\'s tap boxes stay inside its own pitch',
    `${count0.minus.h + 2 * STEP_PAD} tapped, ${ROW_H} pitch`);

  // AND THE TEXT FITS BESIDE THE STEPPER. There is no canvas out here to measure a
  // font with, so this estimates the way tools/book.mjs does and for the same
  // reason — a canvas clips nothing, so a label that overruns is drawn straight
  // through the button next to it and nothing throws.
  //
  // It happened on the first draft of this panel: "not in this wave — would come
  // every 1.60s" ran under the minus button on all four absent rows. A screenshot
  // caught it, which is the wrong thing to be relying on.
  //
  // 0.58em for the 19px bold name and 0.52em for the 13px subtitle, both rounded
  // UP from what system-ui actually sets, because the check is allowed to be
  // pessimistic and is not allowed to pass a row that does not fit.
  const LABEL_W = rows[0].stepX - rows[0].x - 12;
  const widest = (list, em, size) =>
    list.reduce((w, t) => Math.max(w, t.length * size * em), 0);
  const names = MARCH_ORDER.map(t => enemyTypes[t].name);
  // Every subtitle the row can hold: the absent one, and the longest arrival line
  // — the last place in the queue at the slowest rate anything is sent at.
  // The two lines a row can carry under its name. The rate moved out of here when
  // it got a stepper of its own, so what is left is short — but it is still
  // checked, because the next thing added to that line will not be.
  const subs = ['not in this wave', `${MARCH_ORDER.length}th in`];
  ok(widest(names, 0.58, 17) < LABEL_W,
    'the longest enemy name fits its column',
    `${Math.round(widest(names, 0.58, 17))} of ${LABEL_W}px, "${names.reduce((a, b) => a.length > b.length ? a : b)}"`);
  ok(widest(subs, 0.52, 13) < LABEL_W,
    'and so does the longest line under it',
    `${Math.round(widest(subs, 0.52, 13))} of ${LABEL_W}px`);
}

// --- the star rating ------------------------------------------------------------

console.log('\nStars\n');

{
  // The artist's numbers, against a 20-life map: 18 for three, 10 for two.
  ok(starsFor(20, 20) === 3 && starsFor(18, 20) === 3, 'eighteen of twenty is three stars');
  ok(starsFor(17, 20) === 2 && starsFor(10, 20) === 2, 'ten of twenty is two');
  ok(starsFor(9, 20) === 1 && starsFor(1, 20) === 1, 'anything above nothing is one');
  ok(starsFor(0, 20) === 0, 'and none at all is a loss');
  ok(starsFor(-3, 20) === 0, 'including a keep that went past zero');

  const [three, two] = starCuts(20);
  ok(three === 18 && two === 10, 'and the panel prints those same two figures', `${three} / ${two}`);

  // The thresholds are fractions, so they still mean something on a map with a
  // different garrison. Nothing ships with one, which is exactly why this is
  // worth pinning down now rather than discovering later.
  ok(starsFor(9, 10) === 3 && starsFor(5, 10) === 2 && starsFor(4, 10) === 1,
    'and they scale to a map with a different garrison', 'ten lives: 9 / 5 / 4');

  ok(MAX_STARS === 3, 'three is the most there is');
}

console.log('\nThe record\n');

{
  clearStars();
  ok(bestStars('m1', 'normal') === 0, 'nothing is remembered to begin with');

  ok(recordStars('m1', 'normal', 2) === true, 'a first result is a new best');
  ok(recordStars('m1', 'normal', 2) === false, 'matching it is not');
  ok(recordStars('m1', 'normal', 1) === false, 'and neither is a worse run');
  ok(bestStars('m1', 'normal') === 2, 'and the worse run does not take it away', '2');

  ok(recordStars('m1', 'normal', 3) === true, 'a better one does');
  ok(bestStars('m1', 'hard') === 0, 'and Hard is a ladder of its own', 'still 0');
  ok(bestStars('m2', 'normal') === 0, 'as is every other map');
  clearStars();
}

// --- geometry -------------------------------------------------------------------
//
// Same job the layout checks in tools/book.mjs do: input.js hit-tests these very
// rects, so a control drawn off the panel is a control nobody can press.

console.log('\nWhat fits, and what you can hit\n');

{
  const inside = b => b.x >= PANEL.x && b.y >= PANEL.y &&
    b.x + b.w <= PANEL.x + PANEL.w && b.y + b.h <= PANEL.y + PANEL.h;

  const fixed = { CLOSE_BTN, RESET_BTN, PREV_BTN, NEXT_BTN, ...Object.fromEntries(TABS.map(t => [t.id, t])) };
  const outside = Object.entries(fixed).filter(([, b]) => !inside(b)).map(([k]) => k);
  ok(!outside.length, 'every fixed control is on the panel', outside.join(', '));

  const onBoard = b => b.x >= 0 && b.y >= 0 && b.x + b.w <= 960 && b.y + b.h <= 540;
  const keysOff = keys().filter(k => !onBoard(k)).map(k => k.k);
  ok(!keysOff.length, 'every keypad key is on the board', keysOff.join(', '));
  ok(keys().length === 12, 'and there are twelve of them');
  ok(/^\d+$/.test(PIN) && PIN.length === 4, 'the code is four digits', PIN.replace(/./g, '*'));

  ok(onBoard(ADMIN_BTN) && ADMIN_BTN.x > 700 && ADMIN_BTN.y > 400,
    'the door is in the bottom-right corner', `${ADMIN_BTN.x}, ${ADMIN_BTN.y}`);

  // Every map's longest wave row, and every page of the unit list, has to fit
  // between the header and the footer. Map 3 runs ten waves and is what sizes
  // the wave row; the unit list grows every time a family lands.
  let clash = [];
  for (const [i, lv] of levels.entries()) {
    useLevel(i);
    const tabs = waveTabs(i);
    if (tabs.some(t => !inside(t))) clash.push(`${lv.id} wave row`);
    for (let w = 0; w < lv.waves.length; w++) {
      const rows = groupRows(i, w);
      const last = rows[rows.length - 1];
      if (last.y + ROW_H > RESET_BTN.y) clash.push(`${lv.id} wave ${w + 1}`);
    }
  }
  useLevel(0);
  ok(!clash.length, 'every wave of every map fits its page', clash.join(', '));

  const pages = unitPages();
  const overrun = [];
  for (let p = 0; p < pages; p++) {
    const rows = unitRows(p);
    if (!rows.length) overrun.push(`page ${p + 1} is empty`);
    const last = rows[rows.length - 1];
    if (last && last.y + ROW_H > RESET_BTN.y) overrun.push(`page ${p + 1} runs into the footer`);
  }
  ok(!overrun.length, 'and every page of units fits its page', `${pages} pages`);

  // The two stepper columns must not touch, or a tap on "more health" lands on
  // "less damage".
  const s1 = stepper('hp', 100, 'hp');
  const s2 = stepper('damage', 100, 'damage');
  ok(s1.plus.x + s1.plus.w < s2.minus.x, 'the two stat columns keep clear of each other',
    `${s2.minus.x - (s1.plus.x + s1.plus.w)}px apart`);
  ok(s2.plus.x + s2.plus.w <= PANEL.x + PANEL.w, 'and the right-hand one stays on the panel');

  ok(mapTabs().length === levels.length, 'there is a tab per map', `${levels.length}`);

  // THE PURSE SHARES THE MAP ROW, so the one thing that can go wrong there is the
  // one thing this checks: a map tab and the stepper beside it must not touch, or
  // a thumb aiming at the third map lands on "less gold".
  const purse = goldStepper();
  const lastTab = mapTabs()[mapTabs().length - 1];
  ok(lastTab.x + lastTab.w < purse.minus.x, 'and the purse keeps clear of the last of them',
    `${purse.minus.x - (lastTab.x + lastTab.w)}px apart`);
  ok(purse.plus.x + purse.plus.w <= PANEL.x + PANEL.w, 'and stays on the panel');
  ok(purse.minus.y === lastTab.y && purse.minus.h === lastTab.h,
    'and sits on their own line', `y ${purse.minus.y}, ${purse.minus.h} tall`);
}

// --- the starting purse --------------------------------------------------------

console.log('\nThe starting purse\n');

{
  reset();
  const m1 = levels[0];

  ok(adminGold(m1) === m1.startGold, "an untouched map hands out what it shipped with",
    `${adminGold(m1)}`);

  // THE STEP IS PROPORTIONAL, a tenth rounded to tens, and the property that
  // matters is the one a proportional step has: the same number of taps doubles
  // the number wherever you started. That is what makes one control serve both
  // jobs — nudging a shipped 220 by 20 to see what a tighter opening feels like,
  // and running it up to the four figures a Musketeer Post with both abilities
  // costs without sixty taps.
  //
  // Checked at both ends of the range rather than at one, because a fixed step
  // would pass at whichever end it was chosen for.
  const doubling = from => {
    let gold = from, taps = 0;
    while (gold < from * 2 && taps < 200) { gold += goldStep(gold); taps++; }
    return taps;
  };
  const low = doubling(m1.startGold);
  const high = doubling(2000);
  ok(low <= 9 && high <= 9 && Math.abs(low - high) <= 2,
    'and the same handful of taps doubles it wherever it is',
    `${low} taps from ${m1.startGold}, ${high} from 2000`);

  setStartGold(m1.id, 2000);
  ok(adminGold(m1) === 2000, 'an override replaces it', `${adminGold(m1)}`);
  ok(touched(), 'and the panel knows something was changed');

  // Zero is allowed where a wave of nothing and a figure with no health are not:
  // a map you have to earn every coin on is a real thing to try.
  setStartGold(m1.id, -50);
  ok(adminGold(m1) === 0, 'it may be taken to nothing', `${adminGold(m1)}`);
  setStartGold(m1.id, 99999);
  ok(adminGold(m1) === 9990, 'and is capped so the readout stays four digits',
    `${adminGold(m1)}`);

  // AN OVERRIDE THAT EQUALS THE SHIPPED VALUE IS NOT AN OVERRIDE, the same rule
  // the wave counts follow: setting it back removes the entry rather than storing
  // it, so a panel nobody has touched leaves nothing behind.
  setStartGold(m1.id, m1.startGold);
  ok(!touched(), 'setting it back to the shipped figure clears the edit');

  // One map at a time. The key is the level id, so dialling map 1 up must not
  // hand map 2 the same purse.
  setStartGold(m1.id, 1500);
  ok(adminGold(levels[1]) === levels[1].startGold, 'and each map keeps its own',
    `${adminGold(m1)} vs ${adminGold(levels[1])}`);
  reset();
  ok(adminGold(m1) === m1.startGold, 'and Reset puts it back', `${adminGold(m1)}`);
}

console.log(bad
  ? `\n${bad} problem(s) with the dashboard or the score.`
  : '\nThe dashboard and the star record behave.');
process.exit(bad ? 1 : 0);
