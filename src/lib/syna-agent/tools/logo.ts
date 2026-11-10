/**
 * Étape 2 du parcours SINA (#492) : outils des 3 logos (proposer, choisir). Le dessin et le contrôle sont ceux du
 * moteur de logos V2 ; le choix applique le logo à la marque du projet (déclinaisons comprises) par chooseLogoV2.
 */
import { z } from "zod";
import { HttpError } from "../../auth";
import { enqueue, pendingJob } from "../../jobs";
import { L } from "../../i18n-server";
import { getAsset } from "../../library";
import { all } from "../../db";
import { loadProject } from "../../projects";
import { chooseLogoV2 } from "../../logo-v2/choose";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { SINA_LOGOS_JOB, logosMaxMicro, logosProbableMicro } from "../logos";
import { project } from "./common";

const KEY = z.enum(["A", "B", "C"]);

/** Plafond remplaçable par les tests (le devis réel dépend des tarifs et modèles configurés). */
export const logoToolDeps: { maxMicro?: () => number } = {};
const maxMicro = () => (logoToolDeps.maxMicro ?? logosMaxMicro)();

/** Réponses qui ne disent rien du logo (accord, boutons du fil) : jamais transmises au dessinateur. */
const BARE = /^(?:(?:oui|ok|okay|d'accord|vas-y|go|c'est parti|parfait|super|merci|top|on y va)[\s,.!]*)*(?:lance[sz]?(?: les)?(?: 3| trois)? logos?)?[\s.!]*$/i;
const BUTTONS = /^(je veux préciser une idée d'abord|je veux une nouvelle proposition|nouvelle proposition|je choisis .*|logo [abc])\.?$/i;

/**
 * Souhaits du client pour ses logos, avec SES mots : ses messages depuis le choix de l'identité (ou la dernière série),
 * sans les simples accords ni les boutons. Essai réel du 7 novembre : SINA avait écrit lui-même une consigne
 * (« slogan…, style brutaliste, capitales très grasses ») que le client n'avait jamais donnée — le logo ne reçoit
 * jamais de direction qui ne vienne pas du client.
 */
export function clientLogoWishes(conversationId: string, since: number): string | undefined {
  const texts = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='user' AND created_at>? ORDER BY seq", conversationId, since)
    .map((m) => String((JSON.parse(m.content_json) as { text?: string }).text ?? "").trim())
    // Les questions du client (« c'est combien ? ») ne sont pas des souhaits de dessin.
    .map((t) => t.split(/(?<=[.!?])\s+/).filter((x) => !/\?\s*$/.test(x)).join(" ").trim())
    .filter((t) => t && !BARE.test(t) && !BUTTONS.test(t));
  const out = texts.join(" ; ").slice(0, 1500).trim();
  return out || undefined;
}

const proposeTool: AgentTool<{ guidance?: string }> = {
  name: "logo.propose", module: "marque", kind: "generate", needsProject: true,
  description: "Étape 2 : dessine 3 logos LIBRES pour l'identité CHOISIE (son nom exact, ses couleurs) : le modèle d'images a carte blanche sur l'idée, le symbole et la typographie (décision du propriétaire), seuls le nom exact et les rendus interdits sont fixés. Chaque logo est relu et contrôlé par Claude ; un nom mal écrit est réécrit sans repayer. Payant (devis avant, en % du budget) ; tâche de fond de quelques minutes. guidance : laisse vide ; le Studio transmet lui-même au dessinateur les souhaits écrits par le client (ses mots exacts), jamais l'identité, le slogan ni un style que le client n'a pas demandé.",
  args: z.object({ guidance: z.string().max(1500).optional() }).strict(),
  estimate: () => ({ maxMicro: maxMicro(), ...(logoToolDeps.maxMicro ? {} : { probableMicro: logosProbableMicro() }), label: L("3 logos", "3 logos") }),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[1]?.status !== "done" || !j.identityChoice || !p.brand) return { ok: false, summary: L("L'identité de marque doit être choisie avant les logos (étape 1).", "Choose the brand identity first (step 1).") };
    if (j.steps[2]?.status === "done") return { ok: false, summary: L("Le logo est déjà choisi. Pour le changer, le client doit le demander clairement.", "The logo is already chosen.") };
    if (j.steps[2]?.status === "skipped") return { ok: false, summary: L("Le client garde son logo : pas de nouveaux logos.", "The client keeps their logo.") };
    // Une seule série à la fois (jamais deux séries payées en parallèle).
    if (pendingJob(p.id, SINA_LOGOS_JOB)) return { ok: false, summary: L("Les logos sont déjà en cours de dessin : attends-les.", "Logos are already being drawn.") };
    const cap = maxMicro();
    const wishes = clientLogoWishes(ctx.conversationId, Math.max(j.identityChoice.at ?? 0, j.logos?.at ?? 0));
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: SINA_LOGOS_JOB, label: L("3 logos (SINA)", "3 logos (SINA)"), payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: cap, ...(wishes ? { guidance: wishes } : {}) }, maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:logos:${(j.logos?.round ?? 0) + 1}` });
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
    if (!logo?.assetId) return { ok: false, summary: L(`Aucun logo ${a.source} dessiné pour l'instant.`, `No logo ${a.source} drawn yet.`), hint: "Lance d'abord logo.propose." };
    const asset = getAsset(logo.assetId);
    if (!asset || asset.project_id !== p.id || asset.deleted_at) throw new HttpError(404, L("Logo introuvable dans les Fichiers.", "Logo not found."));
    const before = p.brand?.logo?.assetId ?? null;
    const applied = await chooseLogoV2(null, p.id, logo.assetId);
    const after = loadProject(p.id).brand;
    const verified = !!after?.logo?.assetId && after.logo.status === "validated";
    updateJourney(ctx.conversationId, (x) => {
      x.logoChoice = { source: a.source, assetId: logo.assetId!, at: Date.now() };
      // Étape validée seulement si le logo est bien relu comme logo de la marque.
      if (verified) { setStep(x, 2, "done"); setStep(x, 3, "todo"); }
      // Nouveau logo : l'ancienne image de marque (faite avec l'autre logo) ne vaut plus.
      if (x.brandKit && x.brandKit.at < Date.now()) x.brandKit = undefined;
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
