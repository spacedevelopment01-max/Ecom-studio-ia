/**
 * Outils système manquants (ffmpeg pour les vidéos) au lieu de « spawn ffmpeg ENOENT ».
 * L'outil est installé par l'image Docker et par le Codespace (.devcontainer) ; sur une autre machine, il faut
 * l'installer soi-même.
 *
 * Deux textes (décision du chef d'orchestre du 26 novembre 2026 : textes du client alignés, tutoyés, sans mot technique) :
 * le client ne lit qu'une phrase simple de SINA ; la marche à suivre pour installer l'outil reste au Studio (colonne
 * `error` de la tâche, journal des erreurs).
 */
import { L } from "./i18n-server";

const OUTIL_MANQUANT_RX = /spawn (ffmpeg|ffprobe)\b.*ENOENT|(ffmpeg|ffprobe): (not found|command not found)/i;

/** L'erreur vient-elle d'un outil vidéo du Studio absent de la machine ? */
export function outilManquant(message: string): boolean {
  return OUTIL_MANQUANT_RX.test(message);
}

/** Ce que lit le client : une phrase simple, sans nom d'outil ni commande. Les autres erreurs restent telles quelles. */
export function friendlyToolError(message: string): string {
  if (outilManquant(message))
    return L(
      "Je n'ai pas pu préparer la vidéo : un outil du Studio manque pour le moment. J'ai gardé tout ce qui est fait ; je pourrai la refaire dès qu'il sera remis en place.",
      "I couldn't prepare the video: one of the Studio's tools is missing for now. I kept everything that's done; I can redo it as soon as it's back in place.",
    );
  return message;
}

/** Pour le Studio seulement (colonne `error`, journal) : la cause et la marche à suivre pour installer l'outil. */
export function detailOutilManquant(message: string): string {
  return `${message.slice(0, 400)} — outil vidéo ffmpeg absent du serveur. Codespace : le redémarrer (il s'installe au démarrage) ou lancer « sudo apt-get update && sudo apt-get install -y ffmpeg », puis relancer la tâche.`;
}
