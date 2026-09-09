// Reading the artist's SVG exports. Node only — never loaded by the game.
//
// Shared by tools/split-map.mjs, which pulls the plot markers out of a map, and
// tools/trace-road.mjs, which pulls the road out of one. Both need the same
// three things — flatten a path's `d`, follow the nested transforms, and know
// what colour a shape was filled with — and the second tool was written by
// copying the first before this file existed.
//
// Nothing here renders. Curves are sampled rather than solved because every
// caller is measuring shapes, not drawing them.

import { readFileSync, readdirSync } from 'fs';

// Flatten a path's `d` to points under a 2x3 affine.
export function points(d, tf) {
  const [a, b, c, e, f, g] = tf;
  const tk = d.match(/[MmLlCcQqZzHhVv]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const pts = [];
  let i = 0, cur = [0, 0], start = [0, 0], cmd = null;
  const n = () => parseFloat(tk[i++]);
  const push = p => { pts.push([a * p[0] + c * p[1] + f, b * p[0] + e * p[1] + g]); return p; };

  while (i < tk.length) {
    if (/[A-Za-z]/.test(tk[i])) cmd = tk[i++];
    if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();

    if (cmd === 'M' || cmd === 'm') {
      let x = n(), y = n();
      if (rel) { x += cur[0]; y += cur[1]; }
      cur = push([x, y]); start = cur; cmd = rel ? 'l' : 'L';
    } else if (cmd === 'L' || cmd === 'l') {
      let x = n(), y = n();
      if (rel) { x += cur[0]; y += cur[1]; }
      cur = push([x, y]);
    } else if (cmd === 'H' || cmd === 'h') {
      let x = n(); if (rel) x += cur[0]; cur = push([x, cur[1]]);
    } else if (cmd === 'V' || cmd === 'v') {
      let y = n(); if (rel) y += cur[1]; cur = push([cur[0], y]);
    } else if (cmd === 'C' || cmd === 'c') {
      let x1 = n(), y1 = n(), x2 = n(), y2 = n(), x = n(), y = n();
      if (rel) { x1 += cur[0]; y1 += cur[1]; x2 += cur[0]; y2 += cur[1]; x += cur[0]; y += cur[1]; }
      const p0 = cur;
      for (let s = 1; s <= 16; s++) {
        const u = s / 16, m = 1 - u;
        push([m*m*m*p0[0] + 3*m*m*u*x1 + 3*m*u*u*x2 + u*u*u*x,
              m*m*m*p0[1] + 3*m*m*u*y1 + 3*m*u*u*y2 + u*u*u*y]);
      }
      cur = [x, y];
    } else if (cmd === 'Q' || cmd === 'q') {
      let x1 = n(), y1 = n(), x = n(), y = n();
      if (rel) { x1 += cur[0]; y1 += cur[1]; x += cur[0]; y += cur[1]; }
      const p0 = cur;
      for (let s = 1; s <= 12; s++) {
        const u = s / 12, m = 1 - u;
        push([m*m*p0[0] + 2*m*u*x1 + u*u*x, m*m*p0[1] + 2*m*u*y1 + u*u*y]);
      }
      cur = [x, y];
    } else if (cmd === 'Z' || cmd === 'z') {
      cur = start;
    } else { i++; }
  }
  return pts;
}

export function compose(p, q) {
  // p and q are [a,b,c,d,e,f] as in SVG's matrix(a,b,c,d,e,f).
  return [
    p[0]*q[0] + p[2]*q[1],
    p[1]*q[0] + p[3]*q[1],
    p[0]*q[2] + p[2]*q[3],
    p[1]*q[2] + p[3]*q[3],
    p[0]*q[4] + p[2]*q[5] + p[4],
    p[1]*q[4] + p[3]*q[5] + p[5]
  ];
}

export function parseTransform(attr) {
  if (!attr) return [1, 0, 0, 1, 0, 0];
  const m = attr.match(/matrix\(([^)]*)\)/);
  if (m) return m[1].split(/[,\s]+/).map(Number);
  const t = attr.match(/translate\(([^)]*)\)/);
  if (t) { const v = t[1].split(/[,\s]+/).map(Number); return [1, 0, 0, 1, v[0], v[1] || 0]; }
  return [1, 0, 0, 1, 0, 0];
}

// A shape's own transform, composed onto whatever its groups already impose.
//
// A `transform` on the <path> itself, not on a group around it — which is how
// the second map's exporter wrote every shape, and the first map's did not.
// Reading only group transforms put map 2's road at x -1935..154 on a 1920-wide
// canvas, and the tool reported the road never reaching the right-hand edge.
export function own(attrs, inherited) {
  const t = (attrs.match(/transform="([^"]*)"/) || [])[1];
  return t ? compose(inherited, parseTransform(t)) : inherited;
}

export const bounds = ps => ({
  x0: Math.min(...ps.map(p => p[0])), x1: Math.max(...ps.map(p => p[0])),
  y0: Math.min(...ps.map(p => p[1])), y1: Math.max(...ps.map(p => p[1]))
});

// Walk every group, at every depth, recording its text span, the transform it
// inherits, and the sub-paths it draws.
//
// Regex alone cannot do this: groups nest, so a closing tag has to be matched
// by depth.
export function allGroups(text) {
  const clip = text.indexOf('<g clip-path');
  if (clip < 0) throw new Error('no clipped artboard group found');

  const tag = /<(\/?)(g|path|rect)\b([^>]*?)(\/?)>/g;
  tag.lastIndex = text.indexOf('>', clip) + 1;

  const stack = [];                        // open groups
  const out = [];
  let tf = [[1, 0, 0, 1, 0, 0]];            // inherited transform per open group

  for (let m; (m = tag.exec(text));) {
    const [, close, name, attrs, selfClose] = m;

    if (name === 'path' || name === 'rect') {
      const d = attrs.match(/\bd="([^"]*)"/);
      if (d) {
        const pts = points(d[1], own(attrs, tf[tf.length - 1]));
        if (pts.length) for (const g of stack) g.subPaths.push(pts);
      }
      continue;
    }

    if (!close && !selfClose) {
      const local = parseTransform((attrs.match(/transform="([^"]*)"/) || [])[1]);
      tf.push(compose(tf[tf.length - 1], local));
      stack.push({ start: m.index, subPaths: [] });
    } else if (close) {
      tf.pop();
      const g = stack.pop();
      if (!g) break;                        // the artboard group's own closing tag
      g.end = tag.lastIndex;
      if (g.subPaths.length) out.push(g);
    }
  }
  return out;
}

// Every drawn shape with its fill, rather than every group. This is the view a
// colour question wants: "which shape is the road" is answered by the fill, and
// the group nesting only gets in the way.
//
// Sub-paths of one `d` are kept together, because a shape with a hole is one
// shape — the road is a single path in both maps so far, but a lake with an
// island would not be.
export function shapesByFill(text) {
  const clip = text.indexOf('<g clip-path');
  const from = clip < 0 ? 0 : text.indexOf('>', clip) + 1;

  const tag = /<(\/?)(g|path|rect)\b([^>]*?)(\/?)>/g;
  tag.lastIndex = from;

  const out = [];
  let tf = [[1, 0, 0, 1, 0, 0]];

  for (let m; (m = tag.exec(text));) {
    const [, close, name, attrs, selfClose] = m;

    if (name === 'path' || name === 'rect') {
      const d = attrs.match(/\bd="([^"]*)"/);
      const fill = (attrs.match(/\bfill="([^"]*)"/) || [])[1] || null;
      if (d) {
        const pts = points(d[1], own(attrs, tf[tf.length - 1]));
        if (pts.length) out.push({ fill, pts });
      }
      continue;
    }

    if (!close && !selfClose) {
      const local = parseTransform((attrs.match(/transform="([^"]*)"/) || [])[1]);
      tf.push(compose(tf[tf.length - 1], local));
    } else if (close) {
      if (tf.length > 1) tf.pop();
    }
  }
  return out;
}

// --- THE ROAD, AND WHETHER A POINT IS ON IT ----------------------------------
//
// The fourth thing both callers needed, arrived at the same way the first three
// did: tools/trace-road.mjs found the road in a map and tools/formation.mjs
// copied it to ask whether a soldier is standing on one. The two copies had
// already started to differ in their comments while doing exactly the same
// arithmetic, which is how the copy before them went wrong.
//
// THE ARTIST'S ROAD COLOUR, in every map so far, and the reason `fill` is a
// parameter rather than this constant is that the day a map is drawn with a
// second surface — a bridge, a ford — it is one argument rather than a fork.
export const ROAD_FILL = '#ffde9e';

// AND THE GROUND, which is how the artist punches a HOLE in a road.
//
// Stage 3's road is one big blob with a grass island in the middle of it — a
// roundabout, with a statue and two braziers on it. The island is not a hole in
// the road SHAPE; it is grass painted on top, which is the natural way to draw
// it and was read by the tools as 1068x384 of walkable tarmac. The traced route
// went straight over the statue.
//
// So the rule is: road is road, EXCEPT where the ground has been painted back
// over it. That reads the drawing the way the eye does, and it costs the artist
// nothing — a central reservation, a rock in the road and a roundabout are all
// the same gesture. It is the same colour as layer 1's background, which is what
// makes it "the ground" rather than a colour that has to be looked up.
export const GROUND_FILL = '#5c7f49';

// The maps are drawn at 1920x1080 and the game is 960x540.
export const MAP_SCALE = 0.5;

// Every shape of one filled colour, in game space, as ONE POLYGON EACH.
//
// IT WAS ONE FLAT SOUP OF POINTS and that was a bug with a long fuse. Even-odd
// over every ring at once answers for several shapes in one test, which is true
// and cheap while the shapes do not OVERLAP — three boards' worth of roads, and
// map 3's two separate ones, never did. Stage 2's road is a junction drawn as
// four overlapping pieces, and even-odd turns every overlap into a hole: the
// mask came back as a thin diagonal streak with the junction missing, and the
// tracer reported a road that reached no edge of the map.
//
// A shape's own `d` may still hold several sub-paths and those ARE even-odd
// against each other — that is how a hole in one shape is drawn, and it is why
// the split is per shape rather than per ring.
export function fillPolys(text, fill = ROAD_FILL, scale = MAP_SCALE) {
  const shapes = shapesByFill(text).filter(s => (s.fill || '').toLowerCase() === fill);
  if (!shapes.length) throw new Error(`no shape filled ${fill}`);
  return shapes.map(s => s.pts.map(p => [p[0] * scale, p[1] * scale]));
}

// Inside ANY of them — the union, which is what a road drawn in pieces is.
export const insideAny = (polys, x, y) => polys.some(p => insidePoly(p, x, y));

// WHERE A FIGURE MAY WALK: whichever of the road and the ground was painted LAST.
//
// ORDER IS THE WHOLE RULE, and it took two wrong versions to say it properly.
//
// "Any shape of the ground colour is a hole" reads stage 3's grass island
// correctly and destroys map 1, whose grass FIELD is a path of that same colour
// drawn under everything — subtracting it left a board with no road at all.
//
// "Ground drawn after the LAST road shape is a hole" then read map 1 correctly and
// missed the island: stage 3 has three 13x11 road-coloured pebbles scattered at
// indices 302, 308 and 430, so the last road shape is nowhere near the last road
// SHAPE THAT MATTERS, and the island at index 1 was not after it.
//
// So it is asked per point, in painter's order, which is what the eye does: walk
// the stack from the top and take the first shape that covers the spot. Paint
// grass over tarmac and it is grass; paint tarmac over grass and it is road; paint
// a pebble on the island and it is road again. Nothing else can tell them apart —
// they are the same kind of shape and, in the field's case, the same colour.
export function roadPolys(text, scale = MAP_SCALE) {
  const shapes = shapesByFill(text);
  const fillOf = s => (s.fill || '').toLowerCase();
  const scaled = s => s.pts.map(p => [p[0] * scale, p[1] * scale]);

  const layers = shapes
    .filter(s => fillOf(s) === ROAD_FILL || fillOf(s) === GROUND_FILL)
    .map(s => ({ poly: scaled(s), road: fillOf(s) === ROAD_FILL }));
  if (!layers.some(l => l.road)) throw new Error(`no shape filled ${ROAD_FILL}`);

  return {
    layers,
    // For the caller's own reporting only. `layers` is what decides.
    road: layers.filter(l => l.road).map(l => l.poly),
    holes: layers.filter(l => !l.road).map(l => l.poly)
  };
}

// The topmost shape covering the point decides. Walked from the top down, so the
// first hit is the answer and nothing below it is asked.
export function onRoad({ layers }, x, y) {
  for (let i = layers.length - 1; i >= 0; i--) {
    if (insidePoly(layers[i].poly, x, y)) return layers[i].road;
  }
  return false;
}

// Even-odd point-in-polygon over that soup.
export function insidePoly(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// --- a board that arrives as layers ------------------------------------------
//
// The boards were one file each until stage 1 got detailed enough to be drawn in
// three, which is the same thing that happened to the world map and for the same
// reason: Graphite struggles on a file that big. It costs the game nothing —
// every layer is the SAME 1920x1080 artboard, so stacking them is stacking, with
// no offsets and no arithmetic — but it costs the tools something, because three
// of them read a board as one string.
//
// So they all read it through here instead, and only this knows the difference.
// A level's `src` names either a file (`Map_1.svg`, drawn in one piece) or a STEM
// (`Stage_1_Map`, drawn in layers as `Stage_1_Map_Layer_N.svg`).
//
// ONE CLIP FOR THE WHOLE STACK, not one per layer, and that is not a tidiness
// choice. allGroups walks out of the FIRST artboard group it finds and stops at
// its closing tag, so a stack of three clip groups hands every tool layer 1 and
// nothing else — which showed up as split-map.mjs finding 153 groups of scenery
// and no plot markers at all, because the markers are in layer 3. Every layer
// clips to the same 1920x1080 rectangle anyway, so one is exactly equivalent.
export function layerFiles(stem) {
  const dir = stem.slice(0, stem.lastIndexOf('/'));
  const base = stem.slice(stem.lastIndexOf('/') + 1);
  const re = new RegExp(`^${base}_Layer_(\\d+)\\.svg$`);
  return readdirSync(dir)
    .map(f => [f, re.exec(f)])
    .filter(([, m]) => m)
    .sort((a, b) => +a[1][1] - +b[1][1])
    .map(([f]) => `${dir}/${f}`);
}

// The artboard group of one export, and the clip it hangs from. Groups nest, so
// the closing tag has to be matched by depth rather than by the next `</g>`.
function artboard(svg, file) {
  const open = /<g\s+clip-path="url\(#([^)"]+)\)"\s*>/.exec(svg);
  if (!open) throw new Error(`${file}: no artboard group`);
  const from = open.index + open[0].length;
  let depth = 1, end = svg.length;
  const TAG = /<(\/?)g\b[^>]*?(\/?)>/g;
  TAG.lastIndex = from;
  for (let m; (m = TAG.exec(svg));) {
    if (m[2] === '/') continue;                  // self-closing, no depth
    depth += m[1] ? -1 : 1;
    if (depth === 0) { end = m.index; break; }
  }
  return { clip: open[1], body: svg.slice(from, end) };
}

// The opaque background rect an export carries. The first layer's is the ground
// every other layer sits on; the rest are transparent and are dropped.
const groundOf = svg => {
  const m = /<rect\s+fill="(#[0-9a-fA-F]{6})"(?![^>]*fill-opacity="0")[^>]*\/>/.exec(svg);
  return m ? m[1].toLowerCase() : null;
};

export function stackLayers(files) {
  if (!files.length) throw new Error('no layers to stack');
  const parts = [];
  let ground = null;
  for (const f of files) {
    const svg = readFileSync(f, 'utf8');
    const { body } = artboard(svg, f);
    ground = ground || groundOf(svg);
    // Each layer's own group, LABELLED, so a layer is still a thing you can find in
    // the merged text — inside the one clip rather than inside three. The label is
    // what lets split-map.mjs lift the top layer out for the front sheet without
    // re-reading the files and re-deriving where each one landed.
    parts.push(`<g data-layer="${parts.length + 1}">${body}</g>`);
  }
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">',
    '<defs><clipPath id="artboard-stacked">' +
      '<rect x="0" y="0" width="1920" height="1080"/></clipPath></defs>',
    '<g>',
    `<rect fill="${ground || '#5c7f49'}" x="0" y="0" width="1920" height="1080"/>`,
    '<g clip-path="url(#artboard-stacked)">',
    ...parts,
    '</g>',
    '</g></svg>'
  ].join('\n');
}

// The drawing a level names, however it was drawn. This is what every tool that
// reads a board should call.
export function readArtwork(src) {
  if (src.endsWith('.svg')) return readFileSync(src, 'utf8');
  const files = layerFiles(src);
  if (!files.length) {
    throw new Error(`${src} is neither an .svg nor a stem with ${src}_Layer_N.svg beside it`);
  }
  return stackLayers(files);
}
