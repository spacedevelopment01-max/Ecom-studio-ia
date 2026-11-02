/**
 * File d'envoi en série (mission #282, lot 1 bis) : chaque tâche ne démarre qu'après la fin de la précédente, dans
 * l'ordre des appels, même si une tâche échoue. `isLatest()` dit à une tâche si une demande plus récente l'a suivie,
 * pour n'appliquer que la réponse de la dernière.
 *
 * Sert aux réglages d'affichage : deux bascules rapides (Plein cadre puis Encre) ne peuvent pas arriver au serveur
 * dans le désordre.
 */
export function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  let seq = 0;
  return {
    run<T>(task: (isLatest: () => boolean) => Promise<T>): Promise<T> {
      const n = ++seq;
      const exec = () => task(() => n === seq);
      const p = tail.then(exec, exec);
      tail = p.catch(() => undefined);
      return p;
    },
  };
}
