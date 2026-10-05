/**
 * Mot de passe : changement depuis Mon compte, réinitialisation par lien (e-mail ou lien généré par l'administration).
 * Le lien porte un jeton aléatoire de 256 bits ; la base ne garde que son empreinte signée (HMAC avec APP_SECRET).
 * Jeton à usage unique, valable 1 heure ; un nouveau lien annule les précédents. Après réinitialisation,
 * toutes les sessions du compte sont fermées.
 */
import bcrypt from "bcryptjs";
import { all, now, one, run, tx } from "./db";
import { HttpError, type User } from "./auth";
import { hmac, randomToken, sha256 } from "./secrets";
import { appUrl } from "./settings";
import { L } from "./i18n-server";
import { pick, type Lang } from "./i18n";

export const RESET_TTL_MS = 3600_000;
export const MIN_PASSWORD = 8;

function checkStrength(pw: string) {
  if (pw.length < MIN_PASSWORD) throw new HttpError(400, L("Le mot de passe doit contenir au moins 8 caractères.", "Password must be at least 8 characters long."));
  if (pw.length > 200) throw new HttpError(400, L("Mot de passe trop long (200 caractères au maximum).", "Password too long (200 characters maximum)."));
}

async function writePassword(userId: string, pw: string) {
  run("UPDATE users SET password_hash = ? WHERE id = ?", await bcrypt.hash(pw, 11), userId);
}

/** Ferme les sessions du compte, sauf éventuellement celle en cours (jeton du cookie). */
export function closeSessions(userId: string, keepToken?: string | null) {
  if (keepToken) run("DELETE FROM sessions WHERE user_id = ? AND id != ?", userId, sha256(keepToken));
  else run("DELETE FROM sessions WHERE user_id = ?", userId);
}

/** Changement depuis Mon compte : l'ancien mot de passe est exigé ; les autres appareils sont déconnectés. */
export async function changePassword(user: User, current: string, next: string, keepToken?: string | null) {
  const row = one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", user.id);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) throw new HttpError(403, L("Mot de passe actuel incorrect.", "Current password is incorrect."), "bad_password");
  checkStrength(next);
  if (current === next) throw new HttpError(400, L("Le nouveau mot de passe doit être différent de l'actuel.", "The new password must be different from the current one."));
  await writePassword(user.id, next);
  closeSessions(user.id, keepToken);
}

/** Crée un lien de réinitialisation (les liens précédents du compte sont annulés). */
export function createResetLink(userId: string, createdBy: string): { url: string; token: string; expiresAt: number } {
  const token = randomToken(32);
  const expiresAt = now() + RESET_TTL_MS;
  tx(() => {
    run("DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?", userId, now() - 86400_000);
    run("INSERT INTO password_resets (token_hash, user_id, expires_at, created_by, created_at) VALUES (?,?,?,?,?)", hmac(token), userId, expiresAt, createdBy, now());
  });
  return { url: `${appUrl()}/mot-de-passe?jeton=${encodeURIComponent(token)}`, token, expiresAt };
}

type ResetRow = { token_hash: string; user_id: string; expires_at: number; used_at: number | null };

/** Le lien est-il encore valable ? (page de saisie du nouveau mot de passe) */
export function resetTokenValid(token: string | null | undefined): boolean {
  if (!token || token.length > 100) return false;
  const r = one<ResetRow>("SELECT * FROM password_resets WHERE token_hash = ?", hmac(token));
  return !!r && !r.used_at && r.expires_at > now();
}

/** Nouveau mot de passe à partir d'un lien : usage unique, puis toutes les sessions du compte sont fermées. */
export async function resetPassword(token: string, next: string): Promise<{ userId: string }> {
  checkStrength(next);
  const hash = await bcrypt.hash(next, 11);
  const userId = tx(() => {
    const r = token && token.length <= 100 ? one<ResetRow>("SELECT * FROM password_resets WHERE token_hash = ?", hmac(token)) : undefined;
    if (!r || r.used_at || r.expires_at <= now()) return null;
    run("UPDATE password_resets SET used_at = ? WHERE token_hash = ?", now(), r.token_hash);
    run("DELETE FROM password_resets WHERE user_id = ? AND token_hash != ?", r.user_id, r.token_hash);
    run("UPDATE users SET password_hash = ? WHERE id = ?", hash, r.user_id);
    run("DELETE FROM sessions WHERE user_id = ?", r.user_id);
    return r.user_id;
  });
  if (!userId) throw new HttpError(400, L("Ce lien n'est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau.", "This link is no longer valid (already used or expired). Request a new one."), "invalid_token");
  return { userId };
}

/** E-mail de réinitialisation, dans la langue mémorisée du compte. */
export function resetMail(lang: Lang, url: string) {
  const subject = pick(lang, "Réinitialisez votre mot de passe — E-COM STUDIO IA", "Reset your password — E-COM STUDIO IA");
  const text = pick(
    lang,
    `Bonjour,\n\nVous avez demandé à réinitialiser le mot de passe de votre compte E-COM STUDIO IA. Ouvrez ce lien pour en choisir un nouveau (valable 1 heure, utilisable une seule fois) :\n\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.\n`,
    `Hello,\n\nYou asked to reset the password of your E-COM STUDIO IA account. Open this link to choose a new one (valid for 1 hour, single use):\n\n${url}\n\nIf you didn't make this request, ignore this email: your password stays unchanged.\n`,
  );
  return { subject, text };
}

/** Pour les tests : liens actifs d'un compte. */
export function activeResetCount(userId: string) {
  return all("SELECT 1 FROM password_resets WHERE user_id = ? AND used_at IS NULL AND expires_at > ?", userId, now()).length;
}
