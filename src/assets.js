// Loads sprites once at startup. Missing files log a warning and fall back to
// the grey-box rectangle rather than crashing the game.
//
// These paths are the one place a filename is written down, and a typo here is
// invisible: loadArt logs a warning and every draw call quietly uses its vector
// fallback, so the game still runs and still looks plausible. Check the console
// before assuming a sprite change did not deploy.

// ONE FOLDER PER TOWER FAMILY under assets/towers, and it holds BUILDINGS only.
// The six buildings used to sit in one flat folder, which was fine until a
// family arrived with three drawings of its own.
//
// Everything that is not a building goes in the folder for what it IS, whichever
// family it belongs to: every figure in assets/units, every death pose in
// assets/dead, every projectile in assets/projectiles. So the catapult's crewman
// stands with the archers and the spearmen, and its rock flies beside the arrow.
//
// EXPORTED so the tools can resolve a sprite key back to a file. tools/trim.mjs
// needs it to check that every frame of an animated building fits inside the one
// trim they share; hard-coding those paths in the tool is how a moved file ends
// up checked in its old location and reported as fine.
export const paths = {
  archery_t1:  'assets/towers/archery/Archers_Tower_T1.png',
  archery_t2:  'assets/towers/archery/Archers_Tower_T2.png',
  archery_t3:  'assets/towers/archery/Archers_Tower_T3.png',
  barracks_t1: 'assets/towers/barracks/Barracks_Tower_T1.png',
  barracks_t2: 'assets/towers/barracks/Barracks_Tower_T2.png',
  barracks_t3: 'assets/towers/barracks/Barracks_Tower_T3.png',
  // Artillery tier 1, and the first building with more than one drawing. The
  // three frames are one second each and the machine cycles through them while
  // it has something to shoot at; see `catapult` in data/towers.js.
  //
  // The key with no suffix is the RESTING pose, so anything that reads
  // `def.sprite` without knowing about frames — a fallback, a portrait, a test
  // page — still gets a sensible picture of a catapult.
  artillery_t1:        'assets/towers/artillery/Artillery_Default_T1.png',
  artillery_t1_reload: 'assets/towers/artillery/Artillery_Reload_T1.png',
  artillery_t1_fire:   'assets/towers/artillery/Artillery_Fire_T1.png',
  archer_t1:   'assets/units/Archers_Man_T1.png',
  archer_t2:   'assets/units/Archers_Man_T2.png',
  archer_t3:   'assets/units/Archers_Man_T3.png',
  soldier_t1:  'assets/units/Barracks_Man_T1.png',
  soldier_t2:  'assets/units/Barracks_Man_T2.png',
  soldier_t3:  'assets/units/Barracks_Man_T3.png',
  // The catapult crewman, for the info box only — he is already drawn into all
  // three machine frames, which is the whole reason the machine animates. He
  // sits with the other men rather than with the machine because that is what he
  // is: assets/units is every figure in the game.
  crew_t1:     'assets/units/Artillery_Man_T1.png',
  arrow_t1:    'assets/projectiles/Archers_Arrows_T1.png',
  rock_t1:     'assets/projectiles/Artillery_Rock_T1.png',
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
  // UI: the dashboard and the radial menu. NOT world art — none of it is sized
  // by the shared SCALE, because a button is as big as a thumb needs and an icon
  // is as big as the number beside it. Trims and drawn boxes are in data/ui.js.
  //
  // NO ESCAPING ANY MORE. Every one of these used to be written '%20' because
  // the files had spaces in their names and a raw space is not legal in a URL;
  // the artist renamed them all to underscores and the encoding came out with
  // the spaces. If a file with a space ever arrives again, encode it here rather
  // than renaming it — the code bends to the artist's filenames.
  hud_gold:        'assets/ui/Gold_Icon.png',
  hud_life:        'assets/ui/Life_Icon.png',
  btn_plate:       'assets/ui/Button_Plate_Icon.png',
  btn_cancel:      'assets/ui/Cancel_Button_Icon.png',
  glyph_bow:       'assets/ui/Archers_Icon.png',
  glyph_swords:    'assets/ui/Barracks_Icon.png',
  glyph_up:        'assets/ui/Upgrade_Icon.png',
  glyph_coin:      'assets/ui/Sell_Icon.png',
  glyph_flag:      'assets/ui/Rally_Point_Icon.png',
  // The three plates, and the two stat icons that replaced the words "Health:"
  // and "Damage:" in the info box.
  plate_speed:     'assets/ui/Speed_Box.png',
  plate_wave:      'assets/ui/Next_Wave_Box.png',
  plate_info:      'assets/ui/Description_Box.png',
  stat_damage:     'assets/ui/Damage_Icon.png',
  // A heart of its own for the info box. It is NOT hud_life: the dashboard's
  // heart is the keep's lives and this one is a figure's health, and the artist
  // drew them as two files, so they are two keys.
  stat_health:     'assets/ui/Health_Icon.png',
  // The board and the plot marker, split out of the artist's Map_1.svg by
  // tools/split-map.mjs. They are separate because a marker painted into the
  // background can never be taken away, and it has to vanish when a tower is
  // built on that plot. Both are SVG, so unlike the sprites they stay sharp at
  // any device pixel ratio.
  //
  // Map_1_base.svg is DERIVED and committed — there is no build step, so the
  // artist's upload alone is not enough. Re-run tools/split-map.mjs after every
  // map redraw or the board keeps the old road and the old markers.
  map01:       'assets/map/Map_1_base.svg',
  // The second stage. Same pipeline, same rule: DERIVED and committed, so
  // re-run tools/split-map.mjs on Map_2.svg after every redraw of it.
  map02:       'assets/map/Map_2_base.svg',
  plot_marker: 'assets/map/Plot_Marker.svg'
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
