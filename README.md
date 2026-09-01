# Medieval TD

A tower defence played in a browser. Three hand-drawn maps, four families of
tower with a fork at the top of three of them, twenty buildings, fourteen
abilities, and an army that walks in from the left.

**Play it:** open `index.html`. That is the whole of it — there is no build step,
no bundler, no npm and no framework. Plain ES modules, one `<canvas>`, and the
artwork loaded from `assets/`. It runs from a file:// URL for a quick look and
from any static server for a real one:

```
python3 -m http.server 8123      # then http://localhost:8123/index.html
```

Add `?debug` to the URL to hang the live game state on `window.__game`.

## The shape of it

```
index.html          the game
src/                the rules and the drawing — 32 modules, no dependencies
src/data/           the numbers: towers, waves, abilities, statuses, the maps
assets/             every drawing and every sound, one folder per KIND of thing
tools/              26 checkers and measuring tools, Node only
birthday/           a separate mini-game, reached from the admin keypad
```

Four more pages sit beside `index.html` and are there for looking at new artwork
rather than for playing: `aim-test.html` (a tower aiming both ways at every
tier), `tower-test.html` (depth inside one sprite — add `?siege` for artillery),
`corpse-test.html` (every death pose) and `knock-test.html` (a body being knocked
back). Each says at the top what it is for and what a wrong drawing looks like.

## The rule this repository runs on

**Nothing about a picture is typed in by hand.** Every trim rectangle, shadow
anchor, mount point and muzzle in `src/data/` was measured off the artist's file
by a tool in `tools/`, and a tool checks it is still true. When the artist
re-exports a sprite one pixel taller, the check fails and prints the new number
rather than the game quietly drawing a man standing beside his own tower.

That is why there are twenty-six tools for eighteen thousand lines of game.

## The tools

Run them from the repository root, with Node. They print what they measured, and
exit non-zero when something is wrong.

| tool | what it holds true |
|------|--------------------|
| `check-modules` | every module is in each page's cache-busting import map |
| `trim` | every sprite's trim rect matches its file, and is sharp at its drawn size |
| `shadow` | every ground shadow's anchor is still under the thing that casts it |
| `roof` | nothing pokes through a roof it should be behind |
| `families` | each family's ladder still costs and pays what its design says |
| `book` | every encyclopedia card fits its plate at every wrap |
| `sound` | every clip is wired, levelled, and named by the thing that plays it |
| `audio` | the level table matches the files |
| `admin` | the dashboard reads and writes the numbers it claims to |
| `siege` | artillery's two-piece machines are drawn and aimed from real geometry |
| `formation` | no soldier of any squad stands off the road |
| `facing` | every figure faces the way it is moving or striking |
| `squad` | a barracks musters, rallies and re-musters the men it should |
| `svg` | the artist's SVGs still parse to the shapes the maps are built from |
| `png` | every PNG is the canvas size the folder's README asks for |
| `abilities` | all fourteen abilities do what their encyclopedia card says |
| `preview` | every wave table, normal and extended, beside its twin |
| `plague` | the thug throws, the flask breaks, and the spill poisons |
| `hud-clear` | no tower or badge is drawn into the HUD or off the board |
| `status` | a status goes on, hurts, shows and comes off, for both armies |
| `pair` | the two men on a tower that holds two take turns, and stand where they fit |
| `readme` | every asset README still describes the folder it is in |
| `sim` | plays whole games headless and reports what wins |
| `sweep` | runs the sim across difficulties and prints the table |
| `split-map` | pulls the build plots out of a map SVG |
| `trace-road` | pulls the road out of a map SVG and writes the route |

The first twenty-two are checks — run them after any change:

```
for t in check-modules trim shadow roof families book sound audio admin siege \
         formation facing squad svg png abilities preview plague hud-clear \
         status readme pair; do node tools/$t.mjs >/dev/null || echo "FAIL $t"; done
```

The last four are not checks. `sim` and `sweep` answer balance questions and take
minutes; `split-map` and `trace-road` are run once when the artist delivers a new
map.

## Uploading artwork

Every folder under `assets/` has a README that says what belongs in it, what to
call a file, how big to draw it and which tool to run afterwards. **Read the one
for the folder before uploading to it** — most of them carry a rule that cannot
be fixed in code later, like the black outline every status mark needs to stay
visible on grass.

| folder | what goes in it |
|--------|-----------------|
| `assets/towers/` | buildings only, one folder per family |
| `assets/units/` | every man, whichever family he belongs to |
| `assets/enemies/` | the army walking in |
| `assets/dead/` | one death pose per figure that can die |
| `assets/projectiles/` | anything that flies |
| `assets/effects/` | what a fight leaves on the ground |
| `assets/abilities/` | the icon on each ability's button |
| `assets/status/` | the mark over a figure's health bar |
| `assets/ui/` | the dashboard and the radial menu |
| `assets/map/` | the hand-drawn boards, as SVG |
| `assets/audio/` | `sfx/` for the world, `voice/` for the men |

## Where the numbers live

`src/data/` is the design, and it is written to be read. Every number has a
comment saying what it is worth, what it was before, and what broke when it was
something else — a tower's damage, a wave's size, the second a crew lose after a
heavy shot. If you want to know why the game plays the way it does, that folder
is the answer, not the rendering code.

`src/data/towers.js` holds the four families and their twenty buildings;
`src/data/waves.js` the army and the three maps' wave tables;
`src/data/abilities.js` the fourteen things a tier 4 tower can be taught;
`src/data/status.js` what can be happening to a figure; and
`src/data/level01.js` … `level03.js` the three boards, whose roads and build
plots were traced off the artwork rather than typed.
