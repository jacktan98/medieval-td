// Pictures. A tiny loader with the same manners as the big game's: a file that
// fails to load logs once and every draw falls back to a vector, so a missing
// sprite is a plain-looking game rather than a broken one.
//
// TWO KINDS OF PATH IN HERE. Anything reached with `../assets/` is the big game's
// own artwork, borrowed and never written to — the three maps, the three thugs
// and the four dashboard icons. Anything under `assets/` is this folder's: the
// family, drawn for this game and used nowhere else.
//
// The four borrowed ICONS are worth a word, because they are the one place this
// game reads the big game's numbers as well as its files. Their trims live in
// `../../src/data/ui.js` and render.js imports them from there rather than
// copying them here — the artist re-exports those four files for the big game,
// and a copy would go stale silently the first time one of them is redrawn.

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
  plague_attack: '../assets/enemies/Enemies_Plague_Thug_Melee_Attack.png',

  // The dashboard's purse and lives, and the sword and heart that stand in for
  // the words "Damage" and "Health" on the stats panel.
  icon_gold: '../assets/ui/Gold_Icon.png',
  icon_life: '../assets/ui/Life_Icon.png',
  // `Damage_Icon.png` until the damage triangle arrived in the big game and split
  // the sword in two — see the note over `stat_damage` in ../src/assets.js. This
  // line was not moved with it and had been 404ing on every load since: nothing
  // broke visibly, because a missing image draws as nothing and the number beside
  // it still read. The birthday game has one kind of damage, so it takes the
  // physical sword.
  icon_damage: '../assets/ui/Physical_Damage_Icon.png',
  icon_health: '../assets/ui/Health_Icon.png',

  // The big game's rally flag, borrowed whole. It is the one UI file that is
  // also drawn ON the board over there — as the button that gives the order and
  // as the marker showing where the order was given — and it does both jobs here
  // for the same reason: the button and the thing the button does should look
  // like each other.
  icon_flag: '../assets/ui/Rally_Point_Icon.png',

  // --- the family --------------------------------------------------------------
  //
  // THREE FILES EACH. A resting pose, an attacking pose, and a NAMEPLATE — a flat
  // sign lying on the plot with the person's name on it. The plate is what makes
  // the two halves of this game read the same way: Ella and Rei stand on theirs,
  // Papa and Mommy walk off theirs and it stays behind saying whose plot it is.
  papa: 'assets/family/Papa_Default.png',
  papa_attack: 'assets/family/Papa_Attack.png',
  papa_plot: 'assets/family/Papa_Plot.png',

  mommy: 'assets/family/Mommy_Default.png',
  mommy_attack: 'assets/family/Mommy_Attack.png',
  mommy_plot: 'assets/family/Mommy_Plot.png',

  ella: 'assets/family/Ella_Default.png',
  ella_attack: 'assets/family/Ella_Attack.png',
  ella_plot: 'assets/family/Ella_Plot.png',

  rei: 'assets/family/Rei_Default.png',
  rei_attack: 'assets/family/Rei_Attack.png',
  rei_plot: 'assets/family/Rei_Plot.png',

  // What three of them put on the board: Ella's slime, Mommy's pellets, and the
  // smell where it lands.
  slime: 'assets/family/Ella_Slime.png',
  bullet: 'assets/family/Mommy_Bullet.png',
  smell: 'assets/family/Rei_Smell.png'
};

export const art = {};

export function loadArt() {
  const jobs = Object.entries(paths).map(([key, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { art[key] = img; resolve(); };
    // EVERY FILE IS DRAWN NOW, so a miss is a mistake rather than a thing still
    // coming. There used to be a list of expected absences here; it went the day
    // the artist delivered, which is the only sensible life for such a list.
    img.onerror = () => { console.warn('Birthday: missing picture', src); resolve(); };
    img.src = src;
  }));

  return Promise.all(jobs);
}
