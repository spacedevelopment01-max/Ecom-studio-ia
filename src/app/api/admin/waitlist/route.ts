import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { L } from "@/lib/i18n-server";
import { adminWaitlist, importSignups, NOTIFY_KEY, parseCsv, processWaitlistOutbox, retryNotification, rotateIngestSecret } from "@/lib/waitlist";

/** Administration › Liste d'attente (#420) : réservée aux administrateurs (403 sinon). */
export const GET = handle(async () => {
  await requireAdmin();
  return ok(adminWaitlist());
});

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry"), id: z.string().min(1).max(64) }),
  z.object({ action: z.literal("retry-failed") }),
  z.object({ action: z.literal("notify-to"), email: z.string().trim().max(254).nullable() }),
  z.object({ action: z.literal("rotate-secret") }),
  z.object({ action: z.literal("import"), format: z.enum(["csv", "json"]), text: z.string().min(1).max(4 * 1048576) }),
]);

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, Body);
  if (b.action === "retry") {
    if (!retryNotification(b.id)) throw new HttpError(409, L("Aucune notification à retenter pour cette inscription.", "No notification to retry for this signup."));
    await processWaitlistOutbox();
    return ok(adminWaitlist());
  }
  if (b.action === "retry-failed") {
    for (const s of adminWaitlist(5000).signups.filter((x) => x.notify.status === "failed")) retryNotification(s.id);
    await processWaitlistOutbox({ limit: 100 });
    return ok(adminWaitlist());
  }
  if (b.action === "notify-to") {
    if (b.email && !EMAIL.test(b.email)) throw new HttpError(400, L("Adresse de notification invalide.", "Invalid notification address."));
    setSetting(NOTIFY_KEY, b.email || null);
    return ok(adminWaitlist());
  }
  if (b.action === "rotate-secret") {
    // Affiché une seule fois, pour être copié dans les secrets du serveur du site ; jamais relu ensuite.
    const secret = rotateIngestSecret();
    return ok({ ...adminWaitlist(), newSecret: secret });
  }
  let rows: unknown[];
  try { rows = b.format === "csv" ? parseCsv(b.text) : (JSON.parse(b.text) as unknown[]); } catch { throw new HttpError(400, L("Fichier illisible.", "Unreadable file.")); }
  if (!Array.isArray(rows) || !rows.length) throw new HttpError(400, L("Aucune inscription trouvée dans le fichier.", "No signup found in the file."));
  if (rows.length > 5000) throw new HttpError(413, L("5 000 inscriptions au plus par import.", "At most 5,000 signups per import."));
  const result = importSignups(rows);
  return ok({ ...adminWaitlist(), import: result });
});
