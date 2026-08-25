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
  archery_t1:  'assets/towers/archery/Archery_Tower_T1.png',
  archery_t2:  'assets/towers/archery/Archery_Tower_T2.png',
  archery_t3:  'assets/towers/archery/Archery_Tower_T3.png',
  // Tier 4, and the file is named for the tower rather than for the ladder: the
  // artist uploaded it as Musketeer_Post and it was filed into the archery folder
  // with the other three. The KEY stays tiered because the code reaches it through
  // a tier — `archery[3].sprite` — which is the same split every unit file has.
  archery_t4:  'assets/towers/archery/Musketeer_Post.png',
  barracks_t1: 'assets/towers/barracks/Barracks_Tower_T1.png',
  barracks_t2: 'assets/towers/barracks/Barracks_Tower_T2.png',
  barracks_t3: 'assets/towers/barracks/Barracks_Tower_T3.png',
  // Tier 4, on the same terms as the archery ladder's: the artist uploaded it as
  // Paladin_Keep and it was filed with the other three barracks buildings, while
  // the KEY stays tiered because the code reaches it through `barracks[3].sprite`.
  barracks_t4: 'assets/towers/barracks/Paladin_Keep.png',
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
  artillery_t2:        'assets/towers/artillery/Artillery_Default_T2.png',
  artillery_t2_reload: 'assets/towers/artillery/Artillery_Reload_T2.png',
  artillery_t2_fire:   'assets/towers/artillery/Artillery_Fire_T2.png',
  artillery_t3:        'assets/towers/artillery/Artillery_Default_T3.png',
  artillery_t3_reload: 'assets/towers/artillery/Artillery_Reload_T3.png',
  artillery_t3_fire:   'assets/towers/artillery/Artillery_Fire_T3.png',
  // TIER 4, THE BALLISTA TURRET, and it is the first building in the game drawn
  // as TWO SEPARATE PIECES: a stone turret that never moves, and a machine on
  // top of it that animates on the same three beats as the catapults below and
  // mirrors to face its target.
  //
  // They are two files because they do two different things. Every other
  // artillery tier is one drawing per beat with the whole machine in it, so the
  // WHOLE picture mirrors when the crew turns — fine for a catapult standing on
  // grass, and impossible for one standing on a turret, because a mirrored
  // turret is lit from the wrong side and its stonework recedes the wrong way.
  // Splitting the two lets the stone stay put and the machine turn on it.
  //
  // `artillery_t4_base` is the turret. `artillery_t4` and its two suffixed
  // frames are the machine, and the bare key is the resting pose exactly as it
  // is on tiers 1 to 3.
  artillery_t4_base:   'assets/towers/artillery/Ballista_Turret_Tower.png',
  artillery_t4:        'assets/towers/artillery/Ballista_Turret_Default.png',
  artillery_t4_reload: 'assets/towers/artillery/Ballista_Turret_Reload.png',
  artillery_t4_fire:   'assets/towers/artillery/Ballista_Turret_Fire.png',
  // AND THE SAME THREE IN IRON, which is what Far Shot buys. Only the material
  // changes — every trim is identical to the timber frame's, to the pixel — so the
  // ability swaps which three files the beat loop draws and nothing else moves.
  artillery_t4_far:        'assets/towers/artillery/Ballista_Turret_Default_Far_Shot.png',
  artillery_t4_reload_far: 'assets/towers/artillery/Ballista_Turret_Reload_Far_Shot.png',
  artillery_t4_fire_far:   'assets/towers/artillery/Ballista_Turret_Fire_Far_Shot.png',
  // The monastery, in a folder of its own like every other family. The artist
  // uploaded these loose into assets/towers beside the three family folders, and
  // they were moved rather than wired where they landed — a building lives with
  // its family, which is the rule the artillery reorganisation set.
  //
  // Tiers 2 and 3 are the same building in timber and in stone, so their trims
  // and their shadows are identical; they are still two files and two keys, and
  // the tier stars stay off because the drawings differ.
  monastery_t1: 'assets/towers/monastery/Monastery_Tower_T1.png',
  monastery_t2: 'assets/towers/monastery/Monastery_Tower_T2.png',
  monastery_t3: 'assets/towers/monastery/Monastery_Tower_T3.png',
  // Tier 4, the Judgement Temple: the same open belfry in stone, one storey
  // taller, with a shingled roof over it and a cross on the point. It is the
  // tallest drawing in the game at 165 game px against the tier 2 and 3 towers'
  // 142.
  monastery_t4: 'assets/towers/monastery/Judgement_Temple.png',
  // EVERY FIGHTING MAN IS TWO DRAWINGS NOW: a Default he stands and walks in,
  // and an Attack he swings or looses an arrow in. Same suffix rule as the
  // artillery frames above — the bare key is the resting pose, so the info box,
  // the encyclopedia and any fallback that reads `def.sprite` without knowing
  // about frames still get a man standing still rather than mid-swing.
  //
  // The files are named by the MAN rather than by his tier. That is the artist's
  // naming and the code follows it, but it is also the better name: "Swordsman"
  // is what the game calls him on screen, and "Barracks_Man_T3" only said where
  // he was recruited. The keys stay tiered because the code reaches them through
  // a tier — `barracks[2].soldier` — and renaming those would touch every tool.
  //
  archer_t1:          'assets/units/Soldiers_Novice_Archer_Default.png',
  archer_t1_attack:   'assets/units/Soldiers_Novice_Archer_Attack.png',
  archer_t2:          'assets/units/Soldiers_Combat_Archer_Default.png',
  archer_t2_attack:   'assets/units/Soldiers_Combat_Archer_Attack.png',
  archer_t3:          'assets/units/Soldiers_Elite_Archer_Default.png',
  archer_t3_attack:   'assets/units/Soldiers_Elite_Archer_Attack.png',
  // Tier 4's man. Not `archer_t4`: he does not draw a bow, and the info box and
  // the encyclopedia both print his name rather than his tier.
  musketeer:          'assets/units/Musketeer_Default.png',
  musketeer_attack:   'assets/units/Musketeer_Attack.png',
  // The Deadeye pose, and the first drawing in the game that belongs to an ABILITY
  // rather than to a man or a machine. It is a third pose of the same musketeer —
  // measured on the same shadow, so he does not step sideways when he swaps to it —
  // and it is only ever drawn by a Post that has bought Deadeye. See
  // src/data/abilities.js.
  musketeer_deadeye:  'assets/units/Musketeer_Deadeye.png',
  soldier_t1:         'assets/units/Soldiers_Spearman_Default.png',
  soldier_t1_attack:  'assets/units/Soldiers_Spearman_Attack.png',
  soldier_t2:         'assets/units/Soldiers_Pikeman_Default.png',
  soldier_t2_attack:  'assets/units/Soldiers_Pikeman_Attack.png',
  soldier_t3:         'assets/units/Soldiers_Swordsman_Default.png',
  soldier_t3_attack:  'assets/units/Soldiers_Swordsman_Attack.png',
  // Tier 4's man, named rather than tiered for the same reason the musketeer is:
  // the info box and the encyclopedia print "Paladin", not "Barracks Tier IV".
  paladin:            'assets/units/Paladin_Default.png',
  paladin_attack:     'assets/units/Paladin_Attack.png',
  // His two ability poses, on the same terms as the musketeer's Deadeye above: a
  // paladin only ever shows these if his Keep has bought the ability they belong
  // to. Holy Light is the kneel-and-heal; Holy Slash is the tenth blow.
  paladin_holy_light: 'assets/units/Paladin_Holy_Light.png',
  paladin_holy_slash: 'assets/units/Paladin_Holy_Slash.png',
  // The monastery's three churchmen, who stand on their decks exactly as the
  // archers do. The keys stay tiered — the code reaches them through
  // `monastery[1].gunner` — while the files are named for the man, which is the
  // same split every other family already has.
  priest_t1:          'assets/units/Soldiers_Priest_Default.png',
  priest_t1_attack:   'assets/units/Soldiers_Priest_Attack.png',
  priest_t2:          'assets/units/Soldiers_Bishop_Default.png',
  priest_t2_attack:   'assets/units/Soldiers_Bishop_Attack.png',
  priest_t3:          'assets/units/Soldiers_Cardinal_Default.png',
  priest_t3_attack:   'assets/units/Soldiers_Cardinal_Attack.png',
  // The pope, tier 4's churchman. Named for the man like the musketeer and the
  // paladin rather than tiered like the three above him — a tier 4 is a named
  // tower with a named man in it, and the artist's files say so.
  pope:               'assets/units/Pope_Default.png',
  pope_attack:        'assets/units/Pope_Attack.png',
  // The catapult crewman, for the info box only — he is already drawn into all
  // three machine frames, which is the whole reason the machine animates. He
  // sits with the other men rather than with the machine because that is what he
  // is: assets/units is every figure in the game.
  crew_t1:     'assets/units/Artillery_Man_T1.png',
  crew_t2:     'assets/units/Artillery_Man_T2.png',
  crew_t3:     'assets/units/Artillery_Man_T3.png',
  // Tier 4's engineer, on the same terms as the three crewmen above: he is
  // already drawn into all three machine frames, and this is the portrait the
  // info box and the encyclopedia use. Named for the man rather than the tier,
  // like the musketeer and the paladin.
  crew_t4:     'assets/units/Ballista_Engineer.png',
  // THE ARROW LOST ITS TIER, because it stopped belonging to one family. The
  // artist renamed Archery_Arrows_T1 to Archer_Arrows when the Archer Thug
  // arrived: the same drawing now leaves a tower's bow and an enemy's, and a
  // name with a tier in it said it was the first of a ladder that does not
  // exist. The KEY keeps its old spelling — `arrow_t1` is written into three
  // archery tiers and the ammunition table — and only the path moved.
  arrow_t1:    'assets/projectiles/Archer_Arrows.png',
  // The musket ball. One drawing for the one tier that fires it, so the key
  // carries no tier number — unlike the rocks and the missiles, which have three
  // each.
  bullet:      'assets/projectiles/Musketeer_Bullet.png',
  // Deadeye's ball: the same lead, drawn four times the size with a flame behind
  // it. A second file rather than the first one scaled up, because it is a
  // different drawing and not a bigger one — see `deadeyeBall` in
  // src/data/abilities.js.
  deadeye_bullet: 'assets/projectiles/Musketeer_Deadeye_Bullet.png',
  // The ballista's bolt: a shaft with an iron head, drawn lying to the
  // upper-left and rotated to its heading like the arrow and the missile. One
  // drawing for the one tier that fires it, so no tier number on the key.
  bolt:        'assets/projectiles/Ballista_Turret_Bolt.png',
  // Heavy Bolt's, and the SHAFT is the same drawing to the pixel — the artist
  // added flames behind it and nothing else — so the two leave the machine from
  // exactly the same place and only the tail differs. See `heavyBolt` in
  // data/abilities.js for the anchors that keeps true.
  heavy_bolt:  'assets/projectiles/Ballista_Turret_Heavy_Bolt.png',
  rock_t1:     'assets/projectiles/Artillery_Rock_T1.png',
  rock_t2:     'assets/projectiles/Artillery_Rock_T2.png',
  rock_t3:     'assets/projectiles/Artillery_Rock_T3.png',
  // The arcane missile, one per tier. Named for the man who throws it, like the
  // figures above and unlike the rocks, because that is how the artist exported
  // them — including the spelling of "Missle", which is left alone: the code
  // bends to the artist's filenames, and renaming an upload only means renaming
  // it again after the next one.
  missile_t1:  'assets/projectiles/Soldiers_Priest_Arcane_Missle.png',
  missile_t2:  'assets/projectiles/Soldiers_Bishop_Arcane_Missle.png',
  missile_t3:  'assets/projectiles/Soldiers_Cardinal_Arcane_Missle.png',
  // The pope's, and the one missile in the family that is a different size: 125
  // source px against the other three's 92, which is 26 game px of it in the air
  // against 19.
  missile_t4:  'assets/projectiles/Pope_Arcane_Missle.png',
  // The plague doctor's flask, and the only projectile in the game thrown AT
  // the player's men rather than by them.
  flask:       'assets/projectiles/Enemies_Plague_Thug_Flask.png',
  // THE ENEMIES LOST THEIR TIERS. They were enemy_t1a and enemy_t1b, from an
  // upload that numbered them; the artist now names each one after what it is,
  // and the keys followed because the old ones had stopped being true — "t1a"
  // said the militia was the first of a ladder, and there is no ladder. A thug,
  // a giant thug and a plague thug are three creatures, not three ranks.
  //
  // Each has a Default and an Attack for the same reason the soldiers do; see
  // the note over the units above for which is which.
  thug:            'assets/enemies/Enemies_Thug_Default.png',
  thug_attack:     'assets/enemies/Enemies_Thug_Attack.png',
  giant:           'assets/enemies/Enemies_Giant_Thug_Default.png',
  giant_attack:    'assets/enemies/Enemies_Giant_Thug_Attack.png',
  // TWO ATTACK DRAWINGS EACH for the two enemies that fight at both distances,
  // and they answer different questions: `_melee` is what he does to the man
  // holding him, `_ranged` is what he does to the men he cannot reach. The
  // plague doctor shares ONE Default between the two — the artist drew him
  // standing the same way whichever he is about to do — and the archer does not,
  // because a bow held ready to loose and a bow held as a club are two stances.
  plague:          'assets/enemies/Enemies_Plague_Thug_Default.png',
  plague_attack:   'assets/enemies/Enemies_Plague_Thug_Melee_Attack.png',
  plague_throw:    'assets/enemies/Enemies_Plague_Thug_Ranged_Attack.png',
  archer:          'assets/enemies/Enemies_Archer_Thug_Melee_Default.png',
  archer_attack:   'assets/enemies/Enemies_Archer_Thug_Melee_Attack.png',
  archer_ready:    'assets/enemies/Enemies_Archer_Thug_Ranged_Default.png',
  archer_loose:    'assets/enemies/Enemies_Archer_Thug_Ranged_Attack.png',
  // Death poses. See assets/dead/README.md.
  //
  // The tier comes LAST in these names — Man_Dead_T1, not Man_T1_Dead — because
  // that is how they were exported. The code bends to the artist's filenames
  // rather than the other way round: renaming an upload only means renaming it
  // again after the next one.
  dead_thug:       'assets/dead/Enemies_Thug_Dead.png',
  dead_giant:      'assets/dead/Enemies_Giant_Thug_Dead.png',
  dead_plague:     'assets/dead/Enemies_Plague_Thug_Dead.png',
  dead_archer:     'assets/dead/Enemies_Archer_Thug_Dead.png',
  // The three soldiers' bodies, renamed by the artist to match their living
  // drawings — Soldiers_Spearman_Dead beside Soldiers_Spearman_Default — and
  // redrawn in the same upload, so every deadTrim and deadPivot below was
  // re-measured rather than carried across.
  dead_soldier_t1: 'assets/dead/Soldiers_Spearman_Dead.png',
  dead_soldier_t2: 'assets/dead/Soldiers_Pikeman_Dead.png',
  dead_soldier_t3: 'assets/dead/Soldiers_Swordsman_Dead.png',
  // And the paladin's body. A tier 4 leaves a corpse like everybody else — the
  // artist drew it in the same upload as his two living poses.
  dead_paladin:    'assets/dead/Paladin_Dead.png',
  // Blood, two of each so a hit or a death is never the same picture twice in a
  // row. All four in assets/effects now — the spatter used to sit with the arrows
  // and the pools with the corpses, which is where they happened to be uploaded.
  // Neither is a projectile or a body; put the next ones straight in here.
  blood_1:         'assets/effects/Blood_1.png',
  blood_2:         'assets/effects/Blood_2.png',
  blood_dead_1:    'assets/effects/Blood_Dead_1.png',
  blood_dead_2:    'assets/effects/Blood_Dead_2.png',
  // Earth thrown up where a rock lands, and two of them for the same reason
  // there are two of every blood file: a catapult fires every three seconds at
  // the same stretch of road, and one picture repeated is a stamp rather than an
  // event. See src/impacts.js.
  impact_1:        'assets/effects/Artillery_Impact_1.png',
  impact_2:        'assets/effects/Artillery_Impact_2.png',
  // The dust a plot throws up when something is built, upgraded or sold. It sits
  // with the other effects because that is what it is — a picture that fades —
  // and on the 1024 canvas the BUILDINGS use rather than the 512 the rest of this
  // folder uses, because it is sized against a building.
  build_smoke:     'assets/effects/Construction_Smoke.png',
  // What a flask leaves behind. It sits with the earth a rock throws up because
  // it is the same kind of thing — the mark a projectile makes where it landed —
  // even though one hangs in the air and this one lies flat. See src/impacts.js.
  spill:           'assets/effects/Enemies_Plague_Thug_Spill.png',
  // THE MARK DEADEYE PAINTS. It sits with the effects rather than in assets/ui
  // because it is drawn ON THE BOARD, over an enemy's head, at the board's own
  // SCALE — the rally flag is the only file that crosses the other way, and this
  // one never appears in a panel or on a button. It goes up a second before the
  // heavy ball is fired and comes down when the ball lands.
  target_lock:     'assets/effects/Musketeer_Target_Locked.png',
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
  glyph_bow:       'assets/ui/Archery_Icon.png',
  glyph_swords:    'assets/ui/Barracks_Icon.png',
  glyph_catapult:  'assets/ui/Artillery_Icon.png',
  // The monastery's button. Every family that has tiers now has a drawing, so
  // the `max` chevrons are the only vector glyph left that a player can actually
  // see — the rest are the fallback for a PNG that failed to decode.
  glyph_cross:     'assets/ui/Monastery_Icon.png',
  glyph_up:        'assets/ui/Upgrade_Icon.png',
  // The Musketeer Post's own icon, on the upgrade button of a Crossbow Tower. The
  // only tier in the game whose upgrade shows what it buys rather than an arrow —
  // see the `glyph` field on archery tier 4 in data/towers.js.
  glyph_musket:    'assets/ui/Musketeer_Post_Icon.png',
  // The Paladin Keep's, on the upgrade button of a Knight's Hall. The second tier
  // to bring its own picture, and the same one-word opt-in — see the `glyph` field
  // on barracks tier 4 in data/towers.js.
  glyph_keep:      'assets/ui/Paladin_Keep_Icon.png',
  // The Ballista Turret's, on the upgrade button of a Trebuchet. The third tier 4
  // to bring its own picture, and the same one-word opt-in — see the `glyph` field
  // on artillery tier 4 in data/towers.js.
  glyph_ballista:  'assets/ui/Ballista_Turret_Icon.png',
  // The Judgement Temple's, on the upgrade button of an Abbey. The fourth and
  // last of them — every family's top rung now shows what it buys — and the same
  // one-word opt-in, on monastery tier 4 in data/towers.js.
  glyph_temple:    'assets/ui/Judgement_Temple_Icon.png',
  // Sell_Icon renamed to Refund_Icon by the artist, and the key came with it —
  // `glyph_coin` said what the picture was, `glyph_refund` says what the button
  // does, and the button is now the thing that can change without the drawing
  // being redrawn. The menu act, the rate and the helper were renamed in step;
  // see src/menu.js.
  // THE FOUR ABILITY BUTTONS, and they are not glyphs. Every other icon in this
  // folder is a transparent mark drawn ON TOP of `btn_plate`; these four arrive as
  // the whole button — the artist drew each one on a blue disc of exactly the
  // plate's own size — so they are drawn INSTEAD of the plate rather than over it.
  // See the `plate` entries in src/data/ui.js for what that costs at the corners.
  ability_burst:   'assets/ui/Musketeer_Burst_Fire_Icon.png',
  ability_deadeye: 'assets/ui/Musketeer_Deadeye_Icon.png',
  ability_light:   'assets/ui/Paladin_Holy_Light_Icon.png',
  ability_slash:   'assets/ui/Paladin_Holy_Slash_Icon.png',
  // The Ballista Turret's two, on the same terms: the whole button, drawn on the
  // plate's own disc.
  ability_farshot: 'assets/ui/Ballista_Turret_Far_Shot_Icon.png',
  ability_heavy:   'assets/ui/Ballista_Turret_Heavy_Bolt_Icon.png',
  // The Judgement Temple's two, and they come in PAIRS: a button face like every
  // other ability, and a badge drawn on the BOARD over each tower the aura is
  // working on. The badge is the only feedback an aura has — nothing about the
  // temple itself changes when one is bought — so it is as much a part of the
  // ability as the number is.
  ability_wrath:     'assets/ui/Judgement_Temple_Holy_Wrath_Icon.png',
  ability_fortitude: 'assets/ui/Judgement_Temple_Divine_Fortitude_Icon.png',
  badge_wrath:       'assets/ui/Judgement_Temple_Holy_Wrath.png',
  badge_fortitude:   'assets/ui/Judgement_Temple_Divine_Fortitude.png',
  // THE MAXED BADGE, for the upgrade button of a tower that has none left. It
  // replaces the vector chevrons that stood in for `max` since the ring was
  // built — the last glyph in the menu that had never been drawn. Still dimmed
  // like any unavailable button: the picture says "this is the top of the
  // ladder" and the dimming says "so there is nothing to press".
  glyph_max:       'assets/ui/Maxed_Icon.png',
  // The reach stat, beside the sword on every card that shows one. The first
  // stat icon added since the heart and the sword, and it goes through the same
  // `ui` table and the same drawUi they do.
  stat_range:      'assets/ui/Range_Icon.png',
  glyph_refund:    'assets/ui/Refund_Icon.png',
  glyph_flag:      'assets/ui/Rally_Point_Icon.png',
  // The archer's three standing orders. They were vector glyphs drawn in
  // render.js — the last family button that had no artwork — and the vectors are
  // still there as the fallback every glyph has.
  glyph_aim_exit:   'assets/ui/Aim_Near_Exit_Icon.png',
  glyph_aim_tough:  'assets/ui/Aim_Most_Health_Icon.png',
  glyph_aim_ranged: 'assets/ui/Aim_Ranged_Enemies_Icon.png',
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
  // The encyclopedia's two COST icons, and they are costs in two currencies.
  //
  // A stack of coins for what a tier costs to build — paired on its row with the
  // refund button's own drawing for what it gives back, so the number in the
  // book and the number on the button you press are the same picture twice. A
  // BROKEN heart for what letting an enemy past costs you.
  //
  // The broken heart is the reason this pair exists rather than reusing the
  // dashboard's gold and lives. On an enemy card the coin means a bounty and the
  // heart means damage to the keep — the opposite sense from the same two icons
  // in the dashboard, where they are what you HAVE. Two drawings that say "cost"
  // carry that without a caption.
  stat_gold_cost:  'assets/ui/Gold_Cost_Icon.png',
  stat_life_cost:  'assets/ui/Life_Cost_Icon.png',
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
  // The third, and the first with two roads that never meet. Same pipeline
  // again — there is nothing special about a map with more than one road in
  // this file, because a route is just a list of waypoints.
  map03:       'assets/map/Map_3_base.svg',
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
