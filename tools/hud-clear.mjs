// Checks that no tower can be drawn off the top of the board or into the HUD.
// Node only.
//
//   node tools/hud-clear.mjs
//
// The map paints its own header strip and the game paints no bar of its own, so
// a tall tower standing in front of the strip is fine and wanted. Three things
// are not, in descending order of how badly they read:
//
//   the top of the CANVAS      cuts, and the tier stars go first
//   a HUD BUTTON               a building inside a control the player taps
//   the gold/lives/wave TEXT   drawn after the towers, so both get hard to read
//
// So the rule is not "keep towers below the header". It is "keep towers on the
// board and out of the HUD", and this measures it from the same numbers the
// renderer uses rather than from a remembered constant. Re-run after moving a
// plot, after re-exporting the art at a new size, and after touching drawHud.
//
// It reports the strictest fix, not the first fault it finds. The plot this was
// written for failed two of the three at once, and fixing the smaller one first
// would have meant moving the same marker twice.

import { plots } from '../src/data/level01.js';
import { families } from '../src/data/towers.js';
import { HUD_BTN } from '../src/render.js';

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

// The two HUD BUTTONS are a different problem from the text, and they sit on the
// right where the text runs do not. Their panels are translucent, so a building
// behind one is dimmed rather than erased — but it is still a building standing
// inside a control the player taps, with the button's border drawn across it,
// and there is no reading of that which looks intended. Taken from render.js
// rather than copied, because a button that moves must move here too.
const PANELS = Object.entries(HUD_BTN).map(([id, b]) => [b.x, b.w, b.y + b.h, id]);

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
  const under = PANELS.filter(([bx, bw, bBottom]) =>
    right > bx && left < bx + bw && worst.box < bBottom);

  // Two ways a high plot goes wrong that the text rule below does not see.
  //
  // The canvas edge simply cuts: text can be drawn over, y=0 cannot. A building
  // whose box starts above 0 loses its roof, and the tier stars — the only thing
  // on the board that says which tier a tower is — sit 11px higher again and
  // vanish entirely before the roof does.
  //
  // A HUD button reaches lower than the text does — the panel runs to y=53 — and
  // it is a control, not decoration.
  //
  // Each failing condition asks the plot to move down by a different amount, and
  // reporting only the first one found sends you round the loop twice: fix the
  // clipping and the button is still on top of it. So they are collected and the
  // strictest one is what the plot has to satisfy.
  const faults = [];
  if (worst.top < 0) {
    faults.push([p.y - worst.top,
      `CUT OFF by the top of the board (${worst.box < 0 ? 'roof and stars' : 'stars only'})`]);
  }
  if (under.length) {
    faults.push([p.y + under[0][2] - worst.box,
      `UNDER the ${under.map(u => u[3]).join('/')} button`]);
  }
  if (hits.length && worst.box < TEXT_TOP) {
    faults.push([p.y + TEXT_TOP - worst.box, `BURIES ${hits.join('/')}`]);
  }
  faults.sort((a, b) => b[0] - a[0]);

  const behind = !faults.length && hits.length && worst.top < TEXT_BOTTOM;
  if (faults.length) bad++; else if (behind) noted++;

  console.log(
    `${i} (${String(p.x).padStart(3)}, ${String(p.y).padStart(3)})  ` +
    `${(worst.fam + ' T' + worst.def.tier).padEnd(14)} ` +
    `${String(Math.round(worst.top)).padStart(6)}   ` +
    `${String(Math.round(worst.box)).padStart(6)}  ` +
    (faults.length
      ? `${faults.map(f => f[1]).join('; ')} — needs y >= ${Math.ceil(faults[0][0])}`
      : behind ? `behind ${hits.join('/')}, but only sky and stars — ok`
      : `clear by ${Math.round(worst.top - TEXT_BOTTOM)}px`)
  );
}

if (bad) console.log(`\n${bad} plot(s) cut a building off, or put it under a HUD button or the HUD text.`);
else if (noted) console.log(`\n${noted} plot(s) reach the text band with stars or a flag only, which reads fine.`);
else console.log('\nEvery plot keeps its tallest tower on the board and clear of the HUD.');
process.exit(bad ? 1 : 0);
