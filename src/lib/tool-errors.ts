/**
 * Messages clairs pour les outils système manquants (ffmpeg pour les vidéos) au lieu de « spawn ffmpeg ENOENT ».
 * L'outil est installé par l'image Docker et par le Codespace (.devcontainer) ; sur une autre machine, il faut
 * l'installer soi-même.
 */
import { L } from "./i18n-server";

export function friendlyToolError(message: string): string {
  if (/spawn (ffmpeg|ffprobe)\b.*ENOENT|(ffmpeg|ffprobe): (not found|command not found)/i.test(message))
    return L(
      "l'outil vidéo ffmpeg n'est pas installé sur ce serveur. Dans un Codespace, redémarrez-le (il s'installe au démarrage) ou tapez dans le terminal : sudo apt-get update && sudo apt-get install -y ffmpeg — puis cliquez « Relancer ».",
      "the ffmpeg video tool isn't installed on this server. In a Codespace, restart it (it installs on start) or run in the terminal: sudo apt-get update && sudo apt-get install -y ffmpeg — then click “Retry”.",
    );
  return message;
}
