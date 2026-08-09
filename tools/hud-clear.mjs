// Checks that no tower can be drawn into the HUD text. Node only.
//
//   node tools/hud-clear.mjs
//
// The map paints its own header strip and the game no longer paints a bar over
// the board, so a tall tower on a high plot is NOT cut off any more — it stands
// in front of the strip, which is what you want. What still goes wrong is the
// gold/lives/wave text: drawHud runs after drawTowers, so the text lands on top
// of the tower and both become hard to read.
//
// So the rule is not "keep towers below the header". It is "keep towers out of
// the text", and this measures it from the same numbers the renderer uses
// rather than from a remembered constant. Re-run after moving a plot, after
// re-exporting the art at a new size, and after touching drawHud.

import { plots } from '../src/data/level01.js';
import { families } from '../src/data/towers.js';

// Where drawHud puts its text. textBaseline is 'middle' at y=21, the biggest
// font is 20px, so the ink runs from about 11 to 31.
//
// Two thresholds, because "a tower is behind the text" is not automatically a
// problem. The text is drawn last and carries a shadow, so it stays readable
// over anything; what actually looks broken is a number sitting in the middle
// of a building rather than against sky. So:
//
//   reaching above TEXT_BOTTOM  -> reported, because it is worth knowing
//   reaching above TEXT_TOP     -> a failure, the text is inside the building
//
// A tower's tier stars are excluded from the failing measure. They are small
// and float in the gaps between words; the building box is what reads as solid.
const TEXT_TOP = 11;
const TEXT_BOTTOM = 34;
const RUNS = [
  [16, 140, 'Gold'],
  [150, 130, 'Lives'],
  [280, 130, 'Wave'],
  [470, 200, 'hint']
];

// Same geometry as towerBox(): a building hangs off its ground shadow, whose
// centre sits on the plot point. The stars drawTierStars puts at box.top - 7
// with a radius of 4 are the topmost ink, but only the box counts as solid.
const boxTop = (plot, def) => plot.y - def.groundFrac[1] * def.h;
const inkTop = (plot, def) => boxTop(plot, def) - 11;

let bad = 0, noted = 0;
console.log('plot            tallest tower   ink top  box top  verdict');

for (let i = 0; i < plots.length; i++) {
  const p = plots[i];

  // The worst case across every family and tier, so this does not go stale when
  // a taller tier-3 building arrives.
  let worst = null;
  for (const f of families) {
    for (const def of f.tiers || []) {
      const top = inkTop(p, def);
      if (!worst || top < worst.top) worst = { top, box: boxTop(p, def), def, fam: f.name };
    }
  }

  const left = p.x - worst.def.w / 2;
  const right = p.x + worst.def.w / 2;
  const hits = RUNS.filter(([rx, rw]) => right > rx && left < rx + rw).map(r => r[2]);

  const buried = hits.length && worst.box < TEXT_TOP;
  const behind = hits.length && worst.top < TEXT_BOTTOM;
  if (buried) bad++; else if (behind) noted++;

  console.log(
    `${i} (${String(p.x).padStart(3)}, ${String(p.y).padStart(3)})  ` +
    `${(worst.fam + ' T' + worst.def.tier).padEnd(14)} ` +
    `${String(Math.round(worst.top)).padStart(6)}   ` +
    `${String(Math.round(worst.box)).padStart(6)}  ` +
    (buried ? `BURIES ${hits.join('/')} — needs y >= ${Math.ceil(p.y + TEXT_TOP - worst.box)}`
     : behind ? `behind ${hits.join('/')}, but only sky and stars — ok`
     : `clear by ${Math.round(worst.top - TEXT_BOTTOM)}px`)
  );
}

if (bad) console.log(`\n${bad} plot(s) put a building behind the HUD text.`);
else if (noted) console.log(`\n${noted} plot(s) reach the text band with stars or a flag only, which reads fine.`);
else console.log('\nEvery plot keeps its tallest tower clear of the HUD text.');
process.exit(bad ? 1 : 0);
