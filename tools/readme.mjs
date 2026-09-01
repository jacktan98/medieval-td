// Checks that every asset folder's README still describes what is in it.
// Node only — never loaded by the game.
//
//   node tools/readme.mjs
//
// WHY THIS EXISTS. The READMEs in assets/ are the only instructions the artist
// has. They say what a file is called, what size to draw it, where it goes and
// what breaks if it is wrong — and none of that is checked by anything the way a
// trim or a shadow anchor is. So they rot quietly: a folder gains eight files
// over a month and its README still describes the six it had, and the first
// person to find out is whoever uploads the ninth against instructions that no
// longer match.
//
// It had rotted badly by the time this was written. assets/abilities/README.md
// described its fourteen icons and named none of them, because they were named
// in assets/ui/README.md where they used to live; assets/ui/README.md still
// listed all eight of the ones that had moved, plus two that had been renamed;
// assets/units/README.md was missing fourteen figures, among them every man of
// the artillery family; and assets/projectiles had no README at all.
//
// WHAT IT ASKS, and it is deliberately the narrowest question that catches that:
//
//   every file the GAME LOADS is named by the README of the folder it is in
//   no README names a file that is not there
//
// It is the game's own list rather than the folder's — src/assets.js and the
// audio CLIPS table — because that is the list that matters. A .svg the artist
// keeps beside a .png is a working file, not something the game or the next
// upload needs told about, and requiring one to be documented would make this
// noisy enough to ignore, which is the way a check dies.
//
// A NAME COUNTS AS NAMED wherever it appears in the text, in backticks or not,
// with or without its extension. The READMEs use a shorthand for pairs — a row
// reading `Blood_1.png`, `_2.png` — and a check that could not read that would
// be asking the prose to be written for the checker rather than for the artist.

import { readdirSync, readFileSync, existsSync } from 'fs';
import { paths } from '../src/assets.js';
import { CLIPS } from '../src/audio.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
  if (!cond) bad++;
};

// Every file the game asks for, grouped by the folder it lives in. `paths` is
// the sprite table and CLIPS is the sound one; both map a key to a path.
const wanted = new Map();
const add = (file) => {
  const dir = file.slice(0, file.lastIndexOf('/'));
  const top = dir.split('/').slice(0, 2).join('/');   // assets/<folder>
  if (!wanted.has(top)) wanted.set(top, new Set());
  wanted.get(top).add(file.slice(file.lastIndexOf('/') + 1));
};
for (const p of Object.values(paths)) add(p);
for (const c of Object.values(CLIPS)) add(c);

// The folders that have a README, and the ones that should.
const folders = readdirSync('assets', { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => `assets/${e.name}`).sort();

console.log('\nEvery folder the game loads from has a README\n');
for (const f of folders) {
  if (!wanted.has(f) && !existsSync(`${f}/README.md`)) continue;   // e.g. a bare source folder
  ok(existsSync(`${f}/README.md`), `${f}/README.md`,
    wanted.has(f) ? `${wanted.get(f).size} file(s) loaded from it` : 'no files loaded from it');
}

console.log('\nEvery file the game loads is described where it lives\n');
for (const [dir, files] of [...wanted].sort()) {
  const rm = `${dir}/README.md`;
  if (!existsSync(rm)) continue;                       // reported above
  const text = readFileSync(rm, 'utf8');
  // A RANGE COUNTS AS NAMING EVERY FILE IN IT. The voice folder holds ten runs of
  // three or five takes of one line, and a README that spelled all forty-two out
  // would be a wall nobody reads — `Archery_1.mp3 .. Archery_5.mp3` is how a
  // person wants that written, so it is what this understands.
  const spelled = new Set();
  for (const m of text.matchAll(/([A-Za-z_]+?)_(\d+)(\.\w+)?\s*\.\.\s*\1_(\d+)(\.\w+)?/g)) {
    for (let i = +m[2]; i <= +m[4]; i++) spelled.add(`${m[1]}_${i}`);
  }
  const named = n => {
    const bare = n.replace(/\.[a-z0-9]+$/i, '');
    return text.includes(n) || text.includes(bare) || spelled.has(bare);
  };
  const missing = [...files].filter(n => !named(n)).sort();
  ok(missing.length === 0, dir,
    missing.length ? `${missing.length} not named: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ' …' : ''}`
                   : `all ${files.size} named`);
}

// ANYWHERE UNDER assets/, not only in the folder doing the naming. A README
// pointing at a sibling's file is good documentation rather than a mistake —
// assets/abilities explains that the temple's two aura BADGES stay in assets/ui
// and names them, which is exactly what somebody looking for them needs. What is
// worth failing on is a name that has no file at all, which is what
// `Sell_Icon.png` and `Cost_Icon.png` had become.
const everywhere = new Set();
{
  const walk = p => { for (const e of readdirSync(p, { withFileTypes: true }))
    e.isDirectory() ? walk(`${p}/${e.name}`) : everywhere.add(e.name); };
  walk('assets');
}

console.log('\nAnd no README names a file that is not there\n');
for (const f of folders) {
  const rm = `${f}/README.md`;
  if (!existsSync(rm)) continue;
  const text = readFileSync(rm, 'utf8');
  const disk = everywhere;
  // Backticked full filenames only. The `_2.png` shorthand and the `Map_N.svg`
  // placeholders are not filenames, so a leading underscore or a capital N in
  // place of a digit is skipped rather than reported.
  // A backticked name, with or without the folder in front of it — assets/towers
  // writes `artillery/Ballista_Turret_Fire.png` because its files are in
  // subfolders, and a pattern that stopped at the slash left every one of those
  // unchecked. That is how three `_Far_Shot` rows survived the ability being
  // renamed to Reinforced Tension.
  const named = [...text.matchAll(/`(?:[A-Za-z0-9_\-]+\/)?([A-Za-z][A-Za-z0-9_.\-]*\.(?:png|svg|mp3))`/g)]
    .map(m => m[1]);
  const ghosts = [...new Set(named)].filter(n => !disk.has(n) && !/_N[._]/.test(n)).sort();
  ok(ghosts.length === 0, f,
    ghosts.length ? `${ghosts.length} named but gone: ${ghosts.slice(0, 6).join(', ')}${ghosts.length > 6 ? ' …' : ''}`
                  : `${named.length} name(s), all present`);
}

// THE ROOT README IS THE ONE A STRANGER READS FIRST, and it was a single line —
// the repository name and nothing else — for the whole life of the project. It
// is not held to a word count here; it is held to naming the things somebody
// arriving has to find, because a front page that does not point at the tools is
// a front page that sends people to read 18,000 lines of source instead.
console.log('\nThe front page points at the things a stranger needs\n');
{
  const root = existsSync('README.md') ? readFileSync('README.md', 'utf8') : '';
  const musts = [
    ['index.html', 'says how to run it'],
    ['tools/', 'points at the checkers'],
    ['src/', 'points at the source'],
    ['assets/', 'points at the artwork']
  ];
  for (const [needle, what] of musts) ok(root.includes(needle), what, needle);
  ok(root.split('\n').length > 20, 'and is more than a title', `${root.split('\n').length} lines`);
}

console.log(bad
  ? `\n${bad} README(s) no longer describe what is beside them.`
  : '\nEvery README describes the folder it is in.');
process.exit(bad ? 1 : 0);
