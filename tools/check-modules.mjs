// Checks that the cache-busting import maps in the HTML pages list every
// module under src/. Node only — never loaded by the game.
//
//   node tools/check-modules.mjs
//
// A module missing from a map still loads, but at its unversioned URL, so it
// silently serves from cache for ten minutes after a push while everything
// around it is fresh. That reads as "my change did nothing", which has cost
// this project real time more than once. Run this after adding a file to src/.
//
// It also checks a second thing that has nothing to do with modules and
// everything to do with the same failure mode — something invisible in review
// that only shows up on a real device. See INHERITED CANVAS STATE below.

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PAGES = ['index.html', 'aim-test.html', 'corpse-test.html', 'tower-test.html', 'knock-test.html'];

function modulesOnDisk(dir = 'src', prefix = '') {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) found.push(...modulesOnDisk(join(dir, entry.name), prefix + entry.name + '/'));
    else if (entry.name.endsWith('.js')) found.push(prefix + entry.name.replace(/\.js$/, ''));
  }
  return found.sort();
}

const expected = modulesOnDisk();
let bad = 0;

for (const page of PAGES) {
  const html = readFileSync(page, 'utf8');
  const block = html.match(/var mods = \[([\s\S]*?)\];/);

  if (!block) {
    console.log(`  ${page}: no import map found`);
    bad++;
    continue;
  }

  const listed = [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const missing = expected.filter(m => !listed.includes(m));
  const stale = listed.filter(m => !expected.includes(m));

  for (const m of missing) { console.log(`  ${page}: src/${m}.js is not in the import map`); bad++; }
  for (const m of stale)   { console.log(`  ${page}: import map lists src/${m}.js, which does not exist`); bad++; }
}

console.log(bad
  ? `${bad} import map problem(s). Every file under src/ must be listed in every page.`
  : `Import maps cover all ${expected.length} modules in ${PAGES.join(' and ')}.`);

// --- INHERITED CANVAS STATE -------------------------------------------------
//
// Every function that calls fillText must set textBaseline itself.
//
// This is here because of a bug that took a phone to see. The two dashboard
// buttons drew inside drawHud's save/restore and inherited its
// textBaseline = 'middle'; when that restore moved above them, they started
// picking up whatever the previous frame had left behind. Usually 'middle', so
// nothing looked wrong — but ROTATING A PHONE resizes the canvas, and assigning
// canvas.width resets the whole 2D context, textBaseline included, back to
// 'alphabetic'. The labels dropped half a line inside their plates and stayed
// there until something else set 'middle' and left it.
//
// A reviewer cannot see that: the line that broke it is in a different function
// from the line that suffers. A grep can.
//
// Helpers that are deliberately called with the state their caller has already
// set are listed as exceptions rather than being made to set it twice.
const INHERITS_ON_PURPOSE = new Set(['statValue', 'hudIcon']);

{
  const src = readFileSync('src/render.js', 'utf8');
  // Split on top-level function declarations. Crude, and enough: every drawing
  // function in this file is one.
  const parts = src.split(/\nfunction |\nexport function /).slice(1);
  let loose = 0;

  for (const part of parts) {
    const name = part.slice(0, part.indexOf('(')).trim();
    if (INHERITS_ON_PURPOSE.has(name)) continue;

    const draws = part.indexOf('fillText');
    if (draws < 0) continue;
    const sets = part.indexOf('textBaseline');
    if (sets >= 0 && sets < draws) continue;

    console.log(`  render.js: ${name}() draws text without setting textBaseline first`);
    loose++;
  }

  console.log(loose
    ? `${loose} function(s) inherit canvas text state — see the note in tools/check-modules.mjs.`
    : 'Every text-drawing function in render.js sets its own baseline.');
  bad += loose;
}

// --- THE TWO ICONS A PAGE HAS TO NAME ---------------------------------------
//
// A third thing this file has no business checking except that it fails the same
// way: silently, on a device, long after the change that broke it.
//
// A browser TAB reads `rel="icon"`. An iPhone home screen ignores that tag
// completely, looks for `apple-touch-icon`, and with none of it falls back to
// the first letter of the <title> — so this game sat on a home screen as a
// letter M with a favicon wired and working. Nothing in a desktop browser can
// show you that.
//
// So both are checked, on the pages a player actually opens, and the file each
// names has to exist. The test pages are not checked: nobody adds
// `corpse-test.html` to a home screen.
{
  const PLAYED = ['index.html', 'birthday/index.html'];
  let missing = 0;
  for (const page of PLAYED) {
    const html = readFileSync(page, 'utf8');
    const dir = page.includes('/') ? page.slice(0, page.lastIndexOf('/') + 1) : '';
    for (const rel of ['icon', 'apple-touch-icon']) {
      const m = html.match(new RegExp(`<link[^>]*rel="${rel}"[^>]*href="([^"]+)"`));
      if (!m) {
        console.log(`  ${page}: no <link rel="${rel}">`);
        missing++;
        continue;
      }
      // Resolve the href the way the page would, then check the file is there.
      const file = m[1].startsWith('../') ? m[1].slice(3) : dir + m[1];
      if (!existsSync(file)) {
        console.log(`  ${page}: rel="${rel}" points at ${m[1]}, which is not there`);
        missing++;
      }
    }
    if (!/apple-mobile-web-app-title/.test(html)) {
      console.log(`  ${page}: no apple-mobile-web-app-title, so a home screen uses the <title>`);
      missing++;
    }
  }
  console.log(missing
    ? `${missing} icon(s) a phone or a tab would not find.`
    : `Both icons and the home-screen label are wired on all ${PLAYED.length} played pages.`);
  bad += missing;
}

process.exit(bad ? 1 : 0);
