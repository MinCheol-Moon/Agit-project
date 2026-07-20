// Generates assets/webicon.png - the home-screen icon used for the web/PWA
// install. Deliberately reads as a Korean 가계부 (budget book) app for the
// stealth disguise: a green field with a white coin and a green ₩ mark.
// Run locally with `node scripts/gen-webicon.js`; the committed PNG is what
// the Netlify build copies, so pngjs isn't needed at build time.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const S = 1024;
const png = new PNG({ width: S, height: S });

// Palette
const BG = [22, 133, 79]; // money green
const BG2 = [17, 110, 64]; // slightly darker for a soft vertical gradient
const COIN = [255, 255, 255];
const MARK = [22, 133, 79];

function set(x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (S * y + x) << 2;
  const ia = a / 255;
  png.data[i] = Math.round(png.data[i] * (1 - ia) + r * ia);
  png.data[i + 1] = Math.round(png.data[i + 1] * (1 - ia) + g * ia);
  png.data[i + 2] = Math.round(png.data[i + 2] * (1 - ia) + b * ia);
  png.data[i + 3] = 255;
}

// Background with a gentle top-to-bottom gradient.
for (let y = 0; y < S; y++) {
  const t = y / S;
  const c = [
    Math.round(BG[0] * (1 - t) + BG2[0] * t),
    Math.round(BG[1] * (1 - t) + BG2[1] * t),
    Math.round(BG[2] * (1 - t) + BG2[2] * t),
  ];
  for (let x = 0; x < S; x++) set(x, y, c);
}

// Anti-aliased filled disk.
function disk(cx, cy, radius, color) {
  const r0 = radius - 1.5;
  for (let y = Math.floor(cy - radius - 2); y <= cy + radius + 2; y++) {
    for (let x = Math.floor(cx - radius - 2); x <= cx + radius + 2; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r0) set(x, y, color);
      else if (d <= radius) set(x, y, color, Math.round(255 * (radius - d) / (radius - r0)));
    }
  }
}

// Thick line segment with round caps.
function stroke(x0, y0, x1, y1, w, color) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disk(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, color);
  }
}

// Coin
const cx = S / 2;
const cy = S / 2;
disk(cx, cy, 360, COIN);

// ₩ mark inside the coin: a W (two V's) plus two horizontal bars.
const gx0 = cx - 190; // glyph left
const gx1 = cx + 190; // glyph right
const gtop = cy - 150;
const gbot = cy + 150;
const w = 58;
const xs = [gx0, gx0 + 95, gx0 + 190, gx0 + 285, gx1]; // 5 evenly spaced points
stroke(xs[0], gtop, xs[1], gbot, w, MARK);
stroke(xs[1], gbot, xs[2], gtop, w, MARK);
stroke(xs[2], gtop, xs[3], gbot, w, MARK);
stroke(xs[3], gbot, xs[4], gtop, w, MARK);
// Two horizontal bars.
for (const by of [gtop + 100, gtop + 175]) {
  stroke(gx0 - 20, by, gx1 + 20, by, 42, MARK);
}

png.pack().pipe(fs.createWriteStream(path.join(__dirname, '..', 'assets', 'webicon.png'))).on('finish', () => {
  console.log('gen-webicon: wrote assets/webicon.png (1024x1024)');
});
