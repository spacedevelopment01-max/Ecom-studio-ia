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
  it("essai réel du 7 novembre : symbole qui frôle le nom — pris forme par forme, entier, sans les lettres", async () => {
    // Fruit orange (haut), vague orange qui descend jusqu'à la ligne du nom, feuille bleu nuit ; lettres bleu nuit dessous.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <circle cx="200" cy="120" r="80" fill="#C2652B"/><path d="M110 190 Q200 150 300 200 L300 225 Q200 190 110 225 Z" fill="#C2652B"/>
      <ellipse cx="150" cy="45" rx="35" ry="15" fill="#1F2A3A"/>
      <rect x="60" y="212" width="30" height="80" fill="#1F2A3A"/><rect x="110" y="232" width="40" height="60" fill="#1F2A3A"/><rect x="170" y="232" width="40" height="60" fill="#1F2A3A"/>
      <rect x="230" y="232" width="40" height="60" fill="#1F2A3A"/><rect x="290" y="232" width="40" height="60" fill="#1F2A3A"/></svg>`;
    const src = await sharp(Buffer.from(svg)).png().toBuffer();
    const box = { x: 0.2, y: 0.57, w: 0.6, h: 0.18 }; // zone du nom lue par la relecture : trop étroite, comme en réel
    const { symbolByShapes } = await import("@/lib/logo-v2/identity");
    const sym = (await symbolByShapes(src, box))!;
    expect(sym).toBeTruthy();
    const { data, info } = await sharp(sym).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let navy = 0, orange = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) { if (data[i] < 60) navy++; else if (data[i] > 150) orange++; }
    expect(orange).toBeGreaterThan(navy); // le fruit et la vague sont gardés
    expect(navy).toBeGreaterThan(0); // la feuille aussi
    expect(navy).toBeLessThan(info.width * info.height * 0.05); // mais aucune lettre (5 lettres = bien plus de bleu nuit)
    expect(await artworkSymbol(src, box)).toBeTruthy();
    // Fond sombre : les lettres passent en blanc (lues), la feuille garde sa couleur avec un liseré clair, l'orange reste.
    const dark = await onDarkVersion(src, box);
    expect((await sharp(dark).metadata()).width).toBe(400); // pas de grand liseré autour du logo entier
    expect((await px(dark, 75, 270)).slice(0, 3)).toEqual([255, 255, 255]); // première lettre (hors de la zone lue) : blanche
    expect((await px(dark, 310, 260)).slice(0, 3)).toEqual([255, 255, 255]);
    expect((await px(dark, 150, 45)).slice(0, 3)).toEqual([0x1f, 0x2a, 0x3a]); // feuille : bleu nuit gardé
    expect((await px(dark, 113, 45))[3]).toBeGreaterThan(0); // liseré clair juste autour d'elle
    expect((await px(dark, 200, 120)).slice(0, 3)).toEqual([0xc2, 0x65, 0x2b]); // fruit : couleur gardée
  });
  it("logo illustré (essai réel du 7 novembre) : zone du nom retrouvée dans l'encre, ornements sous le nom écartés du symbole", async () => {
    // Illustration multicolore en haut, nom bleu nuit en bas (deux lignes de lettres), petits rayons dorés sous le nom.
    const letters = Array.from({ length: 6 }, (_, i) => `<rect x="${50 + i * 52}" y="270" width="36" height="50" fill="#1A3050"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <circle cx="200" cy="140" r="100" fill="#E8A040"/><circle cx="160" cy="120" r="30" fill="#5A2A6A"/><circle cx="240" cy="150" r="30" fill="#3A7A3A"/>
      ${letters}<rect x="190" y="340" width="6" height="25" fill="#E0B050"/><rect x="210" y="340" width="6" height="25" fill="#E0B050"/></svg>`;
    const src = await sharp(Buffer.from(svg)).png().toBuffer();
    const { nameBoxFromInk, symbolByShapes } = await import("@/lib/logo-v2/identity");
    // La relecture situait le nom trop haut : la zone est recalée sur l'encre bleu nuit.
    const box = (await nameBoxFromInk(src, { x: 0.1, y: 0.55, w: 0.8, h: 0.1 }))!;
    expect(box.y).toBeGreaterThan(0.65);
    expect(box.y).toBeLessThan(0.7);
    expect(box.y + box.h).toBeGreaterThan(0.79);
    // Loin de la zone lue : jamais une autre partie foncée du dessin.
    expect(await nameBoxFromInk(src, { x: 0.1, y: 0.05, w: 0.8, h: 0.1 })).toEqual({ x: 0.1, y: 0.05, w: 0.8, h: 0.1 });
    const sym = (await symbolByShapes(src, box))!;
    const { data } = await sharp(sym).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let navy = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200 && data[i] < 40 && data[i + 2] > 60) navy++;
    expect(navy).toBe(0); // aucune lettre
    // Ni les rayons sous le nom : le symbole est le disque seul (aussi haut que large), pas disque + rayons (1,6 fois).
    const t = await sharp(await sharp(sym).trim({ threshold: 5 }).png().toBuffer()).metadata();
    expect(t.height! / t.width!).toBeLessThan(1.1);
    const fond = await onDarkVersion(src, box);
    expect((await px(fond, 60, 290)).slice(0, 3)).toEqual([255, 255, 255]); // nom lisible sur fond sombre
  });

  it("illustration en nombreuses couleurs : gardée en couleurs sur la planche (jamais une tache blanche)", async () => {
    const { isDetailedSolidMark, colourCount } = await import("@/lib/media/identity-board");
    const cols = ["#E8A040", "#5A2A6A", "#3A7A3A", "#C03020", "#2050A0", "#F0D060", "#806040", "#A0C0E0", "#E07090", "#40A0A0", "#904010", "#D0D0A0"];
    const blobs = cols.map((c, i) => `<circle cx="${60 + (i % 4) * 90}" cy="${70 + Math.floor(i / 4) * 110}" r="42" fill="${c}"/>`).join("");
    const ill = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="360">${blobs}</svg>`)).png().toBuffer();
    const { data } = await sharp(ill).ensureAlpha().resize({ width: 200, height: 200, fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
    expect(colourCount(data)).toBeGreaterThanOrEqual(10);
    expect(await isDetailedSolidMark(ill)).toBe(true);
    const simple = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M20 180 L100 20 L180 180" stroke="#1F2A3A" stroke-width="14" fill="none"/></svg>`)).png().toBuffer();
    expect(await isDetailedSolidMark(simple)).toBe(false); // symbole au trait : toujours recolorable
  });
});
