/**
 * Choix de la famille de sections (consignes du propriétaire du 9 novembre 2026) : SINA montre au client, EN IMAGE,
 * la famille « Classique » et la famille « Moderne », et lui demande laquelle il préfère ; c'est son SEUL choix : SINA
 * prend ensuite les meilleures sections de cette famille pour son produit ou son service et monte toutes les pages.
 * Gratuit, sans IA, jamais à sa place.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { familyCards, loadFamilyChoice, saveAmbiance, saveFamilyChoice, SECTION_FAMILIES, type FamilyId, type SiteAmbiance, type StyleId } from "../section-families";
import { journeyOf, updateJourney } from "../journey";
import { project } from "./common";

const showTool: AgentTool<Record<string, never>> = {
  name: "theme.families", module: "site", kind: "read", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (gratuit) : AFFICHE au client les deux familles de sections EN IMAGE (aperçu de chacune, Classique et Moderne, avec leurs exemples à ouvrir en vrai) et lui demande laquelle il préfère ; à appeler AVANT chaque question sur la famille, même s'il revient sur son choix. C'est son seul choix : tu montes ensuite le thème de A à Z avec les meilleures sections de cette famille pour son produit ou son service. Les familles ne se mélangent jamais. Recommande d'après son produit, sa marque et son angle, sans choisir à sa place.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const cards = familyCards();
    const current = loadFamilyChoice(p.id);
    updateJourney(ctx.conversationId, (x) => { x.families = { cards, chosen: current ? `${current.family}:${current.style}` : null }; });
    return {
      ok: true,
      summary: L(`Familles affichées en image : ${cards.map((c) => `« ${c.title} »`).join(", ")}.`, "Section families shown."),
      hint: `${p.business === "services" ? "ENTREPRISE DE SERVICES : dis-lui honnêtement que la famille Moderne n'a pas encore de sections de prestations, de prise de rendez-vous ni de demande de devis (elles existent dans la Classique) ; s'il la choisit quand même, ces pages seront montées avec des sections plus générales. " : ""}Demande au client, en une question à deux choix (Classique, Moderne), laquelle il préfère, puis theme.family avec SA famille. Pour recommander : Classique convient aux ${SECTION_FAMILIES[0].fits} ; Moderne aux ${SECTION_FAMILIES[1].fits}. Ne choisis jamais à sa place ; ne lui demande pas de style (Sport chic et Streetwear néon ne sont que des exemples).`,
      data: { familles: cards.map((c) => ({ famille: c.family, style: c.style, titre: c.title, ambiance: c.mood, sections: c.sections })), choisi: current },
    };
  },
};

const chooseTool: AgentTool<{ family: FamilyId; style?: StyleId | "classique" }> = {
  name: "theme.family", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : enregistre la famille de sections CHOISIE PAR LE CLIENT (après theme.families) : family « classique » ou « moderne ». style (Moderne seulement, jamais demandé au client) : « sport-chic » (lumineux, solaire) ou « streetwear-neon » (nocturne, urbain), choisi par TOI d'après sa marque, pour la direction artistique des photos. Le montage du thème n'utilise ensuite QUE les sections de cette famille, aux couleurs de sa marque.",
  args: z.object({ family: z.enum(["classique", "moderne"]), style: z.enum(["classique", "sport-chic", "streetwear-neon"]).optional() }).strict(),
  preview: (_ctx, a) => `Famille choisie : ${a.family}${a.style ? ` · ${a.style}` : ""}.`,
  run: (ctx, a) => {
    const p = project(ctx);
    const before = loadFamilyChoice(p.id);
    const after = saveFamilyChoice(p.id, a);
    const verified = JSON.stringify(loadFamilyChoice(p.id)) === JSON.stringify(after);
    const j = journeyOf(ctx.conversationId);
    if (j.families) updateJourney(ctx.conversationId, (x) => { if (x.families) x.families.chosen = `${after.family}:${after.style}`; });
    const name = after.family === "classique" ? "Classique" : "Moderne";
    return {
      ok: true,
      summary: L(`Famille « ${name} » enregistrée : le thème sera monté uniquement avec ses sections, aux couleurs de la marque.`, `Family “${name}” saved.`),
      hint: "Continue l'étape 6 : demande-lui l'ambiance de son site, en une question à deux choix (« Ton site plutôt sombre ou plutôt clair ? »), puis theme.ambiance avec SA réponse ; ensuite custom.concepts (deux concepts d'accueil et de fiche produit complètement différents, payant : carte d'accord).",
      changes: [{ module: "site", object: "famille de sections", summary: L(`famille ${name}`, `family ${name}`), before, after, verified }],
    };
  },
};

const ambianceTool: AgentTool<{ ambiance: SiteAmbiance }> = {
  name: "theme.ambiance", module: "site", kind: "write", needsProject: true,
  description: "Étape 6, THÈME SUR MESURE (gratuit) : enregistre l'AMBIANCE choisie par le client, après sa famille : « sombre » ou « clair » (demande-la-lui en une question à deux choix, jamais à sa place). Gardée pour toute la conception : SINA choisit des sections dont le fond d'origine convient (aucune section n'est inversée).",
  args: z.object({ ambiance: z.enum(["clair", "sombre"]) }).strict(),
  preview: (_ctx, a) => `Ambiance choisie : ${a.ambiance}.`,
  run: (ctx, a) => {
    const p = project(ctx);
    const before = loadFamilyChoice(p.id);
    let after;
    try { after = saveAmbiance(p.id, a.ambiance); } catch (e) { return { ok: false, summary: (e as Error).message, hint: "Montre d'abord les familles (theme.families) et enregistre SON choix (theme.family)." }; }
    return {
      ok: true,
      summary: L(`Ambiance « ${a.ambiance === "clair" ? "claire" : "sombre"} » enregistrée pour tout le site.`, `Ambiance “${a.ambiance}” saved.`),
      hint: "Continue : custom.concepts conçoit DEUX concepts complètement différents (accueil et fiche produit), payant avec carte d'accord ; le client choisit, puis custom.concept monte tout le site sur le concept choisi.",
      changes: [{ module: "site", object: "ambiance du site", summary: a.ambiance, before: before?.ambiance ?? null, after: after.ambiance, verified: loadFamilyChoice(p.id)?.ambiance === a.ambiance }],
    };
  },
};

export const familyTools: AgentTool[] = [showTool, chooseTool, ambianceTool];
