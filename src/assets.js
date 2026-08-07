// Loads sprites once at startup. Missing files log a warning and fall back to
// the grey-box rectangle rather than crashing the game.
//
// These paths are the one place a filename is written down, and a typo here is
// invisible: loadArt logs a warning and every draw call quietly uses its vector
// fallback, so the game still runs and still looks plausible. Check the console
// before assuming a sprite change did not deploy.

const paths = {
  archery_t1:  'assets/towers/Archers_Tower_T1.png',
  barracks_t1: 'assets/towers/Barracks_Tower_T1.png',
  archer_t1:   'assets/units/Archers_Man_T1.png',
  soldier_t1:  'assets/units/Barracks_Man_T1.png',
  arrow_t1:    'assets/projectiles/Archers_Arrow_T1.png',
  enemy_t1:    'assets/enemies/Enemies_Man_T1.png',
  // The whole board: ground, road and the plot markers, painted as one image.
  // An SVG has no fixed resolution, so unlike the sprites it stays sharp at any
  // device pixel ratio.
  map01:       'assets/map/Map_1.svg'
};

export const art = {};

export function loadArt() {
  const jobs = Object.entries(paths).map(([key, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { art[key] = img; resolve(); };
    img.onerror = () => { console.warn('Missing sprite:', src); resolve(); };
    img.src = src;
  }));
  return Promise.all(jobs);
}
