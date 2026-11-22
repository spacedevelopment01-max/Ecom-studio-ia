/**
 * L'ASSISTANTE DU SITE, QUI SE PRÉSENTE COMME UNE IA (22 novembre 2026, recherche 08, point 4 ; engagement 7).
 *
 * Ce que dit la loi, et comment le Studio le tient (lignes directrices de la Commission sur l'article 50, C(2026) 7702,
 * 5 novembre 2026) :
 *  - c'est au Studio, qui construit l'assistante, de la faire se présenter, pas au client de s'en souvenir ;
 *  - dès le premier message (« je suis une assistante IA »), avec un badge visible pendant toute la conversation, près du
 *    champ où l'on écrit ; jamais une mention cachée dans les conditions.
 * Le risque Air Canada (l'entreprise répond de ce que dit son assistante) : elle ne répond QU'AVEC la fiche vérifiée du
 * client (ses produits et leurs prix, ses réponses de départ, ce qu'il a dit de son activité). Avant d'être montrée au
 * visiteur, la réponse est relue PAR LE CODE : un chiffre, un prix, un délai ou une promesse absents de la fiche la font
 * remplacer par la transmission (« je pose la question à … »), et le visiteur reçoit le formulaire. Au-delà du plafond du
 * jour (dans le budget d'IA du client), le formulaire aussi : jamais un visiteur sans réponse.
 *
 * ALLUMÉE par défaut (décision du 22 novembre 2026) ; « 0 » dans le réglage `suivi.assistante` l'éteint : l'adresse
 * publique répond alors 404 et aucun site ne reçoit la bulle. Coût estimé (non mesuré) : de l'ordre d'un centime par
 * réponse avec le modèle le plus fort à effort faible ; 40 réponses par jour et par site au plus.
 */
import { z } from "zod";
import { all, id, now, one, run } from "../db";
import { L } from "../i18n-server";
import { suiviAllume } from "./reglages";
import { listProducts } from "../products/catalog";
import { ficheVue, journeyDuProjet } from "../syna-agent/fiche";
import { TEXT_MODEL_BY_TIER } from "../orchestrator/policy";

export const BADGE_IA = { fr: "Assistante IA", en: "AI assistant" } as const;
export const premierMessage = (marque: string, prenom: string | null) => L(
  `Bonjour, je suis l'assistante IA de ${marque}. Je réponds avec les informations que ${prenom ?? "l'équipe"} m'a données ; pour le reste, je lui transmets ta question.`,
  `Hello, I'm the AI assistant of ${marque}. I answer with the information ${prenom ?? "the team"} gave me; for anything else, I pass your question on.`,
);
/** Plafond de réponses par jour et par site, tant que le propriétaire n'en a pas fixé un autre. */
export const PLAFOND_JOUR = 40;

export type Fait = { sujet: string; texte: string };

/** La fiche vérifiée : ce que le client a donné lui-même, rien d'autre (aucun texte écrit par l'IA). */
export function ficheAssistante(projectId: string): Fait[] {
  const faits: Fait[] = [];
  try {
    for (const p of listProducts(projectId)) {
      const prix = [p.data.price, ...p.variants.map((v) => (v as any).price)].filter((x): x is number => typeof x === "number");
      faits.push({ sujet: p.data.title || p.handle, texte: prix.length ? L(`prix : ${[...new Set(prix)].map((c) => (c / 100).toFixed(2).replace(".", ",")).join(" ou ")} €`, `price: ${[...new Set(prix)].map((c) => (c / 100).toFixed(2)).join(" or ")} €`) : L("prix : non donné", "price: not given") });
    }
  } catch { /* aucun catalogue */ }
  try {
    const cid = journeyDuProjet(projectId)?.cid;
    if (cid) {
      const v = ficheVue(cid, projectId);
      for (const r of v.reponses) if (r.status === "answered" && r.value.trim()) faits.push({ sujet: r.label, texte: r.value.trim() });
      for (const n of v.notes) if (n.genre === "fait" && n.value.trim()) faits.push({ sujet: n.sujet, texte: n.value.trim() });
    }
  } catch { /* aucune fiche */ }
  return faits;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
const PROMESSE = /\b(garanti\w*|je (?:vous|te) promets|promis\w*|rembours\w*|gratuit\w*|offert\w*|sans frais|des demain|sous \d+|en \d+ (?:jours?|heures?|minutes?))\b/;

/**
 * La relecture par le code : chaque nombre de la réponse doit être dans la fiche, chaque promesse aussi. Rend ce qui
 * manque (vide : la réponse peut être montrée).
 */
export function horsFiche(reponse: string, fiche: Fait[]): string[] {
  const base = norm(fiche.map((f) => `${f.sujet} ${f.texte}`).join(" | "));
  const nombres = base.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const permis = new Set(nombres.flatMap((n) => [n, n.replace(",", "."), n.replace(".", ",")]));
  const manque = [...norm(reponse).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]).filter((n) => !permis.has(n));
  const p = norm(reponse).match(PROMESSE);
  if (p && !base.includes(p[0])) manque.push(p[0]);
  return [...new Set(manque)];
}

export const ReponseSchema = z.object({ reponse: z.string().min(1).max(700), transmettre: z.boolean().default(false) });
export const ASSISTANTE_SYSTEM = `Tu es l'assistante IA du site d'un professionnel. Tu tutoies seulement si le visiteur tutoie ; sinon tu vouvoies. Tu réponds en deux ou trois phrases, uniquement avec les FAITS donnés, mot pour mot pour les prix, horaires, zones, délais et conditions. Tu n'inventes rien : aucun prix, délai, disponibilité, remise ou promesse qui ne soit pas dans les faits. Tu ne donnes aucun conseil juridique, médical ou fiscal. Si la réponse n'est pas dans les faits, tu réponds transmettre=true et tu dis que tu poses la question au professionnel. Réponse : uniquement le JSON demandé.`;

/** Remplaçable par les essais (aucun appel réel). */
export const assistanteDeps: { ecrire?: (system: string, prompt: string, usageKey: string) => Promise<unknown>; fiche?: (projectId: string) => Fait[] } = {};

function ensure() {
  run("CREATE TABLE IF NOT EXISTS assistante_echanges (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, jour TEXT NOT NULL, question TEXT NOT NULL, reponse TEXT NOT NULL, transmis INTEGER NOT NULL, created_at INTEGER NOT NULL)");
  run("CREATE INDEX IF NOT EXISTS assistante_echanges_jour ON assistante_echanges(project_id, jour)");
}

export type Echange = { reponse: string; transmettre: boolean; formulaire: boolean; badge: string; raison?: string };

/** Une question d'un visiteur. Éteinte (réglage à « 0 ») : refusée. Plafond atteint : le formulaire. Réponse hors fiche : la transmission. */
export async function repondreVisiteur(p: { id: string; userId: string; name: string }, question: string, o: { prenom?: string | null; at?: number } = {}): Promise<Echange> {
  if (!suiviAllume("assistante")) throw new Error("assistante éteinte");
  ensure();
  const at = o.at ?? now(), jour = new Date(at).toISOString().slice(0, 10), badge = L(BADGE_IA.fr, BADGE_IA.en);
  const qui = o.prenom ?? L("l'équipe", "the team");
  const transmis = (raison?: string): Echange => ({ reponse: L(`Je pose la question à ${qui}, qui te répond au plus vite. Laisse-moi ton e-mail ou ton téléphone juste en dessous.`, `I'm passing your question to ${qui}, who will answer soon. Leave your e-mail or phone below.`), transmettre: true, formulaire: true, badge, raison });
  const q = question.trim().slice(0, 600);
  if (!q) return transmis("vide");
  const n = one<{ n: number }>("SELECT COUNT(*) n FROM assistante_echanges WHERE project_id=? AND jour=?", p.id, jour)?.n ?? 0;
  if (n >= PLAFOND_JOUR) return transmis("plafond");
  const fiche = (assistanteDeps.fiche ?? ficheAssistante)(p.id);
  if (!fiche.length) return transmis("fiche vide");
  const prompt = `PROFESSIONNEL : ${p.name}\nFAITS (donnés par lui, les seuls permis) :\n${fiche.map((f) => `- ${f.sujet} : ${f.texte}`).join("\n")}\n\nQUESTION DU VISITEUR : ${q}\n\nRéponds { "reponse": "…", "transmettre": false }.`;
  const usageKey = `assistante:${p.id}:${id()}`;
  let ecrit: z.infer<typeof ReponseSchema>;
  try {
    const raw = assistanteDeps.ecrire
      ? await assistanteDeps.ecrire(ASSISTANTE_SYSTEM, prompt, usageKey)
      : await (await import("../ai/llm")).llmJson({ task: "copywriting", userId: p.userId, projectId: p.id, jobId: null, system: ASSISTANTE_SYSTEM, promptKey: "suivi-assistante-1", prompt, maxTokens: 600, usageKey, routing: { difficulty: "standard", prefer: { provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "low" } } }, ReponseSchema);
    ecrit = ReponseSchema.parse(raw);
  } catch { return transmis("erreur"); }
  const manque = ecrit.transmettre ? [] : horsFiche(ecrit.reponse, fiche);
  const out: Echange = ecrit.transmettre ? transmis("hors fiche") : manque.length ? transmis(`hors fiche : ${manque.join(", ")}`) : { reponse: ecrit.reponse.trim(), transmettre: false, formulaire: false, badge };
  run("INSERT INTO assistante_echanges(id,project_id,jour,question,reponse,transmis,created_at) VALUES(?,?,?,?,?,?,?)", id(), p.id, jour, q, out.reponse, out.transmettre ? 1 : 0, at);
  return out;
}

/** Les échanges d'un jour (pour le Studio) ; effacés avec les demandes, au bout de 12 mois. */
export function echangesDuJour(projectId: string, jour: string) {
  ensure();
  return all<{ question: string; reponse: string; transmis: number; created_at: number }>("SELECT question, reponse, transmis, created_at FROM assistante_echanges WHERE project_id=? AND jour=? ORDER BY created_at", projectId, jour);
}
export function purgerEchanges(at = now()) { ensure(); run("DELETE FROM assistante_echanges WHERE created_at < ?", at - 365 * 86_400_000); }

/**
 * La bulle du site : un petit script posé par le Studio sur les pages qu'il héberge, SEULEMENT quand l'assistante est
 * allumée. Le badge « Assistante IA » reste visible au-dessus du champ pendant toute la conversation ; le premier message
 * dit qu'elle est une IA ; « transmettre » ouvre le formulaire de contact du site.
 */
export function bulleAssistante(endpoint: string, accueil: string, badge: string): string {
  const j = (s: string) => JSON.stringify(s).replace(/</g, "\\u003c");
  return `<script data-assistante-ia>(function(){var E=${j(endpoint)},A=${j(accueil)},B=${j(badge)};var d=document,b=d.createElement("div");b.setAttribute("role","dialog");b.setAttribute("aria-label",B);b.style.cssText="position:fixed;right:16px;bottom:16px;z-index:2147483000;font:15px/1.4 system-ui,sans-serif";var o=d.createElement("button");o.type="button";o.textContent=B;o.style.cssText="padding:12px 16px;border-radius:999px;border:0;background:#111;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);margin:4px";var p=d.createElement("div");p.hidden=true;p.style.cssText="width:min(340px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#fff;color:#111;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:12px";var l=d.createElement("div"),f=d.createElement("form"),t=d.createElement("small"),i=d.createElement("input");t.textContent=B;t.style.cssText="display:block;margin:8px 0 4px;font-weight:600";i.required=true;i.maxLength=600;i.setAttribute("aria-label",B);i.style.cssText="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:10px";function m(x,me){var q=d.createElement("p");q.textContent=x;q.style.cssText="margin:6px 0;"+(me?"text-align:right;font-weight:500":"");l.appendChild(q);}m(A);f.appendChild(t);f.appendChild(i);p.appendChild(l);p.appendChild(f);o.onclick=function(){p.hidden=!p.hidden;};f.onsubmit=function(e){e.preventDefault();var q=i.value;i.value="";m(q,1);fetch(E,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q})}).then(function(r){return r.json();}).then(function(r){m(r.reponse||"");if(r.formulaire){var c=d.getElementById("contact_form")||d.querySelector("form[action='/contact']");if(c)c.scrollIntoView({behavior:"smooth"});else location.href="/pages/contact";}}).catch(function(){m(${j(L("Je n'arrive pas à répondre : écris-nous par le formulaire de contact.", "I can't answer: please use the contact form."))});});};b.appendChild(p);b.appendChild(o);d.body.appendChild(b);})();</script>`;
}
