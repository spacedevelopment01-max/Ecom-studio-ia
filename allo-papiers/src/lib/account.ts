import "server-only";
import { sql } from "./db";
import { deleteFiles } from "./storage";
import { audit } from "./audit";
import { sendMail } from "./mail";
import type { User } from "./auth";

/**
 * Suppression définitive du compte :
 * 1. résiliation immédiate d'un abonnement en cours (pas de prélèvement futur) ;
 * 2. suppression des fichiers dans le stockage (pas seulement des lignes en base) ;
 * 3. suppression en cascade de toutes les données du compte.
 * Les factures restent chez Stripe (obligations comptables) ; les sauvegardes du
 * fournisseur de base de données expirent selon leur propre cycle.
 */
export async function deleteAccount(user: User) {
  const [sub] = await sql()<{ stripe_subscription_id: string | null; status: string }[]>`
    select stripe_subscription_id, status from subscriptions where user_id = ${user.id}`;
  if (sub?.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(sub.status)) {
    const { stripe } = await import("./billing");
    await stripe().subscriptions.cancel(sub.stripe_subscription_id);
  }
  const files = await sql()<{ storage_key: string }[]>`select storage_key from document_files where user_id = ${user.id}`;
  await deleteFiles(files.map((f) => f.storage_key));
  await audit(null, "compte_supprime", { meta: { fichiers: files.length } });
  await sql()`delete from users where id = ${user.id}`;
  await sendMail({
    to: user.email,
    subject: "Votre compte Allô Papiers a été supprimé",
    text: "Votre compte et vos documents ont été supprimés. Si vous n'êtes pas à l'origine de cette suppression, contactez-nous en répondant à ce message.",
  }).catch(() => {});
}

/** Export des données du compte (droit d'accès et de portabilité) — sans les fichiers originaux. */
export async function exportAccount(userId: string) {
  const db = sql();
  const [user] = await db`select id, email, created_at, plan, retention_days, reminders_enabled, terms_version, terms_accepted_at, ai_consent_at from users where id = ${userId}`;
  return {
    exporte_le: new Date().toISOString(),
    compte: user,
    documents: await db`select id, created_at, title, parcours, status, user_status, page_count, organism, doc_type, urgency, deadline, summary from documents where user_id = ${userId}`,
    analyses: await db`select document_id, created_at, model, result from analyses where user_id = ${userId}`,
    discussions: await db`select document_id, role, content, created_at from chat_messages where user_id = ${userId}`,
    dossiers: await db`select * from folders where user_id = ${userId}`,
    evenements_dossiers: await db`select * from folder_events where user_id = ${userId}`,
    pieces_dossiers: await db`select * from folder_pieces where user_id = ${userId}`,
    echeances: await db`select * from deadlines where user_id = ${userId}`,
    courriers: await db`select * from letters where user_id = ${userId}`,
    fiches_rendez_vous: await db`select * from appointment_sheets where user_id = ${userId}`,
    envois: await db`select id, status, provider_mode, recipient, body, price_cents, validated_at, validation_statement, tracking_number, tracking_is_fictive, created_at from send_requests where user_id = ${userId}`,
    journal_acces: await db`select at, action, target_type, target_id from audit_events where user_id = ${userId} order by at desc limit 500`,
  };
}
