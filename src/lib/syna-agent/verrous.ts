/**
 * LES ÉTAPES VERROUILLÉES (le socle, accepté par le propriétaire le 21 novembre 2026). Quand le client a validé une
 * partie de son projet (son identité, sa marque, son angle, son site, ses publications), elle est figée : aucun outil ne
 * peut plus la refaire sans qu'il le demande lui-même (exemple réel : refaire le logo avait fait disparaître le haut du
 * site de la planche d'Aplomb).
 *
 * Recherche (Anthropic, agents de longue durée) : un registre que l'agent ne peut pas réécrire, où chaque étape n'est
 * cochée qu'après une vérification réelle. Ici :
 * - le verrou est posé par le Studio lui-même (`execute`, boucle de SINA), après la réussite d'un outil de validation,
 *   et seulement si le parcours relu confirme l'étape validée ; aucun outil de SINA n'écrit ce registre ;
 * - un outil qui referait une partie verrouillée est refusé avant de s'exécuter (rien n'est payé) ;
 * - SINA ne rouvre une partie (`etape.rouvrir`) que si le client vient de le demander par écrit : ses mots sont gardés
 *   dans l'historique du verrou ; la partie se reverrouille à la validation suivante.
 *
 * Le registre vit dans `agent_conversations.state_json.verrous`, à côté du parcours.
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { json, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import { journeyOf, type Journey } from "./journey";
import type { AgentTool, ToolResult } from "./types";

export const PARTIES = ["identite", "marque", "angle", "site", "publications"] as const;
export type Partie = (typeof PARTIES)[number];
export const PARTIE_LABEL: Record<Partie, { fr: string; en: string }> = {
  identite: { fr: "son identité de marque", en: "the brand identity" }, marque: { fr: "sa marque complète", en: "the full brand" },
  angle: { fr: "son angle", en: "the angle" }, site: { fr: "son site", en: "the site" }, publications: { fr: "ses publications", en: "the posts" },
};

/** L'outil qui valide chaque partie (avec l'accord écrit du client), et ce que le parcours relu doit confirmer. */
export const VALIDATION: Record<string, Partie> = {
  "identity.choose": "identite", "brand.kit_validate": "marque", "angles.choose": "angle",
  "custom.choose": "site", "theme.validate": "site", "posts.validate": "publications",
};
const CONFIRME: Record<Partie, (j: Journey) => boolean> = {
  identite: (j) => j.steps[1]?.status === "done" && !!j.identityChoice,
  marque: (j) => j.steps[3]?.status === "done",
  angle: (j) => j.steps[4]?.status === "done" && !!j.angleChoice,
  site: (j) => j.steps[6]?.status === "done" || j.steps[8]?.status === "done",
  publications: (j) => j.steps[9]?.status === "done",
};

/**
 * Les outils qui REFONT une partie (ils sont refusés quand elle est verrouillée). Les retouches que le client demande en
 * cliquant sur son site (custom.edit, custom.structure, custom.photo, custom.menu, custom.undo) restent permises : c'est
 * lui qui les demande, élément par élément (règle du propriétaire du 15 novembre 2026, « obligatoire »).
 */
export const REFONT: Record<string, Partie[]> = {
  "identity.propose": ["identite", "marque"], "identity.choose": ["identite", "marque"], "identity.images": ["identite", "marque"],
  "brand.finish": ["marque"],
  "angles.propose": ["angle"], "angles.choose": ["angle"],
  "site.create": ["site"], "site.mode": ["site"], "custom.compose": ["site"], "custom.design": ["site"], "custom.concepts": ["site"], "custom.concept": ["site"], "custom.build": ["site"],
  "theme.choose": ["site"], "theme.brand": ["site"],
  "posts.plan": ["publications"], "posts.create": ["publications"],
};
/** Rouvrir une partie rouvre aussi ce qui en dépend (une nouvelle identité refait sa marque). */
const DEPEND: Partial<Record<Partie, Partie[]>> = { identite: ["marque"] };

export type Verrou = { pose: number; preuve: string; ouvert?: { at: number; mots: string } | null; historique: { pose: number; ouvert?: number; mots?: string }[] };
export type Registre = Partial<Record<Partie, Verrou>>;

const stateOf = (cid: string) => one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid);
export function registreOf(cid: string): Registre {
  const row = stateOf(cid);
  if (!row) return {};
  const st = json<any>(row.state_json ?? "{}", {});
  return st.verrous && typeof st.verrous === "object" ? st.verrous : {};
}
function write(cid: string, change: (r: Registre) => void): Registre {
  return tx(() => {
    const row = stateOf(cid);
    if (!row) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
    const st = json<any>(row.state_json ?? "{}", {});
    const r: Registre = st.verrous && typeof st.verrous === "object" ? st.verrous : {};
    change(r);
    run("UPDATE agent_conversations SET state_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...st, verrous: r }), now(), cid);
    return r;
  });
}

/** Une partie est-elle fermée (validée et pas rouverte à la demande du client) ? */
export const ferme = (r: Registre, p: Partie) => !!r[p] && !r[p]!.ouvert;

/**
 * Pose le verrou d'une partie après la réussite de son outil de validation, seulement si le parcours relu la confirme
 * (jamais sur la seule parole de l'outil). Rend la partie verrouillée, ou null.
 */
export function apresValidation(cid: string, tool: string, res: ToolResult): Partie | null {
  const p = VALIDATION[tool];
  if (!p || !res.ok) return null;
  let j: Journey;
  try { j = journeyOf(cid); } catch { return null; }
  if (j.outside || !CONFIRME[p](j)) return null;
  write(cid, (r) => {
    const old = r[p];
    r[p] = { pose: Date.now(), preuve: String(res.summary ?? "").slice(0, 300), ouvert: null, historique: [...(old?.historique ?? []), { pose: Date.now() }].slice(-20) };
  });
  return p;
}

/** Refus d'un outil qui referait une partie verrouillée (avant toute exécution : rien n'est payé). null : permis. */
export function refusVerrou(cid: string, tool: string): ToolResult | null {
  const parts = REFONT[tool];
  if (!parts) return null;
  const r = registreOf(cid), closed = parts.filter((p) => ferme(r, p));
  if (!closed.length) return null;
  const what = closed.map((p) => PARTIE_LABEL[p].fr).join(" et ");
  return {
    ok: false, internal: true,
    summary: L(`Refusé : ${what} ${closed.length > 1 ? "sont validées" : "est validée"} par le client et ${closed.length > 1 ? "verrouillées" : "verrouillée"}. Rien n'est refait sans qu'il le demande lui-même.`, `Refused: ${closed.join(", ")} approved by the client and locked.`),
    hint: `Si le client vient de te demander par écrit de changer ${what}, appelle d'abord etape.rouvrir (partie « ${closed[0]} », ses mots exacts), puis relance. Sinon, ne la touche pas.`,
  };
}

/** Les mots du client depuis la dernière réponse de SINA. */
function dernierMessage(cid: string): string {
  const lastAssistant = one<{ seq: number }>("SELECT seq FROM syna_messages WHERE conversation_id=? AND role='assistant' AND seq < (SELECT MAX(seq) FROM syna_messages WHERE conversation_id=? AND role='user') ORDER BY seq DESC LIMIT 1", cid, cid);
  const rows = one<{ t: string | null }>("SELECT group_concat(content_json, char(10)) t FROM syna_messages WHERE conversation_id=? AND role='user' AND seq > ?", cid, lastAssistant?.seq ?? -1);
  return (rows?.t ?? "").split("\n").map((j) => { try { return String(JSON.parse(j)?.text ?? ""); } catch { return ""; } }).join("\n");
}
const lettres = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[«»"“”'’]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Rouvre une partie à la demande ÉCRITE du client : ses mots doivent se trouver, tels quels, dans ce qu'il vient
 * d'écrire. Rend la liste des parties rouvertes.
 */
export function rouvrir(cid: string, partie: Partie, mots: string): { ok: true; parties: Partie[] } | { ok: false; raison: string } {
  const said = lettres(dernierMessage(cid)), quoted = lettres(mots);
  if (quoted.length < 6 || !said.includes(quoted)) return { ok: false, raison: L("Ces mots ne sont pas dans ce que le client vient d'écrire : une partie validée ne se rouvre que s'il le demande lui-même. Recopie ses mots exacts, ou demande-lui s'il veut vraiment la changer.", "These words are not in the client's last message.") };
  const r = registreOf(cid);
  const parts = [partie, ...(DEPEND[partie] ?? [])].filter((p) => ferme(r, p));
  if (!parts.length) return { ok: true, parties: [] };
  write(cid, (x) => {
    for (const p of parts) { const v = x[p]!; v.ouvert = { at: Date.now(), mots: mots.trim().slice(0, 400) }; v.historique = [...v.historique.slice(0, -1), { ...(v.historique.at(-1) ?? { pose: v.pose }), ouvert: Date.now(), mots: mots.trim().slice(0, 400) }]; }
  });
  return { ok: true, parties: parts };
}

export const rouvrirTool: AgentTool<{ partie: Partie; mots: string }> = {
  name: "etape.rouvrir", module: "parcours", kind: "write",
  description: "Rouvre une partie que le client a validée (identite, marque, angle, site, publications), SEULEMENT s'il vient de te demander par écrit de la changer : mots = ses mots exacts, recopiés de son dernier message. Sans cela, la partie reste verrouillée et les outils qui la referaient sont refusés. Elle se reverrouille quand il la valide de nouveau. Gratuit.",
  args: z.object({ partie: z.enum(PARTIES), mots: z.string().min(6).max(400) }).strict(),
  run: (ctx, a) => {
    const r = rouvrir(ctx.conversationId, a.partie, a.mots);
    if (!r.ok) return { ok: false, internal: true, summary: r.raison };
    if (!r.parties.length) return { ok: true, summary: L(`${PARTIE_LABEL[a.partie].fr} n'était pas verrouillée.`, "Not locked.") };
    return { ok: true, summary: L(`Rouvert à sa demande : ${r.parties.map((p) => PARTIE_LABEL[p].fr).join(", ")}.`, "Reopened."), changes: r.parties.map((p) => ({ module: "parcours", object: `verrou · ${p}`, summary: `rouvert à la demande du client : « ${a.mots.slice(0, 160)} »`, verified: true })) };
  },
};
