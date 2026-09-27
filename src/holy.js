// HOLY LIGHT OVER DAWNFORD, at the owner's word: "for stage 6, 7, 8, create holy
// lights around each stage. I don't want them to be sort of disco lights."
//
// So nothing here flashes, sweeps or changes colour. It is sunlight coming down
// through the air at a slant — a few broad, soft shafts of one warm white, each
// brightening and dimming over ten seconds or more and leaning a little one way and
// back over half a minute — with motes of dust drifting slowly up inside them and
// catching the light as they turn. Laid over the board and everything standing on
// it, under the health bars and the interface, which are not in the world.
//
// A level asks for it with `holy: true`, or names its own shafts with
// `holy: { beams: [[x, width], ...] }` — x where a shaft crosses the top of the board.
// On the board's clock, so it holds still on a paused board.
//
// THE SHAFTS WANDER, and are never where they were: the owner found the same four in
// the same places on all three boards. So each board draws its own the first time it
// is shown — where each shaft starts, how wide it is — and each drifts slowly left
// and right on two slow swings of its own, so their paths never repeat in step.

const TINT = '255,238,190';
const LEAN = 0.36;               // the slant of the light, across per down
const LENGTH = 720;              // px of shaft, top edge to past the bottom
const MOTES_PER_BEAM = 7;
const BEAMS = 4;

// A board's shafts, drawn at random once per board: spread across it one to each
// quarter, anywhere in it, and each with its own slow wander — a wide swing of
// `a1` px over `p1` seconds and a smaller one over `p2`, from phases of its own.
const plans = new WeakMap();
function plan(level) {
  let p = plans.get(level);
  if (p) return p;
  const r = Math.random;
  const given = level.holy.beams;
  const n = given ? given.length : BEAMS;
  p = [];
  for (let i = 0; i < n; i++) {
    p.push({
      x: given ? given[i][0] : -40 + (i + 0.15 + r() * 0.7) * (1080 / n),
      w: given ? given[i][1] : 80 + r() * 60,
      a1: 30 + r() * 40, p1: 60 + r() * 40, f1: r() * 6.3,
      a2: 8 + r() * 12, p2: 30 + r() * 15, f2: r() * 6.3
    });
  }
  plans.set(level, p);
  return p;
}

const hash = n => { const x = Math.sin(n * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };

// One shaft, drawn once: brightest down its middle and fading to nothing at both
// sides, strongest near the top and thinning as it goes down.
const shafts = new Map();
function shaft(w) {
  let c = shafts.get(w);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w; c.height = LENGTH;
  const g = c.getContext('2d');
  const across = g.createLinearGradient(0, 0, w, 0);
  across.addColorStop(0, `rgba(${TINT},0)`);
  across.addColorStop(0.3, `rgba(${TINT},0.7)`);
  across.addColorStop(0.5, `rgba(${TINT},1)`);
  across.addColorStop(0.7, `rgba(${TINT},0.7)`);
  across.addColorStop(1, `rgba(${TINT},0)`);
  g.fillStyle = across;
  g.fillRect(0, 0, w, LENGTH);
  g.globalCompositeOperation = 'destination-in';
  const down = g.createLinearGradient(0, 0, 0, LENGTH);
  down.addColorStop(0, 'rgba(0,0,0,1)');
  down.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  down.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = down;
  g.fillRect(0, 0, w, LENGTH);
  shafts.set(w, c);
  return c;
}

// A mote: a soft round speck, drawn once and stamped.
let moteSheet = null;
function mote() {
  if (moteSheet) return moteSheet;
  moteSheet = document.createElement('canvas');
  moteSheet.width = moteSheet.height = 16;
  const g = moteSheet.getContext('2d');
  const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, `rgba(${TINT},1)`);
  grad.addColorStop(0.45, `rgba(${TINT},0.8)`);
  grad.addColorStop(1, `rgba(${TINT},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 16);
  return moteSheet;
}

export function drawHoly(ctx, level, t) {
  if (!level.holy) return;
  const beams = plan(level);
  const angle = Math.atan(LEAN);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  beams.forEach((b, i) => {
    const w = b.w;
    // Brightening and dimming, each on a beat of its own, never out altogether.
    const breathe = 0.6 + 0.4 * Math.sin(t * (2 * Math.PI) / (11 + hash(i + 1) * 6) + hash(i + 2) * 6.3);
    // And wandering slowly left and right.
    const x = b.x + b.a1 * Math.sin(t * (2 * Math.PI) / b.p1 + b.f1) + b.a2 * Math.sin(t * (2 * Math.PI) / b.p2 + b.f2);
    ctx.save();
    ctx.translate(x, -20);
    ctx.rotate(-angle);
    ctx.globalAlpha = 0.26 * breathe;
    ctx.drawImage(shaft(w), -w / 2, 0);
    // DUST IN THE LIGHT: specks rising slowly up the shaft, swaying, each turning
    // to catch the light now and then — in the shaft's own frame, so they stay in it.
    for (let k = 0; k < MOTES_PER_BEAM; k++) {
      const n = i * 31 + k;
      const life = 7 + hash(n + 10) * 5;
      const p = ((t / life) + hash(n + 11)) % 1;
      const round = Math.floor(t / life + hash(n + 11));
      const along = 60 + hash(n + round * 7 + 12) * 380;
      const across = (hash(n + round * 5 + 13) - 0.5) * w * 0.55;
      const y = along - p * 36;
      const sx = across + 3 * Math.sin(t * 0.7 + n);
      const glint = 0.55 + 0.45 * Math.sin(t * (1.1 + hash(n + 14)) + n);
      const r = 0.7 + hash(n + 15) * 0.8;
      ctx.globalAlpha = 0.85 * Math.sin(Math.PI * p) * glint * (1 - along / 520);
      ctx.drawImage(mote(), sx - r * 2, y - r * 2, r * 4, r * 4);
    }
    ctx.restore();
  });
  ctx.restore();
}
