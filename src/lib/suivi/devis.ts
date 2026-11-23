/**
 * LE DEVIS CONTRÔLÉ (22 novembre 2026, recherche 08, point 8 ; engagement 9). Construit PAR LE CODE, sans aucun appel :
 *  - les prix viennent SEULEMENT des tarifs enregistrés du client ; une prestation sans tarif devient une question posée
 *    une fois, jamais un prix deviné (même Batiprix fait retoucher les prix, recherche 08, 5.4) ;
 *  - les totaux hors taxes, TVA par taux et toutes taxes comprises sont calculés en centimes ;
 *  - les mentions obligatoires sont contrôlées selon le métier (service-public, F31144 ; code de l'environnement,
 *    D541-45-1 pour les déchets ; code de l'artisanat, L132-1 pour l'assurance) : un devis incomplet n'est jamais
 *    présenté comme prêt ; une case vide se demande au client, puis se garde dans sa fiche ;
 *  - la page de signature simple : lien unique, « bon pour accord », nom tapé ; le Studio garde la preuve (empreinte du
 *    document signé, date et heure, canal par lequel le lien est arrivé). Ce n'est PAS une signature « qualifiée » : pour
 *    un gros chantier, SINA conseille la signature à la main ou un service qualifié ;
 *  - la relance au bon moment : une seule, sept jours après l'envoi d'un devis resté sans signature.
 * Pas de facture : renvoi vers le logiciel du client (facture électronique obligatoire à émettre dès le 1er septembre 2027
 * pour les petites entreprises).
 * ÉTEINT tant que le propriétaire n'a pas dit oui (réglage `suivi.devis`) : ce sont des mentions légales qui engagent sa
 * responsabilité, à relire par lui (et le formulaire de rétractation d'un devis signé chez le client reste à vérifier).
 */
import { createHash, randomBytes } from "node:crypto";
import { all, now, one, run } from "../db";
import { L } from "../i18n-server";

export type Metier = "batiment" | "jardinage" | "depannage" | "services-personne" | "autre";
export type Tarif = { cle: string; libelle: string; unite: string; prixHT: number; tva: number };
export type LigneDemandee = { cle: string; quantite: number; libelle?: string };
export type LigneChiffree = { cle: string; libelle: string; unite: string; quantite: number; prixHT: number; tva: number; totalHT: number };

/** Les lignes chiffrées avec les tarifs du client ; une prestation sans tarif devient une question. */
export function chiffrer(demande: LigneDemandee[], tarifs: Tarif[]): { lignes: LigneChiffree[]; questions: string[] } {
  const par = new Map(tarifs.map((t) => [t.cle, t]));
  const lignes: LigneChiffree[] = [], questions: string[] = [];
  for (const d of demande) {
    const t = par.get(d.cle);
    if (!t || !Number.isInteger(t.prixHT) || t.prixHT < 0) { questions.push(L(`Quel est ton prix hors taxes pour « ${d.libelle ?? d.cle} » (et à l'unité, à l'heure ou au m²) ?`, `What is your price before tax for "${d.libelle ?? d.cle}"?`)); continue; }
    lignes.push({ cle: t.cle, libelle: t.libelle, unite: t.unite, quantite: d.quantite, prixHT: t.prixHT, tva: t.tva, totalHT: Math.round(t.prixHT * d.quantite) });
  }
  return { lignes, questions };
}

/** Les totaux, en centimes : hors taxes, TVA par taux, toutes taxes comprises. */
export function totaux(lignes: LigneChiffree[]): { ht: number; tva: { taux: number; montant: number }[]; ttc: number } {
  const ht = lignes.reduce((s, l) => s + l.totalHT, 0);
  const parTaux = new Map<number, number>();
  for (const l of lignes) parTaux.set(l.tva, (parTaux.get(l.tva) ?? 0) + l.totalHT);
  const tva = [...parTaux].sort((a, b) => a[0] - b[0]).map(([taux, base]) => ({ taux, montant: Math.round((base * taux) / 100) }));
  return { ht, tva, ttc: ht + tva.reduce((s, x) => s + x.montant, 0) };
}

export type Devis = {
  date: string; entreprise: { nom: string; adresse: string; siret?: string }; client: { nom: string; adresse?: string };
  lieu: string; nature: string; lignes: LigneChiffree[]; tauxHoraireTTC?: number | null; decompteTemps?: string;
  deplacement?: number | null; validiteJours: number; gratuit: boolean; prixDuDevis?: number | null;
  piecesRemplacees?: boolean; dechets?: { quantite?: string; tri?: string; collecte?: string; cout?: number | null };
  assurance?: { assureur?: string; coordonnees?: string; couverture?: string }; horsEtablissement?: boolean;
};

/** Le métier fait-il partie de ceux qui doivent écrire les déchets ? Et l'assurance ? */
const AVEC_DECHETS: Metier[] = ["batiment", "jardinage"];
const AVEC_ASSURANCE: Metier[] = ["batiment"];
const AVEC_HORAIRE: Metier[] = ["batiment", "depannage", "jardinage"];

/** Les mentions qui manquent, en clair ; vide : le devis peut être présenté comme prêt. */
export function mentionsManquantes(d: Devis, metier: Metier): string[] {
  const m: string[] = [];
  const vide = (s?: string | null) => !s || !s.trim();
  if (vide(d.date)) m.push(L("la date du devis", "the quote date"));
  if (vide(d.entreprise.nom) || vide(d.entreprise.adresse)) m.push(L("le nom et l'adresse de ton entreprise", "your business name and address"));
  if (vide(d.client.nom)) m.push(L("le nom du client", "the client's name"));
  if (vide(d.lieu)) m.push(L("le lieu des travaux", "the work location"));
  if (vide(d.nature)) m.push(L("la nature exacte des travaux", "the exact nature of the work"));
  if (!d.lignes.length) m.push(L("le détail des prestations, en quantité et en prix", "the itemised services"));
  if (!(d.validiteJours > 0)) m.push(L("la durée de validité du devis", "how long the quote is valid"));
  if (!d.gratuit && d.prixDuDevis == null) m.push(L("le prix du devis s'il est payant", "the quote's price if not free"));
  if (AVEC_HORAIRE.includes(metier)) {
    if (d.tauxHoraireTTC == null) m.push(L("ton taux horaire toutes taxes comprises", "your hourly rate incl. tax"));
    if (vide(d.decompteTemps)) m.push(L("la façon de compter le temps passé", "how time is counted"));
    if (d.deplacement == null) m.push(L("les frais de déplacement (0 s'il n'y en a pas)", "travel costs (0 if none)"));
    if (d.piecesRemplacees !== true) m.push(L("la phrase « vous pouvez garder les pièces remplacées »", "the replaced-parts sentence"));
  }
  if (AVEC_DECHETS.includes(metier)) {
    const x = d.dechets ?? {};
    if (vide(x.quantite)) m.push(L("l'estimation de la quantité de déchets du chantier", "estimated waste quantity"));
    if (vide(x.tri)) m.push(L("comment les déchets sont triés", "how waste is sorted"));
    if (vide(x.collecte)) m.push(L("le point de collecte des déchets (nom, adresse, type d'installation)", "the waste collection point"));
    if (x.cout == null) m.push(L("le coût estimé des déchets", "estimated waste cost"));
  }
  if (AVEC_ASSURANCE.includes(metier)) {
    const a = d.assurance ?? {};
    if (vide(a.assureur) || vide(a.coordonnees) || vide(a.couverture)) m.push(L("ton assurance professionnelle : assureur, coordonnées et zone couverte", "your professional insurance: insurer, contact and area"));
  }
  return m;
}

/** Le texte de la rétractation, quand le devis est accepté hors de l'entreprise (14 jours, sauf réparation urgente). */
export const MENTION_RETRACTATION = () => L("Devis accepté hors de l'entreprise : vous disposez de 14 jours pour vous rétracter, sauf réparation urgente demandée par vous.", "Quote accepted off-premises: you have 14 days to withdraw, except for urgent repairs you requested.");

/* ---------- La signature simple, avec sa preuve ---------- */

function ensure() {
  run("CREATE TABLE IF NOT EXISTS devis_signatures (token TEXT PRIMARY KEY, project_id TEXT NOT NULL, document TEXT NOT NULL, empreinte TEXT NOT NULL, canal TEXT NOT NULL, envoye_at INTEGER NOT NULL, relance_at INTEGER, signe_at INTEGER, signe_nom TEXT, signe_mention TEXT)");
}
/** L'empreinte du document : la même pour le même devis, quel que soit l'ordre des champs. */
export function empreinteDevis(d: Devis): string {
  const tri = (v: unknown): unknown => Array.isArray(v) ? v.map(tri) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, tri(x)])) : v;
  return createHash("sha256").update(JSON.stringify(tri(d))).digest("hex");
}

/** Le lien unique de signature ; refusé si une mention manque. */
export function creerLienSignature(projectId: string, d: Devis, metier: Metier, canal: "email" | "sms" | "whatsapp" | "copie", at = now()): string {
  const manque = mentionsManquantes(d, metier);
  if (manque.length) throw new Error(L(`Devis incomplet : ${manque.join(", ")}.`, `Incomplete quote: ${manque.join(", ")}.`));
  ensure();
  const token = randomBytes(24).toString("base64url");
  run("INSERT INTO devis_signatures(token,project_id,document,empreinte,canal,envoye_at) VALUES(?,?,?,?,?,?)", token, projectId, JSON.stringify(d), empreinteDevis(d), canal, at);
  return token;
}

export const MENTION_ACCORD = "bon pour accord";
/** La signature : nom tapé, « bon pour accord » recopié, document inchangé. La preuve est gardée. */
export function signer(token: string, a: { nom: string; mention: string; empreinteVue: string }, at = now()): { ok: true; signeAt: number } {
  ensure();
  const r = one<{ empreinte: string; signe_at: number | null }>("SELECT empreinte, signe_at FROM devis_signatures WHERE token=?", token);
  if (!r) throw new Error(L("Ce lien de devis n'existe pas.", "This quote link doesn't exist."));
  if (r.signe_at) throw new Error(L("Ce devis est déjà signé.", "This quote is already signed."));
  if (a.empreinteVue !== r.empreinte) throw new Error(L("Le devis a changé depuis son envoi : demande le nouveau lien.", "The quote changed since it was sent."));
  if (a.nom.trim().length < 2) throw new Error(L("Écris ton nom et ton prénom.", "Type your full name."));
  if (a.mention.trim().toLowerCase().replace(/\s+/g, " ") !== MENTION_ACCORD) throw new Error(L(`Recopie « ${MENTION_ACCORD} ».`, `Type "${MENTION_ACCORD}".`));
  run("UPDATE devis_signatures SET signe_at=?, signe_nom=?, signe_mention=? WHERE token=?", at, a.nom.trim().slice(0, 120), MENTION_ACCORD, token);
  return { ok: true, signeAt: at };
}

/** La preuve gardée d'un devis (pour le client, en cas de litige). */
export function preuve(token: string) {
  ensure();
  return one<{ empreinte: string; canal: string; envoye_at: number; signe_at: number | null; signe_nom: string | null; signe_mention: string | null }>("SELECT empreinte, canal, envoye_at, signe_at, signe_nom, signe_mention FROM devis_signatures WHERE token=?", token) ?? null;
}

export const RELANCE_APRES_JOURS = 7;
/** Les devis à relancer : envoyés depuis 7 jours, sans signature, jamais relancés. Une seule relance. */
export function devisARelancer(projectId: string, at = now()): string[] {
  ensure();
  return all<{ token: string }>("SELECT token FROM devis_signatures WHERE project_id=? AND signe_at IS NULL AND relance_at IS NULL AND envoye_at <= ?", projectId, at - RELANCE_APRES_JOURS * 86_400_000).map((r) => r.token);
}
export function marquerRelance(token: string, at = now()) { ensure(); run("UPDATE devis_signatures SET relance_at=? WHERE token=? AND relance_at IS NULL", at, token); }
