// Checks that no tower can be drawn off the top of the board or into the HUD.
// Node only.
//
//   node tools/hud-clear.mjs
//
// The map USED to paint a blue header strip and the game paints no bar of its
// own, so a tall tower standing in front of the strip was fine and wanted. The
// strip is gone — the artist removed it and the board is grass to the top edge
// now — so the readouts sit straight on the board and lean on their drop shadow.
// That makes this check more important, not less. Three things are wrong, in
// descending order of how badly they read:
//
//   the top of the CANVAS      cuts, and the roof goes with it
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

import { levels, useLevel } from '../src/level.js';
import { families } from '../src/data/towers.js';
import { HUD_BTN, INFO_BOX, STAR_R, STAR_LIFT, tierMarks, ringLift, badgeTop }
  from '../src/render.js';

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
// A tower's TIER STARS float above its roof and are counted as ink. They were
// gone for a while — the info box says the tier in words — and came back for the
// one case the artwork cannot cover: a family whose tiers share a drawing, which
// today is artillery and will be nobody once its tiers are drawn. So ink top and
// box top differ again, but only on the towers that actually carry marks.
//
// A BARRACKS' MUSTER RINGS are the second thing above a roof, and they arrived
// there when the rings moved off the pennant. They are only drawn while a man is
// dead and walking back, which is most of a wave on the map that needs them, and
// they are the countdown — status the player is reading, not decoration. So they
// count as ink on the same terms the stars do, and `ringLift` is asked of
// render.js rather than worked out here, for the same reason `tierMarks` is.
//
// AN AURA BADGE is the third, and it is the one every tower can wear: the
// Judgement Temple's two work on whole families, so any building on the board can
// end up with a sword or a heart floating over it once one is bought. It is
// therefore counted for every tower rather than for the ones that carry it today
// — `badgeTop` is asked of render.js for the same reason the other two are.
//
// Nothing carries all three today: artillery wears the stars and musters nobody,
// and a barracks has a drawing per tier. The max below is what keeps that an
// observation rather than an assumption.
//
// The runs are measured from the layout drawHud actually produces, in a browser,
// because node has no canvas to measure a font with. The gaps are 7 after an
// icon and 26 between readouts; the icon widths come from uiSize.
//
// EACH RUN IS THE UNION ACROSS THE WHOLE GAME, not one frame. The readouts are
// laid out left to right, so a fourth digit of gold shifts Lives and Wave 14px
// right for the rest of the run, and "Wave 10 / 10" is 28 wider than
// "Wave 1 / 8". A run measured at one moment would leave a plot passing here and
// failing on screen an hour into the same game. So each is min-start to
// max-end over 3 and 4 digit gold and over every wave string:
//
//   Gold    16..130
//   Lives  141..220
//   Wave   231..391
//
// The old table said Wave was 215..330 and had never been measured; the real
// right edge is 391, which is past where the pause button used to start. That is
// the same mismeasurement HUD_X was centred against — see render.js.
//
// The fourth run used to be the "Tap a plot to build" hint, which was deleted
// when the dashboard controls arrived; it was still listed here and was
// reporting a plot as sitting behind text that had not been drawn for weeks.
const TEXT_TOP = 11;
const TEXT_BOTTOM = 34;
const RUNS = [
  [16, 114, 'Gold'],
  [141, 79, 'Lives'],
  [231, 160, 'Wave']
];

// The three HUD BUTTONS are a different problem from the text, and they sit on
// the right where the text runs do not. Their panels are translucent, so a
// building behind one is dimmed rather than erased — but it is still a building
// standing inside a control the player taps, with the button's border drawn
// across it, and there is no reading of that which looks intended. Taken from
// render.js rather than copied, because a button that moves must move here too.
const CONTROLS = Object.entries(HUD_BTN).map(([id, b]) => [b.x, b.w, b.y + b.h, id]);

// THE INFO PANEL IS NOT A CONTROL, and that distinction is the whole reason it
// sits in its own list. Nothing is tapped on it; it is 197px of opaque plate in
// the top-right corner that appears while something is selected and is gone the
// rest of the time. A tower behind it loses the top of its roof for as long as
// the panel is up, which is worth knowing and is not worth moving a marker for.
//
// It USED to be a failure, on the reasoning that a tower reaching into it would
// be behind the thing describing it. That reasoning is fine and the verdict was
// wrong, because of what the only fix costs. The panel is in the corner and the
// board is 960 wide: a plot under it cannot be cleared by moving the panel, only
// by moving the plot down the board — and the plot is where the ARTIST painted a
// marker. Map 3's plot 8 was pushed 14px for this, which put its dirt patch on
// the road's kerb, and that was reported from a screenshot before anybody
// noticed a roof behind a panel. The picture on the board beats the picture over
// it.
//
// Reported rather than silent, so a plot that ends up half a building deep is
// still visible here. A CONTROL is still a failure — see above.
const PANELS = [['info', INFO_BOX]].map(([id, b]) => [b.x, b.w, b.y + b.h, id]);

// Same geometry as towerBox(): a building hangs off its ground shadow, whose
// centre sits on the plot point.
const boxTop = (plot, def) => plot.y - def.groundFrac[1] * def.h;

// The topmost ink, which is the box unless the tower wears tier stars — those
// sit STAR_LIFT above it and reach STAR_R further up again. Asked of the same
// function the renderer uses, so a family that stops sharing artwork stops being
// allowed the headroom on the same day it stops drawing them.
const marks = (fam, def) => tierMarks({ fam, def });
const lift = (fam, def) =>
  Math.max(marks(fam, def) ? STAR_LIFT + STAR_R : 0, ringLift(def));
// The badge is asked for its own top rather than for a lift, because it is the
// one piece of this stack that STOPS: on the highest plots it rests on the roof
// instead of going off the board. See badgeTop in render.js.
const inkTop = (plot, fam, def) =>
  Math.min(boxTop(plot, def) - lift(fam, def), badgeTop(boxTop(plot, def)));

let bad = 0, noted = 0;

// EVERY MAP, not just the one that happens to be loaded. This used to read the
// module's `level`, which is map 1 until something switches it — so map 2's
// plots and map 3's had never been checked, and map 3 is the one that needed it:
// its highest markers sit 8 to 12px above map 1's highest, and map 1's highest
// clears the HUD by a single pixel.
for (const [li, lv] of levels.entries()) {
  useLevel(li);
  console.log(`\n${lv.id} ${lv.name}`);
  console.log('plot            tallest tower   ink top  box top  verdict');

for (let i = 0; i < lv.plots.length; i++) {
  const p = lv.plots[i];

  // The worst case across every family and tier, so this does not go stale when
  // a taller tier-3 building arrives.
  let worst = null;
  for (const f of families) {
    for (const def of f.tiers || []) {
      const top = inkTop(p, f, def);
      if (!worst || top < worst.top) worst = { top, box: boxTop(p, def), def, fam: f.name };
    }
  }

  const left = p.x - worst.def.w / 2;
  const right = p.x + worst.def.w / 2;
  const overlaps = list => list.filter(([bx, bw, bBottom]) =>
    right > bx && left < bx + bw && worst.box < bBottom);

  const hits = RUNS.filter(([rx, rw]) => right > rx && left < rx + rw).map(r => r[2]);
  const under = overlaps(CONTROLS);
  const behindPanel = overlaps(PANELS);

  // Two ways a high plot goes wrong that the text rule below does not see.
  //
  // The canvas edge simply cuts: text can be drawn over, y=0 cannot. A building
  // whose box starts above 0 loses its roof, and the tier stars — the only thing
  // on the board that says which tier a tower is — sit 11px higher again and
  // vanish entirely before the roof does.
  //
  // A HUD button is a control, not decoration. The panels used to run to y=53
  // and run to y=33 now that they are the same height as the icons, so this got
  // easier — but it is read from HUD_BTN rather than remembered, so it tracks.
  //
  // Each failing condition asks the plot to move down by a different amount, and
  // reporting only the first one found sends you round the loop twice: fix the
  // clipping and the button is still on top of it. So they are collected and the
  // strictest one is what the plot has to satisfy.
  const faults = [];
  if (worst.top < 0) {
    faults.push([p.y - worst.top,
      'CUT OFF by the top of the board']);
  }
  if (under.length) {
    faults.push([p.y + under[0][2] - worst.box,
      `UNDER the ${under.map(u => u[3]).join('/')} button`]);
  }
  if (hits.length && worst.box < TEXT_TOP) {
    faults.push([p.y + TEXT_TOP - worst.box, `BURIES ${hits.join('/')}`]);
  }
  faults.sort((a, b) => b[0] - a[0]);

  // How deep the panel sits over the roof, in px, so "reported rather than
  // failed" still comes with the number to argue about.
  const buried = behindPanel.length ? Math.round(behindPanel[0][2] - worst.box) : 0;

  const behind = !faults.length && hits.length && worst.top < TEXT_BOTTOM;
  if (faults.length) bad++; else if (behind || buried) noted++;

  console.log(
    `${i} (${String(p.x).padStart(3)}, ${String(p.y).padStart(3)})  ` +
    `${(worst.fam + ' T' + worst.def.tier).padEnd(14)} ` +
    `${String(Math.round(worst.top)).padStart(6)}   ` +
    `${String(Math.round(worst.box)).padStart(6)}  ` +
    (faults.length
      ? `${faults.map(f => f[1]).join('; ')} — needs y >= ${Math.ceil(faults[0][0])}`
      : buried
        ? `${buried}px of roof behind the ${behindPanel.map(u => u[3]).join('/')} panel while it is up`
      : behind ? `behind ${hits.join('/')} — the text is drawn over it, ok`
      : worst.top < TEXT_BOTTOM
        ? `reaches the text band, but beside every readout — ok`
        : `clear by ${Math.round(worst.top - TEXT_BOTTOM)}px`)
  );
}
}

if (bad) console.log(`\n${bad} plot(s) cut a building off, or put it under a HUD button or the HUD text.`);
else if (noted) console.log(`\n${noted} plot(s) reach the text band or the info panel, neither of which erases a roof for long.`);
else console.log('\nEvery plot keeps its tallest tower on the board and clear of the HUD.');
process.exit(bad ? 1 : 0);
