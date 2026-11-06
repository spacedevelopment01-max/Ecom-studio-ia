/**
 * #301 « SINA complète » — option des recettes : RECETTE_PREPARE=1 rend le projet de test « préparé » (recherche acquise,
 * comme tout projet réellement construit) avec la fonction de test seedSourcedAnglesForTest, puis vérifie que la
 * conversation est bien en lecture seule pour la FICHE. Les retouches gratuites doivent alors rester disponibles
 * (contrat localEditsWritable, a593e6ea). La ligne d'historique SIMULÉE que cette fonction inscrit (provider « simulated »,
 * id « fixture_research_… ») est exclue du compte des appels IA et comptée à part.
 */
import { seedSourcedAnglesForTest } from "../tests/sourced-strategy-fixture";
import { conversationView } from "../src/lib/orchestrator/conversation";
import { one } from "../src/lib/db";
export const PREPARED = process.env.RECETTE_PREPARE === "1";
export function prepareProject(user: never, conversationId: string, projectId: string) {
  if (!PREPARED) return;
  seedSourcedAnglesForTest(projectId);
  const v = conversationView(user, conversationId);
  if (!/préparation engagée/.test(String(v.readOnlyReason))) throw Error("Projet de recette non préparé : " + v.readOnlyReason);
  if ((v as { localEditsWritable?: boolean }).localEditsWritable !== true) throw Error("localEditsWritable absent sur un projet préparé");
}
export const realAiCalls = () => one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE NOT (provider='simulated' AND id LIKE 'fixture_research_%')")!.n;
export const simulatedFixtureCalls = () => one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE provider='simulated' AND id LIKE 'fixture_research_%'")!.n;
