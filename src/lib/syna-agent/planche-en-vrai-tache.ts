/**
 * LA PLANCHE EN VRAI DANS LA TÂCHE DE FOND (plan accepté du propriétaire du 25 novembre 2026 ; voir planche-en-vrai.ts).
 *
 * Pour un nouveau projet (sa planche de marque choisie a son image) et quand le réglage `sina.planche.envrai` est allumé,
 * la fin de la marque (brand-finish.ts) passe par ici : l'inventaire (un appel), les 17 images refaites (un appel chacune),
 * leurs relectures par groupe, une reprise au plus à la charge du Studio, puis le code seul (logos, palette, polices,
 * textes) et l'assemblage, gratuit. Chaque appel payé a son point de reprise : `brand:envrai:inventaire`,
 * `brand:envrai:<case>`, `brand:envrai:relecture:<groupe>`, `brand:envrai:<case>:r1` (et la relecture de la reprise,
 * `brand:envrai:relecture:<groupe>:r1`). Une relance de la tâche ne repaie rien ; l'assemblage se refait.
 *
 * Le devis (`devisDeLaPlancheEnVrai`) remplace celui de la marque finie dans l'accord unique de l'étape « La marque ».
 */
import sharp from "sharp";
import type { z } from "zod";
import { L } from "../i18n-server";
import { callCostBoundMicro, estimateCallMicro, llmJson } from "../ai/llm";
import { aLaChargeDuStudio, EUR } from "../billing";
import { aiElementDeLaPlanche, elementDeLaPlancheMaxMicro, recuDElementDeLaPlanche } from "../ai/media-providers";
import { withTrace } from "../ai/trace";
import { borneDuStudio } from "../ai/borne-du-studio";
import { assetData, getAsset, saveAsset } from "../library";
import { loadProject, saveBrand } from "../projects";
import { DEFAULT_MODELS } from "./models";
import { logoDetoure, photosDuProduitIds } from "./brand-images";
import type { Route } from "./brand-routes";
import { lignesDuTexte } from "./phrase-sous-le-nom";
import { blocDeLaFinition, copyright, mentionDuDomaine, nettoyerLesSignesIsoles, porteUnSigneParasite, texteDeLaFinition } from "./planche-de-marque";
import {
  CASES_DU_CODE, ELEMENTS, GROUPES, INVENTAIRE_SYSTEM, InventaireSchema, NOMS_DES_ELEMENTS, RELECTEUR_EN_VRAI, RelectureDuGroupeSchema, TITRES, TUILES_DU_LOGO,
  caseLue, decouperLesApercus, demandeDeLInventaire, inventaireIncomplet, lesCases, phraseDeLaPoliceRemplacee, phraseDeLaPublicationIncomprehensible,
  phraseDeLImageGardeeEnApercu, phraseDesLogosDeLApercu, phraseDuProduitImagine, phraseDuSymboleComplet, promessesDuBloc, refaireLesElements, ETIQUETTE_AMBIANCE,
  type Decoupe, type DemandeDElement, type EtatPlancheEnVrai, type Groupe, type Inventaire, type Laquelle, type NomElement, type RelectureDuGroupe,
} from "./planche-en-vrai";
import {
  GRAISSE_DE_MISE_EN_PAGE, POLICE_DE_MISE_EN_PAGE, VERSIONS_DU_LOGO, assemblerLaPlanche, catalogueDesPolicesParGenre, codesEcritsDeLaPalette, couleurDuLogo, faviconsEtAvatar, luminance,
  imageDuSite, mesurerLaPalette, monoClairDe, paletteRetenue, rognerAuContenu, policeDuCatalogue, rolesDeLaPalette, separerSymbole, texteDuBasDuBadge, versionsDuLogo, type BlocDeTexte, type Separation, type VersionDuLogo,
} from "./planche-en-vrai-code";

// ---------------------------------------------------------------- le devis

/** Les appels de texte de la planche en vrai, en jetons (entrée habituelle, sortie habituelle, limite de sortie), et leur effort. */
export const APPELS_EN_VRAI = {
  // L'inventaire : 17 aperçus, les blocs du code, la rangée des logos, les titres et le logo ; une réponse longue. Effort élevé.
  // Plus la liste des polices du catalogue par genre (26 novembre 2026), comptée large : un jeton pour trois octets.
  inventaire: { input: 32_000 + Math.ceil(Buffer.byteLength(catalogueDesPolicesParGenre()) / 3), output: 6_000, max: 16_000, effort: "high" },
  // Une relecture de groupe : jusqu'à 6 paires (aperçu et image refaite), une photo du produit. Effort élevé.
  relecture: { input: 18_000, output: 3_000, max: 8_000, effort: "high" },
} as const;
const APPELS = APPELS_EN_VRAI;
/** Le modèle d'un appel de texte de la planche en vrai (le relecteur le plus fort, avec l'effort de l'appel). */
export const modeleDe = (a: keyof typeof APPELS) => ({ ...DEFAULT_MODELS.strong, effort: APPELS[a].effort });
const appel = (a: keyof typeof APPELS) => {
  const c = APPELS[a], m = modeleDe(a), usual = estimateCallMicro(m.provider, m.model, c.input, c.output) ?? 0;
  return { max: callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort) ?? usual * 4, probable: usual };
};
/**
 * Les prix mesurés (euros) des images refaites lors de l'essai de la planche en vrai (25 novembre 2026, bilans des preuves :
 * bilan.json, elements/bilan-partie-1.json et -2.json). La sixième référence, faite en « medium » dans l'essai, est comptée
 * au prix des autres références en « high ».
 */
export const PRIX_MESURES: Record<NomElement, number> = {
  "publication-1x1": 0.0603, "publication-4x5": 0.0544, "publication-9x16": 0.0475, "ouverture-site": 0.0336, "ouverture-planche": 0.0323,
  "site-ordinateur": 0.0512, "site-telephone": 0.0359, "produit-1": 0.0499, "produit-2": 0.0499, "produit-3": 0.0499, emballage: 0.0553,
  "reference-1": 0.0516, "reference-2": 0.0516, "reference-3": 0.0516, "reference-4": 0.0516, "reference-5": 0.0516, "reference-6": 0.0516,
};
export type DevisDeLaPlancheEnVrai = { maxMicro: number; probableMicro: number; repriseMicro: number; repriseProbableMicro: number; studioMaxMicro: number; images: number };
/**
 * LE DEVIS de la planche en vrai (aucun appel) : l'inventaire, les 17 images (au plus : trois images jointes chacune, la
 * borne officielle des jetons en « high ») et les quatre relectures. La reprise : chaque image refaite une fois avec sa
 * relecture ; la borne du Studio compte UNE reprise. `faits` : les points de reprise déjà payés (une relance ne les repaie pas).
 */
export function devisDeLaPlancheEnVrai(faits: readonly string[] = []): DevisDeLaPlancheEnVrai {
  const inv = appel("inventaire"), rel = appel("relecture"), fait = new Set(faits);
  let max = 0, probable = 0, reprise = 0, repriseProbable = 0, images = 0;
  if (!fait.has("brand:envrai:inventaire")) { max += inv.max; probable += inv.probable; }
  for (const n of NOMS_DES_ELEMENTS) {
    const m = elementDeLaPlancheMaxMicro(ELEMENTS[n].taille, 3), p = Math.round(PRIX_MESURES[n] * EUR);
    reprise += m; repriseProbable += p;
    if (!fait.has(`brand:envrai:${n}`)) { max += m; probable += p; images++; }
  }
  for (const g of GROUPES) {
    reprise += rel.max; repriseProbable += rel.probable;
    if (!fait.has(`brand:envrai:relecture:${g}`)) { max += rel.max; probable += rel.probable; }
  }
  const maxMicro = Math.ceil(max), repriseMicro = Math.ceil(reprise);
  return { maxMicro, probableMicro: Math.ceil(probable), repriseMicro, repriseProbableMicro: Math.ceil(repriseProbable), studioMaxMicro: borneDuStudio(Math.max(1, maxMicro), false, repriseMicro, 1), images };
}

// ---------------------------------------------------------------- les appels réels

export type PlancheEnVraiAi = {
  inventaire: (images: { data: Buffer; label: string }[], demande: string) => Promise<Inventaire>;
  refaire: (d: DemandeDElement, cle: string) => Promise<{ png: Buffer; recu: unknown }>;
  relire: (images: { data: Buffer; label: string }[], demande: string, cle: string) => Promise<RelectureDuGroupe>;
};
/** Remplaçables par les essais : aucun appel payant. */
export const plancheEnVraiDeps: { ai?: (jobId: string) => PlancheEnVraiAi } = {};

/** Les vrais appels : le relecteur le plus fort (inventaire et relectures, effort élevé), l'image par logo-policy.ts. */
export function vraisAppelsEnVrai(o: { userId: string; projectId: string; jobId: string }): PlancheEnVraiAi {
  const scope = (step: string) => ({ jobId: o.jobId, projectId: o.projectId, step });
  const texte = <S extends z.ZodType>(cle: string, a: keyof typeof APPELS, system: string, prompt: string, schema: S, images: { data: Buffer; label?: string }[]) => {
    const m = modeleDe(a);
    return withTrace(scope(`envrai-${cle}`), () => llmJson({
      task: "quality_control", userId: o.userId, projectId: o.projectId, jobId: o.jobId, system, prompt, images,
      promptKey: `syna-envrai-${a}-1`, maxTokens: APPELS[a].max, maxOutputTokens: APPELS[a].max, usageKey: `${o.jobId}:envrai:${cle}`, nouvelleSiChangee: true,
      routing: { difficulty: "complex", prefer: { provider: m.provider as "anthropic" | "openai", model: m.model, effort: m.effort } },
    }, schema)) as Promise<z.infer<S>>;
  };
  return {
    inventaire: (images, demande) => texte("inventaire", "inventaire", INVENTAIRE_SYSTEM, demande, InventaireSchema, images),
    refaire: async (d, cle) => {
      const png = await withTrace(scope(`envrai-${cle}`), () => aiElementDeLaPlanche({ userId: o.userId, projectId: o.projectId, jobId: o.jobId, usageKey: `${o.jobId}:envrai:${cle}` },
        { element: d.element, texte: d.texte, taille: d.taille, jointes: d.jointes.map((j) => ({ role: j.role, assetId: null, data: j.data })) }));
      return { png, recu: recuDElementDeLaPlanche(png) };
    },
    relire: (images, demande, cle) => texte(cle, "relecture", RELECTEUR_EN_VRAI, demande, RelectureDuGroupeSchema, images),
  };
}

// ---------------------------------------------------------------- la tâche

type Etape = { step: <T>(key: string, fn: () => Promise<T>) => Promise<T>; progress?: (p: number, label: string) => void };

/** La disposition de la planche choisie (gardée avec son image). */
function dispositionDe(assetId: string): Laquelle {
  try { const m = JSON.parse(String(getAsset(assetId)?.meta ?? "{}")); return m?.plancheDeMarque?.disposition === "animaux" ? "animaux" : "standard"; } catch { return "standard"; }
}

/** Le logo de la planche choisie a-t-il changé depuis (un autre logo adopté) ? Il faut alors refaire d'abord la démonstration. */
export const logoChangeDepuisLaDemo = (route: Route, logoFrom: string | null | undefined): boolean => !!route.board.planche?.logo && !!logoFrom && route.board.planche.logo !== logoFrom;

export const phraseDuLogoChange = () => L(
  "Ton logo a changé depuis ta planche de démonstration : je la refais d'abord avec ton nouveau logo, puis je refais ta planche en vrai à l'identique.",
  "Your logo changed since your demo board: I redo it first with your new logo, then your full-resolution board.");

/**
 * LA PLANCHE EN VRAI d'une identité choisie. Rend l'état à garder dans le parcours. Une panne du fournisseur remonte
 * (jamais relancée toute seule) ; ce qui est payé est gardé par les points de reprise.
 */
export async function plancheEnVrai(o: {
  ctx: Etape; ai: PlancheEnVraiAi; who: { userId: string; projectId: string }; route: Route; logoAssetId: string; personnes: boolean;
  /** La signature de la marque (dernier recours du texte du bas du badge). */
  phrase: string;
  /** La phrase sous le nom choisie par le client pour ce logo (la ligne descriptive du logo), s'il en a une. */
  ligneDuLogo?: string | null;
  /** Le métier court écrit pour la recherche du logo (« les plantes d'intérieur »). */
  metierCourt?: string | null;
}): Promise<EtatPlancheEnVrai> {
  const { ctx, ai, route } = o, pl = route.board.planche;
  if (!pl?.image) throw new Error("Aucune planche de démonstration choisie.");
  const demo = assetData(getAsset(pl.image.id)!), laquelle = dispositionDe(pl.image.id), cases = lesCases(laquelle);
  const issues: string[] = [], notes: string[] = [];
  const nom = route.name.trim();

  // 1. La découpe (gratuite).
  ctx.progress?.(0.12, L("Je découpe ta planche choisie", "Cutting your chosen board"));
  const decoupe = await decouperLesApercus(demo, laquelle);
  for (const r of decoupe.refus) notes.push(`case « ${r.case} » refusée à la découpe : ${r.raison}`);
  const logoAsset = getAsset(o.logoAssetId);
  if (!logoAsset) throw new Error("Logo de la marque introuvable.");
  const logoBrut = assetData(logoAsset);
  const det = await logoDetoure(logoBrut, route.palette.dark);
  if (!det.ok) notes.push(`fond du logo non retiré une seconde fois (${det.why}) : le logo adopté, déjà détouré, est pris tel quel`);
  const logo = det.ok ? det.png : logoBrut;
  const logoSurBlanc = await sharp(logo).flatten({ background: "#FFFFFF" }).png().toBuffer();
  // Le symbole et le nom, séparés par le code (gratuit) AVANT les retouches : là où l'inventaire ne voit que le symbole,
  // c'est lui seul qui est joint ; sans séparation fiable, rien n'est joint, jamais le logo complet.
  const separation = await separerSymbole(logo);
  const symboleSurBlanc = separation.fiable ? await sharp(separation.symbole).flatten({ background: "#FFFFFF" }).png().toBuffer() : null;

  // La photo du produit du client (la première) ; sans photo, les produits sont des images d'ambiance.
  const photoId = photosDuProduitIds(o.who.projectId, 1)[0], photo = photoId && getAsset(photoId) ? assetData(getAsset(photoId)!) : null;

  // 2. L'inventaire : un seul appel, avant toute retouche.
  ctx.progress?.(0.18, L("Je fais l'inventaire de ta planche", "Taking stock of your board"));
  const vues = [...NOMS_DES_ELEMENTS, ...CASES_DU_CODE, ...TUILES_DU_LOGO.filter((t) => t === "logo-5" || t === "logo-6"), ...TITRES].filter((n) => decoupe.apercus.has(n));
  const inventaire = await ctx.step("brand:envrai:inventaire", () => ai.inventaire([...vues.map((n) => ({ data: decoupe.apercus.get(n)!, label: n === "logo-5" ? "logos : icône seule" : n === "logo-6" ? "logos : favicon" : n })), { data: logoSurBlanc, label: "logo" }], demandeDeLInventaire(nom, catalogueDesPolicesParGenre())));
  const manquent = inventaireIncomplet(inventaire, NOMS_DES_ELEMENTS.filter((n) => decoupe.apercus.has(n)));
  if (manquent.length) notes.push(`inventaire sans ${manquent.join(", ")} : ces cases sont relues sans texte ni logo attendu`);

  // 3. Les 17 images : refaites, relues par groupe, une reprise au plus à la charge du Studio.
  ctx.progress?.(0.25, L("Je refais chaque image de ta planche en haute définition", "Redoing each image of your board in high definition"));
  const brut = async (png: Buffer, element: string, tour: number, texte: string, recu: unknown) => {
    const a = await saveAsset({ ...o.who, data: png, name: `planche-en-vrai-${element}-${tour}-brut.png`, mime: "image/png", role: "planche-en-vrai-brut", origin: "generated", status: "ready", meta: { plancheEnVrai: { element, tour, texteEnvoye: texte, recu, brut: true } } });
    return a.id;
  };
  const res = await refaireLesElements({
    refaire: async (d, tour) => {
      const cle = `brand:envrai:${d.element}${tour > 1 ? ":r1" : ""}`;
      const id = await ctx.step(cle, async () => { const r = await ai.refaire(d, `${d.element}${tour > 1 ? "-r1" : ""}`); return brut(r.png, d.element, tour, d.texte, r.recu); });
      return assetData(getAsset(id)!);
    },
    relire: (groupe: Groupe, items, demande, tour) => ctx.step(`brand:envrai:relecture:${groupe}${tour > 1 ? ":r1" : ""}`, () => ai.relire(
      items.flatMap((it) => [{ data: it.apercu, label: `${it.element} aperçu` }, { data: it.image, label: `${it.element} refaite` }, ...(it.photo ? [{ data: it.photo, label: `${it.element} produit` }] : [])]),
      demande, `relecture-${groupe}${tour > 1 ? "-r1" : ""}`)),
    aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
  }, { nom, personnes: o.personnes, logo: logoSurBlanc, symbole: symboleSurBlanc, photo, apercus: decoupe.apercus, inventaire, debordes: decoupe.debordes });

  // Les images gardées, rangées en haute définition ; les produits sans photo du client sont marqués « image d'ambiance ».
  for (const n of NOMS_DES_ELEMENTS) for (const e of res.get(n)?.essais ?? []) if (e.raisons.length) notes.push(`${n}, essai ${e.tour} refusé : ${e.raisons.join(" ; ")}`);
  const rangees = await rangerLesImages(o.who, inventaire, new Map(NOMS_DES_ELEMENTS.flatMap((n) => {
    const r = res.get(n);
    return r ? [[n, { png: r.ok ? r.png ?? null : null, essais: r.essais.length, texte: r.essais.at(-1)?.texte, verdict: r.essais.at(-1)?.verdict ?? null, photo: !!r.photo, raison: r.raison }] as const] : [];
  })));
  const { elements, images } = rangees;
  issues.push(...rangees.issues);

  // 4. Le code seul : logos, palette, polices, textes.
  ctx.progress?.(0.85, L("Je prépare tes logos, tes couleurs et tes polices", "Preparing your logos, colours and fonts"));
  const retenue = paletteDeLaPlanche(await mesurerLaPalette(demo, cases.pastilles), inventaire);
  const palette0 = retenue.hex;
  notes.push(retenue.note);
  const encre = route.palette.dark && luminance(route.palette.dark) < 0.35 ? route.palette.dark : "#1C2A24";
  const roles = rolesDeLaPalette(palette0, encre);
  const palette = palette0.map((hex, i) => ({ hex, nom: inventaire.couleurs[i]?.nom?.trim() ?? "", mots: (inventaire.couleurs[i]?.mots ?? []).map((m) => m.trim()).filter(Boolean).slice(0, 3) }));
  const titres = policeDuCatalogue(inventaire.polices.titres, 700), textes = policeDuCatalogue(inventaire.polices.textes, 400);
  issues.push(...phrasesDesPolicesRemplacees({ titres, textes }));
  const couleur = await couleurDuLogo(logo);
  const bas = texteDuBasDuBadge({ ligneDuLogo: o.ligneDuLogo, metierCourt: o.metierCourt, signature: o.phrase });
  const v = await versionsDuLogo({ logo, separation, couleur, sombre: luminance(roles.primary) < 0.45 ? roles.primary : roles.dark, clair: roles.light, monoClair: monoClairDe(palette0), nom, bas, police: POLICE_DU_BADGE, tuiles: decoupe.apercus });
  issues.push(...phrasesDesLogos(v));
  const { logos, favicons, symboleId } = await rangerLesLogos({ who: o.who, logoAssetId: o.logoAssetId, versions: v.versions, symbole: v.symbole, clair: roles.light });

  // La marque du projet lit la palette mesurée et les polices lues sur la planche choisie (le site, la charte, les publications).
  marqueRelueSurLaPlanche(o.who.projectId, roles, { titres, textes }, symboleId);

  // Les publications : celles que l'inventaire juge compréhensibles par un inconnu vont au calendrier.
  const pubs = publicationsDeLaPlanche(elements, inventaire);
  const publications = pubs.publications;
  issues.push(...pubs.issues);

  // 5. L'assemblage en 3072 × 4608 (gratuit, se refait).
  ctx.progress?.(0.92, L("J'assemble ta planche en vrai", "Assembling your full-resolution board"));
  const etat: EtatPlancheEnVrai = {
    key: route.key, demo: pl.image.id, logo: o.logoAssetId, laquelle, at: Date.now(),
    elements, logos, favicons, palette, polices: { titres, textes }, symboleComplet: v.symboleComplet, publications, issues: [...new Set(issues)], notes, inventaire,
    ...(v.depuisLApercu.length ? { logosDeLApercu: v.depuisLApercu } : {}),
  };
  const t = textesDeLaPlanche(inventaire, route);
  notes.push(...t.notes);
  return { ...etat, ...(await placerLaPlanche({ who: o.who, route, etat, demo, boites: decoupe.boites, images, versions: v.versions, encre })) };
}

/**
 * Les titres et les blocs de texte, contrôlés contre les valeurs du métier et les données vérifiées : un titre qui porte
 * une promesse garde le décor ; le bloc du ton sans promesse mesurable garde le décor, sinon il est redessiné sans elle ;
 * le bloc 10 garde le décor s'il porte exactement le copyright et le domaine vérifiés, sinon il est redessiné avec eux.
 *
 * JAMAIS UNE CASE VIDE (chef d'orchestre, 25 novembre 2026) : une case où l'inventaire n'a rien lu garde l'aperçu de la
 * démonstration tel quel. Sans rien lu, le bloc 10 n'est redessiné que si un contrôle du Studio échoue (le domaine
 * revérifié au choix n'a plus le statut écrit sur la démonstration) : alors avec les données vérifiées, « © {année} {Nom} »
 * et la mention du domaine. Un bloc redessiné a toujours au moins une ligne : le bloc 10 porte toujours le copyright et la
 * mention vérifiés ; le ton dont toutes les lignes sont des promesses prend la phrase de la marque sans promesse, sinon
 * son nom.
 *
 * UNE FINITION NOTÉE N'ARRIVE JAMAIS DANS LE STUDIO DU CLIENT (chef d'orchestre, 26 novembre 2026, essai réel d'Écume : un
 * accent parasite isolé dans le titre de référencement du bloc 10 de la planche A). Tout texte que le code écrit (les
 * titres, le haut, le ton, le bloc 10) est nettoyé de ses signes parasites isolés (`nettoyerLesSignesIsoles`). Le bloc 10
 * et le ton sont redessinés par le code dès qu'une petite finition y est notée : au verdict de la planche choisie
 * (`planche.finitions`), ou à l'inventaire (une ligne lue qui porte un signe parasite). Le texte de la finition, nettoyé,
 * remplace sa ligne quand l'inventaire ne l'a pas lue.
 */
export function textesDeLaPlanche(inventaire: Inventaire, route: Route): { titres: Map<string, string>; blocs: Map<"ton" | "seo", BlocDeTexte | null>; haut: string[]; hautDansLeLogo: boolean; notes: string[] } {
  const pl = route.board.planche!, nom = route.name.trim(), notes: string[] = [];
  const brutes = (n: string) => caseLue(inventaire, n)?.textes.map((t) => t.trim()).filter(Boolean) ?? [];
  const lignes = (n: string) => brutes(n).map(nettoyerLesSignesIsoles).filter(Boolean);
  // Les petites finitions notées au verdict de la planche choisie, rangées par bloc ; et celles que l'inventaire a lues.
  const finitions = (pl.finitions ?? []).filter(Boolean);
  const notees = (b: "seo" | "ton") => finitions.filter((f) => blocDeLaFinition(f) === b);
  const luesAvecUnSigne = (n: string) => brutes(n).filter(porteUnSigneParasite);
  const plat = (t: string) => t.normalize("NFC").toLocaleLowerCase("fr").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  /** Les lignes du bloc, avec le texte nettoyé de chaque finition notée que l'inventaire n'a pas lu. */
  const avecLesFinitions = (l: string[], f: string[]) => {
    const out = [...l];
    for (const x of f) { const t = texteDeLaFinition(x); if (t && !out.some((y) => plat(y) === plat(t))) out.unshift(t); }
    return out;
  };
  const dire = (b: string, n: string, f: string[]) => { const lues = luesAvecUnSigne(n); if (f.length || lues.length) notes.push(`${b} : petite finition nettoyée par le code (${[...f, ...lues.map((x) => `lu à l'inventaire : « ${x} »`)].join(" ; ")})`); };
  for (const n of ["haut", ...TITRES]) if (luesAvecUnSigne(n).length) dire(n === "haut" ? "haut de la planche" : `titre ${n}`, n, []);
  const titres = new Map<string, string>();
  for (const t of TITRES) { const l = lignes(t).join(" "); if (l && !promessesDuBloc([l]).length) titres.set(t, l); }
  const mention = mentionDuDomaine({ domaine: pl.domaine, statut: pl.revu?.statut ?? pl.statut }), droit = copyright(pl.annee, nom);
  const blocs = new Map<"ton" | "seo", BlocDeTexte | null>();
  // Le ton : rien lu ou aucune promesse ni finition, le décor est gardé ; sinon redessiné sans elles, jamais vide.
  const ton = lignes("ton"), promesses = promessesDuBloc(ton), finitionsDuTon = notees("ton"), tonANettoyer = finitionsDuTon.length > 0 || luesAvecUnSigne("ton").length > 0;
  if (promesses.length || tonANettoyer) {
    // La phrase de la marque, par ses lignes (jamais le « / » qui les sépare dans le texte enregistré).
    const reste = avecLesFinitions(ton.filter((l) => !promesses.includes(l)), finitionsDuTon).filter((l) => !promessesDuBloc([l]).length), slogan = lignesDuTexte(route.slogan ?? "");
    blocs.set("ton", { lignes: reste.length ? reste : slogan.length && !promessesDuBloc(slogan).length ? slogan : [nom] });
    if (promesses.length) notes.push(`bloc du ton redessiné sans : ${promesses.join(" ; ")}`);
    if (tonANettoyer) dire("bloc du ton redessiné", "ton", finitionsDuTon);
  } else blocs.set("ton", null);
  if (!ton.length && !tonANettoyer) notes.push("bloc du ton : l'inventaire n'y a rien lu ; l'aperçu de la démonstration est gardé tel quel");
  // Le bloc 10.
  const tiret = (l: string) => l.replace(/\s*[—–-]\s*/g, " — ");
  const porteLaMention = (l: string) => tiret(l).includes(tiret(mention));
  const seo = lignes("seo"), domaineRevuChange = !!pl.revu && pl.revu.statut !== pl.statut;
  const finitionsDuSeo = notees("seo"), seoANettoyer = finitionsDuSeo.length > 0 || luesAvecUnSigne("seo").length > 0;
  /** Le bloc 10 redessiné : les lignes (sans promesse), le copyright et la mention vérifiés toujours là. */
  const redessiner = (l0: string[], seoPromesses: string[]) => {
    const l = avecLesFinitions(l0.filter((x) => !seoPromesses.includes(x)), finitionsDuSeo).map((x) => (/©/.test(x) ? droit : pl.domaine && x.includes(pl.domaine) ? mention : x));
    if (!l.some((x) => x.includes(droit))) l.push(droit);
    if (!l.some(porteLaMention)) l.push(mention);
    blocs.set("seo", { lignes: [...new Set(l)] });
    notes.push(`bloc 10 redessiné avec « ${droit} » et « ${mention} »`);
    if (seoANettoyer) dire("bloc 10 redessiné", "seo", finitionsDuSeo);
  };
  if (!seo.length) {
    if (seoANettoyer) redessiner([], []);
    else if (domaineRevuChange) {
      blocs.set("seo", { lignes: [droit, mention] });
      notes.push(`bloc 10 : l'inventaire n'y a rien lu, mais le domaine revérifié a changé depuis la démonstration : redessiné avec « ${droit} » et « ${mention} »`);
    } else {
      blocs.set("seo", null);
      notes.push("bloc 10 : l'inventaire n'y a rien lu ; l'aperçu de la démonstration est gardé tel quel");
    }
  } else {
    const seoJuste = seo.some((l) => l.includes(droit)) && seo.some(porteLaMention);
    const seoPromesses = promessesDuBloc(seo, [droit, mention, String(pl.annee)]);
    if (seoJuste && !seoPromesses.length && !seoANettoyer) blocs.set("seo", null);
    else redessiner(seo, seoPromesses);
  }
  // LE HAUT (essai réel d'Écume, 26 novembre 2026 : « SAVONNERIE ARTISANALE » était écrit une seconde fois sous le logo,
  // qui la porte déjà) : rien ne s'ajoute qui ne soit pas sur l'aperçu. Une ligne du haut que le logo porte déjà (son nom,
  // sa phrase, lus à l'inventaire sur le logo, ou la phrase de la marque) n'est jamais réécrite ; quand toutes le sont, le
  // haut est effacé en entier et seul le logo y est posé.
  const duLogo = new Set([nom, ...(caseLue(inventaire, "logo")?.textes ?? []), ...lignesDuTexte(route.slogan ?? "")].map(plat).filter(Boolean));
  const portee = (l: string) => duLogo.has(plat(l)) || [...duLogo].some((d) => d.length > 3 && plat(l).length > 3 && (d.includes(plat(l)) || plat(l).includes(d)));
  const hautLu = lignes("haut");
  return { titres, blocs, haut: hautLu.filter((l) => !portee(l)), hautDansLeLogo: hautLu.length > 0 && hautLu.every(portee), notes };
}
/**
 * LES PHRASES DE PRÉSENTATION DES POLICES, lues à l'inventaire dans la case des typographies : la ligne qui suit le nom de
 * chaque police, si ce n'est ni une ligne d'alphabet ni une ligne de chiffres.
 */
export function phrasesDesPolices(inventaire: Inventaire): [string | null, string | null] {
  const t = caseLue(inventaire, "typographies")?.textes.map((x) => x.trim()) ?? [];
  const plat = (x: string) => x.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const specimen = (x: string) => /^[\p{Lu}\s]{10,}$/u.test(x) || /^[\p{Ll}\s]{20,}$/u.test(x) && !/\s/.test(x.trim()) || /^[\d\s]+$/.test(x);
  const apres = (nom: string) => { const i = t.findIndex((x) => plat(x) === plat(nom)); const s = i >= 0 ? t[i + 1] : undefined; return s && !specimen(s) && plat(s) !== "" ? nettoyerLesSignesIsoles(s) : null; };
  return [apres(inventaire.polices.titres.nom), apres(inventaire.polices.textes.nom)];
}
/** La police du badge refait par le code : la police de mise en page, en gras (jamais la police de la marque). */
export const POLICE_DU_BADGE = { cle: POLICE_DE_MISE_EN_PAGE.cle, poids: GRAISSE_DE_MISE_EN_PAGE.nom } as const;
/**
 * LA PALETTE DE LA PLANCHE EN VRAI : les codes écrits sur l'aperçu (lus par l'inventaire dans la case de la palette) quand la
 * couleur peinte en est proche, sinon la mesure (`paletteRetenue`). Rend les codes et une note pour le compte rendu.
 */
export function paletteDeLaPlanche(mesurees: readonly string[], inventaire: Inventaire): { hex: string[]; note: string } {
  const ecrits = codesEcritsDeLaPalette(caseLue(inventaire, "palette")?.textes ?? []);
  const r = paletteRetenue(mesurees, ecrits);
  const detail = r.hex.map((h, i) => `${h} (${r.source[i] === "ecrit" ? `écrit sur l'aperçu, mesuré ${mesurees[i]}, écart ${r.ecarts[i]}` : ecrits.length === mesurees.length ? `mesuré : le code écrit ${ecrits[i]} est trop loin, écart ${r.ecarts[i]}` : "mesuré : aucun code écrit lu"})`);
  return { hex: r.hex, note: `palette : ${detail.join(" ; ")}` };
}

/** L'assemblage (gratuit, se refait) et le rangement de la planche en vrai comme planche de marque, mention « planche-en-vrai ». */
async function assemblerEtRanger(o: { who: { userId: string; projectId: string }; route: Route; etat: EtatPlancheEnVrai; demo: Buffer; boites: ReadonlyMap<string, [number, number, number, number]>; images: ReadonlyMap<NomElement, Buffer>; versions: Record<VersionDuLogo, Buffer>; encre: string }): Promise<NonNullable<EtatPlancheEnVrai["planche"]> & { siteEntier?: EtatPlancheEnVrai["siteEntier"] }> {
  const t = textesDeLaPlanche(o.etat.inventaire!, o.route);
  const png = await assemblerLaPlanche({ demo: o.demo, boites: o.boites, pastilles: lesCases(o.etat.laquelle).pastilles, images: o.images, versions: o.versions, palette: o.etat.palette, polices: o.etat.polices!, signature: t.haut, titres: t.titres, blocs: t.blocs, encre: o.encre,
    hautDansLeLogo: t.hautDansLeLogo, typos: phrasesDesPolices(o.etat.inventaire!), tuilesDeLApercu: o.etat.logosDeLApercu ?? [] });
  return rangerLaPlanche({ who: o.who, etat: o.etat, png, boites: o.boites });
}
/**
 * Le rangement d'une planche en vrai déjà assemblée : comme planche de marque (« brand-board », mention « planche-en-vrai »),
 * puis le site en une seule image, pris sur elle. Sert à l'assemblage de la tâche et au réassemblage.
 */
async function rangerLaPlanche(o: { who: { userId: string; projectId: string }; etat: EtatPlancheEnVrai; png: Buffer; boites: ReadonlyMap<string, [number, number, number, number]> }): Promise<NonNullable<EtatPlancheEnVrai["planche"]> & { siteEntier?: EtatPlancheEnVrai["siteEntier"] }> {
  const png = o.png, m = await sharp(png).metadata();
  const pa = await saveAsset({ ...o.who, data: png, name: "planche-en-vrai.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready",
    meta: { mention: "planche-en-vrai", plancheEnVrai: { key: o.etat.key, demo: o.etat.demo, laquelle: o.etat.laquelle, refusees: o.etat.elements.filter((e) => !e.id).map((e) => e.element), symboleComplet: o.etat.symboleComplet } } });
  // Le site en une seule image, prise sur la planche assemblée (tout le bloc du site, sans son titre).
  const site = await imageDuSite(png, o.boites, lesCases(o.etat.laquelle).cases["titre-08"] ?? null, { droite: o.boites.get("emballage") ?? null, dessous: lesCases(o.etat.laquelle).cases["titre-10"] ?? null });
  let siteEntier: EtatPlancheEnVrai["siteEntier"];
  if (site) {
    const ms = await sharp(site).metadata();
    const sa = await saveAsset({ ...o.who, data: site, name: "planche-en-vrai-site.png", mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready", meta: { plancheEnVrai: { element: "site", surLaPlanche: true } } });
    siteEntier = { id: sa.id, w: ms.width ?? 0, h: ms.height ?? 0 };
  }
  return { id: pa.id, w: m.width ?? 3072, h: m.height ?? 4608, ...(siteEntier ? { siteEntier } : {}) };
}
/** La planche assemblée et rangée, et le site en une seule image, à poser dans l'état. */
async function placerLaPlanche(o: Parameters<typeof assemblerEtRanger>[0]): Promise<Pick<EtatPlancheEnVrai, "planche" | "siteEntier">> {
  const { siteEntier, ...planche } = await assemblerEtRanger(o);
  return { planche, ...(siteEntier ? { siteEntier } : {}) };
}

// ---------------------------------------------------------------- le rangement, commun à la tâche et au réassemblage

/** Une image de la planche en vrai à ranger : au format final si elle est gardée (sinon null), avec son nombre d'essais. */
export type ImageARanger = { png: Buffer | null; essais: number; texte?: string; verdict?: unknown; photo?: boolean; raison?: string };
/**
 * Les images gardées, rangées en haute définition (l'image montrée et téléchargée, rognée au contenu ; celle de la planche,
 * telle quelle, en coulisses) ; les produits sans photo du client sont marqués « image d'ambiance ». Une case absente n'a
 * pas été découpée ; une case sans image garde l'aperçu agrandi. Rend les cases de l'état, les images posées sur la planche
 * et ce que SINA dit (les cases gardées en aperçu, les produits imaginés).
 */
export async function rangerLesImages(who: { userId: string; projectId: string }, inventaire: Inventaire, a: ReadonlyMap<NomElement, ImageARanger>): Promise<{ elements: EtatPlancheEnVrai["elements"]; images: Map<NomElement, Buffer>; issues: string[] }> {
  const elements: EtatPlancheEnVrai["elements"] = [], images = new Map<NomElement, Buffer>(), refusees: string[] = [], issues: string[] = [];
  for (const n of NOMS_DES_ELEMENTS) {
    const r = a.get(n);
    const ambiance = n.startsWith("produit-") && !r?.photo;
    if (!r) { elements.push({ element: n, id: null, essais: 0, raison: "case non découpée" }); continue; }
    if (!r.png) { refusees.push(n); elements.push({ element: n, id: null, essais: r.essais, raison: r.raison }); continue; }
    const fmt = n === "publication-1x1" ? "1080x1080" : n === "publication-4x5" ? "1080x1350" : n === "publication-9x16" ? "1080x1920" : null;
    // L'image montrée et téléchargée est rognée au contenu ; celle de la planche reste telle quelle, en coulisses.
    const net = await imageMontree(n, r.png), mn = await sharp(net).metadata();
    const surPlanche = net === r.png ? null : (await saveAsset({ ...who, data: r.png, name: `planche-en-vrai-${n}-planche.png`, mime: "image/png", role: "planche-en-vrai-brut", origin: "generated", status: "ready", meta: { plancheEnVrai: { element: n, surLaPlanche: true } } })).id;
    const s = await saveAsset({ ...who, data: net, name: `planche-en-vrai-${n}.png`, mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready",
      meta: { plancheEnVrai: { element: n, tour: r.essais, texteEnvoye: r.texte ?? null, verdict: r.verdict ?? null, ...(ambiance ? { ambiance: true, etiquette: ETIQUETTE_AMBIANCE } : {}) }, ...(fmt ? { publicationMethode: { formatFinal: fmt, planche: "planche-en-vrai" } } : {}) } });
    images.set(n, r.png);
    const description = caseLue(inventaire, n)?.description?.trim();
    elements.push({ element: n, id: s.id, w: mn.width ?? 0, h: mn.height ?? 0, essais: r.essais, ...(ambiance ? { ambiance: true } : {}), ...(description ? { description } : {}), ...(surPlanche ? { idPlanche: surPlanche } : {}) });
  }
  if (refusees.length) issues.push(phraseDeLImageGardeeEnApercu(refusees));
  if (elements.some((e) => e.ambiance && e.id)) issues.push(phraseDuProduitImagine());
  return { elements, images, issues };
}
/** Ce que SINA dit des polices remplacées par la plus proche du catalogue. */
export const phrasesDesPolicesRemplacees = (polices: NonNullable<EtatPlancheEnVrai["polices"]>): string[] => [polices.titres, polices.textes].filter((p) => p.remplacee && p.lue)
  .map((p) => (p.pourquoi === "genre" ? phraseDeLaPoliceRemplacee(p.lue, p.famille, p.genreLu) : p.pourquoi === "apercu" ? phraseDeLaPoliceRemplacee(p.lue, p.famille, undefined, true) : phraseDeLaPoliceRemplacee(p.lue, p.famille)));
/** Ce que SINA dit des versions du logo : reprises de l'aperçu, ou le symbole complet faute de séparation fiable. */
export const phrasesDesLogos = (v: { depuisLApercu: readonly VersionDuLogo[]; symboleComplet: boolean }): string[] => (v.depuisLApercu.length ? [phraseDesLogosDeLApercu([...v.depuisLApercu])] : v.symboleComplet ? [phraseDuSymboleComplet()] : []);
/** Les dix versions du logo, le symbole, les favicons et l'avatar, rangés dans les logos de la marque. */
export async function rangerLesLogos(o: { who: { userId: string; projectId: string }; logoAssetId: string; versions: Record<VersionDuLogo, Buffer>; symbole: Buffer; clair: string; refaitParLeCode?: boolean }): Promise<{ logos: EtatPlancheEnVrai["logos"]; favicons: NonNullable<EtatPlancheEnVrai["favicons"]>; symboleId: string }> {
  const logos: EtatPlancheEnVrai["logos"] = [];
  for (const version of VERSIONS_DU_LOGO) {
    const a = await saveAsset({ ...o.who, data: o.versions[version], name: `logo-${version}.png`, mime: "image/png", role: "logo-version", folderKey: "brand.logos", origin: "generated", sourceAssetId: o.logoAssetId, meta: { plancheEnVrai: { version, ...(o.refaitParLeCode ? { refaitParLeCode: true } : {}) } } });
    logos.push({ version, id: a.id });
  }
  const fav = await faviconsEtAvatar(o.versions.favicon, o.symbole, o.clair);
  const ranger = async (role: string, name: string, data: Buffer) => (await saveAsset({ ...o.who, data, name, mime: "image/png", role, folderKey: "brand.logos", origin: "generated", sourceAssetId: o.logoAssetId, meta: { engine: "syna-planche-en-vrai" } })).id;
  const symboleId = await ranger("logo-mark", "symbole.png", o.symbole);
  const favicons = { f32: await ranger("favicon-32", "favicon-32.png", fav.f32), f64: await ranger("favicon-64", "favicon-64.png", fav.f64), f512: await ranger("favicon-512", "icone-512.png", fav.f512), avatar: await ranger("social-avatar", "avatar-reseaux.png", fav.avatar) };
  return { logos, favicons, symboleId };
}
/** La marque du projet relue sur la planche en vrai : la palette mesurée, les polices lues, le symbole. */
export function marqueRelueSurLaPlanche(projectId: string, roles: Partial<Route["palette"]>, polices: NonNullable<EtatPlancheEnVrai["polices"]>, symboleId?: string | null): void {
  const b = loadProject(projectId).brand;
  if (b) saveBrand(projectId, { ...b, palette: { ...b.palette, ...roles }, fonts: { heading: polices.titres.handle, body: polices.textes.handle }, logo: { ...b.logo, ...(symboleId ? { markAssetId: symboleId } : {}) } });
}
/** Les publications : celles que l'inventaire juge compréhensibles par un inconnu vont au calendrier ; les autres sont dites. */
export function publicationsDeLaPlanche(elements: EtatPlancheEnVrai["elements"], inventaire: Inventaire): { publications: EtatPlancheEnVrai["publications"]; issues: string[] } {
  const publications: EtatPlancheEnVrai["publications"] = [], issues: string[] = [];
  for (const [i, n] of (["publication-1x1", "publication-4x5", "publication-9x16"] as const).entries()) {
    const e = elements.find((x) => x.element === n);
    if (!e?.id) continue;
    const cl = caseLue(inventaire, n), comprehensible = cl?.comprehensible !== false;
    if (!comprehensible) issues.push(phraseDeLaPublicationIncomprehensible(i + 1));
    publications.push({ element: n, id: e.id, texte: (cl?.textes ?? []).join(" ").trim(), comprehensible, format: i === 0 ? "1:1" : i === 1 ? "4:5" : "9:16" });
  }
  return { publications, issues };
}

/**
 * LE RÉASSEMBLAGE ET LE REJUGEMENT ENREGISTRÉS (26 novembre 2026 ; constat du chef d'orchestre devant l'écran d'Écume :
 * « L'écran ne suit pas le réassemblage. »). Dans le Studio comme dans l'essai, une planche en vrai refaite par le code
 * (`plancheEnVraiParLeCode`), avec les images gardées au rejugement, met à jour l'état et le projet de la même façon que la
 * tâche : les images gardées rangées en haute définition, les dix versions du logo, le symbole et les favicons, la marque
 * du projet relue sur la planche (palette, polices, symbole), les publications, ce que SINA dit, puis la planche assemblée
 * et le site en une seule image. Rend le nouvel état, à poser dans le parcours (`plancheEnVrai`) : l'onglet Marque montre
 * alors exactement la planche réassemblée et ses images gardées. Aucun appel.
 */
export async function enregistrerLaPlancheReassemblee(o: {
  who: { userId: string; projectId: string };
  /** L'état d'avant (la démonstration, le logo, la disposition, la clé de l'identité) ; ses notes sont gardées. */
  avant: Pick<EtatPlancheEnVrai, "key" | "demo" | "logo" | "laquelle"> & Partial<Pick<EtatPlancheEnVrai, "notes">>;
  inventaire: Inventaire;
  code: Awaited<ReturnType<typeof plancheEnVraiParLeCode>>;
  /** Chaque case : son image gardée au format final (null : l'aperçu garde sa case) et le nombre d'essais. */
  images: ReadonlyMap<NomElement, ImageARanger>;
  notes?: string[];
}): Promise<EtatPlancheEnVrai> {
  const rangees = await rangerLesImages(o.who, o.inventaire, o.images);
  const issues = [...rangees.issues, ...phrasesDesPolicesRemplacees(o.code.polices), ...phrasesDesLogos(o.code)];
  const { logos, favicons, symboleId } = await rangerLesLogos({ who: o.who, logoAssetId: o.avant.logo, versions: o.code.versions, symbole: o.code.symbole, clair: o.code.roles.light });
  marqueRelueSurLaPlanche(o.who.projectId, o.code.roles, o.code.polices, symboleId);
  const pubs = publicationsDeLaPlanche(rangees.elements, o.inventaire);
  issues.push(...pubs.issues);
  const etat: EtatPlancheEnVrai = {
    key: o.avant.key, demo: o.avant.demo, logo: o.avant.logo, laquelle: o.avant.laquelle, at: Date.now(),
    elements: rangees.elements, logos, favicons, palette: o.code.palette, polices: o.code.polices, symboleComplet: o.code.symboleComplet,
    publications: pubs.publications, issues: [...new Set(issues)], notes: [...(o.avant.notes ?? []), ...o.code.notes, ...(o.notes ?? []), "planche réassemblée par le code, sans appel"], inventaire: o.inventaire,
    ...(o.code.depuisLApercu.length ? { logosDeLApercu: o.code.depuisLApercu } : {}),
  };
  const { siteEntier, ...planche } = await rangerLaPlanche({ who: o.who, etat, png: o.code.planche, boites: o.code.decoupe.boites });
  return { ...etat, planche, ...(siteEntier ? { siteEntier } : {}) };
}
/**
 * L'image montrée et téléchargée d'une case : rognée au contenu (`rognerAuContenu`), sauf les publications et l'ouverture
 * du site, pleines par construction et à leurs formats exacts.
 */
export async function imageMontree(n: NomElement, png: Buffer): Promise<Buffer> {
  return n.startsWith("publication-") || n === "ouverture-site" ? png : rognerAuContenu(png);
}
/** L'image d'une case telle qu'elle est posée sur la planche (avant le rognage au contenu). */
const surLaPlanche = (e: EtatPlancheEnVrai["elements"][number]) => e.idPlanche ?? e.id;

// ---------------------------------------------------------------- les produits refaits avec ses photos

/** Les produits imaginés (sans photo du client) d'une planche en vrai. */
export const produitsImagines = (ev: EtatPlancheEnVrai | undefined): NomElement[] => (ev?.elements ?? []).filter((e) => e.ambiance && e.element.startsWith("produit-")).map((e) => e.element);
/** Le devis des produits refaits avec ses photos (sur son budget, avec une carte) : chaque produit et la relecture du groupe. */
export function devisDesProduitsEnVrai(n: number): { maxMicro: number; probableMicro: number; studioMaxMicro: number } {
  const rel = appel("relecture"), m = elementDeLaPlancheMaxMicro(ELEMENTS["produit-1"].taille, 3), p = Math.round(PRIX_MESURES["produit-1"] * EUR);
  const maxMicro = Math.ceil(n * m + rel.max);
  return { maxMicro, probableMicro: Math.ceil(n * p + rel.probable), studioMaxMicro: borneDuStudio(Math.max(1, maxMicro), false, maxMicro, 1) };
}
/**
 * Le devis d'UNE REPRISE de quelques cases, à la charge du Studio (aucun appel) : chaque image refaite (au plus : trois
 * images jointes, la borne officielle en « high ») et la relecture de chaque groupe concerné. `maxMicro` est la borne du
 * Studio à donner à la tâche.
 */
export function devisDUneReprise(elements: readonly NomElement[]): { maxMicro: number; probableMicro: number; images: number; relectures: number } {
  const rel = appel("relecture"), groupes = new Set(elements.map((n) => ELEMENTS[n].groupe));
  const max = elements.reduce((s, n) => s + elementDeLaPlancheMaxMicro(ELEMENTS[n].taille, 3), 0) + groupes.size * rel.max;
  const probable = elements.reduce((s, n) => s + Math.round(PRIX_MESURES[n] * EUR), 0) + groupes.size * rel.probable;
  return { maxMicro: Math.ceil(max), probableMicro: Math.ceil(probable), images: elements.length, relectures: groupes.size };
}
/**
 * LE DEVIS DES QUATRE PETITES VERSIONS DU LOGO EN HAUTE DÉFINITION (option non construite, 26 novembre 2026) : le compact,
 * l'icône, le favicon et le badge refaits à partir de leur tuile de l'aperçu, logo joint, au tarif d'une image carrée de
 * la planche en vrai (1088 × 1088, qualité haute, trois images jointes au plus), relus en un appel. Aucun appel.
 */
export function devisDesLogosEnHd(): { maxMicro: number; probableMicro: number; images: number; relectures: number } {
  const rel = appel("relecture"), taille = ELEMENTS["publication-1x1"].taille;
  return { maxMicro: Math.ceil(4 * elementDeLaPlancheMaxMicro(taille, 3) + rel.max), probableMicro: Math.ceil(4 * Math.round(PRIX_MESURES["publication-1x1"] * EUR) + rel.probable), images: 4, relectures: 1 };
}
/**
 * QUAND LE CLIENT ENVOIE SES PHOTOS : les cases des produits imaginés sont refaites avec sa photo jointe (mise en scène
 * gardée à l'identique), relues, une reprise au plus à la charge du Studio ; la planche est réassemblée (gratuit). Rend
 * l'état mis à jour.
 */
export async function refaireLesProduitsEnVrai(o: { ctx: Etape; ai: PlancheEnVraiAi; who: { userId: string; projectId: string }; route: Route; etat: EtatPlancheEnVrai; personnes: boolean }): Promise<EtatPlancheEnVrai> {
  const ev = o.etat, aRefaire = produitsImagines(ev);
  const photoId = photosDuProduitIds(o.who.projectId, 1)[0], photo = photoId && getAsset(photoId) ? assetData(getAsset(photoId)!) : null;
  if (!aRefaire.length || !photo || !ev.inventaire) return ev;
  const demo = assetData(getAsset(ev.demo)!), decoupe = await decouperLesApercus(demo, ev.laquelle);
  const logo = await sharp(assetData(getAsset(ev.logo)!)).flatten({ background: "#FFFFFF" }).png().toBuffer();
  // Le produit se voit dans ces cases : sa photo y est jointe, quoi qu'ait dit l'inventaire.
  const inventaire: Inventaire = { ...ev.inventaire, cases: ev.inventaire.cases.map((c) => (aRefaire.includes(c.case as NomElement) ? { ...c, produit: true } : c)) };
  const res = await refaireLesElements({
    refaire: async (d, tour) => {
      const id = await o.ctx.step(`brand:envrai:${d.element}:photo${tour > 1 ? ":r1" : ""}`, async () => { const r = await o.ai.refaire(d, `${d.element}-photo${tour > 1 ? "-r1" : ""}`); return (await saveAsset({ ...o.who, data: r.png, name: `planche-en-vrai-${d.element}-photo-brut.png`, mime: "image/png", role: "planche-en-vrai-brut", origin: "generated", status: "ready", meta: { plancheEnVrai: { element: d.element, tour, texteEnvoye: d.texte, recu: r.recu, brut: true } } })).id; });
      return assetData(getAsset(id)!);
    },
    relire: (groupe, items, demande, tour) => o.ctx.step(`brand:envrai:relecture:${groupe}:photo${tour > 1 ? ":r1" : ""}`, () => o.ai.relire(items.flatMap((it) => [{ data: it.apercu, label: `${it.element} aperçu` }, { data: it.image, label: `${it.element} refaite` }, ...(it.photo ? [{ data: it.photo, label: `${it.element} produit` }] : [])]), demande, `relecture-${groupe}-photo`)),
    aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
  }, { nom: o.route.name.trim(), personnes: o.personnes, logo, photo, apercus: decoupe.apercus, inventaire, elements: aRefaire, debordes: decoupe.debordes });
  const elements = [...ev.elements], issues: string[] = [];
  for (const n of aRefaire) {
    const r = res.get(n);
    if (!r?.ok || !r.png) { issues.push(L(`Le produit ${n.slice(-1)} n'a pas passé ma relecture avec ta photo, même refait : il garde son image d'ambiance.`, `Product ${n.slice(-1)} did not pass my review with your photo.`)); continue; }
    const a = await saveAsset({ ...o.who, data: r.png, name: `planche-en-vrai-${n}.png`, mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready", meta: { plancheEnVrai: { element: n, tour: r.essais.length, texteEnvoye: r.essais.at(-1)!.texte, verdict: r.essais.at(-1)!.verdict ?? null, photoDuClient: photoId } } });
    const i = elements.findIndex((e) => e.element === n);
    elements[i] = { element: n, id: a.id, w: r.w, h: r.h, essais: r.essais.length };
  }
  const etat: EtatPlancheEnVrai = { ...ev, elements, issues: [...ev.issues.filter((l) => !/image d'ambiance|mood image/.test(l)), ...issues], at: Date.now() };
  const images = new Map<NomElement, Buffer>();
  for (const e of elements) { const id = surLaPlanche(e); if (id && getAsset(id)) images.set(e.element, assetData(getAsset(id)!)); }
  const versions = Object.fromEntries(ev.logos.map((l) => [l.version, assetData(getAsset(l.id)!)])) as Record<VersionDuLogo, Buffer>;
  const encre = o.route.palette.dark && luminance(o.route.palette.dark) < 0.35 ? o.route.palette.dark : "#1C2A24";
  return { ...etat, ...(await placerLaPlanche({ who: o.who, route: o.route, etat, demo, boites: decoupe.boites, images, versions, encre })) };
}

/** Ce qui est déjà fait dans une planche en vrai coupée, dit simplement (lu par `marqueOuArretee`). */
export function enVraiOuArretee(etapes: readonly string[]): string[] {
  const e = etapes.filter((k) => k.startsWith("brand:envrai:"));
  if (!e.length) return [];
  const images = e.filter((k) => !/^brand:envrai:(inventaire|relecture:)/.test(k)).length, relectures = e.filter((k) => k.startsWith("brand:envrai:relecture:")).length;
  return [e.includes("brand:envrai:inventaire") && "l'inventaire de ta planche", images > 0 && `${images} image${images > 1 ? "s" : ""} de ta planche en vrai`, relectures > 0 && `${relectures} relecture${relectures > 1 ? "s" : ""}`].filter(Boolean) as string[];
}

// ---------------------------------------------------------------- les logos refaits par le code (gratuit)

/**
 * LES LOGOS REFAITS PAR LE CODE, SANS AUCUN APPEL (25 novembre 2026, onglet Marque de Racine : les logos de la base
 * d'essai dataient d'avant la correction de la séparation du symbole et du nom). À partir du logo fini de l'état (le fond
 * retiré une seconde fois, comme dans la tâche) : la séparation, les dix versions, les favicons, l'avatar et le symbole,
 * rangés comme dans la tâche ; la marque du projet prend le nouveau symbole ; la phrase du symbole complet n'est dite que
 * si la séparation n'est toujours pas fiable. Avec l'inventaire, la planche est réassemblée (gratuit) ; sans lui, elle est
 * gardée telle quelle, et c'est écrit dans les notes. Rend l'état mis à jour ; les images refaites ne sont jamais touchées.
 */
export async function refaireLesLogosEnVrai(o: { who: { userId: string; projectId: string }; route: Route; etat: EtatPlancheEnVrai; phrase?: string; ligneDuLogo?: string | null; metierCourt?: string | null }): Promise<EtatPlancheEnVrai> {
  const ev = o.etat, nom = o.route.name.trim();
  const logoAsset = getAsset(ev.logo);
  if (!logoAsset) throw new Error("Logo fini de la planche en vrai introuvable.");
  const logoBrut = assetData(logoAsset), det = await logoDetoure(logoBrut, o.route.palette.dark);
  const logo = det.ok ? det.png : logoBrut;
  const separation = await separerSymbole(logo);
  const hex = ev.palette.map((p) => p.hex);
  const encre = o.route.palette.dark && luminance(o.route.palette.dark) < 0.35 ? o.route.palette.dark : "#1C2A24";
  const roles = rolesDeLaPalette(hex, encre);
  const bas = texteDuBasDuBadge({ ligneDuLogo: o.ligneDuLogo, metierCourt: o.metierCourt, signature: o.phrase ?? o.route.slogan ?? "" });
  const decoupe0 = getAsset(ev.demo) ? await decouperLesApercus(assetData(getAsset(ev.demo)!), ev.laquelle) : null;
  const v = await versionsDuLogo({ logo, separation, couleur: await couleurDuLogo(logo), sombre: luminance(roles.primary) < 0.45 ? roles.primary : roles.dark, clair: roles.light, monoClair: monoClairDe(hex), nom, bas, police: POLICE_DU_BADGE, tuiles: decoupe0?.apercus });
  const { logos, favicons, symboleId } = await rangerLesLogos({ who: o.who, logoAssetId: ev.logo, versions: v.versions, symbole: v.symbole, clair: roles.light, refaitParLeCode: true });
  const b = loadProject(o.who.projectId).brand;
  if (b) saveBrand(o.who.projectId, { ...b, logo: { ...b.logo, markAssetId: symboleId } });
  const dejaDites = ev.issues.filter((l) => !/séparer proprement le symbole|separate your logo.s symbol|repris de ta planche choisie|taken from your chosen board/.test(l));
  const issues = [...dejaDites, ...(v.depuisLApercu.length ? [phraseDesLogosDeLApercu(v.depuisLApercu)] : v.symboleComplet ? [phraseDuSymboleComplet()] : [])];
  const notes = [...ev.notes, `logos refaits par le code (séparation ${separation.fiable ? "fiable" : `non fiable : ${separation.raison ?? "?"}`})`];
  const { logosDeLApercu: _avant, ...ev0 } = ev;
  const etat: EtatPlancheEnVrai = { ...ev0, logos, favicons, symboleComplet: v.symboleComplet, issues: [...new Set(issues)], notes, at: Date.now(), ...(v.depuisLApercu.length ? { logosDeLApercu: v.depuisLApercu } : {}) };
  if (!ev.inventaire || !o.route.board.planche || !getAsset(ev.demo)) return { ...etat, notes: [...notes, "planche gardée telle quelle : sans l'inventaire, elle n'est pas réassemblée"] };
  const demo = assetData(getAsset(ev.demo)!), decoupe = decoupe0 ?? await decouperLesApercus(demo, ev.laquelle);
  const images = new Map<NomElement, Buffer>();
  for (const e of ev.elements) { const id = surLaPlanche(e); if (id && getAsset(id)) images.set(e.element, assetData(getAsset(id)!)); }
  return { ...etat, ...(await placerLaPlanche({ who: o.who, route: o.route, etat, demo, boites: decoupe.boites, images, versions: v.versions, encre })) };
}

// ---------------------------------------------------------------- le réassemblage sans appel (26 novembre 2026)

/**
 * LA PLANCHE EN VRAI PAR LE CODE SEUL, SANS AUCUN APPEL, à partir de la planche choisie, de son inventaire, du logo fini
 * (au fond retiré) et des images gardées : les mêmes étapes que la tâche (`plancheEnVrai`, partie 4 et assemblage), sans
 * rien ranger. Sert au réassemblage d'un essai (scripts/syna-recette/essai-planche-en-vrai.mts, REASSEMBLER).
 */
export async function plancheEnVraiParLeCode(o: { demo: Buffer; laquelle: Laquelle; inventaire: Inventaire; route: Route; logo: Buffer; images: ReadonlyMap<NomElement, Buffer>; phrase?: string; ligneDuLogo?: string | null; metierCourt?: string | null }) {
  const decoupe = await decouperLesApercus(o.demo, o.laquelle), notes: string[] = [];
  const separation = await separerSymbole(o.logo);
  const ret = paletteDeLaPlanche(await mesurerLaPalette(o.demo, lesCases(o.laquelle).pastilles), o.inventaire);
  notes.push(ret.note);
  const encre = o.route.palette.dark && luminance(o.route.palette.dark) < 0.35 ? o.route.palette.dark : "#1C2A24";
  const roles = rolesDeLaPalette(ret.hex, encre);
  const palette = ret.hex.map((hex, i) => ({ hex, nom: o.inventaire.couleurs[i]?.nom?.trim() ?? "", mots: (o.inventaire.couleurs[i]?.mots ?? []).map((m) => m.trim()).filter(Boolean).slice(0, 3) }));
  const polices = { titres: policeDuCatalogue(o.inventaire.polices.titres, 700), textes: policeDuCatalogue(o.inventaire.polices.textes, 400) };
  const bas = texteDuBasDuBadge({ ligneDuLogo: o.ligneDuLogo, metierCourt: o.metierCourt, signature: o.phrase ?? o.route.slogan ?? "" });
  const v = await versionsDuLogo({ logo: o.logo, separation, couleur: await couleurDuLogo(o.logo), sombre: luminance(roles.primary) < 0.45 ? roles.primary : roles.dark, clair: roles.light, monoClair: monoClairDe(ret.hex), nom: o.route.name.trim(), bas, police: POLICE_DU_BADGE, tuiles: decoupe.apercus });
  const t = textesDeLaPlanche(o.inventaire, o.route);
  notes.push(...t.notes);
  const planche = await assemblerLaPlanche({ demo: o.demo, boites: decoupe.boites, pastilles: lesCases(o.laquelle).pastilles, images: o.images, versions: v.versions, palette, polices, signature: t.haut, titres: t.titres, blocs: t.blocs, encre,
    hautDansLeLogo: t.hautDansLeLogo, typos: phrasesDesPolices(o.inventaire), tuilesDeLApercu: v.depuisLApercu });
  // Le site en une seule image et les images montrées, rognées au contenu, comme dans la tâche.
  const site = await imageDuSite(planche, decoupe.boites, lesCases(o.laquelle).cases["titre-08"] ?? null, { droite: decoupe.boites.get("emballage") ?? null, dessous: lesCases(o.laquelle).cases["titre-10"] ?? null });
  const montrees = new Map<NomElement, Buffer>();
  for (const [n, png] of o.images) montrees.set(n, await imageMontree(n, png));
  return { planche, site, montrees, versions: v.versions, symbole: v.symbole, depuisLApercu: v.depuisLApercu, symboleComplet: v.symboleComplet, separation, palette, roles, polices, notes, decoupe };
}

/**
 * UNE REPRISE DE QUELQUES CASES, à la charge du Studio (le réassemblage d'un essai, 26 novembre 2026) : chaque case donnée
 * est refaite une fois avec ses raisons au début du texte, puis relue face à son aperçu, comme une reprise de la tâche ; il
 * n'y a pas d'autre tour. Rend, pour chaque case, son résultat (l'image au format final si elle est gardée).
 */
export async function reprendreDesCasesEnVrai(o: {
  ai: PlancheEnVraiAi; nom: string; personnes: boolean; logo: Buffer; separation: Separation; inventaire: Inventaire; decoupe: Decoupe;
  elements: readonly NomElement[]; raisons: ReadonlyMap<NomElement, readonly string[]>;
  /** Les cases dont l'aperçu LU PAR L'INVENTAIRE touchait la bande d'un titre (sinon, celles de la découpe d'aujourd'hui). */
  debordes?: readonly string[];
}) {
  const logoSurBlanc = await sharp(o.logo).flatten({ background: "#FFFFFF" }).png().toBuffer();
  const symbole = o.separation.fiable ? await sharp(o.separation.symbole).flatten({ background: "#FFFFFF" }).png().toBuffer() : null;
  return refaireLesElements({
    refaire: async (d) => (await o.ai.refaire(d, `${d.element}-reprise`)).png,
    relire: (g, items, demande) => o.ai.relire(items.flatMap((it) => [{ data: it.apercu, label: `${it.element} aperçu` }, { data: it.image, label: `${it.element} refaite` }, ...(it.photo ? [{ data: it.photo, label: `${it.element} produit` }] : [])]), demande, `relecture-${g}-reprise`),
    aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
  }, { nom: o.nom, personnes: o.personnes, logo: logoSurBlanc, symbole, photo: null, apercus: o.decoupe.apercus, inventaire: o.inventaire, debordes: o.debordes ?? o.decoupe.debordes, elements: o.elements, reprise: o.raisons });
}
