const path = require('path');
const fs = require('fs');
const { registerFont } = require('canvas');

let fontsRegistered = false;

function initCanvasFonts() {
  if (fontsRegistered) return;
  try {
    const regularFont = path.join(__dirname, '..', 'assets', 'fonts', 'arial.ttf');
    const boldFont = path.join(__dirname, '..', 'assets', 'fonts', 'arialbd.ttf');

    if (fs.existsSync(regularFont)) {
      registerFont(regularFont, { family: 'Arial', weight: 'normal' });
      registerFont(regularFont, { family: 'Liberation Sans', weight: 'normal' });
    }
    if (fs.existsSync(boldFont)) {
      registerFont(boldFont, { family: 'Arial', weight: 'bold' });
      registerFont(boldFont, { family: 'Liberation Sans', weight: 'bold' });
    }
    fontsRegistered = true;
  } catch (err) {
    console.warn('Canvas font registration notice:', err.message);
  }
}

// Auto-run on require
initCanvasFonts();

module.exports = { initCanvasFonts };

