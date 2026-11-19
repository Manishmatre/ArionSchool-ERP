const fs = require('fs');
const path = require('path');
const { getJimpImageAsync } = require('@expo/image-utils/build/jimp');

async function generate() {
  const assetsDir = path.resolve(__dirname, '..', 'assets');
  const resDir = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

  // Load official high-res logo
  const logo = await getJimpImageAsync(path.join(assetsDir, 'logo.png'));
  const Jimp = logo.constructor;

  // The cropped brand emblem + "SES" text
  // Bounding box from measurement: x: 130, y: 29, width: 462, height: 278
  const brand = logo.clone().crop(130, 29, 462, 278);
  const brandAspect = brand.bitmap.width / brand.bitmap.height; // ~1.66

  console.log(`Brand cropped: ${brand.bitmap.width}x${brand.bitmap.height} (aspect: ${brandAspect.toFixed(2)})`);

  // Helper to make a centered brand icon on a white background
  async function makeIcon(size, isRound = false) {
    const canvas = new Jimp(size, size, 0xffffffff);
    // Fit within 68% of the square for good breathing room and padding
    const maxDim = Math.round(size * 0.68);
    const targetW = maxDim;
    const targetH = Math.round(targetW / brandAspect);
    const scaled = brand.clone().resize(targetW, targetH);
    const x = Math.round((size - targetW) / 2);
    const y = Math.round((size - targetH) / 2);
    canvas.composite(scaled, x, y);

    if (isRound) {
      canvas.circle();
    }
    return canvas;
  }

  // Helper to make adaptive foreground (transparent canvas, logo in safe zone ~60% size)
  async function makeForeground(size) {
    const canvas = new Jimp(size, size, 0x00000000);
    // In Android adaptive icon (108dp canvas), 72dp is the safe maskable area (~66%).
    // We target ~58% of canvas width to ensure it is 100% inside any circle/squircle/teardrop mask.
    const targetW = Math.round(size * 0.58);
    const targetH = Math.round(targetW / brandAspect);
    const scaled = brand.clone().resize(targetW, targetH);
    const x = Math.round((size - targetW) / 2);
    const y = Math.round((size - targetH) / 2);
    canvas.composite(scaled, x, y);
    return canvas;
  }

  // 1. Generate master 1024x1024 assets
  console.log('Generating assets/icon.png and assets/adaptive-icon.png...');
  const masterIcon = await makeIcon(1024, false);
  await masterIcon.writeAsync(path.join(assetsDir, 'icon.png'));

  const masterAdaptive = await makeForeground(1024);
  await masterAdaptive.writeAsync(path.join(assetsDir, 'adaptive-icon.png'));

  // 2. Android Mipmap densities
  const densities = [
    { name: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  for (const d of densities) {
    const targetFolder = path.join(resDir, d.name);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Remove legacy webp files to prevent AAPT duplicate resource errors
    ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp'].forEach(f => {
      const p = path.join(targetFolder, f);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`Deleted legacy: ${d.name}/${f}`);
      }
    });

    // Write PNG versions
    const squareIcon = await makeIcon(d.iconSize, false);
    await squareIcon.writeAsync(path.join(targetFolder, 'ic_launcher.png'));

    const roundIcon = await makeIcon(d.iconSize, true);
    await roundIcon.writeAsync(path.join(targetFolder, 'ic_launcher_round.png'));

    const fgIcon = await makeForeground(d.fgSize);
    await fgIcon.writeAsync(path.join(targetFolder, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${d.name} (${d.iconSize}x${d.iconSize}, fg: ${d.fgSize}x${d.fgSize})`);
  }

  // Clean up any test preview files
  ['preview_white.png', 'preview_blue.png', 'icon_emblem.png', 'icon_full.png', 'preview_square.png', 'preview_circle.png'].forEach(f => {
    const p = path.join(assetsDir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  console.log('✅ ALL SES EDUCARE APP ICONS GENERATED SUCCESSFULLY!');
}

generate().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
