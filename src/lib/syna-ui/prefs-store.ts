/**
 * SINA lot 1 bis (#282) — réglages d'affichage du Studio enregistrés sur le serveur, par compte et, au choix, par projet.
 *
 * - Une ligne par compte (`project_id = ''`) et une ligne facultative par projet (exception au réglage du compte).
 * - Valeurs validées (`sanitizeSynaPrefs`) et version de schéma enregistrée : une valeur inconnue est ignorée, jamais
 *   recopiée. Aucune donnée de projet, de thème client, d'export, de budget ni d'abonnement n'est lue ou écrite ici.
 * - Table créée à la première utilisation (aucune migration des tables existantes) ; supprimée avec le compte.
 * - Sans rapport avec l'IA : fonctionne sans abonnement, pour toute personne qui a accès au Studio.
 */
import { db, one, run } from "@/lib/db";
import { sanitizeSynaPrefs, type SynaUiPrefs } from "./preferences";

export const SYNA_PREFS_SCHEMA_VERSION = 1;
const ACCOUNT = "";
let ready = false;

function ensureTable() {
  if (ready) return;
  db().exec(`CREATE TABLE IF NOT EXISTS studio_ui_prefs (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL DEFAULT '',
    prefs TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, project_id)
  )`);
  ready = true;
}

type Row = { prefs: string; version: number; updated_at: number };

function read(userId: string, projectId: string): { prefs: Partial<SynaUiPrefs>; updatedAt: number } | null {
  ensureTable();
  const r = one<Row>("SELECT prefs, version, updated_at FROM studio_ui_prefs WHERE user_id = ? AND project_id = ?", userId, projectId);
  if (!r) return null;
  let parsed: unknown = null;
  try { parsed = JSON.parse(r.prefs); } catch { parsed = null; }
  return { prefs: sanitizeSynaPrefs(parsed), updatedAt: r.updated_at };
}

export type StoredSynaPrefs = { account: Partial<SynaUiPrefs>; project: Partial<SynaUiPrefs> | null; updatedAt: number };

/** Réglages du compte et, si `projectId` est donné, l'exception de ce projet (null s'il n'en a pas). */
export function readSynaPrefs(userId: string, projectId?: string | null): StoredSynaPrefs {
  const a = read(userId, ACCOUNT);
  const p = projectId ? read(userId, projectId) : null;
  return { account: a?.prefs ?? {}, project: p ? p.prefs : null, updatedAt: Math.max(a?.updatedAt ?? 0, p?.updatedAt ?? 0) };
}

/**
 * Remplace les réglages d'une portée par `prefs` (validés). Un objet vide efface la portée : pour le compte, retour aux
 * valeurs par défaut ; pour un projet, le projet suit de nouveau le compte. L'appelant vérifie l'accès au projet.
 */
export function writeSynaPrefs(userId: string, scope: "account" | "project", projectId: string | null, prefs: unknown): Partial<SynaUiPrefs> {
  ensureTable();
  if (scope === "project" && !projectId) throw new Error("Projet requis pour une exception de projet");
  const key = scope === "account" ? ACCOUNT : (projectId as string);
  const clean = sanitizeSynaPrefs(prefs);
  if (!Object.keys(clean).length) run("DELETE FROM studio_ui_prefs WHERE user_id = ? AND project_id = ?", userId, key);
  else run(
    "INSERT INTO studio_ui_prefs (user_id, project_id, prefs, version, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, project_id) DO UPDATE SET prefs = excluded.prefs, version = excluded.version, updated_at = excluded.updated_at",
    userId, key, JSON.stringify(clean), SYNA_PREFS_SCHEMA_VERSION, Date.now(),
  );
  return clean;
}
