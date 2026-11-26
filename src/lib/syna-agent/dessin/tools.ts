/**
 * Les outils de SINA pour la méthode « dessiner puis coder » (19 novembre 2026) : lancer l'accueil réfléchi, dessiné
 * puis codé (payant, une carte de prix, un accord), et montrer au client les dessins et le code affiché.
 * Rien n'est posé sur le site du client : c'est un essai de méthode, à côté de son site actuel.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { one, run as runSql } from "../../db";
import { enqueue, pendingJob, retryJob } from "../../jobs";
import type { CostEstimate } from "../types";
import type { AgentTool } from "../types";
import { project } from "../tools/common";
import { acquisMicro, RELANCE_JOURS, RefusInterne } from "../custom-theme/site-job";
import { jobSpentMicro } from "../budget";
import { dessinQuote, PHOTOS_ACCUEIL, resultatDessin, SINA_DESSIN_JOB, type DessinPayload } from "./job";

/** Une photo créée par section qui en prévoit une (décision du propriétaire du 19 novembre 2026). */
const photosACreer = (_projectId: string, _business: string) => PHOTOS_ACCUEIL;

/**
 * Le dernier accueil dessiné du projet, s'il s'est arrêté en route (essai réel du 20 novembre 2026, Braise : la machine a
 * redémarré pendant les photos ; SINA a lancé une nouvelle création, qui aurait repayé le plan et les dessins). Sans IA.
 */
export function dessinCoupe(projectId: string): { id: string; payload: DessinPayload; etapes: string[] } | null {
  const j = one<{ id: string; status: string; payload: string; finished_at: number | null; checkpoint: string | null }>("SELECT id, status, payload, finished_at, checkpoint FROM jobs WHERE project_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1", projectId, SINA_DESSIN_JOB);
  if (!j || j.status !== "failed" || !j.finished_at || Date.now() - j.finished_at > RELANCE_JOURS * 86_400_000) return null;
  // Arrêtée EN ROUTE, quelle qu'en soit la cause (coupure, appel interrompu, panne du Studio : essai réel du 20 novembre
  // 2026, le contrôle d'affichage a planté après le code) : au moins une étape est faite, donc il y a de quoi reprendre.
  const etapes = (() => { try { return Object.keys(JSON.parse(j.checkpoint ?? "{}") ?? {}); } catch { return []; } })();
  if (!etapes.length) return null;
  try { return { id: j.id, payload: JSON.parse(j.payload) as DessinPayload, etapes }; } catch { return null; }
}
/** Les étapes d'un accueil dessiné, dans l'ordre, dites simplement (pour dire au client où sa création s'est arrêtée). */
export function ouArrete(etapes: string[]): string {
  const faites = [etapes.includes("plan") && "le plan de la page", etapes.includes("juge") && "sa relecture", etapes.some((e) => e.startsWith("dessin:")) && "les dessins", etapes.includes("photos") && "les photos", etapes.includes("code") && "le code", etapes.includes("juge-code") && "la relecture du code"].filter(Boolean) as string[];
  return faites.length ? `déjà fait et gardé : ${faites.join(", ")}` : "rien de gardé";
}
/** Le prix de la reprise : celui de l'accueil, moins ce qui est payé et repris (au moins un cinquième du prix probable). */
export function repriseDessinQuote(full: CostEstimate, acquis: number): CostEstimate {
  const probable = full.probableMicro ?? full.maxMicro;
  const reste = Math.max(Math.round(probable * 0.2), probable - acquis);
  return { probableMicro: reste, maxMicro: Math.max(Math.round(reste * 1.6), full.maxMicro - acquis), label: L("la suite de ton accueil, là où sa création s'était arrêtée : ce qui était déjà fait est repris sans être repayé", "the rest of your home page, from where it stopped") };
}

type DessinArgs = { consigne?: string; relancer?: boolean };
export const dessinTool: AgentTool<DessinArgs> = {
  name: "site.dessiner", module: "site", kind: "generate", needsProject: true,
  description: "Méthode « dessiner puis coder » (PAYANT, un accord) : tu fais l'ACCUEIL du site comme les meilleures agences, en suivant ton cahier « Dessiner puis coder une page ». Tu réfléchis d'abord à toute la page (tu choisis toi-même 8 à 10 sections pour CE métier et CE client, avec leurs textes exacts), un juge relit chaque fait contre son dossier, puis la page est dessinée (ordinateur et téléphone), codée en thème Shopify responsive, et vérifiée par le Studio (contrôle de Shopify, affichage sur téléphone, tablette et ordinateur). Tâche de fond de 10 à 15 minutes. Rien n'est posé sur son site actuel. Ce que l'outil NE fait PAS (ne le promets jamais) : il ne change ni le logo ni la marque, il ne retouche pas les photos des produits, et il ne vérifie pas chaque photo créée contre le vrai produit (le juge relit les TEXTES ; le Studio vérifie l'affichage). consigne : ce que le client veut, avec ses mots. relancer:true quand la création de son accueil s'est arrêtée en route (coupure, appel interrompu) et qu'il veut la relancer : elle reprend là où elle s'était arrêtée, avec sa consigne d'alors, et ce qui était fait n'est pas repayé (la carte affiche le prix de ce qui reste) ; sans relancer:true, c'est une NOUVELLE création, qui refait et repaie tout. À la fin, montre-lui le résultat avec site.dessin.voir.",
  args: z.object({ consigne: z.string().max(1500).optional(), relancer: z.boolean().optional() }).strict(),
  estimate: (ctx, a) => {
    const p = project(ctx);
    if (a?.relancer) {
      const c = dessinCoupe(p.id);
      if (!c) throw new RefusInterne("Aucune création de l'accueil arrêtée en route à relancer (elle a réussi, ou date de plus de sept jours) : lance site.dessiner sans relancer.");
      return repriseDessinQuote(dessinQuote(photosACreer(p.id, p.business)), acquisMicro(c.id));
    }
    return dessinQuote(photosACreer(p.id, p.business));
  },
  preview: () => L("L'accueil de ton site, réfléchi, dessiné sur ordinateur et sur téléphone, puis codé et vérifié. Ton site actuel ne change pas.", "Your home page, planned, drawn, coded and checked. Your current site does not change."),
  run: (ctx, a) => {
    const p = project(ctx);
    if (!p.brand?.logo?.assetId) return { ok: false, summary: L("Il faut d'abord le logo de la marque.", "The brand logo is needed first.") };
    if (pendingJob(p.id, SINA_DESSIN_JOB)) return { ok: false, summary: L("Ton accueil est déjà en cours : attends-le.", "Already in progress.") };
    // Reprise d'une création coupée : la même tâche repart (mêmes étapes, mêmes clés : ce qui est payé est repris tel
    // quel), avec sa consigne d'alors ; seul l'appel coupé en plein milieu est renvoyé, une fois, avec cet accord.
    if (a.relancer) {
      const c = dessinCoupe(p.id);
      if (!c) return { ok: false, internal: true, summary: "Aucune création de l'accueil arrêtée en route à relancer : lance site.dessiner sans relancer." };
      const q = repriseDessinQuote(dessinQuote(photosACreer(p.id, p.business)), acquisMicro(c.id));
      const payload: DessinPayload = { ...c.payload, conversationId: ctx.conversationId, runId: ctx.runId, relance: (c.payload.relance ?? 0) + 1, capMicro: jobSpentMicro(c.id) + q.maxMicro };
      runSql("UPDATE jobs SET payload = ? WHERE id = ? AND status = 'failed'", JSON.stringify(payload), c.id);
      retryJob(c.id);
      return { ok: true, jobs: [c.id], data: {},
        summary: L("Création de ton accueil relancée, là où elle s'était arrêtée : ce qui était déjà fait est repris sans être repayé. Je reprends quand c'est prêt.", "Your home page creation was restarted from where it stopped."),
        hint: `Reprise : ${ouArrete(c.etapes)}. Dis-lui que ce qui était fait est repris sans être repayé. À la fin, montre-lui le résultat avec site.dessin.voir.` };
    }
    const q = dessinQuote(photosACreer(p.id, p.business));
    const payload: DessinPayload = { projectId: p.id, userId: ctx.user.id, conversationId: ctx.conversationId, runId: ctx.runId, capMicro: q.maxMicro, consigne: a.consigne?.trim() || null };
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: SINA_DESSIN_JOB, label: L("Ton accueil, dessiné puis codé (SINA)", "Your home page, drawn then coded"), payload, maxAttempts: 2, idempotencyKey: `syna:${ctx.runId}:dessin` });
    return { ok: true, jobs: [job.id], data: {},
      summary: L("Création de ton accueil lancée (10 à 15 minutes : je réfléchis à la page, je fais relire chaque fait, je la dessine sur ordinateur et sur téléphone, je la code, puis je vérifie l'affichage). Je reprends quand c'est prêt.", "Creating your home page."),
      hint: "À la fin de la tâche, appelle site.dessin.voir pour lui montrer les dessins et le code affiché, puis dis honnêtement ce qui est réussi et ce qui ne l'est pas (contrôle de Shopify, débordements, faits corrigés par le juge)." };
  },
};

export const dessinVoirTool: AgentTool<{ tache?: string }> = {
  name: "site.dessin.voir", module: "site", kind: "read", needsProject: true,
  description: "Montre au client le dernier accueil fait avec site.dessiner : ses dessins (ordinateur, téléphone) et le code affiché sur téléphone, tablette et ordinateur, avec le résultat des contrôles (gratuit).",
  args: z.object({ tache: z.string().max(40).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const r = resultatDessin(p.id, a.tache);
    if (!r) return { ok: false, summary: L("Aucun accueil dessiné puis codé n'est encore prêt.", "No drawn-then-coded home page yet.") };
    const c = r.controle, boutique = p.business !== "services", defauts = c.captures.filter((x) => x.debordement || x.horsEcran.length || x.manquantes || (boutique && x.panier === false) || (!boutique && x.panier === true) || x.produitsAbsents?.length || x.photosRecadrees?.length);
    return { ok: true, data: { images: r.images, idee: r.plan.idee, sections: r.plan.sections, juge: r.juge, controle: { erreursShopify: c.erreurs, avertissements: c.avertissements, exemples: c.exemples, affichage: c.captures.map((x) => ({ appareil: x.appareil, debordement: x.debordement, horsEcran: x.horsEcran, imagesManquantes: x.manquantes, photosTropRecadrees: x.photosRecadrees ?? [], ...(boutique ? { panierDansEnTete: x.panier !== false, produitsAbsents: x.produitsAbsents ?? [] } : { panierEnTropDansEnTete: x.panier === true }) })) }, notes: r.notes },
      hint: "Les dessins et le code affiché (téléphone, ordinateur) te sont joints : regarde-les toi-même avant d'en parler, et dis franchement ce qui ne va pas (photo qui coupe le sujet, texte illisible, élément qui gêne, phrase qui promet ce que le client ne fait pas).",
      summary: L(`Ton accueil : ${r.plan.sections.length} sections (${r.plan.sections.join(", ")}). Contrôle de Shopify : ${c.erreurs ? `${c.erreurs} erreur(s)` : "aucune erreur"}. ${r.photosRefusees?.length ? `Photos refusées au contrôle de fidélité (vraie photo posée à la place) : ${r.photosRefusees.length}. ` : ""}Affichage : ${defauts.length ? `à revoir sur ${defauts.map((x) => x.appareil).join(", ")}` : "rien ne déborde sur téléphone, tablette et ordinateur"}.`, "Your home page.") };
  },
};

export const dessinTools: AgentTool[] = [dessinTool, dessinVoirTool];
