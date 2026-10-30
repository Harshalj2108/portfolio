// Run after draw.mjs, from a folder where puppeteer-core is installed: node D:/projects/portfolio/tools/bake.mjs
// Turns the room's heavy line art into images. Vector versions cost the graphics card a slow redraw as each
// part comes into view, which shows up as a hitch in the camera move; an image only has to be uploaded once.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const puppeteer = createRequire(process.cwd() + '/')('puppeteer-core');
const art = name => new URL(`../art/${name}`, import.meta.url);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();

for (const name of ['floor', 'ceiling', 'back', 'side', 'tabletop']) {
  const svg = readFileSync(art(`${name}.svg`), 'utf8');
  const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1.5 });
  await page.setContent(`<!doctype html><body style="margin:0">${svg}`);
  writeFileSync(art(`${name}.webp`), await page.screenshot({ type: 'webp', quality: 88 }));
}
await browser.close();
