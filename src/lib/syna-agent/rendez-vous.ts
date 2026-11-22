/**
 * « Ta journée est prête » et « le point du mois » (engagements 6 et 1 de la référence, partie 14), construits SURTOUT PAR
 * LE CODE (audit des coûts du 22 novembre 2026) :
 *  - « Ta journée est prête » : la publication du jour, son réseau, son heure, le texte à copier et ses fichiers sont déjà
 *    connus du calendrier ; les demandes reçues depuis la veille et les commandes de la veille sont lues par le code
 *    (`suivi/mesures.ts`) ; le message se compose sans aucun appel à l'IA. Un jour vide le dit. La première semaine après
 *    la mise en ligne, le premier résultat est montré dès qu'il arrive (recherche 08, partie 7.1).
 *  - « Le point du mois » : les chiffres sont comptés par le code, jamais estimés, chacun avec sa source ; un chiffre que
 *    le Studio ne peut pas lire est écrit « non disponible » avec sa raison. Le code dit si le mois est bon ou faible et
 *    en tire l'ordre (recherche 08, partie 7.2) : un mois bon s'ouvre sur ce qui a été fait, un mois faible sur le chiffre
 *    honnête, la raison et le plan, le travail seulement après. UN seul appel au modèle le plus fort, en différé (moitié
 *    prix), écrit le bilan et trois actions ; aucun appel quand rien n'a changé depuis le dernier point (même empreinte).
 *    Un chiffre écrit par l'IA qui n'est pas dans les chiffres comptés fait refuser le bilan : rien d'inventé.
 * ALLUMÉS (décision relayée par le chef d'orchestre, 22 novembre 2026 : engagements acceptés le 15 novembre) : la journée
 * et le dernier point s'affichent sur le tableau de bord ; la journée est rappelée chaque matin (calendar.remindDue) ; le
 * point du mois part chaque début de mois par une tâche de fond (`planifierPointsDuMois`, environ 5 centimes par mois et
 * par client).
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
import { mesuresDuProjet, type Mesure } from "../suivi/mesures";
import { projectPlan } from "../project-billing";
import { enqueue } from "../jobs";

/* ---------- Ta journée est prête (sans IA) ---------- */

export type JourneePrete = {
  ymd: string;
  /** Ce qu'il y a à publier aujourd'hui, dans l'ordre des heures. */
  aPublier: Pick<ItemView, "entryId" | "time" | "networkLabel" | "action" | "title" | "copyText" | "files">[];
  /** Cases des jours passés encore à publier. */
  enRetard: number;
  /** Demandes reçues par le site depuis hier matin, et commandes d'hier et d'aujourd'hui (lues, jamais estimées). */
  chiffres: Mesure[];
  /** La première semaine après la mise en ligne : le premier résultat arrivé (ou ce qu'on attend encore). */
  premierResultat: string | null;
  vide: boolean;
  /** Le message, composé par le code : rien d'inventé, rien de vide. */
  message: string;
};

const heure = (t: string) => t.replace(":", " h ");
const jourAvant = (ymd: string) => new Date(Date.parse(`${ymd}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Le début d'un jour (AAAA-MM-JJ) dans le fuseau du client, en millisecondes. */
export function debutDuJour(ymd: string, tz: string): number {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  const off = Date.parse(formatInTimeZone(t, tz, "yyyy-MM-dd'T'HH:mm:ss'Z'")) - t;
  return t - off;
}

/**
 * Le premier résultat, dans les sept jours qui suivent la première mise en ligne du site (recherche 08, 7.1 : le client
 * qui « essaie » s'en va s'il ne voit rien) : première demande, sinon première page vue, sinon première publication
 * cochée. Après sept jours, ou sans site publié : rien.
 */
export function premierResultat(projectId: string, at = now()): string | null {
  let mise: number | null = null;
  try { mise = one<{ t: number | null }>("SELECT MIN(created_at) t FROM site_publications WHERE project_id=?", projectId)?.t ?? null; } catch { return null; }
  if (!mise || at - mise > 7 * 86_400_000 || at < mise) return null;
  const dem = one<{ n: number; t: number | null }>("SELECT COUNT(*) n, MIN(created_at) t FROM site_requests WHERE project_id=? AND created_at>=?", projectId, mise);
  if (dem && dem.n > 0) return L(`Premier résultat : ton site a reçu ${dem.n} demande${dem.n > 1 ? "s" : ""} depuis sa mise en ligne.`, `First result: your site has received ${dem.n} request${dem.n > 1 ? "s" : ""} since going live.`);
  const vues = one<{ n: number }>("SELECT COALESCE(SUM(vues),0) n FROM visites WHERE project_id=? AND jour>=?", projectId, new Date(mise).toISOString().slice(0, 10))?.n ?? 0;
  if (vues > 0) return L(`Premier résultat : ${vues} page${vues > 1 ? "s" : ""} de ton site ${vues > 1 ? "ont été vues" : "a été vue"} depuis sa mise en ligne. La première demande n'est pas encore arrivée.`, `First result: ${vues} page view${vues > 1 ? "s" : ""} since going live. No request yet.`);
  return L("Ton site est en ligne depuis moins d'une semaine : aucune visite comptée pour l'instant.", "Your site has been live for less than a week: no visit counted yet.");
}

export async function journeePrete(p: Project, at = now()): Promise<JourneePrete> {
  const tz = p.settings.timezone || "Europe/Paris";
  const ymd = formatInTimeZone(at, tz, "yyyy-MM-dd");
  const hier = jourAvant(ymd);
  // Depuis hier matin jusqu'à maintenant : les demandes et les commandes de la veille et du jour.
  const chiffres = (await mesuresDuProjet(p, hier, ymd, debutDuJour(hier, tz), at)).filter((c) => c.cle === "demandes" || c.cle === "commandes");
  const premier = premierResultat(p.id, at);
  const lus = chiffres.filter((c) => c.valeur != null).map((c) => c.cle === "demandes"
    ? (c.valeur ? L(` ${c.valeur} demande${c.valeur! > 1 ? "s" : ""} reçue${c.valeur! > 1 ? "s" : ""} depuis hier.`, ` ${c.valeur} request${c.valeur! > 1 ? "s" : ""} since yesterday.`) : L(" Aucune demande depuis hier.", " No request since yesterday."))
    : (c.valeur ? L(` ${c.valeur} commande${c.valeur! > 1 ? "s" : ""} depuis hier.`, ` ${c.valeur} order${c.valeur! > 1 ? "s" : ""} since yesterday.`) : L(" Aucune commande depuis hier.", " No order since yesterday."))).join("");
  const suite = `${lus}${premier ? ` ${premier}` : ""}`;
  const cal = readCalendar(p.id);
  if (!cal) return { ymd, aPublier: [], enRetard: 0, chiffres, premierResultat: premier, vide: true, message: L(`Ton calendrier de publication n'est pas encore prêt : rien à publier aujourd'hui.${suite}`, `Your posting calendar isn't ready yet: nothing to post today.${suite}`) };
  const view = calendarView(p, cal, {}, at);
  const today = view.days.find((d) => d.ymd === ymd)?.items.filter((i) => i.status === "a_publier" || i.status === "en_retard") ?? [];
  const enRetard = view.days.filter((d) => d.ymd < ymd).flatMap((d) => d.items).filter((i) => i.status === "en_retard").length;
  const aPublier = today.map(({ entryId, time, networkLabel, action, title, copyText, files }) => ({ entryId, time, networkLabel, action, title, copyText, files }));
  const late = enRetard ? L(` ${enRetard} publication${enRetard > 1 ? "s" : ""} des jours passés attend${enRetard > 1 ? "ent" : ""} encore.`, ` ${enRetard} post${enRetard > 1 ? "s" : ""} from past days still waiting.`) : "";
  if (!aPublier.length) return { ymd, aPublier, enRetard, chiffres, premierResultat: premier, vide: true, message: L(`Rien à publier aujourd'hui.${late}${suite}`, `Nothing to post today.${late}${suite}`) };
  const list = aPublier.map((x) => L(`${x.networkLabel} à ${heure(x.time)}`, `${x.networkLabel} at ${x.time}`)).join(L(", ", ", "));
  return {
    ymd, aPublier, enRetard, chiffres, premierResultat: premier, vide: false,
    message: L(`Ta journée est prête : ${aPublier.length} publication${aPublier.length > 1 ? "s" : ""} (${list}). L'image et le texte sont prêts : un geste pour publier.${late}${suite}`, `Your day is ready: ${aPublier.length} post${aPublier.length > 1 ? "s" : ""} (${list}). Image and text are ready: one tap to post.${late}${suite}`),
  };
}

/* ---------- Le point du mois (chiffres par le code, un seul appel en différé) ---------- */

export type Chiffre = Mesure;

const bornesDuMois = (month: string, tz: string): [number, number] => {
  const [y, m] = month.split("-").map(Number);
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  return [debutDuJour(`${month}-01`, tz), debutDuJour(`${next}-01`, tz)];
};
const dernierJour = (month: string) => { const [y, m] = month.split("-").map(Number); return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`; };

/** Les chiffres du mois, comptés par le code, chacun avec sa source ; ceux que le Studio ne peut pas lire sont dits « non disponible ». */
export async function chiffresDuMois(p: Project, month: string): Promise<Chiffre[]> {
  const tz = p.settings.timezone || "Europe/Paris";
  const [a, b] = bornesDuMois(month, tz);
  const cal = readCalendar(p.id);
  const cases = (cal?.entries ?? []).filter((e) => e.ymd.startsWith(month));
  const publiees = cases.filter((e) => e.status === "publie").length;
  const creees = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id=? AND media != '[]' AND created_at>=? AND created_at<?", p.id, a, b)?.n ?? 0;
  const spent = one<{ c: number }>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE project_id=? AND created_at>=? AND created_at<?", p.id, a, b)?.c ?? 0;
  const pct = budgetPctOf(p.userId, spent, p.id);
  const releve = L("non disponible : relevé non envoyé (les réseaux et la fiche Google ne sont pas reliés au Studio)", "not available: report not sent (networks and Google profile aren't connected to the Studio)");
  const cal_ = L("ton calendrier dans le Studio", "your calendar in the Studio");
  return [
    { cle: "prevues", libelle: L("publications prévues au calendrier", "posts planned in the calendar"), valeur: cases.length, source: cal_ },
    { cle: "publiees", libelle: L("publications cochées « publié »", "posts marked as posted"), valeur: publiees, source: cal_ },
    { cle: "creees", libelle: L("publications créées ce mois", "posts created this month"), valeur: creees, source: L("tes publications dans le Studio", "your posts in the Studio") },
    ...(await mesuresDuProjet(p, `${month}-01`, dernierJour(month), a, b)),
    { cle: "budget", libelle: L("part du budget d'IA du mois utilisée (en %)", "share of the month's AI budget used (%)"), valeur: pct == null ? null : Math.round(pct), ...(pct == null ? { raison: L("non disponible : budget du mois inconnu", "not available: month budget unknown") } : { source: L("compteur du Studio", "Studio counter") }) },
    { cle: "personnes", libelle: L("personnes touchées", "people reached"), valeur: null, raison: releve },
    { cle: "avis", libelle: L("avis reçus", "reviews received"), valeur: null, raison: releve },
  ];
}

/** Le mois est-il bon ou faible ? Décidé par le code, jamais par l'IA, avec sa raison. */
export type EtatDuMois = { etat: "premier" | "bon" | "faible"; raison: string };
const v = (c: Chiffre[], k: string) => c.find((x) => x.cle === k)?.valeur ?? null;
const resultat = (c: Chiffre[]) => { const d = v(c, "demandes"), o = v(c, "commandes"); return d == null && o == null ? null : (d ?? 0) + (o ?? 0); };

export function etatDuMois(chiffres: Chiffre[], precedent: Chiffre[] | null): EtatDuMois {
  const r = resultat(chiffres), r0 = precedent ? resultat(precedent) : null;
  if (r != null && r0 != null) {
    if (r > 0 && r >= r0) return { etat: "bon", raison: L(`demandes et commandes : ${r}, contre ${r0} le mois d'avant`, `requests and orders: ${r}, against ${r0} the month before`) };
    return { etat: "faible", raison: L(`demandes et commandes : ${r}, contre ${r0} le mois d'avant`, `requests and orders: ${r}, against ${r0} the month before`) };
  }
  const prev = v(chiffres, "prevues") ?? 0, pub = v(chiffres, "publiees") ?? 0;
  if (!precedent && r == null && !prev) return { etat: "premier", raison: L("premier mois : rien encore à comparer", "first month: nothing to compare yet") };
  if (r != null && r > 0) return { etat: "bon", raison: L(`${r} demande${r > 1 ? "s" : ""} ou commande${r > 1 ? "s" : ""} ce mois`, `${r} request(s) or order(s) this month`) };
  if (prev && pub / prev >= 0.8) return { etat: "bon", raison: L(`${pub} publications parues sur ${prev} prévues`, `${pub} of ${prev} planned posts published`) };
  return { etat: "faible", raison: r === 0 ? L("aucune demande ni commande ce mois", "no request or order this month") : L(`${pub} publications parues sur ${prev} prévues`, `${pub} of ${prev} planned posts published`) };
}

/** Les trois lignes en tête du point : les trois chiffres qui comptent le plus, chacun avec sa source. */
export function troisLignes(chiffres: Chiffre[]): string[] {
  const ordre = ["commandes", "montant", "demandes", "visites", "publiees", "creees", "prevues"];
  const lus = ordre.map((k) => chiffres.find((c) => c.cle === k)).filter((c): c is Chiffre => !!c && c.valeur != null);
  return lus.slice(0, 3).map((c) => `${c.libelle} : ${c.valeur}${c.source ? ` (${c.source})` : ""}`);
}

/** Ce que SINA a fait pour lui ce mois, compté par le code. */
export function travailDuMois(chiffres: Chiffre[]): string[] {
  const out: string[] = [];
  const c = v(chiffres, "creees"), pr = v(chiffres, "prevues");
  if (c) out.push(L(`${c} publication${c > 1 ? "s" : ""} créée${c > 1 ? "s" : ""}`, `${c} post${c > 1 ? "s" : ""} created`));
  if (pr) out.push(L(`${pr} publication${pr > 1 ? "s" : ""} prévue${pr > 1 ? "s" : ""} au calendrier`, `${pr} post${pr > 1 ? "s" : ""} planned`));
  return out;
}

/** L'ordre du point (recherche 08, 7.2) : un mois faible ne s'ouvre jamais sur la liste du travail fait. */
export const ordreDuPoint = (e: EtatDuMois["etat"]): ("lignes" | "raison" | "bilan" | "mieux" | "actions" | "travail")[] =>
  e === "faible" ? ["lignes", "raison", "bilan", "actions", "travail"] : ["lignes", "travail", "bilan", "mieux", "actions"];

export const PointDuMoisSchema = z.object({
  bilan: z.string().min(40).max(900),
  mieux: z.string().max(400).default(""),
  actions: z.array(z.string().min(10).max(240)).length(3),
});
export type PointDuMois = {
  month: string; chiffres: Chiffre[]; empreinte: string; ecrit: z.infer<typeof PointDuMoisSchema> | null; appel: boolean; at: number;
  /** Bon ou faible, dit par le code ; l'ordre d'affichage en découle ; les trois lignes et le travail sont écrits par le code. */
  etat?: EtatDuMois; ordre?: ReturnType<typeof ordreDuPoint>; lignes?: string[]; travail?: string[];
};

/** Nombres écrits par l'IA absents des chiffres comptés : un bilan qui en contient est refusé (rien d'inventé). */
export function nombresInventes(texte: string, chiffres: Chiffre[], month?: string): string[] {
  const permis = new Set([...chiffres.flatMap((c) => (c.valeur == null ? [] : [String(c.valeur)])), ...(month ? [month.slice(0, 4), String(Number(month.slice(5, 7)))] : [])]);
  // Les devises et les noms de chiffres portent parfois un nombre (« 2 », « 3 ») : seuls les nombres hors chiffres comptés sont refusés.
  return [...texte.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]).filter((n) => !permis.has(n.replace(",", ".")) && !permis.has(n));
}

export const POINT_DU_MOIS_SYSTEM = `Tu es SINA, l'assistante du Studio. Tu écris le point du mois d'un client, en français simple, au tutoiement, sans un mot d'anglais. Tu n'utilises QUE les chiffres donnés, tels quels ; un chiffre « non disponible » est dit non disponible, jamais deviné. Aucun autre nombre. Le code te dit si le mois est BON ou FAIBLE, avec sa raison. bilan : ce qui s'est passé ce mois, en trois ou quatre phrases ; un mois FAIBLE s'ouvre sur le chiffre honnête et sa raison, puis ce qu'on change, sans enjoliver et sans longue liste de travail. mieux : ce qui a le mieux marché et pourquoi, seulement pour un mois BON et si les chiffres le montrent (sinon vide). Jamais une moyenne d'autres entreprises présentée comme une promesse. actions : trois actions précises pour le mois prochain, que le client accepte d'un clic. Réponse : uniquement le JSON demandé.`;

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
  const chiffres = await chiffresDuMois(p, month);
  const [y, m] = month.split("-").map(Number);
  const moisAvant = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const precedent = pointEnregistre(p.id, moisAvant)?.chiffres ?? null;
  const etat = etatDuMois(chiffres, precedent);
  const lignes = troisLignes(chiffres), travail = travailDuMois(chiffres), ordre = ordreDuPoint(etat.etat);
  const empreinte = stableHash("point-du-mois-2", { month, chiffres: chiffres.map((c) => [c.cle, c.valeur]), etat: etat.etat });
  const before = pointEnregistre(p.id, month);
  if (before && before.empreinte === empreinte && before.ecrit) return { ...before, appel: false };
  const avant = precedent ? `\nMOIS D'AVANT (${moisAvant}) :\n${precedent.filter((c) => c.valeur != null).map((c) => `- ${c.libelle} : ${c.valeur}`).join("\n")}` : "";
  const prompt = `MOIS : ${month}\nÉTAT (dit par le code) : ${etat.etat === "faible" ? "FAIBLE" : etat.etat === "bon" ? "BON" : "PREMIER MOIS"} — ${etat.raison}\nCHIFFRES (comptés par le Studio, avec leur source) :\n${chiffres.map((c) => `- ${c.libelle} : ${c.valeur ?? c.raison}${c.source ? ` (${c.source})` : ""}`).join("\n")}${avant}\n\nRéponds { "bilan": "…", "mieux": "…", "actions": ["…", "…", "…"] }.`;
  const usageKey = `point-du-mois:${p.id}:${month}:${empreinte}`;
  const raw = pointDuMoisDeps.ecrire
    ? await pointDuMoisDeps.ecrire(prompt, usageKey)
    : await (await import("../ai/llm")).llmJson({ task: "strategy", userId: p.userId, projectId: p.id, jobId: o.jobId ?? null, deferred: true, teteUnique: true, system: POINT_DU_MOIS_SYSTEM, promptKey: "syna-point-du-mois-2", prompt, maxTokens: 3000, maxOutputTokens: 16000, usageKey, routing: { difficulty: "complex", prefer: { provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "medium" } } }, PointDuMoisSchema);
  const parsed = PointDuMoisSchema.parse(raw);
  // Un mois faible n'a pas de « ce qui a le mieux marché » : rien à enjoliver.
  const ecrit = etat.etat === "faible" ? { ...parsed, mieux: "" } : parsed;
  const inventes = nombresInventes([ecrit.bilan, ecrit.mieux, ...ecrit.actions].join(" "), [...chiffres, ...(precedent ?? [])], month);
  if (inventes.length) throw new Error(L(`Point du mois refusé : nombres absents des chiffres comptés (${inventes.join(", ")}).`, `Monthly report refused: numbers not in the counted figures (${inventes.join(", ")}).`));
  const point: PointDuMois = { month, chiffres, empreinte, ecrit, appel: true, at: o.at ?? now(), etat, ordre, lignes, travail };
  run("INSERT INTO syna_points_du_mois(project_id,month,empreinte,point_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(project_id,month) DO UPDATE SET empreinte=excluded.empreinte,point_json=excluded.point_json,updated_at=excluded.updated_at", p.id, month, empreinte, JSON.stringify(point), point.at);
  return point;
}

/**
 * L'horaire du point du mois : à partir du 1er du mois, 8 h (heure du client), une tâche de fond par projet avec un
 * forfait actif et un calendrier ou un site publié, pour le mois écoulé. Une seule par mois (clé d'unicité) ; un
 * projet sans forfait n'en reçoit aucune (aucun appel à l'IA sans abonnement).
 */
export function planifierPointsDuMois(at = now(), deps: { enqueue?: (i: { userId: string; projectId: string; type: string; label: string; payload: unknown; idempotencyKey: string }) => unknown; plan?: (projectId: string) => unknown } = {}): number {
  let n = 0;
  const rows = all<{ id: string; user_id: string; settings_json: string }>("SELECT p.id, p.user_id, p.settings_json FROM projects p WHERE EXISTS (SELECT 1 FROM syna_calendars c WHERE c.project_id=p.id) OR EXISTS (SELECT 1 FROM sqlite_master WHERE name='site_publications') AND EXISTS (SELECT 1 FROM site_publications s WHERE s.project_id=p.id)");
  for (const r of rows) {
    const tz = json<{ timezone?: string }>(r.settings_json, {}).timezone || "Europe/Paris";
    if (Number(formatInTimeZone(at, tz, "H")) < 8) continue;
    const cur = formatInTimeZone(at, tz, "yyyy-MM");
    const [y, m] = cur.split("-").map(Number);
    const month = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
    if (pointEnregistre(r.id, month)?.ecrit) continue;
    const plan = (deps.plan ?? projectPlan)(r.id);
    if (!plan) continue;
    (deps.enqueue ?? enqueue)({ userId: r.user_id, projectId: r.id, type: "syna.point-du-mois", label: L(`Le point du mois (${month})`, `Monthly report (${month})`), payload: { month }, idempotencyKey: `point-du-mois:${r.id}:${month}` });
    n++;
  }
  return n;
}

/** La tâche de fond du point du mois. */
export async function runPointDuMoisJob(ctx: { job: { id: string; project_id: string | null }; payload: { month?: string } }): Promise<{ month: string; appel: boolean }> {
  const { loadProject, notify } = await import("../projects");
  const month = String(ctx.payload.month ?? "");
  if (!ctx.job.project_id || !/^\d{4}-\d{2}$/.test(month)) throw new Error("point du mois : projet ou mois manquant");
  const p = loadProject(ctx.job.project_id);
  const point = await pointDuMois(p, month, { jobId: ctx.job.id });
  if (point.appel) notify(p.userId, p.id, L(`Ton point du mois est prêt (${point.month})`, `Your monthly report is ready (${point.month})`), (point.lignes ?? []).join("\n"), "info");
  return { month: point.month, appel: point.appel };
}

/** Points du mois enregistrés d'un projet (les plus récents d'abord). */
export const pointsDuMois = (projectId: string) => all<{ point_json: string }>("SELECT point_json FROM syna_points_du_mois WHERE project_id=? ORDER BY month DESC", projectId).map((r) => json<PointDuMois | null>(r.point_json, null)).filter((x): x is PointDuMois => !!x);

/** Ce que le tableau de bord montre après la construction : la journée, et le dernier point du mois s'il existe. */
export type SuiviVue = { journee: JourneePrete; point: PointDuMois | null };
export async function suiviDuProjet(projectId: string, at = now()): Promise<SuiviVue | null> {
  try {
    const { loadProject } = await import("../projects");
    const p = loadProject(projectId);
    return { journee: await journeePrete(p, at), point: pointsDuMois(projectId)[0] ?? null };
  } catch { return null; }
}
