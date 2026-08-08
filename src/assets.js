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
  barracks_t1: 'assets/towers/Barracks_Tower_T1.png',
  archer_t1:   'assets/units/Archers_Man_T1.png',
  soldier_t1:  'assets/units/Barracks_Man_T1.png',
  arrow_t1:    'assets/projectiles/Archers_Arrows_T1.png',
  enemy_t1:    'assets/enemies/Enemies_Man_T1.png',
  enemy_t2:    'assets/enemies/Enemies_Man_T2.png',
  // Death poses. See assets/dead/README.md.
  //
  // The tier comes LAST in these names — Man_Dead_T1, not Man_T1_Dead — because
  // that is how they were exported. The code bends to the artist's filenames
  // rather than the other way round: renaming an upload only means renaming it
  // again after the next one.
  dead_enemy_t1:   'assets/dead/Enemies_Man_Dead_T1.png',
  dead_enemy_t2:   'assets/dead/Enemies_Man_Dead_T2.png',
  dead_soldier_t1: 'assets/dead/Barracks_Man_Dead_T1.png',
  // Blood, two of each so a hit or a death is never the same picture twice in a
  // row. The spatter files sit in assets/projectiles and the pools in
  // assets/dead — that is where they were uploaded, and where the next ones will
  // go. assets/effects would describe them better; say the word and I will move
  // them, but the code following the upload is the cheaper habit.
  blood_1:         'assets/projectiles/Blood_1.png',
  blood_2:         'assets/projectiles/Blood_2.png',
  blood_dead_1:    'assets/dead/Blood_Dead_1.png',
  blood_dead_2:    'assets/dead/Blood_Dead_2.png',
  // HUD icons. NOT world art: they are sized to the text beside them rather than
  // by the shared SCALE, so they live with the other UI numbers in render.js.
  hud_gold:        'assets/map/Gold.png',
  hud_life:        'assets/map/Life.png',
  // The board and the plot marker, split out of the artist's Map_1.svg by
  // tools/split-map.mjs. They are separate because a marker painted into the
  // background can never be taken away, and it has to vanish when a tower is
  // built on that plot. Both are SVG, so unlike the sprites they stay sharp at
  // any device pixel ratio.
  map01:       'assets/map/Map_1_base.svg',
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
