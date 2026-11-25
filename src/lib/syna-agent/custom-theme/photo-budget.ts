/**
 * Le budget de photos d'un site (17 novembre 2026), sans IA.
 *
 * Ce que l'essai réel a montré : le devis annoncé au client comptait les photos de la fiche produit UNE fois, alors que
 * chaque produit reçoit SA fiche, avec ses propres photos. Le site conçu demandait donc plus de photos que le devis n'en
 * payait ; le montage ne créait alors les photos que de l'accueil et de la première fiche. Les autres fiches, « À
 * propos » et la boutique restaient sans photo, et leurs pièces à photo étaient retirées au rendu.
 *
 * La règle : le concepteur CONNAÎT le nombre de photos qu'il peut demander (celui du devis) et les répartit sur toutes
 * les pages importantes ; une pièce à photo qui n'aura pas sa photo n'est pas choisie, plutôt que choisie puis retirée.
 * Le Studio recompte après lui : un dépassement lui est rendu pour sa seule reprise.
 *
 * Ce qui compte : les photos que SINA crée (le trait « photos » de chaque pièce). Ce qui ne compte pas : les
 * emplacements de produit d'une boutique (seule la vraie photo du produit y va, sinon « Ta photo ici ») et les photos
 * que seul le client peut donner (réalisations, équipe, biens).
 */
import { productSlotSection } from "./brand";
import { tenueSection } from "./tenue";
import { MAX_PRODUCT_PAGES } from "./theme";

export type PhotoSite = { business: "products" | "services"; products: number };

/** Photos à créer pour une pièce du thème (0 pour un emplacement de produit ou une photo que seul le client peut donner). */
export function piecePhotos(id: string, business: "products" | "services"): number {
  const s = tenueSection(id);
  return !s || s.authentic || (business === "products" && productSlotSection(s)) ? 0 : s.trait.photos ?? 0;
}
/** Nombre de fiches produit du site : une par produit, jusqu'à MAX_PRODUCT_PAGES ; une seule sans plusieurs produits. */
export const fichesDuSite = (o: PhotoSite): number => (o.business === "products" ? Math.min(Math.max(1, o.products), MAX_PRODUCT_PAGES) : 1);
/** Une page compte-t-elle plusieurs fois ? La fiche produit conçue est reprise pour chaque produit. */
const timesOf = (key: string, o: PhotoSite) => (o.business === "products" && key === "product" ? fichesDuSite(o) : 1);

export type PhotoCount = { total: number; pages: { key: string; label: string; photos: number; times: number }[] };
/** Les photos que le site conçu demande de créer, page par page (la fiche produit compte une fois par fiche). */
export function designPhotos(pages: { key: string; label?: string; sections: string[] }[], o: PhotoSite): PhotoCount {
  const list = pages.map((pg) => ({ key: pg.key, label: pg.label ?? pg.key, photos: pg.sections.reduce((n, id) => n + piecePhotos(id, o.business), 0), times: timesOf(pg.key, o) }));
  return { total: list.reduce((n, x) => n + x.photos * x.times, 0), pages: list };
}

/** Ce qui est dit au concepteur et à celui qui le relit : le nombre de photos, et la règle de répartition. */
/** La planche en vrai (25 novembre 2026) : ses photos sont déjà faites ; le site les lit sans rien refaire (comprises dans le budget). */
export const lignePhotosDeLaPlanche = (n: number): string => (n > 0 ? `Dont ${n} photo${n > 1 ? "s" : ""} déjà faite${n > 1 ? "s" : ""} sur sa planche de marque (l'ouverture en bandeau et les images de son univers) : elles sont reprises telles quelles, jamais recréées ; donne à l'ouverture de l'accueil une pièce à grande photo en bandeau.` : "");
export function photoBudgetBrief(budget: number, o: PhotoSite): string {
  const fiches = fichesDuSite(o);
  return [
    `BUDGET DE PHOTOS À CRÉER : ${budget} photos au plus sur TOUT le site. C'est ce que le prix annoncé au client permet : au-delà, des pages resteraient sans photo. Le nombre de photos de chaque pièce est écrit dans la bibliothèque (« N photo(s) »).`,
    o.business === "products" ? "Ne comptent PAS : les emplacements de produit (galerie du bloc d'achat, cartes de produits, vignettes : la vraie photo du produit y va, ou « Ta photo ici » en attendant celle du client) et les photos que seul le client peut donner." : "Ne comptent PAS : les photos que seul le client peut donner (réalisations, équipe, biens).",
    fiches > 1 ? `Chaque produit a SA fiche, bâtie comme la fiche produit que tu conçois, avec ses propres photos : une pièce à photo de la fiche produit compte donc ${fiches} fois (${fiches} fiches).` : "",
    "RÉPARTITION : chaque page importante garde des photos (l'accueil d'abord, puis la page qui vend, puis les autres) ; aucune page importante n'est laissée nue pour en donner plus à une autre. Une pièce à photo qui n'aurait pas sa photo ne se CHOISIT pas : à sa place, prends une pièce qui tient sans photo (elles sont nombreuses dans la bibliothèque).",
  ].filter(Boolean).join(" ");
}

/** Dépassement du budget (vide si la conception le tient) : rendu au concepteur pour sa seule reprise. */
export function photoBudgetGaps(count: PhotoCount, budget: number, o: PhotoSite): string[] {
  if (count.total <= budget) return [];
  const fiches = fichesDuSite(o);
  const detail = count.pages.filter((x) => x.photos > 0).map((x) => `${x.label} : ${x.photos}${x.times > 1 ? ` × ${x.times} fiches` : ""}`).join(" ; ");
  return [`photos : la conception demande ${count.total} photos à créer pour un budget de ${budget} (${detail}). Retire ${count.total - budget} photo(s) en remplaçant des pièces à photo par des pièces sans photo${fiches > 1 ? `, d'abord sur la fiche produit (chaque pièce y compte ${fiches} fois)` : ""}, sans laisser une page importante sans aucune photo.`];
}
