/**
 * Les FAITS du client que le site doit respecter (essai réel du 16 novembre 2026, premier site créé en une fois).
 * Quatre défauts de la même famille, corrigés ici, sans IA :
 *  - ce que le client avait dit dans la conversation (noté par SINA dans la mémoire du projet) n'arrivait ni au
 *    concepteur ni au rédacteur : le site écrivait « À compléter » pour un fait connu → `clientNotesBrief` ;
 *  - le rédacteur ne savait pas ce que les emplacements automatiques d'une pièce afficheraient (toutes les prestations
 *    du catalogue, les vrais horaires, la vraie zone) : un titre annonçait « deux » devant une liste de quatre
 *    → `shownFacts` (dit au rédacteur) et `factFlags` (contrôle après écriture) ;
 *  - un « À compléter » restait écrit pour un fait présent au dossier → `factFlags` ;
 *  - l'adresse sortait sur le site alors que le client la voulait seulement dans les informations légales → `factFlags`
 *    (le remplissage automatique, lui, suit le réglage « adresse discrète » : voir tenue-data.ts).
 *
 * Deuxième essai réel (17 novembre 2026), deux défauts de plus, corrigés ici, sans IA :
 *  - un fait connu resté « [À compléter : …] » était signalé, puis laissé tel quel : quand le libellé du manque nomme
 *    sans ambiguïté un fait que le Studio connaît de façon structurée (téléphone, e-mail, horaires, zone ou ville,
 *    adresse, liste des prestations), le vrai fait est POSÉ à sa place → `fillKnownGaps` ; ce qui reste ambigu continue
 *    d'être signalé ;
 *  - « [À compléter : numéro SIRET] » ou « [… téléphone de l'hébergeur] » étaient pris pour le téléphone du client : un
 *    manque qui nomme un tiers (hébergeur, assureur, médiateur…) ou un autre identifiant (SIRET, TVA, RCS…) n'est
 *    jamais rapproché d'un fait du client → `gapFact`, `TIERS`, `AUTRE_IDENTIFIANT`.
 */
import type { Project } from "../../projects";
import { notesDuProjet, type FicheNote } from "../fiche";
import { listProducts } from "../../products/catalog";
import { companyOf } from "../activity";
import { tenuePrestations, tenueProducts, tenueSite } from "./render";
import { listedProducts, withTenuePrestations, withTenueProducts, type TenuePrestation, type TenueProduct } from "./tenue";
import { hoursLine, withTenueSite, zoneCities, type TenueSite } from "./tenue-data";
import type { CustomTheme } from "./theme";

// ---------------------------------------------------------------- ce que le client a dit (mémoire du projet)

export const NOTES_MAX = 24, NOTE_MAX_CHARS = 400, NOTES_MAX_CHARS = 4000;

export type ClientNote = { title: string; value: string };

/**
 * Ce que le client a dit, lu dans sa fiche (`fiche.ts` : notes de tous les fils du projet, et les anciennes notes de la
 * mémoire du projet), les plus récentes d'abord, dans une taille raisonnable.
 */
export function clientNotes(projectId: string): ClientNote[] {
  let rows: FicheNote[] = [];
  try { rows = notesDuProjet(projectId); } catch { return []; }
  const out: ClientNote[] = [];
  let size = 0;
  for (const m of [...rows].sort((a, b) => b.at - a.at)) {
    const title = m.genre === "refuse" ? `${m.sujet} (il refuse${m.portee && m.portee !== "tout" ? `, pour ${m.portee}` : ""})` : m.genre === "aime" ? `${m.sujet} (il aime${m.portee && m.portee !== "tout" ? `, pour ${m.portee}` : ""})` : m.sujet;
    const value = m.value.replace(/\s+/g, " ").trim();
    if (!value) continue;
    const short = value.length > NOTE_MAX_CHARS ? `${value.slice(0, NOTE_MAX_CHARS - 1)}…` : value;
    if (out.length >= NOTES_MAX || size + short.length > NOTES_MAX_CHARS) break;
    out.push({ title, value: short }); size += short.length;
  }
  return out;
}

/** La partie du dossier qui porte ces notes (vide s'il n'y en a pas). */
export function clientNotesBrief(projectId: string): string {
  const notes = clientNotes(projectId);
  if (!notes.length) return "";
  return ["CE QUE LE CLIENT A DIT (ses mots, à reprendre tels quels, jamais à redemander ; un fait qui figure ici ne s'écrit JAMAIS « [À compléter : …] ») :", ...notes.map((n) => `- ${n.title} : ${n.value}`)].join("\n");
}

// ---------------------------------------------------------------- ce que les emplacements automatiques afficheront

/** Un produit du catalogue, pour les faits que le Studio pose lui-même : son repère, son nom, son prix écrit, ses options. */
export type CatalogueFact = { handle: string; title: string; price: string | null; options: { name: string; values: string[] }[] };
export type SiteFacts = { site: TenueSite; prestations: TenuePrestation[]; products: TenueProduct[]; /** Le catalogue (options et prix de chaque produit) : des faits, jamais « à compléter ». */ catalogue?: CatalogueFact[]; notes: ClientNote[]; /** Adresse de la fiche (même discrète), pour la reconnaître dans un texte. */ address: string | null; discreet: boolean; /** E-mail de la fiche de l'entreprise. */ email?: string | null };

/** Tout ce que le Studio sait et posera lui-même dans les pièces (lu une fois par montage). */
export function siteFacts(p: Project, t: CustomTheme): SiteFacts {
  const prestations = (() => { try { return tenuePrestations(p.id); } catch { return []; } })();
  const products = (() => { try { return tenueProducts(p.id, t); } catch { return []; } })();
  const site = (() => { try { return tenueSite(p, t, products, prestations); } catch { return { products, prestations } as TenueSite; } })();
  const co = (() => { try { return companyOf(p.id); } catch { return {}; } })() as { address?: string; addressDiscreet?: boolean; email?: string };
  const catalogue: CatalogueFact[] = (() => { try { return listProducts(p.id).map((x) => { const c = x.data.price ?? x.variants.find((v) => v.price != null)?.price ?? null; return { handle: x.handle, title: x.data.title, price: c == null ? null : `${(Math.round(c) / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",")} €`, options: x.data.options.filter((o) => o.name.trim() && o.values.length) }; }); } catch { return []; } })();
  return { site, prestations, products, catalogue, notes: clientNotes(p.id), address: (p.services?.address || co.address || "").trim() || null, discreet: co.addressDiscreet === true, email: (co.email ?? "").trim() || null };
}

export { listedProducts };
/**
 * Une section telle qu'un visiteur la verra : les emplacements d'exemple remplis par les vraies données (produits,
 * prestations, coordonnées). C'est CE texte que la relecture et les contrôles lisent (essai réel du 17 novembre 2026 :
 * la relecture lisait les cartes d'exemple de la bibliothèque, que le Studio remplace au rendu, et y a dépensé quatre
 * de ses six reprises).
 */
export function asShown(html: string, f: SiteFacts, pageKey?: string | null): string {
  try { return withTenueSite(withTenueProducts(withTenuePrestations(html, f.prestations), listedProducts(f.products, pageKey)), f.site); } catch { return html; }
}

const has = (html: string, attr: string) => new RegExp(`\\sdata-tn-${attr}(?=[\\s>=])`).test(html);
const prestationLine = (x: TenuePrestation) => `${x.name}${x.duration || x.price ? ` (${[x.duration, x.price].filter(Boolean).join(", ")})` : ""}`;

/** Les listes qu'une pièce remplit seule depuis le catalogue : ce qu'elles montrent, et combien d'éléments. */
export function autoLists(html: string, f: SiteFacts, pageKey?: string | null): { what: string; count: number; items: string[] }[] {
  const out: { what: string; count: number; items: string[] }[] = [];
  if (has(html, "prestations") && f.prestations.length) { const list = f.prestations.slice(0, 40); out.push({ what: "prestations", count: list.length, items: list.map(prestationLine) }); }
  if (has(html, "produits") && f.products.length) { const list = listedProducts(f.products, pageKey).slice(0, /class="tn tn-catalogue/.test(html) ? 60 : 8); out.push({ what: "produits", count: list.length, items: list.map((x) => `${x.title}${x.price ? ` (${x.price})` : ""}`) }); }
  const biens = f.site.biens ?? [];
  if (/\sdata-tn-biens(?:="[a-z]+")?(?=[\s>])/.test(html) && biens.length) { const list = biens.slice(0, /\sdata-tn-biens="filtres"/.test(html) ? 60 : 12); out.push({ what: "biens", count: list.length, items: list.map((b) => b.title) }); }
  const plats = (f.site.carte ?? []).flatMap((r) => r.items);
  if (/\sdata-tn-carte(?=[\s>])/.test(html) && plats.length) out.push({ what: "plats", count: plats.length, items: plats.slice(0, 40).map((x) => `${x.name}${x.price ? ` (${x.price})` : ""}`) });
  return out;
}

/**
 * Dit au rédacteur, pour UNE section, ce que le Studio posera lui-même à la place des emplacements d'exemple : il écrit
 * autour de faits exacts, et ne compte jamais autre chose que ce qui s'affichera. Vide pour une section sans emplacement.
 */
export function shownFacts(html: string, f: SiteFacts, pageKey?: string | null): string {
  const lines: string[] = [];
  for (const l of autoLists(html, f, pageKey)) lines.push(`- La liste de cette section affichera TOUT ce que le catalogue contient, soit exactement ${l.count} ${l.what}, dans cet ordre : ${l.items.join(" ; ")}. Tu ne peux ni en retirer ni en choisir : n'écris pas ses lignes.`);
  if ((has(html, "prestations-choix") || has(html, "prestations-options")) && f.prestations.length) lines.push(`- Le formulaire proposera les ${f.prestations.length} prestations du client : ${f.prestations.map((x) => x.name).join(" ; ")}.`);
  if (has(html, "horaires")) lines.push(f.site.hours ? `- Horaires affichés (ceux du client) : ${hoursLine(f.site.hours)}.` : "- Horaires : le client ne les a pas donnés, l'emplacement affichera « À compléter ».");
  if (has(html, "zone")) lines.push(f.site.area ? `- Zone affichée (celle du client) : ${f.site.area}.` : "- Zone desservie : le client ne l'a pas donnée, l'emplacement affichera « À compléter ».");
  if (has(html, "tel")) lines.push(f.site.phone ? `- Téléphone affiché : ${f.site.phone}.` : "- Téléphone : le client ne l'a pas donné, l'emplacement affichera « À compléter ».");
  if (has(html, "adresse") || has(html, "itineraire")) lines.push(f.discreet
    ? `- ADRESSE DISCRÈTE : le client ne veut pas que son adresse soit mise en avant. Le Studio retire d'ici l'adresse et le bouton d'itinéraire${f.site.area ? ", et montre sa zone à la place" : ""} : n'écris ni adresse, ni « venir nous voir », ni itinéraire, ni plan.`
    : f.site.address ? `- Adresse affichée : ${f.site.address} (le bouton d'itinéraire ouvre la vraie carte).` : "- Adresse : le client ne l'a pas donnée, l'emplacement affichera « À compléter ».");
  if (!lines.length) return "";
  return ["CE QUE LE STUDIO AFFICHERA LUI-MÊME DANS CETTE SECTION (faits exacts du client, posés à la place des emplacements d'exemple ; ne les réécris pas, ne les remplace pas par « [À compléter] ») :", ...lines,
    "Le titre et le texte ne donnent JAMAIS un nombre qui contredit ce qui s'affiche : si tu comptes, compte exactement ce qui est listé ci-dessus ; sinon n'écris aucun nombre."].join("\n");
}

// ---------------------------------------------------------------- contrôles après écriture (sans IA)

const NUMBER_WORDS: Record<string, number> = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20 };
/** Ce qui suit un nombre et dit qu'il ne compte pas les éléments d'une liste (une heure, un prix, une durée, une distance). */
const NOT_A_COUNT = /^\s*(?:h\b|heures?\b|min\b|minutes?\b|jours?\b|j\b|semaines?\b|mois\b|ans?\b|années?\b|€|euros?\b|%|km\b|m\b|cm\b|kg\b|g\b|fois\b|[./:]\d)/i;
const strip = (x: string) => x.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

/** Les nombres qu'un titre annonce (en lettres ou en chiffres), hors heures, prix, durées et distances. */
export function countsInTitle(title: string): { word: string; n: number }[] {
  const out: { word: string; n: number }[] = [];
  for (const m of title.matchAll(/(?<![\p{L}\d])(\d{1,2}|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt)(?![\p{L}\d])/giu)) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1].toLowerCase()];
    if (!n || n < 2 || NOT_A_COUNT.test(title.slice((m.index ?? 0) + m[1].length))) continue;
    out.push({ word: m[1], n });
  }
  return out;
}

const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const words = (x: string) => fold(x).split(/[^a-z0-9]+/).filter((w) => w.length >= 5).map((w) => w.slice(0, 6));
/** Mots trop communs pour rapprocher un « À compléter » d'une note du client. */
const COMMON = new Set(["compl", "comple", "client", "clien", "votre", "notre", "moyen", "facon", "votres"]);

// ---------------------------------------------------------------- un manque qui nomme un fait connu (sans IA)

/** Un tiers : son téléphone, son adresse ou son nom ne sont JAMAIS ceux du client. */
export const TIERS = /heberg|assur|mediat|editeur|directeur|responsable|publication|imprim|banqu|transporteur|livreur|fournisseur|prestataire|organisme|autorite|syndic|notaire|bailleur|\bcnil\b/;
/** Un autre identifiant que ceux que le Studio connaît : jamais pris pour le téléphone (« numéro SIRET »). */
export const AUTRE_IDENTIFIANT = /siret|siren|\btva\b|\brcs\b|\brm\b|\bape\b|\bnaf\b|capital|immatricul|agrement|licence|\bpolice\b|contrat|certificat|identifiant|\biban\b|\bbic\b|commande|facture/;
/** Mots qui ne disent rien du fait demandé. */
const FILLER = new Set(["le", "la", "les", "l", "de", "du", "des", "d", "un", "une", "son", "sa", "ses", "ton", "ta", "tes", "notre", "nos", "votre", "vos", "mon", "ma", "mes", "a", "au", "aux", "et", "en", "ou", "pour", "ici", "exact", "exacte", "exacts", "exactes", "complet", "complete", "complets", "completes", "reel", "reels", "reelle", "reelles", "vrai", "vrais", "entreprise", "marque", "societe", "contact", "nous", "joindre", "appeler", "ecrire", "du", "client"]);
export type GapFact = "tel" | "email" | "horaires" | "zone" | "ville" | "adresse" | "prestations" | "prestations-prix";
/** Pour chaque fait : le mot qui le nomme (il en faut un), et les seuls mots qui peuvent l'accompagner. */
const FACT_WORDS: { fact: GapFact; core: RegExp; ok: RegExp }[] = [
  { fact: "tel", core: /^(?:telephone|tel|portable|mobile)$/, ok: /^(?:telephone|tel|portable|mobile|numero|fixe)$/ },
  { fact: "email", core: /^(?:mail|email|courriel)$/, ok: /^(?:e|mail|email|courriel|adresse|electronique)$/ },
  { fact: "horaires", core: /^(?:horaires?|heures|jours|ouverture)$/, ok: /^(?:horaires?|heures?|jours?|ouverture|ouverts?)$/ },
  { fact: "ville", core: /^(?:ville|commune)$/, ok: /^(?:ville|commune|intervention|principale)$/ },
  { fact: "zone", core: /^(?:zones?|secteurs?|villes|communes)$/, ok: /^(?:zones?|secteurs?|villes|communes|intervention|interventions|deplacements?|desservies?|couvertes?|geographique)$/ },
  { fact: "adresse", core: /^adresse$/, ok: /^(?:adresse|postale)$/ },
  { fact: "prestations-prix", core: /^(?:tarifs?|prix)$/, ok: /^(?:prestations|services|liste|tarifs?|prix|noms?)$/ },
  { fact: "prestations", core: /^(?:prestations|services)$/, ok: /^(?:prestations|services|liste|noms?|proposees?|proposes?)$/ },
];
/**
 * Le fait du client qu'un manque nomme SANS AMBIGUÏTÉ, ou null. Null dès que le libellé nomme un tiers ou un autre
 * identifiant, mêle deux faits (« téléphone et horaires »), ou porte un mot de plus (« prix de la prestation »,
 * « délai de rappel ») : dans le doute, rien n'est posé.
 */
export function gapFact(label: string): GapFact | null {
  const g = fold(label);
  if (TIERS.test(g) || AUTRE_IDENTIFIANT.test(g)) return null;
  const tokens = g.split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w));
  if (!tokens.length) return null;
  const hits = FACT_WORDS.filter((f) => tokens.some((w) => f.core.test(w)) && tokens.every((w) => f.ok.test(w)));
  // « prestations et prix » nomme la liste avec ses prix ; « prestations » seule, la liste des noms.
  if (hits.length === 2 && hits.every((h) => h.fact.startsWith("prestations"))) return tokens.some((w) => /^(?:prestations|services)$/.test(w)) ? "prestations-prix" : null;
  if (hits.length !== 1) return null;
  // « tarifs » ou « prix » seuls ne nomment pas la liste des prestations.
  if (hits[0].fact === "prestations-prix" && !tokens.some((w) => /^(?:prestations|services)$/.test(w))) return null;
  return hits[0].fact;
}
/** La valeur vraie d'un fait nommé, telle que le Studio la connaît (null : inconnue, ou à ne pas montrer ici). */
function factValue(fact: GapFact, f: SiteFacts, pageKey?: string | null): string | null {
  const area = (f.site.area ?? "").trim();
  switch (fact) {
    case "tel": return (f.site.phone ?? "").trim() || null;
    case "email": return (f.email ?? "").trim() || null;
    case "horaires": return f.site.hours?.trim() ? hoursLine(f.site.hours) : null;
    case "zone": return area || null;
    // « ville » : la première ville de sa zone ; une zone dite en une longue phrase n'est pas une ville.
    case "ville": { if (!area) return null; const first = zoneCities(area)[0]?.trim() ?? ""; return first && first.length <= 40 && !/\d/.test(first) ? first : null; }
    // Adresse discrète : jamais posée hors des informations légales.
    case "adresse": return pageKey === "legal" ? f.address : f.discreet ? null : (f.site.address ?? "").trim() || null;
    case "prestations": return f.prestations.length ? f.prestations.slice(0, 40).map((x) => x.name).join(", ") : null;
    case "prestations-prix": return f.prestations.length ? f.prestations.slice(0, 40).map(prestationLine).join(" ; ") : null;
  }
}
/** « Caramel, Noir ou Prune » : une liste dite comme on la dit. */
const listeDite = (v: string[]) => (v.length <= 1 ? v.join("") : `${v.slice(0, -1).join(", ")} ou ${v[v.length - 1]}`);
const motEntier = (texte: string, mot: string) => { const m = fold(mot).trim(); return m.length >= 2 && new RegExp(`(?<![a-z0-9])${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?(?![a-z0-9])`).test(texte); };
/**
 * Un manque qui nomme un fait du CATALOGUE (essai réel du 17 novembre 2026 : « [À compléter : teintes de cuir
 * proposées] » sur une fiche dont le produit a l'option « Cuir : Caramel, Noir, Prune » au catalogue). Le produit est
 * celui de la page (sa fiche), sinon celui que le libellé nomme. Rend la vraie valeur, ou null dans le doute :
 *  - une option : le libellé porte son nom, ou parle de teintes, couleurs ou tailles quand le produit a cette option
 *    (ou une seule option) ;
 *  - le prix : le libellé ne dit que « prix » (et, au plus, le nom du produit).
 * Un tiers, un autre identifiant, des dimensions, un délai ou un tarif de livraison ne sont jamais rapprochés.
 */
export function catalogueGap(label: string, f: SiteFacts, product?: string | null): string | null {
  const g = fold(label), list = f.catalogue ?? [];
  if (!list.length || TIERS.test(g) || AUTRE_IDENTIFIANT.test(g) || /dimension|mesure|poids|delai|livraison|retour|paiement|tarif|frais|stock/.test(g)) return null;
  const named = list.filter((x) => motEntier(g, x.title));
  const p = (product ? list.find((x) => x.handle === product) : null) ?? (named.length === 1 ? named[0] : list.length === 1 ? list[0] : null);
  if (!p) return null;
  const couleur = /teinte|couleur|coloris/.test(g), taille = /taille|pointure/.test(g);
  const options = p.options.filter((o) => motEntier(g, o.name) || (couleur && (/couleur|coloris|teinte|colou?r/i.test(o.name) || p.options.length === 1)) || (taille && /taille|pointure|size/i.test(o.name)));
  if (options.length === 1) return listeDite(options[0].values);
  if (options.length > 1) return null;
  const reste = g.split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w) && !fold(p.title).split(/[^a-z0-9]+/).includes(w));
  return p.price && reste.length === 1 && reste[0] === "prix" ? p.price : null;
}
const escHtml = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const GAP = /\[À compléter\s*:\s*([^\]<]{1,80})\]|<mark class="tn-manque">À compléter\s*:\s*([^<]{1,80})<\/mark>/g;

/**
 * Pose le VRAI fait à la place d'un « [À compléter : …] » quand son libellé nomme sans ambiguïté un fait que le Studio
 * connaît (téléphone, e-mail, horaires, zone, ville, adresse non discrète, liste des prestations). Sans IA. Les choix
 * d'un formulaire restés « À compléter » reçoivent les vraies prestations. Rend le HTML et ce qui a été posé ; ce qui
 * reste ambigu n'est pas touché (il reste signalé par `factFlags`).
 */
export function fillKnownGaps(html: string, f: SiteFacts, pageKey?: string | null, product?: string | null): { html: string; filled: string[] } {
  const filled: string[] = [];
  // 1) Liste de choix d'un formulaire dont un choix est resté « À compléter » pour les prestations : les vraies prestations.
  let out = !f.prestations.length ? html : html.replace(/(<select\b[^>]*>)([\s\S]*?)(<\/select>)/g, (m, a: string, inner: string, b: string) => {
    const gaps = [...inner.matchAll(/<option\b[^>]*>\s*(?:\[À compléter\s*:?\s*([^\]<]{0,80})\]|<mark class="tn-manque">À compléter\s*:?\s*([^<]{0,80})<\/mark>)\s*<\/option>/g)].map((x) => fold(x[1] ?? x[2] ?? ""));
    if (!gaps.length || !gaps.some((g) => /prestation|service|travaux|soin|formule|besoin/.test(g)) || gaps.some((g) => TIERS.test(g) || AUTRE_IDENTIFIANT.test(g))) return m;
    filled.push(`les ${f.prestations.length} prestations dans la liste de choix du formulaire`);
    return `${a}${f.prestations.slice(0, 40).map((p) => `<option>${escHtml(p.name)}</option>`).join("")}${b}`;
  });
  // 2) Un manque dont le libellé nomme le fait.
  out = out.replace(GAP, (m, a?: string, b?: string) => {
    const label = (a ?? b ?? "").trim(), fact = gapFact(label);
    // Un fait du catalogue (option, prix du produit de la page) : posé lui aussi.
    const value = (fact ? factValue(fact, f, pageKey) : null) ?? catalogueGap(label, f, product);
    if (!value) return m;
    filled.push(`« ${label} » : ${value.slice(0, 80)}`);
    return escHtml(value);
  });
  return { html: out, filled };
}

/**
 * Ce qu'une section ÉCRITE dit de faux par rapport au dossier (relevé sans IA) :
 *  - un titre qui annonce un nombre différent du nombre d'éléments que sa liste automatique affichera ;
 *  - un « À compléter » qui reste visible (une fois les vraies données posées) pour un fait que le client a donné ;
 *  - l'adresse du client écrite hors des informations légales alors qu'il la veut discrète.
 * `pageKey` : la clé de la page de la section (les informations légales gardent toujours l'adresse).
 */
export function factFlags(html: string, f: SiteFacts, pageKey?: string | null): string[] {
  const out: string[] = [];
  // 1) Nombre annoncé par un titre ≠ nombre d'éléments affichés.
  const lists = autoLists(html, f, pageKey);
  if (lists.length) {
    const titles = [...html.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => strip(m[2])).filter(Boolean);
    for (const title of titles) for (const c of countsInTitle(title)) {
      if (lists.some((l) => l.count === c.n)) continue;
      const l = lists[0];
      out.push(`le titre « ${title.slice(0, 90)} » annonce « ${c.word} » alors que la liste de cette section affichera ${l.count} ${l.what} (${l.items.map((x) => x.replace(/\s*\(.*\)$/, "")).slice(0, 8).join(", ")}) : si ce nombre compte la liste, écris le bon nombre ou retire-le`);
    }
  }
  // 2) « À compléter » encore visible une fois les vraies données posées, pour un fait présent au dossier.
  const filled = asShown(html, f, pageKey);
  const gaps = [...new Set([...filled.matchAll(/\[À compléter\s*:\s*([^\]<]{1,80})\]|<mark class="tn-manque">À compléter\s*:\s*([^<]{1,80})<\/mark>/g)].map((m) => (m[1] ?? m[2]).trim()))];
  for (const gap of gaps) {
    const g = fold(gap);
    // Un tiers (hébergeur, assureur, médiateur…) ou un autre identifiant (SIRET, TVA, RCS…) : ce n'est ni le téléphone,
    // ni l'adresse, ni les horaires du client. Seule une note du client qui nomme la même chose peut y répondre.
    const other = TIERS.exec(g) ?? AUTRE_IDENTIFIANT.exec(g);
    const stem = other?.[0] ?? null;
    const note = () => {
      const w = words(gap).filter((x) => !COMMON.has(x));
      const n = stem ? f.notes.find((x) => fold(x.title).includes(stem)) : w.length ? f.notes.find((x) => words(x.title).some((k) => w.includes(k))) : undefined;
      return n ? `« ${n.title} : ${n.value.slice(0, 200)} »` : null;
    };
    const known = other ? note()
      : /horaire|heures?\b|jours?\b|ouvert/.test(g) && f.site.hours ? `ses horaires : ${hoursLine(f.site.hours)}`
      : /zone|villes?\b|secteur|deplace/.test(g) && f.site.area ? `sa zone : ${f.site.area}`
      : /telephone|\btel\b|portable|\bmobile\b|numero (?:a appeler|d'appel|de contact)|^numero$/.test(g) && f.site.phone ? `son téléphone : ${f.site.phone}`
      : /mail|courriel/.test(g) && f.email ? `son e-mail : ${f.email}`
      : /adresse/.test(g) && f.discreet ? "son adresse, qu'il veut seulement dans les informations légales : retire cet emplacement"
      : /adresse/.test(g) && f.site.address ? `son adresse : ${f.site.address}`
      : note();
    if (known) out.push(`« [À compléter : ${gap}] » est écrit alors que le client a donné ${known}`);
  }
  // 3) Adresse discrète écrite ailleurs que dans les informations légales.
  if (f.discreet && f.address && pageKey !== "legal") {
    const street = fold(f.address).split(/[,\n]/)[0].replace(/\s+/g, " ").trim();
    if (street.length >= 6 && fold(strip(filled)).includes(street)) out.push(`l'adresse du client (« ${f.address.slice(0, 80)} ») est écrite ici alors qu'il la veut seulement dans les informations légales : retire-la (sa zone desservie suffit)`);
  }
  return [...new Set(out)].slice(0, 6);
}
