import sharp from "sharp";

/** Stable fake supplier response: retrying a direction in a series returns the exact same bytes. */
export function injectedArtwork(name: string, territoryId: string, seriesOrdinal: number) {
  if (!Number.isSafeInteger(seriesOrdinal) || seriesOrdinal < 1) throw Error("Ordinal natif de série obligatoire.");
  const direction = Number(territoryId.replace(/\D/g, ""));
  if (![1, 2, 3].includes(direction)) throw Error("Direction de fixture inconnue.");
  // Renewal changes the composition itself, not just a caption/hash/metadata. Native dedup remains active.
  const n = direction + 3 * (seriesOrdinal - 1);
  const cells = Array.from({ length: 30 }, (_, i) => `<rect x="${80 + (i * (113 + n * 71)) % 800}" y="${80 + (i * (79 + n * 37)) % 650}" width="${20 + i * 23 % 120}" height="${20 + i * 31 % 100}" fill="${i % n === 0 ? "#244c45" : "#a26531"}"/>`).join("");
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="white"/>${cells}<text x="120" y="920" font-size="38">SIMULATION — ${name.replace(/[<>&]/g, " ")} — ${n}</text></svg>`)).png().toBuffer();
}
