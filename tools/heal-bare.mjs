// THE CAPTAIN'S HEAL DRAWING AND THE PALADIN'S HOLY LIGHT WITHOUT THEIR RADIANCE,
// for the board.
//
//   node tools/heal-bare.mjs           checks the derived files are in place
//   node tools/heal-bare.mjs --write   (re)makes them, in Chromium, from the SVGs
//
// The owner's Heal drawing paints a grey dome round him (#baac97) and a light-brown
// floor under him (#74592e). On the board those are drawn LIVE instead, as the heal
// glow and its floor (see healDome in src/render.js and HEAL_GLOW / HEAL_FLOOR in
// src/data/bossfx.js), so the painted ones are taken out — BY SHAPE, from the SVG,
// rather than by colour from the PNG, because the sword's edge is a light brown that
// sits between those two colours and a colour test took it with them.
//
// THE PALADIN'S HOLY LIGHT IS THE SAME STYLE, at the owner's word: a pale yellow dome
// (#fff3b3) and a yellow floor (#ffeb7e), drawn live as his glow; his blade's yellow
// edge is a STROKE, not a fill, so it stays.
//
// Same 512 canvas as each PNG, so the PNG's trim and pivot hold for each one too.
import { readFileSync, existsSync, statSync } from 'fs';

const JOBS = [
  { src: 'assets/bosses/Captain_Thug_Heal.svg', out: 'assets/bosses/Captain_Thug_Heal_Bare.png',
    radiance: ['#baac97', '#74592e'] },
  { src: 'assets/units/Paladin_Holy_Light.svg', out: 'assets/units/Paladin_Holy_Light_Bare.png',
    radiance: ['#fff3b3', '#ffeb7e'] }
];

// Every path FILLED with one of the radiance's colours, as text to cut.
export function radiancePaths(svg, radiance) {
  return [...svg.matchAll(/<path\b[^>]*>/g)].map(m => m[0])
    .filter(tag => radiance.some(c => new RegExp(`fill="${c}"`, 'i').test(tag)));
}

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const write = process.argv.includes('--write');
let browser = null;
for (const job of JOBS) {
  const svg = readFileSync(job.src, 'utf8');
  const cut = radiancePaths(svg, job.radiance);
  if (write) {
    const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
    browser ||= await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
    const bare = cut.reduce((s, tag) => s.replace(tag, ''), svg);
    const p = await browser.newPage();
    const png = await p.evaluate(async text => {
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 512; c.height = 512;
      c.getContext('2d').drawImage(img, 0, 0, 512, 512);
      return c.toDataURL('image/png').split(',')[1];
    }, bare);
    const { writeFileSync } = await import('fs');
    writeFileSync(job.out, Buffer.from(png, 'base64'));
    console.log(`wrote ${job.out}, ${cut.length} radiance shape(s) taken out`);
  }
  ok(cut.length === 2, `${job.src.split('/').pop()} has its dome and floor to take out`, `${cut.length} shape(s)`);
  ok(existsSync(job.out) && statSync(job.out).size > 0, '  and the drawing without them is in place', job.out);
}
if (browser) await browser.close();
console.log(bad ? `\n${bad} problem(s) with the bare drawings.` : '\nThe bare drawings are in place.');
process.exit(bad ? 1 : 0);
