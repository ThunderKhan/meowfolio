// Audit the actual Vite production output before E2E mode can overwrite dist/.
// Uses only Node built-ins. This does not replace runtime network/device testing.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, normalize } from 'node:path';

const dist = join(process.cwd(), 'dist');
const htmlFile = join(dist, 'index.html');
assert(existsSync(htmlFile), 'Production dist/index.html is missing. Run npm run build.');
const html = readFileSync(htmlFile, 'utf8');
const assetsDir = join(dist, 'assets');
assert(existsSync(assetsDir), 'Expected dist/assets from Vite production build.');
const assets = readdirSync(assetsDir);
assert(assets.some((name) => /\.js$/.test(name)), 'No production JavaScript emitted.');
assert(assets.some((name) => /\.css$/.test(name)), 'No production CSS emitted.');
assert(assets.some((name) => /^worker[-.]/i.test(name) && name.endsWith('.js')),
  'AI worker chunk missing from production dist/assets.');

const links = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)]
  .map((match) => match[1]);
assert(links.length >= 2, 'Expected script and stylesheet assets in HTML.');
for (const url of links) {
  assert(!/^https?:\/\//i.test(url), 'Unexpected external script/style asset: ' + url);
  assert(!url.includes('..'), 'Unexpected traversing asset path: ' + url);
  if (url.startsWith('/assets/')) {
    const path = normalize(join(dist, url.slice(1)));
    assert(existsSync(path), 'HTML references missing production asset: ' + url);
  }
}

assert(!assets.some((name) => name.endsWith('.map')), 'Public source maps should be disabled.');
assert(!assets.some((name) => /\.onnx$/i.test(name)), 'Model weights must not be bundled into dist.');
assert(/name=["']theme-color["'][^>]+#ffd7ec/i.test(html),
  'Production theme color must match approved pink UI.');
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
assert.equal(config.framework, 'vite');
assert.equal(config.outputDirectory, 'dist');
assert(config.headers.some((item) => item.source === '/assets/(.*)'),
  'Hashed static asset cache policy is missing.');
console.log('Production artifact audit passed.');
console.log('Bundled hashed assets:', assets.length);
console.log('Worker:', assets.filter((name) => /^worker[-.].*\.js$/i.test(name)).join(', '));
