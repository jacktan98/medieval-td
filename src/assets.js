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
  arrow_t1:    'assets/projectiles/Archers_Arrows_T1.png',
  enemy_t1:    'assets/enemies/Enemies_Man_T1.png',
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
