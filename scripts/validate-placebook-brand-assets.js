/* global __dirname */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetRoot = path.join(root, 'assets', 'placebook');
const red = '#FF385C';
const white = '#FFFFFF';

function readAsset(relativePath) {
  return fs.readFileSync(path.join(assetRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertOnlyBrandColors(relativePath, content) {
  const colors = [...content.matchAll(/#[0-9A-Fa-f]{6}/g)].map((match) => match[0].toUpperCase());
  const invalid = colors.filter((color) => color !== red && color !== white);
  assert(invalid.length === 0, `${relativePath} contains non-brand colors: ${invalid.join(', ')}`);
}

const iconDir = path.join(assetRoot, 'icons');
const icons = fs
  .readdirSync(iconDir)
  .filter((file) => file.endsWith('.svg'))
  .sort();

assert(icons.length === 10, `expected 10 icon SVGs, found ${icons.length}`);

for (const icon of icons) {
  const relativePath = path.join('icons', icon);
  const content = readAsset(relativePath);

  assert(content.includes('<svg'), `${relativePath} is not an SVG`);
  assert(content.includes(red), `${relativePath} is missing the Airbnb-red background`);
  assert(content.includes(white), `${relativePath} is missing white vector artwork`);
  assertOnlyBrandColors(relativePath, content);
}

const wordmark = readAsset('placebook-wordmark-white.svg');
assert(wordmark.includes('Placebook'), 'wordmark SVG is missing Placebook text');
assert(wordmark.includes(white), 'wordmark SVG is missing white lettering');
assertOnlyBrandColors('placebook-wordmark-white.svg', wordmark);

const redScreen = readAsset('placebook-red-screen-wordmark.svg');
assert(redScreen.includes(red), 'red-screen wordmark is missing Airbnb red');
assert(redScreen.includes(white), 'red-screen wordmark is missing white lettering');
assert(redScreen.includes('Placebook'), 'red-screen wordmark is missing Placebook text');
assertOnlyBrandColors('placebook-red-screen-wordmark.svg', redScreen);

const animation = readAsset(path.join('animations', 'placebook-opening.svg'));
assert(animation.includes('@keyframes'), 'opening animation is missing CSS keyframes');
assert(animation.includes(red), 'opening animation is missing Airbnb red');
assert(animation.includes(white), 'opening animation is missing white artwork');
assert(animation.includes('Placebook'), 'opening animation is missing Placebook text');
assertOnlyBrandColors(path.join('animations', 'placebook-opening.svg'), animation);

console.log('Validated Placebook brand assets.');
