const $ = id => document.getElementById(id);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (t, a, b) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * x * (x * (6 * x - 15) + 10); };

const pointer = { x: -9999, y: -9999, sx: 0, sy: 0 };

/* The cat only turns its head: enough to feel watched, not enough to be a character. */
const cat = { tilt: 0, ex: 0, blink: 3 };
function drawCat(t) {
  const r = $('cat').getBoundingClientRect();
  const dx = pointer.x > -9000 ? pointer.x - (r.left + r.width / 2) : 0;
  const dy = pointer.x > -9000 ? pointer.y - (r.top + r.height / 2) : 0;
  const k = still ? 1 : .08;
  cat.tilt = lerp(cat.tilt, clamp(dx / innerWidth * 34, -14, 14) + clamp(dy / innerHeight * 8, -5, 5) * -Math.sign(dx || 1), k);
  cat.ex = lerp(cat.ex, clamp(dx / 60, -2.6, 2.6), still ? 1 : .15);
  $('catHead').setAttribute('transform', `rotate(${cat.tilt.toFixed(2)} 26 33)`);
  $('catEyes').setAttribute('transform', `translate(${cat.ex.toFixed(2)} 0)`);
  if (t > cat.blink) cat.blink = t + 2.5 + Math.random() * 4;
  $('catEyes').setAttribute('visibility', t > cat.blink - .12 ? 'hidden' : 'visible');
}

function track(e) { pointer.x = e.clientX; pointer.y = e.clientY; if (still) drawCat(performance.now() / 1000); }
addEventListener('pointermove', track, { passive: true });
addEventListener('pointerdown', track, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; if (still) drawCat(performance.now() / 1000); });

if (still) drawCat(0);
else {
  const PERSPECTIVE = 1000, TABLE_TOP = -110, TABLE_Z = -1000;
  const place = (id, s) => { $(id).style.transform = s; };
  const canHover = matchMedia('(hover: hover)').matches;

  let keys = [], sceneScroll = 1, lastWidth = 0;

  /* Everything that needs a layout read happens here, on load and resize, never inside a frame. */
  function measure() {
    const vw = document.documentElement.clientWidth, vh = innerHeight, table = $('table');
    const W = table.offsetWidth, H = table.offsetHeight;
    const s = 560 / W, Tw = W * s, Hw = H * s;
    lastWidth = vw;
    place('table', `translate3d(${-Tw / 2}px, ${TABLE_TOP}px, ${TABLE_Z - Hw / 2}px) rotateX(90deg) scale(${s})`);
    $('edge').style.width = Tw + 'px';
    place('edge', `translate3d(${-Tw / 2}px, ${TABLE_TOP}px, ${TABLE_Z + Hw / 2}px)`);
    const shadow = $('shadow');
    shadow.style.width = Tw + 50 + 'px'; shadow.style.height = Hw + 60 + 'px';
    place('shadow', `translate3d(${-Tw / 2 - 12}px, -1px, ${TABLE_Z - Hw / 2 - 18}px) rotateX(90deg)`);
    const inset = Math.min(38, Tw * .08), legY = TABLE_TOP + 18, near = TABLE_Z + Hw / 2 - inset, far = TABLE_Z - Hw / 2 + inset;
    place('leg1', `translate3d(${-Tw / 2 + inset}px, ${legY}px, ${near}px)`);
    place('leg2', `translate3d(${Tw / 2 - inset - 44}px, ${legY}px, ${near}px)`);
    place('leg3', `translate3d(${-Tw / 2 + inset}px, ${legY}px, ${far}px)`);
    place('leg4', `translate3d(${Tw / 2 - inset - 44}px, ${legY}px, ${far}px)`);
    place('leg5', `translate3d(${-Tw / 2 + inset + 44}px, ${legY}px, ${near}px) rotateY(90deg)`);
    place('leg6', `translate3d(${Tw / 2 - inset - 44}px, ${legY}px, ${near - 44}px) rotateY(-90deg)`);

    // The camera stops where the whole table just fits; an open page then shows at full size, up to the screen's limit.
    const onScreen = Math.min((vw - 16) / W, (vh - 64) / H, 1);
    table.style.setProperty('--read', Math.min(1, vw * .94 / 368, vh * .94 / 520) / onScreen);
    const fit = Math.min(vw / 720, vh / 1000, 1.1);
    // On a tall screen the gate moves up, so the view fills with gravel rather than empty sky.
    const y0 = Math.max(-430, -960 + vh / (2 * fit));
    keys = [
      [0, 0, y0, PERSPECTIVE / fit, 0],
      [.34, 0, -380, 560, 0],
      [.5, 0, -345, -60, 3],
      [.66, 0, -360, -330, 12],
      [.84, 0, Math.max(-700, -110 - PERSPECTIVE * s * 1.25), -850, 62],
      [1, 0, TABLE_TOP - PERSPECTIVE * s / onScreen, TABLE_Z, 90],
    ];
    sceneScroll = Math.round(vh * 3.4);
    $('track').style.height = sceneScroll + vh + 'px';
    dirty = true;
  }

  /* One smooth curve through every camera position, so the camera never stops between stages. */
  function camAt(t, out) {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], dt = b[0] - a[0], u = clamp((t - a[0]) / dt, 0, 1);
    const u2 = u * u, u3 = u2 * u;
    for (let c = 1; c < 5; c++) {
      const prev = keys[i - 1], next = keys[i + 2];
      const m0 = prev ? (b[c] - prev[c]) / (b[0] - prev[0]) : 0;
      const m1 = next ? (next[c] - a[c]) / (next[0] - a[0]) : 0;
      out[c - 1] = (2 * u3 - 3 * u2 + 1) * a[c] + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * b[c] + (u3 - u2) * dt * m1;
    }
    return out;
  }

  const gateParts = [...document.querySelectorAll('.gate')];
  const upperRoom = ['ceiling', 'back', 'left', 'right', 'hanging'].map($);
  let gateShown = true, roomShown = true;
  const show = (els, on) => { for (const el of els) el.style.visibility = on ? 'visible' : 'hidden'; };

  let dirty = true, smooth = scrollY, lastFrame = performance.now();
  const cam = [0, 0, 0, 0];

  function draw() {
    const prog = clamp(smooth / sceneScroll, 0, 1), z = camAt(prog, cam)[2];
    const sway = 1 - ease(prog, .55, .85);
    const yaw = pointer.sx * 1.5 * sway, tip = pointer.sy * .8 * sway;
    $('camera').style.transform = `translateZ(${PERSPECTIVE}px) rotateX(${-cam[3] + tip}deg) rotateY(${yaw}deg) translate3d(${-cam[0]}px, ${-cam[1]}px, ${-z}px)`;
    const open = 3 * ease(prog, 0, .045) + 99 * ease(prog, .03, .36);
    place('door-left', `translate3d(-310px, -610px, 0) rotateY(${open}deg) scale(.5)`);
    place('door-right', `translate3d(310px, -610px, 0) rotateY(${-open}deg) translateX(-310px) scale(.5)`);
    $('hint').style.opacity = 1 - ease(prog, 0, .07);
    const wantGate = z > -40, wantRoom = prog < .93;
    if (wantGate !== gateShown) show(gateParts, gateShown = wantGate);
    if (wantRoom !== roomShown) show(upperRoom, roomShown = wantRoom);
    $('read').style.opacity = opened ? 0 : ease(prog, .96, 1);
    // Scrolling away closes a page, but not while the keyboard is still travelling to the table.
    if (openPage && scrollY < sceneScroll * .98) setOpen(null);
    // Once the camera stops, the table can re-render its text at the size it's actually shown.
    const stopped = prog === 1;
    if (stopped !== arrived) $('table').classList.toggle('arrived', arrived = stopped);
    // A resting cursor must not set off a page's hover while the table moves past it mid-flight.
    const near = prog > .98;
    if (near !== atTable) $('table').classList.toggle('at', atTable = near);
  }

  let openPage = null, opened = false, arrived = false, atTable = false;
  function setOpen(page) {
    openPage?.classList.remove('open');
    openPage = page;
    page?.classList.add('open');
    $('table').classList.toggle('reading', !!page);
    if (page) { opened = true; dirty = true; }
  }

  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, .05), t = now / 1000;
    lastFrame = now;
    // Frame-rate independent damping: a notched wheel glides rather than jumps.
    const y = scrollY, gap = y - smooth;
    if (Math.abs(gap) > .04) { smooth += gap * (1 - Math.exp(-dt * 7)); dirty = true; }
    else if (gap) { smooth = y; dirty = true; }
    if (canHover && pointer.x > -9000) {
      const gx = pointer.x / innerWidth - .5, gy = pointer.y / innerHeight - .5, k = 1 - Math.exp(-dt * 3.2);
      if (Math.abs(gx - pointer.sx) + Math.abs(gy - pointer.sy) > .0005) { pointer.sx += (gx - pointer.sx) * k; pointer.sy += (gy - pointer.sy) * k; dirty = true; }
    }
    if (dirty) { draw(); dirty = false; }
    if (roomShown && smooth / sceneScroll > .3) $('hanging').style.transform = `translate3d(-560px, -800px, -760px) rotateZ(${(Math.sin(t * .8) * 1.1 + pointer.sx * 1.4).toFixed(2)}deg)`;
    drawCat(t);
    requestAnimationFrame(frame);
  }

  addEventListener('click', e => {
    if (!atTable) return;
    const page = e.target.closest('.page');
    if (!page) return setOpen(null);
    // A mouse can click a link straight off the table; on a touch screen the first tap only opens the page.
    if (e.target.closest('a')) { if (!canHover && page !== openPage) { e.preventDefault(); setOpen(page); } return; }
    setOpen(page === openPage ? null : page);
  });

  // Keyboard: tabbing onto a page travels to the table and opens that page.
  addEventListener('focusin', e => {
    const page = e.target.closest?.('.page');
    if (page && e.target.matches(':focus-visible')) { scrollTo(0, sceneScroll); setOpen(page); }
    else if (!page) setOpen(null);
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(null);
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.page')) { e.preventDefault(); setOpen(e.target === openPage ? null : e.target); }
  });

  addEventListener('resize', () => {
    // Phone address bars resize the window on every scroll; only a real width change matters.
    if (canHover || document.documentElement.clientWidth !== lastWidth) measure();
  });

  if (!canHover) $('read').textContent = 'Tap a page to read it.';
  measure();
  place('hanging', 'translate3d(-560px, -800px, -760px)');
  smooth = scrollY;
  // Decode the art first so the doors never stutter on their first movement.
  const ready = () => { measure(); document.documentElement.classList.add('ready'); requestAnimationFrame(frame); };
  Promise.all([...document.images].map(i => i.decode().catch(() => {})).concat(document.fonts.ready)).then(ready);
}
