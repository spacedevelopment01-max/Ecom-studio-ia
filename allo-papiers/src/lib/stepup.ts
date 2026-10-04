import "server-only";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { sql } from "./db";
import { env } from "./env";
import { keyedHash, numericCode, randomToken, safeEqualHex } from "./crypto";
import { HttpError } from "./http";
import { sendMail } from "./mail";
import { audit } from "./audit";
import { elevateSession, type Session, type User } from "./auth";

const CHALLENGE_MINUTES = 5;
const EMAIL_CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
export const VAULT_RECOVERY_HOURS = 72;

function expectedOrigins(): string[] {
  const list = [env.appUrl];
  const extra = process.env.WEBAUTHN_EXTRA_ORIGINS;
  if (extra) list.push(...extra.split(",").map((s) => s.trim()).filter(Boolean));
  return list;
}

async function storeChallenge(user: User, session: Session, challenge: string, purpose: "register" | "stepup") {
  await sql()`
    insert into webauthn_challenges (user_id, session_id, challenge, purpose, expires_at)
    values (${user.id}, ${session.id}, ${challenge}, ${purpose}, now() + ${`${CHALLENGE_MINUTES} minutes`}::interval)`;
}

/** Consomme un challenge : usage unique, lié à la session et à l'usage prévu. */
async function consumeChallenge(user: User, session: Session, challenge: string, purpose: "register" | "stepup"): Promise<boolean> {
  const rows = await sql()`
    update webauthn_challenges set used_at = now()
     where challenge = ${challenge} and user_id = ${user.id} and session_id = ${session.id}
       and purpose = ${purpose} and used_at is null and expires_at > now()
    returning id`;
  return rows.length === 1;
}

/** Extrait le challenge des données client sans lui faire confiance (il est ensuite vérifié par la bibliothèque). */
function challengeFromClientData(clientDataJSON: string): string {
  try {
    const data = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8"));
    return typeof data.challenge === "string" ? data.challenge : "";
  } catch {
    return "";
  }
}

// ───────────── Enregistrement d'une passkey ─────────────

export async function passkeyRegistrationOptions(user: User, session: Session) {
  const existing = await sql()<{ id: string; transports: string[] }[]>`select id, transports from webauthn_credentials where user_id = ${user.id}`;
  const options = await generateRegistrationOptions({
    rpName: "Allô Papiers",
    rpID: env.rpId,
    userName: user.email,
    userDisplayName: user.display_name ?? user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });
  await storeChallenge(user, session, options.challenge, "register");
  return options;
}

export async function verifyPasskeyRegistration(user: User, session: Session, response: RegistrationResponseJSON, nickname: string) {
  const challenge = challengeFromClientData(response.response.clientDataJSON);
  if (!challenge || !(await consumeChallenge(user, session, challenge, "register"))) {
    throw new HttpError(400, "challenge", "La demande a expiré. Recommencez.");
  }
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigins(),
    expectedRPID: env.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified) throw new HttpError(400, "passkey_refusee", "La clé d'accès n'a pas pu être vérifiée.");
  const info = verification.registrationInfo;
  await sql()`
    insert into webauthn_credentials (id, user_id, public_key, counter, transports, device_type, backed_up, nickname)
    values (${info.credential.id}, ${user.id}, ${Buffer.from(info.credential.publicKey)}, ${info.credential.counter},
            ${info.credential.transports ?? []}, ${info.credentialDeviceType}, ${info.credentialBackedUp}, ${nickname.slice(0, 60) || "Mon appareil"})`;
  await audit(user.id, "passkey_ajoutee", { targetType: "passkey", targetId: info.credential.id.slice(0, 16) });
}

// ───────────── Vérification renforcée par passkey ─────────────

export async function passkeyStepUpOptions(user: User, session: Session) {
  const creds = await sql()<{ id: string; transports: string[] }[]>`select id, transports from webauthn_credentials where user_id = ${user.id}`;
  if (creds.length === 0) throw new HttpError(400, "aucune_passkey", "Aucune clé d'accès enregistrée sur ce compte.");
  const options = await generateAuthenticationOptions({
    rpID: env.rpId,
    allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports as never })),
    userVerification: "required",
  });
  await storeChallenge(user, session, options.challenge, "stepup");
  return options;
}

export async function verifyPasskeyStepUp(user: User, session: Session, response: AuthenticationResponseJSON) {
  const challenge = challengeFromClientData(response.response.clientDataJSON);
  if (!challenge || !(await consumeChallenge(user, session, challenge, "stepup"))) {
    throw new HttpError(400, "challenge", "La demande a expiré. Recommencez.");
  }
  // La passkey doit appartenir à CE compte : isolation stricte.
  const [cred] = await sql()<{ id: string; public_key: Buffer; counter: string; transports: string[] }[]>`
    select id, public_key, counter, transports from webauthn_credentials where id = ${response.id} and user_id = ${user.id}`;
  if (!cred) throw new HttpError(400, "passkey_inconnue", "Cette clé d'accès n'est pas reconnue pour ce compte.");
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigins(),
    expectedRPID: env.rpId,
    credential: { id: cred.id, publicKey: new Uint8Array(cred.public_key), counter: Number(cred.counter), transports: cred.transports as never },
    requireUserVerification: true,
  });
  if (!verification.verified) throw new HttpError(400, "passkey_refusee", "Vérification refusée.");
  await sql()`update webauthn_credentials set counter = ${verification.authenticationInfo.newCounter}, last_used_at = now() where id = ${cred.id}`;
  await elevateSession(session.id, user.id, "passkey");
}

// ───────────── Solution de secours : code par email ─────────────

export async function sendStepUpEmailCode(user: User, session: Session) {
  const code = numericCode();
  await sql()`update email_codes set used_at = now() where session_id = ${session.id} and used_at is null`;
  await sql()`
    insert into email_codes (user_id, session_id, code_hash, purpose, expires_at)
    values (${user.id}, ${session.id}, ${keyedHash(`code:${session.id}:${code}`)}, 'stepup', now() + ${`${EMAIL_CODE_MINUTES} minutes`}::interval)`;
  await sendMail({
    to: user.email,
    subject: `Code de vérification Allô Papiers : ${code}`,
    text: `Votre code pour ouvrir votre coffre-fort Allô Papiers : ${code}

Il est valable ${EMAIL_CODE_MINUTES} minutes. Ne le communiquez à personne : Allô Papiers ne vous le demandera jamais par téléphone.`,
  });
}

async function checkEmailCode(user: User, session: Session, code: string): Promise<boolean> {
  const [row] = await sql()<{ id: string; code_hash: string; attempts: number }[]>`
    select id, code_hash, attempts from email_codes
     where session_id = ${session.id} and user_id = ${user.id} and used_at is null and expires_at > now()
     order by created_at desc limit 1`;
  if (!row) return false;
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await sql()`update email_codes set used_at = now() where id = ${row.id}`;
    throw new HttpError(429, "trop_d_essais", "Trop d'essais. Demandez un nouveau code.");
  }
  const ok = /^\d{6}$/.test(code) && safeEqualHex(row.code_hash, keyedHash(`code:${session.id}:${code}`));
  if (ok) await sql()`update email_codes set used_at = now() where id = ${row.id}`;
  else await sql()`update email_codes set attempts = attempts + 1 where id = ${row.id}`;
  return ok;
}

/**
 * Règles de la solution de secours :
 * - sans passkey enregistrée : le code reçu par email suffit ;
 * - avec une passkey : le code email SEUL ne suffit pas. Il faut en plus un code de secours,
 *   ou une demande de récupération dont le délai de sécurité (72 h) est écoulé.
 * Ainsi, quelqu'un qui accède à votre messagerie ne peut pas ouvrir immédiatement le coffre.
 */
export async function verifyEmailStepUp(user: User, session: Session, code: string, recoveryCode?: string) {
  const [{ n: passkeys }] = await sql()<{ n: number }[]>`select count(*)::int as n from webauthn_credentials where user_id = ${user.id}`;
  const [u] = await sql()<{ vault_recovery_ready_at: Date | null }[]>`select vault_recovery_ready_at from users where id = ${user.id}`;
  const recoveryReady = Boolean(u.vault_recovery_ready_at && new Date(u.vault_recovery_ready_at).getTime() <= Date.now());

  if (passkeys > 0 && !recoveryCode && !recoveryReady) {
    throw new HttpError(403, "passkey_requise", "Ce compte est protégé par une clé d'accès. Utilisez-la, ou saisissez aussi un code de secours.");
  }
  if (!(await checkEmailCode(user, session, code))) throw new HttpError(400, "code_invalide", "Code incorrect ou expiré.");

  if (passkeys > 0 && recoveryCode) {
    const normalized = recoveryCode.replace(/[\s-]/g, "").toUpperCase();
    const used = await sql()`
      update recovery_codes set used_at = now()
       where user_id = ${user.id} and used_at is null and code_hash = ${keyedHash(`recovery:${user.id}:${normalized}`)}
      returning id`;
    if (used.length !== 1) throw new HttpError(400, "code_secours_invalide", "Code de secours incorrect ou déjà utilisé.");
    await elevateSession(session.id, user.id, "recovery");
    await audit(user.id, "code_secours_utilise");
    return;
  }
  if (passkeys > 0 && recoveryReady) {
    // Fin de la procédure de récupération : les anciennes passkeys sont révoquées.
    await sql()`delete from webauthn_credentials where user_id = ${user.id}`;
    await sql()`update users set vault_recovery_requested_at = null, vault_recovery_ready_at = null, vault_recovery_token_hash = null where id = ${user.id}`;
    await elevateSession(session.id, user.id, "recovery_delay");
    await audit(user.id, "recuperation_coffre_terminee");
    return;
  }
  await elevateSession(session.id, user.id, "email");
}

// ───────────── Codes de secours ─────────────

export async function generateRecoveryCodes(user: User): Promise<string[]> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes = Array.from({ length: 8 }, () => {
    const raw = randomToken(16);
    let out = "";
    for (let i = 0; i < 10; i++) out += alphabet[raw.charCodeAt(i) % alphabet.length];
    return out;
  });
  await sql().begin(async (tx) => {
    await tx`delete from recovery_codes where user_id = ${user.id}`;
    for (const c of codes) await tx`insert into recovery_codes (user_id, code_hash) values (${user.id}, ${keyedHash(`recovery:${user.id}:${c}`)})`;
  });
  await audit(user.id, "codes_secours_generes");
  return codes.map((c) => `${c.slice(0, 5)}-${c.slice(5)}`);
}

// ───────────── Récupération du coffre (perte de toutes les clés) ─────────────

export async function requestVaultRecovery(user: User) {
  const cancelToken = randomToken(24);
  await sql()`
    update users set vault_recovery_requested_at = now(),
                     vault_recovery_ready_at = now() + ${`${VAULT_RECOVERY_HOURS} hours`}::interval,
                     vault_recovery_token_hash = ${keyedHash(`vaultcancel:${cancelToken}`)}
     where id = ${user.id}`;
  await audit(user.id, "recuperation_coffre_demandee");
  await sendMail({
    to: user.email,
    subject: "Demande de récupération de votre coffre-fort",
    text: `Une demande de récupération de l'accès à votre coffre-fort Allô Papiers a été faite.

Par sécurité, elle ne sera utilisable que dans ${VAULT_RECOVERY_HOURS} heures. Vous pourrez alors ouvrir le coffre avec un code reçu par email, et vos anciennes clés d'accès seront supprimées.

Si ce n'est pas vous, annulez immédiatement la demande :
${env.appUrl}/compte/securite/annuler-recuperation#${cancelToken}`,
  });
}

export async function cancelVaultRecovery(token: string): Promise<boolean> {
  const rows = await sql()<{ id: string }[]>`
    update users set vault_recovery_requested_at = null, vault_recovery_ready_at = null, vault_recovery_token_hash = null
     where vault_recovery_token_hash = ${keyedHash(`vaultcancel:${token}`)}
    returning id`;
  if (rows[0]) await audit(rows[0].id, "recuperation_coffre_annulee");
  return rows.length === 1;
}
