// Pictures. A tiny loader with the same manners as the big game's: a file that
// fails to load logs once and every draw falls back to a vector, so a missing
// sprite is a plain-looking game rather than a broken one.
//
// TWO KINDS OF PATH IN HERE. Anything reached with `../assets/` is the big game's
// own artwork, borrowed and never written to — the three maps and the three thugs,
// which the artist asked to keep. Anything under `assets/` is this folder's, and
// today all of it is MISSING ON PURPOSE.
//
// --- the placeholders ----------------------------------------------------------
//
// The four family members have no drawings yet; the artist is making them. Every
// one of them is listed below anyway, so the moment a file lands under
// `birthday/assets/family/` with the name in this table it appears in the game
// with nothing else changed.
//
// Until then each of them draws as a coloured disc with an initial on it — see
// `placeholder` in render.js — which is deliberately ugly. A placeholder that
// looked finished is a placeholder nobody replaces.

export const paths = {
  // --- borrowed from medieval-td, read-only ------------------------------------
  map01: '../assets/map/Map_1_base.svg',
  map02: '../assets/map/Map_2_base.svg',
  map03: '../assets/map/Map_3_base.svg',
  plot_marker: '../assets/map/Plot_Marker.svg',

  thug: '../assets/enemies/Enemies_Thug_Default.png',
  thug_attack: '../assets/enemies/Enemies_Thug_Attack.png',
  giant: '../assets/enemies/Enemies_Giant_Thug_Default.png',
  giant_attack: '../assets/enemies/Enemies_Giant_Thug_Attack.png',
  plague: '../assets/enemies/Enemies_Plague_Thug_Default.png',
  plague_attack: '../assets/enemies/Enemies_Plague_Thug_Attack.png',

  // --- this folder's, and not drawn yet ----------------------------------------
  //
  // Two poses each for the two who stand on the road, because they visibly swing;
  // one each for the two on their towers. Same convention as the big game — the
  // bare key is the resting pose — so if the artist wants a second drawing for
  // Olivia or Rei Rei later it is one more line here and one more field in data.js.
  papa: 'assets/family/Papa_Default.png',
  papa_attack: 'assets/family/Papa_Attack.png',
  mommy: 'assets/family/Mommy_Default.png',
  mommy_attack: 'assets/family/Mommy_Attack.png',
  olivia: 'assets/family/Olivia_Default.png',
  rei: 'assets/family/Rei_Default.png',

  // What the two tower-sitters put on the board, and the house being defended.
  slime: 'assets/family/Olivia_Slime.png',
  house: 'assets/family/House.png'
};

// Which keys are allowed to be missing without a warning. Everything this folder
// owns, because none of it exists yet — the day a drawing lands, take its key out
// of here so a typo in its filename is reported again rather than swallowed.
const COMING = new Set([
  'papa', 'papa_attack', 'mommy', 'mommy_attack', 'olivia', 'rei', 'slime', 'house'
]);

export const art = {};

export function loadArt() {
  const absent = [];

  const jobs = Object.entries(paths).map(([key, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { art[key] = img; resolve(); };
    img.onerror = () => {
      if (COMING.has(key)) absent.push(src);
      else console.warn('Birthday: missing picture', src);
      resolve();
    };
    img.src = src;
  }));

  return Promise.all(jobs).then(() => {
    if (absent.length) console.info('Birthday: still to be drawn —', absent.join(', '));
  });
}
