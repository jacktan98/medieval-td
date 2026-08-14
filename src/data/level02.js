// The second map: a fork. Two roads come in from the west and merge before the
// keep, so a wave arrives from two directions at once.
//
// TRACED FROM THE ARTWORK, by `node tools/trace-road.mjs assets/map/Map_2.svg`.
// Do not nudge these numbers — redraw the map and re-run. Map 1's polyline was
// extracted the same way years of commits ago and the tool was lost, which is
// why it carries a paragraph of notes about hand-fixing its ends and this one
// does not need to.
//
// TWO ROUTES, WRITTEN OUT IN FULL. They share their tail — from the junction at
// about (547, 325) both lists are the same points — and that duplication is
// deliberate. The alternative is a graph of road segments with a merge node,
// which buys nothing here: an enemy picks one route at spawn and walks it to
// the end, and two routes agreeing about the last third is exactly what "the
// roads have merged" means on the screen. A junction that had to be modelled as
// a decision would be a different feature.
import { waves } from './waves.js';

const north = [
  { x: -39, y: 188 },
  { x: 1, y: 193 },
  { x: 99, y: 211 },
  { x: 321, y: 227 },
  { x: 399, y: 240 },
  { x: 471, y: 264 },
  { x: 543, y: 320 },
  { x: 633, y: 336 },
  { x: 691, y: 341 },
  { x: 959, y: 337 },
  { x: 999, y: 339 }
];

const south = [
  { x: -39, y: 419 },
  { x: 1, y: 417 },
  { x: 63, y: 423 },
  { x: 215, y: 420 },
  { x: 371, y: 401 },
  { x: 459, y: 376 },
  { x: 487, y: 361 },
  { x: 525, y: 333 },
  { x: 547, y: 325 },
  { x: 691, y: 341 },
  { x: 959, y: 337 },
  { x: 999, y: 337 }
];

// The nine markers as painted, read out of the artwork by
// `node tools/split-map.mjs assets/map/Map_2.svg`. In road order, which for a
// forked map means by how far each plot still is from the keep: plot 0 is the
// one the column passes first.
// Every one of them sits 79 to 91px off the road, which is a real difference
// from map 1 and not a small one: that map has two plots more than 130px out —
// marked FAR there — that can barely reach the tarmac and are tier 3 or barracks
// positions only. Map 2 has no dead plots. See tools/sim.mjs for what that did
// to the balance and what was done about it.
const plots = [
  { x: 94, y: 294 },    // 925 from the keep, 83 off the road
  { x: 227, y: 334 },   // 782 from the keep, 84 off the road
  { x: 367, y: 320 },   // 628 from the keep, 79 off the road
  { x: 412, y: 475 },   // 628 from the keep, 82 off the road
  { x: 498, y: 177 },   // 551 from the keep, 91 off the road
  { x: 595, y: 418 },   // 395 from the keep, 87 off the road
  { x: 644, y: 244 },   // 365 from the keep, 91 off the road
  { x: 794, y: 256 },   // 204 from the keep, 83 off the road
  { x: 880, y: 417 }    // 120 from the keep, 79 off the road
];

export const level02 = {
  id: 'm2',
  name: 'The Fork',
  art: 'map02',
  src: 'assets/map/Map_2.svg',
  routes: [north, south],
  plots,
  // How fast the column walks, as a multiple of each enemy type's own speed.
  //
  // THIS IS THE DIFFICULTY DIAL, and it exists because the brief was a second
  // stage as hard as the first while the artwork decides the shape of the
  // ground. Map 1's road is 1804px long; each of these is about 1060. Waves are
  // shared between the maps, so an enemy here would be under fire for 59% as
  // long as the same enemy there, and the same six towers that hold map 1 lose
  // map 2 by wave 4.
  //
  // Gold cannot buy that back — tried, from 220 up to 620, and every build still
  // lost, because the shortfall is time under fire and not towers. Slowing the
  // march restores exactly the thing that is missing and nothing else: the same
  // wave takes the same wall-clock time to cross the board, so the pacing, the
  // gold flow and the early-call bonus all land where they do on map 1.
  //
  // 0.62 was measured rather than guessed, against map 1's best build at each
  // family split over five seeds each. At 0.70 the map is clearly harder than
  // map 1 (the best 4-archery build wins 2 times in 5, against 4); at 0.60 it is
  // a little easier (6 lives left against 4). See tools/sim.mjs.
  march: 0.62,
  // Untouched, and that is the point: the purse and the keep are map 1's, so the
  // two stages are the same game on different ground.
  // The same eight waves map 1 runs. A level names its own table so the
  // difficulty of a map is a property of the map. See data/waves.js.
  waves,
  startGold: 220,
  startLives: 20
};
