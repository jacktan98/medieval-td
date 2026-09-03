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
// assets/dead, every projectile in assets/projectiles, every ability button in
// assets/abilities, every status mark in assets/status. So the catapult's crewman
// stands with the archers and the spearmen, and its rock flies beside the arrow.
//
// assets/ui is what is left over once that rule has been applied, and it is the
// right leftover: the HUD, the menu plates, the family glyphs, the two aura
// badges — the furniture of the interface rather than anything in the world.
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
  // a tier — `def.sprite` off whichever fourth rung it is — which is the same
  // split every unit file has.
  //
  // `t4` AND `t4b` ARE NOT AN ORDER. The Crossbow Sentry is listed first in the
  // archery ladder now, at the owner's ask, and these two keys did not move with
  // it: a key names a file and the array names the sequence, and confusing the two
  // is how a rename turns into a re-order nobody asked for.
  archery_t4:  'assets/towers/archery/Musketeer_Post.png',
  // The ladder's SECOND tier 4 BY KEY, and the first key that is a letter rather
  // than a number. There is no tier 5 to call it: a Crossbow Tower buys either of
  // these two, so they are 4 and 4b rather than 4 and 5.
  archery_t4b: 'assets/towers/archery/Crossbow_Sentry_Tower.png',
  barracks_t1: 'assets/towers/barracks/Barracks_Tower_T1.png',
  barracks_t2: 'assets/towers/barracks/Barracks_Tower_T2.png',
  barracks_t3: 'assets/towers/barracks/Barracks_Tower_T3.png',
  // Tier 4, on the same terms as the archery ladder's: the artist uploaded it as
  // Paladin_Keep and it was filed with the other three barracks buildings, while
  // the KEY stays tiered because the code reaches it through `barracks[3].sprite`.
  barracks_t4: 'assets/towers/barracks/Paladin_Keep.png',
  // The ladder's SECOND tier 4, on the same 4/4b naming the archery fork uses:
  // a Knight's Hall buys either of these, so neither owns the number.
  barracks_t4b: 'assets/towers/barracks/Assassin_Guild.png',
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
  // TIER 4, THE BALLISTA TURRET, and it was the first building in the game drawn
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
  // AND THE SAME THREE IN IRON, which is what Reinforced Tension buys. Only the material
  // changes — every trim is identical to the timber frame's, to the pixel — so the
  // ability swaps which three files the beat loop draws and nothing else moves.
  artillery_t4_tension:        'assets/towers/artillery/Ballista_Turret_Default_Reinforced_Tension.png',
  artillery_t4_reload_tension: 'assets/towers/artillery/Ballista_Turret_Reload_Reinforced_Tension.png',
  artillery_t4_fire_tension:   'assets/towers/artillery/Ballista_Turret_Fire_Reinforced_Tension.png',
  // THE LADDER'S SECOND TIER 4, THE CANNON OUTPOST, on the same 4/4b naming the
  // archery and barracks forks use: a Trebuchet buys either of these, so neither
  // owns the number.
  //
  // Four files again, and the split is the ballista's for the ballista's reason —
  // stone that never moves, a machine on top that turns. It is the SAME stone: the
  // two turret PNGs differ in 23,960 pixels inside one 134x241 box, and every one
  // of them is the banner, recoloured from the ballista's blue to this one's
  // purple with a cannon on it in place of a bolt. Everything else is identical to
  // the byte, which is why data/towers.js can hand this tier the ballista's
  // measured ground point and merlon rather than measuring them twice.
  //
  // They are still two keys and two files. A shared key would say the two towers
  // are the same drawing, and the moment the artist recolours one banner again
  // that would be a lie nobody would notice until it was on screen.
  artillery_t4b_base:   'assets/towers/artillery/Cannon_Outpost_Tower.png',
  artillery_t4b:        'assets/towers/artillery/Cannon_Outpost_Default.png',
  artillery_t4b_reload: 'assets/towers/artillery/Cannon_Outpost_Reload.png',
  artillery_t4b_fire:   'assets/towers/artillery/Cannon_Outpost_Fire.png',
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
  // Tier 4, the High Altar: the same open belfry in stone, one storey
  // taller, with a shingled roof over it and a cross on the point. It is the
  // tallest drawing in the game at 165 game px against the tier 2 and 3 towers'
  // 142.
  monastery_t4: 'assets/towers/monastery/High_Altar.png',
  // Tier 4's OTHER rung, the Judgement Temple: the same belfry again, six game px
  // shorter than the altar, and the first building in the game that carries two
  // figures rather than one. See `pair` in data/towers.js.
  monastery_t4b: 'assets/towers/monastery/Judgement_Temple.png',
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
  // The other tier 4 man, on the same terms: named for himself rather than for a
  // tier, because the ladder has two fourth rungs and neither owns the number.
  // The other barracks tier 4's man, named for himself like every other tier 4.
  assassin:           'assets/units/Assassin_Default.png',
  assassin_attack:    'assets/units/Assassin_Attack.png',
  // His two ability poses. The first soldier in the game to have any beyond the
  // paladin's, and the first to have one for a thrown weapon.
  assassin_knife_throw:  'assets/units/Assassin_Knife_Throw.png',
  assassin_sneak_attack: 'assets/units/Assassin_Sneak_Attack.png',
  crossbowman:        'assets/units/Crossbowman_Default.png',
  crossbowman_attack: 'assets/units/Crossbowman_Attack.png',
  // AND THE SAME TWO IN STEEL, which is what Reinforced Tension buys — the same
  // trick the ballista's three frames play, and it works for the same reason:
  // only the material changes, so both trims are identical to the timber poses'
  // to the pixel and both shadows land on the same source pixel. The ability
  // swaps which two files are drawn and the man does not move.
  crossbowman_steel:        'assets/units/Crossbowman_Default_Reinforced_Tension.png',
  crossbowman_steel_attack: 'assets/units/Crossbowman_Attack_Reinforced_Tension.png',
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
  // to. Holy Light is the kneel-and-heal; Blinding Strike is the tenth blow.
  paladin_holy_light: 'assets/units/Paladin_Holy_Light.png',
  paladin_blinding_strike: 'assets/units/Paladin_Blinding_Strike.png',
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
  // The monk, and TWO of him stand in a Judgement Temple. One pair of drawings
  // for both — they are the same man twice, so a second set of files would be the
  // same picture under another name and one more thing to keep in step.
  //
  // HIS ATTACK POSE IS A WIND-UP rather than a follow-through, which is the one
  // way he differs from every other figure here. An archer's Attack is the arrow
  // leaving; a monk's is the blast being gathered, so it is shown BEFORE the shot
  // and the resting pose is what follows it. See `pair` in data/towers.js.
  monk:               'assets/units/Monk_Default.png',
  monk_attack:        'assets/units/Monk_Attack.png',
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
  // The other tier 4's gunner, on the same terms and named for himself rather
  // than for a tier, because the ladder has two fourth rungs now and neither owns
  // the number. He is drawn into all three cannon frames like every crewman below
  // him; this file exists so the info box and the encyclopedia have a face.
  cannoneer:   'assets/units/Cannoneer.png',
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
  // The Crossbow Sentry's quarrel. An arrow's shape of drawing — flat, nose left
  // — but its own file and its own `kind`, which is what gives it its own shot
  // and kill lines. See `quarrel` in data/towers.js.
  quarrel:     'assets/projectiles/Crossbow_Sentry_Bolt.png',
  // The assassin's knife, and the only thing in this list a MAN throws rather
  // than a building. Same shape of drawing as the two above — flat, point left —
  // at a third the arrow's length. See `knife` in data/towers.js.
  assassin_knife: 'assets/projectiles/Assassin_Knife.png',
  // And the one a Sneak Attack throws — a second drawing of the same weapon, so
  // the player can see which knives are the heavy ones. See `sneakKnife` in
  // data/towers.js for why it inherits everything but the picture.
  assassin_knife_sneak: 'assets/projectiles/Assassin_Knife_Sneak_Attack.png',
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
  // The Cannon Outpost's ball, and the SMALLEST projectile the artillery family
  // throws: 48x48 source against the three rocks' 60x48, 72x72 and 88x88. That is
  // the drawing being right rather than the tier being weak — a cast iron ball is
  // a dense little thing and a trebuchet stone is a boulder, and this one hits
  // nearly twice as hard as the boulder does. No tier number on the key, like the
  // bolt beside it: one drawing for the one tier that fires it.
  cannonball:  'assets/projectiles/Cannonball.png',
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
  // The monk's, and the smallest missile in the family: a 12 x 5 comet against a
  // priest's 19 x 4 dart and the pope's 26 x 5. Two men throwing small blasts is
  // what a Judgement Temple looks like, so the drawing says so.
  monk_shot:       'assets/projectiles/Monk_Magic_Shot.png',
  // AND THE SAME COMET IN THREE OTHER COLOURS, one per combination of the two
  // things a Judgement Temple can be taught. This is the first tower in the game
  // whose ORDINARY shot changes picture — every other re-skin in here belongs to
  // a special that fires once every few reloads — so there are four drawings and
  // no fourth ability: plain, slowed, strengthened, and both at once.
  //
  // Which one is fired is decided by what the tower has bought, in ammoOf in
  // src/towers.js, off the `shot` and `shotWith` fields in data/abilities.js.
  monk_shot_slow:     'assets/projectiles/Monk_Magic_Shot_Slowed_Pulse.png',
  monk_shot_strength: 'assets/projectiles/Monk_Magic_Shot_Inner_Strength.png',
  monk_shot_both:     'assets/projectiles/Monk_Magic_Shot_Inner_Strength_Slowed_Pulse.png',
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
  tough:           'assets/enemies/Enemies_Tough_Thug_Default.png',
  tough_attack:    'assets/enemies/Enemies_Tough_Thug_Attack.png',
  giant:           'assets/enemies/Enemies_Giant_Thug_Default.png',
  giant_attack:    'assets/enemies/Enemies_Giant_Thug_Attack.png',
  // THE THIRD DRAWING NOBODY ELSE HAS. Every other figure in this game is a
  // Default and an Attack — what it looks like, and what it looks like doing its
  // thing. The Blocker has a stance as well: a man behind a raised shield, which
  // is neither of those, because it is not something he DOES to anybody. It is
  // what he is while he is being shot at. See `guard` on blocker_inf in
  // data/waves.js and enemyStance in render.js.
  blocker:         'assets/enemies/Enemies_Blocker_Thug_Default.png',
  blocker_attack:  'assets/enemies/Enemies_Blocker_Thug_Attack.png',
  blocker_guard:   'assets/enemies/Enemies_Blocker_Thug_Defend.png',
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
  dead_tough:      'assets/dead/Enemies_Tough_Thug_Dead.png',
  dead_blocker:    'assets/dead/Enemies_Blocker_Thug_Dead.png',
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
  dead_assassin:   'assets/dead/Assassin_Dead.png',
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
  // AND THE SAME TWO ON FIRE, which is what Fiery Shot throws up. Two again, and
  // picked between at random for the same reason — a burning ball lands every 15
  // seconds, so one picture repeated would be noticed sooner here than anywhere.
  //
  // The artist drew them OVER the plain ones: each trims to the same rect as its
  // sibling, to the pixel, so the fiery pair needs no measurements of its own and
  // src/impacts.js hands them the plain pair's. A recolour, not a redraw.
  fiery_1:         'assets/effects/Artillery_Fiery_Impact_1.png',
  fiery_2:         'assets/effects/Artillery_Fiery_Impact_2.png',
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
  // The Cannon Outpost's, beside it. Both artillery fourth rungs name their own
  // now that the ladder forks — which is not a nicety: two upgrade buttons
  // wearing the same generic arrow would be a coin toss.
  glyph_cannon:    'assets/ui/Cannon_Outpost_Icon.png',
  // The High Altar's, on the upgrade button of an Abbey. The fourth and
  // last of them — every family's top rung now shows what it buys — and the same
  // one-word opt-in, on monastery tier 4 in data/towers.js.
  glyph_altar:    'assets/ui/High_Altar_Icon.png',
  // And the fork's other face, on the same upgrade button. Two hands raised in
  // prayer: the monastery is the fourth family to fork and the last, so this is
  // the eighth and final tier 4 glyph.
  glyph_temple:    'assets/ui/Judgement_Temple_Icon.png',
  // Sell_Icon renamed to Refund_Icon by the artist, and the key came with it —
  // `glyph_coin` said what the picture was, `glyph_refund` says what the button
  // does, and the button is now the thing that can change without the drawing
  // being redrawn. The menu act, the rate and the helper were renamed in step;
  // see src/menu.js.
  // --- THE ABILITY BUTTONS, in assets/abilities ---------------------------------
  //
  // A FOLDER OF THEIR OWN, at the owner's ask, and it is the same rule the rest of
  // this file already follows: a folder is what a thing IS. These are not glyphs
  // and never were — every other icon in assets/ui is a transparent mark drawn ON
  // TOP of `btn_plate`, while each of these arrives as the whole button, drawn by
  // the artist on a disc of exactly the plate's own size, and is drawn INSTEAD of
  // the plate. See the `plate` entries in src/data/ui.js for what that costs at
  // the corners.
  //
  // They keep their data/ui.js entries and their `ability_` keys — only the
  // FOLDER moved. tools/trim.mjs finds them by asking assets.js where each key's
  // file actually is rather than by matching on a path prefix, which is what let
  // fourteen files move without a single check going blind.
  //
  // The two High Altar BADGES stay in assets/ui, which is a line drawn on
  // purpose and not an oversight: they are not buttons and never appear in the
  // encyclopedia — they are marks the renderer hangs over a tower on the board.
  ability_burst:   'assets/abilities/Musketeer_Post_Burst_Fire_Icon.png',
  ability_deadeye: 'assets/abilities/Musketeer_Post_Deadeye_Icon.png',
  ability_light:   'assets/abilities/Paladin_Keep_Holy_Light_Icon.png',
  ability_blinding:   'assets/abilities/Paladin_Keep_Blinding_Strike_Icon.png',
  // The Ballista Turret's two, on the same terms: the whole button, drawn on the
  // plate's own disc.
  ability_ballista_tension: 'assets/abilities/Ballista_Turret_Reinforced_Tension_Icon.png',
  // The Crossbow Sentry's two. Its Reinforced Tension is a second entry rather
  // than a shared one because the icon is a picture of ITS weapon — see the note
  // on the ids in data/abilities.js.
  ability_sentry_tension:  'assets/abilities/Crossbow_Sentry_Reinforced_Tension_Icon.png',
  ability_swift:           'assets/abilities/Crossbow_Sentry_Swift_Reload_Icon.png',
  ability_heavy:   'assets/abilities/Ballista_Turret_Heavy_Bolt_Icon.png',
  // The Assassin Guild's two — the first abilities in the game that change what a
  // SOLDIER does rather than what a building does.
  ability_knife: 'assets/abilities/Assassin_Guild_Knife_Throw_Icon.png',
  ability_sneak: 'assets/abilities/Assassin_Guild_Sneak_Attack_Icon.png',
  // The High Altar's two, and they come in PAIRS: a button face like every
  // other ability, and a badge drawn on the BOARD over each tower the aura is
  // working on. The badge is the only feedback an aura has — nothing about the
  // altar itself changes when one is bought — so it is as much a part of the
  // ability as the number is.
  ability_wrath:     'assets/abilities/High_Altar_Holy_Wrath_Icon.png',
  ability_fortitude: 'assets/abilities/High_Altar_Divine_Fortitude_Icon.png',
  badge_wrath:       'assets/ui/High_Altar_Holy_Wrath.png',
  badge_fortitude:   'assets/ui/High_Altar_Divine_Fortitude.png',
  // The Cannon Outpost's two, and the first pair to arrive after the folder
  // existed — so they were uploaded to assets/ui like every icon before them and
  // moved here with the rest.
  ability_cannon_swift: 'assets/abilities/Cannon_Outpost_Swift_Reload_Icon.png',
  ability_fiery:        'assets/abilities/Cannon_Outpost_Fiery_Shot_Icon.png',
  // The Judgement Temple's two. Named for their tower like every other pair —
  // they arrived as Slowed_Pulse_Icon and Inner_Strength_Icon and were renamed
  // with the rest when the artist redrew all sixteen and dropped the `_Icon`
  // suffix. Nothing in the game reads a filename; the key below is the binding.
  ability_pulse:    'assets/abilities/Judgement_Temple_Slowed_Pulse_Icon.png',
  ability_strength: 'assets/abilities/Judgement_Temple_Inner_Strength_Icon.png',

  // --- THE STATUS MARKS, in assets/status ---------------------------------------
  //
  // What is happening TO a figure, drawn over its health bar. Burnt and Poisoned
  // are the first two; the folder exists so stunned, slowed and whatever else
  // follows have somewhere to land, which is what the owner asked for.
  //
  // Their own folder rather than assets/ui for the reason the abilities have one:
  // a status mark is not part of the interface. It is a thing drawn on the BOARD,
  // over a man, that moves when he moves — much nearer a health bar than a button.
  //
  // Keyed `status_` and read through STATUS in src/data/status.js, which is the
  // one place a status's picture, its colour and its rules are written down.
  status_burnt:    'assets/status/Burnt_Status.png',
  status_poisoned: 'assets/status/Poisoned_Status.png',
  // AND SLOWED, which is the third and the first that does not hurt. It arrived
  // with the Judgement Temple's Slowed Pulse — the folder was made for exactly
  // this, and the note above named it two abilities before it existed.
  //
  // IT IS THE FIRST MARK WIDER THAN IT IS TALL, two chevrons side by side against
  // a standing flame and a column of droplets, and that costs a line in
  // data/ui.js: it is fitted into the STATUS_H box rather than drawn to that
  // HEIGHT, or it would be half again as wide as the other two and blown up past
  // what its 34 source px can carry. See the note there.
  status_slowed:   'assets/status/Slowed_Status.png',
  // THE MAXED BADGE, for the upgrade button of a tower that has none left. It
  // replaces the vector chevrons that stood in for `max` since the ring was
  // built — the last glyph in the menu that had never been drawn. Still dimmed
  // like any unavailable button: the picture says "this is the top of the
  // ladder" and the dimming says "so there is nothing to press".
  glyph_max:       'assets/ui/Maxed_Icon.png',
  // The Crossbow Sentry's own upgrade button, beside the Musketeer Post's. Two
  // tier 4s on one ring means neither can wear the generic arrow.
  glyph_sentry:    'assets/ui/Crossbow_Sentry_Icon.png',
  // The Assassin Guild's, beside the Paladin Keep's. The barracks forks now too,
  // so both of its fourth rungs need a face of their own.
  glyph_assassin:  'assets/ui/Assassin_Guild_Icon.png',
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
  // THE ATTACK ICONS, AND THERE ARE TWO OF THEM NOW. `Damage_Icon` became
  // `Physical_Damage_Icon` when magic damage arrived — a sword is not "damage" any
  // more, it is one of two kinds, and a file named for the general case would have
  // to be the picture of both.
  //
  // WHICH ONE A CARD SHOWS is decided by the def's `damageType`, not by its family:
  // see attackIcon in src/select.js. The monastery is the family that does magic
  // today, and a barracks tower that hired a mage tomorrow would show the wand
  // without a line changing here.
  stat_damage:     'assets/ui/Physical_Damage_Icon.png',
  stat_damage_magic: 'assets/ui/Magic_Damage_Icon.png',
  // AND THE TWO ARMOURS. Same shield twice, in the two colours, because the two
  // ranks are read side by side on a card and a player has to tell at a glance
  // which of them a shot is up against.
  stat_armour:       'assets/ui/Physical_Armor_Icon.png',
  stat_armour_magic: 'assets/ui/Magic_Armor_Icon.png',
  // AND THE SAME SHIELD BROKEN, for what a Cannon Outpost or a High Altar does to
  // it. A pierced shield rather than a new symbol is the right drawing: `pierce`
  // is not a fourth kind of damage, it is a number of ranks taken off the plate,
  // and the icon says so by being the plate with a hole in it.
  // THE TICK, on the second press of anything that spends gold. See NEEDS_CONFIRM
  // in src/menu.js — a purchase is armed by the first press and made by the second,
  // and this is what the button wears in between.
  glyph_confirm:   'assets/ui/Confirm_Icon.png',
  stat_pierce:       'assets/ui/Pierce_Physical_Armor_Icon.png',
  stat_pierce_magic: 'assets/ui/Pierce_Magic_Armor_Icon.png',
  // And how wide a blast is. Artillery's whole answer to a crowd, and the one
  // number on a siege card that a player cannot infer from watching one shot.
  stat_splash:       'assets/ui/Area_of_Damage_Icon.png',
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

// --- CACHE BUSTING, FOR THE ARTWORK -----------------------------------------------
//
// THE MODULES HAVE HAD THIS SINCE THE FIRST DEPLOY AND THE PICTURES NEVER DID.
//
// index.html rewrites every `src/*.js` URL through a versioned import map, because
// GitHub Pages serves static files with max-age=600 and an edit to render.js was
// otherwise invisible for ten minutes. Every PNG and every clip in this file went
// on being fetched at its plain path — so re-uploading a drawing and reloading the
// game showed the OLD drawing, for up to ten minutes, and longer wherever the
// browser applied a heuristic of its own.
//
// That is a bad failure to have in an art-driven game: the artist's loop is upload,
// reload, look. It cost the owner a round of "I can't seem to see the changes".
//
// THE SAME STAMP THE MODULES USE, read off the page rather than computed again, so
// a reload gets one version for everything it loads instead of two that can differ
// across a minute boundary. See the import-map block in index.html.
//
// APPENDED AT LOAD RATHER THAN BAKED INTO `paths`, and that is the half that
// matters: half a dozen tools read `paths` to find files ON DISK, and a query
// string is not part of a filename. The version belongs to the fetch.
const stamp = typeof window !== 'undefined' && window.__stamp;
const versioned = src => stamp ? `${src}?v=${stamp}` : src;

// --- WHAT AN ABILITY'S DISC IS MADE OF --------------------------------------------
//
// THE CONFIRM TICK WEARS THE BUTTON'S OWN FACE, at the owner's ask: "for the
// abilities, change the background colour to the background colour of the
// abilities — e.g. for Blinding Strike, use the same 969696", and then "please add
// the black outline of the disc to ensure consistency". An ability's button is one
// picture, disc and rim and all, so a flat tinted circle in its place was the right
// colour with the edge filed off — beside fifteen buttons that all have one.
//
// SAMPLED FROM THE FILE RATHER THAN WRITTEN DOWN. Two numbers per ability in
// data/ui.js would be thirty-two more to re-paste after a re-export, and this
// project has just spent a commit on trims that went stale exactly that way. A
// colour and a width read off the artwork cannot disagree with the artwork.
//
// THE FILL is the MEDIAN of a ring of 64 points at 0.8 of the disc's radius, per
// channel. The centre is the drawing rather than the background, and a mean would
// be dragged by whatever part of the drawing reaches the edge. Measured across the
// sixteen at three radii, every disc is flat to the byte — 0.72, 0.80 and 0.86 all
// return the same colour — so the exact ring is not delicate. Blinding Strike comes
// back rgb(150,150,150), which is #969696 exactly.
//
// THE RIM is the run of near-black pixels inward from the disc's edge along its
// centre line, taken from both sides and returned as a FRACTION of the trim so the
// caller can scale it to whatever size it is drawing. All sixteen measure 6 source
// pixels, which is 1.94 at the 60px the menu draws them — the artist drew them to
// one spec, and this reads that spec rather than repeating it.
//
// CACHED ON FIRST ASK, because this reads pixels back off a canvas and the menu is
// drawn every frame. Never cached before the image has loaded: a miss returns null
// and the caller falls back to the cream plate for that frame rather than for the
// session.
const faces = {};

export function discFace(key, trim) {
  if (key in faces) return faces[key];
  const img = art[key];
  if (!img) return null;

  const [sx, sy, sw, sh] = trim;
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const px = g.getImageData(0, 0, sw, sh).data;

  const at = (x, y) => (y * sw + x) * 4;
  const mid = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; };

  // The fill, off a ring inside the rim.
  const cx = sw / 2, cy = sh / 2, r = Math.min(sw, sh) / 2 * 0.8;
  const chan = [[], [], []];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const o = at(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r));
    if (px[o + 3] < 200) continue;
    for (let k = 0; k < 3; k++) chan[k].push(px[o + k]);
  }
  if (!chan[0].length) return null;

  // And the rim, inward from both edges of the centre line. Stops at the first
  // pixel that is not near-black, which is where the disc's own colour begins.
  const row = Math.round(cy);
  const runs = [];
  for (const [from, step] of [[0, 1], [sw - 1, -1]]) {
    let x = from, n = 0;
    while (x >= 0 && x < sw) {
      const o = at(x, row);
      if (px[o + 3] < 128) { x += step; continue; }
      if ((px[o] + px[o + 1] + px[o + 2]) / 3 >= 70) break;
      n++; x += step;
    }
    if (n) runs.push(n);
  }

  faces[key] = {
    fill: `rgb(${mid(chan[0])}, ${mid(chan[1])}, ${mid(chan[2])})`,
    // A FRACTION OF THE TRIM, not a pixel count, so this survives a re-export on a
    // bigger canvas: the artist doubling the file doubles the outline with it and
    // the drawn rim stays where it was.
    rim: runs.length ? mid(runs) / sh : 0
  };
  return faces[key];
}

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
    img.src = versioned(src);
  }));

  return Promise.all(jobs).then(() => {
    if (absent.length) console.info('Not drawn yet:', absent.join(', '));
  });
}
