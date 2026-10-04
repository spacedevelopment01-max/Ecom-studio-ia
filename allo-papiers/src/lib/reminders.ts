import "server-only";
import { sql } from "./db";
import { env } from "./env";
import { sendMail } from "./mail";
import { daysBetween, formatFrDate, parisDate } from "./time";
import { deleteDocument } from "./documents";
import { retryPendingDeletions } from "./storage";

/**
 * Envoi des rappels du jour (Europe/Paris). Règles :
 * - uniquement les échéances CONFIRMÉES par l'utilisateur et actives ;
 * - uniquement si les rappels sont activés sur le compte ;
 * - un rappel n'est jamais envoyé deux fois (clé unique échéance + jour + date).
 */
export async function sendDueReminders(now = new Date()) {
  const today = parisDate(now);
  const rows = await sql()<{ id: string; label: string; due: string; remind_days: number[]; email: string; document_id: string | null; folder_id: string | null }[]>`
    select d.id, d.label, to_char(d.due_date, 'YYYY-MM-DD') as due, d.remind_days, u.email, d.document_id, d.folder_id
      from deadlines d join users u on u.id = d.user_id
     where d.confirmed_at is not null and d.enabled and u.reminders_enabled
       and d.due_date >= ${today}::date and d.due_date <= ${today}::date + 31`;
  let sent = 0;
  for (const r of rows) {
    const days = daysBetween(today, r.due);
    if (!r.remind_days.includes(days)) continue;
    const claim = await sql()`
      insert into reminder_sends (deadline_id, days_before, due_date) values (${r.id}, ${days}, ${r.due})
      on conflict do nothing returning deadline_id`;
    if (claim.length === 0) continue;
    const link = r.document_id ? `${env.appUrl}/documents/${r.document_id}` : r.folder_id ? `${env.appUrl}/dossiers/${r.folder_id}` : `${env.appUrl}/rappels`;
    try {
      await sendMail({
        to: r.email,
        subject: days === 0 ? `Aujourd'hui : ${r.label}` : `Rappel : ${r.label} — dans ${days} jour${days > 1 ? "s" : ""}`,
        text: `Bonjour,

Petit rappel : « ${r.label} » — échéance ${days === 0 ? "aujourd'hui" : `le ${formatFrDate(r.due)}`}.

Vous avez confirmé cette date dans Allô Papiers. Pour la revoir ou modifier vos rappels :
${link}

Pour ne plus recevoir de rappels, désactivez-les dans votre compte : ${env.appUrl}/rappels`,
      });
      sent++;
    } catch {
      // En cas d'échec, on libère pour réessayer au prochain passage.
      await sql()`delete from reminder_sends where deadline_id = ${r.id} and days_before = ${days} and due_date = ${r.due}`;
    }
  }
  return { checked: rows.length, sent };
}

/** Purge selon la durée de conservation choisie par chaque utilisateur, et nettoyage technique. */
export async function runMaintenance() {
  const expired = await sql()<{ id: string; user_id: string }[]>`
    select d.id, d.user_id from documents d join users u on u.id = d.user_id
     where u.retention_days is not null and d.created_at < now() - make_interval(days => u.retention_days)
     limit 200`;
  for (const d of expired) await deleteDocument(d.user_id, d.id);
  const retried = await retryPendingDeletions();
  await sql()`delete from magic_links where expires_at < now() - interval '1 day'`;
  await sql()`delete from webauthn_challenges where expires_at < now() - interval '1 day'`;
  await sql()`delete from email_codes where expires_at < now() - interval '1 day'`;
  await sql()`delete from rate_limits where window_start < now() - interval '2 days'`;
  await sql()`delete from sessions where expires_at < now() - interval '7 days' or revoked_at < now() - interval '30 days'`;
  await sql()`delete from audit_events where at < now() - interval '13 months'`;
  return { documentsPurged: expired.length, storageRetried: retried };
}
