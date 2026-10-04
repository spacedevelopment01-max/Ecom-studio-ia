import "server-only";
import { sql } from "./db";
import { keyedHash } from "./crypto";

/**
 * Journal des accès sensibles. On n'y écrit QUE l'action et l'identifiant concerné :
 * jamais le texte d'un document, d'une analyse ou d'un courrier.
 */
export async function audit(
  userId: string | null,
  action: string,
  opts: { targetType?: string; targetId?: string; ip?: string; userAgent?: string | null; meta?: Record<string, string | number | boolean> } = {},
) {
  try {
    await sql()`
      insert into audit_events (user_id, action, target_type, target_id, ip_hash, user_agent, meta)
      values (${userId}, ${action}, ${opts.targetType ?? null}, ${opts.targetId ?? null},
              ${opts.ip ? keyedHash(`ip:${opts.ip}`).slice(0, 16) : null},
              ${opts.userAgent ? opts.userAgent.slice(0, 120) : null}, ${sql().json(opts.meta ?? {})})`;
  } catch (e) {
    console.error("[audit] échec d'écriture", e instanceof Error ? e.name : "");
  }
}
