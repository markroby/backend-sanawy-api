// utils/idCard.js
const { createCanvas, loadImage } = require('canvas');
const bwipjs = require('bwip-js');

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitText(ctx, text, basePx, maxWidth, font = 'Arial', bold = true) {
  let size = basePx;
  while (size > 10) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

// Generate a barcode PNG buffer with given "height" parameter
async function makeBarcodeBuffer(text, { scaleX = 14, scaleY = 4, height = 110 } = {}) {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: String(text),
    includetext: false,
    scaleX,
    scaleY,
    height,
    backgroundcolor: 'FFFFFF'
  });
}

// Generate a barcode image that FITS a target box by WIDTH first (maximizes width),
// then reduces its source height until the scaled height fits the target height.
async function makeBarcodeToFit(text, targetW, targetH) {
  // try these heights until the width-fit also respects height
  const heights = [120, 110, 100, 90, 80, 70, 60, 50, 45, 40];

  for (const h of heights) {
    const buf = await makeBarcodeBuffer(text, { scaleX: 14, scaleY: 4, height: h });
    const img = await loadImage('data:image/png;base64,' + buf.toString('base64'));
    const scale = targetW / img.width;        // width-first
    const scaledH = Math.floor(img.height * scale);
    if (scaledH <= targetH) {
      // success: return image + exact draw sizes
      return { img, drawW: targetW, drawH: scaledH };
    }
  }

  // fallback: last height, clamp by height (should be rare)
  const buf = await makeBarcodeBuffer(text, { scaleX: 14, scaleY: 4, height: 40 });
  const img = await loadImage('data:image/png;base64,' + buf.toString('base64'));
  const scale = targetH / img.height;
  return { img, drawW: Math.floor(img.width * scale), drawH: targetH };
}

async function generateIdCardPng({ name, number }) {
  const W = 960, H = 640;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Card background
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 2, 2, W - 4, H - 4, 40);
  ctx.fill();

  // Accent line
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#7C3AED');
  grad.addColorStop(1, '#00D1FF');
  ctx.fillStyle = grad;
  ctx.fillRect(20, 20, W - 40, 6);

  // Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#111827';
  const nameSize = fitText(ctx, name, 58, W - 160);
  ctx.font = `bold ${nameSize}px Arial`;
  ctx.fillText(name, W / 2, 80);

  // ===== Barcode zone: exactly ~90% width, clearly shorter height =====
  const zoneW = Math.floor(W * 0.90);  // ~90% of card width
  const zoneH = 160;                   // shorter height (tweak 140–180 as you like)
  const zoneX = Math.floor((W - zoneW) / 2);
  const zoneY = 270;                   // vertical placement

  // Build a barcode that fills width and fits height
  const { img, drawW, drawH } = await makeBarcodeToFit(number, zoneW, zoneH);

  const drawX = Math.floor(zoneX + (zoneW - drawW) / 2);
  const drawY = Math.floor(zoneY + (zoneH - drawH) / 2);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // Phone number
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#111827';
  const phoneSize = fitText(ctx, String(number), 54, W - 160);
  ctx.font = `bold ${phoneSize}px Arial`;
  ctx.fillText(String(number), W / 2, H - 60);

    // Footer tagline (bottom-left)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#6B7280';               // subtle gray
  ctx.font = 'italic 22px Arial';          // small & classy
  ctx.fillText('Sanawy Bible With You', 30, H - 20);


  return canvas.toBuffer('image/png');
}

module.exports = { generateIdCardPng };
