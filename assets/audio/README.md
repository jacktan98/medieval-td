# Audio

**Seventy-two clips: thirty in `sfx/` and forty-two in `voice/`.**

```
assets/audio/sfx/     Arrow_shot.mp3, Attack_1.mp3, Attack_2.mp3, Attack_3.mp3,
                      Arrow_kill_enemy.mp3,
                      Rock_hit_ground.mp3, Rock_kill_enemy.mp3, Arcane_shot.mp3,
                      Musketeer_shot.mp3, Musketeer_kill_enemy.mp3,
                      Musketeer_Deadeye.mp3,
                      Crossbow_bolt_shot.mp3, Crossbowman_kill_enemy.mp3,
                      Ballista_Bolt_shot.mp3, Ballista_kill_enemy.mp3,
                      Cannon_shot.mp3, Cannon_kill_enemy.mp3,
                      Paladin_attack.mp3, Paladin_kill_enemy.mp3,
                      Paladin_Holy_Light.mp3, Paladin_Holy_Slash.mp3,
                      Assassin_melee_attack.mp3, Assassin_kill_enemy.mp3,
                      Assassin_Knife_Throw.mp3,
                      Pope_kill_enemy.mp3,
                      Flask_Break.mp3, Sell_Tower.mp3, Select_Sound.mp3,
                      Thug_dies.mp3, Soldier_dies.mp3

assets/audio/voice/   Archery_1.mp3 .. Archery_5.mp3
                      Barracks_1.mp3 .. Barracks_5.mp3
                      Artillery_1.mp3 .. Artillery_5.mp3
                      Monastery_1.mp3 .. Monastery_5.mp3
                      Musketeer_1.mp3 .. Musketeer_3.mp3
                      Crossbowman_1.mp3 .. Crossbowman_3.mp3
                      Paladin_1.mp3 .. Paladin_3.mp3
                      Assassin_1.mp3 .. Assassin_3.mp3
                      Ballista_Engineer_1.mp3 .. Ballista_Engineer_3.mp3
                      Cannoneer_1.mp3 .. Cannoneer_3.mp3
                      Pope_1.mp3 .. Pope_3.mp3
                      Thug_1.mp3
```

**Five voices for a family, three for a man.** A family's five are what the whole
ladder says when a tower is built or given an order; a tier 4's three belong to
that one tower and replace the family's. Both fourth rungs of a forked ladder get
their own three — the Musketeer and the Crossbowman, the Paladin and the
Assassin, the Ballista Engineer and the Cannoneer — because they are different
men, not the same man twice.

All recorded and all wired. `node tools/audio.mjs` measures
them; `node tools/sound.mjs` checks the rules below against the real
`src/audio.js`.

**Wire a cue before the files exist.** The artillery voices were in `paths` and
in `CUE` a commit before they were recorded, and they played the moment they
landed with no code change at all. While a file is missing, list its key in
`AWAITED` in `src/audio.js` — misses there are reported once as a quiet note
instead of one warning per file. **Empty `AWAITED` as recordings arrive**: a key
left in it after its file lands means a genuinely broken upload gets reported as
an expected absence.

## Two categories, and the categories are the design

**Category A is one channel, in the foreground.** These are the things worth
announcing: a voice answering, a man dying, a kill landing. While one is
sounding every other Category A request is dropped — not queued, dropped — and
when it ends nothing else may start for a second.

Dropped rather than queued is the half that matters. A queue would play the
death cry of a man who died four seconds ago, and sound that lies about what is
on the screen is worse than no sound.

**Category B is the battle, underneath.** Arrows leaving bows and blades
landing. Every one of them is a thing you can watch happen, so every one makes
its noise — no gate, no sharing rules, ten towers firing is ten twangs.

It is mixed like background and behaves like it. Category B runs through a bus
of its own that sits about 7dB under Category A, and **drops another 9dB the
moment a Category A clip starts**, coming back up when it finishes. So a death
cry cuts through a battle instead of competing with it, and nothing has to be
silenced to make room — which is the whole reason the swings live down here and
not in the fight for the one channel.

The duck moves the bus, not each sound as it starts, so arrows already in the
air get out of the way too. Ducking only new sources would leave whatever was
already ringing at full volume, which is exactly the noise being ducked.

## Category A also has to share itself out

The gate on its own is first-come-first-served, and that is not a fair contest —
whatever asks most often wins most often, regardless of whether it is worth
hearing. The build where the swing was still in Category A measured **12 swings
out of 16 clips in 90 seconds**, which is not a soundtrack, it is a metronome.
The swing has since moved to Category B, but the rules it forced are what keep
the channel varied now that kills and cries are competing for it.

So a clip earns the channel against what has just been heard, not only against
what else is asking. Two rules, over a memory of the last five plays:

- **never the same clip twice running**
- **never more than twice in the last five**

A clip that fails either is passed over and the gate is left **open**, so the
next thing along takes the slot it gave up. That is the difference between
priority and throttling: nothing is delayed, something else is heard instead.

Measured over 90 seconds of real play, with two archery towers and a barracks:
**7 Category A clips, no clip twice running, and none appearing more than twice
in any five.** Underneath, 131 background plays — 49 arrows and 82 sword swings
split 29/27/26 across the three takes.

Two details worth knowing before changing any of it:

**A cue with several takes will break the share rule rather than fall silent.**
Five remembered plays of three takes can reach `A B A B C` — two at their limit
and the third just heard — and an absolute rule would mute the cue until the
memory moved on. So a cue with alternatives relaxes it. A **single**-take cue
gets no such relief, and that asymmetry is the point: with nothing to rotate to,
its share rule is the only thing between one clip and the whole channel.

**At five takes that can no longer happen at all.** Jamming needs every take but
the last to be at its limit of two, which is eight plays inside a memory of
five. So the two voice cues are now safe by arithmetic rather than by the
relaxation, and only the three-take cues can still reach it.

The single-take cues are where it bites. **A second melee kill straight after
the first is silent** — there is one `Thug_dies` and it may not run twice
running. If that reads as a dropped sound rather than as restraint, a second
take is the fix, and it needs no code beyond a line in `paths` and the cue.

**The memory is wiped by silence, not by age.** The last five plays are the last
five plays however long they took; if nothing at all has been heard for 20
seconds, the slate clears. An earlier version expired each entry on its own
clock and the share rule quietly stopped working — single-take cues get passed
over often, so plays come further apart (about 4.5s in a measured fight), and
five of them no longer fitted in the window. The rule was still running; it just
never had five plays to look at. `MEMORY_S` in `src/audio.js` is the constant,
and it now means "how long a lull has to be before the game forgets".

## What plays when

| moment | clip |
|---|---|
| an archery tower is **built or upgraded** | `Archery_1..5` |
| a barracks is **built or upgraded** | `Barracks_1..5` |
| an artillery tower is **built or upgraded** | `Artillery_1..5` |
| a monastery is **built or upgraded** | `Monastery_1..5` |
| a **Musketeer Post** is built, upgraded to, or given an order | `Musketeer_1..3` |
| a **Paladin Keep** is built, upgraded to, or given a rally point | `Paladin_1..3` |
| a **Ballista Turret** is built or upgraded to | `Ballista_Engineer_1..3` |
| a **Judgement Temple** is built, upgraded to, or given an order | `Pope_1..3` |
| a rally point is moved | that tower's own voice — `Barracks_1..5`, or `Paladin_1..3` |
| a barracks man is selected | `Barracks_1..5` |
| an enemy is selected | `Thug_1` |
| an arrow kills an enemy | `Arrow_kill_enemy` |
| a rock kills an enemy | `Rock_kill_enemy` |
| a musket ball kills an enemy | `Musketeer_kill_enemy` |
| a **bolt** kills an enemy | `Ballista_kill_enemy` |
| a **paladin** kills an enemy | `Paladin_kill_enemy` |
| a **pope's** missile kills an enemy | `Pope_kill_enemy` |
| any other barracks man kills an enemy | `Thug_dies` |
| a barracks man dies | `Soldier_dies` |
| a tower is **sold** | `Sell_Tower` |
| **an archer looses** — Category B | `Arrow_shot` |
| **a spearman, pikeman or swordsman swings** — Category B | `Attack_1/2/3` |
| **a paladin swings** — Category B | `Paladin_attack` |
| **a rock lands** — Category B | `Rock_hit_ground` |
| **a flask breaks** — Category B | `Flask_Break` |
| **a priest looses a missile** — Category B | `Arcane_shot` |
| **a pope looses one** — Category B | `Arcane_shot`, a quarter louder |
| **a musketeer fires** — Category B | `Musketeer_shot` |
| **a ballista looses** — Category B | `Ballista_Bolt_shot` |
| **a HEAVY bolt looses** — Category B | `Ballista_Bolt_shot`, 7.2dB louder |
| **Deadeye's heavy ball leaves** — Category B | `Musketeer_Deadeye` |
| **a paladin calls Holy Light** — Category B | `Paladin_Holy_Light` |
| **a paladin's fifth blow lands** — Category B | `Paladin_Holy_Slash` |
| an ability is **unlocked** | that tower's own voice — `Musketeer_1..3` or `Paladin_1..3` |

Everything above the line is Category A and shares the one channel; the ones
below run on the background bus and play every time.

**The three gold noises all have PRIORITY.** Building, upgrading and selling are
the things a player does with money, and every one of them is a button pressed
deliberately — so all three take the Category A channel off whatever the battle
is saying rather than being dropped by it. A reply to a deliberate action has to
arrive or the button feels dead, and dropping it is invisible in a quiet game
and constant in a busy one, which is exactly when a tower is most likely to be
sold. Selling is the only one of the three that is a noise rather than a voice:
there is nobody left in the tower to speak.

**`Flask_Break` is Category B**, like the rock it sits beside, and for the same
two reasons: three plague doctors can be throwing at once and a shared channel
would silence two of them, and it is the sound that says poison is now on that
patch of road — information the player needs every time rather than most times.

**SELECTING A TOWER IS SILENT — all three families.** Tapping a building is how
you read its numbers and it is done constantly: every time you weigh an upgrade,
every time you check what is already there. A line on each of those taps is the
same clip several times a minute, which is exactly what the Category A share
rules exist to prevent, and it was slipping past them by being a different event
each time. Only BUILDING and UPGRADING speak, and each of those happens once.

Selecting a FIGURE still speaks — a barracks man, a thug — because that is a
deliberate look at one man rather than a glance at a building you own.

Where a row lists more than one file, one is picked at random each time, so the
same order twice running is not the same voice twice running. Category B gets a
cut-down version of the same courtesy — no share rules, but never the same take
twice running, because a sword making one identical noise forty times a wave is
the machine-gun problem all over again.

**A giant thug answers with the common thug's line**, there being one enemy
voice so far. Silence for the giant would read as a bug rather than as a gap.

**A TIER CAN HAVE ITS OWN VOICE, and the Musketeer Post is the first.** It is an
archery tower, so by family it would speak with the archers — but it is a named
tower at the top of the ladder with lines of its own, so the tier carries a
`voice` field and `familyCue()` prefers it. Everything else about it is unchanged:
Category A, priority on a build or an order, and the same share rules. Three lines
rather than five simply means they alternate more often.

**The Paladin Keep is the second**, on exactly the same terms, and asking the same
questions of both is the point: the first one could have been wired by a special
case for archery, and the second is what says it was not.

**The Ballista Turret is the third**, at the top of the artillery ladder, and it
arrived with three lines where the other two arrived with two — which needed no
code at all, because the share rules rotate over whatever a cue holds. The other
two are three lines each now as well.

**The Judgement Temple is the fourth and last**, at the top of the monastery
ladder, and every family's top rung now answers for itself.

A `voice` naming a cue with no clips loaded falls back to the family's, which is the
same wire-ahead trick the table above is built on — and `node tools/sound.mjs`
checks all four cases: the tier speaks, its siblings do not, an unrecorded voice
falls back, and selecting one picks the same lines.

**A MAN CAN HAVE HIS OWN BLOW, and the paladin is the only one.** Three of the four
men a barracks musters share the generic `Attack_1..3` takes, which is right — a
spear, a pike and a sword landing are the same event with a different blade on it.
The paladin's def carries a `blow` field naming his own clip, on the same one-word
opt-in a tier's `voice` uses, and `blowCue()` falls back to the generic takes for
anybody without one. He is the squad you are meant to be able to hear.

**All four families have voices now.** `familyCue()` still has a null branch, and
it is worth keeping: what it guards is that a lookup for a family with nothing
recorded answers "nothing to say" rather than throwing, which is what lets the
next family be wired up a commit before its recordings land. That is exactly how
artillery's and the monastery's were done.

### The pope fires the same missile, a quarter louder

**THE ONE SOUND IN THE GAME THAT IS A VOLUME RATHER THAN A FILE.** The artist
asked for the Judgement Temple to use `Arcane_shot` "but slightly louder", and
that is exactly what it does: no fourth recording, no second key, and no `GAIN`
entry — a gain would have made every other monastery louder too, since gain is a
property of the clip.

Instead `play()` takes an optional level for one play, and the pope's ammunition
carries `fireGain: 1.25`. The loudness belongs to the SHOT rather than to the
file, which is the only place it can live if three tiers are to keep firing the
same clip at the old level. Anything else that ever wants the same trick — a
bigger version of a noise the game already makes — gets it for one number.

His KILL line is a real file, `Pope_kill_enemy`, and Category A like the other
four kill cries.

**Heavy Bolt uses the same trick**, and it is the second time the field has paid
for itself: every fourth bolt a taught Ballista Turret fires is the same
`Ballista_Bolt_shot`, played harder, which is how you can hear which one is the
heavy one without a second recording.

**The pair was widened by making the ORDINARY bolt quieter**, which is the half
worth moving. At the automatic level the two were 2.9dB apart — a real difference
and not one you notice over a wave with several machines going. `ballista_shot`
now carries a `GAIN` of 0.6 and the ability's own multiplier went to 2.3, so the
plain shot sits 4.4dB under the other weapons' reports, the heavy one lands
exactly where it was, and the gap is 7.2dB. Raising the heavy one instead would
have bought the same contrast by making the tower louder than the battle. The two
numbers move together and always have to: net x0.59 on a file that peaks at 1.01,
so there is no headroom left to spend. The three tiers below him have none and fall through to the
generic one, which is the same split the barracks has: one line for the family,
one for its tier 4.

### The arcane missile announces itself LEAVING

The opposite of the rock, and the same way round as the arrow: `Arcane_shot`
plays on release, because a missile that crawls across the board at 130px/s is a
thing you watch go — and a monastery fires once every four and a half seconds, so
the release is a rarer and more deliberate event than any other shot in the game.
It is Category B for the usual reason — three shrines can fire at once and one
channel would silence two of them.

**Which sound a shot makes is now a table rather than a branch.** `FIRING` in
`src/towers.js` maps an ammunition's `kind` to its cue, exactly as `LANDING` in
`src/projectiles.js` already did for arrivals. A fifth projectile that makes a
noise needs a row in one of those two and nothing else.

### The catapult's noise is where it LANDS

**Throwing a rock is silent, and that is the design rather than a gap.** The
release is not the moment anyone is looking at — the arm swings, and a creak
nobody can place among ten machines is noise. The arrival is the event: it is
where the damage happens and where the eye already is. So the two flags on the
ammunition in `src/data/towers.js` are opposites — an arrow has `fireSound` and
the rock has `landSound`.

**`Rock_hit_ground` is Category B**, like the bow, and for the same reason:
several catapults land rocks at once and one shared channel would silence all but
one of them. It plays on **every** landing, hit or miss — a rock cratering an
empty road is exactly the miss a player needs to hear, given the tower throws
ahead of its target and can be walked out from under.

**`Rock_kill_enemy` is Category A**, and it stopped the rock borrowing the arrow's
line. An arrow finding one man across the map and a rock coming down on several
are different enough events to be worth telling apart with your eyes shut.
`killedBy` on the victim is the ammunition's own `kind`, so a third projectile
would need no branch anywhere.

## What the one-second rule actually costs

The gate holds for as long as the clip is AUDIBLE, plus the second — not for the
length of the file. Skipping the dead air at both ends bought back real time
here, most of a second on some clips:

| clip | file | audible | holds the channel |
|---|---|---|---|
| `Thug_1` | 3.40s | 2.80s | **3.80s** |
| `Archery_3` | 2.53s | 1.94s | 2.94s |
| `Barracks_3` | 2.17s | 1.69s | 2.69s |
| `Thug_dies` | 1.34s | 1.04s | 2.04s |
| `Archery_1` | 1.44s | 0.77s | 1.77s |
| `Soldier_dies` | 0.70s | 0.48s | 1.48s |
| `Arrow_kill_enemy` | 1.05s | 0.30s | 1.30s |

`Arrow_kill_enemy` is the striking one: a 1.05s file with 0.30s of sound in it,
so it used to hold the channel for two seconds to say something that took a
third of one.

Tapping a thug is still the longest hold in the game at 3.8s. The battle plays
on underneath throughout, so it is not silence exactly — nothing else gets
announced. Trimming `Thug_1` would take it under 2s if that ever reads wrong in
play.

## The UI has one sound of its own

`Select_Sound.mp3` — **Category B**, and for a reason that has nothing to do with
the battle: it answers the player's FINGER. A reply that is sometimes dropped is
worse than no reply at all, because a button whose click depends on whether a
thug happens to be shouting reads as a button that sometimes misses the tap. So
it never queues, is never chosen over, and never waits for the voice channel. It
ducks under a voice line like everything else on that bus, which is right — the
line is the more important of the two and the click still comes through under it.

**It plays once, from one place, and only when the tap DID something.** There is
a single `play(SELECT)` in `src/input.js`, on the answer to one question every
branch of the tap handler returns: did this act? The alternative — a call in each
of a dozen branches — is how a control quietly ends up silent, because the branch
added next simply forgets.

The silent half is the useful half. An unaffordable button absorbs its tap
without acting, a paused board refuses everything but its two controls, and bare
ground with nothing selected has nothing to say. Clicking at those would teach
the player that the click means "heard you" rather than "done".

## One thing may interrupt: buying an upgrade

The gate is right about almost everything it holds off. A swing, a death, a
selection are all things the GAME decided to voice, and a busy fight talking over
itself is what the whole category exists to prevent.

**An upgrade is not one of those.** It is the player pressing a button and
spending gold, and the reply has to arrive or the button feels dead. It used to
be dropped like anything else — invisible in a quiet game and constant in a busy
one, which is exactly when an upgrade is most likely to be bought.

So `solo(cue, true)` takes the channel off whatever is speaking, and **two call
sites use it**: building and upgrading, both in `src/input.js`. They are the two
moments a family speaks and both are deliberate purchases — a swing or a death
cry holding either of them off is the channel getting its priorities exactly
backwards. Selection does not, and deliberately: it happens constantly and its
silence is a feature, not a fault.

Two details worth knowing:

- **The clip is faded, not cut.** A buffer source stopped mid-sample is a click,
  and it is louder and more noticeable than the word it interrupted. The stop is
  scheduled 60ms out with a ramp to zero in front of it.
- **Priority is about who gets the channel, not about repeating.** All the share
  rules below still apply, so a single-take cue interrupted into its own repeat
  still declines. A family with five takes rotates as it always did.

`node tools/sound.mjs` checks all of that, including that the interrupting clip
resets the gate to ITS OWN length — a half-second line taking over from a
two-second one must not hold the channel for two seconds of sound nobody is
hearing any more.

## Levelling is automatic — you do not have to normalise

The clips arrived up to **20dB apart**. The voices had never been normalised and
peaked around 0.12; the death effects peaked near 1.0. So `Archery_1` was 9.6dB
under the middle of the pack and `Thug_dies` 10.1dB over it, and no amount of
bus mixing survives that — "the battle sits 7dB under the voices" means nothing
when the clips themselves differ by twenty.

Every clip is now **analysed once at load** and given the gain that brings it to
a common loudness, measured as the RMS of its loudest 300ms. What that does to
the current eighteen — the four newest voices needed it as much as the first
batch:

| clip | adjustment |
|---|---|
| `Archery_5` | **+13.1 dB** |
| `Archery_1` | +11.1 dB |
| `Archery_2` | +10.5 dB |
| `Attack_2` | +7.0 dB |
| `Barracks_4` | +6.6 dB |
| `Archery_3` | +4.4 dB |
| `Archery_4` | +3.7 dB |
| `Barracks_1` | +3.6 dB |
| `Barracks_2/3/5` | left alone |
| `Attack_1` | −3.3 dB |
| `Soldier_dies` | −7.0 dB |
| `Thug_1` | −7.1 dB |
| `Thug_dies` | −8.6 dB |

Measured rather than typed into a table, and that is the point: this project
re-uploads audio constantly, and a hand-tuned table would be silently wrong the
moment a file was re-recorded. The sound would just be off, with nothing to
point at. The analysis costs a few milliseconds for the whole folder and cannot
go stale.

**So do not normalise before uploading, and do not worry if a take comes in
quiet.** The gain is capped at 5x either way, so a clip recorded at almost
nothing will still come up short rather than dragging its own hiss up with it —
that is the one case worth re-recording.

The ceiling was 4 until `Archery_5` arrived needing 4.55x. That is a quiet
recording, not a broken one — it peaks at 0.089 — and a clamp that bites on a
file with nothing wrong with it is set too tight, so it went to 5. If a future
upload reports exactly `+14.0dB` it has hit the new ceiling and is genuinely too
quiet to rescue.

`GAIN` in `src/audio.js` overrides the analysis per clip, and it is for INTENT
— a giant that should be louder than a common thug — not for correction.

### The three ability sounds

All three are **Category B**, and for the reason everything else down there is: they
are things that happen on the board rather than things announced, and several can
happen at once — three paladins in one squad can be in trouble together, and two
Musketeer Posts can fire on the same frame. One channel would silence all but the
first.

**Burst Fire has no clip and that is not an omission.** It fires the ordinary ball
three times in half a second, so it already makes `Musketeer_shot` three times, and
three cracks in half a second is what a burst sounds like.

**Deadeye's noise comes from its AMMUNITION, not from the ability.** The heavy ball
is its own kind of projectile, so it gets a row in the firing table beside the
arrow, the arcane missile and the ordinary ball — "what does this sound like
leaving" has exactly one answer per kind, and an ability that fires something
announces itself by firing it. The paladin's two are the ones that carry a `cue` of
their own, because neither of them fires anything.

**Unlocking an ability speaks in the tower's own voice** — the same line a build or
an upgrade plays, at the artist's request, and with the same priority. All four
things gold buys now answer: build, upgrade, sell, and teach.

The three arrived well balanced against each other and against what was already
here, so **none of them needed a `GAIN` override**. Measured at load:
`Musketeer_Deadeye` −11.8dB (against `Musketeer_shot`'s −9.9 and `Arcane_shot`'s
−13.0), `Paladin_Holy_Slash` −8.5dB (against `Thug_dies`'s −8.6), and
`Paladin_Holy_Light` inside ±3dB and not reported at all. Nothing is near the
clamp; the leveller did the whole job.

One note for the next re-record, on the same terms as the three below:
`Musketeer_Deadeye` peaks at **1.000**, so its summed channels are right on the
ceiling. It is no worse than `Musketeer_shot`, which peaks at 1.196 and has been
there since it landed, and no gain here can fix either — only a re-record can.

## Dead air at the front is skipped, also automatically

Measured lead-in across the uploads: `Thug_1` 299ms, `Attack_3` 275ms,
`Archery_2` 224ms, `Attack_2` 201ms, most others 50–150ms. A sword landing
275ms after the blow is **sixteen frames late**, and it was the single biggest
reason the audio felt loose against the action.

Playback now starts past the silence — the analysis finds the first audible
sample and begins there. Real time removed, not a delay compensated for
elsewhere.

The same measurement gives the clip's **audible** length, and that is what the
Category A gate and the duck use rather than the file's length. Holding the
channel through a clip's trailing silence is time spent saying nothing.

It is still worth trimming in the editor when it is easy — a smaller file
downloads faster — but nothing depends on it any more.

## Format, for the next upload

`.mp3`. Mono where you can — all seven effects are stereo, which is twice the
bytes to store the same sound twice, and nothing here is positioned in the
stereo field. Keep effects short.

Every filename is now a plain URL — no `%20` anywhere in the project. Keep
it that way and the paths in `src/audio.js` stay readable.

`node tools/audio.mjs` reports length, size, bitrate and channels for every
file, and flags anything long, heavy or stereo. It parses the MP3 frames itself
— there is no ffmpeg here and no npm to install one, the same constraint that
makes `tools/png.mjs` decode PNGs by hand.

The three swings are now within reach of each other — `Attack_1` 1.10s,
`Attack_2` 0.84s, `Attack_3` 0.98s — after the first `Attack_1` came in at
1.70s, twice its siblings, and read as a pattern every third swing.

**Two clips still peak at exactly 1.000**, `Thug_1` and `Attack_1`, which
usually means they were clipped or limited on the way in. The automatic
levelling turns them down, but it cannot undo distortion already baked into the
file. Worth a listen at volume; only a re-record fixes it if it is audible.

## Adding a clip

1. Upload it.
2. Add a line to `paths` in `src/audio.js`.
3. Put its key in a `CUE` list, or make a new one.
4. Call `solo(CUE.whatever)` for Category A, `play(key)` for Category B.
5. `node tools/audio.mjs && node tools/sound.mjs`.

A clip that has not finished loading, or that failed to load, simply does not
play — and a Category A cue with nothing loaded does **not** close the channel
on everything else. That case is tested, because the failure it prevents is a
game that goes quiet for good and never says why.

## Sound is not allowed to hold up the game

`main.js` starts the audio load alongside the art but never waits for it. Half a
megabyte of mp3 must not be the reason a player is looking at a blank screen,
and every call site treats a missing clip as silence.

**Phones refuse to play any sound until the screen has been touched.** The Start
button is that touch, so the player never sees the seam — and `unlock()` runs on
*every* tap, not just the first, because a phone locking, a call arriving or the
tab going to the background all suspend the audio again. Without the repeat, the
game would come back mute and stay that way.

## `src/audio.js` must stay importable in Node

`tools/sim.mjs` runs the real combat modules headless, and they call into the
audio module. So nothing at its top level may touch a browser API: the context
is built lazily inside `loadAudio()` and every entry point returns quietly when
there is none. In Node there never is one, and the balance sim runs in silence
without knowing why. Break this and `sim.mjs`, `sweep.mjs` and `squad.mjs` all
stop working at once.
