/**
 * La méthode des graphistes, essais simulés (aucun appel payant) : la recherche et ses reprises, la panne jamais relancée,
 * le choix limité à N, la finalisation et sa ligne d'évolution, la relecture et ses raisons, la note de 8, la reprise
 * unique, les couleurs de logos synthétiques, la variété qui ne touche que le fond, la règle des modèles, le devis et les
 * deux plafonds, la carte à l'écran, « Évite ces pistes ».
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ESQUISSES_MIN, appliquerLaRelecture, nomExact, rechercheDesEsquisses, type RechercheDeps, type RelectureEsquisses } from "@/lib/syna-agent/esquisses";
import { LIGNE_D_EVOLUTION, ligneDeLaPhrase, RELECTEUR_DU_LOGO_FINI, RelectureDuLogoSchema, consigneDeFinalisation, demandeAuRelecteurDuLogo, controleDuTexte, debutDeReprise, texteDeReprise, finaliserUneEsquisse, retoucherLesCouleurs, texteDeRetouche, phrasesDe, raisonsDuRefus, type FinalisationDeps, type RelectureDuLogo } from "@/lib/syna-agent/logo-finalisation";
import { basculer, messageDuChoix } from "@/lib/syna-agent/choix-esquisses";
import { couleursDuLogo, memePoliceDeTitres, paletteDesGroupes, remettreLesCouleursDuLogo } from "@/lib/syna-agent/couleurs-du-logo";
import { contrast } from "@/lib/color";

// ---------------------------------------------------------------- fausses planches

const dessin = (cx: number, cy: number) => [
  { input: { create: { width: 80, height: 80, channels: 3 as const, background: "#E0703A" } }, left: cx - 40, top: cy - 100 },
  ...Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 44, height: 80, channels: 3 as const, background: "#1F3D5B" } }, left: cx - 150 + i * 62, top: cy + 10 })),
];
const planche = () => sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#FFFFFF" } }).composite([0, 1].flatMap((r) => [0, 1, 2].flatMap((c) => dessin(256 + c * 512, 256 + r * 512)))).png().toBuffer();
const metier = { metier: "une entreprise de nettoyage de voitures, intérieur et extérieur", court: "le nettoyage automobile", piste: "savoir-faire" as const };
const relecture = (n: number, garder: (i: number) => boolean, nom = "Reflet"): RelectureEsquisses => ({ esquisses: Array.from({ length: n }, (_v, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: garder(i) ? nom : "Refelt", arche: false, ok: true, pourquoi: "net", piste: `piste ${i + 1}` })) });

function deps(o: { garder: (tour: number, i: number) => boolean; panne?: string }) {
  const prompts: { modele: string; prompt: string; tour: number }[] = [], studio: number[] = [];
  let enStudio = false;
  const d: RechercheDeps = {
    planche: async (modele, prompt, tour) => { prompts.push({ modele, prompt, tour }); if (o.panne === modele) throw new Error("502 upstream request failed"); return { png: await planche(), requestId: `req_${modele}_${tour}`, usage: null, coutMicro: 1 }; },
    relire: async (images, nom, tour) => { if (enStudio) studio.push(tour); return relecture(images.length, (i) => o.garder(tour, i), nom); },
    aLaChargeDuStudio: async (fn) => { enStudio = true; try { return await fn(); } finally { enStudio = false; } },
  };
  return { d, prompts, studio };
}

describe("la recherche : découpe, relecture en un appel, reprise unique sous 8, panne jamais relancée", () => {
  it("12 esquisses gardées : aucune reprise, numérotées sans trou à partir de 1", async () => {
    const t = deps({ garder: () => true });
    const r = await rechercheDesEsquisses(t.d, { nom: "Reflet", metier });
    expect(t.prompts).toHaveLength(2);
    expect(new Set(t.prompts.map((p) => p.prompt)).size).toBe(1); // le même texte exact pour les deux modèles
    expect(t.prompts.map((p) => p.modele).sort()).toEqual(["gpt-image-2.5-sunburst", "gpt-image-2.6-flare"]);
    expect(r.reprise).toBe(false);
    expect(r.esquisses.map((e) => e.numero)).toEqual(Array.from({ length: 12 }, (_v, i) => i + 1));
    expect(r.contact).toBeTruthy();
  });
  it("moins de 8 gardées : les deux planches refaites UNE fois, à la charge du Studio, avec « Évite ces pistes déjà présentées : … »", async () => {
    // Premier tour : 5 gardées (nom mal écrit sur les autres) ; second tour : toujours peu ; jamais de troisième tour.
    const t = deps({ garder: (tour, i) => (tour === 1 ? i < 5 : i < 2) });
    const r = await rechercheDesEsquisses(t.d, { nom: "Reflet", metier });
    expect(t.prompts).toHaveLength(4);
    expect(t.prompts.filter((p) => p.tour === 2)).toHaveLength(2);
    const second = t.prompts.find((p) => p.tour === 2)!.prompt;
    expect(second).toMatch(/ Varie les couleurs d'une esquisse à l'autre\. Évite ces pistes déjà présentées : piste 1 ; piste 2 ; piste 3 ; piste 4 ; piste 5\.$/);
    expect(t.prompts[0].prompt).toMatch(/ Varie les couleurs d'une esquisse à l'autre\.$/);
    expect(second.startsWith(t.prompts[0].prompt)).toBe(true);
    expect(t.studio).toEqual([2]);
    expect(r.reprise).toBe(true);
    expect(r.esquisses).toHaveLength(7);
    expect(r.esquisses.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ESQUISSES_MIN).toBe(8);
  });
  it("une panne du fournisseur n'est jamais relancée : pas de reprise, l'autre planche sert", async () => {
    const t = deps({ garder: () => true, panne: "gpt-image-2.6-flare" });
    const r = await rechercheDesEsquisses(t.d, { nom: "Reflet", metier });
    expect(t.prompts.filter((p) => p.modele === "gpt-image-2.6-flare")).toHaveLength(1);
    expect(t.prompts).toHaveLength(2);
    expect(r.reprise).toBe(false);
    expect(r.manquees.map((m) => m.modele)).toEqual(["gpt-image-2.6-flare"]);
    expect(r.esquisses).toHaveLength(6);
  });
  it("« d'autres pistes » : la numérotation continue, les pistes vues sont évitées", async () => {
    const t = deps({ garder: () => true });
    const r = await rechercheDesEsquisses(t.d, { nom: "Reflet", metier, depart: 13, eviter: ["un R dont la boucle dessine une voiture"] });
    expect(r.esquisses[0].numero).toBe(13);
    expect(t.prompts[0].prompt).toMatch(/ Varie les couleurs d'une esquisse à l'autre\. Évite ces pistes déjà présentées : un R dont la boucle dessine une voiture\.$/);
  });
  it("le nom est comparé par le code ; une esquisse refusée n'est jamais gardée", () => {
    const c = [0, 1, 2, 3, 4].map((i) => ({ modele: "m", index: i, png: Buffer.from("x"), requestId: null }));
    const v: RelectureEsquisses = { esquisses: [
      { numero: 1, entiere: true, morceauDeVoisine: false, nomLu: "REFLET", arche: false, ok: true, pourquoi: "", piste: "a" },
      { numero: 2, entiere: false, morceauDeVoisine: false, nomLu: "Reflet", arche: false, ok: true, pourquoi: "coupée", piste: "b" },
      { numero: 3, entiere: true, morceauDeVoisine: true, nomLu: "Reflet", arche: false, ok: true, pourquoi: "", piste: "c" },
      { numero: 4, entiere: true, morceauDeVoisine: false, nomLu: "Reflet", arche: true, ok: true, pourquoi: "", piste: "d" },
      { numero: 5, entiere: true, morceauDeVoisine: false, nomLu: "Réflet", arche: false, ok: true, pourquoi: "", piste: "e" },
    ] };
    const a = appliquerLaRelecture("Reflet", c, v, 1);
    expect(a.gardees.map((g) => g.piste)).toEqual(["a"]);
    expect(a.refusees.map((r) => r.raison)).toEqual(["pas entière : coupée", "un morceau de la voisine", "une arche", "nom mal écrit : « Réflet »"]);
    expect(nomExact("  reflet ", "Reflet")).toBe(true);
    expect(nomExact("Pénombre", "Penombre")).toBe(false);
  });
});

describe("le choix limité à N (2, 3 ou 4 selon le forfait ; moins est permis)", async () => {
  const { controleDuChoix, esquissesAChoisir } = await import("@/lib/syna-agent/logo-graphistes");
  const etat = { max: 3, esquisses: [1, 2, 3, 5, 7, 11].map((numero) => ({ numero, assetId: `a${numero}`, modele: "m", piste: "", tour: 1, recherche: 1, requestId: null })) };
  it("refuse un numéro inconnu ou refusé, et plus de N ; moins est permis, jusqu'à deux (une proposition compte au moins deux identités)", () => {
    expect(controleDuChoix(etat, [3, 7, 11])).toBeNull();
    expect(controleDuChoix(etat, [3, 7])).toBeNull();
    expect(controleDuChoix(etat, [3])).toMatch(/au moins deux/);
    expect(controleDuChoix(etat, [4])).toMatch(/inconnue/);
    expect(controleDuChoix(etat, [1, 2, 3, 5])).toMatch(/3 esquisses au plus/);
    expect(controleDuChoix(etat, [])).toMatch(/au moins une/);
    expect([esquissesAChoisir("creer"), esquissesAChoisir("vendre"), esquissesAChoisir("dominer")]).toEqual([2, 3, 4]);
  });
  it("la carte : jamais plus de N cases cochées ; le message « Je choisis les esquisses 3, 7 et 11 »", () => {
    let s: number[] = [];
    for (const n of [7, 3, 11, 5]) s = basculer(s, n, 3);
    expect(s).toEqual([3, 7, 11]);
    expect(basculer(s, 7, 3)).toEqual([3, 11]);
    expect(messageDuChoix([11, 3, 7])).toBe("Je choisis les esquisses 3, 7 et 11");
    expect(messageDuChoix([4])).toBe("Je choisis l'esquisse 4");
    expect(messageDuChoix([3, 7], "en")).toBe("I choose sketches 3 and 7");
  });
});

describe("la carte des esquisses à l'écran", async () => {
  const { EsquissesCards } = await import("@/components/studio/syna-thread");
  const esquisses = { max: 2, choix: [] as number[], list: [1, 2, 3, 4].map((n) => ({ numero: n, href: `/a/${n}.png`, piste: "" })), logos: [] };
  it("une grille numérotée, une case par esquisse, un bouton qui s'étire (jamais coupé)", () => {
    const html = renderToStaticMarkup(createElement(EsquissesCards, { esquisses, busy: false, onChoose: () => undefined }));
    expect(html.match(/data-esquisse-case="/g)).toHaveLength(4);
    expect(html).toContain("2 au plus");
    expect(html).toMatch(/data-esquisses-choisir[^>]*disabled|disabled[^>]*data-esquisses-choisir/);
    // CHOIX_ENTIER : hauteur libre et retour à la ligne (règle « jamais un bouton coupé »).
    expect(html).toMatch(/!h-auto[^"]*!whitespace-normal/);
    for (const n of [1, 2, 3, 4]) expect(html).toContain(`>${n}</span>`);
  });
  it("une fois le choix fait : plus de cases, les choisies entourées", () => {
    const html = renderToStaticMarkup(createElement(EsquissesCards, { esquisses: { ...esquisses, choix: [2] }, busy: false, onChoose: () => undefined }));
    expect(html).not.toContain("data-esquisse-case");
    expect(html).not.toContain("data-esquisses-choisir");
    expect(html).toContain("ring-accent");
  });
});

// ---------------------------------------------------------------- finalisation

/** La consigne de finaliser.py, mot pour mot (preuve du 24 novembre 2026, branche du chef d'orchestre). */
const CONSIGNE_DE_LA_PREUVE = `Tu es la directrice artistique d'un studio de création de marques. Le client Reflet (une entreprise de nettoyage de voitures, intérieur et extérieur) a choisi
l'esquisse de logo jointe parmi douze. Tu écris le texte qui sera envoyé tel quel à un modèle d'image pour transformer
cette esquisse en logo fini. Ce texte, en français :
- commence par « Transforme cette esquisse en véritable logo contemporain pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur. » ;
- nomme précisément l'idée centrale de l'esquisse, celle qui la distingue, et demande de la conserver ;
- demande d'améliorer fortement le dessin : lettres plus soignées et plus distinctives, proportions, espacement,
  équilibre visuel et présence de marque, en restant très lisible ;
- demande de simplifier ce qui fait trop illustration pour que le signe reste graphique ;
- donne une direction de palette adaptée au métier et à l'esquisse ;
- finit par : style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste,
  pas de dégradé excessif ;
- garde une ligne descriptive discrète seulement si elle dit exactement le métier du client ; toute autre phrase est retirée.
N'ajoute aucune idée qui n'est pas dans l'esquisse. Dix phrases au plus.
Réponds uniquement en JSON : {"idee_centrale": "…", "texte": "…"}`;
/** Le texte écrit par le modèle le plus fort pour l'esquisse 4 de Reflet (logo-4-texte-ecrit-par-sina.txt). */
const TEXTE_REFLET_4 = "Transforme cette esquisse en véritable logo contemporain pour Reflet, une entreprise de nettoyage de voitures, intérieur et extérieur. Conserve l’idée centrale : un fin trait de lumière horizontal traverse la partie droite du nom « Reflet » et se termine par un éclat à quatre pointes. Redessine en profondeur les lettres pour leur donner des courbes plus soignées et des formes plus distinctives, tout en préservant leur grande lisibilité. Ajuste les proportions et l’espacement lettre par lettre, puis équilibre la largeur du nom et la taille de l’éclat pour renforcer la présence de marque. Réduis les filets lumineux à un seul trait net et stylise les quatre pointes pour que le signe reste graphique plutôt qu’illustratif. Garde le bleu nuit pour le lettrage et réserve un bleu cyan franc au trait et à l’éclat. Sous le nom, conserve pour seule ligne descriptive « Nettoyage automobile intérieur & extérieur », en petits caractères discrets et lisibles ; retire toute autre phrase. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif";
const NOM = "Reflet", METIER = "une entreprise de nettoyage de voitures, intérieur et extérieur";
const AVEC_EVOLUTION = TEXTE_REFLET_4.replace("Redessine en profondeur", "Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. Redessine en profondeur");

describe("la finalisation : la consigne de finaliser.py mot pour mot, plus la ligne d'évolution", () => {
  it("la consigne est celle de la preuve, avec une seule ligne ajoutée", () => {
    const c = consigneDeFinalisation(NOM, METIER);
    // Deux écarts seulement avec la preuve : la ligne d'évolution, et « parmi douze » devenu « parmi les esquisses
    // proposées » (décision du chef d'orchestre du 24 novembre 2026 : le client en voit de 8 à 24, la consigne dit vrai).
    expect(c).not.toContain("parmi douze");
    expect(c.replace(`${LIGNE_D_EVOLUTION}\n`, "")).toBe(CONSIGNE_DE_LA_PREUVE.replace("parmi douze.", "parmi les esquisses proposées."));
    expect(c).toContain("- demande toujours de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus distinctive, jamais de seulement la nettoyer ou l'agrandir ;");
    // La phrase sous le nom choisie par le client (24 novembre 2026 au soir) : un troisième écart, seulement quand il a
    // choisi, et d'une seule ligne, placée juste après la ligne descriptive ; sans son choix, la consigne est celle d'avant.
    const p = { texte: "Nettoyage automobile intérieur & extérieur" };
    expect(consigneDeFinalisation(NOM, METIER, p).replace(`${LIGNE_D_EVOLUTION}\n`, "").replace(`${ligneDeLaPhrase(p)}\n`, "")).toBe(CONSIGNE_DE_LA_PREUVE.replace("parmi douze.", "parmi les esquisses proposées."));
    expect(consigneDeFinalisation(NOM, METIER, { aucune: true }).replace(`${LIGNE_D_EVOLUTION}\n`, "").replace(`${ligneDeLaPhrase({ aucune: true })}\n`, "")).toBe(CONSIGNE_DE_LA_PREUVE.replace("parmi douze.", "parmi les esquisses proposées."));
    expect(consigneDeFinalisation(NOM, METIER, p).split("\n").length).toBe(c.split("\n").length + 1);
  });
  it("le contrôle gratuit du texte : le texte de la preuve passe tout, sauf l'évolution (il ne la demandait pas)", () => {
    expect(phrasesDe(TEXTE_REFLET_4).length).toBeLessThanOrEqual(10);
    expect(controleDuTexte(TEXTE_REFLET_4, NOM, METIER)).toEqual(["il doit demander de faire évoluer l'idée de l'esquisse vers une identité plus aboutie et plus distinctive"]);
    expect(controleDuTexte(AVEC_EVOLUTION, NOM, METIER)).toEqual([]);
    expect(controleDuTexte(AVEC_EVOLUTION.replace("Transforme cette esquisse", "Transforme l'esquisse"), NOM, METIER)[0]).toMatch(/commencer exactement/);
    expect(controleDuTexte(AVEC_EVOLUTION.replace(", pas de dégradé excessif", ""), NOM, METIER)[0]).toMatch(/finir exactement/);
    expect(controleDuTexte(`${AVEC_EVOLUTION.split(" style vectoriel")[0]} Un. Deux. Trois. Quatre. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`, NOM, METIER).join()).toMatch(/dix phrases/);
  });
});

const bon: RelectureDuLogo = { nomLu: "Reflet", ideeConservee: true, arche: false, phrase: "Nettoyage automobile", phraseDitLeMetier: true, note: 9, pourquoi: "net" };
describe("la relecture du logo fini : le nom, l'idée, l'arche, la phrase et la note de 8 ; jamais « trop proche de l'esquisse »", () => {
  it("chaque raison refuse, seule ; le bon logo passe", () => {
    expect(raisonsDuRefus(bon, NOM)).toEqual([]);
    expect(raisonsDuRefus({ ...bon, nomLu: "Refl3t" }, NOM)[0]).toMatch(/nom est mal écrit/);
    expect(raisonsDuRefus({ ...bon, ideeConservee: false }, NOM)).toEqual(["l'idée de l'esquisse est perdue"]);
    expect(raisonsDuRefus({ ...bon, arche: true }, NOM)).toEqual(["le dessin est posé dans une arche"]);
    expect(raisonsDuRefus({ ...bon, phrase: "Brillance garantie", phraseDitLeMetier: false }, NOM)[0]).toMatch(/inventée et ne dit pas le vrai métier/);
    expect(raisonsDuRefus({ ...bon, note: 7.5 }, NOM)[0]).toMatch(/pas au niveau \(7\.5\/10, il faut 8\)/);
    expect(raisonsDuRefus({ ...bon, note: 8 }, NOM)).toEqual([]);
  });
  it("un logo fidèle à son esquisse n'est jamais refusé pour être trop proche (24 novembre 2026, « Ouais » du propriétaire)", () => {
    // Le relecteur ne juge plus l'évolution : la question n'est plus posée, une réponse d'ancien format est ignorée.
    expect(RELECTEUR_DU_LOGO_FINI).not.toMatch(/evolution|évolu|trop proche|copie nettoyée/i);
    expect(Object.keys(RelectureDuLogoSchema.shape)).not.toContain("evolution");
    const ancien = RelectureDuLogoSchema.parse({ ...bon, evolution: false });
    expect(raisonsDuRefus(ancien, NOM)).toEqual([]);
    // Aucun indice d'écart entre l'esquisse et le logo n'est donné au relecteur.
    expect(demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: AVEC_EVOLUTION })).not.toMatch(/écart|indice|identiques/i);
    // La ligne d'évolution du texte de finalisation reste.
    expect(consigneDeFinalisation(NOM, METIER)).toContain(LIGNE_D_EVOLUTION);
  });
});

describe("la finalisation entière : texte réécrit une fois, logo refait une fois à partir du logo refusé, refusé deux fois : pas gardé", () => {
  const logo = (c: string) => sharp({ create: { width: 900, height: 400, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 500, height: 120, channels: 3, background: c } }, left: 200, top: 140 }]).png().toBuffer();
  const esquisse = () => sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 300, height: 90, channels: 3, background: "#1F3D5B" } }, left: 106, top: 211 }]).png().toBuffer();
  function f(o: { textes: string[]; verdicts: RelectureDuLogo[] }) {
    const vu = { rediger: [] as string[], finaliser: [] as string[], studio: [] as string[], jointes: [] as Buffer[], dessines: [] as Buffer[], references: [] as Buffer[] };
    let enStudio = false;
    const teintes = ["#1F3D5B", "#5B1F2E", "#2E5B1F"];
    const d: FinalisationDeps = {
      rediger: async (consigne) => { vu.rediger.push(consigne); if (enStudio) vu.studio.push("rediger"); return { idee_centrale: "un trait de lumière", texte: o.textes.shift()! }; },
      finaliser: async (jointe, texte) => { vu.finaliser.push(texte); vu.jointes.push(jointe); if (enStudio) vu.studio.push("finaliser"); const png = await logo(teintes[vu.dessines.length % teintes.length]); vu.dessines.push(png); return png; },
      relire: async (_l, reference) => { vu.references.push(reference); return o.verdicts.shift()!; },
      detourer: async (png) => ({ ok: true, png }),
      aLaChargeDuStudio: async (fn) => { enStudio = true; try { return await fn(); } finally { enStudio = false; } },
    };
    return { d, vu };
  }
  it("un texte sans évolution est réécrit une fois, à la charge du Studio ; le texte envoyé est celui du rédacteur, tel quel", async () => {
    const t = f({ textes: [TEXTE_REFLET_4, AVEC_EVOLUTION], verdicts: [bon] });
    const r = await finaliserUneEsquisse(t.d, { nom: NOM, metier: METIER, esquisse: await esquisse() });
    expect(r.ok).toBe(true);
    expect(t.vu.rediger).toHaveLength(2);
    expect(t.vu.studio).toEqual(["rediger"]);
    expect(t.vu.finaliser).toEqual([AVEC_EVOLUTION]);
  });
  it("refusé une fois : refait UNE fois, à la charge du Studio, les corrections au début du texte, puis le texte tel qu'il était", async () => {
    const t = f({ textes: [AVEC_EVOLUTION], verdicts: [{ ...bon, ideeConservee: false, note: 6 }, bon] });
    const r = await finaliserUneEsquisse(t.d, { nom: NOM, metier: METIER, esquisse: await esquisse() });
    expect(r.ok).toBe(true);
    expect(t.vu.finaliser).toEqual([AVEC_EVOLUTION, `Corrige uniquement : l'idée de l'esquisse est perdue ; il n'est pas au niveau (6/10, il faut 8) ; garde tout le reste à l'identique.\n\n${AVEC_EVOLUTION}`]);
    expect(t.vu.finaliser[1]).toBe(texteDeReprise(["l'idée de l'esquisse est perdue", "il n'est pas au niveau (6/10, il faut 8)"], AVEC_EVOLUTION));
    expect(t.vu.finaliser[1]).not.toMatch(/À corriger/);
    expect(t.vu.finaliser[1].endsWith(AVEC_EVOLUTION)).toBe(true);
    expect(t.vu.studio).toEqual(["finaliser"]);
  });
  it("la reprise : le dessinateur reçoit le logo refusé (plus l'esquisse), le relecteur toujours l'esquisse ; les corrections d'abord, puis le texte", async () => {
    // Le constat de l'essai réel de Racine (25 novembre 2026) : la feuille sur le i refusée deux fois à 7 pour les mêmes défauts.
    const defauts = ["La feuille est trop haute et décalée vers la droite du « i » : on ne la lit plus aussi bien comme le point de la lettre.", "Le haut du « i » est coupé en biais et ressemble à un accent, ce qui peut faire lire « racíne »."];
    const t = f({ textes: [AVEC_EVOLUTION], verdicts: [{ ...bon, note: 7, defauts }, bon] });
    const esq = await esquisse();
    const r = await finaliserUneEsquisse(t.d, { nom: NOM, metier: METIER, esquisse: esq });
    expect(r.ok).toBe(true);
    // L'image jointe : l'esquisse au premier essai, le logo refusé (le premier dessiné) à la reprise.
    expect(t.vu.jointes).toHaveLength(2);
    expect(t.vu.jointes[0].equals(esq)).toBe(true);
    expect(t.vu.jointes[1].equals(t.vu.dessines[0])).toBe(true);
    expect(t.vu.jointes[1].equals(esq)).toBe(false);
    // Le relecteur des deux essais reçoit l'esquisse, référence de l'idée.
    expect(t.vu.references.map((b) => b.equals(esq))).toEqual([true, true]);
    // Le texte : les corrections précises d'abord (les défauts écrits, sans la phrase de la note), puis le texte tel qu'il était.
    expect(debutDeReprise(r.essais[0].raisons)).toBe("Corrige uniquement : La feuille est trop haute et décalée vers la droite du « i » : on ne la lit plus aussi bien comme le point de la lettre ; Le haut du « i » est coupé en biais et ressemble à un accent, ce qui peut faire lire « racíne » ; garde tout le reste à l'identique.");
    expect(t.vu.finaliser[1]).toBe(`${debutDeReprise(r.essais[0].raisons)}\n\n${AVEC_EVOLUTION}`);
    expect(t.vu.finaliser[1].indexOf("Corrige uniquement")).toBe(0);
    expect(t.vu.finaliser[1]).not.toMatch(/À corriger|il n'est pas au niveau/);
    expect(r.ok && r.texte).toBe(t.vu.finaliser[1]);
    expect(t.vu.studio).toEqual(["finaliser"]);
  });
  it("la retouche des couleurs : sa reprise part de la retouche refusée, le relecteur compare au logo d'origine", async () => {
    const t = f({ textes: [], verdicts: [{ ...bon, note: 6, defauts: ["le vert déborde sur le contour du R"] }, bon] });
    const origine = await logo("#000000");
    const r = await retoucherLesCouleurs(t.d, { nom: NOM, metier: METIER, logo: origine, demande: "en vert sapin" });
    expect(r.ok).toBe(true);
    expect(t.vu.jointes[0].equals(origine)).toBe(true);
    expect(t.vu.jointes[1].equals(t.vu.dessines[0])).toBe(true);
    expect(t.vu.references.map((b) => b.equals(origine))).toEqual([true, true]);
    expect(t.vu.finaliser).toEqual([texteDeRetouche("en vert sapin"), `Corrige uniquement : le vert déborde sur le contour du R ; garde tout le reste à l'identique.\n\n${texteDeRetouche("en vert sapin")}`]);
    expect(t.vu.studio).toEqual(["finaliser"]);
  });
  it("refusé deux fois : l'identité n'est pas construite, jamais de troisième essai", async () => {
    const t = f({ textes: [AVEC_EVOLUTION], verdicts: [{ ...bon, arche: true }, { ...bon, arche: true }, bon] });
    const r = await finaliserUneEsquisse(t.d, { nom: NOM, metier: METIER, esquisse: await esquisse() });
    expect(r.ok).toBe(false);
    expect(t.vu.finaliser).toHaveLength(2);
    if (!r.ok) expect(r.raison).toMatch(/refusé deux fois \(le dessin est posé dans une arche\)/);
    const { phraseDuLogoNonConstruit } = await import("@/lib/syna-agent/logo-graphistes");
    expect(phraseDuLogoNonConstruit(4, [4, 8])).toMatch(/je ne construis pas cette identité.*l'esquisse|la 8/);
  });
  it("un fond qui ne se retire pas proprement : refusé sans relecture payée, puis refait une fois", async () => {
    const t = f({ textes: [AVEC_EVOLUTION], verdicts: [bon] });
    let n = 0;
    t.d.detourer = async (png) => (n++ === 0 ? { ok: false, why: "son fond ne peut pas être retiré proprement (dégradé)" } : { ok: true, png });
    const r = await finaliserUneEsquisse(t.d, { nom: NOM, metier: METIER, esquisse: await esquisse() });
    expect(r.ok).toBe(true);
    expect(t.vu.finaliser[1]).toBe(`Corrige uniquement : son fond ne peut pas être retiré proprement (dégradé) ; garde tout le reste à l'identique.\n\n${AVEC_EVOLUTION}`);
    expect(t.vu.jointes[1].equals(t.vu.dessines[0])).toBe(true);
  });
});

// ---------------------------------------------------------------- le logo d'abord : couleurs

const logoDe = (blocs: { c: string; w: number }[]) => {
  let x = 20;
  const comp = blocs.map((b) => { const o = { input: { create: { width: b.w, height: 200, channels: 4 as const, background: b.c } }, left: x, top: 20 }; x += b.w + 20; return o; });
  return sharp({ create: { width: x, height: 240, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toBuffer();
};
/** Deux couleurs à 4 près par canal (le redimensionnement arrondit). */
const proche = (a: string, b: string) => [1, 3, 5].every((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 4);
describe("les couleurs tirées du logo (code, gratuit)", () => {
  it("un logo bleu nuit + cyan : foncé lisible, marque vive, accent d'une autre teinte ou la marque, teintes claires", async () => {
    const c = await couleursDuLogo(await logoDe([{ c: "#0B2545", w: 300 }, { c: "#13A8E0", w: 120 }]));
    expect(c.uneSeuleCouleur).toBe(false);
    expect(contrast(c.palette.dark, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(proche(c.palette.primary, "#13A8E0")).toBe(true);
    expect(c.palette.accent).toBe(c.palette.primary); // une seule couleur vive : l'accent reprend la marque
    expect(c.palette.light).not.toBe(c.palette.primary);
  });
  it("trois teintes vraiment différentes : l'accent en est une autre ; le presque-blanc est écarté", async () => {
    const c = await couleursDuLogo(await logoDe([{ c: "#1B1B1B", w: 200 }, { c: "#D7263D", w: 200 }, { c: "#F4B400", w: 100 }, { c: "#FDFDFD", w: 200 }]));
    expect(c.groupes.some((g) => g.hex.toLowerCase() === "#fdfdfd")).toBe(false);
    expect(proche(c.palette.dark, "#1B1B1B")).toBe(true);
    expect(proche(c.palette.primary, "#D7263D")).toBe(true);
    expect(proche(c.palette.accent, "#F4B400")).toBe(true);
  });
  it("un logo d'une seule couleur : son encre plus des neutres", async () => {
    const c = await couleursDuLogo(await logoDe([{ c: "#2F6A4E", w: 300 }]));
    expect(c.uneSeuleCouleur).toBe(true);
    expect(proche(c.palette.primary, "#2F6A4E")).toBe(true);
    expect(c.palette.accent).toBe(c.palette.primary);
    expect([c.palette.secondary, c.palette.light]).toEqual(["#F4F4F2", "#FFFFFF"]);
  });
  it("une encre trop claire pour se lire sur blanc : le foncé est assombri jusqu'à 4,5", () => {
    const p = paletteDesGroupes([{ hex: "#7FB3FF", part: 0.7 }, { hex: "#FFB37F", part: 0.3 }]).palette;
    expect(contrast(p.dark, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
  it("la direction ne change pas les couleurs du logo : le code les remet ; deux identités n'ont jamais la même police de titres", () => {
    const logo = { dark: "#0B2545", primary: "#13A8E0", secondary: "#E3F4FB", accent: "#13A8E0", light: "#F5FBFE" };
    const r = remettreLesCouleursDuLogo({ ...logo, primary: "#FF0000" }, logo);
    expect(r.palette.primary).toBe("#13A8E0");
    expect(r.changes).toHaveLength(1);
    expect(memePoliceDeTitres([{ key: "A", fonts: { heading: "anton_n4" } }, { key: "B", fonts: { heading: "anton_n7" } }, { key: "C", fonts: { heading: "lora_n4" } }])).toEqual(["B"]);
  });
});

describe("la variété, avec les couleurs du logo, ne touche que le fond de page", async () => {
  const { varierIdentites } = await import("@/lib/syna-agent/variete-marques");
  const { route } = await import("./sina-routes-fixtures");
  it("la police de titres reprise d'une marque récente reste (elle vient du logo) ; seul le fond clair peut changer", () => {
    const x = route("A") as any;
    const recent = [{ heading: x.fonts.heading, light: x.palette.light }] as any;
    const avec = varierIdentites([x], recent, { modifiables: ["A"], couleursDuLogo: true });
    expect(avec.list[0].fonts).toEqual(x.fonts);
    expect(avec.list[0].palette.primary).toBe(x.palette.primary);
    expect(avec.list[0].palette.dark).toBe(x.palette.dark);
    expect(avec.changes.every((c) => /fond clair/.test(c))).toBe(true);
    const sans = varierIdentites([x], recent, { modifiables: ["A"] });
    expect(sans.changes.some((c) => /police de titres/.test(c))).toBe(true);
  });
});

describe("les consignes des relecteurs ne portent aucun nom ni exemple d'un projet d'essai (CLAUDE.md)", () => {
  // Les clients et projets d'essai connus (essais réels et anciens projets mis de côté) ; un nom de plus s'ajoute ici.
  const PROJETS_D_ESSAI = ["Racine", "Tenon", "Poppy", "Reflet", "Pénombre", "Sillage", "Tintamarre", "Gorgée", "Fruit Nu", "Pulpe", "Zeste", "Pelage", "infusion", "tisane", "toilettage", "toiletteuse"];
  const EXEMPLES_D_ESSAI = [/feuille sur le i/i, /R bordeaux/i, /esquisse[- ]0?\d+\b/i, /racíne/i, /Le racine du milieu/i];
  it("relecteur du logo fini, relecteur des esquisses, relecteur de la planche : ni nom, ni exemple d'essai", async () => {
    const F = await import("@/lib/syna-agent/logo-finalisation");
    const E = await import("@/lib/syna-agent/esquisses");
    const P = await import("@/lib/syna-agent/planche-de-marque");
    const consignes: Record<string, string> = {
      "relecteur du logo fini": F.RELECTEUR_DU_LOGO_FINI,
      "demande au relecteur du logo": F.demandeAuRelecteurDuLogo({ nom: "Aplomb", metier: "une menuiserie", texte: "t" }),
      "relecteur des esquisses": E.RELECTEUR_DES_ESQUISSES,
      "relecteur de la planche": P.RELECTEUR_DE_LA_PLANCHE,
      "demande au relecteur de la planche": P.demandeAuRelecteurDeLaPlanche({ nom: "Aplomb", annee: 2026, domaine: { domaine: "aplomb.fr", statut: "disponible" }, personnes: false, animaux: true, texte: "t" }),
    };
    for (const [qui, texte] of Object.entries(consignes)) {
      for (const n of PROJETS_D_ESSAI) expect(texte.toLowerCase(), `${qui} : ${n}`).not.toContain(n.toLowerCase());
      for (const x of EXEMPLES_D_ESSAI) expect(texte, `${qui} : ${x}`).not.toMatch(x);
    }
    // Les deux repères envoyés à l'IA sont la question et la réponse du propriétaire, mot pour mot, sans rien d'autre de l'essai.
    expect(F.RELECTEUR_DU_LOGO_FINI).toContain(`à la question « ${F.QUESTION_DU_REPERE} », posée devant des logos finis propres et fidèles à leurs esquisses, le propriétaire du Studio a répondu : « ${F.REPONSE_DU_PROPRIETAIRE} » ;`);
    expect(P.RELECTEUR_DE_LA_PLANCHE).toContain(`à la question « ${P.QUESTION_DU_REPERE_DE_PLANCHE} »`);
    expect(P.RELECTEUR_DE_LA_PLANCHE).toContain(`a répondu : « ${P.REPONSE_DU_PROPRIETAIRE_PLANCHE} » ;`);
    // Le second repère du logo nomme un client d'essai : il reste dans le code et le compte rendu, jamais dans la consigne.
    expect(F.RELECTEUR_DU_LOGO_FINI).not.toContain(F.SECOND_REPERE_DU_PROPRIETAIRE);
    expect(F.RELECTEUR_DU_LOGO_FINI).toContain("- finitions : la liste des petits défauts de finition, ceux qu'un client ne remarquerait pas comme une faute, un seul par ligne, en mots simples ; ils sont transmis comme corrections si le logo est repris, mais ne le font jamais refuser ;");
    expect(F.RELECTEUR_DU_LOGO_FINI).toContain("Une petite finition ne fait jamais descendre la note sous 8");
  });
  it("la planche en vrai : la règle, les lignes des 17 images, l'inventaire et les relectures ne portent ni nom, ni exemple d'essai", async () => {
    const V = await import("@/lib/syna-agent/planche-en-vrai");
    const consignes: Record<string, string> = {
      inventaire: V.INVENTAIRE_SYSTEM, "demande de l'inventaire": V.demandeDeLInventaire("Aplomb"), relecteur: V.RELECTEUR_EN_VRAI,
      ...Object.fromEntries(V.GROUPES.map((g) => [`relecture ${g}`, V.demandeAuRelecteurEnVrai({ nom: "Aplomb", personnes: false, groupe: g, cases: [{ element: "produit-1", photo: true }] })])),
      ...Object.fromEntries(V.NOMS_DES_ELEMENTS.map((n) => [n, V.texteDeLElement({ element: n, nom: "Aplomb", logo: true, photo: true, personnes: false, raisons: ["une raison"] })])),
    };
    for (const [qui, texte] of Object.entries(consignes)) {
      for (const n of [...PROJETS_D_ESSAI, "pépinière", "plante", "pot"]) expect(texte.toLowerCase().split(/[^\p{L}]+/u), `${qui} : ${n}`).not.toContain(n.toLowerCase());
      for (const x of EXEMPLES_D_ESSAI) expect(texte, `${qui} : ${x}`).not.toMatch(x);
    }
  });
});
