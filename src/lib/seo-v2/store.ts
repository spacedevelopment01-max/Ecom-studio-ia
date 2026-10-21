import { strategyContentVisible, strategyVisibilitySql } from "../marketing-strategy/visibility";
import { strategyContent, strategyStamp } from "../strategy-consumption";
/**
 * Documents texte V2 : versions (chaque enregistrement est une version ; restaurer recopie une ancienne version,
 * rien n'est perdu), lignée stable par page, protection des modifications du client (une régénération du moteur
 * n'écrase jamais une version du client), mémoire des rédactions (idempotence : même brief, mêmes faits → rien
 * n'est refait ni repayé).
 */
import crypto from "node:crypto";
import { all, id, json, now, one, run, tx } from "../db";
import type { ContentDoc, ContentLang, ContentType } from "./types";
import { checkRequirements, requirementsOf } from "./requirements";
import { HttpError } from "../auth";
import { L } from "../i18n-server";

export type ContentVersion = { id: string; docKey: string; version: number; type: ContentType; lang: ContentLang; title: string; source: ContentDoc["meta2"]["source"]; verdict: string | null; note: string; createdAt: number };

/** Lignée stable d'un contenu (projet × type × page × langue). */
export const contentKey = (projectId: string, type: ContentType, pageKey: string, lang: ContentLang) => `cnt:${crypto.createHash("sha256").update(`${projectId}|${type}|${pageKey}|${lang}`).digest("hex").slice(0, 20)}`;

const row = (r: any): ContentVersion => ({ id: r.id, docKey: r.doc_key, version: r.version, type: r.type, lang: r.lang, title: r.title, source: r.source, verdict: r.verdict, note: r.note, createdAt: r.created_at });

export class ContentConflict extends HttpError {
  constructor(_reason?: string) { super(409, L("Le texte a changé depuis son ouverture. Votre version enregistrée est conservée ; rechargez avant de modifier.", "The content changed since it was opened. The saved version is kept; reload before editing.")); }
}

export function lockContentTarget(projectId: string, target: string, owner: string, jobId: string | null) {
  return tx(() => {
    run("DELETE FROM content_target_locks WHERE project_id=? AND target=? AND expires_at<? AND (job_id IS NULL OR NOT EXISTS (SELECT 1 FROM jobs WHERE id=job_id AND status IN ('running','paused'))) AND NOT EXISTS (SELECT 1 FROM ai_reservations WHERE job_id=content_target_locks.job_id AND status='held')", projectId, target, now());
    return run("INSERT OR IGNORE INTO content_target_locks (project_id,target,owner,job_id,expires_at) VALUES (?,?,?,?,?)", projectId, target, owner, jobId, now() + 15 * 60_000).changes === 1;
  });
}
export function releaseContentTarget(projectId: string, target: string, owner: string) {
  run("DELETE FROM content_target_locks WHERE project_id=? AND target=? AND owner=?", projectId, target, owner);
}
export function renewContentTarget(projectId: string, target: string, owner: string) {
  run("UPDATE content_target_locks SET expires_at=? WHERE project_id=? AND target=? AND owner=?", now() + 15 * 60_000, projectId, target, owner);
}
export function saveContentVersion(projectId: string, docKey: string, doc: ContentDoc, o: { strategyStamp?: import("../strategy-consumption").StrategyStamp | null; note?: string; verdict?: string | null; expectedVersion?: number } = {}): ContentVersion {
  const previous = doc.meta2.source === "user" ? one<{doc_json:string}>(`SELECT doc_json FROM content_documents WHERE project_id=? AND doc_key=? AND ${strategyVisibilitySql(projectId,"seo","content_documents.id")} ORDER BY version DESC LIMIT 1`, projectId, docKey) : null;
  const preserved = previous ? json<{meta2:{marketingStrategy?: import("../strategy-consumption").StrategyStamp | null}}>(previous.doc_json, { meta2: {} }).meta2.marketingStrategy ?? null : null;
  const strategy = o.strategyStamp !== undefined ? o.strategyStamp : doc.meta2.source === "user" ? preserved : strategyStamp(projectId);
  const { marketingStrategy: _untrustedStamp, ...meta } = doc.meta2;
  doc = { ...doc, meta2: { ...meta, ...(strategy ? { marketingStrategy: strategy } : {}) } };
  if (doc.meta2.contract) doc = { ...doc, meta2: { ...doc.meta2, contract: { ...doc.meta2.contract, checks: checkRequirements(doc, requirementsOf(doc.meta2.contract.request)) } } };
  return tx(() => {
  const version = (one<{ v: number }>("SELECT MAX(version) v FROM content_documents WHERE doc_key = ?", docKey)?.v ?? 0) + 1;
  if (o.expectedVersion != null && (latestContent(projectId,docKey)?.version.version??0) !== o.expectedVersion) throw new ContentConflict("content_conflict");
  const vid = id();
  const at = now();
  run(
    "INSERT INTO content_documents (id, project_id, doc_key, version, type, lang, title, source, verdict, note, doc_json, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    vid, projectId, docKey, version, doc.type, doc.lang, doc.page.title.slice(0, 200), doc.meta2.source, o.verdict ?? null, (o.note ?? "").slice(0, 200), JSON.stringify(doc), at,
  );
  strategyContent(projectId, "seo", vid, { stamp: strategy, protected: doc.meta2.source === "user" });
  return { id: vid, docKey, version, type: doc.type, lang: doc.lang, title: doc.page.title, source: doc.meta2.source, verdict: o.verdict ?? null, note: o.note ?? "", createdAt: at };
  });
}

/** Référence livrable : une tentative bloquée n'efface pas le dernier texte utilisable de sa lignée. */
export function usableContent(projectId: string, docKey: string) {
  const versions = listContentVersions(projectId, docKey);
  const v = versions.filter(v=>strategyContentVisible(projectId,"seo",v.id)).find((v) => v.verdict !== "REJECTED" && v.verdict !== "RETRY");
  return v ? { version: v, doc: contentVersionDoc(projectId, docKey, v.version)! } : null;
}

export function latestContent(projectId: string, docKey: string): { doc: ContentDoc; version: ContentVersion } | null {
  const r = one<any>(`SELECT * FROM content_documents WHERE project_id = ? AND doc_key = ? AND ${strategyVisibilitySql(projectId,"seo","content_documents.id")} ORDER BY version DESC LIMIT 1`, projectId, docKey);
  return r ? { doc: json<ContentDoc>(r.doc_json, null as never), version: row(r) } : null;
}

export function contentVersionDoc(projectId: string, docKey: string, version: number): ContentDoc | null {
  const r = one<{ doc_json: string }>("SELECT doc_json FROM content_documents WHERE project_id = ? AND doc_key = ? AND version = ?", projectId, docKey, version);
  return r ? json<ContentDoc>(r.doc_json, null as never) : null;
}

export function listContentVersions(projectId: string, docKey: string): ContentVersion[] {
  return all<any>("SELECT id, doc_key, version, type, lang, title, source, verdict, note, created_at FROM content_documents WHERE project_id = ? AND doc_key = ? ORDER BY version DESC", projectId, docKey).map(row);
}

/** Dernière version de chaque contenu du projet (filtrable par type). */
export function listContents(projectId: string, types?: ContentType[]): ContentVersion[] {
  const rows = all<any>(
    `SELECT d.id, d.doc_key, d.version, d.type, d.lang, d.title, d.source, d.verdict, d.note, d.created_at FROM content_documents d JOIN (SELECT doc_key, MAX(version) v FROM content_documents WHERE project_id = ? AND ${strategyVisibilitySql(projectId,"seo","content_documents.id")} GROUP BY doc_key) m ON m.doc_key = d.doc_key AND m.v = d.version WHERE d.project_id = ? ORDER BY d.created_at DESC`,
    projectId,
    projectId,
  ).map(row);
  return types?.length ? rows.filter((r) => types.includes(r.type)) : rows;
}

/** Le client a-t-il modifié ce contenu ? (Une régénération ne doit alors jamais l'écraser.) */
export function contentUserOwned(projectId: string, docKey: string): boolean {
  return !!one("SELECT 1 FROM content_documents WHERE project_id = ? AND doc_key = ? AND source IN ('user','ai_local','ai')", projectId, docKey);
}

export function restoreContentVersion(projectId: string, docKey: string, version: number): ContentVersion {
  const doc = contentVersionDoc(projectId, docKey, version);
  if (!doc) throw new Error("version introuvable");
  return saveContentVersion(projectId, docKey, { ...doc, meta2: { ...doc.meta2, source: "user" } }, { note: `restauration de la version ${version}`, strategyStamp: doc.meta2.marketingStrategy ?? null });
}

// ---------------------------------------------------------------- mémoire des rédactions (idempotence)

export const runKey = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);

export function contentRun(projectId: string, key: string): { docKey: string; version: number; verdict: string; costMicro: number } | null {
  const r = one<any>("SELECT * FROM content_runs WHERE project_id = ? AND run_key = ?", projectId, key);
  if (!r) return null;
  // Version disparue (projet nettoyé) : la mémoire ne vaut plus rien.
  if (!contentVersionDoc(projectId, r.doc_key, r.version)) return null;
  return { docKey: r.doc_key, version: r.version, verdict: r.verdict, costMicro: r.cost_micro };
}

export function rememberContentRun(projectId: string, key: string, m: { docKey: string; version: number; verdict: string; costMicro: number }) {
  run(
    "INSERT INTO content_runs (project_id, run_key, doc_key, version, verdict, cost_micro, created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(project_id, run_key) DO UPDATE SET doc_key = excluded.doc_key, version = excluded.version, verdict = excluded.verdict, cost_micro = excluded.cost_micro",
    projectId, key, m.docKey, m.version, m.verdict, m.costMicro, now(),
  );
}
