/**
 * Version servie, sans donnée client, chemin interne ni configuration (suivi #204).
 *  - commit : commit lu au démarrage de la construction (next build) ou du serveur de développement (next dev) ;
 *  - commitOrigin : « build » (code compilé figé) ou « dev-start » (le serveur de développement suit ensuite les
 *    fichiers du disque : le commit ne garantit plus le code servi) ;
 *  - mode : mode réellement exécuté par ce processus (production = next start, development = next dev) ;
 *  - tree : fichiers suivis sans modification locale au moment de la lecture du commit (« clean »), modifiés
 *    (« modified »), ou impossible à vérifier (« unknown ») ;
 *  - source : « compiled-build » uniquement en production, sinon « dev-server » (compatibilité des scripts existants).
 */
export function GET() {
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  const tree = process.env.STUDIO_BUILD_TREE;
  return Response.json({
    commit: process.env.STUDIO_BUILD_COMMIT || null,
    commitOrigin: mode === "production" ? "build" : "dev-start",
    mode,
    tree: tree === "clean" || tree === "modified" ? tree : "unknown",
    source: mode === "production" ? "compiled-build" : "dev-server",
  });
}
