// Run: node tools/draw.mjs     writes art/*.svg. The site loads the output and needs no build step.
// Seeded, so the same drawing comes out every run. Lines wobble slightly, like a carved block.
import { writeFileSync } from 'node:fs';

const INK = '#14110F', DARK = '#3B2A1E', WOOD = '#6E4E35', LIGHT = '#B59A7A', BEIGE = '#D9CBB5', EGG = '#F1EADB', OFF = '#FAF8F2', GREY = '#8E8A83', PALE = '#BDB9B0', SLATE = '#55524D';

let seed = 7;
const rnd = (a = 1, b) => { seed = (seed * 1664525 + 1013904223) >>> 0; const r = seed / 2 ** 32; return b === undefined ? r * a : a + r * (b - a); };
const f = n => +n.toFixed(1);
const attrs = o => Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${v}"`).join(' ');

// A straight edge broken into short jittered pieces, which is what stops it looking machine drawn.
function edge(x1, y1, x2, y2, j) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 70)), out = [];
  for (let i = 1; i <= n; i++) {
    const end = i === n, t = i / n;
    out.push(`L${f(x1 + (x2 - x1) * t + (end ? 0 : rnd(-j, j)))} ${f(y1 + (y2 - y1) * t + (end ? 0 : rnd(-j, j)))}`);
  }
  return out.join('');
}
function poly(pts, { j = 1.1, fill = 'none', stroke = INK, sw = 2.6 } = {}) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; d += edge(a[0], a[1], b[0], b[1], j); }
  return `<path d="${d}Z" ${attrs({ fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' })}/>`;
}
const box = (x, y, w, h, o) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
const line = (x1, y1, x2, y2, { j = .8, stroke = INK, sw = 2.2 } = {}) => `<path d="M${f(x1)} ${f(y1)}${edge(x1, y1, x2, y2, j)}" ${attrs({ fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round' })}/>`;
const dot = (x, y, r, fill, o = {}) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${attrs({ fill, ...o })}/>`;

// Wood grain: long wavering lines along the board, with the occasional knot.
function grain(x, y, w, h, { along = 'y', color = INK, op = .28, n, knots = true } = {}) {
  const across = along === 'y' ? w : h, len = along === 'y' ? h : w;
  n ??= Math.max(2, Math.round(across / 9));
  let d = '';
  const kx = rnd(.2, .8) * across, ky = rnd(.15, .85) * len, hasKnot = knots && len > 180 && rnd() < .55;
  for (let i = 0; i < n; i++) {
    const base = (i + .5) / n * across + rnd(-1.5, 1.5), ph = rnd(6.28), amp = rnd(.6, 2);
    let s = '';
    const skipA = rnd(0, .03) * len, skipB = len - rnd(0, .03) * len;
    for (let l = skipA; l <= skipB; l += 22) {
      const dk = hasKnot ? Math.hypot(base - kx, (l - ky) * .35) : 999;
      const bulge = hasKnot && dk < 30 ? Math.sign(base - kx || 1) * (30 - dk) * .5 : 0;
      const off = Math.max(0, Math.min(across, base + Math.sin(l / 70 + ph) * amp + bulge));
      const px = along === 'y' ? x + off : x + l, py = along === 'y' ? y + l : y + off;
      s += `${s ? 'L' : 'M'}${f(px)} ${f(py)}`;
    }
    d += s;
  }
  let out = `<path d="${d}" ${attrs({ fill: 'none', stroke: color, strokeOpacity: op, strokeWidth: 1.1 })}/>`;
  if (hasKnot) {
    const px = along === 'y' ? x + kx : x + ky, py = along === 'y' ? y + ky : y + kx;
    out += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${along === 'y' ? 3.5 : 7}" ry="${along === 'y' ? 7 : 3.5}" ${attrs({ fill: color, fillOpacity: op * 1.6 })}/>`;
  }
  return out;
}
const board = (x, y, w, h, fill, o = {}) => box(x, y, w, h, { fill, ...o }) + grain(x + 2, y + 2, w - 4, h - 4, { color: fill === DARK ? '#000' : INK, ...o.grain });
const stud = (x, y, r) => dot(x + 1, y + 1.4, r + 1.2, INK) + dot(x, y, r, SLATE, { stroke: INK, strokeWidth: 1.4 }) + dot(x - r * .3, y - r * .32, r * .32, PALE);
const svg = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}${body}</svg>`;

// A round eave tile with its carved swirl.
function endTile(x, y, r) {
  let s = dot(x, y, r, GREY, { stroke: INK, strokeWidth: 2.2 }) + dot(x, y, r * .68, 'none', { stroke: INK, strokeWidth: 1.2 });
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + .5, cx = x + Math.cos(a) * r * .28, cy = y + Math.sin(a) * r * .28;
    s += `<path d="M${f(cx)} ${f(cy)}q${f(Math.cos(a + 1.3) * r * .42)} ${f(Math.sin(a + 1.3) * r * .42)} ${f(Math.cos(a + 2.3) * r * .3)} ${f(Math.sin(a + 2.3) * r * .3)}" ${attrs({ fill: 'none', stroke: INK, strokeWidth: 1.8, strokeLinecap: 'round' })}/>`;
  }
  return s;
}

// A hipped tile roof. x0/x1 are the eaves, rx0/rx1 the ridge, and the eave line lifts at its ends.
function roof({ x0, x1, rx0, rx1, ry, ey, lift = 22, gap = 36, tileR = 12, ridge = 26, ends = true, sweep = true }) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const eave = x => ey - (sweep ? lift * Math.abs((x - mid) / half) ** 3.2 : 0);
  let s = '';
  // The roof face is one dark shape; every tile goes on top of it.
  const face = [[rx0, ry]];
  face.push([rx1, ry]);
  for (let i = 0; i <= 24; i++) { const x = x1 - (x1 - x0) * i / 24; face.push([x, eave(x)]); }
  s += poly(face, { fill: SLATE, sw: 3.2, j: .4 });
  const cols = Math.round((x1 - x0) / gap);
  for (let i = 0; i <= cols; i++) {
    const t = i / cols, bx = x0 + (x1 - x0) * t, tx = rx0 + (rx1 - rx0) * t, by = eave(bx), hw = gap * .27;
    if (i < cols) s += line(bx + gap / 2, by, tx + (rx1 - rx0) / cols / 2, ry, { stroke: INK, sw: 1.4, j: .5 });
    s += poly([[tx - hw * .8, ry], [tx + hw * .8, ry], [bx + hw, by], [bx - hw, by]], { fill: GREY, sw: 1.8, j: .4 });
    const rows = Math.round((by - ry) / 19);
    for (let r = 1; r < rows; r++) {
      const q = r / rows, cx = tx + (bx - tx) * q, cy = ry + (by - ry) * q, w = hw * (.8 + .2 * q);
      s += `<path d="M${f(cx - w)} ${f(cy + 2)}Q${f(cx)} ${f(cy - 4)} ${f(cx + w)} ${f(cy + 2)}" ${attrs({ fill: 'none', stroke: INK, strokeWidth: 1.3 })}/>`;
    }
    s += `<path d="M${f(tx - hw * .3)} ${f(ry + 6)}L${f(bx - hw * .35)} ${f(by - 4)}" ${attrs({ stroke: PALE, strokeWidth: 1.4, strokeOpacity: .75 })}/>`;
  }
  for (let i = 0; i < cols; i++) {
    const x = x0 + (x1 - x0) * (i + .5) / cols, y = eave(x);
    s += `<path d="M${f(x - gap * .3)} ${f(y + 1)}Q${f(x)} ${f(y + 13)} ${f(x + gap * .3)} ${f(y + 1)}Z" ${attrs({ fill: GREY, stroke: INK, strokeWidth: 1.8 })}/>`;
  }
  for (let i = 0; i <= cols; i++) { const x = x0 + (x1 - x0) * i / cols; s += endTile(x, eave(x) + 2, tileR); }
  if (ridge) {
    const by = ry + 4, h = ridge;
    for (let i = 0; i < 4; i++) { const y = by - h + i * h / 4; s += box(rx0 + 8, y, rx1 - rx0 - 16, h / 4, { fill: i % 2 ? SLATE : GREY, sw: 1.7, j: .4 }); }
    s += box(rx0 + 2, by - h - 9, rx1 - rx0 - 4, 11, { fill: GREY, sw: 2.2, j: .4 });
    if (ends) s += ridgeEnd(rx0 + 2, by - h - 9, -1, h) + ridgeEnd(rx1 - 2, by - h - 9, 1, h);
  }
  return s;
}

// The carved end tile of a ridge: a layered flame shape with a curled horn.
function ridgeEnd(x, y, dir, h) {
  const sz = h * 2.3, X = n => x + dir * n * sz, Y = n => y + n * sz;
  let s = `<path d="M${f(X(-.5))} ${f(Y(1.05))}L${f(X(.42))} ${f(Y(1.05))}C${f(X(.62))} ${f(Y(.7))} ${f(X(.55))} ${f(Y(.3))} ${f(X(.82))} ${f(Y(-.28))}C${f(X(.5))} ${f(Y(-.2))} ${f(X(.22))} ${f(Y(-.24))} ${f(X(-.5))} ${f(Y(.02))}Z" ${attrs({ fill: GREY, stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' })}/>`;
  s += `<path d="M${f(X(-.38))} ${f(Y(.92))}L${f(X(.28))} ${f(Y(.92))}C${f(X(.42))} ${f(Y(.62))} ${f(X(.36))} ${f(Y(.34))} ${f(X(.5))} ${f(Y(-.04))}C${f(X(.2))} ${f(Y(0))} ${f(X(-.1))} ${f(Y(.04))} ${f(X(-.38))} ${f(Y(.18))}Z" ${attrs({ fill: SLATE, stroke: INK, strokeWidth: 1.8 })}/>`;
  s += dot(X(-.02), Y(.54), sz * .15, GREY, { stroke: INK, strokeWidth: 2 }) + dot(X(-.02), Y(.54), sz * .06, INK);
  return s;
}

// Rafter ends in two tiers, each capped with a little metal plate.
function rafters(x0, x1, y, h, gap = 42) {
  let s = box(x0, y, x1 - x0, h, { fill: INK, sw: 2 });
  for (let tier = 0; tier < 2; tier++) {
    const th = h * (tier ? .46 : .54), ty = y + (tier ? 0 : h * .46), w = tier ? 13 : 15;
    for (let x = x0 + gap / 2 + (tier ? gap / 2 : 0); x < x1 - 8; x += gap) {
      s += box(x - w / 2, ty, w, th - 2, { fill: WOOD, sw: 1.6, j: .3 }) + box(x - w / 2 + 1, ty + th - 10, w - 2, 7, { fill: PALE, sw: 1.2, j: .2 });
      s += dot(x, ty + th - 6.5, 1.4, INK);
    }
  }
  return s;
}

// One bracket set: a big bearing block, a curved arm, and three small blocks holding the beam.
function bracket(x, y, w = 96, h = 60) {
  const b = (cx, cy, bw, bh, fill = WOOD) => {
    const taper = bw * .14;
    return poly([[cx - bw / 2, cy], [cx + bw / 2, cy], [cx + bw / 2 - taper, cy + bh], [cx - bw / 2 + taper, cy + bh]], { fill, sw: 2, j: .3 }) + grain(cx - bw / 2 + 4, cy + 2, bw - 8, bh - 4, { along: 'x', n: 2, knots: false, op: .3 });
  };
  const armY = y + h * .32, armH = h * .28;
  let s = b(x - w * .36, y, w * .2, h * .32) + b(x, y, w * .2, h * .32) + b(x + w * .36, y, w * .2, h * .32);
  s += `<path d="M${f(x - w * .5)} ${f(armY)}H${f(x + w * .5)}Q${f(x + w * .46)} ${f(armY + armH * .9)} ${f(x + w * .22)} ${f(armY + armH)}H${f(x - w * .22)}Q${f(x - w * .46)} ${f(armY + armH * .9)} ${f(x - w * .5)} ${f(armY)}Z" ${attrs({ fill: LIGHT, stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' })}/>`;
  s += grain(x - w * .36, armY + 3, w * .72, armH - 8, { along: 'x', n: 2, knots: false });
  s += b(x, armY + armH, w * .34, h * .4, DARK);
  return s;
}

// A wing of wall: tiled cap, plaster, and the grey diamond-tile dado.
function wing(x0, x1, leftward) {
  const y = 610, plasterB = 790, dadoB = 925;
  let s = box(x0, y, x1 - x0, plasterB - y, { fill: EGG, sw: 2.6 });
  // Weather stains in the plaster, flat like a print.
  for (let i = 0; i < 16; i++) {
    const cx = rnd(x0 + 30, x1 - 30), cy = rnd(y + 32, plasterB - 18), w = rnd(26, 150), h = rnd(2, 8);
    s += `<path d="M${f(cx - w)} ${f(cy)}Q${f(cx)} ${f(cy - h)} ${f(cx + w)} ${f(cy)}Q${f(cx)} ${f(cy + h * .4)} ${f(cx - w)} ${f(cy)}Z" ${attrs({ fill: BEIGE, fillOpacity: .75 })}/>`;
  }
  s += box(x0, plasterB, x1 - x0, dadoB - plasterB, { fill: SLATE, sw: 2.6 });
  const d = 34;
  let grid = '';
  for (let x = x0 - (dadoB - plasterB); x < x1 + d; x += d) {
    grid += `M${f(Math.max(x, x0))} ${f(plasterB + Math.max(0, x0 - x))}L${f(Math.min(x + (dadoB - plasterB), x1))} ${f(plasterB + Math.min(dadoB - plasterB, x1 - x))}`;
    grid += `M${f(Math.min(x + (dadoB - plasterB), x1))} ${f(plasterB + Math.max(0, x + (dadoB - plasterB) - x1))}L${f(Math.max(x, x0))} ${f(plasterB + Math.min(dadoB - plasterB, x + (dadoB - plasterB) - x0))}`;
  }
  s += `<path d="${grid}" ${attrs({ fill: 'none', stroke: EGG, strokeWidth: 4.5, strokeLinecap: 'round' })}/>`;
  s += board(x0, plasterB - 11, x1 - x0, 13, DARK, { sw: 2, grain: { along: 'x', n: 2, knots: false } });
  s += box(x0, dadoB, x1 - x0, 27, { fill: GREY, sw: 2.4 });
  for (let x = x0 + rnd(30, 70); x < x1; x += rnd(70, 130)) s += line(x, dadoB + 2, x + rnd(-3, 3), dadoB + 25, { sw: 1.5 });
  // Wall posts break up the long run.
  for (let x = leftward ? x1 - 300 : x0 + 300; x > x0 + 20 && x < x1 - 20; x += leftward ? -420 : 420) s += board(x - 15, y, 30, plasterB - y, WOOD, { sw: 2.2 });
  s += rafters(x0, x1, y - 18, 24, 34);
  s += roof({ x0: x0 - (leftward ? 40 : 0), x1: x1 + (leftward ? 0 : 40), rx0: x0 - (leftward ? 40 : 0), rx1: x1 + (leftward ? 0 : 40), ry: 512, ey: 590, gap: 30, tileR: 9, ridge: 16, ends: false, sweep: false });
  return s;
}

// A pine above the wall: a leaning trunk and flat pads of needles. d flips and scales it.
function pine(x, y, d) {
  const X = n => x + n * d, m = Math.abs(d);
  let s = `<path d="M${f(X(-26))} ${y}C${f(X(-14))} ${f(y - 120 * m)} ${f(X(-74))} ${f(y - 180 * m)} ${f(X(-34))} ${f(y - 330 * m)}L${f(X(-12))} ${f(y - 322 * m)}C${f(X(-44))} ${f(y - 190 * m)} ${f(X(16))} ${f(y - 110 * m)} ${f(X(26))} ${y}Z" fill="${DARK}" stroke="${INK}" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) { const yy = y - rnd(20, 300) * m, xx = X(rnd(-40, 14)); s += `<path d="M${f(xx)} ${f(yy)}q${f(rnd(-8, 8))} ${f(rnd(4, 12))} ${f(rnd(-16, 16))} ${f(rnd(12, 24))}" fill="none" stroke="${INK}" stroke-opacity=".7" stroke-width="1.5"/>`; }
  for (const [cx, cy, w] of [[-34, -336, 118], [66, -280, 104], [-128, -252, 112], [40, -196, 92], [-96, -158, 78]]) {
    const px = X(cx), py = y + cy * m, W = w * m, H = W * .34;
    s += `<path d="M${f(px - W)} ${f(py + H * .5)}Q${f(px - W * .6)} ${f(py - H)} ${f(px)} ${f(py - H)}Q${f(px + W * .7)} ${f(py - H)} ${f(px + W)} ${f(py + H * .5)}Q${f(px)} ${f(py + H * .95)} ${f(px - W)} ${f(py + H * .5)}Z" fill="${SLATE}" stroke="${INK}" stroke-width="2.6"/>`;
    let needles = '';
    for (let i = 0; i < W / 3.2; i++) {
      const a = px + rnd(-W * .92, W * .92), edgeY = py - H * (1 - ((a - px) / W) ** 2) * .9, l = rnd(10, H * 1.1);
      needles += `M${f(a)} ${f(edgeY + rnd(0, 5))}l${f(rnd(-4, 4))} ${f(l)}`;
    }
    s += `<path d="${needles}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`;
  }
  return s;
}

function post(x, w) {
  let s = board(x, 300, w, 650, DARK, { sw: 3 });
  s += line(x + w * .1, 305, x + w * .1, 940, { stroke: LIGHT, sw: 1.4, j: .6 });
  // Metal wrap at the foot and under the lintel.
  for (const y of [860, 372]) {
    s += box(x - 3, y, w + 6, 42, { fill: SLATE, sw: 2.4, j: .4 });
    s += line(x, y + 8, x + w, y + 8, { stroke: PALE, sw: 1.2, j: .3 }) + line(x, y + 34, x + w, y + 34, { stroke: PALE, sw: 1.2, j: .3 });
    for (const q of [.2, .5, .8]) s += stud(x + w * q, y + 21, 4.2);
  }
  return s;
}

function gate() {
  const C = 1600, HL = 1290, HR = 1910;
  let s = '';
  // Everything behind the gate is painted solid, so the room shows only through the doorway.
  const hole = `<clipPath id="wall"><path clip-rule="evenodd" d="M-10 -10H3210V960H-10ZM${HL} 340H${HR}V960H${HL}Z"/></clipPath>`;
  const sky = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BDB9B0"/><stop offset=".55" stop-color="${EGG}"/></linearGradient>`;
  let back = `<rect x="-10" y="-10" width="3220" height="970" fill="url(#sky)"/>`;
  for (const [y0, fill, amp] of [[420, '#D3CFC6', 70], [478, '#B4B0A7', 46]]) {
    const ridge = [[-10, 960]];
    for (let x = -10; x <= 3220; x += 64) ridge.push([x, y0 + Math.sin(x / 310 + y0) * amp + Math.sin(x / 95 + y0 * 2) * amp * .28 + rnd(-6, 6)]);
    ridge.push([3210, 960]);
    back += poly(ridge, { fill, stroke: 'none', sw: 0, j: .4 });
  }
  back += pine(860, 620, 1) + pine(2350, 620, -1.08) + pine(420, 610, -.9) + pine(2830, 610, .95);
  s += `<defs>${hole}${sky}</defs><g clip-path="url(#wall)">${back}</g>`;
  // Raked gravel runs across the whole plane and carries on below it.
  s += box(-4, 948, 3208, 756, { fill: BEIGE, sw: 0, stroke: 'none' });
  for (let y = 972; y < 1700; y += 15 + (y - 950) * .022) {
    let d = '', ph = rnd(6.28);
    for (let x = -10; x <= 3210; x += 40) d += `${d ? 'L' : 'M'}${x} ${f(y + Math.sin(x / 150 + ph) * 3.5)}`;
    s += `<path d="${d}" ${attrs({ fill: 'none', stroke: DARK, strokeOpacity: .28, strokeWidth: 1.2 + (y - 950) * .002 })}/>`;
  }
  s += wing(-10, 1225, true) + wing(1975, 3210, false);
  // Stepping stones to the threshold, larger as they come towards the viewer.
  const stones = [[1560, 1010, 92, 21], [1650, 1046, 104, 25], [1548, 1090, 122, 30], [1668, 1142, 140, 36], [1530, 1208, 164, 43], [1690, 1286, 192, 52], [1510, 1390, 226, 64]];
  for (const [x, y, w, h] of stones) {
    const pts = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, q = rnd(.84, 1.08); pts.push([x + Math.cos(a) * w * q, y + Math.sin(a) * h * q]); }
    s += `<ellipse cx="${x + 6}" cy="${y + h * .5}" rx="${w * 1.02}" ry="${h}" fill="${INK}" fill-opacity=".28"/>` + poly(pts, { fill: PALE, sw: 3, j: .8 });
    for (let i = 0; i < 4; i++) { const ox = x + rnd(-w * .6, w * .6), oy = y + rnd(-h * .5, h * .5); s += line(ox, oy, ox + rnd(-w * .22, w * .22), oy + rnd(-2, 2), { stroke: SLATE, sw: 1.3, j: .6 }); }
  }
  // Threshold stone.
  s += box(1180, 950, 840, 34, { fill: GREY, sw: 3 });
  for (let x = 1230; x < 2000; x += rnd(90, 170)) s += line(x, 954, x + rnd(-5, 5), 980, { stroke: SLATE, sw: 1.5 });
  // Stone bases.
  s += box(1190, 930, 120, 30, { fill: PALE, sw: 3 }) + box(1890, 930, 120, 30, { fill: PALE, sw: 3 });
  s += post(1210, 80) + post(1910, 80);
  // Slim door jambs, with a strip of ink behind so the doorway has a hard edge.
  s += box(1284, 340, 8, 610, { fill: INK, sw: 0, stroke: 'none' }) + box(1908, 340, 8, 610, { fill: INK, sw: 0, stroke: 'none' });
  // Lintels and the fittings on their ends.
  s += board(1120, 296, 960, 46, DARK, { sw: 3, grain: { along: 'x', n: 4, knots: false } });
  for (const [x, w] of [[1120, 62], [2018, 62]]) {
    s += box(x, 292, w, 54, { fill: SLATE, sw: 2.6, j: .4 });
    s += line(x + 6, 299, x + w - 6, 299, { stroke: PALE, sw: 1.2, j: .3 }) + line(x + 6, 339, x + w - 6, 339, { stroke: PALE, sw: 1.2, j: .3 });
    for (const q of [.22, .5, .78]) s += stud(x + w * q, 319, 4.6);
  }
  s += board(1150, 268, 900, 26, WOOD, { sw: 2.4, grain: { along: 'x', n: 3, knots: false } });
  s += rafters(960, 2240, 205, 62, 42);
  for (const x of [1250, 1410, 1790, 1950]) s += bracket(x, 208, 100, 60);
  s += roof({ x0: 880, x1: 2320, rx0: 1090, rx1: 2110, ry: 84, ey: 206, lift: 30, gap: 38, tileR: 13, ridge: 30 });
  // Back plate for the name plaque; the letters themselves are real text in the page.
  s += box(C - 158, 226, 316, 110, { fill: INK, sw: 0, stroke: 'none' }) + board(C - 150, 234, 300, 94, WOOD, { sw: 2.6, grain: { along: 'x', n: 7, knots: false } });
  for (const [x, y] of [[-140, 244], [140, 244], [-140, 318], [140, 318]]) s += stud(C + x, y, 4.6);
  return svg(3200, 1700, s);
}

function door(mirror) {
  const W = 310, H = 610, out = [];
  // Planks.
  const planks = 5;
  for (let i = 0; i < planks; i++) out.push(board(i * W / planks, 0, W / planks, H, WOOD, { sw: 2.2, j: .5 }));
  // Lattice panel at the top: thin black bars over paper.
  const lx = 22, ly = 22, lw = W - 44, lh = 142;
  out.push(box(lx - 8, ly - 8, lw + 16, lh + 16, { fill: DARK, sw: 2.4 }) + box(lx, ly, lw, lh, { fill: EGG, sw: 2, j: .3 }));
  for (let i = 1; i < 6; i++) out.push(line(lx + lw * i / 6, ly, lx + lw * i / 6, ly + lh, { sw: 3, j: .2, stroke: DARK }));
  for (let i = 1; i < 4; i++) out.push(line(lx, ly + lh * i / 4, lx + lw, ly + lh * i / 4, { sw: 3, j: .2, stroke: DARK }));
  // Cross battens carrying rows of iron studs.
  for (const y of [178, 388, 552]) {
    out.push(board(-2, y, W + 4, 38, DARK, { sw: 2.6, j: .4, grain: { along: 'x', n: 3, knots: false } }));
    for (let i = 0; i < 7; i++) out.push(stud(22 + i * (W - 44) / 6, y + 19, 6.4));
  }
  // Studs running up the stile on the meeting edge.
  for (let y = 240; y < 380; y += 34) out.push(stud(W - 20, y, 4.8));
  for (let y = 448; y < 546; y += 34) out.push(stud(W - 20, y, 4.8));
  // Meeting edge and hinge straps.
  out.push(box(W - 7, 0, 7, H, { fill: INK, sw: 0, stroke: 'none' }));
  for (const y of [120, 470]) {
    out.push(poly([[0, y], [120, y + 8], [140, y + 16], [120, y + 24], [0, y + 32]], { fill: SLATE, sw: 2.2, j: .3 }));
    for (const x of [22, 60, 98]) out.push(stud(x, y + 16, 4));
  }
  // Rosette plate and ring pull.
  const px = W - 62, py = 330;
  for (let i = 0; i < 8; i++) { const a = i * .785; out.push(dot(px + Math.cos(a) * 19, py + Math.sin(a) * 19, 9, SLATE, { stroke: INK, strokeWidth: 1.8 })); }
  out.push(dot(px, py, 19, GREY, { stroke: INK, strokeWidth: 2.2 }) + dot(px, py, 7, INK));
  out.push(`<path d="M${px - 25} ${py + 2}A25 34 0 0 0 ${px + 25} ${py + 2}" ${attrs({ fill: 'none', stroke: INK, strokeWidth: 8.5, strokeLinecap: 'round' })}/>`);
  out.push(`<path d="M${px - 25} ${py + 2}A25 34 0 0 0 ${px + 25} ${py + 2}" ${attrs({ fill: 'none', stroke: PALE, strokeWidth: 2 })}/>`);
  const body = out.join('');
  return svg(W, H, mirror ? `<g transform="translate(${W} 0) scale(-1 1)">${body}</g>` : body);
}

function lantern() {
  let s = '';
  const C = 110;
  s += box(C - 66, 400, 132, 30, { fill: GREY, sw: 3 }) + box(C - 48, 374, 96, 28, { fill: PALE, sw: 2.8 });
  s += poly([[C - 21, 374], [C + 21, 374], [C + 17, 210], [C - 17, 210]], { fill: GREY, sw: 3 });
  for (let i = 0; i < 12; i++) { const y = rnd(220, 366), x = C + rnd(-13, 13); s += line(x, y, x + rnd(-6, 6), y + rnd(-1, 1), { stroke: SLATE, sw: 1.4, j: .4 }); }
  s += `<path d="M${C - 64} 212H${C + 64}L${C + 44} 190H${C - 44}Z" fill="${PALE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  s += box(C - 40, 118, 80, 72, { fill: SLATE, sw: 3 }) + box(C - 22, 130, 44, 50, { fill: EGG, sw: 2.6 });
  s += line(C, 130, C, 180, { sw: 2.4 });
  s += line(C - 22, 155, C + 22, 155, { sw: 2.4 });
  s += `<path d="M${C} 44C${C - 16} 72 ${C - 52} 92 ${C - 96} 106Q${C - 104} 124 ${C - 80} 122H${C + 80}Q${C + 104} 124 ${C + 96} 106C${C + 52} 92 ${C + 16} 72 ${C} 44Z" fill="${GREY}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
  for (const q of [.3, .62]) s += `<path d="M${C} 50Q${C - 18 * q * 3} ${82 + q * 6} ${C - 92 * q} 118M${C} 50Q${C + 18 * q * 3} ${82 + q * 6} ${C + 92 * q} 118" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
  s += dot(C, 40, 13, PALE, { stroke: INK, strokeWidth: 3 }) + `<path d="M${C} 16Q${C + 9} 26 ${C} 32Q${C - 9} 26 ${C} 16Z" fill="${PALE}" stroke="${INK}" stroke-width="2.4"/>`;
  return svg(220, 440, s);
}

// One shoji panel: paper, black-brown bars, and a wooden kick board at the foot.
function shoji(x, y, w, h) {
  let s = box(x, y, w, h, { fill: DARK, sw: 2.6, j: .4 });
  const px = x + 9, py = y + 9, pw = w - 18, ph = h - 18 - h * .16;
  s += box(px, py, pw, ph, { fill: EGG, sw: 1.8, j: .3 });
  for (let i = 1; i < 4; i++) s += line(px + pw * i / 4, py, px + pw * i / 4, py + ph, { stroke: DARK, sw: 3, j: .2 });
  const rows = Math.round(ph / 62);
  for (let i = 1; i < rows; i++) s += line(px, py + ph * i / rows, px + pw, py + ph * i / rows, { stroke: DARK, sw: 3, j: .2 });
  s += board(px, py + ph + 2, pw, h * .16 - 2, WOOD, { sw: 1.8, j: .3, grain: { n: 7, knots: false } });
  return s;
}

function backWall() {
  const W = 1600, H = 800, A = 620;
  let s = box(0, 0, W, H, { fill: EGG, sw: 0, stroke: 'none' });
  // Alcove: a recessed plaster bay, a raised floor board, and a blank hanging scroll.
  s += box(40, 130, A - 60, H - 130, { fill: BEIGE, sw: 3 });
  for (let i = 0; i < 10; i++) { const x = rnd(70, A - 70), y = rnd(170, 620), w = rnd(30, 110); s += `<path d="M${f(x - w)} ${f(y)}Q${f(x)} ${f(y - 4)} ${f(x + w)} ${f(y)}" fill="none" stroke="${LIGHT}" stroke-opacity=".6" stroke-width="1.6"/>`; }
  s += poly([[40, 130], [A - 20, 130], [A - 70, 172], [90, 172]], { fill: LIGHT, sw: 2.4 });
  s += board(40, H - 88, A - 60, 26, DARK, { sw: 3, grain: { along: 'x', n: 3, knots: false } }) + box(40, H - 62, A - 60, 62, { fill: INK, sw: 0, stroke: 'none' }) + board(40, H - 62, A - 60, 62, DARK, { sw: 2.4, grain: { along: 'x', n: 5, knots: false } });
  const sx = 240, sw = 150;
  s += line(sx + sw / 2, 150, sx + sw / 2, 188, { sw: 2.2 });
  s += box(sx - 10, 186, sw + 20, 16, { fill: DARK, sw: 2.2, j: .3 });
  s += box(sx, 200, sw, 490, { fill: WOOD, sw: 2.8, j: .5 }) + box(sx + 18, 244, sw - 36, 380, { fill: OFF, sw: 2, j: .5 });
  s += box(sx - 12, 688, sw + 24, 18, { fill: DARK, sw: 2.2, j: .3 }) + dot(sx - 14, 697, 8, INK) + dot(sx + sw + 14, 697, 8, INK);
  // A low vase on the alcove board.
  s += `<path d="M482 712C458 712 450 670 468 650L472 628H492L496 650C514 670 506 712 482 712Z" fill="${SLATE}" stroke="${INK}" stroke-width="2.8"/>`;
  s += `<path d="M482 628C478 570 500 520 470 462M484 590C510 560 516 530 544 508M478 550C456 530 450 500 426 486" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  // Natural-wood alcove post, slightly wavy.
  s += `<path d="M${A - 22} 0C${A - 30} 240 ${A - 12} 480 ${A - 26} ${H}H${A + 26}C${A + 12} 500 ${A + 30} 260 ${A + 20} 0Z" fill="${WOOD}" stroke="${INK}" stroke-width="3.2"/>`;
  s += grain(A - 16, 6, 30, H - 12, { n: 4 });
  // Shoji run with a lattice transom above.
  const sx0 = A + 24, panels = 4, pw = (W - sx0) / panels;
  for (let i = 0; i < panels; i++) s += shoji(sx0 + i * pw, 172, pw, H - 172 - 10);
  s += board(0, 130, W, 42, DARK, { sw: 3, grain: { along: 'x', n: 4, knots: false } });
  s += box(0, 0, W, 130, { fill: EGG, sw: 2.8 });
  for (let x = 16; x < W; x += 40) s += line(x, 0, x, 128, { stroke: DARK, sw: 3, j: .2 });
  s += line(0, 44, W, 44, { stroke: DARK, sw: 3, j: .2 }) + line(0, 88, W, 88, { stroke: DARK, sw: 3, j: .2 });
  s += box(0, H - 10, W, 10, { fill: DARK, sw: 2, j: .2 });
  return svg(W, H, s);
}

function sideWall() {
  const W = 1700, H = 800;
  let s = box(0, 0, W, H, { fill: EGG, sw: 0, stroke: 'none' });
  const posts = [0, 560, 1140, W - 28];
  // Plaster on the near bay, shoji on the far two.
  s += box(28, 172, 532, H - 172, { fill: EGG, sw: 2.2 });
  for (let i = 0; i < 12; i++) { const x = rnd(60, 530), y = rnd(190, 760), w = rnd(24, 100); s += `<path d="M${f(x - w)} ${f(y)}Q${f(x)} ${f(y - 3)} ${f(x + w)} ${f(y)}" fill="none" stroke="${LIGHT}" stroke-opacity=".5" stroke-width="1.5"/>`; }
  for (let b = 0; b < 2; b++) { const x0 = 588 + b * 580, pw = (552 - 28) / 2; for (let i = 0; i < 2; i++) s += shoji(x0 + i * pw, 172, pw, H - 182); }
  s += box(0, 0, W, 130, { fill: EGG, sw: 2.8 }) + board(0, 130, W, 42, DARK, { sw: 3, grain: { along: 'x', n: 4, knots: false } });
  for (const x of posts) s += board(x, 0, 28, H, DARK, { sw: 3 });
  s += box(0, H - 10, W, 10, { fill: DARK, sw: 2, j: .2 });
  return svg(W, H, s);
}

function ceiling() {
  const W = 1600, D = 1700;
  let s = '';
  for (let x = 0; x < W; x += 200) s += board(x, 0, 200, D, LIGHT, { sw: 2, j: .5, grain: { n: 18 } });
  for (let y = 60; y < D; y += 170) s += box(0, y, W, 14, { fill: DARK, sw: 1.8, j: .3 });
  for (const x of [400, 1200]) s += board(x - 20, 0, 40, D, DARK, { sw: 3, grain: { n: 3, knots: false } });
  return svg(W, D, s);
}

// Lines of the rush weave run across each mat, and each long side has its black border.
function mat(x, y, w, h) {
  const across = w < h;
  let d = '';
  if (across) for (let v = y + 6; v < y + h; v += 7) d += `M${f(x)} ${f(v)}H${f(x + w)}`;
  else for (let v = x + 6; v < x + w; v += 7) d += `M${f(v)} ${f(y)}V${f(y + h)}`;
  let s = box(x, y, w, h, { fill: BEIGE, sw: 2.2, j: .3 }) + `<path d="${d}" fill="none" stroke="${LIGHT}" stroke-opacity=".75" stroke-width="1"/>`;
  s += across ? box(x, y, 14, h, { fill: INK, sw: 0, stroke: 'none' }) + box(x + w - 14, y, 14, h, { fill: INK, sw: 0, stroke: 'none' })
    : box(x, y, w, 14, { fill: INK, sw: 0, stroke: 'none' }) + box(x, y + h - 14, w, 14, { fill: INK, sw: 0, stroke: 'none' });
  return s;
}

function cushion(cx, cy, w, h) {
  let s = box(cx - w / 2 + 5, cy - h / 2 + 7, w, h, { fill: INK, sw: 0, stroke: 'none' });
  s += box(cx - w / 2, cy - h / 2, w, h, { fill: SLATE, sw: 3, j: 1.4 }) + box(cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24, { stroke: PALE, sw: 1.2, j: .8 });
  for (const [dx, dy] of [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28], [0, 0]]) s += `<path d="M${f(cx + dx * w - 7)} ${f(cy + dy * h)}h14M${f(cx + dx * w)} ${f(cy + dy * h - 7)}v14" stroke="${EGG}" stroke-width="2.2"/>`;
  return s;
}

function floor() {
  const W = 1600, D = 1700;
  let s = box(-2, -2, W + 4, D + 4, { fill: LIGHT, sw: 0, stroke: 'none' });
  for (const [x, y, w, h] of [[0, 0, 800, 400], [800, 0, 800, 400], [0, 400, 400, 800], [400, 400, 400, 800], [800, 400, 400, 800], [1200, 400, 400, 800], [0, 1200, 800, 400], [800, 1200, 800, 400]]) s += mat(x, y, w, h);
  for (let x = 0; x < W; x += 160) s += board(x, 1600, 160, 100, WOOD, { sw: 1.8, j: .4, grain: { n: 8, knots: false } });
  // Lattice light from the shoji lying across the mats, flat like a print.
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    const x = 980 + c * 118 + r * 34, y = 120 + r * 118;
    s += poly([[x, y], [x + 104, y], [x + 104 + 28, y + 104], [x + 28, y + 104]], { fill: OFF, stroke: 'none', sw: 0, j: .3 }).replace('fill="#FAF8F2"', 'fill="#FAF8F2" fill-opacity=".34"');
  }
  s += cushion(420, 700, 200, 216) + cushion(1180, 700, 200, 216);
  return svg(W, D, s);
}

function hanging() {
  const C = 80, top = 240;
  let s = line(C, 0, C, top, { sw: 3, j: .5 });
  s += box(C - 25, top, 50, 15, { fill: DARK, sw: 2.6, j: .3 }) + box(C - 25, top + 171, 50, 15, { fill: DARK, sw: 2.6, j: .3 });
  s += `<ellipse cx="${C}" cy="${top + 93}" rx="72" ry="82" fill="${OFF}" stroke="${INK}" stroke-width="3.4"/>`;
  for (let y = top + 24; y < top + 170; y += 15) { const q = Math.sqrt(Math.max(0, 1 - ((y - top - 93) / 82) ** 2)) * 72; s += `<path d="M${f(C - q)} ${y}Q${C} ${f(y + 5)} ${f(C + q)} ${y}" fill="none" stroke="${SLATE}" stroke-width="1.4"/>`; }
  s += line(C, top + 186, C, top + 214, { sw: 2.4, j: .3 }) + dot(C, top + 220, 6, INK);
  return svg(160, top + 232, s);
}

function tabletop() {
  const W = 1320;
  let s = '';
  for (let x = 0; x < W; x += 330) s += board(x, 0, 330, W, WOOD, { sw: 2.6, j: .6, grain: { n: 34, op: .3 } });
  return svg(W, W, s);
}

// The apron and foot share the same grain, so they read as one piece of joinery.
const tableEdge = () => svg(560, 18, board(0, 0, 560, 18, DARK, { sw: 2.4, j: .3, grain: { along: 'x', n: 3, knots: false } }));
const tableLeg = () => svg(44, 92, board(0, 0, 44, 92, DARK, { sw: 2.6, j: .3, grain: { n: 4, knots: false } }));

const inkstone = () => {
  let s = `<rect x="4" y="4" width="126" height="176" rx="9" fill="${INK}" fill-opacity=".35" transform="translate(5 7)"/>`;
  s += `<rect x="4" y="4" width="126" height="176" rx="9" fill="${SLATE}" stroke="${INK}" stroke-width="3.2"/>`;
  s += `<rect x="18" y="18" width="98" height="148" rx="8" fill="${INK}"/>`;
  s += `<path d="M18 58Q67 40 116 58V26Q116 18 108 18H26Q18 18 18 26Z" fill="#000"/>`;
  s += `<path d="M32 82Q67 72 102 82" fill="none" stroke="${SLATE}" stroke-width="1.6"/>`;
  return svg(140, 192, s);
};

const brush = () => {
  let s = `<rect x="8" y="16" width="26" height="20" rx="4" fill="${SLATE}" stroke="${INK}" stroke-width="2.4"/>`;
  s += `<path d="M21 6L25 198" stroke="${INK}" stroke-width="10.5" stroke-linecap="round"/><path d="M21 6L25 198" stroke="${LIGHT}" stroke-width="6.5"/>`;
  s += `<path d="M20 198C14 218 20 242 27 258C34 242 36 218 30 198Z" fill="${INK}"/>`;
  s += `<path d="M20 190H30V200H20Z" fill="${DARK}" stroke="${INK}" stroke-width="2"/>`;
  return svg(44, 262, s);
};

const cup = () => {
  let s = dot(70, 70, 58, INK, { fillOpacity: .32 }) + dot(64, 62, 58, EGG, { stroke: INK, strokeWidth: 3.4 });
  s += dot(64, 62, 46, GREY, { stroke: INK, strokeWidth: 2 }) + dot(64, 62, 39, LIGHT) + `<path d="M40 50Q64 34 88 50" fill="none" stroke="${EGG}" stroke-opacity=".8" stroke-width="2.4"/>`;
  return svg(132, 132, s);
};

// A carved name seal on its ink pad, seen from above.
const seal = () => {
  let s = `<rect x="6" y="20" width="96" height="76" rx="7" fill="${INK}" fill-opacity=".35" transform="translate(4 6)"/>`;
  s += `<rect x="6" y="20" width="96" height="76" rx="7" fill="${DARK}" stroke="${INK}" stroke-width="3"/>`;
  s += `<rect x="15" y="29" width="78" height="58" rx="4" fill="${SLATE}" stroke="${INK}" stroke-width="2"/>`;
  s += dot(128, 52, 24, INK, { fillOpacity: .32 }) + dot(124, 48, 24, BEIGE, { stroke: INK, strokeWidth: 3 }) + dot(124, 48, 13, LIGHT, { stroke: INK, strokeWidth: 1.6 });
  return svg(156, 104, s);
};

// A4 proportions, so nothing is stretched in the scene.
const paper = () => {
  let s = box(3, 3, 362, 514, { fill: OFF, sw: 2.6, j: 1 });
  for (let i = 0; i < 26; i++) { const x = rnd(30, 338), y = rnd(30, 490), l = rnd(5, 22), a = rnd(6.28); s += `<path d="M${f(x)} ${f(y)}l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}" stroke="${EGG}" stroke-width="1"/>`; }
  return svg(368, 520, s).replace('<svg ', '<svg preserveAspectRatio="none" ');
};

const out = { gate: gate(), 'door-left': door(false), 'door-right': door(true), lantern: lantern(), back: backWall(), side: sideWall(), ceiling: ceiling(), floor: floor(), hanging: hanging(), tabletop: tabletop(), 'table-edge': tableEdge(), 'table-leg': tableLeg(), inkstone: inkstone(), brush: brush(), cup: cup(), seal: seal(), paper: paper() };
for (const [name, text] of Object.entries(out)) writeFileSync(new URL(`../art/${name}.svg`, import.meta.url), text);
console.log(Object.entries(out).map(([n, t]) => `${n} ${(t.length / 1024).toFixed(0)}KB`).join(', '));
