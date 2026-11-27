/**
 * Le script de l'essai réel des esquisses (scripts/syna-recette/essai-esquisses.mts), avec des appels SIMULÉS : aucun appel
 * payant. Les appels simulés passent par la réservation du Studio, comme les vrais, pour que le garde-fou de l'essai les
 * voie. La recherche est celle du parcours (`uneRecherche`) : découpe, un seul appel de relecture, une esquisse refusée
 * jamais montrée (mais marquée sur la planche-contact complète), chaque écartée remplacée par le même modèle jusqu'à 12, à
 * la charge du Studio, dans la borne ; le compte des 12 écrit ; puis l'étape 2 retrouve les esquisses gardées et leurs
 * phrases.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const W = 1536, H = 1024;
type Bloc = { x: number; y: number; w: number; h: number; c?: string };
const dessin = (cx: number, cy: number): Bloc[] => [{ x: cx - 40, y: cy - 100, w: 80, h: 80, c: "#E0703A" }, ...Array.from({ length: 5 }, (_v, i) => ({ x: cx - 150 + i * 62, y: cy + 10, w: 44, h: 80 }))];
/** Une planche de six esquisses ; `vide` : une case laissée blanche (refusée par la découpe). */
const planche = (vide?: number) => sharp({ create: { width: W, height: H, channels: 3, background: "#FFFFFF" } })
  .composite([0, 1].flatMap((r) => [0, 1, 2].filter((c) => r * 3 + c !== vide).flatMap((c) => dessin(256 + c * 512, 256 + r * 512)))
    .map((b) => ({ input: { create: { width: b.w, height: b.h, channels: 3 as const, background: b.c ?? "#1F3D5B" } }, left: b.x, top: b.y }))).png().toBuffer();
/** Les pixels du rouge des bandeaux « ÉCARTÉE » (#C62828). */
const rouges = async (png: Buffer) => { const { data } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true }); let n = 0; for (let i = 0; i < data.length; i += 3) if (Math.abs(data[i] - 198) < 12 && Math.abs(data[i + 1] - 40) < 12 && Math.abs(data[i + 2] - 40) < 12) n++; return n; };

describe("le script de l'essai des esquisses (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { graphistesDeps } = await import("@/lib/syna-agent/logo-graphistes");
  const { withTrace } = await import("@/lib/ai/trace");
  const { clientDeLEssai, devisDesEsquisses, essaiDesEsquisses } = await import("../scripts/syna-recette/essai-esquisses-outil");
  const F = await import("../scripts/syna-recette/essai-finalisation-outil");
  const { RACINE, ECUME, FICHIER_ECUME, sansRacine } = await import("./clients-d-essai");
  const { all } = await import("@/lib/db");

  const appels: string[] = [];
  /** Tout ce qui part vers l'IA (la demande du métier, le texte des planches, la demande au relecteur). */
  const envoyes: string[] = [];
  const PLANCHE = 40_000, METIER = 20_000;
  let RELECTURE = 60_000;
  const METIER_ECUME = { metier: "une savonnerie artisanale qui vend en ligne des savons solides, des shampoings solides et des baumes", court: "les savons solides", piste: "savoir-faire" as const };
  /** Les places (1, 2…) refusées par le relecteur, à chaque tour. */
  let refuser: Record<number, Set<number>> = {};
  /** Un appel simulé, réservé puis réglé comme un vrai (le garde-fou le contrôle à la réservation). */
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (q: { userId: string; projectId: string; jobId: string; capMicro: number }) => ({
    metier: async (demande: string) => { appels.push("metier"); envoyes.push(demande); await paye(q, METIER, "strategy"); return /Écume/.test(demande) ? METIER_ECUME : { metier: "une pépinière qui vend des plantes en ligne", court: "les plantes", piste: "univers" as const }; },
    planche: async (modele: string, prompt: string, cle: string) => { appels.push(`planche:${cle}`); envoyes.push(prompt); await paye(q, PLANCHE, "image_generation"); return { png: await planche(modele.includes("2.6") ? 4 : undefined), recu: { requestId: `req-${modele}`, usage: null, coutMicro: PLANCHE / 2 } as never }; },
    relireEsquisses: async (images: Buffer[], nom: string, cle: string) => {
      appels.push(`relecture:${cle}`); envoyes.push(nom); await paye(q, RELECTURE, "quality_control");
      const tour = Number(/-t(\d+)-/.exec(cle)![1]);
      return { esquisses: images.map((_im, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: nom, ok: !refuser[tour]?.has(i + 1), pourquoi: refuser[tour]?.has(i + 1) ? "le dessin est confus" : "net", piste: `piste ${tour}-${i + 1}`, phraseSousLeNom: i === 0 ? "Savons solides faits main" : i === 1 ? "Savonn solide" : "aucune", phraseBienEcrite: i === 0 })) };
    },
    rediger: async () => { appels.push("rediger"); throw new Error("interdit"); },
    finaliser: async () => { appels.push("finaliser"); throw new Error("interdit"); },
    relireLogo: async () => { appels.push("relireLogo"); throw new Error("interdit"); },
  });
  const sortie = () => fs.mkdtempSync(path.join(os.tmpdir(), "essai-esquisses-"));
  afterEach(() => { appels.length = 0; envoyes.length = 0; refuser = {}; RELECTURE = 60_000; delete graphistesDeps.ai; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

  it("le tri du relecteur et les remplacements : 12 correctes, le compte des 12 écrit, les écartées marquées dans la complète", async () => {
    const dir = sortie();
    // Premier tour : 11 cases découpées (la 5 de la planche 2.6 est vide), le relecteur écarte les places 3 et 5 (planche 2.5).
    refuser = { 1: new Set([3, 5]) };
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "2", client: ECUME, ai: simule as never });
    expect(r.arret).toBeUndefined();
    // Un tour de remplacement : une planche de chaque modèle (il en manque aux deux), une relecture.
    expect(appels.slice().sort()).toEqual(["metier", "planche:r1-t1-gpt-image-2.5-sunburst", "planche:r1-t1-gpt-image-2.6-flare", "planche:r1-t2-gpt-image-2.5-sunburst", "planche:r1-t2-gpt-image-2.6-flare", "relecture:r1-t1-relecture", "relecture:r1-t2-relecture"]);
    expect(r.reprise).toBe(true);
    expect(r.esquisses).toBe(12);
    expect(r.gardees.map((g) => g.numero)).toEqual(Array.from({ length: 12 }, (_v, i) => i + 1));
    // 6 et 6 : les remplaçantes viennent du même modèle que les écartées.
    expect(r.gardees.map((g) => `${g.modele}:${g.tour}`)).toEqual([...Array(4).fill("gpt-image-2.5-sunburst:1"), ...Array(2).fill("gpt-image-2.5-sunburst:2"), ...Array(5).fill("gpt-image-2.6-flare:1"), "gpt-image-2.6-flare:2"]);
    // Le vrai résultat : 9 correctes dès les deux planches, 3 remplacées, avec leur raison.
    expect(r.compte).toEqual({ voulues: 12, correctesDesLesPlanches: 9, remplacees: 3, toursDeRemplacement: 1, complete: true, lesquelles: [
      { modele: "gpt-image-2.5-sunburst", case: 3, raison: "le dessin est confus" }, { modele: "gpt-image-2.5-sunburst", case: 5, raison: "le dessin est confus" }, { modele: "gpt-image-2.6-flare", case: 5, raison: "case vide" }] });
    const j = JSON.parse(fs.readFileSync(path.join(dir, "esquisses.json"), "utf8"));
    expect(j.compte).toEqual(r.compte);
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport).toContain("Vrai résultat : 9 esquisse(s) correcte(s) sur 12 dès les deux planches.");
    expect(rapport).toContain("Remplacées : 3 (en 1 tour(s) de remplacement, à la charge du Studio).");
    expect(rapport).toContain("- planche gpt-image-2.6-flare, case 5 : case vide");
    // Écartées : les deux refusées par le relecteur, avec leur image, et la case vide de la découpe (les deux tours), plus
    // les correctes en plus du remplacement (jamais montrées).
    expect(r.ecartees.filter((x) => x.raison === "le dessin est confus").every((x) => x.fichier)).toBe(true);
    expect(r.ecartees.some((x) => x.raison === "case vide" && !x.fichier)).toBe(true);
    const f = fs.readdirSync(dir);
    expect(f).toEqual(expect.arrayContaining(["planche-contact.png", "planche-contact-complete.png", "esquisses.json", "relecture-1-demande.txt", "relecture-1-verdict.json", "relecture-2-verdict.json", "depense.json", "rapport.txt", "esquisse-01.png", "esquisse-12.png", "planche-remplacement-1-gpt-image-2.5-sunburst.png"]));
    expect(f).not.toContain("esquisse-13.png");
    // La planche des gardées : 12 cases, aucune marque ; la complète : les deux tours (24 cases), les écartées barrées de rouge.
    const contact = fs.readFileSync(path.join(dir, "planche-contact.png")), complete = fs.readFileSync(path.join(dir, "planche-contact-complete.png"));
    expect((await sharp(contact).metadata()).height).toBe(3 * 272 + 16);
    expect((await sharp(complete).metadata()).height).toBe(4 * 272 + 16);
    expect(await rouges(contact)).toBe(0);
    expect(await rouges(complete)).toBeGreaterThan(4 * 256 * 60);
    // Chaque gardée avec son numéro et sa phrase ; la douteuse n'est jamais proposée telle quelle.
    expect(j.gardees[0]).toMatchObject({ numero: 1, fichier: "esquisse-01.png", phrase: { texte: "Savons solides faits main", ok: true } });
    expect(j.gardees[1].phrase).toMatchObject({ texte: "Savonn solide", ok: false });
    expect(j.gardees[2].phrase).toBeUndefined();
    expect(rapport).toContain(`Phrase du métier : ${METIER_ECUME.metier}`);
    expect(rapport).toContain("Esquisse 01 : esquisse-01.png ; piste « piste 1-1 » ; phrase sous le nom : « Savons solides faits main » (proposable telle quelle)");
    expect(JSON.parse(fs.readFileSync(path.join(dir, "relecture-1-verdict.json"), "utf8")).esquisses).toHaveLength(11);
    // Les remplacements sont à la charge du Studio : leurs trois appels, et eux seuls.
    const dep = JSON.parse(fs.readFileSync(path.join(dir, "depense.json"), "utf8")) as { studio: boolean }[];
    expect(dep.filter((d) => d.studio)).toHaveLength(3);
    expect(dep.filter((d) => !d.studio)).toHaveLength(4);
    const remplacement = envoyes.filter((t) => t.includes("Évite ces pistes déjà présentées :"));
    expect(remplacement).toHaveLength(2);
    expect(remplacement[0]).toContain("piste 1-1");
    // Rien de Racine n'est parti, rien d'autre n'a été appelé.
    for (const t of envoyes) expect(sansRacine(t), t).toBe(true);
    expect(envoyes[0]).toContain(ECUME.metier);
    expect(appels).not.toContain("rediger");
  });

  it("la borne : au plus trois tours de remplacement ; atteinte, rien n'est montré (jamais moins de 12), l'arrêt est dit", async () => {
    const dir = sortie();
    // La planche 2.6 est toujours écartée en entier : places 7 à 11 au premier tour, 1 à 5 aux remplacements.
    refuser = { 1: new Set([7, 8, 9, 10, 11]), 2: new Set([1, 2, 3, 4, 5]), 3: new Set([1, 2, 3, 4, 5]), 4: new Set([1, 2, 3, 4, 5]) };
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "3", client: ECUME, ai: simule as never });
    // Trois remplacements, du seul modèle à qui il manque des esquisses ; jamais un quatrième.
    expect(appels.filter((a) => a.startsWith("planche:"))).toEqual(expect.arrayContaining(["planche:r1-t2-gpt-image-2.6-flare", "planche:r1-t3-gpt-image-2.6-flare", "planche:r1-t4-gpt-image-2.6-flare"]));
    expect(appels.filter((a) => a.startsWith("planche:"))).toHaveLength(5);
    expect(appels.filter((a) => a.startsWith("relecture:"))).toHaveLength(4);
    expect(r.arret).toMatch(/recherche incomplète : moins de 12 esquisses correctes après 3 tour\(s\) de remplacement/);
    expect(r.esquisses).toBe(0);
    expect(fs.existsSync(path.join(dir, "planche-contact.png"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "esquisse-01.png"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "planche-contact-complete.png"))).toBe(true);
    expect(r.compte).toMatchObject({ correctesDesLesPlanches: 6, remplacees: 6, toursDeRemplacement: 3, complete: false });
    const dep = JSON.parse(fs.readFileSync(path.join(dir, "depense.json"), "utf8")) as { studio: boolean }[];
    expect(dep.filter((d) => d.studio)).toHaveLength(6);
  });

  it("le garde-fou : la relecture au-dessus du plafond ne part pas, aucune esquisse non relue n'est montrée, rien n'est relancé", async () => {
    const dir = sortie();
    RELECTURE = 200_000;
    // 0,20 € : le métier et les deux planches tiennent (0,10 € au plus) ; la relecture (0,20 €) ferait dépasser.
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "0.20", client: ECUME, ai: simule as never });
    expect(appels.filter((a) => a.startsWith("relecture:"))).toHaveLength(1);
    expect(appels.filter((a) => a.startsWith("planche:"))).toHaveLength(2);
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé|plafond a refusé/);
    expect(r.esquisses).toBe(0);
    expect(r.reprise).toBe(false);
    expect(fs.existsSync(path.join(dir, "planche-contact.png"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "esquisse-01.png"))).toBe(false);
    expect(all("SELECT 1 FROM ai_reservations WHERE model='simule'")).toBeTruthy();
    expect(fs.readFileSync(path.join(dir, "rapport.txt"), "utf8")).toMatch(/ARRÊT/);
  });

  it("un plafond trop bas pour le métier : le script s'arrête proprement avant toute planche", async () => {
    const r = await essaiDesEsquisses({ sortie: sortie(), plafondEuros: "0.01", client: RACINE, ai: simule as never });
    expect(appels).toEqual(["metier"]);
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé un appel/);
    expect(r.planches).toEqual([]);
  });

  it("« d'autres pistes » (AUTRES_PISTES) : comme la tâche du Studio, le métier déjà écrit repris sans appel, la numérotation qui continue, les pistes déjà présentées à éviter", async () => {
    const avant = sortie();
    refuser = { 1: new Set([3, 5]) };
    await essaiDesEsquisses({ sortie: avant, plafondEuros: "2", client: ECUME, ai: simule as never });
    const premieres = JSON.parse(fs.readFileSync(path.join(avant, "esquisses.json"), "utf8")) as { gardees: { piste: string }[] };
    appels.length = 0; envoyes.length = 0; refuser = {};
    const dir = sortie();
    const r = await essaiDesEsquisses({ sortie: dir, plafondEuros: "2", client: ECUME, autresPistes: path.join(avant, "esquisses.json"), ai: simule as never });
    expect(r.arret).toBeUndefined();
    // Aucun appel pour le métier : il est repris de la recherche d'avant, comme dans le Studio.
    expect(appels).not.toContain("metier");
    expect(appels.filter((a) => a.startsWith("planche:")).every((a) => a.includes(":r2-"))).toBe(true);
    // Les pistes déjà présentées, toutes, à la toute fin de la demande exacte.
    const pistes = premieres.gardees.map((g) => g.piste).filter(Boolean);
    expect(pistes.length).toBeGreaterThan(0);
    const demandes = envoyes.filter((e) => e.includes("Varie les couleurs"));
    // Les deux planches du premier tour finissent par toutes les pistes déjà présentées ; un remplacement les garde en tête.
    for (const e of demandes.slice(0, 2)) expect(e.endsWith(`Évite ces pistes déjà présentées : ${pistes.join(" ; ")}.`)).toBe(true);
    for (const e of demandes) expect(e).toContain(`Évite ces pistes déjà présentées : ${pistes.join(" ; ")}`);
    expect(r.gardees.map((g) => g.numero)).toEqual(Array.from({ length: 12 }, (_v, i) => i + 13));
    expect(fs.existsSync(path.join(dir, "esquisse-13.png"))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "esquisses.json"), "utf8")).recherche).toBe(2);
    // Sans esquisses gardées, rien ne part.
    fs.writeFileSync(path.join(dir, "vide.json"), "{}");
    await expect(essaiDesEsquisses({ sortie: sortie(), plafondEuros: "2", client: ECUME, autresPistes: path.join(dir, "vide.json"), ai: simule as never })).rejects.toThrow(/Rien n'est lancé/);
  });

  it("l'étape 2 enchaîne : elle retrouve les esquisses gardées, leurs fichiers et leurs phrases ; une écartée ou une phrase douteuse est refusée", async () => {
    const dir = sortie();
    refuser = { 1: new Set([3, 5]) };
    await essaiDesEsquisses({ sortie: dir, plafondEuros: "2", client: ECUME, ai: simule as never });
    const rapport = path.join(dir, "rapport.txt");
    expect(F.metierDeLEssai({ rapport })).toBe(METIER_ECUME.metier);
    const gardees = F.esquissesGardees(rapport)!;
    expect(gardees.map((g) => g.numero)).toEqual(Array.from({ length: 12 }, (_v, i) => i + 1));
    const choisies = [path.join(dir, "esquisse-01.png"), path.join(dir, "esquisse-04.png")];
    for (const c of choisies) expect(fs.existsSync(c)).toBe(true);
    expect(F.nonGardees(choisies, gardees)).toEqual([]);
    expect(F.nonGardees([path.join(dir, "esquisse-13.png")], gardees)).toEqual(["esquisse-13.png"]);
    expect(F.nonGardees([path.join(dir, fs.readdirSync(dir).find((x) => x.startsWith("ecartee-"))!)], gardees)).toHaveLength(1);
    // La phrase relevée sous l'esquisse 1, choisie pour le logo 4 : reprise mot pour mot ; celle de la 2 (douteuse) refusée.
    expect(await F.phrasesDeLEssai([1, 4], { PHRASE_4: "esquisse 1" }, gardees)).toEqual({ 4: { texte: "Savons solides faits main" } });
    await expect(F.phrasesDeLEssai([1, 4], { PHRASE: "esquisse 2" }, gardees)).rejects.toThrow(/orthographe n'est pas sûre/);
    await expect(F.phrasesDeLEssai([1, 4], { PHRASE: "esquisse 3" }, gardees)).rejects.toThrow(/pas de phrase/);
    // Un rapport d'avant le tri (sans esquisses.json) : rien n'est vérifié de plus.
    expect(F.esquissesGardees(path.join(sortie(), "rapport.txt"))).toBeNull();
  });

  it("aucun client par défaut : sans client donné, ou avec un client incomplet, rien n'est lancé", async () => {
    expect(clientDeLEssai({ CLIENT_JSON: FICHIER_ECUME })).toEqual(ECUME);
    expect(() => clientDeLEssai({})).toThrow(/Client de l'essai manquant.*Aucun client n'est pris par défaut/);
    expect(() => clientDeLEssai({ CLIENT_NOM: "Écume" })).toThrow(/Métier du client manquant/);
    expect(() => clientDeLEssai({ CLIENT_NOM: "Écume", CLIENT_METIER: "savonnerie" })).toThrow(/Type du client manquant/);
    expect(() => clientDeLEssai({ CLIENT_NOM: "Écume", CLIENT_METIER: "savonnerie", CLIENT_TYPE: "produits" })).toThrow(/Produits ou prestations du client manquants/);
    expect(() => clientDeLEssai({ CLIENT_JSON: "absent.json" })).toThrow(/introuvable/);
    expect(clientDeLEssai({ CLIENT_JSON: FICHIER_ECUME, CLIENT_PRODUITS: "savons solides ; baumes" }).produits).toEqual(["savons solides", "baumes"]);
    await expect(essaiDesEsquisses({ sortie: sortie(), plafondEuros: "0.80", client: undefined as never, ai: simule as never })).rejects.toThrow(/Client de l'essai manquant/);
    expect(appels).toEqual([]);
    const src = fs.readFileSync("scripts/syna-recette/essai-esquisses.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-esquisses-outil.ts", "utf8") + fs.readFileSync("scripts/syna-recette/client-de-l-essai.ts", "utf8");
    expect(sansRacine(src)).toBe(true);
  });

  it("le devis, sans appel : le métier, les deux planches, la relecture, puis jusqu'à trois tours de remplacement à la charge du Studio", async () => {
    const d = await devisDesEsquisses();
    const { devisDeLaRecherche } = await import("@/lib/syna-agent/logo-graphistes");
    const s = devisDeLaRecherche();
    expect(d.devisDuStudio).toEqual({ maxMicro: s.maxMicro, studioMaxMicro: s.studioMaxMicro, probableMicro: s.probableMicro });
    expect(d.lignes).toHaveLength(4 + 1 + 3 * 3);
    expect(d.lignes.filter((l) => l.charge === "Studio")).toHaveLength(1 + 3 * 3);
    expect(Math.abs(d.probableMicro - s.probableMicro)).toBeLessThanOrEqual(2);
    // Le plafond du client de la recherche, plus la réécriture du métier et les trois tours de remplacement, à la charge du Studio.
    expect(d.plafondMinimalMicro).toBe(Math.ceil(d.lignes.reduce((n, l) => n + l.maxMicro, 0)));
    expect(Math.abs(d.plafondMinimalMicro - (s.maxMicro + 3 * s.repriseMicro + d.lignes[1].maxMicro))).toBeLessThanOrEqual(5);
    // La borne du Studio de la tâche couvre exactement ces reprises.
    expect(Math.abs(s.studioMaxMicro - (3 * s.repriseMicro + d.lignes[1].maxMicro))).toBeLessThanOrEqual(5);
    expect(d.probableAvecReprisesMicro).toBeGreaterThan(d.probableMicro);
  });

  it("le script lancé seul n'écrit jamais une clé ; il passe par la recherche du parcours, rien après", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-esquisses.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-esquisses-outil.ts", "utf8");
    expect(src).toContain("process.env.STUDIO_ANTHROPIC_KEY");
    expect(src).not.toMatch(/sk-ant-|sk-proj-/);
    expect(src).toContain("uneRecherche(ai, { nom: CLIENT.nom, metier, depart: avant?.depart ?? 1, eviter: avant?.eviter ?? [], recherche: avant?.recherche ?? 1 })");
    expect(src).toContain("vraisAppels(");
    expect(src).not.toMatch(/ai\.(rediger|finaliser|relireLogo)\(|uneFinalisation\(|lancerLesPlanches\(/);
  });
});
