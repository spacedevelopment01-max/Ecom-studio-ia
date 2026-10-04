import "server-only";
import { cookies, headers } from "next/headers";
import { sql } from "./db";
import { keyedHash, randomToken } from "./crypto";
import { env } from "./env";
import { HttpError, unauthorized } from "./http";
import { sendMail } from "./mail";
import { audit } from "./audit";

export const SESSION_COOKIE = "ap_session";
export const TERMS_VERSION = "2026-10";
const SESSION_DAYS = 30;
const SESSION_IDLE_DAYS = 7; // session fermée après 7 jours sans activité
export const MAGIC_LINK_MINUTES = 15;
export const ELEVATION_MINUTES = 10; // durée d'ouverture du coffre après vérification renforcée

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  plan: "free" | "plus";
  retention_days: number | null;
  reminders_enabled: boolean;
  ai_consent_at: Date | null;
  created_at: Date;
};

export type Session = {
  id: string;
  user_id: string;
  elevated_until: Date | null;
  elevated_method: string | null;
  created_at: Date;
  locked: boolean;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ───────────── Lien magique ─────────────

export async function createMagicLink(email: string, ip: string, termsAccepted: boolean) {
  const token = randomToken(32);
  await sql()`
    insert into magic_links (email, token_hash, expires_at, ip_hash, terms_version)
    values (${email}, ${keyedHash(`magic:${token}`)}, now() + ${`${MAGIC_LINK_MINUTES} minutes`}::interval,
            ${keyedHash(`ip:${ip}`).slice(0, 16)}, ${termsAccepted ? TERMS_VERSION : null})`;
  const url = `${env.appUrl}/connexion/verifier#${token}`;
  await sendMail({
    to: email,
    subject: "Votre lien de connexion Allô Papiers",
    text: `Bonjour,

Pour vous connecter à Allô Papiers, ouvrez ce lien puis appuyez sur « Me connecter » :
${url}

Ce lien est valable ${MAGIC_LINK_MINUTES} minutes et ne fonctionne qu'une seule fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : personne ne pourra se connecter sans ce lien.`,
  });
}

/**
 * Consomme un lien magique (usage unique, durée limitée) et ouvre une session.
 * Le jeton est transmis dans le fragment d'URL (#) puis envoyé en POST : il n'apparaît
 * ni dans les journaux du serveur, ni dans l'en-tête Referer, et les antivirus de
 * messagerie qui « visitent » les liens ne peuvent pas le consommer.
 */
export async function consumeMagicLink(token: string, userAgent: string | null, ip: string) {
  const tokenHash = keyedHash(`magic:${token}`);
  const result = await sql().begin(async (tx) => {
    const [link] = await tx<{ id: string; email: string; terms_version: string | null }[]>`
      update magic_links set used_at = now()
       where token_hash = ${tokenHash} and used_at is null and expires_at > now()
       returning id, email, terms_version`;
    if (!link) return null;
    let [user] = await tx<{ id: string; terms_accepted_at: Date | null }[]>`
      select id, terms_accepted_at from users where email = ${link.email}`;
    let created = false;
    if (!user) {
      if (!link.terms_version) return { error: "conditions" as const };
      [user] = await tx<{ id: string; terms_accepted_at: Date | null }[]>`
        insert into users (email, terms_version, terms_accepted_at)
        values (${link.email}, ${link.terms_version}, now())
        returning id, terms_accepted_at`;
      created = true;
    }
    const sessionToken = randomToken(32);
    const [session] = await tx<{ id: string }[]>`
      insert into sessions (user_id, token_hash, expires_at, user_agent, ip_hash)
      values (${user.id}, ${keyedHash(`session:${sessionToken}`)}, now() + ${`${SESSION_DAYS} days`}::interval,
              ${userAgent?.slice(0, 200) ?? null}, ${keyedHash(`ip:${ip}`).slice(0, 16)})
      returning id`;
    return { userId: user.id, sessionId: session.id, sessionToken, created };
  });
  if (result && !("error" in result)) {
    await audit(result.userId, result.created ? "compte_cree" : "connexion", { ip, userAgent, targetType: "session", targetId: result.sessionId });
  }
  return result;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

// ───────────── Session courante ─────────────

export const LOCK_MINUTES = Number(process.env.LOCK_MINUTES ?? 20);

/**
 * Lit la session. Si aucune activité n'a eu lieu depuis LOCK_MINUTES, la session est
 * VERROUILLÉE côté serveur : il faut une vérification (passkey ou code) pour continuer.
 */
export async function getSession(): Promise<{ user: User; session: Session } | null> {
  if (!env.databaseUrl || !env.sessionSecret) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const rows = await sql()<(User & { s_id: string; s_created_at: Date; elevated_until: Date | null; elevated_method: string | null; locked_at: Date | null })[]>`
    with prev as (
      select id, last_seen_at, locked_at from sessions
       where token_hash = ${keyedHash(`session:${token}`)}
         and revoked_at is null and expires_at > now()
         and last_seen_at > now() - ${`${SESSION_IDLE_DAYS} days`}::interval
    )
    update sessions s
       set last_seen_at = now(),
           locked_at = coalesce(prev.locked_at, case when prev.last_seen_at < now() - ${`${LOCK_MINUTES} minutes`}::interval then now() end),
           elevated_until = case when prev.last_seen_at < now() - ${`${LOCK_MINUTES} minutes`}::interval then null else s.elevated_until end
      from prev, users u
     where s.id = prev.id and u.id = s.user_id
    returning u.id, u.email, u.display_name, u.plan, u.retention_days, u.reminders_enabled, u.ai_consent_at, u.created_at,
              s.id as s_id, s.created_at as s_created_at, s.elevated_until, s.elevated_method, s.locked_at`;
  const r = rows[0];
  if (!r) return null;
  return {
    user: {
      id: r.id,
      email: r.email,
      display_name: r.display_name,
      plan: r.plan,
      retention_days: r.retention_days,
      reminders_enabled: r.reminders_enabled,
      ai_consent_at: r.ai_consent_at,
      created_at: r.created_at,
    },
    session: {
      id: r.s_id,
      user_id: r.id,
      elevated_until: r.elevated_until,
      elevated_method: r.elevated_method,
      created_at: r.s_created_at,
      locked: Boolean(r.locked_at),
    },
  };
}

/** Session active et déverrouillée. `allowLocked` sert uniquement aux écrans de déverrouillage. */
export async function requireSession(opts: { allowLocked?: boolean } = {}) {
  const s = await getSession();
  if (!s) throw unauthorized();
  if (s.session.locked && !opts.allowLocked) {
    throw new HttpError(423, "verrouille", "Votre session a été verrouillée après une période d'inactivité. Confirmez votre identité pour continuer.");
  }
  return s;
}

/** Verrouille immédiatement la session (bouton « Verrouiller » ou minuterie d'inactivité du navigateur). */
export async function lockNow(sessionId: string) {
  await sql()`update sessions set locked_at = now(), elevated_until = null where id = ${sessionId}`;
}

export function isElevated(session: Session): boolean {
  return Boolean(session.elevated_until && new Date(session.elevated_until).getTime() > Date.now());
}

/** Exige une vérification renforcée récente (passkey ou code) pour les actions sensibles. */
export async function requireElevated() {
  const s = await requireSession();
  if (!isElevated(s.session)) {
    throw new HttpError(403, "verification_requise", "Pour votre sécurité, confirmez votre identité pour ouvrir le coffre-fort.");
  }
  return s;
}

export async function elevateSession(sessionId: string, userId: string, method: "passkey" | "email" | "recovery" | "recovery_delay") {
  await sql()`
    update sessions set elevated_until = now() + ${`${ELEVATION_MINUTES} minutes`}::interval, elevated_method = ${method}, locked_at = null
     where id = ${sessionId} and user_id = ${userId}`;
  const h = await headers();
  await audit(userId, "coffre_ouvert", { targetType: "session", targetId: sessionId, meta: { methode: method }, userAgent: h.get("user-agent") });
}

/** Referme le coffre sans verrouiller toute la session. */
export async function closeVault(sessionId: string) {
  await sql()`update sessions set elevated_until = null, elevated_method = null where id = ${sessionId}`;
}

export async function revokeSession(userId: string, sessionId: string) {
  await sql()`update sessions set revoked_at = now(), elevated_until = null where id = ${sessionId} and user_id = ${userId}`;
}

export async function userHasPasskey(userId: string): Promise<boolean> {
  const [r] = await sql()<{ n: number }[]>`select count(*)::int as n from webauthn_credentials where user_id = ${userId}`;
  return r.n > 0;
}
