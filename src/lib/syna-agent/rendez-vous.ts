/**
 * « Ta journée est prête » et « le point du mois » (engagements 6 et 1 de la référence, partie 14), construits SURTOUT PAR
 * LE CODE (audit des coûts du 22 novembre 2026) :
 *  - « Ta journée est prête » : la publication du jour, son réseau, son heure, le texte à copier et ses fichiers sont déjà
 *    connus du calendrier ; le message se compose par le code, sans aucun appel à l'IA. Un jour vide le dit.
 *  - « Le point du mois » : les chiffres sont comptés par le code, jamais estimés ; un chiffre que le Studio ne peut pas
 *    lire est écrit « non disponible » avec sa raison. UN seul appel au modèle le plus fort, en différé (moitié prix),
 *    écrit le bilan et trois actions ; aucun appel quand rien n'a changé depuis le dernier point (même empreinte).
 *    Un chiffre écrit par l'IA qui n'est pas dans les chiffres comptés fait refuser le bilan : rien d'inventé.
 * Pas encore branchés à un écran ni à un horaire : les allumer (et leur coût, environ 5 centimes par mois et par client
 * pour le point du mois) se décide avec le propriétaire, au lot 7.
 */
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { all, json, now, one, run } from "../db";
import { L } from "../i18n-server";
import type { Project } from "../projects";
import { stableHash } from "../brain/hash";
import { TEXT_MODEL_BY_TIER } from "../orchestrator/policy";
import { budgetPctOf } from "../ai/budget-pct";
import { calendarView, readCalendar, type ItemView } from "./calendar";

/* ---------- Ta journée est prête (sans IA) ---------- */

export type JourneePrete = {
  ymd: string;
  /** Ce qu'il y a à publier aujourd'hui, dans l'ordre des heures. */
  aPublier: Pick<ItemView, "entryId" | "time" | "networkLabel" | "action" | "title" | "copyText" | "files">[];
  /** Cases des jours passés encore à publier. */
  enRetard: number;
  vide: boolean;
  /** Le message, composé par le code : rien d'inventé, rien de vide. */
  message: string;
};

const heure = (t: string) => t.replace(":", " h ");

export function journeePrete(p: Project, at = now()): JourneePrete {
  const tz = p.settings.timezone || "Europe/Paris";
  const ymd = formatInTimeZone(at, tz, "yyyy-MM-dd");
  const cal = readCalendar(p.id);
  if (!cal) return { ymd, aPublier: [], enRetard: 0, vide: true, message: L("Ton calendrier de publication n'est pas encore prêt : rien à publier aujourd'hui.", "Your posting calendar isn't ready yet: nothing to post today.") };
  const view = calendarView(p, cal, {}, at);
  const today = view.days.find((d) => d.ymd === ymd)?.items.filter((i) => i.status === "a_publier" || i.status === "en_retard") ?? [];
  const enRetard = view.days.filter((d) => d.ymd < ymd).flatMap((d) => d.items).filter((i) => i.status === "en_retard").length;
  const aPublier = today.map(({ entryId, time, networkLabel, action, title, copyText, files }) => ({ entryId, time, networkLabel, action, title, copyText, files }));
  const late = enRetard ? L(` ${enRetard} publication${enRetard > 1 ? "s" : ""} des jours passés attend${enRetard > 1 ? "ent" : ""} encore.`, ` ${enRetard} post${enRetard > 1 ? "s" : ""} from past days still waiting.`) : "";
  if (!aPublier.length) return { ymd, aPublier, enRetard, vide: true, message: L(`Rien à publier aujourd'hui.${late}`, `Nothing to post today.${late}`) };
  const list = aPublier.map((x) => L(`${x.networkLabel} à ${heure(x.time)}`, `${x.networkLabel} at ${x.time}`)).join(L(", ", ", "));
  return {
    ymd, aPublier, enRetard, vide: false,
    message: L(`Ta journée est prête : ${aPublier.length} publication${aPublier.length > 1 ? "s" : ""} (${list}). L'image et le texte sont prêts : un geste pour publier.${late}`, `Your day is ready: ${aPublier.length} post${aPublier.length > 1 ? "s" : ""} (${list}). Image and text are ready: one tap to post.${late}`),
  };
}

/* ---------- Le point du mois (chiffres par le code, un seul appel en différé) ---------- */

export type Chiffre = { cle: string; libelle: string; valeur: number | null; raison?: string };

const bornesDuMois = (month: string, tz: string): [number, number] => {
  const [y, m] = month.split("-").map(Number);
  const start = Date.parse(`${month}-01T00:00:00Z`);
  const next = Date.parse(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00Z`);
  // Décalage du fuseau du client au début du mois (suffisant pour borner un mois entier).
  const off = Date.parse(formatInTimeZone(start, tz, "yyyy-MM-dd'T'HH:mm:ss'Z'")) - start;
  return [start - off, next - off];
};

/** Les chiffres du mois, comptés par le code ; ceux que le Studio ne peut pas lire sont dits « non disponible ». */
export function chiffresDuMois(p: Project, month: string): Chiffre[] {
  const tz = p.settings.timezone || "Europe/Paris";
  const [a, b] = bornesDuMois(month, tz);
  const cal = readCalendar(p.id);
  const cases = (cal?.entries ?? []).filter((e) => e.ymd.startsWith(month));
  const publiees = cases.filter((e) => e.status === "publie").length;
  const creees = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id=? AND media != '[]' AND created_at>=? AND created_at<?", p.id, a, b)?.n ?? 0;
  const spent = one<{ c: number }>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE project_id=? AND created_at>=? AND created_at<?", p.id, a, b)?.c ?? 0;
  const pct = budgetPctOf(p.userId, spent, p.id);
  const absent = L("non disponible : les réseaux ne sont pas encore reliés au Studio", "not available: networks aren't connected to the Studio yet");
  return [
    { cle: "prevues", libelle: L("publications prévues au calendrier", "posts planned in the calendar"), valeur: cases.length },
    { cle: "publiees", libelle: L("publications cochées « publié »", "posts marked as posted"), valeur: publiees },
    { cle: "creees", libelle: L("publications créées ce mois", "posts created this month"), valeur: creees },
    { cle: "budget", libelle: L("part du budget d'IA du mois utilisée (en %)", "share of the month's AI budget used (%)"), valeur: pct == null ? null : Math.round(pct), ...(pct == null ? { raison: L("non disponible : budget du mois inconnu", "not available: month budget unknown") } : {}) },
    { cle: "personnes", libelle: L("personnes touchées", "people reached"), valeur: null, raison: absent },
    { cle: "visites", libelle: L("visites du site", "site visits"), valeur: null, raison: L("non disponible : le site ne transmet pas encore ses visites au Studio", "not available: the site doesn't send its visits to the Studio yet") },
  ];
}

export const PointDuMoisSchema = z.object({
  bilan: z.string().min(40).max(900),
  mieux: z.string().max(400).default(""),
  actions: z.array(z.string().min(10).max(240)).length(3),
});
export type PointDuMois = { month: string; chiffres: Chiffre[]; empreinte: string; ecrit: z.infer<typeof PointDuMoisSchema> | null; appel: boolean; at: number };

/** Nombres écrits par l'IA absents des chiffres comptés : un bilan qui en contient est refusé (rien d'inventé). */
export function nombresInventes(texte: string, chiffres: Chiffre[], month?: string): string[] {
  const permis = new Set([...chiffres.flatMap((c) => (c.valeur == null ? [] : [String(c.valeur)])), ...(month ? [month.slice(0, 4), String(Number(month.slice(5, 7)))] : [])]);
  return [...texte.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]).filter((n) => !permis.has(n.replace(",", ".")) && !permis.has(n));
}

export const POINT_DU_MOIS_SYSTEM = `Tu es SINA, l'assistante du Studio. Tu écris le point du mois d'un client, en français simple, au tutoiement, sans un mot d'anglais. Tu n'utilises QUE les chiffres donnés, tels quels ; un chiffre « non disponible » est dit non disponible, jamais deviné. Aucun autre nombre. bilan : ce qui s'est passé ce mois, en trois ou quatre phrases. mieux : ce qui a le mieux marché et pourquoi, seulement si les chiffres le montrent (sinon vide). actions : trois actions précises pour le mois prochain, que le client accepte d'un clic. Réponse : uniquement le JSON demandé.`;

/** Remplaçable par les essais (aucun appel réel). */
export const pointDuMoisDeps: { ecrire?: (prompt: string, usageKey: string) => Promise<unknown> } = {};

export function pointEnregistre(projectId: string, month: string): PointDuMois | null {
  const r = one<{ point_json: string }>("SELECT point_json FROM syna_points_du_mois WHERE project_id=? AND month=?", projectId, month);
  return r ? json<PointDuMois | null>(r.point_json, null) : null;
}

/**
 * Le point du mois. Aucun appel si l'empreinte des chiffres n'a pas changé depuis le dernier point enregistré : le point
 * gardé est rendu tel quel. Sinon UN appel au modèle le plus fort, en différé.
 */
export async function pointDuMois(p: Project, month: string, o: { jobId?: string | null; at?: number } = {}): Promise<PointDuMois> {
  const chiffres = chiffresDuMois(p, month);
  const empreinte = stableHash("point-du-mois-1", { month, chiffres: chiffres.map((c) => [c.cle, c.valeur]) });
  const before = pointEnregistre(p.id, month);
  if (before && before.empreinte === empreinte && before.ecrit) return { ...before, appel: false };
  const prompt = `MOIS : ${month}\nCHIFFRES (comptés par le Studio) :\n${chiffres.map((c) => `- ${c.libelle} : ${c.valeur ?? c.raison}`).join("\n")}\n\nRéponds { "bilan": "…", "mieux": "…", "actions": ["…", "…", "…"] }.`;
  const usageKey = `point-du-mois:${p.id}:${month}:${empreinte}`;
  const raw = pointDuMoisDeps.ecrire
    ? await pointDuMoisDeps.ecrire(prompt, usageKey)
    : await (await import("../ai/llm")).llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: o.jobId ?? null, deferred: true, teteUnique: true, system: POINT_DU_MOIS_SYSTEM, promptKey: "syna-point-du-mois-1", prompt, maxTokens: 3000, maxOutputTokens: 16000, usageKey, routing: { difficulty: "complex", prefer: { provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "medium" } } }, PointDuMoisSchema);
  const ecrit = PointDuMoisSchema.parse(raw);
  const inventes = nombresInventes([ecrit.bilan, ecrit.mieux, ...ecrit.actions].join(" "), chiffres, month);
  if (inventes.length) throw new Error(L(`Point du mois refusé : nombres absents des chiffres comptés (${inventes.join(", ")}).`, `Monthly report refused: numbers not in the counted figures (${inventes.join(", ")}).`));
  const point: PointDuMois = { month, chiffres, empreinte, ecrit, appel: true, at: o.at ?? now() };
  run("INSERT INTO syna_points_du_mois(project_id,month,empreinte,point_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(project_id,month) DO UPDATE SET empreinte=excluded.empreinte,point_json=excluded.point_json,updated_at=excluded.updated_at", p.id, month, empreinte, JSON.stringify(point), point.at);
  return point;
}

/** Points du mois enregistrés d'un projet (les plus récents d'abord). */
export const pointsDuMois = (projectId: string) => all<{ point_json: string }>("SELECT point_json FROM syna_points_du_mois WHERE project_id=? ORDER BY month DESC", projectId).map((r) => json<PointDuMois | null>(r.point_json, null)).filter((x): x is PointDuMois => !!x);
