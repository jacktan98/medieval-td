// THE BALANCE BUDGET — a quick read on every wave of every stage, worked out from
// the tables rather than played. `node tools/budget.mjs` (add a stage number, or
// `--waves` for every wave rather than each stage's summary).
//
// It is the owner's idea, and the reason is speed: tools/sim.mjs plays the game
// out, which is the honest answer and takes minutes a run. This takes a second,
// by comparing two sums for each wave:
//
//   WHAT COMES. Its health, as the build below would see it (each type's health
//   through the armour it wears against each tower's kind of damage), the lives it
//   could take, and the bounty it pays if every one dies.
//
//   WHAT A MIXED BUILD COULD DO TO IT. The gold the player would have at the start
//   of that wave — the stage's purse plus every earlier wave's bounty, all killed,
//   no early-call gold, no star upgrades — spent on a fixed mix (archery,
//   monastery, siege, barracks, round the plots in order of how much road they
//   see), then upgraded evenly. Each tower's damage a second, through the wave's
//   armour, times the seconds an enemy stream is inside its reach (the wave's
//   spawn time plus the time one enemy takes to walk the road it covers, MEASURED
//   on the board's own roads and plots), splash counted by how close the wave walks.
//
//   RATIO = what the build could deal / the health that comes. Above 1 there is
//   damage to spare on paper; below 1 the towers alone cannot do it, and blocking
//   and the player's choices have to make up the rest.
//
// WHAT IT CANNOT SEE, and why its numbers are for COMPARING rather than believing:
// soldiers holding enemies inside the towers' reach (the biggest thing a barracks
// does), overkill and gaps in the stream, the tier 4 abilities, enemies healing or
// raising shields, villagers who turn, crows on the balcony. So read the SHAPE: the
// hardest wave of each stage should get harder stage by stage, smoothly, and a wave
// far out of line with its neighbours is the one worth playing.
import { levels } from '../src/level.js';
import { enemyTypes } from '../src/data/waves.js';
import { families } from '../src/data/towers.js';
import { STAGES } from '../src/data/overview.js';
import { DIFFICULTIES, scaleWaves, startingGold } from '../src/data/difficulty.js';
import { taken } from '../src/data/armor.js';
import { SQUASH } from '../src/ground.js';

const args = process.argv.slice(2);
const ALL_WAVES = args.includes('--waves');
const ONLY = args.map(Number).filter(n => n > 0);

// The mix, round the plots: the families in the order the build reaches for them.
const MIX = ['archery', 'monastery', 'siege', 'barracks'];
const fam = id => families.find(f => f.id === id);

// The final bosses, who walk out once the last wave is down — see villagers.js.
const BOSS = { m17: 'captain_thug', m18: 'crow_harbinger' };

// ROAD INSIDE A REACH, in px: every route sampled every 4px, averaged over the routes
// by the share of the wave each one carries.
function roadIn(lv, x, y, range, minRange = 0) {
  const mix = lv.routeMix || lv.routes.map(() => 1);
  const total = mix.reduce((a, b) => a + b, 0);
  let sum = 0;
  lv.routes.forEach((r, ri) => {
    let len = 0;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.ceil(L / 4));
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n, px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u;
        const d = Math.hypot((px - x) / range, (py - y) / (range * SQUASH));
        const dMin = minRange ? Math.hypot((px - x) / minRange, (py - y) / (minRange * SQUASH)) : 2;
        if (d <= 1 && dMin > 1) len += L / n;
      }
    }
    sum += len * mix[ri] / total;
  });
  return sum;
}

// What can be built on this stage: the tiers up to its cap, and a tier 4 only if
// it is named in `allow` (or the stage has no cap at all).
function ladder(lv, f) {
  const cap = lv.maxTier ?? 4, allow = lv.allow || [];
  const ok = f.tiers.filter(d => d.tier <= cap || allow.includes(d.name));
  const rungs = [1, 2, 3].map(t => ok.find(d => d.tier === t)).filter(Boolean);
  // Of two tier 4s, the one with the bigger raw damage a second.
  const fours = ok.filter(d => d.tier === 4);
  if (fours.length) rungs.push(fours.sort((a, b) => rawDps(b) - rawDps(a))[0]);
  return rungs;
}
const rawDps = d => d.cooldown ? d.damage / d.cooldown
  : d.soldier ? d.soldier.count * d.soldier.damage / d.soldier.cd : 0;

// The build that `gold` buys: towers on the plots in order, then upgrades, cheapest
// rung first, until the gold runs out. Returns [{ plot, fam, def }].
function buildFor(lv, plots, gold) {
  const towers = [];
  for (const p of plots) {
    const rungs = p.rungs;
    if (!rungs.length || rungs[0].cost > gold) break;
    gold -= rungs[0].cost;
    towers.push({ ...p, level: 0, def: rungs[0] });
  }
  for (;;) {
    const next = towers.filter(t => t.level + 1 < t.rungs.length)
      .sort((a, b) => a.level - b.level || a.rungs[a.level + 1].cost - b.rungs[b.level + 1].cost)[0];
    if (!next || next.rungs[next.level + 1].cost > gold) break;
    gold -= next.rungs[next.level + 1].cost;
    next.level++;
    next.def = next.rungs[next.level];
  }
  return { towers, spare: gold };
}

// One wave, as the numbers above.
function waveSums(wave) {
  const out = { n: 0, hp: 0, lives: 0, bounty: 0, span: 0, types: {} };
  for (const g of wave.groups) {
    const d = enemyTypes[g.type];
    out.n += g.count;
    out.hp += g.count * d.hp;
    out.lives += g.count * (d.leak || 0);
    out.bounty += g.count * (d.bounty || 0);
    out.span += g.count * g.gap;
    (out.types[g.type] ||= { count: 0, gap: g.gap }).count += g.count;
  }
  return out;
}

// HOW MUCH HEALTH ONE TOWER'S DAMAGE REMOVES A SECOND from this wave, and for how
// long: its blows through each type's armour, weighted by that type's share of the
// wave's health — and nothing on what it cannot hit (crows for siege and soldiers,
// shadow thugs for towers until a soldier stops one).
function capacity(t, ws) {
  const d = t.def;
  let dealt = 0;
  for (const [type, { count, gap }] of Object.entries(ws.types)) {
    const e = enemyTypes[type];
    const share = count * e.hp / ws.hp;
    const air = e.flying, hidden = e.unseen;
    let dps = 0, secs = 0;
    if (d.soldier) {
      if (air) continue;
      const s = d.soldier;
      dps = s.count * taken(s.damage, s.damageType || 'physical', e.armour, s.pierce) / s.cd;
      // A squad fights for as long as the wave is passing its spot on the road.
      secs = ws.span + t.road[0] / e.speed;
    } else {
      if (air && !(d.ammo && d.ammo.air)) continue;
      if (hidden) continue;
      dps = taken(d.damage, d.damageType, e.armour, d.pierce) / d.cooldown;
      // SPLASH: as many of this type as stand within the blast, from how far apart
      // the stream walks (three lanes, so up to three abreast), between 1 and 4.
      if (d.splash) dps *= Math.max(1, Math.min(4, (2 * d.splash) / (gap * e.speed) * 1.5));
      secs = ws.span + t.road[t.level] / e.speed;
    }
    dealt += share * dps * secs;
  }
  return dealt;
}

const pct = x => `${Math.round(x * 100)}%`;
const pad = (s, n) => String(s).padStart(n);

for (const [si, st] of STAGES.entries()) {
  if (ONLY.length && !ONLY.includes(si + 1)) continue;
  const lv = levels[st.level];
  // The plots, each with the family the mix gives it and the road each of its rungs
  // can reach, in order of road seen — the best plots get built first.
  const base = lv.plots.map(p => ({ p, see: roadIn(lv, p.x, p.y, 200) }))
    .sort((a, b) => b.see - a.see);
  const plots = base.map(({ p }, i) => {
    const f = fam(MIX[i % MIX.length]);
    const rungs = ladder(lv, f);
    return { x: p.x, y: p.y, fam: f.id, rungs, road: rungs.map(d => roadIn(lv, p.x, p.y, d.range, d.minRange || 0)) };
  });
  console.log(`\nSTAGE ${si + 1} ${lv.name} — ${lv.plots.length} plots, lives ${lv.startLives}`);
  for (const diff of DIFFICULTIES) {
    const waves = scaleWaves(lv.waves, diff);
    let gold = startingGold(lv.startGold, diff);
    const rows = [];
    waves.forEach((w, wi) => {
      const ws = waveSums(w);
      const { towers } = buildFor(lv, plots, gold);
      const dealt = towers.reduce((a, t) => a + capacity(t, ws), 0);
      rows.push({ wi, ws, gold, dealt, ratio: dealt / ws.hp, build: towers.map(t => t.fam[0].toUpperCase() + (t.level + 1)).join(' ') });
      gold += ws.bounty;
    });
    const boss = BOSS[lv.id] && enemyTypes[BOSS[lv.id]];
    if (boss) {
      const { towers } = buildFor(lv, plots, gold);
      const dps = towers.reduce((a, t) => a + (t.def.soldier ? 0 : taken(t.def.damage, t.def.damageType, boss.armour, t.def.pierce) / t.def.cooldown), 0);
      rows.boss = { name: boss.name, hp: boss.hp, dps, secs: boss.hp / dps };
    }
    const worst = rows.reduce((a, r) => (r.ratio < a.ratio ? r : a));
    console.log(`  ${diff.name.padEnd(6)} hardest wave ${worst.wi + 1}: ratio ${worst.ratio.toFixed(2)}  ` +
      `(${worst.ws.n} enemies, ${worst.ws.hp} hp, ${worst.ws.lives} lives at risk; ${worst.gold}g -> ${worst.build})` +
      (rows.boss ? `  | ${rows.boss.name} ${rows.boss.hp} hp: ${Math.round(rows.boss.dps)} dmg/s, ${Math.round(rows.boss.secs)}s of fire` : ''));
    if (ALL_WAVES) {
      console.log(`    wave  enemies     hp  lives  bounty   gold  ratio  build`);
      for (const r of rows) {
        console.log(`    ${pad(r.wi + 1, 4)}  ${pad(r.ws.n, 7)}  ${pad(r.ws.hp, 5)}  ${pad(r.ws.lives, 5)}  ${pad(r.ws.bounty, 6)}  ${pad(r.gold, 5)}  ${pad(r.ratio.toFixed(2), 5)}  ${r.build}`);
      }
    }
  }
}
