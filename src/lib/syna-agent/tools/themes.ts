/**
 * Étape 6 du parcours SINA (#492) : outils du volet « un de nos thèmes » (gratuits, sans IA). theme.propose AFFICHE les
 * cartes (site du client composé dans chaque thème, démonstration complète) ; theme.choose applique le choix DU CLIENT
 * par la même tâche que « Choisir ce thème » de la galerie (une seule tâche même en double demande).
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { themeChoices } from "../themes";
import { project } from "./common";
import { enqueue, pendingJob } from "../../jobs";
import { currentTheme } from "../../projects";
import { assertStrategyChosen, defaultStrategy } from "../../marketing-strategy";
import { assertThemeAllowed } from "../../plan-gates";
import { blockers, stateOf } from "../../preparation/engine";
import { ACTIVE_THEMES } from "../../theme/theme-fit";
import { DIRECTIONS } from "../../theme/directions";

const proposeTool: AgentTool<{ all?: boolean }> = {
  name: "theme.propose", module: "site", kind: "read", needsProject: true,
  description: "Étape 6, volet « un de nos thèmes » (gratuit) : AFFICHE au client des cartes de thèmes du catalogue, chacune avec SON site composé dans ce thème, la raison du choix, le lien vers la démonstration complète et ce que son forfait inclut. Trois thèmes (le recommandé d'abord) ; all: true pour tout le catalogue quand le client veut tout voir.",
  args: z.object({ all: z.boolean().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité complète (étape 5) doit être validée avant le choix du thème.", "Validate step 5 first.") };
    const themes = themeChoices(p.id, !!a.all);
    updateJourney(ctx.conversationId, (x) => { x.themes = themes; if (x.steps[6]?.status !== "done") setStep(x, 6, "review"); });
    const rec = themes.list.find((t) => t.recommended);
    return {
      ok: true,
      summary: L(`${themes.list.length} thème(s) affiché(s) avec ton site : ${themes.list.map((t) => `« ${t.name} »`).join(", ")}.${rec ? ` Recommandé : « ${rec.name} ».` : ""}`, "Themes shown."),
      hint: `Identifiants pour theme.choose : ${themes.list.map((t) => `${t.id} = « ${t.name} »${t.allowed ? "" : " (NON inclus dans son forfait)"}`).join(" ; ")}. Catalogue complet : ${ACTIVE_THEMES.length} thèmes (theme.propose all: true).`,
      data: { themes: themes.list.map((t) => ({ id: t.id, nom: t.name, pourquoi: t.why, inclus: t.allowed, demo: t.demo })), recommande: themes.recommendedId, type: themes.kind },
    };
  },
};

const chooseTool: AgentTool<{ id: string }> = {
  name: "theme.choose", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 : applique le thème CHOISI PAR LE CLIENT (jamais à sa place ; identifiant d'une carte de theme.propose) : la boutique se compose dans ce thème avec sa marque, ses produits et ses textes (gratuit, sans IA ; l'ancienne version reste restaurable). Ouvre l'étape 8 (le thème adapté). Tâche de fond : relis son résultat.",
  args: z.object({ id: z.string().min(1).max(60) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[5]?.status !== "done") return { ok: false, summary: L("L'activité complète (étape 5) doit être validée avant le choix du thème.", "Validate step 5 first.") };
    if (!(ACTIVE_THEMES as readonly string[]).includes(a.id)) return { ok: false, internal: true, summary: `Thème inconnu ou retiré du catalogue : ${a.id}. Thèmes proposés : ${ACTIVE_THEMES.join(", ")}.` };
    if (!p.brand) return { ok: false, summary: L("La marque doit être créée avant la boutique.", "The brand must be created first.") };
    // Le parcours SINA remplace la préparation du Pilote : la marque est faite aux étapes 1 à 3, les textes et visuels
    // du site viennent à l'étape 8. Seule une préparation encore en cours bloque (jamais deux tâches sur le projet).
    if (stateOf(p.id)?.pending && blockers(p.id).some((b) => /en cours|in progress/.test(b))) return { ok: false, summary: L("Une préparation du projet est encore en cours : le thème sera composé quand elle sera finie.", "A preparation is still running.") };
    const name = DIRECTIONS.find((d) => d.id === a.id)?.name ?? a.id;
    try { assertStrategyChosen(p.id); assertThemeAllowed(p.id, a.id, currentTheme(p.id)?.spec.direction ?? null); }
    catch (e) { return { ok: false, summary: (e as Error).message }; }
    const strategyVersion = defaultStrategy(p.id)?.id ?? null;
    // Même tâche que « Choisir ce thème » de la galerie : jamais une seconde en cas de double demande.
    const job = pendingJob(p.id, "shop.direction", { direction: a.id, strategyVersion })
      ?? enqueue({ userId: ctx.user.id, projectId: p.id, type: "shop.direction", idempotencyKey: `theme:${currentTheme(p.id)?.version.id ?? "initial"}:${strategyVersion}:${a.id}`, label: L(`Direction ${name}`, `${name} direction`), payload: { projectId: p.id, direction: a.id, strategyVersion } });
    if (["failed", "cancelled"].includes(job.status)) return { ok: false, summary: L("La composition précédente dans ce thème a échoué : elle est gardée dans le suivi des tâches pour en voir la cause.", "The previous attempt failed."), hint: "Dis-le au client simplement ; ne relance rien sans sa demande." };
    updateJourney(ctx.conversationId, (x) => {
      x.themeChoice = { id: a.id, jobId: job.id, at: Date.now() };
      setStep(x, 6, "done");
      setStep(x, 7, "skipped", L("Un de nos thèmes a été choisi : pas de site codé d'après une maquette.", "One of our themes was chosen."));
      setStep(x, 8, "doing");
    });
    return {
      ok: true, jobs: [job.id],
      summary: L(`Thème « ${name} » choisi : ta boutique se compose avec ta marque, tes produits et tes textes. L'ancienne version reste restaurable.`, `${name} theme chosen.`),
      changes: [{ module: "site", object: L("thème de la boutique", "store theme"), summary: name, after: a.id, verified: true }],
    };
  },
};

export const themeTools: AgentTool[] = [proposeTool, chooseTool];
