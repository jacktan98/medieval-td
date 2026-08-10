// The shape of a road, and where on it a figure stands.
//
// A route is a polyline the artist drew, extracted by tools/trace-road.mjs. The
// game asks it two kinds of question — "where am I after walking this far" and
// "what is the nearest bit of road to here" — and both used to be answered by
// hand-rolled loops in enemies.js and units.js that walked the segments each
// time. They are here now because a level can have SEVERAL routes, and three
// copies of segment-walking code is three places for them to disagree.
//
// Position along a route is an ARC LENGTH, one number, rather than a waypoint
// index plus a fraction of the way to the next one. That is what makes lanes
// possible: an offset has to be measured perpendicular to the road, and the
// perpendicular has to vary smoothly, which is awkward to express when the
// position is "somewhere between vertex 7 and vertex 8".

// How far off the centre of the road the outer lanes walk, in px.
//
// Enemies do not file down the middle any more — each one picks a lane and
// keeps it, so a wave arrives as a loose column rather than a snake. Three
// lanes: the near kerb, the middle, and the far kerb.
//
// The ceiling comes from the artwork: tools/trace-road.mjs reports how much road
// there is either side of the centreline at its NARROWEST point, which is 32px
// on map 1 and 40px on map 2. Past 32 and enemies walk on the grass through map
// 1's tight stretch.
//
// 16 is chosen well inside that, and the reason is BALANCE rather than tarmac.
// Lanes cost the defence real ground, more than their size suggests: the range
// ellipse is squashed to 0.62 vertically, and both roads run mostly across the
// screen, so a lateral offset is mostly a VERTICAL one — 16px of lane is about
// 26px of effective range lost to any enemy on an outer lane. Measured on map 1,
// the best mixed build goes from finishing with 10 lives of 20 to finishing with
// 4 or 5, and it is nearly flat between 12 and 20: what costs the lives is
// having a third of the wave off-centre at all, not how far off-centre it is.
// So 16 buys a clearly ragged column at no worse a price than 12 would.
//
// Setting this to 0 puts every enemy back on the centreline and reproduces the
// pre-lane balance exactly, which is how that comparison was made.
export const LANE = 16;
export const LANES = [-LANE, 0, LANE];

// Pick one at random. Called once per enemy, at spawn — a lane is a decision a
// figure makes on the way in and then keeps, not something re-rolled per frame.
export const randomLane = () => LANES[(Math.random() * LANES.length) | 0];

const norm = (x, y) => {
  const L = Math.hypot(x, y) || 1;
  return [x / L, y / L];
};

// Measure a polyline once: cumulative distance to each vertex, the unit tangent
// of each segment, and a normal at each VERTEX.
//
// The vertex normal is the average of the two segments meeting there — the
// mitre — rather than either segment's own. Using one segment's normal makes
// the offset lanes jump sideways at every corner, by twice the lane width times
// the sine of half the turn: about 11px at a 30-degree bend, which is very
// visible on a figure that is 12px wide. Averaging makes the lane a proper
// parallel curve, continuous through the joint.
export function prepare(pts) {
  const cum = [0];
  const tan = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const L = Math.hypot(dx, dy);
    tan.push(L ? [dx / L, dy / L] : [1, 0]);
    cum.push(cum[i] + L);
  }

  const nrm = pts.map((_, i) => {
    const a = tan[i - 1] || tan[i] || [1, 0];
    const b = tan[i] || tan[i - 1] || [1, 0];
    // Perpendicular of a tangent (tx, ty) is (-ty, tx). Which side that names
    // does not matter — it only has to be the same side all the way along.
    return norm(-(a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
  });

  return { pts, cum, tan, nrm, total: cum[cum.length - 1] };
}

// Which segment a given arc length falls in. Linear from the start: routes are
// a dozen points long, so a binary search would cost more in cleverness than it
// saves in comparisons.
function seg(r, s) {
  let k = 0;
  while (k < r.cum.length - 2 && r.cum[k + 1] < s) k++;
  const L = r.cum[k + 1] - r.cum[k] || 1;
  return { k, u: Math.max(0, Math.min(1, (s - r.cum[k]) / L)) };
}

// Point, tangent and normal at an arc length. `s` is clamped, so walking past
// the end returns the end rather than running off into nothing.
export function at(r, s) {
  const { k, u } = seg(r, Math.max(0, Math.min(r.total, s)));
  const a = r.pts[k], b = r.pts[k + 1];
  const [nx, ny] = norm(
    r.nrm[k][0] + (r.nrm[k + 1][0] - r.nrm[k][0]) * u,
    r.nrm[k][1] + (r.nrm[k + 1][1] - r.nrm[k][1]) * u
  );
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    tx: r.tan[k][0], ty: r.tan[k][1],
    nx, ny
  };
}

// Where a figure in `lane` stands, having walked `s` along the road.
export function offset(r, s, lane) {
  const p = at(r, s);
  return { x: p.x + p.nx * lane, y: p.y + p.ny * lane, tx: p.tx, ty: p.ty };
}

// The nearest point on ANY of a level's routes — the rally point a barracks
// sends its soldiers to, and the "is this plot near the road" test.
//
// Across all routes rather than one, because a level can have several and a
// barracks built by the southern road must not send its men to the northern
// one. Where two routes overlap the answer is the same either way, which is
// exactly the case at a junction.
export function nearestOn(routes, x, y) {
  let best = { route: 0, s: 0, x: 0, y: 0, d: Infinity, tx: 1, ty: 0 };

  routes.forEach((r, ri) => {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2)) : 0;
      const px = a.x + dx * t, py = a.y + dy * t;
      const d = Math.hypot(px - x, py - y);
      if (d < best.d) {
        best = {
          route: ri, s: r.cum[i] + t * Math.sqrt(len2),
          x: px, y: py, d, tx: r.tan[i][0], ty: r.tan[i][1]
        };
      }
    }
  });

  return best;
}
