// Loads sprites once at startup. Missing files log a warning and fall back to
// the grey-box rectangle rather than crashing the game.
//
// These paths are the one place a filename is written down, and a typo here is
// invisible: loadArt logs a warning and every draw call quietly uses its vector
// fallback, so the game still runs and still looks plausible. Check the console
// before assuming a sprite change did not deploy.

const paths = {
  archery_t1:  'assets/towers/Archers_Tower_T1.png',
  archery_t2:  'assets/towers/Archers_Tower_T2.png',
  archery_t3:  'assets/towers/Archers_Tower_T3.png',
  barracks_t1: 'assets/towers/Barracks_Tower_T1.png',
  barracks_t2: 'assets/towers/Barracks_Tower_T2.png',
  barracks_t3: 'assets/towers/Barracks_Tower_T3.png',
  archer_t1:   'assets/units/Archers_Man_T1.png',
  archer_t2:   'assets/units/Archers_Man_T2.png',
  archer_t3:   'assets/units/Archers_Man_T3.png',
  soldier_t1:  'assets/units/Barracks_Man_T1.png',
  soldier_t2:  'assets/units/Barracks_Man_T2.png',
  soldier_t3:  'assets/units/Barracks_Man_T3.png',
  arrow_t1:    'assets/projectiles/Archers_Arrows_T1.png',
  // T1a and T1b, not T1 and T2. The artist renamed the heavy from tier 2 to
  // "tier 1b" — it is a bigger militiaman, not the next rank up — so the tier 2
  // enemy slot is still empty and the file that fills it later will be T2.
  // These keys follow the filenames; the gameplay names (light_inf, heavy_inf,
  // in data/waves.js) are unchanged, because what the enemy DOES did not.
  enemy_t1a:   'assets/enemies/Enemies_Man_T1a.png',
  enemy_t1b:   'assets/enemies/Enemies_Man_T1b.png',
  // Death poses. See assets/dead/README.md.
  //
  // The tier comes LAST in these names — Man_Dead_T1, not Man_T1_Dead — because
  // that is how they were exported. The code bends to the artist's filenames
  // rather than the other way round: renaming an upload only means renaming it
  // again after the next one.
  dead_enemy_t1a:  'assets/dead/Enemies_Man_Dead_T1a.png',
  dead_enemy_t1b:  'assets/dead/Enemies_Man_Dead_T1b.png',
  dead_soldier_t1: 'assets/dead/Barracks_Man_Dead_T1.png',
  dead_soldier_t2: 'assets/dead/Barracks_Man_Dead_T2.png',
  dead_soldier_t3: 'assets/dead/Barracks_Man_Dead_T3.png',
  // Blood, two of each so a hit or a death is never the same picture twice in a
  // row. All four in assets/effects now — the spatter used to sit with the arrows
  // and the pools with the corpses, which is where they happened to be uploaded.
  // Neither is a projectile or a body; put the next ones straight in here.
  blood_1:         'assets/effects/Blood_1.png',
  blood_2:         'assets/effects/Blood_2.png',
  blood_dead_1:    'assets/effects/Blood_Dead_1.png',
  blood_dead_2:    'assets/effects/Blood_Dead_2.png',
  // HUD icons. NOT world art: they are sized to the text beside them rather than
  // by the shared SCALE, so they live with the other UI numbers in render.js.
  hud_gold:        'assets/map/Gold.png',
  hud_life:        'assets/map/Life.png',
  // The board and the plot marker, split out of the artist's Map.svg by
  // tools/split-map.mjs. They are separate because a marker painted into the
  // background can never be taken away, and it has to vanish when a tower is
  // built on that plot. Both are SVG, so unlike the sprites they stay sharp at
  // any device pixel ratio.
  //
  // Map_base.svg is DERIVED and committed — there is no build step, so the
  // artist's upload alone is not enough. Re-run tools/split-map.mjs after every
  // map redraw or the board keeps the old road and the old markers.
  map01:       'assets/map/Map_base.svg',
  // Space encoded as %20. The file really is called "Plot Marker.svg" and the
  // name is left alone on purpose — it is what comes out of the artist's export,
  // and renaming it here would only mean renaming it again after every upload.
  // A raw space in a URL is what breaks, not a space in a filename.
  plot_marker: 'assets/map/Plot%20Marker.svg'
};

// Art the game is wired for but does not have yet. A miss here is expected, so
// it must not raise a warning — console warnings on every single load are how
// you learn to ignore the console, and the console is the only thing that tells
// you a real sprite failed to deploy.
//
// Misses are still reported, once, as a quiet note: that way a file uploaded
// under a slightly wrong name shows up as missing instead of silently doing
// nothing. Empty now that all three death poses have landed — put a key back
// here when a family is wired ahead of its artwork.
const OPTIONAL = new Set();

export const art = {};

export function loadArt() {
  const absent = [];

  const jobs = Object.entries(paths).map(([key, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { art[key] = img; resolve(); };
    img.onerror = () => {
      if (OPTIONAL.has(key)) absent.push(src);
      else console.warn('Missing sprite:', src);
      resolve();
    };
    img.src = src;
  }));

  return Promise.all(jobs).then(() => {
    if (absent.length) console.info('Not drawn yet:', absent.join(', '));
  });
}
