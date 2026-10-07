// THE CAPTAIN'S HEAL DRAWING WITHOUT ITS RADIANCE, for the board.
//
//   node tools/heal-bare.mjs           checks the derived file is in place
//   node tools/heal-bare.mjs --write   (re)makes it, in Chromium, from the SVG
//
// The owner's Heal drawing paints a grey dome round him (#baac97) and a light-brown
// floor under him (#74592e). On the board those are drawn LIVE instead, as the heal
// glow and its floor (see healDome in src/render.js and HEAL_GLOW / HEAL_FLOOR in
// src/data/bossfx.js), so the painted ones are taken out — BY SHAPE, from the SVG,
// rather than by colour from the PNG, because the sword's edge is a light brown that
// sits between those two colours and a colour test took it with them.
//
// Same 512 canvas as the PNG, so the PNG's trim and pivot hold for this one too.
import { readFileSync, existsSync, statSync } from 'fs';

const SRC = 'assets/bosses/Captain_Thug_Heal.svg';
const OUT = 'assets/bosses/Captain_Thug_Heal_Bare.png';
const RADIANCE = ['#baac97', '#74592e'];

// Every path that is filled with one of the radiance's colours, as text to cut.
export function radiancePaths(svg) {
  return [...svg.matchAll(/<path\b[^>]*>/g)].map(m => m[0])
    .filter(tag => RADIANCE.some(c => new RegExp(`fill="${c}"`, 'i').test(tag)));
}

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const svg = readFileSync(SRC, 'utf8');
const cut = radiancePaths(svg);

if (process.argv.includes('--write')) {
  const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
  const bare = cut.reduce((s, tag) => s.replace(tag, ''), svg);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  const png = await p.evaluate(async text => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    c.getContext('2d').drawImage(img, 0, 0, 512, 512);
    return c.toDataURL('image/png').split(',')[1];
  }, bare);
  await b.close();
  const { writeFileSync } = await import('fs');
  writeFileSync(OUT, Buffer.from(png, 'base64'));
  console.log(`wrote ${OUT}, ${cut.length} radiance shape(s) taken out`);
}

ok(cut.length === 2, 'the Heal SVG has its dome and its floor to take out', `${cut.length} shape(s)`);
ok(existsSync(OUT) && statSync(OUT).size > 0, 'and the drawing without them is in place', OUT);
console.log(bad ? `\n${bad} problem(s) with the bare heal drawing.` : '\nThe bare heal drawing is in place.');
process.exit(bad ? 1 : 0);
