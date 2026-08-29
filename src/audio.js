// Sound. Two rules, and the rules are the whole design.
//
//   play(cue)     Category B — every time, however many at once.
//   solo(cue)     Category A — one at a time, then a second of quiet.
//
// Category A is a SINGLE CHANNEL shared by everything in it. While one of its
// clips is sounding, every other Category A request is dropped on the floor —
// not queued, dropped — and when it finishes nothing else may start for a
// second. That is what keeps a fight from turning into a wall: six soldiers
// swinging, two dying and a thug jeering all land inside the same half second,
// and without the channel you would hear all nine at once.
//
// Dropped rather than queued is the important half. A queue would play the
// death cry of a man who died four seconds ago, which is worse than silence —
// it is sound that lies about what is on the screen right now.
//
// Category B is the sound of the battle itself — arrows leaving bows, blades
// landing. Every one of them is a thing you can see happen, so every one of them
// makes its noise; ten towers firing is ten twangs.
//
// It is BACKGROUND, though, and mixed like it. Category B runs through a bus of
// its own that sits well under Category A and drops further the moment a
// Category A clip starts, coming back up when it finishes. So a death cry cuts
// through a battle rather than competing with it, and nothing has to be
// silenced to make room — which is the whole reason these sounds are in
// Category B and not fighting for the one channel.
//
// --- Web Audio, not <audio> ------------------------------------------------
//
// One AudioContext, each file decoded once into a buffer, and a play is a
// throwaway node pointed at it. An <audio> element cannot overlap itself
// without being cloned, and on a phone it carries tens of milliseconds of
// startup lag — which is precisely the lag this game cannot have, since it is
// the gap between the bowstring and the twang.
//
// --- This file must stay importable in Node ---------------------------------
//
// tools/sim.mjs runs the real combat modules headless, and they call in here.
// So nothing at module level may touch a browser API: the context is built
// lazily, and every entry point returns quietly when there is no context. In
// Node there never is one, and the sim runs in silence without knowing why.

// The quiet after a Category A clip, in seconds.
const GAP = 1;

// The shortest gap between two plays of THE SAME Category B clip. This is not a
// throttle and must never grow into one — it exists because at 2x speed the
// game steps twice in one frame, so two towers can fire on the very same
// millisecond. Two identical buffers starting together do not sound like two
// arrows, they sound like one loud click, because the waveforms add. 40ms is
// under the ear's ability to separate two clicks anyway, so nothing audible is
// lost, and two shots 100ms apart are still two shots.
const SAME_CLIP_GAP = 0.04;

// Master level for everything. Per-clip trims go in GAIN below.
const MASTER = 0.9;

// --- How far under Category A the background sits ---------------------------
//
// Two numbers, both in gain rather than decibels because that is what the Web
// Audio API takes. BG_LEVEL is where the battle sits normally; BG_DUCKED is
// where it drops to while something in Category A is speaking.
//
// 0.45 is about 7dB under Category A, which is the difference between a sound
// you notice and one you listen to. 0.15 is a further 9dB or so, the usual
// broadcast duck for getting a voice over a bed of noise: still clearly there,
// no longer competing.
//
// These are the knobs if the battle is too loud or the ducking too obvious.
const BG_LEVEL = 0.45;
const BG_DUCKED = 0.15;

// How quickly the background gets out of the way, and how leisurely it comes
// back, as time constants in seconds. Down fast enough not to talk over the
// first syllable, up slowly enough that the return is not itself an event.
const DUCK_IN = 0.04;
const DUCK_OUT = 0.25;

// --- Levelling, measured rather than declared -------------------------------
//
// The clips arrive up to 20dB apart. Measured across the fourteen: the voices
// were never normalised and peak around 0.12, while the death effects peak near
// 1.0 — so `Archery_1` came in 9.6dB under the middle of the pack and
// `Thug_dies` 10.1dB over it. Nothing in the mixing above can survive that. A
// bus sitting "7dB under" means nothing when the clips on it differ by twenty.
//
// So every clip is analysed once, at load, and given the gain that brings it to
// a common loudness. Measured rather than typed into a table on purpose: this
// project re-uploads audio constantly, and a hand-tuned table would be silently
// wrong the moment a file was re-recorded — the sound would just be off, with
// nothing to point at. Analysis costs a few milliseconds for the whole folder
// and cannot go stale.
//
// One target for BOTH categories, which is what finally makes BG_LEVEL honest:
// with every clip arriving at the same loudness, the bus gain is the only thing
// setting how far the battle sits under the voices, and it means exactly what
// it says.
const TARGET_LOUD = 0.09;

// Loudness is the RMS of the loudest window of this many seconds, not of the
// whole clip. Whole-clip RMS punishes a sound for having a tail of quiet, which
// is not a difference the ear hears as loudness — it would push a clip with a
// long decay up until its attack was painful.
const LOUD_WINDOW = 0.3;

// How far the automatic gain may go in either direction. A clip recorded at
// almost nothing would otherwise be multiplied until its noise floor was the
// loudest thing in the game.
//
// The ceiling was 4 and is 5 because a real upload needed 4.55: `Archery_5`
// came in at 0.0198, peaking at 0.089, which is a quiet recording rather than a
// broken one. A clamp that bites on a file nothing is wrong with is set too
// tight — it would have left that line about a decibel under everything else,
// which is the exact defect this whole mechanism exists to remove.
//
// Even at the ceiling the arithmetic stays safe: the loudest a clip can come
// out is its peak times the gain, and the quiet files that need the boost are
// quiet in peak as well — 0.089 x 4.55 is 0.40, nowhere near clipping.
const GAIN_MIN = 0.1;
const GAIN_MAX = 5;

// Anything quieter than this counts as silence when finding where a clip really
// starts and ends. Absolute rather than a share of the peak, so a quiet clip is
// not credited with a quiet opening.
const FLOOR = 0.01;

// --- How Category A shares itself out ---------------------------------------
//
// The gate alone is first-come-first-served, and that is not a fair contest.
// Soldiers swing every 0.9s each and there are several of them, so `Soldier_
// attack` asks for the channel far more often than anything else and therefore
// wins it far more often. A recorded 90-second run came out 12 swings to 4 of
// everything else, which is not a soundtrack, it is a metronome.
//
// So a clip has to earn the channel against what has just been heard, not only
// against what else is asking right now. Two rules, both reading the same
// short memory of what actually played:
//
//   never the same clip twice running
//   never more than twice in the last five
//
// A clip that fails either is passed over and — this is the part that makes it
// "priority" rather than "throttling" — the gate is left OPEN, so the next
// thing along can take the slot the swing just gave up.
//
// The ceiling falls out of the two together: with at most two appearances in
// five and never two in a row, no clip can exceed 2/5 of what you hear.
const MEMORY_N = 5;
const MAX_REPEATS = 2;

// How long the channel must stay QUIET before the memory is wiped, in seconds.
//
// Some expiry is needed or the rules deadlock in the quietest case: a stretch
// where one thing keeps happening and nothing else does plays it once and then
// nothing at all for the rest of the game, because "not twice running" has no
// other sound to be broken by and no way to lapse.
//
// But it is quiet that clears the memory, not age — the last five plays are the
// last five plays however long they took. An earlier version expired each entry
// on its own clock and the share rule quietly stopped working: most cues have a
// single take now, so they are passed over often, so plays come further apart —
// about 4.5s in a measured fight — and five of them no longer fitted inside the
// window. The rule was still running; it just never had five plays to look at.
//
// Wiping on silence instead keeps the two cases apart. In a fight nothing is
// ever 20s quiet, so the memory is exactly the last five plays and the share
// rule means what it says. In a lull the slate clears and everything is fair
// game again — so a cue with nothing to alternate with repeats every 20s rather
// than never.
const MEMORY_S = 20;

// Every clip, by the name the game calls it. Every path is a plain URL — the
// project has no filenames with spaces left in it. Keep it that way; if one
// arrives, encode the space as %20 here rather than renaming the artist's file.
const paths = {
  // The one sound the UI makes. Not a battle noise at all — it answers the
  // player's finger rather than anything happening on the board.
  select:          'assets/audio/sfx/Select_Sound.mp3',
  // Taking a tower down. The third of the three deliberate money noises, beside
  // the family lines a build and an upgrade play.
  sell:            'assets/audio/sfx/Sell_Tower.mp3',
  // A flask breaking. Its own clip rather than a quieter rock, because the two
  // land for opposite reasons: a rock is the damage arriving and a flask is the
  // damage STARTING.
  flask_break:     'assets/audio/sfx/Flask_Break.mp3',
  arrow_shot:      'assets/audio/sfx/Arrow_shot.mp3',
  // The monastery. A missile leaving a staff, and it announces itself on the way
  // out exactly as an arrow does — see the two flags on every ammunition in
  // data/towers.js. Category B, because several shrines can fire at once and a
  // shared channel would silence all but one of them.
  arcane_shot:     'assets/audio/sfx/Arcane_shot.mp3',
  arrow_kill_enemy: 'assets/audio/sfx/Arrow_kill_enemy.mp3',
  // The musket. Two clips, and they are the same pair the bow has: the crack of
  // the shot every time one is fired, and a separate line for a musketeer taking a
  // man down. A musket ball arriving is silent — see the two flags on `bullet` in
  // data/towers.js — so there is no third.
  musketeer_shot:   'assets/audio/sfx/Musketeer_shot.mp3',
  musketeer_kill_enemy: 'assets/audio/sfx/Musketeer_kill_enemy.mp3',
  // The Crossbow Sentry's pair, on exactly the same split: the bow loosing every
  // time it fires, and a separate line for a crossbowman finishing somebody.
  crossbow_shot:    'assets/audio/sfx/Crossbow_bolt_shot.mp3',
  crossbowman_kill_enemy: 'assets/audio/sfx/Crossbowman_kill_enemy.mp3',
  // The assassin's pair, and it is the same split every weapon in the game has:
  // the blade landing every time he swings, and a separate line for him
  // finishing somebody.
  assassin_melee_attack: 'assets/audio/sfx/Assassin_melee_attack.mp3',
  assassin_kill_enemy:   'assets/audio/sfx/Assassin_kill_enemy.mp3',
  // The ballista. The same pair again, and the third weapon in the game to have
  // them: the bolt going off every time one is loosed, and a separate line for
  // the engineer taking a man down. A bolt arriving is silent — see the two flags
  // on `bolt` in data/towers.js — so there is no third.
  ballista_shot:    'assets/audio/sfx/Ballista_Bolt_shot.mp3',
  ballista_kill_enemy: 'assets/audio/sfx/Ballista_kill_enemy.mp3',
  // The pope. HALF a pair, and the missing half is the point: he fires the
  // monastery's own `arcane_shot` rather than a clip of his own — the artist
  // asked for the same noise, slightly louder — so the only new file here is the
  // line for him taking a man down. See `fireGain` on his missile in
  // data/towers.js for where the "louder" lives.
  pope_kill_enemy:  'assets/audio/sfx/Pope_kill_enemy.mp3',
  // THE THREE ABILITY SOUNDS, all Category B and all for the same reason the shots
  // and the swings are: they are things that HAPPEN, several can happen at once —
  // three paladins in one squad, two Posts on one map — and a shared channel would
  // silence all but the first.
  //
  // Burst Fire has none, and that is right rather than missing: it fires the
  // musket's own ball three times, so it already makes the musket's own noise three
  // times. Three cracks in half a second IS what a burst sounds like.
  musketeer_deadeye:  'assets/audio/sfx/Musketeer_Deadeye.mp3',
  paladin_holy_light: 'assets/audio/sfx/Paladin_Holy_Light.mp3',
  paladin_holy_slash: 'assets/audio/sfx/Paladin_Holy_Slash.mp3',
  // The catapult. Nothing plays when the arm comes over — the rock is silent in
  // the air and announces itself by LANDING, which is also the moment the player
  // is looking at. See the artillery section in assets/audio/README.md.
  rock_hit_ground: 'assets/audio/sfx/Rock_hit_ground.mp3',
  rock_kill_enemy:  'assets/audio/sfx/Rock_kill_enemy.mp3',
  thug_dies:       'assets/audio/sfx/Thug_dies.mp3',
  soldier_dies:    'assets/audio/sfx/Soldier_dies.mp3',
  // A paladin's sword. His own blow rather than one of the three generic takes,
  // because a tier 4 squad should be audibly the one doing the fighting — and
  // Category B beside them, for the same reason: every swing lands its own blow.
  paladin_attack:  'assets/audio/sfx/Paladin_attack.mp3',
  paladin_kill_enemy: 'assets/audio/sfx/Paladin_kill_enemy.mp3',
  attack_1:        'assets/audio/sfx/Attack_1.mp3',
  attack_2:        'assets/audio/sfx/Attack_2.mp3',
  attack_3:        'assets/audio/sfx/Attack_3.mp3',
  archery_1:       'assets/audio/voice/Archery_1.mp3',
  archery_2:       'assets/audio/voice/Archery_2.mp3',
  archery_3:       'assets/audio/voice/Archery_3.mp3',
  archery_4:       'assets/audio/voice/Archery_4.mp3',
  archery_5:       'assets/audio/voice/Archery_5.mp3',
  barracks_1:      'assets/audio/voice/Barracks_1.mp3',
  barracks_2:      'assets/audio/voice/Barracks_2.mp3',
  barracks_3:      'assets/audio/voice/Barracks_3.mp3',
  barracks_4:      'assets/audio/voice/Barracks_4.mp3',
  barracks_5:      'assets/audio/voice/Barracks_5.mp3',
  thug_1:          'assets/audio/voice/Thug_1.mp3',
  // Recorded. These were wired a commit before the files existed and played the
  // moment they landed, with no code change — which is the whole reason to wire
  // ahead rather than wait.
  artillery_1:     'assets/audio/voice/Artillery_1.mp3',
  artillery_2:     'assets/audio/voice/Artillery_2.mp3',
  artillery_3:     'assets/audio/voice/Artillery_3.mp3',
  artillery_4:     'assets/audio/voice/Artillery_4.mp3',
  artillery_5:     'assets/audio/voice/Artillery_5.mp3',
  // The monastery's five, on the same terms as the other three families:
  // Category A, one at a time, and rotated by the share rules below so building
  // three shrines in a row is three different voices.
  monastery_1:     'assets/audio/voice/Monastery_1.mp3',
  monastery_2:     'assets/audio/voice/Monastery_2.mp3',
  monastery_3:     'assets/audio/voice/Monastery_3.mp3',
  monastery_4:     'assets/audio/voice/Monastery_4.mp3',
  monastery_5:     'assets/audio/voice/Monastery_5.mp3',
  // THE MUSKETEER POST'S OWN TWO, and it is the first TIER with a voice rather
  // than a family. It is a named tower at the top of the archery ladder, so it
  // answers for itself when it is built and when its standing order changes
  // instead of borrowing an archer's line.
  //
  // Two rather than five, which the share rules below handle without a special
  // case: they rotate over whatever a cue holds, so two lines simply alternate
  // more often than five do. See NO_REPEAT.
  musketeer_1:     'assets/audio/voice/Musketeer_1.mp3',
  musketeer_2:     'assets/audio/voice/Musketeer_2.mp3',
  musketeer_3:     'assets/audio/voice/Musketeer_3.mp3',
  // The Paladin Keep's own two, on exactly the same terms: a named tier 4 at the
  // top of the barracks ladder, answering when it is built and when it is given a
  // rally point rather than borrowing a barracks line.
  paladin_1:       'assets/audio/voice/Paladin_1.mp3',
  paladin_2:       'assets/audio/voice/Paladin_2.mp3',
  paladin_3:       'assets/audio/voice/Paladin_3.mp3',
  // The Ballista Turret's own three, the third tier with a voice of its own and
  // the first to arrive with three rather than two. Nothing special-cases the
  // count — the share rules rotate over whatever a cue holds — so three simply
  // repeat less often than two do.
  ballista_1:      'assets/audio/voice/Ballista_Engineer_1.mp3',
  ballista_2:      'assets/audio/voice/Ballista_Engineer_2.mp3',
  ballista_3:      'assets/audio/voice/Ballista_Engineer_3.mp3',
  // The Judgement Temple's own three, and the last family to get a tier 4 voice.
  // Same terms as the other three: it answers when it is built and when it is
  // told what to shoot at, rather than borrowing a monastery line.
  pope_1:          'assets/audio/voice/Pope_1.mp3',
  pope_2:          'assets/audio/voice/Pope_2.mp3',
  pope_3:          'assets/audio/voice/Pope_3.mp3',
  // The Crossbow Sentry's own three, and the first voice belonging to a tier that
  // shares its number with another. Same terms as the other four tier 4s: it
  // answers when it is built and when its standing order changes rather than
  // borrowing an archer's line.
  crossbowman_1:   'assets/audio/voice/Crossbowman_1.mp3',
  crossbowman_2:   'assets/audio/voice/Crossbowman_2.mp3',
  crossbowman_3:   'assets/audio/voice/Crossbowman_3.mp3',
  // The Assassin Guild's own three, and the sixth tier with a voice of its own.
  // A barracks tier 4 answers when it is built and when it is given a RALLY
  // POINT, where a shooting one answers when its standing order changes — same
  // cue, different button, because that is what each family's south button does.
  assassin_1:      'assets/audio/voice/Assassin_1.mp3',
  assassin_2:      'assets/audio/voice/Assassin_2.mp3',
  assassin_3:      'assets/audio/voice/Assassin_3.mp3'
};

// Clips the game is wired for but does not have yet. A miss on one of these is
// expected, so it is reported once and quietly rather than as a warning per
// file — a console you have learned to ignore is how a REAL missing clip goes
// unnoticed.
//
// EMPTY, and it should be emptied as recordings land rather than left populated:
// a key sitting in here after its file arrives means a genuinely broken upload
// would be reported as an expected absence.
const AWAITED = new Set();

// Deliberate exceptions to the automatic levelling, applied on top of it.
// Anything not listed plays at the common loudness.
//
// This is for INTENT, not for correction — a giant that should be louder than
// a common thug, a line that should sound distant. Reaching for it because
// something "sounds wrong" is usually a sign the analysis is being fought
// rather than helped.
// Both entries are the catapult's, both were asked for by ear, and the
// measurement says they are the same complaint from opposite directions.
//
// THE LEVELLER MATCHES THE LOUDEST 0.3 SECONDS OF A CLIP, not its average. That
// is the right rule for a bark or a twang, where the loud moment IS the sound.
// It under-serves anything with a long tail: a clip whose peak window matches
// everything else can still spend two more seconds well below it.
//
//   Rock_hit_ground   raw 0.324, auto x0.28, audible 1.34s
//   Rock_kill_enemy   raw 0.820, auto x0.11, audible 2.89s
//
// `rock_hit_ground` reads SOFT because it is a long rumble on the BACKGROUND
// bus, which already sits 7dB under Category A and drops another 9dB whenever a
// line is speaking — so its sustained part is being asked to carry through two
// separate cuts. +4dB.
//
// `rock_kill_enemy` reads LOUD for the opposite reason: it is the loudest raw
// file in the set by a factor of 2.5 and it is DENSE — 2.89 seconds at close to
// its peak, on the full-level channel, where the arrow's kill is 0.3s. The
// leveller had already cut it to x0.11, a whisker off the x0.1 floor, which is
// the tool telling us the recording is hot. -3dB on top.
//
// One thing no gain here can fix: `Rock_kill_enemy` peaks at 1.011, meaning the
// summed channels clip. Only a re-record helps that, and it is the same note
// Thug_1 and Attack_1 already have against them.
const GAIN = {
  rock_hit_ground: 1.6,
  rock_kill_enemy: 0.7,
  // The click, at half — asked for by ear, and the measurement says why the ear
  // was right. The recording is quiet, so the leveller was pushing it +5.3dB to
  // bring it up to everything else, and that is the one cue where matching
  // everything else is the wrong target: TARGET_LOUD exists so that clips of the
  // BATTLE arrive at a common loudness, and the tap is not in the battle. It
  // answers a finger, it lands on a quiet board as often as a busy one, and it
  // only has to be heard, not noticed. -6dB puts it at -0.7dB net, which is why
  // it drops back out of the levelling report: it is no longer being moved far
  // enough to be worth mentioning.
  select: 0.5,
  // THE BALLISTA'S ORDINARY BOLT, DOWN 4dB, and this one is about the difference
  // between two sounds rather than about either of them alone.
  //
  // A taught turret fires the same clip louder on every third shot — that is what
  // Heavy Bolt sounds like, and the whole point of it is that you can hear which
  // bolt is which without looking. At the automatic level the two were x0.43 and
  // x0.60, which is 2.9dB apart: a real difference, and not one you notice over a
  // wave with several machines going.
  //
  // Taking the ORDINARY shot down rather than pushing the heavy one up is the
  // right half to move, twice over. The heavy bolt already sits where a weapon
  // report should sit, so raising it further would make the tower louder than the
  // rest of the battle to buy contrast it can get for free; and the ordinary bolt
  // is the sound this tower makes every 1.8 seconds for the whole game, which is
  // the one in the pair that can afford to be quieter. It lands 4.4dB under the
  // other weapons' reports and the heavy one lands where it always was, so the gap
  // between them goes from 2.9dB to 7.2dB — more than double, which is the size of
  // step an ear reads as "that was a different shot".
  ballista_shot: 0.6
};

// The cues. A cue is a LIST, and the game asks for the list rather than for a
// file: `solo(CUE.barracks)` picks one of the three at random, so the same
// order twice running is not the same voice twice running.
//
// Category A — one at a time, and the rules above about repeating apply.
export const CUE = {
  archery:      ['archery_1', 'archery_2', 'archery_3', 'archery_4', 'archery_5'],
  barracks:     ['barracks_1', 'barracks_2', 'barracks_3', 'barracks_4', 'barracks_5'],
  artillery:    ['artillery_1', 'artillery_2', 'artillery_3', 'artillery_4', 'artillery_5'],
  monastery:    ['monastery_1', 'monastery_2', 'monastery_3', 'monastery_4', 'monastery_5'],
  // The Musketeer Post's, keyed by the `voice` field on its tier rather than by a
  // family id — see familyCue below.
  musketeer:    ['musketeer_1', 'musketeer_2', 'musketeer_3'],
  // The Paladin Keep's, keyed the same way off the `voice` field on its tier.
  paladin:      ['paladin_1', 'paladin_2', 'paladin_3'],
  // The Ballista Turret's, keyed the same way off the `voice` field on artillery
  // tier 4.
  ballista:     ['ballista_1', 'ballista_2', 'ballista_3'],
  // The Judgement Temple's, keyed the same way off the `voice` field on monastery
  // tier 4 — the fourth and last tier with lines of its own.
  pope:         ['pope_1', 'pope_2', 'pope_3'],
  // The Crossbow Sentry's, keyed off the `voice` field on its tier like the four
  // above it. Archery is the only ladder with two of these now, and nothing here
  // had to learn that: a tier names its own cue or falls through to its family.
  crossbowman:  ['crossbowman_1', 'crossbowman_2', 'crossbowman_3'],
  // The Assassin Guild's, keyed off the `voice` field on its tier like the five
  // above it. The barracks is the second ladder with two of these.
  assassin:     ['assassin_1', 'assassin_2', 'assassin_3'],
  thug:         ['thug_1'],
  arrowKill:    ['arrow_kill_enemy'],
  // A rock killing a man is its own event with its own clip now — it used to
  // borrow the arrow's, which was the better of two wrongs while nothing else
  // existed. The two are different enough to be worth telling apart by ear: an
  // arrow finding one man across the map, and a rock landing on several.
  rockKill:     ['rock_kill_enemy'],
  // A musket ball killing a man. Its own clip for the same reason the rock has
  // one: it is a different event to watch — a single shot from clear across the
  // board — and telling the three apart by ear is most of what these are for.
  musketKill:   ['musketeer_kill_enemy'],
  // A bolt finishing a man, and the fourth thing in the game with its own kill
  // line. Same reason as the other three: a ballista bolt going through somebody
  // at close range is a different event to watch than an arrow finding him
  // across the map, and telling them apart by ear is most of what these are for.
  ballistaKill: ['ballista_kill_enemy'],
  // A quarrel finishing a man. Its own line for the same reason the rock, the
  // ball and the bolt have theirs — and it is the one the owner asked for by
  // name. It is why the quarrel is its own ammunition rather than an arrow with
  // a different picture: `killedBy` is the ammo's `kind`, so sharing the arrow
  // would have meant sharing the cry.
  crossbowKill: ['crossbowman_kill_enemy'],
  // An assassin finishing a man, split out of meleeKill the same way the
  // paladin's was: the three lower barracks tiers share the generic take, and
  // each tier 4 has its own. Keyed off `blow` on his def — see BLOWS below,
  // which is the same one word.
  assassinKill: ['assassin_kill_enemy'],
  // A missile from the temple finishing a man, and the fifth thing with its own
  // kill line. The other three monastery tiers still share the arrow's, which is
  // the same split the barracks has: one line for the family, one for its tier 4.
  popeKill:     ['pope_kill_enemy'],
  meleeKill:    ['thug_dies'],
  // A PALADIN finishing a man, split out of meleeKill for the same reason the rock
  // and the ball were split out of the arrow's: it is a different event to watch.
  // Every other melee kill in the game is a spearman, a pikeman or a knight and
  // they share one line; the tier 4 squad has its own.
  paladinKill:  ['paladin_kill_enemy'],
  soldierDeath: ['soldier_dies'],
  // Selling. Category A and always played with priority, which puts it in the
  // same bracket as a build and an upgrade rather than with the battle: all
  // three are the player pressing a button and moving gold, and the reply to a
  // deliberate action has to arrive or the button feels dead. It is the only
  // one of the three that is a noise rather than a voice, because there is
  // nobody left in the tower to say anything.
  sell:         ['sell']
};

// Category B — the battle underneath, on its own bus, every time it happens.
export const SHOT = ['arrow_shot'];
// A missile leaving a staff. Category B beside the bow and for the same reason:
// several monasteries firing is several events the player is watching, and one
// channel would silence all but the first.
export const ARCANE = ['arcane_shot'];
// A musket going off. Category B beside the bow and the staff, and for the same
// reason: it is a thing that happens rather than a thing announced, and two posts
// firing at once are two events the player is watching.
export const MUSKET = ['musketeer_shot'];
// A crossbow loosing. Category B beside the bow, the staff and the musket, and
// for the same reason: it is a thing that happens rather than a thing announced,
// and two sentries firing at once are two events the player is watching.
export const CROSSBOW = ['crossbow_shot'];
// A ballista loosing. Category B beside the bow, the staff and the musket, and
// for the same reason: it is a thing that happens rather than a thing announced,
// and two turrets firing at once are two events the player is watching.
export const BOLT = ['ballista_shot'];
// The three ability sounds, and all three are Category B beside the weapons they
// belong to. A heavy ball leaving the barrel, a paladin calling the light down on
// himself, and a paladin's fifth blow. See abilityCue below for how an ability
// asks for one.
export const DEADEYE = ['musketeer_deadeye'];
export const HOLY_LIGHT = ['paladin_holy_light'];
export const HOLY_SLASH = ['paladin_holy_slash'];
export const ATTACK = ['attack_1', 'attack_2', 'attack_3'];
// A longsword landing on plate. Category B beside the three generic takes and
// chosen instead of them for one man — see blowCue below.
export const PALADIN = ['paladin_attack'];
// A blade going in. Category B beside the paladin's longsword and for the same
// reason: it is a thing that happens rather than a thing announced, and three
// assassins working is three events the player is watching.
export const ASSASSIN = ['assassin_melee_attack'];
// A rock arriving. Category B because a catapult's noise is the IMPACT, not the
// release: several machines land rocks at once and a shared channel would
// silence all but one of them, which is the same reason the bow is down here.
export const LAND = ['rock_hit_ground'];
// A flask breaking, and Category B for the same reason: three doctors can be
// throwing at once, and a shared channel would silence two of them. It is also
// the sound that tells the player poison is now on that patch of road, which is
// information they need every single time rather than most times.
export const BREAK = ['flask_break'];

// THE TAP. Every control in the game that does something answers with this, and
// it is Category B for a reason that has nothing to do with the battle: it is a
// reply to the player's finger, and a reply that is sometimes dropped is worse
// than no reply at all. A button whose click depends on whether a thug happens
// to be shouting reads as a button that sometimes misses the tap.
//
// So it never queues, never waits for the voice channel, and is never chosen
// over — which is exactly what Category B is. It ducks under a voice line like
// everything else down here, which is right: the line is the more important of
// the two and the click still comes through under it.
export const SELECT = ['select'];

let ctx = null;

// Each loaded clip, as { buf, gain, offset, audible } — the decoded audio plus
// what the analysis found out about it. See analyse().
const clips = {};

// Two buses into one master, which is what makes ducking possible at all:
//
//   busA ──┐
//          ├── master ── speakers
//   busB ──┘   (busB's gain is what the duck moves)
//
// Category B goes through busB as a GROUP rather than each clip carrying its own
// level, so the duck moves everything in it at once — including arrows already
// in the air when the cry starts. Ducking each source as it began would leave
// whatever was already sounding at full volume, which is precisely the noise
// being ducked out of the way.
let master = null;
let busA = null;
let busB = null;

// When Category A may speak again, on the context's clock.
let gateUntil = 0;

// The last few Category A clips actually HEARD, newest last, as { key, t }.
// Requests that were passed over are not in here — the rules are about what
// reached the player's ears, not about what the game tried to say.
let heard = [];

// When each Category B clip last started, for the same-millisecond guard.
const lastStart = {};

// Kick off loading. Deliberately NOT awaited by main.js: the game is playable
// without sound, and half a megabyte of mp3 should never be the reason a player
// is still looking at a blank screen. Clips light up as they arrive, and one
// that fails simply never plays.
//
// The context is built here, before any tap, and starts life suspended — which
// is allowed, and decoding works fine in that state. It is only PLAYING that a
// phone refuses until the player has touched the screen. See unlock().
export function loadAudio() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return Promise.resolve();   // Node, or a browser too old to care about

  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = MASTER;
  master.connect(ctx.destination);

  busA = ctx.createGain();
  busA.connect(master);

  busB = ctx.createGain();
  busB.gain.value = BG_LEVEL;
  busB.connect(master);

  const absent = [];

  const jobs = Object.entries(paths).map(([key, src]) =>
    fetch(src)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then(data => ctx.decodeAudioData(data))
      .then(buf => { clips[key] = analyse(buf, GAIN[key] ?? 1); })
      .catch(() => { if (AWAITED.has(key)) absent.push(src); else console.warn('Missing or unreadable audio:', src); })
  );

  return Promise.all(jobs).then(() => {
    if (absent.length) console.info('Not recorded yet:', absent.join(', '));
    report();
  });
}

// Everything the mix needs to know about a clip, worked out from the audio
// itself: how loud it is, and where in the file the sound actually is.
//
// The channels are summed to mono first. What the player hears is the sum, and
// measuring one side of a stereo file would under-read anything panned.
function analyse(buf, trim) {
  const n = buf.length;
  const mix = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) mix[i] += d[i] / buf.numberOfChannels;
  }

  let peak = 0;
  for (let i = 0; i < n; i++) {
    const a = mix[i] < 0 ? -mix[i] : mix[i];
    if (a > peak) peak = a;
  }

  // Loudest window, as a running sum rather than a fresh pass per position —
  // the naive version is O(n * window) and would take a noticeable bite out of
  // startup on the longer lines.
  const w = Math.min(n, Math.max(1, Math.round(buf.sampleRate * LOUD_WINDOW)));
  let run = 0;
  for (let i = 0; i < w; i++) run += mix[i] * mix[i];
  let best = run;
  for (let i = w; i < n; i++) {
    run += mix[i] * mix[i] - mix[i - w] * mix[i - w];
    if (run > best) best = run;
  }
  const loud = Math.sqrt(best / w);

  // Where the sound really starts and ends.
  let head = 0;
  while (head < n && (mix[head] < 0 ? -mix[head] : mix[head]) < FLOOR) head++;
  let tail = n - 1;
  while (tail > head && (mix[tail] < 0 ? -mix[tail] : mix[tail]) < FLOOR) tail--;

  // A clip that is silent all through — a failed export — keeps its own timing
  // and is left alone rather than being multiplied by GAIN_MAX.
  const silent = head >= n || loud <= 0;

  const gain = silent ? trim
    : trim * Math.min(GAIN_MAX, Math.max(GAIN_MIN, TARGET_LOUD / loud));

  return {
    buf,
    gain,
    peak,
    loud,
    // Playback starts here, skipping the dead air at the front. This is the
    // whole fix for a sword that lands a quarter of a second after the blow:
    // the offset is real time removed from the sound, not a delay compensated
    // for somewhere else.
    offset: silent ? 0 : head / buf.sampleRate,
    // How long the clip is AUDIBLE for, which is what the Category A gate and
    // the duck should use. Holding the channel through a clip's trailing
    // silence is time spent saying nothing.
    audible: silent ? buf.duration : (tail - head + 1) / buf.sampleRate
  };
}

// A short note about anything the analysis had to move a long way. Not a dump
// of all fourteen — a console that prints something every load is a console
// nobody reads — but a clip being pulled down 10dB or having a quarter of a
// second cut off its front is worth knowing about, because it usually means the
// file itself could be better.
function report() {
  const notes = [];
  for (const [key, c] of Object.entries(clips)) {
    const bits = [];
    const db = 20 * Math.log10(c.gain);
    if (Math.abs(db) > 3) bits.push(`${db > 0 ? '+' : ''}${db.toFixed(1)}dB`);
    if (c.offset > 0.05) bits.push(`skipped ${Math.round(c.offset * 1000)}ms of silence`);
    if (bits.length) notes.push(`${key} ${bits.join(', ')}`);
  }
  if (notes.length) console.info('Audio levelled:', notes.join(' | '));
}

// Let sound out. Must be called from inside a real touch or click handler —
// both iOS and Android ignore audio that starts on its own, and a context
// resumed anywhere else stays suspended without reporting an error.
//
// The game already has the perfect place for this and it cost nothing to add:
// the Start button. By the time there is anything to hear, the player has
// pressed it. It is also called on every later tap, which is not redundant —
// a phone locking, a call arriving, or a tab going to the background all
// suspend the context again, and without this the game would come back mute.
export function unlock() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

// The Category A voice currently in the air, so a priority cue can take the
// channel off it. Nothing else needs a handle on a playing source — Category B
// clips are meant to overlap, and a voice that is simply finishing does not
// need to be findable.
let voice = null;

// `level` is a per-PLAY multiplier on top of the clip's own levelled gain, and it
// is the only volume in this file that is not a property of the recording.
//
// It exists for one thing: the same clip meaning something slightly bigger. The
// pope fires the monastery's own missile noise, and the artist asked for it a
// little louder rather than for a fourth take of it — so the difference belongs
// to the SHOT, not to the file, and a `GAIN` entry could not express it without
// making every other monastery louder too. Default 1, so every other caller is
// unchanged.
function fire(key, bus, keep = false, level = 1) {
  const c = clips[key];
  const src = ctx.createBufferSource();
  src.buffer = c.buf;

  const g = ctx.createGain();
  g.gain.value = c.gain * level;

  src.connect(g).connect(bus);
  // Second argument is WHERE IN THE CLIP to begin. Starting past the dead air
  // is what makes a hit sound land on the hit.
  src.start(0, c.offset);
  if (keep) voice = { src, g };
  return c.audible;
}

// Take the channel off whatever is speaking, over 60ms rather than instantly.
//
// A buffer source stopped mid-sample is a click — a step from full amplitude to
// zero is a broad spike, and it is louder and more noticeable than the word it
// interrupted. Fading first costs a sixteenth of a second and removes it.
const CUT = 0.06;

function hush(now) {
  if (!voice) return;
  const { src, g } = voice;
  voice = null;
  try {
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + CUT);
    src.stop(now + CUT);
  } catch { /* already ended: nothing to stop */ }
}

// Get the battle out of the way for the length of a Category A clip, then let
// it back up. Scheduled on the audio clock rather than driven by a timer, so it
// keeps its timing regardless of what the frame rate is doing.
function duck(now, seconds) {
  const g = busB.gain;
  // Cancel first: two Category A clips close together would otherwise leave the
  // first one's rise fighting the second one's fall.
  if (g.cancelScheduledValues) g.cancelScheduledValues(now);
  g.setTargetAtTime(BG_DUCKED, now, DUCK_IN);
  g.setTargetAtTime(BG_LEVEL, now + seconds, DUCK_OUT);
}

// The last clip each Category B cue used, so three takes of a sword do not come
// out as the same take three times. Keyed by the cue itself, which is why cues
// are module-level constants rather than built at the call site.
const lastB = new WeakMap();

// Category B. Every time it happens, however many at once, on the background
// bus. No gate and no share rules — this is the battle, and it is mixed low
// enough not to need them.
//
// `level` rides on top of the clip's own gain for this one play — see fire(). It
// is how the pope's missile is the monastery's missile, slightly louder.
export function play(cue, level = 1) {
  if (!ctx || ctx.state !== 'running') return;

  const ready = cue.filter(key => clips[key]);
  if (!ready.length) return;

  // Not the same take twice running where there is a choice. The Category A
  // rules do not apply down here, but a sword that makes one identical noise
  // forty times a wave is the machine-gun problem all over again, and avoiding
  // it costs one comparison.
  const prev = lastB.get(cue);
  const choices = ready.length > 1 ? ready.filter(key => key !== prev) : ready;
  const key = choices[(Math.random() * choices.length) | 0];

  const now = ctx.currentTime;
  if (now - (lastStart[key] ?? -Infinity) < SAME_CLIP_GAP) return;
  lastStart[key] = now;
  lastB.set(cue, key);

  fire(key, busB, false, level);
}

// Category A. One at a time, then a second of quiet — and never the same clip
// twice running, nor more than twice in the last five.
//
// The gate closes for the clip's own length plus the gap, so a three-second
// line holds the channel for four. That is a real cost and it is worth knowing
// where it lands: tapping a thug is the longest silence in the game.
//
// Note the order of the exits. The gate is only touched once a clip has
// actually been chosen and started, so a cue that is passed over — because its
// files have not loaded, or because everything in it was heard too recently —
// leaves the channel open for whatever asks next. That is the whole mechanism
// by which a swing yields to a death cry.
export function solo(cue, priority = false) {
  // Callers pass the result of a lookup straight in, and plenty of things have
  // nothing to say — bare ground, a siege plot, a family with no voice yet.
  if (!cue) return;
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;

  // PRIORITY TAKES THE CHANNEL, and only one thing uses it: buying an upgrade.
  //
  // The gate exists to stop the battle talking over itself, and it is right
  // about almost everything — a swing, a death, a selection are all things the
  // game decided to say. An upgrade is not: it is the player pressing a button
  // and spending gold, and the reply to a deliberate action has to arrive or the
  // button feels dead. Dropping it was invisible in a quiet game and constant in
  // a busy one, which is exactly when an upgrade is most likely to be bought.
  //
  // It does NOT skip the repeat rules below. Priority is about who gets the
  // channel, not about being allowed to say the same line five times running —
  // and a family with several takes has alternatives to rotate to anyway.
  if (now < gateUntil) {
    if (!priority) return;
    hush(now);
  }

  // Silence clears the slate; otherwise the last five stand however old they
  // are. Measured from the most recent play, so a busy fight never forgets and
  // a lull forgets everything at once.
  if (heard.length && now - heard[heard.length - 1].t >= MEMORY_S) heard = [];

  const last = heard.length ? heard[heard.length - 1].key : null;
  const times = key => heard.reduce((n, h) => n + (h.key === key ? 1 : 0), 0);

  // A cue is a list of interchangeable takes, so being passed over is per CLIP,
  // not per cue: the three barracks lines rotate among themselves. A clip shared
  // by two cues would be counted once across both, which is right — the player
  // hears one sound, however the game got there.
  const ready = cue.filter(key => clips[key]);
  let eligible = ready.filter(key => key !== last && times(key) < MAX_REPEATS);

  // A cue with several takes must never talk itself into silence. Five
  // remembered plays of three takes can reach A B A B C — two of them at their
  // limit and the third being the one just heard — and with the share rule held
  // absolute the barracks would then say nothing at all until something aged
  // out. So for a cue that HAS alternatives the share rule yields here: it is a
  // priority between takes, not a ban.
  //
  // A single-take cue gets no such relief, and that asymmetry is the point. The
  // swing has nothing to rotate to, so its share rule is the only thing
  // standing between one clip and the whole soundtrack. It stays absolute, and
  // the swing waits its turn or gives up the slot.
  if (!eligible.length && ready.length > 1) eligible = ready.filter(key => key !== last);
  if (!eligible.length) return;

  const key = eligible[(Math.random() * eligible.length) | 0];

  heard.push({ key, t: now });
  if (heard.length > MEMORY_N) heard.shift();

  const seconds = fire(key, busA, true);
  duck(now, seconds);
  gateUntil = now + seconds + GAP;
}

// A tower family's voice, or null for one with nothing recorded. All four have
// five lines each now; the null branch is kept because a lookup that answers
// "nothing to say" is how a family gets wired before its recordings land, and
// solo() already skips a cue whose clips have not loaded.
// A TIER MAY OVERRIDE ITS FAMILY, which is what `def` is for. The Musketeer Post
// has two lines of its own and is still an archery tower, so the tier says which
// cue it wants and everything else falls through to the family it belongs to. A
// def with no `voice`, or a voice with no clips wired, behaves exactly as before.
export function familyCue(famId, def) {
  if (def && def.voice && CUE[def.voice]) return CUE[def.voice];
  return famId === 'archery' ? CUE.archery
       : famId === 'barracks' ? CUE.barracks
       : famId === 'siege' ? CUE.artillery
       : famId === 'monastery' ? CUE.monastery
       : null;
}

// WHAT A SOLDIER'S BLOW SOUNDS LIKE, keyed off the `blow` field on his own def in
// data/towers.js — the same one-word opt-in `voice` is on a tier.
//
// Three of the four men a barracks musters share the generic takes, and that is
// right: a spear, a pike and a sword landing are the same event with a different
// blade on it. The paladin is the one the player is meant to hear, because his
// squad is the one they spent 530 gold on, and steel on plate is a different
// noise rather than a louder one. A def with no `blow` behaves exactly as before.
const BLOWS = { paladin: PALADIN, assassin: ASSASSIN };

export const blowCue = def => (def && BLOWS[def.blow]) || ATTACK;

// WHAT AN ABILITY SOUNDS LIKE, keyed off the `cue` field on its def in
// data/abilities.js — the third one-word opt-in in this file, beside `voice` on a
// tier and `blow` on a soldier, and it works the same way: an ability with no `cue`
// makes no noise of its own.
//
// TWO ENTRIES, NOT THREE, and Deadeye's absence is the point: it fires something,
// so its noise is its AMMUNITION's — see FIRING in src/towers.js, where every
// projectile's report is looked up by kind. Burst Fire is the one that is genuinely
// quiet, and deliberately: it fires the ordinary ball, so it already makes the
// ordinary crack, three times.
const ABILITY_CUES = {
  holyLight: HOLY_LIGHT,
  holySlash: HOLY_SLASH
};

export const abilityCue = key => ABILITY_CUES[key] || null;

// The cue for whatever the player just selected, or null for nothing that
// speaks. Here rather than in input.js because selection happens at three call
// sites — tapping a tower, tapping a figure, and finishing a build, which
// selects what it just built — and the mapping should not be written out three
// times.
//
// A giant thug answers with the common thug's line, because there is one enemy
// voice so far. When a heavier one is recorded it becomes a `def` lookup rather
// than a kind check; until then, silence for the giant would read as a bug.
export function selectionCue(sel) {
  if (!sel) return null;
  if (sel.kind === 'enemy') return CUE.thug;
  if (sel.kind === 'unit') return CUE.barracks;
  return familyCue(sel.ref.fam.id, sel.ref.def);
}
