/** Inscription sans énumération : l'adresse est confirmée avant toute création de session. */
import bcrypt from "bcryptjs";
import { id, now, one, run, tx } from "./db";
import { HttpError, type User } from "./auth";
import { hmac, randomToken } from "./secrets";
import { appUrl } from "./settings";
import { sendMailInBackground } from "./mail";
import { setUserLang } from "./i18n-server";
import { pick, type Lang } from "./i18n";

export const REGISTRATION_TTL_MS = 3600_000;
type Pending = { email: string; name: string; password_hash: string; token_hash: string; expires_at: number; language: Lang; next_path: string };

export async function requestRegistration(input: { email: string; password: string; name: string; lang: Lang; next: string }) {
  const email = input.email.trim().toLowerCase();
  // Le même calcul est fait pour une adresse existante ou nouvelle.
  const hash = await bcrypt.hash(input.password, 11);
  if (one("SELECT 1 FROM users WHERE email=?", email)) return;
  const token = randomToken(32);
  tx(() => {
    run("DELETE FROM pending_registrations WHERE email=? OR expires_at<=?", email, now());
    run("INSERT INTO pending_registrations(email,name,password_hash,token_hash,expires_at,language,next_path,created_at) VALUES(?,?,?,?,?,?,?,?)", email, input.name.trim(), hash, hmac(token), now()+REGISTRATION_TTL_MS, input.lang, input.next, now());
  });
  const url = `${appUrl()}/confirmer-inscription?jeton=${encodeURIComponent(token)}`;
  sendMailInBackground({ to: email, subject: pick(input.lang, "Confirmez votre inscription — E-COM STUDIO IA", "Confirm your registration — E-COM STUDIO IA"), text: pick(input.lang, `Pour confirmer votre adresse et créer votre compte, ouvrez ce lien valable une heure, puis appuyez sur Confirmer :\n\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`, `To confirm your address and create your account, open this link within one hour, then press Confirm:\n\n${url}\n\nIf you didn't request this, ignore this message.`) }, "mail.registration");
}

export function registrationTokenValid(token: string): boolean {
  if (!/^[\w-]{40,100}$/.test(token)) return false;
  return !!one("SELECT 1 FROM pending_registrations WHERE token_hash=? AND expires_at>?", hmac(token), now());
}

export async function confirmRegistration(token: string, password: string): Promise<{ user: User; next: string }> {
  const pending = /^[\w-]{40,100}$/.test(token) ? one<Pending>("SELECT * FROM pending_registrations WHERE token_hash=? AND expires_at>?", hmac(token), now()) : null;
  // Un simple clic involontaire ne confirme pas une inscription précréée par un tiers avec son propre mot de passe.
  if (!pending || password.length > 200 || !(await bcrypt.compare(password, pending.password_hash))) throw new HttpError(400, "Confirmation non valable / Invalid confirmation", "invalid_token");
  const result = tx(() => {
    const p = /^[\w-]{40,100}$/.test(token) ? one<Pending>("SELECT * FROM pending_registrations WHERE token_hash=? AND expires_at>?", hmac(token), now()) : null;
    if (!p || p.password_hash !== pending.password_hash || one("SELECT 1 FROM users WHERE email=?", p.email)) return null;
    const uid = id();
    // Aucune élévation de rôle via l'inscription ; confirmation administration distincte conservée.
    run("INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,'client',?)", uid, p.email, p.name || p.email.split("@")[0], p.password_hash, now());
    run("DELETE FROM pending_registrations WHERE email=?", p.email);
    setUserLang(uid, p.language);
    return { user: one<User>("SELECT id,email,name,role,timezone,created_at FROM users WHERE id=?", uid)!, next: p.next_path };
  });
  if (!result) throw new HttpError(400, "Lien non valable ou expiré / Invalid or expired link", "invalid_token");
  return result;
}
