import { bolt } from './towers.js';

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
// ONE MECHANISM, FOUR ABILITIES, and it is worth naming the parts because all four
// are built from them:
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
  speed: 520,
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
  trim: [172, 148, 196, 190],
  hold: [0.082, 0.908],
  grip: 0.082,
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

// The three poses the artist drew for these. Each is registered on the SAME source
// pixel as the man's own drawings — `node tools/shadow.mjs` checks all three — so
// swapping to one of them cannot move him sideways.
//
// Holy Slash is drawn in the paladin's Attack box exactly, [135, 212, 178, 116]:
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

const HOLY_SLASH_POSE = {
  sprite: 'paladin_holy_slash',
  trim: [135, 212, 178, 116],
  pivot: [0.798, 0.905]
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
    id: 'burst',
    name: 'Burst Fire',
    // Which tower teaches it. A caption for the encyclopedia, and the only place
    // an ability names its tower — the binding that matters is the other way
    // round, in the `abilities` list on the tier's own def.
    of: 'Musketeer Post',
    icon: 'ability_burst',
    cost: ABILITY_COST,
    // "Shoot 3 times consecutively at a rapid rate every 5 normal shots." Five
    // ordinary shots and then the burst is a cycle of six, which is what `every`
    // counts — the sixth trigger of the tower's reload is the one that fires
    // three balls instead of one.
    every: 6,
    // The three balls, and the gap between them. 0.18s is a fifth of the fastest
    // reload in the game and about as quick as three distinct cracks can be told
    // apart by ear; faster reads as one noise and one muzzle flash.
    shots: 3,
    gap: 0.18,
    hold: HOLD,
    // THREE DIFFERENT MEN, at the artist's request, and it is what the ability is
    // FOR. Three balls into one militiaman is 180 damage spent on 80 health; three
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
    detail: 'After five ordinary shots the musketeer empties three bullets into ' +
            'the road as fast as he can work the lock, a fifth of a second apart, ' +
            'then holds the smoke for a second before loading again.\n\n' +
            'Each of the three picks a different man, through whatever standing ' +
            'order the tower is on. That is the point of it: three bullets into one ' +
            'militiaman is most of them wasted, and three into three of them is a ' +
            'rank gone. With only one enemy in reach all three go to him.'
  },
  {
    id: 'deadeye',
    name: 'Deadeye',
    of: 'Musketeer Post',
    icon: 'ability_deadeye',
    cost: ABILITY_COST,
    // TEN ORDINARY SHOTS AND THEN THE BALL, so the cycle is eleven — read `every`
    // the same way Burst Fire's 6 is read. It is nearly twice as rare as the burst
    // and hits five times as hard, which is the shape the artist asked for: the
    // burst is a rhythm you stop noticing and this is an event.
    every: 11,
    shots: 1,
    // TWO SECONDS of held pose, not one. It is the biggest single blow in the game
    // and he stands over it. Still free, because the musket takes 2.4s to load
    // either way.
    hold: LONG_HOLD,
    // ONE SECOND OF WARNING before it goes. The tower picks its man while the ball
    // is still being rammed home and paints a mark over his head, and the mark stays
    // there until the shot lands — see `t.locked` in src/towers.js and the marker in
    // render.js. It is the only ability in the game that announces itself before it
    // happens, and at 300 damage it should: the player gets a second to see where
    // the shot is going.
    lock: 1,
    // 300, and it is the biggest number in the game by a factor of four — the next
    // hardest single blow is the tower's own 60. Ten ordinary shots plus one of
    // these is 900 damage over eleven reloads, which is 34.1 a second against a
    // plain Post's 25.0.
    //
    // That lands it a shade above Burst Fire's 33.3, and the two are meant to be
    // close: what separates them is not how much damage they add but WHERE it goes.
    // The burst clears a rank of militia; this removes one giant.
    damage: 300,
    ammo: deadeyeBall,
    pose: DEADEYE_POSE,
    // NO `cue`, and it is not silent. Its noise comes from its AMMUNITION, through
    // the FIRING table in src/towers.js that every other projectile's report goes
    // through — `deadeyeBall` is its own kind, so it gets its own row there. An
    // ability that fires something announces itself by firing it; `cue` is for the
    // two that do not, which are the paladin's.

    detail: 'After ten ordinary shots the musketeer takes a second to aim — a mark ' +
            'appears over the man he has chosen and stays there until the bullet ' +
            'arrives — and then fires a single round for 300 damage, five times the ' +
            'Post\'s ordinary shot and the hardest blow in the game.\n\n' +
            'He holds the pose for two seconds afterwards, which costs nothing: the ' +
            'musket takes 2.4 seconds to load whatever he just fired. Kept for the ' +
            'one thing on the road that has to die and cannot be chipped down.'
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
    heals: 200,
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
            'kneels, and takes 200 health back over three seconds. He keeps his grip ' +
            'on the enemy the whole time, so the road stays held — and the enemy ' +
            'keeps hitting him, so it is a race rather than a free reset.\n\n' +
            'Each of the three calls it for himself and has his own thirty seconds ' +
            'before he can call it again, counted from the moment he kneels. A paladin ' +
            'killed anyway takes that clock with him: the man who musters in his place ' +
            'can call the light at once.'
  },
  {
    id: 'slash',
    name: 'Holy Slash',
    of: 'Paladin Keep',
    icon: 'ability_slash',
    cost: ABILITY_COST,
    // "A strike every 5 attacks", so the fifth blow is the strike and four
    // ordinary ones come before it. Read the field the same way as the musketeer's
    // 6 above: it is the length of the cycle, and the last action of the cycle is
    // the special one.
    //
    // IT WAS EVERY TENTH AT 70 DAMAGE, held for two seconds. Twice as often for
    // rather more than half as hard is very nearly the same sum — 13.25 damage a
    // second against the old 13.3 — so what changed is not how much the ability is
    // worth but what it FEELS like: a rhythm you can see rather than one enormous
    // blow every eight seconds followed by a paladin standing still.
    every: 5,
    shots: 1,
    // 35, five times an ordinary blow. Four swings at 7 plus one at 35 is 63 where
    // five swings would be 35.
    //
    // IT WAS 70 EVERY TENTH, THEN 25 EVERY FIFTH, AND IS 35 EVERY FIFTH. The middle
    // number came down with the hold and this is the owner putting some of it back
    // now that the pose costs nothing: 15.75 damage a second against a plain
    // paladin's 8.75, where the original every-tenth version worked out at 13.3.
    damage: 35,
    // NO PAUSE OVER IT ANY MORE. `hold` is null rather than a number of seconds,
    // which units.js reads as "the man's own attack time" — 0.80s on a paladin, the
    // same as the swing it replaces — so the pose is up for exactly one beat of
    // fighting and the next blow lands on schedule. The artist's words: they hold
    // that position like normal attack time.
    //
    // Null rather than 0.80 typed here, because the paladin's cd is his own number
    // and this has to follow it. Typing the value would leave a Holy Slash frozen
    // at a swing rate the man no longer has the day somebody tunes him.
    //
    // It also means the whole cost of the ability is now the strike's rarity. The
    // two seconds used to be the brake — 14.5 a second where a free pose would have
    // been 16.6 — and taking the brake off is exactly why the damage came down.
    hold: null,
    pose: HOLY_SLASH_POSE,
    cue: 'holySlash',

    detail: 'Four ordinary blows and then one for 35 — five times what a paladin ' +
            'normally does — struck in the time an ordinary swing takes, so the ' +
            'rhythm never breaks.\n\n' +
            'It works out at 15.75 damage a second against a plain paladin\'s 8.75, ' +
            'nearly double, from the man who starts with the least damage in the ' +
            'game. Each of the three counts his own blows, so the strikes land ' +
            'spread out rather than all at once.'
  },
  {
    id: 'farshot',
    name: 'Far Shot',
    of: 'Ballista Turret',
    icon: 'ability_farshot',
    cost: ABILITY_COST,
    // THE FIRST ABILITY THAT IS NEITHER A RHYTHM NOR A REACTION. It has no
    // `every` and no trigger at all: it is bought, and from then on the tower
    // simply reaches further. Holy Light was the first thing here that did not fit
    // the `every` shape; this is the second, and the two do not resemble each
    // other either, which is why the mechanism is a bag of optional fields rather
    // than one class with four subclasses.
    //
    // 480, WHICH IS THE MUSKETEER POST'S OWN REACH, at the owner's request: the
    // ballista goes from the shortest arm in the artillery family to the longest
    // in the game, for 150 gold. It does not make the Post's claim in
    // tools/families.mjs untrue — that is a claim about towers as they are sold,
    // and this is a thing you buy afterwards — but it is the one place in the game
    // where another tower can match that reach, and it is worth knowing.
    //
    // What it does NOT touch is the dead zone: tier 4 has none to start with, so
    // Far Shot makes it the one tower in the game that covers everything from its
    // own feet to 480px out.
    range: 480,
    // AND THE MACHINE IS RE-DRAWN IN IRON, which is how the board says the ability
    // is bought. The artist's three frames are the same machine in steel instead
    // of timber, measured to the same trims to the pixel, so the swap moves
    // nothing — see the note beside them in src/assets.js. `frames` is read by
    // framesOf() in src/towers.js, which prefers what the tower OWNS over what the
    // tier ships with.
    frames: ['artillery_t4_far', 'artillery_t4_reload_far', 'artillery_t4_fire_far'],

    detail: 'The engineers rebuild the bow in steel and the turret reaches 480px ' +
            'instead of 260 — the longest arm in the game, level with a Musketeer ' +
            'Post, on the one tower that has no dead zone in the middle of it.\n\n' +
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
    // Two ordinary bolts and then the heavy one, so the cycle is three — read
    // `every` the same way Burst Fire's 6 and Holy Slash's 5 are read. It is the
    // shortest cycle any ability has: a third of every shot this tower fires.
    every: 3,
    shots: 1,
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

    detail: 'Every third bolt comes off the rack burning and hits for twice the ' +
            'damage. There is no wind-up and no pause: the machine works at its ' +
            'ordinary rhythm and one shot in three is simply worth two.\n\n' +
            'It raises the turret from 33.3 damage a second to 44.4, which is the ' +
            'most any single tower in the game does. You can hear which one it is ' +
            '— the heavy bolt leaves louder than the others.'
  },
  {
    id: 'wrath',
    name: 'Holy Wrath',
    of: 'Judgement Temple',
    icon: 'ability_wrath',
    cost: ABILITY_COST,
    // THE FIRST ABILITY THAT LEAVES ITS OWN PLOT. Everything before it changed the
    // tower that bought it — how often it fires, how far, how hard, what it looks
    // like. This changes every OTHER tower on the map, which is a third shape
    // again: no `every`, no threshold, and nothing about the temple itself moves.
    //
    // `aura` is that shape, and it is deliberately a plain object rather than a
    // predicate. `on` is a list of family ids, so the rule can be read, printed and
    // checked without running it — see tools/abilities.mjs, which asks it what it
    // covers rather than watching what it does.
    aura: {
      // A TENTH MORE DAMAGE on every shot fired by a bow, a machine or a staff.
      // Barracks men are excluded at the owner's word, and it is the right line:
      // their damage is a field on a MAN rather than on the tower, and a wall that
      // also hit harder would be the thing this game most carefully does not sell.
      damage: 1.1,
      on: ['archery', 'siege', 'monastery'],
      // What is drawn over each tower it is working on. The badge is the whole
      // feedback — an aura with no picture is a number the player has to take on
      // trust — and the artist drew one per ability: a sword and an up arrow.
      badge: 'badge_wrath'
    },

    detail: 'Every archery tower, artillery machine and monastery on the map hits ' +
            'for a tenth more, wherever it stands. The temple does not have to see ' +
            'them and does not fire any differently itself.\n\n' +
            'Barracks men are the exception: their damage belongs to the man rather ' +
            'than to the tower, and a wall that also hit harder would be a different ' +
            'game. A sword and an arrow appear over every tower it is working on.'
  },
  {
    id: 'fortitude',
    name: 'Divine Fortitude',
    of: 'Judgement Temple',
    icon: 'ability_fortitude',
    cost: ABILITY_COST,
    aura: {
      // A FIFTH MORE HEALTH on every man a barracks musters, of every tier — a
      // spearman goes 100 to 120 and a paladin 275 to 330.
      //
      // It is applied to `maxHp` every frame rather than added once when the
      // ability is bought, and that is what makes buying it mid-wave, selling the
      // temple, and mustering a fresh man after either one all behave without a
      // single hook. A man who is half wounded stays half wounded across the
      // change — see updateUnits.
      hp: 1.2,
      on: ['barracks'],
      badge: 'badge_fortitude'
    },

    detail: 'Every man a barracks musters carries a fifth more health, on every ' +
            'tier and anywhere on the map: a spearman goes from 100 to 120 and a ' +
            'paladin from 275 to 330.\n\n' +
            'It reaches men already standing on the road, not only the next ones to ' +
            'muster, and a wounded man keeps the share of his health he had. A heart ' +
            'and an arrow appear over every barracks it is working on.'
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
