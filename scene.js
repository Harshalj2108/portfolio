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
  const TABLE_TOP = -110, TABLE_Z = -1000;
  // The second room is turned to face the left wall's doorway, which is at world x = -800, z = -850.
  const fromRoom2 = (x, y, z, pitch) => [-800 + z, y, -850 - x, pitch, -90];
  // The third room faces the same way as the world, with its entrance at the second room's right-hand door.
  const fromRoom3 = (x, y, z) => [-1800 + x, y, -1650 + z, 0, 0];
  const place = (id, s) => { $(id).style.transform = s; };
  const canHover = matchMedia('(hover: hover)').matches;

  let keys = [], T = {}, sceneScroll = 1, lastWidth = 0, PERSPECTIVE = 1000;

  /* Everything that needs a layout read happens here, on load and resize, never inside a frame. */
  function measure() {
    const vw = document.documentElement.clientWidth, vh = innerHeight, table = $('table');
    // A wider lens on narrow screens, so the camera can frame a tapestry without backing out of the room.
    PERSPECTIVE = clamp(vw * 1.5, 560, 1000);
    $('stage').style.perspective = PERSPECTIVE + 'px';
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
    // The wall is 1696 away from the entrance; each stop backs off until its tapestry fits the screen.
    const WALL = -1695, narrow = vw < 900, wallStop = (x, y, k) => [x, y, WALL + PERSPECTIVE / k, 0, 0];
    const about = narrow ? wallStop(-210, -345, Math.min(vw * .94 / 640, vh * .85 / 560)) : wallStop(-10, -345, Math.min(vw * .94 / 1080, vh * .9 / 600));
    const education = wallStop(340, -405, Math.min(vw * .92 / 340, vh * .85 / 440));
    const turned = [150, -345, -850, 0, -90];
    const atTableTop = fromRoom2(0, TABLE_TOP - PERSPECTIVE * s / onScreen, TABLE_Z, 90);
    // Standing over the table, a right turn puts the camera square to the swing door.
    const facingDoor = [-1800, -345, -850, 0, 0];
    // A wide screen frames the whole skills wall; a narrow one frames a few columns and travels along it.
    const skillsK = narrow ? Math.min(vw * .94 / 300, vh * .9 / 560) : Math.min(vw * .94 / 1180, vh * .9 / 560);
    const skillsStop = x => fromRoom3(x, -339, WALL + PERSPECTIVE / skillsK);
    // Each row: how much scrolling leads to this position (in screen heights), the position, and whether the camera rests there.
    const path = [
      [0, [0, y0, PERSPECTIVE / fit, 0, 0], 'gate'],
      [1.1, [0, -380, 560, 0, 0], 'doors'],
      [.55, [0, -345, -60, 0, 0], 'through'],
      [.6, about, 'read', true],
      [.5, about, 'readAbout', true],
      ...(narrow ? [[.4, education, 'edu', true], [.4, education, 'eduEnd', true]] : []),
      [.7, turned, 'turned', true],
      [.6, turned, 'slid', true],
      [.5, fromRoom2(0, -345, -30, 2), 'passed'],
      [.45, fromRoom2(0, -360, -330, 12), 'inside'],
      [.55, fromRoom2(0, Math.max(-700, -110 - PERSPECTIVE * s * 1.25), -850, 62), 'rise'],
      [.55, atTableTop, 'table', true],
      [.7, atTableTop, 'tableEnd', true],
      [.65, fromRoom2(0, -345, TABLE_Z, 0), 'upright', true],
      [.7, facingDoor, 'facing', true],
      [.6, facingDoor, 'swung', true],
      [.5, fromRoom3(0, -345, -30), 'passed2'],
      [.55, skillsStop(narrow ? -440 : 0), 'skills', true],
      ...(narrow ? [[1.6, skillsStop(440), 'skillsEnd', true]] : []),
    ];
    const total = path.reduce((sum, row) => sum + row[0], 0);
    let at = 0;
    keys = path.map(([dist, pos, name, rest]) => { at += dist / total; T[name] = at; return [at, ...pos, rest]; });
    // The camera is still between these pairs, so the words on the wall can render at their true size.
    T.rests = narrow ? [[T.read, T.readAbout], [T.edu, T.eduEnd], [1, 1]] : [[T.read, T.readAbout], [T.skills, 1]];
    T.readEnd = narrow ? T.eduEnd : T.readAbout;
    sceneScroll = Math.round(vh * total);
    $('track').style.height = sceneScroll + vh + 'px';
    dirty = true;
  }

  /* One smooth curve through the camera positions. It only comes to rest where the path says to. */
  function camAt(t, out) {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], dt = b[0] - a[0], u = clamp((t - a[0]) / dt, 0, 1);
    const u2 = u * u, u3 = u2 * u;
    for (let c = 1; c < 6; c++) {
      const prev = keys[i - 1], next = keys[i + 2];
      const m0 = prev && !a[6] ? (b[c] - prev[c]) / (b[0] - prev[0]) : 0;
      const m1 = next && !b[6] ? (next[c] - a[c]) / (next[0] - a[0]) : 0;
      out[c - 1] = (2 * u3 - 3 * u2 + 1) * a[c] + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * b[c] + (u3 - u2) * dt * m1;
    }
    return out;
  }

  const gateParts = [...document.querySelectorAll('.gate')];
  const firstRoom = [...document.querySelectorAll('.one')];
  const tapestries = [...document.querySelectorAll('.tapestry, #skills')];
  const upperRoom = ['ceiling', 'back', 'left', 'right', 'hanging', 'swing'].map($);
  let gateShown = true, oneShown = true, roomShown = true, twoShown = true, threeShown = true, sharp = false;
  const show = (els, on) => { for (const el of els) el.style.visibility = on ? '' : 'hidden'; };

  let dirty = true, smooth = scrollY, lastFrame = performance.now();
  const cam = [0, 0, 0, 0, 0];

  function draw() {
    const prog = clamp(smooth / sceneScroll, 0, 1), z = camAt(prog, cam)[2];
    // The cursor shifts the view slightly, but not while reading a wall or looking down at the table.
    const calm = (a, b, c, d) => 1 - ease(prog, a, b) * (1 - ease(prog, c, d));
    const sway = calm(T.through, T.read, T.readEnd, T.turned) * calm(T.inside, T.rise, T.tableEnd, T.upright) * calm(T.passed2, T.skills, 2, 3);
    const yaw = pointer.sx * 1.5 * sway, tip = pointer.sy * .8 * sway;
    $('camera').style.transform = `translateZ(${PERSPECTIVE}px) rotateX(${-cam[3] + tip}deg) rotateY(${cam[4] + yaw}deg) translate3d(${-cam[0]}px, ${-cam[1]}px, ${-z}px)`;
    const open = 3 * ease(prog, 0, T.doors * .13) + 99 * ease(prog, T.doors * .09, T.doors);
    place('door-left', `translate3d(-310px, -610px, 0) rotateY(${open}deg) scale(.5)`);
    place('door-right', `translate3d(310px, -610px, 0) rotateY(${-open}deg) translateX(-310px) scale(.5)`);
    // The sliding doors part once the camera has nearly finished turning to face them.
    const slid = 360 * ease(prog, T.turned - (T.slid - T.turned) * .15, T.slid);
    place('slide-near', `translate3d(-796px, -628px, ${-490 + slid}px) rotateY(90deg)`);
    place('slide-far', `translate3d(-796px, -628px, ${-850 - slid}px) rotateY(90deg)`);
    // The swing door hinges on its far edge and opens away from the camera, with the same small unlatch as the gate.
    const gap = T.swung - T.facing, swung = 3 * ease(prog, T.facing - gap * .2, T.facing + gap * .1) + 99 * ease(prog, T.facing, T.swung);
    place('swing', `translate3d(801px, -628px, -1200px) rotateY(${-90 + swung}deg)`);
    $('hint').style.opacity = 1 - ease(prog, 0, T.doors * .2);
    // Whatever is behind a wall still costs the graphics card, so each part only exists while it can be seen.
    // The second room appears while the camera rests at the tapestries, where preparing it can't show as a stutter.
    const wantGate = z > -40, wantOne = prog < T.inside, wantTwo = prog >= T.read && prog < T.passed2, wantThree = prog >= T.tableEnd;
    const wantRoom = prog < T.rise + (T.table - T.rise) * .56 || prog > T.tableEnd;
    if (wantGate !== gateShown) show(gateParts, gateShown = wantGate);
    if (wantOne !== oneShown) show(firstRoom, oneShown = wantOne);
    if (wantTwo !== twoShown) show([$('room2')], twoShown = wantTwo);
    if (wantThree !== threeShown) show([$('room3')], threeShown = wantThree);
    if (wantRoom !== roomShown) show(upperRoom, roomShown = wantRoom);
    const still = T.rests.some(([a, b]) => prog >= a && prog <= b);
    if (still !== sharp) { sharp = still; for (const el of tapestries) el.classList.toggle('sharp', still); }
    $('read').style.opacity = opened ? 0 : ease(prog, T.table - .015, T.table) * (1 - ease(prog, T.tableEnd, T.tableEnd + .015));
    // Scrolling away closes a page, but not while the keyboard is still travelling to the table.
    if (openPage && (scrollY < T.table * sceneScroll - 2 || scrollY > T.tableEnd * sceneScroll + 2)) setOpen(null);
    // Once the camera stops, the table can re-render its text at the size it's actually shown.
    const stopped = prog >= T.table && prog <= T.tableEnd;
    if (stopped !== arrived) $('table').classList.toggle('arrived', arrived = stopped);
    // A resting cursor must not set off a page's hover while the table moves past it mid-flight.
    const near = prog > T.table - .01 && prog < T.tableEnd + .01;
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
    const swing = (Math.sin(t * .8) * 1.1 + pointer.sx * 1.4).toFixed(2);
    if (oneShown) $('hanging1').style.transform = `translate3d(520px, -800px, -560px) rotateZ(${swing}deg)`;
    else if (roomShown) $('hanging').style.transform = `translate3d(-560px, -800px, -760px) rotateZ(${swing}deg)`;
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
    if (page && e.target.matches(':focus-visible')) { scrollTo(0, Math.ceil(T.table * sceneScroll)); setOpen(page); }
    else if (!page) setOpen(null);
    if (e.target.closest?.('#about') && e.target.matches(':focus-visible')) scrollTo(0, T.read * sceneScroll);
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
  place('hanging1', 'translate3d(520px, -800px, -560px)');
  place('hanging', 'translate3d(-560px, -800px, -760px)');
  smooth = scrollY;
  // The browser uploads each image the first time it comes into view, which would stutter mid-camera-move.
  // So the camera visits every position once behind a brief cover, and the walk itself has nothing left to load.
  async function warm() {
    measure();
    const nextFrame = () => new Promise(requestAnimationFrame);
    for (const at of [T.doors * .5, T.through, T.read, (T.readEnd + T.turned) / 2, T.turned, T.slid, T.passed, T.inside, T.rise, T.table, T.upright, T.facing, T.swung, T.passed2, 1]) {
      smooth = at * sceneScroll;
      draw();
      await nextFrame(); await nextFrame(); await nextFrame();
    }
    smooth = scrollY;
    dirty = true;
    document.documentElement.classList.add('ready');
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }
  Promise.all([...document.images].map(i => i.decode().catch(() => {})).concat(document.fonts.ready)).then(warm);
}
