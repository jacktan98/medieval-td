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
