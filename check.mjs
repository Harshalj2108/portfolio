// Run: node check.mjs          the content the site promises is all there, and the palette has no orange
//      node check.mjs --launch also fails on leftover TODO(harshal) text
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('index.html');

const PROJECTS = ['Karmyog Jyotish', 'LeanLayerCLI', 'Eyesaver', 'Bookie', 'TradeSeekho', 'TwoView', 'Vehicle Behaviour Prediction', 'Minesweeper'];
const names = [...html.split('id="table"')[1].split('</main>')[0].matchAll(/<h2>([^<]+)</g)].map(m => m[1]);
assert.deepEqual(names, PROJECTS, 'project pages differ from the agreed list');
for (const [, src] of html.matchAll(/src="(art\/skills\/[^"]+)"/g)) read(src);
for (const id of ['about', 'education', 'skills', 'profiles', 'contact']) assert.ok(html.includes(`id="${id}"`), `the ${id} section is missing`);
if (process.argv.includes('--launch')) assert.ok(!html.includes('TODO(harshal)'), 'fill in the TODO(harshal) text first');

// Harshal decided these stay off the site.
for (const hidden of ['IronFlame', 'ProudBardeen', 'web2code']) assert.ok(!html.toLowerCase().includes(hidden.toLowerCase()), `${hidden} must not appear`);
const links = [...html.matchAll(/<a\b[^>]*\bhref="(http[^"]+)"/g)].map(m => m[1]);
for (const url of links) assert.ok(url.startsWith('https://'), `not https: ${url}`);
for (const profile of ['leetcode.com', 'github.com/Harshalj2108', 'codeforces.com']) assert.ok(links.some(url => url.includes(profile)), `no link to ${profile}`);
assert.ok(html.split('id="contact"')[1].includes('href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=harshalj.2108@gmail.com"'), 'the contact poster must open the Gmail composer');
// Every floor plan stop must be a name on the camera's path.
const scene = read('scene.js');
for (const [, at] of html.matchAll(/data-at="(\w+)"/g)) assert.ok(scene.includes(`'${at}'`), `floor plan stop ${at} is not on the route`);

// Harshal removed orange. Any colour with red far above blue and saturated is out; the cat's amber eyes are the one exception.
const files = ['index.html', 'style.css', ...readdirSync(new URL('art/', import.meta.url)).filter(f => f.endsWith('.svg')).map(f => `art/${f}`)];
for (const file of files) for (const [hex] of read(file).matchAll(/#[0-9a-f]{6}\b/gi)) {
  const [r, , b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  assert.ok(hex.toUpperCase() === '#F7BE55' || r - b < 80, `${file} has a saturated warm colour: ${hex}`);
}

console.log(`ok: ${names.length} project pages, ${files.length} files free of orange`);
