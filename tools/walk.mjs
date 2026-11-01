// Run from a folder where puppeteer-core is installed, with the site being served:
//   node D:/projects/portfolio/tools/walk.mjs http://127.0.0.1:8000/ [screenshot-folder]
// Drives the real route on a desktop and a phone-sized screen: the contact poster, the floor plan and phone reading.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const puppeteer = createRequire(process.cwd() + '/')('puppeteer-core');
const [url = 'http://127.0.0.1:8000/', shots] = process.argv.slice(2);
const COMPOSER = 'https://mail.google.com/mail/?view=cm&fs=1&to=harshalj.2108@gmail.com';
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });

const screens = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  landscape: { width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  small: { width: 320, height: 568, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

for (const [name, viewport] of Object.entries(screens)) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.classList.contains('ready'), { timeout: 90000 });
  await wait(800);
  const shot = async label => { if (shots) await page.screenshot({ path: `${shots}/${name}-${label}.png` }); };
  const scrollAtRest = async y => { await page.evaluate(y => scrollTo(0, y), y); await wait(1100); };
  await shot('gate');

  // Every floor plan stop lands at rest with its link marked as the current one.
  // A wide screen shows Education beside About, so it has no stop of its own there.
  const eduLabel = viewport.width < 900 ? 'Education' : 'About';
  for (const [at, label] of [['read', 'About'], ['edu', eduLabel], ['table', 'Projects'], ['skills', 'Skills'], ['profiles', 'Profiles'], ['gate', 'Gate'], ['contact', 'Contact']]) {
    await page.click('#plan-button');
    await wait(120);
    if (at === 'read') {
      assert.ok(await page.evaluate(() => document.querySelector('#plan').matches(':popover-open')), `${name}: the floor plan didn't open`);
      const fits = await page.evaluate(() => { const r = document.querySelector('#plan').getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight; });
      assert.ok(fits, `${name}: the floor plan runs off the screen`);
      await shot('plan');
    }
    await page.click(`#plan a[data-at="${at}"]`);
    await wait(1700);
    const state = await page.evaluate(() => ({ current: document.querySelector('#plan a[aria-current]')?.textContent, open: document.querySelector('#plan').matches(':popover-open'), jumping: document.documentElement.classList.contains('jumping') }));
    assert.equal(state.current, label, `${name}: wrong stop marked after jumping to ${at}`);
    assert.equal(state.open, false, `${name}: the floor plan stayed open`);
    assert.equal(state.jumping, false, `${name}: the view stayed covered`);
    await shot(at);
  }

  // At the end of the route, anywhere on the poster is the email link, including near its corners.
  const expected = viewport.hasTouch ? 'mailto:harshalj.2108@gmail.com' : COMPOSER;
  const hits = await page.evaluate(() => {
    const r = document.querySelector('#contact').getBoundingClientRect();
    return [[.5, .5], [.2, .25], [.8, .25], [.2, .8], [.8, .8]].map(([u, v]) => document.elementFromPoint(r.left + r.width * u, r.top + r.height * v)?.closest('a')?.href);
  });
  for (const href of hits) assert.equal(href, expected, `${name}: part of the poster isn't the email link`);
  // A real click on desktop opens Gmail in a new tab. A signed-out browser goes through sign-in, which keeps the composer as its destination.
  if (!viewport.hasTouch) {
    const box = await page.evaluate(() => { const r = document.querySelector('#contact').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * .8]; });
    const popup = new Promise(resolve => browser.once('targetcreated', t => resolve(t.page())));
    await page.mouse.click(...box);
    const tab = await Promise.race([popup, wait(8000).then(() => null)]);
    assert.ok(tab, `${name}: clicking the poster opened nothing`);
    await tab.waitForFunction(() => location.href !== 'about:blank', { timeout: 15000 });
    assert.ok(decodeURIComponent(tab.url()).includes(COMPOSER), `${name}: clicking the poster opened ${tab.url()}`);
    await tab.close();
  }

  // The poster still works if the page stops just short of the end, as a phone's collapsing address bar makes it do.
  const shortOfEnd = await page.evaluate(() => { const max = document.documentElement.scrollHeight - innerHeight; return max - .1 * innerHeight; });
  await scrollAtRest(shortOfEnd);
  assert.ok(await page.evaluate(() => document.querySelector('#contact').classList.contains('sharp')), `${name}: the poster isn't clickable just short of the end`);

  // Where the table's text is too small, each scroll step brings up the next page, at a readable size.
  const reading = await page.evaluate(() => document.querySelector('#read').textContent);
  const dealt = reading.startsWith('Keep scrolling');
  assert.equal(dealt, name !== 'desktop', `${name}: wrong reading mode (${reading})`);
  if (dealt) {
    await page.click('#plan-button'); await wait(120);
    await page.click('#plan a[data-at="table"]'); await wait(1700);
    const startY = await page.evaluate(() => scrollY);
    await shot('table');
    assert.equal(await page.evaluate(() => document.querySelectorAll('.page.open').length), 0, `${name}: a page is open on arrival`);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const step = viewport.height * .52;
    const seen = [];
    for (let i = 1; i <= 8; i++) {
      await scrollAtRest(startY + (i - 1) * step + step / 2 + step / 2);
      const open = await page.evaluate(() => { const p = document.querySelector('.page.open'); if (!p) return null; const r = p.querySelector('p').getBoundingClientRect(), s = p.querySelector('.sheet').getBoundingClientRect(); return { title: p.querySelector('h2').textContent, width: s.width, fits: s.left >= -1 && s.right <= innerWidth + 1 && s.top >= -1 && s.bottom <= innerHeight + 1, px: parseFloat(getComputedStyle(p.querySelector('p')).fontSize) * s.width / p.querySelector('.sheet').offsetWidth }; });
      assert.ok(open, `${name}: no page open at step ${i}`);
      assert.ok(open.fits, `${name}: ${open.title} doesn't fit the screen`);
      assert.ok(open.px >= 12, `${name}: ${open.title} is only ${open.px.toFixed(1)}px`);
      seen.push(open.title);
      if (i === 1 || i === 8) await shot(`page${i}`);
    }
    assert.equal(new Set(seen).size, 8, `${name}: pages seen: ${seen.join(', ')}`);
    await scrollAtRest(max * .8);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.page.open').length), 0, `${name}: a page stayed open after leaving the table`);
  }
  assert.deepEqual(errors, [], `${name}: page errors`);
  console.log(`ok: ${name}`);
  await page.close();
}

// The keyboard can reach the floor plan first, walk its stops in route order, and leave with Escape.
{
  const page = await browser.newPage();
  await page.setViewport(screens.desktop);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.classList.contains('ready'), { timeout: 90000 });
  await wait(800);
  const focused = () => page.evaluate(() => document.activeElement.id || document.activeElement.textContent);
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'plan-button', 'the floor plan is not the first tab stop');
  await page.keyboard.press('Enter');
  const order = [];
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Tab'); order.push(await focused()); }
  assert.deepEqual(order, ['Gate', 'About', 'Education', 'Projects', 'Skills', 'Profiles', 'Contact']);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.querySelector('#plan').matches(':popover-open')), false, 'Escape left the floor plan open');
  assert.equal(await focused(), 'plan-button', 'Escape lost the keyboard focus');
  await page.close();
  console.log('ok: keyboard');
}

// With reduced motion or no JavaScript it's a plain page: no floor plan, and the poster is still the Gmail link.
for (const mode of ['reduced motion', 'no JavaScript']) {
  const page = await browser.newPage();
  await page.setViewport(screens.desktop);
  if (mode === 'no JavaScript') await page.setJavaScriptEnabled(false);
  else await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(url, { waitUntil: 'load' });
  // Evaluating still works with page scripts off.
  const flat = await page.evaluate(() => {
    const hidden = id => getComputedStyle(document.getElementById(id)).display === 'none';
    const box = document.querySelector('#contact').getBoundingClientRect();
    document.querySelector('#contact').scrollIntoView();
    const r = document.querySelector('#contact').getBoundingClientRect();
    return { button: hidden('plan-button'), plan: hidden('plan'), overflow: document.documentElement.scrollWidth > innerWidth, tall: box.height > 0, href: document.elementFromPoint(r.left + r.width * .9, r.top + r.height * .5)?.closest('a')?.href };
  });
  assert.deepEqual(flat, { button: true, plan: true, overflow: false, tall: true, href: COMPOSER }, mode);
  if (shots) await page.screenshot({ path: `${shots}/flat-${mode.replace(' ', '-')}.png` });
  await page.close();
  console.log(`ok: ${mode}`);
}
await browser.close();
