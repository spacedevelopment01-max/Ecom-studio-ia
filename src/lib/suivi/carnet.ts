/**
 * LE CARNET DE CLIENTS, QUI SÉPARE « RELATION » ET « OFFRE » (22 novembre 2026, recherche 08, point 9 ; engagements 11
 * et 12). Chaque fiche porte son origine (demande, achat, réservation, devis signé, chantier, ajout à la main), l'accord
 * daté pour recevoir des offres (avec d'où il vient), et sa fin : trois ans après le dernier contact (CNIL).
 *  - « relation » (demande d'avis, rappel de rendez-vous, suivi d'un devis) : à toute personne du carnet qui n'a pas
 *    refusé, avec un moyen simple de refuser ; pour la demande d'avis, seulement aux VRAIS clients, une seule fois, et
 *    jamais avec une offre dedans (règle de Google : rien en échange ; et la CNIL : une offre, c'est de la prospection) ;
 *  - « offre » (fête de l'an dernier, promotion, nouveauté) : seulement à qui a dit oui par écrit, ou à un vrai client
 *    pour des produits semblables à ceux qu'il a achetés.
 * Ce que la CNIL range à part de la prospection (enquêtes de satisfaction, gestion des avis) est notre lecture de son
 * référentiel, pas une position écrite d'elle : à confirmer par le propriétaire.
 * Le carnet se corrige et s'efface à la demande ; il s'efface seul trois ans après le dernier contact.
 * ÉTEINT tant que le propriétaire n'a pas dit oui (réglage `suivi.carnet`).
 */
import { all, id, now, one, run } from "../db";
import { L } from "../i18n-server";
import { OFFRE } from "./fiche-google";

export type Origine = "demande" | "achat" | "reservation" | "devis-signe" | "chantier" | "ajout";
export const VRAIS_CLIENTS: Origine[] = ["achat", "reservation", "devis-signe", "chantier"];
export const TROIS_ANS = 3 * 365 * 86_400_000;

export type FicheCarnet = {
  id: string; project_id: string; nom: string; email: string | null; telephone: string | null; origine: Origine;
  accord_offre_at: number | null; accord_source: string | null; refus_at: number | null; dernier_contact_at: number;
  avis_demande_at: number | null; note: string | null; created_at: number;
};

function ensure() {
  run(`CREATE TABLE IF NOT EXISTS carnet_clients (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, nom TEXT NOT NULL, email TEXT, telephone TEXT,
    origine TEXT NOT NULL, accord_offre_at INTEGER, accord_source TEXT, refus_at INTEGER, dernier_contact_at INTEGER NOT NULL,
    avis_demande_at INTEGER, note TEXT, created_at INTEGER NOT NULL)`);
  run("CREATE INDEX IF NOT EXISTS carnet_clients_projet ON carnet_clients(project_id)");
}
const rang = (o: Origine) => (VRAIS_CLIENTS.includes(o) ? 1 : 0);
const tel = (t?: string | null) => (t ? t.replace(/[^\d+]/g, "") || null : null);

/** Ajoute une personne, ou met sa fiche à jour (même e-mail ou même téléphone) : une origine de vrai client l'emporte. */
export function noter(projectId: string, p: { nom: string; email?: string | null; telephone?: string | null; origine: Origine; at?: number; accordOffre?: { source: string } | null; note?: string }): FicheCarnet {
  ensure();
  const at = p.at ?? now(), email = p.email?.trim().toLowerCase() || null, t = tel(p.telephone);
  if (!email && !t) throw new Error(L("Il faut un e-mail ou un téléphone.", "An e-mail or phone is required."));
  const deja = one<FicheCarnet>("SELECT * FROM carnet_clients WHERE project_id=? AND ((email IS NOT NULL AND email=?) OR (telephone IS NOT NULL AND telephone=?))", projectId, email, t);
  if (deja) {
    const origine = rang(p.origine) > rang(deja.origine) ? p.origine : deja.origine;
    run("UPDATE carnet_clients SET nom=COALESCE(NULLIF(?,''),nom), email=COALESCE(email,?), telephone=COALESCE(telephone,?), origine=?, dernier_contact_at=MAX(dernier_contact_at,?), accord_offre_at=COALESCE(accord_offre_at,?), accord_source=COALESCE(accord_source,?), note=COALESCE(?,note) WHERE id=?",
      p.nom.trim(), email, t, origine, at, p.accordOffre ? at : null, p.accordOffre?.source ?? null, p.note ?? null, deja.id);
    return one<FicheCarnet>("SELECT * FROM carnet_clients WHERE id=?", deja.id)!;
  }
  const fid = id();
  run("INSERT INTO carnet_clients(id,project_id,nom,email,telephone,origine,accord_offre_at,accord_source,dernier_contact_at,note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    fid, projectId, p.nom.trim() || L("sans nom", "no name"), email, t, p.origine, p.accordOffre ? at : null, p.accordOffre?.source ?? null, at, p.note ?? null, at);
  return one<FicheCarnet>("SELECT * FROM carnet_clients WHERE id=?", fid)!;
}

/** Les demandes du site rangées dans le carnet (origine « demande »), sans doublon. */
export function rangerLesDemandes(projectId: string): number {
  let n = 0;
  try {
    for (const r of all<{ fields: string; email: string | null; created_at: number }>("SELECT fields, email, created_at FROM site_requests WHERE project_id=?", projectId)) {
      const f = JSON.parse(r.fields) as Record<string, string>;
      const nom = [f.name, f.nom, f.prenom].filter(Boolean).join(" ");
      const t = f.phone ?? f.telephone ?? f.tel ?? null;
      if (!r.email && !t) continue;
      noter(projectId, { nom, email: r.email, telephone: t, origine: "demande", at: r.created_at });
      n++;
    }
  } catch { /* aucune demande */ }
  return n;
}

export type Sorte = "relation" | "offre";
/** Peut-on lui écrire ? Avec la raison, dite en clair au client. */
export function peutRecevoir(f: FicheCarnet, sorte: Sorte, o: { semblable?: boolean; at?: number } = {}): { oui: boolean; raison: string } {
  const at = o.at ?? now();
  if (f.refus_at) return { oui: false, raison: L("cette personne a demandé à ne plus être contactée", "this person asked not to be contacted") };
  if (at - f.dernier_contact_at > TROIS_ANS) return { oui: false, raison: L("dernier contact il y a plus de trois ans", "last contact over three years ago") };
  if (sorte === "relation") return { oui: true, raison: L("message de suivi, sans offre", "follow-up message, no offer") };
  if (f.accord_offre_at) return { oui: true, raison: L(`accord donné le ${new Date(f.accord_offre_at).toISOString().slice(0, 10)} (${f.accord_source ?? "écrit"})`, `consent given on ${new Date(f.accord_offre_at).toISOString().slice(0, 10)}`) };
  if (VRAIS_CLIENTS.includes(f.origine) && o.semblable) return { oui: true, raison: L("vrai client, pour des produits semblables à ceux qu'il a déjà pris", "real customer, for similar products") };
  return { oui: false, raison: L("pas d'accord écrit pour recevoir des offres", "no written consent for offers") };
}

/** La demande d'avis : vrais clients seulement, une seule fois, jamais d'offre dedans. Rend le message, ou la raison du refus. */
export function demandeAvis(f: FicheCarnet, a: { lienAvis: string; prenomPro: string; message?: string; at?: number }): { ok: true; message: string } | { ok: false; raison: string } {
  const at = a.at ?? now();
  if (!VRAIS_CLIENTS.includes(f.origine)) return { ok: false, raison: L("ce n'est pas encore un client (seulement une demande)", "not a customer yet") };
  if (f.avis_demande_at) return { ok: false, raison: L("un avis lui a déjà été demandé : jamais deux fois", "already asked once") };
  const r = peutRecevoir(f, "relation", { at });
  if (!r.oui) return { ok: false, raison: r.raison };
  if (!/^https:\/\//.test(a.lienAvis)) return { ok: false, raison: L("le lien de ta fiche Google manque", "your Google review link is missing") };
  const prenom = f.nom.split(/\s+/)[0];
  const message = (a.message ?? L(`Bonjour ${prenom}, merci encore de ta confiance. Si tu as deux minutes, ton avis sur Google aiderait beaucoup : ${a.lienAvis} — ${a.prenomPro}`, `Hello ${prenom}, thanks again. If you have two minutes, your Google review would help a lot: ${a.lienAvis} — ${a.prenomPro}`)).trim();
  if (OFFRE.test(message)) return { ok: false, raison: L("une demande d'avis ne contient jamais d'offre ni de cadeau", "a review request never contains an offer") };
  return { ok: true, message };
}
export function marquerAvisDemande(ficheId: string, at = now()) { ensure(); run("UPDATE carnet_clients SET avis_demande_at=? WHERE id=? AND avis_demande_at IS NULL", at, ficheId); }

/** Corriger une fiche, noter un refus, l'effacer (à la demande de la personne). */
export function corriger(projectId: string, ficheId: string, c: { nom?: string; email?: string | null; telephone?: string | null }) {
  ensure();
  run("UPDATE carnet_clients SET nom=COALESCE(?,nom), email=?, telephone=? WHERE id=? AND project_id=?", c.nom?.trim() || null, c.email === undefined ? one<{ email: string | null }>("SELECT email FROM carnet_clients WHERE id=?", ficheId)?.email ?? null : c.email?.trim().toLowerCase() || null, c.telephone === undefined ? one<{ telephone: string | null }>("SELECT telephone FROM carnet_clients WHERE id=?", ficheId)?.telephone ?? null : tel(c.telephone), ficheId, projectId);
}
export function refuse(projectId: string, ficheId: string, at = now()) { ensure(); run("UPDATE carnet_clients SET refus_at=?, accord_offre_at=NULL WHERE id=? AND project_id=?", at, ficheId, projectId); }
export function effacer(projectId: string, ficheId: string) { ensure(); run("DELETE FROM carnet_clients WHERE id=? AND project_id=?", ficheId, projectId); }
export function purgerCarnet(at = now()) { ensure(); run("DELETE FROM carnet_clients WHERE dernier_contact_at < ?", at - TROIS_ANS); }
export const carnet = (projectId: string) => (ensure(), all<FicheCarnet>("SELECT * FROM carnet_clients WHERE project_id=? ORDER BY dernier_contact_at DESC", projectId));
