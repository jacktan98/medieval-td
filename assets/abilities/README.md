# Ability buttons

The face of every ability a tier 4 tower can be taught: sixteen of them, one per
entry in `ABILITIES` in `src/data/abilities.js`. Each appears twice — on the
tower's radial menu when it has gold to spend, and on the encyclopedia's ability
page.

| tower | ability | file |
|-------|---------|------|
| Crossbow Sentry | Reinforced Tension | `Crossbow_Sentry_Reinforced_Tension.png` |
| Crossbow Sentry | Swift Reload | `Crossbow_Sentry_Swift_Reload.png` |
| Musketeer Post | Burst Fire | `Musketeer_Post_Burst_Fire.png` |
| Musketeer Post | Deadeye | `Musketeer_Post_Deadeye.png` |
| Paladin Keep | Holy Light | `Paladin_Keep_Holy_Light.png` |
| Paladin Keep | Blinding Strike | `Paladin_Keep_Blinding_Strike.png` |
| Assassin Guild | Knife Throw | `Assassin_Guild_Knife_Throw.png` |
| Assassin Guild | Sneak Attack | `Assassin_Guild_Sneak_Attack.png` |
| Ballista Turret | Reinforced Tension | `Ballista_Turret_Reinforced_Tension.png` |
| Ballista Turret | Heavy Bolt | `Ballista_Turret_Heavy_Bolt.png` |
| Cannon Outpost | Fiery Shot | `Cannon_Outpost_Fiery_Shot.png` |
| Cannon Outpost | Swift Reload | `Cannon_Outpost_Swift_Reload.png` |
| High Altar | Divine Fortitude | `High_Altar_Divine_Fortitude.png` |
| High Altar | Holy Wrath | `High_Altar_Holy_Wrath.png` |
| Judgement Temple | Inner Strength | `Judgement_Temple_Inner_Strength.png` |
| Judgement Temple | Slowed Pulse | `Judgement_Temple_Slowed_Pulse.png` |

**THE TABLE IS IN THE GAME'S OWN ORDER**, which is the order `ABILITIES` in
`src/data/abilities.js` lists them and the order the encyclopedia lays them out
down each family's column. Two rules decide it and both are the owner's:

- **Families in build-menu order** — archery, barracks, artillery, monastery —
  and within archery the Crossbow Sentry before the Musketeer Post.
- **Lighter disc first.** Each tower's pair is ordered so the ability drawn on
  the LIGHTER background sits above the darker one. `node tools/abilities.mjs`
  measures the discs off these files and fails if a pair is the wrong way round,
  so you never have to judge it by eye — but if you redraw an icon much darker or
  lighter, expect to swap a pair in the data.

**Named after the tower, not the ability**, which is what keeps the two Swift
Reloads and the two Reinforced Tensions apart on disk. A file named after the ability alone would
have to be one drawing for two different weapons.

All sixteen follow it now. They carried an `_Icon` suffix and three of them were
named for a man rather than a building — `Musketeer_`, `Paladin_`, `Assassin_` —
and two for nothing but the ability. The artist redrew the set and renamed them
all to `<Tower>_<Ability>.png`, which is the shape this rule was always
describing.

**`Paladin_Keep_Blinding_Strike.png` was Holy Slash**, renamed because there were
3 Holy things on the abilities page and the owner wanted 2. The ability's POSE and
its SOUND still read Holy Slash on disk — `assets/units/Paladin_Holy_Slash.png` and
`assets/audio/sfx/Paladin_Holy_Slash.mp3` — because only the button was redrawn.
Nothing in the game reads a filename; the binding is the `ability_` key in
`src/assets.js`.

## These are BUTTONS, not icons

That is the whole reason this folder exists apart from `assets/ui`. Every icon in
`assets/ui` is a transparent mark drawn ON TOP of the button plate that lives
there; each of these arrives as the whole button, drawn on a disc of exactly the
plate's own size, and is drawn INSTEAD of the plate.

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

The altar's two badges stay in `assets/ui` — `High_Altar_Holy_Wrath.png`
and `High_Altar_Divine_Fortitude.png`, the same names as the buttons here
without the `_Icon`. They are not buttons and never appear in the encyclopedia:
they are marks the renderer hangs over every tower an aura is working on, which
is board furniture rather than interface.

They also carry a constraint the buttons do not, and it cost a release to find:
a badge is drawn over the TOWER, so on the highest plots it lands in the top
button row, where an opaque plate erases it. `badgeFloor` in `src/render.js`
stops it there and `node tools/hud-clear.mjs` checks that it does.
