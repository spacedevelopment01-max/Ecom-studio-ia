/**
 * Choix de la famille de sections (consigne du propriétaire du 9 novembre 2026) : SINA montre au client, EN IMAGE,
 * la famille « Classique » et la famille « Moderne » (styles Sport chic et Streetwear néon), et lui demande laquelle il
 * préfère ; le thème n'est ensuite monté qu'avec les sections de cette famille. Gratuit, sans IA, jamais à sa place.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { familyCards, loadFamilyChoice, saveFamilyChoice, SECTION_FAMILIES, type FamilyId, type StyleId } from "../section-families";
import { journeyOf, updateJourney } from "../journey";
import { project } from "./common";

const showTool: AgentTool<Record<string, never>> = {
  name: "theme.families", module: "site", kind: "read", needsProject: true,
  description: "Étape 6 (gratuit) : AFFICHE au client les familles de sections EN IMAGE (Classique ; Moderne · Sport chic ; Moderne · Streetwear néon) et lui demande laquelle il préfère, AVANT de proposer un thème ou une maquette. Les familles ne se mélangent jamais. Recommande d'après sa marque (personnalité, angle, métier) sans choisir à sa place.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const cards = familyCards();
    const current = loadFamilyChoice(p.id);
    updateJourney(ctx.conversationId, (x) => { x.families = { cards, chosen: current ? `${current.family}:${current.style}` : null }; });
    return {
      ok: true,
      summary: L(`Familles affichées en image : ${cards.map((c) => `« ${c.title} »`).join(", ")}.`, "Section families shown."),
      hint: `Demande au client laquelle il préfère, puis theme.family avec family (classique | moderne) et style (classique | sport-chic | streetwear-neon). Pour recommander : Classique convient aux ${SECTION_FAMILIES[0].fits} ; Moderne aux ${SECTION_FAMILIES[1].fits}. Ne choisis jamais à sa place.`,
      data: { familles: cards.map((c) => ({ famille: c.family, style: c.style, titre: c.title, ambiance: c.mood, sections: c.sections })), choisi: current },
    };
  },
};

const chooseTool: AgentTool<{ family: FamilyId; style?: StyleId | "classique" }> = {
  name: "theme.family", module: "site", kind: "write", needsProject: true,
  description: "Étape 6 (gratuit) : enregistre la famille de sections CHOISIE PAR LE CLIENT (après theme.families) : family « classique » ou « moderne », style « sport-chic » ou « streetwear-neon » pour Moderne. Les maquettes en code et le montage du thème n'utilisent ensuite QUE les sections de cette famille, aux couleurs de sa marque.",
  args: z.object({ family: z.enum(["classique", "moderne"]), style: z.enum(["classique", "sport-chic", "streetwear-neon"]).optional() }).strict(),
  preview: (_ctx, a) => `Famille choisie : ${a.family}${a.style ? ` · ${a.style}` : ""}.`,
  run: (ctx, a) => {
    const p = project(ctx);
    const before = loadFamilyChoice(p.id);
    const after = saveFamilyChoice(p.id, a);
    const verified = JSON.stringify(loadFamilyChoice(p.id)) === JSON.stringify(after);
    const j = journeyOf(ctx.conversationId);
    if (j.families) updateJourney(ctx.conversationId, (x) => { if (x.families) x.families.chosen = `${after.family}:${after.style}`; });
    const name = after.family === "classique" ? "Classique" : `Moderne · ${after.style === "sport-chic" ? "Sport chic" : "Streetwear néon"}`;
    return {
      ok: true,
      summary: L(`Famille « ${name} » enregistrée : le thème sera monté uniquement avec ses sections, aux couleurs de la marque.`, `Family “${name}” saved.`),
      hint: "Continue l'étape 6 (thème du Studio ou maquettes en code) : la consigne de la famille est ajoutée d'elle-même aux maquettes.",
      changes: [{ module: "site", object: "famille de sections", summary: L(`famille ${name}`, `family ${name}`), before, after, verified }],
    };
  },
};

export const familyTools: AgentTool[] = [showTool, chooseTool];
