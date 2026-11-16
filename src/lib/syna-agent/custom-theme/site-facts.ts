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
 */
import { memory, type Project } from "../../projects";
import { companyOf } from "../activity";
import { tenuePrestations, tenueProducts, tenueSite } from "./render";
import { withTenuePrestations, withTenueProducts, type TenuePrestation, type TenueProduct } from "./tenue";
import { hoursLine, withTenueSite, type TenueSite } from "./tenue-data";
import type { CustomTheme } from "./theme";

// ---------------------------------------------------------------- ce que le client a dit (mémoire du projet)

/**
 * Clés « syna.* » que le Studio écrit lui-même dans la mémoire (étape 0, identité choisie, copies de travail) : ce ne sont
 * pas des notes prises par SINA dans la conversation. Les notes de l'outil de mémoire sont des décisions ou des faits
 * confirmés, de source « client », sous une clé libre « syna.<titre> ».
 */
export const STUDIO_MEMORY_KEYS = new Set(["identite", "nom", "langues", "slogan", "depart", "garder"]);
const STUDIO_MEMORY_PREFIXES = ["custom_", "mockup", "css", "step", "product_", "remises", "agent", "site", "brand", "angles", "posts", "studio"];
export const NOTES_MAX = 24, NOTE_MAX_CHARS = 400, NOTES_MAX_CHARS = 4000;

export type ClientNote = { title: string; value: string };

/** Les notes prises par SINA avec son outil de mémoire (les plus récentes d'abord), dans une taille raisonnable. */
export function clientNotes(projectId: string): ClientNote[] {
  let rows: ReturnType<typeof memory> = [];
  try { rows = memory(projectId); } catch { return []; }
  const out: ClientNote[] = [];
  let size = 0;
  for (const m of [...rows].sort((a, b) => b.updated_at - a.updated_at)) {
    if (!m.key.startsWith("syna.") || !["fact", "decision"].includes(m.kind) || m.source !== "user" || m.status !== "confirmed") continue;
    const title = m.key.slice(5).trim(), low = title.toLowerCase();
    if (!title || STUDIO_MEMORY_KEYS.has(low) || STUDIO_MEMORY_PREFIXES.some((x) => low.startsWith(x))) continue;
    const value = m.value.replace(/\s+/g, " ").trim();
    // Une copie de travail (objet enregistré tel quel) n'est pas une parole du client.
    if (!value || /^[[{]/.test(value)) continue;
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

export type SiteFacts = { site: TenueSite; prestations: TenuePrestation[]; products: TenueProduct[]; notes: ClientNote[]; /** Adresse de la fiche (même discrète), pour la reconnaître dans un texte. */ address: string | null; discreet: boolean };

/** Tout ce que le Studio sait et posera lui-même dans les pièces (lu une fois par montage). */
export function siteFacts(p: Project, t: CustomTheme): SiteFacts {
  const prestations = (() => { try { return tenuePrestations(p.id); } catch { return []; } })();
  const products = (() => { try { return tenueProducts(p.id, t); } catch { return []; } })();
  const site = (() => { try { return tenueSite(p, t, products, prestations); } catch { return { products, prestations } as TenueSite; } })();
  const co = (() => { try { return companyOf(p.id); } catch { return {}; } })() as { address?: string; addressDiscreet?: boolean };
  return { site, prestations, products, notes: clientNotes(p.id), address: (p.services?.address || co.address || "").trim() || null, discreet: co.addressDiscreet === true };
}

const has = (html: string, attr: string) => new RegExp(`\\sdata-tn-${attr}(?=[\\s>=])`).test(html);
const prestationLine = (x: TenuePrestation) => `${x.name}${x.duration || x.price ? ` (${[x.duration, x.price].filter(Boolean).join(", ")})` : ""}`;

/** Les listes qu'une pièce remplit seule depuis le catalogue : ce qu'elles montrent, et combien d'éléments. */
export function autoLists(html: string, f: SiteFacts): { what: string; count: number; items: string[] }[] {
  const out: { what: string; count: number; items: string[] }[] = [];
  if (has(html, "prestations") && f.prestations.length) { const list = f.prestations.slice(0, 40); out.push({ what: "prestations", count: list.length, items: list.map(prestationLine) }); }
  if (has(html, "produits") && f.products.length) { const list = f.products.slice(0, /class="tn tn-catalogue/.test(html) ? 60 : 8); out.push({ what: "produits", count: list.length, items: list.map((x) => `${x.title}${x.price ? ` (${x.price})` : ""}`) }); }
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
export function shownFacts(html: string, f: SiteFacts): string {
  const lines: string[] = [];
  for (const l of autoLists(html, f)) lines.push(`- La liste de cette section affichera TOUT ce que le catalogue contient, soit exactement ${l.count} ${l.what}, dans cet ordre : ${l.items.join(" ; ")}. Tu ne peux ni en retirer ni en choisir : n'écris pas ses lignes.`);
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
  const lists = autoLists(html, f);
  if (lists.length) {
    const titles = [...html.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => strip(m[2])).filter(Boolean);
    for (const title of titles) for (const c of countsInTitle(title)) {
      if (lists.some((l) => l.count === c.n)) continue;
      const l = lists[0];
      out.push(`le titre « ${title.slice(0, 90)} » annonce « ${c.word} » alors que la liste de cette section affichera ${l.count} ${l.what} (${l.items.map((x) => x.replace(/\s*\(.*\)$/, "")).slice(0, 8).join(", ")}) : si ce nombre compte la liste, écris le bon nombre ou retire-le`);
    }
  }
  // 2) « À compléter » encore visible une fois les vraies données posées, pour un fait présent au dossier.
  const filled = (() => { try { return withTenueSite(withTenueProducts(withTenuePrestations(html, f.prestations), f.products), f.site); } catch { return html; } })();
  const gaps = [...new Set([...filled.matchAll(/\[À compléter\s*:\s*([^\]<]{1,80})\]|<mark class="tn-manque">À compléter\s*:\s*([^<]{1,80})<\/mark>/g)].map((m) => (m[1] ?? m[2]).trim()))];
  for (const gap of gaps) {
    const g = fold(gap);
    const known = /horaire|heures?\b|jours?\b|ouvert/.test(g) && f.site.hours ? `ses horaires : ${hoursLine(f.site.hours)}`
      : /zone|villes?\b|secteur|deplace/.test(g) && f.site.area ? `sa zone : ${f.site.area}`
      : /telephone|numero/.test(g) && f.site.phone ? `son téléphone : ${f.site.phone}`
      : /adresse/.test(g) && f.discreet ? "son adresse, qu'il veut seulement dans les informations légales : retire cet emplacement"
      : /adresse/.test(g) && f.site.address ? `son adresse : ${f.site.address}`
      : (() => { const w = words(gap).filter((x) => !COMMON.has(x)); const n = w.length ? f.notes.find((x) => words(x.title).some((k) => w.includes(k))) : undefined; return n ? `« ${n.title} : ${n.value.slice(0, 200)} »` : null; })();
    if (known) out.push(`« [À compléter : ${gap}] » est écrit alors que le client a donné ${known}`);
  }
  // 3) Adresse discrète écrite ailleurs que dans les informations légales.
  if (f.discreet && f.address && pageKey !== "legal") {
    const street = fold(f.address).split(/[,\n]/)[0].replace(/\s+/g, " ").trim();
    if (street.length >= 6 && fold(strip(filled)).includes(street)) out.push(`l'adresse du client (« ${f.address.slice(0, 80)} ») est écrite ici alors qu'il la veut seulement dans les informations légales : retire-la (sa zone desservie suffit)`);
  }
  return [...new Set(out)].slice(0, 6);
}
