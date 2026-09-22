// The two things a figure does that the road does not make it do: flinch when it
// is hit, and recover from a swing. Node only.
//
//   node tools/gesture.mjs
//
// WHY THIS IS A CHECKER AND NOT A LOOK. Both are a few pixels, deliberately — a
// flinch that can be seen in a still frame is a stagger, and a swing that can be
// seen frame by frame is a stutter. The whole point of the sizes chosen in
// src/gesture.js is that no single frame shows them, which means no single frame
// can show them missing either. A silent regression here is the default.
//
// THERE WAS A THIRD, an idle breath, and it was removed at the owner's word. Its
// checks went with it rather than being left passing against nothing, which is the
// only honest thing to do with a check whose subject no longer exists.
//
// So what is pinned is the SHAPE of each curve and the WIRING that runs it, both
// of which are exact. Every claim below was made to fail against the code as it
// stood before the feature, which is the only reason any of them is worth reading.
import { readFileSync } from 'fs';
import { swingOut, flinch, struck, tickHit,
         HIT_TIME, HIT_SHOVE, HIT_FLASH } from '../src/gesture.js';
import { enemyTypes } from '../src/data/waves.js';
import { families } from '../src/data/towers.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
  if (!cond) bad++;
};

const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

// WITH THE PROSE TAKEN OUT. Every claim below about what a file DOES is asked of
// its code, and these files are mostly comment by line count — the first version
// of the clock check failed because the note explaining why performance.now() is
// the wrong source contains the words `performance.now()`. A checker that reads
// its own explanation as evidence will pass a file that says the right thing and
// does the wrong one, which is the exact failure it exists to catch.
const code = f => src(f).replace(/^\s*\/\/.*$/gm, '');
const units = code('units.js');
const enemies = code('enemies.js');
const render = code('render.js');
const gesture = code('gesture.js');

// --- the curve -----------------------------------------------------------------

console.log('\nThe shape of a gesture\n');

// IT MUST NOT BE THE IDENTITY, which is what it replaced. `thrust * lunge` was a
// straight line, and a straight line is what this whole file exists to stop being.
{
  const same = [0.25, 0.5, 0.75].every(x => Math.abs(swingOut(x) - x) < 1e-9);
  ok(!same, 'the swing is not a straight line',
    [0.25, 0.5, 0.75].map(x => `${x}->${swingOut(x).toFixed(3)}`).join('  '));

  // AND IT STILL STARTS AND ENDS WHERE IT DID. A curve that changed the endpoints
  // would change how far a man lunges, which is a reach question and not a
  // rendering one — tools/formation.mjs and the tap boxes both read `lunge`.
  ok(Math.abs(swingOut(0)) < 1e-9 && Math.abs(swingOut(1) - 1) < 1e-9,
    '  and reaches exactly as far as it always did',
    `0 -> ${swingOut(0)}, 1 -> ${swingOut(1)}`);

  // HOLD, THEN SETTLE, which is the whole claim. `thrust` falls steadily from 1,
  // so "held out at the start" means the curve is ABOVE the line early, and
  // "settles gently" means it is BELOW it late.
  ok(swingOut(0.75) > 0.79 && swingOut(0.25) < 0.21,
    '  holding out early and setting down late',
    `at 3/4 of the way out ${swingOut(0.75).toFixed(3)}, at 1/4 ${swingOut(0.25).toFixed(3)}`);

  // AND NEVER GOES BACKWARDS, so a swing cannot stutter.
  let rising = true;
  for (let i = 1; i <= 100; i++) if (swingOut(i / 100) <= swingOut((i - 1) / 100)) rising = false;
  ok(rising, '  and moves one way the whole time', 'monotone over 100 samples');
}

// --- the flinch ----------------------------------------------------------------

console.log('\nBeing hit\n');

// AWAY FROM THE BLOW, which is the one thing about it that can be backwards. The
// sign convention is the corpse's — `struckFrom` is +1 when the blow came from the
// right — so a man hit from the right must move LEFT.
{
  const hitFromRight = { x: 100, hp: 10 };
  struck(hitFromRight, 200);
  ok(hitFromRight.struckFrom === 1 && flinch(hitFromRight) < 0,
    'a man hit from the right is shoved left',
    `struckFrom ${hitFromRight.struckFrom}, offset ${flinch(hitFromRight).toFixed(2)}px`);

  const hitFromLeft = { x: 100, hp: 10 };
  struck(hitFromLeft, 20);
  ok(hitFromLeft.struckFrom === -1 && flinch(hitFromLeft) > 0,
    '  and one hit from the left is shoved right',
    `struckFrom ${hitFromLeft.struckFrom}, offset ${flinch(hitFromLeft).toFixed(2)}px`);

  // AND NO FURTHER THAN HE IS MEANT TO GO. A flinch bigger than the lunge that
  // caused it would read as the victim doing the pushing.
  const lunges = families.flatMap(f => f.tiers.map(t => t.soldier && t.soldier.lunge))
    .filter(Boolean);
  ok(HIT_SHOVE < Math.min(...lunges),
    '  by less than the swing that hit him moves the man swinging',
    `${HIT_SHOVE}px against the shortest lunge in the game, ${Math.min(...lunges)}px`);

  // IT ENDS. A reaction that outlasts the gap between blows stops being a reaction
  // and becomes a state — a thug held by three militiamen would simply be lit.
  const gaps = [
    ...Object.values(enemyTypes).map(d => d.atkCd).filter(Boolean),
    ...families.flatMap(f => f.tiers.map(t => t.soldier && t.soldier.cd)).filter(Boolean)
  ];
  ok(HIT_TIME * 3 < Math.min(...gaps),
    '  and is over well before the next blow can land',
    `${HIT_TIME}s against the fastest attack in the game, ${Math.min(...gaps)}s`);

  // COUNTED DOWN TO NOTHING, and clamped there: a negative `hit` would draw a
  // figure at negative alpha and shove him the wrong way.
  const v = { x: 100 };
  struck(v, 200);
  for (let i = 0; i < 60; i++) tickHit(v, 1 / 60);
  ok(v.hit === 0 && flinch(v) === 0, '  then leaves him exactly where he stood',
    `hit ${v.hit}, offset ${flinch(v)}`);

  // THE FLASH KEEPS HIS OUTLINE. A figure washed to white is a figure that
  // vanishes for two frames on a drawing that is mostly outline.
  ok(HIT_FLASH > 0 && HIT_FLASH < 0.8, 'and the flash lifts his colour without erasing him',
    `${HIT_FLASH} of white at the instant of the blow`);
}

// --- the wiring ----------------------------------------------------------------

console.log('\nWhat runs it\n');

// EVERY BLOW GOES THROUGH ONE DOOR. `struckFrom` was set by hand at six damage
// sites, each with its own `>=` to get right, and the flinch would have been a
// seventh chance to get it wrong. Nothing outside gesture.js may write it now
// except the one line that clears it on death.
{
  const raw = [units, enemies, render, code('bombs.js'), code('projectiles.js')]
    .flatMap(f => f.match(/struckFrom = (?!0;)[^\n]*/g) || []);
  ok(raw.length === 0, 'every blow records which side it came from in one place',
    raw.length ? raw.join(' | ') : 'struck() at all six damage sites');

  const calls = [units, enemies, code('bombs.js'), code('projectiles.js')]
    .reduce((n, f) => n + (f.match(/\bstruck\(/g) || []).length, 0);
  ok(calls === 6, '  and there are still six of them', `${calls} call(s) to struck()`);
}

// AND THE CLOCKS ARE THE GAME'S. A flinch ticked on the wall clock would finish
// while the game is paused; a breath on it would go on while everything else is
// frozen, which reads as the renderer having come loose.
{
  ok(/tickHit\(u, dt\)/.test(units) && /tickHit\(e, dt\)/.test(enemies),
    'a flinch fades on the same clock the figure moves on',
    'tickHit beside the thrust decay in both files');
  ok(!/performance\.now\(\)/.test(gesture),
    '  and on no clock of its own that could disagree with it',
    'no performance.now() in gesture.js');
}

// AND THE BREATH LEFT NOTHING BEHIND. It needed three things that nothing else
// wanted — a per-figure phase, a clock this file kept, and `moving` on a soldier —
// and a removal that leaves those in place is the kind that gets half-reverted by
// somebody who finds one of them later and assumes it is load-bearing.
{
  const leftovers = ['breath', 'nextPhase', 'tickClock', 'BREATH_']
    .filter(w => new RegExp(`\\b${w}`).test(gesture + units + enemies + render + code('main.js')));
  ok(leftovers.length === 0, 'and nothing of the breath is still wired up',
    leftovers.length ? leftovers.join(', ') : 'phase, clock and `moving` all gone with it');
}

// THE FLASH IS THE FIGURE. Drawn from a white copy of the same sheet with the same
// source rectangle, inside the same transform — so it cannot be a pixel out,
// whatever pose is up, and a mirrored man's flash is mirrored.
{
  const shots = render.match(/flash\(ctx, frame, [ue], sx, sy, sw, sh, -pivot\[0\] \* dw, -pivot\[1\] \* dh, dw, dh\);/g) || [];
  ok(shots.length === 2, 'the flash is drawn with the figure\'s own numbers',
    `${shots.length} of 2 (the soldier and the creature)`);
  ok(!/getImageData/.test(gesture),
    '  and is baked without reading a pixel, so any sheet can flash',
    'source-atop, no readback, no tainted-canvas case to handle');
}

// AND NOTHING HERE MOVES ANYTHING. Every offset is applied inside a draw
// function's own transform; none of it is written back to x or y, which is what
// keeps the depth sort, the reach, the formation and the tap boxes exact.
{
  const writes = gesture.match(/\b(?:v|fig|u|e)\.(?:x|y) =/g) || [];
  ok(writes.length === 0, 'and none of it moves a figure the rules can see',
    writes.length ? writes.join(' ') : 'no x or y is ever assigned');
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe figures move.');
process.exit(bad ? 1 : 0);
