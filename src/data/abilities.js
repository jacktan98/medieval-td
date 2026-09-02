import { bolt, knife, sneakKnife, cannonball, monkShot } from './towers.js';

// ABILITIES: what a tier 4 tower can be taught, once it is standing.
//
// A ladder ends at tier 4 and the Upgrade button goes dead — so a Musketeer Post
// or a Paladin Keep is a plot with nothing left to spend on, however the game is
// going. An ability is the third thing gold can buy: not a rung and not a second
// tower, but a change to how the one you have fights.
//
// TIER 4 ONLY, and that is the design rather than a limitation of the code. The
// list a tier offers is the `abilities` field on its def, so any tier could carry
// one; nothing below tier 4 does, because an ability is what a topped-out ladder
// spends on and a tier 2 tower has an upgrade to buy instead.
//
// BOUGHT PER TOWER, not per family. Two Musketeer Posts on the same map are two
// separate purchases, and the one you taught Deadeye keeps it while the other does
// not. That is the same rule every other purchase in this game follows — gold buys
// a thing on a plot — and it is what makes two of the same tower worth having.
//
// ONE MECHANISM, AND MOST OF THE 16 ARE BUILT FROM IT. It is worth naming the
// parts, because the ones that do not use them say so by what they carry instead:
//
//   `every`      one action in N is the special one. The musketeer's shots and the
//                paladin's blows are both counted, and the count is per figure.
//                EACH ABILITY KEEPS ITS OWN CYCLE — Burst Fire's sixth shot and
//                Deadeye's eleventh are separate rhythms on the same counter, and
//                on the rare shot where both land the rarer one wins.
//   `hold`       how long the special POSE stays up afterwards. It blocks the next
//                action as well as showing, which is invisible on the musketeer —
//                his reload is 2.4s and the longest hold is 2 — and would be very
//                visible on the paladin, whose swing is 0.80s. NULL means "his own
//                attack time", which is the one value that costs him nothing: the
//                pose is up for exactly one beat of fighting and the next blow
//                lands on schedule. Only units.js can resolve that, because only
//                the man knows how fast he swings.
//   `pose`       the drawing to show while holding, or nothing to hold the man's
//                own Attack pose. Burst Fire is the one that holds Attack: the
//                artist asked for it to use the pictures the tower already has.
//   `cue`        a Category B sound, played every time the special fires. Three of
//                the four have one; Burst Fire makes the musket's own noise three
//                times, which is what a burst sounds like.
//   `detail`     the paragraphs shown beside the picture when the encyclopedia
//                card is tapped open. The CARD itself carries no prose — it is a
//                name, the tower that teaches it and a price, exactly like a tower
//                card — so this is where the explaining goes. Blank lines separate
//                paragraphs; render.js wraps it.
//
// Holy Light is the one that does not fit that shape, and it is not bent to fit:
// it is a reaction to being nearly dead rather than a beat in a rhythm, so it
// carries `below`, `heals`, `seconds` and `refresh` instead of `every`.

// EVERY ONE COSTS THE SAME, at the artist's request, and the number is written
// once here rather than four times below. 150 against a Musketeer Post's own 200
// is three quarters of the tower again on top of the 500 the ladder to it cost —
// so a first ability is roughly the price of a second Crossbow Tower somewhere
// else, which is the comparison a player actually makes.
export const ABILITY_COST = 150;

// THE ORDER OF THIS ARRAY IS THE ORDER THE PLAYER SEES, in two places at once, so
// it is a design decision rather than a list that grew:
//
//   THE ENCYCLOPEDIA lays a family's abilities DOWN its own column, in this order.
//   THE RADIAL MENU puts a tower's own two on the north-west and north-east arms,
//   in the order its `abilities` list names them.
//
// TWO RULES DECIDE IT, both the owner's:
//
//   FAMILIES IN BUILD-MENU ORDER — archery, barracks, artillery, monastery — and
//   inside archery the Crossbow Sentry before the Musketeer Post, which is the
//   ladder's own order in data/towers.js.
//
//   LIGHTER DISC FIRST. Each tower's pair is arranged so the button drawn on the
//   lighter background sits above (and to the left of) the darker one.
//
// The second is MEASURED rather than remembered: `node tools/abilities.mjs` reads
// the plate colour out of each PNG and fails if a pair is the wrong way round, and
// it checks the tier's own list against this array so the ring and the page can
// never disagree.

// The Musketeer's second ball: the same lead going the same speed, drawn four
// times the size with a flame behind it.
//
// A KIND OF ITS OWN rather than a second `bullet`, and that buys two rows in two
// tables: FIRING in src/towers.js gives it its own report, and the kill cue in
// src/enemies.js sends it to the musket's line anyway — a man shot dead is a man
// shot dead, whichever ball did it. Sharing `kind` with the ordinary ball would
// have meant a flag on the ammo instead, and "what does this sound like leaving"
// already has exactly one answer per kind.
//
// `grip` 0.10, measured the same way the ordinary ball's 0.12 was: the column
// where the rounded nose first reaches half its own height, which is 5px into a
// 48px trim here and 2px into a 20px one there. The two anchors are the same
// point on the same nose, drawn at different sizes.
export const deadeyeBall = {
  kind: 'deadeye',
  sprite: 'deadeye_bullet',
  trim: [246, 246, 48, 20],
  faces: -1,
  grip: 0.10,
  // The ordinary ball's speed, and it has to BE that number rather than happen to
  // match it: this is the same musket firing. A special shot that flew slower than
  // the plain one would read as the ability being a downgrade in the one way the
  // player can actually see. It went 520 -> 560 with `bullet` — see the note there
  // — and this is the shot that most needs it, since Deadeye ignores the ring and
  // can be fired clear across the board.
  speed: 560,
  fireSound: true,
  landSound: false
};

// HEAVY BOLT'S AMMUNITION: the ordinary bolt with the tail on fire.
//
// SPREAD FROM `bolt` rather than written out, because the shaft is the same
// drawing to the pixel — measured, not assumed: the tan of the shaft runs from
// source (198, 310) to (333, 180) in both files, and the artist added flames
// behind it and nothing else. So everything about how it flies is inherited and
// only the picture, its box and its anchors are restated.
//
// `hold` is the SAME SOURCE PIXEL as the plain bolt's, (188.1, 320.5), which is
// just inside the head — re-expressed against a trim that grew 28px at the back
// for the flames. That is what makes the two leave the machine from exactly the
// same place: swap the drawing mid-flight and nothing would move.
//
// `clear` is inherited untouched for the same reason. It is the distance from the
// anchor to the back of the SHAFT, so the shaft's end sits on the mouth and the
// flames stream back over the bow, which is what a bolt that has just been loosed
// on fire should look like.
//
// `kind` is inherited too, and that is deliberate rather than an oversight: a man
// killed by this is killed by a ballista, so he gets the ballista's kill line, and
// the shot uses the ballista's own report. What it does NOT inherit is how loud —
// see `fireGain`.
export const heavyBolt = {
  ...bolt,
  sprite: 'heavy_bolt',
  // NOTHING BUT THE SPRITE KEY, and that is a finding rather than a tidy-up.
  //
  // This entry used to restate three numbers — `trim` [172, 148, 196, 190],
  // `hold` and `grip` — because the flames spread the drawing 28px taller and
  // wider than the plain bolt, so the same source pixel sat at a different
  // fraction of a different box. The artist has redrawn it to match the ability
  // button, and the new file trims to [172, 174, 168, 164]: the PLAIN BOLT'S BOX,
  // to the pixel.
  //
  // So the three overrides are gone and the spread above supplies them. Measured
  // before deleting rather than assumed: the shaft's hold point is source
  // (188.1, 320.5) in both files, which against the new trim is 0.0960, 0.8930 —
  // the plain bolt's own 0.096, 0.893 to four places. `clear` was already
  // inherited and still is.
  //
  // `node tools/trim.mjs` reads the box off the file, so if the flames ever grow
  // again this stops being true out loud rather than quietly drawing the bolt off
  // the rail.
  // AND IT THROWS UP EARTH WHERE IT LANDS, which an ordinary bolt does not. The
  // artist's note: the heavy bolt hits the ground like the tiers below it do. A
  // catapult's rock has carried `impact` since it arrived — one of two drawings
  // of kicked-up earth, picked at random so a machine firing at the same stretch
  // of road is an event rather than a stamp — and this is the same flag on the
  // same land() branch, so nothing new draws it.
  //
  // It is the only thing on the board that says a HEAVY bolt landed. Every other
  // half of this ability is at the other end of the flight: the burning shaft
  // leaves the rail, the report is louder, and by the time it arrives the player
  // is looking at the target rather than at the machine.
  impact: true,
  // Louder than an ordinary bolt, at the artist's request, and only for this shot.
  // The same clip played harder rather than a second recording — see `level` in
  // play() in src/audio.js, the mechanism the pope's missile brought in.
  //
  // 2.3 RATHER THAN 1.4, and the change is in the ORDINARY bolt rather than in
  // this one: `ballista_shot` now carries a GAIN of 0.6 in src/audio.js, so the
  // plain shot dropped 4.4dB and this multiplier was raised to leave the heavy one
  // exactly where it was. The pair is 7.2dB apart now instead of 2.9dB, which is
  // what the owner asked for — the loud one obvious rather than merely louder.
  // Net x0.59 after levelling, on a file that peaks at 1.01, so there is no
  // headroom problem: the two numbers move together and always have to.
  fireGain: 2.3
};

// FIERY SHOT'S AMMUNITION: the same iron ball, lit.
//
// SPREAD FROM `cannonball` and it restates almost nothing, which is the point. The
// artist drew no burning ball — there is one drawing of a cannonball and it is a
// 10px circle — so this fires the same picture. Everything the player can tell
// apart is at the two ends of the flight: it leaves louder, and where it lands the
// earth comes up on fire and stays on the men it caught.
//
// That is a deliberate reading of what the ability IS. Heavy Bolt is a shot you
// watch go — a burning shaft crossing the board — because a ballista's bolt is
// 42px long and there is something to see. A cannonball is a dot; dressing the dot
// would be four frames of work nobody would notice at 480px a second. So the
// spectacle is put where the eye already is, which is where it lands.
//
// `kind` IS INHERITED, exactly as the heavy bolt inherits the ballista's: a man
// killed by this is killed by a cannon, so he answers with the cannon's kill line,
// and the shot goes out through the cannon's own row in the FIRING table.
export const fieryBall = {
  ...cannonball,
  // THE EARTH COMES UP BURNING, and this is the first ammunition to name a PAIR.
  // The plain ball takes `impact: true`, which means "the two ordinary drawings,
  // at random"; this names the two fiery ones and gets the same treatment in its
  // own colours. See impact() in src/impacts.js for why a list rather than a flag.
  impact: ['fiery_1', 'fiery_2'],
  // AND IT KEEPS BURNING. 10 a second for 5 seconds — 50 over the five, which is
  // most of another shot's worth of damage laid on afterwards rather than at once.
  //
  // The magnitude lives here rather than in data/status.js, on the same argument
  // `times` is on an ability rather than a number in the tower: how much a burn
  // hurts is a property of the thing that started it, so a fiercer shot can burn
  // harder without a second status existing.
  //
  // WHAT IT IS WORTH, and it is more than 50 on paper. The burn goes on ticking
  // while the tower reloads, so on a wave it is 50 extra damage into everything the
  // blast caught rather than into one man — the ball bursts across 85px and every
  // enemy in it burns. Against a packed rank that is the biggest single thing this
  // tower does; against one straggler it is 50.
  burn: {
    dps: 10,
    seconds: 5,
    // AND IT BURNS WIDER THAN IT BREAKS, at the owner's ask: half again the
    // outpost's own blast, so 85px of damage inside 127.5px of fire.
    //
    // A MULTIPLE OF THE TOWER'S BLAST rather than a distance, which is the rule
    // every magnitude in this file follows — retune the Cannon Outpost's 85 and
    // the fire stays half again as wide instead of being pinned to a number that
    // no longer relates to anything.
    //
    // IT IS THE BLAST FIGURE THAT GOES UP BY HALF, not the area in the geometric
    // sense. `splash` is a RADIUS everywhere in this game — the trebuchet's 98,
    // the ballista's 70 — so "half again the blast" is the number a player reads
    // off a card going up by half. Taken as area instead it would be x1.2247, and
    // that is the one figure to change if it was ever meant the other way.
    //
    // Applied in its own pass in projectiles.js rather than by widening `splash`,
    // because `splash` is what the info box prints and what tools/families.mjs
    // holds the family's shape against — widening it would have this tower reading
    // as out-blasting the Trebuchet while hitting for exactly what it always did.
    splashTimes: 1.5
  },
  // Louder than an ordinary ball, at the owner's request, and only for this shot —
  // the same clip played harder rather than a second recording. See `level` in
  // play() in src/audio.js.
  //
  // 2.3, WHICH IS THE HEAVY BOLT'S OWN NUMBER, and that is the point of it rather
  // than a coincidence. The owner asked for these two shots to sit with the
  // ballista's pair, and the thing that makes a special shot READ as one is not
  // its absolute level — it is how far it stands above the ordinary shot from the
  // same machine. Giving the two tier 4s the same step means "that was the loud
  // one" sounds like the same event on either tower.
  //
  // It was 1.6, chosen when `cannon_shot` sat at 1.4 and the arithmetic was being
  // done against a different base. The base moved to 2.2 — see the note on
  // `cannon_shot` in src/audio.js for the octave-band measurement behind that —
  // and the multiplier follows the design rather than the old sum.
  //
  // Short of clipping with room: 2.2 x 2.3 puts the loudest sample at 0.63 of full
  // scale after the bus and the master.
  fireGain: 2.3
};

// THE MONK'S COMET IN THREE MORE COLOURS, and the first ammunition in this file
// that is not a SPECIAL. Everything above is a shot the tower fires once every few
// reloads; these are what a Judgement Temple's ORDINARY blast becomes once it has
// been taught something, so one of them is on every shot it fires for the rest of
// the game.
//
// FOUR DRAWINGS FOR TWO ABILITIES, because they can both be bought. Plain, slowed,
// strengthened, and both at once — the artist drew the fourth without being asked,
// which is what makes `shotWith` below a table lookup rather than a compromise.
//
// SPREAD FROM `monkShot` rather than written out, on the rule every re-skin in
// this file follows: how the thing FLIES belongs to the weapon and only the
// picture belongs to the ability. Same 330, same `kind` — so the report leaving is
// the family's Arcane_shot and a man killed by any of the four answers with the
// monk's line, which is what a player should hear whichever of these is in the
// air. The two Inner Strength drawings measure to the same box as each other and
// two pixels off the plain one; `node tools/trim.mjs` reads all four off the files.

// SLOWED PULSE'S. The comet in blue, and it carries the whole of what the ability
// does — the slow is a property of the SHOT, exactly as Fiery Shot's burn is, so
// projectiles.js lays it on whatever the blast lands on and nothing in towers.js
// has to know a slow exists.
export const monkSlowShot = {
  ...monkShot,
  sprite: 'monk_shot_slow',
  trim: [226, 244, 60, 24],
  // 30% OFF EVERYTHING THE MAN DOES WITH TIME, at the owner's ask: he walks at 0.7
  // of his speed and swings at 0.7 of his rate, out of one number. See slowOf in
  // src/status.js, which is read by the march in enemies.js, the thrower's clock
  // in the same file, and the melee clock in units.js.
  //
  // A MULTIPLIER RATHER THAN A SUBTRACTION, which is the rule every magnitude in
  // this file follows: retune a thug's 46 and this is still 30% of it.
  //
  // FIVE SECONDS, and it was two. Both are the owner's; what the change buys is
  // the slow OUTLIVING the ring rather than only holding inside it. A temple
  // looses every 1.00s, so either number keeps a man under fire slowed
  // continuously — each blast refreshes the clock long before it runs out. What
  // two seconds did NOT do is follow him: he was up to speed about a second after
  // the last blast, and five seconds means a man who walks out the far side of a
  // temple's reach is still labouring for most of the next tower's ring.
  //
  // It is the longest status in the game — against a burn's five and a poison's
  // four — and it can be, because it does no damage. A burn that outlasted its
  // shot by five seconds would be free damage; a slow that does is a man arriving
  // late, which is what the ability is for.
  //
  // Statuses REFRESH rather than stack, so a second temple on the same man is more
  // shots landing on a slow that is already there. That is what lets the magnitude
  // be this big without two of them stopping the road dead.
  slow: {
    times: 0.70,
    seconds: 5
  }
};

// INNER STRENGTH'S. The comet in cream and a size larger. No `slow` — what this
// one carries is nothing at all, because the extra damage belongs to the TOWER
// rather than to the shot: see `damageTimes` on the ability and damageK in
// src/towers.js. The drawing is the only thing the ammunition contributes.
export const monkStrongShot = {
  ...monkShot,
  sprite: 'monk_shot_strength',
  // 88 x 44, redrawn from 56 x 30 at the owner's ask — "bigger and more obvious"
  // — which puts 18 x 9 game px in the air against the plain comet's 12 x 5. It is
  // now the second largest projectile in the game after the pope's missile, and
  // that reads as the right way round: this is the blast a monk throws once he has
  // been taught to throw it harder.
  //
  // `grip` IS STILL THE PLAIN COMET'S 0.12, INHERITED, and that is measured rather
  // than assumed. The head is the part that has to sit on the flight line, and the
  // artist scaled the head by 1.73 (its centre moved from 20.5 source px along to
  // 35.5) while the whole drawing grew by 1.49 — so the same fraction lands 10.6px
  // in where the same point of the head is at 12.3px. A third of a game pixel
  // apart, which is under the resolution of the thing being aimed.
  trim: [212, 234, 88, 44]
};

// AND BOTH AT ONCE. Blue like the slow, big like the strength, and it carries the
// slow because it IS the slowing shot — a temple that has bought both fires this
// and gets both effects, one from here and one from damageK.
export const monkBothShot = {
  ...monkSlowShot,
  sprite: 'monk_shot_both',
  // The same box as monkStrongShot's, to the pixel, because it is the same drawing
  // in the other colour — which is what says these two are a pair rather than two
  // comets that happen to resemble each other. `node tools/trim.mjs` reads both
  // off the files.
  trim: [212, 234, 88, 44]
};

// The three poses the artist drew for these. Each is registered on the SAME source
// pixel as the man's own drawings — `node tools/shadow.mjs` checks all three — so
// swapping to one of them cannot move him sideways.
//
// Blinding Strike's pose — `Paladin_Holy_Slash.png`, still under its old name on
// disk — is drawn in the paladin's Attack box exactly, [135, 212, 178, 116]:
// the artist re-lit the same swing rather than drawing a new one, and the pivot
// comes back identical to three places. That is a finding rather than a copy — it
// is measured per file, like every other anchor in this project.
const DEADEYE_POSE = {
  sprite: 'musketeer_deadeye',
  trim: [168, 194, 164, 124],
  pivot: [0.756, 0.913]
};

const HOLY_LIGHT_POSE = {
  sprite: 'paladin_holy_light',
  trim: [210, 143, 133, 193],
  pivot: [0.504, 0.903]
};

const BLINDING_STRIKE_POSE = {
  sprite: 'paladin_blinding_strike',
  trim: [135, 212, 178, 116],
  pivot: [0.798, 0.905]
};

// The assassin's two, and both anchors are the finding the paladin's were: the
// artist drew them over his existing poses, so the shadow comes back on the same
// source pixel, (259.0, 302.8), as his Default and his Attack.
//
// KNIFE THROW is his standing box widened to the right — 110 against 82 — for the
// arm coming through. Same origin, same height, so the pivot is the same POINT
// re-expressed against a wider rect: 44/110 across instead of 44/82.
//
// SNEAK ATTACK comes back in the Attack pose's box to the pixel, [174, 198, 151,
// 116], exactly as Blinding Strike comes back in the paladin's. Measured per file
// rather than copied — tools/shadow.mjs runs both of these every time.
const KNIFE_THROW_POSE = {
  sprite: 'assassin_knife_throw',
  trim: [215, 198, 110, 116],
  pivot: [0.400, 0.903]
};

const SNEAK_ATTACK_POSE = {
  sprite: 'assassin_sneak_attack',
  trim: [174, 198, 151, 116],
  pivot: [0.563, 0.903]
};

// How long a special pose stays up. One second on Burst Fire and two on Deadeye:
// a big blow is worth standing over, and both are free on a man who takes 2.4s to
// load whatever he just fired.
//
// HOLY SLASH USED TO TAKE THE LONG ONE and now takes none — see `hold: null`
// below. The constant stays a constant rather than being folded into Deadeye,
// because "the long hold" is a decision about the game's pacing that a second
// ability could want again.
const HOLD = 1;
const LONG_HOLD = 2;

export const ABILITIES = [
  {
    // THE SAME ABILITY ON THE OTHER BOW, and deliberately the same in every part
    // the player can read: the same name, the same 1.5x, the same sentence about
    // rebuilding it in steel. The owner is standardising it across the two towers
    // that are bows, so a player who has bought it on one knows exactly what it
    // does on the other without opening the book again.
    //
    // AND THE NUMBERS LAND ON THE SAME PLACE, which is what makes the
    // standardisation more than a name: the Sentry's 260 x 1.5 is 390, the
    // Ballista Turret's 260 x 1.5 is 390. Two different towers, one reach, bought
    // the same way. That is why the tier's own range came down from 300 to 260 in
    // the same change.
    id: 'sentry_tension',
    name: 'Reinforced Tension',
    of: 'Crossbow Sentry',
    icon: 'ability_sentry_tension',
    cost: ABILITY_COST,
    rangeTimes: 1.5,
    // AND THE MAN IS RE-DRAWN WITH A STEEL BOW, which is the figure's version of
    // what `frames` does for the ballista's machine. Both of his poses are
    // swapped, because he has two and the swap has to hold whichever one he is
    // showing — see gunnerOf() in src/towers.js. The artist drew them to the same
    // trims and the same shadow pixel as the timber pair, so nothing moves.
    gunner: { sprite: 'crossbowman_steel', attack: 'crossbowman_steel_attack' },

    detail: 'The engineers rebuild the bow in steel and the sentry reaches 390px ' +
            'instead of 260 — level with a Ballista Turret that has bought the ' +
            'same thing, and behind only the Musketeer Post.\n\n' +
            'Nothing else changes: the same quarrel, the same 0.8 second reload, ' +
            'the same 30 a bolt. The crossbowman is drawn with a steel bow from ' +
            'the moment it is bought.'
  },
  {
    // A MULTIPLIER LIKE EVERY OTHER MAGNITUDE HERE, and it was an absolute 0.50
    // for one build. The owner's call, and the right one: a tower's own stat
    // should carry through, so a retuned tier moves what its abilities are worth
    // instead of leaving one of them pinned to a number that no longer relates
    // to anything.
    //
    // AND IT SCALES THE SPEED, NOT THE COOLDOWN, which is why it is greater than
    // 1 rather than less. "Reload 1.35x faster" is the sentence a player reads;
    // dividing is cooldownOf's job in src/towers.js, exactly as multiplying is
    // rangeOf's. A `cooldownTimes: 0.74` would mean the same thing and read as a
    // nerf.
    //
    // 1.35 ON 0.80 IS 0.593, and this figure has now been round the loop twice.
    // It was an absolute 0.50, then 1.25 — which the owner accepted at 0.64 after
    // asking for a 0.60 no round multiplier reaches — and is now 1.35. Only this
    // one number moves each time, which is the whole point of holding it as a
    // multiplier: nothing else in the file, the tools or the card is edited to
    // follow it.
    //
    // WHAT IT BUYS: 30 every 0.59s is 50.6 a second against 37.5, which is a
    // third more output on the tower with the smallest blow. It stacks with the
    // range ability rather than competing, so a Sentry with both is 50.6 a second
    // at 390.
    id: 'swift',
    name: 'Swift Reload',
    of: 'Crossbow Sentry',
    icon: 'ability_swift',
    cost: ABILITY_COST,
    reloadTimes: 1.35,

    detail: 'The crossbowman works a windlass instead of a belt hook and reloads ' +
            '1.35x faster — a quarrel every 0.59 seconds instead of every 0.8, ' +
            'which is 50.6 damage a second where the sentry alone does 37.5.\n\n' +
            'Nothing else changes: the same 30 a quarrel and the same reach. It ' +
            'stacks with Reinforced Tension rather than competing with it.'
  },
  {
    id: 'burst',
    name: 'Burst Fire',
    // Which tower teaches it. A caption for the encyclopedia, and the only place
    // an ability names its tower — the binding that matters is the other way
    // round, in the `abilities` list on the tier's own def.
    of: 'Musketeer Post',
    icon: 'ability_burst',
    cost: ABILITY_COST,
    // ONE SHOT IN FOUR is the burst — three ordinary balls and then three at once.
    // It was one in six; the owner brought every cycle in the game onto the same
    // reading, which is the one `every` has always counted: the length of the
    // cycle, so the fourth trigger of the tower's reload is the one that fires
    // three balls instead of one.
    every: 4,
    // The three balls, and the gap between them. 0.18s is a fifth of the fastest
    // reload in the game and about as quick as three distinct cracks can be told
    // apart by ear; faster reads as one noise and one muzzle flash.
    shots: 3,
    gap: 0.18,
    hold: HOLD,
    // THREE DIFFERENT MEN, at the artist's request, and it is what the ability is
    // FOR. Three balls into one militiaman is 195 damage spent on 80 health; three
    // balls into three of them is a rank cleared. Each shot of the burst re-picks
    // through the tower's own standing order, excluding whoever the burst has
    // already hit — see burstTarget in src/towers.js, including what happens when
    // there is only one man on the road.
    spread: true,
    // NO POSE OF ITS OWN and no ammunition of its own, at the artist's request:
    // "use Attack and normal Bullet images". So the man holds the drawing he
    // already fires in and the balls are the balls he already fires.

    // The long form, shown beside the picture when the card is tapped open. Two or
    // three sentences: what it does, then the thing a player would only find out by
    // watching it for a while.
    detail: 'After 3 ordinary shots the musketeer empties 3 bullets into the road ' +
            'as fast as he can work the lock, 0.18s apart, then holds the smoke ' +
            'for 1 second before loading again. Each ball is the Post\'s own 65, ' +
            'so the burst is 195 in under 0.5 seconds.\n\n' +
            'Each of the 3 picks a different man, through whatever standing order ' +
            'the tower is on. That is the point of it: 3 bullets into 1 militiaman ' +
            'is most of them wasted, and 3 into 3 of them is a rank gone. With ' +
            'only 1 enemy in reach all 3 go to him.'
  },
  {
    id: 'deadeye',
    name: 'Deadeye',
    of: 'Musketeer Post',
    icon: 'ability_deadeye',
    cost: ABILITY_COST,
    // ONE SHOT IN TEN, against the burst's one in four, and eight times as hard.
    // That is the shape the artist asked for: the burst is a rhythm you stop
    // noticing and this is an event.
    //
    // TEN RATHER THAN EIGHT ALSO KEEPS THE TWO OUT OF EACH OTHER'S WAY. Where the
    // cycles collide the rarer one wins, so a Post that has bought both loses a
    // burst to every Deadeye that lands on one of its slots. At 4 and 8 that was
    // EVERY Deadeye; at 4 and 10 it is every other one — one burst lost in twenty
    // shots — and the second 150 gold is worth 86% of what it is worth alone
    // instead of 60%.
    every: 10,
    shots: 1,
    // TWO SECONDS of held pose, not one. It is the biggest single blow in the game
    // and he stands over it. Still free, because the musket takes 2.4s to load
    // either way.
    hold: LONG_HOLD,
    // ONE SECOND OF WARNING before it goes. The tower picks its man while the ball
    // is still being rammed home and paints a mark over his head, and the mark stays
    // there until the shot lands — see `t.locked` in src/towers.js and the marker in
    // render.js. It is the only ability in the game that announces itself before it
    // happens, and at six times the tower's damage it should: the player gets a
    // second to see where the shot is going.
    lock: 1,
    // AND IT REACHES THE WHOLE MAP, at the owner's word. Every other shot in the
    // game is bounded by the tower's ring; this one is not, so a Musketeer Post
    // can answer the archer thug standing off in a corner no tower covers. It is
    // the one shot a tower will fire with nothing at all inside its own reach.
    //
    // Read by stepWeapon in src/towers.js, which picks the far man through the
    // tower's own standing order — so "aim at whoever is nearest the exit" still
    // means that, over the whole board instead of over the ring.
    global: true,
    // EIGHT TIMES THE TOWER'S OWN SHOT rather than a number of its own, which is
    // the rule the owner put on every ability here: a magnitude is a multiple of
    // the stat it changes, so it stays true the next time that stat is retuned. It
    // was a flat 300 against a 60 damage tower, which was five times — and would
    // have been four times, or eight, after any change to the Post.
    //
    // 520 NOW THAT THE POST HITS FOR 65, and it moved on its own: eight times the
    // tower's shot is what is written down, so raising the tower raised this with
    // no line here to edit. That is the whole reason the magnitudes are multiples.
    //
    // The biggest single blow in the game by a factor of eight. Nine ordinary
    // shots plus one of these is 1105 over ten reloads: 46.0 a second against a
    // plain Post's 27.1, where Burst Fire is 40.6. Rarer and harder than the burst
    // and a little ahead of it per second, which is the trade — what separates the
    // two is WHERE the damage goes: the burst clears a rank of militia, this
    // removes one giant.
    times: 8,
    ammo: deadeyeBall,
    pose: DEADEYE_POSE,
    // NO `cue`, and it is not silent. Its noise comes from its AMMUNITION, through
    // the FIRING table in src/towers.js that every other projectile's report goes
    // through — `deadeyeBall` is its own kind, so it gets its own row there. An
    // ability that fires something announces itself by firing it; `cue` is for the
    // two that do not, which are the paladin's.

    detail: 'After 9 ordinary shots the musketeer takes 1 second to aim — a mark ' +
            'appears over the man he has chosen and stays there until the bullet ' +
            'arrives — and then fires 1 round for 8x the Post\'s own 65, ' +
            '520 damage, the hardest blow in the game. It reaches anywhere on the ' +
            'map: this 1 shot ignores the tower\'s range ring entirely.\n\n' +
            'He holds the pose for 2 seconds afterwards, which costs nothing: the ' +
            'musket takes 2.4 seconds to load whatever he just fired. Kept for the ' +
            '1 thing on the road that has to die and cannot be chipped down.'
  },
  {
    id: 'light',
    name: 'Holy Light',
    of: 'Paladin Keep',
    icon: 'ability_light',
    cost: ABILITY_COST,
    // THE ONE THAT IS NOT A RHYTHM. It has no `every` because it is not a beat in
    // the fight — it is what a paladin does when he is about to die, and the enemy
    // in front of him goes on hitting him the whole time.
    below: 0.30,
    healFrac: 0.80,
    // THREE SECONDS, not two. The same 200 health arrives more slowly, which is the
    // whole difference: he is out of the fight for half again as long to get it, so
    // the enemy in front of him lands about four more blows while he kneels.
    seconds: 3,
    // Counted from the moment it STARTS, not from when it ends, so the honest
    // reading of "refreshes every 30 seconds" is 27 seconds of standing there unable
    // to do it again. Starting the clock at the end would make the gap 30 on top of
    // the 3, which is a longer cooldown than the number says.
    //
    // AND IT IS THE MAN'S CLOCK, NOT THE ABILITY'S. It used to survive his death —
    // the reasoning was that the gold bought a power and the power was recharging,
    // whoever was carrying it — and the artist asked for the other reading: a
    // paladin who is cut down and musters again is a NEW MAN, and a new man can
    // call the light. So the timer dies with him, along with everything else an
    // ability left on him. See the death block in src/units.js.
    //
    // It is a real buff and worth naming as one. A paladin who dies at 25 seconds
    // into the clock used to muster with 5 seconds still to serve; now he comes back
    // ready. What stops that being free is that he had to die to get it, at the cost
    // of his respawn and the piece of road he was holding.
    refresh: 30,
    pose: HOLY_LIGHT_POSE,
    cue: 'holyLight',

    detail: 'The moment a paladin drops under 30% of his health he stops fighting, ' +
            'kneels, and takes 80% of his full health back over 3 seconds — 220 on ' +
            'a paladin, more under a Divine Fortitude. He keeps his grip on the ' +
            'enemy the whole time, so the road stays held — and the enemy keeps ' +
            'hitting him, so it is a race rather than a free reset.\n\n' +
            'Each of the 3 calls it for himself and has his own 30 seconds before ' +
            'he can call it again, counted from the moment he kneels. A paladin ' +
            'killed anyway takes that clock with him: the man who musters in his ' +
            'place can call the light at once.'
  },
  {
    // IT WAS HOLY SLASH, and the owner renamed it: "there are too many 'Holy'
    // words in abilities". The keep still teaches Holy Light, the altar still
    // grants Holy Wrath, and that is two rather than three.
    //
    // THE NAME IS THE ONLY THING THAT MOVED. `id`, the sprite key, the paladin's
    // pose (`assets/units/Paladin_Blinding_Strike.png`) and the sound
    // (`assets/audio/sfx/Paladin_Blinding_Strike.mp3`) all still read Holy Slash,
    // because the artist renamed the BUTTON and nothing else — and a code name
    // that matched the card while the file it points at did not would be worse
    // than one that plainly matches the file. What a player sees is `name`.
    id: 'blinding',
    name: 'Blinding Strike',
    of: 'Paladin Keep',
    icon: 'ability_blinding',
    cost: ABILITY_COST,
    // ONE BLOW IN FOUR is the strike, and three ordinary ones come before it. Read
    // the field the same way as the musketeer's: it is the length of the cycle, and
    // the last action of the cycle is the special one.
    //
    // IT WAS EVERY TENTH AT 70 DAMAGE, then every fifth, and is every fourth. More
    // often for less each time is very nearly the same sum — what changed is what
    // it FEELS like: a rhythm you can see rather than one enormous blow every eight
    // seconds followed by a paladin standing still.
    every: 4,
    shots: 1,
    // FIVE TIMES AN ORDINARY BLOW, as a multiplier rather than a number — the rule
    // the owner put on every ability here, and the reason the 35 that used to be
    // typed on this line is gone. It was five times the paladin's 7 on the day it
    // was written and would have been four, or seven, after any change to him.
    //
    // Three swings at 7 plus one at 35 is 56 where four swings would be 28: 17.5
    // damage a second against a plain paladin's 8.75, exactly double.
    times: 5,
    // NO PAUSE OVER IT ANY MORE. `hold` is null rather than a number of seconds,
    // which units.js reads as "the man's own attack time" — 0.80s on a paladin, the
    // same as the swing it replaces — so the pose is up for exactly one beat of
    // fighting and the next blow lands on schedule. The artist's words: they hold
    // that position like normal attack time.
    //
    // Null rather than 0.80 typed here, because the paladin's cd is his own number
    // and this has to follow it. Typing the value would leave a Blinding Strike frozen
    // at a swing rate the man no longer has the day somebody tunes him.
    //
    // It also means the whole cost of the ability is now the strike's rarity. The
    // two seconds used to be the brake — 14.5 a second where a free pose would have
    // been 16.6 — and taking the brake off is exactly why the damage came down.
    hold: null,
    pose: BLINDING_STRIKE_POSE,
    cue: 'blindingStrike',

    detail: '3 ordinary blows and then 1 worth 5 of them — 35 where he normally ' +
            'does 7 — struck in the time an ordinary swing takes, so the rhythm ' +
            'never breaks.\n\n' +
            'It works out at 17.5 damage a second against a plain paladin\'s 8.75, ' +
            'exactly 2x, from the man who starts with the least damage in the ' +
            'game. Each of the 3 counts his own blows, so the strikes land spread ' +
            'out rather than all at once.'
  },
  {
    // --- THE FIRST ABILITY THAT GIVES A SOLDIER A WEAPON HE DID NOT HAVE -------
    //
    // Everything above changes a number, a rhythm or a drawing on something that
    // already fights the way it fights. This one hands the assassin a second
    // attack: a knife at 200px, thrown from where he stands, at men his squad
    // could never have reached.
    //
    // WHICH IS A HOLE IN THE GAME CLOSED, and it is worth being precise about
    // WHICH hole, because the obvious answer is wrong. The owner's rule is that a
    // squad holds the ground it was posted to hold and never walks out — "it is
    // okay if they are attacked from afar and cannot do anything" — so a plague
    // doctor standing off at 130px is unanswerable by a Militia Camp or a Paladin
    // Keep, full stop.
    //
    // THE GUILD NEVER HAD THAT PROBLEM. Its men are invisible, so a thrower does
    // not stop for them at all: he walks into the ambush and dies of a blade. That
    // was true before this ability existed, and tools/plague.mjs measures it.
    //
    // So what it buys is THE ROAD. Untaught, the assassins wait and three of them
    // shuffle 50px out of formation to meet a thrower; taught, they open on him
    // first and nobody moves at all. Reaching sooner without breaking formation —
    // not "the only answer", which is what this comment said before the tool was
    // written and disagreed.
    //
    // `reach` RATHER THAN `range`, and the name is load-bearing. rangeOf() in
    // src/towers.js returns an ability's `range` in place of the tower's own, and
    // the Assassin Guild's 210 is not a weapon's reach at all — it is the LEASH on
    // the rally point, the circle the men may be posted inside. Calling this field
    // `range` would have quietly shortened every Guild's leash the moment the
    // ability was bought, which is a bug with no visible cause. Two different
    // quantities, two different words — and reachOf() in src/towers.js is how the
    // info box prints this one without going near the other.
    //
    // 100px, AND IT WAS 200. Both numbers are the owner's, and the second came in
    // the same breath as the damage going up to a full blow — the two moved
    // together, so they are worth reading together. At 200 for half damage it was
    // a poke that outranged a plague doctor's 130 standoff and quietly answered
    // him. At 100 for a whole blow it is a knife thrown at a man nearly close
    // enough to stab — barely past the 30 at which a soldier engages — so it
    // front-loads a fight that is about to happen rather than replacing one that
    // is not, and a doctor at 130 is out of reach again.
    //
    // HIS WHOLE BLOW, and `times: 1` rather than no `times` at all. The two would
    // behave identically today and mean different things: the multiple of one says
    // the knife IS his blade at a distance and follows the 20 wherever it is
    // retuned to, where an omission would say the knife has no relation to it.
    // Three assassins throwing is 75 a second — the same output they already have
    // in the hand, which is the point.
    id: 'knife',
    name: 'Knife Throw',
    of: 'Assassin Guild',
    icon: 'ability_knife',
    cost: ABILITY_COST,
    reach: 100,
    times: 1,
    ammo: knife,
    // He is drawn mid-throw for exactly as long as a lunge lasts, and that is not
    // a coincidence: units.js sets `hold` to the SAME quarter second the swing
    // decays over, so the reveal, the pose and the blow all end together. See
    // LUNGE there.
    pose: KNIFE_THROW_POSE,

    detail: 'The assassin throws at 100px for 20 — the whole of what his blade ' +
            'does — without leaving his post. 3 of them is 75 damage a ' +
            'second at range, on a tower that is still a wall.\n\n' +
            'No squad in this game walks out to fetch an enemy, so this is the ' +
            'only reach a barracks has. Men who would otherwise wait to be walked ' +
            'into open on the road first, and never break formation to do it. ' +
            'He is out in the open for as long as anything is in reach of him, ' +
            'and gone again the moment the road in front of him is clear.'
  },
  {
    // --- AND THE ONE THAT PAYS FOR BEING UNSEEN -------------------------------
    //
    // ARMED BY HIDING, SPENT BY STRIKING. The owner's words: bonus damage every
    // time they appear from their invisibility, and it "only resets when they
    // become invisible and visible again". So it is not a rhythm like Blinding Strike
    // and not a reaction like Holy Light — it is a flag that hidden() turns back
    // on, which makes hidden() the only trigger in the ability system that is also
    // a drawing rule and a targeting rule. One predicate, now three jobs.
    //
    // WHAT THAT MEANS IN A FIGHT, and it is worth writing down because the two
    // halves behave completely differently:
    //
    //   IN MELEE he is visible for as long as he has hold of somebody, so exactly
    //   ONE blow in each engagement is a sneak — the opener, and then nothing
    //   until his man is dead and he has faded again.
    //
    //   THROWING, if the Guild has also bought Knife Throw, he is visible for as
    //   long as anything is in reach — so a volley opens with one sneaked knife
    //   and settles into ordinary ones, and he re-arms when the road clears.
    //
    //   THAT SECOND ANSWER IS THE OWNER'S CORRECTION and it is worth keeping the
    //   first one written down. He used to hide between knives, a quarter second
    //   of reveal against eight tenths of reload, which re-armed this on every
    //   throw and made EVERY blade a heavy one: 150 damage a second at range from
    //   a squad that costs 300 gold to teach. The fix was not to weaken the bonus
    //   but to stop him vanishing while he is plainly standing there throwing.
    //
    // TWO MAGNITUDES, AND THE BLADE IS WORTH MORE THAN THE KNIFE. 2.5x in the hand
    // against 2x thrown — the owner's split, and it is the right way round for the
    // reason the whole tower is built on: getting close is the risk. A man who has
    // crept to arm's length of a giant is spending 150 health to be there, and a
    // man flicking a blade from 100px is spending nothing. The opener that costs
    // something pays more.
    //
    // 2.5x IS STILL THE MODEST END — Blinding Strike is five times a paladin's blow.
    //
    // THE ARITHMETIC HAS BEEN ROUND THE LOOP THREE TIMES AND EVERY TURN IS WORTH
    // KEEPING. The knife was half a blow at 200px, so a sneaked knife was 20 and
    // the pair came to the squad's own melee output at range. Then the knife went
    // to a full blow, which doubled the doubled number: 40 a blade, 150 a second
    // from three men, twice what the same three do in the hand. The owner caught
    // that and fixed the CAUSE rather than the number — an assassin no longer hides
    // between throws, so only the first blade of a volley is a sneak. And now the
    // two halves have been told apart.
    //
    // What it is worth: 75 a second sustained, which is exactly the squad's melee
    // output, plus 60 on the opening blade of every volley and 90 on the opening
    // blow of every fight. A bonus you can feel and cannot lean on, which is what
    // an opener should be.
    id: 'sneak',
    name: 'Sneak Attack',
    of: 'Assassin Guild',
    icon: 'ability_sneak',
    cost: ABILITY_COST,
    // The blade's multiple. `times` is the field every other ability in this file
    // uses for "a multiple of the thing it changes", so the ordinary one stays the
    // ordinary name and the exception is the one that has to announce itself.
    times: 2.5,
    // AND THE KNIFE'S, which is the exception. Two numbers rather than one because
    // the two openers are not worth the same: see the note above. units.js reads
    // `thrownTimes ?? times`, so an ability that does not care needs no second
    // field and this one says exactly how much it cares.
    thrownTimes: 2,
    // Only on the BLADE. A thrown knife keeps its own pose, because a drawing of a
    // man lunging with a dagger cannot also be the drawing of the knife leaving
    // his hand — and the throw is the half where you would not see this anyway.
    pose: SNEAK_ATTACK_POSE,
    // BUT IT THROWS ITS OWN KNIFE. The pose is the man and cannot say which of two
    // things he is doing; the BLADE in the air can, and that is where the whole of
    // this ability's ranged half is visible. Without it a Guild with both
    // abilities is a squad throwing identical knives for two different numbers,
    // and nothing on the board says which is which.
    //
    // It is the same weapon drawn a second time — see `sneakKnife` in
    // data/towers.js — so it lands with the same noise, credits the same kill and
    // flies at the same speed. The picture is the entire difference, exactly as
    // Deadeye's ball is the musketeer's ball drawn larger.
    ammo: sneakKnife,
    // AND IT IS LOUDER, which is the FOURTH way an ability can be heard and the
    // first one that is not a clip. Burst Fire fires the ordinary ball, Deadeye
    // speaks through its ammunition, Blinding Strike has a recording of its own — and
    // this is the man's own blade played harder, because the owner asked for the
    // heavy impact to be audible and a fourth take of a dagger is not what a
    // heavier blow sounds like. Same trick as `fireGain` on the heavy bolt above,
    // and it lives here for the same reason: the difference belongs to the BLOW,
    // not to the file, and a GAIN entry would have raised every ordinary swing
    // with it — including the three this one is supposed to stand out from.
    //
    // 1.8 RATHER THAN 2. Every clip is levelled to the same peak at load (see
    // TARGET_LOUD in src/audio.js), so a plain doubling really doubles and clips
    // against the ceiling on the loudest takes. 1.8 is a shade over 5dB: plainly
    // a heavier blow, still inside the mix.
    loud: 1.8,

    detail: 'The first blow after an assassin shows himself is worth 2.5x — 50 ' +
            'where his blade does 20 — and it comes back the ' +
            'moment he fades again, which in a melee means the opening strike of ' +
            'every fight he picks.\n\n' +
            'Thrown it is worth 2x instead of 2.5x: 40 on the first ' +
            'blade of a volley, with a heavier knife in the air to say so. ' +
            'Creeping to arm\'s length is the risk, so it is the one that pays ' +
            'more. His strike lands harder and sounds it.'
  },
  {
    // ONE ABILITY ON TWO TOWERS, and the first id in this file that names its
    // tower. The Crossbow Sentry has the same thing under the same name with the
    // same number — the owner is standardising it across the two weapons that are
    // bows — but each one is a separate entry, because the icon is a picture of
    // ITS tower and the prose describes its own reach. So the id has to carry
    // which of them it is; every other ability in the game is unique to one
    // tower and gets away with a bare word.
    id: 'ballista_tension',
    name: 'Reinforced Tension',
    of: 'Ballista Turret',
    icon: 'ability_ballista_tension',
    cost: ABILITY_COST,
    // THE FIRST ABILITY THAT IS NEITHER A RHYTHM NOR A REACTION. It has no
    // `every` and no trigger at all: it is bought, and from then on the tower
    // simply reaches further. Holy Light was the first thing here that did not fit
    // the `every` shape; this is the second, and the two do not resemble each
    // other either, which is why the mechanism is a bag of optional fields rather
    // than one class with four subclasses.
    //
    // 390. IT WAS THE MUSKETEER POST'S OWN 480 for one build, which put the
    // ballista level with the longest arm in the game and covered most of a map
    // from one plot; the owner brought it down. 390 is half again the tower's own
    // 260 and still the second-longest reach in the game, so it buys a genuinely
    // different plot without buying the whole board — and the Musketeer Post keeps
    // the longest arm outright, which is the claim tools/families.mjs makes about
    // towers as they are sold.
    //
    // What it does NOT touch is the dead zone: tier 4 has none to start with, so
    // Far Shot makes it the one tower in the game that covers everything from its
    // own feet to 390px out.
    rangeTimes: 1.5,
    // AND THE MACHINE IS RE-DRAWN IN IRON, which is how the board says the ability
    // is bought. The artist's three frames are the same machine in steel instead
    // of timber, measured to the same trims to the pixel, so the swap moves
    // nothing — see the note beside them in src/assets.js. `frames` is read by
    // framesOf() in src/towers.js, which prefers what the tower OWNS over what the
    // tier ships with.
    frames: ['artillery_t4_tension', 'artillery_t4_reload_tension', 'artillery_t4_fire_tension'],

    detail: 'The engineers rebuild the bow in steel and the turret reaches 390px ' +
            'instead of 260 — the 2nd-longest arm in the game, behind only the ' +
            'Musketeer Post, on the one tower that has no dead zone in it.\n\n' +
            'Nothing else changes: the same bolt, the same 1.8 second reload, the ' +
            'same blast. It is the whole board rather than a corner of it, and the ' +
            'machine is drawn in iron from the moment it is bought.'
  },
  {
    id: 'heavybolt',
    name: 'Heavy Bolt',
    of: 'Ballista Turret',
    icon: 'ability_heavy',
    cost: ABILITY_COST,
    // ONE BOLT IN FOUR is the heavy one, and three ordinary ones come before it.
    // It was one in three; the owner brought it down when the sweep put this tower
    // at the top of the game's output — 44 damage a second WITH a 70px blast, on
    // the family that already hits groups.
    every: 4,
    shots: 1,
    // AND IT COSTS THE CREW HALF A RELOAD, at the owner's ask. `afterTimes` is the
    // multiple the machine's cycle runs at once the special has left — see
    // stepCrew in src/towers.js, which hangs the extra on the Fire beat so the arm
    // stays over and the pause is something the player can watch rather than a gap
    // in the rhythm. x1.5 on this turret's 1.8s reload is 0.9s.
    //
    // A MULTIPLE RATHER THAN A NUMBER OF SECONDS. It was a flat 1s, which cost
    // this 1.8s turret 55% of a reload and the 3.0s cannon 33% — the same word for
    // two different prices, decided by nothing but which machine happened to be
    // faster. A multiple costs both of them the same share of what they were
    // already doing, and it goes on surviving every retune of either cooldown.
    //
    // WHAT IT TURNS THIS FROM AND INTO. It was 2x damage on 1 bolt in 4 with
    // nothing given up: 275 over 4 shots in 7.2s, 38.2 a second against a plain
    // turret's 30.6, and no reason on earth not to buy it. With the pause it is
    // 275 in 8.1s — 34.0 a second, +11% rather than +25%.
    //
    // That is the ability becoming a decision. What it buys is the SHAPE of the
    // output rather than more of it: the same damage arriving in fewer, harder
    // blows, which is worth having against armour and worth much less against a
    // stream of militia.
    afterTimes: 1.5,
    // DOUBLE, AS A MULTIPLIER RATHER THAN A NUMBER, and that is the point of the
    // field. "Twice as hard" is what was asked for, so twice is what is written
    // down; a 120 typed here would have been correct on the day and quietly wrong
    // the next time the turret's 60 is retuned — which it has been twice already.
    // See shoot() in src/towers.js, where `times` beats `damage` when both exist.
    times: 2,
    ammo: heavyBolt,
    // NO POSE and no `hold`. Neither would mean anything on this family: a machine
    // has no man to change the drawing of, and its clock is the beat loop rather
    // than a cooldown a pose could delay. The ability announces itself by what
    // leaves the bow — a bolt with its tail on fire — and by being louder.

    detail: 'Every 4th bolt comes off the rack burning and hits for 2x the ' +
            'damage — 110 instead of 55. There is no wind-up: the machine works ' +
            'at its ordinary rhythm right up to the shot.\n\n' +
            'The reload afterwards takes 50% longer — 2.7 seconds instead of ' +
            '1.8 — so the cycle runs 1.8 / 1.8 / 1.8 / 2.7. That works out at ' +
            '34.0 damage a second against a plain turret\'s 30.6.\n\n' +
            'What it buys is the shape rather than the size: the same output in ' +
            'fewer, harder blows, on a machine whose every shot already bursts. ' +
            'You can hear which one it is — the heavy bolt leaves louder than the ' +
            'others.'
  },
  {
    // AND ITS SECOND, which is Heavy Bolt's shape pointed at a different problem.
    // Both are "every Nth shot is the special one" on a machine with no man to
    // change the drawing of; where the heavy bolt hits twice as hard ONCE, this
    // hits for the same 70 and then keeps hurting.
    //
    // ONE BALL IN FIVE, against the heavy bolt's one in four. The cannon fires at
    // three fifths of the ballista's rate, so one in five here is a burning ball
    // every 15 seconds against a heavy bolt every 7.2 — deliberately rarer, and
    // rare enough to be an event. The owner asked for five.
    //
    // WHAT IT IS WORTH, and it is worth more than the arithmetic looks. 350 from
    // 5 balls plus 50 of burn, over the 16.5s the cycle now takes, is 24.2 a
    // second against the plain outpost's 23.3 — the ONE-target reading. The
    // burn lands on everything the fire ring caught, so against a packed rank it
    // is 50 a man, laid on while the machine is reloading. That is the biggest
    // single thing this tower does.
    //
    // AND THE FIRE RING IS WIDER THAN THE BLAST, at the owner's ask: burn.
    // splashTimes multiplies the ball's splash for the burning pass only, so 85px
    // of damage sits inside 127.5px of fire. `splash` itself is untouched — it is
    // the number the info box prints and the number tools/families.mjs checks, and
    // the ordinary 70 must keep its ordinary reach. See land() in
    // src/projectiles.js, where the burn is a second, wider sweep.
    //
    // NOTE ON "+50% BLAST": splash is a RADIUS everywhere in this game, so the
    // half is added to the radius. Reading it as area instead would be x1.2247
    // on the same one number.
    //
    // NO POSE and no `hold`, exactly as Heavy Bolt has none, and for the same
    // reason: a machine has no man to redraw and its clock is the beat loop rather
    // than a cooldown a pose could delay. The ability announces itself at the two
    // ends of the flight — louder leaving, burning where it lands — because there
    // is nothing to see in between. A cannonball is a 10px dot moving at 480px a
    // second.
    id: 'fiery',
    name: 'Fiery Shot',
    of: 'Cannon Outpost',
    icon: 'ability_fiery',
    cost: ABILITY_COST,
    every: 5,
    shots: 1,
    // AND IT COSTS THE CREW HALF A RELOAD, at the owner's ask. `afterTimes` is the
    // multiple the machine's cycle runs at once the special has left — see
    // stepCrew in src/towers.js. x1.5 on this cannon's 3.0s reload is 1.5s, the
    // same SHARE of a reload the ballista gives up for a heavy bolt even though
    // the ballista's is 0.9s. That is the whole point of writing it as a multiple:
    // a flat second was a different price on every machine it touched.
    //
    // AND IT FOLLOWS SWIFT RELOAD. The pause is taken off cooldownOf, which is the
    // tower's REAL reload rather than its tier's — so a cannon that has bought
    // both pays 1.0s against its own faster 2.0s cycle. A crew drilled to load in
    // two seconds recover from a fiery ball faster too, which is the reading a
    // player would expect and the one a flat number could not give.
    afterTimes: 1.5,
    ammo: fieryBall,

    detail: 'Every 5th ball leaves the barrel alight. It hits for the ordinary ' +
            '70 and sets fire to what it catches: 10 damage a second for 5 ' +
            'seconds.\n\n' +
            'The fire reaches further than the ball breaks — 127.5px of flame ' +
            'around an 85px blast — so men standing just clear of the crater ' +
            'burn anyway. They carry the flame over their health bar until it ' +
            'goes out, and you can hear which shot it was.\n\n' +
            'The reload after it takes 50% longer — 4.5 seconds instead of 3 — ' +
            'so the cycle runs 3 / 3 / 3 / 3 / 4.5. Against 1 straggler that is ' +
            '24.2 damage a second where the outpost alone does 23.3, and ' +
            'against a rank it is 50 extra on each of them. Swift Reload ' +
            'shortens the pause with everything else, to 1 second.'
  },
  {
    // THE CANNON OUTPOST'S FIRST, and it is the SAME ABILITY the Crossbow Sentry
    // has, one id further along. Same name, same field, a different number and a
    // different picture — see the note on the ids at the top of this file for why
    // two towers that learn the same trick get two entries rather than sharing
    // one: the icon is a picture of THIS tower's weapon, and the magnitude is
    // tuned against THIS tower's rhythm.
    //
    // 1.5 AGAINST THE SENTRY'S 1.35, at the owner's ask, and it is the right way
    // round: this is the slowest weapon in the game at 3.00s and the sentry is
    // among the quickest at 0.80. Half again on a three-second cycle is 1.00s off
    // it; half again on 0.80 would be 0.27, which is why the two are not one
    // number.
    //
    // WHAT IT BUYS: 70 every 2.00s is 35.0 a second against 23.3 — the biggest
    // single jump any reload ability makes, because it is multiplying the biggest
    // blow. It takes this tower past the Ballista Turret's 30.6 and makes the fork
    // a real question again for anyone who has 150 gold spare.
    //
    // AND THE ANIMATION FOLLOWS IT. Artillery's cooldown IS its three beats added
    // up, so cooldownOf dividing by 1.5 would have the machine fire on a frame it
    // is not drawn firing — see frameOf in src/towers.js, which scales the beats
    // by the same figure for exactly this reason. The cannon reloads visibly
    // faster; it does not skip.
    id: 'cannon_swift',
    name: 'Swift Reload',
    of: 'Cannon Outpost',
    icon: 'ability_cannon_swift',
    cost: ABILITY_COST,
    reloadTimes: 1.5,

    detail: 'The gun crew work a faster drill and the cannon reloads 1.5x ' +
            'quicker — a ball every 2 seconds instead of every 3, which is 35 ' +
            'damage a second where the outpost alone does 23.3.\n\n' +
            'Nothing else changes: the same 70 a ball, the same 85 blast and the ' +
            'same 360 reach. The machine visibly works faster — its 3 beats ' +
            'are the clock, so the drill you see is the reload the rules use.'
  },
  {
    id: 'fortitude',
    name: 'Divine Fortitude',
    of: 'High Altar',
    icon: 'ability_fortitude',
    cost: ABILITY_COST,
    aura: {
      // A TENTH MORE HEALTH on every man a barracks musters, of every tier — a
      // spearman goes 100 to 110 and a paladin 275 to 303. It was a fifth, halved
      // with Holy Wrath and for the same reason: these two compound, so what
      // matters is not what one altar does but what four of them do.
      //
      // It is applied to `maxHp` every frame rather than added once when the
      // ability is bought, and that is what makes buying it mid-wave, selling the
      // altar, and mustering a fresh man after either one all behave without a
      // single hook. A man who is half wounded stays half wounded across the
      // change — see updateUnits.
      hp: 1.10,
      on: ['barracks'],
      badge: 'badge_fortitude'
    },

    detail: 'Every man a barracks musters carries 10% more health, on every ' +
            'tier and anywhere on the map: a spearman goes from 100 to 110 and a ' +
            'paladin from 275 to 303.\n\n' +
            'It reaches men already standing on the road, not only the next ones to ' +
            'muster, and a wounded man keeps the share of his health he had. A heart ' +
            'and an arrow appear over every barracks it is working on, and a second ' +
            'altar compounds with the first — marked x2 on the badge.'
  },
  {
    id: 'wrath',
    name: 'Holy Wrath',
    of: 'High Altar',
    icon: 'ability_wrath',
    cost: ABILITY_COST,
    // THE FIRST ABILITY THAT LEAVES ITS OWN PLOT. Everything before it changed the
    // tower that bought it — how often it fires, how far, how hard, what it looks
    // like. This changes every OTHER tower on the map, which is a third shape
    // again: no `every`, no threshold, and nothing about the altar itself moves.
    //
    // `aura` is that shape, and it is deliberately a plain object rather than a
    // predicate. `on` is a list of family ids, so the rule can be read, printed and
    // checked without running it — see tools/abilities.mjs, which asks it what it
    // covers rather than watching what it does.
    aura: {
      // A TWENTIETH MORE DAMAGE on every shot fired by a bow, a machine or a staff,
      // and it COMPOUNDS with a second altar that has bought it: 1.05 x 1.05. It
      // was a tenth; the owner halved it once the compounding was in, because four
      // temples at a tenth each is x1.46 on every tower on the board. See
      // `auras` in src/towers.js, which is the list of bought copies rather than
      // of distinct abilities.
      // Barracks men are excluded at the owner's word, and it is the right line:
      // their damage is a field on a MAN rather than on the tower, and a wall that
      // also hit harder would be the thing this game most carefully does not sell.
      damage: 1.05,
      on: ['archery', 'siege', 'monastery'],
      // What is drawn over each tower it is working on. The badge is the whole
      // feedback — an aura with no picture is a number the player has to take on
      // trust — and the artist drew one per ability: a sword and an up arrow.
      badge: 'badge_wrath'
    },

    detail: 'Every archery tower, artillery machine and monastery on the map hits ' +
            'for 5% more, wherever it stands. The altar does not have to see ' +
            'them and does not fire any differently itself.\n\n' +
            'Barracks men are the exception: their damage belongs to the man rather ' +
            'than to the tower. A sword and an arrow appear over every tower it is ' +
            'working on, and a second altar that has bought it compounds with the ' +
            'first — 5% on top of 5%, marked x2 on the badge.'
  },
  {
    id: 'strength',
    name: 'Inner Strength',
    of: 'Judgement Temple',
    icon: 'ability_strength',
    cost: ABILITY_COST,
    // A THIRD MORE ON EVERY BLAST, at the owner's ask, and a MULTIPLE rather than
    // a number for the reason every magnitude in this file is one: the temple's 40
    // has already moved once and will again, and "30% more" survives that where a
    // hard-coded 52 would quietly stop being 30%.
    //
    // WHICH TAKES IT TO 52 A BLAST and 52.0 damage a second, past the High Altar's
    // own 51.7 — so a temple that has bought this out-damages an altar that has
    // bought nothing, on the same rung at the same price, while still losing to it
    // on the single blow that matters against a giant: 52 against 75. That is the
    // fork's own trade turned up rather than broken, which is what an ability on
    // the cadence tower should do.
    damageTimes: 1.30,
    shot: monkStrongShot,
    shotWith: { pulse: monkBothShot },

    detail: 'Every blast a monk throws hits for 30% more: 40 becomes 52, and the ' +
            'temple goes from 40 to 52 damage a second. Both monks, every shot, ' +
            'from the moment it is bought.\n\n' +
            'That is more a second than a High Altar does at 51.7, on the same ' +
            'rung for the same gold — and still 23 short of the altar on the ' +
            'blow itself, which is what the 2 towers are for. The comet is ' +
            'redrawn, and redrawn again in blue if the temple has also learned ' +
            'Slowed Pulse.'
  },
  {
    // THE JUDGEMENT TEMPLE'S TWO, and a FIFTH SHAPE of ability. Everything before
    // them is a rhythm (one shot in four), a passive on the tower's own numbers
    // (reach, reload), a reaction to being nearly dead, or an aura over the map.
    // These change EVERY shot the tower fires, for good, from the moment they are
    // bought — so they have no `every`, no `hold` and no `pose`, and what they
    // carry instead is a re-drawn projectile.
    //
    //   `shot`      the ammunition this tower fires from now on, in place of its
    //               tier's own. Not `ammo`, which above means the ball a SPECIAL
    //               fires once a cycle — two different questions, and folding them
    //               into one field would have made every ability with an `ammo`
    //               fire it on every shot.
    //   `shotWith`  what to fire instead when the tower has ALSO bought the ability
    //               named. Both entries below name each other and point at the same
    //               drawing, which tools/abilities.mjs checks — a pair that
    //               disagreed would fire a different comet depending on which of
    //               the two was bought first.
    id: 'pulse',
    name: 'Slowed Pulse',
    of: 'Judgement Temple',
    icon: 'ability_pulse',
    cost: ABILITY_COST,
    shot: monkSlowShot,
    shotWith: { strength: monkBothShot },

    detail: 'Every blast a monk throws now holds a man up: 30% off how fast he ' +
            'walks and 30% off how often he swings, for 5 seconds, and 2 ' +
            'chevrons appear over his health bar while it lasts. The temple ' +
            'looses every second, so anything it keeps firing at stays slowed — ' +
            'and stays slowed for 5 seconds after it walks out of reach.\n\n' +
            'It does not stack. A 2nd temple on the same man refreshes the 5 ' +
            'seconds rather than stacking a 2nd slow on him — what 2 of them buy ' +
            'is the ' +
            'slow holding across a wider stretch of road, not a man standing ' +
            'still. Both monks throw it, and it costs the tower nothing: the ' +
            'damage, the reach and the cadence are exactly what they were.'
  }
];

export const abilityById = id => ABILITIES.find(a => a.id === id);

// What a tier offers, as ability objects rather than ids. Empty for everything
// below tier 4, which is what makes "does this tower have anything to teach" a
// question about the data instead of a check on the tier number.
export const abilitiesOf = def => (def.abilities || []).map(abilityById);

// Whether a BUILT tower has already bought one. `t.abilities` is the list of ids
// it owns; it is set on the tower when it is built, so nothing has to cope with
// the field being absent.
export const owns = (t, id) => !!t.abilities && t.abilities.includes(id);
