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
import { copyright, mentionDuDomaine } from "./planche-de-marque";
import {
  CASES_DU_CODE, ELEMENTS, GROUPES, INVENTAIRE_SYSTEM, InventaireSchema, NOMS_DES_ELEMENTS, RELECTEUR_EN_VRAI, RelectureDuGroupeSchema, TITRES, TUILES_DU_LOGO,
  caseLue, decouperLesApercus, demandeDeLInventaire, inventaireIncomplet, lesCases, phraseDeLaPoliceRemplacee, phraseDeLaPublicationIncomprehensible,
  phraseDeLImageGardeeEnApercu, phraseDuProduitImagine, phraseDuSymboleComplet, promessesDuBloc, refaireLesElements, ETIQUETTE_AMBIANCE,
  type DemandeDElement, type EtatPlancheEnVrai, type Groupe, type Inventaire, type Laquelle, type NomElement, type RelectureDuGroupe,
} from "./planche-en-vrai";
import {
  VERSIONS_DU_LOGO, assemblerLaPlanche, couleurDuLogo, faviconsEtAvatar, luminance, mesurerLaPalette, monoClairDe, policeDuCatalogue, rolesDeLaPalette,
  separerSymbole, texteDuBasDuBadge, versionsDuLogo, type BlocDeTexte, type VersionDuLogo,
} from "./planche-en-vrai-code";

// ---------------------------------------------------------------- le devis

/** Les appels de texte de la planche en vrai, en jetons (entrée habituelle, sortie habituelle, limite de sortie), et leur effort. */
export const APPELS_EN_VRAI = {
  // L'inventaire : 17 aperçus, les blocs du code, la rangée des logos, les titres et le logo ; une réponse longue. Effort élevé.
  inventaire: { input: 32_000, output: 6_000, max: 16_000, effort: "high" },
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
  const inventaire = await ctx.step("brand:envrai:inventaire", () => ai.inventaire([...vues.map((n) => ({ data: decoupe.apercus.get(n)!, label: n === "logo-5" ? "logos : icône seule" : n === "logo-6" ? "logos : favicon" : n })), { data: logoSurBlanc, label: "logo" }], demandeDeLInventaire(nom)));
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
  }, { nom, personnes: o.personnes, logo: logoSurBlanc, symbole: symboleSurBlanc, photo, apercus: decoupe.apercus, inventaire });

  // Les images gardées, rangées en haute définition ; les produits sans photo du client sont marqués « image d'ambiance ».
  const elements: EtatPlancheEnVrai["elements"] = [], images = new Map<NomElement, Buffer>(), refusees: string[] = [];
  for (const n of NOMS_DES_ELEMENTS) {
    const r = res.get(n);
    const ambiance = n.startsWith("produit-") && !r?.photo;
    if (!r) { elements.push({ element: n, id: null, essais: 0, raison: "case non découpée" }); continue; }
    for (const e of r.essais) if (e.raisons.length) notes.push(`${n}, essai ${e.tour} refusé : ${e.raisons.join(" ; ")}`);
    if (!r.ok || !r.png) { refusees.push(n); elements.push({ element: n, id: null, essais: r.essais.length, raison: r.raison }); continue; }
    const fmt = n === "publication-1x1" ? "1080x1080" : n === "publication-4x5" ? "1080x1350" : n === "publication-9x16" ? "1080x1920" : null;
    const a = await saveAsset({ ...o.who, data: r.png, name: `planche-en-vrai-${n}.png`, mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready",
      meta: { plancheEnVrai: { element: n, tour: r.essais.length, texteEnvoye: r.essais.at(-1)!.texte, verdict: r.essais.at(-1)!.verdict ?? null, ...(ambiance ? { ambiance: true, etiquette: ETIQUETTE_AMBIANCE } : {}) }, ...(fmt ? { publicationMethode: { formatFinal: fmt, planche: "planche-en-vrai" } } : {}) } });
    images.set(n, r.png);
    const description = caseLue(inventaire, n)?.description?.trim();
    elements.push({ element: n, id: a.id, w: r.w, h: r.h, essais: r.essais.length, ...(ambiance ? { ambiance: true } : {}), ...(description ? { description } : {}) });
  }
  if (refusees.length) issues.push(phraseDeLImageGardeeEnApercu(refusees));
  if (elements.some((e) => e.ambiance && e.id)) issues.push(phraseDuProduitImagine());

  // 4. Le code seul : logos, palette, polices, textes.
  ctx.progress?.(0.85, L("Je prépare tes logos, tes couleurs et tes polices", "Preparing your logos, colours and fonts"));
  const palette0 = await mesurerLaPalette(demo, cases.pastilles);
  const encre = route.palette.dark && luminance(route.palette.dark) < 0.35 ? route.palette.dark : "#1C2A24";
  const roles = rolesDeLaPalette(palette0, encre);
  const palette = palette0.map((hex, i) => ({ hex, nom: inventaire.couleurs[i]?.nom?.trim() ?? "", mots: (inventaire.couleurs[i]?.mots ?? []).map((m) => m.trim()).filter(Boolean).slice(0, 2) }));
  const titres = policeDuCatalogue(inventaire.polices.titres, 700), textes = policeDuCatalogue(inventaire.polices.textes, 400);
  for (const p of [titres, textes]) if (p.remplacee && p.lue) issues.push(phraseDeLaPoliceRemplacee(p.lue, p.famille));
  const couleur = await couleurDuLogo(logo);
  const bas = texteDuBasDuBadge({ ligneDuLogo: o.ligneDuLogo, metierCourt: o.metierCourt, signature: o.phrase });
  const v = await versionsDuLogo({ logo, separation, couleur, sombre: luminance(roles.primary) < 0.45 ? roles.primary : roles.dark, clair: roles.light, monoClair: monoClairDe(palette0), nom, bas, police: textes });
  if (v.symboleComplet) issues.push(phraseDuSymboleComplet());
  const logos: EtatPlancheEnVrai["logos"] = [];
  for (const version of VERSIONS_DU_LOGO) {
    const a = await saveAsset({ ...o.who, data: v.versions[version], name: `logo-${version}.png`, mime: "image/png", role: "logo-version", folderKey: "brand.logos", origin: "generated", sourceAssetId: o.logoAssetId, meta: { plancheEnVrai: { version } } });
    logos.push({ version, id: a.id });
  }
  const fav = await faviconsEtAvatar(v.versions.favicon, v.symbole, roles.light);
  const ranger = async (role: string, name: string, data: Buffer) => (await saveAsset({ ...o.who, data, name, mime: "image/png", role, folderKey: "brand.logos", origin: "generated", sourceAssetId: o.logoAssetId, meta: { engine: "syna-planche-en-vrai" } })).id;
  const symboleId = await ranger("logo-mark", "symbole.png", v.symbole);
  const favicons = { f32: await ranger("favicon-32", "favicon-32.png", fav.f32), f64: await ranger("favicon-64", "favicon-64.png", fav.f64), f512: await ranger("favicon-512", "icone-512.png", fav.f512), avatar: await ranger("social-avatar", "avatar-reseaux.png", fav.avatar) };

  // La marque du projet lit la palette mesurée et les polices lues sur la planche choisie (le site, la charte, les publications).
  const b = loadProject(o.who.projectId).brand;
  if (b) saveBrand(o.who.projectId, { ...b, palette: { ...b.palette, ...roles }, fonts: { heading: titres.handle, body: textes.handle }, logo: { ...b.logo, markAssetId: symboleId } });


  // Les publications : celles que l'inventaire juge compréhensibles par un inconnu vont au calendrier.
  const publications: EtatPlancheEnVrai["publications"] = [];
  for (const [i, n] of (["publication-1x1", "publication-4x5", "publication-9x16"] as const).entries()) {
    const e = elements.find((x) => x.element === n);
    if (!e?.id) continue;
    const cl = caseLue(inventaire, n), comprehensible = cl?.comprehensible !== false;
    if (!comprehensible) issues.push(phraseDeLaPublicationIncomprehensible(i + 1));
    publications.push({ element: n, id: e.id, texte: (cl?.textes ?? []).join(" ").trim(), comprehensible, format: i === 0 ? "1:1" : i === 1 ? "4:5" : "9:16" });
  }

  // 5. L'assemblage en 3072 × 4608 (gratuit, se refait).
  ctx.progress?.(0.92, L("J'assemble ta planche en vrai", "Assembling your full-resolution board"));
  const etat: EtatPlancheEnVrai = {
    key: route.key, demo: pl.image.id, logo: o.logoAssetId, laquelle, at: Date.now(),
    elements, logos, favicons, palette, polices: { titres, textes }, symboleComplet: v.symboleComplet, publications, issues: [...new Set(issues)], notes, inventaire,
  };
  const t = textesDeLaPlanche(inventaire, route);
  notes.push(...t.notes);
  return { ...etat, planche: await assemblerEtRanger({ who: o.who, route, etat, demo, boites: decoupe.boites, images, versions: v.versions, encre }) };
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
 */
export function textesDeLaPlanche(inventaire: Inventaire, route: Route): { titres: Map<string, string>; blocs: Map<"ton" | "seo", BlocDeTexte | null>; haut: string[]; notes: string[] } {
  const pl = route.board.planche!, nom = route.name.trim(), notes: string[] = [];
  const lignes = (n: string) => caseLue(inventaire, n)?.textes.map((t) => t.trim()).filter(Boolean) ?? [];
  const titres = new Map<string, string>();
  for (const t of TITRES) { const l = lignes(t).join(" "); if (l && !promessesDuBloc([l]).length) titres.set(t, l); }
  const mention = mentionDuDomaine({ domaine: pl.domaine, statut: pl.revu?.statut ?? pl.statut }), droit = copyright(pl.annee, nom);
  const blocs = new Map<"ton" | "seo", BlocDeTexte | null>();
  // Le ton : rien lu ou aucune promesse, le décor est gardé ; sinon redessiné sans les promesses, jamais vide.
  const ton = lignes("ton"), promesses = promessesDuBloc(ton);
  if (promesses.length) {
    const reste = ton.filter((l) => !promesses.includes(l)), slogan = (route.slogan ?? "").trim();
    blocs.set("ton", { lignes: reste.length ? reste : [slogan && !promessesDuBloc([slogan]).length ? slogan : nom] });
    notes.push(`bloc du ton redessiné sans : ${promesses.join(" ; ")}`);
  } else blocs.set("ton", null);
  if (!ton.length) notes.push("bloc du ton : l'inventaire n'y a rien lu ; l'aperçu de la démonstration est gardé tel quel");
  // Le bloc 10.
  const tiret = (l: string) => l.replace(/\s*[—–-]\s*/g, " — ");
  const porteLaMention = (l: string) => tiret(l).includes(tiret(mention));
  const seo = lignes("seo"), domaineRevuChange = !!pl.revu && pl.revu.statut !== pl.statut;
  if (!seo.length) {
    if (domaineRevuChange) {
      blocs.set("seo", { lignes: [droit, mention] });
      notes.push(`bloc 10 : l'inventaire n'y a rien lu, mais le domaine revérifié a changé depuis la démonstration : redessiné avec « ${droit} » et « ${mention} »`);
    } else {
      blocs.set("seo", null);
      notes.push("bloc 10 : l'inventaire n'y a rien lu ; l'aperçu de la démonstration est gardé tel quel");
    }
  } else {
    const seoJuste = seo.some((l) => l.includes(droit)) && seo.some(porteLaMention);
    const seoPromesses = promessesDuBloc(seo, [droit, mention, String(pl.annee)]);
    if (seoJuste && !seoPromesses.length) blocs.set("seo", null);
    else {
      const l = seo.filter((x) => !seoPromesses.includes(x)).map((x) => (/©/.test(x) ? droit : pl.domaine && x.includes(pl.domaine) ? mention : x));
      // Le bloc redessiné porte toujours les données vérifiées, même quand l'inventaire ne les a pas lues.
      if (!l.some((x) => x.includes(droit))) l.push(droit);
      if (!l.some(porteLaMention)) l.push(mention);
      blocs.set("seo", { lignes: [...new Set(l)] });
      notes.push(`bloc 10 redessiné avec « ${droit} » et « ${mention} »`);
    }
  }
  return { titres, blocs, haut: lignes("haut").filter((l) => l.toLowerCase() !== nom.toLowerCase()), notes };
}

/** L'assemblage (gratuit, se refait) et le rangement de la planche en vrai comme planche de marque, mention « planche-en-vrai ». */
async function assemblerEtRanger(o: { who: { userId: string; projectId: string }; route: Route; etat: EtatPlancheEnVrai; demo: Buffer; boites: ReadonlyMap<string, [number, number, number, number]>; images: ReadonlyMap<NomElement, Buffer>; versions: Record<VersionDuLogo, Buffer>; encre: string }): Promise<NonNullable<EtatPlancheEnVrai["planche"]>> {
  const t = textesDeLaPlanche(o.etat.inventaire!, o.route);
  const png = await assemblerLaPlanche({ demo: o.demo, boites: o.boites, pastilles: lesCases(o.etat.laquelle).pastilles, images: o.images, versions: o.versions, palette: o.etat.palette, polices: o.etat.polices!, signature: t.haut, titres: t.titres, blocs: t.blocs, encre: o.encre });
  const m = await sharp(png).metadata();
  const pa = await saveAsset({ ...o.who, data: png, name: "planche-en-vrai.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready",
    meta: { mention: "planche-en-vrai", plancheEnVrai: { key: o.etat.key, demo: o.etat.demo, laquelle: o.etat.laquelle, refusees: o.etat.elements.filter((e) => !e.id).map((e) => e.element), symboleComplet: o.etat.symboleComplet } } });
  return { id: pa.id, w: m.width ?? 3072, h: m.height ?? 4608 };
}

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
  }, { nom: o.route.name.trim(), personnes: o.personnes, logo, photo, apercus: decoupe.apercus, inventaire, elements: aRefaire });
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
  for (const e of elements) if (e.id && getAsset(e.id)) images.set(e.element, assetData(getAsset(e.id)!));
  const versions = Object.fromEntries(ev.logos.map((l) => [l.version, assetData(getAsset(l.id)!)])) as Record<VersionDuLogo, Buffer>;
  const encre = o.route.palette.dark && luminance(o.route.palette.dark) < 0.35 ? o.route.palette.dark : "#1C2A24";
  return { ...etat, planche: await assemblerEtRanger({ who: o.who, route: o.route, etat, demo, boites: decoupe.boites, images, versions, encre }) };
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
  const textes = ev.polices?.textes ?? policeDuCatalogue({ nom: "Montserrat", genre: "sans" }, 400);
  const bas = texteDuBasDuBadge({ ligneDuLogo: o.ligneDuLogo, metierCourt: o.metierCourt, signature: o.phrase ?? o.route.slogan ?? "" });
  const v = await versionsDuLogo({ logo, separation, couleur: await couleurDuLogo(logo), sombre: luminance(roles.primary) < 0.45 ? roles.primary : roles.dark, clair: roles.light, monoClair: monoClairDe(hex), nom, bas, police: textes });
  const logos: EtatPlancheEnVrai["logos"] = [];
  for (const version of VERSIONS_DU_LOGO) {
    const a = await saveAsset({ ...o.who, data: v.versions[version], name: `logo-${version}.png`, mime: "image/png", role: "logo-version", folderKey: "brand.logos", origin: "generated", sourceAssetId: ev.logo, meta: { plancheEnVrai: { version, refaitParLeCode: true } } });
    logos.push({ version, id: a.id });
  }
  const fav = await faviconsEtAvatar(v.versions.favicon, v.symbole, roles.light);
  const ranger = async (role: string, name: string, data: Buffer) => (await saveAsset({ ...o.who, data, name, mime: "image/png", role, folderKey: "brand.logos", origin: "generated", sourceAssetId: ev.logo, meta: { engine: "syna-planche-en-vrai" } })).id;
  const symboleId = await ranger("logo-mark", "symbole.png", v.symbole);
  const favicons = { f32: await ranger("favicon-32", "favicon-32.png", fav.f32), f64: await ranger("favicon-64", "favicon-64.png", fav.f64), f512: await ranger("favicon-512", "icone-512.png", fav.f512), avatar: await ranger("social-avatar", "avatar-reseaux.png", fav.avatar) };
  const b = loadProject(o.who.projectId).brand;
  if (b) saveBrand(o.who.projectId, { ...b, logo: { ...b.logo, markAssetId: symboleId } });
  const dejaDites = ev.issues.filter((l) => !/séparer proprement le symbole|separate your logo.s symbol/.test(l));
  const issues = [...dejaDites, ...(v.symboleComplet ? [phraseDuSymboleComplet()] : [])];
  const notes = [...ev.notes, `logos refaits par le code (séparation ${separation.fiable ? "fiable" : `non fiable : ${separation.raison ?? "?"}`})`];
  const etat: EtatPlancheEnVrai = { ...ev, logos, favicons, symboleComplet: v.symboleComplet, issues: [...new Set(issues)], notes, at: Date.now() };
  if (!ev.inventaire || !o.route.board.planche || !getAsset(ev.demo)) return { ...etat, notes: [...notes, "planche gardée telle quelle : sans l'inventaire, elle n'est pas réassemblée"] };
  const demo = assetData(getAsset(ev.demo)!), decoupe = await decouperLesApercus(demo, ev.laquelle);
  const images = new Map<NomElement, Buffer>();
  for (const e of ev.elements) if (e.id && getAsset(e.id)) images.set(e.element, assetData(getAsset(e.id)!));
  return { ...etat, planche: await assemblerEtRanger({ who: o.who, route: o.route, etat, demo, boites: decoupe.boites, images, versions: v.versions, encre }) };
}
