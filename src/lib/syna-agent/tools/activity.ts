/**
 * Étape 5 du parcours SINA (#492) : outils de l'activité complète (plan, coordonnées, validation). Gratuits. Les
 * produits se créent avec catalogue.create (onglet Produits du Studio), après accord du client sur la liste et les prix.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { activityGaps, activityPlan, companyLater, companyNone, saveCompany, COMPANY_FIELDS } from "../activity";
import { project } from "./common";

const planTool: AgentTool<Record<string, never>> = {
  name: "activity.plan", module: "activité", kind: "read", needsProject: true,
  description: "Étape 5 : prépare et AFFICHE au client le plan de son activité (gratuit) : fiche de l'entreprise, angle principal et sa stratégie (accroche, messages clés, objections et réponses tirés de la recherche), offre et prix confirmés, produits de l'onglet Produits. Renvoie ce qui manque (questions à poser une par une). À rappeler après chaque réponse ou création de produit pour mettre la carte à jour.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[4]?.status !== "done") return { ok: false, summary: L("L'angle marketing (étape 4) doit être choisi avant l'activité complète.", "Choose the angle first (step 4).") };
    const plan = activityPlan(p.id, j);
    const gaps = activityGaps(plan);
    updateJourney(ctx.conversationId, (x) => { x.activity = plan; if (x.steps[5]?.status !== "done") setStep(x, 5, gaps.length ? "doing" : "review"); });
    return {
      ok: true,
      summary: gaps.length
        // La carte affiche déjà ce qui manque : la ligne d'état ne le répète pas (le détail va à SINA).
        ? L("Plan de l'activité affiché.", "Activity plan shown, gaps remain.")
        : L("Plan de l'activité complet et affiché.", "Activity plan complete."),
      hint: gaps.length
        ? `Encore à compléter : ${gaps.join(" ; ")}. Questions à poser au client, UNE par UNE : ${plan.missing.map((m) => `[${m.key}${m.required ? "" : ", facultatif"}] ${m.question}`).join(" | ") || "aucune"}.`
        : "Demande au client s'il valide son activité (activity.validate).",
      data: { manque: gaps, questions: plan.missing, produits: plan.products, prix: plan.offer.price, angle: plan.angle?.title ?? null },
    };
  },
};

const companyTool: AgentTool<{ fields?: Record<string, string | undefined>; later?: string[]; none?: string[] }> = {
  name: "activity.company", module: "activité", kind: "write", needsProject: true,
  description: `Étape 5 : enregistre les coordonnées de l'entreprise données PAR LE CLIENT, recopiées MOT POUR MOT (rien d'ajouté : ni précision entre parenthèses, ni statut, ni reformulation ; essai réel : « Camille Martin, EI » enregistré « Camille Martin, EI (micro-entrepreneuse) ») (champs : ${COMPANY_FIELDS.map((f) => `${f.key} = ${f.label}`).join(", ")}). later = champs facultatifs qu'il préfère donner plus tard (jamais un champ obligatoire) ; none = champs facultatifs qu'il ne veut PAS sur le site (« pas de téléphone »), à ne plus demander. Rien n'est inventé. Gratuit.`,
  args: z.object({ fields: z.object(Object.fromEntries(COMPANY_FIELDS.map((f) => [f.key, z.string().min(1).max(600).optional()])) as Record<string, z.ZodOptional<z.ZodString>>).strict().optional(), later: z.array(z.enum(COMPANY_FIELDS.map((f) => f.key) as [string, ...string[]])).max(7).optional(), none: z.array(z.enum(COMPANY_FIELDS.map((f) => f.key) as [string, ...string[]])).max(7).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const saved = a.fields ? saveCompany(p.id, a.fields as any) : null;
    // Libellés du client (essai réel du 7 novembre : « legalName, email » affiché tel quel).
    // Minuscule en tête de phrase seulement, jamais sur un sigle (« SIRET »).
    const label = (k: string) => (COMPANY_FIELDS.find((f) => f.key === k)?.label ?? k).replace(/^(\p{Lu})(?!\p{Lu})/u, (c) => c.toLocaleLowerCase("fr-FR"));
    const postponed = a.later?.length ? companyLater(p.id, a.later as any) : [];
    const declined = a.none?.length ? companyNone(p.id, a.none as any) : [];
    const refused = [...(a.later ?? []).filter((k) => !postponed.includes(k as any)), ...(a.none ?? []).filter((k) => !declined.includes(k as any))];
    return {
      ok: !refused.length,
      summary: L(`${[Object.keys(a.fields ?? {}).length ? `Coordonnées enregistrées : ${Object.keys(a.fields ?? {}).map(label).join(", ")}` : "", postponed.length ? `à donner plus tard : ${postponed.map(label).join(", ")}` : "", declined.length ? `pas sur le site (ton choix) : ${declined.map(label).join(", ")}` : ""].filter(Boolean).join(" ; ").replace(/^./, (c) => c.toUpperCase()) || "Rien d'enregistré"}${refused.length ? ` ; impossible (obligatoire pour le site) : ${refused.map(label).join(", ")}` : ""}.`, "Company details saved."), hint: "Rappelle activity.plan pour mettre la carte à jour.",
      changes: Object.entries(a.fields ?? {}).filter((e): e is [string, string] => typeof e[1] === "string").map(([k, v]) => ({ module: "activité", object: COMPANY_FIELDS.find((f) => f.key === k)!.label, summary: v, after: saved?.[k as keyof typeof saved] ?? null, verified: saved?.[k as keyof typeof saved] === v.trim() })),
    };
  },
};

const validateTool: AgentTool<Record<string, never>> = {
  name: "activity.validate", module: "activité", kind: "write", needsProject: true,
  description: "Étape 5 : enregistre la validation du plan de l'activité PAR LE CLIENT (jamais à sa place). Refusé s'il manque une coordonnée obligatoire, un produit ou un prix : dis-le au client. Ouvre l'étape 6 (thème ou maquettes). Gratuit.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const plan = activityPlan(p.id, j);
    const gaps = activityGaps(plan);
    if (gaps.length) return { ok: false, summary: L(`Impossible de valider : ${gaps.join(" ; ")}.`, "Cannot validate yet.") };
    updateJourney(ctx.conversationId, (x) => { x.activity = plan; setStep(x, 5, "done"); setStep(x, 6, "todo"); });
    return { ok: true, summary: L("Activité complète validée. Étape 5 terminée. Prochaine étape : le thème ou les maquettes du site.", "Activity validated."), changes: [{ module: "activité", object: L("plan de l'activité", "activity plan"), summary: L("validé par le client", "validated"), verified: true }] };
  },
};

export const activityTools: AgentTool[] = [planTool, companyTool, validateTool];
