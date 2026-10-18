import { analyzeLocally } from "@/lib/preparation/brief";
/** Fournisseurs/visuels synthétiques : aucune valeur créative ni coût réel démontré. */
import type { DirectionIdentity, CompleteDirection } from "@/lib/logo-v2/direction-series";
import type { Input, Contents } from "@/lib/preparation/types";
import type { z } from "zod";
import type { EditorialSchema } from "@/lib/preparation/editorial";
import { localBrand } from "@/lib/engine/local";
import { loadProject, saveBrand, saveStrategy, saveProduct, saveServices } from "@/lib/projects";
import { localTerritories } from "@/lib/logo-v2/territories";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { simulatedDependencies, syntheticAsset } from "./preparation-fixtures";
import { JobContext, enqueue } from "@/lib/jobs";
export function directionIdentity(i = 0): DirectionIdentity {
  return {
    signature: ["Le détail, au quotidien.", "Une approche claire.", "La matière prend place."][i % 3],
    palette: { primary: ["#28504a", "#483d68", "#614024"][i % 3], secondary: "#e3ddcc", accent: "#b47b42", light: "#fcfaf5", dark: "#171f20" },
    colorRoles: { primary: "Signature et titres", secondary: "Surfaces secondaires", accent: "Accent ponctuel", light: "Fond de lecture", dark: "Texte à contraste élevé" },
    fonts: { heading: ["jost_n6", "playfair_display_n6", "montserrat_n6"][i % 3], body: "inter_n4" },
    tone: { voice: ["Précis et direct", "Éditorial et posé", "Chaleureux et concret"][i % 3], do: ["Décrire les faits connus"], dont: ["Inventer une garantie"] },
    mood: ["Lumière diffuse, gestes simples", "Plans graphiques et espace", "Textures et lumière latérale"][i % 3],
    graphicLanguage: ["Traits nets et grilles aérées", "Contraste de tailles et marges", "Formes organiques et aplats"][i % 3],
    rules: ["Conserver une zone calme autour du logo", "Un seul style de traits"], sampleText: "Découvrez l’offre et ses caractéristiques confirmées.",
  };
}
export function validatedBrand(pid: string, input?: Input) {
  if (input) { const b = analyzeLocally(input); saveProduct(pid, b.profile); saveServices(pid, b.services); }
  const p = loadProject(pid), brand = localBrand(p.product, p.name, p).brand;
  brand.nameStatus = "validated"; brand.validated = ["name"];
  saveBrand(pid, brand);
  saveStrategy(pid, { audience: [{ label: "Public déclaré", needs: [], objections: [] }], angles: [{ title: "Usage", idea: "Présenter les caractéristiques déclarées" }], pillars: [], keyMessages: [], generatedBy: "local" });
  return brand;
}
export async function syntheticDirections(pid: string) {
  const p = loadProject(pid), territories = localTerritories(brandDiscovery(p)).slice(0, 3).map((t, i) => ({ ...t, id: `t${i + 1}`, source: "ai" as const, symbolIdea: t.symbolIdea ?? null, identity: directionIdentity(i) }));
  const directions: CompleteDirection[] = [];
  for (const [i, territory] of territories.entries()) directions.push({ id: territory.id, logoId: await syntheticAsset(pid, `logo-v2-${i}`), label: territory.name, concept: territory.concept, territory, identity: territory.identity!, version: 1 });
  return { territories, directions };
}
export async function editorialFixture(pid: string): Promise<{ content: Contents; out: z.infer<typeof EditorialSchema> }> {
  const p = loadProject(pid);
  const ctx = new JobContext(enqueue({ userId: p.userId, projectId: pid, type: "project.prepare", payload: {}, maxAttempts: 1 }));
  const content = await simulatedDependencies.contents(p, ctx, false);
  // Un vrai bloc distinct par section ; tous les blocs édités sont conservés dans l'affectation.
  for (const doc of content.documents) {
    const page = content.pages.find(pg => pg.key === doc.doc.page.key)!;
    doc.doc.blocks = page.sections.map((section, i) => ({ id: `${page.key}-${section.key}`, kind: i === 0 ? "h1" : "p", text: `${section.purpose}. Texte de test complet ${"conservé sans coupe ".repeat(80)}FIN-${section.key}` }));
  }
  return { content, out: {
    copy: content.copy,
    missing: [],
    slots: content.slots.map((s, i) => ({ key: s.key, pageKey: s.pageKey, sectionKey: s.sectionKey, scene: `Composition distincte ${i + 1} : sujet, cadrage et lumière pour ${s.purpose}`, queries: ["activité objet", "usage contexte"], caption: "Proposition à contrôler", alt: "Description à contrôler", rationale: "En rapport avec la section prévue" })),
    blocks: content.pages.flatMap(pg => pg.sections.map(section => ({ pageKey: pg.key, sectionKey: section.key, objective: section.purpose, message: "Information liée aux faits déclarés", docKey: content.documents.find(d => d.doc.page.key === pg.key)!.docKey, blockIds: [`${pg.key}-${section.key}`], mediaSlotKeys: content.slots.filter(s => s.pageKey === pg.key && s.sectionKey === section.key).map(s => s.key), rationale: "Présenter la même information que le média adjacent" }))),
    recommendation: { recommendedId: "atelier", reasons: ["Composition présente dans le catalogue et adaptée au contenu"], alternatives: [{ id: "clinique", reasons: ["Autre composition disponible"] }] },
  } };
}
