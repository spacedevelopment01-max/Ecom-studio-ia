/**
 * LA FONCTION DE RÉTRACTATION EN LIGNE (22 novembre 2026, recherches 02 partie 4.1 et 04 partie 5.1). Directive (UE)
 * 2023/2673, article 11 bis de la directive 2011/83, en vigueur depuis le 19 juin 2026 ; en France, articles L. 221-21
 * et D. 221-5 du code de la consommation. Pour tout contrat conclu en ligne :
 *  - un lien « Renoncer au contrat ici », bien visible, disponible pendant tout le délai (le pied de chaque page) ;
 *  - une déclaration où l'acheteur donne son nom, ce qui identifie la commande et son adresse électronique ;
 *  - un second bouton « Confirmer la rétractation » ;
 *  - un accusé de réception sur support durable (un e-mail), sans retard, avec le contenu, la date et l'heure.
 * Le Studio porte la page lui-même (`/renoncer/<projet>`), pour les sites qu'il héberge comme pour Shopify, WooCommerce
 * et PrestaShop : le thème seul ne peut pas envoyer l'accusé. Le client (le marchand) est prévenu de chaque déclaration.
 */
import { all, id, now, one, run } from "../db";
import { L } from "../i18n-server";
import { mailConfigured, sendMail } from "../mail";
import { notify } from "../projects";
import { appUrl } from "../settings";

export const LIEN_RETRACTATION = { fr: "Renoncer au contrat ici", en: "Withdraw from the contract here" };
export const BOUTON_CONFIRMER = { fr: "Confirmer la rétractation", en: "Confirm the withdrawal" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** L'adresse de la page de rétractation d'un projet (hébergée par le Studio). */
export const retractationUrl = (projectId: string) => `${appUrl().replace(/\/$/, "")}/renoncer/${encodeURIComponent(projectId)}`;

/** Le lien, posé dans chaque pied de page du site (jamais deux fois). */
export function avecRetractation(html: string, url: string, lang: "fr" | "en" = "fr"): string {
  if (html.includes("data-tn-retractation")) return html;
  const a = `<p class="tn-retractation" data-tn-retractation><a href="${url.replace(/"/g, "&quot;")}" rel="nofollow">${LIEN_RETRACTATION[lang]}</a></p>`;
  return html.replace(/<\/footer>/g, `${a}</footer>`);
}

export type Declaration = { nom: string; commande: string; email: string };
export function declarationValide(d: Partial<Declaration>): string | null {
  if (!d.nom?.trim() || d.nom.length > 200) return L("Ton nom est demandé.", "Your name is required.");
  if (!d.commande?.trim() || d.commande.length > 200) return L("Le numéro de commande (ou ce qui identifie ton achat) est demandé.", "The order number is required.");
  if (!d.email?.trim() || !EMAIL.test(d.email.trim()) || d.email.length > 200) return L("Une adresse e-mail valide est demandée, pour recevoir l'accusé de réception.", "A valid email is required.");
  return null;
}

const dateHeure = (t: number) => new Date(t).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });

/** Le texte de l'accusé de réception : le contenu de la déclaration, la date et l'heure de l'envoi. */
export function texteAccuse(boutique: string, d: Declaration, at: number): string {
  return [
    `Accusé de réception de votre rétractation — ${boutique}`,
    "",
    `Votre déclaration de rétractation a bien été reçue le ${dateHeure(at)} (heure de Paris).`,
    "",
    "Contenu de votre déclaration :",
    `- Nom : ${d.nom.trim()}`,
    `- Commande : ${d.commande.trim()}`,
    `- Adresse e-mail : ${d.email.trim()}`,
    "",
    `Conservez ce message : il prouve la date et l'heure de votre rétractation. ${boutique} reviendra vers vous pour le remboursement.`,
  ].join("\n");
}

/** Enregistre une déclaration confirmée, envoie l'accusé daté à l'acheteur et prévient le marchand. */
export async function confirmerRetractation(projectId: string, d: Declaration): Promise<{ ok: true; at: number; accuse: boolean } | { ok: false; erreur: string }> {
  const err = declarationValide(d);
  if (err) return { ok: false, erreur: err };
  const p = one<{ user_id: string; name: string }>("SELECT user_id, name FROM projects WHERE id=?", projectId);
  if (!p) return { ok: false, erreur: L("Boutique introuvable.", "Shop not found.") };
  const at = now(), rid = id(), decl = { nom: d.nom.trim(), commande: d.commande.trim(), email: d.email.trim() };
  run("INSERT INTO retractations(id,project_id,nom,commande,email,created_at) VALUES(?,?,?,?,?,?)", rid, projectId, decl.nom, decl.commande, decl.email, at);
  let accuse = false;
  if (mailConfigured()) {
    try { await sendMail({ to: decl.email, subject: `Accusé de réception de votre rétractation — ${p.name}`, text: texteAccuse(p.name, decl, at), fromName: p.name }); accuse = true; run("UPDATE retractations SET accuse_at=? WHERE id=?", now(), rid); }
    catch (e) { run("UPDATE retractations SET accuse_erreur=? WHERE id=?", String((e as Error)?.message ?? e).slice(0, 300), rid); }
  } else run("UPDATE retractations SET accuse_erreur=? WHERE id=?", "envoi des e-mails non configuré", rid);
  notify(p.user_id, projectId, L("Une rétractation vient d'arriver", "A withdrawal just arrived"),
    L(`${decl.nom} renonce à la commande ${decl.commande} (${decl.email}), le ${dateHeure(at)}. ${accuse ? "L'accusé de réception daté lui a été envoyé." : "ATTENTION : l'accusé de réception n'a pas pu partir ; envoie-le toi-même aujourd'hui, avec ces informations."} Rembourse sous 14 jours.`, `${decl.nom} withdraws from order ${decl.commande}.`),
    accuse ? "info" : "warn");
  return { ok: true, at, accuse };
}

export const retractationsDuProjet = (projectId: string) => all<{ id: string; nom: string; commande: string; email: string; created_at: number; accuse_at: number | null; accuse_erreur: string | null }>("SELECT id, nom, commande, email, created_at, accuse_at, accuse_erreur FROM retractations WHERE project_id=? ORDER BY created_at DESC", projectId);
