/**
 * Remises RÉELLES de l'offre d'une boutique (chantier « plateformes », 16 novembre 2026).
 *
 * Règle du propriétaire : « tout doit marcher pour de vrai dans Shopify, WooCommerce et PrestaShop, pas seulement
 * s'afficher : les lots, le pack, la barre d'achat qui reste visible ». Le thème ne calcule jamais une remise : c'est
 * la plateforme qui la tient, dans son panier. Ce fichier dit, une seule fois et pour les trois plateformes :
 *   - ce qu'est l'offre (fichier de données exporté avec le site : `offre.json`) ;
 *   - les règles que chaque plateforme doit appliquer (les mêmes partout) ;
 *   - le panier attendu pour des lignes données (référence des tests et des essais sur une vraie installation) ;
 *   - si les remises sont EN PLACE sur la plateforme (`remisesConfirmees`) : sans cette preuve, aucun prix de lot ni de
 *     pack ne doit s'afficher, parce que le panier ne le tiendrait pas.
 *
 * Une seule règle de calcul, la même sur les trois plateformes (elle existe en natif dans chacune) :
 *   - PALIER : dès N articles d'un produit dans le panier, toutes versions confondues (couleurs, tailles), chaque
 *     article de ce produit est remisé de P %. Le palier le plus haut atteint s'applique. Un lot « 2 articles, −10 % »
 *     et un pack « 3 articles, −20 % » sont deux paliers du même produit.
 *   - CADEAU : dès N articles du produit, un autre produit du catalogue est offert (une fois par commande). Il est
 *     retiré quand la condition n'est plus remplie.
 * Gratuit, sans IA. Rien n'est inventé : une offre vient de ce que le client a donné.
 */
import { createHash } from "node:crypto";

export type PlateformeRemises = "shopify" | "woocommerce" | "prestashop";

export type OffreCadeau = { /** Produit offert (son adresse dans le catalogue). */ handle: string; /** Version offerte (référence), quand le produit en a plusieurs. */ sku?: string | null; quantite: number; titre: string };
export type OffreLot = { quantite: number; pourcent: number };
export type OffrePack = { id: string; titre: string; quantite: number; pourcent: number; populaire?: boolean; cadeau?: OffreCadeau | null };
export type OffreProduitSaisie = { handle: string; lots?: OffreLot[]; packs?: OffrePack[] };

/** Règles d'un produit, telles que la plateforme les applique. */
export type ReglesProduit = {
  paliers: { quantite: number; pourcent: number }[];
  cadeaux: { des: number; handle: string; sku: string | null; quantite: number; titre: string; pack: string }[];
  /** Ce que le client voit (les cartes) : repris tel quel, jamais recalculé par la plateforme. */
  lots: OffreLot[];
  packs: OffrePack[];
};
/** Le fichier de données de l'offre, exporté avec le site (`offre.json`). */
export type OffreBoutique = { version: 1; devise: string; /** Empreinte des règles : la plateforme la rend quand ces règles-là sont en place. */ empreinte: string; produits: Record<string, ReglesProduit> };

const entier = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
const HANDLE = /^[a-z0-9][a-z0-9-]{0,80}$/;

/**
 * L'offre d'une boutique, contrôlée et prête à partir. Refuse ce que les trois plateformes ne tiendraient pas de la
 * même façon : deux remises différentes pour la même quantité, un cadeau qui est le produit acheté lui-même, une
 * quantité ou un pourcentage hors bornes.
 */
export function offreBoutique(saisie: { devise?: string; produits: OffreProduitSaisie[] }): OffreBoutique {
  const produits: Record<string, ReglesProduit> = {};
  for (const p of saisie.produits) {
    if (!HANDLE.test(p.handle)) throw new Error(`Offre : adresse de produit invalide (« ${p.handle} »).`);
    if (produits[p.handle]) throw new Error(`Offre : le produit « ${p.handle} » est donné deux fois.`);
    const lots = (p.lots ?? []).map((l) => ({ quantite: l.quantite, pourcent: l.pourcent }));
    const packs = (p.packs ?? []).map((k) => ({ id: k.id, titre: k.titre, quantite: k.quantite, pourcent: k.pourcent, ...(k.populaire ? { populaire: true } : {}), cadeau: k.cadeau ? { handle: k.cadeau.handle, sku: k.cadeau.sku ?? null, quantite: k.cadeau.quantite, titre: k.cadeau.titre } : null }));
    const paliers = new Map<number, number>();
    for (const x of [...lots, ...packs]) {
      if (!entier(x.quantite, 1, 20)) throw new Error(`Offre de « ${p.handle} » : quantité invalide (${x.quantite}).`);
      if (!(typeof x.pourcent === "number" && x.pourcent >= 0 && x.pourcent <= 80)) throw new Error(`Offre de « ${p.handle} » : remise invalide (${x.pourcent} %).`);
      const deja = paliers.get(x.quantite);
      if (deja !== undefined && deja !== x.pourcent) throw new Error(`Offre de « ${p.handle} » : deux remises différentes pour ${x.quantite} articles (${deja} % et ${x.pourcent} %). Le panier n'en tiendrait qu'une.`);
      paliers.set(x.quantite, x.pourcent);
    }
    const tries = [...paliers.entries()].filter(([, pct]) => pct > 0).sort((a, b) => a[0] - b[0]).map(([quantite, pourcent]) => ({ quantite, pourcent }));
    // Une remise plus forte pour moins d'articles : le client paierait plus cher en en prenant plus.
    for (let i = 1; i < tries.length; i++) if (tries[i].pourcent < tries[i - 1].pourcent) throw new Error(`Offre de « ${p.handle} » : ${tries[i].quantite} articles sont moins remisés que ${tries[i - 1].quantite}.`);
    const ids = new Set<string>();
    const cadeaux: ReglesProduit["cadeaux"] = [];
    for (const k of packs) {
      if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(k.id) || ids.has(k.id)) throw new Error(`Offre de « ${p.handle} » : identifiant de pack invalide ou en double (« ${k.id} »).`);
      ids.add(k.id);
      if (!k.cadeau) continue;
      if (!HANDLE.test(k.cadeau.handle)) throw new Error(`Pack « ${k.id} » : adresse du cadeau invalide.`);
      if (k.cadeau.handle === p.handle) throw new Error(`Pack « ${k.id} » : le cadeau doit être un autre produit que celui du pack.`);
      if (!entier(k.cadeau.quantite, 1, 5)) throw new Error(`Pack « ${k.id} » : quantité du cadeau invalide.`);
      cadeaux.push({ des: k.quantite, handle: k.cadeau.handle, sku: k.cadeau.sku ?? null, quantite: k.cadeau.quantite, titre: k.cadeau.titre, pack: k.id });
    }
    if (tries.length || cadeaux.length) produits[p.handle] = { paliers: tries, cadeaux, lots, packs };
  }
  const devise = (saisie.devise ?? "EUR").toUpperCase();
  const empreinte = createHash("sha256").update(JSON.stringify({ devise, produits: Object.fromEntries(Object.entries(produits).sort(([a], [b]) => a.localeCompare(b)).map(([h, r]) => [h, { paliers: r.paliers, cadeaux: r.cadeaux }])) })).digest("hex").slice(0, 16);
  return { version: 1, devise, empreinte, produits };
}

/** Une offre sans aucune règle n'est pas une offre : rien à exporter, rien à confirmer. */
export const offreVide = (o: OffreBoutique | null | undefined): boolean => !o || Object.keys(o.produits).length === 0;

/** Ce que la rubrique des offres du Studio enregistre (product-features.ts), pour ce qui devient une règle de boutique. */
export type OffresSaisies = {
  quantity?: { kind: "lots"; tiers: { qty: number; pct: number }[] } | { kind: "bogo"; buy: number; free: number } | null;
  packs?: { quantite: number; nom: string; remisePct?: number; prixCentimes?: number; cadeauHandle?: string; populaire?: boolean }[];
};
const cle = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "pack";

/**
 * Des offres saisies par le client aux règles de la boutique. Les lots dégressifs et les packs valent pour chaque
 * produit donné (un produit n'est jamais son propre cadeau). Un pack à prix fixe devient le pourcentage qui donne ce
 * prix sur le prix du produit. Ce qu'aucune règle identique ne tient sur les trois plateformes est rendu dans
 * `nonTenu`, et ne doit donc pas s'afficher : « N achetés, M offerts » (en pourcentage, il serait trop généreux hors
 * des multiples exacts), un pack à prix fixe sur un produit sans prix.
 */
export function offreDepuisOffres(saisies: OffresSaisies | null | undefined, produits: { handle: string; centimes?: number | null; titre?: string }[], devise = "EUR"): { offre: OffreBoutique; nonTenu: string[] } {
  const nonTenu: string[] = [];
  const q = saisies?.quantity ?? null;
  const lots = q?.kind === "lots" ? q.tiers.map((t) => ({ quantite: t.qty, pourcent: t.pct })) : [];
  if (q?.kind === "bogo") nonTenu.push(`« ${q.buy} achetés, ${q.free} offert${q.free > 1 ? "s" : ""} » : aucune règle automatique identique sur les trois plateformes ; à poser à la main, ou à donner en lot (« ${q.buy + q.free} articles, tant de % »).`);
  const titres = new Map(produits.map((p) => [p.handle, p.titre ?? p.handle]));
  const out: OffreProduitSaisie[] = [];
  for (const p of produits) {
    const packs: OffrePack[] = [];
    const ids = new Set<string>();
    for (const k of saisies?.packs ?? []) {
      let pourcent = k.remisePct ?? 0;
      if (k.prixCentimes != null) {
        if (!(p.centimes && p.centimes > 0)) { nonTenu.push(`Pack « ${k.nom} » à prix fixe : le produit « ${p.handle} » n'a pas de prix.`); continue; }
        pourcent = Math.max(0, Math.round((1 - k.prixCentimes / (k.quantite * p.centimes)) * 1_000_000) / 10_000);
      }
      let id = cle(k.nom); for (let n = 2; ids.has(id); n++) id = `${cle(k.nom).slice(0, 36)}-${n}`;
      ids.add(id);
      const cadeau = k.cadeauHandle && k.cadeauHandle !== p.handle && titres.has(k.cadeauHandle) ? { handle: k.cadeauHandle, quantite: 1, titre: titres.get(k.cadeauHandle)! } : null;
      if (k.cadeauHandle && !cadeau && k.cadeauHandle !== p.handle) nonTenu.push(`Pack « ${k.nom} » : le cadeau « ${k.cadeauHandle} » n'est pas au catalogue.`);
      packs.push({ id, titre: k.nom, quantite: k.quantite, pourcent, ...(k.populaire ? { populaire: true } : {}), cadeau });
    }
    out.push({ handle: p.handle, lots, packs });
  }
  return { offre: offreBoutique({ devise, produits: out }), nonTenu: [...new Set(nonTenu)] };
}
/** Raccourci : seulement des lots (et des packs déjà écrits pour la boutique), pour une liste d'adresses de produits. */
export function offreDepuisLots(quantity: OffresSaisies["quantity"], handles: string[], packs: Record<string, OffrePack[]> = {}, devise = "EUR"): { offre: OffreBoutique; nonTenu: string[] } {
  const base = offreDepuisOffres({ quantity }, handles.map((handle) => ({ handle })), devise);
  const lots = quantity?.kind === "lots" ? quantity.tiers.map((t) => ({ quantite: t.qty, pourcent: t.pct })) : [];
  return { offre: offreBoutique({ devise, produits: handles.map((handle) => ({ handle, lots, packs: packs[handle] ?? [] })) }), nonTenu: base.nonTenu };
}

// ---------------------------------------------------------------- le panier attendu (référence)

export type LigneContrat = { id: string; quantite: number; cadeau?: true };
/**
 * Lignes d'un pack, telles que le contrat `tnBoutique.ajouter` les reçoit : une ligne par version choisie (les
 * quantités d'une même version additionnées), puis le cadeau sur sa propre ligne. Même résultat que
 * `tnAchat.lignes` du script commun.
 */
export function lignesDuPack(articles: (string | number)[], cadeau?: string | number | null): LigneContrat[] {
  const out: LigneContrat[] = [];
  for (const raw of articles) {
    if (raw === "" || raw == null) continue;
    const id = String(raw), hit = out.find((l) => l.id === id);
    if (hit) hit.quantite += 1; else out.push({ id, quantite: 1 });
  }
  if (cadeau != null && cadeau !== "") out.push({ id: String(cadeau), quantite: 1, cadeau: true });
  return out;
}

/** Remise (en %) tenue pour `quantite` articles d'un produit : le palier le plus haut atteint, sinon 0. */
export function remisePour(regles: ReglesProduit | undefined, quantite: number): number {
  let pct = 0;
  for (const p of regles?.paliers ?? []) if (quantite >= p.quantite) pct = p.pourcent;
  return pct;
}

export type VersionCatalogue = { /** Produit de la version (adresse). */ handle: string; /** Prix d'un article, en centimes. */ centimes: number; sku?: string | null };
export type PanierAttendu = { lignes: { id: string; quantite: number; unitaire: number; prix: number; cadeau: boolean }[]; total: number; nombre: number };
/**
 * Le panier que la plateforme DOIT rendre pour ces articles payants (les lignes « cadeau » envoyées par le navigateur
 * sont ignorées : c'est la plateforme qui pose le cadeau). Prix d'un article remisé arrondi au centime.
 */
export function panierAttendu(offre: OffreBoutique | null, catalogue: Record<string, VersionCatalogue>, lignes: LigneContrat[]): PanierAttendu {
  const payantes = lignes.filter((l) => !l.cadeau && catalogue[l.id] && l.quantite > 0);
  const parProduit = new Map<string, number>();
  for (const l of payantes) parProduit.set(catalogue[l.id].handle, (parProduit.get(catalogue[l.id].handle) ?? 0) + l.quantite);
  const out: PanierAttendu["lignes"] = payantes.map((l) => {
    const v = catalogue[l.id], pct = remisePour(offre?.produits[v.handle], parProduit.get(v.handle) ?? 0);
    const unitaire = Math.round(v.centimes * (100 - pct) / 100);
    return { id: l.id, quantite: l.quantite, unitaire, prix: unitaire * l.quantite, cadeau: false };
  });
  for (const [handle, q] of parProduit) for (const c of offre?.produits[handle]?.cadeaux ?? []) {
    if (q < c.des) continue;
    const id = Object.keys(catalogue).find((k) => catalogue[k].handle === c.handle && (!c.sku || catalogue[k].sku === c.sku));
    if (id) out.push({ id, quantite: c.quantite, unitaire: 0, prix: 0, cadeau: true });
  }
  return { lignes: out, total: out.reduce((n, l) => n + l.prix, 0), nombre: out.reduce((n, l) => n + l.quantite, 0) };
}

// ---------------------------------------------------------------- les remises sont-elles en place ?

/** Ce que la plateforme répond quand on lui demande l'état de ses remises (ou ce que l'API de Shopify permet d'en lire). */
export type PreuveRemises = { plateforme: PlateformeRemises; /** Empreinte des règles réellement en place, ou null. */ empreinte: string | null; actif: boolean; manque?: string[]; luLe: number };

/**
 * Les remises de l'offre sont-elles en place sur la plateforme ? Oui seulement si la plateforme a répondu, qu'elle dit
 * ses règles actives, et que ce sont CES règles-là (même empreinte). Dans tout autre cas : non, et aucun prix de lot
 * ni de pack ne s'affiche (le panier ne le tiendrait pas).
 */
export function remisesConfirmees(offre: OffreBoutique | null | undefined, preuve: PreuveRemises | null | undefined, o: { maintenant?: number; validiteMs?: number } = {}): { ok: boolean; pourquoi: string } {
  if (offreVide(offre)) return { ok: true, pourquoi: "Aucune remise dans l'offre : rien à confirmer." };
  if (!preuve) return { ok: false, pourquoi: "La boutique n'a pas encore été interrogée : les remises ne sont pas confirmées." };
  if (!preuve.actif) return { ok: false, pourquoi: `Les remises ne sont pas en place dans la boutique${preuve.manque?.length ? ` : ${preuve.manque.join(" ; ")}` : "."}` };
  if (preuve.empreinte !== offre!.empreinte) return { ok: false, pourquoi: "La boutique applique d'autres règles que l'offre actuelle (offre modifiée depuis le dernier envoi)." };
  const age = (o.maintenant ?? Date.now()) - preuve.luLe;
  if (age > (o.validiteMs ?? 24 * 3600_000)) return { ok: false, pourquoi: "La dernière vérification de la boutique est trop ancienne : à refaire." };
  return { ok: true, pourquoi: "Les remises de l'offre sont en place dans la boutique." };
}

/**
 * L'indicateur passé à la mise en boutique (« les prix de lot et de pack peuvent-ils s'afficher ? ») : il vient de la
 * PREUVE lue dans la boutique quand elle existe (oui seulement si elle est bonne, récente et pour ces règles-là),
 * sinon de ce que le client a déclaré (« j'ai créé mes remises »). Une preuve qui dit non l'emporte sur la déclaration.
 */
export function indicateurRemises(offre: OffreBoutique | null | undefined, preuve: PreuveRemises | null | undefined, declare: boolean, o: { maintenant?: number; validiteMs?: number } = {}): { ok: boolean; source: "preuve" | "declaration"; pourquoi: string } {
  if (!preuve || offreVide(offre)) return { ok: !!declare, source: "declaration", pourquoi: declare ? "Le client a déclaré avoir créé ses remises ; la boutique n'a pas été interrogée." : "Le client n'a pas confirmé ses remises, et la boutique n'a pas été interrogée." };
  return { ...remisesConfirmees(offre, preuve, o), source: "preuve" };
}

/** Adresse où la boutique dit l'état de ses remises (WooCommerce : le thème du Studio ; PrestaShop : le module « esstudio »). */
export function adressePreuve(plateforme: "woocommerce" | "prestashop", boutique: string): string {
  const base = boutique.replace(/\/+$/, "");
  return plateforme === "woocommerce" ? `${base}/?rest_route=/es/v1/offre` : `${base}/index.php?fc=module&module=esstudio&controller=offre`;
}

/**
 * Interroge la boutique (WooCommerce ou PrestaShop) sur l'état de ses remises. Aucune clé : la réponse ne contient que
 * l'empreinte des règles et ce qui manque. Une erreur de réseau ou une réponse illisible vaut « non confirmé ».
 */
export async function lirePreuveRemises(plateforme: "woocommerce" | "prestashop", boutique: string, f: typeof fetch = fetch, maintenant = Date.now()): Promise<PreuveRemises> {
  const non = (manque: string): PreuveRemises => ({ plateforme, empreinte: null, actif: false, manque: [manque], luLe: maintenant });
  try {
    const r = await f(adressePreuve(plateforme, boutique), { headers: { Accept: "application/json" } });
    if (!r.ok) return non(`la boutique a répondu ${r.status}`);
    const j = (await r.json()) as { empreinte?: unknown; actif?: unknown; manque?: unknown };
    return { plateforme, empreinte: typeof j.empreinte === "string" ? j.empreinte : null, actif: j.actif === true, manque: Array.isArray(j.manque) ? j.manque.map(String).slice(0, 20) : [], luLe: maintenant };
  } catch {
    return non("la boutique ne répond pas");
  }
}

// ---------------------------------------------------------------- Shopify : le guide, quand l'accès ne permet pas de créer

const pct = (n: number) => `${String(n).replace(".", ",")} %`;
/** Nom d'une remise créée dans Shopify pour l'offre : le même à la création, à la vérification et dans le guide. */
export const titreRemise = (handle: string, r: { quantite: number; pourcent: number } | { des: number; cadeau: string }) => ("des" in r ? `Studio · ${handle} · cadeau dès ${r.des} (${r.cadeau})` : `Studio · ${handle} · dès ${r.quantite} : −${pct(r.pourcent)}`);

/**
 * Le pas à pas exact que SINA donne au client quand le Studio ne peut pas créer les remises lui-même dans Shopify
 * (accès sans le droit « remises »). Écrit d'après l'administration de Shopify ; non essayé sur une vraie boutique.
 */
export function guideRemisesShopify(offre: OffreBoutique, titres: Record<string, string> = {}): string[] {
  const etapes: string[] = [];
  const nom = (h: string) => titres[h] ?? h;
  for (const [handle, r] of Object.entries(offre.produits)) {
    for (const p of r.paliers) etapes.push(
      `Remise « ${p.quantite} articles, −${pct(p.pourcent)} » sur ${nom(handle)} : dans Shopify, ouvre Réductions › Créer une réduction › « Montant de réduction sur les produits ». Méthode : « Réduction automatique ». Titre : « ${titreRemise(handle, p)} ». Valeur : pourcentage, ${pct(p.pourcent)}. S'applique à : « Produits spécifiques », choisis ${nom(handle)}. Conditions minimales d'achat : « Quantité minimale d'articles », ${p.quantite}. Associations : coche « Réductions de produits ». Date de début : aujourd'hui. Enregistre.`);
    for (const c of r.cadeaux) etapes.push(
      `Cadeau « ${c.titre} » dès ${c.des} articles de ${nom(handle)} : Réductions › Créer une réduction › « Achetez X, recevez Y ». Méthode : « Réduction automatique ». Titre : « ${titreRemise(handle, { des: c.des, cadeau: c.handle })} ». Le client achète : « Quantité minimale d'articles », ${c.des}, parmi « Produits spécifiques » : ${nom(handle)}. Le client reçoit : quantité ${c.quantite}, produit ${nom(c.handle)}${c.sku ? ` (version ${c.sku})` : ""}, à la valeur réduite « Gratuit ». Nombre maximal d'utilisations par commande : 1. Associations : coche « Réductions de produits ». Enregistre.`);
  }
  if (etapes.length) etapes.push("Vérifie : mets les articles dans le panier de ta boutique et regarde le total. Tant que ce n'est pas fait, ton site n'affiche ni prix de lot ni cadeau.");
  return etapes;
}
