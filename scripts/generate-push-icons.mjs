import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

function iconSvg(size, android = false) {
  if (android) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96"><path fill="#fff" d="M25 18h31c14 0 24 9 24 22s-10 22-24 22H39v16H25V18Zm14 13v18h16c7 0 11-3 11-9s-4-9-11-9H39Z"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#F97316"/><text x="50%" y="68%" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size * 0.62}" font-weight="700" fill="#fff">P</text></svg>`;
}

async function writePng(file, size, android = false) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(iconSvg(size, android))).png().toFile(file);
}

await writePng(path.join(root, "public/icons/icon-192.png"), 192);
await writePng(path.join(root, "public/icons/badge-72.png"), 72);

if (process.argv.includes("--android")) {
  for (const [density, size] of Object.entries({ mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 })) {
    await writePng(path.join(root, `android/app/src/main/res/drawable-${density}/ic_stat_pimot.png`), size, true);
  }
}
