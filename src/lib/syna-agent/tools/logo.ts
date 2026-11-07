/**
 * Étape 2 du parcours SINA (#492) : outils des 3 logos (proposer, choisir). Le dessin et le contrôle sont ceux du
 * moteur de logos V2 ; le choix applique le logo à la marque du projet (déclinaisons comprises) par chooseLogoV2.
 */
import { z } from "zod";
import { HttpError } from "../../auth";
import { enqueue } from "../../jobs";
import { L } from "../../i18n-server";
import { getAsset } from "../../library";
import { loadProject } from "../../projects";
import { chooseLogoV2 } from "../../logo-v2/choose";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { SINA_LOGOS_JOB, logosMaxMicro } from "../logos";
import { project } from "./common";

const KEY = z.enum(["A", "B", "C"]);

/** Plafond remplaçable par les tests (le devis réel dépend des tarifs et modèles configurés). */
export const logoToolDeps: { maxMicro?: () => number } = {};
const maxMicro = () => (logoToolDeps.maxMicro ?? logosMaxMicro)();

const proposeTool: AgentTool<{ guidance?: string }> = {
  name: "logo.propose", module: "marque", kind: "generate", needsProject: true,
  description: "Étape 2 : dessine 3 logos de 3 styles différents pour l'identité CHOISIE (son nom exact, sa palette, ses polices), un par idée de logo des 3 identités de l'étape 1, adaptée à l'identité choisie. Chaque logo est relu et contrôlé par Claude ; un nom mal écrit est réécrit sans repayer ; un logo jugé insuffisant est redessiné par le modèle de relais. Payant (devis avant, en % du budget) ; tâche de fond de quelques minutes. guidance = ce que le client veut (ses mots) pour une nouvelle proposition.",
  args: z.object({ guidance: z.string().max(1500).optional() }).strict(),
  estimate: () => ({ maxMicro: maxMicro(), label: L("3 logos", "3 logos") }),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[1]?.status !== "done" || !j.identityChoice || !p.brand) return { ok: false, summary: L("L'identité de marque doit être choisie avant les logos (étape 1).", "Choose the brand identity first (step 1).") };
    if (j.steps[2]?.status === "done") return { ok: false, summary: L("Le logo est déjà choisi. Pour le changer, le client doit le demander clairement.", "The logo is already chosen.") };
    if (j.steps[2]?.status === "skipped") return { ok: false, summary: L("Le client garde son logo : pas de nouveaux logos.", "The client keeps their logo.") };
    const cap = maxMicro();
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: SINA_LOGOS_JOB, label: L("3 logos (SINA)", "3 logos (SINA)"), payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: cap, ...(a.guidance ? { guidance: a.guidance } : {}) }, maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:logos:${(j.logos?.round ?? 0) + 1}` });
    updateJourney(ctx.conversationId, (x) => setStep(x, 2, "doing"));
    return { ok: true, summary: L("Dessin des 3 logos lancé (quelques minutes) ; SINA reprend quand ils sont prêts.", "Drawing the 3 logos (a few minutes)."), jobs: [job.id], data: { plafondMicro: cap } };
  },
};

const chooseTool: AgentTool<{ source: "A" | "B" | "C" }> = {
  name: "logo.choose", module: "marque", kind: "write", needsProject: true,
  description: "Étape 2 : enregistre le logo choisi PAR LE CLIENT (jamais à sa place) : il devient le logo de la marque (déclinaisons sur fond sombre, une couleur, petite taille) et l'étape 2 est validée. source = A, B ou C (logo affiché dans le fil). Un logo non validé par le contrôle peut être choisi si le client le veut, en le lui disant. Gratuit.",
  args: z.object({ source: KEY }).strict(),
  run: async (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const logo = j.logos?.list.find((x) => x.source === a.source);
    if (!logo?.assetId) return { ok: false, summary: L(`Aucun logo ${a.source} dessiné : lance d'abord logo.propose.`, `No logo ${a.source} drawn yet.`) };
    const asset = getAsset(logo.assetId);
    if (!asset || asset.project_id !== p.id || asset.deleted_at) throw new HttpError(404, L("Logo introuvable dans les Fichiers.", "Logo not found."));
    const before = p.brand?.logo?.assetId ?? null;
    const applied = await chooseLogoV2(null, p.id, logo.assetId);
    const after = loadProject(p.id).brand;
    const verified = !!after?.logo?.assetId && after.logo.status === "validated";
    updateJourney(ctx.conversationId, (x) => {
      x.logoChoice = { source: a.source, assetId: logo.assetId!, at: Date.now() };
      setStep(x, 2, "done");
      setStep(x, 3, "todo");
    });
    return {
      ok: verified,
      summary: verified
        ? L(`Logo ${a.source} « ${logo.name} » enregistré comme logo de ta marque${logo.verdict === "FINAL" ? "" : " (choisi par toi, non validé par le contrôle)"}. Étape 2 validée. Prochaine étape : l'image de marque complète.`, `Logo ${a.source} saved as your brand logo.`)
        : L("Le logo n'a pas pu être relu après l'enregistrement.", "The logo could not be verified."),
      data: { logo: { source: a.source, name: logo.name, verdict: logo.verdict }, principal: applied.main },
      changes: [{ module: "marque", object: "logo", summary: `${logo.name} (${a.source})`, before, after: after?.logo?.assetId ?? null, verified }],
    };
  },
};

export const logoTools: AgentTool[] = [proposeTool, chooseTool];
