// Checks that the cache-busting import maps in the HTML pages list every
// module under src/. Node only — never loaded by the game.
//
//   node tools/check-modules.mjs
//
// A module missing from a map still loads, but at its unversioned URL, so it
// silently serves from cache for ten minutes after a push while everything
// around it is fresh. That reads as "my change did nothing", which has cost
// this project real time more than once. Run this after adding a file to src/.

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const PAGES = ['index.html', 'aim-test.html', 'corpse-test.html', 'tower-test.html'];

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

process.exit(bad ? 1 : 0);
