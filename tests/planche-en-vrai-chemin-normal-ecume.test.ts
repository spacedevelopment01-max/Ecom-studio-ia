/**
 * LE CHEMIN NORMAL DE LA PLANCHE EN VRAI PORTE TOUTES LES CORRECTIONS D'ÉCUME (26 novembre 2026), sans REASSEMBLER ni
 * REJUGER : le script de l'étape 4 (`essaiDeLaPlancheEnVrai`, qui appelle la tâche du Studio `plancheEnVrai`), de bout en
 * bout, avec des appels SIMULÉS (aucun appel payant) sur les vrais fichiers de l'essai d'Écume (tests/fixtures/
 * ecume-planche-en-vrai : la planche B choisie, le logo 10, l'inventaire réel). Les images simulées sont l'aperçu agrandi.
 *
 * Ce qui est vérifié : la story (sa zone touche la bande d'un titre : le « en » du sous-titre n'est pas attendu) et le
 * téléphone (l'heure de sa barre d'état n'est pas reprochée) sont gardés ; la palette garde les codes écrits sur l'aperçu,
 * avec leurs mots ; la police des textes suit le spécimen, choisie par l'inventaire ; sans symbole séparable, le bloc 01 est
 * repris de l'aperçu ; une petite finition notée est nettoyée par le code ; le site en une seule image ; la planche en
 * 3072 × 4608, identique au pixel près à celle que fait le réassemblage (`plancheEnVraiParLeCode`) avec les mêmes images :
 * tout ce que le réassemblage corrige (polices de mise en page, spécimen mesuré, titres nettoyés, fond de l'aperçu gardé,
 * recalage sur les gouttières) est donc sur le chemin normal. Puis LOGO_HD sur le chemin normal.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const F = "tests/fixtures/ecume-planche-en-vrai";

describe("le chemin normal de la planche en vrai, sur les vrais fichiers d'Écume (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace, chargeDuStudio } = await import("@/lib/ai/trace");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const { setJsonSetting } = await import("@/lib/settings");
  const { assetData, getAsset } = await import("@/lib/library");
  const { essaiDeLaPlancheEnVrai, donneesDeLaPlanche, devisDuCheminNormal, devisDeLEssaiEnVrai } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  const { ECUME } = await import("./clients-d-essai");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
  const textes = (n: string) => P.caseLue(inventaire, n)?.textes ?? [];
  const appels: string[] = [];
  const studio: Record<string, boolean> = {};
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    inventaire: async () => { appels.push("inventaire"); await paye(q, 100_000, "quality_control"); return inventaire; },
    refaire: async (d: { element: string; taille: string; jointes: { role: string; data: Buffer }[] }, cle: string) => {
      appels.push(`image:${cle}`); await paye(q, 50_000, "image_generation");
      const [w, h] = d.taille.split("x").map(Number);
      return { png: await sharp(d.jointes.find((j) => j.role === "apercu")!.data).resize(w, h, { fit: "fill" }).png().toBuffer(), recu: null };
    },
    relire: async (images: { label: string }[], _demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); await paye(q, 60_000, "quality_control");
      const cases = images.map((im) => im.label).filter((l) => l.endsWith(" refaite")).map((l) => l.replace(/ refaite$/, ""));
      return { images: cases.map((c) => ({
        case: c, identique: true,
        // La story ne relit pas le « en » venu du sous-titre du bloc 07 ; le téléphone relit l'heure de sa barre d'état.
        textesLus: c === "publication-9x16" ? textes(c).filter((t) => t !== "en") : c === "site-telephone" ? ["9:41", ...textes(c)] : textes(c),
        logoPresent: !!P.caseLue(inventaire, c)?.logo, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "simulé",
      })) };
    },
  });
  const fidele = async (tuile: Buffer) => sharp(tuile).resize(1088, 1088, { fit: "contain", background: (await sharp(tuile).stats()).dominant, kernel: "lanczos3" }).png().toBuffer();
  const logos = (q: { userId: string; jobId: string }) => ({
    refaire: async (d: { jointes: { data: Buffer }[] }, cle: string) => { appels.push(`logo:${cle}`); studio[cle] = chargeDuStudio(); await paye(q, 50_000, "image_generation"); return { png: await fidele(d.jointes[0].data), recu: null }; },
    relire: async (images: { label: string }[], _d: string, cle: string) => {
      appels.push(`logo:${cle}`); studio[cle] = chargeDuStudio(); await paye(q, 60_000, "quality_control");
      return { versions: images.filter((i) => i.label.endsWith(" refaite")).map((i) => ({ version: i.label.replace(/ refaite$/, ""), memeForme: true, memesLettres: true, texteCirculaire: "aucun", textesDeLApercu: [], textesLus: [], memesCouleurs: true, ajout: false, texteCoupe: false, note: 9, pourquoi: "" })) };
    },
  });
  const preparer = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chemin-normal-"));
    const planche = path.join(dir, "planche-B-gardee.png");
    fs.writeFileSync(planche, await sharp(`${F}/planche-B-gardee.jpg`).png().toBuffer());
    const logo = path.join(dir, "esquisse-10-logo-garde.png");
    fs.copyFileSync(`${F}/esquisse-10-logo-garde-512.png`, logo);
    return { sortie: path.join(dir, "sortie"), planche, logo };
  };
  /** La planche B d'Écume, sa phrase sur deux lignes, et une petite finition notée dans son bloc 10 (un accent isolé). */
  const donnees = () => ({ ...donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: "tests/fixtures/ecume-planches-2/planche-B-resultat.json" }), finitions: ["accent parasite isolé dans le titre de référencement du bloc 10 : « Écume – Savonnerie artisanale |´ »"] });
  afterEach(() => { appels.length = 0; for (const k of Object.keys(studio)) delete studio[k]; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); });

  it("sans REASSEMBLER : les 17 images gardées (zone de la case, heure du téléphone), la palette écrite, la police du spécimen, le bloc 01 de l'aperçu, la finition nettoyée, le site en une image ; la planche est celle du réassemblage", async () => {
    const e = await preparer();
    const r = await essaiDeLaPlancheEnVrai({ sortie: e.sortie, plafondEuros: "10", planche: e.planche, logo: e.logo, client: ECUME, donnees: donnees(), ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels.filter((a) => a.startsWith("logo:"))).toEqual([]);
    const ev = r.etat!;
    // Zone de la case et heure du téléphone : la story et le téléphone sont gardés, comme toutes les autres.
    expect(ev.elements.filter((x) => !x.id).map((x) => x.element)).toEqual([]);
    // La palette : les codes écrits sur l'aperçu, gardés, avec les mots de l'aperçu.
    expect(ev.palette[0]).toMatchObject({ hex: "#C44912", nom: "Orange Écume", mots: ["Chaleur", "énergie", "bienveillance"] });
    expect(ev.notes.join("\n")).toMatch(/#C44912 \(écrit sur l'aperçu/);
    // La police des textes suit le spécimen, choisie par l'inventaire (« Nunito » montrée en manuscrite) ; SINA le dit.
    expect(ev.polices!.textes).toMatchObject({ lue: "Nunito", famille: "Sacramento", remplacee: true });
    expect(ev.issues.join("\n")).toMatch(/Sacramento/);
    // Sans symbole séparable : compact, icône, favicon et badge repris de l'aperçu.
    expect([...(ev.logosDeLApercu ?? [])].sort()).toEqual(["badge", "favicon", "icone", "logo-compact"]);
    // La petite finition notée sur la planche choisie est nettoyée par le code dans le bloc 10.
    expect(ev.notes.join("\n")).toMatch(/petite finition nettoyée par le code/);
    // Le site en une seule image, la planche en 3072 × 4608.
    expect(ev.siteEntier?.id).toBeTruthy();
    expect(r.planche).toMatchObject({ w: 3072, h: 4608 });
    // La même planche que le réassemblage, avec les mêmes images : le chemin normal porte tout ce que le réassemblage corrige.
    const images = new Map(ev.elements.filter((x) => x.id).map((x) => [x.element, assetData(getAsset(x.idPlanche ?? x.id!)!)] as const));
    // Le logo et la route, comme le script les prépare : les couleurs tirées du logo, puis le fond retiré sur son foncé.
    const { logoDetoure } = await import("@/lib/syna-agent/brand-images");
    const { couleursDuLogo } = await import("@/lib/syna-agent/couleurs-du-logo");
    const brut = fs.readFileSync(e.logo), det0 = await logoDetoure(brut);
    const pal = det0.ok ? (await couleursDuLogo(det0.png).catch(() => null))?.palette ?? null : null;
    const dark = pal?.dark ?? "#1C2A24", det = await logoDetoure(brut, dark);
    const route = { key: "A", name: "Écume", slogan: donnees().phrase, palette: { dark }, board: { planche: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, finitions: donnees().finitions } } } as never;
    const code = await T.plancheEnVraiParLeCode({ demo: fs.readFileSync(e.planche), laquelle: "standard", inventaire, route, logo: det.ok ? det.png : brut, images, phrase: donnees().phrase, ligneDuLogo: donnees().phrase });
    const normale = fs.readFileSync(path.join(e.sortie, "planche-en-vrai.png"));
    const a = await sharp(normale).raw().toBuffer(), b = await sharp(code.planche).raw().toBuffer();
    expect(a.length).toBe(b.length);
    let differents = 0;
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 2) differents++;
    expect(differents / a.length).toBeLessThan(0.0005);
  }, 240_000);

  it("LOGO_HD sur le chemin normal : après la planche en vrai, les quatre versions reprises de l'aperçu refaites en haute définition, à la charge du Studio ; logos et planche refaits par le code ; le devis compte la somme des deux", async () => {
    const e = await preparer();
    const r = await essaiDeLaPlancheEnVrai({ sortie: e.sortie, plafondEuros: "10", planche: e.planche, logo: e.logo, client: ECUME, donnees: donnees(), ai: simule as never, logoHd: true, aiLogos: logos as never });
    expect(r.arret).toBeUndefined();
    // Dans l'ordre : la planche en vrai, puis les quatre versions et leur relecture.
    const i = appels.indexOf("logo:logo-hd-logo-compact");
    expect(i).toBeGreaterThan(appels.lastIndexOf("relecture:relecture-site"));
    expect(appels.slice(i)).toEqual(["logo:logo-hd-logo-compact", "logo:logo-hd-icone", "logo:logo-hd-favicon", "logo:logo-hd-badge", "logo:relecture-logos-hd"]);
    expect(Object.values(studio).every(Boolean)).toBe(true);
    expect(r.logosEnHd).toMatchObject({ versions: ["logo-compact", "icone", "favicon", "badge"], gardees: ["logo-compact", "icone", "favicon", "badge"], refusees: [] });
    expect(r.etat!.logosEnHd).toEqual(["logo-compact", "icone", "favicon", "badge"]);
    for (const f of ["logos-hd/logo-hd-badge-texte-envoye.txt", "logos-hd/logo-hd-badge-recue.png", "logos-hd/relecture-logos-hd-verdict.json", "etat.json", "essai.json", "planche-en-vrai.png"]) expect(fs.existsSync(path.join(e.sortie, f)), f).toBe(true);
    // Les fichiers à télécharger sont les versions en haute définition ; etat.json les dit, l'écran le relit.
    const etat = JSON.parse(fs.readFileSync(path.join(e.sortie, "etat.json"), "utf8"));
    expect(etat.logosEnHd).toEqual(["logo-compact", "icone", "favicon", "badge"]);
    const badge = await sharp(path.join(e.sortie, "logos/badge.png")).metadata();
    expect(badge.width).toBeGreaterThanOrEqual(1000);
    expect(fs.readFileSync(path.join(e.sortie, "rapport.txt"), "utf8")).toMatch(/LOGO_HD \(à la charge du Studio\)/);
    // Le devis : la planche en vrai et LOGO_HD, la somme des maxima des deux.
    const d = await devisDuCheminNormal({ logoHd: true });
    expect(d.plafondMinimalMicro).toBe((await devisDeLEssaiEnVrai()).plafondMinimalMicro + T.devisDesLogosEnHd().maxMicro);
    expect(d.texte.join("\n")).toMatch(/Plafond minimal exact de la commande/);
  }, 240_000);

  it("le script accepte LOGO_HD sans REASSEMBLER, et refuse sous le plafond minimal exact de la commande", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8");
    expect(src).not.toMatch(/LOGO_HD ne vaut qu'avec REASSEMBLER/);
    expect(src).toMatch(/planche en vrai et LOGO_HD, somme des maxima, reprises comprises/);
    expect(src).toMatch(/logoHd, metierCourt: process\.env\.METIER_COURT/);
    const outil = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(outil).toContain("T.refaireLesLogosEnHdEnVrai(");
  });
});
