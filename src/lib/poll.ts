/**
 * Rafraîchissement périodique d'une donnée de l'interface, UNE requête à la fois : un tour est sauté tant que la
 * précédente n'a pas répondu (onglet masqué : rien n'est envoyé). Avant, un `setInterval` relançait la requête
 * toutes les 3 s même si le serveur mettait 15 à 20 s à répondre (compilation, machine chargée) : les requêtes
 * s'empilaient (jusqu'à 7 en vol par écran) et ralentissaient encore le serveur.
 */
export function startPolling(load: () => Promise<unknown>, everyMs: number, visible: () => boolean = () => true): { stop: () => void; inFlight: () => boolean } {
  let busy = false;
  let stopped = false;
  const tick = async () => {
    if (stopped || busy || !visible()) return;
    busy = true;
    try {
      await load();
    } catch {
      // L'erreur est déjà remontée par `load` (affichage) ; le tour suivant réessaie.
    } finally {
      busy = false;
    }
  };
  const t = setInterval(tick, everyMs);
  return { stop: () => ((stopped = true), clearInterval(t)), inFlight: () => busy };
}
