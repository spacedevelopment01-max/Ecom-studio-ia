/**
 * Rôle administrateur : jamais attribué sur simple inscription avec l'adresse ADMIN_EMAIL (n'importe qui pourrait
 * s'inscrire le premier avec cette adresse). Le compte est créé « client » ; un lien signé, à usage unique et valable
 * 24 heures, est envoyé à ADMIN_EMAIL (ou affiché dans le journal du serveur si l'envoi d'e-mails n'est pas
 * configuré : seul le propriétaire de l'hébergement y a accès). Le rôle n'est donné qu'au compte connecté qui ouvre
 * ce lien. Les administrateurs existants ne sont jamais rétrogradés.
 */
import { now, one, run, tx } from "./db";
import { hmac, randomToken } from "./secrets";
import { appUrl } from "./settings";
import { mailConfigured, sendMailInBackground } from "./mail";
import type { User } from "./auth";

export const ADMIN_CLAIM_TTL_MS = 24 * 3600_000;
export const adminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

/** Le compte peut-il demander le rôle (adresse = ADMIN_EMAIL, pas encore administrateur) ? */
export const canClaimAdmin = (u: Pick<User, "email" | "role">) => !!adminEmail() && u.email.toLowerCase() === adminEmail() && u.role !== "admin";

/** Crée un lien de vérification (les précédents sont annulés) et l'envoie à ADMIN_EMAIL. Renvoie l'adresse du lien. */
export function requestAdminClaim(u: Pick<User, "id" | "email" | "role">): string | null {
  if (!canClaimAdmin(u)) return null;
  // Au plus un lien par heure (inscription puis connexions répétées).
  const recent = one<{ created_at: number }>("SELECT created_at FROM admin_claims WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1", u.id);
  if (recent && recent.created_at > now() - 3600_000) return null;
  const token = randomToken(32);
  tx(() => {
    run("DELETE FROM admin_claims WHERE user_id = ?", u.id);
    run("INSERT INTO admin_claims (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)", hmac(token), u.id, now() + ADMIN_CLAIM_TTL_MS, now());
  });
  const url = `${appUrl()}/api/auth/admin-claim?jeton=${encodeURIComponent(token)}`;
  if (mailConfigured()) {
    sendMailInBackground({ to: u.email, subject: "E-COM STUDIO IA — confirmer l'accès administrateur", text: `Pour activer l'administration sur ce compte, ouvrez ce lien en étant connecté (valable 24 heures, une seule fois) :\n\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.` }, "admin-claim");
  } else {
    // Sans envoi d'e-mails : le lien n'est visible que dans le journal du serveur (propriétaire de l'hébergement).
    console.info(`[admin] Lien de confirmation de l'accès administrateur (24 h, usage unique) : ${url}`);
  }
  return url;
}

/** Ouvre le lien : le compte connecté reçoit le rôle s'il est bien celui du lien et de l'adresse ADMIN_EMAIL. */
export function confirmAdminClaim(token: string | null | undefined, current: Pick<User, "id" | "email" | "role"> | null): boolean {
  if (!token || token.length > 100 || !current || !canClaimAdmin(current)) return false;
  return tx(() => {
    const r = one<{ user_id: string; expires_at: number; used_at: number | null }>("SELECT * FROM admin_claims WHERE token_hash = ?", hmac(token));
    if (!r || r.used_at || r.expires_at < now() || r.user_id !== current.id) return false;
    run("UPDATE admin_claims SET used_at = ? WHERE token_hash = ?", now(), hmac(token));
    run("UPDATE users SET role = 'admin' WHERE id = ?", current.id);
    return true;
  });
}
