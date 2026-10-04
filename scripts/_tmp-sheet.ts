import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const [dir, out, hArg] = process.argv.slice(2);
const H = Number(hArg ?? 420);
const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/.test(f)).sort();
const tiles = await Promise.all(files.map(async (f) => { const b = await sharp(path.join(dir, f)).resize({ height: H }).jpeg().toBuffer(); const m = await sharp(b).metadata(); return { b, w: m.width!, h: m.height! }; }));
const W = 1800; const gap = 12;
let x = gap, y = gap, rowH = 0; const comps: any[] = [];
for (const t of tiles) { if (x + t.w > W) { x = gap; y += rowH + gap; rowH = 0; } comps.push({ input: t.b, left: x, top: y }); x += t.w + gap; rowH = Math.max(rowH, t.h); }
await sharp({ create: { width: W, height: y + rowH + gap, channels: 3, background: "#888" } }).composite(comps).jpeg({ quality: 85 }).toFile(out);
