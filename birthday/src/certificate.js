// THE CERTIFICATE, which is the end of the story.
//
// Three maps passed at two stars each, and the family get a printable A4 page
// with their name on it. It is the one thing in this project that leaves the
// screen, so it is the one thing that has to be right at print size rather than
// at phone size.
//
// --- one drawing, two sizes ---------------------------------------------------------
//
// The page is drawn ONCE onto an offscreen canvas at print resolution, and the
// screen shows that canvas scaled down. Not two drawing routines — the preview is
// literally the file. A preview that is drawn separately is a preview that
// eventually stops matching what comes out of the printer, and the whole point of
// showing it is to promise that it will not.
//
// --- and the PDF ---------------------------------------------------------------------
//
// A PDF is assembled here by hand, because this project has no build step and no
// libraries and is not getting either for one page of A4. That sounds worse than
// it is: a PDF holding a single full-page image is five objects and a cross
// reference table, and the image can go in as JPEG bytes exactly as the canvas
// produces them — `DCTDecode` is a filter every reader has had since 1993.
//
// The cost is that the text is a picture rather than selectable type. For a
// birthday certificate that is the right trade: it prints identically everywhere,
// it cannot go wrong on a machine without the font, and nobody is going to
// copy-paste out of it.

import { art } from './assets.js';
import { family, mapNames } from './rules.js';
import { stars } from './progress.js';

// A4 at 150 dots per inch. 300 would be sharper and four times the file; 150 is
// what a home printer actually puts on paper and keeps the PDF around a third of
// a megabyte.
const DPI = 150;
const PAGE_W = Math.round(8.27 * DPI);    // 1240
const PAGE_H = Math.round(11.69 * DPI);   // 1754

// A4 in POINTS, which is the unit a PDF page box is measured in. 72 to the inch.
const PT_W = 595.28;
const PT_H = 841.89;

const INK = '#3A3026';
const MUTED = 'rgba(58,48,38,0.62)';
const SHEET = '#FBF4E2';
const GOLD = '#C9982F';
const EDGE = '#8A7A56';

let sheet = null;      // the offscreen canvas
let drawnFor = null;   // the name it was last drawn with, so it is not redrawn per frame

function surface() {
  if (!sheet) {
    sheet = document.createElement('canvas');
    sheet.width = PAGE_W;
    sheet.height = PAGE_H;
  }
  return sheet;
}

// The page itself. Everything is in print pixels; nothing here knows about the
// game's 960x540 board.
export function render(name) {
  const c = surface();
  if (drawnFor === name) return c;
  drawnFor = name;

  const ctx = c.getContext('2d');
  ctx.save();
  ctx.fillStyle = SHEET;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Two rules inside the trim, the outer heavy and the inner fine. It is the
  // oldest trick on a certificate and it is what makes a page of text read as a
  // document rather than as a printout.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.strokeRect(58, 58, PAGE_W - 116, PAGE_H - 116);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 80, PAGE_W - 160, PAGE_H - 160);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(DPI * 0.44)}px Georgia, "Times New Roman", serif`;
  ctx.fillText('CERTIFICATE', PAGE_W / 2, 250);
  ctx.font = `600 ${Math.round(DPI * 0.19)}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = MUTED;
  ctx.fillText('O F   H O U S E   D E F E N C E', PAGE_W / 2, 330);

  rule(ctx, PAGE_W / 2, 380, 420);

  ctx.fillStyle = MUTED;
  ctx.font = `500 ${Math.round(DPI * 0.15)}px Georgia, "Times New Roman", serif`;
  ctx.fillText('This is to certify that', PAGE_W / 2, 460);

  // THE NAME, and the line under it is drawn whether or not there is one — an
  // empty rule is an invitation to type, and a certificate with a blank where the
  // name goes is a certificate somebody can still fill in with a pen.
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(DPI * 0.34)}px Georgia, "Times New Roman", serif`;
  ctx.fillText(name || '', PAGE_W / 2, 552);
  ctx.strokeStyle = 'rgba(58,48,38,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAGE_W / 2 - 340, 608);
  ctx.lineTo(PAGE_W / 2 + 340, 608);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = `500 ${Math.round(DPI * 0.15)}px Georgia, "Times New Roman", serif`;
  wrap(ctx, 'defended the house against every thug that came down the road, ' +
            'in the company of Papa, Mommy, Ella and Rei',
       PAGE_W / 2, 686, PAGE_W - 340, 48);

  // The three maps and what was earned on each. This is the evidence, so it is
  // set out like evidence rather than like a score.
  const top = 862;
  mapNames.forEach((n, i) => {
    const y = top + i * 108;
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(DPI * 0.17)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(n, 300, y);
    dots(ctx, 300 + ctx.measureText(n).width + 24, y + 6, 560);
    starRow(ctx, 700, y, 22, stars(i));
    ctx.textAlign = 'center';
  });

  // Clear of BOTH neighbours: the last star row finishes about 22px under its
  // baseline, and Papa's swords reach 158px above the feet of the row below.
  rule(ctx, PAGE_W / 2, top + 3 * 108 + 4, 420);

  // The four of them along the bottom, at one scale, exactly as the family panel
  // draws them — the tallest sets the factor and Rei comes out a baby.
  const row = PAGE_H - 354;
  const poses = family.map(m => m.art.idle);
  const k = Math.min(200 / widest(poses), 190 / tallest(poses));
  family.forEach((m, i) => {
    const cx = PAGE_W / 2 + (i - 1.5) * 210;
    standing(ctx, m.art.idle, cx, row, k);
    ctx.fillStyle = MUTED;
    ctx.font = `600 ${Math.round(DPI * 0.11)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(m.name, cx, row + 42);
  });

  // The seal sits UNDER the four of them rather than beside them. It was between
  // the portraits and the date to begin with and its teeth ran into Ella's and
  // Rei's name labels — a rosette is 156px across and there is not room for it in
  // a row that already holds a family.
  seal(ctx, PAGE_W / 2, PAGE_H - 224, 66);

  ctx.fillStyle = MUTED;
  ctx.font = `500 ${Math.round(DPI * 0.11)}px Georgia, "Times New Roman", serif`;
  ctx.fillText(today(), PAGE_W / 2, PAGE_H - 118);

  ctx.restore();
  return c;
}

const widest = poses => Math.max(...poses.map(p => p.trim[2]));
const tallest = poses => Math.max(...poses.map(p => p.trim[3]));

function standing(ctx, p, cx, groundY, k) {
  const img = art[p.sprite];
  if (!img) return;
  const [sx, sy, sw, sh] = p.trim;
  ctx.drawImage(img, sx, sy, sw, sh, cx - (sw * k) / 2, groundY - sh * k, sw * k, sh * k);
}

function rule(ctx, cx, y, w) {
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, y);
  ctx.lineTo(cx + w / 2, y);
  ctx.stroke();
  // A diamond in the middle of the rule, which is the other oldest trick.
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(cx, y - 9);
  ctx.lineTo(cx + 9, y);
  ctx.lineTo(cx, y + 9);
  ctx.lineTo(cx - 9, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// The leader dots between a map's name and its stars.
function dots(ctx, from, y, to) {
  ctx.save();
  ctx.fillStyle = 'rgba(58,48,38,0.3)';
  for (let x = from; x < to; x += 14) {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function starRow(ctx, x, cy, r, got) {
  for (let i = 0; i < 3; i++) {
    const cx = x + i * (r * 2.6);
    ctx.beginPath();
    for (let n = 0; n < 10; n++) {
      const a = -Math.PI / 2 + (n * Math.PI) / 5;
      const k = n % 2 ? r * 0.44 : r;
      const px = cx + Math.cos(a) * k;
      const py = cy + Math.sin(a) * k;
      if (n) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    if (i < got) { ctx.fillStyle = GOLD; ctx.fill(); }
    ctx.strokeStyle = i < got ? GOLD : 'rgba(58,48,38,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// A drawn seal, because a certificate wants one and because a rosette is eight
// lines of trigonometry.
function seal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const k = i % 2 ? r : r * 0.9;
    const x = Math.cos(a) * k, y = Math.sin(a) * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = SHEET;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Sized against the WHITE DISC, not against the rosette: the inner circle is
  // 0.72 of the radius and "HOUSE" has to fit across it. At 0.42 it did not, and
  // the word ran out over the gold teeth.
  ctx.font = `700 ${Math.round(r * 0.3)}px Georgia, "Times New Roman", serif`;
  ctx.fillText('THE', 0, -r * 0.22);
  ctx.fillText('HOUSE', 0, r * 0.2);
  ctx.restore();
}

// Wrap a sentence into `w`, centred, returning nothing — the certificate's layout
// is fixed, so nobody needs to know where it finished.
function wrap(ctx, text, cx, y, w, lead) {
  let line = '';
  const lines = [];
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > w) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lead));
}

const today = () => new Date().toLocaleDateString(undefined,
  { year: 'numeric', month: 'long', day: 'numeric' });

// --- the file ---------------------------------------------------------------------

// The canvas as JPEG bytes. `toBlob` rather than `toDataURL` so the bytes never
// become a base64 string — a 300KB image is 400KB of text, and it would only have
// to be decoded again.
const jpeg = c => new Promise(resolve => c.toBlob(b => resolve(b), 'image/jpeg', 0.92));

// Latin-1 bytes of an ASCII string. A PDF's structure is bytes, not text, and
// the offsets in the cross reference table are byte offsets — measuring them in
// UTF-16 characters is how a PDF comes out one byte wrong and will not open.
const bytes = s => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

export async function pdf(name) {
  const blob = await jpeg(render(name));
  const img = new Uint8Array(await blob.arrayBuffer());

  // The content stream: put the image over the whole page. `cm` scales the unit
  // square to the page box, which is why the image needs no size of its own here.
  const content = `q\n${PT_W} 0 0 ${PT_H} 0 0 cm\n/Im0 Do\nQ\n`;

  const parts = [];
  const offsets = [0];
  let at = 0;
  const push = part => {
    const b = typeof part === 'string' ? bytes(part) : part;
    parts.push(b);
    at += b.length;
  };
  const obj = (n, body, stream) => {
    offsets[n] = at;
    push(`${n} 0 obj\n${body}\n`);
    if (stream) { push('stream\n'); push(stream); push('\nendstream\n'); }
    push('endobj\n');
  };

  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_W} ${PT_H}] ` +
         `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  obj(4, `<< /Length ${content.length} >>`, content);
  obj(5, `<< /Type /XObject /Subtype /Image /Width ${PAGE_W} /Height ${PAGE_H} ` +
         `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
         `/Length ${img.length} >>`, img);

  const xref = at;
  let table = `xref\n0 6\n0000000000 65535 f \n`;
  for (let n = 1; n <= 5; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return new Blob([out], { type: 'application/pdf' });
}

// Hand it to the browser. A blob URL and a link that is clicked and thrown away —
// there is nowhere to send it and nothing to upload, which is as it should be for
// a page with a child's name on it.
export async function save(name) {
  const blob = await pdf(name);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(name || 'certificate').replace(/[^\w -]+/g, '') || 'certificate'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next turn rather than immediately: some browsers have not
  // finished with the URL when click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
