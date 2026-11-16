/**
 * Les trois angles de SINA (lot 3, 16 novembre 2026) : la forme d'un angle, ce que le client voit, et son choix.
 *
 * Les angles sont créés par la chaîne de `angles-chain.ts` (trois stratèges séparées, un juge à part, un lecteur qui ne
 * sait rien). Ici : ce qui est gardé dans le parcours, et l'enregistrement de l'angle que le client choisit comme
 * angle actif du projet (le fil conducteur que lisent le site, les publications et les publicités).
 */
import { all, json as parseJson } from "../db";
import { getJob } from "../jobs";
import { loadProject } from "../projects";
import { activateSinaAngle, type MarketingAngle } from "../marketing-strategy";
import type { Study } from "./brand-chain";
import { clientFacts } from "./brand-routes";
import type { Journey } from "./journey";
import { shownAngles, type AngleRole } from "./angle-roles";

export type SinaAngle = {
  id: string; title: string; audience: string; motivation: string; message: string; emotion: string;
  proofsToConfirm: string[]; arguments: string[]; sources: { title: string; url: string }[];
  goal: string; why: string; story: string; show: string; organicExample: string; cta: string;
  /** Doute de SINA sur cet angle (sa relecture ne l'a pas noté 8 sur 10, même après une reprise) : dit franchement au client. */
  doubt?: string;
  /** L'entrée de la stratège qui l'a écrit. */
  role?: AngleRole;
  /** La scène : qui, quand, avant, après. */
  person?: string; moment?: string; before?: string; after?: string;
  promise?: string; tone?: string;
  /** Le haut du site en mots, et une publication d'exemple. */
  site?: { title: string; text: string; button: string };
  post?: { title: string; text: string };
  objections?: { objection: string; answer: string }[];
  /** Paroles réelles d'acheteurs sur lesquelles l'angle s'appuie (mot pour mot, avec leur page). */
  quotes?: { text: string; url: string }[];
  /** Le type de client visé (règle du propriétaire : un angle = un type de client), et ce qu'on met en avant pour lui. */
  client?: { name: string; who: string; wants: string; needs: string }; showcase?: string;
  /** Note du juge, sur 10. */
  note?: number;
};
export type SinaAngles = {
  list: SinaAngle[]; recommendedId: string | null; recommendation: string; sourceCount: number; at: number;
  /** juges : relus par le juge des angles ; non_juges : il n'a pas pu les relire (dit au client). */
  judged?: "juges" | "non_juges";
  redone?: string[];
  /** Les TROIS angles montrés au client, avec leur rôle : sûr, émotion, audacieux. */
  shown?: { id: string; role: AngleRole }[];
  /** Angles écrits et gardés par le juge, en réserve pour les publications et les publicités, jamais montrés comme choix. */
  reserve?: string[];
  /** Ce que le contrôle n'a pas pu valider (dit honnêtement au client). */
  issues?: string[];
  /** Numéro de la proposition, tâche qui l'a faite, paroles d'acheteurs lues, et la demande du client pour une nouvelle proposition. */
  round?: number; chainJobId?: string; quoteCount?: number; guidance?: string;
};
export { ANGLE_ROLE_LABEL, roleOf, shownAngles, type AngleRole } from "./angle-roles";

/**
 * Ce que le client voit de ses angles, dans le fil de SINA et sur l'écran « Angles » : les trois montrés (jamais la
 * réserve), celui que SINA recommande, et celui qu'il a choisi.
 */
export function anglesViewOf(j: Journey) {
  const a = j.angles;
  if (!a?.shown?.length) return null;
  return {
    list: shownAngles(a), roles: Object.fromEntries(a.shown.map((x) => [x.id, x.role])) as Record<string, AngleRole>,
    recommendedId: a.recommendedId, recommendation: a.recommendation ?? "", quoteCount: a.quoteCount ?? 0, sourceCount: a.sourceCount, chosen: j.angleChoice?.id ?? null,
  };
}
export type AnglesView = NonNullable<ReturnType<typeof anglesViewOf>>;

/** Pourcentage lisible (« 8 % », « 4,5 % »). */
export const pct = (x: number | null | undefined) => (x == null ? "?" : `${String(Math.round(x * 10) / 10).replace(".", ",")} %`);

/**
 * Tout ce que le client a dit de son produit ou de sa prestation : sa fiche de départ, ce qu'il a ajouté en parlant
 * avec SINA, et les faits confirmés du projet. Seule source de vérité des angles.
 */
export function angleFacts(j: Journey, projectId: string): string {
  const lines = [clientFacts(j), ...(j.notes ?? []).map((n) => `${n.sujet} : ${n.value}`)];
  try {
    const p = loadProject(projectId);
    for (const f of p.product?.facts ?? []) if (f.status === "confirmed") lines.push(`${f.label} : ${f.value}`);
    if (p.business === "services") for (const x of p.services?.services ?? []) lines.push([x.name, x.description, x.price, x.duration].filter(Boolean).join(" · "));
  } catch { /* projet illisible : la fiche suffit */ }
  // Ce que SINA a noté dans la mémoire du projet comme confirmé par le client (essai réel du 16 novembre 2026 : sa façon
  // d'être payé, déjà dite, lui était redemandée dans « à confirmer »).
  try { for (const m of all<{ key: string; value: string }>("SELECT key, value FROM memory WHERE project_id=? AND key LIKE 'syna.%' AND origin='user' ORDER BY rowid", projectId)) lines.push(`${m.key.replace(/^syna\./, "")} : ${m.value}`); } catch { /* mémoire absente */ }
  return [...new Set(lines.map((l) => l.trim()).filter(Boolean))].join("\n");
}

/** L'étude du marché faite pour la marque (paroles d'acheteurs, concurrents) : reprise telle quelle, jamais repayée. */
export function brandStudyOf(j: Journey): Study | null {
  const id = j.identities?.chainJobId;
  if (id) {
    try {
      const st = parseJson<Record<string, any>>(getJob(id)?.checkpoint ?? "{}", {})["brand:study"];
      if (st && Array.isArray(st.quotes)) return st as Study;
    } catch { /* tâche introuvable : on prend le résumé gardé dans le parcours */ }
  }
  const s = j.identities?.study;
  if (!s) return null;
  return { quotes: s.quotes, competitors: s.competitors.map((name) => ({ name, url: "", codes: "" })), mould: s.mould, substitutes: s.substitutes, facts: [], notFound: s.notFound, sources: s.sources, dropped: 0 };
}

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url.slice(0, 60); } };

/** L'angle tel que le lisent le site, les publications et les publicités (l'angle actif du projet). */
export function marketingAngleOf(a: SinaAngle, role: AngleRole, facts: string): MarketingAngle {
  return {
    id: role, title: a.title, audience: a.client ? `${a.client.name} : ${a.person || a.audience}` : a.person || a.audience, situation: a.moment ?? "", notPriority: "",
    tension: a.before ?? "", motivation: a.after || a.motivation, benefit: a.after ?? "", promise: a.promise || a.message, rationale: a.why,
    proofs: facts.split("\n").filter(Boolean).slice(0, 40), objections: a.objections ?? [], limits: a.proofsToConfirm,
    tone: a.tone ?? "", messages: [a.message], exclusions: [], visualDirection: a.show,
    examples: { hero: a.site?.title || a.message, subtext: a.site?.text ?? "", cta: a.site?.button || a.cta, advertisement: a.post?.text || a.organicExample },
    source: "creative_hypothesis",
    sources: (a.quotes ?? []).map((q) => ({ kind: "dated_source" as const, label: host(q.url), value: q.text, ref: q.url })),
  };
}

/**
 * Le choix du client : UN angle principal, parmi les trois montrés. Il devient l'angle actif du projet. Les autres
 * angles gardés par le juge restent en réserve pour les publications et les publicités.
 */
export function chooseAngle(projectId: string, j: Journey, angleId: string, idempotencyKey: string): { ok: boolean; error?: string } {
  const a = j.angles?.list.find((x) => x.id === angleId), role = j.angles?.shown?.find((x) => x.id === angleId)?.role;
  if (!a || !role) return { ok: false, error: "angle inconnu" };
  try {
    const active = activateSinaAngle(projectId, marketingAngleOf(a, role, angleFacts(j, projectId)), idempotencyKey);
    return { ok: active.angleId === role };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
