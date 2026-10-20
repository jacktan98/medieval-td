// The itch.io build: a zip of exactly what the game loads, ready to upload.
// Node only — never loaded by the game.
//
//   node tools/itch.mjs
//
// Writes dist/itch/ (the files, to look at or serve) and dist/medieval-td-itch-<id>.zip
// (the upload). dist/ is not committed.
//
// WHAT GOES IN is the game's own list, not the folder: index.html, every module under
// src/, and every file src/assets.js and the audio CLIPS table ask for, plus the font,
// the two icons index.html names, the font's licence and the credits. Not the tools,
// the test pages, stats.html, the READMEs or the artist's working files.
//
// WHAT CHANGES on the way in, all of it in index.html and none of it in src/:
//
//   EACH FILE GETS ITS OWN VERSION — the first 10 hex of its SHA-1, in window.__hashes.
//     The owner's copy versions everything by the minute, which suits a page being
//     edited (a reload always shows the latest) but would make every player download
//     the whole game again on every visit. With a fingerprint per file, a new release
//     re-downloads only the files that changed and the browser keeps the rest.
//
//   NO ADMIN DASHBOARD — window.__public, which src/admin.js reads (ADMIN_ON): the
//     door is neither drawn nor answered, so no player meets the unlock codes. The
//     owner tests with the full dashboard on the repo's own copy.
//
// THE CRAZYGAMES BUILD, the same game with three differences, at their rules:
//
//   node tools/itch.mjs --crazygames      (writes dist/crazygames/ and its zip)
//
//   NO FULL SCREEN BUTTON — CrazyGames gives every game its own, and forbids one in the
//     game. window.__portal = 'crazygames', which src/settings.js reads.
//   SMALLER SOUND — without their SDK the whole game counts against 50 MB, and the
//     sound is two thirds of it. Every MP3 is made again in this copy only: the music
//     at 96 kb/s, everything else at 64 kb/s in mono. The repo keeps the owner's files.
//     Needs ffmpeg (FFMPEG=/path/to/ffmpeg if it is not on the PATH).
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { paths } from '../src/assets.js';
import { CLIPS } from '../src/audio.js';

const CRAZY = process.argv.includes('--crazygames');
const OUT = CRAZY ? 'dist/crazygames' : 'dist/itch';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const files = new Set(['assets/fonts/Lobster-Regular.woff2', 'assets/ui/Favicon.png', 'assets/ui/Apple_Touch_Icon.png']);
for (const p of Object.values(paths)) files.add(p);
for (const p of Object.values(CLIPS)) files.add(p);
for (const f of readdirSync('src', { recursive: true })) if (f.endsWith('.js')) files.add(join('src', f));

// Everything index.html's import map names must be shipped — and nothing it ships may be missing.
const page = readFileSync('index.html', 'utf8');
const mods = page.match(/var mods = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map(s => `src/${s.slice(1, -1)}.js`);
for (const m of mods) if (!files.has(m)) throw new Error(`index.html imports ${m}, which is not under src/`);

rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  mkdirSync(join(OUT, dirname(f)), { recursive: true });
  readFileSync(f);                       // throws if the game asks for a file that is not there
  if (CRAZY && f.endsWith('.mp3')) {
    const music = f.startsWith('assets/audio/music/');
    execSync(`"${FFMPEG}" -loglevel error -y -i "${f}" -map_metadata -1 -codec:a libmp3lame ${music ? '-b:a 96k' : '-b:a 64k -ac 1'} "${join(OUT, f)}"`);
    // Never bigger than it came.
    if (statSync(join(OUT, f)).size >= statSync(f).size) copyFileSync(f, join(OUT, f));
  } else copyFileSync(f, join(OUT, f));
}

// Each file's version, from what is shipped.
const hashes = {};
let bytes = 0;
for (const f of [...files].sort()) {
  const data = readFileSync(join(OUT, f));
  hashes[f] = createHash('sha1').update(data).digest('hex').slice(0, 10);
  bytes += data.length;
}
const id = createHash('sha1').update(JSON.stringify(hashes)).digest('hex').slice(0, 8);

if (!page.includes('//@@BUILD@@')) throw new Error('index.html has lost its //@@BUILD@@ line');
const built = page.replace('//@@BUILD@@',
  `stamp = '${id}'; window.__public = true;${CRAZY ? " window.__portal = 'crazygames';" : ''} window.__hashes = ${JSON.stringify(hashes)};`);
writeFileSync(join(OUT, 'index.html'), built);

// THE FONT'S LICENCE travels with the font, as the SIL Open Font License asks.
writeFileSync(join(OUT, 'assets/fonts/OFL.txt'), readFileSync('tools/itch/OFL.txt', 'utf8'));
writeFileSync(join(OUT, 'CREDITS.txt'), readFileSync('tools/itch/CREDITS.txt', 'utf8'));

const zip = `dist/medieval-td-${CRAZY ? 'crazygames' : 'itch'}-${id}.zip`;
rmSync(zip, { force: true });
execSync(`cd ${OUT} && zip -r -q -X ../${zip.slice('dist/'.length)} .`);

const count = readdirSync(OUT, { recursive: true }).filter(f => statSync(join(OUT, f)).isFile()).length;
console.log(`build ${id}: ${count} files, ${(bytes / 1e6).toFixed(1)} MB unpacked, ${(statSync(zip).size / 1e6).toFixed(1)} MB zipped`);
console.log(`  ${zip}`);
// itch.io's limits for a browser game: under 1,000 files and 500 MB unpacked.
if (count >= 1000) throw new Error('itch.io takes no more than 1,000 files in a browser game');
// CrazyGames', without their SDK: the whole game at most 50 MB (20 MB to be shown on
// their mobile home page), and no more than 1,500 files.
if (CRAZY && bytes > 50e6) throw new Error(`CrazyGames takes no more than 50 MB without their SDK: this is ${(bytes / 1e6).toFixed(1)} MB`);
