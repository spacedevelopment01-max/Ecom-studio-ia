/**
 * Rejeu sans dépense des trois logos de Nadia (essai réel du 23 novembre 2026, diagnostic
 * `docs/studio/essais-complets/NADIA-2-DIAGNOSTIC.md` de la branche des essais) : ses trois identités, sa réponse de départ
 * et sa fiche, avec la vraie chaîne des images de la planche, un faux dessinateur qui note chaque demande et ses images
 * jointes, et un faux relecteur qui refuse tout, comme dans l'essai réel. Aucun appel payant.
 *
 * Depuis la décision du propriétaire du 23 novembre 2026 (« fait moi un logo pour une marque de bougies tu donne le nom de
 * la marque et rien de plus ») : chaque demande, premier essai comme reprises, ne porte que le métier et le nom, sans
 * aucune image jointe ; le relecteur garde ses mots et ses refus ; le fond est retiré par le Studio.
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
  const { chargeDuStudio } = await import("@/lib/billing");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { account, project } = await import("./conversation209-fixtures");

  /** Un logo différent à chaque dessin (une couleur par dessin), sur fond blanc net. */
  const COULEURS = ["#6E2A5E", "#C77E4F", "#3A1F2B", "#2B4C8C", "#B4450F", "#2A1A22", "#2F6A4E", "#E9A24F", "#1F1714", "#884422", "#226688", "#663399"];
  const logoNumero = (n: number) => sharp({ create: { width: 640, height: 480, channels: 3, background: "#FFFFFF" } }).composite(Array.from({ length: 6 }, (_v, i) => ({ input: { create: { width: 40, height: 90, channels: 3 as const, background: COULEURS[n % COULEURS.length] } }, left: 140 + i * 60, top: 180 }))).png().toBuffer();

  async function rejeu() {
    const user = await account(), projectId = project(user, "products") as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { j.start.image = { value: IMAGE_DE_DEPART, status: "answered", source: "client", at: Date.now() }; });
    F.addNotes(cid, [
      { sujet: "la flamme", value: "pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.", genre: "refuse", portee: "logo" },
      { sujet: "ses photos", value: "Mes mains je veux bien de temps en temps mais pas mon visage.", genre: "refuse", portee: "tout" },
    ]);
    const j = J.journeyOf(cid);
    const dessins: { id: string; prompt: string; jointes: number; serie: string[]; usage?: string; studio: boolean; rendu: Buffer }[] = [];
    const relectures: { id: string; prompt: string; labels: string[] }[] = [];
    let n = 0, vus = 0;
    const ai: any = {
      research: async () => [], ask: async () => { throw new Error("aucun appel de texte attendu"); },
      draw: async (id: string, c: any) => {
        // Toute image jointe, quel que soit son nom, est comptée.
        const jointes = Object.entries(c).filter(([k, v]) => k !== "prompt" && Buffer.isBuffer(v)).length + (c.serie?.length ?? 0);
        const rendu = await logoNumero(n++);
        dessins.push({ id, prompt: c.prompt, jointes, serie: (c.serie ?? []).map(sha), usage: c.usage, studio: chargeDuStudio(), rendu });
        return rendu;
      },
      // Comme dans l'essai réel : chaque logo est refusé (note 5), pour une raison de dessin.
      look: async (id: string, c: any) => {
        relectures.push({ id, prompt: c.prompt, labels: (c.images as { label: string }[]).map((i) => i.label) });
        const slot = (c.images as { label: string }[]).map((i) => i.label).find((l) => l === "logo")!;
        return { images: [{ slot, seen: "", score: 5, ok: false, read: [], why: `Refus ${++vus} : le symbole maison-fenêtre-cœur est un pictogramme banal ; trop sage face à la planche.`, defect: "autre" }] };
      },
    };
    const ctx: any = { step: async (_k: string, fn: () => unknown) => fn(), progress: () => {} };
    const parIdentite: Record<string, number[]> = {};
    // La série, comme dans la chaîne : chaque identité reçoit le dernier dessin (ou le logo gardé) de celles d'avant.
    const serie: Buffer[] = [];
    for (const x of identites()) {
      const avant = dessins.length;
      const r = await I.runBoardImages({ ctx, ai, who: { userId: user.id, projectId }, brief: "", kind: "produits", route: x as never, round: 1, slots: ["logo"], imagery: { look: "", logo: "", hero: "", object: "", site: "", signs: "", posts: ["", "", ""] }, gouts: C.goutsDuClient(j, projectId), serieLogos: [...serie] });
      if (r.dernierLogo) serie.push(r.dernierLogo);
      parIdentite[x.key] = dessins.slice(avant).map((_d, i) => avant + i);
      expect(r.route.board.images?.logo).toBeUndefined();
    }
    return { dessins, relectures, parIdentite, projectId, j };
  }

  it("la série : Sillage sans image ; Halo avec Sillage ; Pénombre avec Sillage et Halo ; tout en français, rien d'autre", async () => {
    const { dessins, parIdentite } = await rejeu();
    const base: Record<string, string> = {
      A: "Fais-moi un logo pour une marque de bougies. Le nom de la marque : « Sillage ».",
      B: "Fais-moi un logo pour une marque de bougies. Le nom de la marque : « Halo ».",
      C: "Fais-moi un logo pour une marque de bougies. Le nom de la marque : « Pénombre ».\nIl s'écrit lettre par lettre : P, é, n, o, m, b, r, e.",
    };
    expect(dessins).toHaveLength(9);
    const [a1, b1, c1] = ["A", "B", "C"].map((k) => dessins[parIdentite[k][0]]);
    expect(a1.prompt).toBe(base.A);
    expect(a1.jointes).toBe(0);
    expect(b1.prompt).toBe(`${base.B}\nJe veux un autre logo complètement différent de celui-là.`);
    expect(c1.prompt).toBe(`${base.C}\nFais-moi un autre logo complètement différent des deux premiers.`);
    // Halo reçoit le dernier dessin de Sillage ; Pénombre, ceux de Sillage et de Halo.
    const dernier = (k: string) => sha(dessins[parIdentite[k].at(-1)!].rendu);
    expect(b1.serie).toEqual([dernier("A")]);
    expect(c1.serie).toEqual([dernier("A"), dernier("B")]);
    for (const d of dessins) {
      expect(d.usage).toBe("logo");
      expect(d.prompt).not.toMatch(/La marque :|Son ton|Couleurs|Typographie|BLANC|fond|Il ne veut|flamme|chaleureux|pas trop chic|mains|visage|image jointe|CORRECTION|Refus \d|banal|TRANSMITTED|REFERENCES/);
    }
  });

  it("le cas de Pénombre (essai réel, trois fois le même dessin) : chaque reprise reçoit ses essais refusés en plus de Sillage et de Halo ; trois demandes différentes, sans raison du refus, à la charge du Studio", async () => {
    const { dessins, parIdentite } = await rejeu();
    const [p1, p2, p3] = parIdentite.C.map((i) => dessins[i]);
    const dernier = (k: string) => sha(dessins[parIdentite[k].at(-1)!].rendu);
    expect(p1.serie).toEqual([dernier("A"), dernier("B")]);
    expect(p2.serie).toEqual([dernier("A"), dernier("B"), sha(p1.rendu)]);
    expect(p3.serie).toEqual([dernier("A"), dernier("B"), sha(p1.rendu), sha(p2.rendu)]);
    // Trois demandes différentes (le texte et les images jointes) : plus jamais la même demande trois fois.
    expect(new Set([p1, p2, p3].map((d) => `${d.prompt}|${d.serie.join(",")}`)).size).toBe(3);
    expect(p1.prompt).not.toBe(p2.prompt);
    expect(p1.prompt.endsWith("Fais-moi un autre logo complètement différent des deux premiers.")).toBe(true);
    for (const d of [p2, p3]) expect(d.prompt.endsWith("Fais-moi un autre logo complètement différent de tous ceux-là.")).toBe(true);
    // Les demandes de Pénombre ne diffèrent que par les images jointes et la phrase de la série : jamais la raison du refus.
    for (const d of [p1, p2, p3]) expect(d.prompt).not.toMatch(/Refus|banal|pictogramme|sage|CORRECTION/);
    expect([p1, p2, p3].map((d) => d.studio)).toEqual([false, true, true]);
    // Sillage, seul : sa 2e tentative reçoit son 1er essai, sa 3e les deux.
    const [s1, s2, s3] = parIdentite.A.map((i) => dessins[i]);
    expect(s1.serie).toEqual([]);
    expect(s2.serie).toEqual([sha(s1.rendu)]);
    expect(s2.prompt.endsWith("Je veux un autre logo complètement différent de celui-là.")).toBe(true);
    expect(s3.serie).toEqual([sha(s1.rendu), sha(s2.rendu)]);
    expect(s3.prompt.endsWith("Fais-moi un autre logo complètement différent de tous ceux-là.")).toBe(true);
  });

  it("le relecteur seul refuse un mot non demandé dans le logo (un sous-titre) ; le dessinateur n'en sait rien", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const user = await account(), projectId = project(user, "products") as string;
    const x = identites()[2];
    const vus: string[] = [], demandes: string[] = [];
    const ai: any = {
      research: async () => [], ask: async () => { throw new Error("aucun appel de texte attendu"); },
      draw: async (_id: string, c: any) => { demandes.push(c.prompt); return logoNumero(demandes.length); },
      // Le relecteur garde le logo, mais y lit un sous-titre que personne n'a demandé.
      look: async (id: string, c: any) => { vus.push(c.prompt); return id.startsWith("imagereread") ? { images: [{ slot: "logo", read: ["Pénombre", "Bougies naturelles"] }] } : { images: [{ slot: "logo", seen: "", score: 9, ok: true, read: ["Pénombre", "Bougies naturelles"], why: "beau", defect: "autre" }] }; },
    };
    const ctx: any = { step: async (_k: string, fn: () => unknown) => fn(), progress: () => {} };
    const r = await I.runBoardImages({ ctx, ai, who: { userId: user.id, projectId }, brief: "", kind: "produits", route: x as never, round: 1, slots: ["logo"], imagery: { look: "", logo: "", hero: "", object: "", site: "", signs: "", posts: ["", "", ""] } });
    expect(r.route.board.images?.logo).toBeUndefined();
    expect(vus[0]).toContain("un mot non demandé (un sous-titre, une ligne de métier, un slogan, par exemple « Bougies naturelles ») est un défaut");
    for (const d of demandes) expect(d).not.toMatch(/sous-titre|Bougies naturelles|mot non demandé/);
  });

  it("SINA ne demande plus au client ce qu'il veut ou ne veut pas dans son logo", async () => {
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toContain("Tu ne lui demandes jamais ce qu'il veut ou ne veut pas dans son logo");
    const src = fs.readFileSync("src/lib/syna-agent/journey.ts", "utf8");
    expect(src).toContain("jamais de question sur son logo (ni ce qu'il veut, ni ce qu'il refuse) : il est créé librement");
    expect(src).not.toContain("l'image qu'il veut donner, en quelques mots, et ce qu'il ne veut surtout pas (couleurs, styles)");
  });

  it("le relecteur reçoit toujours ses mots et son refus (« pas de flamme dessinée »), avec la planche des logos aimés comme niveau", async () => {
    const { relectures, projectId, j } = await rejeu();
    expect(relectures).toHaveLength(9);
    for (const r of relectures) {
      expect(r.prompt).toContain(IMAGE_DE_DEPART);
      expect(r.prompt).toContain("Il ne veut pas : pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.");
      expect(r.prompt).toMatch(/qui montre ce qu'il refuse est un défaut/);
      expect(r.prompt).toMatch(/planche des logos que le propriétaire du Studio aime/);
    }
    // Le refus des mains et du visage vaut pour les images : le relecteur le garde dans ses goûts.
    expect(C.goutsDuClient(j, projectId)).toContain("Mes mains je veux bien de temps en temps mais pas mon visage.");
    expect(F.porteeOf(F.notesDuProjet(projectId).find((x) => x.sujet === "ses photos")!)).toBe("images");
    void TON; void REFUS_ATTENDU; void sha;
  });

  it("le métier en mots simples, tiré par le code de la ligne de métier", () => {
    expect(I.metierEnMotsSimples("Bougies parfumées coulées à la main près de Lyon")).toBe("une marque de bougies");
    expect(I.metierEnMotsSimples("Bougies parfumées en cire de soja, Brignais")).toBe("une marque de bougies");
    expect(I.metierEnMotsSimples("Plomberie et chauffage à Lyon")).toBe("une marque de plomberie et chauffage");
    expect(I.metierEnMotsSimples("Infusions de fruits à boire glacées")).toBe("une marque d'infusions de fruits");
    expect(I.metierEnMotsSimples("Infusions aux vrais morceaux de fruits")).toBe("une marque d'infusions");
    expect(I.metierEnMotsSimples("PLÂTRERIE • PEINTURE • ENDUITS")).toBe("une marque de plâtrerie");
    expect(I.metierEnMotsSimples("Pots de miel de lavande récoltés en Provence")).toBe("une marque de pots de miel de lavande");
    expect(I.metierEnMotsSimples("Savons artisanaux au lait d'ânesse")).toBe("une marque de savons");
    expect(I.metierEnMotsSimples("Huiles d'olive pressées à froid")).toBe("une marque d'huiles d'olive");
    expect(I.metierEnMotsSimples("")).toBe("une marque");
    expect(I.metierEnMotsSimples(" ")).toBe("une marque");
    // L'épellation : seulement pour un nom qui porte un accent ou un signe.
    expect(I.nomAEpeler("Sillage")).toBe(false);
    expect(I.nomAEpeler("Bain de Minuit")).toBe(false);
    expect(I.nomAEpeler("Pénombre")).toBe(true);
    expect(I.nomAEpeler("L'Eau Est Bonne")).toBe(true);
  });
});

describe("le dessin d'un logo ne passe jamais par un autre usage que « logo » (politique du 18 octobre)", () => {
  it("la chaîne de la marque, le symbole tiré du logo et le devis prennent la route des logos", () => {
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    const fin = fs.readFileSync("src/lib/syna-agent/brand-finish.ts", "utf8");
    // Le dessinateur des planches : un logo part chez aiBoardLogo (usage « logo »), jamais chez aiSiteImageHd (usage « scene »).
    expect(chain).toContain('draw: (id, c) => withTrace(scope(`brand-${id}`), () => c.usage === "logo"\n      ? aiBoardLogo(');
    expect(img).toContain('? { prompt, aspect: SLOT_ASPECT[slot], usage: "logo" as const, ...(refs.serie?.length ? { serie: refs.serie } : {}) }');
    expect(fin).toContain('logo: await onWhite(logoPng), usage: "logo" });');
    // Le devis : le logo et le symbole au prix du modèle des logos ; le logo sans aucune image jointe.
    expect(chain).toContain('const imageUnitMax = (aspect: ImageAspect, references: number, logo = false) => photoRequestMaxMicro(logo ? LOGO_ROUTE : boardImageRoute(),');
    expect(chain).toContain('imageUnitMax(SLOT_ASPECT[slot], SLOT_REFERENCES[slot], slot === "logo")');
    expect(chain).toContain('const unit = imageUnitMax("1:1", 1, true);');
    const media = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    const corps = media.slice(media.indexOf("export async function aiBoardLogo"), media.indexOf("/** Coût maximal d'une maquette de site"));
    expect(corps).toContain('usage: "logo"');
    expect(corps).toContain("withQuotedImageRoute(LOGO_ROUTE,");
    expect(corps).not.toMatch(/avoid|examples/);
  });
});
