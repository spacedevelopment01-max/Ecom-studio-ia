/**
 * LA PLANCHE DE MARQUE PAR OPENAI (accord écrit du propriétaire du 24 novembre 2026) : les fichiers fixes et leurs
 * empreintes, le texte des preuves refait exactement pour Tenon et Racine, la phrase des données vérifiées, le contrôle
 * gratuit des valeurs du métier, l'appel d'image jusqu'à OpenAI simulé, la relecture et la reprise unique, la tâche de
 * fond (points de reprise), le choix et le devis. Aucun appel payant, aucune clé réelle, aucune vérification réseau.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const oa = { calls: [] as any[], panne: false };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      const usage = { input_tokens: 4153, output_tokens: 3811, input_tokens_details: { text_tokens: 1096, image_tokens: 3057 } };
      const done = (async () => {
        if (oa.panne) { const e: any = new Error("502 upstream request failed"); e.status = 502; throw e; }
        const b64 = (await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F4EFE6" } }).png().toBuffer()).toString("base64");
        return { data: [{ b64_json: b64 }], usage, size: "1536x2304", quality: "xhigh", background: "opaque", output_format: "png" };
      })();
      return Object.assign(done, { withResponse: async () => ({ data: await done, request_id: `req_${kind}_${oa.calls.length}` }) });
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length, data: b }) };
});

const F = "tests/fixtures/planche-de-marque";
const sha = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");

/** Les valeurs des preuves, lues dans les prompt.txt de Tenon et de Racine. */
const TENON = {
  metier: "une entreprise de menuiserie qui réalise des cuisines et des dressings sur mesure", traits: ["artisanale", "chaleureuse", "précise", "haut de gamme"],
  emotion: "la vie dans une cuisine sur mesure", site: "marque" as const, appel: "devis" as const,
  images: ["famille dans sa cuisine sur mesure", "dressing rangé", "gros plan bois / assemblage", "atelier et savoir-faire", "détail de quincaillerie", "lumière naturelle intérieure"],
  produits: ["cuisines", "dressings", "rangements sur mesure"],
};
const RACINE = {
  metier: "une pépinière qui cultive et vend en ligne des plantes, des arbustes et des jeunes arbres", traits: ["vivante", "chaleureuse", "généreuse", "naturelle"],
  emotion: "le plaisir de voir pousser ses plantes", site: "boutique" as const,
  images: ["plante dans un intérieur lumineux", "jardin qui pousse", "gros plan feuillage / terre / racines", "plante seule en studio ou lifestyle", "pépinière et serres", "mise en pot"],
  produits: ["plantes d'intérieur", "arbustes", "jeunes arbres"],
};

describe("les fichiers fixes et le texte des preuves", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  it("la disposition est celle des preuves, à l'octet près (empreinte), en 1536 × 2304 ; le texte de base aussi", async () => {
    const d = fs.readFileSync(`assets/planche-de-marque/${P.DISPOSITION.fichier}`);
    expect(sha(d)).toBe("b4e2e0438d9467ffecfef30d450617299b5d547ff35b01d8e7b049f537e152f5");
    expect(P.DISPOSITION.sha256).toBe(sha(d));
    const m = await sharp(d).metadata();
    expect([m.width, m.height]).toEqual([1536, 2304]);
    const t = fs.readFileSync(`assets/planche-de-marque/${P.TEXTE_DE_BASE.fichier}`);
    expect(sha(t)).toBe(P.TEXTE_DE_BASE.sha256);
    expect(P.texteDeBase()).toBe(t.toString("utf8"));
    // Les métiers des animaux : la planche de Racine, validée par le propriétaire le 25 novembre 2026 (« Oui »), rangée telle
    // quelle (empreinte vérifiée, même taille que la disposition standard).
    expect(P.DISPOSITION_DES_ANIMAUX).not.toBeNull();
    const a = fs.readFileSync(`assets/planche-de-marque/${P.DISPOSITION_DES_ANIMAUX!.fichier}`);
    expect(sha(a)).toBe(P.DISPOSITION_DES_ANIMAUX!.sha256);
    const ma = await sharp(a).metadata();
    expect([ma.width, ma.height]).toEqual([1536, 2304]);
  });
  it("refait EXACTEMENT les prompt.txt de Tenon et de Racine à partir de leurs valeurs (le reste mot pour mot)", () => {
    expect(P.texteDesPreuves("Tenon", TENON)).toBe(fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8"));
    expect(P.texteDesPreuves("Racine", RACINE)).toBe(fs.readFileSync(`${F}/racine-prompt.txt`, "utf8"));
    // Les requêtes de preuve envoyaient ces mêmes textes.
    expect(JSON.parse(fs.readFileSync(`${F}/tenon-requete.json`, "utf8")).champs.prompt).toBe(fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8"));
    expect(JSON.parse(fs.readFileSync(`${F}/racine-requete.json`, "utf8")).champs.prompt).toBe(fs.readFileSync(`${F}/racine-prompt.txt`, "utf8"));
  });
  it("seules les six parties changent : le nom (5 fois), la ligne de la marque, l'émotion, le type de site (4 lignes), les images, les produits", () => {
    const base = P.texteDeBase().split("\n"), t = P.texteDesPreuves("Tenon", TENON).split("\n");
    expect(t.length).toBe(base.length);
    const changees = base.map((l, i) => (l === t[i] ? null : i + 1)).filter(Boolean);
    expect(changees).toEqual([1, 5, 7, 13, 45, 54, 60, 64, 65, 71, 72, 73, 74, 75, 76, 85, 86, 87, 88]);
    expect(P.texteDesPreuves("Tenon", TENON).split("Tenon").length - 1).toBe(5);
    // Une boutique garde « e-commerce » et « - CTA » seul ; moins de trois produits : moins de lignes, jamais un inventé.
    const deux = P.texteDesPreuves("Racine", { ...RACINE, produits: ["arbustes", "jeunes arbres"] });
    expect(deux).toContain("Montrer clairement :\n- arbustes\n- jeunes arbres\nLes visuels doivent être propres, désirables, e-commerce, avec");
    expect(P.texteDesPreuves("Tenon", { ...TENON, appel: "rendez-vous" })).toContain("- CTA (prise de rendez-vous)\n- réalisations / collections\n");
  });
});

describe("la phrase des données vérifiées", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  it("domaine libre : « disponible » ; non vérifiable : « à vérifier » ; tout pris : « Adresse à choisir » ; à la toute fin du texte", () => {
    const d = P.domaineDeLaPlanche({ taken: ["tenon.fr"], free: ["tenon.com"], unknown: [], at: 1 }, "Tenon");
    expect(d).toEqual({ domaine: "tenon.com", statut: "disponible" });
    expect(P.phraseDesDonneesVerifiees({ nom: "Tenon", annee: 2026, domaine: d, personnes: true })).toBe("Dans le bloc 10, à la place de la mention « disponibilité à vérifier », écris exactement « tenon.com — disponible » et « © 2026 Tenon » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis.");
    const v = P.domaineDeLaPlanche({ taken: [], free: [], unknown: ["tenon.fr", "tenon.com"], at: 1 }, "Tenon");
    expect(v).toEqual({ domaine: "tenon.fr", statut: "a_verifier" });
    expect(P.phraseDesDonneesVerifiees({ nom: "Tenon", annee: 2027, domaine: v, personnes: true })).toBe("Dans le bloc 10, à la place de la mention « disponibilité à vérifier », écris exactement « tenon.fr — à vérifier » et « © 2027 Tenon » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis.");
    const pris = P.domaineDeLaPlanche({ taken: ["tenon.fr", "tenon.com", "tenonfrance.fr"], free: [], unknown: [], at: 1 }, "Tenon");
    expect(pris.statut).toBe("adresse_a_choisir");
    expect(P.phraseDesDonneesVerifiees({ nom: "Tenon", annee: 2026, domaine: pris, personnes: true })).toContain("écris exactement « Adresse à choisir » et « © 2026 Tenon »");
    // Sans photo de personne ni accord écrit : « aucune personne visible », dans la même phrase.
    expect(P.phraseDesDonneesVerifiees({ nom: "Tenon", annee: 2026, domaine: d, personnes: false })).toMatch(/ni aucun avis ; aucune personne visible\.$/);
    const t = P.texteDeLaPlanche({ nom: "Tenon", valeurs: TENON, annee: 2026, domaine: d, personnes: false });
    expect(t.startsWith(fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8"))).toBe(true);
    expect(t.endsWith("ni aucun avis ; aucune personne visible.")).toBe(true);
    // La reprise : les raisons du relecteur à la toute fin.
    expect(P.texteDeLaPlanche({ nom: "Tenon", valeurs: TENON, annee: 2026, domaine: d, personnes: false, raisons: ["une faute"] }).endsWith("aucune personne visible.\n\nÀ corriger : une faute.")).toBe(true);
  });
  it("l'année vient de l'horloge", async () => {
    const T = await import("@/lib/syna-agent/planche-de-marque-tache");
    T.plancheDeps.annee = undefined;
    expect(T.anneeEnCours()).toBe(new Date().getFullYear());
  });
});

describe("les valeurs du métier : un appel, un contrôle gratuit, une réécriture à la charge du Studio", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const fiche = "Ce que je fais : je fabrique des cuisines sur mesure, des dressings et des rangements sur mesure dans mon atelier.";
  const o = { nom: "Tenon", metier: TENON.metier, fiche, personnes: false, kind: "services" as const };
  const bon = { nom: "Tenon", traits: ["artisanale", "chaleureuse", "précise", "haut de gamme"], emotion: "le plaisir d'une cuisine à sa mesure", images: ["dressing rangé", "gros plan bois / assemblage", "atelier et savoir-faire", "détail de quincaillerie", "lumière naturelle intérieure", "plan de travail en chêne"], produits: ["cuisines", "dressings", "rangements sur mesure"], appel: "devis" as const };
  it("le type de site est choisi par le code ; l'appel vient d'une liste fermée ; un produit absent de la fiche est retiré, jamais inventé", () => {
    const c = P.controleDesValeurs({ ...bon, produits: ["cuisines", "escaliers", "dressings"] }, o);
    expect(c.fautes).toEqual([]);
    expect(c.valeurs).toMatchObject({ site: "marque", appel: "devis", produits: ["cuisines", "dressings"], metier: TENON.metier });
    expect(c.retires).toEqual(["escaliers"]);
    expect(P.controleDesValeurs(bon, { ...o, kind: "produits" }).valeurs.site).toBe("boutique");
    expect(P.controleDesValeurs(bon, { ...o, kind: "produits" }).valeurs.appel).toBeUndefined();
    expect(P.ValeursEcritesSchema.parse({ ...bon, appel: "commande" }).appel).toBe("devis");
  });
  it("refuse : un nom différent, moins de 3 ou plus de 4 traits, une personne sans accord, un chiffre, une promesse, aucun produit de la fiche", () => {
    const f = (v: Partial<typeof bon>, oo = o) => P.controleDesValeurs({ ...bon, ...v }, oo).fautes.join(" | ");
    expect(f({ nom: "tenon" })).toMatch(/nom recopié/);
    expect(f({ traits: ["chaleureuse", "précise"] })).toMatch(/trois ou quatre traits/);
    expect(f({ traits: ["a1", "b2", "c3", "d4", "e5"] })).toMatch(/trois ou quatre traits/);
    expect(f({ images: [...bon.images.slice(0, 5), "famille dans sa cuisine"] })).toMatch(/aucune personne/);
    expect(f({ emotion: "les mains dans le bois" })).toMatch(/aucune personne/);
    expect(f({ images: [...bon.images.slice(0, 5), "famille dans sa cuisine"] }, { ...o, personnes: true })).toBe("");
    expect(f({ emotion: "une cuisine posée en 10 jours" })).toMatch(/aucun chiffre/);
    expect(f({ traits: ["artisanale", "chaleureuse", "la meilleure"] })).toMatch(/aucune promesse/);
    expect(f({ produits: ["escaliers", "portes"] })).toMatch(/aucun produit n'est pris dans les mots du client/);
  });
  it("une seule réécriture, à la charge du Studio ; encore fautive, rien n'est inventé", async () => {
    const tours: { tour: number; studio: boolean; demande: string }[] = [];
    const { chargeDuStudio } = await import("@/lib/billing");
    const { aLaChargeDuStudio } = await import("@/lib/billing");
    const deps = (rep: (tour: number) => any) => ({ ecrire: async (demande: string, tour: number) => { tours.push({ tour, studio: chargeDuStudio(), demande }); return rep(tour); }, aLaChargeDuStudio });
    const r = await P.ecrireLesValeurs(deps((t) => (t === 1 ? { ...bon, nom: "TENON" } : bon)), o);
    expect(r.ok).toBe(true);
    expect(tours.map((x) => [x.tour, x.studio])).toEqual([[1, false], [2, true]]);
    expect(tours[1].demande).toMatch(/Ta première réponse ne convenait pas : le nom recopié/);
    expect(tours[0].demande).toContain(fiche);
    tours.length = 0;
    const r2 = await P.ecrireLesValeurs(deps(() => ({ ...bon, produits: ["escaliers"] })), o);
    expect(r2.ok).toBe(false);
    expect(tours).toHaveLength(2);
  });
});

describe("l'appel d'image, jusqu'à OpenAI simulé", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const mp = await import("@/lib/ai/media-providers");
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const { all } = await import("@/lib/db");
  beforeEach(() => { keys = { openai: "sk-openai-test-123456" }; oa.calls = []; oa.panne = false; });
  const logo = () => sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
  it("POST /v1/images/edits : les champs exacts des requêtes de preuve ; image[] = le logo, puis la disposition, rien d'autre ; le reçu complet", async () => {
    const u = await account(), pid = project(u) as string, lg = await logo();
    const texte = P.texteDeLaPlanche({ nom: "Tenon", valeurs: TENON, annee: 2026, domaine: { domaine: "tenon.fr", statut: "disponible" }, personnes: false });
    const disposition = P.laDisposition(TENON.metier);
    const png = await mp.aiPlancheDeMarque({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:planche` }, { logo: { assetId: "logo-1", data: lg }, disposition: { nom: "disposition:standard", data: disposition.png }, prompt: texte });
    expect(oa.calls).toHaveLength(1);
    const { kind, image, ...corps } = oa.calls[0];
    expect(kind).toBe("edit");
    const preuve = JSON.parse(fs.readFileSync(`${F}/tenon-requete.json`, "utf8"));
    expect(preuve.endpoint).toBe(mp.ADRESSE_DE_LA_PLANCHE);
    const { prompt: _p, n, ...reglages } = preuve.champs;
    expect(corps).toEqual({ ...reglages, n: Number(n), prompt: texte });
    expect(corps).toMatchObject({ model: "gpt-image-2.5-sunburst", quality: "xhigh", size: "1536x2304", background: "opaque", output_format: "png", n: 1 });
    expect(corps.stream).toBeUndefined();
    expect(image.map((f: any) => f.name)).toEqual(["logo.png", "disposition.png"]);
    expect(image[0].data.equals(lg)).toBe(true);
    expect(sha(image[1].data)).toBe(P.DISPOSITION.sha256);
    const recu = mp.recuDeLaPlanche(png)!;
    expect(recu).toMatchObject({ adresse: mp.ADRESSE_DE_LA_PLANCHE, tailleRecue: "1536x2304", requestId: expect.stringMatching(/^req_edit_/) });
    expect(recu.jointes.map((j) => j.role)).toEqual(["logo", "disposition"]);
    expect(recu.usage).toMatchObject({ input_tokens_details: { image_tokens: 3057 } });
    const det = all<{ details: string; provider: string; requested_model: string }>("SELECT details, provider, requested_model FROM ai_calls WHERE project_id=? ORDER BY rowid DESC LIMIT 1", pid)[0];
    expect(det).toMatchObject({ provider: "openai", requested_model: "gpt-image-2.5-sunburst" });
    expect(JSON.parse(det.details)).toMatchObject({ methode: "planche-de-marque", texteEnvoye: texte });
  });
  it("une panne n'est jamais relancée (un seul appel) ; un texte trop long ou un logo absent : rien n'est envoyé", async () => {
    const u = await account(), pid = project(u) as string, lg = await logo();
    const d = P.laDisposition("une menuiserie");
    await expect(mp.aiPlancheDeMarque({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:long` }, { logo: { assetId: null, data: lg }, disposition: { nom: "d", data: d.png }, prompt: "x".repeat(mp.PLANCHE_TEXTE_MAX_OCTETS + 1) })).rejects.toThrow(/trop long/);
    await expect(mp.aiPlancheDeMarque({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:sans` }, { logo: { assetId: null, data: Buffer.alloc(0) }, disposition: { nom: "d", data: d.png }, prompt: "x" })).rejects.toThrow(/Aucun logo/);
    expect(oa.calls).toHaveLength(0);
    oa.panne = true;
    await expect(mp.aiPlancheDeMarque({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:p` }, { logo: { assetId: null, data: lg }, disposition: { nom: "d", data: d.png }, prompt: "x" })).rejects.toThrow();
    expect(oa.calls).toHaveLength(1);
  });
  it("la règle des modèles : réservé aux logos et à leur planche ; la borne : la formule officielle (3 811 jetons de sortie en xhigh 1536 × 2304)", async () => {
    const L = await import("@/lib/ai/logo-policy");
    expect(L.PERMISSION_DE_LA_PLANCHE).toEqual({ chemin: "aiPlancheDeMarque", provider: "openai", model: "gpt-image-2.5-sunburst" });
    expect(L.permisPourLaPlanche("aiPlancheDeMarque", "openai", "gpt-image-2.5-sunburst")).toBe(true);
    expect(L.permisPourLaPlanche("aiPostImage", "openai", "gpt-image-2.5-sunburst")).toBe(false);
    expect(mp.jetonsDeSortieGptImage("gpt-image-2.5-sunburst", "1536x2304", "xhigh")).toBe(3811);
    // Le texte permis couvre la planche (environ 4,8 ko) et les raisons d'une reprise.
    const t = P.texteDeLaPlanche({ nom: "Tenon", valeurs: TENON, annee: 2026, domaine: { domaine: "tenon.fr", statut: "disponible" }, personnes: false, raisons: ["une raison assez longue ".repeat(20)] });
    expect(Buffer.byteLength(t)).toBeLessThan(mp.PLANCHE_TEXTE_MAX_OCTETS);
    expect(mp.plancheDeMarqueMaxMicro()).toBeGreaterThan(Math.round(0.1241 * (await import("@/lib/billing")).EUR));
  });
});

describe("la relecture et la reprise unique", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const { aLaChargeDuStudio, chargeDuStudio } = await import("@/lib/billing");
  const attendu: import("@/lib/syna-agent/planche-de-marque").AttenduDeLaPlanche = { nom: "Tenon", annee: 2026, domaine: { domaine: "tenon.fr", statut: "disponible" }, personnes: false, animaux: false };
  const bon = { nomLu: "TENON", logoFidele: true, copyrightLu: "© 2026 Tenon", domaineLu: "tenon.fr — disponible", fautes: [] as string[], promesses: [] as string[], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [] as string[], note: 9, pourquoi: "Belle planche." };
  it("le code compare le nom, l'année et le domaine lettre pour lettre ; le relecteur refuse le reste ; note sous 8 refusée", () => {
    expect(P.raisonsDuRefusDeLaPlanche(bon, attendu)).toEqual([]);
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon, domaineLu: "tenon.fr – disponible" }, attendu)).toEqual([]);
    const r = (v: Partial<typeof bon>, a = attendu) => P.raisonsDuRefusDeLaPlanche({ ...bon, ...v }, a).join(" | ");
    expect(r({ nomLu: "Tenonn" })).toMatch(/nom est mal écrit/);
    expect(r({ logoFidele: false })).toMatch(/logo est faux ou redessiné/);
    expect(r({ copyrightLu: "© 2024 Tenon" })).toMatch(/copyright doit être exactement « © 2026 Tenon »/);
    expect(r({ domaineLu: "tenon.com — disponible" })).toMatch(/bloc 10 doit dire exactement « tenon.fr — disponible »/);
    expect(r({ domaineLu: "tenon.fr — Disponible" })).toMatch(/bloc 10/);
    expect(r({ domaineLu: "tenon.fr — disponible" }, { ...attendu, domaine: { domaine: "tenon.fr", statut: "a_verifier" } })).toMatch(/« tenon.fr — à vérifier »/);
    expect(r({ fautes: ["menuserie"] })).toMatch(/fautes/);
    expect(r({ promesses: ["livraison offerte"] })).toMatch(/promesses ou chiffres inventés/);
    expect(r({ personnes: true })).toMatch(/personne est visible/);
    expect(r({ personnes: true }, { ...attendu, personnes: true })).toBe("");
    expect(r({ logoFonceSurFondSombre: true })).toMatch(/logo foncé/);
    expect(r({ motMaquette: true })).toMatch(/maquette/);
    expect(r({ copies: ["le harnais de la disposition"] })).toMatch(/recopiés de la disposition/);
    expect(r({ note: 7 })).toMatch(/7\/10, il faut 8/);
    // Une réponse illisible ne garde jamais une planche.
    expect(P.raisonsDuRefusDeLaPlanche(P.RelectureDeLaPlancheSchema.parse({}), attendu).length).toBeGreaterThan(3);
  });
  it("les bandes couvrent toute la planche, pleine largeur ; le relecteur reçoit les bandes, le logo et la disposition", async () => {
    const png = await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    const b = await P.bandesDeLaPlanche(png);
    expect(b).toHaveLength(4);
    for (const x of b) expect((await sharp(x).metadata()).width).toBe(1536);
    expect((await sharp(b[0]).metadata()).height).toBe(576 + 48);
    expect(P.RELECTEUR_DE_LA_PLANCHE).toMatch(/« maquette » ou « mockup »/);
    expect(P.demandeAuRelecteurDeLaPlanche({ ...attendu, animaux: true, texte: "t" })).toMatch(/particulièrement attentif à toute copie/);
  });
  it("refusée une fois : refaite UNE fois à la charge du Studio, ses raisons à la fin du texte ; refusée deux fois : pas gardée, jamais un troisième essai", async () => {
    const png = await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    const essais: { texte: string; studio: boolean }[] = [];
    const deps = (verdicts: any[]) => ({ dessiner: async (_l: Buffer, _d: Buffer, texte: string) => { essais.push({ texte, studio: chargeDuStudio() }); return png; }, relire: async (_b: Buffer[], _l: Buffer, _d: Buffer, _x: string, tour: number) => verdicts[tour - 1], aLaChargeDuStudio });
    const o = { ...attendu, valeurs: TENON, logo: png, disposition: png };
    const r1 = await P.dessinerLaPlanche(deps([{ ...bon, note: 6 }, bon]), o);
    expect(r1.ok).toBe(true);
    expect(essais.map((e) => e.studio)).toEqual([false, true]);
    expect(essais[1].texte.startsWith(essais[0].texte)).toBe(true);
    expect(essais[1].texte.endsWith("\n\nÀ corriger : elle n'est pas au niveau (6/10, il faut 8).")).toBe(true);
    essais.length = 0;
    const r2 = await P.dessinerLaPlanche(deps([{ ...bon, note: 6 }, { ...bon, motMaquette: true }]), o);
    expect(r2.ok).toBe(false);
    expect(essais).toHaveLength(2);
    expect(!r2.ok && r2.raison).toMatch(/refusée deux fois \(le mot « maquette »/);
  });
});

describe("la tâche : points de reprise, planche refusée deux fois jamais montrée, choix et devis", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const T = await import("@/lib/syna-agent/planche-de-marque-tache");
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const J = await import("@/lib/syna-agent/journey");
  const { route } = await import("./sina-routes-fixtures");
  const { saveAsset, getAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <X,>(fn: () => Promise<X>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const bon = { nomLu: "", logoFidele: true, copyrightLu: "", domaineLu: "", fautes: [], promesses: [], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [], note: 9, pourquoi: "Nette et désirable." };
  const valeurs = { ok: true as const, valeurs: { ...TENON, images: TENON.images.slice(1) } };

  async function preparer() {
    const u = await account(), pid = project(u, "services") as string;
    const lg = await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 256, height: 256, channels: 3, background: "#FFFFFF" } }).png().toBuffer(), name: "logo-fini.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
    const cp: Record<string, unknown> = {};
    const ctx = { step: async <X,>(k: string, fn: () => Promise<X>): Promise<X> => (k in cp ? (cp[k] as X) : (cp[k] = await fn()) as X) };
    return { u, pid, lg, ctx, cp };
  }
  const faux = (verdicts: (nom: string) => any[]) => {
    const log: string[] = [];
    const ai = {
      valeurs: async () => { throw new Error("aucun appel attendu"); },
      dessiner: async (_l: any, _d: any, _t: string, cle: string) => { log.push(`image:${cle}`); return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#EEE" } }).png().toBuffer(), recu: null }; },
      relire: async (_b: Buffer[], _l: Buffer, _d: Buffer, demande: string, cle: string) => { log.push(`relecture:${cle}`); const nom = /Marque : « (.+?) »/.exec(demande)![1]; const n = log.filter((x) => x.startsWith("relecture")).length; return verdicts(nom)[n - 1] ?? verdicts(nom).at(-1); },
    };
    return { ai, log };
  };
  T.plancheDeps.domaines = async () => ({ taken: [], free: ["aplomb.fr"], unknown: [], at: 1 });
  T.plancheDeps.annee = () => 2026;

  it("gardée : la planche devient l'image montrée (relue, sa note gardée) ; une relance de la tâche ne repaie rien", async () => {
    const { u, pid, lg, ctx } = await preparer();
    const x = { ...route("A"), name: "Aplomb" };
    const { ai, log } = faux((nom) => [{ ...bon, nomLu: nom, copyrightLu: `© 2026 ${nom}`, domaineLu: "aplomb.fr — disponible" }]);
    const r = await fr(() => T.plancheDeLaRoute({ ctx, ai, who: { userId: u.id, projectId: pid }, route: x as any, round: 1, valeurs, logoAssetId: lg.id, personnes: false }));
    expect(log).toEqual(["image:A-1-1", "relecture:A-1-1-relecture"]);
    const pl = r.route.board.planche!;
    expect(pl).toMatchObject({ logo: lg.id, domaine: "aplomb.fr", statut: "disponible", annee: 2026, essais: 1, note: 9 });
    expect(pl.image && getAsset(pl.image.id)?.role).toBe("brand-board");
    expect(J.manqueDeLaPlanche(r.route as any)).toEqual(["logo"]);
    expect(J.manqueDeLaPlanche({ ...r.route, board: { ...r.route.board, images: { logo: { id: lg.id, w: 1, h: 1 } } } } as any)).toEqual([]);
    expect(J.verdictDuRelecteur(pl.image!.id)).toEqual({ score: 9, words: "Nette et désirable." });
    // Relance : tout est relu dans les points de reprise.
    const r2 = await fr(() => T.plancheDeLaRoute({ ctx, ai, who: { userId: u.id, projectId: pid }, route: x as any, round: 1, valeurs, logoAssetId: lg.id, personnes: false }));
    expect(log).toHaveLength(2);
    expect(r2.route.board.planche!.image).toEqual(pl.image);
  });
  it("refusée deux fois : elle n'est PAS montrée, SINA propose de la finir à sa charge ; l'image refusée n'est jamais une image de planche", async () => {
    const { u, pid, lg, ctx } = await preparer();
    const x = { ...route("B"), name: "Aplomb" };
    const { ai, log } = faux(() => [{ ...bon, nomLu: "Aplomb", note: 5 }, { ...bon, nomLu: "Aplomb", note: 6 }]);
    const r = await fr(() => T.plancheDeLaRoute({ ctx, ai, who: { userId: u.id, projectId: pid }, route: x as any, round: 1, valeurs, logoAssetId: lg.id, personnes: false }));
    expect(log.filter((l) => l.startsWith("image"))).toHaveLength(2);
    expect(r.route.board.planche!.image).toBeUndefined();
    expect(r.route.board.planche!.raison).toMatch(/refusée deux fois/);
    expect(r.issues.join(" ")).toMatch(/je ne te montre pas cette planche, elle n'a pas passé ma relecture, même refaite\. Je peux la refaire à ma charge/);
    const j = { keep: [], identities: { list: [{ ...r.route, board: { ...r.route.board, images: { logo: { id: lg.id, w: 1, h: 1 } } } }] } };
    expect(J.planchesIncompletes(j as any)).toEqual([{ key: "B", manque: ["planche"] }]);
    expect(J.planchesMontrees(j as any)).toEqual([]);
    const { all } = await import("@/lib/db");
    expect(all<{ role: string }>("SELECT role FROM assets WHERE project_id=? AND name LIKE 'planche-de-marque-%'", pid).map((a) => a.role)).toEqual(["planche-refusee", "planche-refusee"]);
  });
  it("le domaine est vérifié AVANT le dessin ; les valeurs impossibles : aucune image n'est payée", async () => {
    const { u, pid, lg, ctx } = await preparer();
    const ordre: string[] = [];
    T.plancheDeps.domaines = async () => { ordre.push("domaine"); return { taken: ["aplomb.fr", "aplomb.com"], free: [], unknown: [], at: 1 }; };
    try {
      const { ai, log } = faux(() => [{ ...bon, nomLu: "Aplomb" }]);
      const dessiner = ai.dessiner;
      ai.dessiner = async (...a: Parameters<typeof dessiner>) => { ordre.push("dessin"); expect(a[2]).toContain("écris exactement « Adresse à choisir »"); return dessiner(...a); };
      await fr(() => T.plancheDeLaRoute({ ctx, ai, who: { userId: u.id, projectId: pid }, route: { ...route("A"), name: "Aplomb" } as any, round: 1, valeurs, logoAssetId: lg.id, personnes: false }));
      expect(ordre.slice(0, 2)).toEqual(["domaine", "dessin"]);
      log.length = 0;
      const r = await fr(() => T.plancheDeLaRoute({ ctx: { step: async (_k: string, fn: () => Promise<any>) => fn() }, ai, who: { userId: u.id, projectId: pid }, route: { ...route("C"), name: "Aplomb" } as any, round: 1, valeurs: { ok: false, raison: "aucun produit" }, logoAssetId: lg.id, personnes: false }));
      expect(log).toEqual([]);
      expect(r.route.board.planche!.image).toBeUndefined();
    } finally { T.plancheDeps.domaines = async () => ({ taken: [], free: ["aplomb.fr"], unknown: [], at: 1 }); }
  });
  it("les métiers des animaux : la planche de Racine, jamais la disposition standard ; les autres métiers : la standard", () => {
    expect(P.metierDesAnimaux("une boutique d'accessoires pour chiens : harnais, laisses et colliers")).toBe(true);
    expect(P.metierDesAnimaux("un salon de toilettage")).toBe(true);
    expect(P.metierDesAnimaux("une entreprise de menuiserie")).toBe(false);
    const d = P.laDisposition("un salon de toilettage pour chiens");
    expect(d).toMatchObject({ laquelle: "animaux", animaux: true });
    expect(sha(d.png)).toBe(P.DISPOSITION_DES_ANIMAUX!.sha256);
    const m = P.laDisposition("une entreprise de menuiserie");
    expect(m).toMatchObject({ laquelle: "standard", animaux: false });
    expect(sha(m.png)).toBe(P.DISPOSITION.sha256);
  });
  it("le devis : une planche par logo choisi (2, 3, 4) ; la borne du Studio compte une reprise par planche et une réécriture des valeurs", async () => {
    const { borneDuStudio } = await import("@/lib/ai/borne-du-studio");
    for (const n of [2, 3, 4]) {
      const d = T.devisDesPlanchesDeMarque(n);
      expect(d.maxMicro).toBeGreaterThanOrEqual(d.probableMicro);
      expect(d.studioMaxMicro).toBe(borneDuStudio(d.maxMicro, false, d.repriseMicro, 1));
      expect(d.studioMaxMicro).toBe(d.repriseMicro);
    }
    expect(T.devisDesPlanchesDeMarque(4).maxMicro).toBeGreaterThan(T.devisDesPlanchesDeMarque(2).maxMicro);
    // L'accord unique de l'étape compte les planches de marque, plus les images des planches d'avant.
    const I = await import("@/lib/syna-agent/tools/identity");
    const C = await import("@/lib/syna-agent/brand-chain");
    const g = I.accordGraphistes(3);
    const textes = C.chainQuote({ routes: 3, imposed: true, images: false, done: ["brand:study", "brand:strategy", "brand:strategy:2"] });
    expect(g.planchesMicro).toBe(textes.maxMicro + T.devisDesPlanchesDeMarque(3).maxMicro);
    expect(g.planchesStudioMicro).toBe(T.devisDesPlanchesDeMarque(3).studioMaxMicro);
    expect(I.FINISH_SLOTS_PLANCHE).toContain("hero");
  });
});
