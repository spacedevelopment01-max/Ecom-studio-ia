/**
 * Retours du propriétaire (octobre 2026) : versions noir / fond sombre d'un logo complet, symbole coupé en deux dans
 * un emblème, couleurs de la marque ignorées par les styles de boutique, attente après le choix d'un logo.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { claimNext, enqueue, QUICK_JOBS } from "@/lib/jobs";
import { onDarkVersion, oneColourVersion } from "@/lib/logo-v2/artwork";
import { artworkSymbol, squareMark } from "@/lib/logo-v2/identity";
import { colorSchemes, DIRECTIONS } from "@/lib/theme/directions";

const W = 400;
const H = 400;
/** Emblème d'essai : disque brun foncé, cadran crème au centre, bandeau orange qui traverse le disque (le « nom »). */
async function emblem(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <circle cx="200" cy="200" r="150" fill="#4E0A0B"/><circle cx="200" cy="200" r="90" fill="#F5EBD7"/>
    <rect x="40" y="230" width="320" height="60" fill="#D2691E"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
const px = async (png: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

describe("Déclinaisons d'un logo complet", () => {
  it("noir seul : le dessin est gardé (cadran crème en réserve, bandeau coloré en encre), jamais une tache pleine", async () => {
    const mono = await oneColourVersion(await emblem(), "#111111");
    expect((await px(mono, 200, 170))[3]).toBe(0); // cadran crème → réserve
    expect(await px(mono, 200, 70)).toEqual([17, 17, 17, 255]); // disque brun → encre
    expect(await px(mono, 60, 260)).toEqual([17, 17, 17, 255]); // bandeau orange (le nom) → encre, pas perdu
    expect((await px(mono, 5, 5))[3]).toBe(0);
  });

  it("fond sombre : couleurs foncées de la marque gardées avec un liseré clair, au lieu d'être délavées en blanc", async () => {
    const src = await emblem();
    const dark = await onDarkVersion(src);
    const m = await sharp(dark).metadata();
    expect(m.width!).toBeGreaterThan(W); // liseré tout autour
    const off = (m.width! - W) / 2;
    const [r, g, b] = await px(dark, Math.round(off + 200), Math.round(off + 70));
    expect([r, g, b]).toEqual([0x4e, 0x0a, 0x0b]); // le brun reste brun
  });

  it("fond sombre : un logo noir (texte, contours) passe simplement en blanc", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><rect x="20" y="30" width="260" height="40" fill="#111111"/></svg>`;
    const dark = await onDarkVersion(await sharp(Buffer.from(svg)).png().toBuffer());
    expect((await sharp(dark).metadata()).width).toBe(300);
    expect((await px(dark, 150, 50)).slice(0, 3)).toEqual([255, 255, 255]);
  });

  it("emblème où le nom traverse le dessin : le symbole n'est jamais coupé en deux ; le logo entier sert de marque", async () => {
    const src = await emblem();
    expect(await artworkSymbol(src, { x: 0.1, y: 0.575, w: 0.8, h: 0.15 })).toBeNull();
    const sq = await squareMark(src);
    const m = await sharp(sq).metadata();
    expect([m.width, m.height]).toEqual([1024, 1024]);
  });

  it("symbole posé au-dessus du nom, séparé par un blanc : il est bien découpé", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="130" r="100" fill="#2F6B3A"/><rect x="60" y="280" width="280" height="50" fill="#222"/></svg>`;
    const sym = await artworkSymbol(await sharp(Buffer.from(svg)).png().toBuffer(), { x: 0.15, y: 0.7, w: 0.7, h: 0.125 });
    expect(sym).not.toBeNull();
    expect((await px(sym!, 512, 512)).slice(0, 3)).toEqual([0x2f, 0x6b, 0x3a]);
  });
});

describe("Styles de boutique : couleurs exactes de la marque", () => {
  const p = { primary: "#4E0A0B", secondary: "#C9A46A", accent: "#B8893E", light: "#FAF8F5", dark: "#2A0506" };
  it("boutons et accents = couleurs de la palette, telles quelles (pas de rouge vif ni de jaune inventés)", () => {
    const brand = new Set(Object.values(p));
    for (const d of DIRECTIONS) {
      const s = colorSchemes(d.id as any, p);
      expect(brand.has(s["scheme-1"].settings.accent), `${d.id} : ${s["scheme-1"].settings.accent}`).toBe(true);
      for (const { settings: x } of Object.values(s)) expect(x.accent.toUpperCase()).not.toBe("#FFF27A");
    }
  });
});

describe("File des tâches : appliquer le logo choisi passe avant les longues tâches", () => {
  it("une tâche courte (logo choisi) est servie avant une création plus ancienne", async () => {
    expect(QUICK_JOBS).toContain("brand.logo.v2.choose");
    const u = await createUser(`q${Date.now()}@test.fr`, "motdepasse-test", "Q");
    const long = enqueue({ userId: u.id, type: "test.long", payload: {}, runAt: Date.now() - 60_000 });
    const quick = enqueue({ userId: u.id, type: "brand.logo.v2.choose", payload: {} });
    // Base partagée entre fichiers de tests : d'autres tâches peuvent être en file ; on note l'ordre des deux nôtres.
    const order: string[] = [];
    for (let j = claimNext(["test.long", "brand.logo.v2.choose"]); j; j = claimNext(["test.long", "brand.logo.v2.choose"])) if (j.id === quick.id || j.id === long.id) order.push(j.id);
    expect(order).toEqual([quick.id, long.id]);
  });
});
