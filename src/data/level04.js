// STAGE 2: the first board that is a game rather than a lesson.
//
// It is the tutorial's country one step out — same fields, same houses, a well
// and a signpost — and the first thing on it that stage 1 does not have is a
// SECOND ROAD. One arm comes down from the north and one in from the west, they
// meet at the junction by the well, and everything walks the same tarmac from
// there to the keep. Two ways in and one way out, which is the whole lesson of
// the board: a tower that covers the west road covers nothing until the join.
//
// THE TIER CAP IS OFF. Stage 1 stops at tier 2 and this does not, so this is
// where the ladder opens up — see `maxTier` in level00.js and the note on it.
//
// TRACED FROM THE ARTWORK by `node tools/trace-road.mjs assets/map/Stage_2_Map`,
// and the plots by `node tools/split-map.mjs assets/map/Stage_2_Map`. The map is
// the source of truth for both. Redraw and re-run rather than nudging numbers here.
import { stage2Waves, stage2WavesExtended } from './waves.js';

// ROUTE 0 COMES DOWN FROM THE TOP OF THE MAP, which no board had done before this
// one and which the tracer had to be taught to see — it looked for mouths on the
// left and the right only. The first point is off-canvas above the edge, the same
// way every other route starts off-canvas beside it: an enemy walks on rather
// than appearing on the kerb.
const north = [
  { x: 238, y: -39 },
  { x: 237, y: 1 },
  { x: 219, y: 103 },
  { x: 222, y: 133 },
  { x: 232, y: 167 },
  { x: 249, y: 205 },
  { x: 267, y: 231 },
  { x: 329, y: 295 },
  { x: 351, y: 311 },
  { x: 373, y: 317 },
  { x: 577, y: 325 },
  { x: 959, y: 363 },
  { x: 999, y: 366 }
];

// And route 1 in from the west, joining it at the junction. The two share every
// pixel of road east of about x 370, which is why a plot beside the junction is
// worth more than two beside the arms.
const west = [
  { x: -39, y: 410 },
  { x: 1, y: 405 },
  { x: 135, y: 404 },
  { x: 205, y: 394 },
  { x: 287, y: 367 },
  { x: 345, y: 325 },
  { x: 371, y: 317 },
  { x: 563, y: 324 },
  { x: 959, y: 363 },
  { x: 999, y: 365 }
];

// SEVEN, in road order — the order tools/sim.mjs and every "spread of towers"
// test indexes into. On a forked map "along the road" is not one number: it is
// how far each plot still is from the keep along whichever route passes nearest,
// which is the only ordering that means anything with two roads in play.
//
// THREE OF THEM SIT FURTHER OFF THE TARMAC than any plot on any other board —
// 98, 117 and 101px, where the splitter starts calling them FAR at 95. That is
// the artwork's own spacing and not a mistake to correct here; what it costs is
// a barracks squad walking a little further to its post, which tools/formation.mjs
// measures on every plot of every board.
const plots1 = [
  { x:  78, y: 310 },   //  942 from the keep,  94 off the road
  { x: 280, y: 473 },   //  769 from the keep,  98 off the road
  { x: 382, y: 182 },   //  722 from the keep, 117 off the road
  { x: 430, y: 420 },   //  567 from the keep, 101 off the road
  { x: 528, y: 230 },   //  476 from the keep,  93 off the road
  { x: 862, y: 262 },   //  147 from the keep,  91 off the road — the top right one
  { x: 852, y: 443 }    //  139 from the keep,  90 off the road
];

export const level04 = {
  id: 'm4',
  name: 'Oakland Outskirts',
  // Short enough for the admin panel's map tab, which is a chip in a row that now
  // holds five of them. The full name is what every screen with room shows.
  short: 'Outskirts',
  art: 'map04',
  // Drawn in layers, like stage 1 — the artwork is Stage_2_Map_Layer_1..3.svg and
  // the tools stack it. See readArtwork in tools/svg.mjs.
  src: 'assets/map/Stage_2_Map',
  routes: [north, west],
  plots: plots1,
  waves: stage2Waves,
  wavesExtended: stage2WavesExtended,
  startGold: 240,
  startLives: 20,

  // WHAT IS ALREADY STANDING WHEN THE GAME OPENS.
  //
  // The owner's ask: a tier 3 barracks on the top-right plot, there from the first
  // frame. It is an ordinary tower in every other respect — it can be sold, its
  // squad can be rallied, and taking it down refunds what building it would have
  // cost — because a tower the player cannot touch is scenery, and scenery that
  // fights is the kind of thing that makes a board feel broken rather than
  // generous.
  //
  // The plot is named by INDEX into the list above, which is in road order, so
  // this moves with the artwork rather than pinning a coordinate that a redraw
  // would leave behind. Index 5 is (862, 262) — the top right marker, 147px from
  // the keep, which is the one the owner asked for. See prebuiltOn in src/towers.js.
  prebuilt: [
    { plot: 5, family: 'barracks', tier: 3 }
  ]
};
