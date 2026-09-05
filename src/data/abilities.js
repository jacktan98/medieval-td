import { bolt, knife, sneakKnife, cannonball, monkShot,
         archery, barracks, siege, monastery } from './towers.js';
// For the prose only. Five of the cards below quote what a blow is worth once it
// has been through armour, and quoting it means doing the arithmetic the game does
// rather than typing the answer — see `plate` beside `blow` at the foot of this
// file's helpers. armour.js imports nothing, so this cannot cycle.
import { TAKES } from './armour.js';
// Slowed Pulse's card quotes what a boss feels rather than typing 15%, for the
// same reason: the halving is a rule in one place and the sentence follows it.
import { slowOn, BOSS_SLOW_SHARE } from './status.js';

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
  // AND THE SHAFT GOES ON BURNING IN THE WOUND. 8 true damage a second for 2
  // seconds, at the owner's ask — the second burn in the game and the first on
  // something that is not a cannon.
  //
  // TRUE DAMAGE, like every burn: see data/armour.js. That is what makes 16 worth
  // having on a tower that already pierces — the bolt itself is turned aside by
  // plate and the fire is not, so the ability's floor against the hardest target
  // in the game is the fire rather than nothing.
  //
  // NO `splashTimes`, WHICH IS THE OWNER'S "AOE SAME": the fire covers exactly the
  // ground the bolt broke, the turret's own 70px, rather than the wider ring Fiery
  // Shot throws. Read that field's absence in land() in src/projectiles.js as x1 —
  // the second loop still runs, over the same radius as the first. It is the right
  // shape for this weapon: a ballista drives a burning shaft into a rank, where a
  // cannon throws burning earth about.
  //
  // WHAT IT IS WORTH. 16 over the two seconds, on one bolt in four, is 4 damage a
  // second added to a turret doing 34.0 — about 12% — and every point of it lands
  // whatever the target is wearing. Against a giant in high plate the heavy bolt's
  // own 120 becomes 45; the fire is 16 more on top of that, which is a third again.
  // That is the ability leaning further into what it is already for.
  burn: {
    dps: 8,
    seconds: 2
  },
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
    // 8 A SECOND, AND IT HAS BEEN BOTH WAYS. It was 10, then 5, and is now the
    // owner's 8 — worth writing down in that order, because the argument for
    // halving it is still true and the number moved anyway.
    //
    // THE ARGUMENT FOR 5: a burn is TRUE damage — see data/armour.js — so it is
    // the only thing this tower does that no armour in the game turns aside, and
    // 10 a second through plate was worth more than the ball that started it. At 5
    // it was 25 over the five seconds against a target taking 25% of the ball's
    // 65: 16 from the hit and 25 from the fire.
    //
    // WHAT CHANGED IS THE COMPANY IT KEEPS. Heavy Bolt now burns too, at 8 for 2
    // seconds, and the owner put the two fires on one rate — a burning shaft and
    // burning earth do the same damage a second, and what separates them is how
    // long they last and how wide they spread. So this is 40 over five seconds
    // against that plate's 16, which is the pre-halving shape back again, bought
    // deliberately rather than by not noticing.
    //
    // It is still the biggest thing this tower does against armour and it is meant
    // to be: the Cannon Outpost is the game's answer to a rank of plate, and the
    // fire is the half of it that plate cannot argue with.
    dps: 8,
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

// --- WHERE THE NUMBERS IN A DESCRIPTION COME FROM ---------------------------------
//
// EVERY FIGURE AN ABILITY'S CARD PRINTS IS DERIVED, and none of them is typed in.
// That is this repository's oldest rule — nothing about a picture is written down
// by hand — arriving late at the one place it had never been applied: prose.
//
// It arrived because the prose had rotted. A balance pass moved the Musketeer
// Post's ball to 60, the Cannon Outpost's to 65, the assassin's blade to 15, the
// paladin's health to 200 and Swift Reload to 1.5x, and twelve of the sixteen cards
// went on quoting the numbers from before it. The owner caught one of them by
// reading it — "I see sneak attack is not updated" — which is exactly the failure
// mode a hand-typed number has: it is wrong silently, in the one place in the game
// whose whole job is to be believed.
//
// SO `detail` IS A FUNCTION HERE and a string by the time anything reads it. It is
// called once, at the foot of this file, with the ability itself and the def of the
// tower that teaches it — so a card can quote its own magnitude and its own tower's
// stats, and cannot quote anything else.
const TIERS = [...archery, ...barracks, ...siege, ...monastery];
const towerOf = name => TIERS.find(d => d.name === name);

// At most one decimal, and no trailing zero: 43.8, 30, 56.3. Damage figures in this
// game are whole where they land — see taken() in data/armour.js — but a rate is a
// division and 43.75 in a sentence reads as a spreadsheet.
const num = x => String(Math.round(x * 10) / 10);
// Two, for the sub-second times a reload is measured in, where one would round 0.53
// to 0.5 and lose the thing being said.
const sec = x => String(Math.round(x * 100) / 100);
// A multiplier as the percentage a player reads it: 1.1 is "10%".
const pc = k => `${Math.round(Math.abs(k - 1) * 100)}%`;
// And the blow a multiplier lands, rounded the way the game rounds it where it
// applies it, so the card and the health bar agree: 2.5x a 15 blade is 38, not 37.5.
const blow = (damage, times) => Math.round(damage * times);
// AND WHAT IS LEFT OF IT AFTER ARMOUR, which is the only way to say what a rank of
// pierce is WORTH. A number of ranks broken means nothing on its own; "22 instead
// of 15" is the fact.
//
// MEDIUM PLATE IS THE YARDSTICK — rank 2 of 3 — because it is the middle of the
// ladder and because it is what the enemies a tier 4 tower is bought to answer
// actually wear: the giant, the blocker, the captain. Clamped at the floor, so a
// card can quote a break bigger than the armour it is quoted against without
// reading off the end of TAKES.
//
// Through TAKES rather than a typed percentage, so these sentences follow the
// triangle the day somebody retunes it. See data/armour.js.
const plate = (damage, pierce = 0) =>
  Math.round(damage * TAKES[Math.max(0, 2 - pierce)]);

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
    // AND THE STEEL BOW DRIVES A QUARREL THROUGH PLATE. One rank of physical
    // armour, permanently, on everything this tower does from the moment it is
    // bought — at the owner's ask, and standardised across the two bows exactly as
    // the range is.
    //
    // `pierceUp` RATHER THAN `pierce`, and the difference is the whole of why it
    // is a new field. A `pierce` on an ability is a TOTAL for one shot — Deadeye's
    // 2, Blinding Strike's 1 — and it replaces whatever the weapon had. This is a
    // PASSIVE and it ADDS: the sentry has no break of its own and gains one, the
    // Ballista Turret has one and gains a second. Written as a total on either
    // tower it would have been the wrong number on the other. See pierceUp() in
    // src/towers.js, which sums it exactly as damageK multiplies.
    //
    // AND IT REACHES THE ABILITIES TOO, which is the owner's "all their attacks
    // and abilities" and falls out of where it is applied rather than needing a
    // rule: shoot() adds it after whatever the shot's own break was, so on the
    // turret next door a Heavy Bolt goes through the extra rank exactly as a plain
    // bolt does.
    //
    // WHAT IT IS WORTH: the sentry's 30 against medium plate was 15 and is 22.5.
    // Half again, on the tower with the smallest blow in the game — which is what
    // makes the ability a decision against Swift Reload rather than a strictly
    // smaller version of it.
    pierceUp: 1,
    // AND THE MAN IS RE-DRAWN WITH A STEEL BOW, which is the figure's version of
    // what `frames` does for the ballista's machine. Both of his poses are
    // swapped, because he has two and the swap has to hold whichever one he is
    // showing — see gunnerOf() in src/towers.js. The artist drew them to the same
    // trims and the same shadow pixel as the timber pair, so nothing moves.
    gunner: { sprite: 'crossbowman_steel', attack: 'crossbowman_steel_attack' },

    detail: (a, t) => `The engineers rebuild the bow in steel and the sentry reaches ` +
      `${num(t.range * a.rangeTimes)}px instead of ${t.range} — level with a Ballista ` +
      `Turret that has bought the same thing, and behind only the Musketeer Post.\n\n` +
      `The steel also drives the quarrel through ${a.pierceUp} rank of physical ` +
      `armour, for good: ${t.damage} against medium plate lands ` +
      `${plate(t.damage, a.pierceUp)} instead of ${plate(t.damage)}. Every shot the ` +
      `sentry fires, ordinary or not. The reload and the ${t.damage} a bolt are ` +
      `unchanged, and the crossbowman is drawn with a steel bow from the moment it ` +
      `is bought.`
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
    reloadTimes: 1.5,

    detail: (a, t) => `The crossbowman works a windlass instead of a belt hook and ` +
      `reloads ${a.reloadTimes}x faster — a quarrel every ` +
      `${sec(t.cooldown / a.reloadTimes)} seconds instead of every ${num(t.cooldown)}, ` +
      `which is ${num(t.damage * a.reloadTimes / t.cooldown)} damage a second where ` +
      `the sentry alone does ${num(t.damage / t.cooldown)}.\n\n` +
      `Nothing else changes: the same ${t.damage} a quarrel and the same reach. It ` +
      `stacks with Reinforced Tension rather than competing with it.`
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
    // AND EVERY BALL OF IT BREAKS TWO RANKS, at the owner's ask, against the Post's
    // own 1.
    //
    // `pierce` IS A TOTAL, not a bonus, and that is the difference from `pierceUp`
    // on the two bows above: this is what the SHOT goes through, replacing the
    // tower's own break rather than adding to it. Read in shoot() in src/towers.js,
    // where it was already the shape an ability could name and nothing had ever
    // named it — every ability in the game inherited its tower's pierce until this
    // change.
    //
    // A TOTAL IS THE RIGHT SHAPE FOR A ONE-SHOT BREAK because the sentence is
    // "this bullet goes through two ranks", which is true whatever the musket does
    // the rest of the time. A bonus would have made the card's number depend on a
    // stat the card does not print.
    //
    // WHAT IT IS WORTH: 65 into medium plate was 49 and is 65 — the burst goes from
    // 147 to 195 against an armoured rank, which is the ability's own damage back
    // again. Against unarmoured militia it changes nothing at all, and that is the
    // point: the burst was already a rank-clearer and this stops plate being the
    // one rank it could not clear.
    pierce: 2,
    // NO POSE OF ITS OWN and no ammunition of its own, at the artist's request:
    // "use Attack and normal Bullet images". So the man holds the drawing he
    // already fires in and the balls are the balls he already fires.

    // The long form, shown beside the picture when the card is tapped open. Two or
    // three sentences: what it does, then the thing a player would only find out by
    // watching it for a while.
    detail: (a, t) => `After ${a.every - 1} ordinary shots the musketeer empties ` +
      `${a.shots} bullets into the road as fast as he can work the lock, ${a.gap}s ` +
      `apart, then holds the smoke for ${a.hold} second before loading again. Each ` +
      `ball is the Post's own ${t.damage}, so the burst is ${t.damage * a.shots} in ` +
      `${num((a.shots - 1) * a.gap)} seconds.\n\n` +
      `Each of the ${a.shots} picks a different man, through whatever standing order ` +
      `the tower is on. That is the point of it: ${a.shots} bullets into 1 militiaman ` +
      `is most of them wasted, and ${a.shots} into ${a.shots} of them is a rank gone. ` +
      `With only 1 enemy in reach all ${a.shots} go to him.\n\n` +
      `Every ball of the burst breaks ${a.pierce} ranks of physical armour where the ` +
      `Post's ordinary shot breaks ${t.pierce}, so a burst into medium plate lands ` +
      `${plate(t.damage, a.pierce) * a.shots} rather than ` +
      `${plate(t.damage, t.pierce) * a.shots}. Against an unarmoured rank it changes ` +
      `nothing: this is what stops plate being the 1 rank the burst cannot clear.`
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
    // AND IT GOES THROUGH TWO RANKS, the same total the burst now carries, at the
    // owner's ask — see the note on `pierce` there for why a total rather than a
    // bonus. The two abilities on this tower break the same armour, which is right:
    // what separates them is the size and rarity of the blow, and adding a third
    // axis of difference would make the fork harder to read for nothing.
    //
    // IT MATTERS MOST HERE. Deadeye is bought for "the 1 thing on the road that has
    // to die", and the things that have to die are the things in plate — a giant in
    // medium physical armour took 260 of the 520 and now takes all of it. That is
    // the ability doing what its card already claimed.
    pierce: 2,
    ammo: deadeyeBall,
    pose: DEADEYE_POSE,
    // NO `cue`, and it is not silent. Its noise comes from its AMMUNITION, through
    // the FIRING table in src/towers.js that every other projectile's report goes
    // through — `deadeyeBall` is its own kind, so it gets its own row there. An
    // ability that fires something announces itself by firing it; `cue` is for the
    // two that do not, which are the paladin's.

    detail: (a, t) => `After ${a.every - 1} ordinary shots the musketeer takes ` +
      `${a.lock} second to aim — a mark appears over the man he has chosen and stays ` +
      `there until the bullet arrives — and then fires ${a.shots} round for ` +
      `${a.times}x the Post's own ${t.damage}, ${blow(t.damage, a.times)} damage, the ` +
      `hardest blow in the game. It reaches anywhere on the map: this ${a.shots} shot ` +
      `ignores the tower's range ring entirely.\n\n` +
      `He holds the pose for ${a.hold} seconds afterwards, which costs nothing: the ` +
      `musket takes ${num(t.cooldown)} seconds to load whatever he just fired. Kept ` +
      `for the 1 thing on the road that has to die and cannot be chipped down.\n\n` +
      `The round breaks ${a.pierce} ranks of physical armour where the Post's ` +
      `ordinary shot breaks ${t.pierce}, so it lands ` +
      `${plate(blow(t.damage, a.times), a.pierce)} on medium plate rather than ` +
      `${plate(blow(t.damage, a.times), t.pierce)}. The 1 thing that has to die is ` +
      `usually the 1 thing wearing armour.`
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

    detail: (a, t) => `The moment a paladin drops under ${pc(1 + a.below)} of his ` +
      `health he stops fighting, kneels, and takes ${pc(1 + a.healFrac)} of his full ` +
      `health back over ${a.seconds} seconds — ` +
      `${Math.round(t.soldier.hp * a.healFrac)} on a paladin, more under a Divine ` +
      `Fortitude. He keeps his grip on the enemy the whole time, so the road stays ` +
      `held — and the enemy keeps hitting him, so it is a race rather than a free ` +
      `reset.\n\n` +
      `Each of the ${t.soldier.count} calls it for himself and has his own ` +
      `${a.refresh} seconds before he can call it again, counted from the moment he ` +
      `kneels. A paladin killed anyway takes that clock with him: the man who musters ` +
      `in his place can call the light at once.`
  },
  {
    // IT WAS HOLY SLASH, and the owner renamed it: "there are too many 'Holy'
    // words in abilities". The keep still teaches Holy Light, the altar still
    // grants Holy Wrath, and that is two rather than three.
    //
    // THE NAME IS THE ONLY THING THAT MOVED. `id`, the sprite key, the paladin's
    // pose (`assets/units/Paladin_Blinding_Strike.png`) and the sound
    // (`assets/audio/sfx/Heavy_strike.mp3`, renamed off this ability so the boss
    // could use it too) all still read Holy Slash,
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
    // AND THE STRIKE ITSELF BREAKS A RANK, at the owner's ask — "to this strike
    // only", which is exactly what a `pierce` on an ability means and why it is
    // written here rather than on the paladin.
    //
    // A TOTAL, like the musketeer's two, and on this man it is also the whole of
    // it: a paladin breaks nothing with an ordinary swing, so 1 here is 1 more.
    // The two readings coincide on this tower and would not on the assassin, which
    // is why the field says what the BLOW goes through rather than what the ability
    // adds. See swingPierce in src/units.js.
    //
    // THE THREE ORDINARY BLOWS BEFORE IT ARE UNTOUCHED. That is the shape of the
    // ability — a rhythm with one loud beat — and it is what "this strike only"
    // means on a man who swings four times to use it once.
    //
    // WHAT IT IS WORTH: 40 into medium plate was 20 and is 30. On the man who
    // starts with the least damage in the game, against the enemies a Paladin Keep
    // is posted to hold up.
    pierce: 1,
    pose: BLINDING_STRIKE_POSE,
    cue: 'blindingStrike',

    detail: (a, t) => `${a.every - 1} ordinary blows and then ${a.shots} worth ` +
      `${a.times} of them — ${blow(t.soldier.damage, a.times)} where he normally does ` +
      `${t.soldier.damage} — struck in the time an ordinary swing takes, so the ` +
      `rhythm never breaks.\n\n` +
      `It works out at ` +
      `${num((t.soldier.damage * (a.every - 1) + blow(t.soldier.damage, a.times)) / (a.every * t.soldier.cd))} ` +
      `damage a second against a plain paladin's ${num(t.soldier.damage / t.soldier.cd)}, ` +
      `exactly ${num((a.every - 1 + a.times) / a.every)}x, from the man who starts ` +
      `with the least damage in the game. Each of the ${t.soldier.count} counts his ` +
      `own blows, so the strikes land spread out rather than all at once.\n\n` +
      `The strike also breaks ${a.pierce} rank of physical armour, which his ordinary ` +
      `swings do not: ${blow(t.soldier.damage, a.times)} into medium plate lands ` +
      `${plate(blow(t.soldier.damage, a.times), a.pierce)} rather than ` +
      `${plate(blow(t.soldier.damage, a.times))}. Only the 1 blow in ${a.every}.`
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

    detail: (a, t) => `The assassin throws at ${a.reach}px for ` +
      `${blow(t.soldier.damage, a.times)} — the whole of what his blade does — ` +
      `without leaving his post. ${t.soldier.count} of them is ` +
      `${num(t.soldier.count * blow(t.soldier.damage, a.times) / t.soldier.cd)} damage ` +
      `a second at range, on a tower that is still a wall.\n\n` +
      `No squad in this game walks out to fetch an enemy, so this is the only reach a ` +
      `barracks has. Men who would otherwise wait to be walked into open on the road ` +
      `first, and never break formation to do it. He is out in the open for as long as ` +
      `anything is in reach of him, and gone again the moment the road in front of him ` +
      `is clear.`
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
    // AND A SNEAKED BLOW GOES THROUGH TWO RANKS, at the owner's ask: "any sneak
    // attacks have pierce physical armor 2" — so both halves of it, the blade and
    // the knife, unlike `times` above.
    //
    // ONE NUMBER RATHER THAN TWO, and the asymmetry with `thrownTimes` is the
    // owner's own. The reason the two openers pay different DAMAGE is the risk of
    // getting to arm's length; where the blade goes is a fact about a man striking
    // from behind, and that is the same fact at 100px as at 10.
    //
    // A TOTAL, so it is +1 on this man rather than +2: an assassin already breaks
    // one rank with every blade he swings. That is the field working as intended —
    // it says what the BLOW goes through, and on a tower whose weapon already
    // pierces, a total is the only reading that gives the number on the card.
    //
    // AND IT IS TAKEN AS THE HIGHEST OF WHATEVER APPLIES rather than added on top
    // of a special's own break — see swingPierce in src/units.js. Nothing today
    // has both; a barracks tier 4 that learned this and Blinding Strike would want
    // the blow that goes furthest, not the sum of two claims about how far it goes.
    //
    // WHAT IT IS WORTH: the opening blade is 38, which was 19 through medium plate
    // and is now 38 in full. Against the blocker at the head of a rank — the one
    // enemy an assassin most wants to open on — the ability roughly doubles again.
    pierce: 2,
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

    detail: (a, t) => `The first blow after an assassin shows himself is worth ` +
      `${a.times}x — ${blow(t.soldier.damage, a.times)} where his blade does ` +
      `${t.soldier.damage} — and it comes back the moment he fades again, which in a ` +
      `melee means the opening strike of every fight he picks.\n\n` +
      `Thrown it is worth ${a.thrownTimes}x instead of ${a.times}x: ` +
      `${blow(t.soldier.damage, a.thrownTimes)} on the first blade of a volley, with a ` +
      `heavier knife in the air to say so. Creeping to arm's length is the risk, so it ` +
      `is the one that pays more. His strike lands harder and sounds it.\n\n` +
      `A sneaked blow goes through ${a.pierce} ranks of physical armour where his ` +
      `ordinary blade goes through ${t.soldier.pierce} — both the strike and the ` +
      `throw. The opening blow into medium plate is ` +
      `${plate(blow(t.soldier.damage, a.times), a.pierce)} rather than ` +
      `${plate(blow(t.soldier.damage, a.times), t.soldier.pierce)}, which is what an ` +
      `opener on an armoured man should be worth.`
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
    // AND THE IRON BOW DRIVES A BOLT THROUGH PLATE, the same rank the Crossbow
    // Sentry's version of this buys — see the long note there for why the field is
    // `pierceUp` and adds rather than replacing.
    //
    // IT LANDS SOMEWHERE ELSE ON THIS TOWER, and that is the whole reason a bonus
    // is the right shape. The turret already breaks a rank, so this is its SECOND:
    // 60 into medium plate was 45 and is 60, and into high plate it was 30 and is
    // 45. Written as a total of 1 — the number that is right on the sentry — it
    // would have been a nerf here.
    //
    // AND IT REACHES THE HEAVY BOLT, which is the point of putting the break on
    // the tower rather than on the shot: a turret with both fires its heavy bolt
    // through the same 2 ranks as its plain ones, so 120 lands 90 on medium plate
    // where it used to land 60. The bolt names no break of its own and does not
    // need to — the ability it is bought alongside covers everything the machine
    // throws.
    pierceUp: 1,
    // AND THE MACHINE IS RE-DRAWN IN IRON, which is how the board says the ability
    // is bought. The artist's three frames are the same machine in steel instead
    // of timber, measured to the same trims to the pixel, so the swap moves
    // nothing — see the note beside them in src/assets.js. `frames` is read by
    // framesOf() in src/towers.js, which prefers what the tower OWNS over what the
    // tier ships with.
    frames: ['artillery_t4_tension', 'artillery_t4_reload_tension', 'artillery_t4_fire_tension'],

    detail: (a, t) => `The engineers rebuild the bow in steel and the turret reaches ` +
      `${num(t.range * a.rangeTimes)}px instead of ${t.range} — the 2nd-longest arm in ` +
      `the game, behind only the Musketeer Post, on the one tower that has no dead ` +
      `zone in it.\n\n` +
      `The iron also drives the bolt through ${a.pierceUp} more rank of physical ` +
      `armour, ${t.pierce + a.pierceUp} in all: ${t.damage} against medium plate lands ` +
      `${plate(t.damage, t.pierce + a.pierceUp)} instead of ` +
      `${plate(t.damage, t.pierce)}. Every bolt, ordinary or heavy — the same reload ` +
      `and the same blast, and the machine is drawn in iron from the moment it is ` +
      `bought.`
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

    detail: (a, t) => `Every ${a.every}th bolt comes off the rack burning and hits ` +
      `for ${a.times}x the damage — ${blow(t.damage, a.times)} instead of ${t.damage}. ` +
      `There is no wind-up: the machine works at its ordinary rhythm right up to the ` +
      `shot.\n\n` +
      `The reload afterwards takes ${pc(a.afterTimes)} longer — ` +
      `${num(t.cooldown * a.afterTimes)} seconds instead of ${num(t.cooldown)} — so ` +
      `the cycle runs ` +
      `${Array.from({ length: a.every }, (_, i) => num(t.cooldown * (i === a.every - 1 ? a.afterTimes : 1))).join(' / ')}. ` +
      `That works out at ` +
      `${num((t.damage * (a.every - 1) + blow(t.damage, a.times) + a.ammo.burn.dps * a.ammo.burn.seconds) / (t.cooldown * (a.every - 1 + a.afterTimes)))} ` +
      `damage a second against a plain turret's ${num(t.damage / t.cooldown)}.\n\n` +
      `The shaft goes on burning in the wound: ${a.ammo.burn.dps} a second for ` +
      `${a.ammo.burn.seconds} seconds, ${a.ammo.burn.dps * a.ammo.burn.seconds} more ` +
      `on everything the bolt caught, over the same ${t.splash}px it burst across. ` +
      `Fire is true damage — no armour in the game turns it aside — so against ` +
      `medium plate the bolt itself lands ` +
      `${plate(blow(t.damage, a.times), t.pierce)} and the fire adds its full ` +
      `${a.ammo.burn.dps * a.ammo.burn.seconds} on top.\n\n` +
      `What it buys is the shape rather than the size: the same output in fewer, ` +
      `harder blows, on a machine whose every shot already bursts. You can hear which ` +
      `one it is — the heavy bolt leaves louder than the others.`
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

    detail: (a, t) => `Every ${a.every}th ball leaves the barrel alight. It hits for ` +
      `the ordinary ${t.damage} and sets fire to what it catches: ` +
      `${a.ammo.burn.dps} damage a second for ${a.ammo.burn.seconds} seconds, which no ` +
      `armour turns aside.\n\n` +
      `The fire reaches further than the ball breaks — ` +
      `${num(t.splash * a.ammo.burn.splashTimes)}px of flame around a blast of ` +
      `${t.splash}px — so men standing just clear of the crater burn anyway. They carry the ` +
      `flame over their health bar until it goes out, and you can hear which shot it ` +
      `was.\n\n` +
      `The reload after it takes ${pc(a.afterTimes)} longer — ` +
      `${num(t.cooldown * a.afterTimes)} seconds instead of ${num(t.cooldown)} — so ` +
      `the cycle runs ` +
      `${Array.from({ length: a.every }, (_, i) => num(t.cooldown * (i === a.every - 1 ? a.afterTimes : 1))).join(' / ')}. ` +
      `Against 1 straggler that is ` +
      `${num((t.damage * a.every + a.ammo.burn.dps * a.ammo.burn.seconds) / (t.cooldown * (a.every - 1 + a.afterTimes)))} ` +
      `damage a second where the outpost alone does ${num(t.damage / t.cooldown)} — so ` +
      `it is not bought for one man. Against a rank it is ` +
      `${a.ammo.burn.dps * a.ammo.burn.seconds} extra on each of them, and that is what ` +
      `it is for. Swift Reload shortens the pause with everything else, to ` +
      `${num(t.cooldown * (a.afterTimes - 1) / 1.5)} second.`
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

    detail: (a, t) => `The gun crew work a faster drill and the cannon reloads ` +
      `${a.reloadTimes}x quicker — a ball every ${num(t.cooldown / a.reloadTimes)} ` +
      `seconds instead of every ${num(t.cooldown)}, which is ` +
      `${num(t.damage * a.reloadTimes / t.cooldown)} damage a second where the outpost ` +
      `alone does ${num(t.damage / t.cooldown)}.\n\n` +
      `Nothing else changes: the same ${t.damage} a ball, the same ${t.splash} blast ` +
      `and the same ${t.range} reach. The machine visibly works faster — its 3 beats ` +
      `are the clock, so the drill you see is the reload the rules use.`
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

    detail: a => `Every man a barracks musters carries ${pc(a.aura.hp)} more health, ` +
      `on every tier and anywhere on the map: a spearman goes from ` +
      `${barracks[0].soldier.hp} to ${Math.round(barracks[0].soldier.hp * a.aura.hp)} ` +
      `and a paladin from ${towerOf('Paladin Keep').soldier.hp} to ` +
      `${Math.round(towerOf('Paladin Keep').soldier.hp * a.aura.hp)}.\n\n` +
      `It reaches men already standing on the road, not only the next ones to muster, ` +
      `and a wounded man keeps the share of his health he had. A heart and an arrow ` +
      `appear over every barracks it is working on, and a second altar compounds with ` +
      `the first — marked x2 on the badge.`
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

    detail: a => `Every archery tower, artillery machine and monastery on the map ` +
      `hits for ${pc(a.aura.damage)} more, wherever it stands. The altar does not have ` +
      `to see them and does not fire any differently itself.\n\n` +
      `Barracks men are the exception: their damage belongs to the man rather than to ` +
      `the tower. A sword and an arrow appear over every tower it is working on, and a ` +
      `second altar that has bought it compounds with the first — ${pc(a.aura.damage)} ` +
      `on top of ${pc(a.aura.damage)}, marked x2 on the badge.`
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
    // AND A SECOND RANK OF MAGIC ARMOUR, at the owner's ask — "bringing its normal
    // attacks to pierce magic armor to 2", which is the sentence that decided the
    // field. A total of 2 is what the temple ends up with; what this ability adds
    // is 1, because the temple already breaks one.
    //
    // `pierceUp`, THE SAME FIELD THE TWO BOWS CARRY, and it needs no `magic` in its
    // name: pierce is only ever measured against the armour of the attack's own
    // kind — see rankAgainst in data/armour.js — so a break on a magic tower is a
    // magic break by construction. That is why one field covers a crossbow and a
    // monk without a branch anywhere.
    //
    // IT COMPOUNDS WITH THE DAMAGE RATHER THAN OVERLAPPING IT, which is what makes
    // this a bigger buy than it looks. 40 becomes 52, and 52 through medium magic
    // armour was 26 and is now 52 — so against the things that actually wear magic
    // plate the ability is worth twice what its own card's 30% says. That is the
    // right way round for the tower whose fork is "the cadence one": the High
    // Altar answers a giant with one big blow and this answers a rank of warded
    // enemies with a stream that they cannot ward.
    pierceUp: 1,
    shot: monkStrongShot,
    shotWith: { pulse: monkBothShot },

    detail: (a, t) => `Every blast a monk throws hits for ${pc(a.damageTimes)} more: ` +
      `${t.damage} becomes ${blow(t.damage, a.damageTimes)}, and the temple goes from ` +
      `${num(t.damage / t.cooldown)} to ` +
      `${num(blow(t.damage, a.damageTimes) / t.cooldown)} damage a second. Both monks, ` +
      `every shot, from the moment it is bought.\n\n` +
      `That is more a second than a High Altar does at ` +
      `${num(towerOf('High Altar').damage / towerOf('High Altar').cooldown)}, on the ` +
      `same rung for the same gold — and still ` +
      `${towerOf('High Altar').damage - blow(t.damage, a.damageTimes)} short of the ` +
      `altar on the blow itself, which is what the 2 towers are for. The comet is ` +
      `redrawn, and redrawn again in blue if the temple has also learned Slowed Pulse.\n\n` +
      `The monks also learn to throw through ${a.pierceUp} more rank of magic armour, ` +
      `${t.pierce + a.pierceUp} in all: the bigger blast lands ` +
      `${plate(blow(t.damage, a.damageTimes), t.pierce + a.pierceUp)} on medium wards ` +
      `where the temple alone lands ${plate(t.damage, t.pierce)}. Against anything ` +
      `warded the ability is worth far more than its ${pc(a.damageTimes)} says.`
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

    detail: (a, t) => `Every blast a monk throws now holds a man up: ` +
      `${pc(a.shot.slow.times)} off how fast he walks and ${pc(a.shot.slow.times)} off ` +
      `how often he swings, for ${a.shot.slow.seconds} seconds, and 2 chevrons appear ` +
      `over his health bar while it lasts. The temple looses on a ${num(t.cooldown)} ` +
      `second cadence, so anything it keeps firing at stays slowed — and ` +
      `stays slowed for ${a.shot.slow.seconds} seconds after it walks out of reach.` +
      `\n\n` +
      `It does not stack. A 2nd temple on the same man refreshes the ` +
      `${a.shot.slow.seconds} seconds rather than stacking a 2nd slow on him — what 2 ` +
      `of them buy is the slow holding across a wider stretch of road, not a man ` +
      `standing still. Both monks throw it, and it costs the tower nothing: the ` +
      `damage, the reach and the cadence are exactly what they were.\n\n` +
      `A boss shrugs off ${pc(1 + BOSS_SLOW_SHARE)} of it — ` +
      `${pc(slowOn({ def: { boss: true } }, a.shot.slow.times))} instead of ` +
      `${pc(a.shot.slow.times)}, for the same ${a.shot.slow.seconds} seconds. ` +
      `Slowing the 1 thing on the road that cannot be outrun is worth something, but ` +
      `it is not worth what it is worth against a wave.`
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

// --- and the descriptions, resolved -----------------------------------------------
//
// Called ONCE, here, rather than at every draw: `detail` is read by the encyclopedia
// on every frame the ability page is open, and a card's prose does not change while
// a game is running — the tower stats it quotes are data, not state.
//
// AFTER the array, because each one needs the finished entry and the def of the
// tower named in its own `of`. An ability whose `of` names no tower is a wiring
// mistake rather than a missing sentence, so it is left to throw here where the
// stack says which one it was, instead of printing "undefined" on a card.
for (const a of ABILITIES) {
  if (typeof a.detail === 'function') a.detail = a.detail(a, towerOf(a.of));
}
