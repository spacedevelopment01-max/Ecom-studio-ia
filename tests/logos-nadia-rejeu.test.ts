/**
 * Rejeu sans dépense des trois logos de Nadia (essai réel du 23 novembre 2026, diagnostic
 * `docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md` de la branche des essais) : ses trois identités, sa réponse de départ
 * et sa fiche, avec la vraie chaîne des images de la planche, un faux dessinateur qui note chaque demande et ses images
 * jointes, et un faux relecteur qui refuse tout, comme dans l'essai réel. Aucun appel payant.
 *
 * Données fidèles au diagnostic : noms, métiers, couleurs, typographies, ton, idées (ce qu'elle croit, ce qu'elle combat),
 * phrase de départ et notes de sa fiche ; « l'idée en mots simples » est celle que la correction du 23 novembre doit
 * donner (lignes écrites par le chef d'orchestre).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const sha = (b: Buffer | null | undefined) => (b ? crypto.createHash("sha256").update(b).digest("hex") : null);
const IMAGE_DE_DEPART = "Quelque chose de chaleureux, simple, pas trop chic. Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.";
const REFUS_ATTENDU = "Il ne veut surtout pas : « Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça. »";
const TON = ["chaleureux", "simple", "proche"];

/** Les trois identités de Nadia, telles que le diagnostic les rapporte. */
function identites() {
  const base = route("A");
  const une = (key: "A" | "B" | "C", o: { name: string; descriptor: string; palette: Record<string, string>; heading: string; belief: string; enemy: string; territory: string; simple: string }) => ({
    ...base, key, name: o.name, territory: o.territory, ground: "blanc" as const, palette: o.palette as never,
    fonts: { heading: o.heading, body: "manrope_n4" }, tone: { adjectives: TON, avoid: ["faire chic", "promettre l'impossible", "parler de luxe"] },
    board: { ...base.board, descriptor: o.descriptor, object: { ...base.board.object, kind: "pot" as const }, idea: { ...base.board.idea, belief: o.belief, enemy: o.enemy, simple: o.simple }, images: undefined },
  });
  return [
    une("A", {
      name: "Sillage", descriptor: "Bougies parfumées coulées à la main près de Lyon", palette: { dark: "#3A1F2B", primary: "#6E2A5E", secondary: "#F5E6DC", accent: "#C77E4F", light: "#FFFFFF" }, heading: "instrument_serif_n4",
      belief: "Une bonne bougie se sent dès qu'on soulève le couvercle.", enemy: "La bougie qu'on achète pour son joli pot et qui sent à peine une fois chez soi.", territory: "l'envie de s'approcher et de respirer",
      simple: "elle croit qu'une bougie doit vraiment sentir, et elle se bat contre les bougies qui sentent à peine",
    }),
    une("B", {
      name: "Halo", descriptor: "Bougies parfumées coulées à la main près de Lyon", palette: { dark: "#2A1A22", primary: "#2B4C8C", secondary: "#FFF0DC", accent: "#B4450F", light: "#FFF6EA" }, heading: "nunito_n8",
      belief: "Une bougie devrait être faite près de chez soi, par quelqu'un qu'on peut croiser au marché.", enemy: "La bougie fabriquée loin, en grande série, sans personne derrière.", territory: "la chaleur d'une maison le soir",
      simple: "elle croit qu'une bougie doit être faite tout près, par quelqu'un qu'on connaît, et elle se bat contre la fabrication lointaine en grande série",
    }),
    une("C", {
      name: "Pénombre", descriptor: "Bougies parfumées en cire de soja, Brignais", palette: { dark: "#1F1714", primary: "#2F6A4E", secondary: "#3A2B25", accent: "#E9A24F", light: "#FBEFDD" }, heading: "alfa_slab_one_n4",
      belief: "Une bougie est faite pour être allumée les soirs d'hiver, quand la nuit tombe tôt.", enemy: "La bougie de déco qu'on pose sur une étagère sans jamais l'allumer.", territory: "la maison chaude au retour",
      simple: "elle croit qu'une bougie est faite pour servir, et elle se bat contre les bougies de décoration qu'on n'utilise jamais",
    }),
  ];
}

describe("rejeu des trois logos de Nadia (faux dessinateur, faux relecteur qui refuse tout)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const C = await import("@/lib/syna-agent/brand-chain");
  const F = await import("@/lib/syna-agent/fiche");
  const J = await import("@/lib/syna-agent/journey");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { account, project } = await import("./conversation209-fixtures");

  /** Un logo différent à chaque dessin (une couleur par dessin), sur fond blanc net, sans trait sous le nom. */
  const COULEURS = ["#6E2A5E", "#C77E4F", "#3A1F2B", "#2B4C8C", "#B4450F", "#2A1A22", "#2F6A4E", "#E9A24F", "#1F1714", "#884422", "#226688", "#663399"];
  const logoNumero = (n: number) => sharp({ create: { width: 640, height: 480, channels: 3, background: "#FFFFFF" } }).composite(Array.from({ length: 6 }, (_v, i) => ({ input: { create: { width: 40, height: 90, channels: 3 as const, background: COULEURS[n % COULEURS.length] } }, left: 140 + i * 60, top: 180 }))).png().toBuffer();

  async function rejeu() {
    const user = await account(), projectId = project(user, "products") as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { j.start.image = { value: IMAGE_DE_DEPART, status: "answered", source: "client", at: Date.now() }; });
    F.addNotes(cid, [
      { sujet: "la flamme", value: "pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.", genre: "refuse", portee: "logo" },
      // Noté « pour tout » dans l'essai réel : c'est ce refus qui arrivait au dessinateur des logos.
      { sujet: "ses photos", value: "Mes mains je veux bien de temps en temps mais pas mon visage.", genre: "refuse", portee: "tout" },
    ]);
    const j = J.journeyOf(cid);
    const dessins: { id: string; prompt: string; avoid: string | null; examples: string | null; usage?: string; logos: number }[] = [];
    const sheets: Buffer[] = [];
    let n = 0, vus = 0;
    const ai: any = {
      research: async () => [], ask: async () => { throw new Error("aucun appel de texte attendu"); },
      draw: async (id: string, c: any) => {
        dessins.push({ id, prompt: c.prompt, avoid: sha(c.avoid), examples: sha(c.examples), usage: c.usage, logos: 0 });
        if (c.avoid) sheets.push(c.avoid);
        return logoNumero(n++);
      },
      // Comme dans l'essai réel : chaque logo est refusé (note 5), pour une raison de dessin.
      look: async (_id: string, c: any) => {
        const slot = (c.images as { label: string }[]).map((i) => i.label).find((l) => l === "logo")!;
        return { images: [{ slot, seen: "", score: 5, ok: false, read: [], why: `Refus ${++vus} : le symbole maison-fenêtre-cœur est un pictogramme banal ; trop sage face à la planche.`, defect: "autre" }] };
      },
    };
    const ctx: any = { step: async (_k: string, fn: () => unknown) => fn(), progress: () => {} };
    // La série, comme dans la chaîne (brand-chain.ts) : tous les logos dessinés, gardés ou refusés ; les gardés à part.
    const seriesLogos: Buffer[] = [], seriesKept: Buffer[] = [];
    const parIdentite: Record<string, number[]> = {};
    for (const x of identites()) {
      const avant = dessins.length;
      const r = await I.runBoardImages({ ctx, ai, who: { userId: user.id, projectId }, brief: "", kind: "produits", route: x as never, round: 1, slots: ["logo"], imagery: { look: "", logo: "", hero: "", object: "", site: "", signs: "", posts: ["", "", ""] }, madeLogos: [...seriesLogos], keptLogos: [...seriesKept], gouts: C.goutsDuClient(j, projectId), refusLogo: C.refusDuClientPourLeLogo(j, projectId) });
      seriesLogos.push(...r.logos);
      parIdentite[x.key] = dessins.slice(avant).map((_d, i) => avant + i);
      expect(r.route.board.images?.logo).toBeUndefined();
    }
    return { dessins, sheets, parIdentite, projectId, j };
  }

  it("les trois lignes « La marque » : aucun mot concret, aucun « comme » ; seulement l'idée et le ton", async () => {
    const { dessins, parIdentite } = await rejeu();
    const attendu: Record<string, string> = {
      A: "La marque : Elle croit qu'une bougie doit vraiment sentir, et elle se bat contre les bougies qui sentent à peine. Son ton : chaleureux, simple, proche.",
      B: "La marque : Elle croit qu'une bougie doit être faite tout près, par quelqu'un qu'on connaît, et elle se bat contre la fabrication lointaine en grande série. Son ton : chaleureux, simple, proche.",
      C: "La marque : Elle croit qu'une bougie est faite pour servir, et elle se bat contre les bougies de décoration qu'on n'utilise jamais. Son ton : chaleureux, simple, proche.",
    };
    for (const [k, idx] of Object.entries(parIdentite)) for (const i of idx) {
      const ligne = dessins[i].prompt.split("\n").find((l) => l.startsWith("La marque : "))!;
      expect(ligne, k).toBe(attendu[k]);
      expect(ligne).not.toMatch(I.COMPARAISON);
      for (const m of I.MOTS_CONCRETS) expect(ligne.toLowerCase()).not.toMatch(new RegExp(`(?<![\\p{L}])${m}s?(?![\\p{L}])`, "u"));
    }
  });

  it("les anciennes lignes, avec maison, soir, hiver ou une comparaison, sont refusées : seul le ton reste", () => {
    const [a, b, c] = identites();
    expect(I.ideeConcrete("le logo doit donner l'envie de s'approcher et de respirer, comme une maison qui sent bon", a as never)).toMatch(/une comparaison/);
    expect(I.ideeConcrete("la chaleur d'une maison le soir et la confiance qu'on a envers une voisine", b as never)).toMatch(/un mot concret/);
    expect(I.ideeConcrete("la maison chaude au retour, l'odeur qui revient chaque octobre", c as never)).toMatch(/un mot concret/);
    // Les mots du métier de la cliente (sa ligne de métier : matières, geste, lieu) sont refusés aussi ; sa catégorie non.
    expect(I.ideeConcrete("une bougie en cire de soja", c as never)).toMatch(/« cire »/);
    expect(I.ideeConcrete("une bougie coulée à Lyon", a as never)).toMatch(/un mot concret/);
    expect(I.ideeConcrete("une bougie qui sent vraiment", a as never)).toBeNull();
    // Sans idée en mots simples (planche d'avant, avant sa mise à niveau) : seul le ton va au dessinateur.
    for (const x of [a, b, c]) {
      const avant = { ...x, board: { ...x.board, idea: { ...x.board.idea, simple: undefined } } };
      expect(I.ligneDeLaMarque(avant as never)).toBe("Son ton : chaleureux, simple, proche.");
    }
  });

  it("la série : A2 reçoit A1, B1 reçoit A1 à A3, C1 reçoit A1 à B3, avec « je veux un logo complètement différent »", async () => {
    const { dessins, sheets, parIdentite } = await rejeu();
    expect(dessins).toHaveLength(9);
    expect(Object.values(parIdentite).map((v) => v.length)).toEqual([3, 3, 3]);
    // Le premier logo de la série est fait sans modèle.
    expect(dessins[0].avoid).toBeNull();
    expect(dessins[0].prompt).not.toMatch(/complètement différent/);
    // Chaque dessin suivant reçoit TOUS les logos déjà dessinés, gardés ou refusés, dans l'ordre (planche en grille).
    const logos = await Promise.all(Array.from({ length: 9 }, (_v, i) => logoNumero(i)));
    for (let i = 1; i < 9; i++) {
      expect(dessins[i].avoid, `dessin ${i + 1}`).toBe(sha(await I.logoSheet(logos.slice(0, i))));
      expect(dessins[i].prompt).toContain(i > 1 ? `L'image jointe montre les ${i} logos déjà faits pour ce client. Je veux un logo complètement différent de ceux-là` : "L'image jointe montre le logo déjà fait pour ce client. Je veux un logo complètement différent de celui-là");
    }
    // A2 (2e dessin) : A1 ; B1 (4e) : A1 à A3 ; C1 (7e) : A1 à B3. La planche est une grille, sans limite à 4.
    const taille = async (b: Buffer) => { const m = await sharp(b).metadata(); return `${m.width}x${m.height}`; };
    expect(await taille(sheets[0])).toBe("512x512");
    expect(await taille(sheets[2])).toBe("1024x1024"); // B1 : 3 logos en grille de 2 sur 2
    expect(await taille(sheets[5])).toBe("1536x1024"); // C1 : 6 logos en grille de 3 sur 2
    expect(await taille(sheets[7])).toBe("1536x1536"); // C3 : 8 logos en grille de 3 sur 3
  });

  it("la phrase de refus : une seule fois, mot pour mot, avec « Il ne veut surtout pas », sans mains ni visage ; aucune ligne des écritures", async () => {
    const { dessins, projectId, j } = await rejeu();
    expect(C.refusDuClientPourLeLogo(j, projectId)).toBe(REFUS_ATTENDU);
    for (const d of dessins) {
      expect(d.prompt.split(REFUS_ATTENDU)).toHaveLength(2);
      expect(d.prompt.match(/Il ne veut surtout pas/g)).toHaveLength(1);
      expect(d.prompt).not.toMatch(/Il ne veut pas|mains|visage|chaleureux, simple, pas trop chic/);
      expect(d.prompt).not.toMatch(/étiquette, emballage|Fais plus simple/);
    }
    // Les reprises reçoivent toutes les raisons des refus.
    expect(dessins[2].prompt).toMatch(/à corriger TOUTES à la fois[\s\S]*1\. « Refus 1 : [\s\S]*2\. « Refus 2 : /);
    // Le refus des mains et du visage est des images, jamais « pour tout » ; le relecteur, lui, le garde dans ses goûts.
    const notes = F.notesDuProjet(projectId);
    expect(F.porteeOf(notes.find((x) => x.sujet === "ses photos")!)).toBe("images");
    expect(F.refusPourLeLogo(notes)).toEqual(["pas de flamme dessinée dans le logo, toutes les marques de bougies font ça."]);
    expect(C.goutsDuClient(j, projectId)).toContain("Mes mains je veux bien de temps en temps mais pas mon visage.");
  });

  it("la planche des 50 logos aimés jointe à chaque demande, sans changement ; l'usage « logo » partout", async () => {
    const { dessins } = await rejeu();
    const aimes = sha(await I.planchedesLogosAimes());
    expect(aimes).toBeTruthy();
    // Même fichier, même taille (1200 points au plus), même annonce « seulement comme exemples » qu'avant.
    const meta = await sharp((await I.planchedesLogosAimes())!).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1200);
    const { imageReferencePrompt } = await import("@/lib/ai/media-providers");
    expect(imageReferencePrompt("x", ["avoid", "examples"])).toContain("image 2 : exemples de logos que j'aime, seulement comme exemples : n'en recopie aucun");
    for (const d of dessins) {
      expect(d.examples).toBe(aimes);
      expect(d.usage).toBe("logo");
    }
  });
});

describe("le dessin d'un logo ne passe jamais par un autre usage que « logo » (politique du 18 octobre)", () => {
  it("la chaîne de la marque, le symbole tiré du logo et le devis prennent la route des logos", () => {
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    const fin = fs.readFileSync("src/lib/syna-agent/brand-finish.ts", "utf8");
    // Le dessinateur des planches : un logo part chez aiBoardLogo (usage « logo »), jamais chez aiSiteImageHd (usage « scene »).
    expect(chain).toContain('draw: (id, c) => withTrace(scope(`brand-${id}`), () => c.usage === "logo"\n      ? aiBoardLogo(');
    expect(img).toContain('...(slot === "logo" ? { usage: "logo" as const } : {})');
    expect(fin).toContain('logo: await onWhite(logoPng), usage: "logo" });');
    // Le devis : le logo et le symbole au prix du modèle des logos.
    expect(chain).toContain('const imageUnitMax = (aspect: ImageAspect, references: number, logo = false) => photoRequestMaxMicro(logo ? LOGO_ROUTE : boardImageRoute(),');
    expect(chain).toContain('imageUnitMax(SLOT_ASPECT[slot], SLOT_REFERENCES[slot], slot === "logo")');
    expect(chain).toContain('const unit = imageUnitMax("1:1", 1, true);');
    // Chaque appel au dessinateur des planches qui joint des logos (déjà faits, aimés) est un dessin de logo.
    const media = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    const corps = media.slice(media.indexOf("export async function aiBoardLogo"), media.indexOf("/** Coût maximal d'une maquette de site"));
    expect(corps).toContain('usage: "logo"');
    expect(corps).toContain("withQuotedImageRoute(LOGO_ROUTE,");
    for (const f of ["src/lib/syna-agent/brand-chain.ts", "src/lib/syna-agent/brand-finish.ts", "src/lib/syna-agent/brand-images.ts"]) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/ai\.draw\(([^;]*)\);/g)) if (/examples|avoid|symbol/.test(m[1]) && !/brand-images/.test(f)) expect(m[1], f).toMatch(/usage: "logo"/);
    }
  });
});
