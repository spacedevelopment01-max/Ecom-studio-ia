import "server-only";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { sql } from "./db";
import { sha256 } from "./crypto";
import { HttpError, notFound } from "./http";
import { DOCUMENT_RULES, type ParcoursId } from "./plans";
import { deleteFiles, getDecrypted, putEncrypted } from "./storage";
import { analyzeDocument, AiError, type InputFile } from "./ai/provider";
import { sanitizeAnalysis } from "./ai/sanitize";
import { PROMPT_VERSION } from "./ai/prompts";
import { commitCredit, releaseCredit, reserveCredit } from "./quota";
import { parisDate } from "./time";
import { audit } from "./audit";
import { env } from "./env";
import type { Analysis } from "./ai/schema";

export type DocumentRow = {
  id: string;
  user_id: string;
  folder_id: string | null;
  created_at: Date;
  updated_at: Date;
  title: string;
  parcours: ParcoursId;
  status: "uploaded" | "analyzing" | "analyzed" | "failed";
  user_status: "a_traiter" | "en_attente" | "traite" | "envoye";
  page_count: number;
  sensitive: boolean;
  organism: string | null;
  doc_type: string | null;
  urgency: "vert" | "orange" | "rouge" | null;
  deadline: string | null;
  deadline_kind: "ecrite" | "calculee" | "aucune" | null;
  summary: string | null;
  error_code: string | null;
  kind: "courrier" | "piece";
  piece_type: string | null;
  piece_label: string | null;
};

export type FileRow = { id: string; position: number; mime: string; size_bytes: number; page_count: number; storage_key: string };

/** Toute lecture passe par user_id : un compte ne peut jamais atteindre le document d'un autre. */
export async function getDocument(userId: string, id: string): Promise<DocumentRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const [doc] = await sql()<DocumentRow[]>`
    select id, user_id, folder_id, created_at, updated_at, title, parcours, kind, status, user_status, page_count, sensitive,
           piece_type, piece_label, organism, doc_type, urgency, to_char(deadline, 'YYYY-MM-DD') as deadline, deadline_kind, summary, error_code
      from documents where id = ${id} and user_id = ${userId}`;
  if (!doc) throw notFound();
  return doc;
}

export async function listFiles(userId: string, documentId: string): Promise<FileRow[]> {
  return sql()<FileRow[]>`
    select id, position, mime, size_bytes, page_count, storage_key from document_files
     where document_id = ${documentId} and user_id = ${userId} order by position`;
}

export async function latestAnalysis(userId: string, documentId: string): Promise<{ result: Analysis; created_at: Date; provider: string } | null> {
  const [row] = await sql()<{ result: Analysis; created_at: Date; provider: string }[]>`
    select result, created_at, provider from analyses where document_id = ${documentId} and user_id = ${userId}
     order by created_at desc limit 1`;
  return row ?? null;
}

export async function createDocument(userId: string, parcours: ParcoursId, title?: string, kind: "courrier" | "piece" = "courrier") {
  const [doc] = await sql()<{ id: string }[]>`
    insert into documents (user_id, parcours, title, kind)
    values (${userId}, ${parcours}, ${title?.trim().slice(0, 120) || (kind === "piece" ? "Pièce à ranger" : "Nouveau document")}, ${kind})
    returning id`;
  return doc.id;
}

/** Identifie le vrai type du fichier à partir de ses premiers octets (on ne se fie pas au nom). */
export function sniffMime(buf: Buffer): (typeof DOCUMENT_RULES.mimes)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

export async function pdfPageCount(buf: Buffer): Promise<number> {
  try {
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
    return pdf.getPageCount();
  } catch {
    throw new HttpError(400, "pdf_illisible", "Ce PDF ne peut pas être ouvert (il est peut-être protégé par un mot de passe ou endommagé).");
  }
}

export async function addFile(userId: string, documentId: string, buf: Buffer) {
  const doc = await getDocument(userId, documentId);
  if (doc.status === "analyzing" || doc.status === "analyzed") {
    throw new HttpError(409, "deja_analyse", "Ce document est déjà analysé. Créez un nouveau document pour ajouter d'autres pages.");
  }
  if (buf.length > DOCUMENT_RULES.maxFileBytes) {
    throw new HttpError(413, "trop_lourd", "Ce fichier dépasse 4 Mo. Pour un PDF lourd, prenez plutôt les pages en photo.");
  }
  const mime = sniffMime(buf);
  if (!mime) throw new HttpError(415, "format", "Format non accepté. Utilisez une photo (JPEG, PNG, WebP) ou un PDF.");
  const pages = mime === "application/pdf" ? await pdfPageCount(buf) : 1;

  const files = await listFiles(userId, documentId);
  const totalBytes = files.reduce((s, f) => s + f.size_bytes, 0) + buf.length;
  const totalPages = files.reduce((s, f) => s + f.page_count, 0) + pages;
  if (files.length >= DOCUMENT_RULES.maxFiles || totalPages > DOCUMENT_RULES.maxPages) {
    throw new HttpError(400, "trop_de_pages", `Un document compte au maximum ${DOCUMENT_RULES.maxPages} pages. Pour un courrier plus long, créez un second document.`);
  }
  if (totalBytes > DOCUMENT_RULES.maxTotalBytes) throw new HttpError(413, "trop_lourd", "L'ensemble des pages dépasse 20 Mo.");

  const fileId = randomUUID();
  const key = `${userId}/${documentId}/${fileId}`;
  await putEncrypted(key, buf);
  await sql()`
    insert into document_files (id, document_id, user_id, position, storage_key, mime, size_bytes, sha256, page_count)
    values (${fileId}, ${documentId}, ${userId}, ${files.length}, ${key}, ${mime}, ${buf.length}, ${sha256(buf)}, ${pages})`;
  await sql()`update documents set page_count = ${totalPages}, updated_at = now() where id = ${documentId} and user_id = ${userId}`;
  return { id: fileId, mime, pages, position: files.length };
}

export async function removeFile(userId: string, documentId: string, fileId: string) {
  const doc = await getDocument(userId, documentId);
  if (doc.status === "analyzing" || doc.status === "analyzed") throw new HttpError(409, "deja_analyse", "Les pages d'un document analysé ne peuvent plus être modifiées.");
  const [f] = await sql()<{ storage_key: string }[]>`
    delete from document_files where id = ${fileId} and document_id = ${documentId} and user_id = ${userId} returning storage_key`;
  if (!f) throw notFound();
  await deleteFiles([f.storage_key]);
  await renumber(userId, documentId);
}

export async function reorderFiles(userId: string, documentId: string, order: string[]) {
  await getDocument(userId, documentId);
  await sql().begin(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx`update document_files set position = ${i} where id = ${order[i]} and document_id = ${documentId} and user_id = ${userId}`;
    }
  });
  await renumber(userId, documentId);
}

async function renumber(userId: string, documentId: string) {
  const files = await listFiles(userId, documentId);
  await sql().begin(async (tx) => {
    for (let i = 0; i < files.length; i++) await tx`update document_files set position = ${i} where id = ${files[i].id}`;
    await tx`update documents set page_count = ${files.reduce((s, f) => s + f.page_count, 0)}, updated_at = now() where id = ${documentId} and user_id = ${userId}`;
  });
}

export async function loadInputFiles(userId: string, documentId: string): Promise<InputFile[]> {
  const files = await listFiles(userId, documentId);
  return Promise.all(files.map(async (f) => ({ mime: f.mime, data: await getDecrypted(f.storage_key) })));
}

/**
 * Lance l'analyse. Étapes :
 * 1. passage atomique du document à « analyzing » (empêche deux analyses simultanées) ;
 * 2. réservation atomique d'un crédit (sauf mode démonstration, qui n'en consomme jamais) ;
 * 3. appel à l'IA, validation du JSON et règles de prudence ;
 * 4. succès → crédit consommé ; échec → crédit libéré, document « failed », réessai possible.
 */
export async function runAnalysis(userId: string, documentId: string) {
  const claimed = await sql()<{ id: string; parcours: ParcoursId; page_count: number }[]>`
    update documents set status = 'analyzing', error_code = null, updated_at = now()
     where id = ${documentId} and user_id = ${userId} and status in ('uploaded', 'failed') and page_count > 0
    returning id, parcours, page_count`;
  if (!claimed[0]) {
    const doc = await getDocument(userId, documentId);
    if (doc.page_count === 0) throw new HttpError(400, "sans_page", "Ajoutez au moins une page avant de lancer l'analyse.");
    throw new HttpError(409, "en_cours", doc.status === "analyzed" ? "Ce document est déjà analysé." : "L'analyse est déjà en cours.");
  }
  const { parcours, page_count } = claimed[0];
  const usesCredit = !env.demoMode;

  if (usesCredit) {
    try {
      await reserveCredit(userId, "document", documentId);
    } catch (e) {
      await sql()`update documents set status = 'uploaded' where id = ${documentId} and user_id = ${userId}`;
      throw e;
    }
  }

  try {
    const files = await loadInputFiles(userId, documentId);
    const today = parisDate();
    const { data, meta } = await analyzeDocument(files, parcours, page_count, today);
    const result = sanitizeAnalysis(data, page_count, today);
    await sql().begin(async (tx) => {
      await tx`
        insert into analyses (document_id, user_id, provider, model, prompt_version, result, input_tokens, output_tokens)
        values (${documentId}, ${userId}, ${meta.provider}, ${meta.model}, ${PROMPT_VERSION}, ${tx.json(result as never)}, ${meta.inputTokens}, ${meta.outputTokens})`;
      await tx`
        update documents set status = 'analyzed', title = ${result.titre_court.slice(0, 120) || "Document"},
               organism = ${result.organisme.nom}, doc_type = ${result.type_document.slice(0, 120)},
               urgency = ${result.urgence.niveau}, deadline = ${result.date_limite.date}, deadline_kind = ${result.date_limite.nature},
               summary = ${result.resume_simple.slice(0, 600)}, updated_at = now()
         where id = ${documentId} and user_id = ${userId}`;
      if (result.date_limite.date) {
        // Échéance proposée, NON confirmée : aucun rappel tant que l'utilisateur ne l'a pas validée.
        await tx`
          insert into deadlines (user_id, document_id, label, due_date, source, source_quote)
          values (${userId}, ${documentId}, ${result.date_limite.libelle ?? result.titre_court}, ${result.date_limite.date},
                  ${result.date_limite.nature === "ecrite" ? "document" : "calculee"}, ${result.date_limite.source?.citation.slice(0, 300) ?? null})`;
      }
    });
    if (usesCredit) await commitCredit("document", documentId, userId);
    // Le courrier analysé est aussi rangé dans le coffre (sauf si l'utilisateur l'a déjà classé lui-même).
    const [cls] = await sql()<{ classified_by: string | null }[]>`select classified_by from documents where id = ${documentId}`;
    if (cls?.classified_by !== "utilisateur" && result.classement) {
      const { applyClassification } = await import("./vault");
      await applyClassification(userId, documentId, result.classement, usesCredit ? "ia" : "demonstration");
    }
    await audit(userId, "document_analyse", { targetType: "document", targetId: documentId, meta: { pages: page_count, demo: !usesCredit } });
    return result;
  } catch (e) {
    if (usesCredit) await releaseCredit("document", documentId, userId);
    const code = e instanceof AiError ? e.code : "erreur";
    await sql()`update documents set status = 'failed', error_code = ${code}, updated_at = now() where id = ${documentId} and user_id = ${userId}`;
    throw e instanceof AiError ? new HttpError(502, `analyse_${e.code}`, `${e.message} Aucun crédit n'a été utilisé.`) : e;
  }
}

/** Suppression complète : fichiers dans le stockage PUIS lignes en base (analyses, échanges…). */
export async function deleteDocument(userId: string, documentId: string) {
  await getDocument(userId, documentId);
  const files = await listFiles(userId, documentId);
  await deleteFiles(files.map((f) => f.storage_key));
  await sql()`delete from documents where id = ${documentId} and user_id = ${userId}`;
  await audit(userId, "document_supprime", { targetType: "document", targetId: documentId });
}
