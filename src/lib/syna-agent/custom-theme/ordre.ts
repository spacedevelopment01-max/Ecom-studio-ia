/**
 * Les contrôles automatiques de L'ORDRE et de LA VARIÉTÉ, sans IA (cahier « ordre et variété », partie 6 : « pour ce
 * qui se compte »). Ce qui est refusé revient au concepteur avec la raison ; rien ici ne pousse à inventer : quand une
 * page importante n'atteint pas dix sections, le contrôle donne les moments encore libres de sa partition, et s'il
 * n'en reste aucun que le dossier puisse remplir, il le note pour le compte rendu au lieu de le réclamer.
 *
 * Ce que ces contrôles constatent, et comment :
 *  - l'offre au plus tard en 3e position sur l'accueil : une pièce au trait « offre » (tenue-ordre.ts) ;
 *  - la question qui bloque au plus tard en 3e : service qui se déplace → une pièce au trait « zone » (l'ouverture de
 *    métier compte si la zone est au dossier) ; boutique → une pièce au trait « prix ». La LIVRAISON dite dans le
 *    premier écran ne se constate pas sans lire les textes : elle reste au juge de l'ordre ;
 *  - une vraie preuve avant la 5e section quand le dossier en contient une que une pièce sait montrer ; une citation
 *    de la marque par elle-même n'a jamais le trait « preuve » ;
 *  - le concret avant l'abstrait : une pièce au trait « abstrait » jamais avant l'offre ni avant la première preuve
 *    ou réassurance ;
 *  - jamais deux dispositions pareilles à la suite (la « forme » de la pièce) ;
 *  - les doutes dans les trois dernières sections, la page finit par l'action ;
 *  - au moins dix sections sur chaque page importante, pages utilitaires courtes ;
 *  - une pièce qui demande une preuve absente du dossier est refusée (le moment se saute) ;
 *  - le premier écran d'un service (règle d'or 1) : quand le profil connaît la zone ou le téléphone, l'ouverture de
 *    l'accueil est une pièce qui les porte (traits « zone » et « telephone » : le Studio les y pose tout seul) ;
 *  - jamais deux pièces qui montrent la même chose sur une page (tenue-ordre.ts : MEME_CONTENU).
 */
import { tenueSection } from "./tenue";
import { FEATURED_ROLE, isCardSection, libSection } from "./library";
import { FORME_LABEL, doublonsDe, type PreuveId, type TraitOrdre } from "./tenue-ordre";
import { OUVERTURES_SERVICES } from "./tenue-partitions";
import { familleOf } from "./familles";
import { preuveLabel } from "./preuves";
import {
  MAX_SECTIONS_UTILITAIRE, MIN_SECTIONS_IMPORTANTE, PAGE_KIND_LABEL, momentTenable, pageKind, partitionsPermises, readPartition,
  type Moment, type PageKind, type Partition,
} from "./partitions";

type PagePick = { key: string; label?: string; sections: { section: string; construction?: string | null }[] };
type PartitionPick = { page: string; partition: string; why?: string | null };
export type OrdreDesign = { pages: PagePick[]; partitions?: PartitionPick[] | null; pageStyle?: string | null };

export type OrdreFacts = {
  business: "products" | "services"; products: number;
  /** Types d'accueil permis pour ce client (partitions.ts). */
  types: string[];
  /** Service qui se déplace chez le client. */
  mobile: boolean;
  /** La zone desservie est au dossier (l'ouverture de métier peut alors la dire). */
  zoneConnue: boolean;
  /** Preuves réelles au dossier. */
  preuves: ReadonlySet<PreuveId>;
  /**
   * Ce que le profil des services connaît pour le premier écran (règle d'or 1 : « pour un service, la ville et le
   * téléphone cliquable en plus ») : la zone ou la ville, le téléphone. Absent : le contrôle du premier écran ne se fait pas.
   */
  profil?: { zone: boolean; telephone: boolean };
};

const ordre = (id: string) => tenueSection(id)?.ordre ?? null;
const has = (id: string, t: TraitOrdre) => !!ordre(id)?.traits?.includes(t);
const title = (id: string) => tenueSection(id)?.title ?? id;
const nth = (i: number) => `${i + 1}e`;
/** Les réalisations d'artisans se créent quand le client n'en a pas assez (règle maintenue) : jamais refusées faute de preuve. */
const PREUVE_LIBRE: PreuveId[] = ["realisations"];
/** Une pièce « qualifications » se remplit aussi avec des documents ; « chiffres » aussi avec une ancienneté datée. */
const PREUVE_VOISINE: Partial<Record<PreuveId, PreuveId[]>> = { qualifications: ["documents"], documents: ["qualifications"] };
const preuveAuDossier = (id: PreuveId, f: OrdreFacts) => f.preuves.has(id) || (PREUVE_VOISINE[id] ?? []).some((x) => f.preuves.has(x));
/** La pièce montre-t-elle une VRAIE preuve pour ce client ? (la preuve est au dossier) */
const vraiePreuve = (id: string, f: OrdreFacts) => { const o = ordre(id); return !!o?.preuve && !!o.traits?.includes("preuve") && preuveAuDossier(o.preuve, f); };

/** La partition choisie pour une page, lue avec indulgence parmi celles permises pour ce client. */
export function partitionChoisie(d: OrdreDesign, pg: PagePick, kind: PageKind, f: Pick<OrdreFacts, "types" | "business">): { partition: Partition | null; permises: Partition[]; why: string } {
  const permises = partitionsPermises(kind, { types: f.types, pageStyle: d.pageStyle, business: f.business });
  const pick = (d.partitions ?? []).find((x) => x.page === pg.key) ?? ((kind === "fiche") ? (d.partitions ?? []).find((x) => /^product/.test(x.page)) : undefined);
  const partition = readPartition(pick?.partition, permises) ?? ((kind === "fiche" || kind === "prestation") && permises.length === 1 ? permises[0] : null);
  return { partition, permises, why: (pick?.why ?? "").trim() };
}

const lib = (id: string) => libSection(id);
const isCard = (id: string) => { const l = lib(id); return !!l && isCardSection(l); };
const isFeatured = (id: string) => lib(id)?.role === FEATURED_ROLE;
/**
 * Moments d'une partition encore libres sur une page : aucune de leurs pièces n'y est posée, le dossier peut les
 * remplir, et une de leurs pièces peut encore se poser sans enfreindre une règle (une seule section de cartes, un seul
 * « Produit vedette »). Deux moments que la même pièce tiendrait ne comptent qu'une fois.
 */
export function momentsLibres(p: Partition, placed: string[], f: OrdreFacts): { moment: Moment; pieces: string[] }[] {
  const on = new Set(placed), cards = placed.some(isCard), featured = placed.some(isFeatured);
  const posable = (id: string) => { const o = ordre(id); return !on.has(id) && !doublonsDe(id).some((x) => on.has(x)) && !(cards && isCard(id)) && !(featured && isFeatured(id)) && (!o?.preuve || PREUVE_LIBRE.includes(o.preuve) || preuveAuDossier(o.preuve, f)); };
  const out: { moment: Moment; pieces: string[] }[] = [], seen = new Set<string>();
  for (const x of p.moments) {
    if (!momentTenable(x, f).ok || x.pieces.some((id) => on.has(id))) continue;
    const pieces = x.pieces.filter(posable), k = pieces.join("|");
    if (!pieces.length || seen.has(k)) continue;
    seen.add(k); out.push({ moment: x, pieces });
  }
  return out;
}

/** Une pièce va-t-elle à ce genre de site ? (réservée aux services ou aux boutiques ; réservée à un métier, donné par l'appelant) */
const vaAuSite = (id: string, business: "products" | "services", metier?: RegExp | null) => { const s = tenueSection(id); return !!s && (!s.pour || s.pour === (business === "services" ? "services" : "produits")) && (!s.only || (!!metier && metier.test(s.only))); };
/** Une pièce qu'un client de ce genre peut poser : elle va à son site, et sa preuve est au dossier (ou n'en demande pas). */
export function pieceTenable(id: string, f: OrdreFacts, metier?: RegExp | null): boolean { const o = ordre(id); return vaAuSite(id, f.business, metier) && (!o?.preuve || PREUVE_LIBRE.includes(o.preuve) || preuveAuDossier(o.preuve, f)); }
/** Les moments d'une partition qu'un client de ce genre peut tenir avec son dossier (une pièce au moins lui va, la preuve est là). */
export function momentsTenables(p: Partition, f: OrdreFacts, metier?: RegExp | null): Moment[] {
  return p.moments.filter((x) => momentTenable(x, f).ok && x.pieces.some((id) => { const o = ordre(id); return vaAuSite(id, f.business, metier) && (!o?.preuve || PREUVE_LIBRE.includes(o.preuve) || preuveAuDossier(o.preuve, f)); }));
}
/**
 * Les pièces RÉELLES qu'une page peut porter en suivant sa partition, pour ce dossier : une pièce par moment tenable,
 * jamais deux fois la même, jamais deux pièces qui montrent la même chose, jamais une pièce dont la preuve manque.
 * Sert à dire honnêtement combien de sections vraies une page peut atteindre (compte rendu, devis du site).
 */
export function piecesPossibles(p: Partition, f: OrdreFacts, metier?: RegExp | null): string[] {
  const placed: string[] = [];
  for (let n = 0; n < 40; n++) {
    const next = momentsLibres(p, placed, f).map((x) => x.pieces.find((id) => vaAuSite(id, f.business, metier))).find(Boolean);
    if (!next) break;
    placed.push(next);
  }
  return placed;
}

/**
 * Les règles d'or et les partitions, contrôlées sans IA. `refus` revient au concepteur ; `notes` va au compte rendu
 * (« à revoir ») : ce que le dossier ne permet pas, dit honnêtement, sans rien réclamer d'inventé.
 */
export function ordreGaps(d: OrdreDesign, f: OrdreFacts): { refus: string[]; notes: string[] } {
  const refus: string[] = [], notes: string[] = [];
  for (const pg of d.pages) {
    const kind = pageKind(pg.key, f.business), ids = pg.sections.map((x) => x.section), n = ids.length, name = `« ${pg.label ?? pg.key} »`;
    if (!kind || !n) continue;
    if (kind === "utilitaire") {
      if (n > MAX_SECTIONS_UTILITAIRE) refus.push(`${name} : ${n} sections ; une page utilitaire reste courte (${MAX_SECTIONS_UTILITAIRE} au plus : panier, page introuvable, mentions légales, recherche, remerciement)`);
      continue;
    }
    // ── la partition choisie, et pourquoi elle va à CE client (règle de variété 10)
    const { partition, permises, why } = partitionChoisie(d, pg, kind, f);
    if (!partition) refus.push(`${name} : partition manquante ou inconnue (champ « partitions », page « ${pg.key} ») : choisis-en une parmi ${permises.map((p) => p.id).join(", ")}`);
    else if (permises.length > 1 && why.length < 20) refus.push(`${name} : dis pourquoi la partition « ${partition.id} » va à CE client (son angle, ses preuves, ses clients), dans « why »`);
    // L'accueil annonce « X d'abord » : la deuxième section tient le premier moment de la partition que le dossier peut remplir.
    if (partition && kind === "accueil" && n > 1) {
      // Un moment peut se déplacer d'un cran (l'angle déplace les sections) : le premier ou le deuxième moment tenable.
      const [first, next] = partition.moments.slice(1).filter((x) => momentTenable(x, f).ok);
      if (first && !first.pieces.includes(ids[1]) && !(next && next.pieces.includes(ids[1]))) refus.push(`${name} : la partition « ${partition.id} » place « ${first.label} » juste après l'ouverture (pièces : ${first.pieces.join(", ")}), ici ${ids[1]} ; suis la partition choisie, ou choisis-en une autre et dis pourquoi`);
    }
    // ── une pièce qui demande une preuve que le dossier n'a pas : le moment se saute
    for (const id of new Set(ids)) {
      const o = ordre(id);
      if (o?.preuve && !PREUVE_LIBRE.includes(o.preuve) && !preuveAuDossier(o.preuve, f)) refus.push(`${name} : « ${title(id)} » (${id}) demande ${preuveLabel(o.preuve)}, que le dossier n'a pas : saute ce moment (aucune section ne se remplit avec un contenu que le client n'a pas)`);
    }
    // ── jamais deux pièces qui montrent la même chose sur une page
    for (const id of new Set(ids)) {
      const twin = doublonsDe(id).find((x) => ids.includes(x));
      if (twin && ids.indexOf(id) < ids.indexOf(twin)) refus.push(`${name} : « ${title(id)} » (${id}) et « ${title(twin)} » (${twin}) montrent la même chose : garde l'une des deux, jamais les deux sur une page`);
    }
    // ── règle 1 : le premier écran d'un service dit la ville (ou la zone) et porte le téléphone cliquable
    if (kind === "accueil" && f.business === "services" && f.profil) {
      const sans = [f.profil.zone && !has(ids[0], "zone") ? "la ville ou la zone desservie" : "", f.profil.telephone && !has(ids[0], "telephone") ? "le téléphone cliquable" : ""].filter(Boolean);
      if (sans.length) refus.push(`${name} : le premier écran d'un service dit la ville et porte le téléphone cliquable (règle d'or 1) ; l'ouverture ${ids[0]} ne porte pas ${sans.join(" ni ")}, que le profil du client connaît : ouvre l'accueil par ${OUVERTURES_SERVICES.join(" ou ")} (grande photo pleine, le titre dessus ; le Studio y pose la zone et le téléphone du profil)`);
    }
    const offre = ids.findIndex((x) => has(x, "offre"));
    const confiance = ids.findIndex((x) => vraiePreuve(x, f) || has(x, "reassurance"));
    if (kind === "accueil") {
      // ── règle 3 : l'offre au plus tard en 3e
      if (offre < 0) refus.push(`${name} : l'accueil ne montre pas l'offre ; les produits ou les prestations arrivent au plus tard en 3e position (règle d'or 3)`);
      else if (offre > 2) refus.push(`${name} : l'offre arrive en ${nth(offre)} position (${ids[offre]}) ; elle arrive au plus tard en 3e (règle d'or 3)`);
      // ── règle 2 : la question qui bloque au plus tard en 3e
      if (f.business === "services" && f.mobile) {
        const z = ids.findIndex((x, i) => has(x, "zone") && (i > 0 || f.zoneConnue));
        if (z < 0 || z > 2) refus.push(`${name} : « tu viens jusque chez moi ? » doit avoir sa réponse au plus tard en 3e position (règle d'or 2) : pose la zone d'intervention (tn-zone) en 2e ou 3e${z > 2 ? ` (ici en ${nth(z)})` : ""}`);
      }
      if (f.business === "products") {
        const p = ids.findIndex((x) => has(x, "prix"));
        if (p < 0 || p > 2) refus.push(`${name} : le prix doit se voir au plus tard en 3e position (règle d'or 2) : une pièce qui montre les produits avec leurs vrais prix${p > 2 ? ` (ici en ${nth(p)})` : ""}`);
      }
      // ── règle 4 : une vraie preuve avant la 5e, quand le dossier en a une qu'une pièce sait montrer
      const montrables = [...f.preuves].filter((id) => ["avis", "realisations", "qualifications", "chiffres", "presse", "documents", "avant-apres"].includes(id));
      if (montrables.length) {
        const p = ids.findIndex((x) => vraiePreuve(x, f));
        if (p < 0 || p > 3) refus.push(`${name} : le dossier a de vraies preuves (${montrables.map(preuveLabel).join(" ; ")}) : l'une d'elles arrive avant la 5e section (règle d'or 4)${p > 3 ? `, ici en ${nth(p)} (${ids[p]})` : ""} ; jamais la marque qui se cite elle-même à la place`);
      } else notes.push(`${name} : aucune vraie preuve au dossier (avis, réalisations, assurances, diplômes, chiffres) : la page n'en montre pas, à demander au client`);
    }
    // ── règle 5 : le concret avant l'abstrait
    ids.forEach((id, i) => {
      if (!has(id, "abstrait")) return;
      const avantOffre = ["accueil", "fiche", "prestation", "boutique"].includes(kind) && (offre < 0 || i < offre);
      const avantConfiance = confiance < 0 ? i < 2 || kind === "accueil" : i < confiance;
      if (avantOffre || avantConfiance) refus.push(`${name} : « ${title(id)} » (${id}, ${nth(i)}) est une pièce abstraite (formule, citation, conviction ou émotion seule) : jamais avant ${avantOffre ? "l'offre" : "la première preuve ou réassurance"} (règle d'or 5 : le concret passe avant l'abstrait)${confiance < 0 && !avantOffre ? " ; pose d'abord une réassurance faite de faits vrais" : ""}`);
    });
    // ── règle 6 : jamais deux dispositions pareilles à la suite
    for (let i = 1; i < n; i++) {
      const a = ordre(ids[i - 1])?.forme, b = ordre(ids[i])?.forme;
      if (a && b && a === b && a !== "page") refus.push(`${name} : deux dispositions pareilles à la suite (${ids[i - 1]}, ${ids[i]} : ${FORME_LABEL[a]}) ; le rythme alterne (règle d'or 6)`);
    }
    // ── règle 8 : les doutes levés juste avant la fin ; règle 9 : la page finit par l'action
    const veutDoutes = kind === "accueil" || kind === "fiche" || (partition ? partition.moments.slice(-3).some((x) => x.pieces.some((id) => has(id, "doutes"))) : false);
    if (veutDoutes && kind !== "questions" && n >= 4 && !ids.slice(-3).some((x) => has(x, "doutes"))) refus.push(`${name} : les doutes sont levés juste avant la fin (règle d'or 8) : les questions ou la garantie dans les trois dernières sections`);
    const fin = (id: string) => has(id, "action") || (kind === "fiche" && has(id, "offre"));
    const last = ids[n - 1], before = ids[n - 2];
    if (n >= 4 && !(fin(last) || (has(last, "doutes") && before && fin(before)))) refus.push(`${name} : la page finit par l'action (règle d'or 9 : réserver, demander un devis ou acheter, avec les coordonnées), ici ${last}`);
    // ── le minimum de dix sections, sans jamais pousser à inventer
    if (n < MIN_SECTIONS_IMPORTANTE) {
      const libres = partition ? momentsLibres(partition, ids, f) : [];
      if (libres.length) refus.push(`${name} : ${n} sections ; une page importante en a au moins ${MIN_SECTIONS_IMPORTANTE}. Moments encore libres de sa partition, que le dossier peut remplir : ${libres.map((x) => `${x.moment.label} (${x.pieces.join(" ou ")})`).join(" ; ")}. N'ajoute rien d'autre : jamais une section de remplissage, jamais un contenu que le client n'a pas`);
      // Sans partition reconnue, le refus ci-dessus (« partition manquante ») suffit : rien d'autre n'est réclamé.
      else if (partition) notes.push(`${name} (${PAGE_KIND_LABEL[kind]}) : ${n} sections, moins de ${MIN_SECTIONS_IMPORTANTE} ; aucun moment de sa partition ne reste que le dossier puisse remplir sans remplissage : il manque des preuves ou des contenus à demander au client`);
    }
  }
  return { refus: [...new Set(refus)], notes: [...new Set(notes)] };
}

/**
 * Dernier recours sans IA pour la règle d'or 6 (essai réel du 17 novembre 2026 : « deux dispositions pareilles à la
 * suite » relevé sur deux pages, puis laissé). Quand deux pièces de même disposition se suivent, l'une des deux change
 * de place avec sa voisine ; ni la première ni la dernière section d'une page ne bougent. L'échange n'est gardé que
 * s'il fait baisser le nombre total de refus du contrôle de l'ordre, rejoué en entier : il ne crée jamais un autre défaut.
 */
export function fitRythme<D extends OrdreDesign>(d: D, f: OrdreFacts): { d: D; changed: string[] } {
  let cur: D = JSON.parse(JSON.stringify(d));
  const changed: string[] = [];
  const count = (x: D) => ordreGaps(x, f).refus.length;
  for (let tour = 0; tour < 12; tour++) {
    const before = count(cur);
    let better: { d: D; note: string } | null = null;
    for (const [pi, pg] of cur.pages.entries()) {
      const ids = pg.sections.map((x) => x.section), n = ids.length;
      for (let i = 1; i < n && !better; i++) {
        const a = ordre(ids[i - 1])?.forme, b = ordre(ids[i])?.forme;
        if (!a || a !== b || a === "page") continue;
        // La seconde descend d'un ou deux rangs, ou la première remonte d'un ou deux rangs.
        for (const [from, to] of [[i, i + 1], [i - 1, i - 2], [i, i + 2], [i - 1, i - 3]] as const) {
          if (from < 1 || to < 1 || from > n - 2 || to > n - 2) continue;
          const next: D = JSON.parse(JSON.stringify(cur));
          const list = next.pages[pi].sections, [moved] = list.splice(from, 1);
          list.splice(to, 0, moved);
          if (count(next) < before) { better = { d: next, note: `« ${pg.key} » : ${ids[from]} déplacée (deux dispositions pareilles se suivaient : ${ids[i - 1]}, ${ids[i]})` }; break; }
        }
      }
      if (better) break;
    }
    if (!better) break;
    cur = better.d; changed.push(better.note);
  }
  return { d: changed.length ? cur : d, changed };
}

// ════════════════════════════════════════════════════════════════ la variété (règles 2, 5, 6 et 7 du cahier)

/** Ce que le Studio garde d'un site déjà monté, pour que le suivant du même métier ne lui ressemble pas. */
export type SiteMonte = {
  /** Métier reconnu (clé du secteur de la documentaliste), ou type d'accueil à défaut. */
  metier: string | null;
  /** Partition de chaque page importante (clé de page → identifiant). */
  partitions: Record<string, string>;
  header: string; footer: string; opening: string;
  /** Pièces des pages importantes avec leur construction (« pièce:construction »), par clé de page. */
  pages: Record<string, string[]>;
};
const bare = (x: string) => x.split(":")[0];
const constructionsDe = (pages: Record<string, string[]>) => { const out = new Map<string, string>(); for (const list of Object.values(pages)) for (const x of list) if (x.includes(":") && !out.has(bare(x))) out.set(bare(x), x); return out; };

export type VarieteDesign = { famille?: string | null; partitions: Record<string, string>; header: string; footer: string; opening: string; pages: Record<string, string[]> };
/** Nombre de derniers sites du même métier dont l'en-tête, le pied de page et l'ouverture ne se reprennent pas. */
export const TOURNE_SUR = 3;
/** Nombre minimal de pièces communes à dispositions multiples pour parler de « même combinaison ». */
export const COMBINAISON_MIN = 3;

/**
 * Règles de variété qui se comptent. `sites` : les sites déjà montés, les plus récents d'abord ; seuls ceux du même
 * métier comptent ici (la carte d'identité compare, elle, avec tous). `choix` : ce que la famille permet, quand
 * l'appelant le sait (sinon les listes de la famille annoncée).
 */
export function varieteGaps(d: VarieteDesign, sites: SiteMonte[], metier: string | null, o: { kinds: Record<string, PageKind | null>; plusieurs: (kind: PageKind) => boolean; choix?: { entete?: string[]; pied?: string[]; ouvertures?: string[] } }): string[] {
  const out: string[] = [];
  if (!metier) return out;
  const memes = sites.filter((s) => s.metier === metier);
  if (!memes.length) return out;
  // ── règle 2 : jamais la même partition que le dernier site du même métier
  const dernier = memes[0];
  for (const [key, id] of Object.entries(d.partitions)) {
    const kind = o.kinds[key];
    if (!kind || !o.plusieurs(kind)) continue;
    if (dernier.partitions[key] && dernier.partitions[key] === id) out.push(`page « ${key} » : la partition « ${id} » est celle du dernier site monté pour le même métier ; jamais la même partition pour deux sites de suite du même métier : prends-en une autre`);
  }
  // ── règle 6 : l'en-tête, le pied de page et l'ouverture tournent sur les trois derniers sites du même métier
  const trois = memes.slice(0, TOURNE_SUR), fam = familleOf(d.famille);
  const tourne = (label: string, mine: string, theirs: string[], permis: string[] | undefined) => {
    // Un seul choix permis (un site de services n'a qu'un en-tête) : rien ne peut tourner.
    if (!mine || !theirs.includes(mine) || (permis && permis.length <= 1)) return;
    const libres = (permis ?? []).filter((x) => !theirs.some((t) => t === x || bare(t) === x));
    // Tous les choix permis sont déjà pris par les trois derniers : seul celui du tout dernier site reste interdit.
    if (permis && !libres.length && theirs[0] !== mine) return;
    out.push(`${label} « ${mine} » est déjà celui ${libres.length || !permis ? "d'un des trois derniers sites" : "du dernier site"} du même métier : il tourne${libres.length ? ` ; encore libres : ${libres.join(" ou ")}` : ""}`);
  };
  tourne("l'en-tête", d.header, trois.map((s) => s.header), o.choix?.entete ?? fam?.entete);
  tourne("le pied de page", d.footer, trois.map((s) => s.footer), o.choix?.pied ?? fam?.pied);
  tourne("l'ouverture", d.opening, trois.map((s) => s.opening), o.choix?.ouvertures ?? fam?.ouvertures);
  // ── règle 7 : jamais la même combinaison de dispositions qu'un site précédent du même métier
  const mine = constructionsDe(d.pages);
  for (const s of memes) {
    const theirs = constructionsDe(s.pages);
    const common = [...mine.keys()].filter((id) => theirs.has(id));
    if (common.length >= COMBINAISON_MIN && common.every((id) => mine.get(id) === theirs.get(id))) { out.push(`même combinaison de dispositions qu'un site déjà monté pour le même métier (${common.map((id) => mine.get(id)).join(", ")}) : les dispositions se mélangent, change la construction d'au moins deux de ces pièces`); break; }
  }
  return out;
}
