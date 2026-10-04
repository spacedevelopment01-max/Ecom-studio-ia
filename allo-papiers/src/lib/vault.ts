import "server-only";
import { z } from "zod";
import { sql } from "./db";
import { HttpError } from "./http";
import { env } from "./env";
import { audit } from "./audit";
import { getDocument, loadInputFiles } from "./documents";
import { classifyPiece, AiError } from "./ai/provider";
import { sanitizeClassification } from "./ai/sanitize";
import type { Classification } from "./ai/schema";
import { commitCredit, releaseCredit, reserveCredit } from "./quota";
import { PIECE_TYPES, PIECE_TYPE_IDS, type PieceType } from "./pieces";
import { isIsoDate, parisDate } from "./time";

export type VaultItem = {
  id: string;
  kind: "courrier" | "piece";
  title: string;
  status: string;
  created_at: Date;
  page_count: number;
  sensitive: boolean;
  vault_category: string | null;
  piece_type: PieceType | null;
  piece_label: string | null;
  piece_period: string | null;
  piece_date: string | null;
  valid_until: string | null;
  issuer: string | null;
  classified_by: string | null;
};

/** Enregistre le classement d'un document. Une pièce sensible (identité, banque, santé…) est automatiquement protégée. */
export async function applyClassification(userId: string, documentId: string, c: Classification, by: "ia" | "utilisateur" | "demonstration") {
  const def = PIECE_TYPES[c.type_piece];
  await sql()`
    update documents set
      piece_type = ${c.type_piece}, vault_category = ${def.category}, piece_label = ${c.libelle},
      piece_period = ${c.periode}, piece_date = ${c.date_document}, valid_until = ${c.valable_jusqu_au},
      issuer = ${c.emetteur}, classified_by = ${by}, classified_at = now(),
      sensitive = sensitive or ${def.sensitive},
      title = case when kind = 'piece' then ${c.libelle} else title end,
      status = case when kind = 'piece' then 'analyzed' else status end,
      updated_at = now()
     where id = ${documentId} and user_id = ${userId}`;
}

/**
 * Rangement automatique d'une pièce par l'IA. Un échec ne consomme aucun crédit ; la pièce
 * reste conservée et peut être rangée à la main.
 */
export async function classifyDocument(userId: string, documentId: string, hint: PieceType | null) {
  const claimed = await sql()<{ id: string }[]>`
    update documents set status = 'analyzing', error_code = null, updated_at = now()
     where id = ${documentId} and user_id = ${userId} and kind = 'piece' and status in ('uploaded', 'failed', 'analyzed') and page_count > 0
    returning id`;
  if (!claimed[0]) {
    const doc = await getDocument(userId, documentId);
    if (doc.page_count === 0) throw new HttpError(400, "sans_page", "Ajoutez au moins une page.");
    throw new HttpError(409, "en_cours", "Le rangement est déjà en cours.");
  }
  const ref = crypto.randomUUID();
  const usesCredit = !env.demoMode;
  try {
    if (usesCredit) await reserveCredit(userId, "classement", ref);
  } catch (e) {
    await sql()`update documents set status = 'uploaded' where id = ${documentId} and user_id = ${userId}`;
    throw e;
  }
  try {
    const files = await loadInputFiles(userId, documentId);
    const { data, meta } = await classifyPiece(files, hint);
    const c = sanitizeClassification(data);
    await applyClassification(userId, documentId, c, meta.provider === "demo" ? "demonstration" : "ia");
    if (usesCredit) await commitCredit("classement", ref, userId);
    await audit(userId, "piece_rangee", { targetType: "document", targetId: documentId, meta: { type: c.type_piece } });
    return c;
  } catch (e) {
    if (usesCredit) await releaseCredit("classement", ref, userId);
    await sql()`update documents set status = 'failed', error_code = ${e instanceof AiError ? e.code : "erreur"} where id = ${documentId} and user_id = ${userId}`;
    throw e instanceof AiError ? new HttpError(502, `rangement_${e.code}`, `${e.message} Aucun crédit n'a été utilisé : vous pouvez choisir le type vous-même.`) : e;
  }
}

export const ManualClassification = z.object({
  type_piece: z.enum(PIECE_TYPE_IDS as [PieceType, ...PieceType[]]),
  libelle: z.string().trim().min(2).max(120),
  periode: z.string().trim().max(40).nullable().optional(),
  date_document: z.string().nullable().optional().refine((v) => !v || isIsoDate(v), "date"),
  valable_jusqu_au: z.string().nullable().optional().refine((v) => !v || isIsoDate(v), "date"),
  emetteur: z.string().trim().max(120).nullable().optional(),
});

/** Rangement ou correction à la main : toujours possible, gratuit, et prioritaire sur l'IA. */
export async function classifyManually(userId: string, documentId: string, input: z.infer<typeof ManualClassification>) {
  await getDocument(userId, documentId);
  const c = sanitizeClassification({
    type_piece: input.type_piece,
    libelle: input.libelle,
    periode: input.periode || null,
    date_document: input.date_document || null,
    valable_jusqu_au: input.valable_jusqu_au || null,
    emetteur: input.emetteur || null,
    confiance: "elevee",
  });
  await applyClassification(userId, documentId, c, "utilisateur");
  return c;
}

export async function listVault(userId: string): Promise<VaultItem[]> {
  return sql()<VaultItem[]>`
    select id, kind, title, status, created_at, page_count, sensitive, vault_category, piece_type, piece_label, piece_period,
           to_char(piece_date, 'YYYY-MM-DD') as piece_date, to_char(valid_until, 'YYYY-MM-DD') as valid_until, issuer, classified_by
      from documents
     where user_id = ${userId} and page_count > 0
     order by vault_category nulls last, piece_date desc nulls last, created_at desc`;
}

export type Need = { type: PieceType; libelle: string };
export type Suggestion = {
  need: Need;
  match: { id: string; label: string; period: string | null; date: string | null; valid_until: string | null; pages: number } | null;
  others: number;
  note: string | null;
};

/**
 * Retrouve dans le coffre la meilleure pièce pour chaque besoin : même type, encore valable
 * (si une date de validité est écrite), la plus récente. Les documents à ignorer (le courrier
 * auquel on répond, par exemple) sont exclus.
 */
export async function suggestAttachments(userId: string, needs: Need[], exclude: string[] = []): Promise<Suggestion[]> {
  if (needs.length === 0) return [];
  const types = [...new Set(needs.map((n) => n.type))];
  const rows = await sql()<(VaultItem & { pages: number })[]>`
    select id, piece_type, piece_label, title, piece_period, to_char(piece_date, 'YYYY-MM-DD') as piece_date,
           to_char(valid_until, 'YYYY-MM-DD') as valid_until, page_count as pages, created_at
      from documents
     where user_id = ${userId} and page_count > 0 and piece_type = any(${types})
     order by piece_date desc nulls last, created_at desc`;
  const today = parisDate();
  const used = new Set<string>(exclude);
  return needs.map((need) => {
    const all = rows.filter((r) => r.piece_type === need.type && !exclude.includes(r.id));
    const valid = all.filter((r) => !r.valid_until || r.valid_until >= today);
    const pick = valid.find((r) => !used.has(r.id)) ?? null;
    if (pick) used.add(pick.id);
    return {
      need,
      match: pick ? { id: pick.id, label: pick.piece_label ?? pick.title, period: pick.piece_period, date: pick.piece_date, valid_until: pick.valid_until, pages: pick.pages } : null,
      others: Math.max(0, valid.length - 1),
      note: !pick && all.length > valid.length ? "Seule une version dont la date de validité est dépassée est dans votre coffre." : null,
    };
  });
}

/** Fichiers (pages) de documents du coffre, dans l'ordre, pour les joindre à un courrier. */
export async function filesOfDocuments(userId: string, documentIds: string[]) {
  if (documentIds.length === 0) return [];
  const rows = await sql()<{ id: string; document_id: string; mime: string; position: number }[]>`
    select id, document_id, mime, position from document_files
     where user_id = ${userId} and document_id = any(${documentIds}) order by document_id, position`;
  const order = new Map(documentIds.map((d, i) => [d, i]));
  return rows.sort((a, b) => (order.get(a.document_id)! - order.get(b.document_id)!) || a.position - b.position);
}
