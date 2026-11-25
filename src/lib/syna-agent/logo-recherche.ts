/**
 * LA MÉTHODE DES GRAPHISTES, temps 1 et 2 : le métier, puis la recherche (24 novembre 2026, plan accepté par le chef
 * d'orchestre ; oui du propriétaire à la construction). Elle remplace entièrement l'ancienne série de logos.
 *
 * 1. Le métier : un petit appel écrit {MÉTIER} (« une entreprise de menuiserie spécialisée dans … ») et la piste (« le
 *    savoir-faire de … » pour un artisan, « l'univers de … » pour un commerce). Un contrôle gratuit vérifie la forme.
 * 2. La recherche : deux appels POST /v1/images/generations, en même temps, GPT Image 2.5 Sunburst et GPT Image 2.6 Flare,
 *    avec le même texte EXACT (preuves : docs/studio/essais-logos-api/methode-graphiste-…/phase1.py, six projets, branche
 *    du chef d'orchestre), suivi de « Varie les couleurs d'une esquisse à l'autre. » (24 novembre 2026, le propriétaire
 *    devant la planche essayée avec cette phrase : « Ouais mais c'est ça que je veux dans sina c'est la nouvelle planche
 *    avec un peu plus de coloris »). Rien d'autre : ni couleurs du client, ni goûts du client, ni planche des logos aimés.
 *    Pour « à éviter » et « d'autres pistes », une seule phrase est ajoutée à la toute fin, après celle des couleurs :
 *    « Évite ces pistes déjà présentées : … » (décision du chef : pas de retouche de planche).
 * Une panne du fournisseur n'est jamais relancée toute seule : la planche manque, c'est dit.
 */
import { z } from "zod";
import { LOGO_MODELS } from "../ai/logo-policy";

// ---------------------------------------------------------------- 1. le métier

export const MetierSchema = z.object({
  /** « une entreprise de menuiserie spécialisée dans les cuisines et dressings sur mesure » : sans le nom, sans point final. */
  metier: z.string().min(8).max(240),
  /** « la menuiserie » : ce que la piste explore, avec son article. */
  court: z.string().min(3).max(90),
  /** « savoir-faire » pour un artisan (il fabrique, il répare, il soigne), « univers » pour un commerce (il vend). */
  piste: z.enum(["savoir-faire", "univers"]),
});
export type Metier = z.infer<typeof MetierSchema>;

export const METIER_SYSTEM = `Tu écris, en français simple, le métier d'une entreprise pour la demande d'un logo. Réponds en JSON :
- metier : une seule phrase sans point final, qui commence par « une » ou « un » (« une entreprise de menuiserie spécialisée dans les cuisines et dressings sur mesure », « une entreprise qui vend des accessoires pour chiens, notamment des harnais, des laisses et des colliers », « un atelier de céramique qui vend de la vaisselle faite main : bols, assiettes et tasses ») ; jamais le nom de la marque, aucun mot d'initié, aucune promesse ;
- court : ce que le logo doit traduire, avec son article (« la menuiserie », « le nettoyage automobile », « les accessoires pour chiens ») ;
- piste : « savoir-faire » si l'entreprise fabrique, répare ou rend un service de ses mains ; « univers » si elle vend des produits qu'elle ne fabrique pas.`;

/** La demande du métier : ce que le client fait, avec ses mots (jamais ses goûts sur le logo). */
export const demandeDuMetier = (o: { nom: string; activite: string; kind: "produits" | "services" }) =>
  `Le nom de la marque (à ne jamais écrire dans ta réponse) : « ${o.nom} ».\nCe que fait l'entreprise, avec les mots du client : ${o.activite.trim().slice(0, 1200)}\nElle vend surtout ${o.kind === "produits" ? "des produits" : "des services"}.`;

const sansAccent = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Le contrôle gratuit de la forme du métier. null : bon ; sinon la raison (dite au rédacteur pour une réécriture). */
export function controleDuMetier(m: Metier, nom: string): string | null {
  const t = m.metier.trim(), c = m.court.trim();
  if (!/^(une|un) \p{L}/u.test(t)) return "le métier doit commencer par « une » ou « un »";
  if (/[.!?]$/.test(t)) return "le métier ne finit pas par un point";
  if (/[\n«»"]/.test(t) || /[\n«»"]/.test(c)) return "ni guillemets ni retour à la ligne";
  if (nom.trim() && sansAccent(t).includes(sansAccent(nom.trim()))) return "le nom de la marque ne doit pas être dans le métier";
  if (!/^(la |le |les |l['’])\p{L}/u.test(c)) return "« court » commence par son article (la, le, les, l')";
  if (c.length > t.length) return "« court » est plus court que le métier";
  return null;
}

/** « de » devant ce que la piste explore : « de la menuiserie », « du nettoyage », « des bougies », « de l'ébénisterie ». */
export function deLArticle(court: string): string {
  const c = court.trim().replace(/’/g, "'");
  if (/^le /i.test(c)) return `du ${c.slice(3)}`;
  if (/^les /i.test(c)) return `des ${c.slice(4)}`;
  return `de ${c}`;
}
/** La piste de la demande : « le savoir-faire de la menuiserie » ou « l'univers des accessoires pour chiens ». */
export const laPiste = (m: Pick<Metier, "court" | "piste">) => `${m.piste === "savoir-faire" ? "le savoir-faire" : "l'univers"} ${deLArticle(m.court)}`;

// ---------------------------------------------------------------- 2. la recherche

/** Les deux modèles de la recherche (logo-policy.ts), lancés en même temps. */
export const MODELES_DE_RECHERCHE = LOGO_MODELS.recherche;

/** La phrase des couleurs, ajoutée à la demande des preuves (24 novembre 2026, « un peu plus de coloris »). */
export const PHRASE_DES_COULEURS = "Varie les couleurs d'une esquisse à l'autre.";

/**
 * LE TEXTE EXACT d'une planche de recherche : mot pour mot celui des preuves, suivi de la phrase des couleurs. `eviter` :
 * les pistes déjà présentées, en mots (« d'autres pistes », ou le remplacement des esquisses écartées) ; une
 * seule phrase ajoutée à la toute fin, après celle des couleurs.
 */
export function demandeDeRecherche(o: { nom: string; metier: Pick<Metier, "metier" | "court" | "piste">; eviter?: readonly string[] }): string {
  const base = `Crée une planche de recherche graphique pour ${o.nom}, ${o.metier.metier.trim()}. Présente six esquisses de logos contemporains sur une grille de trois colonnes et deux lignes. Explore différentes manières de traduire ${laPiste(o.metier)} dans le dessin des lettres et des signes graphiques. Chaque piste doit pouvoir devenir une véritable marque commerciale. Travaille sur fond blanc, sans maquette de présentation. ${PHRASE_DES_COULEURS}`;
  const pistes = (o.eviter ?? []).map((p) => p.trim().replace(/[.;]+$/, "")).filter(Boolean);
  return pistes.length ? `${base} ${phraseEvite(pistes)}` : base;
}
/** « Évite ces pistes déjà présentées : … » (la seule phrase ajoutée à la demande exacte). */
export const phraseEvite = (pistes: readonly string[]) => `Évite ces pistes déjà présentées : ${pistes.join(" ; ")}.`;

/** Une planche reçue, avec ce qui a servi à la faire (gardé avec l'image). */
export type PlancheRecue = { modele: string; png: Buffer; texteEnvoye: string; requestId: string | null; usage: unknown; coutMicro: number | null };
/** Une planche qui n'est pas venue : panne du fournisseur, jamais relancée toute seule. */
export type PlancheManquee = { modele: string; raison: string; plafond?: boolean };

/**
 * Les deux planches, EN MÊME TEMPS, avec le même texte. Un échec n'empêche pas l'autre et n'est jamais relancé ; un
 * plafond de dépense atteint est dit à part (`plafond`).
 */
export async function lancerLesPlanches(draw: (modele: string, prompt: string) => Promise<Omit<PlancheRecue, "modele" | "texteEnvoye">>, prompt: string, estPlafond: (e: unknown) => boolean = () => false,
  /** Les modèles à lancer (par défaut les deux de la recherche ; un remplacement : celui à qui il manque des esquisses). */
  modeles: readonly string[] = MODELES_DE_RECHERCHE): Promise<{ planches: PlancheRecue[]; manquees: PlancheManquee[] }> {
  const res = await Promise.allSettled(modeles.map((m) => draw(m, prompt)));
  const planches: PlancheRecue[] = [], manquees: PlancheManquee[] = [];
  res.forEach((r, i) => {
    const modele = modeles[i];
    if (r.status === "fulfilled") planches.push({ modele, texteEnvoye: prompt, ...r.value });
    else manquees.push({ modele, raison: String((r.reason as Error)?.message ?? r.reason).slice(0, 300), ...(estPlafond(r.reason) ? { plafond: true } : {}) });
  });
  return { planches, manquees };
}
