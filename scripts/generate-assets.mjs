#!/usr/bin/env node
// Regenerates every app icon in public/ from the club crest in assets/.
// Needs ImageMagick (`convert`) — only run when the artwork changes:
//   npm run assets:generate
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const abs = (path) => join(root, path);

// The crest is the single source of truth. SVG wins when both are present.
const CREST = ['assets/crest.svg', 'assets/crest.png', 'assets/crest.webp', 'assets/crest.jpg', 'assets/crest.jpeg'].find((path) =>
  existsSync(abs(path)),
);

if (!CREST) {
  console.error('Falta o emblema. Guarda-o em assets/crest.svg (ou .png/.webp/.jpg) e corre outra vez.');
  process.exit(1);
}

try {
  execFileSync('convert', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('Precisas do ImageMagick instalado (comando "convert").');
  process.exit(1);
}

const isVector = extname(CREST).toLowerCase() === '.svg';

// A scanned/exported crest sits on a white sheet. Flood-fill from the four
// corners so the badge itself keeps its whites (the shield keyline, "1925")
// while the sheet around it becomes transparent. ImageMagick 6 spells the
// primitive "matte" and does not expand %[fx:] inside -draw, so the corners are
// measured up front.
function cornersOf(source) {
  const [width, height] = execFileSync('identify', ['-format', '%w %h', `${source}[0]`], { encoding: 'utf8' }).trim().split(' ').map(Number);
  const [right, bottom] = [width - 1, height - 1];
  return [`0,0`, `${right},0`, `0,${bottom}`, `${right},${bottom}`];
}

const dropSheet = isVector
  ? []
  : ['-alpha', 'set', '-fuzz', '8%', ...cornersOf(abs(CREST)).flatMap((corner) => ['-fill', 'none', '-draw', `matte ${corner} floodfill`])];

// Square canvas, crest centred, nothing stretched.
function icon(target, size, { background = 'none', fill = 1, quiet = false } = {}) {
  const box = Math.round(size * fill);
  execFileSync(
    'convert',
    [
      '-background', 'none', abs(CREST),
      ...dropSheet,
      '-trim', '+repage',
      '-resize', `${box}x${box}`,
      '-gravity', 'center',
      '-background', background,
      '-extent', `${size}x${size}`,
      '-strip',
      `PNG32:${abs(target)}`,
    ],
    { stdio: 'inherit' },
  );
  if (!quiet) console.log(`✔ ${target} (${size}×${size}${background === 'none' ? '' : `, fundo ${background}`})`);
}

// Header logo and favicon: transparent, so they sit on the light and dark card alike.
icon('public/logo.png', 144);
icon('public/favicon.png', 64);

// PWA icons: transparent for the launcher.
icon('public/icon-192.png', 192);
icon('public/icon-512.png', 512);

// iOS renders transparency as black, so the touch icon gets a white sheet back.
icon('public/apple-touch-icon.png', 180, { background: 'white' });

// Maskable: Android crops to a circle/squircle, so the crest has to stay inside
// the safe zone — the circle of 80% of the side, i.e. 204.8px from the centre of
// a 512 icon. The crest is taller than it is wide (244×303 once trimmed), so the
// fill that keeps every opaque pixel inside was measured rather than guessed:
// 0.72 already reaches 203.8px, 0.68 stops at 193.2px.
icon('public/icon-maskable-512.png', 512, { background: 'white', fill: 0.68 });

// Link preview: the crest composited onto the titled background.
const ogBackground = abs('.og-background.png');
execFileSync('convert', ['-background', 'none', abs('assets/og-image.svg'), '-resize', '1200x630!', '-strip', `PNG24:${ogBackground}`], {
  stdio: 'inherit',
});
const ogCrest = abs('.og-crest.png');
icon('.og-crest.png', 380, { quiet: true });
execFileSync(
  'convert',
  [ogBackground, ogCrest, '-geometry', '+90+125', '-composite', '-strip', `PNG24:${abs('public/og-image.png')}`],
  { stdio: 'inherit' },
);
execFileSync('rm', ['-f', ogBackground, ogCrest]);
console.log('✔ public/og-image.png (1200×630)');
