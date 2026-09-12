// STACK SEVERAL DRAWINGS ONTO ONE ARTBOARD AND RASTERISE THEM, so the artist can
// look at what the pieces make together.
//
//   node tools/combine.mjs assets/map/Stage_4_Map
//   node tools/combine.mjs assets/castle/Castle_Gate.svg assets/castle/Castle_Wall.svg
//   node tools/combine.mjs --out /tmp/castle.png a.svg b.svg c.svg
//
// WHY THIS EXISTS. Artwork here arrives as several files on the SAME 1920x1080
// artboard — a board's `_Layer_1/2/3`, or a set of castle pieces each drawn in its
// own place on a shared canvas. Nothing opens all of them at once: the art program
// shows one at a time, and the game shows the derived `_base.svg` with the plot
// markers cut out. So "do these line up" is a question the artist cannot answer by
// looking at any file that exists.
//
// It goes through the SAME `stackLayers` every other tool reads a board with, so what
// comes out is what split-map and trace-road see and what the game will draw — not a
// second opinion about how drawings stack.
//
// WHAT IT IS NOT FOR: nothing loads the PNG. It is the same kind of file as
// `Overview_Map_merged.svg` — a thing to look at. A board the game draws is still
// `<Board>_base.svg` and is still written by split-map.
//
// TWO MODES, and they differ in ONE thing: the ground.
//
//   A STEM stacks `<stem>_Layer_N.svg` and paints the board's ground colour first,
//   because a map layer is drawn expecting a field under it.
//
//   NAMED FILES stack exactly those and paint NOTHING, on white. A green rectangle
//   under a castle is a field rather than a background, and it hides the one thing
//   being checked — whether the pieces meet cleanly along their edges.
//
// THE RASTERISER IS CHROMIUM, because it is the renderer the game runs in. An SVG
// feature a browser draws one way and a converter draws another would make this lie
// in exactly the case it exists for. No new dependency: Playwright is already here
// for the browser checks, and this project has no build step to add one to.
import { existsSync } from 'fs';
import { stackLayers, layerFiles, bounds, allGroups } from './svg.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright/index.mjs';

// --- what to stack ------------------------------------------------------------

const argv = process.argv.slice(2);
let out = null;
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') out = argv[++i];
  else rest.push(argv[i]);
}

const named = rest.filter(a => a.endsWith('.svg'));
let files, withGround;

if (named.length) {
  files = named;
  withGround = false;
  out = out || named[0].replace(/\.svg$/, '') + '_combined.png';
} else {
  const stem = rest[0] || 'assets/map/Stage_1_Map';
  files = layerFiles(stem);
  if (!files.length) {
    console.error(`no ${stem}_Layer_N.svg beside ${stem} — name the .svg files instead:\n` +
      `  node tools/combine.mjs one.svg two.svg three.svg`);
    process.exit(1);
  }
  withGround = true;
  out = out || stem + '_combined.png';
}

for (const f of files) {
  if (!existsSync(f)) { console.error(`no such file: ${f}`); process.exit(1); }
}

const svg = stackLayers(files, { ground: withGround });
const [W, H] = [1920, 1080];

console.log(`stacking ${files.length} drawing(s) on a ${W}x${H} artboard` +
  `${withGround ? ' over the board ground' : ' on white'}:`);

// --- where each drawing actually falls ------------------------------------------
//
// The artboard is shared, so "same artboard" is not the question — two pieces can
// both declare 1920x1080 and be drawn in different corners of it. The INK's own
// bounding box is where the drawing is, and printing it is most of the answer to
// "will these combine": pieces that are meant to butt together should touch or
// overlap slightly, and pieces that pile up on each other are not a castle.
// ONE PASS OVER THE WHOLE STACKED TEXT, then each group filed under the wrapper it
// falls inside. Slicing the text per layer and parsing the slice does not work: every
// group here hangs off one clip declared at the top of the file, so a slice starting
// halfway down has no artboard and `allGroups` refuses it — correctly, since a slice
// of an SVG is not an SVG.
const marks = [...svg.matchAll(/<g data-layer="(\d+)">/g)].map(m => m.index);
const wrappers = new Set(marks);
const all = allGroups(svg).filter(g => !wrappers.has(g.start));

const boxes = [];
for (let i = 0; i < marks.length; i++) {
  const from = marks[i];
  const to = i + 1 < marks.length ? marks[i + 1] : svg.length;
  const pts = all.filter(g => g.start > from && g.start < to).flatMap(g => g.subPaths.flat());
  const name = files[i].split('/').pop();
  if (!pts.length) { console.log(`  ${name.padEnd(30)} nothing drawn`); boxes.push(null); continue; }
  const b = bounds(pts);
  boxes.push(b);
  console.log(`  ${name.padEnd(30)} x ${(b.x0 / 2).toFixed(0).padStart(4)}-${(b.x1 / 2).toFixed(0).padStart(4)}` +
    `   y ${(b.y0 / 2).toFixed(0).padStart(4)}-${(b.y1 / 2).toFixed(0).padStart(4)}   (game px)`);
}

// AND WHETHER THEY TOUCH AT ALL. Said as a pair-by-pair answer rather than left for
// the eye, because two pieces 3px apart look joined at this size and are not.
if (boxes.length > 1) {
  console.log('\nhow each pair of drawings meets:');
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (!a || !b) continue;
      const gapX = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0) / 2;
      const gapY = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0) / 2;
      const ox = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) / 2;
      const oy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)) / 2;
      const names = `${files[i].split('/').pop()} + ${files[j].split('/').pop()}`;
      console.log(`  ${names.padEnd(52)}` + (gapX || gapY
        ? `apart by ${gapX.toFixed(0)}px across, ${gapY.toFixed(0)}px down`
        : `overlap ${ox.toFixed(0)}x${oy.toFixed(0)}px`));
    }
  }
}

// --- rasterise -------------------------------------------------------------------

if (!existsSync(CHROME)) {
  console.error(`\nno Chromium at ${CHROME} — cannot rasterise.`);
  process.exit(1);
}

const { chromium } = await import(PLAYWRIGHT);

const browser = await chromium.launch({ executablePath: CHROME });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  // THE SVG GOES IN THE PAGE, not beside it. Writing it to a file and pointing an
  // <img> at `file://` looks obvious and does not work: setContent leaves the page on
  // `about:blank`, and a document with no origin is not allowed to load a local file,
  // so the image never decodes and the screenshot waits for something that will never
  // happen. Inlining the markup has no origin to be wrong about.
  await page.setContent(
    `<style>html,body{margin:0;background:#fff}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: out });
  await page.close();
} finally {
  await browser.close();
}

console.log(`\nwrote ${out} — ${W}x${H}, in the order given`);
