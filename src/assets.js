// Loads sprites once at startup. Missing files log a warning and fall back to
// the grey-box rectangle rather than crashing the game.

const paths = {
  archer_t1:   'assets/units/archer_t1.png',
  archer_t2:   'assets/units/archer_t2.png',
  crossbow_t3: 'assets/units/crossbow_t3.png',
  barracks_t1: 'assets/towers/Barracks_T1.png',
  soldier_t1:  'assets/units/Barracks_Soldier_T1.png'
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
