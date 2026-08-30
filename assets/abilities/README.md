# Ability buttons

The face of every ability a tier 4 tower can be taught: fourteen of them, one per
entry in `ABILITIES` in `src/data/abilities.js`. Each appears twice — on the
tower's radial menu when it has gold to spend, and on the encyclopedia's ability
page.

| tower            | its two                                     |
|------------------|---------------------------------------------|
| Musketeer Post   | Burst Fire, Deadeye                         |
| Crossbow Sentry  | Reinforced Tension, Swift Reload            |
| Paladin Keep     | Holy Light, Holy Slash                      |
| Assassin Guild   | Knife Throw, Sneak Attack                   |
| Ballista Turret  | Reinforced Tension, Heavy Bolt              |
| Cannon Outpost   | Swift Reload, Fiery Shot                    |
| Judgement Temple | Holy Wrath, Divine Fortitude                |

## These are BUTTONS, not icons

That is the whole reason this folder exists apart from `assets/ui`. Every icon in
`assets/ui` is a transparent mark drawn ON TOP of `Button_Plate_Icon.png`; each
of these arrives as the whole button, drawn on a disc of exactly the plate's own
size, and is drawn INSTEAD of the plate.

So a new one has to match the plate: **512 x 512, with the disc trimming to
[163, 163, 186, 186]** — centred, square, the same size as `btn_plate`.
`node tools/trim.mjs` checks all three of those and names any file that misses.

**Transparent outside the disc.** Three of these shipped opaque once, which was
survivable only because the renderer clips a circle out of them; the same file
drawn anywhere without that clip would carry its white corners along. The tool
checks this too.

## Two towers can learn the same trick, and still get two files

Reinforced Tension and Swift Reload each appear twice in the table above, under
the same name, with the same rule. They are still two entries and two drawings,
because the icon is a picture of THAT tower's weapon — a ballista's cable is not
a crossbow's — and because the magnitude is tuned against that tower's own
rhythm. Swift Reload is 1.35x on the Sentry and 1.5x on the Outpost.

See the note on the ids at the top of `src/data/abilities.js`.

## The two aura badges are not here

`Judgement_Temple_Holy_Wrath.png` and `Judgement_Temple_Divine_Fortitude.png`
stay in `assets/ui`, beside their `_Icon` counterparts' old home. They are not
buttons and never appear in the encyclopedia: they are marks the renderer hangs
over each tower an aura is working on, which is board furniture rather than
interface.
