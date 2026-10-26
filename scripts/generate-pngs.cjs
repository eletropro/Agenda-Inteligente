const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(len + 12);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePNG(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with row filter byte 0
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base gradient (Blue #2563eb to #1d4ed8)
      let r = 37;
      let g = 99;
      let b = 235;
      let a = 255;

      if (!isMaskable) {
        // Rounded corners
        const cornerRadius = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerRadius));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerRadius));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerRadius) {
          a = 0;
        }
      }

      if (a > 0) {
        // Gradient shift
        const gradT = (x + y) / (width + height);
        r = Math.round(37 * (1 - gradT * 0.2) + 29 * (gradT * 0.2));
        g = Math.round(99 * (1 - gradT * 0.2) + 78 * (gradT * 0.2));
        b = Math.round(235 * (1 - gradT * 0.2) + 216 * (gradT * 0.2));

        // Draw calendar square center
        const calW = width * 0.52;
        const calH = height * 0.48;
        const calX = cx - calW / 2;
        const calY = cy - calH / 2 - height * 0.04;

        if (x >= calX && x <= calX + calW && y >= calY && y <= calY + calH) {
          // Calendar header
          if (y <= calY + calH * 0.25) {
            r = 30; g = 64; b = 175; // darker blue
          } else {
            r = 255; g = 255; b = 255; // white
          }
        }

        // Draw microphone circle indicator in bottom right
        const micCx = cx + width * 0.22;
        const micCy = cy + height * 0.20;
        const micR = width * 0.20;
        const micDist = Math.sqrt((x - micCx) ** 2 + (y - micCy) ** 2);
        if (micDist <= micR) {
          if (micDist >= micR - width * 0.02) {
            r = 255; g = 255; b = 255; // White border
          } else {
            r = 56; g = 189; b = 248; // Cyan accent
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePNG(64, 64, false));

console.log('PWA icons created successfully in public/');
