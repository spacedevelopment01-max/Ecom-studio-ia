/** Identifiants des thèmes (directions d'origine puis catalogue), séparés par des espaces : pour les boucles de vérification. */
import { DIRECTIONS } from "../src/lib/theme/directions";

console.log(DIRECTIONS.map((d) => d.id).join(" "));
