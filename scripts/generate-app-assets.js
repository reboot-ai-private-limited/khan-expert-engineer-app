/**
 * Regenerates the launcher icon, Android adaptive icon and splash logo from
 * the single master artwork, assets/images/logo-source.png.
 *
 *   node scripts/generate-app-assets.js
 *
 * Run this after replacing the master artwork, then `npx expo prebuild
 * --clean` so the native projects pick the new images up. The outputs are
 * committed, so a normal build never needs sharp.
 *
 * The master is a rounded-square plate with a glow and transparent corners.
 * Each target wants a different crop of it, which is why this is a script
 * rather than three copies of the same file:
 *
 *   icon.png          iOS and the legacy Android launcher. Opaque — iOS
 *                     renders alpha as black — and bled to the edges,
 *                     because the platform applies its own corner mask and
 *                     letterboxed padding just makes the logo look small.
 *   adaptive-icon.png Android adaptive foreground. Android masks all but the
 *                     centre 66%, so the plate is inset to keep the circuit
 *                     ring and "KET ENGINEER" inside that safe zone.
 *   splash-icon.png   expo-splash-screen. Transparent, tightly trimmed; the
 *                     plugin's imageWidth sets the on-screen size.
 */
const sharp = require('sharp');
const path = require('path');

const IMAGES = path.join(__dirname, '..', 'assets', 'images');
const SOURCE = path.join(IMAGES, 'logo-source.png');

/** Brand navy. Must stay in step with the backgroundColor values in app.json. */
const BACKGROUND = '#0B192C';

/**
 * Fraction of the canvas the plate covers on the adaptive foreground.
 *
 * The circuit ring is ~84% of the plate, so at 0.76 it lands at ~64% of the
 * canvas — just inside Android's 66% safe zone, with the plate itself still
 * overflowing the mask so no background seam shows at the edge.
 */
const ADAPTIVE_PLATE_SCALE = 0.76;

const ICON_SIZE = 1024;

/** The artwork without its transparent margin, so every output starts square. */
async function trimmedPlate() {
  const trimmed = await sharp(SOURCE).trim({ threshold: 10 }).toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const side = Math.max(width, height);

  // Pad back to a square rather than stretching: the plate is square, but
  // trim crops the glow asymmetrically by a few pixels.
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function main() {
  const plate = await trimmedPlate();

  await sharp(plate)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: BACKGROUND })
    .flatten({ background: BACKGROUND })
    .png()
    .toFile(path.join(IMAGES, 'icon.png'));

  const inset = Math.round(ICON_SIZE * ADAPTIVE_PLATE_SCALE);
  const margin = Math.round((ICON_SIZE - inset) / 2);
  await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: await sharp(plate).resize(inset, inset).toBuffer(), top: margin, left: margin }])
    .png()
    .toFile(path.join(IMAGES, 'adaptive-icon.png'));

  await sharp(plate).resize(ICON_SIZE, ICON_SIZE).png().toFile(path.join(IMAGES, 'splash-icon.png'));

  console.log('Wrote icon.png, adaptive-icon.png and splash-icon.png to assets/images.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
